---
description: ③ 生成原型 - 基于需求文档生成可交互HTML原型。
---

## User Input

```text
$ARGUMENTS
```

You **MUST** consider the user input before proceeding (if not empty).

## 流程概述

本工作流生成**纯离线、单文件、可交互**的 HTML 原型。

```mermaid
flowchart LR
    A[需求文档] --> B[AI生成HTML]
    B --> C[保存原型]
    C --> D[更新索引页]
    D --> E[Git提交]
```

---

## 步骤

### 1. 检测 Git 环境

同 `/pm.clarify`，检测并确保 Git 可用。

### 2. 确认基本信息

**询问用户**（如未在 $ARGUMENTS 中提供）：

| 信息 | 示例 | 必填 |
|------|------|------|
| **迭代名称** | 2026-01-用户管理 | ✅ |
| **功能名称** | 用户登录 | ✅ |

### 3. 加载上下文

**检查需求文档**：
```
docs/prototypes/{迭代}/requirements/{功能名}-需求.md
```

- **有需求文档**：基于需求文档生成原型
- **无需求文档**：提示用户是否先执行 `/pm.spec`，或直接描述需求

### 4. 确认原型类型

| 类型 | 适用场景 |
|------|----------|
| **表单页** | 登录、注册、设置 |
| **列表页** | 数据管理、订单列表 |
| **详情页** | 用户详情、订单详情 |
| **流程页** | 审批流、下单流程 |
| **仪表盘** | 数据概览、统计 |
| **多Tab页** | 复杂功能 |

### 5. 生成 HTML 原型

**加载约束规范**：
```
读取 .specify/memory/pm-prototype-constitution.md
```

此文件定义了：
- HTML 结构规范
- CSS 规范（颜色、字体、响应式断点）
- JS 规范（交互要求）
- 原型类型布局参考
- 检查清单

**必须严格遵守约束规范中的所有要求。**

### 6. 保存原型

**创建目录**：
```bash
mkdir -p docs/prototypes/{迭代名称}/html
```

**输出文件**：`docs/prototypes/{迭代名称}/html/{功能名}-prototype.html`

### 7. 更新索引页

**索引页路径**：`docs/prototypes/index.html`

**如果不存在**：创建新的索引页

**如果存在**：添加新原型卡片

### 8. 询问 Git 提交

```
是否提交到 Git？(y/n)
```

**如果是**：
```bash
git add docs/prototypes/
git commit -m "pm(原型): {功能名} - 新增原型"
```

### 9. 输出报告

```markdown
# ✅ 原型生成完成

## 文件信息

| 项目 | 值 |
|------|-----|
| **原型文件** | `docs/prototypes/{迭代}/html/{功能名}-prototype.html` |
| **索引页** | `docs/prototypes/index.html` |

## 预览方式

```bash
open docs/prototypes/{迭代}/html/{功能名}-prototype.html
```

## 版本管理

```bash
# 查看历史版本
git log --oneline docs/prototypes/{迭代}/html/{功能名}-prototype.html

# 恢复到某个版本
git checkout {commit} -- docs/prototypes/{迭代}/html/{功能名}-prototype.html
```

## 下一步

- 修改原型：`/pm.update {功能名}`
- 迭代归档：`/pm.archive {迭代名称}`
```

---

## 索引页模板

**模板路径**：`.specify/templates/pm-index-template.html`

首次创建索引页时，基于此模板生成 `docs/prototypes/index.html`，采用卡片风格。

---

## Key Rules

- **纯离线**：禁止使用任何 CDN 依赖
- **单文件**：CSS/JS 必须内联
- **可交互**：原型必须有基本交互（按钮点击、表单校验等）
- **响应式**：支持桌面和移动端预览
- **索引更新**：每次生成原型必须更新索引页
- **Git 提交前询问**：不自动提交

## 使用示例

```bash
# 交互式
/pm.prototype

# 带参数
/pm.prototype 迭代:2026-01-用户管理 功能:用户登录

# 直接描述（跳过需求文档）
/pm.prototype 功能:用户登录 描述:账号密码登录页面，支持记住密码
```
