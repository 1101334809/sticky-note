---
description: Generate or update C4 Model architecture documentation following the project constitution.
---

## User Input

```text
$ARGUMENTS
```

You **MUST** consider the user input before proceeding (if not empty).

## Constitution Reference

**必须遵守**: `.specify/memory/c4-model-constitution.md`

在执行任何 C4 Model 相关操作前，必须先读取并遵守此规约文件。

## Outline

### 1. 加载规约

```bash
# 读取 C4 Model 规约
cat .specify/memory/c4-model-constitution.md
```

### 2. 分析项目结构

执行以下分析：

1. **扫描源码结构**：
   - `apps/` - 应用层
   - `packages/` - 共享包
   - `internal/` - 内部配置

2. **识别关键模块**：
   - 业务模块（views/）
   - API 层（api/）
   - 核心基础设施（@core/）
   - 效果层（effects/）

3. **提取外部依赖**：
   - 后端 API
   - 认证服务
   - 第三方服务

### 3. 生成/更新 DSL

按照规约更新 `docs/architecture/workspace.dsl`：

```dsl
workspace "<项目名称>" "<项目描述>" {
    !identifiers hierarchical

    model {
        # C1: 用户角色
        <role> = person "<角色名>" "<描述>" { tags "User" }

        # C1: 外部系统
        <external> = softwareSystem "<名称>" "<描述>" { tags "External System" }

        # C1: 主系统
        <system> = softwareSystem "<名称>" "<描述>" {
            tags "Primary System"

            # C2: 容器
            <container> = container "<名称>" "<描述>" "<技术栈>" {
                tags "<容器类型>"

                # C3: 组件
                <component> = component "<名称>" "<描述>" "<技术>" {
                    tags "<组件类型>"
                }
            }
        }

        # 关系定义
        <source> -> <target> "<描述>" "<技术>"
    }

    views {
        # C1 视图
        systemContext <system> "C1_SystemContext" {
            title "C1: 系统上下文图"
            include *
            autolayout lr
        }

        # C2 视图
        container <system> "C2_Container" {
            title "C2: 容器图"
            include *
            autolayout lr
        }

        # C3 视图
        component <container> "C3_Component" {
            title "C3: 组件图"
            include *
            autolayout tb
        }

        # 样式
        styles {
            # 按规约定义样式
        }
    }
}
```

### 4. 同步更新文档

更新对应的 README 文件：

| 文件 | 更新内容 |
|------|----------|
| `c1-system-context/README.md` | Mermaid 图、用户角色、外部系统、交互流程 |
| `c2-container/README.md` | 容器清单、技术栈、部署架构 |
| `c3-component/README.md` | 模块详情、依赖图、API 定义 |
| `c4-code/README.md` | 类图、代码规范、示例 |

### 5. 验证输出

执行验证：
- [ ] DSL 语法正确
- [ ] 命名符合规范
- [ ] 四层文档完整
- [ ] 样式定义完整
- [ ] 关系包含描述和技术

### 6. 🔴 强制同步到文档仓库（NON-NEGOTIABLE）

**此步骤为强制动作，必须执行，无一例外。**

完成 C4 Model 生成/更新后，必须执行以下同步操作：

```bash
# 执行同步脚本
.specify/scripts/sync-c4-docs.sh
```

或者通过 Git 提交触发 CI 自动同步：

```bash
git add docs/architecture/
git commit -m "docs: update C4 Model architecture"
git push origin main
```

**同步目标**：
- 仓库：`http://gitlab.praise.com/2440/reverse-pwa-docs.git`
- 路径：`laaffic-ad-pwa-ui-customer/docs/specify/c4model/`

**验证同步结果**：
```bash
git clone --depth 1 http://gitlab.praise.com/2440/reverse-pwa-docs.git /tmp/verify-docs
ls -la /tmp/verify-docs/laaffic-ad-pwa-ui-customer/docs/specify/c4model/
rm -rf /tmp/verify-docs
```

⚠️ **未执行同步的 C4 Model 变更视为未完成！**

## 命令示例

```
/speckit.c4model 根据当前项目结构更新 C4 Model 文档

/speckit.c4model 新增组件 "PaymentModule" 到 C3 层

/speckit.c4model 添加外部系统 "SMS Service" 到 C1 层
```

## Key Rules

- **必须遵守规约**：所有生成内容必须符合 `c4-model-constitution.md`
- **Architecture as Code**：只修改 DSL 文件，不直接编辑图片
- **文档同步**：DSL 变更必须同步更新 README
- **命名一致**：标识符使用 camelCase
- **样式统一**：使用规约定义的颜色方案
