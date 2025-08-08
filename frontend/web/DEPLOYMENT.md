# 前端部署指南

本文档提供了如何部署一夜狼人游戏前端的详细步骤，特别是针对Vercel平台的部署。

## Vercel部署

[Vercel](https://vercel.com)是一个现代化的静态网站和无服务器函数托管平台，非常适合部署React应用。

### 准备工作

1. 确保你的代码已经推送到GitHub、GitLab或Bitbucket等Git仓库
2. 注册[Vercel](https://vercel.com)账号

### 部署步骤

1. 登录Vercel控制台
2. 点击"New Project"按钮
3. 导入你的Git仓库
4. 配置项目：
   - **Framework Preset**: 选择"Create React App"
   - **Root Directory**: 如果前端代码在子目录中，指定为`frontend/web`
   - **Build Command**: 保持默认的`npm run build`
   - **Output Directory**: 保持默认的`build`

5. 环境变量设置：
   - 点击"Environment Variables"部分
   - 添加以下环境变量：
     - `REACT_APP_GOOGLE_CLIENT_ID`: 你的Google OAuth客户端ID

6. 点击"Deploy"按钮开始部署

### 自定义域名设置

1. 在项目控制台中，点击"Settings"选项卡
2. 选择"Domains"部分
3. 添加你的自定义域名
4. 按照Vercel提供的说明配置DNS记录

## 后端API配置

### 开发环境

在开发环境中，前端默认连接到`http://localhost:8000`作为API服务器。

### 生产环境

在生产环境中，有两种常见的API配置方式：

#### 1. 使用相对路径（推荐）

如果你的前端和后端部署在同一个域名下，可以使用相对路径。这种情况下，你需要配置Web服务器（如Nginx）将API请求代理到后端服务器。

示例Nginx配置：

```nginx
server {
    listen 80;
    server_name your-domain.com;

    # 前端静态文件
    location / {
        root /path/to/frontend/build;
        try_files $uri $uri/ /index.html;
    }

    # API请求代理
    location /api/ {
        proxy_pass http://backend-server:8000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
    }

    # WebSocket代理
    location /ws/ {
        proxy_pass http://backend-server:8000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host $host;
    }
}
```

#### 2. 使用绝对URL

如果前端和后端部署在不同的域名下，你需要设置`REACT_APP_API_BASE_URL`环境变量为后端API的完整URL。

在Vercel中，添加以下环境变量：
- `REACT_APP_API_BASE_URL`: 例如`https://api.your-domain.com`

### CORS配置

如果前端和后端部署在不同的域名下，你需要在后端配置CORS（跨源资源共享）。

在Django后端的`settings.py`中：

```python
CORS_ALLOWED_ORIGINS = [
    "https://your-frontend-domain.com",
    # 开发环境
    "http://localhost:3000",
]

CORS_ALLOW_CREDENTIALS = True
```

确保安装了`django-cors-headers`包并将其添加到`INSTALLED_APPS`中。

## 持续集成/持续部署(CI/CD)

Vercel自动支持CI/CD。每当你推送代码到Git仓库的主分支时，Vercel会自动构建和部署你的应用。

你也可以为不同的分支创建预览部署，这对于测试新功能非常有用。

## 故障排除

### API连接问题

如果前端无法连接到后端API，请检查：

1. API基础URL配置是否正确
2. 后端服务器是否正常运行
3. CORS配置是否正确
4. 网络请求是否有错误（使用浏览器开发者工具检查）

### WebSocket连接问题

如果WebSocket连接失败，请检查：

1. WebSocket URL是否正确
2. 后端WebSocket服务器是否正常运行
3. 代理配置是否正确处理WebSocket协议升级