<script setup lang="ts">
/**
 * 文档转换视图 — 重构版
 *
 * T-039, T-040
 */
import { onMounted, inject, watch, ref, type Ref } from 'vue'
import {
  NSelect,
  NIcon,
  NButton,
  NProgress,
  NSpace,
  NEllipsis,
  NTooltip,
  NModal,
  NResult,
  useMessage,
} from 'naive-ui'
import {
  FolderOpenOutline,
  TrashOutline,
  PlayOutline,
  CheckmarkCircleOutline,
  AlertCircleOutline,
  OpenOutline,
  EyeOutline,
  DocumentOutline,
  DocumentTextOutline,
  InformationCircleOutline,
} from '@vicons/ionicons5'
import { useDocConvertStore, type FileItem } from '../stores/docConvert.store'
import PreviewPanel from '../components/PreviewPanel.vue'
import GlassCard from '../components/ui/GlassCard.vue'
import EmptyState from '../components/ui/EmptyState.vue'
import PillBadge from '../components/ui/PillBadge.vue'

const store = useDocConvertStore()
const message = useMessage()
const droppedFiles = inject<Ref<string[]>>('droppedFiles', ref([]))
const showLoModal = ref(false)
const showPreview = ref(false)
const previewFilePath = ref('')

onMounted(async () => {
  await store.init()
})

// 监听拖拽文件
watch(droppedFiles, (paths) => {
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
})

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

