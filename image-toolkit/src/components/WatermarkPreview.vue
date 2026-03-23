<script setup lang="ts">
/**
 * 水印实时预览组件 (Canvas)
 * T-012, T-017, T-019
 */
import { ref, watch, onMounted, nextTick } from 'vue'

export interface PreviewParams {
  type: 'text' | 'image'
  text: string
  fontSize: number
  color: string
  opacity: number
  rotation: number
  position: string
  positionX: number
  positionY: number
  tileMode: boolean
  tileSpacing: number
  scale: number
  watermarkImageEl: HTMLImageElement | null
}

const props = defineProps<{
  filePath: string | null
  params: PreviewParams
}>()

const emit = defineEmits<{
  'update:position': [x: number, y: number]
}>()

const canvasRef = ref<HTMLCanvasElement | null>(null)
const containerRef = ref<HTMLDivElement | null>(null)
const imageEl = ref<HTMLImageElement | null>(null)
const loading = ref(false)
const zoomLevel = ref(1)

// 加载源图片（通过 IPC 读取 base64 data URL）
function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise(async (resolve, reject) => {
    try {
      const dataUrl = await window.ipcRenderer.invoke('file:readImageBase64', src)
      const img = new Image()
      img.onload = () => resolve(img)
      img.onerror = reject
      img.src = dataUrl
    } catch (e) {
      reject(e)
    }
  })
}

// debounce
let debounceTimer: ReturnType<typeof setTimeout> | null = null

function debounceRender() {
  if (debounceTimer) clearTimeout(debounceTimer)
  debounceTimer = setTimeout(() => render(), 50)
}

// 监听参数变化
watch(() => props.params, debounceRender, { deep: true })

// 监听文件变化
watch(() => props.filePath, async (newPath) => {
  if (!newPath) {
    imageEl.value = null
    clearCanvas()
    return
  }
  loading.value = true
  try {
    imageEl.value = await loadImage(newPath)
    await nextTick()
    render()
  } catch {
    imageEl.value = null
    clearCanvas()
  } finally {
    loading.value = false
  }
})

function clearCanvas() {
  const canvas = canvasRef.value
  if (!canvas) return
  const ctx = canvas.getContext('2d')
  if (!ctx) return
  ctx.clearRect(0, 0, canvas.width, canvas.height)
}

function render() {
  const canvas = canvasRef.value
  const container = containerRef.value
  const img = imageEl.value
  if (!canvas || !container || !img) return

  const ctx = canvas.getContext('2d')
  if (!ctx) return

  // 适应容器大小
  const maxW = container.clientWidth || 500
  const maxH = container.clientHeight || 400
  const imgRatio = img.naturalWidth / img.naturalHeight
  const containerRatio = maxW / maxH

  let drawW: number, drawH: number
  if (imgRatio > containerRatio) {
    drawW = maxW
    drawH = maxW / imgRatio
  } else {
    drawH = maxH
    drawW = maxH * imgRatio
  }

  canvas.width = drawW
  canvas.height = drawH

  // 1. 绘制底图
  ctx.clearRect(0, 0, drawW, drawH)
  ctx.drawImage(img, 0, 0, drawW, drawH)

  // 2. 绘制水印层
  ctx.save()
  ctx.globalAlpha = props.params.opacity / 100

  if (props.params.tileMode) {
    // 平铺模式
    drawTiledWatermark(ctx, drawW, drawH)
  } else {
    // 单水印模式
    drawSingleWatermark(ctx, drawW, drawH)
  }

  ctx.restore()
}

function drawSingleWatermark(ctx: CanvasRenderingContext2D, cw: number, ch: number) {
  const { positionX, positionY, rotation } = props.params

  // 使用自由坐标
  const x = positionX * cw
  const y = positionY * ch

  ctx.save()
  ctx.translate(x, y)
  ctx.rotate((rotation * Math.PI) / 180)

  if (props.params.type === 'text') {
    drawTextWatermark(ctx, 0, 0)
  } else {
    drawImageWatermark(ctx, 0, 0, cw)
  }

  ctx.restore()
}

function drawTiledWatermark(ctx: CanvasRenderingContext2D, cw: number, ch: number) {
  const spacing = props.params.tileSpacing || 200
  // 缩放间距到预览尺寸
  const previewSpacing = spacing * (cw / 1000)

  const { rotation } = props.params

  for (let y = 0; y < ch; y += previewSpacing + 30) {
    for (let x = 0; x < cw; x += previewSpacing + 60) {
      ctx.save()
      ctx.translate(x, y)
      ctx.rotate((rotation * Math.PI) / 180)

      if (props.params.type === 'text') {
        drawTextWatermark(ctx, 0, 0)
      } else {
        drawImageWatermark(ctx, 0, 0, cw)
      }

      ctx.restore()
    }
  }
}

function drawTextWatermark(ctx: CanvasRenderingContext2D, x: number, y: number) {
  const { text, fontSize, color } = props.params
  if (!text) return

  const previewFontSize = Math.max(10, fontSize * 0.5)
  ctx.font = `${previewFontSize}px "Microsoft YaHei", sans-serif`
  ctx.fillStyle = color
  ctx.textAlign = 'center'
  ctx.textBaseline = 'middle'
  ctx.fillText(text, x, y)
}

