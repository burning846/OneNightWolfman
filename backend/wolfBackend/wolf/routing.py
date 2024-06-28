from channels.routing import ProtocolTypeRouter, URLRouter
from django.urls import path
from wolf import consumers

websocket_urlpatterns = [
    path("ws/game/<int:room_id>/", consumers.GameConsumer.as_asgi()),
]
