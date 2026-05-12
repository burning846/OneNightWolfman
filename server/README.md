# 一夜狼人 - 后端

Node.js + Express + Socket.IO。

## 本地

```bash
npm install
npm run dev
# listens on :4000
```

环境变量见 `.env.example`：

- `PORT`：监听端口，默认 4000
- `CORS_ORIGIN`：允许的前端来源，逗号分隔。生产必填。

## Docker

```bash
docker build -t wolf-server .
docker run -p 4000:4000 -e CORS_ORIGIN=https://your-app.vercel.app wolf-server
```

或在仓库根用 `docker compose up -d`。

## API 概览（Socket.IO）

详见上一级 `README.md` 的「协议与权威性」一节。所有事件名定义在 `src/socket.js` 中。
