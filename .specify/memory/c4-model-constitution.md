# C4 Model 生成规约

本规约定义了项目中 C4 Model 架构文档的生成标准和约束条件。

## 核心原则

### I. Architecture as Code 优先

**描述**：所有架构图必须以代码形式（Structurizr DSL）定义，而非手动绘制。

**要求**：
- 主定义文件：`docs/architecture/workspace.dsl`
- 所有架构变更必须通过修改 DSL 文件实现
- DSL 文件必须纳入版本控制

**合规示例**：
```dsl
workspace "Project" {
    model {
        user = person "User"
        system = softwareSystem "System"
    }
}
```

**违规示例**：
- 使用 draw.io、Visio 等工具手动绘制架构图
- 直接修改导出的 PNG/SVG 文件

---

### II. 分层文档结构

**描述**：C4 Model 必须包含完整的四层文档，每层有独立的详细说明。

**目录结构**：
```
docs/architecture/
├── README.md                 # 架构文档索引
├── workspace.dsl             # Structurizr DSL 主定义
├── c1-system-context/        # C1: 系统上下文
│   └── README.md
├── c2-container/             # C2: 容器
│   └── README.md
├── c3-component/             # C3: 组件
│   └── README.md
└── c4-code/                  # C4: 代码
    └── README.md
```

**各层要求**：

| 层级 | 必须包含 | 目标受众 |
|------|----------|----------|
| C1 | 系统边界、外部用户/系统、交互关系 | 非技术人员、产品经理 |
| C2 | 容器定义、技术栈、部署架构 | 架构师、技术负责人 |
| C3 | 模块划分、依赖关系、接口定义 | 开发团队 |
| C4 | 类图、代码结构、命名规范 | 开发者 |

---

### III. DSL 命名规范

**描述**：Structurizr DSL 中的标识符必须遵循统一命名规范。

**规则**：
1. **Person**：使用角色名称，camelCase（如 `advertiser`、`admin`）
2. **Software System**：使用系统名称，camelCase（如 `adPwaCustomer`）
3. **Container**：使用容器类型，camelCase（如 `webApp`、`backendMock`）
4. **Component**：使用模块路径或功能名，camelCase（如 `effectsRequest`、`apiPromotion`）
5. **Tags**：使用 Title Case（如 `"Business Module"`、`"External System"`）

**合规示例**：
```dsl
advertiser = person "广告主" "使用平台的客户" { tags "User" }
webApp = container "Web Application" "主应用" "Vue 3" { tags "Web Browser" }
```

---

### IV. 关系定义规范

**描述**：组件间关系必须清晰定义，包含描述和技术协议。

**格式**：
```dsl
<source> -> <target> "<description>" "<technology>"
```

**必须包含**：
- 描述（relationship description）：说明交互目的
- 技术（technology）：使用的协议或技术

**合规示例**：
```dsl
webApp -> adBackendApi "API 请求" "HTTPS/REST"
effectsRequest -> stores "读取 Token" ""
```

---

### V. 视图定义规范

**描述**：每个 C4 层级必须有对应的视图定义。

**必须包含的视图**：
1. `systemContext` - C1 系统上下文图
2. `container` - C2 容器图
3. `component` - C3 组件图（可按业务/基础设施拆分多个）

**视图属性要求**：
```dsl
systemContext <system> "<key>" {
    title "<中文标题>"
    description "<描述>"
    include *
    autolayout lr|tb
}
```

---

### VI. 样式一致性

**描述**：所有图表必须使用统一的样式定义。

**必须定义的样式**：

| 元素类型 | 必须属性 |
|----------|----------|
| Person | shape Person, background, color |
| Software System | background, color |
| Container | background, color, shape（可选） |
| Component | background, color |
| External System | 灰色背景，区分内外部 |

**颜色规范**：
- 主系统：蓝色系 `#438DD5`
- 外部系统：灰色 `#999999`
- 业务模块：绿色系 `#6B8E23`
- 基础设施：深绿 `#2E8B57`
- API 层：橙色系 `#CD853F`

---

### VII. 文档同步要求

**描述**：DSL 文件与 Markdown 文档必须保持同步。

**同步规则**：
1. 修改 `workspace.dsl` 后，必须更新对应层级的 `README.md`
2. 新增/删除组件必须同步更新文档
3. CI 流程自动验证 DSL 语法

---

### VIII. Mermaid 图表规范

**描述**：README 文档中的 Mermaid 图表必须与 DSL 定义一致。

