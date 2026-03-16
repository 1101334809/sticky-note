# Skyline AI 规约命令参考

> 本文档定义了与 AI 编码助手交互的标准化命令（Slash Commands）。
> 这些命令可以在支持的 AI Agent 中使用，如 Claude、Copilot、Cursor 等。

---

## 核心命令

### `/skyline.constitution`

**用途**: 显示或更新项目核心规约

**使用方式**:
```
/skyline.constitution
```

**效果**: AI 将读取并理解 `.specify/memory/constitution.md` 中的不可变规约。

**示例**:
```
/skyline.constitution 请根据规约检查我的代码是否符合 DDD 架构要求
```

---

### `/skyline.specify`

**用途**: 创建功能规格说明

**使用方式**:
```
/skyline.specify <功能描述>
```

**效果**: AI 将在 `.specify/specs/{序号}-{功能名}/` 目录下创建功能规格文档。

**示例**:
```
/skyline.specify 实现用户管理模块，包括用户列表、创建用户、编辑用户、删除用户功能。
用户需要有姓名、工号、部门、角色等属性。
```

**产出**:
```
.specify/specs/001-user-management/
├── spec.md           # 功能规格说明
├── contracts/        # API 契约
│   └── api-spec.yaml # OpenAPI 规格
└── data-model.md     # 数据模型设计
```

---

### `/skyline.plan`

**用途**: 生成技术实现方案

**使用方式**:
```
/skyline.plan [技术要求]
```

**效果**: 基于功能规格生成技术实现方案，包括架构设计、数据库设计等。

**示例**:
```
/skyline.plan 使用 FastAPI + React 技术栈，遵循 DDD 四层架构。
前端使用 Ant Design 组件库，后端使用 SQLAlchemy 2.x。
```

**产出**:
```
.specify/specs/001-user-management/
├── plan.md           # 技术实现方案
├── research.md       # 技术调研（可选）
└── quickstart.md     # 快速启动指南
```

---

### `/skyline.tasks`

**用途**: 将实现方案拆分为可执行任务

**使用方式**:
```
/skyline.tasks
```

**效果**: 基于 plan.md 生成详细的任务清单。

**产出**:
```
.specify/specs/001-user-management/
└── tasks.md          # 任务清单（带复选框）
```

**任务格式**:
```markdown
## 任务清单

- [ ] 1. 创建数据模型 `app/models/user.py`
- [ ] 2. 创建 DTO `app/schemas/user.py`
- [ ] 3. 创建服务层 `app/services/user_service.py`
- [ ] 4. 创建 API 路由 `app/api/v1/endpoints/user.py`
- [ ] 5. 创建前端页面 `src/pages/pc/User/`
- [ ] 6. 编写单元测试
- [ ] 7. 集成测试验证
```

---

### `/skyline.implement`

**用途**: 执行任务清单中的任务

**使用方式**:
```
/skyline.implement [任务编号]
```

**效果**: 按照任务清单逐步实现代码。

**示例**:
```
/skyline.implement 1-4
# 执行任务 1 到 4

/skyline.implement all
# 执行所有任务
```

---

### `/skyline.contract`

**用途**: 生成或更新 API 契约

**使用方式**:
```
/skyline.contract <模块名>
```

**效果**: 基于代码或规格生成 OpenAPI 规格文件。

**示例**:
```
/skyline.contract user
# 生成 user 模块的 API 契约
```

**产出**:
```
.specify/specs/001-user-management/contracts/
├── api-spec.yaml     # OpenAPI 3.0 规格
└── types.ts          # TypeScript 类型定义
```

---

### `/skyline.checklist`

**用途**: 生成代码审查检查清单

**使用方式**:
```
/skyline.checklist
```

**效果**: 基于 constitution.md 生成代码审查检查清单。

---

## 辅助命令

### `/skyline.scaffold`

**用途**: 从脚手架生成代码

**使用方式**:
```
/skyline.scaffold <模块名>
```

**效果**: 基于 `.specify/scaffold/` 模板生成模块代码框架。

---

### `/skyline.test`

**用途**: 生成测试用例

**使用方式**:
```
/skyline.test <模块名>
```

**效果**: 基于 API 契约生成测试用例。

---

### `/skyline.analyze`

**用途**: 分析现有代码

