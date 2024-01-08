# consumers.py

from channels.generic.websocket import AsyncWebsocketConsumer
from game.room_management import RoomManager
from game.message import MessageType
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
        try:
            text_data_json = json.loads(text_data)
        except Exception as e:
            print(e)


        message_type = text_data_json['type']
        message = text_data_json['message']
        print(self.channel_name)

        """
        1. create room
        2. join/leave room
        3. change room settings
        4. start game
            4.1 game initialization
        5. player actions
            5.1 
            ...
            5.9
        6. vote werewolf
        """

        if message_type == MessageType.CREATE_ROOM:
            """
            获取房主信息
            根据设置创建游戏
            TODO
            如果房主离开，如何指定下一个房主
            """
            self.user_id = message['user_id']
            success, messages = RoomManager.create_room(self.room_id, self.channel_name)

        if message_type == MessageType.PLAYER_JOIN:
            """
            获取玩家信息，便于之后通过房间组消息分发
            """
            self.user_id = message['user_id']
            success, messages = RoomManager.join_room(self.room_id, self.channel_name)
        
        if message_type == MessageType.GAME_START:
            success, messages = RoomManager.start_game(self.room_id)

        if message_type in [
            MessageType.DOPPELGANGER_TURN,
            MessageType.WEREWOLF_TURN,
            MessageType.MINION_TURN,
            MessageType.MASON_TURN,
            MessageType.SEER_TURN,
            MessageType.ROBBER_TURN,
            MessageType.TROUBLEMAKER_TURN,
            MessageType.DRUNK_TURN,
            MessageType.INSOMNIAC_TURN,
            MessageType.VOTE_STAGE
        ]:
            success, messages = RoomManager.run_game(self.room_id, message)

        if success:
            for message in messages:
                await self.channel_layer.group_send(
                    self.room_group_name,
                    message
                )
        else:
            # Log error
            print(messages)
        
        # print(RoomManager.rooms)
        # '{"type": "join", "message": "123"}'

        # 发送消息到房间组
        # await self.channel_layer.group_send(
        #     self.room_group_name,
        #     {
        #         'type': 'game_message',
        #         'message': message
        #     }
        # )

    ###########################
    # send message to players
    ###########################
    async def group_message(self, event):
        message = event['message']
        await self.send(text_data=json.dumps({
            'type': 'announcement',
            'message': message
        }))

    # 接收房间组中的消息
    async def individual_message(self, event):
        target = event['target']
        message = event['message']
        if self.player_id in target:
            # 发送消息到 WebSocket
            await self.send(text_data=json.dumps({
                'type': 'secret',
                'message': message
            }))
