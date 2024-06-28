# routing.py

# from channels.routing import ProtocolTypeRouter, URLRouter
# from django.urls import path
# from wolfBackend import consumers

# websocket_urlpatterns = [
#     path('ws/game/<int:room_id>/', consumers.GameConsumer.as_asgi()),
# ]

# application = ProtocolTypeRouter({
#     'websocket': URLRouter(websocket_urlpatterns),
# })

# routing.py

from channels.auth import AuthMiddlewareStack
from channels.routing import ProtocolTypeRouter, URLRouter
from django.core.asgi import get_asgi_application

# from wolf.routing import websocket_urlpatterns
# import wolf
import wolf.routing

application = ProtocolTypeRouter(
    {
        "http": get_asgi_application(),
        "websocket": AuthMiddlewareStack(URLRouter(wolf.routing.websocket_urlpatterns)),
    }
)
