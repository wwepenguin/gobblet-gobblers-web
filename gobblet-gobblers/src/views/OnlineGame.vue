<template>
  <div class="online-game-container">
    <div class="game-header">
      <h1>Gobblet Gobblers - 線上對戰</h1>
      <div class="controls">
        <button class="control-button" @click="resetGame">重新開始</button>
        <button class="control-button" @click="disconnect">斷開連接</button>
        <button class="control-button" @click="goToHome">返回主頁</button>
      </div>
    </div>
    
    <!-- 未連接狀態 - 顯示創建/加入遊戲選項 -->
    <div v-if="connectionStatus === 'disconnected'" class="connection-panel">
      <div class="connection-options">
        <div class="connection-option">
          <h3>創建遊戲</h3>
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
            <input 
              v-model="connectId" 
              type="text" 
              placeholder="輸入遊戲 ID" 
              class="peer-input"
            />
            <button 
              class="action-button" 
              @click="joinGame" 
              :disabled="!connectId"
            >
              加入
            </button>
          </div>
        </div>
      </div>
    </div>
    
    <!-- 連接中狀態 - 顯示等待玩家連接 -->
    <div v-else-if="connectionStatus === 'connecting'" class="connection-panel">
      <div class="waiting-panel">
        <h2>等待玩家連接...</h2>
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
    </div>
    
    <!-- 已連接狀態 - 顯示遊戲界面 -->
    <template v-else-if="connectionStatus === 'connected'">
      <GameStatus 
        :online="true" 
        :connection-status="connectionStatus"
        :is-host="isHost"
        @restart="sendReset"
        :key="startTipKey"
      />
      
      <div class="game-area">
        <PlayerHand 
          player="player1" 
          :online="true"
          :is-my-turn="isMyTurn && getPlayerRole === 'player1'"
        />
        
        <div class="board-container">
          <GameBoard 
            :online="true"
            :is-my-turn="isMyTurn"
            @move="sendMove"
            @select="sendSelect"
          />
        </div>
        
        <PlayerHand 
          player="player2" 
          :online="true"
          :is-my-turn="isMyTurn && getPlayerRole === 'player2'"
        />
      </div>
    </template>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onBeforeUnmount, watch } from 'vue'
import { useRouter } from 'vue-router'
import GameBoard from '../components/game/GameBoard.vue'
import PlayerHand from '../components/game/PlayerHand.vue'
import GameStatus from '../components/game/GameStatus.vue'
import { 
  initPeer, 
  connectToPeer, 
  disconnect as disconnectPeer,
  sendMove as sendMoveAction,
  sendSelect as sendSelectAction,
  sendReset as sendResetAction,
  onlineStore,
  getPlayerRole as getRole,
  isMyTurn as checkMyTurn,
} from '../stores/onlineStore'
import { resetGame } from '../stores/gameStore'

const router = useRouter()
const connectId = ref('')
const peerId = computed(() => onlineStore.peerId)
const connectionStatus = computed(() => onlineStore.connectionStatus)
const isHost = computed(() => onlineStore.isHost)
const getPlayerRole = computed(() => getRole())
const isMyTurn = computed(() => checkMyTurn())
const startTipKey = ref(0)

// 創建遊戲
const createGame = async () => {
  try {
    const id = await initPeer()
    console.log('創建遊戲成功，Peer ID:', id)
    // 確保 peerId 被正確設置
    if (!peerId.value) {
      alert('遊戲 ID 生成失敗，請重試')
    }
  } catch (error) {
    console.error('初始化 Peer 出錯:', error)
    alert('創建遊戲失敗，請重試')
  }
}

// 加入遊戲
const joinGame = () => {
  if (!connectId.value) return
  
  initPeer().then(() => {
    connectToPeer(connectId.value)
  }).catch(error => {
    console.error('連接錯誤:', error)
  })
}

// 複製 Peer ID
const copyPeerId = () => {
  if (peerId.value) {
    navigator.clipboard.writeText(peerId.value)
      .then(() => {
        alert('已複製遊戲 ID')
      })
      .catch(err => {
        console.error('複製出錯:', err)
      })
  }
}

// 斷開連接
const disconnect = () => {
  disconnectPeer()
}

// 發送移動
const sendMove = (x: number, y: number) => {
  sendMoveAction(x, y)
}

// 發送選擇
const sendSelect = (piece: any, x: number, y: number) => {
  sendSelectAction(piece, 'board', { x, y })
}

// 發送重置
const sendReset = () => {
  sendResetAction()
  startTipKey.value++ // 觸發先手提示重新顯示
}

// 顯示當前 Peer ID
const showCurrentPeerId = () => {
  console.log('當前 Peer ID:', peerId.value)
  console.log('connectionStatus:', connectionStatus.value)
  console.log('onlineStore:', onlineStore)
  alert('當前 Peer ID: ' + (peerId.value || '無') + 
        '\n連接狀態: ' + connectionStatus.value)
}

// 返回主頁
const goToHome = () => {
  disconnect()
  router.push('/')
}

// 監聽 peerId 的變更
watch(() => onlineStore.peerId, (newValue) => {
  console.log('peerId 變更為:', newValue)
  if (newValue) {
    console.log('成功獲取 Peer ID')
  }
})

// 組件卸載前斷開連接
onBeforeUnmount(() => {
  disconnect()
})
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
  justify-content: space-between;
  align-items: center;
  margin: 3rem 0;
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
  0% { transform: rotate(0deg); }
  100% { transform: rotate(360deg); }
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
    order: -1; /* 棋盤放在中間 */
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
</style> 