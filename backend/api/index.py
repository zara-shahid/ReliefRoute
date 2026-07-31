import sys
import os

# Add the backend root to Python path so Django apps are importable
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'relief_route_backend.settings')

from django.core.wsgi import get_wsgi_application
app = get_wsgi_application()
