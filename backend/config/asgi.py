import os

from channels.auth import AuthMiddlewareStack
from channels.routing import ProtocolTypeRouter, URLRouter
from django.core.asgi import get_asgi_application

os.environ.setdefault("DJANGO_SETTINGS_MODULE", "config.settings.dev")

django_asgi = get_asgi_application()

from api.v1.realtime import websocket_urlpatterns

application = ProtocolTypeRouter(
    {
        "http": django_asgi,
        "websocket": AuthMiddlewareStack(URLRouter(websocket_urlpatterns)),
    }
)
