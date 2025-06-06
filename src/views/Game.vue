<template>
  <div class="game-container">
    <div class="game-header">
      <div class="controls">
        <button class="control-button" @click="handleResetGame">重新開始</button>
        <button class="control-button" @click="goToHome">返回主頁</button>
      </div>
    </div>

    <GameStatus @restart="handleResetGame" :key="startTipKey" :online="false" :connection-status="'disconnected'" />

    <!-- 使用共用的 GameArea 元件，不再傳遞 move 和 select 事件處理函式 -->
    <GameArea :online="false" />
  </div>
</template>

<script setup lang="ts">
import { ref } from "vue";
import { useRouter } from 'vue-router';
import GameArea from '../components/game/GameArea.vue';
import GameStatus from '../components/game/GameStatus.vue';
import { useGameStore } from '../stores/gameStore';

const router = useRouter();
const gameStore = useGameStore();
const startTipKey = ref(0);

// 導航到主頁
const goToHome = () => {
  router.push('/');
};

// 重置遊戲
const handleResetGame = () => {
  gameStore.resetGame();
  startTipKey.value++; // 觸發先手提示重新顯示
};
</script>

<style scoped>
.game-container {
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
  justify-content: center;
  align-items: center;
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

/* 移動設備上的布局調整 */
@media (max-width: 768px) {
  .game-header {
    flex-direction: column;
    align-items: center;
    text-align: center;
  }

  .game-area {
    flex-direction: column;
    gap: 2rem;
  }

}

/* 小屏幕上的布局調整 */
@media (max-width: 480px) {
  .game-container {
    padding: 0.5rem;
  }

  .game-instructions {
    padding: 1rem;
  }
}
</style>