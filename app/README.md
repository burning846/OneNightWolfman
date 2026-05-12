# 一夜狼人 - 前端

Vite + React + Socket.IO 客户端。

## 本地

```bash
npm install
npm run dev      # http://localhost:5173
npm run build    # 输出 dist/
npm run preview  # 本地预览构建产物
```

环境变量：

- `VITE_SERVER_URL`：后端地址，开发时留空默认 `http://localhost:4000`。
  生产部署到 Vercel 时在 Project Settings → Environment Variables 里设置为你的后端公网地址。

## 部署到 Vercel

1. New Project → 选这个仓库
2. **Root Directory** = `app`
3. 框架预设会被自动识别为 Vite
4. 添加环境变量 `VITE_SERVER_URL=https://<your-backend>`
5. Deploy

`vercel.json` 里的 `rewrites` 让所有路径都回退到 `index.html`，
SPA 路由（如果以后加）能正常工作。
