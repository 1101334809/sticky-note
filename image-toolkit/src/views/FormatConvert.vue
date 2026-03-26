<script setup lang="ts">
/**
 * 格式转换视图 — 重构版
 *
 * T-035, T-036, T-037
 */
import { ref, inject, watch, type Ref } from 'vue'
import { NButton, NIcon, NSelect, NSwitch, NInputNumber, NTooltip, useMessage, useDialog } from 'naive-ui'
import { FolderOpenOutline, FolderOutline, LockClosedOutline, LockOpenOutline, ImagesOutline, SyncCircleOutline } from '@vicons/ionicons5'
import FileList from '../components/FileList.vue'
import OutputDirPicker from '../components/OutputDirPicker.vue'
import { useFileStore } from '../stores/file.store'
import { useUndoStore } from '../stores/undo.store'
import { useSettingsStore } from '../stores/settings.store'
import GlassCard from '../components/ui/GlassCard.vue'
import EmptyState from '../components/ui/EmptyState.vue'
import PillBadge from '../components/ui/PillBadge.vue'

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
  { key: 'webp', icon: '📄', title: 'WebP', desc: '高压缩率' },
  { key: 'png', icon: '🖼️', title: 'PNG', desc: '无损透明' },
  { key: 'jpeg', icon: '📸', title: 'JPEG', desc: '兼容最佳' },
  { key: 'avif', icon: '⚡', title: 'AVIF', desc: '极致压缩' },
  { key: 'ico', icon: '🎯', title: 'ICO', desc: '多尺寸图标' },
  { key: 'tiff', icon: '🎞️', title: 'TIFF', desc: '高质量印刷' },
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
  <div class="convert-view">
    <div class="layout-container">
      
      <!-- ================= 左侧 控制面板 ================= -->
      <div class="left-panel">
        <GlassCard radius="lg" padding="24px" class="control-card">
          <div class="panel-header">
            <NIcon size="24" class="header-icon"><SyncCircleOutline /></NIcon>
            <h2 class="header-title">格式转换</h2>
          </div>

          <!-- 目标格式联排选择器 T-035 -->
          <div class="form-group">
            <label class="form-label" style="display:flex; justify-content:space-between">
              <span>目标格式</span>
            </label>
            <div class="format-grid">
              <GlassCard
                v-for="card in formatCards"
                :key="card.key"
                hoverable
                radius="md"
                padding="12px"
                @click="targetFormat = card.key"
                class="format-card"
                :class="{ active: targetFormat === card.key }"
              >
                <div class="format-icon">{{ card.icon }}</div>
                <div class="format-info">
                  <div class="format-title">{{ card.title }}</div>
                  <div class="format-desc">{{ card.desc }}</div>
                </div>
              </GlassCard>
            </div>
          </div>

          <!-- 尺寸设置 -->
          <div class="form-group">
            <label class="form-label">调整尺寸配置</label>
            <NSelect v-model:value="presetSize" :options="sizeOptions" placeholder="常用应用图标预设" />
            <div class="custom-size-row">
              <NTooltip>
                <template #trigger>
                  <NInputNumber
                    :value="customWidth"
                    @update:value="handleWidthChange"
                    placeholder="W (px)"
                    :min="1" :max="4096"
                    style="flex: 1"
                  />
                </template>
                自定义宽度
              </NTooltip>
              <NButton quaternary circle @click="lockRatio = !lockRatio" class="lock-btn">
                <template #icon>
                  <NIcon :color="lockRatio ? 'var(--primary)' : 'var(--text-muted)'">
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
                    placeholder="H (px)"
                    :min="1" :max="4096"
                    style="flex: 1"
                  />
                </template>
                自定义高度
              </NTooltip>
            </div>
          </div>

          <!-- 输出目录 -->
          <div class="form-group">
            <label class="form-label">输出目录</label>
            <OutputDirPicker />
            <div style="margin-top: 12px; display: flex; align-items: center; justify-content: space-between">
              <span style="font-size: 0.85em; color: var(--text-secondary)">转换后保留原文件</span>
              <NSwitch :value="settingsStore.keepOriginalFile" @update:value="settingsStore.setKeepOriginalFile" size="small" />
            </div>
          </div>

          <div class="spacer"></div>

          <!-- 操作区 -->
          <div class="action-footer">
            <NButton
              v-if="lastOutputDir"
              block
              secondary
              @click="openOutputDir"
              style="margin-bottom: 12px;"
            >
              <template #icon><NIcon><FolderOutline /></NIcon></template>
              打开输出目录
            </NButton>

            <NButton
              type="primary"
              block
              size="large"
              class="btn-glow"
              @click="startConvert"
              :disabled="!fileStore.hasFiles || fileStore.isProcessing"
              :loading="fileStore.isProcessing"
            >
              <template #icon><NIcon><SyncCircleOutline /></NIcon></template>
              转换为 {{ targetFormat.toUpperCase() }}
            </NButton>
          </div>
        </GlassCard>
      </div>

      <!-- ================= 右侧 文件列表 ================= -->
      <div class="right-panel">
        <GlassCard radius="lg" padding="0" class="list-card" style="display: flex; flex-direction: column; overflow: hidden; height: 100%">
          
          <div class="list-header" v-if="fileStore.hasFiles">
            <div style="display: flex; align-items: center; gap: 8px">
              <div class="list-title">待处理文件 ({{ fileStore.fileCount }})</div>
              <!-- T-037 队列状态 -->
              <PillBadge v-if="fileStore.isProcessing" status="processing" label="转换中..." />
            </div>
            
            <div class="list-actions">
              <NButton text type="primary" size="small" @click="selectFiles" class="hover-lift">
                <template #icon><NIcon><ImagesOutline /></NIcon></template>
                添加文件
              </NButton>
              <NButton text type="primary" size="small" @click="selectFolder" style="margin-left: 12px" class="hover-lift">
                <template #icon><NIcon><FolderOpenOutline /></NIcon></template>
                添加文件夹
              </NButton>
              <NButton text type="error" size="small" @click="handleClear" style="margin-left: 16px" class="hover-lift">
                清空队列
              </NButton>
            </div>
          </div>

          <div class="list-content">
            <template v-if="fileStore.hasFiles">
              <FileList
                :files="fileStore.files"
                :show-progress="true"
                @remove="handleRemoveFile"
              />
            </template>

            <!-- T-036: EmptyState -->
            <EmptyState
              v-else
              icon="🔄"
              title="图片格式转换"
              description="支持主流图片格式互转，包括 WebP/AVIF 与生成多尺寸图标。直接拖拽文件到这里。"
            >
              <template #action>
                <div style="display: flex; gap: 12px; justify-content: center">
                  <NButton @click="selectFiles" type="primary" size="large" class="btn-glow">
                    <template #icon><NIcon><FolderOpenOutline /></NIcon></template>
                    选择图片
                  </NButton>
                  <NButton @click="selectFolder" size="large">
                    <template #icon><NIcon><ImagesOutline /></NIcon></template>
                    选择文件夹
                  </NButton>
                </div>
              </template>
            </EmptyState>
          </div>
        </GlassCard>
      </div>
      
    </div>
  </div>
