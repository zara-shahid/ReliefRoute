from django.db import models

class DisasterSite(models.Model):
    RESOURCE_CHOICES = [
        ('water', 'Water'),
        ('medical', 'Medical'),
        ('food', 'Food'),
        ('shelter', 'Shelter'),
        ('generators', 'Generators'),
        ('rescue_gear', 'Rescue Gear'),
    ]

    STATUS_CHOICES = [
        ('pending', 'Pending'),
        ('en_route', 'En Route'),
        ('fulfilled', 'Fulfilled'),
    ]

    name = models.CharField(max_length=255)
    location_name = models.CharField(max_length=255)
    lat = models.FloatField(default=37.7749)
    lng = models.FloatField(default=-122.4194)
    resource_needed = models.CharField(max_length=50, choices=RESOURCE_CHOICES, default='water')
    amount_needed = models.IntegerField(default=50)
    people_affected = models.IntegerField(default=100)
    severity = models.IntegerField(default=3)  # 1 to 5
    urgency_window_hours = models.FloatField(default=4.0)
    urgency_score = models.IntegerField(default=60)
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='pending')
    description = models.TextField(blank=True, default='')
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"{self.name} ({self.resource_needed})"


class Vehicle(models.Model):
    STATUS_CHOICES = [
        ('available', 'Available'),
        ('en_route', 'En Route'),
        ('maintenance', 'Maintenance'),
    ]

    name = models.CharField(max_length=255)
    vehicle_type = models.CharField(max_length=50, default='rapid_van')
    capacity = models.IntegerField(default=100)
    max_speed_kmh = models.FloatField(default=50.0)
    depot_name = models.CharField(max_length=255, default='Central Logistics Hub')
    depot_lat = models.FloatField(default=37.7749)
    depot_lng = models.FloatField(default=-122.4194)
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='available')
    driver_name = models.CharField(max_length=255, default='Dispatch Driver')
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"{self.name} (Capacity: {self.capacity})"


class Route(models.Model):
    vehicle = models.ForeignKey(Vehicle, on_delete=models.CASCADE, related_name='routes')
    total_distance_km = models.FloatField(default=0.0)
    total_time_minutes = models.FloatField(default=0.0)
    stops = models.JSONField(default=list)
    road_geometry = models.JSONField(default=list)
    driver_instructions = models.JSONField(default=list)
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"Route for {self.vehicle.name} ({len(self.stops)} stops)"