**支持的图表类型**：
- `C4Context` - 系统上下文
- `C4Container` - 容器图
- `C4Component` - 组件图
- `sequenceDiagram` - 交互流程
- `graph` / `flowchart` - 依赖关系
- `classDiagram` - 代码结构（C4 层）

---

### IX. 外部接口清单（必须包含）

**描述**：C3 组件文档必须包含「外部接口清单」章节，统一记录服务与外部系统的所有交互点。

**适用范围**：无论是 REST API、事件驱动、RPC 还是其他架构风格，只要存在外部交互，都必须记录。

**必须包含的接口分类**：

| 分类 | 接口类型 | 必须记录的内容 |
|------|----------|----------------|
| **Provider（对外提供）** | REST API | 接口路径、HTTP 方法、请求参数、响应格式、Controller 类 |
| | Feign 接口定义 | 接口类、方法签名、描述、供哪些服务调用 |
| | SDK 接口 | 接口类、方法、描述、使用示例 |
| | 事件发布 | Topic、事件类型、消息格式、触发条件 |
| **Consumer（调用外部）** | HTTP API 调用 | 端点 URL、HTTP 方法、认证方式、请求/响应格式、调用组件 |
| | RPC/Feign 调用 | 服务名、接口方法、调用组件 |
| | 消息订阅 | Topic 名称、消费组、消息格式、处理组件 |
| **Storage（存储）** | 数据库 | 数据库类型、表名、操作类型（CRUD）、访问组件 |
| | 缓存 | Key 模式、操作类型、TTL、用途、访问组件 |
| **Infrastructure（基础设施）** | 服务注册/配置 | 注册中心类型、关键配置项 |

**文档结构要求**：

```markdown
## 外部接口清单

### 接口总览图
（Mermaid flowchart，展示输入/输出/存储接口）

### 1. 消息队列接口
#### 消费 Topic（输入）
| Topic | 配置键 | 消费组 | 消息格式 | 处理组件 | 说明 |

#### 生产 Topic（输出）
| Topic | 配置键 | 消息格式 | 生产组件 | 说明 |

### 2. 外部 HTTP API 接口
| 平台 | API 名称 | 端点 | 方法 | 认证方式 | 调用组件 |

### 3. 对外提供的接口（Provider）

#### 3.1 REST API（如有）
| 路径 | 方法 | 描述 | 请求参数 | 响应格式 | Controller |

#### 3.2 Feign 接口定义（如有，供其他服务调用）
| 接口类 | 方法 | 描述 | 请求参数 | 响应类型 |

#### 3.3 SDK 接口（如有，对外发布的 SDK）
| 接口类 | 方法 | 描述 | 使用示例 |

#### 3.4 事件发布（如有，供其他服务订阅）
| Topic | 事件类型 | 消息格式 | 触发条件 |

### 4. 调用外部的接口（Consumer）

#### 4.1 RPC/Feign 调用
| 服务名 | 接口 | 方法 | 调用组件 |

### 5. 数据库接口
| 数据库 | 表名 | 操作 | 访问组件 | 说明 |

### 6. 缓存接口
| Key 模式 | 操作 | 用途 | TTL | 访问组件 |

### 7. 服务注册与配置
| 功能 | 配置项 | 说明 |

### 8. 接口依赖矩阵
| 组件 | Kafka | MySQL | Redis | 外部 API | ... |

### 9. 错误处理与重试策略
| 接口类型 | 重试策略 | 错误处理 |
```

