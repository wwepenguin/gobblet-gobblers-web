<template>
  <div 
    class="game-piece" 
    :class="[
      `size-${piece.size}`, 
      `player-${piece.player}`, 
      { 'selectable': selectable, 'selected': selected }
    ]"
    @click="handleClick"
  >
    <div class="piece-inner"></div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import type { GamePiece as GamePieceType } from '../../types/game'

const props = defineProps<{
  piece: GamePieceType
  selectable?: boolean
  selected?: boolean
}>()

const emit = defineEmits<{
  (e: 'select', piece: GamePieceType): void
}>()

const handleClick = () => {
  if (props.selectable) {
    emit('select', props.piece)
  }
}
</script>

<style scoped>
.game-piece {
  position: relative;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  transition: all 0.3s cubic-bezier(0.25, 0.8, 0.25, 1);
  user-select: none;
}

.piece-inner {
  border-radius: 50%;
  width: 85%;
  height: 85%;
  transition: all 0.3s cubic-bezier(0.25, 0.8, 0.25, 1);
}

/* 玩家1的棋子 - 藍色系 */
.player-player1 {
  background: linear-gradient(135deg, #75a8f9, #4a55a2);
  box-shadow: 0 4px 8px rgba(74, 85, 162, 0.3);
}

.player-player1 .piece-inner {
  background: linear-gradient(135deg, #a5c8ff, #75a8f9);
}

/* 玩家2的棋子 - 紅色系 */
.player-player2 {
  background: linear-gradient(135deg, #ff7676, #e74c3c);
  box-shadow: 0 4px 8px rgba(231, 76, 60, 0.3);
}

.player-player2 .piece-inner {
  background: linear-gradient(135deg, #ffb8b8, #ff7676);
}

/* 棋子尺寸 */
.size-small {
  width: 40px;
  height: 40px;
  z-index: 1;
}

.size-medium {
  width: 60px;
  height: 60px;
  z-index: 2;
}

.size-large {
  width: 80px;
  height: 80px;
  z-index: 3;
}

/* 可選擇狀態 */
.selectable {
  cursor: pointer;
}

.selectable:hover {
  transform: translateY(-5px);
  box-shadow: 0 8px 16px rgba(0, 0, 0, 0.2);
}

/* 被選中狀態 */
.selected {
  transform: translateY(-8px);
  box-shadow: 0 12px 24px rgba(0, 0, 0, 0.3);
}

.selected .piece-inner {
  box-shadow: inset 0 0 15px rgba(255, 255, 255, 0.5);
}
</style> 