<script setup lang="ts">
/**
 * 预览面板组件
 *
 * 支持：
 * - Markdown 文件：用 marked 渲染为 HTML
 * - HTML 文件：用 iframe sandbox 渲染
 * - 其他：显示纯文本内容
 */
import { ref, watch } from 'vue'
import { NIcon, NButton, NEmpty, NSpin } from 'naive-ui'
import { CloseOutline } from '@vicons/ionicons5'

const props = defineProps<{
  filePath: string
  visible: boolean
}>()

const emit = defineEmits<{
  (e: 'close'): void
}>()

const content = ref('')
const loading = ref(false)
const fileType = ref<'md' | 'html' | 'text'>('text')

// 动态加载 marked（仅渲染进程使用）
let markedParse: ((md: string) => string) | null = null

async function loadMarked() {
  if (!markedParse) {
    try {
      const { marked } = await import('marked')
      marked.setOptions({ gfm: true, breaks: true })
      markedParse = (md: string) => marked.parse(md) as string
    } catch {
      markedParse = (md: string) => `<pre>${md}</pre>`
    }
  }
}

watch(
  () => props.filePath,
  async (newPath) => {
    if (!newPath) {
      content.value = ''
      return
    }
    await loadFile(newPath)
  }
)

async function loadFile(filePath: string) {
  loading.value = true
  content.value = ''

  try {
    const ext = filePath.split('.').pop()?.toLowerCase() || ''

    if (ext === 'md' || ext === 'markdown') {
      fileType.value = 'md'
      await loadMarked()
      const raw = await readFileContent(filePath)
      content.value = markedParse ? markedParse(raw) : `<pre>${raw}</pre>`
    } else if (ext === 'html' || ext === 'htm') {
      fileType.value = 'html'
      content.value = await readFileContent(filePath)
    } else {
      fileType.value = 'text'
      content.value = await readFileContent(filePath)
    }
  } catch (e: any) {
    content.value = `<p style="color:red">无法读取文件: ${e.message}</p>`
  } finally {
    loading.value = false
  }
}

/** 通过 IPC 读取文件内容 */
async function readFileContent(filePath: string): Promise<string> {
  const ipcRenderer = (window as any).ipcRenderer
  if (ipcRenderer) {
    return await ipcRenderer.invoke('file:readText', filePath)
  }
  return '无法读取文件（IPC 不可用）'
}
</script>

<template>
  <Transition name="preview-slide">
    <div v-if="visible" class="preview-panel">
      <div class="preview-header">
        <span class="preview-title">预览</span>
        <span class="preview-filename">{{ filePath?.split(/[/\\]/).pop() }}</span>
        <NButton text size="small" @click="emit('close')">
          <NIcon :component="CloseOutline" :size="18" />
        </NButton>
      </div>

      <div class="preview-body">
        <NSpin v-if="loading" class="preview-loading" />

        <template v-else-if="content">
          <!-- MD / HTML 渲染 -->
          <div
            v-if="fileType === 'md' || fileType === 'html'"
            class="preview-rendered"
            v-html="content"
          />

          <!-- 纯文本 -->
          <pre v-else class="preview-text">{{ content }}</pre>
        </template>

        <NEmpty v-else description="选择已完成的文件进行预览" />
      </div>
    </div>
  </Transition>
</template>

<style scoped>
.preview-panel {
  width: 380px;
  border-left: 1px solid var(--border-color, #e0e0e6);
  display: flex;
  flex-direction: column;
  background: var(--card-bg, #fff);
  position: absolute;
  right: 0;
  top: 0;
  bottom: 0;
  z-index: 10;
  box-shadow: -4px 0 16px rgba(0, 0, 0, 0.06);
}

.preview-header {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 12px 16px;
  border-bottom: 1px solid var(--border-color, #e0e0e6);
  flex-shrink: 0;
}

.preview-title {
  font-weight: 600;
  font-size: 14px;
}

.preview-filename {
  flex: 1;
  font-size: 12px;
  color: var(--text-muted, #888);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.preview-body {
  flex: 1;
  overflow-y: auto;
  padding: 16px;
}

.preview-loading {
  display: flex;
  justify-content: center;
  padding: 40px 0;
}

.preview-rendered {
  font-size: 13px;
  line-height: 1.7;
  word-wrap: break-word;
}

.preview-rendered :deep(h1) { font-size: 1.5em; margin: 16px 0 8px; }
.preview-rendered :deep(h2) { font-size: 1.3em; margin: 14px 0 6px; }
.preview-rendered :deep(h3) { font-size: 1.1em; margin: 12px 0 4px; }
.preview-rendered :deep(code) {
  background: #f5f5f5;
  padding: 2px 6px;
  border-radius: 3px;
  font-size: 0.9em;
}
.preview-rendered :deep(pre) {
  background: #f5f5f5;
  padding: 12px;
  border-radius: 6px;
  overflow-x: auto;
}
.preview-rendered :deep(pre code) {
  background: none;
  padding: 0;
}
.preview-rendered :deep(table) {
  border-collapse: collapse;
  width: 100%;
  margin: 12px 0;
}
.preview-rendered :deep(th),
.preview-rendered :deep(td) {
  border: 1px solid #ddd;
  padding: 6px 10px;
  font-size: 12px;
}
.preview-rendered :deep(blockquote) {
  border-left: 3px solid #ddd;
  margin: 0;
  padding: 0 12px;
  color: #666;
}
.preview-rendered :deep(img) {
  max-width: 100%;
}

.preview-text {
  font-size: 12px;
  line-height: 1.6;
  white-space: pre-wrap;
  word-break: break-all;
}

/* 滑入动画 */
.preview-slide-enter-active,
.preview-slide-leave-active {
  transition: transform 0.25s ease, opacity 0.25s ease;
}
.preview-slide-enter-from,
.preview-slide-leave-to {
  transform: translateX(100%);
  opacity: 0;
}
</style>
