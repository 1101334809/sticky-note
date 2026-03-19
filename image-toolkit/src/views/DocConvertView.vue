<script setup lang="ts">
import { onMounted, inject, watch, ref, type Ref } from 'vue'
import {
  NSelect,
  NIcon,
  NButton,
  NProgress,
  NTag,
  NSpace,
  NEllipsis,
  NTooltip,
  NModal,
  NResult,
  useMessage,
} from 'naive-ui'
import {
  ArrowForwardOutline,
  FolderOpenOutline,
  TrashOutline,
  CloudUploadOutline,
  PlayOutline,
  CloseCircleOutline,
  CheckmarkCircleOutline,
  AlertCircleOutline,
  OpenOutline,
  EyeOutline,
} from '@vicons/ionicons5'
import { useDocConvertStore, type FileItem } from '../stores/docConvert.store'
import PreviewPanel from '../components/PreviewPanel.vue'

const store = useDocConvertStore()
const message = useMessage()
const droppedFiles = inject<Ref<string[]>>('droppedFiles')
const showLoModal = ref(false)
const showPreview = ref(false)
const previewFilePath = ref('')

onMounted(async () => {
  await store.init()
})

// 监听拖拽文件
watch(() => droppedFiles?.value, (paths) => {
  if (paths && paths.length > 0) {
    // 过滤匹配当前源格式的文件
    const exts = store.fileExtensions
    const matched = paths.filter((p) => {
      const ext = '.' + p.split('.').pop()?.toLowerCase()
      return exts.includes(ext)
    })
    if (matched.length > 0) {
      store.addFiles(matched)
    } else if (paths.length > 0) {
      message.warning(`请拖入 ${store.FORMAT_LABELS[store.sourceFormat]} 格式的文件`)
    }
  }
}, { deep: true })

// 源格式选项
const sourceOptions = [
  { label: 'Word (.docx)', value: 'docx' },
  { label: 'PPT (.pptx)', value: 'pptx' },
  { label: 'PDF (.pdf)', value: 'pdf' },
  { label: 'Markdown (.md)', value: 'md' },
  { label: 'HTML (.html)', value: 'html' },
]

// 目标格式选项（动态）
function getTargetOptions() {
  return store.availableTargets.map((t: string) => ({
    label: store.FORMAT_LABELS[t] || t,
    value: t,
  }))
}

function handleSourceChange(val: string) {
  store.setSourceFormat(val as any)
}

function handleTargetChange(val: string) {
  store.setTargetFormat(val)
}

// 选择文件
async function handleSelectFiles() {
  const input = document.createElement('input')
  input.type = 'file'
  input.multiple = true
  input.accept = store.fileExtensions.join(',')
  input.onchange = () => {
    if (input.files) {
      const paths: string[] = []
      for (const f of input.files) {
        paths.push((f as any).path || f.name)
      }
      store.addFiles(paths)
    }
  }
  input.click()
}

// 开始转换
async function handleStart() {
  if (store.files.length === 0) {
    message.warning('请先添加文件')
    return
  }

  // 检测 LibreOffice
  if (store.needsLibreOffice && !store.loInstalled) {
    showLoModal.value = true
    return
  }

  await store.startConvert()
}

// 状态标签
function getStatusTag(status: string) {
  const map: Record<string, { type: any; label: string }> = {
    pending: { type: 'default', label: '等待' },
    converting: { type: 'info', label: '转换中' },
    completed: { type: 'success', label: '完成' },
    failed: { type: 'error', label: '失败' },
  }
  return map[status] || map.pending
}

// 预览
function handlePreview(file: FileItem) {
  if (file.outputPath) {
    previewFilePath.value = file.outputPath
    showPreview.value = true
  }
}
</script>

