# views.py

from django.contrib.auth.models import User
from wolf.models import Player
from django.contrib.auth import authenticate, login
from rest_framework.decorators import api_view
from rest_framework.response import Response
from rest_framework import status


@api_view(["POST"])
def register(request):
    username = request.data.get("username")
    password = request.data.get("password")
    nickname = request.data.get("nickname")
    avatar = request.data.get("avatar", "")
    if Player.user.objects.filter(username=username).exists():
        return Response(
            {"error": "Username already exists"}, status=status.HTTP_400_BAD_REQUEST
        )
    user = User.objects.create_user(username=username, password=password)
    user.save()
    player = Player.objects.create(
        user=user, nickname=nickname, avatar=avatar, experience=0
    )
    player.save()
    return Response(
        {"message": "User created successfully"}, status=status.HTTP_201_CREATED
    )


@api_view(["POST"])
def login_view(request):
    username = request.data.get("username")
    password = request.data.get("password")
    user = authenticate(username=username, password=password)
    if user is not None:
        login(request, user)
        return Response({"message": "Login successful"}, status=status.HTTP_200_OK)
    else:
        return Response(
            {"error": "Invalid credentials"}, status=status.HTTP_400_BAD_REQUEST
        )


@api_view(["POST"])
def join_room(request):
    return Response(
        {"success": True, "message": "Join successful"}, status=status.HTTP_200_OK
    )
