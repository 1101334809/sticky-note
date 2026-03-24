# 全站 UI 现代化重构 (Glassmorphism) - 开发计划

## MVP 定义

### 必须实现（MVP 核心）

- [ ] **设计系统基建**：CSS Token 全量重写 (Light / Dark 双套)、毛玻璃材质类、微交互类、页面转场动画
- [ ] **Naive UI 主题覆写**：`naiveThemeOverrides.ts` 统一 PrimaryColor / BorderRadius / Shadow
- [ ] **主题运行时**：三态切换 (Light / Dark / System)、系统跟随、IPC 持久化、preload 防闪烁
- [ ] **无边框窗口**：`frame: false` + 自定义 `-webkit-app-region: drag` 拖拽区域
- [ ] **App.vue 外壳重构**：漂浮式毛玻璃侧边栏、渐变 Logo、圆角活跃菜单、底部条形主题切换器、光效背景
- [ ] **共享 UI 组件**：GlassCard / PillBadge / SegmentedControl / EmptyState / HotkeyDisplay / ThemeSwitch
- [ ] **6 大视图改造**：SvgViewer / ImageCompress / FormatConvert / DocConvertView / ClickerView / ImageWatermark
- [ ] **深色模式全链路**：所有页面在 Light 和 Dark 下视觉一致性验收

### 可延后（Post-MVP 增强）

- [ ] 虚拟滚动（>100 文件列表性能优化）
- [ ] GPU 检测降级（backdrop-filter 性能兜底方案）
- [ ] 骨架屏 / 加载遮罩 (Skeleton Loading)
- [ ] Content-Security-Policy 生产环境注入
- [ ] 键盘导航全局热键映射 (Tab 焦点完善)
- [ ] 配置状态跨页面记忆缓存
- [ ] 危险操作 Undo 撤销机制

---

## 里程碑

| 里程碑 | 目标 | 预计完成 | 交付物 |
|--------|------|----------|--------|
| **M1: 设计系统 & 基建** | Token 系统 + 毛玻璃 CSS + 微交互 + Naive UI 覆写 + 主题运行时 + 无边框窗口 | Day 1~2 | `variables.css`, `glassmorphism.css`, `micro-interactions.css`, `transitions.css`, `naiveThemeOverrides.ts`, `useTheme.ts`, `settings.store.ts`, `preload.ts`, `electron/main.ts` |
| **M2: 应用外壳 & 共享组件** | App.vue 漂浮侧栏 + 6 个共享 UI 组件 | Day 2~3 | `App.vue`, `GlassCard.vue`, `PillBadge.vue`, `SegmentedControl.vue`, `EmptyState.vue`, `HotkeyDisplay.vue`, `ThemeSwitch.vue` |
| **M3: 视图改造 (Batch 1)** | SvgViewer + ImageCompress 改造 | Day 3~4 | `SvgViewer.vue`, `ImageCompress.vue` |
| **M4: 视图改造 (Batch 2)** | FormatConvert + DocConvertView 改造 | Day 4~5 | `FormatConvert.vue`, `DocConvertView.vue` |
| **M5: 视图改造 (Batch 3)** | ClickerView + ImageWatermark 改造 | Day 5~6 | `ClickerView.vue`, `ImageWatermark.vue` |
| **M6: 集成验收** | 全链路 Light/Dark 验收 + 修缺补漏 | Day 6~7 | 全站可交付版本 |

---

## 工时估算

### 总览

