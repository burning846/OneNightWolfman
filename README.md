# 一夜终极狼人

## TODOs

- [ ] 用户系统
- [ ] 游戏核心玩法逻辑
- [ ] 异常捕获与处理

## Development Log

## run

To use Django Channel Websocket features, we use uvicorn ASGI server as the backend server.
```bash
uvicorn wolfBackend.asgi:application
```


## Notes
前端：
- 用户注册登录
- 用户创建房间
    - 房间设置
- 用户加入房间
    - 加入websocket用户组
- 用户开始游戏
    - 和游戏服务器建立连接

后端：
- 数据库
    - 用户数据
    - 游戏历史数据
    - 数据备份与恢复
- 服务器
    - 房间数据
    - 游戏服务器
        - 游戏主逻辑
        - 游戏全局锁
        - 玩家重连机制
        - 聊天
        - 语音（暂不考虑）