**使用方式**:
```
/skyline.analyze <文件或目录>
```

**效果**: 分析代码是否符合 constitution.md 规约。

---

### `/skyline.sync`

**用途**: 同步文档与代码

**使用方式**:
```
/skyline.sync [模式]
```

**效果**: 确保文档与代码实现保持一致。

**示例**:
```
# 模式 A: 变更前同步
/skyline.sync 我要修改用户表，增加 age 字段，请更新设计文档和计划。

# 模式 B: 变更后同步 (Reverse Sync)
/skyline.sync 我已经修改了代码，增加了 age 字段，请同步更新 API 契约和架构文档。
```

---

## 命令速查表

| 命令 | 用途 | 产出 |
|------|------|------|
| `/skyline.constitution` | 理解项目规约 | - |
| `/skyline.specify` | 定义功能需求 | `spec.md` |
| `/skyline.plan` | 技术规划 | `plan.md` |
| `/skyline.tasks` | 任务拆分 | `tasks.md` |
| `/skyline.implement` | 执行实现 | 代码 |
| `/skyline.contract` | 生成契约 | `api-spec.yaml` |
| `/skyline.checklist` | 审查清单 | `checklist.md` |
| `/skyline.scaffold` | 生成脚手架 | 模块代码 |
| `/skyline.test` | 生成测试 | 测试用例 |
| `/skyline.analyze` | 代码分析 | 分析报告 |
| `/speckit.update` | 增量更新 | 更新受影响文档 |
| `/speckit.archive` | 迭代归档 | 归档快照 |

---

## 文档生命周期管理

### `/speckit.update`

**用途**: 需求变更时智能增量更新受影响的规约文档

**使用方式**:
```
/speckit.update <变更描述>
```

**效果**: AI 会分析变更范围（小/中/大），批量更新受影响的文档，无需逐步执行 10 个流程。

**示例**:
```bash
# 小变更：仅更新 tasks.md
/speckit.update 用户表新增 phone 字段

# 中变更：更新 plan → tasks → test
/speckit.update 审批流程改为两级审批

# 大变更：全链路更新 spec → product → architecture → plan → tasks → test
/speckit.update 取消 Excel 上传，改为在线表格编辑
```

**变更级别判断**:

| 级别 | 条件 | 更新范围 |
|------|------|----------|
| 小变更 | 仅影响具体任务实现 | `tasks.md` |
| 中变更 | 功能逻辑调整 | `plan.md` → `tasks.md` → `test.md` |
| 大变更 | 需求或架构变化 | 全链路 6 个文档 |

---

### `/speckit.archive`

**用途**: 迭代完成后归档文档快照，保持活跃目录精简

**使用方式**:
```
/speckit.archive <迭代名称>
```

**效果**: 将当前 `.specify/memory/` 中的文档快照归档到 `docs/archive/{日期}-{迭代名}/`。

**示例**:
```bash
/speckit.archive 用户管理功能迭代完成
```

**归档目录结构**:
```
docs/archive/2026-01-用户管理功能/
├── README.md           # 迭代摘要
├── spec.md             # 需求规格快照
├── product.md          # 产品设计快照
├── architecture.md     # 架构设计快照
├── plan.md             # 开发计划快照
├── tasks.md            # 任务清单快照
└── test.md             # 测试方案快照
```

---

## 使用示例

### 完整开发流程

```bash
# 1. 确认规约
/skyline.constitution

# 2. 定义需求
/skyline.specify 实现预算审批功能，支持多级审批、审批记录、审批意见

# 3. 技术规划
/skyline.plan 使用现有技术栈，新增审批状态机

# 4. 任务拆分
/skyline.tasks

# 5. 执行实现
/skyline.implement all

# 6. 生成契约
/skyline.contract approval

# 7. 审查代码
/skyline.checklist

# 8. 需求变更时（可选）
/speckit.update 新增字段 xxx

# 9. 迭代完成后归档（可选）
/speckit.archive 预算审批功能完成
```

---

## 兼容性

| AI Agent | 支持状态 |
|----------|----------|
| Claude | ✅ 完全支持 |
| GitHub Copilot | ✅ 完全支持 |
| Cursor | ✅ 完全支持 |
| Windsurf | ✅ 完全支持 |
| Gemini | ✅ 完全支持 |
