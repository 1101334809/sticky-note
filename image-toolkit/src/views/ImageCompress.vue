<script setup lang="ts">
/**
 * 图片压缩视图 — 重构版
 *
 * 使用通用组件 FileList / Toolbar / OutputDirPicker
 * 状态管理通过 fileStore
 * T-017
 */
import { ref, inject, watch, type Ref } from 'vue'
import { NButton, NIcon, NSelect, NSlider, NCard, NGrid, NGridItem, useMessage } from 'naive-ui'
import { FolderOpenOutline, FolderOutline } from '@vicons/ionicons5'
import FileList from '../components/FileList.vue'
import Toolbar from '../components/Toolbar.vue'
import OutputDirPicker from '../components/OutputDirPicker.vue'
import { useFileStore } from '../stores/file.store'
import { useUndoStore } from '../stores/undo.store'
import { useSettingsStore } from '../stores/settings.store'

const message = useMessage()
const fileStore = useFileStore()
const undoStore = useUndoStore()
const settingsStore = useSettingsStore()

// ====== 压缩参数 ======
const mode = ref('smart')
const quality = ref(80)
const showCompare = ref(false)
const compareOrigSize = ref(0)
const compareCompSize = ref(0)
const compareSavedPercent = ref(0)
const lastOutputDir = ref<string | null>(null)

const modeOptions = [
  { label: '🤖 智能推荐', value: 'smart' },
  { label: '📉 有损压缩', value: 'lossy' },
  { label: '🔒 无损压缩', value: 'lossless' },
]

// ====== 接收全局拖拽的图片文件 ======
const imgExts = ['jpg', 'jpeg', 'png', 'webp', 'gif', 'avif', 'tiff', 'tif']
const droppedFiles = inject<Ref<string[]>>('droppedFiles', ref([]))

watch(droppedFiles, async (paths) => {
  if (!paths.length) return
  const imgPaths = paths.filter(p => imgExts.includes(p.split('.').pop()?.toLowerCase() || ''))
  if (imgPaths.length === 0) return
  const duplicateCount = await fileStore.addFilePaths(imgPaths)
  if (duplicateCount > 0) {
    message.info(`${duplicateCount} 个文件已存在，已跳过`)
  }
  message.success(`已通过拖拽添加 ${imgPaths.length - duplicateCount} 个图片`)
})

// ====== 文件操作 ======
async function selectFiles() {
  try {
    const paths: string[] = await window.ipcRenderer.invoke('dialog:openFiles', {
      filters: [{ name: '图片', extensions: imgExts }],
      properties: ['openFile', 'multiSelections'],
    })
    if (!paths.length) return

    const duplicateCount = await fileStore.addFilePaths(paths)
    if (duplicateCount > 0) {
      message.info(`${duplicateCount} 个文件已存在，已跳过`)
    }
    showCompare.value = false
    message.success(`已添加 ${paths.length - duplicateCount} 个文件`)
  } catch (e: any) {
    message.error('选择文件失败: ' + e.message)
  }
}

function handleRemoveFile(path: string) {
  const removed = fileStore.removeFile(path)
  if (removed) {
    undoStore.push({
      type: 'file:remove',
      description: `移除了 ${removed.name}`,
      timestamp: Date.now(),
      undo: () => fileStore.addFiles([removed]),
      redo: () => fileStore.removeFile(path),
    })
  }
}

function handleClear() {
  const oldFiles = fileStore.clearFiles()
  showCompare.value = false
  undoStore.push({
    type: 'file:clear',
    description: `清空了 ${oldFiles.length} 个文件`,
    timestamp: Date.now(),
    undo: () => fileStore.addFiles(oldFiles),
    redo: () => fileStore.clearFiles(),
  })
}

