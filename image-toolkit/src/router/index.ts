/**
 * 路由配置
 */
import { createRouter, createWebHashHistory } from 'vue-router'

const router = createRouter({
  history: createWebHashHistory(),
  routes: [
    { path: '/', redirect: '/svg' },
    { path: '/svg', component: () => import('../views/SvgViewer.vue') },
    { path: '/compress', component: () => import('../views/ImageCompress.vue') },
    { path: '/convert', component: () => import('../views/FormatConvert.vue') },
    { path: '/clicker', component: () => import('../views/ClickerView.vue') },
    { path: '/doc-convert', component: () => import('../views/DocConvertView.vue') },
  ],
})

export default router
