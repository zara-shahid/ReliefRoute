import os
import json
import time
from datetime import datetime, timezone
from typing import Dict, Any, List

try:
    from google import genai
    from google.genai import types
    HAS_GENAI = True
except ImportError:
    HAS_GENAI = False

from sites_vehicles.models import DisasterSite, Vehicle, Route
from sites_vehicles.serializers import DisasterSiteSerializer, VehicleSerializer
from .solver import solve_vrp_ortools

# State Dictionary definition for the 4-step pipeline
# State: { 'raw_report': str, 'report_timestamp': str, 'site_data': dict, 'urgency': dict, 'optimization': dict, 'dispatch': list }

# STEP 1: INTAKE AGENT
def step_intake(raw_report: str) -> Dict[str, Any]:
    """
    Parses a raw text emergency report into structured site fields.
    Validates completeness and structure before passing downstream.
    """
    if not raw_report or not isinstance(raw_report, str):
        raise ValueError("Intake Step Error: raw_report must be a non-empty string.")

    site_data = None
    api_key = os.environ.get('GEMINI_API_KEY')

    if HAS_GENAI and api_key:
        try:
            client = genai.Client(api_key=api_key)
            prompt = f"""You are the ReliefRoute Intake Agent. Extract structured disaster site details from this raw incident report:
"{raw_report}"

Return JSON matching:
- name: string (Short name of institution or incident area)
- location_name: string (Address or location description)
- resource_needed: one of ["water", "medical", "food", "shelter", "generators", "rescue_gear"]
- amount_needed: integer (quantity/units requested)
- people_affected: integer (estimated count)
- severity: integer (1 to 5, where 5 is life-threatening)
- description: string (summary)"""

            response = client.models.generate_content(
                model='gemini-3.6-flash',
                contents=prompt,
                config=types.GenerateContentConfig(
                    response_mime_type='application/json',
                )
            )

            parsed = json.loads(response.text or '{}')
            site_data = {
                'name': parsed.get('name') or 'Extracted Incident Site',
                'location_name': parsed.get('location_name') or 'Disaster Zone Sector',
                'lat': round(37.7749 + (hash(raw_report) % 50 - 25) * 0.001, 4),
                'lng': round(-122.4194 + (hash(raw_report[::-1]) % 50 - 25) * 0.001, 4),
                'resource_needed': validate_resource(parsed.get('resource_needed')),
                'amount_needed': max(10, int(parsed.get('amount_needed') or 40)),
                'people_affected': max(5, int(parsed.get('people_affected') or 50)),
                'severity': min(5, max(1, int(parsed.get('severity') or 3))),
                'description': parsed.get('description') or raw_report[:150],
            }
        except Exception as e:
            print(f"Intake LLM warning: {e}. Falling back to deterministic parser.")

    if not site_data:
        site_data = parse_report_fallback(raw_report)

    # Output validation check: Verify all required fields are well-formed
    required_fields = ['name', 'location_name', 'resource_needed', 'amount_needed', 'people_affected', 'severity']
    for field in required_fields:
        if field not in site_data or site_data[field] is None:
            raise ValueError(f"Intake Step Validation Failed: Missing or invalid field '{field}' in extracted data.")

    return site_data


# STEP 2: PRIORITIZATION AGENT
def step_prioritize(site_data: Dict[str, Any], report_timestamp: str = None) -> Dict[str, Any]:
    """
    Calculates Urgency Score (10-100) and Urgency Target Window (hours)
    based on site severity, resource criticality, and elapsed time since reported.
    """
    severity = site_data.get('severity', 3)
    people_affected = site_data.get('people_affected', 50)
    resource = site_data.get('resource_needed', 'water')

    # Calculate hours elapsed since report came in
    hours_elapsed = 0.0
    if report_timestamp:
        try:
            dt = datetime.fromisoformat(report_timestamp.replace('Z', '+00:00'))
            now = datetime.now(timezone.utc)
            hours_elapsed = max(0.0, (now - dt).total_seconds() / 3600.0)
        except Exception:
            hours_elapsed = 0.0

    # Base urgency from severity (15 to 75 points)
    base_urgency = severity * 15

    # Impact bonus from affected population (up to 20 points)
    people_bonus = min(20, math_floor(people_affected / 10))

    # Resource criticality bonus (15 points for medical/generators/rescue)
    is_critical_resource = resource in ['medical', 'generators', 'rescue_gear']
    resource_bonus = 15 if is_critical_resource else 0

    # Time decay penalty (older reports gain urgency to prevent starvation)
    time_decay_bonus = min(15, int(hours_elapsed * 3))

    urgency_score = min(100, max(10, base_urgency + people_bonus + resource_bonus + time_decay_bonus))

    # Urgency Window: Hours within which supply delivery should occur
    if urgency_score >= 85:
        urgency_window_hours = 2.0
    elif urgency_score >= 70:
        urgency_window_hours = 3.0
    elif urgency_score >= 50:
        urgency_window_hours = 5.0
    else:
        urgency_window_hours = 8.0

    return {
        'urgency_score': urgency_score,
        'urgency_window_hours': urgency_window_hours,
        'hours_elapsed': round(hours_elapsed, 1),
        'reasoning': f"Priority {urgency_score}/100 calculated from Severity {severity}/5, {people_affected} affected, {resource.upper()} criticality, and {hours_elapsed:.1f}h elapsed. Target window: {urgency_window_hours} hours."
    }


