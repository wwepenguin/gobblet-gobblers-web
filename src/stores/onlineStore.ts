import { reactive } from 'vue';
import Peer from 'peerjs';
import type { OnlineGameState, PlayerType } from '../types/game';
import { gameStore, resetGame, placePiece, selectPiece, createPiece } from './gameStore';

// 擴展連線狀態類型
export type ConnectionStatus =
  | 'disconnected'
  | 'initializing'
  | 'waiting'
  | 'connecting'
  | 'connected'
  | 'error';

// 連線日誌項目類型
export interface ConnectionLogItem {
  time: Date;
  message: string;
  type: 'info' | 'error' | 'success';
}

// 創建初始線上遊戲狀態
const createInitialOnlineState = (): OnlineGameState & {
  connectionStatus: ConnectionStatus,
  connectionError: string,
  connectionLogs: ConnectionLogItem[];
} => {
  return {
    ...gameStore,
    peerId: '',
    connectionId: null,
    isHost: false,
    connectionStatus: 'disconnected',
    connectionError: '',
    connectionLogs: []
  };
};

// 創建線上遊戲存儲
export const onlineStore = reactive<OnlineGameState & {
  connectionStatus: ConnectionStatus,
  connectionError: string,
  connectionLogs: ConnectionLogItem[];
}>(createInitialOnlineState());

let peer: Peer | null = null;
let connection: any = null;

// 心跳和確認機制
let heartbeatInterval: any = null;
let lastHeartbeatResponse = 0;

// 開始心跳檢查
const startHeartbeat = () => {
  if (heartbeatInterval) {
    clearInterval(heartbeatInterval);
  }

  lastHeartbeatResponse = Date.now();

  // 每10秒發送一次心跳
  heartbeatInterval = setInterval(() => {
    if (!connection || onlineStore.connectionStatus !== 'connected') {
      clearInterval(heartbeatInterval);
      heartbeatInterval = null;
      return;
    }

    // 檢查上次心跳回應時間，如果超過30秒沒回應，視為連線問題
    const now = Date.now();
    if (now - lastHeartbeatResponse > 30000) {
      addConnectionLog('警告：已超過30秒未收到對方回應，連線可能有問題', 'error');
      // 不立即斷開，但顯示警告
    }

    // 發送心跳
    sendData({
      type: 'heartbeat',
      id: `hb-${now}`
    });
  }, 10000);
};

// 停止心跳檢查
const stopHeartbeat = () => {
  if (heartbeatInterval) {
    clearInterval(heartbeatInterval);
    heartbeatInterval = null;
  }
};

// 添加連線日誌
const addConnectionLog = (message: string, type: 'info' | 'error' | 'success' = 'info') => {
  onlineStore.connectionLogs.unshift({
    time: new Date(),
    message,
    type
  });

  // 限制日誌數量為最新的20條
  if (onlineStore.connectionLogs.length > 20) {
    onlineStore.connectionLogs.pop();
  }

  console.log(`[${type.toUpperCase()}] ${message}`);
};

// 清空連線日誌
export const clearConnectionLogs = () => {
  onlineStore.connectionLogs = [];
};

// 初始化 PeerJS
export const initPeer = () => {
  return new Promise<string>((resolve, reject) => {
    resetGame();

    try {
      addConnectionLog('初始化連線中...', 'info');
      onlineStore.connectionStatus = 'initializing';
      onlineStore.connectionError = '';

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

      peer.on('open', (id) => {
        console.log('Peer 打開連接，ID:', id);
        onlineStore.peerId = id;
        onlineStore.isHost = true;
        onlineStore.connectionStatus = 'waiting';
        addConnectionLog(`已取得連線 ID: ${id}，等待對手連線...`, 'success');
        console.log('Store 中的 peerId:', onlineStore.peerId);
        resolve(id);
      });

      peer.on('error', (error) => {
        console.error('PeerJS 錯誤:', error);
        onlineStore.connectionStatus = 'error';
        onlineStore.connectionError = error.message || '連線失敗';
        addConnectionLog(`連線錯誤: ${error.message || '未知錯誤'}`, 'error');
        reject(error);
      });

      peer.on('connection', (conn) => {
        console.log('連接到:', conn.peer);
        connection = conn;
        onlineStore.connectionId = conn.peer;
        onlineStore.connectionStatus = 'connecting';
        addConnectionLog(`對手 ${conn.peer} 嘗試連線...`, 'info');

        conn.on('open', () => {
          onlineStore.connectionStatus = 'connected';
          addConnectionLog(`與對手 ${conn.peer} 連線成功！`, 'success');
          startHeartbeat();
        });

        conn.on('data', (data: unknown) => {
          handleDataReceived(data);
        });

        conn.on('close', () => {
          onlineStore.connectionStatus = 'disconnected';
          onlineStore.connectionId = null;
          connection = null;
          stopHeartbeat();
          addConnectionLog('對手已斷開連線', 'info');
        });

        conn.on('error', (err: any) => {
          onlineStore.connectionStatus = 'error';
          onlineStore.connectionError = err.message || '連線過程中發生錯誤';
          addConnectionLog(`連線錯誤: ${err.message || '未知錯誤'}`, 'error');
        });
      });
    } catch (error: any) {
      console.error('初始化 Peer 時出錯:', error);
      onlineStore.connectionStatus = 'error';
      onlineStore.connectionError = error.message || '初始化失敗';
      addConnectionLog(`初始化錯誤: ${error.message || '未知錯誤'}`, 'error');
      reject(error);
    }
  });
};

