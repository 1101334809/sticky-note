<script setup lang="ts">
/**
 * 格式转换视图 — 重构版
 *
 * 使用通用组件 FileList / Toolbar / OutputDirPicker
 * 状态管理通过 fileStore
 * T-018
 */
import { ref, inject, watch, type Ref } from 'vue'
import { NButton, NIcon, NSelect, NSwitch, NInputNumber, NTooltip, useMessage, useDialog } from 'naive-ui'
import { FolderOpenOutline, FolderOutline, LockClosedOutline, LockOpenOutline } from '@vicons/ionicons5'
import FileList from '../components/FileList.vue'
import Toolbar from '../components/Toolbar.vue'
import OutputDirPicker from '../components/OutputDirPicker.vue'
import { useFileStore } from '../stores/file.store'
import { useUndoStore } from '../stores/undo.store'
import { useSettingsStore } from '../stores/settings.store'

const message = useMessage()
const dialog = useDialog()
const fileStore = useFileStore()
const undoStore = useUndoStore()
const settingsStore = useSettingsStore()

const targetFormat = ref('webp')
const presetSize = ref('')
const lastOutputDir = ref<string | null>(null)
const customWidth = ref<number | null>(null)
const customHeight = ref<number | null>(null)
const lockRatio = ref(true)

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

// ====== 接收全局拖拽 ======
const imgExts = ['jpg', 'jpeg', 'png', 'webp', 'gif', 'avif', 'tiff', 'tif', 'bmp', 'ico', 'svg']
const droppedFiles = inject<Ref<string[]>>('droppedFiles', ref([]))

