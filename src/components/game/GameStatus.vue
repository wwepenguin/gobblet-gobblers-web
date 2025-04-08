<template>
  <div class="game-status">
    <div v-if="gameStatus === 'playing'" class="status-playing">
      <div class="current-turn">
        <div class="player-indicator" :class="`player-${currentPlayer}`"></div>
        <span>{{ currentPlayerName }} 的回合</span>
      </div>
      
      <div class="game-start-tip" v-if="showStartTip">
        {{ currentPlayerName }} 將先手
      </div>
      
      <div v-if="online" class="online-status" :class="connectionStatus">
        <span>{{ connectionMessage }}</span>
      </div>
    </div>
    
    <div v-else-if="gameStatus === 'win'" class="status-win">
      <div class="win-message">
        <div class="player-indicator" :class="`player-${winner}`"></div>
        <span>{{ winnerName }} 勝利！</span>
      </div>
      <button class="restart-button" @click="$emit('restart')">重新開始</button>
    </div>
    
    <div v-else-if="gameStatus === 'draw'" class="status-draw">
      <div class="draw-message">平局！</div>
      <button class="restart-button" @click="$emit('restart')">重新開始</button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, ref, onMounted } from 'vue'
import { gameStore } from '../../stores/gameStore'
import type { ConnectionStatus } from '../../types/game'

const props = defineProps<{
  online?: boolean
  connectionStatus?: ConnectionStatus
  isHost?: boolean
}>()

defineEmits<{
  (e: 'restart'): void
}>()

const gameStatus = computed(() => gameStore.gameStatus)
const currentPlayer = computed(() => gameStore.currentPlayer)
const winner = computed(() => gameStore.winner)
const showStartTip = ref(false)

const currentPlayerName = computed(() => {
  return currentPlayer.value === 'player1' ? '玩家 1' : '玩家 2'
})

const winnerName = computed(() => {
  return winner.value === 'player1' ? '玩家 1' : '玩家 2'
})

const connectionMessage = computed(() => {
  if (!props.connectionStatus) return ''
  
  switch (props.connectionStatus) {
    case 'connected':
      return '已連接'
    case 'connecting':
      return '正在連線中...'
    case 'waiting':
      return '等待對手連線...'
    case 'initializing':
      return '初始化連線...'
    case 'disconnected':
      return '未連接'
    case 'error':
      return '連線錯誤'
    default:
      return ''
  }
})

onMounted(() => {
  // 顯示先手提示，3秒後消失
  showStartTip.value = true
  setTimeout(() => {
    showStartTip.value = false
  }, 3000)
})
</script>

<style scoped>
.game-status {
  background-color: white;
  border-radius: 12px;
  /* padding: 8px 10px; */
  margin: 10px 0;
  box-shadow: 0 4px 8px rgba(0, 0, 0, 0.1);
  text-align: center;
  min-height: 60px;
  display: flex;
  align-items: center;
  justify-content: center;
}

.status-playing {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  justify-content: center;
  gap: 0.8rem;
}

.player-indicator {
  width: 20px;
  height: 20px;
  border-radius: 50%;
  display: inline-block;
  margin-right: 10px;
}

.player-player1 {
  background: linear-gradient(135deg, #75a8f9, #4a55a2);
}

.player-player2 {
  background: linear-gradient(135deg, #ff7676, #e74c3c);
}

.current-turn {
  display: flex;
  align-items: center;
  font-size: 1.1rem;
  font-weight: 500;
}

.game-start-tip {
  background-color: #f8f8f8;
  padding: 6px 12px;
  margin-left: 15px;
  border-radius: 20px;
  font-size: 0.9rem;
  color: #555;
  animation: flash 1.5s infinite;
}

@keyframes flash {
  0%, 100% { opacity: 0.7; }
  50% { opacity: 1; }
}

.status-win, .status-draw {
  display: flex;
  flex-direction: column;
  align-items: center;
  width: 100%;
}

.win-message, .draw-message {
  display: flex;
  align-items: center;
  font-size: 1.2rem;
  font-weight: 600;
  margin-bottom: 15px;
}

.restart-button {
  background: linear-gradient(135deg, #4a55a2, #394280);
  color: white;
  border: none;
  border-radius: 6px;
  padding: 8px 16px;
  font-size: 1rem;
  cursor: pointer;
  transition: all 0.3s ease;
  box-shadow: 0 3px 6px rgba(0, 0, 0, 0.15);
}

.restart-button:hover {
  background: linear-gradient(135deg, #394280, #2e355e);
  transform: translateY(-2px);
  box-shadow: 0 5px 10px rgba(0, 0, 0, 0.2);
}

.online-status {
  margin-left: 20px;
  font-size: 0.9rem;
  padding: 4px 10px;
  border-radius: 12px;
}

.online-status.connected {
  background-color: #e6f7e6;
  color: #2e7d32;
}

.online-status.connecting,
.online-status.waiting, 
.online-status.initializing {
  background-color: #fff8e1;
  color: #f57c00;
}

.online-status.disconnected {
  background-color: #ffebee;
  color: #c62828;
}

.online-status.error {
  background-color: #ffebee;
  color: #c62828;
  border-left: 3px solid #f44336;
  font-weight: bold;
}

/* 移動設備上的狀態顯示調整 */
@media (max-width: 768px) {
  .game-status {
    /* padding: 12px 16px; */
  }
  
  .game-start-tip {
    margin-left: 0;
    margin-top: 0.5rem;
    width: 100%;
  }
  
  .online-status {
    margin-left: 0;
    margin-top: 0.5rem;
  }
}

/* 小屏幕上的狀態顯示調整 */
@media (max-width: 480px) {
  .status-win, .status-draw {
    padding: 0.5rem;
  }
}
</style> 