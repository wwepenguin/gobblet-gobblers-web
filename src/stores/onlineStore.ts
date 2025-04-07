import { reactive } from 'vue'
import Peer from 'peerjs'
import type { OnlineGameState, PlayerType } from '../types/game'
import { gameStore, resetGame, placePiece, selectPiece } from './gameStore'

// 創建初始線上遊戲狀態
const createInitialOnlineState = (): OnlineGameState => {
  return {
    ...gameStore,
    peerId: '',
    connectionId: null,
    isHost: false,
    connectionStatus: 'disconnected'
  }
}

// 創建線上遊戲存儲
export const onlineStore = reactive<OnlineGameState>(createInitialOnlineState())

let peer: Peer | null = null
let connection: any = null

// 初始化 PeerJS
export const initPeer = () => {
  return new Promise<string>((resolve, reject) => {
    resetGame()
    
    try {
      console.log('初始化 Peer...')
      peer = new Peer({
        config: {
          iceServers: [
            { urls: 'stun:stun.l.google.com:19302' },
            { urls: 'stun:global.stun.twilio.com:3478?transport=udp' }
          ]
        }
      })
      
      peer.on('open', (id) => {
        console.log('Peer 打開連接，ID:', id)
        onlineStore.peerId = id
        onlineStore.isHost = true
        onlineStore.connectionStatus = 'connecting'
        console.log('Store 中的 peerId:', onlineStore.peerId)
        resolve(id)
      })
      
      peer.on('error', (error) => {
        console.error('PeerJS 錯誤:', error)
        reject(error)
      })
      
      peer.on('connection', (conn) => {
        connection = conn
        onlineStore.connectionId = conn.peer
        onlineStore.connectionStatus = 'connected'
        
        conn.on('data', (data: unknown) => {
          handleDataReceived(data)
        })
        
        conn.on('close', () => {
          onlineStore.connectionStatus = 'disconnected'
          onlineStore.connectionId = null
          connection = null
        })
      })
    } catch (error) {
      console.error('初始化 Peer 時出錯:', error)
      reject(error)
    }
  })
}

// 連接到另一個玩家
export const connectToPeer = (peerId: string) => {
  if (!peer) {
    console.error('PeerJS 尚未初始化')
    return
  }
  
  resetGame()
  onlineStore.isHost = false
  
  connection = peer.connect(peerId)
  onlineStore.connectionStatus = 'connecting'
  
  connection.on('open', () => {
    onlineStore.connectionId = peerId
    onlineStore.connectionStatus = 'connected'
    // 連接後發送準備就緒消息
    sendData({ type: 'ready' })
  })
  
  connection.on('data', (data: unknown) => {
    handleDataReceived(data)
  })
  
  connection.on('close', () => {
    onlineStore.connectionStatus = 'disconnected'
    onlineStore.connectionId = null
    connection = null
  })
}

// 斷開連接
export const disconnect = () => {
  if (connection) {
    connection.close()
  }
  
  if (peer) {
    peer.destroy()
    peer = null
  }
  
  resetOnlineStore()
}

// 重置線上遊戲存儲
export const resetOnlineStore = () => {
  resetGame()
  const initialState = createInitialOnlineState()
  Object.assign(onlineStore, initialState)
}

// 發送資料
const sendData = (data: any) => {
  if (!connection) {
    console.error('沒有活躍的連接')
    return
  }
  
  try {
    connection.send(data)
  } catch (error) {
    console.error('發送資料錯誤:', error)
  }
}

// @ts-ignore
const handleDataReceived = (data: any) => {
  console.log('收到資料:', data)
  
  switch (data.type) {
    case 'move':
      handleRemoteMove(data)
      break
    case 'select':
      handleRemoteSelect(data)
      break
    case 'ready':
      // 對方準備就緒
      // 如果是主機，在收到 ready 後發送遊戲狀態
      if (onlineStore.isHost) {
        sendGameState()
      }
      break
    case 'gameState':
      // 收到遊戲狀態，更新本地遊戲
      handleGameState(data)
      break
    case 'reset':
      resetGame()
      break
    default:
      console.warn('未知的資料類型:', data)
  }
}

// 處理遠端遊戲狀態
const handleGameState = (data: any) => {
  if (data.gameState) {
    // 更新玩家角色
    gameStore.currentPlayer = data.gameState.currentPlayer
  }
}

// 發送遊戲狀態
const sendGameState = () => {
  sendData({
    type: 'gameState',
    gameState: {
      currentPlayer: gameStore.currentPlayer
    }
  })
}

// 處理遠端移動
const handleRemoteMove = (data: any) => {
  const { x, y } = data
  placePiece(x, y)
}

// 處理遠端選擇
const handleRemoteSelect = (data: any) => {
  const { piece, source, position } = data
  selectPiece(piece, source, position)
}

// 發送移動
export const sendMove = (x: number, y: number) => {
  sendData({
    type: 'move',
    x,
    y
  })
}

// 發送選擇
export const sendSelect = (piece: any, source: 'board' | 'hand', position?: { x: number; y: number }) => {
  sendData({
    type: 'select',
    piece,
    source,
    position
  })
}

// 發送重置遊戲
export const sendReset = () => {
  sendData({
    type: 'reset'
  })
  resetGame()
}

// 獲取當前連接狀態訊息
export const getConnectionStatusMessage = (): string => {
  switch (onlineStore.connectionStatus) {
    case 'connected':
      return '已連接'
    case 'connecting':
      return '連接中...'
    case 'disconnected':
      return '未連接'
    default:
      return '未知狀態'
  }
}

// 獲取當前玩家角色
export const getPlayerRole = (): PlayerType => {
  return onlineStore.isHost ? 'player1' : 'player2'
}

// 檢查是否輪到當前玩家
export const isMyTurn = (): boolean => {
  return gameStore.currentPlayer === getPlayerRole()
} 