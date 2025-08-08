# 一夜狼人游戏前端

这个项目是一夜狼人游戏的前端部分，使用React构建。

## 环境配置

### 环境变量设置

1. 复制`.env.example`文件为`.env.local`：

```bash
cp .env.example .env.local
```

2. 编辑`.env.local`文件，填入实际的环境变量值：

```
# Google OAuth客户端ID
REACT_APP_GOOGLE_CLIENT_ID=你的Google客户端ID

# API基础URL（可选，默认开发环境为http://localhost:8000）
# REACT_APP_API_BASE_URL=http://localhost:8000
```

### API配置

前端使用`src/config/api.js`文件统一管理API和WebSocket的URL配置：

- 开发环境默认使用`http://localhost:8000`作为API基础URL
- 生产环境默认使用相对路径
- WebSocket连接会根据当前环境自动选择合适的协议（ws/wss）

## 可用脚本

在项目目录中，你可以运行：

### `npm start`

在开发模式下运行应用。
在浏览器中打开 [http://localhost:3000](http://localhost:3000) 查看。

当你修改代码时，页面会自动重新加载。
你也可以在控制台中看到任何lint错误。

### `npm test`

在交互式监视模式下启动测试运行器。

### `npm run build`

将应用构建到`build`文件夹中，用于生产环境。
它正确地将React打包到生产模式中，并优化构建以获得最佳性能。

构建被压缩，文件名包含哈希值。
你的应用已准备好部署！

## Google OAuth登录配置

请参考项目根目录下的`GOOGLE_OAUTH_SETUP.md`文件，了解如何配置Google OAuth登录。

## 部署说明

### Vercel部署

本项目可以轻松部署到Vercel平台：

1. 在Vercel中导入项目
2. 设置环境变量：
   - `REACT_APP_GOOGLE_CLIENT_ID`：你的Google客户端ID
3. 部署项目

### 其他平台部署

对于其他平台，请确保：

1. 构建项目：`npm run build`
2. 配置服务器将所有路由请求重定向到`index.html`
3. 设置必要的环境变量
