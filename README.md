# 一夜终极狼人 · 桌面派对版

> **面对面 + 各自手机**版一夜终极狼人。所有人围坐一桌，一人创建房间分享房号，
> 其他人用自己的手机加入。讨论靠嘴说，私密信息（角色 / 夜晚揭示）只发到本人手机。
> 关闭页面不会泄密，刷新自动重连。
>
> 不做 app 内聊天，因为没必要 —— 你们就在彼此对面。

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
                                                  auth.js   账号 / 战绩 (可选)
                                                  db.js     Postgres (可选)
```

服务端权威：所有夜晚行动、洗牌、计票都在服务器执行，
客户端只是显示器，不持有完整牌组信息。

## 目录结构

```
.
├── app/                    # React 前端（Vercel）
│   ├── src/
│   │   ├── main.jsx
│   │   ├── App.jsx
│   │   ├── GameContext.jsx     # socket + 全局状态 + 账号
│   │   ├── index.css
│   │   ├── game/
│   │   │   ├── roles.js
│   │   │   └── engine.js
│   │   └── screens/
│   │       ├── HomeScreen.jsx        # 主页（含账号入口）
│   │       ├── AuthScreen.jsx        # 登录/注册
│   │       ├── ProfileScreen.jsx     # 个人资料 + 战绩
│   │       ├── LobbyScreen.jsx       # 大厅 + 角色配置
│   │       ├── NightScreen.jsx       # 夜晚阶段框架
│   │       ├── NightAction.jsx       # 夜晚私密 UI
│   │       ├── DayScreen.jsx         # 白天讨论
│   │       ├── VoteScreen.jsx        # 投票
│   │       └── ResultScreen.jsx      # 结算
│   ├── package.json
│   ├── vite.config.js
│   ├── vercel.json
│   └── .env.example
│
├── server/                 # Node.js + Socket.IO 后端
│   ├── index.js                  # Express + Socket.IO 入口
│   ├── src/
│   │   ├── socket.js             # 事件分发 (含 auth:*)
│   │   ├── rooms.js              # 房间注册表
│   │   ├── game.js               # 单局状态机
│   │   ├── engine.js             # 洗牌/计票/胜负
│   │   ├── roles.js              # 角色定义
│   │   ├── auth.js               # 注册/登录/战绩 (可选)
│   │   └── db.js                 # Postgres 连接池 (可选)
│   ├── package.json
│   ├── Dockerfile
│   └── .env.example
│
├── docker-compose.yml
├── render.yaml
├── LICENSE
└── README.md
```

## 本地运行

需要：Node.js ≥ 18。

```bash
# 终端 1 - 后端
cd server
npm install
npm run dev        # :4000

# 终端 2 - 前端
cd app
npm install
npm run dev        # :5173
```

打开 http://localhost:5173 创建房间，告诉朋友房号让他们加入。

## 部署

### 前端：Vercel

1. 推到 GitHub
2. [vercel.com](https://vercel.com) → New Project → 选这个仓库
3. **Root Directory** = `app`
4. 环境变量 `VITE_SERVER_URL=https://<后端公网地址>`
5. Deploy

### 后端：选其一

**方案 A：自己的服务器（Docker，推荐）**

```bash
git clone <your-repo>
cd one-night-werewolf
docker compose up -d         # :4000
```

记得：
- `docker-compose.yml` 里 `CORS_ORIGIN` 改成你的前端域名
- 套 Nginx/Caddy 反代 + HTTPS（Socket.IO 必须 WSS）

Nginx 反代参考：

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

**方案 B：Render（免费，会休眠）**

仓库根的 `render.yaml` 已经配好。Dashboard → New + → Blueprint → 选仓库 → Apply。
然后在仪表盘环境变量里填 `CORS_ORIGIN`，可选 `DATABASE_URL` / `JWT_SECRET`。
免费层 15 分钟无访问会休眠，下次访问要等 30-60 秒冷启动。

**方案 C：Fly.io**

```bash
cd server
fly launch
fly secrets set CORS_ORIGIN=https://your-app.vercel.app
fly deploy
```

