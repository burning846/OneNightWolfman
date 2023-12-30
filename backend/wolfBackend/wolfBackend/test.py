# tests.py

import pytest
from channels.testing import WebsocketCommunicator
from django.contrib.auth.models import User
from wolfBackend.routing import application

@pytest.mark.asyncio
async def test_my_consumer():
    # 创建一个WebSocket连接
    communicator = WebsocketCommunicator(application, "/ws/some_path/")
    connected, subprotocol = await communicator.connect()
    assert connected
    # 发送消息到服务端
    await communicator.send_to(text_data="hello")
    # 接收服务端的响应
    response = await communicator.receive_from()
    assert response == "echo: hello"
    # 关闭连接
    await communicator.disconnect()
