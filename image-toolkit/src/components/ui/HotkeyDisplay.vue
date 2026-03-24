<script setup lang="ts">
defineProps<{
  keys: string[]
}>()
</script>

<template>
  <div class="hotkey-display">
    <template v-for="(key, index) in keys" :key="index">
      <kbd class="key-cap">{{ key }}</kbd>
      <span v-if="index < keys.length - 1" class="separator">+</span>
    </template>
  </div>
</template>

<style scoped>
.hotkey-display {
  display: inline-flex;
  align-items: center;
  gap: 4px;
}

.key-cap {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-width: 24px;
  height: 24px;
  padding: 0 6px;
  border-radius: 6px;
  background: linear-gradient(180deg, var(--bg-card), var(--bg-body));
  border: 1px solid var(--border-light);
  box-shadow: 0 2px 0 var(--border-light), inset 0 1px 1px rgba(255, 255, 255, 0.4);
  color: var(--text-secondary);
  font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
  font-size: 12px;
  font-weight: 600;
  line-height: 1;
}

[data-theme="dark"] .key-cap {
  background: linear-gradient(180deg, rgba(255, 255, 255, 0.1), rgba(255, 255, 255, 0.05));
  border-color: rgba(255, 255, 255, 0.1);
  box-shadow: 0 2px 0 rgba(0, 0, 0, 0.4), inset 0 1px 1px rgba(255, 255, 255, 0.1);
  color: var(--text-main);
}

.separator {
  color: var(--text-muted);
  font-size: 12px;
  font-weight: 600;
}
</style>