# STEP 3: ROUTING OPTIMIZATION AGENT
def step_route(site_data: Dict[str, Any], urgency_info: Dict[str, Any]) -> Dict[str, Any]:
    """
    Saves site into Django database and invokes Google OR-Tools VRP solver
    to recalculate multi-vehicle routes.
    """
    new_site = DisasterSite.objects.create(
        name=site_data['name'],
        location_name=site_data['location_name'],
        lat=site_data.get('lat', 37.7749),
        lng=site_data.get('lng', -122.4194),
        resource_needed=site_data['resource_needed'],
        amount_needed=site_data['amount_needed'],
        people_affected=site_data['people_affected'],
        severity=site_data['severity'],
        urgency_window_hours=urgency_info['urgency_window_hours'],
        urgency_score=urgency_info['urgency_score'],
        status='pending',
        description=site_data.get('description', '')
    )

    sites_qs = DisasterSite.objects.filter(status__in=['pending', 'en_route'])
    vehicles_qs = Vehicle.objects.filter(status='available')

    all_sites = DisasterSiteSerializer(sites_qs, many=True).data
    all_vehicles = VehicleSerializer(vehicles_qs, many=True).data

    optimization_res = solve_vrp_ortools(all_sites, all_vehicles)
    optimization_res['created_site'] = DisasterSiteSerializer(new_site).data

    # Store newly optimized routes in Django Route model
    Route.objects.all().delete()
    for r_data in optimization_res.get('routes', []):
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

    return optimization_res


# STEP 4: DISPATCH AGENT
def step_dispatch(routes: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
    """
    Takes finished vehicle routes and converts them into short, clear,
    driver instructions for field operations.
    """
    manifests = []
    api_key = os.environ.get('GEMINI_API_KEY')

    for route in routes:
        v_name = route.get('vehicleName', 'Relief Unit')
        driver = route.get('driverName', 'Field Officer')
        stops = route.get('stops', [])
        load_used = route.get('loadUsed', 0)
        capacity = route.get('capacity', 100)

        instructions = []
        instructions.append(f"MANIFEST FOR {v_name.upper()} (Driver: {driver})")
        instructions.append(f"• Depart Central Depot with cargo load: {load_used}/{capacity} units ({route.get('loadPercentage', 0)}% capacity).")

        for idx, stop in enumerate(stops, 1):
            instructions.append(
                f"• Stop {idx}: Deliver {stop['amountDelivered']} units of {stop['resourceDelivered'].upper()} to {stop['siteName']} (Est arrival: +{stop['estimatedArrivalTimeMin']} min, Priority: {stop['urgencyScore']}/100)."
            )

        instructions.append(f"• Return to Central Depot upon route completion. Est duration: {route.get('totalTimeMinutes', 0)} mins, Distance: {route.get('totalDistanceKm', 0)} km.")

        manifests.append({
            'vehicleId': route.get('vehicleId'),
            'vehicleName': v_name,
            'driverName': driver,
            'instructions': instructions,
            'shortSummary': f"Dispatched to {len(stops)} stops with {load_used}/{capacity} cargo units. Est duration: {route.get('totalTimeMinutes', 0)} mins."
        })

    return manifests


# FULL 4-STEP PIPELINE EXECUTION
def run_four_step_pipeline(raw_report: str, report_timestamp: str = None) -> Dict[str, Any]:
    """
    Executes 4-step pipeline: Intake -> Prioritize -> Route -> Dispatch
    """
    # 1. Intake
    site_data = step_intake(raw_report)

    # 2. Prioritize
    urgency_info = step_prioritize(site_data, report_timestamp)

    # 3. Route
    opt_result = step_route(site_data, urgency_info)

    # 4. Dispatch
    dispatch_manifests = step_dispatch(opt_result.get('routes', []))

    return {
        'pipeline_status': 'success',
        'intake_site': site_data,
        'urgency_info': urgency_info,
        'optimization_result': opt_result,
        'dispatch_manifests': dispatch_manifests,
    }


# Helper Utilities
def validate_resource(res: str) -> str:
    valid = ['water', 'medical', 'food', 'shelter', 'generators', 'rescue_gear']
    if res and str(res).lower() in valid:
        return str(res).lower()
    return 'water'

def math_floor(val: float) -> int:
    return int(val)

def parse_report_fallback(text: str) -> Dict[str, Any]:
    t = text.lower()
    resource = 'water'
    if any(k in t for k in ['medical', 'clinic', 'trauma', 'hospital', 'vaccine']):
        resource = 'medical'
    elif any(k in t for k in ['generator', 'power', 'blackout', 'electric']):
        resource = 'generators'
    elif any(k in t for k in ['food', 'meal', 'groceries', 'ration']):
        resource = 'food'
    elif any(k in t for k in ['shelter', 'cot', 'blanket', 'tarp', 'camp']):
        resource = 'shelter'
    elif any(k in t for k in ['rescue', 'landslide', 'trapped', 'gear', 'cutters']):
        resource = 'rescue_gear'

    severity = 3
    if any(k in t for k in ['urgent', 'critical', 'emergency', 'life-threatening', 'icu']):
        severity = 5
    elif any(k in t for k in ['severe', 'flood', 'blackout', 'trapped']):
        severity = 4

    name = text.split('.')[0][:40].strip() or 'Disaster Zone Site'

    return {
        'name': name,
        'location_name': 'Reported Area Sector',
        'lat': round(37.7749 + (hash(text) % 50 - 25) * 0.001, 4),
        'lng': round(-122.4194 + (hash(text[::-1]) % 50 - 25) * 0.001, 4),
        'resource_needed': resource,
        'amount_needed': min(60, severity * 12),
        'people_affected': severity * 30,
        'severity': severity,
        'description': text,
    }
