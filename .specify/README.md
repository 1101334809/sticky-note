# Skyline AI 项目规约体系使用指南

> 本指南详细说明如何使用 `.specify` 规约体系进行新项目开发。

---

## 一、概述

`.specify` 是 Skyline AI 项目的**标准化开发规约体系**，融合了 GitHub Spec-Kit 的最佳实践：

| 模块 | 说明 |
|------|------|
| **memory/** | 不可变规约文档 (constitution.md) |
| **templates/** | 标准文档模板 (spec, plan, tasks, contract 等) |
| **scripts/** | 自动化脚本 (项目初始化) |
| **scaffold/** | 代码脚手架 (前端、后端、部署配置) |
| **specs/** | 功能级规格 (每个功能独立目录) ⭐ 新增 |
| **commands.md** | Slash Commands 参考 ⭐ 新增 |

---

## 二、目录结构

```
.specify/
├── README.md                     # 本文件
├── commands.md                   # 🆕 Slash Commands 参考
├── memory/
│   └── constitution.md           # 🔒 核心规约（不可变更）
├── templates/
│   ├── spec-template.md          # 需求规格模板
│   ├── product-template.md       # 产品设计模板
│   ├── architecture-template.md  # 架构设计模板
│   ├── plan-template.md          # 开发计划模板
│   ├── tasks-template.md         # 任务拆分模板
│   ├── test-template.md          # 测试用例模板
│   ├── feature-spec-template.md  # 🆕 功能规格模板
│   ├── feature-plan-template.md  # 🆕 功能计划模板
│   ├── feature-tasks-template.md # 🆕 功能任务模板
│   └── api-contract-template.yaml # 🆕 API 契约模板
├── scripts/
│   └── init-project.sh           # 🚀 项目初始化脚本
├── scaffold/                     # 代码脚手架
│   ├── backend/                  # 后端代码脚手架
│   ├── frontend/                 # 前端代码脚手架
│   └── document/                 # 部署配置脚手架
└── specs/                        # 🆕 功能级规格目录
    └── 001-feature-name/         # 按功能编号组织
        ├── spec.md               # 功能规格
        ├── plan.md               # 技术方案
        ├── tasks.md              # 任务清单
        └── contracts/            # API 契约
            └── api-spec.yaml     # OpenAPI 规格
```

---

## 三、Slash Commands (AI 交互命令) ⭐ 新增

借鉴 GitHub Spec-Kit，我们支持标准化的 AI 交互命令：

| 命令 | 用途 | 产出 |
|------|------|------|
| `/skyline.constitution` | 理解项目规约 | - |
| `/skyline.specify` | 定义功能需求 | `specs/{id}/spec.md` |
| `/skyline.plan` | 技术规划 | `specs/{id}/plan.md` |
| `/skyline.tasks` | 任务拆分 | `specs/{id}/tasks.md` |
| `/skyline.implement` | 执行实现 | 代码 |
| `/skyline.contract` | 生成 API 契约 | `specs/{id}/contracts/api-spec.yaml` |
| `/skyline.checklist` | 审查清单 | 检查报告 |
| `/speckit.update` | 增量更新 | 更新受影响文档 |
| `/speckit.archive` | 迭代归档 | `docs/archive/{迭代}/` |

### 完整开发流程

```bash
# 1. 确认规约
/skyline.constitution

# 2. 定义需求
/skyline.specify 实现用户管理模块，包括列表、创建、编辑、删除

# 3. 技术规划
/skyline.plan 使用 DDD 架构，后端 FastAPI，前端 React

# 4. 任务拆分
/skyline.tasks

# 5. 生成 API 契约
/skyline.contract user

# 6. 执行实现
/skyline.implement all

# 7. 需求变更时（无需重走 10 步）
/speckit.update 审批流程改为两级

# 8. 迭代完成后归档
/speckit.archive 用户管理功能完成
```

> 📖 详细命令说明请参阅 [commands.md](./commands.md)

---

## 四、功能级规格 (Feature Specs) ⭐ 新增

每个功能在 `specs/` 目录下有独立的子目录：

```
specs/
├── 001-user-management/          # 功能 001
│   ├── spec.md                   # 功能规格
│   ├── plan.md                   # 技术方案
│   ├── tasks.md                  # 任务清单
│   └── contracts/
│       └── api-spec.yaml         # OpenAPI 契约
├── 002-budget-approval/          # 功能 002
│   └── ...
└── 003-report-generation/        # 功能 003
    └── ...
```

### 功能编号规则

| 格式 | 示例 | 说明 |
|------|------|------|
| `{序号}-{功能名}` | `001-user-management` | 3 位序号 + 小写连字符名称 |

---

## 五、API 契约优先 (Contract-First) ⭐ 新增

在编写代码之前，先定义 API 契约：

### 契约文件位置

```
specs/{功能编号}/contracts/
├── api-spec.yaml     # OpenAPI 3.0 规格
└── types.ts          # TypeScript 类型（可选，自动生成）
```

### 契约模板

使用 `.specify/templates/api-contract-template.yaml` 作为起点。

### 契约驱动开发流程

```mermaid
flowchart LR
    A[定义 OpenAPI 契约] --> B[Review 契约]
    B --> C[生成 TypeScript 类型]
    C --> D[后端实现 API]
    D --> E[前端调用 API]
    E --> F[契约验证测试]
```

---

## 六、使用场景

### 场景 1：初始化新项目

```bash
# 1. 创建项目目录
mkdir skyline-ai-new-project && cd skyline-ai-new-project

# 2. 复制 .specify 目录
cp -r /path/to/template/.specify ./

# 3. 运行初始化脚本
.specify/scripts/init-project.sh skyline-ai-new-project

# 4. 初始化依赖
cd backend && uv init && uv add fastapi...
cd ../frontend && npm create vite@latest...
```

### 场景 2：开发新功能

```bash
# 1. 创建功能规格目录
mkdir -p .specify/specs/001-user-management/contracts

# 2. 使用 AI 命令
/skyline.specify 实现用户管理功能...
/skyline.plan
/skyline.contract user
/skyline.tasks
/skyline.implement
```

### 场景 3：AI 辅助开发

在 AI 对话开始时，引用规约：

```
请阅读以下文件并遵循其中的规约：
- .specify/memory/constitution.md (核心规约)
- .specify/specs/001-xxx/spec.md (功能规格)
- .specify/specs/001-xxx/plan.md (技术方案)
```

---

## 七、核心规约说明

### Constitution 核心原则

| 原则 | 强制程度 |
|------|----------|
| 测试先行 (TDD) | NON-NEGOTIABLE |
| DDD 四层架构 | NON-NEGOTIABLE |
| SSO 单层鉴权 | NON-NEGOTIABLE |
| K8S + Nacos 部署 | NON-NEGOTIABLE |
| 类型安全 | NON-NEGOTIABLE |
| 简洁优先 | 推荐 |

### 技术栈约束

- **后端**: Python 3.11+ / FastAPI / SQLAlchemy 2.x / Pydantic 2.x
- **前端**: React 18.x / TypeScript 5.x / Ant Design 5.x / Zustand
- **部署**: K8S (CCE) / Nacos / Harbor / MySQL 8.0 / Redis 7.x

---

## 八、脚手架文件清单

### 后端脚手架 (10 文件)

| 文件 | 功能 |
|------|------|
| `app/main.py` | FastAPI 入口 + 静态文件 |
| `app/api/deps_sso.py` | SSO 鉴权依赖 |
| `app/api/root_router.py` | /token/logout 路由 |
| `app/core/config.py` | Nacos + .env 配置 |
| `app/core/nacos.py` | Nacos 客户端 |
| `app/db/session.py` | 数据库会话 |
| `start.sh` | 容器启动脚本 |

### 前端脚手架 (3 文件)

| 文件 | 功能 |
|------|------|
| `src/services/api.ts` | Axios + SSO 拦截器 |
| `src/contexts/AuthContext.tsx` | 认证上下文 |
| `src/types/index.ts` | 通用类型 |

### 部署配置 (3 文件)

| 文件 | 功能 |
|------|------|
| `document/deploy/api/docker/Dockerfile` | 多阶段构建 |
| `document/deploy/api/k8s/dev-values.yaml` | 开发环境 |
| `document/deploy/api/k8s/prod-values.yaml` | 生产环境 |

---

## 九、模板文件清单

| 模板 | 用途 | 位置 |
|------|------|------|
| `spec-template.md` | 需求规格 | 项目级 |
| `product-template.md` | 产品设计 | 项目级 |
| `architecture-template.md` | 架构设计 | 项目级 |
| `feature-spec-template.md` | 功能规格 | 功能级 |
| `feature-plan-template.md` | 技术方案 | 功能级 |
| `feature-tasks-template.md` | 任务清单 | 功能级 |
| `api-contract-template.yaml` | API 契约 | 功能级 |

---

## 十、与 GitHub Spec-Kit 的对比

| 特性 | GitHub Spec-Kit | Skyline .specify |
|------|-----------------|------------------|
| 技术栈 | 技术无关 | 固定（FastAPI + React） |
| 代码脚手架 | ❌ | ✅ 完整脚手架 |
| 部署配置 | ❌ | ✅ Docker + K8S |
| SSO 鉴权 | ❌ | ✅ 完整实现 |
| Slash Commands | ✅ | ✅ `/skyline.*` |
| 功能级 spec | ✅ | ✅ `specs/` 目录 |
| API 契约 | ✅ | ✅ OpenAPI 模板 |

---

## 十一、常见问题

### Q1: 本地开发如何跳过 SSO？

```env
MOCK_USER_ENABLED=true
MOCK_USER_NAME=测试用户
```

### Q2: Slash Commands 在哪个 AI 中使用？

支持 Claude、Copilot、Cursor、Windsurf、Gemini 等。只需在对话中输入命令即可。

### Q3: 如何创建新功能规格？

```bash
mkdir -p .specify/specs/002-new-feature/contracts
# 然后使用模板创建 spec.md, plan.md, tasks.md
```

---

## 十二、版本历史

| 版本 | 日期 | 变更 |
|------|------|------|
| 2.3.0 | 2026-01-23 | 添加 `/speckit.update` 增量更新、`/speckit.archive` 迭代归档 |
| 2.2.0 | 2026-01-14 | 添加 Slash Commands、功能级 specs、API 契约 |
| 2.1.0 | 2026-01-14 | 添加 scaffold 脚手架，整合 document 配置 |
| 2.0.0 | 2026-01-08 | 企业级开发规约体系 2.0 |

---

**维护者**: Skyline AI Team
