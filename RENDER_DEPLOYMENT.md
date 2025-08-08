# 在Render上部署狼人杀游戏

本文档提供了在Render平台上部署One Night Ultimate Werewolf游戏的详细步骤。

## 目录

1. [准备工作](#准备工作)
2. [后端部署](#后端部署)
3. [前端部署](#前端部署)
4. [连接前后端](#连接前后端)
5. [自定义域名](#自定义域名)
6. [故障排除](#故障排除)

## 准备工作

1. 创建[Render账户](https://render.com/)
2. 将项目代码推送到GitHub仓库
3. 确保项目结构符合Render部署要求

## 后端部署

### 1. 创建Web服务

1. 登录Render控制台
2. 点击「New +」按钮，选择「Web Service」
3. 连接GitHub仓库
4. 配置服务：
   - **名称**：`werewolf-backend`（或您喜欢的名称）
   - **区域**：选择离您用户最近的区域
   - **分支**：`main`（或您的主分支）
   - **根目录**：`backend`
   - **运行时**：Python
   - **构建命令**：`sh build.sh`
   - **启动命令**：`cd wolfBackend && gunicorn wolfBackend.asgi:application -k uvicorn.workers.UvicornWorker --log-file -`

### 2. 配置环境变量

在Render控制台的「Environment」选项卡中添加以下环境变量：

```
DJANGO_SETTINGS_MODULE=wolfBackend.settings_render
SECRET_KEY=<生成一个安全的密钥>
DEBUG=False
ALLOWED_HOSTS=.render.com,werewolf-backend.onrender.com
CORS_ALLOWED_ORIGINS=https://werewolf-frontend.onrender.com,http://localhost:3000
```

### 3. 配置数据库

1. 在Render控制台，点击「New +」，选择「PostgreSQL」
2. 配置数据库：
   - **名称**：`werewolf-db`
   - **区域**：与Web服务相同的区域
   - **PostgreSQL版本**：选择最新的稳定版本
   - **数据库**：`werewolf`
   - **用户**：自动生成

3. 创建后，Render会自动为您的Web服务添加`DATABASE_URL`环境变量

### 4. 配置Redis（可选）

如果需要Redis支持：

1. 在Render控制台，点击「New +」，选择「Redis」
2. 配置Redis实例：
   - **名称**：`werewolf-redis`
   - **区域**：与Web服务相同的区域

3. 创建后，将Redis URL添加到Web服务的环境变量：
   ```
   REDIS_URL=<Redis连接URL>
   ```

## 前端部署

### 1. 创建静态站点

1. 在Render控制台，点击「New +」，选择「Static Site」
2. 连接GitHub仓库
3. 配置站点：
   - **名称**：`werewolf-frontend`
   - **区域**：选择离您用户最近的区域
   - **分支**：`main`（或您的主分支）
   - **根目录**：`frontend/web`
   - **构建命令**：`npm install && npm run build`
   - **发布目录**：`build`或`dist`（取决于您的前端框架）

### 2. 配置环境变量

在前端静态站点的「Environment」选项卡中添加：

```
REACT_APP_API_URL=https://werewolf-backend.onrender.com
REACT_APP_WS_URL=wss://werewolf-backend.onrender.com
```

## 连接前后端

1. 确保后端的CORS设置允许前端域名访问
2. 确保前端代码中的API请求指向后端服务的URL
3. 确保WebSocket连接使用正确的URL格式（wss://）

## 自定义域名

如果您有自己的域名：

1. 在Render控制台的服务设置中，找到「Custom Domains」选项卡
2. 点击「Add Custom Domain」
3. 输入您的域名（例如：`api.yourdomain.com`和`www.yourdomain.com`）
4. 按照Render提供的说明更新您的DNS记录

## 故障排除

### 常见问题

1. **部署失败**
   - 检查构建日志，查找错误信息
   - 确保所有依赖都在`requirements.txt`中列出
   - 确保`build.sh`脚本有执行权限

2. **数据库连接错误**
   - 确认`DATABASE_URL`环境变量已正确设置
   - 检查数据库服务是否正常运行

3. **WebSocket连接问题**
   - 确保使用`wss://`协议（而非`ws://`）
   - 检查CORS设置是否正确
   - 确认Render服务支持WebSocket连接

4. **静态文件未加载**
   - 确保`STATIC_ROOT`和`STATICFILES_STORAGE`设置正确
   - 确保已运行`collectstatic`命令（在`build.sh`中）

### 查看日志

在Render控制台中，选择您的服务，然后点击「Logs」选项卡查看实时日志，这对调试非常有帮助。

## 性能优化

1. 使用Render的缓存功能
2. 优化数据库查询
3. 考虑使用Render的自动扩展功能（付费计划）

---

如有任何问题，请参考[Render官方文档](https://render.com/docs)或联系项目维护者。