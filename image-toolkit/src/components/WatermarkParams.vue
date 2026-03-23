<script setup lang="ts">
/**
 * 高级感定制化水印参数面板
 * T-011, T-016
 */
import { computed } from 'vue'
import {
  NInput,
  NSlider,
  NSwitch,
  NInputNumber,
  NButton,
  NIcon,
  NTooltip,
} from 'naive-ui'
import { FolderOpenOutline } from '@vicons/ionicons5'

export interface WatermarkSettings {
  type: 'text' | 'image'
  text: string
  fontSize: number
  color: string
  opacity: number
  rotation: number
  position: string
  positionX: number  // 0~1 自由坐标 X
  positionY: number  // 0~1 自由坐标 Y
  tileMode: boolean
  tileSpacing: number
  offsetX: number
  offsetY: number
  scale: number
  adaptive: boolean
  outputSuffix: string
  watermarkPath: string | null
}

const props = defineProps<{
  modelValue: WatermarkSettings
}>()

const emit = defineEmits<{
  'update:modelValue': [value: WatermarkSettings]
  'selectWatermarkImage': []
}>()

const settings = computed({
  get: () => props.modelValue,
  set: (val) => emit('update:modelValue', val),
})

function update(key: keyof WatermarkSettings, value: any) {
  emit('update:modelValue', { ...props.modelValue, [key]: value })
}

// 预设颜色
const colorPresets = [
  { label: '白', value: '#FFFFFF' },
  { label: '黑', value: '#1C1C1E' },
  { label: '红', value: '#FF3B30' },
  { label: '灰', value: '#8E8E93' },
  { label: '蓝', value: '#007AFF' },
  { label: '绿', value: '#34C759' },
]

// 九宫格快捷预设
const positionPresets = [
  { key: 'top-left', label: '↖', x: 0.1, y: 0.1 },
  { key: 'top-center', label: '↑', x: 0.5, y: 0.1 },
  { key: 'top-right', label: '↗', x: 0.9, y: 0.1 },
  { key: 'center-left', label: '←', x: 0.1, y: 0.5 },
  { key: 'center', label: '●', x: 0.5, y: 0.5 },
  { key: 'center-right', label: '→', x: 0.9, y: 0.5 },
  { key: 'bottom-left', label: '↙', x: 0.1, y: 0.9 },
  { key: 'bottom-center', label: '↓', x: 0.5, y: 0.9 },
  { key: 'bottom-right', label: '↘', x: 0.9, y: 0.9 },
]

function applyPreset(preset: typeof positionPresets[0]) {
  emit('update:modelValue', {
    ...props.modelValue,
    position: preset.key,
    positionX: preset.x,
    positionY: preset.y,
  })
}
</script>

