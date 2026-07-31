import os
import json
import django

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'relief_route_backend.settings')
django.setup()

from rest_framework.test import APIClient
from sites_vehicles.models import DisasterSite, Vehicle

def test_api():
    client = APIClient()

    # 1. Test GET /api/sites/
    res_sites = client.get('/api/sites/')
    assert res_sites.status_code == 200
    sites_data = res_sites.json()
    print("GET /api/sites/ -> Total sites:", len(sites_data))

    # 2. Test GET /api/vehicles/
    res_veh = client.get('/api/vehicles/')
    assert res_veh.status_code == 200
    veh_data = res_veh.json()
    print("GET /api/vehicles/ -> Total vehicles:", len(veh_data))

    # 3. Test POST /api/sites/ (Create operation)
    new_site_payload = {
        'name': 'East Side Evacuation Station',
        'location_name': '300 Embarcadero',
        'lat': 37.7912,
        'lng': -122.3920,
        'resource_needed': 'water',
        'amount_needed': 40,
        'people_affected': 90,
        'severity': 3,
        'urgency_window_hours': 5.0,
        'urgency_score': 60,
        'status': 'pending',
        'description': 'Temporary drinking water station.',
    }
    res_create = client.post('/api/sites/', new_site_payload, format='json')
    assert res_create.status_code == 211 or res_create.status_code == 201
    print("POST /api/sites/ -> Created site ID:", res_create.json()['id'])

    # 4. Test POST /api/optimize/ (Google OR-Tools VRP Solver API)
    res_opt = client.post('/api/optimize/', format='json')
    assert res_opt.status_code == 200
    opt_result = res_opt.json()
    print("POST /api/optimize/ -> OR-Tools Generated Routes:")
    for route in opt_result['routes']:
        print(f" - Vehicle: {route['vehicleName']} | Capacity: {route['loadUsed']}/{route['capacity']} | Stops: {len(route['stops'])} | Dist: {route['totalDistanceKm']} km")

    print("\nSUCCESS: All Django REST Framework CRUD and Google OR-Tools VRP solver APIs tested successfully!")

if __name__ == '__main__':
    test_api()
