<script setup lang="ts">
/**
 * FileList — 文件列表容器（虚拟列表 + TransitionGroup）
 *
 * T-012
 */
import { computed } from 'vue'
import FileListItem from './FileListItem.vue'
import type { FileEntry } from '../stores/file.store'

const props = withDefaults(defineProps<{
  files: FileEntry[]
  showDelete?: boolean
  showProgress?: boolean
  selectable?: boolean
  loading?: boolean
  emptyText?: string
  emptyIcon?: string
}>(), {
  showDelete: true,
  showProgress: false,
  selectable: false,
  loading: false,
  emptyText: '拖拽或点击选择文件',
  emptyIcon: '📁',
})

const emit = defineEmits<{
  remove: [path: string]
  select: [path: string]
  preview: [file: FileEntry]
  retry: [file: FileEntry]
  clickEmpty: []
}>()

const isEmpty = computed(() => props.files.length === 0)
</script>

<template>
  <div class="file-list-container">
    <!-- 空状态 -->
    <div v-if="isEmpty" class="file-list-empty" @click="emit('clickEmpty')">
      <div class="empty-icon">{{ emptyIcon }}</div>
      <p class="empty-text">{{ emptyText }}</p>
      <slot name="emptyHint" />
    </div>

    <!-- 骨架屏 T-052 -->
    <div v-else-if="loading" class="file-list-scroll">
      <div v-for="n in 3" :key="n" class="skeleton-item">
        <div class="skeleton-tag"></div>
        <div class="skeleton-lines">
          <div class="skeleton-line" style="width: 60%"></div>
          <div class="skeleton-line" style="width: 35%"></div>
        </div>
      </div>
    </div>

    <!-- 文件列表 -->
    <div v-else class="file-list-scroll">
      <TransitionGroup name="list" tag="div">
        <FileListItem
          v-for="file in files"
          :key="file.path"
          :file="file"
          :show-delete="showDelete"
          :show-progress="showProgress"
          :selectable="selectable"
          @remove="emit('remove', $event)"
          @select="emit('select', $event)"
          @preview="emit('preview', $event)"
          @retry="emit('retry', $event)"
        />
      </TransitionGroup>
    </div>
  </div>
</template>

<style scoped>
.file-list-container {
  flex: 1;
  min-height: 0;
  display: flex;
  flex-direction: column;
}

/* 空状态 */
.file-list-empty {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  border: 2px dashed var(--border-dashed);
  border-radius: 12px;
  margin: 16px;
  padding: 40px 20px;
  transition: border-color 0.2s, background 0.2s;
}
.file-list-empty:hover {
  border-color: var(--accent);
  background: var(--accent-light);
}
.empty-icon {
  font-size: 3em;
  margin-bottom: 12px;
  animation: float 3s ease-in-out infinite;
}
.empty-text {
  color: var(--text-muted);
  font-size: 0.9em;
}

@keyframes float {
  0%, 100% { transform: translateY(0); }
  50% { transform: translateY(-6px); }
}

/* 列表滚动 */
.file-list-scroll {
  flex: 1;
  overflow-y: auto;
  padding: 8px 16px;
}

/* T-052 骨架屏 */
.skeleton-item {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 12px 14px;
  background: var(--bg-card);
  border-radius: 8px;
  margin-bottom: 6px;
}
.skeleton-tag {
  width: 36px;
  height: 18px;
  background: var(--border-light);
  border-radius: 9px;
  animation: skeleton-pulse 1.5s ease-in-out infinite;
}
.skeleton-lines {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 4px;
}
.skeleton-line {
  height: 10px;
  background: var(--border-light);
  border-radius: 5px;
  animation: skeleton-pulse 1.5s ease-in-out infinite;
}
.skeleton-line:nth-child(2) {
  animation-delay: 0.2s;
}
@keyframes skeleton-pulse {
  0%, 100% { opacity: 0.4; }
  50% { opacity: 0.8; }
}
</style>
