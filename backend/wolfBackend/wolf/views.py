# views.py

from django.contrib.auth.models import User
from wolf.models import Player
from django.contrib.auth import authenticate, login
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework import status
from .models import Room
from allauth.socialaccount.models import SocialAccount
import random
import json


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

def create_room(request):
    if request.method == "POST":
        config = json.loads(request.body)
        room_id = random.randint(0, 99999)
        while Room.objects.filter(room_id=room_id).exists():
            room_id = random.randint(0, 99999)
        
        room = Room(room_id=room_id, config=config, players=[], is_active=False)
        room.save()
        
        return Response({"room_id": room_id})


@api_view(["POST"])
def kick_player(request):
    room_id = request.data.get("room_id")
    user_id = request.data.get("user_id")
    try:
        room = Room.objects.get(room_id=room_id)
        players = room.players
        if user_id in players:
            players.remove(user_id)
            room.players = players
            room.save()
            return Response({"success": True, "message": "Player kicked"}, status=status.HTTP_200_OK)
        else:
            return Response({"success": False, "message": "Player not in room"}, status=status.HTTP_400_BAD_REQUEST)
    except Room.DoesNotExist:
        return Response({"success": False, "message": "Room not found"}, status=status.HTTP_404_NOT_FOUND)

@api_view(["POST"])
def invite_player(request):
    room_id = request.data.get("room_id")
    user_id = request.data.get("user_id")
    try:
        room = Room.objects.get(room_id=room_id)
        players = room.players
        if user_id not in players:
            players.append(user_id)
            room.players = players
            room.save()
            return Response({"success": True, "message": "Player invited"}, status=status.HTTP_200_OK)
        else:
            return Response({"success": False, "message": "Player already in room"}, status=status.HTTP_400_BAD_REQUEST)
    except Room.DoesNotExist:
        return Response({"success": False, "message": "Room not found"}, status=status.HTTP_404_NOT_FOUND)


@api_view(["POST"])
def google_login(request):
    """处理Google登录后的用户信息"""
    token = request.data.get("token")
    # 这里的token是前端从Google获取的ID令牌
    # 由于django-allauth会自动处理OAuth流程，我们只需要验证用户是否已通过Google登录
    
    try:
        # 获取与当前用户关联的社交账号
        social_account = SocialAccount.objects.get(provider='google', uid=request.data.get("googleId"))
        user = social_account.user
        
        # 检查用户是否已有关联的Player对象
        try:
            player = Player.objects.get(user=user)
        except Player.DoesNotExist:
            # 如果没有Player对象，创建一个新的
            player = Player.objects.create(
                user=user,
                nickname=user.email.split('@')[0],  # 默认使用邮箱前缀作为昵称
                avatar=request.data.get("imageUrl", ""),
                experience=0
            )
        
        # 登录用户
        login(request, user)
        
        return Response({
            "success": True,
            "message": "Google login successful",
            "user": {
                "id": user.id,
                "username": user.username,
                "email": user.email,
                "nickname": player.nickname,
                "avatar": player.avatar
            }
        }, status=status.HTTP_200_OK)
        
    except SocialAccount.DoesNotExist:
        # 如果社交账号不存在，可能是首次登录，django-allauth会自动创建账号
        # 但我们需要前端重定向到allauth的Google登录URL
        return Response({
            "success": False,
            "message": "No Google account found. Please complete the OAuth flow.",
            "redirect": "/accounts/google/login/"
        }, status=status.HTTP_401_UNAUTHORIZED)
    except Exception as e:
        return Response({
            "success": False,
            "message": str(e)
        }, status=status.HTTP_400_BAD_REQUEST)


@api_view(["POST"])
@permission_classes([IsAuthenticated])
def set_username(request):
    """允许用户设置或更新用户名"""
    username = request.data.get("username")
    
    if not username:
        return Response({
            "success": False,
            "message": "Username is required"
        }, status=status.HTTP_400_BAD_REQUEST)
    
    # 检查用户名是否已存在
    if User.objects.filter(username=username).exclude(id=request.user.id).exists():
        return Response({
            "success": False,
            "message": "Username already exists"
        }, status=status.HTTP_400_BAD_REQUEST)
    
    try:
        # 更新用户名
        user = request.user
        user.username = username
        user.save()
        
        # 更新玩家昵称（如果存在）
        try:
            player = Player.objects.get(user=user)
            player.nickname = username
            player.save()
        except Player.DoesNotExist:
            pass
        
        return Response({
            "success": True,
            "message": "Username updated successfully",
            "user": {
                "id": user.id,
                "username": user.username,
                "email": user.email
            }
        }, status=status.HTTP_200_OK)
        
    except Exception as e:
        return Response({
            "success": False,
            "message": str(e)
        }, status=status.HTTP_400_BAD_REQUEST)

@api_view(["GET"])
def leaderboard(request):
    players = Player.objects.all().order_by("-experience")[:20]
    leaderboard = [
        {"nickname": p.nickname, "avatar": p.avatar, "experience": p.experience}
        for p in players
    ]
    return Response({"leaderboard": leaderboard}, status=status.HTTP_200_OK)