<script setup lang="ts">
/**
 * 图片水印主页面 — 重构版
 * T-003, T-004, T-013, T-014, T-022, T-023, T-026, T-027, T-046, T-047, T-048
 */
import { ref, inject, watch, computed, onMounted, type Ref } from 'vue'
import {
  NButton, NIcon, useMessage, useDialog,
} from 'naive-ui'
import {
  FolderOpenOutline, WaterOutline, FolderOutline,
} from '@vicons/ionicons5'
import FileList from '../components/FileList.vue'
import Toolbar from '../components/Toolbar.vue'
import OutputDirPicker from '../components/OutputDirPicker.vue'
import WatermarkParams from '../components/WatermarkParams.vue'
import WatermarkPreview from '../components/WatermarkPreview.vue'
import GlassCard from '../components/ui/GlassCard.vue'
import EmptyState from '../components/ui/EmptyState.vue'
import { useFileStore } from '../stores/file.store'
import { useSettingsStore } from '../stores/settings.store'
import type { WatermarkSettings } from '../components/WatermarkParams.vue'

const message = useMessage()
const dialog = useDialog()
const fileStore = useFileStore()
const settingsStore = useSettingsStore()

// ====== 水印设置 ======
const defaultSettings: WatermarkSettings = {
  type: 'text',
  text: '',
  fontSize: 36,
  color: '#FFFFFF',
  opacity: 30,
  rotation: -30,
  position: 'bottom-right',
  positionX: 0.9,
  positionY: 0.9,
  tileMode: false,
  tileSpacing: 200,
  offsetX: 0,
  offsetY: 0,
  scale: 15,
  adaptive: false,
  outputSuffix: '_watermarked',
  watermarkPath: null,
}

const watermarkSettings = ref<WatermarkSettings>({ ...defaultSettings })

// 参数持久化 T-022, T-023
onMounted(async () => {
  try {
    const saved = await window.ipcRenderer.invoke('config:get', 'watermarkSettings')
    if (saved) {
      watermarkSettings.value = { ...defaultSettings, ...saved }
    }
  } catch {}
})

// 参数变化时自动保存
let saveTimer: ReturnType<typeof setTimeout> | null = null
watch(watermarkSettings, (val) => {
  if (saveTimer) clearTimeout(saveTimer)
  saveTimer = setTimeout(async () => {
    try {
      await window.ipcRenderer.invoke('config:set', 'watermarkSettings', val)
    } catch {}
  }, 1000)
}, { deep: true })

// ====== 文件操作 ======
const imgExts = ['jpg', 'jpeg', 'png', 'webp', 'avif', 'tiff', 'tif']
const droppedFiles = inject<Ref<string[]>>('droppedFiles', ref([]))

watch(droppedFiles, async (paths) => {
  if (!paths.length) return
  const imgPaths = paths.filter(p => imgExts.includes(p.split('.').pop()?.toLowerCase() || ''))
  if (imgPaths.length === 0) return
  const duplicateCount = await fileStore.addFilePaths(imgPaths)
  if (duplicateCount > 0) {
    message.info(`${duplicateCount} 个文件已存在，已跳过`)
  }
  if (imgPaths.length - duplicateCount > 0) {
    message.success(`已添加 ${imgPaths.length - duplicateCount} 个图片`)
  }
})

async function selectFiles() {
  try {
    const paths: string[] = await window.ipcRenderer.invoke('dialog:openFiles', {
      filters: [{ name: '图片', extensions: imgExts }],
      properties: ['openFile', 'multiSelections'],
    })
    if (!paths || paths.length === 0) return
    const duplicateCount = await fileStore.addFilePaths(paths)
    if (duplicateCount > 0) {
      message.info(`${duplicateCount} 个文件已存在，已跳过`)
    }
  } catch {}
}

// ====== 预览 ======
const selectedIndex = ref(0)
const selectedFilePath = computed(() => {
  const files = fileStore.files
  if (files.length === 0) return null
  const idx = Math.min(selectedIndex.value, files.length - 1)
  return files[idx]?.path || null
})

// 图片水印预览图片元素
const watermarkImageEl = ref<HTMLImageElement | null>(null)
watch(() => watermarkSettings.value.watermarkPath, async (newPath) => {
  if (!newPath) {
    watermarkImageEl.value = null
    return
  }
  try {
    const dataUrl = await window.ipcRenderer.invoke('file:readImageBase64', newPath)
    const img = new Image()
    img.onload = () => { watermarkImageEl.value = img }
    img.onerror = () => { watermarkImageEl.value = null }
    img.src = dataUrl
  } catch {
    watermarkImageEl.value = null
  }
})