watch(droppedFiles, async (paths) => {
  if (!paths.length) return
  const imgPaths = paths.filter(p => imgExts.includes(p.split('.').pop()?.toLowerCase() || ''))
  if (imgPaths.length === 0) return
  const duplicateCount = await fileStore.addFilePaths(imgPaths)
  if (duplicateCount > 0) {
    message.info(`${duplicateCount} 个文件已存在，已跳过`)
  }
  message.success(`已通过拖拽添加 ${imgPaths.length - duplicateCount} 个文件`)
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
  undoStore.push({
    type: 'file:clear',
    description: `清空了 ${oldFiles.length} 个文件`,
    timestamp: Date.now(),
    undo: () => fileStore.addFiles(oldFiles),
    redo: () => fileStore.clearFiles(),
  })
}

// ====== 文件夹加载 (T-041) ======
async function selectFolder() {
  try {
    const folderPath = await window.ipcRenderer.invoke('dialog:openFolder')
    if (!folderPath) return
    // 递归读取文件夹中的图片
    const paths: string[] = await window.ipcRenderer.invoke('file:listImages', folderPath)
    if (!paths.length) {
      message.info('该文件夹中没有支持的图片文件')
      return
    }
    const duplicateCount = await fileStore.addFilePaths(paths)
    if (duplicateCount > 0) {
      message.info(`${duplicateCount} 个文件已存在，已跳过`)
    }
    message.success(`已从文件夹加载 ${paths.length - duplicateCount} 个文件`)
  } catch (e: any) {
    message.error('加载失败: ' + e.message)
  }
}

// ====== 宽高联动 (T-039) ======
function handleWidthChange(val: number | null) {
  customWidth.value = val
  if (val && lockRatio.value) {
    customHeight.value = val
  }
}

function handleHeightChange(val: number | null) {
  customHeight.value = val
  if (val && lockRatio.value) {
    customWidth.value = val
  }
}

// ====== 转换 ======
async function startConvert() {
  if (!fileStore.hasFiles) return

  // T-040: 格式兼容提示
  const sameFormatFiles = fileStore.files.filter(f => f.type.toLowerCase() === targetFormat.value.toLowerCase())
  if (sameFormatFiles.length > 0) {
    await new Promise<void>((resolve, reject) => {
      dialog.warning({
        title: '格式相同',
        content: `${sameFormatFiles.length} 个文件的源格式与目标格式相同（${targetFormat.value.toUpperCase()}），是否继续？`,
        positiveText: '继续转换',
        negativeText: '取消',
        onPositiveClick: () => resolve(),
        onNegativeClick: () => reject(new Error('cancelled')),
      })
    }).catch(() => { return })
  }

  fileStore.setProcessing(true)

  fileStore.files.forEach((_f, i) => {
    fileStore.updateFileStatus(i, { status: 'processing', progress: 0 })
  })

  const handler = (_event: any, result: any) => {
    fileStore.updateFileStatus(result.index, {
      status: result.status === 'success' ? 'success' : 'error',
      progress: 100,
      result: result.status === 'success' ? {
        outputPath: result.outputPath,
        outputSize: result.convertedSize,
        savedPercent: 0,
      } : undefined,
      error: result.error,
    })
  }
  window.ipcRenderer.on('convert:progress', handler)

  try {
    const outputDir = settingsStore.outputDir || undefined
    const results = await window.ipcRenderer.invoke('convert:start', {
      files: fileStore.files.map(f => f.path),
      targetFormat: targetFormat.value,
      size: presetSize.value ? parseInt(presetSize.value) : undefined,
      customWidth: customWidth.value || undefined,
      customHeight: customHeight.value || undefined,
      lockRatio: lockRatio.value,
      outputDir,
      keepOriginal: settingsStore.keepOriginalFile,
    })

    // 记录输出目录
    if (results?.length > 0 && results[0].outputPath) {
      const p = results[0].outputPath
      lastOutputDir.value = p.substring(0, p.lastIndexOf('\\')) || p.substring(0, p.lastIndexOf('/'))
    }

    const successCount = results.filter((r: any) => r.status === 'success').length
    const errorCount = results.filter((r: any) => r.status === 'error').length
    message.success(`转换完成！${successCount} 个文件已转为 ${targetFormat.value.toUpperCase()}`)
    if (errorCount > 0) message.warning(`${errorCount} 个文件处理失败`)
  } catch (e: any) {
    message.error('转换失败: ' + e.message)
  } finally {
    window.ipcRenderer.off('convert:progress', handler)
    fileStore.setProcessing(false)
  }
}

async function openOutputDir() {
  if (lastOutputDir.value) {
    await window.ipcRenderer.invoke('system:openPath', lastOutputDir.value)
  }
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
        <NButton @click="selectFolder" size="small">
          <template #icon><NIcon><FolderOutline /></NIcon></template>
          选择文件夹
        </NButton>

        <span style="color: var(--text-secondary); font-size: 0.85em">目标格式</span>
        <NSelect v-model:value="targetFormat" :options="formatOptions" size="small" style="width: 120px" />
        <NSelect v-model:value="presetSize" :options="sizeOptions" size="small" style="width: 150px" placeholder="尺寸预设" />

        <!-- 自定义宽高 T-039 -->
        <NTooltip>
          <template #trigger>
            <NInputNumber
              :value="customWidth"
              @update:value="handleWidthChange"
              size="small"
              placeholder="宽"
              style="width: 80px"
              :min="1"
              :max="4096"
            />
          </template>
          自定义宽度 (px)
        </NTooltip>
        <NButton size="tiny" quaternary @click="lockRatio = !lockRatio">
          <template #icon>
            <NIcon>
              <LockClosedOutline v-if="lockRatio" />
              <LockOpenOutline v-else />
            </NIcon>
          </template>
        </NButton>
        <NTooltip>
          <template #trigger>
            <NInputNumber
              :value="customHeight"
              @update:value="handleHeightChange"
              size="small"
              placeholder="高"
              style="width: 80px"
              :min="1"
              :max="4096"
            />
          </template>
          自定义高度 (px)
        </NTooltip>

        <span style="color: var(--text-secondary); font-size: 0.8em; margin-left: 8px">保留原文件</span>
        <NSwitch
          :value="settingsStore.keepOriginalFile"
          @update:value="settingsStore.setKeepOriginalFile"
          size="small"
        />

        <OutputDirPicker />
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
          @click="startConvert"
          :disabled="!fileStore.hasFiles || fileStore.isProcessing"
          :loading="fileStore.isProcessing"
        >
          🔄 开始转换
        </NButton>
      </template>
    </Toolbar>

    <!-- 内容区 -->
    <div style="flex: 1; overflow-y: auto; display: flex; flex-direction: column">
      <!-- 格式卡片 -->
      <div v-if="fileStore.hasFiles" style="display: grid; grid-template-columns: repeat(auto-fill, minmax(180px, 1fr)); gap: 12px; padding: 16px 16px 8px">
        <div
          v-for="card in formatCards"
          :key="card.key"
          @click="targetFormat = card.key"
          class="format-card"
          :class="{ active: targetFormat === card.key }"
        >
          <div style="color: var(--text-primary); font-size: 0.9em; font-weight: 600">{{ card.icon }} {{ card.title }}</div>
          <div style="color: var(--text-muted); font-size: 0.75em; margin-top: 4px">{{ card.desc }}</div>
        </div>
      </div>

      <!-- 文件列表 -->
      <FileList
        :files="fileStore.files"
        :show-progress="true"
        empty-icon="🔄"
        empty-text="点击选择图片文件"
        @remove="handleRemoveFile"
        @click-empty="selectFiles"
      >
        <template #emptyHint>
          <p style="color: var(--text-muted); font-size: 0.8em; margin-top: 8px">
            支持所有主流图片格式互转 · 批量处理
          </p>
        </template>
      </FileList>
    </div>
  </div>
</template>

<style scoped>
.format-card {
  padding: 14px;
  border-radius: 10px;
  cursor: pointer;
  border: 1px solid var(--border-light);
  background: var(--bg-card);
  transition: all 0.2s;
}
.format-card:hover {
  background: var(--bg-card-hover);
  border-color: var(--accent);
}
.format-card.active {
  border-color: var(--accent);
  background: var(--accent-light);
}
</style>
