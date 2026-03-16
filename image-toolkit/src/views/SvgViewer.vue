<script setup lang="ts">
import { ref, computed } from 'vue'
import {
  NSpace, NButton, NInput, NIcon, NGrid, NGridItem,
  NEmpty, NCard, NColorPicker, NTooltip, NButtonGroup,
  useMessage, useNotification,
} from 'naive-ui'
import {
  FolderOpenOutline,
  GridOutline,
  ListOutline,
  ColorPaletteOutline,
  DownloadOutline,
  SearchOutline,
} from '@vicons/ionicons5'

interface SvgFile {
  name: string
  path: string
  size: number
  content: string
}

const message = useMessage()
const svgFiles = ref<SvgFile[]>([])
const searchQuery = ref('')
const viewMode = ref<'grid' | 'list'>('grid')
const selectedFiles = ref<Set<string>>(new Set())
const fillColor = ref('#667eea')
const isLoaded = ref(false)

const filteredFiles = computed(() => {
  if (!searchQuery.value) return svgFiles.value
  const q = searchQuery.value.toLowerCase()
  return svgFiles.value.filter(f => f.name.toLowerCase().includes(q))
})

async function loadFolder() {
  try {
    const folderPath = await window.ipcRenderer.invoke('dialog:openFolder')
    if (!folderPath) return
    const files: SvgFile[] = await window.ipcRenderer.invoke('svg:readFolder', folderPath)
    svgFiles.value = files
    isLoaded.value = true
    message.success(`已加载 ${files.length} 个 SVG 文件`)
  } catch (e: any) {
    message.error('加载失败: ' + e.message)
  }
}

function toggleSelect(path: string) {
  if (selectedFiles.value.has(path)) {
    selectedFiles.value.delete(path)
  } else {
    selectedFiles.value.add(path)
  }
  selectedFiles.value = new Set(selectedFiles.value) // trigger reactivity
}

function getSvgDataUri(content: string) {
  // Replace fill/stroke colors for preview
  return 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(content)
}

function formatSize(bytes: number) {
  if (bytes < 1024) return bytes + ' B'
  return (bytes / 1024).toFixed(1) + ' KB'
}

async function applyColor() {
  const targets = selectedFiles.value.size > 0
    ? svgFiles.value.filter(f => selectedFiles.value.has(f.path))
    : svgFiles.value
  
  targets.forEach(f => {
    // Simple color replacement for fill and stroke
    f.content = f.content
      .replace(/fill="[^"]*"/g, `fill="${fillColor.value}"`)
      .replace(/stroke="[^"]*"/g, `stroke="${fillColor.value}"`)
  })
  message.success(`已对 ${targets.length} 个 SVG 应用颜色 ${fillColor.value}`)
}

function exportPng() {
  const count = selectedFiles.value.size || svgFiles.value.length
  message.info(`导出 PNG 功能开发中… (${count} 个文件)`)
}
</script>

<template>
  <div style="height: 100%; display: flex; flex-direction: column; overflow: hidden">
    <!-- 工具栏 -->
    <div style="padding: 16px 24px; display: flex; align-items: center; gap: 12px; border-bottom: 1px solid rgba(255,255,255,0.06); flex-shrink: 0">
      <NButton @click="loadFolder" type="primary" size="small">
        <template #icon><NIcon><FolderOpenOutline /></NIcon></template>
        打开文件夹
      </NButton>
      
      <NInput
        v-model:value="searchQuery"
        placeholder="搜索 SVG 文件名…"
        clearable
        size="small"
        style="width: 220px"
      >
        <template #prefix><NIcon><SearchOutline /></NIcon></template>
      </NInput>

      <div style="flex: 1" />

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

      <NButton size="small" type="primary" @click="exportPng" :disabled="!isLoaded">
        <template #icon><NIcon><DownloadOutline /></NIcon></template>
        导出 PNG
      </NButton>
    </div>

    <!-- 内容区 -->
    <div style="flex: 1; padding: 24px; overflow-y: auto">
      <!-- 空状态 -->
      <div v-if="!isLoaded" style="display: flex; align-items: center; justify-content: center; height: 100%">
        <div 
          @click="loadFolder"
          style="border: 2px dashed rgba(102,126,234,0.3); border-radius: 16px; padding: 64px 48px; text-align: center; cursor: pointer; transition: all 0.3s"
          @mouseenter="($event.target as HTMLElement).style.borderColor = '#667eea'"
          @mouseleave="($event.target as HTMLElement).style.borderColor = 'rgba(102,126,234,0.3)'"
        >
          <div style="font-size: 3em; margin-bottom: 16px">📂</div>
          <p style="color: rgba(255,255,255,0.5); font-size: 1.1em">点击选择 SVG 文件夹</p>
          <p style="color: rgba(255,255,255,0.3); font-size: 0.85em; margin-top: 8px">或将文件夹拖拽到此处</p>
        </div>
      </div>

      <!-- 宫格视图 -->
      <NGrid v-if="isLoaded && viewMode === 'grid'" :x-gap="12" :y-gap="12" cols="2 400:3 600:5 800:7 1000:9">
        <NGridItem v-for="file in filteredFiles" :key="file.path">
          <div
            @click="toggleSelect(file.path)"
            :style="{
              padding: '16px 8px 10px',
              textAlign: 'center',
              borderRadius: '10px',
              cursor: 'pointer',
              border: selectedFiles.has(file.path) ? '1px solid #667eea' : '1px solid rgba(255,255,255,0.06)',
              background: selectedFiles.has(file.path) ? 'rgba(102,126,234,0.12)' : 'rgba(255,255,255,0.03)',
              transition: 'all 0.2s',
            }"
          >
            <img :src="getSvgDataUri(file.content)" style="width: 48px; height: 48px; display: block; margin: 0 auto 8px" />
            <NTooltip>
              <template #trigger>
                <div style="font-size: 0.7em; color: rgba(255,255,255,0.5); overflow: hidden; text-overflow: ellipsis; white-space: nowrap">
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
        <div
          v-for="file in filteredFiles"
          :key="file.path"
          @click="toggleSelect(file.path)"
          :style="{
            display: 'flex',
            alignItems: 'center',
            gap: '12px',
            padding: '10px 16px',
            borderBottom: '1px solid rgba(255,255,255,0.04)',
            cursor: 'pointer',
            background: selectedFiles.has(file.path) ? 'rgba(102,126,234,0.08)' : 'transparent',
            transition: 'background 0.15s',
          }"
        >
          <img :src="getSvgDataUri(file.content)" style="width: 32px; height: 32px; flex-shrink: 0" />
          <div style="flex: 1; min-width: 0">
            <div style="color: #ddd; font-size: 0.85em">{{ file.name }}</div>
            <div style="color: rgba(255,255,255,0.35); font-size: 0.75em">{{ formatSize(file.size) }}</div>
          </div>
        </div>
      </div>

      <!-- 无搜索结果 -->
      <NEmpty v-if="isLoaded && filteredFiles.length === 0" description="没有匹配的 SVG 文件" style="margin-top: 60px" />
    </div>
  </div>
</template>
