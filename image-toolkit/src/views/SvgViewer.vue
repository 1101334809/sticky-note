<script setup lang="ts">
/**
 * SVG 查看视图 — 重构版
 *
 * 使用通用组件 Toolbar，保留 SVG 特有的宫格/列表视图和颜色修改功能
 * T-019
 */
import { ref, computed, inject, watch, type Ref } from 'vue'
import {
  NButton, NInput, NIcon, NGrid, NGridItem,
  NEmpty, NColorPicker, NTooltip, NButtonGroup,
  useMessage,
} from 'naive-ui'
import {
  FolderOpenOutline,
  DocumentOutline,
  GridOutline,
  ListOutline,
  ColorPaletteOutline,
  DownloadOutline,
  SearchOutline,
} from '@vicons/ionicons5'
import Toolbar from '../components/Toolbar.vue'
import PreviewModal from '../components/PreviewModal.vue'
import ExportPngDialog from '../components/ExportPngDialog.vue'
import type { ExportOptions } from '../components/ExportPngDialog.vue'
import { useUndoStore } from '../stores/undo.store'
import { useSettingsStore } from '../stores/settings.store'
import { useAudio } from '../composables/useAudio'

interface SvgFile {
  name: string
  path: string
  size: number
  content: string
  selected?: boolean
}

const message = useMessage()
const undoStore = useUndoStore()
const settingsStore = useSettingsStore()
const { playError, playComplete } = useAudio()

const svgFiles = ref<SvgFile[]>([])
const searchQuery = ref('')
const viewMode = ref<'grid' | 'list'>('grid')
const fillColor = ref('#667eea')

// ====== 预览弹窗状态 ======
const showPreview = ref(false)
const previewContent = ref('')
const previewFileName = ref('')

// ====== 导出弹窗状态 ======
const showExportDialog = ref(false)

const isLoaded = computed(() => svgFiles.value.length > 0)
const fileCount = computed(() => svgFiles.value.length)
const selectedCount = computed(() => svgFiles.value.filter(f => f.selected).length)

// ====== 接收全局拖拽文件 ======
const droppedFiles = inject<Ref<string[]>>('droppedFiles', ref([]))
watch(droppedFiles, async (paths) => {
  if (!paths.length) return
  const svgPaths = paths.filter(p => p.toLowerCase().endsWith('.svg'))
  if (svgPaths.length === 0) return
  for (const p of svgPaths) {
    try {
      const content = await window.ipcRenderer.invoke('file:readText', p)
      const name = p.split(/[\\/]/).pop() || p
      svgFiles.value.push({ name, path: p, size: content.length, content })
    } catch { /* skip bad files */ }
  }
  message.success(`已通过拖拽添加 ${svgPaths.length} 个 SVG 文件`)
})

const filteredFiles = computed(() => {
  if (!searchQuery.value) return svgFiles.value
  const q = searchQuery.value.toLowerCase()
  return svgFiles.value.filter(f => f.name.toLowerCase().includes(q))
})

// ====== 文件加载 ======
async function loadFolder() {
  try {
    const folderPath = await window.ipcRenderer.invoke('dialog:openFolder')
    if (!folderPath) return
    const files: SvgFile[] = await window.ipcRenderer.invoke('svg:readFolder', folderPath)
    svgFiles.value = [...svgFiles.value, ...files]
    message.success(`已加载 ${files.length} 个 SVG 文件`)
  } catch (e: any) {
    message.error('加载失败: ' + e.message)
  }
}

async function loadFiles() {
  try {
    const paths: string[] = await window.ipcRenderer.invoke('dialog:openFiles', {
      filters: [{ name: 'SVG 文件', extensions: ['svg'] }],
      properties: ['openFile', 'multiSelections'],
    })
    if (!paths.length) return
    const newFiles: SvgFile[] = []
    for (const p of paths) {
      const content = await window.ipcRenderer.invoke('file:readText', p)
      const name = p.split(/[\\/]/).pop() || p
      newFiles.push({ name, path: p, size: content.length, content })
    }
    svgFiles.value = [...svgFiles.value, ...newFiles]
    message.success(`已添加 ${newFiles.length} 个 SVG 文件`)
  } catch (e: any) {
    message.error('加载失败: ' + e.message)
  }
}

