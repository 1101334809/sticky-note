<script setup lang="ts">
/**
 * 连点器页面 — 重构版
 *
 * T-043, T-044, T-045
 */
import { onMounted, onUnmounted, computed } from 'vue'
import {
  NSpace,
  NButton,
  NInputNumber,
  NSlider,
  NAlert,
  NGrid,
  NGi,
  NIcon,
} from 'naive-ui'
import {
  PlayOutline,
  StopOutline,
  HardwareChipOutline,
  LocateOutline,
  OptionsOutline,
  TimerOutline,
} from '@vicons/ionicons5'
import { useClickerStore } from '../stores/clicker.store'
import GlassCard from '../components/ui/GlassCard.vue'
import SegmentedControl from '../components/ui/SegmentedControl.vue'
import HotkeyDisplay from '../components/ui/HotkeyDisplay.vue'
import PillBadge from '../components/ui/PillBadge.vue'

const store = useClickerStore()

onMounted(() => {
  store.setupListeners()
  store.loadConfig()
})

onUnmounted(() => {
  store.removeListeners()
})

// ====== 计算属性 ======
const isRunning = computed(() => store.state !== 'idle')
const cpsDisplay = computed(() => {
  if (store.config.interval <= 0) return '0'
  return (1000 / store.config.interval).toFixed(1)
})

const buttonText = computed(() => {
  switch (store.state) {
    case 'countdown': return '倒计时中...'
    case 'running': return '停止连点'
    default: return '开始连点'
  }
})

const stateTag = computed(() => {
  switch (store.state) {
    case 'countdown': return { status: 'warning' as const, label: '倒计时' }
    case 'running': return { status: 'processing' as const, label: '运行中' }
    default: return { status: 'waiting' as const, label: '就绪' }
  }
})

// ====== 方法 ======
function handleToggle() {
  store.toggle()
}

function handleIntervalChange(val: number | null) {
  if (val !== null) {
    store.updateConfig({ interval: val })
    store.saveConfig()
  }
}

function handleButtonChange(val: string | number) {
  store.updateConfig({ button: val as any })
  store.saveConfig()
}

function handleClickTypeChange(val: string | number) {
  store.updateConfig({ clickType: val as any })
  store.saveConfig()
}

function handleMaxClicksChange(val: number | null) {
  store.updateConfig({ maxClicks: val || 0 })
  store.saveConfig()
}

function handlePositionModeChange(val: string | number) {
  store.updateConfig({ positionMode: val as any })
  store.saveConfig()
}

function handleFixedXChange(val: number | null) {
  store.updateConfig({
    fixedPosition: { ...store.config.fixedPosition, x: val || 0 },
  })
  store.saveConfig()
}

function handleFixedYChange(val: number | null) {
  store.updateConfig({
    fixedPosition: { ...store.config.fixedPosition, y: val || 0 },
  })
  store.saveConfig()
}

function handleDelayChange(val: number | null) {
  store.updateConfig({ startDelay: val || 0 })
  store.saveConfig()
}

// 选项
const buttonOptions = [
  { label: '左键', value: 'left' },
  { label: '中键', value: 'middle' },
  { label: '右键', value: 'right' },
]

const clickTypeOptions = [
  { label: '单击', value: 'single' },
  { label: '双击', value: 'double' },
]

const limitOptions = [
  { label: '无限', value: 'unlimited' },
  { label: '固定次数', value: 'limited' },
]

const positionOptions = [
  { label: '🖱️ 跟随鼠标', value: 'follow' },
  { label: '📍 固定坐标', value: 'fixed' },
]
</script>

