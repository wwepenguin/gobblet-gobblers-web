import { reactive } from 'vue';
import Peer from 'peerjs';
import type { OnlineGameState, PlayerType } from '../types/game';
import { gameStore, resetGame, placePiece, selectPiece } from './gameStore';

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
      // peer = new Peer({
      //   config: {
      //     iceServers: [
      //       { urls: 'stun:stun.l.google.com:19302' },
      //       { urls: 'stun:global.stun.twilio.com:3478?transport=udp' }
      //     ]
      //   }
      // })
      peer = new Peer();

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
        });

        conn.on('data', (data: unknown) => {
          handleDataReceived(data);
        });

        conn.on('close', () => {
          onlineStore.connectionStatus = 'disconnected';
          onlineStore.connectionId = null;
          connection = null;
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
    return;
  }

  try {
    connection.send(data);
  } catch (error) {
    console.error('發送資料錯誤:', error);
  }
};

// @ts-ignore
const handleDataReceived = (data: any) => {
  console.log('收到資料:', data);

  switch (data.type) {
    case 'move':
      handleRemoteMove(data);
      break;
    case 'select':
      handleRemoteSelect(data);
      break;
    case 'ready':
      // 對方準備就緒
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
      resetGame();
      break;
    default:
      console.warn('未知的資料類型:', data);
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
  const { x, y } = data;
  placePiece(x, y);
};

// 處理遠端選擇
const handleRemoteSelect = (data: any) => {
  const { piece, source, position } = data;
  selectPiece(piece, source, position);
};

// 發送移動
export const sendMove = (x: number, y: number) => {
  sendData({
    type: 'move',
    x,
    y
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