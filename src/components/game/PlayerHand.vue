<template>
  <div class="player-hand" :class="{ 'active': isActive }">
    <div class="player-info">
      <div class="player-avatar" :class="`player-${player}`"></div>
      <div class="player-name">{{ playerName }}</div>
    </div>

    <div class="pieces-container">
      <div v-for="(count, size) in playerPieces" :key="`${player}-${size}`" class="piece-slot">
        <div v-if="count > 0" class="piece-stack">
          <GamePiece v-for="i in count" :key="`${player}-${size}-${i}`" :piece="createPiece(size as PieceSize, player)"
            :style="getStackStyle(i, count, size)" :selectable="isSelectable" :selected="isSelected(size as PieceSize)"
            @select="handleSelectPiece(size as PieceSize)" />
        </div>
        <div v-else class="empty-slot"></div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import GamePiece from './GamePiece.vue';
import { useGameStore } from '../../stores/gameStore';
import type { PieceSize, PlayerType } from '../../types/game';
import { useOnlineStore } from '../../stores/onlineStore';

// 取得遊戲 store
const gameStore = useGameStore();

const props = defineProps<{
  player: PlayerType;
  online?: boolean;
  isMyTurn?: boolean;
}>();

const emit = defineEmits<{
  (e: 'select', piece: any): void;
}>();

const isActive = computed(() => !props.online || props.isMyTurn || gameStore.currentPlayer === props.player);
const playerPieces = computed(() => gameStore.playerPieces[props.player]);
const playerName = computed(() => props.player === 'player1' ? '玩家 1' : '玩家 2');
const isSelectable = computed(() => {
  if (props.online) {
    return props.isMyTurn && gameStore.currentPlayer === props.player;
  }
  return gameStore.currentPlayer === props.player;
});

// 獲取堆疊樣式，考慮不同尺寸
const getStackStyle = (index: number, count: number, size: string) => {
  const isMobile = window.innerWidth <= 768;
  const isSmallScreen = window.innerWidth <= 480;

  // 根據棋子大小和螢幕尺寸調整堆疊間距
  let marginTop, offset;

  // 根據不同棋子尺寸調整堆疊間距
  if (size === 'large') {
    offset = isSmallScreen ? -9 : (isMobile ? -11 : -13);
  } else if (size === 'medium') {
    offset = isSmallScreen ? -7 : (isMobile ? -9 : -11);
  } else { // small
    offset = isSmallScreen ? -5 : (isMobile ? -7 : -9);
  }

  marginTop = `${(index - 1) * offset}px`; // 根據棋子大小調整間距

  return {
    marginTop,
    zIndex: count - index + 1 // 確保正確的堆疊順序
  };
};

// 建立棋子
const createPiece = (size: PieceSize, player: PlayerType) => {
  return gameStore.createPiece(size, player);
};

// 選擇手中的棋子
const handleSelectPiece = (size: PieceSize) => {
  if (!isSelectable.value) {
    return;
  }

  const piece = createPiece(size, props.player);
  gameStore.selectPiece(piece, 'hand');

  console.log('Selected piece:', gameStore.getSelectedPiece);

  if (props.online) {
    useOnlineStore().sendSelect(piece, 'board', { x: -1, y: -1 });

    // emit('select', piece);
    // console.log('Emitting select event for online mode', useGameStore().getSelectedPiece);

  }
};

// 檢查棋子是否已被選中
const isSelected = (size: PieceSize): boolean => {
  const { selectedPiece } = gameStore;

  return (
    selectedPiece.piece !== null &&
    selectedPiece.source === 'hand' &&
    selectedPiece.piece.player === props.player &&
    selectedPiece.piece.size === size
  );
};
</script>

<style scoped>
.player-hand {
  display: flex;
  flex-direction: column;
  align-items: center;
  border-radius: 12px;
  padding: 20px;
  background-color: #f9f9f9;
  width: 180px;
  transition: all 0.3s ease;
  box-shadow: 0 4px 8px rgba(0, 0, 0, 0.05);
  opacity: 0.8;
  overflow: visible;
}

.player-hand.active {
  opacity: 1;
  box-shadow: 0 6px 12px rgba(0, 0, 0, 0.1);
}

.player-info {
  display: flex;
  align-items: center;
  margin-bottom: 20px;
  gap: 12px;
}

.player-avatar {
  width: 40px;
  height: 40px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  aspect-ratio: 1 / 1;
}

.player-player1 {
  background: linear-gradient(135deg, #75a8f9, #4a55a2);
}

.player-player2 {
  background: linear-gradient(135deg, #ff7676, #e74c3c);
}

.player-name {
  font-weight: 600;
  font-size: 1.1rem;
}

.pieces-container {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: space-between;
  gap: 25px;
  width: 100%;
  padding: 8px 0;
  overflow: visible;
  height: auto;
}

.piece-slot {
  display: flex;
  justify-content: center;
  min-height: 90px;
  height: auto;
  position: relative;
  padding-top: 10px;
  padding-bottom: 10px;
  overflow: visible;
}

.piece-stack {
  display: flex;
  flex-direction: column;
  align-items: center;
  position: relative;
  min-height: 80px;
  height: auto;
}

.empty-slot {
  width: 60px;
  height: 15px;
  background-color: #ddd;
  border-radius: 30px;
  aspect-ratio: 4 / 1;
}

/* 移動設備上的手牌調整 */
@media (max-width: 768px) {
  .player-hand {
    width: 100%;
    padding: 15px;
    flex-direction: row;
    justify-content: space-around;
    max-width: 400px;
  }

  .player-info {
    margin-bottom: 0;
    margin-right: 15px;
    min-width: 80px;
  }

  .pieces-container {
    flex-direction: row;
    gap: 15px;
    justify-content: flex-start;
  }

  .piece-slot {
    height: auto;
    min-height: 80px;
    padding: 8px 0;
    width: 80px;
  }

  .piece-stack {
    min-height: 70px;
    height: auto;
    width: 100%;
  }
}

/* 小屏幕上的手牌調整 */
@media (max-width: 480px) {
  .player-hand {
    padding: 10px;
    max-width: 340px;
  }

  .player-info {
    min-width: 60px;
    margin-right: 10px;
  }

  .player-avatar {
    width: 30px;
    height: 30px;
    aspect-ratio: 1 / 1;
  }

  .player-name {
    font-size: 0.9rem;
  }

  .pieces-container {
    gap: 8px;
  }

  .piece-slot {
    width: 70px;
    min-height: 70px;
    padding: 6px 0;
  }

  .piece-stack {
    min-height: 60px;
    height: auto;
  }
}
</style>