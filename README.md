# One Night Ultimate Werewolf 一夜终极狼人

## 项目概述

一夜终极狼人是一款多人在线桌游，基于React前端和Django后端实现。游戏支持用户注册、登录、创建房间、加入房间和实时游戏。

## 功能特性

- 用户注册和登录（包括Google OAuth登录）
- 创建和加入游戏房间
- 实时游戏通信（WebSocket）
- 游戏角色和逻辑实现
- 排行榜系统

## 环境配置

### 前端环境变量

前端使用环境变量来配置API基础URL和Google OAuth客户端ID。在`frontend/web`目录下创建`.env.local`文件（开发环境）或`.env.production.local`文件（生产环境）：

```
# Google OAuth客户端ID
REACT_APP_GOOGLE_CLIENT_ID=YOUR_GOOGLE_CLIENT_ID

# API基础URL（开发环境默认为http://localhost:8000）
# REACT_APP_API_BASE_URL=http://localhost:8000
```

### 后端环境变量

后端使用环境变量来配置Django设置、数据库连接和Google OAuth。在`backend`目录下创建`.env`文件：

```
# Django设置
DEBUG=True
SECRET_KEY=your-secret-key-here
ALLOWED_HOSTS=localhost,127.0.0.1

# 数据库设置
DATABASE_URL=sqlite:///db.sqlite3

# Redis设置（用于Channels和WebSocket）
REDIS_URL=redis://localhost:6379/0

# Google OAuth设置
GOOGLE_CLIENT_ID=your-google-client-id
GOOGLE_CLIENT_SECRET=your-google-client-secret
```

## API配置

前端使用统一的API配置管理，位于`frontend/web/src/config/api.js`。该文件定义了所有API路径和WebSocket连接URL，确保在不同环境下正确配置。

详细的API文档请参考[API.md](API.md)。

## 部署与开发指南

### 部署指南

- 前端部署指南：[frontend/web/DEPLOYMENT.md](frontend/web/DEPLOYMENT.md)
- 后端部署指南：
  - 通用部署：[backend/DEPLOYMENT.md](backend/DEPLOYMENT.md)
  - Render部署：[backend/RENDER_DEPLOYMENT.md](backend/RENDER_DEPLOYMENT.md)
- Google OAuth配置：[GOOGLE_OAUTH_SETUP.md](GOOGLE_OAUTH_SETUP.md)

### 开发指南

- GitHub推送指南：[GITHUB_GUIDE.md](GITHUB_GUIDE.md)

## Development Log

## Run

### Frontend

#### dependency

- Nodejs
- React
    - axios
    - serve
    - react-router-dom
- antd

### Backend

#### dependency

- django
- uvicorn
- channels
- channels-redis
- redis

Prepare Django Database

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