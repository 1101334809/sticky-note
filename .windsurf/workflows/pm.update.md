---
description: ④ 更新原型 - 更新已有的需求文档或HTML原型。
---

## User Input

```text
$ARGUMENTS
```

You **MUST** consider the user input before proceeding (if not empty).

## 流程概述

本工作流用于**更新已有**的需求文档或 HTML 原型。

```mermaid
flowchart LR
    A[选择要更新的功能] --> B[选择更新内容]
    B --> C[输入修改描述]
    C --> D[AI更新文件]
    D --> E[Git提交]
```

---

## 步骤

### 1. 确认更新目标

**询问用户**（如未在 $ARGUMENTS 中提供）：

| 信息 | 示例 | 必填 |
|------|------|------|
| **迭代名称** | 2026-01-用户管理 | ✅ |
| **功能名称** | 用户登录 | ✅ |

### 2. 检查现有文件

检查目标功能的文件状态：

```
docs/prototypes/{迭代}/requirements/{功能名}-澄清.md   [存在/不存在]
docs/prototypes/{迭代}/requirements/{功能名}-需求.md   [存在/不存在]
docs/prototypes/{迭代}/html/{功能名}-prototype.html    [存在/不存在]
```

### 3. 选择更新内容

```
请选择要更新的内容：
1. 需求澄清文档
2. 需求规格文档
3. HTML原型
4. 全部更新
```

### 4. 输入修改描述

请用户描述要修改的内容，例如：
- "增加第三方登录按钮"
- "修改密码校验规则"
- "调整页面布局"

### 5. AI 执行更新

**如果更新 HTML 原型，先加载约束规范**：
```
读取 .specify/memory/pm-prototype-constitution.md
```

根据用户描述，更新对应文件。

**更新原则**：
- 保留原有结构
- 只修改涉及的部分
- 更新文档中的"更新日期"
- 在需求文档中添加变更记录

### 6. 更新索引页

如果更新了 HTML 原型，同步更新 `docs/prototypes/index.html` 中的更新日期。

### 7. 询问 Git 提交

```
是否提交到 Git？(y/n)
```

**如果是**：
```bash
git add docs/prototypes/{迭代}/
git commit -m "pm(更新): {功能名} - {修改简述}"
```

### 8. 输出报告

```markdown
# ✅ 更新完成

## 更新内容

| 文件 | 状态 |
|------|------|
| {功能名}-需求.md | ✅ 已更新 |
| {功能名}-prototype.html | ✅ 已更新 |

## 变更说明

{用户的修改描述}

## 版本管理

```bash
# 查看变更
git diff HEAD~1 docs/prototypes/{迭代}/

# 回滚
git checkout HEAD~1 -- docs/prototypes/{迭代}/
```
```

---

## Key Rules

- **保留原有结构**：不要重写整个文件
- **更新变更记录**：需求文档中添加变更记录
- **同步更新索引**：更新原型时同步更新索引页
- **Git 提交前询问**：不自动提交

## 使用示例

```bash
# 交互式
/pm.update

# 指定功能
/pm.update 用户登录

# 带修改描述
/pm.update 用户登录 增加验证码登录方式

# 完整参数
/pm.update 迭代:2026-01-用户管理 功能:用户登录 修改:增加第三方登录
```
