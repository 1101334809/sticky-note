<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted, provide } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import {
  NConfigProvider,
  NMessageProvider,
  NDialogProvider,
  NMenu,
  NIcon,
  type MenuOption,
} from 'naive-ui'
import {
  ImagesOutline,
  ContractOutline,
  SwapHorizontalOutline,
  HandLeftOutline,
  DocumentTextOutline,
  WaterOutline,
} from '@vicons/ionicons5'
import { h } from 'vue'
import { useTheme } from './composables/useTheme'
import { useKeyboard } from './composables/useKeyboard'
import { useSettingsStore } from './stores/settings.store'
import ThemeSwitch from './components/ui/ThemeSwitch.vue'
import WindowControls from './components/ui/WindowControls.vue'

const router = useRouter()
const route = useRoute()

// ====== 设置初始化 ======
const settingsStore = useSettingsStore()
settingsStore.init()

// ====== 主题（使用 composable） ======
const { isDark, currentTheme, currentThemeOverrides, themeMode, setThemeMode, initFromSettings } = useTheme()
initFromSettings()

// ====== 全局快捷键 ======
useKeyboard()

// ====== 全局拖拽分发 ======
const isDragging = ref(false)
const droppedFiles = ref<string[]>([])

function handleDragOver(e: DragEvent) {
  e.preventDefault()
  e.stopPropagation()
  isDragging.value = true
}

function handleDragLeave(e: DragEvent) {
  e.preventDefault()
  e.stopPropagation()
  if (!e.relatedTarget) isDragging.value = false
}

async function handleDrop(e: DragEvent) {
  e.preventDefault()
  e.stopPropagation()
  isDragging.value = false

  const files = e.dataTransfer?.files
  if (!files || files.length === 0) return

  const rawPaths: string[] = []
  for (let i = 0; i < files.length; i++) {
    const filePath = (files[i] as any).path
    if (filePath) rawPaths.push(filePath)
  }

  if (rawPaths.length === 0) return

  // 检测文件夹：通过 IPC 获取文件信息，若是文件夹则递归展开
  try {
    const allPaths: string[] = []
    const infos = await window.ipcRenderer.invoke('file:getInfo', rawPaths)

    for (const info of infos) {
      if (!info.exists) continue
      if (info.isDirectory) {
        try {
          const folderFiles: string[] = await window.ipcRenderer.invoke('file:listImages', info.path)
          allPaths.push(...folderFiles)
        } catch {
        }
      } else {
        allPaths.push(info.path)
      }
    }

    if (allPaths.length > 0) {
      droppedFiles.value = allPaths
    }
  } catch {
    droppedFiles.value = rawPaths
  }
}

onMounted(() => {
  document.addEventListener('dragover', handleDragOver)
  document.addEventListener('dragleave', handleDragLeave)
  document.addEventListener('drop', handleDrop)
})

onUnmounted(() => {
  document.removeEventListener('dragover', handleDragOver)
  document.removeEventListener('dragleave', handleDragLeave)
  document.removeEventListener('drop', handleDrop)
})

provide('droppedFiles', droppedFiles)
provide('isDragging', isDragging)
provide('isDark', isDark)

// ====== 菜单 ======
const menuOptions: MenuOption[] = [
  {
    label: 'SVG 查看',
    key: '/svg',
    icon: () => h(NIcon, null, { default: () => h(ImagesOutline) }),
  },
  {
    label: '图片压缩',
    key: '/compress',
    icon: () => h(NIcon, null, { default: () => h(ContractOutline) }),
  },
  {
    label: '格式转换',
    key: '/convert',
    icon: () => h(NIcon, null, { default: () => h(SwapHorizontalOutline) }),
  },
  {
    label: '连点器',
    key: '/clicker',
    icon: () => h(NIcon, null, { default: () => h(HandLeftOutline) }),
  },
  {
    label: '文档转换',
    key: '/doc-convert',
    icon: () => h(NIcon, null, { default: () => h(DocumentTextOutline) }),
  },
  {
    label: '图片水印',
    key: '/watermark',
    icon: () => h(NIcon, null, { default: () => h(WaterOutline) }),
  },
]

const activeKey = computed(() => route.path)

function handleMenuUpdate(key: string) {
  router.push(key)
}
</script>