</template>

<style scoped>
.convert-view {
  height: 100%;
  padding: 12px 0;
  box-sizing: border-box;
}

.layout-container {
  display: flex;
  height: 100%;
  gap: 20px;
}

/* 左侧固定宽度 */
.left-panel {
  width: 340px;
  flex-shrink: 0;
  display: flex;
  flex-direction: column;
}

.control-card {
  height: 100%;
  display: flex;
  flex-direction: column;
  overflow-y: auto;
}

.panel-header {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-bottom: 24px;
}

.header-icon {
  color: var(--primary);
}

.header-title {
  font-size: 1.25em;
  font-weight: 700;
  color: var(--text-main);
  margin: 0;
}

.form-group {
  margin-bottom: 20px;
}

.form-label {
  display: block;
  font-size: 0.9em;
  font-weight: 600;
  color: var(--text-secondary);
  margin-bottom: 8px;
}

/* 格式联排网格 */
.format-grid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 12px;
}

.format-card {
  display: flex;
  align-items: center;
  gap: 8px;
  cursor: pointer;
  border-width: 2px !important;
  border-color: transparent !important;
  transition: all var(--duration-fast);
}

.format-card.active {
  border-color: var(--primary) !important;
  background: var(--primary-light) !important;
  box-shadow: var(--shadow-sm);
}

.format-card.active .format-title {
  color: var(--primary);
}

.format-icon {
  font-size: 1.5em;
  filter: grayscale(0.5);
  transition: all 0.2s;
}

.format-card.active .format-icon {
  filter: grayscale(0);
  transform: scale(1.1);
}

.format-info {
  flex: 1;
  min-width: 0;
}

.format-title {
  font-size: 0.9em;
  font-weight: 700;
  color: var(--text-main);
}

.format-desc {
  font-size: 0.7em;
  color: var(--text-muted);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

/* 自定义尺寸行 */
.custom-size-row {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-top: 10px;
}

.lock-btn {
  background: var(--bg-body) !important;
  transition: all 0.2s;
}
.lock-btn:hover {
  background: var(--bg-card-hover) !important;
}

.spacer {
  flex: 1;
}
.action-footer {
  margin-top: 16px;
}

/* 右侧列表面板 */
.right-panel {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
}

.list-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 16px 20px;
  border-bottom: 1px solid var(--border-light);
  background: rgba(255, 255, 255, 0.3);
}

[data-theme="dark"] .list-header {
  background: rgba(0, 0, 0, 0.2);
}

.list-title {
  font-size: 1.1em;
  font-weight: 600;
  color: var(--text-main);
}

.list-actions {
  display: flex;
  align-items: center;
}

.list-content {
  flex: 1;
  overflow-y: auto;
  position: relative;
}

.list-content :deep(.file-list) {
  padding: 0;
}
</style>
