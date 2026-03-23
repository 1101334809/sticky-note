<script setup lang="ts">
/**
 * 图片水印主页面
 * T-003, T-004, T-013, T-014, T-022, T-023, T-026, T-027
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
    <!-- 工具栏 -->
    <Toolbar
      :file-count="fileStore.fileCount"
      :is-processing="processing"
      @clear="fileStore.clearFiles()"
    >
      <template #left>
        <NButton @click="selectFiles" type="primary" size="small">
          <template #icon><NIcon><FolderOpenOutline /></NIcon></template>
          选择图片
        </NButton>
      </template>

      <template #right>
        <NButton
          v-if="lastOutputDir"
          size="small"
          @click="openOutputDir"
        >
          <template #icon><NIcon><FolderOutline /></NIcon></template>
          打开输出目录
        </NButton>

        <NButton
          size="small"
          type="primary"
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
      <div class="file-panel">
        <FileList
          :files="fileStore.files"
          :show-progress="true"
          empty-icon="🎨"
          empty-text="拖拽或选择图片"
          @remove="(path: string) => fileStore.removeFile(path)"
          @click-empty="selectFiles"
        />
      </div>

      <!-- 中间：实时预览 -->
      <div class="preview-panel">
        <template v-if="fileStore.files.length === 0">
          <!-- 空状态 T-026 -->
          <div class="empty-state" @click="selectFiles">
            <div class="empty-state-icon">
              <NIcon size="64" color="var(--text-secondary)"><FolderOpenOutline /></NIcon>
            </div>
            <p class="empty-state-title">点击选择图片，或拖拽到这里</p>
            <p class="empty-state-desc">
              支持 JPEG / PNG / WebP / AVIF / TIFF<br>
              添加文字或图片水印，保护你的作品
            </p>
          </div>
        </template>
        <template v-else>
          <WatermarkPreview
            :file-path="selectedFilePath"
            :params="previewParams"
            @update:position="onPreviewPositionUpdate"
          />
        </template>
      </div>

      <!-- 右侧：参数面板 -->
      <div class="params-panel">
        <div class="params-header">⚙️ 水印参数</div>
        <WatermarkParams
          v-model="watermarkSettings"
          @select-watermark-image="selectWatermarkImage"
        />
        <div class="output-section">
          <OutputDirPicker />
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.watermark-page {
  display: flex;
  flex-direction: column;
  height: 100%;
  padding: 16px;
  gap: 12px;
}

.main-content {
  display: flex;
  flex: 1;
  gap: 12px;
  min-height: 0;
}

.file-panel {
  width: 220px;
  min-width: 180px;
  flex-shrink: 0;
  overflow-y: auto;
  border-radius: 8px;
  background: var(--bg-card, #fff);
  box-shadow: 0 4px 16px rgba(0,0,0,0.04);
}

.preview-panel {
  flex: 1;
  min-width: 300px;
  border-radius: 8px;
  overflow: hidden;
  background: var(--bg-body, #f4f5f7);
  box-shadow: inset 0 2px 8px rgba(0,0,0,0.02);
  display: flex;
  align-items: center;
  justify-content: center;
}

.params-panel {
  width: 280px;
  min-width: 240px;
  flex-shrink: 0;
  overflow-y: auto;
  border-radius: 8px;
  background: var(--bg-card, #fff);
  box-shadow: 0 4px 16px rgba(0,0,0,0.04);
  display: flex;
  flex-direction: column;
}

.params-header {
  padding: 10px 12px;
  font-weight: 600;
  font-size: 14px;
  border-bottom: 1px solid var(--border-color, #eee);
}

.output-section {
  padding: 12px;
  border-top: 1px solid var(--border-color, #eee);
  margin-top: auto;
}

.empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  padding: 40px;
  text-align: center;
  transition: all 0.2s;
  width: 100%;
  height: 100%;
}
.empty-state-icon {
  width: 96px;
  height: 96px;
  border-radius: 50%;
  background: #fff;
  display: flex;
  align-items: center;
  justify-content: center;
  box-shadow: 0 8px 24px rgba(0,0,0,0.06);
  margin-bottom: 24px;
  transition: transform 0.2s, box-shadow 0.2s;
}
.empty-state:hover .empty-state-icon {
  transform: translateY(-4px);
  box-shadow: 0 12px 32px rgba(24, 160, 88, 0.15);
}
.empty-state-title {
  font-weight: 500;
  font-size: 16px;
  color: var(--text-primary);
  margin: 0 0 12px 0;
}
.empty-state-desc {
  font-size: 13px;
  color: var(--text-secondary);
  line-height: 1.6;
  margin: 0;
}
</style>