<template>
  <NConfigProvider :theme="currentTheme" :theme-overrides="currentThemeOverrides">
    <NMessageProvider>
    <NDialogProvider>
      
      <!-- 顶部标题沉浸式拖拽区 & 控制按钮组 -->
      <div class="app-title-bar">
        <!-- 拖拽区 -->
        <div class="drag-region"></div>
        <!-- 无边框控制按钮 -->
        <WindowControls />
      </div>

      <div class="app-layout glass-bg">
        <!-- 漂浮侧边栏 -->
        <aside class="app-sidebar glass-sidebar">
          <!-- 渐变 Logo -->
          <div class="logo-area">
            <span class="logo-icon">🧰</span>
            <span class="logo-text">Universal Toolkit</span>
          </div>

          <!-- 导航菜单 -->
          <div class="menu-container">
            <NMenu
              :options="menuOptions"
              :value="activeKey"
              @update:value="handleMenuUpdate"
              :indent="24"
              class="rounded-menu"
            />
          </div>

          <!-- 底部主题切换器 -->
          <div class="theme-switch-container">
            <ThemeSwitch :model-value="themeMode" @update:model-value="setThemeMode" />
          </div>
        </aside>

        <!-- 主内容区 -->
        <main class="app-content">
          <!-- 拖拽遮罩 -->
          <Transition name="fade">
            <div v-if="isDragging" class="drag-overlay">
              <div class="drag-overlay-content">
                <div class="drag-icon">📥</div>
                <p>松开鼠标放入文件</p>
              </div>
            </div>
          </Transition>

          <!-- 路由视图（带过渡动画） -->
          <router-view v-slot="{ Component }">
            <Transition name="page-fade-up" mode="out-in">
              <component :is="Component" />
            </Transition>
          </router-view>
        </main>
      </div>

    </NDialogProvider>
    </NMessageProvider>
  </NConfigProvider>
</template>

<style>
* {
  margin: 0;
  padding: 0;
  box-sizing: border-box;
}
html, body, #app {
  height: 100%;
  overflow: hidden;
}
body {
  font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI',
               'PingFang SC', 'Hiragino Sans GB', 'Microsoft YaHei', sans-serif;
  color: var(--text-primary);
  background-color: var(--bg-body);
  transition: background-color var(--duration-normal) var(--ease-standard), 
              color var(--duration-normal) var(--ease-standard);
}
/* 滚动条 */
::-webkit-scrollbar {
  width: 6px;
  height: 6px;
}
::-webkit-scrollbar-track {
  background: transparent;
}
::-webkit-scrollbar-thumb {
  background: var(--scrollbar-thumb);
  border-radius: 999px;
}
::-webkit-scrollbar-thumb:hover {
  background: var(--scrollbar-thumb-hover);
}

/* ================= 布局样式 ================= */
.app-title-bar {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  height: 38px;
  display: flex;
  justify-content: space-between;
  z-index: 999;
}
.drag-region {
  flex: 1;
  -webkit-app-region: drag;
}

.app-layout {
  display: flex;
  height: 100%;
  padding-top: 38px; /* 留出控制栏高度 */
}

/* 侧边栏 */
.app-sidebar {
  width: 220px;
  display: flex;
  flex-direction: column;
  position: relative;
  z-index: 10;
}

.logo-area {
  padding: 24px 20px;
  display: flex;
  align-items: center;
  border-bottom: 1px solid var(--border-light);
}
.logo-icon {
  font-size: 1.6em;
  filter: drop-shadow(0 2px 4px rgba(0,0,0,0.1));
}
.logo-text {
  font-weight: 700;
  font-size: 1.15em;
  margin-left: 10px;
  background: var(--accent-gradient);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
}

.menu-container {
  flex: 1;
  padding: 16px 8px;
  overflow-y: auto;
}

/* 覆写菜单样式实现圆角气泡高亮 */
.rounded-menu .n-menu-item-content {
  border-radius: var(--radius-md) !important;
  margin-bottom: 4px;
}
.rounded-menu .n-menu-item-content--selected {
  background: var(--primary-light) !important;
}
.rounded-menu .n-menu-item-content--selected .n-menu-item-content-header,
.rounded-menu .n-menu-item-content--selected .n-menu-item-content__icon {
  color: var(--primary) !important;
  font-weight: 600;
}

.theme-switch-container {
  padding: 24px 16px;
  border-top: 1px solid var(--border-light);
}

/* 主内容区 */
.app-content {
  flex: 1;
  position: relative;
  overflow-y: auto;
  overflow-x: hidden;
  padding: 20px;
}

.drag-overlay {
  position: absolute;
  inset: 12px;
  z-index: 100;
  background: var(--primary-light);
  backdrop-filter: blur(4px);
  display: flex;
  align-items: center;
  justify-content: center;
  border: 3px dashed var(--primary);
  border-radius: var(--radius-xl);
}
.drag-overlay-content {
  text-align: center;
}
.drag-icon {
  font-size: 3.5em;
  margin-bottom: 12px;
}
.drag-overlay-content p {
  color: var(--primary);
  font-size: 1.25em;
  font-weight: 600;
}
</style>
