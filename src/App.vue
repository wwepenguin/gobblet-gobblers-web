<script setup lang="ts">
import { ref } from 'vue';
import { registerSW } from 'virtual:pwa-register';

const updateSW = registerSW({
  onNeedRefresh() {
    needRefresh.value = true;
  },
  onOfflineReady() {
    offlineReady.value = true;
    setTimeout(() => {
      offlineReady.value = false;
    }, 3000);
  },
});

const needRefresh = ref(false);
const offlineReady = ref(false);

function closeOfflineReady() {
  offlineReady.value = false;
}

function closeNeedRefresh() {
  needRefresh.value = false;
}

function updateServiceWorker() {
  updateSW(true);
  needRefresh.value = false;
}
</script>

<template>
  <div class="app-container">
    <header class="header">
      <h1>Gobblet Gobblers</h1>
    </header>
    <main class="main-content">
      <router-view />
    </main>

    <!-- PWA 更新提示 -->
    <div v-if="offlineReady" class="pwa-toast" role="alert">
      <div class="message">
        <span>應用已準備好離線使用</span>
      </div>
      <button type="button" class="close-button" @click="closeOfflineReady">
        ✕
      </button>
    </div>

    <div v-if="needRefresh" class="pwa-toast" role="alert">
      <div class="message">
        <span>有新版本可用</span>
      </div>
      <div class="buttons">
        <button type="button" class="update-button" @click="updateServiceWorker">
          更新
        </button>
        <button type="button" class="close-button" @click="closeNeedRefresh">
          關閉
        </button>
      </div>
    </div>
  </div>
</template>

<style scoped>
.app-container {
  display: flex;
  flex-direction: column;
  min-height: 100vh;
  background-color: #f5f5f5;
  font-family: 'Nunito', sans-serif;
  width: 100%;
}

.header {
  background-color: #4a55a2;
  color: white;
  padding: 1rem 2rem;
  text-align: center;
  box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
}

.main-content {
  flex: 1;
  padding: 2rem;
  width: 100%;
  margin: 0 auto;
}

.footer {
  background-color: #333;
  color: white;
  text-align: center;
  padding: 1rem;
  margin-top: auto;
}

.logo {
  height: 6em;
  padding: 1.5em;
  will-change: filter;
  transition: filter 300ms;
}
.logo:hover {
  filter: drop-shadow(0 0 2em #646cffaa);
}
.logo.vue:hover {
  filter: drop-shadow(0 0 2em #42b883aa);
}

.pwa-toast {
  position: fixed;
  bottom: 16px;
  right: 16px;
  padding: 12px;
  background: #4a55a2;
  color: white;
  border-radius: 8px;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
  z-index: 100;
  display: flex;
  align-items: center;
  justify-content: space-between;
  max-width: 300px;
}

.message {
  margin-right: 12px;
}

.buttons {
  display: flex;
  gap: 8px;
}

.update-button, .close-button {
  cursor: pointer;
  border: none;
  border-radius: 4px;
  padding: 8px 12px;
  font-weight: bold;
  transition: all 0.2s;
}

.update-button {
  background: white;
  color: #4a55a2;
}

.update-button:hover {
  background: #f0f0f0;
}

.close-button {
  background: rgba(255, 255, 255, 0.2);
  color: white;
}

.close-button:hover {
  background: rgba(255, 255, 255, 0.3);
}

@media (max-width: 600px) {
  .pwa-toast {
    bottom: 8px;
    right: 8px;
    left: 8px;
    max-width: none;
  }
}
</style>