// ====== 选择 ======
function toggleSelect(path: string) {
  const file = svgFiles.value.find(f => f.path === path)
  if (file) {
    file.selected = !file.selected
  }
}

// ====== 清空 ======
function handleClear() {
  const oldFiles = [...svgFiles.value]
  svgFiles.value = []
  undoStore.push({
    type: 'file:clear',
    description: `清空了 ${oldFiles.length} 个 SVG 文件`,
    timestamp: Date.now(),
    undo: () => { svgFiles.value = oldFiles },
    redo: () => { svgFiles.value = [] },
  })
}

// ====== 工具函数 ======
function getSvgDataUri(content: string) {
  return 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(content)
}

function formatSize(bytes: number) {
  if (bytes < 1024) return bytes + ' B'
  return (bytes / 1024).toFixed(1) + ' KB'
}

// ====== 颜色修改 ======
async function applyColor() {
  const targets = selectedCount.value > 0
    ? svgFiles.value.filter(f => f.selected)
    : svgFiles.value

  // 保存旧内容用于撤销
  const oldContents = targets.map(f => ({ path: f.path, content: f.content }))

  targets.forEach(f => {
    f.content = f.content
      .replace(/fill="(?!none)[^"]*"/g, `fill="${fillColor.value}"`)
      .replace(/stroke="(?!none)[^"]*"/g, `stroke="${fillColor.value}"`)
  })

  undoStore.push({
    type: 'color:change',
    description: `修改了 ${targets.length} 个 SVG 颜色为 ${fillColor.value}`,
    timestamp: Date.now(),
    undo: () => {
      oldContents.forEach(old => {
        const f = svgFiles.value.find(s => s.path === old.path)
        if (f) f.content = old.content
      })
    },
    redo: () => {
      targets.forEach(f => {
        f.content = f.content
          .replace(/fill="(?!none)[^"]*"/g, `fill="${fillColor.value}"`)
          .replace(/stroke="(?!none)[^"]*"/g, `stroke="${fillColor.value}"`)
      })
    },
  })

  message.success(`已对 ${targets.length} 个 SVG 应用颜色 ${fillColor.value}`)
}

// ====== 预览 (T-023) ======
function openPreview(file: SvgFile) {
  previewContent.value = file.content
  previewFileName.value = file.name
  showPreview.value = true
}

// ====== 导出 PNG (T-026) ======
function openExportDialog() {
  showExportDialog.value = true
}

async function handleExport(options: ExportOptions) {
  const targets = selectedCount.value > 0
    ? svgFiles.value.filter(f => f.selected)
    : svgFiles.value

  let totalExported = 0
  let totalFailed = 0

  for (const file of targets) {
    try {
      const baseName = file.name.replace(/\.svg$/i, '')
      const outputDir = options.outputDir || settingsStore.outputDir || file.path.substring(0, file.path.lastIndexOf('\\')) || file.path.substring(0, file.path.lastIndexOf('/'))

      const result = await window.ipcRenderer.invoke('svg:exportPng', {
        svgContent: file.content,
        outputDir,
        fileName: baseName,
        mode: options.mode,
        scales: options.scales,
        customWidth: options.customWidth,
        customHeight: options.customHeight,
      })

      if (result.success) {
        totalExported += result.files?.length || 0
      } else {
        totalFailed++
      }
    } catch {
      totalFailed++
    }
  }

  if (totalExported > 0) {
    message.success(`成功导出 ${totalExported} 个 PNG 文件`)
    playComplete()
  }
  if (totalFailed > 0) {
    message.warning(`${totalFailed} 个文件导出失败`)
    playError()
  }
}

