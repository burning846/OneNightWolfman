# GitHub推送指南

本文档提供了如何将一夜狼人游戏项目推送到GitHub的详细步骤。

## 准备工作

### 1. 安装Git

如果您尚未安装Git，请从[Git官网](https://git-scm.com/downloads)下载并安装。

### 2. 配置Git

安装完成后，打开终端（Windows上的PowerShell或命令提示符），设置您的Git用户名和邮箱：

```bash
git config --global user.name "您的名字"
git config --global user.email "您的邮箱"
```

### 3. 创建GitHub账户

如果您还没有GitHub账户，请前往[GitHub官网](https://github.com)注册一个账户。

## 创建GitHub仓库

### 1. 登录GitHub

使用您的账户登录GitHub。

### 2. 创建新仓库

1. 点击右上角的"+"图标，选择"New repository"
2. 填写仓库名称（例如："One-Night-Ultimate-Werewolf"）
3. 添加描述（可选）
4. 选择仓库可见性（公开或私有）
5. 不要初始化仓库（不要勾选"Add a README file"、"Add .gitignore"或"Choose a license"）
6. 点击"Create repository"按钮

## 推送本地项目到GitHub

### 1. 初始化本地Git仓库

如果您的项目还没有初始化为Git仓库，请在项目根目录下打开终端，执行：

```bash
git init
```

### 2. 添加远程仓库

将GitHub仓库URL添加为远程仓库：

```bash
git remote add origin https://github.com/您的用户名/One-Night-Ultimate-Werewolf.git
```

### 3. 添加文件到暂存区

将所有文件添加到Git暂存区：

```bash
git add .
```

### 4. 提交更改

提交您的更改，添加提交信息：

```bash
git commit -m "初始提交：一夜狼人游戏项目"
```

### 5. 推送到GitHub

将您的代码推送到GitHub：

```bash
git push -u origin main
```

注意：如果您的默认分支是`master`而不是`main`，请使用：

```bash
git push -u origin master
```

## 后续更新

### 1. 查看更改状态

查看哪些文件已被修改：

```bash
git status
```

### 2. 添加更改

将更改添加到暂存区：

```bash
git add .
```

或添加特定文件：

```bash
git add 文件路径
```

### 3. 提交更改

提交您的更改：

```bash
git commit -m "更新说明：例如添加了Render部署指南"
```

### 4. 推送更改

将更改推送到GitHub：

```bash
git push
```

## 分支管理

### 1. 创建新分支

创建并切换到新分支：

```bash
git checkout -b 分支名称
```

### 2. 切换分支

```bash
git checkout 分支名称
```

### 3. 推送新分支到GitHub

```bash
git push -u origin 分支名称
```

### 4. 合并分支

首先切换到目标分支（通常是main或master）：

```bash
git checkout main
```

然后合并您的开发分支：

```bash
git merge 分支名称
```

## 处理敏感信息

### 1. 确保敏感信息不被提交

检查`.gitignore`文件是否包含以下内容：

```
# 环境变量和敏感信息
.env
.env.local
.env.development
.env.test
.env.production
```

### 2. 如果意外提交了敏感信息

如果您不小心提交了敏感信息（如API密钥、密码等），请立即：

1. 更改这些敏感信息（如重置密码、重新生成API密钥）
2. 将敏感文件添加到`.gitignore`
3. 使用以下命令从Git历史中删除敏感文件：

```bash
git filter-branch --force --index-filter "git rm --cached --ignore-unmatch 路径/到/敏感文件" --prune-empty --tag-name-filter cat -- --all
git push origin --force --all
```

## GitHub Actions（CI/CD）

您可以设置GitHub Actions来自动化测试、构建和部署流程。

### 1. 创建工作流文件

在项目根目录创建`.github/workflows/main.yml`文件：

```yaml
name: CI/CD Pipeline

on:
  push:
    branches: [ main, master ]
  pull_request:
    branches: [ main, master ]

jobs:
  build:
    runs-on: ubuntu-latest
    steps:
    - uses: actions/checkout@v2
    
    - name: Set up Python
      uses: actions/setup-python@v2
      with:
        python-version: '3.9'
    
    - name: Install dependencies
      run: |
        python -m pip install --upgrade pip
        cd backend
        pip install -r requirement.txt
    
    - name: Run tests
      run: |
        cd backend/wolfBackend
        python manage.py test
```

## 协作开发

### 1. 处理Pull Request

1. 在GitHub仓库页面，点击"Pull requests"选项卡
2. 点击"New pull request"按钮
3. 选择要合并的分支
4. 点击"Create pull request"按钮
5. 添加标题和描述
6. 点击"Create pull request"提交

### 2. 代码审查

1. 在Pull Request页面，点击"Files changed"查看更改
2. 添加评论和建议
3. 批准或请求更改

### 3. 合并Pull Request

1. 确保所有审查都已完成
2. 点击"Merge pull request"按钮
3. 确认合并

## 故障排除

### 1. 推送被拒绝

如果您的推送被拒绝，可能是因为远程仓库有您本地没有的更改。尝试先拉取更改：

```bash
git pull origin main
```

解决任何冲突后，再次推送。

### 2. 身份验证问题

如果遇到身份验证问题，可以：

1. 使用HTTPS URL并在推送时输入用户名和密码
2. 设置SSH密钥（推荐）：
   - 生成SSH密钥：`ssh-keygen -t ed25519 -C "您的邮箱"`
   - 将公钥添加到GitHub账户
   - 使用SSH URL克隆/设置远程仓库

### 3. 大文件问题

如果您需要推送大文件，考虑使用Git LFS（Large File Storage）：

```bash
git lfs install
git lfs track "*.大文件扩展名"
git add .gitattributes
```

## 最佳实践

1. 经常提交小的、有意义的更改
2. 编写清晰的提交信息
3. 使用分支进行功能开发
4. 在合并前进行代码审查
5. 保持`.gitignore`文件更新
6. 不要提交敏感信息
7. 使用标签标记重要版本
8. 保持主分支稳定