from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import DisasterSiteViewSet, VehicleViewSet, RouteViewSet

router = DefaultRouter()
router.register(r'sites', DisasterSiteViewSet, basename='disastersite')
router.register(r'vehicles', VehicleViewSet, basename='vehicle')
router.register(r'routes', RouteViewSet, basename='route')

urlpatterns = [
    path('', include(router.urls)),
]
