<script setup lang="ts">
import { computed } from 'vue'

interface Option {
  label: string
  value: string | number
}

const props = defineProps<{
  modelValue: string | number
  options: Option[]
  size?: 'small' | 'medium' | 'large'
}>()

const emit = defineEmits<{
  (e: 'update:modelValue', value: string | number): void
}>()

const activeIndex = computed(() => {
  return props.options.findIndex(opt => opt.value === props.modelValue)
})

function select(value: string | number) {
  emit('update:modelValue', value)
}
</script>

<template>
  <div class="segmented-control" :class="[`size-${size || 'medium'}`]">
    <div 
      class="slider" 
      :style="{ 
        transform: `translateX(${activeIndex * 100}%)`, 
        width: `${100 / options.length}%` 
      }"
    ></div>
    
    <button 
      v-for="opt in options" 
      :key="opt.value"
      class="segment-btn" 
      :class="{ active: modelValue === opt.value }" 
      @click="select(opt.value)"
    >
      {{ opt.label }}
    </button>
  </div>
</template>

<style scoped>
.segmented-control {
  position: relative;
  display: inline-flex;
  background: var(--bg-card);
  border: 1px solid var(--border-light);
  border-radius: 999px;
  padding: 4px;
}

.size-small {
  height: 32px;
}
.size-medium {
  height: 40px;
}
.size-large {
  height: 48px;
}

.size-small .segment-btn { font-size: 0.85em; padding: 0 16px; }
.size-medium .segment-btn { font-size: 0.9em; padding: 0 20px; }
.size-large .segment-btn { font-size: 1em; padding: 0 24px; }

.slider {
  position: absolute;
  top: 4px;
  bottom: 4px;
  left: 4px;
  background: var(--bg-card-hover);
  border-radius: 999px;
  box-shadow: var(--shadow-sm);
  transition: transform 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  z-index: 0;
}

[data-theme="dark"] .slider {
  background: var(--primary-light);
}

.segment-btn {
  flex: 1;
  position: relative;
  z-index: 1;
  border: none;
  background: transparent;
  cursor: pointer;
  display: flex;
  justify-content: center;
  align-items: center;
  color: var(--text-secondary);
  border-radius: 999px;
  transition: color 0.3s;
  font-weight: 500;
  white-space: nowrap;
}

.segment-btn:hover {
  color: var(--text-primary);
}

.segment-btn.active {
  color: var(--text-primary);
  font-weight: 600;
}

[data-theme="dark"] .segment-btn.active {
  color: var(--primary);
}
</style>
