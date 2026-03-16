<script setup lang="ts">
import { ref, inject, watch, type Ref } from 'vue'
import {
  NButton, NIcon, NSelect, NTag,
  useMessage,
} from 'naive-ui'
import { FolderOpenOutline } from '@vicons/ionicons5'

interface FileItem {
  name: string
  path: string
  size: number
  status: 'pending' | 'processing' | 'done' | 'error'
  newName?: string
  convertedSize?: number
  error?: string
}

const message = useMessage()
const files = ref<FileItem[]>([])
const isLoaded = ref(false)
const isProcessing = ref(false)

// 接收全局拖拽文件
const imgExts = ['jpg', 'jpeg', 'png', 'webp', 'gif', 'avif', 'tiff', 'tif', 'bmp', 'ico', 'svg']
const droppedFiles = inject<Ref<string[]>>('droppedFiles', ref([]))
watch(droppedFiles, async (paths) => {
  if (!paths.length) return
  const imgPaths = paths.filter(p => imgExts.includes(p.split('.').pop()?.toLowerCase() || ''))
  if (imgPaths.length === 0) return
  const fileInfos: any[] = await window.ipcRenderer.invoke('file:getInfo', imgPaths)
  files.value = [...files.value, ...fileInfos.map((f: any) => ({
    name: f.name, path: f.path, size: f.size, status: 'pending' as const,
  }))]
  isLoaded.value = true
  message.success(`已通过拖拽添加 ${imgPaths.length} 个文件`)
})
const targetFormat = ref('webp')
const presetSize = ref('')

const formatOptions = [
  { label: 'WebP', value: 'webp' },
  { label: 'PNG', value: 'png' },
  { label: 'JPEG', value: 'jpeg' },
  { label: 'AVIF', value: 'avif' },
  { label: 'BMP', value: 'bmp' },
  { label: 'ICO', value: 'ico' },
  { label: 'TIFF', value: 'tiff' },
]

const sizeOptions = [
  { label: '保持原尺寸', value: '' },
  { label: 'Favicon 16×16', value: '16' },
  { label: 'Favicon 32×32', value: '32' },
  { label: 'Icon 64×64', value: '64' },
  { label: 'Icon 128×128', value: '128' },
  { label: 'Icon 256×256', value: '256' },
  { label: 'App Icon 512×512', value: '512' },
  { label: 'App Icon 1024×1024', value: '1024' },
]

const formatCards = [
  { key: 'webp', icon: '📄', title: 'WebP', desc: '高压缩率，现代Web首选' },
  { key: 'png', icon: '🖼️', title: 'PNG', desc: '无损透明，适合图标' },
  { key: 'jpeg', icon: '📸', title: 'JPEG', desc: '照片首选，兼容性最佳' },
  { key: 'avif', icon: '⚡', title: 'AVIF', desc: '新一代格式，极致压缩' },
  { key: 'ico', icon: '🎯', title: 'ICO', desc: '图标格式，多尺寸嵌入' },
  { key: 'tiff', icon: '🎞️', title: 'TIFF', desc: '高质量，印刷用途' },
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
      filters: [{ name: '图片', extensions: ['jpg', 'jpeg', 'png', 'webp', 'gif', 'avif', 'tiff', 'tif', 'bmp', 'ico', 'svg'] }],
      properties: ['openFile', 'multiSelections'],
    })
    if (!paths.length) return

    const fileInfos: any[] = await window.ipcRenderer.invoke('file:getInfo', paths)
    files.value = fileInfos.map((f: any) => ({
      name: f.name,
      path: f.path,
      size: f.size,
      status: 'pending' as const,
    }))
    isLoaded.value = true
    message.success(`已添加 ${paths.length} 个文件`)
  } catch (e: any) {
    message.error('选择文件失败: ' + e.message)
  }
}

