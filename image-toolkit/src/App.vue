<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted, provide } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import {
  NConfigProvider,
  NMessageProvider,
  NLayout,
  NLayoutSider,
  NMenu,
  NIcon,
  darkTheme,
  type MenuOption,
} from 'naive-ui'
import {
  ImagesOutline,
  ContractOutline,
  SwapHorizontalOutline,
} from '@vicons/ionicons5'
import { h } from 'vue'

const router = useRouter()
const route = useRoute()

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
  // 只在离开窗口时关闭
  if (!e.relatedTarget) isDragging.value = false
}

function handleDrop(e: DragEvent) {
  e.preventDefault()
  e.stopPropagation()
  isDragging.value = false

  const files = e.dataTransfer?.files
  if (!files || files.length === 0) return

  const paths: string[] = []
  for (let i = 0; i < files.length; i++) {
    const filePath = (files[i] as any).path
    if (filePath) paths.push(filePath)
  }

  if (paths.length > 0) {
    droppedFiles.value = paths
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
]

const activeKey = computed(() => route.path)

function handleMenuUpdate(key: string) {
  router.push(key)
}
</script>

<template>
  <NConfigProvider :theme="darkTheme">
    <NMessageProvider>
      <NLayout has-sider style="height: 100vh">
        <!-- 侧栏 -->
        <NLayoutSider
          bordered
          :width="200"
          :collapsed-width="64"
          show-trigger
          collapse-mode="width"
          style="background: #18181c"
        >
          <!-- Logo -->
          <div style="padding: 20px 16px; text-align: center; border-bottom: 1px solid rgba(255,255,255,0.06)">
            <span style="font-size: 1.4em">🧰</span>
            <span style="font-weight: 700; margin-left: 8px; background: linear-gradient(135deg, #667eea, #764ba2); -webkit-background-clip: text; -webkit-text-fill-color: transparent; font-size: 1.1em">ImageKit</span>
          </div>

          <!-- 导航菜单 -->
          <NMenu
            :options="menuOptions"
            :value="activeKey"
            @update:value="handleMenuUpdate"
            :indent="20"
          />
        </NLayoutSider>

        <!-- 主内容区 -->
        <NLayout content-style="height: 100vh; overflow: hidden; position: relative;">
          <!-- 拖拽遮罩 -->
          <Transition name="fade">
            <div
              v-if="isDragging"
              style="
                position: absolute; inset: 0; z-index: 100;
                background: rgba(102,126,234,0.15);
                backdrop-filter: blur(4px);
                display: flex; align-items: center; justify-content: center;
                border: 3px dashed #667eea; border-radius: 8px; margin: 8px;
              "
            >
              <div style="text-align: center">
                <div style="font-size: 3em; margin-bottom: 8px">📥</div>
                <p style="color: #667eea; font-size: 1.2em; font-weight: 600">松开鼠标放入文件</p>
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
}
/* 滚动条 */
::-webkit-scrollbar {
  width: 6px;
}
::-webkit-scrollbar-track {
  background: transparent;
}
::-webkit-scrollbar-thumb {
  background: rgba(255,255,255,0.15);
  border-radius: 3px;
}
::-webkit-scrollbar-thumb:hover {
  background: rgba(255,255,255,0.25);
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
/* 拖拽遮罩动画 */
.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.2s ease;
}
.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}
</style>
