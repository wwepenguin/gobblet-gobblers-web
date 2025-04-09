<template>
  <div class="online-game-container">
    <div class="game-header">
      <!-- <h1>Gobblet Gobblers - 線上對戰</h1> -->
      <div class="controls">
        <button class="control-button" @click="resetGame">重新開始</button>
        <button class="control-button" @click="disconnect">斷開連接</button>
        <button class="control-button" @click="goToHome">返回主頁</button>
      </div>
    </div>

    <!-- 連線狀態顯示 -->
    <div class="connection-status-banner" :class="connectionStatus">
      <div class="status-icon"></div>
      <span class="status-text">{{ connectionStatusMessage }}</span>
    </div>

    <!-- 連線錯誤顯示 -->
    <div v-if="connectionStatus === 'error'" class="error-message">
      {{ onlineStore.connectionError }}
    </div>

    <!-- 未連接狀態 - 顯示創建/加入遊戲選項 -->
    <div v-if="connectionStatus === 'disconnected'" class="connection-panel">
      <div class="connection-options">
        <div class="connection-option">
          <button class="action-button" @click="createGame">創建遊戲</button>
          <div v-if="peerId" class="peer-id-display">
            <p>遊戲 ID：({{ peerId }})</p>
            <div class="peer-id">
              <span>{{ peerId }}</span>
              <button class="copy-button" @click="copyPeerId">複製</button>
            </div>
            <p class="help-text">分享此 ID 給朋友來連接</p>
          </div>
        </div>

        <div class="divider"></div>

        <div class="connection-option">
          <h3>加入遊戲</h3>
          <div class="join-form">
            <input v-model="connectId" type="text" placeholder="輸入遊戲 ID" class="peer-input" />
            <button class="action-button" @click="joinGame" :disabled="!connectId">
              加入
            </button>
          </div>
        </div>
      </div>

      <!-- 連線日誌顯示 -->
      <div class="connection-logs">
        <h4>連線日誌</h4>
        <button class="small-button" @click="clearLogs">清除</button>
        <div class="logs-container">
          <div v-for="(log, index) in onlineStore.connectionLogs" :key="index" class="log-item" :class="log.type">
            <span class="log-time">{{ formatTime(log.time) }}</span>
            <span class="log-message">{{ log.message }}</span>
          </div>
          <div v-if="onlineStore.connectionLogs.length === 0" class="no-logs">
            沒有連線記錄
          </div>
        </div>
      </div>
    </div>

    <!-- 連接中狀態 - 顯示等待玩家連接 -->
    <div v-else-if="['initializing', 'waiting', 'connecting'].includes(connectionStatus)" class="connection-panel">
      <div class="waiting-panel">
        <h2>{{ connectionStatusMessage }}</h2>
        <div class="loader"></div>

        <div class="peer-id-display" v-if="isHost && peerId">
          <p>分享此遊戲 ID 給你的朋友：</p>
          <div class="peer-id">
            <span>{{ peerId }}</span>
            <button class="copy-button" @click="copyPeerId">複製</button>
          </div>
        </div>

        <button class="cancel-button" @click="disconnect">取消</button>
      </div>

      <!-- 連線日誌顯示 -->
      <div class="connection-logs">
        <h4>連線日誌</h4>
        <button class="small-button" @click="clearLogs">清除</button>
        <div class="logs-container">
          <div v-for="(log, index) in onlineStore.connectionLogs" :key="index" class="log-item" :class="log.type">
            <span class="log-time">{{ formatTime(log.time) }}</span>
            <span class="log-message">{{ log.message }}</span>
          </div>
        </div>
      </div>
    </div>

    <!-- 已連接狀態 - 顯示遊戲界面 -->
    <template v-else-if="connectionStatus === 'connected'">
      <GameStatus :online="true" :connection-status="connectionStatus" :is-host="isHost" :peer-id="peerId"
        :connection-id="onlineStore.connectionId || undefined" :connection-error="onlineStore.connectionError"
        @restart="sendReset" :key="startTipKey" />

      <!-- 使用共用的 GameArea 元件 -->
      <GameArea :online="true" :is-my-turn="isMyTurn" :player-role="playerRole" @move="sendMove" @select="sendSelect" />
    </template>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onBeforeUnmount, watch } from 'vue';
