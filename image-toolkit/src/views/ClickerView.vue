<script setup lang="ts">
/**
 * 连点器页面
 *
 * 提供点击频率、按键、位置、次数等配置，以及启停控制。
 */
import { onMounted, onUnmounted, computed } from 'vue'
import {
  NCard,
  NSpace,
  NButton,
  NRadioGroup,
  NRadio,
  NInputNumber,
  NSlider,
  NTag,
  NAlert,
  NGrid,
  NGi,
  NStatistic,
  NIcon,
} from 'naive-ui'
import {
  PlayOutline,
  StopOutline,
} from '@vicons/ionicons5'
import { useClickerStore } from '../stores/clicker.store'

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

const buttonType = computed(() => isRunning.value ? 'error' : 'success')

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

function handleButtonChange(val: string) {
  store.updateConfig({ button: val as any })
  store.saveConfig()
}

function handleClickTypeChange(val: string) {
  store.updateConfig({ clickType: val as any })
  store.saveConfig()
}

function handleMaxClicksChange(val: number | null) {
  store.updateConfig({ maxClicks: val || 0 })
  store.saveConfig()
}

function handlePositionModeChange(val: string) {
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
</script>

<template>
  <div class="clicker-view">
    <!-- 顶部状态卡片 -->
    <NCard
      size="small"
      :class="['status-card', { running: isRunning }]"
    >
      <NGrid :cols="3" :x-gap="16">
        <NGi>
          <NStatistic label="状态">
            <NTag
              :type="isRunning ? 'error' : 'default'"
              :bordered="false"
              round
              size="small"
            >
              <span v-if="store.state === 'running'" class="blink">●</span>
              {{ store.state === 'idle' ? '就绪' : store.state === 'countdown' ? '倒计时' : '运行中' }}
            </NTag>
          </NStatistic>
        </NGi>
        <NGi>
          <NStatistic label="已点击" :value="store.clickCount">
            <template #suffix> 次</template>
          </NStatistic>
        </NGi>
        <NGi>
          <NStatistic label="频率" :value="cpsDisplay">
            <template #suffix> CPS</template>
          </NStatistic>
        </NGi>
      </NGrid>
    </NCard>

    <!-- 启停按钮 -->
    <NButton
      class="toggle-btn"
      :type="buttonType"
      size="large"
      block
      strong
      secondary
      :disabled="store.state === 'countdown'"
      @click="handleToggle"
    >
      <template #icon>
        <NIcon>
          <StopOutline v-if="isRunning" />
          <PlayOutline v-else />
        </NIcon>
      </template>
      {{ buttonText }}
    </NButton>

    <NAlert type="info" :bordered="false" style="margin-bottom: 16px;">
      全局热键: <strong>F6</strong> 启动/停止 · <strong>Esc</strong> 紧急停止
    </NAlert>

    <!-- 点击配置 -->
    <NCard title="点击配置" size="small" style="margin-bottom: 16px;">
      <NSpace vertical :size="16">
        <!-- 点击间隔 -->
        <div>
          <div class="label">点击间隔（ms）</div>
          <NGrid :cols="24" :x-gap="12">
            <NGi :span="16">
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
                size="small"
                :disabled="isRunning"
                @update:value="handleIntervalChange"
              >
                <template #suffix>ms</template>
              </NInputNumber>
            </NGi>
          </NGrid>
        </div>

        <!-- 按键选择 -->
        <div>
          <div class="label">点击按键</div>
          <NRadioGroup
            :value="store.config.button"
            :disabled="isRunning"
            @update:value="handleButtonChange"
          >
            <NRadio value="left">左键</NRadio>
            <NRadio value="right">右键</NRadio>
            <NRadio value="middle">中键</NRadio>
          </NRadioGroup>
        </div>

        <!-- 点击方式 -->
        <div>
          <div class="label">点击方式</div>
          <NRadioGroup
            :value="store.config.clickType"
            :disabled="isRunning"
            @update:value="handleClickTypeChange"
          >
            <NRadio value="single">单击</NRadio>
            <NRadio value="double">双击</NRadio>
          </NRadioGroup>
        </div>

        <!-- 次数限制 -->
        <div>
          <div class="label">点击次数</div>
          <NRadioGroup
            :value="store.config.maxClicks === 0 ? 'unlimited' : 'limited'"
            :disabled="isRunning"
            @update:value="(v: string) => handleMaxClicksChange(v === 'unlimited' ? 0 : 100)"
          >
            <NRadio value="unlimited">无限</NRadio>
            <NRadio value="limited">固定次数</NRadio>
          </NRadioGroup>
          <NInputNumber
            v-if="store.config.maxClicks > 0"
            :value="store.config.maxClicks"
            :min="1"
            :max="1000000"
            :step="10"
            size="small"
            style="margin-top: 8px; width: 200px;"
            :disabled="isRunning"
            @update:value="handleMaxClicksChange"
          >
            <template #suffix>次</template>
          </NInputNumber>
        </div>
      </NSpace>
    </NCard>

    <!-- 点击位置 -->
    <NCard title="点击位置" size="small" style="margin-bottom: 16px;">
      <NSpace vertical :size="16">
        <NRadioGroup
          :value="store.config.positionMode"
          :disabled="isRunning"
          @update:value="handlePositionModeChange"
        >
          <NSpace vertical :size="8">
            <NRadio value="follow">🖱️ 跟随鼠标（在当前光标位置点击）</NRadio>
            <NRadio value="fixed">📍 固定坐标（始终点击指定位置）</NRadio>
          </NSpace>
        </NRadioGroup>

        <!-- 固定坐标输入 -->
        <div v-if="store.config.positionMode === 'fixed'" class="coord-inputs">
          <NGrid :cols="2" :x-gap="12">
            <NGi>
              <NInputNumber
                :value="store.config.fixedPosition.x"
                :min="0"
                :step="1"
                size="small"
                :disabled="isRunning"
                @update:value="handleFixedXChange"
              >
                <template #prefix>X:</template>
              </NInputNumber>
            </NGi>
            <NGi>
              <NInputNumber
                :value="store.config.fixedPosition.y"
                :min="0"
                :step="1"
                size="small"
                :disabled="isRunning"
                @update:value="handleFixedYChange"
              >
                <template #prefix>Y:</template>
              </NInputNumber>
            </NGi>
          </NGrid>
        </div>
      </NSpace>
    </NCard>

    <!-- 高级设置 -->
    <NCard title="高级设置" size="small">
      <NSpace vertical :size="16">
        <div>
          <div class="label">启动延迟</div>
          <NInputNumber
            :value="store.config.startDelay"
            :min="0"
            :max="10"
            :step="1"
            size="small"
            style="width: 200px;"
            :disabled="isRunning"
            @update:value="handleDelayChange"
          >
            <template #suffix>秒</template>
          </NInputNumber>
        </div>
      </NSpace>
    </NCard>
  </div>
</template>

<style scoped>
.clicker-view {
  padding: 20px;
  max-width: 560px;
  margin: 0 auto;
}

.status-card {
  margin-bottom: 16px;
  transition: border-color 0.3s;
}

.status-card.running {
  border-color: #e88080;
}

.toggle-btn {
  margin-bottom: 16px;
  height: 48px;
  font-size: 16px;
}

.label {
  font-size: 13px;
  color: var(--n-text-color-3, #999);
  margin-bottom: 6px;
}

.coord-inputs {
  padding: 12px;
  background: var(--n-color-embedded, #f5f5f5);
  border-radius: 6px;
}

@keyframes blink {
  0%, 100% { opacity: 1; }
  50% { opacity: 0; }
}

.blink {
  animation: blink 1s infinite;
  color: #e03050;
  margin-right: 4px;
}
</style>
