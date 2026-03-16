# 任务清单：[功能名称]

**创建日期**: [DATE]  
**负责人**: [NAME]  
**预计工时**: [X] 人天

---

## 任务概览

| 阶段 | 任务数 | 预计工时 | 状态 |
|------|--------|----------|------|
| 后端开发 | X | X天 | 🔴 待开始 |
| 前端开发 | X | X天 | 🔴 待开始 |
| 测试验证 | X | X天 | 🔴 待开始 |

---

## 后端开发任务

### 1. 数据模型

- [ ] **T001** 创建模型 `app/models/{module}.py`
  - 定义实体字段
  - 添加关联关系
  - 添加索引

- [ ] **T002** 创建数据库迁移
  - `alembic revision --autogenerate -m "add {module}"`
  - `alembic upgrade head`

### 2. DTO 层

- [ ] **T003** 创建 Schema `app/schemas/{module}.py`
  - CreateRequest
  - UpdateRequest
  - Response
  - ListResponse

### 3. 服务层

- [ ] **T004** 创建服务 `app/services/{module}_service.py`
  - `get_list()` 列表查询
  - `get_by_id()` 详情查询
  - `create()` 创建
  - `update()` 更新
  - `delete()` 删除

### 4. API 层

- [ ] **T005** 创建路由 `app/api/v1/endpoints/{module}.py`
  - GET `/api/v1/{module}` 列表
  - GET `/api/v1/{module}/{id}` 详情
  - POST `/api/v1/{module}` 创建
  - PUT `/api/v1/{module}/{id}` 更新
  - DELETE `/api/v1/{module}/{id}` 删除

- [ ] **T006** 注册路由到 `app/api/v1/router.py`

### 5. 单元测试

- [ ] **T007** 创建测试 `tests/test_{module}.py`
  - 测试 Service 层方法
  - 测试 API 端点

---

## 前端开发任务

### 1. 类型定义

- [ ] **T101** 创建类型 `src/types/{module}.ts`
  - 实体类型定义
  - 请求/响应类型

### 2. API 服务

- [ ] **T102** 创建服务 `src/services/{module}.ts`
  - `getList()` 列表
  - `getById()` 详情
  - `create()` 创建
  - `update()` 更新
  - `delete()` 删除

### 3. 页面组件

- [ ] **T103** 创建列表页 `src/pages/pc/{Module}/index.tsx`
  - 数据表格
  - 搜索筛选
  - 操作按钮

- [ ] **T104** 创建详情页 `src/pages/pc/{Module}/Detail.tsx`
  - 表单组件
  - 数据验证
  - 提交逻辑

- [ ] **T105** 创建样式 `src/pages/pc/{Module}/{Module}.module.css`

### 4. 路由配置

- [ ] **T106** 更新路由 `src/router/index.tsx`
  - 添加列表页路由
  - 添加详情页路由

---

## 测试验证任务

- [ ] **T201** 后端 API 测试
  - 接口联调验证
  - 边界条件测试
  - 错误处理测试

- [ ] **T202** 前端功能测试
  - 列表加载
  - 增删改查操作
  - 表单验证

- [ ] **T203** 集成测试
  - 完整业务流程验证
  - 权限控制验证

- [ ] **T204** Code Review
  - 符合 Constitution 规约
  - 符合 DDD 架构
  - 类型安全无 any

---

## 验收检查清单

- [ ] 所有任务完成
- [ ] 单元测试覆盖率 > 80%
- [ ] API 文档已更新
- [ ] 无 TypeScript/Python 类型错误
- [ ] 无 ESLint/Flake8 警告
- [ ] Code Review 通过

---

## 进度记录

| 日期 | 完成任务 | 进度 | 备注 |
|------|----------|------|------|
| [DATE] | - | 0% | 开始 |
