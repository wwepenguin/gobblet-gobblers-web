import { reactive } from 'vue'
import type { GameState, PlayerType, GamePiece, PieceSize, GameBoard } from '../types/game'

// 創建一個新的遊戲棋盤
const createBoard = (): GameBoard => {
  const board: GameBoard = []
  
  for (let y = 0; y < 3; y++) {
    const row = []
    for (let x = 0; x < 3; x++) {
      row.push({
        x,
        y,
        stack: []
      })
    }
    board.push(row)
  }
  
  return board
}

// 創建初始遊戲狀態
const createInitialState = (): GameState => {
  // 隨機決定先手
  const firstPlayer: PlayerType = Math.random() < 0.5 ? 'player1' : 'player2'
  
  return {
    board: createBoard(),
    currentPlayer: firstPlayer,
    playerPieces: {
      player1: { small: 2, medium: 2, large: 2 },
      player2: { small: 2, medium: 2, large: 2 }
    },
    selectedPiece: {
      piece: null,
      source: 'hand'
    },
    gameStatus: 'playing',
    winner: null,
    moveHistory: []
  }
}

// 創建遊戲存儲
export const gameStore = reactive<GameState>(createInitialState())

// 重置遊戲
export const resetGame = () => {
  const initialState = createInitialState()
  Object.assign(gameStore, initialState)
}

// 選擇棋子
export const selectPiece = (piece: GamePiece | null, source: 'board' | 'hand', position?: { x: number; y: number }) => {
  gameStore.selectedPiece = { piece, source, position }
}

// 在棋盤上放置棋子
export const placePiece = (x: number, y: number) => {
  const { selectedPiece, currentPlayer } = gameStore
  
  if (!selectedPiece.piece || selectedPiece.piece.player !== currentPlayer) {
    return false
  }
  
  const targetCell = gameStore.board[y][x]
  const topPiece = getTopPiece(targetCell.stack)
  
  // 檢查是否可以放置棋子
  if (topPiece && getPieceSize(selectedPiece.piece.size) <= getPieceSize(topPiece.size)) {
    return false
  }
  
  // 從來源移除棋子
  if (selectedPiece.source === 'hand') {
    // 從玩家手中減少棋子數量
    gameStore.playerPieces[currentPlayer][selectedPiece.piece.size]--
  } else if (selectedPiece.source === 'board' && selectedPiece.position) {
    // 從棋盤上移除棋子
    const { x: fromX, y: fromY } = selectedPiece.position
    const sourceCell = gameStore.board[fromY][fromX]
    sourceCell.stack.pop()
  }
  
  // 將棋子添加到目標位置
  targetCell.stack.push({
    piece: selectedPiece.piece,
    visible: true
  })
  
  // 記錄移動
  gameStore.moveHistory.push({
    player: currentPlayer,
    from: selectedPiece.source === 'hand' ? 'hand' : selectedPiece.position!,
    to: { x, y },
    piece: selectedPiece.piece
  })
  
  // 重置選擇的棋子
  selectPiece(null, 'hand')
  
  // 檢查是否有獲勝者
  checkWinner()
  
  // 切換玩家
  if (gameStore.gameStatus === 'playing') {
    gameStore.currentPlayer = currentPlayer === 'player1' ? 'player2' : 'player1'
  }
  
  return true
}

// 檢查是否有贏家
const checkWinner = () => {
  const { board } = gameStore
  
  // 檢查行
  for (let y = 0; y < 3; y++) {
    if (checkLine([board[y][0], board[y][1], board[y][2]])) {
      return
    }
  }
  
  // 檢查列
  for (let x = 0; x < 3; x++) {
    if (checkLine([board[0][x], board[1][x], board[2][x]])) {
      return
    }
  }
  
  // 檢查對角線
  if (checkLine([board[0][0], board[1][1], board[2][2]])) {
    return
  }
  
  if (checkLine([board[0][2], board[1][1], board[2][0]])) {
    return
  }
  
  // 檢查平局
  const isBoardFull = board.every(row => 
    row.every(cell => getTopPiece(cell.stack) !== null)
  )
  
  if (isBoardFull) {
    gameStore.gameStatus = 'draw'
  }
}

// 檢查一行是否有相同玩家的棋子
const checkLine = (cells: { stack: { piece: GamePiece | null, visible: boolean }[] }[]) => {
  const topPieces = cells.map(cell => getTopPiece(cell.stack))
  
  // 確保所有位置都有棋子
  if (topPieces.some(piece => piece === null)) {
    return false
  }
  
  // 檢查是否都屬於同一玩家
  const firstPlayer = topPieces[0]!.player
  const isWinningLine = topPieces.every(piece => piece?.player === firstPlayer)
  
  if (isWinningLine) {
    gameStore.gameStatus = 'win'
    gameStore.winner = firstPlayer
    return true
  }
  
  return false
}

// 獲取棋子大小的數值
const getPieceSize = (size: PieceSize): number => {
  switch (size) {
    case 'small': return 1
    case 'medium': return 2
    case 'large': return 3
    default: return 0
  }
}

// 獲取堆疊頂部的棋子
const getTopPiece = (stack: { piece: GamePiece | null, visible: boolean }[]): GamePiece | null => {
  if (stack.length === 0) {
    return null
  }
  return stack[stack.length - 1].piece
}

// 建立新棋子
export const createPiece = (size: PieceSize, player: PlayerType): GamePiece => {
  return {
    id: `${player}-${size}-${Date.now()}`,
    size,
    player
  }
} 