<template>
  <div class="clicker-view">
    <div class="layout-container">

      <!-- ================= 左侧 状态面板 ================= -->
      <div class="left-panel">
        
        <GlassCard radius="lg" padding="24px" class="status-card" :class="{ running: isRunning }">
          <div class="panel-header">
            <NIcon size="24" :color="isRunning ? 'var(--error)' : 'var(--primary)'"><TimerOutline /></NIcon>
            <h2 class="header-title">运行状态</h2>
            <PillBadge :status="stateTag.status" :label="stateTag.label" style="margin-left: auto" />
          </div>

          <div class="stats-grid">
            <div class="stat-item">
              <div class="stat-label">已点击</div>
              <div class="stat-value">{{ store.clickCount }}<span class="stat-unit">次</span></div>
            </div>
            <div class="stat-item">
              <div class="stat-label">当前频率</div>
              <div class="stat-value">{{ cpsDisplay }}<span class="stat-unit">CPS</span></div>
            </div>
          </div>

          <div class="spacer"></div>

          <NAlert type="info" :bordered="false" class="hotkey-alert">
            <template #icon><NIcon><OptionsOutline /></NIcon></template>
            <div style="display:flex; flex-direction: column; gap: 8px;">
              <div class="hotkey-row">
                <span>启动/停止</span> <HotkeyDisplay :keys="['F6']" />
              </div>
              <div class="hotkey-row">
                <span>紧急停止</span> <HotkeyDisplay :keys="['Esc']" />
              </div>
            </div>
          </NAlert>

          <NButton
            class="toggle-btn btn-glow"
            :type="isRunning ? 'error' : 'primary'"
            size="large"
            block
            strong
            :disabled="store.state === 'countdown'"
            @click="handleToggle"
          >
            <template #icon>
              <NIcon size="20">
                <StopOutline v-if="isRunning" />
                <PlayOutline v-else />
              </NIcon>
            </template>
            {{ buttonText }}
          </NButton>

        </GlassCard>
      </div>

      <!-- ================= 右侧 配置面板 ================= -->
      <div class="right-panel">
        
        <!-- 点击配置 T-043 -->
        <GlassCard radius="lg" padding="20px">
          <div class="card-title">
            <NIcon size="18" class="title-icon"><HardwareChipOutline /></NIcon>
            点击参数
          </div>

          <NSpace vertical :size="24">
            
            <!-- 点击间隔 -->
            <div class="setting-group">
              <div class="setting-label">执行频率 (间隔 ms)</div>
              <NGrid :cols="24" :x-gap="16" class="setting-content">
                <NGi :span="16" style="display:flex; align-items:center;">
                  <NSlider
                    :value="store.config.interval"
                    :min="20"
                    :max="5000"
                    :step="10"
                    :disabled="isRunning"
                    @update:value="handleIntervalChange"
                  />
                </NGi>
                <NGi :span="8">
                  <NInputNumber
                    :value="store.config.interval"
                    :min="20"
                    :max="5000"
                    :step="10"
                    :disabled="isRunning"
                    @update:value="handleIntervalChange"
                  >
                    <template #suffix>ms</template>
                  </NInputNumber>
                </NGi>
              </NGrid>
            </div>

            <div class="divider"></div>

            <NGrid :cols="2" :x-gap="24">
              <NGi>
                <!-- 按键选择 T-044 -->
                <div class="setting-group">
                  <div class="setting-label">触发按键</div>
                  <SegmentedControl
                    :modelValue="store.config.button"
                    :options="buttonOptions"
                    :disabled="isRunning"
                    @update:modelValue="handleButtonChange"
                    block
                  />
                </div>
              </NGi>
              <NGi>
                <!-- 点击方式 T-044 -->
                <div class="setting-group">
                  <div class="setting-label">点击模式</div>
                  <SegmentedControl
                    :modelValue="store.config.clickType"
                    :options="clickTypeOptions"
                    :disabled="isRunning"
                    @update:modelValue="handleClickTypeChange"
                    block
                  />
                </div>
              </NGi>
            </NGrid>

            <div class="divider"></div>

            <!-- 次数限制 -->
            <div class="setting-group">
              <div class="setting-label flex-between">
                <span>执行次数限制</span>
                <SegmentedControl
                  :modelValue="store.config.maxClicks === 0 ? 'unlimited' : 'limited'"
                  :options="limitOptions"
                  :disabled="isRunning"
                  @update:modelValue="(v: string | number) => handleMaxClicksChange(v === 'unlimited' ? 0 : 100)"
                  size="small"
                />
              </div>
              <div v-if="store.config.maxClicks > 0" class="sub-setting fade-in">
                <span class="sub-label">最大点击次数：</span>
                <NInputNumber
                  :value="store.config.maxClicks"
                  :min="1"
                  :max="1000000"
                  :step="10"
                  :disabled="isRunning"
                  @update:value="handleMaxClicksChange"
                  style="width: 160px;"
                >
                  <template #suffix>次</template>
                </NInputNumber>
              </div>
            </div>

          </NSpace>
        </GlassCard>

        <div style="height: 16px;"></div>

        <NGrid :cols="2" :x-gap="16">
          <NGi>
            <!-- 点击位置 -->
            <GlassCard radius="lg" padding="20px" style="height: 100%">
              <div class="card-title">
                <NIcon size="18" class="title-icon"><LocateOutline /></NIcon>
                目标位置
              </div>
              
              <div class="setting-group">
                <SegmentedControl
                  :modelValue="store.config.positionMode"
                  :options="positionOptions"
                  :disabled="isRunning"
                  @update:modelValue="handlePositionModeChange"
                  block
                />
              </div>

              <!-- 固定坐标输入 -->
              <div v-if="store.config.positionMode === 'fixed'" class="coord-inputs fade-in">
                <NGrid :cols="2" :x-gap="12">
                  <NGi>
                    <NInputNumber
                      :value="store.config.fixedPosition.x"
                      :min="0"
                      :step="1"
                      :disabled="isRunning"
                      @update:value="handleFixedXChange"
                      placeholder="X 坐标"
                    >
                      <template #prefix>X:</template>
                    </NInputNumber>
                  </NGi>
                  <NGi>
                    <NInputNumber
                      :value="store.config.fixedPosition.y"
                      :min="0"
                      :step="1"
                      :disabled="isRunning"
                      @update:value="handleFixedYChange"
                      placeholder="Y 坐标"
                    >
                      <template #prefix>Y:</template>
                    </NInputNumber>
                  </NGi>
                </NGrid>
              </div>
            </GlassCard>
          </NGi>
          
          <NGi>
            <!-- 高级设置 -->
            <GlassCard radius="lg" padding="20px" style="height: 100%">
              <div class="card-title">
                <NIcon size="18" class="title-icon"><OptionsOutline /></NIcon>
                高级
              </div>

              <div class="setting-group">
                <div class="setting-label">启动延迟缓冲 (秒)</div>
                <NInputNumber
                  :value="store.config.startDelay"
                  :min="0"
                  :max="10"
                  :step="1"
                  :disabled="isRunning"
                  @update:value="handleDelayChange"
                  block
                >
                  <template #suffix>秒</template>
                </NInputNumber>
                <div class="setting-hint">给予准备时间，避免启动瞬间鼠标误触。</div>
              </div>
            </GlassCard>
          </NGi>
        </NGrid>
      </div>

    </div>
  </div>
