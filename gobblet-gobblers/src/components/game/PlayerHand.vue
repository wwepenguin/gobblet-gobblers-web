<template>
  <div class="player-hand" :class="{ 'active': isActive }">
    <div class="player-info">
      <div class="player-avatar" :class="`player-${player}`"></div>
      <div class="player-name">{{ playerName }}</div>
    </div>
    
    <div class="pieces-container">
      <div v-for="(count, size) in playerPieces" :key="`${player}-${size}`" class="piece-slot">
        <div v-if="count > 0" class="piece-stack">
          <GamePiece 
            v-for="i in count" 
            :key="`${player}-${size}-${i}`" 
            :piece="createPiece(size as PieceSize, player)" 
            :style="{ marginTop: `${(i-1) * -15}px` }"
            :selectable="isSelectable"
            :selected="isSelected(size as PieceSize)"
            @select="handleSelectPiece(size as PieceSize)"
          />
        </div>
        <div v-else class="empty-slot"></div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import GamePiece from './GamePiece.vue'
import { gameStore, selectPiece, createPiece } from '../../stores/gameStore'
import { PieceSize, PlayerType } from '../../types/game'

const props = defineProps<{
  player: PlayerType
  online?: boolean
  isMyTurn?: boolean
}>()

const emit = defineEmits<{
  (e: 'select', piece: any): void
}>()

const isActive = computed(() => !props.online || props.isMyTurn || gameStore.currentPlayer === props.player)
const playerPieces = computed(() => gameStore.playerPieces[props.player])
const playerName = computed(() => props.player === 'player1' ? '玩家 1' : '玩家 2')
const isSelectable = computed(() => {
  if (props.online) {
    return props.isMyTurn && gameStore.currentPlayer === props.player
  }
  return gameStore.currentPlayer === props.player
})

// 選擇手中的棋子
const handleSelectPiece = (size: PieceSize) => {
  if (!isSelectable.value) {
    return
  }
  
  const piece = createPiece(size, props.player)
  selectPiece(piece, 'hand')
  
  if (props.online) {
    emit('select', piece)
  }
}

// 檢查棋子是否已被選中
const isSelected = (size: PieceSize): boolean => {
  const { selectedPiece } = gameStore
  
  return (
    selectedPiece.piece !== null &&
    selectedPiece.source === 'hand' &&
    selectedPiece.piece.player === props.player &&
    selectedPiece.piece.size === size
  )
}
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
  gap: 30px;
  width: 100%;
}

.piece-slot {
  display: flex;
  justify-content: center;
  height: 80px;
  position: relative;
}

.piece-stack {
  display: flex;
  flex-direction: column;
  align-items: center;
  position: relative;
}

.empty-slot {
  width: 60px;
  height: 15px;
  background-color: #ddd;
  border-radius: 30px;
}
</style> 