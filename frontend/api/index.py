import sys
import os

# Add the backend directory to Python path
sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..', '..', 'backend'))

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'relief_route_backend.settings')

from django.core.wsgi import get_wsgi_application
app = get_wsgi_application()
