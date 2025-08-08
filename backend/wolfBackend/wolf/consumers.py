# consumers.py

from channels.generic.websocket import AsyncWebsocketConsumer
from game.room_management import RoomManager
from game.message import MessageType
import json

class GameConsumer(AsyncWebsocketConsumer):
    async def connect(self):
        """
        try to connect websocket
        if success, then join room
        """
        self.room_id = self.scope["url_route"]["kwargs"]["room_id"]
        self.player_id = self
        self.room_group_name = f"game_{self.room_id}"

        # 加入房间组
        await self.channel_layer.group_add(self.room_group_name, self.channel_name)

        await self.accept()

    async def disconnect(self, close_code):
        # 离开房间组
        await self.channel_layer.group_discard(self.room_group_name, self.channel_name)
        
        # 如果用户已经加入了房间，则在断开连接时离开房间
        if hasattr(self, 'user_id'):
            RoomManager.leave_room(self.room_id, self.user_id)
        

    # 接收消息
    async def receive(self, text_data):
        """ """

        try:
            print(text_data)
            text_data_json = json.loads(text_data)

            message_type = text_data_json["type"]
            
            # 根据消息类型处理不同的消息
            if message_type == MessageType.CREATE_ROOM:
                """
                获取房主信息
                根据设置创建游戏
                """
                self.user_id = text_data_json["message"]["user_id"]
                settings = text_data_json["message"]["settings"]
                success, messages = RoomManager.create_room(
                    self.user_id, self.room_id, settings
                )

            elif message_type == MessageType.PLAYER_JOIN:
                """
                获取玩家信息，便于之后通过房间组消息分发
                """
                self.user_id = text_data_json["message"]["user_id"]
                success, messages = RoomManager.join_room(self.room_id, self.user_id)

            elif message_type == MessageType.GAME_START:
                # 开始游戏
                success, messages = RoomManager.start_game(
                    self.room_id, self.channel_layer, self.room_group_name
                )

            elif message_type == MessageType.GAME_ACTION:
                # 处理游戏中的玩家行动
                action = text_data_json["action"]
                success, messages = RoomManager.run_game(self.room_id, action)

            elif message_type == MessageType.MESSAGE:
                # 处理普通聊天消息
                message = text_data_json.get("message", "")
                print(self, "send:", message)
                await self.channel_layer.group_send(
                    self.room_group_name,
                    {
                        "type": "send_message",
                        "message": message,
                    },
                )
                return

            # 处理消息结果
            if success:
                for message in messages:
                    await self.channel_layer.group_send(self.room_group_name, message)
            else:
                # 记录错误
                print("Error:", messages)
                await self.channel_layer.group_send(
                    self.room_group_name,
                    {
                        "type": "group_message",
                        "message": {"type": "error", "error": messages},
                    },
                )

        except Exception as e:
            print("Exception:", e)
            await self.send(
                text_data=json.dumps({"type": "error", "message": str(e)})
            )

    ###########################
    # 发送消息到玩家
    ###########################
    
    # 发送群组消息（所有人可见）
    async def group_message(self, event):
        message = event["message"]
        await self.send(
            text_data=json.dumps({"type": "announcement", "message": message})
        )

    # 发送个人消息（只有特定玩家可见）
    async def individual_message(self, event):
        message = event["message"]
        
        # 检查消息是否有目标玩家
        if "target" in event:
            target = event["target"]
            if hasattr(self, 'user_id') and self.user_id in target:
                # 发送消息到 WebSocket
                await self.send(
                    text_data=json.dumps({"type": "secret", "message": message})
                )
        else:
            # 如果没有指定目标，则直接发送消息
            await self.send(
                text_data=json.dumps({"type": "secret", "message": message})
            )

    # 发送聊天消息
    async def send_message(self, event):
        message = event["message"]
        await self.send(text_data=json.dumps({"type": "message", "message": message}))
    
    # 处理游戏状态更新
    async def game_state_update(self, event):
        state = event["state"]
        await self.send(text_data=json.dumps({"type": "game_state", "state": state}))
    
    # 处理角色回合
    async def role_turn(self, event):
        turn_data = event["turn_data"]
        # 检查是否是当前玩家的回合
        if hasattr(self, 'user_id') and turn_data.get("player") == self.user_id:
            await self.send(text_data=json.dumps({"type": "role_turn", "data": turn_data}))
    
    # 处理投票阶段
    async def vote_stage(self, event):
        vote_data = event["vote_data"]
        await self.send(text_data=json.dumps({"type": "vote_stage", "data": vote_data}))
    
    # 处理游戏结束
    async def game_end(self, event):
        result = event["result"]
        await self.send(text_data=json.dumps({"type": "game_end", "result": result}))
