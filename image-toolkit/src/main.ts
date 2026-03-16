import { createApp } from 'vue'
import { createPinia } from 'pinia'
import { createRouter, createWebHashHistory } from 'vue-router'
import App from './App.vue'

// 路由配置
const router = createRouter({
  history: createWebHashHistory(),
  routes: [
    { path: '/', redirect: '/svg' },
    { path: '/svg', component: () => import('./views/SvgViewer.vue') },
    { path: '/compress', component: () => import('./views/ImageCompress.vue') },
    { path: '/convert', component: () => import('./views/FormatConvert.vue') },
  ],
})

const app = createApp(App)
app.use(createPinia())
app.use(router)
app.mount('#app')
