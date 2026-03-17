<script setup lang="ts">
/**
 * Toolbar — 工具栏组件
 *
 * 显示文件计数、清空按钮，提供左右插槽供各模块自定义
 * T-013
 */
import { NButton, NIcon, NTooltip, NTag } from 'naive-ui'
import { TrashOutline } from '@vicons/ionicons5'

withDefaults(defineProps<{
  fileCount?: number
  selectedCount?: number
  isProcessing?: boolean
  showClear?: boolean
}>(), {
  fileCount: 0,
  selectedCount: 0,
  isProcessing: false,
  showClear: true,
})

const emit = defineEmits<{
  clear: []
}>()
</script>

<template>
  <div class="toolbar">
    <!-- 左侧自定义按钮 -->
    <div class="toolbar-left">
      <slot name="left" />
    </div>

    <!-- 中间信息 -->
    <div class="toolbar-center">
      <NTag v-if="fileCount > 0" size="small" round :bordered="false">
        共 {{ fileCount }} 个文件
        <template v-if="selectedCount > 0">
          · 已选 {{ selectedCount }}
        </template>
      </NTag>
    </div>

    <!-- 右侧按钮 -->
    <div class="toolbar-right">
      <slot name="right" />

      <NTooltip v-if="showClear && fileCount > 0">
        <template #trigger>
          <NButton
            size="small"
            quaternary
            :disabled="isProcessing"
            @click="emit('clear')"
          >
            <template #icon>
              <NIcon><TrashOutline /></NIcon>
            </template>
            清空
          </NButton>
        </template>
        清空文件列表 (Delete 删除选中 · Ctrl+Z 撤销)
      </NTooltip>
    </div>
  </div>
</template>

<style scoped>
.toolbar {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px 16px;
  border-bottom: 1px solid var(--border-light);
  min-height: 44px;
  flex-shrink: 0;
}
.toolbar-left {
  display: flex;
  align-items: center;
  gap: 6px;
}
.toolbar-center {
  flex: 1;
  display: flex;
  justify-content: center;
}
.toolbar-right {
  display: flex;
  align-items: center;
  gap: 6px;
}
</style>