</template>

<style scoped>
.clicker-view {
  height: 100%;
  padding: 16px 20px;
  box-sizing: border-box;
}

.layout-container {
  display: flex;
  height: 100%;
  gap: 20px;
}

/* 左侧面板 */
.left-panel {
  width: 320px;
  flex-shrink: 0;
  display: flex;
  flex-direction: column;
}

.status-card {
  height: 100%;
  border: 2px solid transparent !important;
  transition: all 0.3s ease;
  display: flex;
  flex-direction: column;
}

.status-card.running {
  border-color: rgba(232, 128, 128, 0.5) !important;
  background: var(--error-light);
  box-shadow: 0 0 20px rgba(208, 48, 80, 0.1);
}

.panel-header {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 24px;
}

.header-title {
  font-size: 1.25em;
  font-weight: 700;
  color: var(--text-main);
  margin: 0;
}

/* 数据统计区 */
.stats-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 16px;
  margin-bottom: 24px;
  background: rgba(255, 255, 255, 0.4);
  padding: 16px;
  border-radius: var(--radius-md);
  border: 1px solid var(--border-light);
}
[data-theme="dark"] .stats-grid {
  background: rgba(0, 0, 0, 0.2);
}

.stat-item {
  display: flex;
  flex-direction: column;
  align-items: center;
  text-align: center;
}

.stat-label {
  font-size: 0.8em;
  color: var(--text-secondary);
  margin-bottom: 4px;
}

.stat-value {
  font-size: 2em;
  font-weight: 700;
  color: var(--text-main);
  line-height: 1;
}

.stat-unit {
  font-size: 0.4em;
  font-weight: 500;
  color: var(--text-muted);
  margin-left: 2px;
}

.spacer {
  flex: 1;
}

.hotkey-alert {
  margin-bottom: 20px;
  border-radius: var(--radius-md);
  background: var(--bg-body);
  border: 1px solid var(--border-light);
}

.hotkey-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  font-size: 0.85em;
  color: var(--text-secondary);
}

.toggle-btn {
  height: 54px;
  font-size: 1.1em;
  border-radius: var(--radius-md);
  letter-spacing: 1px;
}

/* 右侧面板 */
.right-panel {
  flex: 1;
  min-width: 0;
  overflow-y: auto;
  padding-bottom: 20px;
  padding-right: 4px; /* Scrollbar padding */
}

/* 卡片通用 */
.card-title {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 1.1em;
  font-weight: 600;
  color: var(--text-main);
  margin-bottom: 20px;
}

.title-icon {
  color: var(--primary);
}

/* 设置项通用 */
.setting-group {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.setting-label {
  font-size: 0.9em;
  font-weight: 600;
  color: var(--text-secondary);
}

.setting-hint {
  font-size: 0.75em;
  color: var(--text-muted);
  margin-top: 4px;
}

.flex-between {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.sub-setting {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-top: 8px;
  padding: 12px;
  background: var(--bg-body);
  border-radius: var(--radius-sm);
  border: 1px solid var(--border-light);
}

.sub-label {
  font-size: 0.85em;
  color: var(--text-main);
}

.divider {
  height: 1px;
  background: var(--border-light);
  margin: 16px 0;
}

/* 坐标输入区 */
.coord-inputs {
  margin-top: 12px;
  padding: 16px;
  background: var(--bg-body);
  border-radius: var(--radius-sm);
  border: 1px solid var(--border-light);
}

/* 动画 */
.fade-in {
  animation: fadeIn 0.3s ease;
}

@keyframes fadeIn {
  from { opacity: 0; transform: translateY(-4px); }
  to { opacity: 1; transform: translateY(0); }
}
</style>
