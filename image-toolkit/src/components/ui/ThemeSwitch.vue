<script setup lang="ts">
import { computed } from 'vue'
import { NIcon } from 'naive-ui'
import { SunnyOutline, MoonOutline, DesktopOutline } from '@vicons/ionicons5'
import type { ThemeMode } from '../../stores/settings.store'

const props = defineProps<{
  modelValue: ThemeMode
}>()

const emit = defineEmits<{
  (e: 'update:modelValue', val: ThemeMode): void
}>()

const activeIndex = computed(() => {
  if (props.modelValue === 'light') return 0
  if (props.modelValue === 'dark') return 1
  return 2
})

function select(val: ThemeMode) {
  emit('update:modelValue', val)
}
</script>

<template>
  <div class="theme-switch">
    <div 
      class="slider" 
      :style="{ transform: `translateX(${activeIndex * 100}%)`, width: 'calc(100% / 3)' }"
    ></div>
    
    <button 
      class="btn" 
      :class="{ active: modelValue === 'light' }" 
      @click="select('light')" 
      title="浅色模式"
    >
      <NIcon size="16"><SunnyOutline /></NIcon>
    </button>
    <button 
      class="btn" 
      :class="{ active: modelValue === 'dark' }" 
      @click="select('dark')" 
      title="深色模式"
    >
      <NIcon size="16"><MoonOutline /></NIcon>
    </button>
    <button 
      class="btn" 
      :class="{ active: modelValue === 'system' }" 
      @click="select('system')" 
      title="跟随系统"
    >
      <NIcon size="16"><DesktopOutline /></NIcon>
    </button>
  </div>
</template>

<style scoped>
.theme-switch {
  position: relative;
  display: flex;
  background: var(--bg-card);
  border: 1px solid var(--border-light);
  border-radius: 999px;
  padding: 4px;
  width: 120px;
  margin: 0 auto;
}

.slider {
  position: absolute;
  top: 4px;
  bottom: 4px;
  left: 4px;
  background: var(--primary-light);
  border-radius: 999px;
  transition: transform 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  z-index: 0;
}

.btn {
  flex: 1;
  position: relative;
  z-index: 1;
  border: none;
  background: transparent;
  cursor: pointer;
  padding: 6px 0;
  display: flex;
  justify-content: center;
  align-items: center;
  color: var(--text-muted);
  border-radius: 999px;
  transition: color 0.3s;
}

.btn:hover {
  color: var(--text-secondary);
}

.btn.active {
  color: var(--primary);
}
</style>