// ====== ZIP 打包 (T-049) ======
async function downloadZip() {
  const targets = selectedCount.value > 0
    ? svgFiles.value.filter(f => f.selected)
    : svgFiles.value

  if (targets.length === 0) {
    message.warning('没有可打包的文件')
    return
  }

  try {
    const savePath = await window.ipcRenderer.invoke('dialog:saveDir')
    if (!savePath) return

    const result = await window.ipcRenderer.invoke('svg:downloadZip', {
      files: targets.map(f => ({ name: f.name, content: f.content })),
      outputDir: savePath,
      zipName: `svg-bundle-${Date.now()}.zip`,
    })

    if (result.success) {
      message.success(`已打包 ${targets.length} 个 SVG 文件到 ${result.outputPath}`)
      playComplete()
    } else {
      message.error('打包失败: ' + result.error)
      playError()
    }
  } catch (e: any) {
    message.error('打包失败: ' + e.message)
    playError()
  }
}
</script>

<template>
  <div style="height: 100%; display: flex; flex-direction: column; overflow: hidden">
    <!-- 工具栏 -->
    <Toolbar
      :file-count="fileCount"
      :selected-count="selectedCount"
      :is-processing="false"
      @clear="handleClear"
    >
      <template #left>
        <NButton @click="loadFiles" type="primary" size="small">
          <template #icon><NIcon><DocumentOutline /></NIcon></template>
          选择文件
        </NButton>
        <NButton @click="loadFolder" size="small">
          <template #icon><NIcon><FolderOpenOutline /></NIcon></template>
          选择文件夹
        </NButton>

        <NInput
          v-model:value="searchQuery"
          placeholder="搜索 SVG 文件名…"
          clearable
          size="small"
          style="width: 200px"
        >
          <template #prefix><NIcon><SearchOutline /></NIcon></template>
        </NInput>
      </template>

      <template #right>
        <NButtonGroup size="small">
          <NButton :type="viewMode === 'grid' ? 'primary' : 'default'" @click="viewMode = 'grid'">
            <template #icon><NIcon><GridOutline /></NIcon></template>
          </NButton>
          <NButton :type="viewMode === 'list' ? 'primary' : 'default'" @click="viewMode = 'list'">
            <template #icon><NIcon><ListOutline /></NIcon></template>
          </NButton>
        </NButtonGroup>

        <NColorPicker v-model:value="fillColor" size="small" style="width: 80px" :show-alpha="false" />

        <NButton size="small" @click="applyColor" :disabled="!isLoaded">
          <template #icon><NIcon><ColorPaletteOutline /></NIcon></template>
          改色
        </NButton>

        <NButton size="small" type="primary" @click="openExportDialog" :disabled="!isLoaded">
          <template #icon><NIcon><DownloadOutline /></NIcon></template>
          导出 PNG
        </NButton>

        <NButton size="small" @click="downloadZip" :disabled="!isLoaded">
          📦 ZIP 打包
        </NButton>
      </template>
    </Toolbar>

    <!-- 内容区 -->
    <div style="flex: 1; padding: 16px; overflow-y: auto">
      <!-- 空状态 -->
      <div v-if="!isLoaded" style="display: flex; align-items: center; justify-content: center; height: 100%">
        <div class="empty-zone">
          <div style="font-size: 3em; margin-bottom: 16px">📂</div>
          <p style="color: var(--text-secondary); font-size: 1.1em; margin-bottom: 16px">加载 SVG 文件</p>
          <div style="display: flex; gap: 12px; justify-content: center">
            <NButton @click="loadFiles" type="primary" size="medium">
              <template #icon><NIcon><DocumentOutline /></NIcon></template>
              选择文件
            </NButton>
            <NButton @click="loadFolder" size="medium">
              <template #icon><NIcon><FolderOpenOutline /></NIcon></template>
              选择文件夹
            </NButton>
          </div>
          <p style="color: var(--text-muted); font-size: 0.85em; margin-top: 16px">或将 SVG 文件拖拽到此处</p>
        </div>
      </div>

      <!-- 宫格视图 -->
      <NGrid v-if="isLoaded && viewMode === 'grid'" :x-gap="12" :y-gap="12" cols="2 400:3 600:5 800:7 1000:9">
        <NGridItem v-for="file in filteredFiles" :key="file.path">
          <div
            @click="toggleSelect(file.path)"
            class="svg-card"
            :class="{ selected: file.selected }"
          >
            <!-- 选中角标 -->
            <div v-if="file.selected" class="select-badge">✓</div>
            <img
              :src="getSvgDataUri(file.content)"
              style="width: 48px; height: 48px; display: block; margin: 0 auto 8px; cursor: zoom-in"
              @click.stop="openPreview(file)"
            />
            <NTooltip>
              <template #trigger>
                <div style="font-size: 0.7em; color: var(--text-secondary); overflow: hidden; text-overflow: ellipsis; white-space: nowrap">
                  {{ file.name }}
                </div>
              </template>
              {{ file.name }} ({{ formatSize(file.size) }})
            </NTooltip>
          </div>
        </NGridItem>
      </NGrid>

      <!-- 列表视图 -->
      <div v-if="isLoaded && viewMode === 'list'">
        <TransitionGroup name="list" tag="div">
          <div
            v-for="file in filteredFiles"
            :key="file.path"
            @click="toggleSelect(file.path)"
            class="svg-list-item"
            :class="{ selected: file.selected }"
          >
            <img :src="getSvgDataUri(file.content)" style="width: 32px; height: 32px; flex-shrink: 0" />
            <div style="flex: 1; min-width: 0">
              <div style="color: var(--text-primary); font-size: 0.85em">{{ file.name }}</div>
              <div style="color: var(--text-muted); font-size: 0.75em">{{ formatSize(file.size) }}</div>
            </div>
            <div v-if="file.selected" class="select-badge-inline">✓</div>
          </div>
        </TransitionGroup>
      </div>

      <!-- 无搜索结果 -->
      <NEmpty v-if="isLoaded && filteredFiles.length === 0" description="没有匹配的 SVG 文件" style="margin-top: 60px" />
    </div>

    <!-- 预览弹窗 -->
    <PreviewModal
      v-model:visible="showPreview"
      :svg-content="previewContent"
      :file-name="previewFileName"
    />

    <!-- 导出设置弹窗 -->
    <ExportPngDialog
      v-model:visible="showExportDialog"
      :file-count="selectedCount || fileCount"
      @export="handleExport"
    />
  </div>
