<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted, provide } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import {
  NConfigProvider,
  NMessageProvider,
  NDialogProvider,
  NLayout,
  NLayoutSider,
  NMenu,
  NIcon,
  NButton,
  NTooltip,
  type MenuOption,
} from 'naive-ui'
import {
  ImagesOutline,
  ContractOutline,
  SwapHorizontalOutline,
  SunnyOutline,
  MoonOutline,
  HandLeftOutline,
} from '@vicons/ionicons5'
import { h } from 'vue'
import { useTheme } from './composables/useTheme'
import { useKeyboard } from './composables/useKeyboard'
import { useSettingsStore } from './stores/settings.store'

const router = useRouter()
const route = useRoute()

// ====== 设置初始化 ======
const settingsStore = useSettingsStore()
settingsStore.init()

// ====== 主题（使用 composable） ======
const { isDark, currentTheme, siderBg, logoBorder, toggleTheme, initFromSettings } = useTheme()
initFromSettings()

// ====== 全局快捷键 (T-045) ======
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
        // 文件夹 → 递归列出其中的图片文件
        try {
          const folderFiles: string[] = await window.ipcRenderer.invoke('file:listImages', info.path)
          allPaths.push(...folderFiles)
        } catch {
          // 读取失败，跳过
        }
      } else {
        allPaths.push(info.path)
      }
    }

    if (allPaths.length > 0) {
      droppedFiles.value = allPaths
    }
  } catch {
    // IPC 不可用时回退到原始路径
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

// 暴露给子组件
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
]

const activeKey = computed(() => route.path)

function handleMenuUpdate(key: string) {
  router.push(key)
}
</script>

<template>
  <NConfigProvider :theme="currentTheme">
    <NMessageProvider>
    <NDialogProvider>
      <NLayout has-sider style="height: 100vh">
        <!-- 侧栏 -->
        <NLayoutSider
          bordered
          :width="200"
          :collapsed-width="64"
          show-trigger
          collapse-mode="width"
          :style="{ background: siderBg }"
        >
          <!-- Logo -->
          <div :style="{ padding: '20px 16px', textAlign: 'center', borderBottom: '1px solid ' + logoBorder }">
            <span style="font-size: 1.4em">🧰</span>
            <span style="font-weight: 700; margin-left: 8px; background: var(--accent-gradient); -webkit-background-clip: text; -webkit-text-fill-color: transparent; font-size: 1.1em">Universal Toolkit</span>
          </div>

          <!-- 导航菜单 -->
          <NMenu
            :options="menuOptions"
            :value="activeKey"
            @update:value="handleMenuUpdate"
            :indent="20"
          />

          <!-- 主题切换 -->
          <div style="position: absolute; bottom: 16px; left: 0; right: 0; display: flex; justify-content: center">
            <NTooltip>
              <template #trigger>
                <NButton circle quaternary size="large" @click="toggleTheme">
                  <template #icon>
                    <NIcon :size="20">
                      <MoonOutline v-if="!isDark" />
                      <SunnyOutline v-else />
                    </NIcon>
                  </template>
                </NButton>
              </template>
              {{ isDark ? '切换到浅色模式' : '切换到深色模式' }}
            </NTooltip>
          </div>
        </NLayoutSider>

        <!-- 主内容区 -->
        <NLayout content-style="height: 100vh; overflow-y: auto; position: relative;">
          <!-- 拖拽遮罩 -->
          <Transition name="fade">
            <div
              v-if="isDragging"
              style="
                position: absolute; inset: 0; z-index: 100;
                background: var(--accent-light);
                backdrop-filter: blur(4px);
                display: flex; align-items: center; justify-content: center;
                border: 3px dashed var(--accent); border-radius: 8px; margin: 8px;
              "
            >
              <div style="text-align: center">
                <div style="font-size: 3em; margin-bottom: 8px">📥</div>
                <p style="color: var(--accent); font-size: 1.2em; font-weight: 600">松开鼠标放入文件</p>
              </div>
            </div>
          </Transition>

          <!-- 路由视图（带过渡动画） -->
          <router-view v-slot="{ Component }">
            <Transition name="page-slide" mode="out-in">
              <component :is="Component" />
            </Transition>
          </router-view>
        </NLayout>
      </NLayout>
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
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI',
               'PingFang SC', 'Hiragino Sans GB', 'Microsoft YaHei', sans-serif;
  color: var(--text-primary);
  background-color: var(--bg-page);
  transition: background-color 0.3s ease, color 0.3s ease;
}
/* 滚动条 */
::-webkit-scrollbar {
  width: 6px;
}
::-webkit-scrollbar-track {
  background: transparent;
}
::-webkit-scrollbar-thumb {
  background: var(--scrollbar-thumb);
  border-radius: 3px;
}
::-webkit-scrollbar-thumb:hover {
  background: var(--scrollbar-thumb-hover);
}
/* 页面过渡动画 */
.page-slide-enter-active,
.page-slide-leave-active {
  transition: opacity 0.15s ease, transform 0.15s ease;
}
.page-slide-enter-from {
  opacity: 0;
  transform: translateX(12px);
}
.page-slide-leave-to {
  opacity: 0;
  transform: translateX(-12px);
}
</style>
