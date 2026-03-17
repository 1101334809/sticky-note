<script setup lang="ts">
/**
 * ExportPngDialog — SVG 导出 PNG 设置弹窗
 *
 * 两种模式：倍率（1x/2x/3x 复选）/ 自定义像素（宽×高 + 锁定比例）
 * T-024
 */
import { ref, computed } from 'vue'
import {
  NModal, NButton, NIcon, NRadioGroup, NRadio, NCheckbox,
  NInputNumber, NTooltip, NSpace, useMessage,
} from 'naive-ui'
import { DownloadOutline, LockClosedOutline, LockOpenOutline } from '@vicons/ionicons5'
import OutputDirPicker from './OutputDirPicker.vue'
import { useSettingsStore } from '../stores/settings.store'

const props = defineProps<{
  visible: boolean
  /** 选中的 SVG 数量 */
  fileCount: number
}>()

const emit = defineEmits<{
  'update:visible': [value: boolean]
  export: [options: ExportOptions]
}>()

export interface ExportOptions {
  mode: 'scale' | 'custom'
  scales: number[]
  customWidth?: number
  customHeight?: number
  outputDir?: string
}

const message = useMessage()
const settingsStore = useSettingsStore()

const mode = ref<'scale' | 'custom'>('scale')
const scale1x = ref(true)
const scale2x = ref(true)
const scale3x = ref(false)
const customWidth = ref(256)
const customHeight = ref(256)
const lockRatio = ref(true)

const selectedScales = computed(() => {
  const s: number[] = []
  if (scale1x.value) s.push(1)
  if (scale2x.value) s.push(2)
  if (scale3x.value) s.push(3)
  return s
})

const canExport = computed(() => {
  if (mode.value === 'scale') return selectedScales.value.length > 0
  return customWidth.value > 0 && customHeight.value > 0
})

function handleWidthChange(val: number | null) {
  if (val && lockRatio.value) {
    customHeight.value = val
  }
  customWidth.value = val || 0
}

function handleHeightChange(val: number | null) {
  if (val && lockRatio.value) {
    customWidth.value = val
  }
  customHeight.value = val || 0
}

function handleExport() {
  if (!canExport.value) {
    message.warning('请至少选择一个导出选项')
    return
  }

  emit('export', {
    mode: mode.value,
    scales: mode.value === 'scale' ? selectedScales.value : [],
    customWidth: mode.value === 'custom' ? customWidth.value : undefined,
    customHeight: mode.value === 'custom' ? customHeight.value : undefined,
    outputDir: settingsStore.outputDir || undefined,
  })

  emit('update:visible', false)
}
</script>

<template>
  <NModal
    :show="visible"
    @update:show="emit('update:visible', $event)"
    preset="dialog"
    title="导出 PNG"
    :positive-text="undefined"
    :negative-text="undefined"
    style="max-width: 480px"
  >
    <div class="export-dialog">
      <p style="color: var(--text-secondary); font-size: 0.85em; margin-bottom: 16px">
        将 {{ fileCount }} 个 SVG 导出为 PNG 图片
      </p>

      <!-- 模式选择 -->
      <NRadioGroup v-model:value="mode" style="margin-bottom: 16px">
        <NSpace>
          <NRadio value="scale">倍率导出</NRadio>
          <NRadio value="custom">自定义尺寸</NRadio>
        </NSpace>
      </NRadioGroup>

      <!-- 倍率模式 -->
      <div v-if="mode === 'scale'" class="option-group">
        <NSpace>
          <NCheckbox v-model:checked="scale1x">1x 原始尺寸</NCheckbox>
          <NCheckbox v-model:checked="scale2x">2x @2x</NCheckbox>
          <NCheckbox v-model:checked="scale3x">3x @3x</NCheckbox>
        </NSpace>
      </div>

      <!-- 自定义尺寸模式 -->
      <div v-else class="option-group">
        <div style="display: flex; align-items: center; gap: 8px">
          <span style="color: var(--text-secondary); font-size: 0.85em">宽</span>
          <NInputNumber
            :value="customWidth"
            @update:value="handleWidthChange"
            :min="1"
            :max="4096"
            size="small"
            style="width: 100px"
          />
          <NTooltip>
            <template #trigger>
              <NButton
                size="tiny"
                quaternary
                @click="lockRatio = !lockRatio"
              >
                <template #icon>
                  <NIcon>
                    <LockClosedOutline v-if="lockRatio" />
                    <LockOpenOutline v-else />
                  </NIcon>
                </template>
              </NButton>
            </template>
            {{ lockRatio ? '已锁定比例' : '比例已解锁' }}
          </NTooltip>
          <span style="color: var(--text-secondary); font-size: 0.85em">高</span>
          <NInputNumber
            :value="customHeight"
            @update:value="handleHeightChange"
            :min="1"
            :max="4096"
            size="small"
            style="width: 100px"
          />
          <span style="color: var(--text-muted); font-size: 0.75em">px</span>
        </div>
      </div>

      <!-- 输出目录 -->
      <div style="margin-top: 16px">
        <OutputDirPicker />
      </div>

      <!-- 操作按钮 -->
      <div style="margin-top: 20px; display: flex; justify-content: flex-end; gap: 8px">
        <NButton size="small" @click="emit('update:visible', false)">取消</NButton>
        <NButton size="small" type="primary" @click="handleExport" :disabled="!canExport">
          <template #icon><NIcon><DownloadOutline /></NIcon></template>
          导出 {{ fileCount }} 个文件
        </NButton>
      </div>
    </div>
  </NModal>
</template>

<style scoped>
.export-dialog {
  padding: 8px 0;
}
.option-group {
  padding: 12px 16px;
  background: var(--bg-card);
  border-radius: 8px;
  border: 1px solid var(--border-light);
}
</style>
