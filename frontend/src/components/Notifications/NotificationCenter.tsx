import React, { useEffect, useState } from 'react';
import { Bell, CheckCircle, AlertCircle, Info, X, Wifi, WifiOff } from 'lucide-react';
import { Button } from '../ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Badge } from '../ui/badge';
import { ScrollArea } from '../ui/scroll-area';
import { useToast } from '../../hooks/use-toast';
import websocketService, { NotificationData, NFEUpdateData } from '../../services/websocket';

interface Notification {
  id: string;
  type: string;
  message: string;
  timestamp: string;
  read: boolean;
  data?: any;
}

interface ConnectionStatus {
  status: 'connected' | 'disconnected' | 'error' | 'failed';
  socketId?: string;
  reason?: string;
  error?: string;
  message?: string;
}

const NotificationCenter: React.FC = () => {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [connectionStatus, setConnectionStatus] = useState<ConnectionStatus>({ status: 'disconnected' });
  const [isOpen, setIsOpen] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const { toast } = useToast();

  useEffect(() => {
    // Listener para conexão WebSocket
    const handleConnection = (data: ConnectionStatus) => {
      setConnectionStatus(data);
      
      if (data.status === 'connected') {
        toast({
          title: "Conectado",
          description: "Conexão WebSocket estabelecida",
          duration: 3000,
        });
      } else if (data.status === 'disconnected') {
        toast({
          title: "Desconectado",
          description: "Conexão WebSocket perdida",
          variant: "destructive",
          duration: 3000,
        });
      }
    };

    // Listener para notificações gerais
    const handleNotification = (data: NotificationData) => {
      const newNotification: Notification = {
        id: Date.now().toString(),
        type: data.type,
        message: data.data.message || 'Nova notificação',
        timestamp: data.timestamp,
        read: false,
        data: data.data
      };

      setNotifications(prev => [newNotification, ...prev.slice(0, 49)]); // Manter apenas 50 notificações
      setUnreadCount(prev => prev + 1);

      // Mostrar toast para notificações importantes
      if (['nfe_created', 'nfe_updated', 'nfe_deleted'].includes(data.type)) {
        toast({
          title: getNotificationTitle(data.type),
          description: newNotification.message,
          duration: 5000,
        });
      }
    };

    // Listener para atualizações de NFe
    const handleNFeUpdate = (data: NFEUpdateData) => {
      const actionText = {
        created: 'criada',
        updated: 'atualizada',
        deleted: 'excluída'
      }[data.action];

      const newNotification: Notification = {
        id: Date.now().toString(),
        type: `nfe_${data.action}`,
        message: `NFe ${data.nfe.numero} foi ${actionText}`,
        timestamp: data.timestamp,
        read: false,
        data: data.nfe
      };

      setNotifications(prev => [newNotification, ...prev.slice(0, 49)]);
      setUnreadCount(prev => prev + 1);
    };

    // Registrar listeners
    websocketService.on('connection', handleConnection);
    websocketService.on('notification', handleNotification);
    websocketService.on('nfe-update', handleNFeUpdate);

    // Cleanup
    return () => {
      websocketService.off('connection', handleConnection);
      websocketService.off('notification', handleNotification);
      websocketService.off('nfe-update', handleNFeUpdate);
    };
  }, []);

  const getNotificationTitle = (type: string): string => {
    const titles: Record<string, string> = {
      nfe_created: 'NFe Criada',
      nfe_updated: 'NFe Atualizada',
      nfe_deleted: 'NFe Excluída',
      system_status: 'Status do Sistema',
      export_completed: 'Exportação Concluída',
      backup_completed: 'Backup Concluído'
    };
    return titles[type] || 'Notificação';
  };

  const getNotificationIcon = (type: string) => {
    switch (type) {
      case 'nfe_created':
        return <CheckCircle className="h-4 w-4 text-green-500" />;
      case 'nfe_updated':
        return <Info className="h-4 w-4 text-blue-500" />;
      case 'nfe_deleted':
        return <AlertCircle className="h-4 w-4 text-red-500" />;
      default:
        return <Info className="h-4 w-4 text-gray-500" />;
    }
  };

  const markAsRead = (id: string) => {
    setNotifications(prev => 
      prev.map(notif => 
        notif.id === id ? { ...notif, read: true } : notif
      )
    );
    setUnreadCount(prev => Math.max(0, prev - 1));
  };

  const markAllAsRead = () => {
    setNotifications(prev => prev.map(notif => ({ ...notif, read: true })));
    setUnreadCount(0);
  };

  const clearNotifications = () => {
    setNotifications([]);
    setUnreadCount(0);
  };

  const formatTimestamp = (timestamp: string) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return 'Agora';
    if (diffMins < 60) return `${diffMins}m atrás`;
    if (diffHours < 24) return `${diffHours}h atrás`;
    if (diffDays < 7) return `${diffDays}d atrás`;
    return date.toLocaleDateString('pt-BR');
  };

  const ConnectionIndicator = () => {
    const getStatusColor = () => {
      switch (connectionStatus.status) {
        case 'connected': return 'text-green-500';
        case 'disconnected': return 'text-yellow-500';
        case 'error': case 'failed': return 'text-red-500';
        default: return 'text-gray-500';
      }
    };

    const getStatusText = () => {
      switch (connectionStatus.status) {
        case 'connected': return 'Conectado';
        case 'disconnected': return 'Desconectado';
        case 'error': return 'Erro';
        case 'failed': return 'Falha';
        default: return 'Desconhecido';
      }
    };

    return (
      <div className="flex items-center gap-2 text-sm">
        {connectionStatus.status === 'connected' ? (
          <Wifi className={`h-4 w-4 ${getStatusColor()}`} />
        ) : (
          <WifiOff className={`h-4 w-4 ${getStatusColor()}`} />
        )}
        <span className={getStatusColor()}>{getStatusText()}</span>
      </div>
    );
  };

  return (
    <div className="relative">
      {/* Botão de notificações */}
      <Button
        variant="outline"
        size="sm"
        onClick={() => setIsOpen(!isOpen)}
        className="relative"
      >
        <Bell className="h-4 w-4" />
        {unreadCount > 0 && (
          <Badge 
            variant="destructive" 
            className="absolute -top-2 -right-2 h-5 w-5 rounded-full p-0 flex items-center justify-center text-xs"
          >
            {unreadCount > 99 ? '99+' : unreadCount}
          </Badge>
        )}
      </Button>

      {/* Painel de notificações */}
      {isOpen && (
        <Card className="absolute right-0 top-12 w-96 max-h-96 shadow-lg z-50">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-lg">Notificações</CardTitle>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setIsOpen(false)}
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
            <div className="flex items-center justify-between">
              <ConnectionIndicator />
              <div className="flex gap-2">
                {unreadCount > 0 && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={markAllAsRead}
                    className="text-xs"
                  >
                    Marcar todas como lidas
                  </Button>
                )}
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={clearNotifications}
                  className="text-xs"
                >
                  Limpar
                </Button>
              </div>
            </div>
          </CardHeader>
          <CardContent className="p-0">
            <ScrollArea className="h-80">
              {notifications.length === 0 ? (
                <div className="p-4 text-center text-gray-500">
                  Nenhuma notificação
                </div>
              ) : (
                <div className="space-y-1">
                  {notifications.map((notification) => (
                    <div
                      key={notification.id}
                      className={`p-3 border-b cursor-pointer hover:bg-gray-50 ${
                        !notification.read ? 'bg-blue-50 border-l-4 border-l-blue-500' : ''
                      }`}
                      onClick={() => markAsRead(notification.id)}
                    >
                      <div className="flex items-start gap-3">
                        {getNotificationIcon(notification.type)}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between">
                            <p className="text-sm font-medium text-gray-900 truncate">
                              {getNotificationTitle(notification.type)}
                            </p>
                            <span className="text-xs text-gray-500">
                              {formatTimestamp(notification.timestamp)}
                            </span>
                          </div>
                          <p className="text-sm text-gray-600 mt-1">
                            {notification.message}
                          </p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </ScrollArea>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default NotificationCenter;