// ====== 压缩 ======
async function startCompress() {
  if (!fileStore.hasFiles) return
  fileStore.setProcessing(true)
  showCompare.value = false

  // 标记所有文件为处理中
  fileStore.files.forEach((_f, i) => {
    fileStore.updateFileStatus(i, { status: 'processing', progress: 0 })
  })

  // 监听逐文件进度
  const handler = (_event: any, result: any) => {
    fileStore.updateFileStatus(result.index, {
      status: result.status === 'success' ? 'success' : 'error',
      progress: 100,
      result: result.status === 'success' ? {
        outputPath: result.outputPath,
        outputSize: result.compressedSize,
        savedPercent: result.savedPercent,
      } : undefined,
      error: result.error,
    })
  }
  window.ipcRenderer.on('compress:progress', handler)

  try {
    const outputDir = settingsStore.outputDir || undefined
    const results = await window.ipcRenderer.invoke('compress:start', {
      files: fileStore.files.map(f => f.path),
      mode: mode.value,
      quality: quality.value,
      outputDir,
    })

    // 记录输出目录
    if (results?.length > 0 && results[0].outputPath) {
      const p = results[0].outputPath
      lastOutputDir.value = p.substring(0, p.lastIndexOf('\\')) || p.substring(0, p.lastIndexOf('/'))
    }

    // 汇总统计
    const successResults = results.filter((r: any) => r.status === 'success')
    if (successResults.length > 0) {
      const totalOriginal = successResults.reduce((s: number, r: any) => s + r.originalSize, 0)
      const totalCompressed = successResults.reduce((s: number, r: any) => s + r.compressedSize, 0)
      compareOrigSize.value = totalOriginal
      compareCompSize.value = totalCompressed
      compareSavedPercent.value = Math.round((1 - totalCompressed / totalOriginal) * 100)
      showCompare.value = true
      message.success(`压缩完成！平均节省 ${compareSavedPercent.value}%`)
    }

    const errorCount = results.filter((r: any) => r.status === 'error').length
    if (errorCount > 0) {
      message.warning(`${errorCount} 个文件处理失败`)
    }
  } catch (e: any) {
    message.error('压缩失败: ' + e.message)
  } finally {
    window.ipcRenderer.off('compress:progress', handler)
    fileStore.setProcessing(false)
  }
}

async function openOutputDir() {
  if (lastOutputDir.value) {
    await window.ipcRenderer.invoke('system:openPath', lastOutputDir.value)
  }
}

function formatSize(bytes: number) {
  if (bytes === 0) return '—'
  if (bytes < 1024) return bytes + ' B'
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB'
  return (bytes / (1024 * 1024)).toFixed(1) + ' MB'
}
</script>

<template>
  <div style="height: 100%; display: flex; flex-direction: column; overflow: hidden">
    <!-- 工具栏 -->
    <Toolbar
      :file-count="fileStore.fileCount"
      :is-processing="fileStore.isProcessing"
      @clear="handleClear"
    >
      <template #left>
        <NButton @click="selectFiles" type="primary" size="small">
          <template #icon><NIcon><FolderOpenOutline /></NIcon></template>
          选择图片
        </NButton>

        <NSelect v-model:value="mode" :options="modeOptions" size="small" style="width: 150px" />

        <span style="color: var(--text-secondary); font-size: 0.85em; margin-left: 8px">质量</span>
        <NSlider v-model:value="quality" :min="1" :max="100" :step="1" style="width: 120px" :disabled="mode === 'lossless'" />
        <span style="color: var(--text-primary); font-size: 0.85em; min-width: 36px">{{ quality }}%</span>

        <OutputDirPicker />
      </template>

      <template #right>
        <NButton
          v-if="showCompare && lastOutputDir"
          size="small"
          @click="openOutputDir"
        >
          <template #icon><NIcon><FolderOutline /></NIcon></template>
          打开输出目录
        </NButton>

        <NButton
          size="small"
          type="primary"
          @click="startCompress"
          :disabled="!fileStore.hasFiles || fileStore.isProcessing"
          :loading="fileStore.isProcessing"
        >
          🚀 开始压缩
        </NButton>
      </template>
    </Toolbar>

    <!-- 文件列表 -->
    <FileList
      :files="fileStore.files"
      :show-progress="true"
      empty-icon="🖼️"
      empty-text="点击选择图片文件"
      @remove="handleRemoveFile"
      @click-empty="selectFiles"
    >
      <template #emptyHint>
        <p style="color: var(--text-muted); font-size: 0.8em; margin-top: 8px">
          支持 JPEG / PNG / WebP / GIF / AVIF / TIFF
        </p>
      </template>
    </FileList>

    <!-- 汇总对比面板 -->
    <NCard v-if="showCompare" title="压缩汇总" style="margin: 0 16px 16px; flex-shrink: 0" size="small">
      <NGrid :cols="2" :x-gap="16">
        <NGridItem style="text-align: center">
          <p style="color: var(--text-secondary); font-size: 0.85em; margin-bottom: 8px">原始总大小</p>
          <div style="color: var(--text-primary); font-size: 1.5em; font-weight: 700">{{ formatSize(compareOrigSize) }}</div>
        </NGridItem>
        <NGridItem style="text-align: center">
          <p style="color: var(--text-secondary); font-size: 0.85em; margin-bottom: 8px">压缩后总大小</p>
          <div style="color: var(--success); font-size: 1.5em; font-weight: 700">{{ formatSize(compareCompSize) }}</div>
          <div style="color: var(--success); font-size: 0.9em; margin-top: 4px">节省 {{ compareSavedPercent }}%</div>
        </NGridItem>
      </NGrid>
    </NCard>
  </div>
</template>
