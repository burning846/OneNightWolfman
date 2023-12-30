# routing.py

from channels.routing import ProtocolTypeRouter, URLRouter
from django.urls import path
from wolfBackend import consumers

websocket_urlpatterns = [
    path('ws/game/<int:room_id>/', consumers.GameConsumer.as_asgi()),
]

application = ProtocolTypeRouter({
    'websocket': URLRouter(websocket_urlpatterns),
})
