import { defineStore } from 'pinia';
import type { GameState, PlayerType, GamePiece, PieceSize, GameBoard } from '../types/game';

// 建立一個新的遊戲棋盤
const createBoard = (): GameBoard => {
  const board: GameBoard = [];

  for (let y = 0; y < 3; y++) {
    const row = [];
    for (let x = 0; x < 3; x++) {
      row.push({
        x,
        y,
        stack: []
      });
    }
    board.push(row);
  }

  return board;
};

// 建立初始遊戲狀態
const createInitialState = (): GameState => {
  // 隨機決定先手
  const firstPlayer: PlayerType = Math.random() < 0.5 ? 'player1' : 'player2';

  return {
    board: createBoard(),
    currentPlayer: firstPlayer,
    playerPieces: {
      player1: { small: 2, medium: 2, large: 2 },
      player2: { small: 2, medium: 2, large: 2 }
    },
    selectedPiece: {
      piece: null,
      source: 'hand',
      lastSelectedTime: undefined,
      isValid: false
    },
    gameStatus: 'playing',
    winner: null,
    moveHistory: []
  };
};

// 定義 Pinia store
export const useGameStore = defineStore('game', {
  // 狀態
  state: (): GameState => createInitialState(),

  // getters
  getters: {
    getSelectedPiece: (state) => state.selectedPiece,
  },

  // 動作
  actions: {
    // 重置遊戲
    resetGame() {
      const initialState = createInitialState();
      Object.assign(this, initialState);
    },

    // 選擇棋子
    selectPiece(piece: GamePiece | null, source: 'board' | 'hand', position?: { x: number; y: number; }) {
      // debugger
      this.selectedPiece = {
        piece,
        source,
        position,
        lastSelectedTime: Date.now(),
        isValid: piece !== null
      };
      console.log('Selected piece:', this.selectedPiece, this.getSelectedPiece);
    },

    // 在棋盤上放置棋子
    placePiece(x: number, y: number): GameState['selectedPiece'] | false {
      if (!this.selectedPiece.piece || this.selectedPiece.piece.player !== this.currentPlayer) {
        return false;
      }

      const targetCell = this.board[y][x];
      const topPiece = this.getTopPiece(targetCell.stack);

      // 檢查是否可以放置棋子
      if (topPiece && this.getPieceSize(this.selectedPiece.piece.size) <= this.getPieceSize(topPiece.size)) {
        return false;
      }

      // 從來源移除棋子
      if (this.selectedPiece.source === 'hand') {
        // 從玩家手中減少棋子數量
        this.playerPieces[this.currentPlayer][this.selectedPiece.piece.size]--;
      } else if (this.selectedPiece.source === 'board' && this.selectedPiece.position) {
        // 從棋盤上移除棋子
        const { x: fromX, y: fromY } = this.selectedPiece.position;
        const sourceCell = this.board[fromY][fromX];
        sourceCell.stack.pop();
      }

      // 將棋子添加到目標位置
      targetCell.stack.push({
        piece: this.selectedPiece.piece,
        visible: true
      });

      // 記錄移動
      this.moveHistory.push({
        player: this.currentPlayer,
        from: this.selectedPiece.source === 'hand' ? 'hand' : this.selectedPiece.position!,
        to: { x, y },
        piece: this.selectedPiece.piece
      });

      const movePiece = this.selectedPiece;

      // 重置選擇的棋子
      this.selectPiece(null, 'hand');

      // 檢查是否有獲勝者
      this.checkWinner();

      // 切換玩家
      if (this.gameStatus === 'playing') {
        this.currentPlayer = this.currentPlayer === 'player1' ? 'player2' : 'player1';
      }

      return movePiece;
    },

    // 檢查是否有贏家
    checkWinner() {
      // 檢查行
      for (let y = 0; y < 3; y++) {
        if (this.checkLine([this.board[y][0], this.board[y][1], this.board[y][2]])) {
          return;
        }
      }

      // 檢查列
      for (let x = 0; x < 3; x++) {
        if (this.checkLine([this.board[0][x], this.board[1][x], this.board[2][x]])) {
          return;
        }
      }

      // 檢查對角線
      if (this.checkLine([this.board[0][0], this.board[1][1], this.board[2][2]])) {
        return;
      }

      if (this.checkLine([this.board[0][2], this.board[1][1], this.board[2][0]])) {
        return;
      }

      // 檢查平局
      const isBoardFull = this.board.every(row =>
        row.every(cell => this.getTopPiece(cell.stack) !== null)
      );

      if (isBoardFull) {
        this.gameStatus = 'draw';
      }
    },

    // 檢查一行是否有相同玩家的棋子
    checkLine(cells: { stack: { piece: GamePiece | null, visible: boolean; }[]; }[]): boolean {
      const topPieces = cells.map(cell => this.getTopPiece(cell.stack));

      // 確保所有位置都有棋子
      if (topPieces.some(piece => piece === null)) {
        return false;
      }

      // 檢查是否都屬於同一玩家
      const firstPlayer = topPieces[0]!.player;
      const isWinningLine = topPieces.every(piece => piece?.player === firstPlayer);

      if (isWinningLine) {
        this.gameStatus = 'win';
        this.winner = firstPlayer;
        return true;
      }

      return false;
    },

    // 獲取棋子大小的數值
    getPieceSize(size: PieceSize): number {
      switch (size) {
        case 'small': return 1;
        case 'medium': return 2;
        case 'large': return 3;
        default: return 0;
      }
    },

    // 獲取堆疊頂部的棋子
    getTopPiece(stack: { piece: GamePiece | null, visible: boolean; }[]): GamePiece | null {
      if (stack.length === 0) {
        return null;
      }
      return stack[stack.length - 1].piece;
    },

    // 建立新棋子
    createPiece(size: PieceSize, player: PlayerType): GamePiece {
      return {
        id: `${player}-${size}-${Date.now()}`,
        size,
        player
      };
    }
  },

});