| 阶段 | 任务 | 预计工时 | 缓冲 | 合计 |
|------|------|----------|------|------|
| M1 设计基建 | Token 重写 + CSS 新增 + Naive UI 覆写 | 3h | 0.5h | 3.5h |
| M1 主题运行时 | useTheme 重构 + settings.store 扩展 + preload 防闪烁 | 2h | 0.5h | 2.5h |
| M1 无边框窗口 | electron/main.ts 改造 + 拖拽区域 | 1h | 0.5h | 1.5h |
| M2 App.vue 重构 | 漂浮侧栏 + 光效背景 + 菜单 + 过渡动画 | 3h | 0.5h | 3.5h |
| M2 共享组件 | 6 个 UI 原子组件开发 | 4h | 1h | 5h |
| M3 SvgViewer | 药丸搜索栏 + SegmentedControl + Hover 卡片 | 3h | 0.5h | 3.5h |
| M3 ImageCompress | 不对称布局 + 滑块 + EmptyState + 拖拽区 | 3h | 0.5h | 3.5h |
| M4 FormatConvert | 联排选择器 + PillBadge 队列 + 拖拽区 | 2.5h | 0.5h | 3h |
| M4 DocConvertView | 复用 FormatConvert 方案 + 适配 | 2h | 0.5h | 2.5h |
| M5 ClickerView | 卡片重组 + SegmentedControl + HotkeyDisplay | 2.5h | 0.5h | 3h |
| M5 ImageWatermark | GlassCard 参数面板 + 预览区 | 2h | 0.5h | 2.5h |
| M6 集成验收 | 全站 Light/Dark 联调 + 修缺 | 3h | 1h | 4h |
| **合计** | | **31h** | **7h** | **38h** |

### 各阶段任务细分

#### M1: 设计系统 & 基建 (7.5h)

| # | 任务 | 涉及文件 | 工时 |
|---|------|----------|------|
| 1.1 | 重写 `variables.css` — 颜色/几何/阴影/毛玻璃/动画 Token | `src/styles/variables.css` | 1h |
| 1.2 | 新建 `glassmorphism.css` — 光效背景 + 毛玻璃卡片 + 侧栏材质 | `src/styles/glassmorphism.css` | 0.5h |
| 1.3 | 新建 `micro-interactions.css` — btn-glow / focus-ring / hover-lift | `src/styles/micro-interactions.css` | 0.5h |
| 1.4 | 重构 `transitions.css` — page-fade-up / 列表动画升级 | `src/styles/transitions.css` | 0.5h |
| 1.5 | 新建 `naiveThemeOverrides.ts` — Light/Dark 双覆写对象 | `src/theme/naiveThemeOverrides.ts` | 0.5h |
| 1.6 | 更新 `main.ts` — 导入新样式文件 | `src/main.ts` | 0.1h |
| 1.7 | 重构 `useTheme.ts` — 三态切换 + 系统跟随 + mediaQuery 监听 | `src/composables/useTheme.ts` | 1h |
| 1.8 | 扩展 `settings.store.ts` — theme 类型 'system' + 初始化逻辑 | `src/stores/settings.store.ts` | 0.5h |
| 1.9 | 重构 `preload.ts` — 同步主题预读注入 data-theme | `electron/preload.ts` | 0.5h |
| 1.10 | 重构 `electron/main.ts` — frame:false + 动态 backgroundColor | `electron/main.ts` | 1h |
| 1.11 | M1 自测：Token 热切换 + 无边框窗口 + 深浅模式切换 | — | 1h |

#### M2: 应用外壳 & 共享组件 (8.5h)

| # | 任务 | 涉及文件 | 工时 |
|---|------|----------|------|
| 2.1 | App.vue — 替换 NLayoutSider 为自定义漂浮侧栏 + glass-sidebar | `src/App.vue` | 1h |
| 2.2 | App.vue — 渐变 Logo + 圆角活跃菜单项 | `src/App.vue` | 0.5h |
| 2.3 | App.vue — 光效背景 glass-bg + 页面过渡 page-fade-up | `src/App.vue` | 0.5h |
| 2.4 | App.vue — 接入 ThemeSwitch + naiveThemeOverrides | `src/App.vue` | 0.5h |
| 2.5 | App.vue — 顶部 drag 区域 + 窗口控制按钮适配 | `src/App.vue` | 0.5h |
| 2.6 | 新建 GlassCard.vue | `src/components/ui/GlassCard.vue` | 0.5h |
| 2.7 | 新建 PillBadge.vue | `src/components/ui/PillBadge.vue` | 0.5h |
| 2.8 | 新建 SegmentedControl.vue | `src/components/ui/SegmentedControl.vue` | 1h |
| 2.9 | 新建 EmptyState.vue | `src/components/ui/EmptyState.vue` | 0.5h |
| 2.10 | 新建 HotkeyDisplay.vue | `src/components/ui/HotkeyDisplay.vue` | 0.5h |
| 2.11 | 新建 ThemeSwitch.vue | `src/components/ui/ThemeSwitch.vue` | 1h |
| 2.12 | M2 自测：侧栏交互 + 共享组件独立渲染 + 深浅模式 | — | 1h |

