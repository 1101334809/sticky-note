---
description: ⑤ 任务分配 - 生成任务清单，拆分责任人和排期。
---

## User Input

```text
$ARGUMENTS
```

You **MUST** consider the user input before proceeding (if not empty).

## 流程概述

本工作流对应开发流程 **⑤ 任务分配**，产出物为 `{功能}-任务清单.md`，归档至 `docs/plan/`。

### 步骤

1. **识别当前功能**：
   - 获取当前分支名
   - 在 `.specify/specs/<feature>/` 中找到对应文档

2. **加载上下文**：
   - 读取需求规格 `spec.md`
   - 读取开发计划 `plan.md`
   - 读取架构设计 `architecture.md`
   - 读取数据模型和契约（如存在）
   - 加载 `.specify/templates/tasks-template.md`

3. **生成任务分解**：

   对于每个用户故事：
   - 拆分为实现任务
   - 按依赖排序（models → services → endpoints → UI）
   - 标记可并行任务 `[P]`
   - 为每个任务指定文件路径
   - 如采用 TDD，在实现前包含测试任务

4. **任务格式**：
   ```markdown
   ## 用户故事: [Story Title]
   
   ### 任务
   - [ ] [P][S] 任务 1 - `path/to/file.ts`
   - [ ] [M] 任务 2 (依赖任务 1) - `path/to/file.ts`
   - [ ] [L] 任务 3 - `path/to/file.ts`
   ```

5. **保存并归档**：
   - 写入 `.specify/specs/<feature>/tasks.md`（工作副本）
   - 归档到 `docs/plan/{功能}-任务清单.md`

6. **报告**：输出任务数量、文件路径

## 产出物模板

```markdown
# {功能名称} - 任务清单

## 概览

| 项目 | 数值 |
|------|------|
| 总任务数 | {数量} |
| 可并行 | {数量} |
| 预计工时 | {时间} |

## 任务列表

### US-001: {用户故事}

| 任务 | 复杂度 | 并行 | 文件 | 状态 |
|------|--------|------|------|------|
| 任务描述 | S/M/L | ✅/- | `path/file` | ⬜ |

### 详细任务

- [ ] [P][S] **T-001**: 任务描述 - `path/to/file.ts`
  - 验收标准: {标准}
- [ ] [M] **T-002**: 任务描述 (依赖 T-001) - `path/to/file.ts`
  - 验收标准: {标准}
```

## Key Rules

- 任务必须原子化、可独立完成
- 复杂度标记：`[S]` 小、`[M]` 中、`[L]` 大
- 并行标记：`[P]` 可并行
- 每个任务必须关联具体文件
- 遵循依赖顺序
- **必须归档到 `docs/plan/`**
