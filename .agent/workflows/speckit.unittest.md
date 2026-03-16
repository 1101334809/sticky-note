---
description: ⑦ 单元测试 - 编写和执行单元测试，确保代码覆盖率达标。
---

## User Input

```text
$ARGUMENTS
```

You **MUST** consider the user input before proceeding (if not empty).

## 流程概述

本工作流对应开发流程 **⑦ 单元测试**，产出物为单元测试代码，存放于 `tests/` 目录。

### 步骤

1. **识别当前功能**：
   - 获取当前分支名
   - 在 `.specify/specs/` 中找到对应文档

2. **加载上下文**：
   - 读取需求规格 `spec.md`
   - 读取架构设计 `architecture.md`
   - 读取任务清单 `tasks.md`
   - 读取 `.specify/memory/constitution.md`

3. **分析测试范围**：
   - 识别已实现的功能模块
   - 确定需要测试的核心逻辑
   - 梳理依赖关系和 Mock 需求

4. **生成单元测试**：
   
   ### TDD 模式（推荐）
   - 先写测试，后写实现
   - 测试驱动设计
   
   ### 后补测试模式
   - 分析现有代码
   - 补充测试用例

5. **测试结构**：
   ```
   tests/
   ├── unit/
   │   ├── models/
   │   ├── services/
   │   └── utils/
   ├── integration/
   └── fixtures/
   ```

6. **执行测试**：
   ```bash
   # 运行测试并生成覆盖率报告
   pytest --cov=src --cov-report=html tests/unit/
   ```

7. **验证覆盖率**：
   - 核心逻辑覆盖率 > 80%
   - 边界条件全覆盖
   - 异常处理全覆盖

8. **报告**：输出测试通过率、覆盖率、未覆盖的关键路径

## 测试用例模板

```python
import pytest
from unittest.mock import Mock, patch

class Test{ClassName}:
    """单元测试: {类名}"""
    
    @pytest.fixture
    def setup(self):
        """测试前置条件"""
        pass
    
    def test_{method}_success(self, setup):
        """测试 {方法} - 正常场景"""
        # Arrange
        # Act
        # Assert
        pass
    
    def test_{method}_edge_case(self, setup):
        """测试 {方法} - 边界条件"""
        pass
    
    def test_{method}_error(self, setup):
        """测试 {方法} - 异常处理"""
        pass
```

## Key Rules

- 遵循 AAA 模式：Arrange-Act-Assert
- 测试命名：`test_{方法名}_{场景}`
- 每个测试只验证一个行为
- 使用 Mock 隔离外部依赖
- **覆盖率必须 > 80%**
- 测试代码存放于 `tests/` 目录