import { useRouter } from 'vue-router';
import GameBoard from '../components/game/GameBoard.vue';
import PlayerHand from '../components/game/PlayerHand.vue';
import GameStatus from '../components/game/GameStatus.vue';
import GameArea from '../components/game/GameArea.vue';
import { useOnlineStore } from '../stores/onlineStore';
import { useGameStore } from '../stores/gameStore';
import type { ConnectionStatus, GameState } from '../types/game';
import type { GamePiece } from '../types/game';
const router = useRouter();
const gameStore = useGameStore();
const onlineStore = useOnlineStore();

const connectId = ref('');
const peerId = computed(() => onlineStore.peerId);
const connectionStatus = computed(() => onlineStore.connectionStatus as ConnectionStatus);
const isHost = computed(() => onlineStore.isHost);
const playerRole = computed(() => onlineStore.getPlayerRole());
const isMyTurn = computed(() => onlineStore.isMyTurn());
const startTipKey = ref(0);

// 格式化時間
const formatTime = (date: Date) => {
  return date.toLocaleTimeString('zh-TW', {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit'
  });
};

// 清除連線日誌
const clearLogs = () => {
  onlineStore.clearConnectionLogs();
};

// 重置遊戲
const resetGame = () => {
  gameStore.resetGame();
};

// 連線狀態訊息
const connectionStatusMessage = computed(() => {
  switch (connectionStatus.value) {
    case 'disconnected':
      return '未連線';
    case 'initializing':
      return '初始化連線中...';
    case 'waiting':
      return '等待對手連線...';
    case 'connecting':
      return '正在建立連線...';
    case 'connected':
      return '連線成功，遊戲進行中';
    case 'error':
      return '連線錯誤';
    default:
      return '未知狀態';
  }
});

// 創建遊戲
const createGame = async () => {
  try {
    const id = await onlineStore.initPeer();
    console.log('創建遊戲成功，Peer ID:', id);
    // 確保 peerId 被正確設置
    if (!peerId.value) {
      alert('遊戲 ID 生成失敗，請重試');
    }
  } catch (error) {
    console.error('初始化 Peer 出錯:', error);
  }
};

// 加入遊戲
const joinGame = () => {
  if (!connectId.value) return;

  onlineStore.initPeer().then(() => {
    onlineStore.connectToPeer(connectId.value);
  }).catch(error => {
    console.error('連接錯誤:', error);
  });
};

// 複製 Peer ID
const copyPeerId = () => {
  if (peerId.value) {
    navigator.clipboard.writeText(peerId.value)
      .then(() => {
        alert('已複製遊戲 ID');
      })
      .catch(err => {
        console.error('複製出錯:', err);
      });
  }
};

// 斷開連接
const disconnect = () => {
  onlineStore.disconnect();
};

// 發送移動
const sendMove = (piece: GameState['selectedPiece'], x: number, y: number) => {
  onlineStore.sendMove(piece, x, y);
};

// 發送選擇
const sendSelect = (piece: any, x: number, y: number) => {
  console.log('[onlineGame::sendSelect] 選擇棋子:', piece, '位置:', x, y);
  onlineStore.sendSelect(piece, 'board', { x, y });
};

// 發送重置
const sendReset = () => {
  onlineStore.sendReset();
  startTipKey.value++; // 觸發先手提示重新顯示
};

// 返回主頁
const goToHome = () => {
  disconnect();
  router.push('/');
};

// 監聽 peerId 的變更
watch(() => onlineStore.peerId, (newValue) => {
  console.log('peerId 變更為:', newValue);
  if (newValue) {
    console.log('成功獲取 Peer ID');
  }
});

// 組件卸載前斷開連接
onBeforeUnmount(() => {
  disconnect();
});
</script>

<style scoped>
.online-game-container {
  max-width: 1200px;
  margin: 0 auto;
  padding: 1rem;
}

.game-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 1.5rem;
  flex-wrap: wrap;
  gap: 1rem;
}

.game-header h1 {
  color: #4a55a2;
  margin: 0;
  font-size: clamp(1.2rem, 5vw, 2rem);
}

.controls {
  display: flex;
  gap: 0.5rem;
  flex-wrap: wrap;
}

.control-button {
  display: flex;
  justify-content: center;
  align-items: center;
  background-color: #4a55a2;
  color: white;
  border: none;
  padding: 0.5rem 1rem;
  border-radius: 6px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s ease;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
}

