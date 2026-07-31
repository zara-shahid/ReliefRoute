import json
import os
from pathlib import Path
from dotenv import load_dotenv

# Always reload .env so key updates take effect without restart
load_dotenv(Path(__file__).resolve().parent.parent.parent / 'backend' / '.env', override=True)

from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status
from sites_vehicles.models import DisasterSite, Vehicle, Route
from sites_vehicles.serializers import DisasterSiteSerializer, VehicleSerializer
from .solver import solve_vrp_ortools

class OptimizeRouteView(APIView):
    def post(self, request):
        sites_qs = DisasterSite.objects.filter(status__in=['pending', 'en_route'])
        vehicles_qs = Vehicle.objects.filter(status='available')

        sites_data = DisasterSiteSerializer(sites_qs, many=True).data
        vehicles_data = VehicleSerializer(vehicles_qs, many=True).data

        result = solve_vrp_ortools(sites_data, vehicles_data)

        # Clear existing routes and save newly optimized routes
        Route.objects.all().delete()
        for r_data in result['routes']:
            try:
                vehicle_obj = Vehicle.objects.get(id=r_data['vehicleId'])
                Route.objects.create(
                    vehicle=vehicle_obj,
                    total_distance_km=r_data['totalDistanceKm'],
                    total_time_minutes=r_data['totalTimeMinutes'],
                    stops=r_data['stops'],
                    driver_instructions=r_data['driverInstructions']
                )
            except Exception:
                pass

        return Response(result, status=status.HTTP_200_OK)


class PipelineAgentView(APIView):
    def post(self, request):
        raw_report = request.data.get('raw_report') or request.data.get('rawReport') or request.data.get('report')
        report_timestamp = request.data.get('report_timestamp') or request.data.get('reportedAt')

        if not raw_report:
            return Response({'error': 'raw_report or report parameter is required'}, status=status.HTTP_400_BAD_REQUEST)

        try:
            from .pipeline import run_four_step_pipeline
            pipeline_out = run_four_step_pipeline(raw_report, report_timestamp)
            return Response(pipeline_out, status=status.HTTP_200_OK)
        except Exception as e:
            import traceback
            traceback.print_exc()
            return Response({'error': str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


class DispatchChatAgentView(APIView):
    def post(self, request):
        question = request.data.get('question') or request.data.get('message')
        if not question:
            return Response({'error': 'question parameter is required'}, status=status.HTTP_400_BAD_REQUEST)

        # Retrieve active context from database
        routes_qs = Route.objects.all()
        sites_qs = DisasterSite.objects.filter(status__in=['pending', 'en_route'])
        vehicles_qs = Vehicle.objects.all()

        route_summaries = []
        for r in routes_qs:
            route_summaries.append({
                'vehicle': r.vehicle.name,
                'driver': r.vehicle.driver_name,
                'capacity': r.vehicle.capacity,
                'total_distance_km': r.total_distance_km,
                'total_time_minutes': r.total_time_minutes,
                'stops': r.stops,
                'driver_instructions': r.driver_instructions
            })

        site_summaries = [
            {'name': s.name, 'resource': s.resource_needed, 'amount': s.amount_needed, 'severity': s.severity, 'urgency_score': s.urgency_score}
            for s in sites_qs
        ]

        context_data = {
            'active_routes': route_summaries,
            'active_sites': site_summaries,
            'total_vehicles': len(vehicles_qs)
        }

        answer = None
        api_key = os.environ.get('GROQ_API_KEY')

        if api_key:
            try:
                from groq import Groq
                client = Groq(api_key=api_key)
                prompt = f"""You are the ReliefRoute Dispatch & Operational Command Officer — an AI specialized in disaster relief logistics.
Answer the user's question based STRICTLY on the live database context below. Be concise, direct, and professional.

LIVE FLEET & ROUTING CONTEXT:
{json.dumps(context_data, indent=2)}

USER QUESTION: "{question}"

Provide a clear, actionable response. Reference specific vehicle names, site names, distances, or urgency scores from the context where relevant."""

                chat = client.chat.completions.create(
                    model='llama-3.3-70b-versatile',
                    messages=[{'role': 'user', 'content': prompt}],
                    temperature=0.3,
                    max_tokens=400,
                )
                answer = chat.choices[0].message.content
            except Exception as e:
                print(f"Dispatch chat Groq warning: {e}")

        if not answer:
            answer = generate_contextual_chat_answer(question, context_data)

        return Response({
            'question': question,
            'answer': answer,
            'response': answer,  # alias for frontend compatibility
            'context_summary': {
                'total_routes': len(route_summaries),
                'total_sites': len(site_summaries)
            }
        }, status=status.HTTP_200_OK)


def generate_contextual_chat_answer(q: str, context: dict) -> str:
    query = q.lower()
    routes = context.get('active_routes', [])
    sites = context.get('active_sites', [])

    if any(k in query for k in ['why', 'order', 'first', 'priority']):
        top_sites = sorted(sites, key=lambda x: x.get('urgency_score', 0), reverse=True)[:2]
        names = ", ".join([f"{s['name']} (Priority {s['urgency_score']}/100)" for s in top_sites]) if top_sites else "high urgency locations"
        return f"Routes are ordered according to urgency score and severity. Sites with critical medical or generator needs such as {names} are dispatched first to satisfy target delivery windows."

    if any(k in query for k in ['capacity', 'load', 'full', 'units']):
        if not routes:
            return "No active vehicle routes currently generated."
        details = [f"{r['vehicle']}: {len(r['stops'])} stops, total distance {r['total_distance_km']} km" for r in routes]
        return f"Current vehicle deployment: {'; '.join(details)}."

    if any(k in query for k in ['time', 'duration', 'fast', 'arrival', 'distance']):
        total_dist = sum(r.get('total_distance_km', 0) for r in routes)
        total_time = max([r.get('total_time_minutes', 0) for r in routes] or [0])
        return f"The current dispatch plan covers {round(total_dist, 1)} total fleet kilometers. Maximum estimated completion time across all active vehicles is {round(total_time)} minutes."

    return f"ReliefRoute Dispatch Command is currently coordinating {len(routes)} deployed vehicles across {len(sites)} active disaster sites. Let me know if you need specific driver manifests, capacity breakdowns, or site arrival estimates."