// 連接到另一個玩家
export const connectToPeer = (peerId: string) => {
  if (!peer) {
    console.error('PeerJS 尚未初始化');
    addConnectionLog('連接失敗：PeerJS 尚未初始化', 'error');
    return;
  }

  resetGame();
  onlineStore.isHost = false;
  onlineStore.connectionStatus = 'connecting';
  onlineStore.connectionError = '';
  addConnectionLog(`正在連接到對手 ${peerId}...`, 'info');

  connection = peer.connect(peerId);

  connection.on('open', () => {
    onlineStore.connectionId = peerId;
    onlineStore.connectionStatus = 'connected';
    addConnectionLog(`已成功連接到對手 ${peerId}！`, 'success');
    startHeartbeat();
    // 連接後發送準備就緒消息
    sendData({ type: 'ready' });
  });

  connection.on('data', (data: unknown) => {
    handleDataReceived(data);
  });

  connection.on('close', () => {
    onlineStore.connectionStatus = 'disconnected';
    onlineStore.connectionId = null;
    connection = null;
    stopHeartbeat();
    addConnectionLog('對手已斷開連線', 'info');
  });

  connection.on('error', (err: any) => {
    onlineStore.connectionStatus = 'error';
    onlineStore.connectionError = err.message || '連線過程中發生錯誤';
    addConnectionLog(`連線錯誤: ${err.message || '未知錯誤'}`, 'error');
  });
};

// 斷開連接
export const disconnect = () => {
  if (connection) {
    connection.close();
  }

  if (peer) {
    peer.destroy();
    peer = null;
  }

  stopHeartbeat();
  addConnectionLog('已斷開連線', 'info');
  resetOnlineStore();
};

// 重置線上遊戲存儲
export const resetOnlineStore = () => {
  resetGame();
  const initialState = createInitialOnlineState();
  // 保留連線日誌
  const logs = [...onlineStore.connectionLogs];
  Object.assign(onlineStore, initialState);
  onlineStore.connectionLogs = logs;
};

// 發送資料
const sendData = (data: any) => {
  if (!connection) {
    console.error('沒有活躍的連接');
    addConnectionLog('發送資料失敗：未建立連接', 'error');
    return false;
  }

  try {
    // 添加時間戳記，方便除錯
    const dataWithTimestamp = {
      ...data,
      timestamp: new Date().getTime()
    };

    connection.send(dataWithTimestamp);

    // 記錄發送的動作到日誌（只記錄關鍵操作）
    if (data.type === 'move' || data.type === 'select' || data.type === 'reset') {
      addConnectionLog(`發送 ${getActionName(data.type)} 動作`, 'info');
    }

    return true;
  } catch (error) {
    console.error('發送資料錯誤:', error);
    addConnectionLog(`發送資料失敗: ${error}`, 'error');
    return false;
  }
};

// 獲取動作名稱（用於日誌顯示）
const getActionName = (type: string): string => {
  switch (type) {
    case 'move': return '移動';
    case 'select': return '選擇';
    case 'reset': return '重置';
    case 'ready': return '準備就緒';
    case 'gameState': return '遊戲狀態';
    case 'heartbeat': return '心跳';
    default: return type;
  }
};

// @ts-ignore
const handleDataReceived = (data: any) => {
  console.log('收到資料:', data);

  // 記錄收到的動作到日誌（只記錄關鍵操作）
  if (data.type === 'move' || data.type === 'select' || data.type === 'reset') {
    addConnectionLog(`收到對手的 ${getActionName(data.type)} 動作`, 'success');
  }

  // 檢查時間戳記，如果延遲太久就警告
  if (data.timestamp) {
    const delay = new Date().getTime() - data.timestamp;
    if (delay > 3000) { // 超過3秒就警告
      addConnectionLog(`注意：收到的資料延遲 ${Math.round(delay / 1000)} 秒`, 'info');
    }
  }

  switch (data.type) {
    case 'move':
      handleRemoteMove(data);
      break;
    case 'select':
      handleRemoteSelect(data);
      break;
    case 'ready':
      // 對方準備就緒
      addConnectionLog('對手已準備就緒', 'info');
      // 如果是主機，在收到 ready 後發送遊戲狀態
      if (onlineStore.isHost) {
        sendGameState();
      }
      break;
    case 'gameState':
      // 收到遊戲狀態，更新本地遊戲
      handleGameState(data);
      break;
    case 'reset':
      addConnectionLog('對手重置了遊戲', 'info');
      resetGame();
      break;
    case 'heartbeat':
      // 更新心跳回應時間
      lastHeartbeatResponse = Date.now();
      addConnectionLog('收到心跳回應', 'info');
      break;
    default:
      console.warn('未知的資料類型:', data);
      addConnectionLog(`收到未知類型的資料: ${data.type}`, 'error');
  }
};

