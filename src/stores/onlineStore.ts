import { defineStore } from 'pinia';
import Peer from 'peerjs';
import type {
  PlayerType,
  ConnectionLogItem,
  GamePiece,
  PieceSize,
  OnlineStoreState,
  RemoteMoveData,
  RemoteSelectData,
  RemoteGameStateData,
  ConnectionStatus,
  RemoteData,
  BaseDataPayload,
  HeartbeatData
} from '../types/game';
import type { GameState } from '../types/game';
import { useGameStore } from './gameStore';
import type { DataConnection } from 'peerjs';

// 全域變數 (非 store 狀態)
let peer: Peer | null = null;
let connection: DataConnection | null = null;
let heartbeatInterval: number | null = null;
let lastHeartbeatResponse = 0;

// 定義 OnlineStore
export const useOnlineStore = defineStore('online', {
  state: (): OnlineStoreState => ({
    peerId: '',
    connectionId: null,
    isHost: false,
    connectionStatus: 'disconnected',
    connectionError: '',
    connectionLogs: []
  }),

  actions: {
    // 新增連線日誌
    addConnectionLog(message: string, type: 'info' | 'error' | 'success' = 'info') {
      this.connectionLogs.unshift({
        time: new Date(),
        message,
        type
      });

      // 限制日誌數量為最新的20條
      if (this.connectionLogs.length > 20) {
        this.connectionLogs.pop();
      }
    },

    // 清空連線日誌
    clearConnectionLogs() {
      this.connectionLogs = [];
    },

    // 初始化 PeerJS
    async initPeer() {
      const gameStore = useGameStore();
      gameStore.resetGame();

      try {
        this.addConnectionLog('初始化連線中...', 'info');
        this.connectionStatus = 'initializing';
        this.connectionError = '';

        peer = new Peer({
          config: {
            iceServers: [
              { urls: 'stun:stun.l.google.com:19302' },
              { urls: 'stun:stun1.l.google.com:19302' },
              { urls: 'stun:stun2.l.google.com:19302' },
              {
                url: 'turn:numb.viagenie.ca',
                credential: 'muazkh',
                username: 'webrtc@live.com'
              },
            ]
          },
          debug: 3
        });

        return new Promise<string>((resolve, reject) => {
          peer!.on('open', (id) => {
            this.peerId = id;
            this.isHost = true;
            this.connectionStatus = 'waiting';
            this.addConnectionLog(`已取得連線 ID: ${id}，等待對手連線...`, 'success');
            resolve(id);
          });

          peer!.on('error', (error) => {
            this.connectionStatus = 'error';
            this.connectionError = error.message || '連線失敗';
            this.addConnectionLog(`連線錯誤: ${error.message || '未知錯誤'}`, 'error');
            reject(error);
          });

          peer!.on('connection', (conn) => {
            connection = conn;
            this.connectionId = conn.peer;
            this.connectionStatus = 'connecting';
            this.addConnectionLog(`對手 ${conn.peer} 嘗試連線...`, 'info');

            conn.on('open', () => {
              this.connectionStatus = 'connected';
              this.addConnectionLog(`與對手 ${conn.peer} 連線成功！`, 'success');
              this.startHeartbeat();
            });

            conn.on('data', (data: unknown) => {
              this.handleDataReceived(data);
            });

            conn.on('close', () => {
              this.connectionStatus = 'disconnected';
              this.connectionId = null;
              connection = null;
              this.stopHeartbeat();
              this.addConnectionLog('對手已斷開連線', 'info');
            });

            conn.on('error', (err: Error) => {
              this.connectionStatus = 'error';
              this.connectionError = err.message || '連線過程中發生錯誤';
              this.addConnectionLog(`連線錯誤: ${err.message || '未知錯誤'}`, 'error');
            });
          });
        });
      } catch (error: unknown) {
        this.connectionStatus = 'error';
        this.connectionError = error instanceof Error ? error.message : '初始化失敗';
        this.addConnectionLog(`初始化錯誤: ${error instanceof Error ? error.message : '未知錯誤'}`, 'error');
        throw error;
      }
    },

    // 連接到另一個玩家
    connectToPeer(peerId: string) {
      if (!peer) {
        this.addConnectionLog('連接失敗：PeerJS 尚未初始化', 'error');
        return;
      }

      const gameStore = useGameStore();
      gameStore.resetGame();

      this.isHost = false;
      this.connectionStatus = 'connecting';
      this.connectionError = '';
      this.addConnectionLog(`正在連接到對手 ${peerId}...`, 'info');

      connection = peer.connect(peerId);

      connection.on('open', () => {
        this.connectionId = peerId;
        this.connectionStatus = 'connected';
        this.addConnectionLog(`已成功連接到對手 ${peerId}！`, 'success');
        this.startHeartbeat();
        // 連接後發送準備就緒消息
        this.sendData({ type: 'ready' });
      });

      connection.on('data', (data: unknown) => {
        this.handleDataReceived(data);
      });

      connection.on('close', () => {
        this.connectionStatus = 'disconnected';
        this.connectionId = null;
        connection = null;
        this.stopHeartbeat();
        this.addConnectionLog('對手已斷開連線', 'info');
      });

      connection.on('error', (err: Error) => {
        this.connectionStatus = 'error';
        this.connectionError = err.message || '連線過程中發生錯誤';
        this.addConnectionLog(`連線錯誤: ${err.message || '未知錯誤'}`, 'error');
      });
    },

    // 斷開連接
    disconnect() {
      if (connection) {
        connection.close();
      }

      if (peer) {
        peer.destroy();
        peer = null;
      }

      this.stopHeartbeat();
      this.addConnectionLog('已斷開連線', 'info');
      this.resetOnlineStore();
    },

    // 重置線上遊戲存儲
    resetOnlineStore() {
      const gameStore = useGameStore();
      gameStore.resetGame();

      // 保留連線日誌
      const logs = [...this.connectionLogs];

      // 重置所有狀態
      this.$reset();

      // 恢復連線日誌
      this.connectionLogs = logs;
    },

    // 開始心跳檢查
    startHeartbeat() {
      if (heartbeatInterval) {
        clearInterval(heartbeatInterval);
      }

      lastHeartbeatResponse = Date.now();

      // 每10秒發送一次心跳
      heartbeatInterval = window.setInterval(() => {
        if (!connection || this.connectionStatus !== 'connected') {
          if (heartbeatInterval) {
            clearInterval(heartbeatInterval);
            heartbeatInterval = null;
          }
          return;
        }

        // 檢查上次心跳回應時間，如果超過30秒沒回應，視為連線問題
        const now = Date.now();
        if (now - lastHeartbeatResponse > 30000) {
          this.addConnectionLog('警告：已超過30秒未收到對方回應，連線可能有問題', 'error');
        }

        // 發送心跳
        const heartbeatData: HeartbeatData = {
          type: 'heartbeat',
          id: `hb-${now}`
        };
        this.sendData(heartbeatData);
      }, 10000);
    },

    // 停止心跳檢查
    stopHeartbeat() {
      if (heartbeatInterval) {
        clearInterval(heartbeatInterval);
        heartbeatInterval = null;
      }
    },

    // 發送資料
    sendData<T extends RemoteData>(data: Omit<T, 'timestamp'>): boolean {
      if (!connection) {
        this.addConnectionLog('發送資料失敗：未建立連接', 'error');
        return false;
      }

      try {
        // 添加時間戳記
        const dataWithTimestamp = {
          ...data,
          timestamp: new Date().getTime()
        } as RemoteData;

        connection.send(dataWithTimestamp);

        // 記錄發送的動作到日誌（只記錄關鍵操作）
        if (data.type === 'move' || data.type === 'select' || data.type === 'reset') {
          this.addConnectionLog(`發送 ${this.getActionName(data.type)} 動作`, 'info');
        }

        return true;
      } catch (error) {
        this.addConnectionLog(`發送資料失敗: ${error instanceof Error ? error.message : String(error)}`, 'error');
        return false;
      }
    },

    // 獲取動作名稱（用於日誌顯示）
    getActionName(type: string): string {
      switch (type) {
        case 'move': return '移動';
        case 'select': return '選擇';
        case 'reset': return '重置';
        case 'ready': return '準備就緒';
        case 'gameState': return '遊戲狀態';
        case 'heartbeat': return '心跳';
        default: return type;
      }
    },

    // 處理接收到的資料
    handleDataReceived(data: unknown): void {
      // 先確認資料類型是否符合預期
      if (!this.isValidData(data)) {
        this.addConnectionLog(`收到無效的資料格式`, 'error');
        return;
      }

      const typedData = data as RemoteData;

      // 記錄收到的動作到日誌（只記錄關鍵操作）
      if (typedData.type === 'move' || typedData.type === 'select' || typedData.type === 'reset') {
        this.addConnectionLog(`收到對手的 ${this.getActionName(typedData.type)} 動作`, 'success');
      }

      // 檢查時間戳記，如果延遲太久就警告
      if (typedData.timestamp) {
        const delay = new Date().getTime() - typedData.timestamp;
        if (delay > 3000) { // 超過3秒就警告
          this.addConnectionLog(`注意：收到的資料延遲 ${Math.round(delay / 1000)} 秒`, 'info');
        }
      }

      switch (typedData.type) {
        case 'move':
          this.handleRemoteMove(typedData as RemoteMoveData);
          break;
        case 'select':
          this.handleRemoteSelect(typedData as RemoteSelectData);
          break;
        case 'ready':
          // 對方準備就緒
          this.addConnectionLog('對手已準備就緒', 'info');
          // 如果是主機，在收到 ready 後發送遊戲狀態
          if (this.isHost) {
            this.sendGameState();
          }
          break;
        case 'gameState':
          // 收到遊戲狀態，更新本地遊戲
          this.handleGameState(typedData as RemoteGameStateData);
          break;
        case 'reset':
          this.addConnectionLog('對手重置了遊戲', 'info');
          const gameStore = useGameStore();
          gameStore.resetGame();
          break;
        case 'heartbeat':
          // 更新心跳回應時間
          lastHeartbeatResponse = Date.now();
          break;
        default:
          this.addConnectionLog(`收到未知類型的資料: ${(typedData as BaseDataPayload).type}`, 'error');
      }
    },

    // 驗證接收到的資料是否符合預期格式
    isValidData(data: unknown): data is RemoteData {
      if (typeof data !== 'object' || data === null) {
        return false;
      }

      const payload = data as Partial<BaseDataPayload>;
      return payload.type !== undefined;
    },

    // 處理遠端遊戲狀態
    handleGameState(data: RemoteGameStateData) {
      if (data.gameState) {
        // 取得 gameStore
        const gameStore = useGameStore();
        // 更新玩家角色
        gameStore.currentPlayer = data.gameState.currentPlayer;
      }
    },

    // 發送遊戲狀態
    sendGameState() {
      const gameStore = useGameStore();
      const gameStateData: RemoteGameStateData = {
        type: 'gameState',
        gameState: {
          currentPlayer: gameStore.currentPlayer
        }
      };
      this.sendData(gameStateData);
    },

    // 處理遠端移動
    handleRemoteMove(data: RemoteMoveData) {
      const { x, y, piece, fromPosition, source } = data;
      const gameStore = useGameStore();

      // 重要：確保先選擇正確的棋子，這是關鍵步驟
      if (piece) {
        this.addConnectionLog(`收到 ${piece.size} 大小的棋子`, 'info');

        // 如果資料中有完整的棋子資訊，先選擇這個棋子
        if (source === 'board' && fromPosition) {
          // 從棋盤上移動
          gameStore.selectPiece(piece, 'board', fromPosition);
        } else {
          // 從手牌移動
          gameStore.selectPiece(piece, 'hand');

          // 確保玩家手牌中有足夠的棋子
          const currentPlayer = gameStore.currentPlayer;
          if (piece.size && ['small', 'medium', 'large'].includes(piece.size) &&
            gameStore.playerPieces[currentPlayer][piece.size as PieceSize] <= 0) {
            this.addConnectionLog(`錯誤：玩家手牌中沒有 ${piece.size} 大小的棋子`, 'error');
            return;
          }
        }
      } else {
        return;
      }

      // 執行移動
      const success = gameStore.placePiece(x, y);

      // 記錄到連線日誌
      if (success) {
        this.addConnectionLog(`已在位置(${x}, ${y})成功執行對手的移動`, 'success');
      } else {
        this.addConnectionLog(`無法在位置(${x}, ${y})執行對手的移動`, 'error');
      }
    },

    // 處理遠端選擇
    handleRemoteSelect(data: RemoteSelectData) {
      const { piece, source, position } = data;
      const gameStore = useGameStore();
      gameStore.selectPiece(piece, source, position);
    },

    sendMove(selectedPiece: GameState['selectedPiece'], x: number, y: number) {
      // 檢查棋子資訊是否完整
      if (!selectedPiece || !selectedPiece.piece) {
        this.addConnectionLog('發送移動失敗：選擇的棋子資訊不完整', 'error');
        return false;
      }

      this.addConnectionLog(`發送 ${selectedPiece.piece.size} 大小的棋子到位置 (${x}, ${y})`, 'info');

      // 傳送完整的資料，包含棋子和起始位置資訊
      const moveData: RemoteMoveData = {
        type: 'move',
        x,
        y,
        piece: selectedPiece.piece,
        source: selectedPiece.source,
        fromPosition: selectedPiece.position,
        timestamp: selectedPiece.lastSelectedTime || Date.now()
      };

      return this.sendData(moveData);
    },

    // 發送選擇
    sendSelect(piece: GamePiece, source: 'board' | 'hand', position?: { x: number; y: number; }) {
      const selectData: RemoteSelectData = {
        type: 'select',
        piece,
        source,
        position
      };
      this.sendData(selectData);
    },

    // 發送重置遊戲
    sendReset() {
      const resetData = {
        type: 'reset' as const
      };
      this.sendData(resetData);
      const gameStore = useGameStore();
      gameStore.resetGame();
    },

    // 獲取當前玩家角色
    getPlayerRole(): PlayerType {
      return this.isHost ? 'player1' : 'player2';
    },

    // 檢查是否輪到當前玩家
    isMyTurn(): boolean {
      const gameStore = useGameStore();
      return gameStore.currentPlayer === this.getPlayerRole();
    }
  },

  getters: {
    // 獲取當前連接狀態訊息
    connectionStatusMessage(): string {
      switch (this.connectionStatus) {
        case 'connected':
          return '已連接';
        case 'connecting':
          return '連接中...';
        case 'disconnected':
          return '未連接';
        default:
          return '未知狀態';
      }
    }
  }
});