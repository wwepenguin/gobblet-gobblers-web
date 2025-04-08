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
    position?: { x: number; y: number };
  };
  gameStatus: 'playing' | 'win' | 'draw';
  winner: PlayerType | null;
  moveHistory: Array<{
    player: PlayerType;
    from: { x: number; y: number } | 'hand';
    to: { x: number; y: number };
    piece: GamePiece;
  }>;
}

export interface OnlineGameState extends GameState {
  peerId: string;
  connectionId: string | null;
  isHost: boolean;
  connectionStatus: ConnectionStatus;
  connectionError?: string;
  connectionLogs?: ConnectionLogItem[];
} 