const previewParams = computed(() => ({
  type: watermarkSettings.value.type,
  text: watermarkSettings.value.text,
  fontSize: watermarkSettings.value.fontSize,
  color: watermarkSettings.value.color,
  opacity: watermarkSettings.value.opacity,
  rotation: watermarkSettings.value.rotation,
  position: watermarkSettings.value.position,
  positionX: watermarkSettings.value.positionX,
  positionY: watermarkSettings.value.positionY,
  tileMode: watermarkSettings.value.tileMode,
  tileSpacing: watermarkSettings.value.tileSpacing,
  scale: watermarkSettings.value.scale,
  watermarkImageEl: watermarkImageEl.value,
}))

function onPreviewPositionUpdate(x: number, y: number) {
  watermarkSettings.value = { ...watermarkSettings.value, positionX: x, positionY: y, position: 'custom' }
}

// ====== 选择水印图片 ======
async function selectWatermarkImage() {
  try {
    const paths: string[] = await window.ipcRenderer.invoke('dialog:openFiles', {
      filters: [{ name: '图片', extensions: ['png', 'svg', 'webp', 'jpg', 'jpeg'] }],
      properties: ['openFile'],
    })
    if (paths && paths.length > 0) {
      watermarkSettings.value = { ...watermarkSettings.value, watermarkPath: paths[0] }
    }
  } catch {}
}

// ====== 批量处理 T-014 ======
const processing = ref(false)
const lastOutputDir = ref<string | null>(null)

async function startWatermark() {
  const files = fileStore.files
  if (files.length === 0) return

  // 验证
  if (watermarkSettings.value.type === 'text' && !watermarkSettings.value.text.trim()) {
    message.warning('请输入水印文字')
    return
  }
  if (watermarkSettings.value.type === 'image' && !watermarkSettings.value.watermarkPath) {
    message.warning('请选择水印图片')
    return
  }

  // 大图检测 T-024
  try {
    const checks = await window.ipcRenderer.invoke(
      'watermark:checkFileSize',
      files.map(f => f.path)
    )
    const largeFiles = checks.filter((c: any) => c.isLarge)

    if (largeFiles.length > 0) {
      const confirmed = await new Promise<boolean>((resolve) => {
        dialog.warning({
          title: '大图片警告',
          content: `有 ${largeFiles.length} 个文件较大（>50MB 或 >8000px），处理可能需要较长时间。是否继续？`,
          positiveText: '继续处理',
          negativeText: '跳过大文件',
          onPositiveClick: () => resolve(true),
          onNegativeClick: () => resolve(false),
          onClose: () => resolve(true),
        })
      })

      if (!confirmed) {
        // 跳过大文件
        const largePaths = new Set(largeFiles.map((c: any) => c.path))
        const filteredFiles = files.filter(f => !largePaths.has(f.path))
        if (filteredFiles.length === 0) {
          message.info('跳过所有大文件后没有可处理的图片')
          return
        }
      }
    }
  } catch {}

  processing.value = true

  // 监听进度
  const progressHandler = (_e: any, data: any) => {
    fileStore.updateFileStatus(data.index, {
      status: data.status === 'success' ? 'success' : 'error',
      progress: 100,
      error: data.status === 'error' ? data.error : undefined,
    })
  }
  window.ipcRenderer.on('watermark:progress', progressHandler)

  // 标记所有文件为处理中
  files.forEach((_, i) => fileStore.updateFileStatus(i, { status: 'processing', progress: 0 }))

  try {
    const results = await window.ipcRenderer.invoke('watermark:start', {
      files: files.map(f => f.path),
      watermarkOptions: {
        ...watermarkSettings.value,
        watermarkPath: watermarkSettings.value.watermarkPath || undefined,
      },
      outputDir: settingsStore.outputDir || undefined,
    })

    const successCount = results.filter((r: any) => r.status === 'success').length
    const errorCount = results.filter((r: any) => r.status === 'error').length

    if (errorCount === 0) {
      message.success(`水印添加完成！共处理 ${successCount} 个文件`)
    } else {
      message.warning(`处理完成：${successCount} 成功，${errorCount} 失败`)
    }

    if (results.length > 0 && results[0].outputPath) {
      const path = results[0].outputPath
      lastOutputDir.value = path.substring(0, path.lastIndexOf('\\'))
    }
  } catch (e: any) {
    message.error(`处理失败：${e.message}`)
  } finally {
    processing.value = false
    window.ipcRenderer.removeListener('watermark:progress', progressHandler)
  }
}

