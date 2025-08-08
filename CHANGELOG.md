# 更新日志

## [未发布]

### 新增

- 添加了统一的API配置管理（`frontend/web/src/config/api.js`）
- 添加了环境变量支持，用于配置API基础URL和Google OAuth客户端ID
- 添加了前端`.env.example`文件作为环境变量配置示例
- 添加了后端`.env.example`文件作为环境变量配置示例
- 添加了Vercel部署配置（`frontend/web/vercel.json`）
- 添加了前端部署指南（`frontend/web/DEPLOYMENT.md`）
- 添加了后端部署指南（`backend/DEPLOYMENT.md`）
- 添加了Render部署指南（`RENDER_DEPLOYMENT.md`）
- 添加了Render前端部署指南（`frontend/web/RENDER_FRONTEND_DEPLOYMENT.md`）
- 添加了Render部署所需的配置文件（`backend/build.sh`、`backend/Procfile`、`backend/runtime.txt`）
- 添加了Render环境的Django设置文件（`backend/wolfBackend/wolfBackend/settings_render.py`）
- 添加了Render环境变量示例文件（`backend/.env.example.render`和`frontend/web/.env.production`）
- 添加了GitHub推送指南（`GITHUB_GUIDE.md`）
- 添加了前端`.env.local`文件作为本地环境变量配置示例
- 更新了项目的`.gitignore`文件，添加了更多忽略规则
- 添加了后端`.gitignore`文件，确保敏感信息不被提交

### 删除

- 删除了前端测试文件和测试目录（`frontend/test.js`和`frontend/test/`）
- 删除了Nginx配置文件（`backend/wolf.ngix.conf`和`frontend/web/ngix.conf`），这些应该根据部署环境单独配置

### 修改

- 更新了前端组件，使用统一的API配置
  - `Login.js`
  - `Register.js`
  - `Room.js`
  - `Game.js`
  - `JoinRoom.js`
  - `CreateRoom.js`
- 更新了`App.js`，使用环境变量配置Google OAuth客户端ID
- 更新了后端`requirement.txt`，明确添加了`django-allauth`依赖
- 更新了前端`README.md`，添加了环境配置和部署说明

### 修复

- 修复了WebSocket连接在不同环境下的URL配置问题
- 修复了API请求在不同环境下的基础URL配置问题

## [0.1.0] - 初始版本

### 功能

- 用户注册和登录
- Google OAuth登录
- 创建和加入游戏房间
- 实时游戏通信（WebSocket）
- 游戏逻辑实现