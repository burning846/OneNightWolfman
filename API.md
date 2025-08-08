# API文档

## RESTful API

### 用户认证

#### 登录
- **路径**: `/api/login/`
- **方法**: POST
- **请求体**:
  ```json
  {
    "username": "用户名",
    "password": "密码"
  }
  ```
- **响应**: 用户信息和认证令牌

#### 注册
- **路径**: `/api/register/`
- **方法**: POST
- **请求体**:
  ```json
  {
    "username": "用户名",
    "password": "密码",
    "nickname": "昵称"
  }
  ```
- **响应**: 用户信息和认证令牌

#### Google登录
- **路径**: `/api/google_login/`
- **方法**: POST
- **请求体**:
  ```json
  {
    "token": "Google认证令牌"
  }
  ```
- **响应**: 用户信息和认证令牌

#### 设置用户名
- **路径**: `/api/set_username/`
- **方法**: POST
- **请求体**:
  ```json
  {
    "username": "新用户名"
  }
  ```
- **响应**: 更新后的用户信息

### 房间管理

#### 获取房间信息
- **路径**: `/api/room/{roomCode}/`
- **方法**: GET
- **响应**: 房间信息和玩家列表

#### 创建房间
- **路径**: `/api/create_room/`
- **方法**: POST
- **请求体**:
  ```json
  {
    "config": {
      "roles": ["werewolf", "seer", "robber", ...],
      "options": {...}
    }
  }
  ```
- **响应**: 新创建的房间信息

#### 加入房间
- **路径**: `/api/join_room/`
- **方法**: POST
- **请求体**:
  ```json
  {
    "room_code": "房间代码"
  }
  ```
- **响应**: 房间信息

#### 邀请玩家
- **路径**: `/api/invite_player/`
- **方法**: POST
- **请求体**:
  ```json
  {
    "room_code": "房间代码",
    "username": "被邀请的用户名"
  }
  ```
- **响应**: 邀请结果

#### 踢出玩家
- **路径**: `/api/kick_player/`
- **方法**: POST
- **请求体**:
  ```json
  {
    "room_code": "房间代码",
    "username": "被踢出的用户名"
  }
  ```
- **响应**: 操作结果

### 游戏数据

#### 获取排行榜
- **路径**: `/api/leaderboard/`
- **方法**: GET
- **响应**: 排行榜数据

## WebSocket API

### 游戏WebSocket
- **连接URL**: `/ws/game/{roomCode}/`

### General Client Message

```json
{
    "type": "",
    "message": {} 
}
```

- game action

```json
{
    "type": "game_action",
    "message": {
        "player": "123",
        "player_index": 0,
        "target": [1,2]
    }
}
```

### General Server Message
```json
{
    "type": "string",
    "data": {}
}
```

- next stage
```json
{
    "type": "next_stage",
    "message": "success",
    "data": {
        "status": "doppelganger_turn", 
        "interval": 15
    }
}
```

-