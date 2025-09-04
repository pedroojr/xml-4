import { useState, useEffect, useRef } from 'react';
import { statusAPI } from '@/services/api';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Wifi, WifiOff, RefreshCw } from 'lucide-react';
import { toast } from 'sonner';

export const ServerStatus = () => {
  const [status, setStatus] = useState<'online' | 'offline' | 'checking'>('checking');
  const [lastCheck, setLastCheck] = useState<Date | null>(null);
  const intervalRef = useRef<number | null>(null);
  const backoffRef = useRef(0);

  const scheduleNext = (delay: number) => {
    if (intervalRef.current) window.clearTimeout(intervalRef.current);
    intervalRef.current = window.setTimeout(() => {
      void checkStatus();
    }, delay);
  };

  const checkStatus = async () => {
    // Pausar se aba não está visível
    if (document.visibilityState !== 'visible') {
      scheduleNext(30000);
      return;
    }

    setStatus('checking');
    try {
      const result = await statusAPI.check();
      setStatus('online');
      setLastCheck(new Date());
      backoffRef.current = 0;
      scheduleNext(30000); // 30s entre polls
    } catch (error: any) {
      setStatus('offline');
      setLastCheck(new Date());
      const statusCode = error?.status ?? error?.response?.status;
      if (statusCode === 429) {
        const base = backoffRef.current || 5000; // inicia em 5s
        const next = Math.min(base * 2, 60000); // teto 60s
        backoffRef.current = next;
        scheduleNext(next);
      } else {
        scheduleNext(30000);
      }
      console.error('Erro ao verificar status do servidor:', error);
    }
  };

  useEffect(() => {
    void checkStatus();

    const onVisibility = () => {
      if (document.visibilityState === 'visible') {
        // retomar imediatamente quando volta ao foco
        scheduleNext(0);
      }
    };

    document.addEventListener('visibilitychange', onVisibility);

    return () => {
      document.removeEventListener('visibilitychange', onVisibility);
      if (intervalRef.current) window.clearTimeout(intervalRef.current);
    };
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
            void checkStatus();
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