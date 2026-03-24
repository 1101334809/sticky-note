<script setup lang="ts">
import { NButton, NIcon } from 'naive-ui'
import { CloseOutline, RemoveOutline, StopOutline } from '@vicons/ionicons5'

function handleMinimize() {
  window.ipcRenderer?.send('window:minimize')
}

function handleMaximize() {
  window.ipcRenderer?.send('window:maximize')
}

function handleClose() {
  window.ipcRenderer?.send('window:close')
}
</script>

<template>
  <div class="window-controls" style="-webkit-app-region: no-drag;">
    <NButton text class="control-btn minimize" @click="handleMinimize">
      <NIcon size="16"><RemoveOutline /></NIcon>
    </NButton>
    <NButton text class="control-btn maximize" @click="handleMaximize">
      <NIcon size="14" style="transform: scale(0.8)"><StopOutline /></NIcon>
    </NButton>
    <NButton text class="control-btn close" @click="handleClose">
      <NIcon size="16"><CloseOutline /></NIcon>
    </NButton>
  </div>
</template>

<style scoped>
.window-controls {
  display: flex;
  height: 100%;
  align-items: center;
}

.control-btn {
  width: 46px;
  height: 100%;
  display: flex;
  justify-content: center;
  align-items: center;
  color: var(--text-primary);
  opacity: 0.7;
  transition: all 0.2s;
  border-radius: 0;
}

.control-btn:hover {
  opacity: 1;
  background-color: var(--bg-card-hover);
}

.control-btn.close:hover {
  background-color: #e81123 !important;
  color: #ffffff;
}
</style>
