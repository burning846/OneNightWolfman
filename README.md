# 一夜终极狼人 · 多人在线 Web App

> 房间制多人在线版的一夜终极狼人。每位玩家用自己的手机加入同一房间，
> 服务端权威，所有私密信息（角色 / 夜晚揭示）只发给应得的玩家，
> 关闭页面不会泄密、刷新自动重连。

## 技术架构

```
┌──────────────────┐         WebSocket          ┌──────────────────┐
│  app/  (前端)     │ ◀────── Socket.IO ───────▶ │ server/ (后端)    │
│  React + Vite    │                            │ Node.js + Socket │
│  静态部署 Vercel  │                            │ Express          │
└──────────────────┘                            └──────────────────┘
                                                  rooms.js  房间表 (内存)
                                                  game.js   夜晚状态机
                                                  engine.js 纯函数引擎
```

服务端是权威的：所有夜晚行动、洗牌、计票都在服务器执行，
客户端只是"显示器 + 输入设备"，不持有完整牌组信息，因此不存在通过改前端代码作弊的可能。

## 目录结构

```
.
├── app/                    # React 前端（部署到 Vercel 等静态托管）
│   ├── src/
│   │   ├── main.jsx
│   │   ├── App.jsx
│   │   ├── GameContext.jsx     # socket + 全局状态
│   │   ├── index.css
│   │   ├── game/
│   │   │   ├── roles.js
│   │   │   └── engine.js
│   │   └── screens/
│   │       ├── HomeScreen.jsx       # 创建/加入房间
│   │       ├── LobbyScreen.jsx      # 大厅 + 角色配置
│   │       ├── NightScreen.jsx      # 夜晚阶段框架
│   │       ├── NightAction.jsx      # 夜晚所有角色的私密 UI
│   │       ├── DayScreen.jsx        # 白天讨论
│   │       ├── VoteScreen.jsx       # 投票
│   │       └── ResultScreen.jsx     # 结算
│   ├── package.json
│   ├── vite.config.js
│   ├── vercel.json
│   ├── .env.example
│   └── index.html
│
├── server/                 # Node.js + Socket.IO 后端
│   ├── index.js                    # Express + Socket.IO 入口
│   ├── src/
│   │   ├── socket.js               # Socket.IO 事件分发
│   │   ├── rooms.js                # 房间注册表 / Room 类
│   │   ├── game.js                 # 单局状态机 GameSession
│   │   ├── engine.js               # 纯函数（洗牌、计票、胜负）
│   │   └── roles.js                # 角色定义
│   ├── package.json
│   ├── Dockerfile
│   └── .env.example
│
├── docker-compose.yml      # 一条命令拉起后端
├── LICENSE
└── README.md
```

## 在本地运行

需要：Node.js ≥ 18。

```bash
# 终端 1 - 后端
cd server
npm install
npm run dev        # 监听 :4000

# 终端 2 - 前端
cd app
npm install
npm run dev        # 监听 :5173
```

打开 http://localhost:5173 ，创建房间，把房号告诉同一局域网或公网上的朋友，
他们也用同一个前端地址加入即可。

## 部署

### 前端：Vercel（推荐，免费）

1. 把仓库推到 GitHub
2. 登录 [vercel.com](https://vercel.com) → Add New Project → 选这个仓库
3. **Root Directory** 设为 `app`
4. **Build Command** `npm run build`，**Output Directory** `dist`（vercel.json 已配置好）
5. 添加环境变量 `VITE_SERVER_URL=https://<你的后端公网地址>`
6. Deploy
