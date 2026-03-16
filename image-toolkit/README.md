# 🧰 ImageKit — Electron 图片工具库

一站式图片处理工具，基于 Electron + Vue 3 + Naive UI 构建。

## ✨ 功能

### 🎨 SVG 批量查看

- 文件/文件夹双模式加载
- 宫格/列表视图切换
- 实时搜索过滤
- 批量改色（fill/stroke）
- PNG 多倍率导出（@1x @2x @3x）

### 📉 图片压缩

- 支持 JPEG / PNG / WebP / GIF / AVIF / TIFF
- 有损 / 无损 / 智能推荐三种模式
- 逐文件进度 + 压缩比统计
- 压缩前后大小对比

### 🔄 格式转换

- 全格式互转（JPEG ↔ PNG ↔ WebP ↔ AVIF ↔ TIFF ↔ BMP）
- 预设尺寸（Favicon 16/32、Icon 64/128/256、App Icon 512/1024）
- ICO 多尺寸生成
- 批量转换 + 进度追踪

## 🚀 通用体验

- 🖱️ **拖拽文件** — 拖入窗口自动分发到当前页面
- ⌨️ **快捷键** — `Ctrl+O` 打开文件 · `Ctrl+Shift+O` 打开文件夹
- 📋 **剪贴板** — `Ctrl+V` 直接粘贴图片
- 🌙 **暗色主题** — 全局 Naive UI 暗色模式

## 📦 技术栈

| 技术                 | 用途                  |
| -------------------- | --------------------- |
| Electron 30          | 桌面应用框架          |
| Vue 3 + TypeScript   | 前端框架              |
| Naive UI             | UI 组件库（暗色主题） |
| Sharp                | 图片处理引擎          |
| Vite + electron-vite | 构建工具              |
| Vue Router           | 路由管理              |

## 🛠️ 开发

```bash
# 安装依赖
npm install

# 启动开发
npm run dev

# 构建生产版本
npm run build
```

### 环境要求

- Node.js ≥ 20
- Windows / macOS / Linux

## 📁 项目结构

```
image-toolkit/
├── electron/
│   ├── main.ts              # 主进程
│   ├── preload.ts            # 预加载脚本
│   └── ipc/
│       ├── svg.handler.ts    # SVG 处理
│       ├── compress.handler.ts # 图片压缩
│       └── convert.handler.ts  # 格式转换
├── src/
│   ├── App.vue               # 根组件（布局+拖拽）
│   ├── main.ts               # Vue 入口
│   ├── composables/          # 组合式函数
│   └── views/
│       ├── SvgViewer.vue     # SVG 查看
│       ├── ImageCompress.vue # 图片压缩
│       └── FormatConvert.vue # 格式转换
└── docs/                     # 项目文档
```

## 📄 License

MIT
