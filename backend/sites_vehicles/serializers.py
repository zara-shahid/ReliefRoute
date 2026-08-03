from rest_framework import serializers
from .models import DisasterSite, Vehicle, Route

class DisasterSiteSerializer(serializers.ModelSerializer):
    coords = serializers.SerializerMethodField()

    class Meta:
        model = DisasterSite
        fields = [
            'id',
            'name',
            'location_name',
            'lat',
            'lng',
            'coords',
            'resource_needed',
            'amount_needed',
            'people_affected',
            'severity',
            'urgency_window_hours',
            'urgency_score',
            'status',
            'description',
            'created_at',
        ]

    def get_coords(self, obj):
        return {'lat': obj.lat, 'lng': obj.lng}


class VehicleSerializer(serializers.ModelSerializer):
    depotCoords = serializers.SerializerMethodField()

    class Meta:
        model = Vehicle
        fields = [
            'id',
            'name',
            'vehicle_type',
            'capacity',
            'max_speed_kmh',
            'depot_name',
            'depot_lat',
            'depot_lng',
            'depotCoords',
            'status',
            'driver_name',
            'created_at',
        ]

    def get_depotCoords(self, obj):
        return {'lat': obj.depot_lat, 'lng': obj.depot_lng}


class RouteSerializer(serializers.ModelSerializer):
    vehicle_name = serializers.CharField(source='vehicle.name', read_only=True)
    driver_name = serializers.CharField(source='vehicle.driver_name', read_only=True)
    roadGeometry = serializers.SerializerMethodField()

    class Meta:
        model = Route
        fields = [
            'id',
            'vehicle',
            'vehicle_name',
            'driver_name',
            'total_distance_km',
            'total_time_minutes',
            'stops',
            'road_geometry',
            'roadGeometry',
            'driver_instructions',
            'created_at',
        ]

    def get_roadGeometry(self, obj):
        return obj.road_geometry