<template>
  <div class="premium-watermark-params">
    
    <!-- 类型分段控制器 (Segmented Control) -->
    <div class="segment-control-wrapper">
      <div class="segment-control">
        <div 
          class="segment-slider" 
          :class="{ 'slider-right': settings.type === 'image' }"
        ></div>
        <div 
          class="segment-item" 
          :class="{ active: settings.type === 'text' }"
          @click="update('type', 'text')"
        >
          <span class="segment-text">文字水印</span>
        </div>
        <div 
          class="segment-item" 
          :class="{ active: settings.type === 'image' }"
          @click="update('type', 'image')"
        >
          <span class="segment-text">图片水印</span>
        </div>
      </div>
    </div>

    <!-- 基础内容组 -->
    <div class="param-group">
      <div class="group-title">基础内容</div>
      
      <template v-if="settings.type === 'text'">
        <div class="param-row">
          <NInput
            :value="settings.text"
            @update:value="v => update('text', v)"
            placeholder="输入您要添加的水印文字..."
            size="small"
            class="premium-input"
          />
        </div>
      </template>

      <template v-else>
        <div class="param-row file-upload-row">
          <div class="file-display">
            <span v-if="settings.watermarkPath" class="file-name" :title="settings.watermarkPath">
              {{ settings.watermarkPath.split(/[\\/]/).pop() }}
            </span>
            <span v-else class="file-placeholder">尚未选择图片的 png/jpg 文件</span>
          </div>
          <NButton size="tiny" type="primary" secondary @click="$emit('selectWatermarkImage')">
            <template #icon><NIcon :component="FolderOpenOutline" /></template>选择
          </NButton>
        </div>
      </template>
    </div>

    <!-- 外观样式组 -->
    <div class="param-group">
      <div class="group-title">外观样式</div>

      <template v-if="settings.type === 'text'">
        <div class="param-row slider-row">
          <div class="label-box">
            <span>字体大小</span>
            <NInputNumber
              :value="settings.fontSize"
              @update:value="v => update('fontSize', v || 12)"
              size="tiny"
              :min="12" :max="120" :step="1"
              :style="{ width: '72px' }"
              :show-button="false"
            >
              <template #suffix>px</template>
            </NInputNumber>
          </div>
          <NSlider :value="settings.fontSize" @update:value="v => update('fontSize', v)" :min="12" :max="120" :step="1" />
        </div>
        <div class="param-row">
          <div class="label-box" style="margin-bottom: 8px;">
            <span>文字颜色</span>
          </div>
          <div class="color-presets">
            <div
              v-for="c in colorPresets" :key="c.value"
              class="premium-color-swatch"
              :class="{ active: settings.color === c.value }"
              :style="{ backgroundColor: c.value }"
              :title="c.label"
              @click="update('color', c.value)"
            />
          </div>
        </div>
      </template>

      <template v-else>
        <div class="param-row slider-row">
          <div class="label-box">
            <span>缩放比例</span>
            <NInputNumber
              :value="settings.scale"
              @update:value="v => update('scale', v || 5)"
              size="tiny"
              :min="5" :max="50" :step="1"
              :style="{ width: '68px' }"
              :show-button="false"
            >
              <template #suffix>%</template>
            </NInputNumber>
          </div>
          <NSlider :value="settings.scale" @update:value="v => update('scale', v)" :min="5" :max="50" :step="1" />
        </div>
      </template>

      <div class="param-row slider-row" style="margin-top: 16px;">
        <div class="label-box">
          <span>透明度</span>
          <NInputNumber
            :value="settings.opacity"
            @update:value="v => update('opacity', v ?? 0)"
            size="tiny"
            :min="0" :max="100" :step="1"
            :style="{ width: '68px' }"
            :show-button="false"
          >
            <template #suffix>%</template>
          </NInputNumber>
        </div>
        <NSlider :value="settings.opacity" @update:value="v => update('opacity', v)" :min="0" :max="100" :step="1" />
      </div>

      <div class="param-row slider-row" style="margin-top: 16px;">
        <div class="label-box">
          <span>旋转角度</span>
          <NInputNumber
            :value="settings.rotation"
            @update:value="v => update('rotation', v ?? 0)"
            size="tiny"
            :min="-180" :max="180" :step="1"
            :style="{ width: '68px' }"
            :show-button="false"
          >
            <template #suffix>°</template>
          </NInputNumber>
        </div>
        <NSlider :value="settings.rotation" @update:value="v => update('rotation', v)" :min="-180" :max="180" :step="1" />
      </div>
    </div>

    <!-- 布局与位置组 -->
    <div class="param-group">
      <div class="group-title">布局与位置</div>

      <!-- 拖拽提示 + 坐标显示 -->
      <div class="drag-hint-row" :class="{ disabled: settings.tileMode }">
        <div class="drag-hint-icon">🔄</div>
        <div class="drag-hint-text">
          <span v-if="!settings.tileMode">在预览区拖拽水印即可定位</span>
          <span v-else style="opacity: 0.5">平铺模式无需定位</span>
        </div>
        <div class="coord-badge" v-if="!settings.tileMode">
          {{ Math.round(settings.positionX * 100) }}%, {{ Math.round(settings.positionY * 100) }}%
        </div>
      </div>

      <!-- 快捷预设 -->
      <div class="preset-row" v-if="!settings.tileMode">
        <span class="preset-label">快捷</span>
        <div class="preset-grid">
          <div
            v-for="p in positionPresets" :key="p.key"
            class="preset-dot"
            :class="{ active: settings.position === p.key }"
            :title="p.key"
            @click="applyPreset(p)"
          >
            <span class="preset-dot-inner"></span>
          </div>
        </div>
      </div>

      <div class="tile-mode-row" style="margin-top: 12px;">
        <span class="control-pair-label">满屏平铺</span>
        <NSwitch :value="settings.tileMode" @update:value="v => update('tileMode', v)" size="small" />
      </div>

      <div class="param-row slider-row" v-if="settings.tileMode" style="margin-top: 12px;">
        <div class="label-box">
          <span>平铺间距</span>
          <span class="value-text">{{ settings.tileSpacing }}px</span>
        </div>
        <NSlider :value="settings.tileSpacing" @update:value="v => update('tileSpacing', v)" :min="50" :max="500" :step="10" />
      </div>
    </div>

    <!-- 高级与输出组 -->
    <div class="param-group">
      <div class="group-title">高级选项</div>
      
      <div class="advanced-row output-row">
        <span>文件名后缀</span>
        <NInput
          :value="settings.outputSuffix"
          @update:value="v => update('outputSuffix', v)"
          size="small"
          style="width: 120px;"
          placeholder="_watermark"
        />
      </div>

      <div class="advanced-row">
        <NTooltip placement="left">
          <template #trigger>
            <span style="border-bottom: 1px dashed var(--text-muted); cursor: help;">按图片比例自适应大小</span>
          </template>
          开启后，无论图片长宽如何，水印比例视觉观感始终一致
        </NTooltip>
        <NSwitch :value="settings.adaptive" @update:value="v => update('adaptive', v)" size="small" />
      </div>
    </div>

  </div>
