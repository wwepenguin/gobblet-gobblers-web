<template>
    <div class="game-area">
        <PlayerHand player="player1" :online="online"
            :is-my-turn="online ? (isMyTurn && playerRole === 'player1') : (currentPlayer === 'player1')"
            @select="handleHandSelect" />

        <div class="board-container">
            <GameBoard :online="online" :is-my-turn="isMyTurn" @move="handleMove" @select="handleSelect" />
        </div>

        <PlayerHand player="player2" :online="online"
            :is-my-turn="online ? (isMyTurn && playerRole === 'player2') : (currentPlayer === 'player2')"
            @select="handleHandSelect" />
    </div>
</template>

<script setup lang="ts">
import GameBoard from './GameBoard.vue';
import PlayerHand from './PlayerHand.vue';
import { useGameStore } from '../../stores/gameStore';
import { computed } from 'vue';
import type { GamePiece, GameState } from '../../types/game';


// 取得遊戲 store
const gameStore = useGameStore();

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

// 定義事件
const emit = defineEmits(['move', 'select']);

// 計算目前玩家
const currentPlayer = computed(() => gameStore.currentPlayer);

// 處理移動
const handleMove = (piece: GameState['selectedPiece'], x: number, y: number) => {
    emit('move', piece, x, y);
};

// 處理棋盤選擇
const handleSelect = (piece: any, x: number, y: number) => {
    console.log('[GameArea::handleSelect]選擇棋子:', piece, '位置:', x, y);
    emit('select', piece, x, y);
};

// 處理手牌選擇
const handleHandSelect = (piece: any) => {
    console.log('[GameArea::handleHandSelect]選擇手牌棋子:', piece);
    emit('select', piece, -1, -1); // 用 -1, -1 表示這是從手牌選擇的棋子
};
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