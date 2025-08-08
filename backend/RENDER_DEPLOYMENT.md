# 使用Render部署后端服务

本文档提供了如何在Render平台上部署一夜狼人游戏后端的详细步骤。

## Render简介

Render是一个现代化的云平台，提供了简单易用的Web服务、数据库和静态网站托管服务。它支持自动部署、SSL证书、全球CDN等功能，非常适合部署Django应用。

## 准备工作

1. 创建[Render账户](https://render.com/)
2. 将项目代码推送到GitHub或GitLab仓库
3. 确保项目根目录包含以下文件：
   - `requirements.txt`：列出所有Python依赖
   - `runtime.txt`：指定Python版本（例如：`python-3.9.0`）

## 配置文件

### 创建build.sh文件

在后端目录创建`build.sh`文件，包含构建和迁移命令：

```bash
#!/usr/bin/env bash
# 退出前执行所有命令
set -o errexit

pip install -r requirement.txt

cd wolfBackend
python manage.py collectstatic --no-input
python manage.py migrate
```

### 创建Procfile

在后端目录创建`Procfile`文件，定义启动命令：

```
web: cd wolfBackend && gunicorn wolfBackend.asgi:application -k uvicorn.workers.UvicornWorker --log-file -
```

## 在Render上部署

### 1. 创建Web服务

1. 登录Render控制台
2. 点击"New +"按钮，选择"Web Service"
3. 连接您的GitHub或GitLab仓库
4. 选择包含后端代码的仓库

### 2. 配置Web服务

填写以下信息：

- **Name**：为您的服务命名（例如：onuw-backend）
- **Region**：选择离您用户最近的区域
- **Branch**：选择要部署的分支（通常是main或master）
- **Root Directory**：如果后端代码在子目录中，指定路径（例如：backend）
- **Runtime**：选择Python
- **Build Command**：`chmod +x build.sh && ./build.sh`
- **Start Command**：`cd wolfBackend && gunicorn wolfBackend.asgi:application -k uvicorn.workers.UvicornWorker --log-file -`

### 3. 配置环境变量

点击"Environment"选项卡，添加以下环境变量：

```
DEBUG=False
SECRET_KEY=your-secure-secret-key
ALLOWED_HOSTS=.onrender.com,your-custom-domain.com
DATABASE_URL=postgres://postgres:postgres@onuw-db:5432/onuw
REDIS_URL=redis://redis:6379/0
GOOGLE_CLIENT_ID=your-google-client-id
GOOGLE_CLIENT_SECRET=your-google-client-secret
```

### 4. 配置数据库

1. 在Render控制台，点击"New +"按钮，选择"PostgreSQL"
2. 填写数据库信息：
   - **Name**：为数据库命名（例如：onuw-db）
   - **Database**：数据库名称（例如：onuw）
   - **User**：数据库用户名（默认为postgres）
   - **Region**：选择与Web服务相同的区域
3. 创建数据库后，获取连接信息并更新Web服务的`DATABASE_URL`环境变量

### 5. 配置Redis（用于WebSocket）

由于Render不直接提供Redis服务，您有两个选择：

#### 选项1：使用外部Redis服务

1. 注册[Redis Labs](https://redislabs.com/)或其他Redis云服务
2. 创建Redis实例
3. 获取连接URL并更新Web服务的`REDIS_URL`环境变量

#### 选项2：使用内存通道层（不推荐用于生产）

修改`settings.py`中的通道层配置：

```python
CHANNEL_LAYERS = {
    "default": {
        "BACKEND": "channels.layers.InMemoryChannelLayer"
    }
}
```

### 6. 配置CORS和允许的主机

确保在`settings.py`中正确配置CORS和允许的主机：

```python
ALLOWED_HOSTS = os.environ.get('ALLOWED_HOSTS', '').split(',')

CORS_ALLOWED_ORIGINS = [
    "https://your-frontend-domain.com",
    "https://your-app.vercel.app",
]

CORS_ALLOW_CREDENTIALS = True
```

### 7. 部署服务

点击"Create Web Service"按钮开始部署。部署过程可能需要几分钟时间。

## 连接前端与后端

1. 在前端项目中，将API基础URL设置为Render服务的URL：
   ```
   REACT_APP_API_BASE_URL=https://your-backend-service.onrender.com
   ```

2. 确保WebSocket连接也使用相同的基础URL（但协议为wss）：
   ```javascript
   const wsUrl = `wss://your-backend-service.onrender.com/ws/game/${roomCode}/`;
   ```

## 自定义域名（可选）

1. 在Render控制台中，选择您的Web服务
2. 点击"Settings"选项卡，然后点击"Custom Domain"
3. 添加您的自定义域名
4. 按照Render提供的说明在您的DNS提供商处添加CNAME记录

## 持续部署

Render默认配置为自动部署。每当您推送更改到配置的Git分支时，Render将自动重新部署您的服务。

## 监控和日志

1. 在Render控制台中，选择您的Web服务
2. 点击"Logs"选项卡查看应用日志
3. 使用"Metrics"选项卡监控CPU和内存使用情况

## 故障排除

### WebSocket连接问题

- 确保前端使用`wss://`协议（而不是`ws://`）连接到Render服务
- 检查CORS配置是否正确
- 验证Redis连接是否正常工作

### 数据库连接问题

- 确保`DATABASE_URL`环境变量格式正确
- 检查数据库服务是否正常运行
- 验证IP访问限制是否已正确配置

### 部署失败

- 检查构建日志以获取详细错误信息
- 确保`requirements.txt`文件包含所有必要的依赖
- 验证`build.sh`和`Procfile`文件格式是否正确

## 性能优化

- 使用Render的自动扩展功能根据流量自动调整实例数量
- 配置缓存以减少数据库查询
- 使用Render的CDN功能加速静态文件交付

## 安全建议

- 定期更新依赖包
- 使用环境变量存储敏感信息
- 启用Render的DDoS保护
- 配置适当的CORS设置
- 使用强密码和密钥