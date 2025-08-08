# 后端部署指南

本文档提供了如何部署一夜狼人游戏后端的详细步骤。

## 准备工作

### 系统要求

- Python 3.8+
- Redis（用于Channels和WebSocket支持）
- 数据库（PostgreSQL推荐，也可以使用MySQL或SQLite）
- Nginx（用于反向代理）

### 安装依赖

```bash
cd backend
pip install -r requirement.txt
```

## 开发环境部署

### 1. 设置环境变量

创建`.env`文件：

```
DEBUG=True
SECRET_KEY=your-secret-key
DATABASE_URL=sqlite:///db.sqlite3
REDIS_URL=redis://localhost:6379/0
GOOGLE_CLIENT_ID=your-google-client-id
GOOGLE_CLIENT_SECRET=your-google-client-secret
ALLOWED_HOSTS=localhost,127.0.0.1
```

### 2. 应用数据库迁移

```bash
cd wolfBackend
python manage.py migrate
```

### 3. 创建超级用户

```bash
python manage.py createsuperuser
```

### 4. 配置Google OAuth

按照项目根目录下的`GOOGLE_OAUTH_SETUP.md`文件中的说明配置Google OAuth。

### 5. 启动开发服务器

```bash
python manage.py runserver
```

## 生产环境部署

### 1. 设置环境变量

在生产环境中，确保设置以下环境变量：

```
DEBUG=False
SECRET_KEY=your-secure-secret-key
DATABASE_URL=postgres://user:password@localhost:5432/dbname
REDIS_URL=redis://localhost:6379/0
GOOGLE_CLIENT_ID=your-google-client-id
GOOGLE_CLIENT_SECRET=your-google-client-secret
ALLOWED_HOSTS=your-domain.com
```

### 2. 配置ASGI服务器

使用Daphne或Uvicorn作为ASGI服务器：

#### Uvicorn

```bash
uvicorn wolfBackend.asgi:application --host 0.0.0.0 --port 8000
```

或者使用Gunicorn作为进程管理器：

```bash
gunicorn wolfBackend.asgi:application -k uvicorn.workers.UvicornWorker -b 0.0.0.0:8000
```

### 3. 配置Nginx反向代理

创建Nginx配置文件：

```nginx
server {
    listen 80;
    server_name your-domain.com;

    # 重定向HTTP到HTTPS
    return 301 https://$host$request_uri;
}

server {
    listen 443 ssl;
    server_name your-domain.com;

    ssl_certificate /path/to/cert.pem;
    ssl_certificate_key /path/to/key.pem;

    # API请求
    location /api/ {
        proxy_pass http://localhost:8000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }

    # Django管理界面
    location /admin/ {
        proxy_pass http://localhost:8000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }

    # Django静态文件
    location /static/ {
        alias /path/to/your/static/files/;
    }

    # WebSocket连接
    location /ws/ {
        proxy_pass http://localhost:8000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }

    # 前端应用（如果与后端部署在同一服务器）
    location / {
        root /path/to/frontend/build;
        try_files $uri $uri/ /index.html;
    }
}
```

### 4. 使用Supervisor管理进程

创建Supervisor配置文件：

```ini
[program:onuw_backend]
command=gunicorn wolfBackend.asgi:application -k uvicorn.workers.UvicornWorker -b 0.0.0.0:8000
directory=/path/to/backend/wolfBackend
user=www-data
autostart=true
autorestart=true
stdout_logfile=/var/log/onuw_backend.log
redirect_stderr=true
environment=
    DEBUG="False",
    SECRET_KEY="your-secure-secret-key",
    DATABASE_URL="postgres://user:password@localhost:5432/dbname",
    REDIS_URL="redis://localhost:6379/0",
    GOOGLE_CLIENT_ID="your-google-client-id",
    GOOGLE_CLIENT_SECRET="your-google-client-secret",
    ALLOWED_HOSTS="your-domain.com"
```

启动Supervisor：

```bash
sudo supervisorctl reread
sudo supervisorctl update
sudo supervisorctl start onuw_backend
```

## 使用Docker部署

### 1. 创建Dockerfile

```dockerfile
FROM python:3.9-slim

WORKDIR /app

COPY requirement.txt .
RUN pip install --no-cache-dir -r requirement.txt

COPY wolfBackend/ .

CMD ["gunicorn", "wolfBackend.asgi:application", "-k", "uvicorn.workers.UvicornWorker", "-b", "0.0.0.0:8000"]
```

### 2. 创建docker-compose.yml

```yaml
version: '3'

services:
  db:
    image: postgres:13
    volumes:
      - postgres_data:/var/lib/postgresql/data/
    env_file:
      - ./.env.db

  redis:
    image: redis:6
    volumes:
      - redis_data:/data

  backend:
    build: .
    restart: always
    depends_on:
      - db
      - redis
    env_file:
      - ./.env
    volumes:
      - static_volume:/app/static
    command: gunicorn wolfBackend.asgi:application -k uvicorn.workers.UvicornWorker -b 0.0.0.0:8000

  nginx:
    image: nginx:1.19
    ports:
      - "80:80"
      - "443:443"
    volumes:
      - ./nginx/conf.d:/etc/nginx/conf.d
      - ./nginx/ssl:/etc/nginx/ssl
      - static_volume:/var/www/static
      - ./frontend/build:/var/www/html
    depends_on:
      - backend

volumes:
  postgres_data:
  redis_data:
  static_volume:
```

### 3. 创建环境变量文件

`.env.db`：

```
POSTGRES_USER=postgres
POSTGRES_PASSWORD=postgres
POSTGRES_DB=onuw
```

`.env`：

```
DEBUG=False
SECRET_KEY=your-secure-secret-key
DATABASE_URL=postgres://postgres:postgres@db:5432/onuw
REDIS_URL=redis://redis:6379/0
GOOGLE_CLIENT_ID=your-google-client-id
GOOGLE_CLIENT_SECRET=your-google-client-secret
ALLOWED_HOSTS=your-domain.com
```

### 4. 启动Docker容器

```bash
docker-compose up -d
```

## 故障排除

### 数据库连接问题

- 检查数据库URL是否正确
- 确保数据库服务器正在运行
- 验证数据库用户权限

### WebSocket连接问题

- 确保Redis服务器正在运行
- 检查Channels配置
- 验证Nginx WebSocket代理配置

### Google OAuth问题

- 确保客户端ID和密钥正确
- 验证已授权的重定向URI
- 检查OAuth同意屏幕配置

## 安全建议

- 使用HTTPS保护所有通信
- 定期更新依赖包
- 使用环境变量存储敏感信息，而不是硬编码
- 限制数据库用户权限
- 配置适当的CORS设置
- 使用强密码和密钥