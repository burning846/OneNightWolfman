# 在Render上部署狼人杀游戏前端

本文档提供了在Render平台上部署One Night Ultimate Werewolf游戏前端的详细步骤。

## 目录

1. [准备工作](#准备工作)
2. [创建静态站点](#创建静态站点)
3. [配置环境变量](#配置环境变量)
4. [自定义域名](#自定义域名)
5. [故障排除](#故障排除)

## 准备工作

1. 确保已将项目代码推送到GitHub仓库
2. 确保后端服务已在Render上部署完成
3. 记录后端服务的URL（例如：`https://werewolf-backend.onrender.com`）

## 创建静态站点

1. 登录[Render控制台](https://dashboard.render.com/)
2. 点击「New +」按钮，选择「Static Site」
3. 连接GitHub仓库
4. 配置静态站点：
   - **名称**：`werewolf-frontend`（或您喜欢的名称）
   - **区域**：选择离您用户最近的区域
   - **分支**：`main`（或您的主分支）
   - **根目录**：`frontend/web`
   - **构建命令**：`npm install && npm run build`
   - **发布目录**：`build`

## 配置环境变量

在Render控制台的「Environment」选项卡中添加以下环境变量：

```
REACT_APP_API_BASE_URL=https://werewolf-backend.onrender.com
REACT_APP_WS_BASE_URL=wss://werewolf-backend.onrender.com
```

> 注意：请将URL替换为您实际部署的后端服务URL。

## 自定义域名

如果您有自己的域名：

1. 在Render控制台的服务设置中，找到「Custom Domains」选项卡
2. 点击「Add Custom Domain」
3. 输入您的域名（例如：`www.yourdomain.com`或`game.yourdomain.com`）
4. 按照Render提供的说明更新您的DNS记录

## 故障排除

### 常见问题

1. **构建失败**
   - 检查构建日志，查找错误信息
   - 确保`package.json`中的依赖正确
   - 确保构建命令和发布目录正确

2. **API连接错误**
   - 确认环境变量已正确设置
   - 检查后端服务是否正常运行
   - 确认CORS设置允许前端域名访问

3. **WebSocket连接问题**
   - 确保使用`wss://`协议（而非`ws://`）
   - 检查后端WebSocket服务是否正常运行

4. **静态资源加载失败**
   - 检查构建输出目录是否正确
   - 确保资源路径使用相对路径

### 查看日志

在Render控制台中，选择您的静态站点，然后点击「Logs」选项卡查看构建日志，这对调试非常有帮助。

## 性能优化

1. 优化React应用的构建大小
2. 使用代码分割（Code Splitting）
3. 优化图片和媒体资源
4. 考虑使用Render的CDN功能（自动启用）

---

如有任何问题，请参考[Render官方文档](https://render.com/docs)或联系项目维护者。