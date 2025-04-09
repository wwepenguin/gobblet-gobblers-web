<template>
  <div class="game-board">
    <div class="board-grid">
      <div v-for="(row, y) in board" :key="`row-${y}`" class="board-row">
        <div v-for="(cell, x) in row" :key="`cell-${x}-${y}`" class="board-cell"
          :class="{ 'cell-highlight': isValidMove(x, y) }" @click="handleCellClick(x, y)">
          <div v-if="getTopPiece(cell.stack)" class="piece-container">
            <GamePiece :piece="getTopPiece(cell.stack)!" :selectable="isPieceSelectable(getTopPiece(cell.stack))"
              :selected="isPieceSelected(x, y)" @select="selectBoardPiece(getTopPiece(cell.stack), x, y)" />
          </div>
          <div v-else class="cell-empty"></div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import GamePiece from './GamePiece.vue';
import { useGameStore } from '../../stores/gameStore';
import type { GamePiece as GamePieceType, GameState } from '../../types/game';

// 取得遊戲 store
const gameStore = useGameStore();

const props = defineProps<{
  online?: boolean;
  isMyTurn?: boolean;
}>();

const emit = defineEmits<{
  (e: 'move', piece: GameState['selectedPiece'], x: number, y: number): void;
  (e: 'select', piece: GamePieceType, x: number, y: number): void;
}>();

const board = computed(() => gameStore.board);
const selectedPiece = computed(() => gameStore.selectedPiece);
const currentPlayer = computed(() => gameStore.currentPlayer);

// 獲取棋盤格中頂部的棋子
const getTopPiece = (stack: any[]): GamePieceType | null => {
  if (stack.length === 0) {
    return null;
  }
  return stack[stack.length - 1].piece;
};

// 處理點擊棋盤格事件
const handleCellClick = (x: number, y: number) => {
  if (props.online && !props.isMyTurn) {
    return;
  }

  if (selectedPiece.value.piece && isValidMove(x, y)) {

    const movePiece = gameStore.placePiece(x, y);

    if (movePiece != false) {
      if (props.online) {
        emit('move', movePiece, x, y);
      }
    }
  }
};

// 選擇棋盤上的棋子
const selectBoardPiece = (piece: GamePieceType | null, x: number, y: number) => {
  if (props.online && !props.isMyTurn) {
    return;
  }

  if (piece && isPieceSelectable(piece)) {
    gameStore.selectPiece(piece, 'board', { x, y });

    if (props.online) {
      emit('select', piece, x, y);
    }
  }
};

// 檢查棋子是否可選
const isPieceSelectable = (piece: GamePieceType | null): boolean => {
  if (!piece) {
    return false;
  }

  // 只能選擇當前玩家的棋子
  return piece.player === currentPlayer.value;
};

// 檢查位置是否已被選中
const isPieceSelected = (x: number, y: number): boolean => {
  return (
    selectedPiece.value.source === 'board' &&
    selectedPiece.value.position?.x === x &&
    selectedPiece.value.position?.y === y
  );
};

// 檢查移動是否有效
const isValidMove = (x: number, y: number): boolean => {
  if (!selectedPiece.value.piece) {
    return false;
  }

  const targetCell = board.value[y][x];
  const topPiece = getTopPiece(targetCell.stack);

  // 如果選擇的來源是棋盤且位置與目標相同，則不是有效移動
  if (
    selectedPiece.value.source === 'board' &&
    selectedPiece.value.position?.x === x &&
    selectedPiece.value.position?.y === y
  ) {
    return false;
  }

  // 如果目標位置有更大或相同大小的棋子，則不是有效移動
  if (topPiece) {
    const selectedSize = getSizeValue(selectedPiece.value.piece.size);
    const topSize = getSizeValue(topPiece.size);

    if (selectedSize <= topSize) {
      return false;
    }
  }

  return true;
};

// 獲取棋子尺寸的數值
const getSizeValue = (size: string): number => {
  switch (size) {
    case 'small': return 1;
    case 'medium': return 2;
    case 'large': return 3;
    default: return 0;
  }
};
</script>

<style scoped>
.game-board {
  margin: 0 auto;
  display: flex;
  justify-content: center;
  align-items: center;
}

.board-grid {
  display: flex;
  flex-direction: column;
  background-color: #f0f0f0;
  border-radius: 12px;
  padding: 15px;
  box-shadow: 0 8px 30px rgba(0, 0, 0, 0.1);
}

.board-row {
  display: flex;
}

.board-cell {
  width: 100px;
  height: 100px;
  border: 2px solid #ddd;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  position: relative;
  background-color: white;
  transition: all 0.2s ease;
  border-radius: 4px;
  margin: 4px;
  aspect-ratio: 1 / 1;
}

/* 移動設備上的棋盤調整 */
@media (max-width: 768px) {
  .board-cell {
    width: 90px;
    height: 90px;
    margin: 3px;
    aspect-ratio: 1 / 1;
  }
}

/* 小屏幕上的棋盤調整 */
@media (max-width: 480px) {
  .board-cell {
    width: 75px;
    height: 75px;
    margin: 2px;
    aspect-ratio: 1 / 1;
  }

  .cell-empty {
    width: 15px;
    height: 15px;
    aspect-ratio: 1 / 1;
  }
}

.board-cell:hover {
  background-color: #f9f9f9;
}

.cell-highlight {
  background-color: rgba(74, 85, 162, 0.1);
  box-shadow: 0 0 0 2px rgba(74, 85, 162, 0.5);
}

.cell-empty {
  width: 20px;
  height: 20px;
  border-radius: 50%;
  background-color: #eee;
  aspect-ratio: 1 / 1;
}

.piece-container {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 100%;
  height: 100%;
}
</style>