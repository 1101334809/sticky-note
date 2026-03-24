<script setup lang="ts">
import { NButton } from 'naive-ui'

defineProps<{
  icon?: string
  title: string
  description?: string
  actionLabel?: string
}>()

defineEmits<{
  (e: 'action'): void
}>()
</script>

<template>
  <div class="empty-state">
    <div class="icon" v-if="icon || $slots.icon">
      <slot name="icon">{{ icon }}</slot>
    </div>
    <div class="title">{{ title }}</div>
    <div v-if="description" class="description">{{ description }}</div>
    <div v-if="actionLabel || $slots.action" class="action">
      <slot name="action">
        <NButton type="primary" class="btn-glow" @click="$emit('action')">
          {{ actionLabel }}
        </NButton>
      </slot>
    </div>
  </div>
</template>

<style scoped>
.empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  text-align: center;
  padding: 48px 24px;
  height: 100%;
}

.icon {
  font-size: 4em;
  margin-bottom: 16px;
  opacity: 0.8;
  filter: grayscale(0.2);
}

.title {
  font-size: 1.25em;
  font-weight: 600;
  color: var(--text-primary);
  margin-bottom: 8px;
}

.description {
  font-size: 0.9em;
  color: var(--text-secondary);
  max-width: 320px;
  line-height: 1.5;
  margin-bottom: 24px;
}

.action {
  margin-top: 8px;
}
</style>
