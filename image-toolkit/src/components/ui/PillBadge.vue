<script setup lang="ts">
import { computed } from 'vue'

const props = defineProps<{
  status?: 'success' | 'error' | 'warning' | 'processing' | 'waiting'
  label: string
}>()

const statusClasses = computed(() => {
  return props.status ? `pill-badge--${props.status}` : 'pill-badge--default'
})
</script>

<template>
  <div class="pill-badge" :class="statusClasses">
    <span v-if="status === 'processing'" class="processing-dot"></span>
    <span class="label">{{ label }}</span>
  </div>
</template>

<style scoped>
.pill-badge {
  display: inline-flex;
  align-items: center;
  padding: 4px 12px;
  border-radius: 999px;
  font-size: 0.85em;
  font-weight: 600;
  white-space: nowrap;
  transition: all 0.3s ease;
}

.label {
  line-height: 1;
}

/* Default */
.pill-badge--default {
  background: var(--bg-card);
  color: var(--text-secondary);
  border: 1px solid var(--border-light);
}

/* Waiting */
.pill-badge--waiting {
  background: var(--bg-card);
  color: var(--text-muted);
  border: 1px dashed var(--border-dashed);
}

/* Success */
.pill-badge--success {
  background: var(--success-light, rgba(76, 175, 80, 0.15));
  color: var(--success, #4caf50);
}

/* Error */
.pill-badge--error {
  background: var(--error-light, rgba(244, 67, 54, 0.15));
  color: var(--error, #f44336);
}

/* Warning */
.pill-badge--warning {
  background: var(--warning-light, rgba(255, 152, 0, 0.15));
  color: var(--warning, #ff9800);
}

/* Processing */
.pill-badge--processing {
  background: var(--primary-light);
  color: var(--primary);
}

.processing-dot {
  width: 6px;
  height: 6px;
  background-color: var(--primary);
  border-radius: 50%;
  margin-right: 6px;
  animation: pulse 1.5s infinite ease-in-out;
}

@keyframes pulse {
  0% { opacity: 0.4; transform: scale(0.8); }
  50% { opacity: 1; transform: scale(1.2); }
  100% { opacity: 0.4; transform: scale(0.8); }
}
</style>
