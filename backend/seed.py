import os
import django

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'relief_route_backend.settings')
django.setup()

from sites_vehicles.models import DisasterSite, Vehicle

import urllib.request
import json
import random

def fetch_usgs_earthquakes():
    url = "https://earthquake.usgs.gov/earthquakes/feed/v1.0/summary/2.5_day.geojson"
    sites = []
    print("Fetching live earthquake data from USGS...")
    try:
        req = urllib.request.Request(url, headers={'User-Agent': 'ReliefRoute/1.0'})
        with urllib.request.urlopen(req, timeout=10) as resp:
            data = json.loads(resp.read().decode('utf-8'))
            features = data.get('features', [])
            
            resources = ['medical', 'water', 'food', 'shelter', 'generators']
            
            for feature in features:
                props = feature['properties']
                geom = feature['geometry']
                
                mag = props.get('mag', 2.5)
                place = props.get('place', 'Unknown Location')
                
                if mag < 3.5: continue # filter small ones to avoid clutter
                
                # map magnitude to severity 1-5
                severity = min(5, max(1, int(mag - 2)))
                amount = int(mag * 15)
                people = int(mag * 100)
                
                sites.append({
                    'name': f"Earthquake M{mag:.1f}",
                    'location_name': place,
                    'lat': geom['coordinates'][1],
                    'lng': geom['coordinates'][0],
                    'resource_needed': random.choice(resources),
                    'amount_needed': amount,
                    'people_affected': people,
                    'severity': severity,
                    'urgency_window_hours': round(max(1.0, 12.0 - mag), 1),
                    'urgency_score': int(min(100, mag * 18)),
                    'status': 'pending',
                    'description': f"Live data: Earthquake of magnitude {mag} reported near {place}.",
                })
    except Exception as e:
        print(f"Failed to fetch USGS data: {e}")
    return sites[:25] # Limit to 25 sites max

def seed():
    DisasterSite.objects.all().delete()
    Vehicle.objects.all().delete()

    sites = fetch_usgs_earthquakes()
    if not sites:
        print("Fallback: No sites fetched, using dummy data.")
        sites = [
            {
                'name': 'Fallback Site',
                'location_name': 'San Francisco',
                'lat': 37.7765,
                'lng': -122.4172,
                'resource_needed': 'medical',
                'amount_needed': 45,
                'people_affected': 210,
                'severity': 5,
                'urgency_window_hours': 2.0,
                'urgency_score': 94,
                'status': 'pending',
                'description': 'Fallback mock data.',
            }
        ]


    vehicles = [
        {
            'name': 'Relief Transport Alpha (Heavy Truck)',
            'vehicle_type': 'heavy_truck',
            'capacity': 250,
            'max_speed_kmh': 45.0,
            'depot_name': 'Central Logistics Hub',
            'depot_lat': 37.7749,
            'depot_lng': -122.4194,
            'status': 'available',
            'driver_name': 'Captain Marcus Vance',
        },
        {
            'name': 'Rapid Response Bravo (Supply Van)',
            'vehicle_type': 'rapid_van',
            'capacity': 120,
            'max_speed_kmh': 65.0,
            'depot_name': 'Central Logistics Hub',
            'depot_lat': 37.7749,
            'depot_lng': -122.4194,
            'status': 'available',
            'driver_name': 'Officer Sarah Chen',
        },
        {
            'name': 'Medical Dispatch Charlie (Muni Van)',
            'vehicle_type': 'medical_heli',
            'capacity': 80,
            'max_speed_kmh': 80.0,
            'depot_name': 'Central Logistics Hub',
            'depot_lat': 37.7749,
            'depot_lng': -122.4194,
            'status': 'available',
            'driver_name': 'Dr. Alex Rivera',
        },
    ]

    for site in sites:
        DisasterSite.objects.create(**site)

    for veh in vehicles:
        Vehicle.objects.create(**veh)

    print(f"Successfully seeded {len(sites)} sites and {len(vehicles)} vehicles into Django database.")

if __name__ == '__main__':
    seed()
