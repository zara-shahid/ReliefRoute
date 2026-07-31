import os
import json
import django

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'relief_route_backend.settings')
django.setup()

from rest_framework.test import APIClient
from seed import seed
from sites_vehicles.models import DisasterSite, Vehicle, Route

def test_full_end_to_end_flow():
    print("\n=======================================================")
    print(" DAYS 7-8: FULL END-TO-END INTEGRATION TEST SUITE")
    print("=======================================================")

    seed()
    client = APIClient()

    sample_reports = [
        {
            'title': 'Report 1: Medical Crisis',
            'rawReport': 'URGENT MEDICAL EMERGENCY: St. Jude Trauma Annex at 2400 Geary Blvd lost main grid power 15 minutes ago. 85 patients in ICU needing 25 trauma kits immediately.',
        },
        {
            'title': 'Report 2: Water Shortage',
            'rawReport': 'Flash flooding in Sector 7 near Bayview Harbor (350 Cargo Way). 300 residents evacuated. Requesting 40 cases of emergency drinking water packs within 3 hours.',
        },
        {
            'title': 'Report 3: Senior Food Aid',
            'rawReport': 'Golden Gate Senior Housing block at 1200 Gough St trapped without power for 6 hours. 90 elderly individuals needing 30 meal packs and thermal blankets.',
        },
        {
            'title': 'Report 4: Landslide Blockade',
            'rawReport': 'Landslide along Twin Peaks Drive near 500 Panorama Dr. Debris blocked access road trapping 40 vehicles. Need 20 rescue gear sets and hydraulic cutters.',
        },
        {
            'title': 'Report 5: School Shelter Rupture',
            'rawReport': 'Water main pipe rupture at Lincoln High School Gym shelter (2160 24th Ave). 220 refugees requesting 35 shelter cots and hygiene packs.',
        },
    ]

    print("\n--- 1. SUBMITTING 5 PIPELINE REPORTS SEQUENTIALLY ---")
    for idx, r in enumerate(sample_reports, 1):
        res = client.post('/api/agent/pipeline/', {'rawReport': r['rawReport']}, format='json')
        assert res.status_code == 200, f"Pipeline failed on report {idx}"
        data = res.json()
        site = data['intake_site']
        prio = data['urgency_info']
        opt = data['optimization_result']
        print(f"[{r['title']}] -> Created: {site['name']} | Priority: {prio['urgency_score']}/100 | Target: {prio['urgency_window_hours']}h | Active Routes: {len(opt['routes'])}")

    # 2. Verify Database Persistence of Stored Routes
    print("\n--- 2. VERIFYING DATABASE PERSISTENCE OF STORED ROUTES ---")
    res_routes = client.get('/api/routes/')
    assert res_routes.status_code == 200
    stored_routes = res_routes.json()
    print(f"GET /api/routes/ -> Total persisted vehicle routes in DB: {len(stored_routes)}")
    assert len(stored_routes) > 0, "No routes persisted in database!"

    for route in stored_routes:
        print(f" - Vehicle: {route['vehicle_name']} | Driver: {route['driver_name']} | Distance: {route['total_distance_km']} km | Stops: {len(route['stops'])}")

    # 3. Test Dispatch Chat Agent Q&A Endpoint
    print("\n--- 3. TESTING DISPATCH COMMAND AGENT CHAT ENDPOINT ---")
    questions = [
        "Why were critical medical sites given top priority?",
        "What is the total completion time and travel distance across deployed vehicles?",
        "How are vehicle capacity limits managed for heavy trucks and supply vans?",
    ]

    for q in questions:
        res_chat = client.post('/api/agent/chat/', {'question': q}, format='json')
        assert res_chat.status_code == 200, f"Chat endpoint failed for question: {q}"
        chat_data = res_chat.json()
        print(f"\nQ: \"{q}\"")
        print(f"A: {chat_data['answer'][:200]}...")
        assert len(chat_data['answer']) > 20

    print("\n=======================================================")
    print(" FULL END-TO-END INTEGRATION TEST PASSED 100%!")
    print("=======================================================")

if __name__ == '__main__':
    test_full_end_to_end_flow()