**合规示例**：
```markdown
### 2. 外部 HTTP API 接口

| 平台 | API 名称 | 端点 | 方法 | 认证方式 | 调用组件 |
|------|----------|------|------|----------|----------|
| Facebook | Conversions API | `https://graph.facebook.com/v18.0/{pixel_id}/events` | POST | Access Token | `PixelCallbackService` |
```

**违规示例**：
- C3 文档中缺少外部接口清单章节
- 只记录部分接口，遗漏关键外部依赖
- 缺少接口依赖矩阵

---

### X. 代码分析规范（深度分析）

**描述**：生成 C3/C4 层文档时，应使用代码分析工具进行 AST 解析和调用链分析，确保文档反映真实代码结构。

**适用场景**：
- 生成/更新 C3 组件文档
- 生成/更新 C4 代码文档
- 分析外部接口清单
- 验证组件依赖关系

#### 分析工具（MCP code-graph）

| 工具 | 用途 | 使用场景 |
|------|------|----------|
| `mcp0_search_code` | 搜索类/方法/字段 | 定位关键组件 |
| `mcp0_get_class_detail` | 获取类完整代码和结构 | 分析组件实现 |
| `mcp0_get_method_detail` | 获取方法详细信息 | 分析接口定义 |
| `mcp0_get_call_chain` | 获取方法调用链 | 分析组件依赖 |
| `mcp0_get_implementations` | 查找接口实现类 | 分析多态关系 |
| `mcp0_resolve_external_call` | 解析外部调用 | 分析跨仓库依赖 |

#### 分析流程

```mermaid
flowchart TD
    A[开始 C4 文档生成] --> B{分析层级}
    B -->|C3 组件层| C[组件分析]
    B -->|C4 代码层| D[代码分析]
    
    C --> C1[search_code: 扫描 Service/Controller/Listener]
    C1 --> C2[get_class_detail: 获取类结构]
    C2 --> C3[get_call_chain: 分析调用关系]
    C3 --> C4[生成组件依赖图]
    
    D --> D1[get_class_detail: 获取核心类]
    D1 --> D2[get_method_detail: 分析关键方法]
    D2 --> D3[生成类图和时序图]
    
    C4 --> E[更新文档]
    D3 --> E
```

#### 必须分析的代码元素

**C3 组件层**：

| 元素类型 | 分析内容 | 输出到文档 |
|----------|----------|------------|
| **Service 类** | 依赖注入、方法签名、调用链 | 组件清单、接口定义 |
| **Controller 类** | REST 端点、请求映射 | 对外暴露的 API |
| **Listener 类** | 监听的 Topic、处理方法 | 消息队列接口 |
| **Feign Client** | 远程服务、接口方法 | RPC 接口 |
| **Mapper 接口** | SQL 操作、关联表 | 数据库接口 |

**C4 代码层**：

| 元素类型 | 分析内容 | 输出到文档 |
|----------|----------|------------|
| **核心类** | 字段、方法、继承关系 | 类图 |
| **关键方法** | 参数、返回值、调用链 | 时序图 |
| **数据模型** | DTO/Entity 字段定义 | 数据模型表 |
| **配置类** | Bean 定义、配置项 | 配置说明 |

#### 调用链分析规则

```java
// 示例：分析 BizEventProcessService 的调用链
mcp0_get_call_chain(
    method_name: "processBizEvent",
    class_name: "BizEventProcessServiceImpl",
    direction: "downstream",  // 下游调用
    depth: 3                  // 深度 3 层
)
```

**分析方向**：
- `upstream`：谁调用了这个方法（用于追溯入口）
- `downstream`：这个方法调用了谁（用于分析依赖）
- `both`：双向分析（完整调用链）

#### 跨仓库依赖分析

当遇到公司内部包（`com.itniotech.*`、`com.skyline.*`）时：

```java
// 示例：解析外部 SDK 调用
mcp0_resolve_external_call(
    call_expression: "monitorSdkService.sendAlert()",
    import_statements: ["import com.itniotech.monitor.sdk.service.MonitorSdkService"],
    repo: "当前仓库名",
    include_implementations: true
)
```

#### 分析结果验证

生成文档后，必须验证：

| 检查项 | 验证方式 |
|--------|----------|
| 组件依赖完整性 | 调用链分析结果 vs 文档依赖图 |
| 接口定义准确性 | 方法签名 vs 文档接口定义 |
| 外部接口覆盖率 | 代码中的外部调用 vs 外部接口清单 |

#### 合规示例

```markdown
## 组件清单（基于代码分析）

### BizEventProcessService

**来源**：`mcp0_get_class_detail("BizEventProcessServiceImpl")`

| 方法 | 调用链深度 | 依赖组件 |
|------|-----------|----------|
| `processBizEvent()` | 3 | PixelCallbackService, RedisService, AppMapper |
| `sendBillingEvent()` | 2 | KafkaTemplate |
```

#### 违规示例

- ❌ 仅通过目录结构推断组件依赖，未进行代码分析
- ❌ 接口定义与实际代码不符
- ❌ 遗漏重要的调用链关系

---

### XI. C3 文档拆分规范

**描述**：当微服务接口较多时，C3 组件文档需按模块拆分，避免单文件过大影响可读性和维护性。

**拆分阈值**：

| 文档行数 | 建议 |
|----------|------|
| < 500 行 | 单文件 `README.md` |
| 500-1000 行 | 考虑拆分 |
| > 1000 行 | **必须拆分** |

**拆分后目录结构**：

```
docs/architecture/c3-component/
├── README.md                  # 概览：组件图 + 组件清单 + 子文档索引
├── interfaces/                # 接口定义（按类型拆分）
│   ├── provider.md            # 对外提供的接口（REST API、Feign、SDK、事件发布）
│   ├── consumer.md            # 调用外部的接口（HTTP API、RPC、消息订阅）
│   └── storage.md             # 存储接口（数据库、缓存）
├── services/                  # 服务组件（按业务域拆分，可选）
│   ├── user-service.md        # 用户服务组件
│   ├── order-service.md       # 订单服务组件
│   └── ...
└── flows/                     # 业务流程（可选）
    ├── main-flow.md           # 核心业务流程
    └── ...
