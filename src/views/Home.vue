<template>
  <div class="home-container">
    <div class="game-modes">
      <div class="mode-card" @click="goToSinglePlayer">
        <div class="mode-icon">
          <i class="icon single-player"></i>
        </div>
        <h2>單人遊戲</h2>
        <p>與電腦或本地玩家對戰</p>
      </div>
      
      <div class="mode-card" @click="goToOnlineGame">
        <div class="mode-icon">
          <i class="icon online-game"></i>
        </div>
        <h2>線上遊戲</h2>
        <p>和朋友在線上對戰</p>
      </div>
    </div>

    <div class="game-rules">
      <h2>遊戲規則</h2>
      <p>Gobblet Gobblers 是一個策略性棋盤遊戲，目標是將自己的三個棋子連成一直線（橫、豎或對角線）。</p>
      <ul>
        <li>每位玩家有棋子分別為三種不同大小</li>
        <li>大的棋子可以蓋住小的棋子</li>
        <li>當一個棋子移動後，它下面被蓋住的棋子會被顯露出來</li>
        <li>玩家可以從手上放置新棋子，或移動棋盤上已有的自己的棋子</li>
      </ul>
    </div>
  </div>
</template>

<script setup lang="ts">
import { useRouter } from 'vue-router'

const router = useRouter()

const goToSinglePlayer = () => {
  router.push('/game')
}

const goToOnlineGame = () => {
  router.push('/online')
}
</script>

<style scoped>
.home-container {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 3rem;
  padding: 2rem;
}

.game-title {
  text-align: center;
  margin-bottom: 2rem;
}

.game-title h1 {
  font-size: 3rem;
  color: #4a55a2;
  margin-bottom: 0.5rem;
}

.game-modes {
  display: flex;
  gap: 2rem;
  justify-content: center;
  flex-wrap: wrap;
  width: 100%;
  max-width: 900px;
}

.mode-card {
  background: white;
  border-radius: 12px;
  padding: 2rem;
  width: 300px;
  text-align: center;
  box-shadow: 0 8px 16px rgba(0, 0, 0, 0.1);
  cursor: pointer;
  transition: transform 0.3s ease, box-shadow 0.3s ease;
}

.mode-card:hover {
  transform: translateY(-10px);
  box-shadow: 0 12px 20px rgba(0, 0, 0, 0.15);
}

.mode-icon {
  height: 100px;
  display: flex;
  align-items: center;
  justify-content: center;
  margin-bottom: 1.5rem;
}

.icon {
  width: 80px;
  height: 80px;
  background-size: contain;
  background-repeat: no-repeat;
  background-position: center;
}

.single-player {
  background-image: url('../assets/icons/single-player.svg');
}

.online-game {
  background-image: url('../assets/icons/online-game.svg');
}

.game-rules {
  background: white;
  border-radius: 12px;
  padding: 2rem;
  width: 100%;
  max-width: 900px;
  box-shadow: 0 8px 16px rgba(0, 0, 0, 0.1);
}

.game-rules h2 {
  color: #4a55a2;
  margin-bottom: 1rem;
}

.game-rules ul {
  padding-left: 2rem;
  margin-top: 1rem;
}

.game-rules li {
  margin-bottom: 0.5rem;
}
</style> 