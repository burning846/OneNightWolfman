from django.contrib.auth.models import User
from django.db import models


class Player(models.Model):
    user = models.OneToOneField(User, on_delete=models.CASCADE)
    nickname = models.CharField(max_length=100)
    # 可以添加更多玩家相关的字段，如头像、积分等
    avatar = models.URLField()
    experience = models.IntegerField()

class Room(models.Model):
    room_id = models.IntegerField(primary_key=True, unique=True)
    config = models.JSONField()
    players = models.JSONField(default=list)  # Storing as a JSON list of user IDs
    is_active = models.BooleanField(default=False)

    def __str__(self):
        return f"Room {self.room_id}"