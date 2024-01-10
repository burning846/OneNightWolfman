# One Night Ultimate Werewolf 一夜终极狼人

## TODOs

- [ ] 用户系统
- [ ] 游戏核心玩法逻辑
- [ ] 异常捕获与处理

## Development Log

## Run

To use Django Channel Websocket features, we use uvicorn ASGI server as the backend server.
```bash
cd backend/wolfBackend
uvicorn wolfBackend.asgi:application
```

## Game Logic

### Charactors & Orders
```
- DOPPELGANGER = 0    # 化身幽灵
- WEREWOLF  = 1       # 狼人
- MINION = 2          # 爪牙
- MASON = 3           # 守夜人
- SEER = 4            # 预言家
- ROBBER = 5          # 强盗
- TROUBLEMAKER = 6    # 捣蛋鬼
- DRUNK = 7           # 酒鬼
- INSOMNIAC = 8       # 失眠者
- VILLAGER = 9        # 村民
- HUNTER = 10         # 猎人
- TANNER = 11         # 皮匠
```

### Game settings

```json
{
    "interval": 15,
    "num_players": 8,
    "roles": {
        "doppelganger": 0,
        "werewolf": 2,
        "minion": 1,
        "mason": 2,
        "seer": 1,
        "robber": 1,
        "troublemaker": 1,
        "drunk": 1,
        "insomniac": 1,
        "hunter": 1,
    }
}
```

### Message
```json
{
    "type": 3,
    "message": {
        "settings": {},
        "player": "",
        "player_index": 0,
        "target": [],
    }
}
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