```

**README.md 必须保留的内容**：

| 章节 | 内容 | 说明 |
|------|------|------|
| 概述 | 服务简介 | 1-2 段描述 |
| 完整组件图 | Mermaid C4Component | 全局视图，不可拆分 |
| 组件清单 | 表格列出所有组件 | 简要版，详情链接到子文档 |
| 核心业务流程 | 时序图 | 关键流程保留，次要流程拆分 |
| 子文档索引 | 链接列表 | 指向各子文档 |

**子文档索引格式**：

```markdown
## 详细文档

| 文档 | 内容 |
|------|------|
| [Provider 接口](interfaces/provider.md) | REST API、Feign 接口、SDK、事件发布 |
| [Consumer 接口](interfaces/consumer.md) | HTTP API 调用、RPC 调用、消息订阅 |
| [Storage 接口](interfaces/storage.md) | 数据库、缓存接口 |
```

**拆分原则**：

1. **按接口类型拆分优先**：Provider / Consumer / Storage 三大类
2. **按业务域拆分可选**：当服务内有多个独立业务模块时
3. **组件图不拆分**：完整组件图必须保留在 README.md
4. **交叉引用**：子文档间使用相对路径引用

**合规示例**：

```markdown
<!-- README.md -->
## 组件清单

### 业务服务层

| 组件 | 接口 | 实现类 | 职责 |
|------|------|--------|------|
| **UserService** | `UserService.java` | `UserServiceImpl.java` | 用户管理 |

