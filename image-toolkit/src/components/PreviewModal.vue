<script setup lang="ts">
/**
 * PreviewModal — SVG 大图预览弹窗
 *
 * 功能：缩放（滚轮+按钮）、平移（拖拽）、标签页切换（预览|源代码）、背景切换、复制代码
 * T-022
 */
import { ref, computed, watch } from 'vue'
import { NModal, NButton, NIcon, NButtonGroup, NTooltip, NTabs, NTabPane, useMessage } from 'naive-ui'
import {
  AddOutline,
  RemoveOutline,
  CopyOutline,
} from '@vicons/ionicons5'

const props = defineProps<{
  visible: boolean
  svgContent: string
  fileName: string
}>()

const emit = defineEmits<{
  'update:visible': [value: boolean]
}>()

const message = useMessage()

// ====== 缩放/平移 ======
const scale = ref(1)
const translateX = ref(0)
const translateY = ref(0)
const isDragging = ref(false)
const dragStartX = ref(0)
const dragStartY = ref(0)

// ====== 标签页 ======
const activeTab = ref('preview')

// ====== 背景 ======
const bgMode = ref<'checker' | 'white' | 'dark'>('white')

const bgStyle = computed(() => {
  switch (bgMode.value) {
    case 'white': return { background: '#ffffff' }
    case 'dark': return { background: '#1a1a2e' }
    default: return {
      background: `
        linear-gradient(45deg, #e0e0e0 25%, transparent 25%),
        linear-gradient(-45deg, #e0e0e0 25%, transparent 25%),
        linear-gradient(45deg, transparent 75%, #e0e0e0 75%),
        linear-gradient(-45deg, transparent 75%, #e0e0e0 75%)
      `,
      backgroundSize: '20px 20px',
      backgroundPosition: '0 0, 0 10px, 10px -10px, -10px 0px',
    }
  }
})

const svgDataUri = computed(() =>
  'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(props.svgContent)
)

const transformStyle = computed(() =>
  `transform: scale(${scale.value}) translate(${translateX.value}px, ${translateY.value}px)`
)

// 重置
watch(() => props.visible, (v) => {
  if (v) {
    scale.value = 1
    translateX.value = 0
    translateY.value = 0
    activeTab.value = 'preview'
  }
})

function zoomIn() { scale.value = Math.min(scale.value * 1.3, 10) }
function zoomOut() { scale.value = Math.max(scale.value / 1.3, 0.1) }
function zoomFit() { scale.value = 1; translateX.value = 0; translateY.value = 0 }
function zoom100() { scale.value = 1 }
function zoom200() { scale.value = 2 }

function handleWheel(e: WheelEvent) {
  e.preventDefault()
  if (e.deltaY < 0) zoomIn()
  else zoomOut()
}

function handleMouseDown(e: MouseEvent) {
  isDragging.value = true
  dragStartX.value = e.clientX - translateX.value
  dragStartY.value = e.clientY - translateY.value
}

function handleMouseMove(e: MouseEvent) {
  if (!isDragging.value) return
  translateX.value = e.clientX - dragStartX.value
  translateY.value = e.clientY - dragStartY.value
}

function handleMouseUp() {
  isDragging.value = false
}

async function copyCode() {
  try {
    await navigator.clipboard.writeText(props.svgContent)
    message.success('SVG 代码已复制到剪贴板')
  } catch {
    message.error('复制失败')
  }
}

</script>

<template>
  <NModal
    :show="visible"
    @update:show="emit('update:visible', $event)"
    preset="card"
    :title="fileName"
    style="width: 80vw; max-width: 900px"
    :bordered="false"
    :closable="true"
    :mask-closable="true"
  >
    <!-- 工具栏 -->
    <div class="preview-toolbar">
      <!-- 缩放按钮 -->
      <NButtonGroup size="tiny">
        <NTooltip><template #trigger><NButton @click="zoomOut"><template #icon><NIcon><RemoveOutline /></NIcon></template></NButton></template>缩小</NTooltip>
        <NButton @click="zoom100" style="min-width: 48px; font-size: 0.75em">{{ Math.round(scale * 100) }}%</NButton>
        <NTooltip><template #trigger><NButton @click="zoomIn"><template #icon><NIcon><AddOutline /></NIcon></template></NButton></template>放大</NTooltip>
      </NButtonGroup>

      <NTooltip><template #trigger><NButton size="tiny" @click="zoomFit">适应</NButton></template>重置缩放和位置</NTooltip>
      <NButton size="tiny" @click="zoom200">200%</NButton>

      <div style="flex: 1" />

      <!-- 背景切换 -->
      <span style="color: var(--text-muted); font-size: 0.75em; margin-right: 4px">背景</span>
      <NButtonGroup size="tiny">
        <NButton :type="bgMode === 'checker' ? 'primary' : 'default'" @click="bgMode = 'checker'">棋盘格</NButton>
        <NButton :type="bgMode === 'white' ? 'primary' : 'default'" @click="bgMode = 'white'">白色</NButton>
        <NButton :type="bgMode === 'dark' ? 'primary' : 'default'" @click="bgMode = 'dark'">深色</NButton>
      </NButtonGroup>
    </div>

    <!-- 内容 -->
    <NTabs v-model:value="activeTab" type="segment" size="small" style="margin-top: 8px">
      <!-- 预览标签页 -->
      <NTabPane name="preview" tab="🖼️ 预览">
        <div
          class="preview-area"
          :style="bgStyle"
          @wheel.prevent="handleWheel"
          @mousedown="handleMouseDown"
          @mousemove="handleMouseMove"
          @mouseup="handleMouseUp"
          @mouseleave="handleMouseUp"
        >
          <img
            :src="svgDataUri"
            :style="transformStyle"
            class="preview-img"
            draggable="false"
          />
        </div>
      </NTabPane>

      <!-- 源代码标签页 -->
      <NTabPane name="code" tab="📝 源代码">
        <div class="code-area">
          <div class="code-toolbar">
            <NButton size="tiny" @click="copyCode">
              <template #icon><NIcon><CopyOutline /></NIcon></template>
              复制代码
            </NButton>
          </div>
          <pre class="code-block">{{ svgContent }}</pre>
        </div>
      </NTabPane>
    </NTabs>
  </NModal>
</template>

<style scoped>
.preview-toolbar {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 4px 0;
}

.preview-area {
  width: 100%;
  height: 400px;
  border-radius: 8px;
  overflow: hidden;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: grab;
  user-select: none;
}
.preview-area:active {
  cursor: grabbing;
}

.preview-img {
  max-width: 80%;
  max-height: 80%;
  transition: transform 0.1s ease;
}

.code-area {
  position: relative;
}
.code-toolbar {
  position: absolute;
  top: 8px;
  right: 8px;
  z-index: 1;
}
.code-block {
  background: var(--bg-card);
  border: 1px solid var(--border-light);
  border-radius: 8px;
  padding: 16px;
  max-height: 400px;
  overflow: auto;
  font-size: 0.8em;
  line-height: 1.6;
  color: var(--text-primary);
  white-space: pre-wrap;
  word-break: break-all;
  font-family: 'Fira Code', 'Consolas', monospace;
}
</style>
