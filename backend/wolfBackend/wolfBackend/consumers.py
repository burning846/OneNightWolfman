# consumers.py

from channels.generic.websocket import AsyncWebsocketConsumer
from backend.wolfBackend.game.room_management import RoomManager
import json

# class GameRoom:
#     def __init__(self, players):
#         self.players = players
#         self.stage = "setup"
#         self.roles = self.assign_roles(players)
#         # ...

#     def assign_roles(self, players):
#         # 随机分配角色
#         # ...

#     def start_night(self):
#         self.stage = "night"
#         # 按顺序激活角色技能
#         # ...

#     def process_vote(self, votes):
#         # 处理投票结果
#         # ...

#     def check_game_end(self):
#         # 检查游戏是否结束并判定胜利方
#         # ...

# main Game Logic
class GameConsumer(AsyncWebsocketConsumer):
    async def connect(self):
        """
        try to connect websocket
        if success, then join room
        """
        self.room_id = self.scope['url_route']['kwargs']['room_id']
        self.player_id = self
        self.room_group_name = f'game_{self.room_id}'

        # 加入房间组
        await self.channel_layer.group_add(
            self.room_group_name,
            self.channel_name
        )

        await self.accept()

    async def disconnect(self, close_code):
        # 离开房间组
        await self.channel_layer.group_discard(
            self.room_group_name,
            self.channel_name
        )

    # 接收消息
    async def receive(self, text_data):
        print(text_data)
        text_data_json = json.loads(text_data)
        message_type = text_data_json['type']
        message = text_data_json['message']
        print(self.channel_name)

        """
        1. create room
        2. join room
        3. leave room
        4. start game
        5. player actions
            5.1 
            ...
            5.9
        6. vote werewolf
        """

        if message_type == 'join':
            """
            获取玩家信息，便于之后通过房间组消息分发
            """
            self.user_id = message['user_id']
            RoomManager.join_room(self.room_id, self.channel_name)
            await self.channel_layer.group_send(
                self.room_group_name,
                {
                    'type': 'announce_join',
                    'message': f'Someone joined room {self.room_id}'
                }
            )
        
        print(RoomManager.rooms)
        '{"type": "join", "message": "123"}'

        # 发送消息到房间组
        # await self.channel_layer.group_send(
        #     self.room_group_name,
        #     {
        #         'type': 'game_message',
        #         'message': message
        #     }
        # )

    async def announce_join(self, event):
        message = event['message']
        await self.send(text_data=json.dumps({
            'type': 'announcement',
            'message': message
        }))

    # 接收房间组中的消息
    async def game_message(self, event):
        message = event['message']

        # 发送消息到 WebSocket
        await self.send(text_data=json.dumps({
            'message': message
        }))