// 處理遠端遊戲狀態
const handleGameState = (data: any) => {
  if (data.gameState) {
    // 更新玩家角色
    gameStore.currentPlayer = data.gameState.currentPlayer;
  }
};

// 發送遊戲狀態
const sendGameState = () => {
  sendData({
    type: 'gameState',
    gameState: {
      currentPlayer: gameStore.currentPlayer
    }
  });
};

// 處理遠端移動
const handleRemoteMove = (data: any) => {
  const { x, y, piece, fromPosition } = data;
  console.log(`處理遠端移動動作: (${x}, ${y})`, data);

  // 先記錄棋盤更新前的狀態
  const topPieceBefore = gameStore.board[y][x].stack.length > 0
    ? JSON.stringify(gameStore.board[y][x].stack[gameStore.board[y][x].stack.length - 1])
    : "空";

  // 重要：確保先選擇正確的棋子，這是關鍵步驟
  if (piece) {
    // 如果資料中有完整的棋子資訊，先選擇這個棋子
    if (fromPosition) {
      // 從棋盤上移動
      selectPiece(piece, 'board', fromPosition);
      console.log(`已選擇棋盤上的棋子：`, piece, fromPosition);
    } else {
      // 從手牌移動
      selectPiece(piece, 'hand');
      console.log(`已選擇手牌中的棋子：`, piece);
    }
  } else {
    // 如果沒有棋子資訊，嘗試從當前玩家的手牌選擇一個
    const currentPlayer = gameStore.currentPlayer;
    // 先嘗試大棋子，如果沒有，再嘗試中等，然後小棋子
    const sizes = ['large', 'medium', 'small'] as const;

    let selectedPiece = null;
    let selectedSize = null;

    for (const size of sizes) {
      if (gameStore.playerPieces[currentPlayer][size] > 0) {
        selectedSize = size;
        break;
      }
    }

    if (selectedSize) {
      selectedPiece = createPiece(selectedSize, currentPlayer);
      selectPiece(selectedPiece, 'hand');
      console.log(`自動選擇手牌中的棋子：`, selectedPiece);
    } else {
      console.error('無法找到可用的棋子');
      addConnectionLog('無法找到可用的棋子執行對手的移動', 'error');
      return;
    }
  }

  // 執行移動
  const success = placePiece(x, y);

  // 記錄棋盤更新後的狀態
  const topPieceAfter = gameStore.board[y][x].stack.length > 0
    ? JSON.stringify(gameStore.board[y][x].stack[gameStore.board[y][x].stack.length - 1])
    : "空";

  console.log(`棋盤更新結果：${success ? "成功" : "失敗"}, 位置(${x}, ${y})，更新前: ${topPieceBefore}, 更新後: ${topPieceAfter}`);

  // 記錄到連線日誌
  if (success) {
    addConnectionLog(`已在位置(${x}, ${y})成功執行對手的移動`, 'success');
  } else {
    addConnectionLog(`無法在位置(${x}, ${y})執行對手的移動`, 'error');
  }
};

// 處理遠端選擇
const handleRemoteSelect = (data: any) => {
  const { piece, source, position } = data;
  selectPiece(piece, source, position);
};

// 發送移動
export const sendMove = (x: number, y: number) => {
  // 取得選擇的棋子資訊
  const selectedPiece = gameStore.selectedPiece;

  // 傳送更完整的資料，包含棋子和起始位置資訊
  sendData({
    type: 'move',
    x,
    y,
    piece: selectedPiece.piece,
    source: selectedPiece.source,
    fromPosition: selectedPiece.position
  });
};

// 發送選擇
export const sendSelect = (piece: any, source: 'board' | 'hand', position?: { x: number; y: number; }) => {
  sendData({
    type: 'select',
    piece,
    source,
    position
  });
};

// 發送重置遊戲
export const sendReset = () => {
  sendData({
    type: 'reset'
  });
  resetGame();
};

// 獲取當前連接狀態訊息
export const getConnectionStatusMessage = (): string => {
  switch (onlineStore.connectionStatus) {
    case 'connected':
      return '已連接';
    case 'connecting':
      return '連接中...';
    case 'disconnected':
      return '未連接';
    default:
      return '未知狀態';
  }
};

// 獲取當前玩家角色
export const getPlayerRole = (): PlayerType => {
  return onlineStore.isHost ? 'player1' : 'player2';
};

// 檢查是否輪到當前玩家
export const isMyTurn = (): boolean => {
  return gameStore.currentPlayer === getPlayerRole();
};