</template>

<style scoped>
.premium-watermark-params {
  padding: 16px;
  display: flex;
  flex-direction: column;
  background: var(--bg-card, #ffffff);
}

/* === 分段控制器 (Apple Style Segmented Control) === */
.segment-control-wrapper {
  margin-bottom: 24px;
}
.segment-control {
  position: relative;
  display: flex;
  background-color: var(--bg-body, #f4f5f7);
  border-radius: 8px;
  padding: 3px;
  box-shadow: inset 0 1px 3px rgba(0,0,0,0.06);
}
.segment-slider {
  position: absolute;
  top: 3px;
  bottom: 3px;
  left: 3px;
  width: calc(50% - 3px);
  background: #ffffff;
  border-radius: 6px;
  box-shadow: 0 1px 4px rgba(0,0,0,0.08), 0 1px 1px rgba(0,0,0,0.04);
  transition: transform 0.25s cubic-bezier(0.2, 0.8, 0.2, 1);
  z-index: 1;
}
.segment-slider.slider-right {
  transform: translateX(100%);
}
.segment-item {
  flex: 1;
  text-align: center;
  padding: 6px 0;
  cursor: pointer;
  position: relative;
  z-index: 2;
  font-size: 13px;
  font-weight: 500;
  color: var(--text-secondary, #666);
  transition: color 0.2s;
}
.segment-item.active {
  color: var(--text-primary, #111);
}
.segment-text {
  user-select: none;
}

/* === 分组样式 === */
.param-group {
  margin-bottom: 24px;
  position: relative;
}
.param-group:last-child {
  margin-bottom: 0;
}
.param-group::after {
  content: '';
  position: absolute;
  bottom: -12px;
  left: 0;
  right: 0;
  height: 1px;
  background: var(--border-light, #f0f0f0);
}
.param-group:last-child::after {
  display: none;
}
.group-title {
  font-size: 12px;
  font-weight: 600;
  color: var(--text-muted, #999);
  text-transform: uppercase;
  letter-spacing: 0.5px;
  margin-bottom: 12px;
}

/* === 表单行 === */
.premium-input {
  background: var(--bg-body, #f9f9f9);
}
.file-upload-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  background: var(--bg-body, #f9f9f9);
  padding: 6px 8px 6px 12px;
  border-radius: 6px;
  border: 1px solid var(--border-light, #e8e8e8);
}
.file-display {
  flex: 1;
  overflow: hidden;
  font-size: 12px;
}
.file-name {
  color: var(--text-primary);
  font-weight: 500;
  white-space: nowrap;
  text-overflow: ellipsis;
  overflow: hidden;
  display: block;
}
.file-placeholder {
  color: var(--text-muted);
}

/* === 滑块与标签 === */
.slider-row {
  display: flex;
  flex-direction: column;
  gap: 4px;
}
.label-box {
  display: flex;
  justify-content: space-between;
  align-items: center;
  font-size: 13px;
  color: var(--text-primary);
  font-weight: 500;
}
.value-text {
  color: var(--accent, #18a058);
  font-variant-numeric: tabular-nums;
  font-size: 13px;
  font-weight: 600;
  background: var(--accent-light, #eaf5ee);
  border-radius: 4px;
  padding: 1px 6px;
}

/* === 高级感色板 === */
.color-presets {
  display: flex;
  gap: 10px;
}
.premium-color-swatch {
  width: 24px;
  height: 24px;
  border-radius: 50%;
  cursor: pointer;
  position: relative;
  transition: transform 0.2s cubic-bezier(0.34, 1.56, 0.64, 1);
  box-shadow: inset 0 0 0 1px rgba(0,0,0,0.1);
}
.premium-color-swatch::after {
  content: '';
  position: absolute;
  top: -4px;
  left: -4px;
  right: -4px;
  bottom: -4px;
  border: 2px solid transparent;
  border-radius: 50%;
  transition: border-color 0.2s;
}
.premium-color-swatch:hover {
  transform: scale(1.1);
}
.premium-color-swatch.active::after {
  border-color: var(--accent, #18a058);
}

/* === 拖拽提示行 === */
.drag-hint-row {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 10px 12px;
  background: var(--bg-body, #f9f9f9);
  border-radius: 8px;
  border: 1px dashed var(--border-light, #ddd);
  transition: opacity 0.2s;
}
.drag-hint-row.disabled {
  opacity: 0.5;
}
.drag-hint-icon {
  font-size: 16px;
}
.drag-hint-text {
  flex: 1;
  font-size: 12px;
  color: var(--text-secondary);
}
.coord-badge {
  font-size: 11px;
  font-weight: 600;
  color: var(--accent, #18a058);
  background: var(--accent-light, #eaf5ee);
  padding: 2px 8px;
  border-radius: 10px;
  font-variant-numeric: tabular-nums;
}

/* === 快捷预设点阵 === */
.preset-row {
  display: flex;
  align-items: center;
  gap: 10px;
  margin-top: 12px;
}
.preset-label {
  font-size: 12px;
  color: var(--text-muted);
  flex-shrink: 0;
}
.preset-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  grid-template-rows: repeat(3, 1fr);
  gap: 5px;
  width: 60px;
  height: 44px;
  background: var(--bg-body, #f4f5f7);
  border-radius: 8px;
  padding: 6px;
}
.preset-dot {
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
}
.preset-dot-inner {
  width: 6px;
  height: 6px;
  border-radius: 50%;
  background: var(--text-muted, #ccc);
  transition: all 0.15s;
}
.preset-dot:hover .preset-dot-inner {
  background: var(--text-secondary);
  transform: scale(1.4);
}
.preset-dot.active .preset-dot-inner {
  background: var(--accent, #18a058);
  width: 8px;
  height: 8px;
  box-shadow: 0 0 0 2px rgba(24, 160, 88, 0.2);
}
.tile-mode-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  background: var(--bg-body, #f9f9f9);
  padding: 6px 8px;
  border-radius: 6px;
  border: 1px solid var(--border-light, #e8e8e8);
}
.tile-mode-row .control-pair-label {
  margin-bottom: 0;
  color: var(--text-primary);
}

/* === 输出高级选项 === */
.advanced-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  font-size: 13px;
  color: var(--text-secondary);
  padding: 8px 0;
}
.output-row {
  color: var(--text-primary);
  font-weight: 500;
}
</style>
