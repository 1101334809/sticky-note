<script setup lang="ts">
/**
 * OutputDirPicker — 输出目录选择器
 *
 * 显示当前输出路径，支持选择和重置。路径通过 settingsStore 持久化。
 * T-015
 */
import { NButton, NIcon, NTooltip, NInput } from 'naive-ui'
import { FolderOpenOutline, RefreshOutline } from '@vicons/ionicons5'
import { useSettingsStore } from '../stores/settings.store'
import { computed } from 'vue'

const props = defineProps<{
  /** 默认输出路径（通常为源文件目录） */
  defaultDir?: string
}>()

const settingsStore = useSettingsStore()

const displayPath = computed(() =>
  settingsStore.outputDir || props.defaultDir || '源文件同目录'
)

const currentDir = computed(() =>
  settingsStore.outputDir || props.defaultDir || null
)

async function selectDir() {
  const dir = await window.ipcRenderer.invoke('dialog:saveDir')
  if (dir) {
    await settingsStore.setOutputDir(dir)
  }
}

async function resetDir() {
  await settingsStore.setOutputDir(null)
}

defineExpose({ currentDir })
</script>

<template>
  <div class="output-dir-picker">
    <span class="label">输出至:</span>
    <NTooltip>
      <template #trigger>
        <NInput
          :value="displayPath"
          readonly
          size="small"
          placeholder="源文件同目录"
          style="max-width: 200px; cursor: pointer"
          @click="selectDir"
        />
      </template>
      {{ displayPath }}
    </NTooltip>
    <NTooltip>
      <template #trigger>
        <NButton size="tiny" quaternary @click="selectDir">
          <template #icon>
            <NIcon><FolderOpenOutline /></NIcon>
          </template>
        </NButton>
      </template>
      选择输出目录
    </NTooltip>
    <NTooltip v-if="settingsStore.outputDir">
      <template #trigger>
        <NButton size="tiny" quaternary @click="resetDir">
          <template #icon>
            <NIcon><RefreshOutline /></NIcon>
          </template>
        </NButton>
      </template>
      重置为默认（源文件同目录）
    </NTooltip>
  </div>
</template>

<style scoped>
.output-dir-picker {
  display: flex;
  align-items: center;
  gap: 4px;
}
.label {
  color: var(--text-secondary);
  font-size: 0.8em;
  white-space: nowrap;
}
</style>