## 用户系统（可选）

服务端检测到 `DATABASE_URL` 后会自动启用账号系统：

- 邮箱+密码注册/登录（bcrypt 哈希 + JWT 30 天）
- 个人资料：昵称、头像表情
- 每局自动记录角色、是否胜利
- 个人战绩页：总场数 / 胜场 / 胜率 / 按阵营拆分 / 最近 20 场

没有数据库时整个系统自动跳过，匿名玩法不受影响。

**启用步骤：**

1. 准备一个 Postgres：
   - [Neon](https://neon.tech) 免费层 0.5GB，不要信用卡（**推荐**）
   - [Supabase](https://supabase.com) 免费层 500MB
   - 或自己服务器的 Postgres
2. 拿到 connection string `postgres://user:pass@host:5432/db`
3. 后端环境变量：
   ```
   DATABASE_URL=postgres://...
   JWT_SECRET=<openssl rand -hex 32 生成>
   ```
4. 服务重启时会自动建表，无需手动迁移

数据表：`users`、`games`、`game_players`，schema 在 `server/src/db.js`。

## 协议与权威性

客户端 ⇄ 服务端 通过 Socket.IO，主要事件：

| 方向 | 事件 | 说明 |
|---|---|---|
| C→S | `auth:register` / `auth:login` / `auth:verify` / `auth:logout` | 账号 |
| C→S | `auth:profile` / `auth:update` | 个人资料 + 战绩 |
| C→S | `create_room` / `join_room` / `reconnect_room` | 房间登入 |
| C→S | `update_config` / `start_game` / `restart_game` | 房主操作 |
| C→S | `night_action` / `night_done` | 夜晚选目标 / "我已知晓" |
| C→S | `cast_vote` / `skip_day` | 投票 / 房主跳过讨论 |
| S→所有 | `room_state` | 房间公开状态 |
| S→所有 | `night_step` | 当前夜晚阶段 |
| S→所有 | `day_phase` / `vote_phase` / `result` | 阶段切换 + 结算 |
| S→私密 | `your_role` / `night_prompt` / `night_reveal` | 仅当事人 |

私密事件通过 `socket.join(playerId)` + `io.to(playerId).emit()` 实现。

## 角色覆盖

12 个角色（9 个有夜晚行动）：👻 化身幽灵 · 🐺 狼人 · 😈 爪牙 · 🛡️ 守夜人 ·
🔮 预言家 · 🦹 强盗 · 👹 捣蛋鬼 · 🍺 酒鬼 · 👁️ 失眠者 · 🧑‍🌾 村民 · 🏹 猎人 · 🥁 皮匠

化身幽灵采用简化版规则：在所有人之前醒来，复制一名玩家的角色后**直接变成那个角色**
（之后的行动、阵营都按新角色算）。与官方规则的差别是化身-狼人会被原狼人看见。

## 已知限制 / 后续可改

- 单进程内存房间，进程重启房间丢失（用户数据用 Postgres 持久化不丢）
- 化身幽灵走的是简化版（house rule），不是官方那种"分两段醒来"的复杂时序
- iOS Safari 息屏后偶发 socket 断开（客户端会自动重连）
- 设计上**只服务面对面玩家**：没有 app 内聊天，没有匹配陌生人；如果你想做纯线上版本，需要自己加

## 隐私与安全

- `.env*` 在 `.gitignore` 里，**绝不要提交真实环境变量**；只提交 `.env.example`
- `.vscode/`、`.vercel/`、`*.pem`、`*.key`、`id_rsa*` 已被 `.gitignore` 屏蔽
- 用户密码通过 bcrypt 10 轮哈希存储，不存明文
- 房间私密信息只走 `socket.join(playerId)` 信道，其他玩家收不到
- 生产环境务必：
  1. `CORS_ORIGIN` 设具体前端域名，不要 `*`
  2. 前端 HTTPS + Socket.IO WSS
  3. `JWT_SECRET` 用强随机值（`openssl rand -hex 32`）

## License

[GPL-3.0](./LICENSE)