</template>

<style scoped>
/* 空状态区 */
.empty-zone {
  border: 2px dashed var(--border-dashed);
  border-radius: 16px;
  padding: 48px;
  text-align: center;
  transition: all 0.3s;
}
.empty-zone:hover {
  border-color: var(--accent);
}

/* SVG 卡片 */
.svg-card {
  padding: 16px 8px 10px;
  text-align: center;
  border-radius: 10px;
  cursor: pointer;
  border: 1px solid var(--border-light);
  background: var(--bg-card);
  transition: all 0.2s;
  position: relative;
}
.svg-card:hover {
  background: var(--bg-card-hover);
  box-shadow: var(--shadow-sm);
}
.svg-card.selected {
  border-color: var(--accent);
  background: var(--accent-light);
}

/* SVG 列表项 */
.svg-list-item {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 10px 16px;
  border-bottom: 1px solid var(--border-light);
  cursor: pointer;
  transition: background 0.15s;
}
.svg-list-item:hover {
  background: var(--bg-card-hover);
}
.svg-list-item.selected {
  background: var(--accent-light);
}

/* 选中角标 */
.select-badge {
  position: absolute;
  top: 4px;
  right: 4px;
  width: 18px;
  height: 18px;
  background: var(--accent);
  color: #fff;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 10px;
  font-weight: 700;
}
.select-badge-inline {
  width: 20px;
  height: 20px;
  background: var(--accent);
  color: #fff;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 10px;
  font-weight: 700;
  flex-shrink: 0;
}
</style>
