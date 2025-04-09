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

// 資料動作類型
export type DataActionType = 'move' | 'select' | 'reset' | 'ready' | 'gameState' | 'heartbeat';

// 基本資料介面，包含所有共用屬性
export interface BaseDataPayload {
  type: DataActionType;
  timestamp?: number;
}

// 遠端移動資料介面
export interface RemoteMoveData extends BaseDataPayload {
  type: 'move';
  x: number;
  y: number;
  piece?: GamePiece;
  fromPosition?: { x: number; y: number; };
  source?: 'board' | 'hand';
}

// 遠端選擇資料介面
export interface RemoteSelectData extends BaseDataPayload {
  type: 'select';
  piece: GamePiece;
  source: 'board' | 'hand';
  position?: { x: number; y: number; };
}

// 遠端遊戲狀態資料介面
export interface RemoteGameStateData extends BaseDataPayload {
  type: 'gameState';
  gameState: {
    currentPlayer: PlayerType;
  };
}

// 心跳資料介面
export interface HeartbeatData extends BaseDataPayload {
  type: 'heartbeat';
  id: string;
}

// 重設資料介面
export interface ResetData extends BaseDataPayload {
  type: 'reset';
}

// 準備就緒資料介面
export interface ReadyData extends BaseDataPayload {
  type: 'ready';
}

// 聯合所有可能的資料類型
export type RemoteData =
  | RemoteMoveData
  | RemoteSelectData
  | RemoteGameStateData
  | HeartbeatData
  | ResetData
  | ReadyData;