<template>
  <div class="doc-convert-page">
    <!-- 标题区 -->
    <div class="page-header">
      <h2 class="page-title">文档转换</h2>
      <p class="page-desc">支持 Word / PPT / PDF / Markdown / HTML 格式互转</p>
    </div>

    <!-- 格式选择器 -->
    <div class="format-selector">
      <NSelect
        :value="store.sourceFormat"
        :options="sourceOptions"
        placeholder="源格式"
        class="format-select"
        @update:value="handleSourceChange"
      />
      <div class="format-arrow">
        <NIcon :size="24" :component="ArrowForwardOutline" />
      </div>
      <NSelect
        :value="store.targetFormat"
        :options="getTargetOptions()"
        placeholder="目标格式"
        class="format-select"
        @update:value="handleTargetChange"
      />
    </div>

    <!-- LibreOffice 提示 -->
    <div v-if="store.needsLibreOffice && store.loInstalled === false" class="lo-warning">
      <NIcon :component="AlertCircleOutline" color="#f0a020" :size="18" />
      <span>此转换需要 LibreOffice —</span>
      <a href="#" @click.prevent="showLoModal = true">查看安装指引</a>
    </div>

    <!-- 文件拖拽区 -->
    <div
      class="drop-zone"
      :class="{ 'has-files': store.files.length > 0 }"
      @click="handleSelectFiles"
    >
      <template v-if="store.files.length === 0">
        <NIcon :size="48" :component="CloudUploadOutline" color="var(--text-muted)" />
        <p class="drop-text">拖拽文件到此处，或点击选择文件</p>
        <p class="drop-hint">支持 {{ store.FORMAT_LABELS[store.sourceFormat] }} 格式</p>
      </template>
    </div>

    <!-- 文件列表 -->
    <div v-if="store.files.length > 0" class="file-list">
      <div class="file-list-header">
        <span class="file-count">{{ store.files.length }} 个文件</span>
        <NButton text type="error" size="small" @click="store.clearFiles" :disabled="store.isConverting">
          清空列表
        </NButton>
      </div>
      <div class="file-items">
        <div
          v-for="file in store.files"
          :key="file.id"
          class="file-item"
          :class="file.status"
        >
          <div class="file-info">
            <NIcon
              :size="16"
              :component="
                file.status === 'completed' ? CheckmarkCircleOutline
                : file.status === 'failed' ? AlertCircleOutline
                : CloseCircleOutline
              "
              :color="
                file.status === 'completed' ? '#18a058'
                : file.status === 'failed' ? '#d03050'
                : '#999'
              "
            />
            <NEllipsis class="file-name" :tooltip="{ width: 360 }">
              {{ file.name }}
            </NEllipsis>
          </div>
          <div class="file-meta">
            <NTag :type="getStatusTag(file.status).type" size="small" round>
              {{ getStatusTag(file.status).label }}
            </NTag>
            <NTooltip v-if="file.error" trigger="hover">
              <template #trigger>
                <NIcon :component="AlertCircleOutline" color="#d03050" :size="14" style="cursor: help" />
              </template>
              {{ file.error }}
            </NTooltip>
            <NButton
              v-if="file.status === 'completed' && file.outputPath"
              text
              type="primary"
              size="tiny"
              @click.stop="handlePreview(file)"
            >
              <NIcon :component="EyeOutline" :size="14" />
            </NButton>
            <NButton
              text
              type="error"
              size="tiny"
              @click.stop="store.removeFile(file.id)"
              :disabled="store.isConverting"
            >
              <NIcon :component="TrashOutline" :size="14" />
            </NButton>
          </div>
          <NProgress
            v-if="file.status === 'converting'"
            type="line"
            :percentage="file.progress"
            :show-indicator="false"
            :height="3"
            class="file-progress"
          />
        </div>
      </div>
    </div>

    <!-- 输出目录 -->
    <div class="output-dir">
      <NIcon :component="FolderOpenOutline" :size="16" />
      <NEllipsis class="dir-path" :tooltip="{ width: 400 }">
        {{ store.outputDir || '输出到源文件同目录' }}
      </NEllipsis>
      <NButton text size="small" @click="store.selectOutputDir">
        更改
      </NButton>
    </div>

    <!-- 操作按钮 -->
    <div class="actions">
      <NButton
        v-if="!store.isConverting"
        type="primary"
        size="large"
        block
        :disabled="store.files.length === 0"
        @click="handleStart"
      >
        <template #icon>
          <NIcon :component="PlayOutline" />
        </template>
        开始转换
      </NButton>
      <NButton
        v-else
        type="warning"
        size="large"
        block
        @click="store.cancelConvert"
      >
        取消转换
      </NButton>
    </div>

    <!-- 结果统计 -->
    <div v-if="store.batchResult" class="batch-result">
      <NResult
        :status="store.batchResult.failed === 0 ? 'success' : 'warning'"
        :title="store.batchResult.failed === 0 ? '转换完成' : '部分转换完成'"
        :description="`成功 ${store.batchResult.completed} 个，失败 ${store.batchResult.failed} 个`"
      >
        <template #footer>
          <NSpace>
            <NButton type="primary" @click="store.openOutputDir">
              <template #icon>
                <NIcon :component="OpenOutline" />
              </template>
              打开输出目录
            </NButton>
            <NButton @click="store.clearFiles">新一轮转换</NButton>
          </NSpace>
        </template>
      </NResult>
    </div>

    <!-- LibreOffice 安装弹窗 -->
    <NModal v-model:show="showLoModal" preset="dialog" title="需要安装 LibreOffice">
      <div class="lo-modal-body">
        <p>当前转换（{{ store.FORMAT_LABELS[store.sourceFormat] }} → {{ store.FORMAT_LABELS[store.targetFormat] }}）需要 LibreOffice 作为排版引擎。</p>
        <p style="margin-top: 12px">
          <strong>📥 下载地址：</strong><br />
          <a href="https://www.libreoffice.org/download" target="_blank">
            https://www.libreoffice.org/download
          </a>
        </p>
        <p style="margin-top: 12px; color: #888">安装完成后无需重启应用，直接点击「已安装，重试」即可。</p>
      </div>
      <template #action>
        <NSpace>
          <NButton @click="showLoModal = false">取消</NButton>
          <NButton type="primary" @click="store.checkLibreOffice().then(() => { if (store.loInstalled) { showLoModal = false; message.success('检测到 LibreOffice') } else { message.error('未检测到 LibreOffice，请确认已安装') } })">
            已安装，重试
          </NButton>
        </NSpace>
      </template>
    </NModal>

    <!-- 预览面板 -->
    <PreviewPanel
      :file-path="previewFilePath"
      :visible="showPreview"
      @close="showPreview = false"
    />
  </div>
