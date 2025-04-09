<template>
    <div class="game-area">
        <PlayerHand player="player1" :online="online"
            :is-my-turn="online ? (isMyTurn && playerRole === 'player1') : (currentPlayer === 'player1')" />

        <div class="board-container">
            <GameBoard :online="online" :is-my-turn="isMyTurn" />
        </div>

        <PlayerHand player="player2" :online="online"
            :is-my-turn="online ? (isMyTurn && playerRole === 'player2') : (currentPlayer === 'player2')" />
    </div>
</template>

<script setup lang="ts">
import GameBoard from './GameBoard.vue';
import PlayerHand from './PlayerHand.vue';
import { useGameStore } from '../../stores/gameStore';
import { useOnlineStore } from '../../stores/onlineStore';
import { computed } from 'vue';
import type { GamePiece, GameState } from '../../types/game';

// 定義屬性
const props = defineProps({
    // 是否為線上模式
    online: {
        type: Boolean,
        default: false
    },
    // 線上模式專用屬性
    isMyTurn: {
        type: Boolean,
        default: true
    },
    // 玩家角色 (線上模式)
    playerRole: {
        type: String,
        default: 'player1'
    }
});

// 取得遊戲 store
const gameStore = useGameStore();

// 計算目前玩家
const currentPlayer = computed(() => gameStore.currentPlayer);

</script>

<style scoped>
.game-area {
    display: flex;
    justify-content: center;
    align-items: center;
    margin: 2rem 0;

    &.player1 {
        order: 1;
    }

    &.player2 {
        order: 3;
    }

    &.board-container {
        order: 2;
    }
}

.board-container {
    flex: 1;
    display: flex;
    justify-content: center;
}

/* 移動裝置上的布局調整 */
@media (max-width: 768px) {
    .game-area {
        flex-direction: column;
        gap: 2rem;
    }
}
</style>