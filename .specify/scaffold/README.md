# .specify/scaffold 目录说明

本目录包含新项目初始化所需的**全部**脚手架文件，包括代码和部署配置。

## 目录结构

```
scaffold/
├── README.md                              # 本文件
├── backend/                               # 后端脚手架
│   ├── app/
│   │   ├── __init__.py                   # 版本信息
│   │   ├── main.py                       # FastAPI 入口（含静态文件挂载）
│   │   ├── api/
│   │   │   ├── deps_sso.py               # SSO 单层鉴权依赖
│   │   │   ├── root_router.py            # /token/logout 路由
│   │   │   └── v1/router.py              # API 路由注册
│   │   ├── core/
│   │   │   ├── config.py                 # 配置管理（支持 Nacos）
│   │   │   ├── nacos.py                  # Nacos 客户端
│   │   │   └── exceptions.py             # 自定义异常
│   │   └── db/
│   │       └── session.py                # 数据库会话管理
│   └── start.sh                          # 容器启动脚本
├── frontend/                              # 前端脚手架
│   └── src/
│       ├── services/api.ts               # Axios + SSO 拦截器
│       ├── contexts/AuthContext.tsx      # 认证上下文
│       └── types/index.ts                # 通用类型定义
└── document/                              # 部署配置
    └── deploy/api/
        ├── docker/
        │   └── Dockerfile                # 多阶段构建模板
        └── k8s/
            ├── dev-values.yaml           # 开发环境 Helm Values
            └── prod-values.yaml          # 生产环境 Helm Values
```

## 使用方法

### 方式一：使用初始化脚本（推荐）

```bash
# 1. 创建新项目目录
mkdir my-new-project && cd my-new-project

# 2. 复制 .specify 目录
cp -r /path/to/template/.specify ./

# 3. 运行初始化脚本
.specify/scripts/init-project.sh skyline-ai-my-project

# 4. 初始化后端
cd backend
uv init
uv add fastapi uvicorn sqlalchemy pydantic pydantic-settings loguru httpx nacos-sdk-python PyYAML

# 5. 初始化前端
cd ../frontend
npm create vite@latest . -- --template react-ts
npm install axios antd @ant-design/icons zustand react-router-dom
```

### 方式二：手动复制

```bash
# 复制所有脚手架
cp -r .specify/scaffold/backend/* ./backend/
cp -r .specify/scaffold/frontend/* ./frontend/
cp -r .specify/scaffold/document/* ./document/

# 替换项目名称
find ./backend -type f -name "*.py" -exec sed -i 's/skyline-app/my-project-name/g' {} \;
find ./document -type f -name "*.yaml" -exec sed -i 's/{PROJECT_NAME}/my-project-name/g' {} \;
```

## 包含的核心功能

### 🔐 SSO 单层鉴权

- **后端**: `deps_sso.py` 实现 SSO Header + Cookie 双模式认证
- **前端**: `api.ts` 拦截 401 自动跳转 SSO 登出
- **登出路由**: `root_router.py` 处理 `/token/logout` 重定向

### ⚙️ Nacos 配置管理

- **后端**: `config.py` + `nacos.py` 支持从 Nacos 加载配置
- **自动降级**: Nacos 不可用时使用 .env 兜底

### 🐳 前后端一体化部署

- **Dockerfile**: 多阶段构建，前端 + 后端打包为单一镜像
- **静态文件**: 前端产物挂载到 `/app/static`
- **SPA 回退**: 非 API 路径返回 `index.html`

### ☸️ K8S 部署配置

- **Helm Values**: 开发/生产环境配置模板
- **Nacos 集成**: 所有配置通过 Nacos 管理
- **健康检查**: `/ping` 端点

## 初始化后需要修改的配置

| 文件 | 需修改项 | 说明 |
|------|----------|------|
| `document/deploy/api/k8s/dev-values.yaml` | `image.repository` | 改为项目镜像地址 |
| `document/deploy/api/k8s/dev-values.yaml` | `NACOS_DATA_ID` | 改为项目 Nacos 配置名 |
| `document/deploy/api/k8s/prod-values.yaml` | 同上 + `nodeSelector` | 生产环境配置 |

## 注意事项

1. 脚手架文件是**最小可运行模板**，需要根据项目需求扩展
2. 用户模型 (`models/user.py`) 需要根据业务自行创建
3. 前端还需要初始化 Vite 项目和安装依赖
4. 数据库迁移 (Alembic) 需要自行配置