</template>

<style scoped>
.doc-convert-page {
  padding: 24px;
  max-width: 680px;
  margin: 0 auto;
}

.page-header {
  margin-bottom: 24px;
}

.page-title {
  margin: 0 0 4px;
  font-size: 22px;
  font-weight: 700;
}

.page-desc {
  margin: 0;
  font-size: 13px;
  color: var(--text-muted, #888);
}

/* 格式选择器 */
.format-selector {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-bottom: 20px;
}

.format-select {
  flex: 1;
}

.format-arrow {
  flex-shrink: 0;
  color: var(--text-muted, #888);
}

/* LO 警告 */
.lo-warning {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 8px 12px;
  margin-bottom: 16px;
  background: #fff8e1;
  border-radius: 8px;
  font-size: 13px;
}

.lo-warning a {
  color: #1677ff;
  text-decoration: none;
}

/* 拖拽区 */
.drop-zone {
  border: 2px dashed var(--border-color, #e0e0e6);
  border-radius: 12px;
  padding: 40px 20px;
  text-align: center;
  cursor: pointer;
  transition: all 0.2s;
  margin-bottom: 16px;
}

.drop-zone:hover {
  border-color: #1677ff;
  background: rgba(22, 119, 255, 0.02);
}

.drop-zone.has-files {
  display: none;
}

.drop-text {
  margin: 12px 0 4px;
  font-size: 14px;
  color: var(--text-color, #333);
}

.drop-hint {
  margin: 0;
  font-size: 12px;
  color: var(--text-muted, #999);
}

/* 文件列表 */
.file-list {
  margin-bottom: 16px;
}

.file-list-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 8px;
}

.file-count {
  font-size: 13px;
  color: var(--text-muted, #888);
}

.file-items {
  max-height: 280px;
  overflow-y: auto;
  border: 1px solid var(--border-color, #e0e0e6);
  border-radius: 8px;
}

.file-item {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  justify-content: space-between;
  padding: 10px 14px;
  border-bottom: 1px solid var(--border-color, #f0f0f0);
  position: relative;
}

.file-item:last-child {
  border-bottom: none;
}

.file-item.completed {
  background: rgba(24, 160, 88, 0.04);
}

.file-item.failed {
  background: rgba(208, 48, 80, 0.04);
}

.file-info {
  display: flex;
  align-items: center;
  gap: 8px;
  flex: 1;
  min-width: 0;
}

.file-name {
  font-size: 13px;
}

.file-meta {
  display: flex;
  align-items: center;
  gap: 8px;
  flex-shrink: 0;
}

.file-progress {
  width: 100%;
  margin-top: 4px;
}

/* 输出目录 */
.output-dir {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 10px 14px;
  background: var(--card-bg, #f8f8fa);
  border-radius: 8px;
  margin-bottom: 16px;
  font-size: 13px;
}

.dir-path {
  flex: 1;
  color: var(--text-muted, #888);
}

/* 操作按钮 */
.actions {
  margin-bottom: 16px;
}

/* 结果统计 */
.batch-result {
  margin-top: 8px;
}

/* LO 弹窗 */
.lo-modal-body {
  line-height: 1.8;
  font-size: 14px;
}

.lo-modal-body a {
  color: #1677ff;
}
</style>
