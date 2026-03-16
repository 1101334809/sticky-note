<script setup lang="ts">
import { ref, computed } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import {
  NConfigProvider,
  NLayout,
  NLayoutSider,
  NMenu,
  NSpace,
  NButton,
  NIcon,
  darkTheme,
  type MenuOption,
} from 'naive-ui'
import {
  ImagesOutline,
  ContractOutline,
  SwapHorizontalOutline,
} from '@vicons/ionicons5'
import { h } from 'vue'

const router = useRouter()
const route = useRoute()

const menuOptions: MenuOption[] = [
  {
    label: 'SVG 查看',
    key: '/svg',
    icon: () => h(NIcon, null, { default: () => h(ImagesOutline) }),
  },
  {
    label: '图片压缩',
    key: '/compress',
    icon: () => h(NIcon, null, { default: () => h(ContractOutline) }),
  },
  {
    label: '格式转换',
    key: '/convert',
    icon: () => h(NIcon, null, { default: () => h(SwapHorizontalOutline) }),
  },
]

const activeKey = computed(() => route.path)

function handleMenuUpdate(key: string) {
  router.push(key)
}
</script>

<template>
  <NConfigProvider :theme="darkTheme">
    <NLayout has-sider style="height: 100vh">
      <!-- 侧栏 -->
      <NLayoutSider
        bordered
        :width="200"
        :collapsed-width="64"
        show-trigger
        collapse-mode="width"
        style="background: #18181c"
      >
        <!-- Logo -->
        <div style="padding: 20px 16px; text-align: center; border-bottom: 1px solid rgba(255,255,255,0.06)">
          <span style="font-size: 1.4em">🧰</span>
          <span style="font-weight: 700; margin-left: 8px; background: linear-gradient(135deg, #667eea, #764ba2); -webkit-background-clip: text; -webkit-text-fill-color: transparent; font-size: 1.1em">ImageKit</span>
        </div>

        <!-- 导航菜单 -->
        <NMenu
          :options="menuOptions"
          :value="activeKey"
          @update:value="handleMenuUpdate"
          :indent="20"
        />
      </NLayoutSider>

      <!-- 主内容区 -->
      <NLayout>
        <router-view />
      </NLayout>
    </NLayout>
  </NConfigProvider>
</template>

<style>
* {
  margin: 0;
  padding: 0;
  box-sizing: border-box;
}
html, body, #app {
  height: 100%;
  overflow: hidden;
}
body {
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI',
               'PingFang SC', 'Hiragino Sans GB', 'Microsoft YaHei', sans-serif;
}
/* 隐藏滚动条但允许滚动 */
::-webkit-scrollbar {
  width: 6px;
}
::-webkit-scrollbar-track {
  background: transparent;
}
::-webkit-scrollbar-thumb {
  background: rgba(255,255,255,0.15);
  border-radius: 3px;
}
::-webkit-scrollbar-thumb:hover {
  background: rgba(255,255,255,0.25);
}
</style>
