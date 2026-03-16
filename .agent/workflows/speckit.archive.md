---
description: 📦 迭代归档 - 迭代完成后归档文档快照，保持活跃目录精简。
---

## User Input

```text
$ARGUMENTS
```

You **MUST** consider the user input before proceeding (if not empty).

## 流程概述

当一个迭代完成后，执行此工作流将当前文档快照归档，为下一迭代腾出空间。

**目标**: 保持 `.specify/memory/` 目录始终只有 **当前迭代** 的活跃文档。

```mermaid
flowchart LR
    A[迭代完成] --> B[创建归档目录]
    B --> C[复制文档快照]
    C --> D[更新 index.md]
    D --> E[重置活跃文档]
```

---

## 步骤

### 1. 确认归档信息

**询问用户**（如未在 $ARGUMENTS 中提供）：

```
请确认归档信息：
1. 迭代名称是什么？（如：用户管理功能）
2. 迭代日期？（如：2026-01）
3. 迭代摘要？（一句话描述本迭代完成的内容）
```

### 2. 创建归档目录

```bash
# 格式: docs/archive/{YYYY-MM}-{迭代名称}/
mkdir -p docs/archive/{日期}-{迭代名称}
```

**目录结构**:
```
docs/archive/
└── 2026-01-用户管理功能/
    ├── README.md           # 迭代摘要
    ├── spec.md             # 需求规格快照
    ├── product.md          # 产品设计快照
    ├── architecture.md     # 架构设计快照
    ├── plan.md             # 开发计划快照
    ├── tasks.md            # 任务清单快照
    └── test.md             # 测试方案快照
```

### 3. 生成迭代摘要

创建 `docs/archive/{迭代}/README.md`:

```markdown
# {迭代名称} - 迭代归档

## 基本信息

| 项目 | 值 |
|------|-----|
| **迭代名称** | {名称} |
| **归档日期** | {日期} |
| **迭代周期** | {开始日期} ~ {结束日期} |
| **状态** | ✅ 已完成 |

## 迭代摘要

{一段话描述本迭代完成的主要内容}

## 主要交付物

- [ ] {交付物1}
- [ ] {交付物2}

## 文档清单

| 文档 | 版本 | 说明 |
|------|------|------|
| spec.md | V{x.y} | 需求规格 |
| product.md | V{x.y} | 产品设计 |
| architecture.md | V{x.y} | 架构设计 |
| plan.md | V{x.y} | 开发计划 |
| tasks.md | V{x.y} | 任务清单 |
| test.md | V{x.y} | 测试方案 |

## 关键决策记录

| 决策 | 原因 | 影响 |
|------|------|------|
| {决策1} | {原因} | {影响} |

## 遗留问题

| 问题 | 状态 | 计划 |
|------|------|------|
| {问题1} | 待解决 | 下迭代处理 |
```

### 4. 复制文档快照

```bash
# 复制当前活跃文档到归档目录
cp .specify/memory/spec.md docs/archive/{迭代}/
cp .specify/memory/product.md docs/archive/{迭代}/
cp .specify/memory/architecture.md docs/archive/{迭代}/
cp .specify/memory/plan.md docs/archive/{迭代}/
cp .specify/memory/tasks.md docs/archive/{迭代}/
cp .specify/memory/test.md docs/archive/{迭代}/
```

**注意**: `constitution.md` 和 `index.md` 不归档（它们是跨迭代的）

### 5. 更新 index.md

在 `.specify/memory/index.md` 中：

1. **更新 AI Quick Context**:
   - 清空当前迭代信息
   - 标记为"待启动新迭代"

2. **添加归档记录**:
   ```markdown
   | {迭代名称} | {日期} | 📦 已归档 | {摘要} | [查看](../../docs/archive/{迭代}/) |
   ```

3. **更新变更历史**:
   ```markdown
   | {日期} | {版本} | 归档 | 迭代 {名称} 归档完成 | AI |
   ```

### 6. 重置活跃文档（可选）

如果开始新迭代，可以选择：

**选项 A**: 保留当前文档，继续迭代
```
# 不做任何操作，文档继续演进
```

**选项 B**: 清空重新开始
```bash
# 重置为模板（保留 constitution.md）
cp .specify/templates/spec-template.md .specify/memory/spec.md
cp .specify/templates/product-template.md .specify/memory/product.md
# ... 其他文档类似
```

**选项 C**: 基于上一迭代继续
```
# 已经是这样，文档已在 .specify/memory/ 中
```

### 7. 输出归档报告

```markdown
# 📦 迭代归档报告

## 归档信息

| 项目 | 值 |
|------|-----|
| **迭代名称** | {名称} |
| **归档路径** | `docs/archive/{迭代}/` |
| **归档时间** | {时间} |
| **文档数量** | {N} 个 |

## 已归档文档

| 文档 | 版本 | 大小 |
|------|------|------|
| spec.md | V{x.y} | {size} |
| product.md | V{x.y} | {size} |
| ... | ... | ... |

## 后续步骤

- [ ] 启动新迭代：`/speckit.demand {新需求描述}`
- [ ] 或继续当前文档演进
```

---

## Key Rules

- **constitution.md 不归档**: 它是跨迭代的不可变规约
- **index.md 不归档**: 它是动态索引，需要持续更新
- **保持原子性**: 归档操作应该一次性完成
- **更新索引**: 归档后必须更新 index.md 的归档记录

## 使用示例

```
/speckit.archive 用户管理功能迭代完成，归档日期 2026-01
```