> 详细接口定义见 [Provider 接口](interfaces/provider.md#userservice)

## 详细文档

- [Provider 接口](interfaces/provider.md) - REST API、Feign 接口
- [Consumer 接口](interfaces/consumer.md) - 外部调用
- [Storage 接口](interfaces/storage.md) - 数据库、缓存
```

**违规示例**：

- ❌ 单文件超过 1000 行未拆分
- ❌ 拆分后 README.md 缺少组件图
- ❌ 子文档缺少返回主文档的链接
- ❌ 拆分粒度过细（如每个接口一个文件）

---

### XII. 文档仓库自动同步

**描述**：所有 C4 Model 变更必须自动同步到统一的文档仓库。

**文档仓库**：
```
http://gitlab.praise.com/2440/reverse-pwa-docs.git
```

**目录结构**：
```
reverse-pwa-docs/
├── laaffic-ad-pwa-ui-customer/     # 当前项目
│   └── docs/
│       └── specify/
│           └── c4model/
│               ├── README.md
│               ├── workspace.dsl
│               ├── c1-system-context/
│               ├── c2-container/
│               ├── c3-component/
│               └── c4-code/
├── <其他工程名>/
│   └── docs/
│       └── specify/
│           └── c4model/
│               └── ...
```

**同步规则**：

1. **触发条件**：任何 `docs/architecture/` 目录下的文件变更
2. **同步范围**：完整的 C4 Model 文档目录
3. **目标路径**：`<工程名>/docs/specify/c4model/`
4. **提交信息格式**：`[C4-Sync] <工程名>: <变更描述>`

**自动同步脚本**：

```bash
#!/bin/bash
# .specify/scripts/sync-c4-docs.sh

PROJECT_NAME="laaffic-ad-pwa-ui-customer"
DOCS_REPO="http://gitlab.praise.com/2440/reverse-pwa-docs.git"
SOURCE_DIR="docs/architecture"
TARGET_DIR="${PROJECT_NAME}/docs/specify/c4model"

# 克隆文档仓库
git clone --depth 1 "${DOCS_REPO}" /tmp/reverse-pwa-docs

# 确保目标目录存在
mkdir -p "/tmp/reverse-pwa-docs/${TARGET_DIR}"

# 同步文件
rsync -av --delete "${SOURCE_DIR}/" "/tmp/reverse-pwa-docs/${TARGET_DIR}/"

# 提交变更
cd /tmp/reverse-pwa-docs
git add .
git commit -m "[C4-Sync] ${PROJECT_NAME}: $(date +%Y-%m-%d) architecture update"
git push origin main

# 清理
rm -rf /tmp/reverse-pwa-docs
```

**CI 自动化配置**：

```yaml
# .github/workflows/architecture.yml 中添加
sync-to-docs-repo:
  name: Sync C4 Model to Docs Repository
  runs-on: ubuntu-latest
  needs: validate-dsl
  if: github.event_name == 'push' && github.ref == 'refs/heads/main'
  
  steps:
    - name: Checkout
      uses: actions/checkout@v4
    
    - name: Sync to Docs Repository
      env:
        GITLAB_TOKEN: ${{ secrets.GITLAB_DOCS_TOKEN }}
      run: |
        PROJECT_NAME="laaffic-ad-pwa-ui-customer"
        DOCS_REPO="http://oauth2:${GITLAB_TOKEN}@gitlab.praise.com/2440/reverse-pwa-docs.git"
        
        git clone --depth 1 "${DOCS_REPO}" /tmp/docs-repo
        mkdir -p "/tmp/docs-repo/${PROJECT_NAME}/docs/specify/c4model"
        rsync -av --delete docs/architecture/ "/tmp/docs-repo/${PROJECT_NAME}/docs/specify/c4model/"
        
        cd /tmp/docs-repo
        git config user.name "CI Bot"
        git config user.email "ci@praise.com"
        git add .
        git diff --staged --quiet || git commit -m "[C4-Sync] ${PROJECT_NAME}: architecture update"
        git push origin main
```

**手动同步命令**：

```bash
# 在项目根目录执行
.specify/scripts/sync-c4-docs.sh
```

**注意事项**：
- 需要配置 `GITLAB_DOCS_TOKEN` Secret，具有文档仓库的写权限
- 同步仅在 main 分支的 push 事件触发
- 同步前必须通过 DSL 语法验证

---

## 质量门禁

### 必须通过的检查

1. **DSL 语法验证**：`structurizr validate` 通过
2. **命名规范检查**：标识符符合命名规范
3. **完整性检查**：四层文档均存在且非空
4. **一致性检查**：DSL 与文档描述一致

### CI 自动化

```yaml
# .github/workflows/architecture.yml
- name: Validate DSL
  run: structurizr validate -workspace docs/architecture/workspace.dsl
```

---

## 变更流程

1. **提出变更**：在 PR 中说明架构变更原因
2. **修改 DSL**：更新 `workspace.dsl`
3. **更新文档**：同步更新对应层级 README
4. **CI 验证**：自动验证 DSL 语法
5. **代码审查**：架构变更需技术负责人审批
6. **🔴 强制同步**：变更合并后必须同步到文档仓库

---

## 强制动作（NON-NEGOTIABLE）

### 文档仓库同步 - 必须执行

**每次 C4 Model 变更后，必须执行以下同步动作，无一例外。**

#### 触发条件

以下任一情况发生时，**必须**执行同步：
- 修改 `workspace.dsl`
- 修改任何 `docs/architecture/` 下的文件
- 新增/删除 C4 层级文档
- 使用 `/speckit.c4model` 命令生成或更新文档

#### 执行方式

**方式一：手动同步（立即生效）**

```bash
# 在项目根目录执行
.specify/scripts/sync-c4-docs.sh
```

**方式二：通过 Git 提交触发 CI 自动同步**

```bash
git add docs/architecture/
git commit -m "docs: update C4 Model architecture"
git push origin main
# CI 会自动执行同步
```

#### 验证同步结果

同步完成后，必须验证：

```bash
# 检查文档仓库是否有最新提交
git clone --depth 1 http://gitlab.praise.com/2440/reverse-pwa-docs.git /tmp/verify-docs
ls -la /tmp/verify-docs/laaffic-ad-pwa-ui-customer/docs/specify/c4model/
rm -rf /tmp/verify-docs
```

#### 违规后果

- ❌ 未同步的 C4 Model 变更视为**未完成**
- ❌ Code Review 必须检查同步状态
- ❌ 发现未同步需立即补充执行

---

## 版本信息

**Version**: 1.6.0 | **Ratified**: 2026-01-15 | **Last Amended**: 2026-01-19