// 选择目录文件
async function handleSelectFolder() {
  try {
    const folderPath = await window.ipcRenderer.invoke('dialog:openFolder')
    if (!folderPath) return
    message.info('正在读取文件夹...')
  } catch (e: any) {
    message.error('加载文件夹失败: ' + e.message)
  }
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

// 状态标签 T-040
function getStatus(status: string): 'processing' | 'success' | 'error' | 'waiting' {
  const map: Record<string, any> = {
    pending: 'waiting',
    converting: 'processing',
    completed: 'success',
    failed: 'error',
  }
  return map[status] || 'waiting'
}

function getStatusLabel(status: string): string {
  const map: Record<string, string> = {
    pending: '等待',
    converting: '转换中',
    completed: '完成',
    failed: '失败',
  }
  return map[status] || '等待'
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
  <div class="convert-view">
    <div class="layout-container">

      <!-- ================= 左侧 控制面板 ================= -->
      <div class="left-panel">
        <GlassCard radius="lg" padding="24px" class="control-card">
          <div class="panel-header">
            <NIcon size="24" class="header-icon"><DocumentTextOutline /></NIcon>
            <h2 class="header-title">文档转换</h2>
          </div>

          <p class="page-desc">支持 Word / PPT / PDF / Markdown / HTML 格式互转</p>

          <div class="form-group" style="margin-top: 24px">
            <label class="form-label">源格式</label>
            <NSelect
              :value="store.sourceFormat"
              :options="sourceOptions"
              size="large"
              placeholder="选择源格式"
              @update:value="handleSourceChange"
            />
          </div>

          <div class="form-group">
            <label class="form-label">目标格式</label>
            <NSelect
              :value="store.targetFormat"
              :options="getTargetOptions()"
              size="large"
              placeholder="选择目标格式"
              @update:value="handleTargetChange"
            />
          </div>

          <!-- LibreOffice 警告 -->
          <div v-if="store.needsLibreOffice && store.loInstalled === false" class="lo-warning-box">
            <NIcon :component="AlertCircleOutline" :size="18" class="warning-icon" />
            <div class="warning-content">
              <span>此转换需要 LibreOffice 排版引擎</span>
              <a href="#" @click.prevent="showLoModal = true" class="warning-link">查看安装指引</a>
            </div>
          </div>

          <!-- 占位填充 -->
          <div class="spacer"></div>

          <!-- 输出目录 -->
          <div class="form-group output-dir-group" @click="store.selectOutputDir">
            <div class="dir-icon"><NIcon :component="FolderOpenOutline" :size="18"/></div>
            <div class="dir-details">
              <span class="dir-label">输出目录</span>
              <NEllipsis class="dir-path" :tooltip="{ width: 300 }">
                {{ store.outputDir || '默认：源文件同目录' }}
              </NEllipsis>
            </div>
            <div class="dir-action">更改</div>
          </div>

          <!-- 操作按钮 -->
          <div class="action-footer">
            <NButton
              v-if="!store.isConverting"
              type="primary"
              size="large"
              block
              class="btn-glow"
              :disabled="store.files.length === 0"
              @click="handleStart"
            >
              <template #icon><NIcon><PlayOutline /></NIcon></template>
              开始转换
            </NButton>
            <NButton
              v-else
              type="warning"
              size="large"
              block
              @click="store.cancelConvert"
            >
              取消转换 ({{ store.files.filter(f => f.status === 'completed' || f.status === 'failed').length }}/{{ store.files.length }})
            </NButton>
          </div>
        </GlassCard>
      </div>

      <!-- ================= 右侧 文件列表 ================= -->
      <div class="right-panel">
        <GlassCard radius="lg" padding="0" class="list-card" style="display: flex; flex-direction: column; overflow: hidden; height: 100%">
          
          <div class="list-header" v-if="store.files.length > 0">
            <div style="display: flex; align-items: center; gap: 8px">
              <div class="list-title">待处理文件 ({{ store.files.length }})</div>
              <!-- T-040 -->
              <PillBadge v-if="store.isConverting" status="processing" label="正在转换..." />
            </div>
            <div class="list-actions">
              <NButton text type="primary" size="small" @click="handleSelectFiles" class="hover-lift">
                <template #icon><NIcon><DocumentOutline /></NIcon></template>
                添加文件
              </NButton>
              <NButton text type="primary" size="small" @click="handleSelectFolder" class="hover-lift" style="margin-left: 12px">
                <template #icon><NIcon><FolderOpenOutline /></NIcon></template>
                添加文件夹
              </NButton>
              <NButton text type="error" size="small" @click="store.clearFiles" :disabled="store.isConverting" style="margin-left: 16px" class="hover-lift">
                清空列表
              </NButton>
            </div>
          </div>

          <div class="list-content">
            <!-- 列表区 -->
            <div v-if="store.files.length > 0" class="file-items-scroll">
              <TransitionGroup name="list" tag="div">
                <div
                  v-for="file in store.files"
                  :key="file.id"
                  class="file-item"
                  :class="file.status"
                >
                  <div class="file-info">
                    <NIcon
                      :size="18"
                      :component="
                        file.status === 'completed' ? CheckmarkCircleOutline
                        : file.status === 'failed' ? AlertCircleOutline
                        : DocumentOutline
                      "
                      :color="
                        file.status === 'completed' ? 'var(--success)'
                        : file.status === 'failed' ? 'var(--error)'
                        : 'var(--text-secondary)'
                      "
                    />
                    <NEllipsis class="file-name" :tooltip="{ width: 360 }">
                      {{ file.name }}
                    </NEllipsis>
                  </div>

                  <div class="file-meta">
                    <PillBadge :status="getStatus(file.status)" :label="getStatusLabel(file.status)" />
                    
                    <NTooltip v-if="file.error" trigger="hover">
                      <template #trigger>
                        <NIcon :component="InformationCircleOutline" color="var(--error)" :size="16" style="cursor: help; margin-left: 4px;" />
                      </template>
                      {{ file.error }}
                    </NTooltip>
                    
                    <NButton
                      v-if="file.status === 'completed' && file.outputPath"
                      text
                      type="primary"
                      size="small"
                      @click.stop="handlePreview(file)"
                      style="margin-left: 8px"
                    >
                      <NIcon :component="EyeOutline" :size="16" />
                    </NButton>
                    
                    <NButton
                      text
                      type="error"
                      size="small"
                      @click.stop="store.removeFile(file.id)"
                      :disabled="store.isConverting"
                      style="margin-left: 8px"
                    >
                      <NIcon :component="TrashOutline" :size="16" />
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
              </TransitionGroup>

              <!-- 结果统计层 -->
              <div v-if="store.batchResult" class="batch-result">
                <NResult
                  :status="store.batchResult.failed === 0 ? 'success' : 'warning'"
                  :title="store.batchResult.failed === 0 ? '全部分配完成' : '部分转换完成'"
                  :description="`成功 ${store.batchResult.completed} 个，失败 ${store.batchResult.failed} 个`"
                >
                  <template #footer>
                    <NSpace justify="center">
                      <NButton type="primary" @click="store.openOutputDir">
                        <template #icon><NIcon><OpenOutline /></NIcon></template>
                        打开输出目录
                      </NButton>
                      <NButton @click="store.clearFiles">新一轮转换</NButton>
                    </NSpace>
                  </template>
                </NResult>
              </div>
            </div>

            <!-- EmptyState T-039 -->
            <EmptyState
              v-else
              icon="📄"
              title="文档格式互转"
              :description="`当前期望输入: ${store.FORMAT_LABELS[store.sourceFormat]} 格式文件。直接拖拽到窗口即可。`"
            >
              <template #action>
                <div style="display: flex; gap: 12px; justify-content: center">
                  <NButton @click="handleSelectFiles" type="primary" size="large" class="btn-glow">
                    <template #icon><NIcon><DocumentOutline /></NIcon></template>
                    选择文件
                  </NButton>
                </div>
              </template>
            </EmptyState>

          </div>
        </GlassCard>
      </div>

    </div>

    <!-- LibreOffice 安装弹窗 -->
    <NModal v-model:show="showLoModal" preset="dialog" title="需要环境支持">
      <div class="lo-modal-body">
        <p>当前转换需要 <strong>LibreOffice</strong> 作为排版引擎才能高质量完成转换。</p>
        <div style="padding: 12px; background: rgba(0,0,0,0.05); border-radius: 8px; margin: 12px 0;">
          <a href="https://www.libreoffice.org/download" target="_blank" style="color: var(--primary); text-decoration: none; display: flex; align-items: center; gap: 6px; font-weight: 600">
            <NIcon><OpenOutline /></NIcon> 前往 LibreOffice 官网下载
          </a>
        </div>
        <p style="font-size: 0.85em; color: var(--text-secondary)">安装完成后无需重启应用，直接点击下方「重试」即可重新检测。</p>
      </div>
      <template #action>
        <NSpace>
          <NButton @click="showLoModal = false">暂不处理</NButton>
          <NButton type="primary" @click="store.checkLibreOffice().then(() => { if (store.loInstalled) { showLoModal = false; message.success('环境就绪，可开始转换') } else { message.error('仍未检测到 LibreOffice 环境，请确认已完成安装') } })">
            我已经安装，重试检测
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
}

.panel-header {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-bottom: 8px;
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

.page-desc {
  margin: 0 0 16px;
  font-size: 0.85em;
  color: var(--text-secondary);
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

/* LO 警告框 */
.lo-warning-box {
  display: flex;
  align-items: flex-start;
  gap: 8px;
  padding: 12px;
  background: var(--warning-light, rgba(255, 152, 0, 0.15));
  border: 1px dashed var(--warning, #ff9800);
  border-radius: var(--radius-sm);
  margin-bottom: 16px;
}

.warning-icon {
  color: var(--warning, #ff9800);
  margin-top: 2px;
}

.warning-content {
  font-size: 0.85em;
  color: var(--text-main);
  line-height: 1.5;
}

.warning-link {
  color: var(--warning, #ff9800);
  font-weight: 600;
  text-decoration: underline;
  margin-left: 4px;
}

/* 输出目录选择框 */
.output-dir-group {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 12px;
  background: var(--bg-body);
  border: 1px solid var(--border-light);
  border-radius: var(--radius-sm);
  cursor: pointer;
  transition: all 0.2s;
}
.output-dir-group:hover {
  border-color: var(--accent);
  background: var(--bg-card-hover);
}

.dir-icon {
  color: var(--text-secondary);
}

.dir-details {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
}

.dir-label {
  font-size: 0.75em;
  font-weight: 600;
  color: var(--text-muted);
}

.dir-path {
  font-size: 0.9em;
  color: var(--text-main);
  font-weight: 500;
}

.dir-action {
  font-size: 0.85em;
  color: var(--primary);
  font-weight: 600;
}

.spacer {
  flex: 1;
}

.action-footer {
  margin-top: 20px;
}

/* 右侧面板 */
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
  overflow: hidden;
  position: relative;
  display: flex;
  flex-direction: column;
}

.file-items-scroll {
  flex: 1;
  overflow-y: auto;
  padding: 12px 16px;
}

/* 独立文件列表项 T-040 */
.file-item {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  justify-content: space-between;
  padding: 14px 16px;
  background: var(--bg-card);
  border: 1px solid var(--border-light);
  border-radius: var(--radius-md);
  margin-bottom: 8px;
  position: relative;
  transition: all var(--duration-fast);
}

.file-item:hover {
  background: var(--bg-card-hover);
  border-color: var(--accent);
  transform: translateY(-1px);
}

.file-item.completed {
  border-left: 4px solid var(--success);
}
.file-item.failed {
  border-left: 4px solid var(--error);
}

.file-info {
  display: flex;
  align-items: center;
  gap: 12px;
  flex: 1;
  min-width: 0;
}

.file-name {
  font-size: 0.95em;
  font-weight: 500;
  color: var(--text-main);
}

.file-meta {
  display: flex;
  align-items: center;
  gap: 8px;
  flex-shrink: 0;
}

.file-progress {
  width: 100%;
  margin-top: 10px;
}

.batch-result {
  margin-top: 24px;
  padding: 24px;
  background: var(--bg-body);
  border-radius: var(--radius-md);
  border: 1px solid var(--border-light);
}
</style>
