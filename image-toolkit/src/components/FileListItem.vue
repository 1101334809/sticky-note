<script setup lang="ts">
/**
 * FileListItem — 单文件行组件
 *
 * 显示文件名/大小/格式标签/状态/进度条/删除按钮
 * T-011
 */
import { computed } from 'vue'
import { NTag, NProgress, NIcon, NTooltip } from 'naive-ui'
import { CloseOutline, RefreshOutline } from '@vicons/ionicons5'
import type { FileEntry } from '../stores/file.store'

const props = withDefaults(defineProps<{
  file: FileEntry
  showDelete?: boolean
  showProgress?: boolean
  selectable?: boolean
}>(), {
  showDelete: true,
  showProgress: false,
  selectable: false,
})

const emit = defineEmits<{
  remove: [path: string]
  select: [path: string]
  preview: [file: FileEntry]
  retry: [file: FileEntry]
}>()

/** 格式化文件大小 */
function formatSize(bytes: number): string {
  if (bytes === 0) return '0 B'
  if (bytes < 1024) return bytes + ' B'
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB'
  return (bytes / (1024 * 1024)).toFixed(1) + ' MB'
}

/** 格式 → 颜色标签映射 */
const tagType = computed(() => {
  const map: Record<string, 'info' | 'success' | 'warning' | 'error'> = {
    SVG: 'info',
    PNG: 'info',
    JPG: 'warning',
    JPEG: 'warning',
    WEBP: 'success',
    GIF: 'success',
    AVIF: 'info',
    TIFF: 'warning',
    TIF: 'warning',
  }
  return map[props.file.type] || 'info'
})

const statusText = computed(() => {
  switch (props.file.status) {
    case 'processing': return '处理中…'
    case 'success': return props.file.result
      ? `→ ${formatSize(props.file.result.outputSize)} (省 ${props.file.result.savedPercent}%)`
      : '✓ 完成'
    case 'error': return '失败'
    default: return ''
  }
})
</script>

<template>
  <div
    class="file-list-item"
    :class="{
      'is-selected': file.selected,
      'is-error': file.status === 'error',
      'is-success': file.status === 'success',
    }"
    @click="selectable && emit('select', file.path)"
  >
    <!-- 选中角标 -->
    <div v-if="selectable && file.selected" class="select-badge">✓</div>

    <!-- 文件信息 -->
    <div class="file-info" @click.stop="emit('preview', file)">
      <div class="file-name">{{ file.name }}</div>
      <div class="file-meta">
        <NTag :type="tagType" size="tiny" round>{{ file.type }}</NTag>
        <span class="file-size">{{ formatSize(file.size) }}</span>
      </div>
    </div>

    <!-- 状态区 -->
    <div class="file-status">
      <!-- 进度条 -->
      <NProgress
        v-if="showProgress && file.status === 'processing'"
        type="line"
        :percentage="file.progress || 0"
        :show-indicator="false"
        :height="4"
        style="width: 80px"
      />
      <!-- 成功结果 + 柱状图 T-050 -->
      <div v-else-if="file.status === 'success'" class="status-success-area">
        <span class="status-success">{{ statusText }}</span>
        <!-- 迷你柱状图 -->
        <div v-if="file.result" class="size-chart">
          <div class="chart-bar chart-bar-original" :style="{ width: '100%' }">
            <span class="chart-label">原</span>
          </div>
          <div
            class="chart-bar chart-bar-output"
            :style="{ width: Math.max(5, 100 - (file.result.savedPercent || 0)) + '%' }"
          >
            <span class="chart-label">{{ file.result.savedPercent || 0 }}%</span>
          </div>
        </div>
      </div>
      <!-- 失败 + 重试 -->
      <template v-else-if="file.status === 'error'">
        <NTooltip>
          <template #trigger>
            <NTag type="error" size="small">失败</NTag>
          </template>
          {{ file.error || '未知错误' }}
        </NTooltip>
        <button class="retry-btn" @click.stop="emit('retry', file)" title="重试">
          <NIcon :size="14"><RefreshOutline /></NIcon>
        </button>
      </template>
    </div>

    <!-- 删除按钮 -->
    <button
      v-if="showDelete"
      class="delete-btn"
      @click.stop="emit('remove', file.path)"
      title="移除"
    >
      <NIcon :size="14"><CloseOutline /></NIcon>
    </button>
  </div>
</template>

<style scoped>
.file-list-item {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 10px 14px;
  background: var(--bg-card);
  border-radius: 8px;
  margin-bottom: 6px;
  position: relative;
  cursor: default;
  transition: background 0.2s ease, box-shadow 0.2s ease;
}
.file-list-item:hover {
  background: var(--bg-card-hover);
  box-shadow: var(--shadow-sm);
}
.file-list-item.is-selected {
  background: var(--accent-light);
  border: 1px solid var(--accent);
}
.file-list-item.is-success {
  border-left: 3px solid var(--success);
}
.file-list-item.is-error {
  border-left: 3px solid var(--error);
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

/* 文件信息 */
.file-info {
  flex: 1;
  min-width: 0;
  cursor: pointer;
}
.file-name {
  color: var(--text-primary);
  font-size: 0.85em;
  font-weight: 500;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
.file-meta {
  display: flex;
  align-items: center;
  gap: 6px;
  margin-top: 2px;
}
.file-size {
  color: var(--text-muted);
  font-size: 0.7em;
}

/* 状态 */
.file-status {
  display: flex;
  align-items: center;
  gap: 6px;
  flex-shrink: 0;
}
.status-success-area {
  display: flex;
  align-items: center;
  gap: 8px;
}
.status-success {
  color: var(--success);
  font-size: 0.75em;
  white-space: nowrap;
}

/* T-050 迷你柱状图 */
.size-chart {
  display: flex;
  flex-direction: column;
  gap: 2px;
  width: 60px;
}
.chart-bar {
  height: 8px;
  border-radius: 4px;
  display: flex;
  align-items: center;
  justify-content: flex-end;
  padding-right: 2px;
  transition: width 0.4s ease;
}
.chart-bar-original {
  background: var(--text-muted);
  opacity: 0.3;
}
.chart-bar-output {
  background: var(--success);
  opacity: 0.8;
}
.chart-label {
  font-size: 0.55em;
  color: #fff;
  font-weight: 600;
  line-height: 1;
}

/* 重试按钮 */
.retry-btn {
  background: none;
  border: none;
  color: var(--accent);
  cursor: pointer;
  padding: 2px;
  display: flex;
  align-items: center;
  opacity: 0.7;
  transition: opacity 0.15s;
}
.retry-btn:hover {
  opacity: 1;
}

/* 删除按钮 */
.delete-btn {
  background: none;
  border: none;
  color: var(--text-muted);
  cursor: pointer;
  padding: 4px;
  display: flex;
  align-items: center;
  border-radius: 4px;
  opacity: 0;
  transition: opacity 0.15s, color 0.15s, background 0.15s;
}
.file-list-item:hover .delete-btn {
  opacity: 1;
}
.delete-btn:hover {
  color: var(--error);
  background: var(--error-light);
}
</style>