.control-button:hover {
  background-color: #394280;
  transform: translateY(-2px);
  box-shadow: 0 4px 8px rgba(0, 0, 0, 0.2);
}

.connection-panel {
  background-color: white;
  border-radius: 12px;
  padding: 2rem;
  margin-top: 2rem;
  box-shadow: 0 4px 8px rgba(0, 0, 0, 0.1);
}

.connection-options {
  display: flex;
  justify-content: space-around;
  align-items: center;
}

.connection-option {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 1rem;
}

.connection-option h3 {
  color: #4a55a2;
  margin-top: 0;
  margin-bottom: 1.5rem;
}

.divider {
  width: 1px;
  background-color: #e0e0e0;
  margin: 0 2rem;
}

.action-button {
  background: linear-gradient(135deg, #4a55a2, #394280);
  color: white;
  border: none;
  border-radius: 6px;
  padding: 0.75rem 1.5rem;
  font-size: 1rem;
  cursor: pointer;
  transition: all 0.3s ease;
  box-shadow: 0 3px 6px rgba(0, 0, 0, 0.15);
}

.action-button:hover {
  background: linear-gradient(135deg, #394280, #2e355e);
  transform: translateY(-2px);
  box-shadow: 0 5px 10px rgba(0, 0, 0, 0.2);
}

.action-button:disabled {
  background: linear-gradient(135deg, #cccccc, #aaaaaa);
  cursor: not-allowed;
  transform: none;
  box-shadow: none;
}

.peer-id-display {
  margin-top: 1.5rem;
  text-align: center;
}

.peer-id {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 0.5rem;
  margin: 0.5rem 0;
}

.peer-id span {
  background-color: #f0f0f0;
  padding: 0.5rem 1rem;
  border-radius: 4px;
  font-family: monospace;
  font-size: 1rem;
}

.copy-button {
  background-color: #e0e0e0;
  border: none;
  padding: 0.25rem 0.5rem;
  border-radius: 4px;
  cursor: pointer;
}

.help-text {
  font-size: 0.9rem;
  color: #666;
}

.join-form {
  display: flex;
  flex-direction: column;
  gap: 1rem;
  width: 100%;
  max-width: 300px;
}

.peer-input {
  padding: 0.75rem;
  border: 1px solid #ddd;
  border-radius: 4px;
  font-size: 1rem;
  width: 100%;
}

.game-area {
  display: flex;
  justify-content: center;
  align-items: center;
  margin: 2rem 0;

  &.player1 {
    order: 1;
  }

  &.board-container {
    order: 2;
  }

  &.player2 {
    order: 3;
  }
}

.board-container {
  flex: 1;
  display: flex;
  justify-content: center;
}

/* 等待連接頁面樣式 */
.waiting-panel {
  text-align: center;
  padding: 2rem;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 1.5rem;
  width: 100%;
}

.waiting-panel h2 {
  color: #4a55a2;
  margin: 0;
}

.loader {
  width: 50px;
  height: 50px;
  border: 5px solid #f3f3f3;
  border-top: 5px solid #4a55a2;
  border-radius: 50%;
  animation: spin 1.5s linear infinite;
}

@keyframes spin {
  0% {
    transform: rotate(0deg);
  }

  100% {
    transform: rotate(360deg);
  }
}

.cancel-button {
  background: linear-gradient(135deg, #e74c3c, #c0392b);
  color: white;
  border: none;
  border-radius: 6px;
  padding: 0.75rem 1.5rem;
  font-size: 1rem;
  cursor: pointer;
  transition: all 0.3s ease;
  box-shadow: 0 3px 6px rgba(0, 0, 0, 0.15);
  margin-top: 1rem;
}

.cancel-button:hover {
  background: linear-gradient(135deg, #c0392b, #a33225);
  transform: translateY(-2px);
  box-shadow: 0 5px 10px rgba(0, 0, 0, 0.2);
}

/* 移動設備上的布局調整 */
@media (max-width: 768px) {
  .game-header {
    flex-direction: column;
    align-items: center;
    text-align: center;
  }

  .connection-options {
    flex-direction: column;
  }

  .divider {
    width: 80%;
    height: 1px;
    margin: 1.5rem 0;
  }

  .game-area {
    flex-direction: column;
    gap: 2rem;
  }

  .board-container {
    order: -1;
    /* 棋盤放在中間 */
  }
}

/* 小屏幕上的布局調整 */
@media (max-width: 480px) {
  .online-game-container {
    padding: 0.5rem;
  }

  .connection-panel {
    padding: 1rem;
  }

  .peer-id {
    flex-direction: column;
    gap: 0.5rem;
  }

  .peer-id span {
    width: 100%;
    overflow-x: auto;
    white-space: nowrap;
  }
}

/* 連線狀態橫幅 */
.connection-status-banner {
  padding: 10px 15px;
  border-radius: 8px;
  margin-bottom: 1rem;
  display: flex;
  align-items: center;
  transition: all 0.3s ease;
}

.connection-status-banner .status-icon {
  width: 12px;
  height: 12px;
  border-radius: 50%;
  margin-right: 10px;
}

.connection-status-banner .status-text {
  font-weight: 500;
}

/* 不同連線狀態的樣式 */
.connection-status-banner.disconnected {
  background-color: #f0f0f0;
  color: #666;
}

.connection-status-banner.disconnected .status-icon {
  background-color: #aaa;
}

.connection-status-banner.initializing,
.connection-status-banner.waiting,
.connection-status-banner.connecting {
  background-color: #fff8e1;
  color: #f57c00;
}

.connection-status-banner.initializing .status-icon,
.connection-status-banner.waiting .status-icon,
.connection-status-banner.connecting .status-icon {
  background-color: #ffa000;
  animation: pulse 1.5s infinite;
}

.connection-status-banner.connected {
  background-color: #e6f7e6;
  color: #2e7d32;
}

.connection-status-banner.connected .status-icon {
  background-color: #4caf50;
}

.connection-status-banner.error {
  background-color: #ffebee;
  color: #c62828;
}

.connection-status-banner.error .status-icon {
  background-color: #f44336;
}

@keyframes pulse {
  0% {
    opacity: 0.6;
  }

  50% {
    opacity: 1;
  }

  100% {
    opacity: 0.6;
  }
}

/* 錯誤訊息 */
.error-message {
  background-color: #ffebee;
  color: #c62828;
  padding: 15px;
  border-radius: 8px;
  margin-bottom: 1rem;
  border-left: 4px solid #f44336;
}

/* 連線日誌 */
.connection-logs {
  margin-top: 2rem;
  padding: 1rem;
  background-color: #f8f9fa;
  border-radius: 8px;
}

.connection-logs h4 {
  margin: 0 0 10px 0;
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.small-button {
  font-size: 0.8rem;
  padding: 3px 8px;
  background-color: #eee;
  border: none;
  border-radius: 4px;
  cursor: pointer;
}

.logs-container {
  max-height: 250px;
  overflow-y: auto;
  font-family: monospace;
  font-size: 0.9rem;
  background-color: #fcfcfc;
  border: 1px solid #eee;
  border-radius: 4px;
  padding: 8px;
}

.log-item {
  margin-bottom: 5px;
  padding: 5px;
  border-radius: 4px;
  display: flex;
}

.log-item.info {
  background-color: rgba(0, 0, 0, 0.03);
}

.log-item.success {
  background-color: rgba(76, 175, 80, 0.1);
}

.log-item.error {
  background-color: rgba(244, 67, 54, 0.1);
}

.log-time {
  color: #666;
  margin-right: 10px;
  white-space: nowrap;
}

.log-message {
  flex: 1;
}

.no-logs {
  color: #999;
  text-align: center;
  padding: 20px;
}

/* 連線信息顯示 */
.connection-info {
  background-color: #f5f5f5;
  padding: 15px;
  border-radius: 8px;
  margin-top: 20px;
  display: flex;
  flex-wrap: wrap;
  justify-content: space-around;
  font-size: 0.9rem;
}

.info-item {
  margin: 5px 10px;
}

.info-item .label {
  font-weight: 600;
  color: #555;
}

.info-item .value {
  margin-left: 5px;
  color: #4a55a2;
}

/* 小屏幕樣式調整 */
@media (max-width: 768px) {
  .connection-logs {
    margin-top: 1rem;
    padding: 0.5rem;
  }

  .logs-container {
    max-height: 150px;
  }

  .connection-info {
    flex-direction: column;
  }
}
</style>