<script setup lang="ts">
import { ref, inject, watch, type Ref } from 'vue'
import {
  NButton, NIcon, NSelect, NSlider,
  NTag, NCard, NGrid, NGridItem,
  useMessage,
} from 'naive-ui'
import { FolderOpenOutline } from '@vicons/ionicons5'

interface FileItem {
  name: string
  path: string
  size: number
  type: string
  status: 'pending' | 'processing' | 'done' | 'error'
  savedPercent?: number
  compressedSize?: number
  outputPath?: string
  error?: string
}

const message = useMessage()
const files = ref<FileItem[]>([])
const isLoaded = ref(false)
const isProcessing = ref(false)

// 接收全局拖拽的图片文件
const imgExts = ['jpg', 'jpeg', 'png', 'webp', 'gif', 'avif', 'tiff', 'tif']
const droppedFiles = inject<Ref<string[]>>('droppedFiles', ref([]))
watch(droppedFiles, async (paths) => {
  if (!paths.length) return
  const imgPaths = paths.filter(p => imgExts.includes(p.split('.').pop()?.toLowerCase() || ''))
  if (imgPaths.length === 0) return
  const fileInfos: any[] = await window.ipcRenderer.invoke('file:getInfo', imgPaths)
  files.value = [...files.value, ...fileInfos.map((f: any) => ({
    name: f.name, path: f.path, size: f.size, type: f.type, status: 'pending' as const,
  }))]
  isLoaded.value = true
  message.success(`已通过拖拽添加 ${imgPaths.length} 个图片`)
})
const mode = ref('smart')
const quality = ref(80)
const showCompare = ref(false)
const compareOrigSize = ref(0)
const compareCompSize = ref(0)
const compareSavedPercent = ref(0)

const modeOptions = [
  { label: '🤖 智能推荐', value: 'smart' },
  { label: '📉 有损压缩', value: 'lossy' },
  { label: '🔒 无损压缩', value: 'lossless' },
]

function formatSize(bytes: number) {
  if (bytes === 0) return '—'
  if (bytes < 1024) return bytes + ' B'
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB'
  return (bytes / (1024 * 1024)).toFixed(1) + ' MB'
}

async function selectFiles() {
  try {
    const paths: string[] = await window.ipcRenderer.invoke('dialog:openFiles', {
      filters: [{ name: '图片', extensions: ['jpg', 'jpeg', 'png', 'webp', 'gif', 'avif', 'tiff', 'tif'] }],
      properties: ['openFile', 'multiSelections'],
    })
    if (!paths.length) return

    // 获取真实文件信息
    const fileInfos: any[] = await window.ipcRenderer.invoke('file:getInfo', paths)
    files.value = fileInfos.map((f: any) => ({
      name: f.name,
      path: f.path,
      size: f.size,
      type: f.type,
      status: 'pending' as const,
    }))
    isLoaded.value = true
    showCompare.value = false
    message.success(`已添加 ${paths.length} 个文件`)
  } catch (e: any) {
    message.error('选择文件失败: ' + e.message)
  }
}

async function startCompress() {
  if (!files.value.length) return
  isProcessing.value = true
  showCompare.value = false

  // 标记所有文件为处理中
  files.value.forEach(f => f.status = 'processing')

  // 监听逐文件进度
  const handler = (_event: any, result: any) => {
    const file = files.value[result.index]
    if (!file) return
    if (result.status === 'success') {
      file.status = 'done'
      file.savedPercent = result.savedPercent
      file.compressedSize = result.compressedSize
      file.outputPath = result.outputPath
    } else {
      file.status = 'error'
      file.error = result.error
    }
  }
  window.ipcRenderer.on('compress:progress', handler)

  try {
    const results = await window.ipcRenderer.invoke('compress:start', {
      files: files.value.map(f => f.path),
      mode: mode.value,
      quality: quality.value,
    })

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
    isProcessing.value = false
  }
}
</script>

