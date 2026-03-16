---
description: ⑥ 执行开发 - 按任务清单执行开发，遵循 TDD 流程。
---

## User Input

```text
$ARGUMENTS
```

You **MUST** consider the user input before proceeding (if not empty).

## 流程概述

本工作流对应开发流程 **⑥ 执行开发**，产出物为代码实现，存放于 `backend/` 或 `frontend/` 等代码目录。

### 步骤

1. **识别当前功能**：
   - 获取当前分支名
   - 在 `.specify/specs/<feature>/` 中找到对应文档

2. **加载上下文**：
   - 读取 `spec.md`（需求）
   - 读取 `architecture.md`（架构设计）
   - 读取 `plan.md`（开发计划）
   - 读取 `tasks.md`（任务清单）
   - 读取 `data-model.md` 和 `contracts/`（如存在）
   - 读取 `.specify/memory/constitution.md`（规约）

3. **按序执行任务**：

   对于 `tasks.md` 中每个未完成的任务：
   
   a. **前置检查**：
      - 验证依赖任务已完成
      - 阅读相关现有代码
   
   b. **实现**：
      - 遵循架构设计和契约
      - 遵守规约原则
      - 编写干净、可测试的代码
      - **TDD 模式**：先写测试，后写实现
   
   c. **后置检查**：
      - 运行相关测试
      - 在 `tasks.md` 中标记完成
      - 适时提交代码
   
   d. **继续或暂停**：
      - 错误时：报告并等待用户输入
      - 成功时：继续下一任务

4. **进度报告**：每完成任务或批次后报告：
   - 已完成任务数
   - 剩余任务数
   - 阻塞问题

## 提交规范

```bash
# 提交格式
git commit -m "<type>(<scope>): <description>"

# 类型
# feat: 新功能
# fix: 修复 Bug
# refactor: 重构
# test: 测试
# docs: 文档
```

## Key Rules

- 严格遵循架构设计，除非遇到阻塞
- 每个组件实现后必须测试
- 频繁提交，描述清晰
- 任务不明确时请求澄清
- 完成任务后更新 `tasks.md`
- **遵循 TDD 流程**
