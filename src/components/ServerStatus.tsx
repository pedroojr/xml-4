import { useState, useEffect } from 'react';
import { statusAPI } from '@/services/api';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Wifi, WifiOff, RefreshCw } from 'lucide-react';
import { toast } from 'sonner';

export const ServerStatus = () => {
  const [status, setStatus] = useState<'online' | 'offline' | 'checking'>('checking');
  const [lastCheck, setLastCheck] = useState<Date | null>(null);

  const checkStatus = async () => {
    setStatus('checking');
    try {
      const result = await statusAPI.getStatus();
      setStatus('online');
      setLastCheck(new Date());
    } catch (error) {
      setStatus('offline');
      setLastCheck(new Date());
      console.error('Erro ao verificar status do servidor:', error);
    }
  };

  useEffect(() => {
    checkStatus();
    
    // Verificar status a cada 30 segundos
    const interval = setInterval(checkStatus, 30000);
    
    return () => clearInterval(interval);
  }, []);

  const getStatusColor = () => {
    switch (status) {
      case 'online':
        return 'bg-green-500 hover:bg-green-600';
      case 'offline':
        return 'bg-red-500 hover:bg-red-600';
      case 'checking':
        return 'bg-yellow-500 hover:bg-yellow-600';
      default:
        return 'bg-gray-500 hover:bg-gray-600';
    }
  };

  const getStatusText = () => {
    switch (status) {
      case 'online':
        return 'Servidor Online';
      case 'offline':
        return 'Servidor Offline';
      case 'checking':
        return 'Verificando...';
      default:
        return 'Desconhecido';
    }
  };

  const getStatusIcon = () => {
    switch (status) {
      case 'online':
        return <Wifi className="h-3 w-3" />;
      case 'offline':
        return <WifiOff className="h-3 w-3" />;
      case 'checking':
        return <RefreshCw className="h-3 w-3 animate-spin" />;
      default:
        return <WifiOff className="h-3 w-3" />;
    }
  };

  return (
    <div className="flex items-center gap-2">
      <Badge 
        variant="secondary" 
        className={`${getStatusColor()} text-white border-0`}
      >
        <div className="flex items-center gap-1">
          {getStatusIcon()}
          <span className="text-xs">{getStatusText()}</span>
        </div>
      </Badge>
      
      {status === 'offline' && (
        <Button
          size="sm"
          variant="outline"
          onClick={() => {
            checkStatus();
            toast.info('Verificando conexão com o servidor...');
          }}
          className="h-6 px-2 text-xs"
        >
          <RefreshCw className="h-3 w-3 mr-1" />
          Reconectar
        </Button>
      )}
      
      {lastCheck && (
        <span className="text-xs text-gray-500">
          Última verificação: {lastCheck.toLocaleTimeString()}
        </span>
      )}
    </div>
  );
}; 