async function openOutputDir() {
  if (lastOutputDir.value) {
    try {
      await window.ipcRenderer.invoke('system:openPath', lastOutputDir.value)
    } catch {}
  }
}
</script>

<template>
  <div class="watermark-page">
    
    <!-- 全局防空状态，若没有文件整体显示拖拽区 T-046 -->
    <template v-if="fileStore.files.length === 0">
      <div style="height: 100%; display: flex; align-items: center; justify-content: center;">
        <EmptyState
          icon="🖼️"
          title="图片水印"
          description="添加文字或图片水印，保护你的作品，可支持单张或批量处理。支持拖拽。"
          style="width: 100%; max-width: 600px;"
        >
          <template #action>
            <div style="display: flex; gap: 12px; justify-content: center">
              <NButton @click="selectFiles" type="primary" size="large" class="btn-glow hover-lift">
                <template #icon><NIcon><FolderOpenOutline /></NIcon></template>
                打开图片
              </NButton>
            </div>
          </template>
        </EmptyState>
      </div>
    </template>

    <template v-else>
      <!-- 工具栏 -->
      <Toolbar
        :file-count="fileStore.fileCount"
        :is-processing="processing"
        @clear="fileStore.clearFiles()"
      >
        <template #left>
          <NButton @click="selectFiles" type="primary" size="small" class="hover-lift">
            <template #icon><NIcon><FolderOpenOutline /></NIcon></template>
            追加图片
          </NButton>
        </template>

        <template #right>
          <NButton
            v-if="lastOutputDir"
            size="small"
            @click="openOutputDir"
            class="hover-lift"
          >
            <template #icon><NIcon><FolderOutline /></NIcon></template>
            打开输出目录
          </NButton>

          <NButton
            size="small"
            type="primary"
            class="btn-glow"
            :loading="processing"
            :disabled="fileStore.files.length === 0 || processing"
            @click="startWatermark"
          >
            <template #icon><NIcon><WaterOutline /></NIcon></template>
            {{ processing ? '处理中...' : '开始添加水印' }}
          </NButton>
        </template>
      </Toolbar>

      <!-- 主内容区 -->
      <div class="main-content">
        <!-- 左侧：文件列表 -->
        <GlassCard class="file-panel" padding="0">
          <FileList
            :files="fileStore.files"
            :show-progress="true"
            @remove="(path: string) => fileStore.removeFile(path)"
          />
        </GlassCard>

        <!-- 中间：实时预览 -->
        <GlassCard class="preview-panel" padding="0">
          <WatermarkPreview
            :file-path="selectedFilePath"
            :params="previewParams"
            @update:position="onPreviewPositionUpdate"
          />
        </GlassCard>

        <!-- 右侧：参数面板 -->
        <GlassCard class="params-panel" padding="0">
          <div class="params-header">⚙️ 水印参数</div>
          <div class="params-scroll">
            <WatermarkParams
              v-model="watermarkSettings"
              @select-watermark-image="selectWatermarkImage"
            />
          </div>
          <div class="output-section">
            <OutputDirPicker />
          </div>
        </GlassCard>
      </div>
    </template>
  </div>
</template>

<style scoped>
.watermark-page {
  display: flex;
  flex-direction: column;
  height: 100%;
  padding: 16px;
  gap: 12px;
  box-sizing: border-box;
}

.main-content {
  display: flex;
  flex: 1;
  gap: 16px;
  min-height: 0;
}

.file-panel {
  width: 240px;
  min-width: 200px;
  flex-shrink: 0;
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

.preview-panel {
  flex: 1;
  min-width: 300px;
  overflow: hidden;
  display: flex;
  align-items: center;
  justify-content: center;
  position: relative;
}

.params-panel {
  width: 320px;
  min-width: 280px;
  flex-shrink: 0;
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

.params-header {
  padding: 14px 16px;
  font-weight: 600;
  font-size: 1.1em;
  color: var(--text-main);
  border-bottom: 1px solid var(--border-light);
  background: rgba(255, 255, 255, 0.3);
}
[data-theme="dark"] .params-header {
  background: rgba(0, 0, 0, 0.2);
}

.params-scroll {
  flex: 1;
  overflow-y: auto;
  padding: 16px;
}

.output-section {
  padding: 16px;
  border-top: 1px solid var(--border-light);
  background: rgba(255, 255, 255, 0.2);
}
[data-theme="dark"] .output-section {
  background: rgba(0, 0, 0, 0.1);
}
</style>
