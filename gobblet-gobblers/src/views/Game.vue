<template>
  <div class="game-container">
    <div class="game-header">
      <h1>Gobblet Gobblers - 單人遊戲</h1>
      <div class="controls">
        <button class="control-button" @click="handleResetGame">重新開始</button>
        <button class="control-button" @click="goToHome">返回主頁</button>
      </div>
    </div>
    
    <GameStatus @restart="handleResetGame" :key="startTipKey" />
    
    <div class="game-area">
      <PlayerHand player="player1" />
      
      <div class="board-container">
        <GameBoard />
      </div>
      
      <PlayerHand player="player2" />
    </div>
    
    <div class="game-instructions">
      <h3>如何遊玩</h3>
      <p>1. 點擊你的棋子並放置在棋盤上</p>
      <p>2. 大的棋子可以蓋住小的棋子</p>
      <p>3. 將三個棋子連成一直線(橫、豎或對角線)獲勝</p>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref } from "vue";
import { useRouter } from 'vue-router'
import GameBoard from '../components/game/GameBoard.vue'
import PlayerHand from '../components/game/PlayerHand.vue'
import GameStatus from '../components/game/GameStatus.vue'
import { resetGame } from '../stores/gameStore'

const router = useRouter()
const startTipKey = ref(0)

const goToHome = () => {
  router.push('/')
}

const handleResetGame = () => {
  resetGame()
  startTipKey.value++ // 觸發先手提示重新顯示
}
</script>

<style scoped>
.game-container {
  max-width: 1200px;
  margin: 0 auto;
  padding: 2rem;
}

.game-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 2rem;
}

.game-header h1 {
  color: #4a55a2;
  margin: 0;
}

.controls {
  display: flex;
  gap: 1rem;
}

.control-button {
  background-color: #f0f0f0;
  border: none;
  padding: 0.5rem 1rem;
  border-radius: 6px;
  font-weight: 500;
  cursor: pointer;
  transition: background-color 0.2s;
}

.control-button:hover {
  background-color: #e0e0e0;
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

.game-instructions {
  background-color: white;
  border-radius: 12px;
  padding: 1.5rem;
  margin-top: 2rem;
  box-shadow: 0 4px 8px rgba(0, 0, 0, 0.1);
}

.game-instructions h3 {
  color: #4a55a2;
  margin-top: 0;
}

.game-instructions p {
  margin: 0.5rem 0;
}
</style> 