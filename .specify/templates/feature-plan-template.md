# 技术实现方案：[功能名称]

**版本**: V1.0  
**创建日期**: [DATE]  
**状态**: 草稿 | 评审中 | 已定稿  
**技术负责人**: [NAME]

---

## 一、技术选型

> 遵循 `constitution.md` 规定的技术栈约束

| 层级 | 技术 | 版本 | 说明 |
|------|------|------|------|
| **后端框架** | FastAPI | 0.100+ | 异步 API 框架 |
| **数据库 ORM** | SQLAlchemy | 2.x | 异步 ORM |
| **前端框架** | React | 18.x | 组件化 UI |
| **UI 组件库** | Ant Design | 5.x | 企业级组件 |
| **状态管理** | Zustand | 4.x | 轻量状态 |

---

## 二、架构设计

### 2.1 DDD 分层

```
┌─────────────────────────────────────────────────────────────┐
│                    Interface Layer (接口层)                  │
│           app/api/v1/endpoints/{module}.py                  │
├─────────────────────────────────────────────────────────────┤
│                   Application Layer (应用层)                 │
│              app/services/{module}_service.py               │
├─────────────────────────────────────────────────────────────┤
│                     Domain Layer (领域层)                    │
│                   app/models/{module}.py                    │
├─────────────────────────────────────────────────────────────┤
│               Infrastructure Layer (基础设施层)              │
│                 app/db/ + app/utils/                        │
└─────────────────────────────────────────────────────────────┘
```

### 2.2 目录结构

```
后端变更:
backend/app/
├── api/v1/endpoints/
│   └── {module}.py              # 新增
├── schemas/
│   └── {module}.py              # 新增
├── services/
│   └── {module}_service.py      # 新增
└── models/
    └── {module}.py              # 新增

前端变更:
frontend/src/
├── pages/pc/{Module}/
│   ├── index.tsx                # 列表页
│   ├── Detail.tsx               # 详情页
│   └── {Module}.module.css      # 样式
├── services/
│   └── {module}.ts              # API 服务
└── types/
    └── {module}.ts              # 类型定义
```

---

## 三、数据库设计

### 3.1 表结构

#### 表：{table_name}

| 字段 | 类型 | 约束 | 说明 |
|------|------|------|------|
| `id` | INT | PK, AUTO_INCREMENT | 主键 |
| `name` | VARCHAR(100) | NOT NULL | 名称 |
| `status` | ENUM | NOT NULL | 状态 |
| `created_by` | INT | FK → users.id | 创建人 |
| `created_at` | DATETIME | NOT NULL | 创建时间 |
| `updated_at` | DATETIME | NOT NULL | 更新时间 |

### 3.2 索引设计

| 索引名 | 字段 | 类型 |
|--------|------|------|
| `idx_{table}_status` | status | BTREE |
| `uk_{table}_name` | name | UNIQUE |

---

## 四、API 设计

> 详见 [API 契约](./contracts/api-spec.yaml)

### 4.1 接口清单

| 方法 | 路径 | 描述 | 权限 |
|------|------|------|------|
| GET | `/api/v1/{module}` | 获取列表 | USER |
| POST | `/api/v1/{module}` | 创建 | USER |
| GET | `/api/v1/{module}/{id}` | 获取详情 | USER |
| PUT | `/api/v1/{module}/{id}` | 更新 | USER |
| DELETE | `/api/v1/{module}/{id}` | 删除 | ADMIN |

### 4.2 请求/响应示例

**POST /api/v1/{module}**

请求:
```json
{
  "name": "示例",
  "description": "描述"
}
```

响应:
```json
{
  "code": 0,
  "message": "success",
  "data": {
    "id": 1,
    "name": "示例"
  }
}
```

---

## 五、前端设计

### 5.1 页面结构

```
{Module}/
├── index.tsx           # 列表页（Table + 搜索 + 操作按钮）
├── Detail.tsx          # 详情/编辑页（Form）
├── components/         # 局部组件
│   └── {Component}.tsx
└── {Module}.module.css # 模块样式
```

### 5.2 状态管理

```typescript
// stores/{module}Store.ts
interface {Module}State {
  list: {Module}Item[];
  loading: boolean;
  selectedId: number | null;
}
```

---

## 六、安全设计

| 安全项 | 方案 |
|--------|------|
| **认证** | SSO 单层鉴权 (deps_sso.py) |
| **授权** | 基于角色的权限控制 |
| **数据** | 部门数据隔离 |
| **日志** | 操作日志记录 |

---

## 七、测试方案

| 测试类型 | 覆盖范围 | 工具 |
|----------|----------|------|
| 单元测试 | Service 层 | pytest |
| 集成测试 | API 端点 | pytest + httpx |
| 前端测试 | 组件测试 | vitest |

---

## 八、部署配置

> 使用现有的 K8S + Nacos 配置，无需额外变更

---

## 附录

### 相关文档

- [功能规格](./spec.md)
- [API 契约](./contracts/api-spec.yaml)
- [任务清单](./tasks.md)
