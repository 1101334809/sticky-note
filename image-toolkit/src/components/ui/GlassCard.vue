<script setup lang="ts">
import { computed } from 'vue'

const props = defineProps<{
  hoverable?: boolean
  padding?: string
  radius?: 'sm' | 'md' | 'lg' | 'xl'
  width?: string
  height?: string
}>()

const cardStyle = computed(() => {
  return {
    padding: props.padding || '24px',
    borderRadius: `var(--radius-${props.radius || 'lg'})`,
    width: props.width,
    height: props.height
  }
})
</script>

<template>
  <div 
    class="glass-card" 
    :class="{ 'glass-card-hoverable': hoverable }"
    :style="cardStyle"
  >
    <slot></slot>
  </div>
</template>

<style scoped>
/* 核心样式已在 glassmorphism.css 中定义：
 * .glass-card / .glass-card-hoverable 
 */
</style>
