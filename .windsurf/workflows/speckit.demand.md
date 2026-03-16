---
description: ① 需求分析 - 创建需求规格文档，明确用户痛点和业务目标。
---

## User Input

```text
$ARGUMENTS
```

You **MUST** consider the user input before proceeding (if not empty).

## 流程概述

本工作流对应开发流程 **① 需求分析**，产出物为 `{功能}-需求规格.md`，归档至 `docs/demand/`。

### 步骤

1. **生成功能短名称**（2-4 词）：
   - 使用动词-名词格式（如 "add-user-auth", "fix-payment-bug"）
   - 保持简洁且具描述性

2. **检查现有分支**：
   ```bash
   git fetch --all --prune
   git branch -a | grep -E '[0-9]+-<short-name>'
   ```

3. **创建功能分支和 spec 目录**：
   ```bash
   # 分支格式: NNN-short-name (如 001-user-auth)
   git checkout -b <number>-<short-name>
   mkdir -p .specify/specs/<number>-<short-name>
   ```

4. **加载规约**：读取 `.specify/memory/constitution.md`

5. **加载模板**：读取 `.specify/templates/spec-template.md`

6. **生成需求规格**：
   - 解析用户描述
   - 提取：用户痛点、业务目标、约束条件
   - 填写用户场景与测试部分
   - 生成功能需求（每条必须可测试）
   - 定义成功标准（可度量、技术无关）
   - 识别关键实体

7. **保存并归档**：
   - 写入 `.specify/specs/<number>-<short-name>/spec.md`（工作副本）
   - 归档到 `docs/demand/{功能}-需求规格.md`

8. **报告**：输出分支名、spec 文件路径、归档路径

## Key Rules

- 明确 *做什么* 和 *为什么*，不涉及技术栈
- 不明确的地方最多使用 3 个 `[NEEDS CLARIFICATION]` 标记
- 每条需求必须可测试
- 成功标准必须可度量
- **必须归档到 `docs/demand/`**
