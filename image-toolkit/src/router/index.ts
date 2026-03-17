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
  ],
})

export default router