function drawImageWatermark(ctx: CanvasRenderingContext2D, x: number, y: number, canvasWidth: number) {
  const wmImg = props.params.watermarkImageEl
  if (!wmImg) return

  const scale = props.params.scale / 100
  const wmW = canvasWidth * scale
  const wmH = wmW * (wmImg.naturalHeight / wmImg.naturalWidth)

  ctx.drawImage(wmImg, x - wmW / 2, y - wmH / 2, wmW, wmH)
}

// === 拖拽交互 ===
const isDragging = ref(false)

function handleMouseDown(e: MouseEvent) {
  if (props.params.tileMode || !imageEl.value) return
  isDragging.value = true
  updatePositionFromMouse(e)
}

function handleMouseMove(e: MouseEvent) {
  if (!isDragging.value) return
  updatePositionFromMouse(e)
}

function handleMouseUp() {
  isDragging.value = false
}

function updatePositionFromMouse(e: MouseEvent) {
  const canvas = canvasRef.value
  if (!canvas) return
  const rect = canvas.getBoundingClientRect()
  const scaleX = canvas.width / rect.width
  const scaleY = canvas.height / rect.height
  const x = (e.clientX - rect.left) * scaleX
  const y = (e.clientY - rect.top) * scaleY
  const px = Math.max(0, Math.min(1, x / canvas.width))
  const py = Math.max(0, Math.min(1, y / canvas.height))
  emit('update:position', px, py)
}

// 滚轮缩放
function handleWheel(e: WheelEvent) {
  e.preventDefault()
  const delta = e.deltaY > 0 ? -0.1 : 0.1
  zoomLevel.value = Math.max(0.5, Math.min(3, zoomLevel.value + delta))
}

onMounted(() => {
  if (props.filePath) {
    loadImage(props.filePath).then(img => {
      imageEl.value = img
      render()
    }).catch(() => {})
  }
})
</script>

<template>
  <div 
    class="watermark-preview" 
    ref="containerRef" 
    @wheel="handleWheel"
    @mouseup="handleMouseUp"
    @mouseleave="handleMouseUp"
  >
    <div v-if="loading" class="preview-loading">
      <span class="loading-spinner" />
    </div>
    <div v-else-if="!filePath" class="preview-empty">
      <div class="empty-icon-wrapper">
        <span style="font-size: 3.5em; opacity: 0.8">🎨</span>
      </div>
      <p class="empty-title">等待预览图片</p>
      <p class="empty-desc">在左侧选择图片即可实时预览水印效果</p>
    </div>
    <div class="canvas-wrapper" v-show="filePath && !loading">
      <canvas
        ref="canvasRef"
        :class="{ dragging: isDragging, draggable: !params.tileMode && !!imageEl }"
        :style="{ transform: `scale(${zoomLevel})`, transformOrigin: 'center center' }"
        @mousedown="handleMouseDown"
        @mousemove="handleMouseMove"
      />
    </div>
  </div>
</template>

<style scoped>
.watermark-preview {
  width: 100%;
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  overflow: hidden;
  background: var(--bg-body, #f0f2f5);
  border-radius: 8px;
  position: relative;
}
.canvas-wrapper {
  /* 经典的透明棋盘格背景 */
  background-image: 
    linear-gradient(45deg, #e0e0e0 25%, transparent 25%), 
    linear-gradient(-45deg, #e0e0e0 25%, transparent 25%), 
    linear-gradient(45deg, transparent 75%, #e0e0e0 75%), 
    linear-gradient(-45deg, transparent 75%, #e0e0e0 75%);
  background-size: 20px 20px;
  background-position: 0 0, 0 10px, 10px -10px, -10px 0px;
  background-color: #ffffff;
  display: flex;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.08);
}
canvas {
  max-width: 100%;
  max-height: 100%;
  transition: transform 0.15s ease;
}
canvas.draggable {
  cursor: grab;
}
canvas.dragging {
  cursor: grabbing;
}
.preview-empty {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 12px;
}
.empty-icon-wrapper {
  width: 80px;
  height: 80px;
  background: #ffffff;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  box-shadow: 0 4px 12px rgba(0,0,0,0.05);
  margin-bottom: 8px;
}
.empty-title {
  color: var(--text-primary);
  font-size: 15px;
  font-weight: 500;
  margin: 0;
}
.empty-desc {
  color: var(--text-secondary, #999);
  font-size: 13px;
  margin: 0;
}
.preview-loading {
  display: flex;
  align-items: center;
  justify-content: center;
}
.loading-spinner {
  width: 24px;
  height: 24px;
  border: 2px solid var(--border-color, #ddd);
  border-top-color: var(--accent, #18a058);
  border-radius: 50%;
  animation: spin 0.6s linear infinite;
}
@keyframes spin {
  to { transform: rotate(360deg); }
}
</style>