<template>
  <div style="height: 100%; display: flex; flex-direction: column; overflow: hidden">
    <!-- 工具栏 -->
    <div style="padding: 16px 24px; display: flex; align-items: center; gap: 12px; border-bottom: 1px solid rgba(255,255,255,0.06); flex-shrink: 0">
      <NButton @click="selectFiles" type="primary" size="small">
        <template #icon><NIcon><FolderOpenOutline /></NIcon></template>
        选择图片
      </NButton>

      <NSelect v-model:value="mode" :options="modeOptions" size="small" style="width: 150px" />

      <span style="color: rgba(255,255,255,0.5); font-size: 0.85em; margin-left: 8px">质量</span>
      <NSlider v-model:value="quality" :min="1" :max="100" :step="1" style="width: 120px" :disabled="mode === 'lossless'" />
      <span style="color: #fff; font-size: 0.85em; min-width: 36px">{{ quality }}%</span>

      <div style="flex: 1" />

      <NButton size="small" type="primary" @click="startCompress" :disabled="!isLoaded || isProcessing" :loading="isProcessing">
        🚀 开始压缩
      </NButton>
    </div>

    <!-- 内容区 -->
    <div style="flex: 1; padding: 24px; overflow-y: auto">
      <!-- 空状态 -->
      <div v-if="!isLoaded" style="display: flex; align-items: center; justify-content: center; height: 100%">
        <div
          @click="selectFiles"
          style="border: 2px dashed rgba(102,126,234,0.3); border-radius: 16px; padding: 64px 48px; text-align: center; cursor: pointer; transition: all 0.3s"
          @mouseenter="($event.target as HTMLElement).style.borderColor = '#667eea'"
          @mouseleave="($event.target as HTMLElement).style.borderColor = 'rgba(102,126,234,0.3)'"
        >
          <div style="font-size: 3em; margin-bottom: 16px">🖼️</div>
          <p style="color: rgba(255,255,255,0.5); font-size: 1.1em">点击选择图片文件</p>
          <p style="color: rgba(255,255,255,0.3); font-size: 0.85em; margin-top: 8px">支持 JPEG / PNG / WebP / GIF / AVIF / TIFF</p>
        </div>
      </div>

      <!-- 文件列表 -->
      <div v-if="isLoaded">
        <div
          v-for="file in files"
          :key="file.path"
          style="display: flex; align-items: center; gap: 12px; padding: 12px 16px; background: rgba(255,255,255,0.03); border-radius: 8px; margin-bottom: 8px"
        >
          <div style="width: 40px; height: 40px; border-radius: 6px; background: rgba(255,255,255,0.08); display: flex; align-items: center; justify-content: center; font-size: 1.2em; flex-shrink: 0">🖼️</div>
          <div style="flex: 1; min-width: 0">
            <div style="color: #ddd; font-size: 0.85em; overflow: hidden; text-overflow: ellipsis; white-space: nowrap">{{ file.name }}</div>
            <div style="color: rgba(255,255,255,0.35); font-size: 0.75em">{{ file.type }} · {{ formatSize(file.size) }}</div>
          </div>
          <div style="text-align: right">
            <NTag v-if="file.status === 'pending'" size="small" type="info">待处理</NTag>
            <NTag v-else-if="file.status === 'processing'" size="small" type="warning">压缩中…</NTag>
            <div v-else-if="file.status === 'done'" style="text-align: right">
              <span style="color: #4caf50; font-size: 0.85em; font-weight: 600">-{{ file.savedPercent }}%</span>
              <div style="color: rgba(255,255,255,0.3); font-size: 0.7em">{{ formatSize(file.compressedSize || 0) }}</div>
            </div>
            <NTag v-else size="small" type="error">失败</NTag>
          </div>
        </div>
      </div>

      <!-- 汇总对比面板 -->
      <NCard v-if="showCompare" title="压缩汇总" style="margin-top: 16px" size="small">
        <NGrid :cols="2" :x-gap="16">
          <NGridItem style="text-align: center">
            <p style="color: rgba(255,255,255,0.5); font-size: 0.85em; margin-bottom: 8px">原始总大小</p>
            <div style="color: #fff; font-size: 1.5em; font-weight: 700">{{ formatSize(compareOrigSize) }}</div>
          </NGridItem>
          <NGridItem style="text-align: center">
            <p style="color: rgba(255,255,255,0.5); font-size: 0.85em; margin-bottom: 8px">压缩后总大小</p>
            <div style="color: #4caf50; font-size: 1.5em; font-weight: 700">{{ formatSize(compareCompSize) }}</div>
            <div style="color: #4caf50; font-size: 0.9em; margin-top: 4px">节省 {{ compareSavedPercent }}%</div>
          </NGridItem>
        </NGrid>
      </NCard>
    </div>
  </div>
</template>
