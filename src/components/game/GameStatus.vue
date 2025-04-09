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
        <button class="toggle-details-btn" @click="toggleConnectionDetails">
          {{ showConnectionDetails ? '隱藏詳情' : '顯示詳情' }}
        </button>
      </div>

      <div v-if="online && showConnectionDetails" class="connection-details">
        <div class="connection-info-item">
          <span class="info-label">連線角色：</span>
          <span class="info-value">{{ isHost ? '主機 (玩家 1)' : '加入者 (玩家 2)' }}</span>
        </div>
        <div class="connection-info-item">
          <span class="info-label">遊戲 ID：</span>
          <span class="info-value">{{ peerId || '未知' }}</span>
          <button v-if="peerId" class="copy-button" @click="copyPeerId">複製</button>
        </div>
        <div class="connection-info-item">
          <span class="info-label">連線 ID：</span>
          <span class="info-value">{{ connectionId || '未知' }}</span>
        </div>
        <div class="connection-info-item" v-if="connectionError">
          <span class="info-label">錯誤：</span>
          <span class="info-value error-text">{{ connectionError }}</span>
        </div>
        <div class="connection-info-item">
          <span class="info-label">最新動態：</span>
          <span class="info-value" v-if="latestLog">
            {{ formatTime(latestLog.time) }} - {{ latestLog.message }}
          </span>
          <span class="info-value" v-else>無</span>
        </div>
      </div>
    </div>

    <div v-else-if="gameStatus === 'win'" class="status-win">
      <div class="win-message">
        <div class="player-indicator" :class="`player-${winner}`"></div>
        <span>{{ winnerName }} 勝利！</span>
      </div>
      <button class="restart-button" @click="$emit('restart')">重新開始</button>

      <div v-if="online" class="online-status-win" :class="connectionStatus">
        <span>{{ connectionMessage }}</span>
        <button class="toggle-details-btn" @click="toggleConnectionDetails">
          {{ showConnectionDetails ? '隱藏詳情' : '顯示詳情' }}
        </button>

        <div v-if="showConnectionDetails" class="connection-details">
          <div class="connection-info-item">
            <span class="info-label">連線角色：</span>
            <span class="info-value">{{ isHost ? '主機 (玩家 1)' : '加入者 (玩家 2)' }}</span>
          </div>
          <div class="connection-info-item">
            <span class="info-label">遊戲 ID：</span>
            <span class="info-value">{{ peerId || '未知' }}</span>
          </div>
        </div>
      </div>
    </div>

    <div v-else-if="gameStatus === 'draw'" class="status-draw">
      <div class="draw-message">平局！</div>
      <button class="restart-button" @click="$emit('restart')">重新開始</button>

      <div v-if="online" class="online-status-win" :class="connectionStatus">
        <span>{{ connectionMessage }}</span>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, ref, onMounted } from 'vue';
import { gameStore } from '../../stores/gameStore';
import { onlineStore } from '../../stores/onlineStore';
import type { ConnectionStatus } from '../../types/game';

const props = defineProps({
  online: {
    type: Boolean,
    default: false
  },
  connectionStatus: {
    type: String as () => ConnectionStatus,
    default: 'disconnected'
  },
  isHost: {
    type: Boolean,
    default: false
  },
  peerId: {
    type: String,
    default: ''
  },
  connectionId: {
    type: String,
    default: ''
  },
  connectionError: {
    type: String,
    default: ''
  }
});

defineEmits<{
  (e: 'restart'): void;
}>();

const gameStatus = computed(() => gameStore.gameStatus);
const currentPlayer = computed(() => gameStore.currentPlayer);
const winner = computed(() => gameStore.winner);
const showStartTip = ref(false);
const showConnectionDetails = ref(false);

const latestLog = computed(() => {
  if (onlineStore.connectionLogs && onlineStore.connectionLogs.length > 0) {
    return onlineStore.connectionLogs[0];
  }
  return null;
});

const currentPlayerName = computed(() => {
  return currentPlayer.value === 'player1' ? '玩家 1' : '玩家 2';
});

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

const toggleConnectionDetails = () => {
  showConnectionDetails.value = !showConnectionDetails.value
}

const copyPeerId = () => {
  if (props.peerId) {
    navigator.clipboard.writeText(props.peerId)
      .then(() => {
        alert('已複製遊戲 ID')
      })
      .catch(err => {
        console.error('複製出錯:', err)
      })
  }
}

const formatTime = (date: Date) => {
  return date.toLocaleTimeString('zh-TW', { 
    hour: '2-digit', 
    minute: '2-digit',
    second: '2-digit'
  })
}

onMounted(() => {
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
  padding: 16px 24px;
  margin: 20px 0;
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

  0%,
  100% {
    opacity: 0.7;
  }

  50% {
    opacity: 1;
  }
}

.status-win,
.status-draw {
  display: flex;
  flex-direction: column;
  align-items: center;
  width: 100%;
}

.win-message,
.draw-message {
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

.toggle-details-btn {
  margin-left: 8px;
  padding: 2px 6px;
  background-color: rgba(255, 255, 255, 0.3);
  border: none;
  border-radius: 4px;
  font-size: 0.8rem;
  cursor: pointer;
  transition: all 0.2s;
}

.toggle-details-btn:hover {
  background-color: rgba(255, 255, 255, 0.5);
}

.connection-details {
  width: 100%;
  margin-top: 10px;
  background-color: #f8f9fa;
  border-radius: 8px;
  padding: 10px;
  font-size: 0.9rem;
  display: flex;
  flex-direction: column;
  gap: 8px;
  text-align: left;
  border: 1px solid #e0e0e0;
}

.connection-info-item {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 5px;
}

.info-label {
  font-weight: 600;
  color: #555;
  min-width: 80px;
}

.info-value {
  color: #4a55a2;
  word-break: break-all;
}

.error-text {
  color: #c62828;
}

.copy-button {
  background-color: #eee;
  border: none;
  padding: 2px 6px;
  border-radius: 4px;
  font-size: 0.8rem;
  cursor: pointer;
  margin-left: 5px;
}

.copy-button:hover {
  background-color: #ddd;
}

.online-status-win {
  margin-top: 15px;
  padding: 4px 10px;
  border-radius: 12px;
  font-size: 0.9rem;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-wrap: wrap;
}

@media (max-width: 768px) {
  .game-status {
    padding: 12px 16px;
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
  
  .connection-details {
    padding: 8px;
  }
  
  .connection-info-item {
    flex-direction: column;
    align-items: flex-start;
    margin-bottom: 8px;
  }
  
  .info-label {
    min-width: auto;
  }
}

@media (max-width: 480px) {
  .status-win, .status-draw {
    padding: 0.5rem;
  }
}
</style>