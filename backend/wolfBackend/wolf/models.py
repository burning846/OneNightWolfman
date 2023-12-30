from django.contrib.auth.models import User
from django.db import models

class Player(models.Model):
    user = models.OneToOneField(User, on_delete=models.CASCADE)
    nickname = models.CharField(max_length=100)
    # 可以添加更多玩家相关的字段，如头像、积分等

class GameRoom(models.Model):
    room_code = models.CharField(max_length=12, unique=True)
    host = models.ForeignKey(Player, related_name='hosted_rooms', on_delete=models.SET_NULL, null=True)
    players = models.ManyToManyField(Player, related_name='joined_rooms')
    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)
    # 可以添加更多房间设置相关的字段，如最大玩家数等

class GameRole(models.Model):
    name = models.CharField(max_length=100)
    description = models.TextField()
    # 根据需要，可以添加更多与角色相关的字段，如特殊能力等

class RoleAssignment(models.Model):
    room = models.ForeignKey(GameRoom, on_delete=models.CASCADE)
    player = models.ForeignKey(Player, on_delete=models.CASCADE)
    role = models.ForeignKey(GameRole, on_delete=models.CASCADE)
    # 可以添加更多与角色分配相关的字段，如角色状态、能力使用情况等