async function startConvert() {
  if (!files.value.length) return
  isProcessing.value = true
  files.value.forEach(f => f.status = 'processing')

  const handler = (_event: any, result: any) => {
    const file = files.value[result.index]
    if (!file) return
    if (result.status === 'success') {
      file.status = 'done'
      file.newName = result.fileName
      file.convertedSize = result.convertedSize
    } else {
      file.status = 'error'
      file.error = result.error
    }
  }
  window.ipcRenderer.on('convert:progress', handler)

  try {
    const results = await window.ipcRenderer.invoke('convert:start', {
      files: files.value.map(f => f.path),
      targetFormat: targetFormat.value,
      size: presetSize.value ? parseInt(presetSize.value) : undefined,
    })

    const successCount = results.filter((r: any) => r.status === 'success').length
    const errorCount = results.filter((r: any) => r.status === 'error').length
    message.success(`转换完成！${successCount} 个文件已转为 ${targetFormat.value.toUpperCase()}`)
    if (errorCount > 0) message.warning(`${errorCount} 个文件处理失败`)
  } catch (e: any) {
    message.error('转换失败: ' + e.message)
  } finally {
    window.ipcRenderer.off('convert:progress', handler)
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

      <span style="color: rgba(255,255,255,0.5); font-size: 0.85em">目标格式</span>
      <NSelect v-model:value="targetFormat" :options="formatOptions" size="small" style="width: 120px" />
      <NSelect v-model:value="presetSize" :options="sizeOptions" size="small" style="width: 150px" placeholder="尺寸预设" />

      <div style="flex: 1" />

      <NButton size="small" type="primary" @click="startConvert" :disabled="!isLoaded || isProcessing" :loading="isProcessing">
        🔄 开始转换
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
          <div style="font-size: 3em; margin-bottom: 16px">🔄</div>
          <p style="color: rgba(255,255,255,0.5); font-size: 1.1em">点击选择图片文件</p>
          <p style="color: rgba(255,255,255,0.3); font-size: 0.85em; margin-top: 8px">支持所有主流图片格式互转 · 批量处理</p>
        </div>
      </div>

      <!-- 格式卡片 -->
      <div v-if="isLoaded" style="display: grid; grid-template-columns: repeat(auto-fill, minmax(180px, 1fr)); gap: 12px; margin-bottom: 16px">
        <div
          v-for="card in formatCards"
          :key="card.key"
          @click="targetFormat = card.key"
          :style="{
            padding: '14px',
            borderRadius: '10px',
            cursor: 'pointer',
            border: targetFormat === card.key ? '1px solid #667eea' : '1px solid rgba(255,255,255,0.06)',
            background: targetFormat === card.key ? 'rgba(102,126,234,0.08)' : 'rgba(255,255,255,0.03)',
            transition: 'all 0.2s',
          }"
        >
          <div style="color: #ddd; font-size: 0.9em; font-weight: 600">{{ card.icon }} {{ card.title }}</div>
          <div style="color: rgba(255,255,255,0.4); font-size: 0.75em; margin-top: 4px">{{ card.desc }}</div>
        </div>
      </div>

      <!-- 文件列表 -->
      <div v-if="isLoaded">
        <div
          v-for="file in files"
          :key="file.path"
          style="display: flex; align-items: center; gap: 12px; padding: 12px 16px; background: rgba(255,255,255,0.03); border-radius: 8px; margin-bottom: 8px"
        >
          <div style="width: 40px; height: 40px; border-radius: 6px; background: rgba(255,255,255,0.08); display: flex; align-items: center; justify-content: center; font-size: 1.2em; flex-shrink: 0">📄</div>
          <div style="flex: 1; min-width: 0">
            <div style="color: #ddd; font-size: 0.85em; overflow: hidden; text-overflow: ellipsis; white-space: nowrap">
              {{ file.status === 'done' && file.newName ? file.newName : file.name }}
            </div>
            <div style="color: rgba(255,255,255,0.35); font-size: 0.75em">
              {{ formatSize(file.size) }}
              <span v-if="file.convertedSize"> → {{ formatSize(file.convertedSize) }}</span>
            </div>
          </div>
          <div>
            <NTag v-if="file.status === 'pending'" size="small" type="info">待转换</NTag>
            <NTag v-else-if="file.status === 'processing'" size="small" type="warning">转换中…</NTag>
            <NTag v-else-if="file.status === 'done'" size="small" type="success">→ .{{ targetFormat }}</NTag>
            <NTag v-else size="small" type="error" :title="file.error">失败</NTag>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>
