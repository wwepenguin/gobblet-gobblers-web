import type { GameState } from './../types/game';
import { defineStore } from 'pinia';
import Peer from 'peerjs';
import type { OnlineGameState, PlayerType, ConnectionLogItem, GamePiece } from '../types/game';
import { useGameStore } from './gameStore';

// 擴展連線狀態類型
export type ConnectionStatus =
  | 'disconnected'
  | 'initializing'
  | 'waiting'
  | 'connecting'
  | 'connected'
  | 'error';

// 定義 OnlineStore 狀態
interface OnlineStoreState extends OnlineGameState {
  connectionStatus: ConnectionStatus;
  connectionError: string;
  connectionLogs: ConnectionLogItem[];
}

// 全域變數 (非 store 狀態)
let peer: Peer | null = null;
let connection: any = null;
let heartbeatInterval: any = null;
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

      console.log(`[${type.toUpperCase()}] ${message}`);
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

        console.log('初始化 Peer...');
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
          debug: 3 // 設定更詳細的除錯資訊 (0-3)
        });

        return new Promise<string>((resolve, reject) => {
          peer!.on('open', (id) => {
            console.log('Peer 打開連接，ID:', id);
            this.peerId = id;
            this.isHost = true;
            this.connectionStatus = 'waiting';
            this.addConnectionLog(`已取得連線 ID: ${id}，等待對手連線...`, 'success');
            console.log('Store 中的 peerId:', this.peerId);
            resolve(id);
          });

          peer!.on('error', (error) => {
            console.error('PeerJS 錯誤:', error);
            this.connectionStatus = 'error';
            this.connectionError = error.message || '連線失敗';
            this.addConnectionLog(`連線錯誤: ${error.message || '未知錯誤'}`, 'error');
            reject(error);
          });

          peer!.on('connection', (conn) => {
            console.log('連接到:', conn.peer);
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

            conn.on('error', (err: any) => {
              this.connectionStatus = 'error';
              this.connectionError = err.message || '連線過程中發生錯誤';
              this.addConnectionLog(`連線錯誤: ${err.message || '未知錯誤'}`, 'error');
            });
          });
        });
      } catch (error: any) {
        console.error('初始化 Peer 時出錯:', error);
        this.connectionStatus = 'error';
        this.connectionError = error.message || '初始化失敗';
        this.addConnectionLog(`初始化錯誤: ${error.message || '未知錯誤'}`, 'error');
        throw error;
      }
    },

    // 連接到另一個玩家
    connectToPeer(peerId: string) {
      if (!peer) {
        console.error('PeerJS 尚未初始化');
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

      connection.on('error', (err: any) => {
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
      heartbeatInterval = setInterval(() => {
        if (!connection || this.connectionStatus !== 'connected') {
          clearInterval(heartbeatInterval);
          heartbeatInterval = null;
          return;
        }

        // 檢查上次心跳回應時間，如果超過30秒沒回應，視為連線問題
        const now = Date.now();
        if (now - lastHeartbeatResponse > 30000) {
          this.addConnectionLog('警告：已超過30秒未收到對方回應，連線可能有問題', 'error');
          // 不立即斷開，但顯示警告
        }

        // 發送心跳
        this.sendData({
          type: 'heartbeat',
          id: `hb-${now}`
        });
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
    sendData(data: any) {
      if (!connection) {
        console.error('沒有活躍的連接');
        this.addConnectionLog('發送資料失敗：未建立連接', 'error');
        return false;
      }
      console.log(`發送資料:`, data);

      try {
        // 添加時間戳記，方便除錯
        const dataWithTimestamp = {
          ...data,
          timestamp: new Date().getTime()
        };

        connection.send(dataWithTimestamp);

        // 記錄發送的動作到日誌（只記錄關鍵操作）
        if (data.type === 'move' || data.type === 'select' || data.type === 'reset') {
          this.addConnectionLog(`發送 ${this.getActionName(data.type)} 動作`, 'info');
        }

        return true;
      } catch (error) {
        console.error('發送資料錯誤:', error);
        this.addConnectionLog(`發送資料失敗: ${error}`, 'error');
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
    handleDataReceived(data: any) {
      console.log('收到資料:', data);

      // 記錄收到的動作到日誌（只記錄關鍵操作）
      if (data.type === 'move' || data.type === 'select' || data.type === 'reset') {
        this.addConnectionLog(`收到對手的 ${this.getActionName(data.type)} 動作`, 'success');
      }

      // 檢查時間戳記，如果延遲太久就警告
      if (data.timestamp) {
        const delay = new Date().getTime() - data.timestamp;
        if (delay > 3000) { // 超過3秒就警告
          this.addConnectionLog(`注意：收到的資料延遲 ${Math.round(delay / 1000)} 秒`, 'info');
        }
      }

      switch (data.type) {
        case 'move':
          this.handleRemoteMove(data);
          break;
        case 'select':
          this.handleRemoteSelect(data);
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
          this.handleGameState(data);
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
          console.warn('未知的資料類型:', data);
          this.addConnectionLog(`收到未知類型的資料: ${data.type}`, 'error');
      }
    },

    // 處理遠端遊戲狀態
    handleGameState(data: any) {
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
      this.sendData({
        type: 'gameState',
        gameState: {
          currentPlayer: gameStore.currentPlayer
        }
      });
    },

    // 處理遠端移動
    handleRemoteMove(data: any) {
      const { x, y, piece, fromPosition, source } = data;
      const gameStore = useGameStore();

      console.log(`處理遠端移動動作: (${x}, ${y})`, data);

      // 先記錄棋盤更新前的狀態
      const topPieceBefore = gameStore.board[y][x].stack.length > 0
        ? JSON.stringify(gameStore.board[y][x].stack[gameStore.board[y][x].stack.length - 1])
        : "空";

      // 重要：確保先選擇正確的棋子，這是關鍵步驟
      if (piece) {
        // 記錄收到的棋子大小
        console.log(`收到的棋子大小: ${piece.size}, 玩家: ${piece.player}`);
        this.addConnectionLog(`收到 ${piece.size} 大小的棋子`, 'info');

        // 如果資料中有完整的棋子資訊，先選擇這個棋子
        if (source === 'board' && fromPosition) {
          // 從棋盤上移動
          gameStore.selectPiece(piece, 'board', fromPosition);
          console.log(`已選擇棋盤上的棋子：`, piece, fromPosition);
        } else {
          // 從手牌移動
          gameStore.selectPiece(piece, 'hand');
          console.log(`已選擇手牌中的棋子：`, piece);

          // 確保玩家手牌中有足夠的棋子
          const currentPlayer = gameStore.currentPlayer;
          if (piece.size && ['small', 'medium', 'large'].includes(piece.size) && 
              gameStore.playerPieces[currentPlayer][piece.size as 'small' | 'medium' | 'large'] <= 0) {
            console.error(`錯誤：玩家手牌中沒有 ${piece.size} 大小的棋子`);
            this.addConnectionLog(`錯誤：玩家手牌中沒有 ${piece.size} 大小的棋子`, 'error');
            // 嘗試尋找可用的替代棋子
            return;
            // this.findAlternativePiece(currentPlayer);
          }
        }
      } else {
        // 如果沒有棋子資訊，嘗試從當前玩家的手牌選擇一個
        const currentPlayer = gameStore.currentPlayer;
        return;
        // this.findAlternativePiece(currentPlayer);
      }

      // 執行移動
      const success = gameStore.placePiece(x, y);

      // 記錄棋盤更新後的狀態
      const topPieceAfter = gameStore.board[y][x].stack.length > 0
        ? JSON.stringify(gameStore.board[y][x].stack[gameStore.board[y][x].stack.length - 1])
        : "空";

      console.log(`棋盤更新結果：${success ? "成功" : "失敗"}, 位置(${x}, ${y})，更新前: ${topPieceBefore}, 更新後: ${topPieceAfter}`);

      // 記錄到連線日誌
      if (success) {
        this.addConnectionLog(`已在位置(${x}, ${y})成功執行對手的移動`, 'success');
      } else {
        this.addConnectionLog(`無法在位置(${x}, ${y})執行對手的移動`, 'error');
      }
    },

    // 處理遠端選擇
    handleRemoteSelect(data: any) {
      const { piece, source, position } = data;
      const gameStore = useGameStore();
      gameStore.selectPiece(piece, source, position);
    },

    // 發送移動
    sendMove(selectedPiece: GameState['selectedPiece'], x: number, y: number) {


      // 檢查棋子資訊是否完整
      if (!selectedPiece.piece) {
        console.error('錯誤：選擇的棋子資訊不完整');
        this.addConnectionLog('發送移動失敗：選擇的棋子資訊不完整', 'error');
        return false;
      }

      // 記錄發送的棋子大小，便於除錯
      console.log(`正在發送棋子大小: ${selectedPiece.piece!.size}, 位置: (${x}, ${y})`);
      this.addConnectionLog(`發送 ${selectedPiece.piece!.size} 大小的棋子到位置 (${x}, ${y})`, 'info');

      // 傳送更完整的資料，包含棋子和起始位置資訊
      return this.sendData({
        type: 'move',
        x,
        y,
        piece: selectedPiece.piece,
        source: selectedPiece.source,
        fromPosition: selectedPiece.position,
        timestamp: selectedPiece.lastSelectedTime || Date.now()
      });
    },

    // 發送選擇
    sendSelect(piece: any, source: 'board' | 'hand', position?: { x: number; y: number; }) {
      this.sendData({
        type: 'select',
        piece,
        source,
        position
      });
    },

    // 發送重置遊戲
    sendReset() {
      this.sendData({
        type: 'reset'
      });
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