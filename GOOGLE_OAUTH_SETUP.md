# Google OAuth 登录配置指南

本文档提供了如何为一夜狼人游戏配置Google OAuth登录的详细步骤。

## 1. 创建Google Cloud项目

1. 访问 [Google Cloud Console](https://console.cloud.google.com/)
2. 点击页面顶部的项目下拉菜单，然后点击"新建项目"
3. 输入项目名称（例如："一夜狼人"）并点击"创建"

## 2. 配置OAuth同意屏幕

1. 在左侧导航菜单中，选择"API和服务" > "OAuth同意屏幕"
2. 选择用户类型（建议选择"外部"，除非你有G Suite账户），然后点击"创建"
3. 填写应用信息：
   - 应用名称：一夜狼人
   - 用户支持电子邮件：您的电子邮件地址
   - 开发者联系信息：您的电子邮件地址
4. 点击"保存并继续"
5. 在"范围"页面，添加以下范围：
   - `./auth/userinfo.email`
   - `./auth/userinfo.profile`
6. 点击"保存并继续"
7. 在"测试用户"页面，如果您处于测试阶段，可以添加测试用户的电子邮件地址
8. 点击"保存并继续"，然后点击"返回控制面板"

## 3. 创建OAuth客户端ID

1. 在左侧导航菜单中，选择"API和服务" > "凭据"
2. 点击"创建凭据"，然后选择"OAuth客户端ID"
3. 应用类型选择"Web应用"
4. 名称填写"One Night Werewolf Web Client"
5. 在"已获授权的JavaScript来源"部分，添加以下URL：
   - `http://localhost:3000`（开发环境）
   - 您的生产环境URL（如果有）
6. 在"已获授权的重定向URI"部分，添加以下URL：
   - `http://localhost:3000`
   - `http://localhost:3000/login`
   - `http://localhost:8000/accounts/google/login/callback/`（Django后端回调URL）
   - 您的生产环境对应URL（如果有）
7. 点击"创建"
8. 记下生成的客户端ID和客户端密钥

## 4. 配置前端应用

1. 打开 `frontend/web/src/App.js` 文件
2. 找到 `const GOOGLE_CLIENT_ID = "YOUR_GOOGLE_CLIENT_ID";` 这一行
3. 将 `YOUR_GOOGLE_CLIENT_ID` 替换为您在上一步获取的客户端ID

## 5. 配置后端应用

1. 打开 `backend/wolfBackend/wolfBackend/settings.py` 文件
2. 找到 `SOCIALACCOUNT_PROVIDERS` 配置部分
3. 将 `'client_id': 'YOUR_GOOGLE_CLIENT_ID'` 中的 `YOUR_GOOGLE_CLIENT_ID` 替换为您的客户端ID
4. 将 `'secret': 'YOUR_GOOGLE_CLIENT_SECRET'` 中的 `YOUR_GOOGLE_CLIENT_SECRET` 替换为您的客户端密钥

## 6. 应用数据库迁移

由于我们添加了django-allauth，需要应用数据库迁移：

```bash
cd backend/wolfBackend
python manage.py migrate
```

## 7. 创建社交应用

1. 启动Django开发服务器
2. 访问Django管理界面（通常是 `http://localhost:8000/admin/`）
3. 登录管理员账户
4. 导航到"Sites"，编辑默认站点或创建新站点：
   - Domain name: `localhost:8000`（开发环境）或您的生产域名
   - Display name: One Night Werewolf
5. 导航到"Social applications"
6. 点击"Add social application"：
   - Provider: Google
   - Name: Google Login
   - Client id: 您的Google客户端ID
   - Secret key: 您的Google客户端密钥
   - 在可用站点中选择您刚才配置的站点，并将其添加到选定的站点

## 8. 测试登录

1. 启动前端和后端服务器
2. 访问 `http://localhost:3000/login`
3. 点击"使用Google登录"按钮
4. 按照提示完成Google登录流程
5. 如果是首次登录，系统会提示您设置用户名

## 注意事项

- 在开发环境中，您可能需要使用已添加为测试用户的Google账户进行测试
- 如果您计划将应用发布到生产环境，需要完成OAuth同意屏幕的验证流程
- 确保保护好您的客户端密钥，不要将其提交到公共代码仓库