#### M3: SvgViewer + ImageCompress (7h)

| # | 任务 | 涉及文件 | 工时 |
|---|------|----------|------|
| 3.1 | SvgViewer — 悬浮药丸搜索栏 | `src/views/SvgViewer.vue` | 1h |
| 3.2 | SvgViewer — SegmentedControl 布局切换器 | `src/views/SvgViewer.vue` | 0.5h |
| 3.3 | SvgViewer — Hover 染色卡片 + GlassCard 适配 | `src/views/SvgViewer.vue` | 1h |
| 3.4 | SvgViewer — 深色模式验证 | — | 0.5h |
| 3.5 | ImageCompress — 左右不对称布局重组 | `src/views/ImageCompress.vue` | 1h |
| 3.6 | ImageCompress — 高精度范围滑块 | `src/views/ImageCompress.vue` | 0.5h |
| 3.7 | ImageCompress — EmptyState + 全向拖拽吸附 | `src/views/ImageCompress.vue` | 1h |
| 3.8 | ImageCompress — 深色模式验证 | — | 0.5h |
| 3.9 | 组件适配：FileList / FileListItem / PreviewPanel | `src/components/*` | 0.5h |

#### M4: FormatConvert + DocConvertView (5.5h)

| # | 任务 | 涉及文件 | 工时 |
|---|------|----------|------|
| 4.1 | FormatConvert — 联排下拉选择器 + 融合箭头 UI | `src/views/FormatConvert.vue` | 1h |
| 4.2 | FormatConvert — 轻量拖拽区 + EmptyState | `src/views/FormatConvert.vue` | 0.5h |
| 4.3 | FormatConvert — PillBadge 文件队列 | `src/views/FormatConvert.vue` | 0.5h |
| 4.4 | FormatConvert — 深色模式验证 | — | 0.5h |
| 4.5 | DocConvertView — 复用 FormatConvert 方案 | `src/views/DocConvertView.vue` | 1h |
| 4.6 | DocConvertView — PillBadge 状态管理适配 | `src/views/DocConvertView.vue` | 0.5h |
| 4.7 | DocConvertView — 深色模式验证 | — | 0.5h |
| 4.8 | 组件适配：OutputDirPicker / Toolbar | `src/components/*` | 0.5h |

#### M5: ClickerView + ImageWatermark (5.5h)

| # | 任务 | 涉及文件 | 工时 |
|---|------|----------|------|
| 5.1 | ClickerView — 设置组 GlassCard 卡片重组 | `src/views/ClickerView.vue` | 1h |
| 5.2 | ClickerView — SegmentedControl 替代 Radio/Select | `src/views/ClickerView.vue` | 0.5h |
| 5.3 | ClickerView — HotkeyDisplay 键帽显示 | `src/views/ClickerView.vue` | 0.5h |
| 5.4 | ClickerView — 深色模式验证 | — | 0.5h |
| 5.5 | ImageWatermark — GlassCard 参数面板 | `src/views/ImageWatermark.vue` | 0.5h |
| 5.6 | ImageWatermark — 预览区毛玻璃背景 | `src/views/ImageWatermark.vue` | 0.5h |
| 5.7 | ImageWatermark — 深色模式验证 | — | 0.5h |
| 5.8 | 组件适配：WatermarkParams / WatermarkPreview / ExportPngDialog / PreviewModal | `src/components/*` | 1h |

#### M6: 集成验收 (4h)

