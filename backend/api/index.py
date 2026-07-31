import sys
import os

# Add the backend root to sys.path so Django apps (relief_route_backend, routing, sites_vehicles) are importable
path = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
sys.path.insert(0, path)

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'relief_route_backend.settings')

from django.core.wsgi import get_wsgi_application

# Export as both 'app' and 'application' for @vercel/python compatibility
application = get_wsgi_application()
app = application
