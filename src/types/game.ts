export type PieceSize = 'small' | 'medium' | 'large';
export type PlayerType = 'player1' | 'player2';
export type ConnectionStatus = 'disconnected' | 'initializing' | 'waiting' | 'connecting' | 'connected' | 'error';

export interface ConnectionLogItem {
  time: Date;
  message: string;
  type: 'info' | 'error' | 'success';
}

export interface GamePiece {
  id: string;
  size: PieceSize;
  player: PlayerType;
}

export interface StackItem {
  piece: GamePiece | null;
  visible: boolean;
}

export type GameStack = StackItem[];

export interface BoardCell {
  x: number;
  y: number;
  stack: GameStack;
}

export type GameBoard = BoardCell[][];

export interface PlayerPieces {
  small: number;
  medium: number;
  large: number;
}

export interface GameState {
  board: GameBoard;
  currentPlayer: PlayerType;
  playerPieces: Record<PlayerType, PlayerPieces>;
  selectedPiece: {
    piece: GamePiece | null;
    source: 'board' | 'hand';
    position?: { x: number; y: number; };
    lastSelectedTime?: number; // 新增時間戳記，追蹤最後選擇的時間
    isValid?: boolean; // 標記選擇是否有效
  };
  gameStatus: 'playing' | 'win' | 'draw';
  winner: PlayerType | null;
  moveHistory: Array<{
    player: PlayerType;
    from: { x: number; y: number; } | 'hand';
    to: { x: number; y: number; };
    piece: GamePiece;
  }>;
}

// 線上遊戲狀態介面 (統一定義)
export interface OnlineStoreState {
  peerId: string;
  connectionId: string | null;
  isHost: boolean;
  connectionStatus: ConnectionStatus;
  connectionError: string;
  connectionLogs: ConnectionLogItem[];
}

// 遠端移動資料介面
export interface RemoteMoveData {
  x: number;
  y: number;
  piece?: GamePiece;
  fromPosition?: { x: number; y: number; };
  source?: 'board' | 'hand';
  timestamp?: number;
}

// 遠端選擇資料介面
export interface RemoteSelectData {
  piece: GamePiece;
  source: 'board' | 'hand';
  position?: { x: number; y: number; };
}

// 遠端遊戲狀態資料介面
export interface RemoteGameStateData {
  gameState: {
    currentPlayer: PlayerType;
  };
}