| # | 任务 | 工时 |
|---|------|------|
| 6.1 | 全站 Light 模式逐页截图对比 | 1h |
| 6.2 | 全站 Dark 模式逐页截图对比 | 1h |
| 6.3 | 主题切换过渡丝滑度检查 | 0.5h |
| 6.4 | 无边框窗口拖拽/最大化/关闭功能测试 | 0.5h |
| 6.5 | 修复遗留缺陷 | 1h |

---

## 风险识别

| 风险 | 概率 | 影响 | 应对措施 |
|------|------|------|----------|
| `backdrop-filter: blur()` 在低端 GPU 上卡顿 | 中 | 中 | 检测 GPU 性能，降级为半透明实色背景；限制同时可见毛玻璃层数 ≤ 3 |
| 无边框窗口 `frame: false` 导致标准窗口行为丢失 | 中 | 高 | 自定义实现最小化/最大化/关闭按钮；测试 Windows 任务栏行为 |
| Naive UI 弹窗/下拉层 `themeOverrides` 未完全覆盖 | 高 | 中 | 逐组件检查 Popover / Modal / Select 下拉层样式；必要时使用 CSS 全局覆写 |
| 旧版 Windows (Win 7/8) 不支持 CSS `backdrop-filter` | 低 | 低 | Electron 30 已不支持 Win 7；Win 10+ 如 Chromium 内核可用则无问题 |
| `prefers-color-scheme` 在某些系统上不可检测 | 低 | 低 | 兜底默认浅色模式 |
| 大量 CSS 变量重命名导致视图改造遗漏 | 中 | 中 | 在 M1 完成后全局搜索旧 token 名确保无残留引用 |
| 共享组件 API 在视图改造阶段发现不合理需回改 | 中 | 中 | M2 完成后在 M3 首个视图中快速验证组件 API，尽早调整 |

---

## 依赖项

| 依赖 | 负责方 | 状态 | 阻塞 |
|------|--------|------|------|
| 需求规格说明书 | PM | ✅ 已就绪 | 否 |
| 产品设计 V1 | PM | ✅ 已就绪 | 否 |
| 架构设计 V1 | 开发 | ✅ 已就绪 | 否 |
| 设计概念原型 (`prototype_all_views.html`) | 设计 | ✅ 已就绪 | 否 |
| 现有功能逻辑稳定 (无并行开发冲突) | 开发 | ✅ 已就绪 | 否 |

> 本次重构为纯前端样式层改造，不新增 npm 依赖，不涉及后端 / 数据库变更，外部依赖为零。

---

## 迭代策略

```mermaid
flowchart LR
    M1["M1 设计基建<br/>Day 1~2"] --> M2["M2 外壳 & 组件<br/>Day 2~3"]
    M2 --> M3["M3 SVG + 压缩<br/>Day 3~4"]
    M3 --> M4["M4 格式 + 文档<br/>Day 4~5"]
    M4 --> M5["M5 连点 + 水印<br/>Day 5~6"]
    M5 --> M6["M6 集成验收<br/>Day 6~7"]

    style M1 fill:#667eea,color:#fff
    style M2 fill:#764ba2,color:#fff
    style M3 fill:#5c6bc0,color:#fff
    style M4 fill:#5c6bc0,color:#fff
    style M5 fill:#5c6bc0,color:#fff
    style M6 fill:#4caf50,color:#fff
```

**关键原则**：
1. **每个里程碑独立可验收** — 完成即可启动 Light/Dark 双模式自测
2. **基建先行** — M1 是所有后续工作的基础，必须严格验收再推进
3. **逐模块推进** — 每个视图改造后立即验证，避免缺陷积压
4. **不引入新依赖** — 零风险的依赖策略，出问题仅在 CSS/Vue 层排查

---

## 关联文档

- [需求规格说明书](./需求规格说明书.md)
- [产品设计 V1](./全站UI重构-产品设计-V1.md)
- [架构设计 V1](./全站UI重构-架构设计-V1.md)
- [需求澄清](./全站UI重构-澄清.md)
