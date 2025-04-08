import { createApp } from 'vue'
import { createRouter, createWebHistory } from 'vue-router'
import App from './App.vue'
import './style.css'
import Home from './views/Home.vue'
import Game from './views/Game.vue'
import OnlineGame from './views/OnlineGame.vue'
// PWA 註冊
import { registerSW } from 'virtual:pwa-register'

// 註冊 Service Worker
registerSW({
  onNeedRefresh() {
    console.log('新版本可用，請重新整理')
  },
  onOfflineReady() {
    console.log('應用已準備好離線使用')
  }
})

const routes = [
  { path: '/', component: Home },
  { path: '/game', component: Game },
  { path: '/online', component: OnlineGame }
]


const router = createRouter({
  history: createWebHistory('gobblet-gobblers-web'),
  routes
})

const app = createApp(App)
app.use(router)
app.mount('#app')
