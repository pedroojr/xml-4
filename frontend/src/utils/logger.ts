/**
 * Logger utility para substituir console.error em produção
 * Mantém logs em desenvolvimento mas os suprime em produção
 */

type LogLevel = 'error' | 'warn' | 'info' | 'debug';

interface LogEntry {
  level: LogLevel;
  message: string;
  data?: any;
  timestamp: string;
}

class Logger {
  private isDevelopment = import.meta.env.DEV;
  private logs: LogEntry[] = [];
  private maxLogs = 100; // Manter apenas os últimos 100 logs

  private addLog(level: LogLevel, message: string, data?: any) {
    const logEntry: LogEntry = {
      level,
      message,
      data,
      timestamp: new Date().toISOString()
    };

    this.logs.push(logEntry);
    
    // Manter apenas os últimos logs
    if (this.logs.length > this.maxLogs) {
      this.logs = this.logs.slice(-this.maxLogs);
    }
  }

  error(message: string, data?: any) {
    this.addLog('error', message, data);
    
    if (this.isDevelopment) {
      if (data) {
        console.error(message, data);
      } else {
        console.error(message);
      }
    }
    // Em produção, poderia enviar para serviço de monitoramento
  }

  warn(message: string, data?: any) {
    this.addLog('warn', message, data);
    
    if (this.isDevelopment) {
      if (data) {
        console.warn(message, data);
      } else {
        console.warn(message);
      }
    }
  }

  info(message: string, data?: any) {
    this.addLog('info', message, data);
    
    if (this.isDevelopment) {
      if (data) {
        console.info(message, data);
      } else {
        console.info(message);
      }
    }
  }

  debug(message: string, data?: any) {
    this.addLog('debug', message, data);
    
    if (this.isDevelopment) {
      if (data) {
        console.debug(message, data);
      } else {
        console.debug(message);
      }
    }
  }

  // Método para obter logs (útil para debugging)
  getLogs(level?: LogLevel): LogEntry[] {
    if (level) {
      return this.logs.filter(log => log.level === level);
    }
    return [...this.logs];
  }

  // Limpar logs
  clearLogs() {
    this.logs = [];
  }
}

// Instância singleton do logger
export const logger = new Logger();

// Exports para compatibilidade
export default logger;