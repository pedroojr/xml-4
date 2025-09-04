import { io, Socket } from 'socket.io-client';

interface NotificationData {
  type: string;
  data: any;
  timestamp: string;
}

interface NFEUpdateData {
  action: 'created' | 'updated' | 'deleted';
  nfe: any;
  timestamp: string;
}

interface SystemStatusData {
  [key: string]: any;
  timestamp: string;
}

class WebSocketService {
  private socket: Socket | null = null;
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 5;
  private reconnectDelay = 1000;
  private listeners: Map<string, Function[]> = new Map();

  constructor() {
    this.connect();
  }

  private connect() {
    const isDev = import.meta.env.DEV;

    if (isDev) {
      // Conecta ao mesmo origin do Vite; o proxy do Vite redireciona para o backend
      this.socket = io({
        transports: ['websocket', 'polling'],
        timeout: 20000,
        forceNew: true,
      });
    } else {
      const serverUrl = import.meta.env.VITE_API_URL || 'http://localhost:3011';
      this.socket = io(serverUrl, {
        transports: ['websocket', 'polling'],
        timeout: 20000,
        forceNew: true,
      });
    }

    this.setupEventListeners();
  }

  private setupEventListeners() {
    if (!this.socket) return;

    this.socket.on('connect', () => {
      console.log('✅ WebSocket conectado:', this.socket?.id);
      this.reconnectAttempts = 0;
      this.emit('connection', { status: 'connected', socketId: this.socket?.id });
    });

    this.socket.on('disconnect', (reason) => {
      console.log('❌ WebSocket desconectado:', reason);
      this.emit('connection', { status: 'disconnected', reason });
      
      if (reason === 'io server disconnect') {
        // Servidor desconectou, tentar reconectar
        this.handleReconnect();
      }
    });

    this.socket.on('connect_error', (error) => {
      console.error('❌ Erro de conexão WebSocket:', error);
      this.emit('connection', { status: 'error', error: error.message });
      this.handleReconnect();
    });

    this.socket.on('server-status', (data) => {
      console.log('📊 Status do servidor:', data);
      this.emit('server-status', data);
    });

    this.socket.on('notification', (data: NotificationData) => {
      console.log('🔔 Notificação recebida:', data);
      this.emit('notification', data);
    });

    this.socket.on('nfe-update', (data: NFEUpdateData) => {
      console.log('📄 Atualização de NFe:', data);
      this.emit('nfe-update', data);
    });

    this.socket.on('system-status', (data: SystemStatusData) => {
      console.log('⚙️ Status do sistema:', data);
      this.emit('system-status', data);
    });

    this.socket.on('pong', (data) => {
      console.log('🏓 Pong recebido:', data);
      this.emit('pong', data);
    });
  }

  private handleReconnect() {
    if (this.reconnectAttempts < this.maxReconnectAttempts) {
      this.reconnectAttempts++;
      const delay = this.reconnectDelay * Math.pow(2, this.reconnectAttempts - 1);
      
      console.log(`🔄 Tentativa de reconexão ${this.reconnectAttempts}/${this.maxReconnectAttempts} em ${delay}ms`);
      
      setTimeout(() => {
        this.connect();
      }, delay);
    } else {
      console.error('❌ Máximo de tentativas de reconexão atingido');
      this.emit('connection', { status: 'failed', message: 'Falha ao reconectar' });
    }
  }

  // Método para adicionar listeners de eventos
  on(event: string, callback: Function) {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, []);
    }
    this.listeners.get(event)?.push(callback);
  }

  // Método para remover listeners de eventos
  off(event: string, callback: Function) {
    const eventListeners = this.listeners.get(event);
    if (eventListeners) {
      const index = eventListeners.indexOf(callback);
      if (index > -1) {
        eventListeners.splice(index, 1);
      }
    }
  }

  // Método para emitir eventos para os listeners
  private emit(event: string, data: any) {
    const eventListeners = this.listeners.get(event);
    if (eventListeners) {
      eventListeners.forEach(callback => callback(data));
    }
  }

  // Método para enviar ping
  ping() {
    if (this.socket?.connected) {
      this.socket.emit('ping');
    }
  }

  // Método para verificar se está conectado
  isConnected(): boolean {
    return this.socket?.connected || false;
  }

  // Método para obter o ID do socket
  getSocketId(): string | undefined {
    return this.socket?.id;
  }

  // Método para desconectar
  disconnect() {
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
    }
    this.listeners.clear();
  }

  // Método para reconectar manualmente
  reconnect() {
    this.disconnect();
    this.reconnectAttempts = 0;
    this.connect();
  }
}

// Instância singleton
const websocketService = new WebSocketService();

export default websocketService;
export type { NotificationData, NFEUpdateData, SystemStatusData };