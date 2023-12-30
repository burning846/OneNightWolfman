from django.http import JsonResponse
from .models import Player, GameRoom, GameRole

def join_room(request, room_id):
    # 这里写逻辑让玩家加入房间
    print(request, room_id)
    # check if room is full
    # add user into 
    return JsonResponse({"message": "Joined room"})

def start_game(request, room_id):
    # 这里写逻辑开始游戏
    # check if room master
    return JsonResponse({"message": "Game started"})

# ...其他视图
