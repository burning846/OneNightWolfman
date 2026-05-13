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

### 后端：选其一

#### 方案 A：自己的服务器（Docker，推荐）

```bash
# 在服务器上
git clone <your-repo>
cd one-night-werewolf
docker compose up -d
# 服务监听 :4000
```

记得：
- 把 `docker-compose.yml` 里 `CORS_ORIGIN` 改成你的前端域名（如 `https://wolf.example.com`），
  生产环境**不要**保持 `*`。
- 在反向代理（Nginx/Caddy）前加 HTTPS。Socket.IO 在 HTTPS 站点必须走 WSS。
- 如果不用反向代理，也可以直接把 4000 端口暴露出去，但前端要用 `http://`。

参考 Nginx 反代配置：

```nginx
server {
    listen 443 ssl http2;
    server_name wolf-api.example.com;

    location / {
        proxy_pass http://127.0.0.1:4000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_read_timeout 86400;
    }
}
```

#### 方案 B：Render.com（免费，但会休眠）

1. 登录 [render.com](https://render.com) → New → Web Service
2. 连接此仓库
3. **Root Directory** 设为 `server`
4. **Environment** Node，**Build Command** `npm install`，**Start Command** `npm start`
5. 添加环境变量：
   - `CORS_ORIGIN=https://<你的 Vercel 前端地址>`
6. Deploy；Render 会分配一个 `*.onrender.com` 地址，把它填到 Vercel 的 `VITE_SERVER_URL`

注意：Render 免费层 15 分钟无访问会休眠，下次访问需要等 30-60 秒冷启动。

#### 方案 C：Fly.io（免费额度，常驻）

```bash
cd server
fly launch          # 按提示选 region、生成 fly.toml
fly secrets set CORS_ORIGIN=https://your-app.vercel.app
fly deploy
```

#### 方案 D：本地用作朋友局域网游戏

什么都不用部署，运行 `npm run dev` 后让朋友访问 `http://<你的内网IP>:5173` 即可。

## 协议与权威性

客户端 ⇄ 服务端 通过 Socket.IO 通信，主要事件：

| 方向 | 事件 | 说明 |
|---|---|---|
| C→S | `create_room` / `join_room` / `reconnect_room` | 房间登入 |
| C→S | `update_config` | 房主改角色/时长 |
| C→S | `start_game` | 房主开局 |
| C→S | `night_action` | 玩家选择目标 |
| C→S | `night_done` | 玩家"我已知晓"，推进到下一步 |
| C→S | `cast_vote` | 投票 |
| C→S | `restart_game` | 房主"再来一局" |
| S→所有 | `room_state` | 房间公开状态（玩家列表、阶段等） |
| S→所有 | `night_step` | 当前夜晚阶段（不暴露身份） |
| S→所有 | `day_phase` / `vote_phase` | 阶段切换 + 截止时间 |
| S→所有 | `result` | 最终结算 |
| S→私密 | `your_role` | 你的初始角色 |
| S→私密 | `night_prompt` | 你需要做出选择 |
| S→私密 | `night_reveal` | 私密揭示 |

私密事件通过 `socket.join(playerId)` + `io.to(playerId).emit()` 实现，
其他玩家的 socket 不会收到。

## 角色覆盖

实现了一夜终极狼人核心扩展中的所有 12 个角色，
其中 8 个有夜晚行动（按顺序醒来），3 个被动角色：

🐺 狼人 · 😈 爪牙 · 🛡️ 守夜人 · 🔮 预言家 · 🦹 强盗 · 👹 捣蛋鬼 · 🍺 酒鬼 · 👁️ 失眠者 · 🧑‍🌾 村民 · 🏹 猎人 · 🥁 皮匠

> 化身幽灵（Doppelganger）规则太特殊（要在被复制者醒来后再次行动），
> 目前没有实现。等你想加再说。

## 已知限制 / 后续可改

- 单进程内存房间，进程重启房间丢失。需要的话改 Redis 即可。
- 没有持久化用户/积分系统。
- 没有聊天，靠现场语音/微信群。
- 没有"猎人在夜里被偷牌后白天能否触发"的细化规则，按"按最终身份判定"实现。
- iOS Safari 上偶发 socket 在息屏后断开（这是 Safari 行为）；客户端会自动重连。
- 化身幽灵（Doppelganger）规则太特殊（要在被复制者醒来后再次行动），目前没有实现。

## 隐私与安全

仓库本身：
- `.env*` 已经在 `.gitignore` 里，**绝不要提交真实的环境变量**；只提交 `.env.example` 作为模板。
- `.vscode/`、`.vercel/`、`*.pem`、`*.key`、`id_rsa*` 已被 `.gitignore` 屏蔽。
- 服务端不存任何玩家信息，没有数据库、没有日志写入。每个房间在内存中，1 小时没人就自动清理。
- 私密事件（角色、夜晚揭示）只通过 `socket.join(playerId)` 的私密信道发送，其他玩家收不到。
- 生产环境务必：
  1. `CORS_ORIGIN` 设为具体的前端域名，不要保持 `*`
  2. 前端走 HTTPS，对应 Socket.IO 必须 WSS
  3. 反向代理（Nginx / Caddy）的 `Upgrade` / `Connection` 头需要正确转发

仓库历史：
- 早期提交里含有一份 Django 自动生成的 dev `SECRET_KEY`（带 `django-insecure-` 前缀，Django 自己标注的"仅用于开发"），不是真实生产密钥；旧的 Django 代码本身已经从工作区移除。
- 若要彻底从 git 历史里抹掉旧 Django 代码，可用 `git filter-repo` 重写历史；但需要 force push 覆盖远端，谨慎操作。

## License

[GPL-3.0](./LICENSE)
