from rest_framework import viewsets, status
from rest_framework.response import Response
from rest_framework.decorators import action
from .models import DisasterSite, Vehicle, Route
from .serializers import DisasterSiteSerializer, VehicleSerializer, RouteSerializer

class DisasterSiteViewSet(viewsets.ModelViewSet):
    queryset = DisasterSite.objects.all().order_by('-urgency_score', '-severity')
    serializer_class = DisasterSiteSerializer

class VehicleViewSet(viewsets.ModelViewSet):
    queryset = Vehicle.objects.all().order_by('id')
    serializer_class = VehicleSerializer

class RouteViewSet(viewsets.ReadOnlyModelViewSet):
    queryset = Route.objects.all().order_by('-created_at')
    serializer_class = RouteSerializer
