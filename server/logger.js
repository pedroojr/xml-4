import winston from 'winston';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Criar diretório de logs se não existir
const logsDir = path.join(__dirname, 'logs');
if (!fs.existsSync(logsDir)) {
  fs.mkdirSync(logsDir, { recursive: true });
}

// Configuração de formatos personalizados
const customFormat = winston.format.combine(
  winston.format.timestamp({
    format: 'YYYY-MM-DD HH:mm:ss.SSS'
  }),
  winston.format.errors({ stack: true }),
  winston.format.json(),
  winston.format.printf(({ timestamp, level, message, stack, ...meta }) => {
    const logObject = {
      timestamp,
      level: level.toUpperCase(),
      message,
      ...meta
    };
    
    if (stack) {
      logObject.stack = stack;
    }
    
    return JSON.stringify(logObject);
  })
);

// Formato para console (mais legível)
const consoleFormat = winston.format.combine(
  winston.format.timestamp({
    format: 'HH:mm:ss'
  }),
  winston.format.colorize(),
  winston.format.printf(({ timestamp, level, message, ...meta }) => {
    let logMessage = `${timestamp} [${level}] ${message}`;
    
    // Adicionar metadados se existirem
    if (Object.keys(meta).length > 0) {
      logMessage += ` ${JSON.stringify(meta)}`;
    }
    
    return logMessage;
  })
);

// Configuração do logger principal
const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || 'info',
  format: customFormat,
  defaultMeta: {
    service: 'xml-importer-server',
    environment: process.env.NODE_ENV || 'development',
    version: process.env.npm_package_version || '1.0.0'
  },
  transports: [
    // Log de erros em arquivo separado
    new winston.transports.File({
      filename: path.join(logsDir, 'error.log'),
      level: 'error',
      maxsize: 5242880, // 5MB
      maxFiles: 5,
      format: customFormat
    }),
    
    // Log combinado de todos os níveis
    new winston.transports.File({
      filename: path.join(logsDir, 'combined.log'),
      maxsize: 5242880, // 5MB
      maxFiles: 10,
      format: customFormat
    }),
    
    // Log de acesso/requests
    new winston.transports.File({
      filename: path.join(logsDir, 'access.log'),
      level: 'http',
      maxsize: 5242880, // 5MB
      maxFiles: 7,
      format: customFormat
    })
  ],
  
  // Tratamento de exceções não capturadas
  exceptionHandlers: [
    new winston.transports.File({
      filename: path.join(logsDir, 'exceptions.log'),
      maxsize: 5242880,
      maxFiles: 3
    })
  ],
  
  // Tratamento de promises rejeitadas
  rejectionHandlers: [
    new winston.transports.File({
      filename: path.join(logsDir, 'rejections.log'),
      maxsize: 5242880,
      maxFiles: 3
    })
  ]
});

// Adicionar console transport apenas em desenvolvimento
if (process.env.NODE_ENV !== 'production') {
  logger.add(new winston.transports.Console({
    format: consoleFormat,
    level: 'debug'
  }));
}

// Logger específico para performance
const performanceLogger = winston.createLogger({
  level: 'info',
  format: customFormat,
  defaultMeta: {
    service: 'xml-importer-server',
    category: 'performance'
  },
  transports: [
    new winston.transports.File({
      filename: path.join(logsDir, 'performance.log'),
      maxsize: 5242880,
      maxFiles: 5
    })
  ]
});

// Logger específico para auditoria
const auditLogger = winston.createLogger({
  level: 'info',
  format: customFormat,
  defaultMeta: {
    service: 'xml-importer-server',
    category: 'audit'
  },
  transports: [
    new winston.transports.File({
      filename: path.join(logsDir, 'audit.log'),
      maxsize: 5242880,
      maxFiles: 10
    })
  ]
});

// Middleware para logging de requests
const requestLogger = (req, res, next) => {
  const startTime = Date.now();
  const originalSend = res.send;
  
  // Capturar informações da resposta
  res.send = function(data) {
    const duration = Date.now() - startTime;
    const contentLength = Buffer.byteLength(data || '', 'utf8');
    
    // Log da requisição
    logger.http('HTTP Request', {
      method: req.method,
      url: req.originalUrl,
      statusCode: res.statusCode,
      duration: `${duration}ms`,
      contentLength: `${contentLength} bytes`,
      userAgent: req.get('User-Agent'),
      ip: req.ip || req.connection.remoteAddress,
      referer: req.get('Referer'),
      requestId: req.headers['x-request-id'] || generateRequestId()
    });
    
    // Log de performance para requests lentos
    if (duration > 1000) {
      performanceLogger.warn('Slow Request', {
        method: req.method,
        url: req.originalUrl,
        duration: `${duration}ms`,
        statusCode: res.statusCode
      });
    }
    
    return originalSend.call(this, data);
  };
  
  next();
};

// Middleware para logging de erros
const errorLogger = (err, req, res, next) => {
  logger.error('Unhandled Error', {
    error: err.message,
    stack: err.stack,
    method: req.method,
    url: req.originalUrl,
    ip: req.ip || req.connection.remoteAddress,
    userAgent: req.get('User-Agent'),
    requestId: req.headers['x-request-id'] || generateRequestId()
  });
  
  next(err);
};

// Função para gerar ID único de requisição
function generateRequestId() {
  return Math.random().toString(36).substring(2, 15) + 
         Math.random().toString(36).substring(2, 15);
}

// Funções utilitárias para logging estruturado
const loggers = {
  // Logger principal
  info: (message, meta = {}) => logger.info(message, meta),
  warn: (message, meta = {}) => logger.warn(message, meta),
  error: (message, meta = {}) => logger.error(message, meta),
  debug: (message, meta = {}) => logger.debug(message, meta),
  
  // Logger de performance
  performance: {
    info: (message, meta = {}) => performanceLogger.info(message, meta),
    warn: (message, meta = {}) => performanceLogger.warn(message, meta),
    error: (message, meta = {}) => performanceLogger.error(message, meta)
  },
  
  // Logger de auditoria
  audit: {
    info: (message, meta = {}) => auditLogger.info(message, meta),
    warn: (message, meta = {}) => auditLogger.warn(message, meta),
    error: (message, meta = {}) => auditLogger.error(message, meta)
  },
  
  // Logs específicos para diferentes operações
  database: {
    query: (query, duration, meta = {}) => {
      logger.debug('Database Query', {
        query: query.substring(0, 200) + (query.length > 200 ? '...' : ''),
        duration: `${duration}ms`,
        category: 'database',
        ...meta
      });
    },
    
    error: (error, query, meta = {}) => {
      logger.error('Database Error', {
        error: error.message,
        query: query?.substring(0, 200) + (query?.length > 200 ? '...' : ''),
        category: 'database',
        ...meta
      });
    }
  },
  
  cache: {
    hit: (key, meta = {}) => {
      logger.debug('Cache Hit', {
        key,
        category: 'cache',
        ...meta
      });
    },
    
    miss: (key, meta = {}) => {
      logger.debug('Cache Miss', {
        key,
        category: 'cache',
        ...meta
      });
    },
    
    error: (error, operation, key, meta = {}) => {
      logger.warn('Cache Error', {
        error: error.message,
        operation,
        key,
        category: 'cache',
        ...meta
      });
    }
  },
  
  xml: {
    validation: (filename, isValid, errors = [], meta = {}) => {
      if (isValid) {
        logger.info('XML Validation Success', {
          filename,
          category: 'xml-validation',
          ...meta
        });
      } else {
        logger.warn('XML Validation Failed', {
          filename,
          errors: errors.slice(0, 5), // Limitar a 5 erros
          errorCount: errors.length,
          category: 'xml-validation',
          ...meta
        });
      }
    },
    
    processing: (filename, duration, nfeCount, productCount, meta = {}) => {
      logger.info('XML Processing Complete', {
        filename,
        duration: `${duration}ms`,
        nfeCount,
        productCount,
        category: 'xml-processing',
        ...meta
      });
    }
  },
  
  backup: {
    created: (filename, size, duration, meta = {}) => {
      logger.info('Backup Created', {
        filename,
        size,
        duration: `${duration}ms`,
        category: 'backup',
        ...meta
      });
      
      auditLogger.info('Backup Operation', {
        action: 'create',
        filename,
        size,
        duration: `${duration}ms`,
        ...meta
      });
    },
    
    restored: (filename, meta = {}) => {
      logger.info('Backup Restored', {
        filename,
        category: 'backup',
        ...meta
      });
      
      auditLogger.warn('Backup Restore Operation', {
        action: 'restore',
        filename,
        ...meta
      });
    },
    
    error: (error, operation, meta = {}) => {
      logger.error('Backup Error', {
        error: error.message,
        operation,
        category: 'backup',
        ...meta
      });
    }
  },
  
  security: {
    rateLimitExceeded: (ip, endpoint, meta = {}) => {
      logger.warn('Rate Limit Exceeded', {
        ip,
        endpoint,
        category: 'security',
        ...meta
      });
      
      auditLogger.warn('Security Event', {
        event: 'rate_limit_exceeded',
        ip,
        endpoint,
        ...meta
      });
    },
    
    suspiciousActivity: (ip, activity, meta = {}) => {
      logger.warn('Suspicious Activity', {
        ip,
        activity,
        category: 'security',
        ...meta
      });
      
      auditLogger.warn('Security Event', {
        event: 'suspicious_activity',
        ip,
        activity,
        ...meta
      });
    }
  }
};

// Função para obter estatísticas de logs
const getLogStats = () => {
  const logFiles = [
    'error.log',
    'combined.log',
    'access.log',
    'performance.log',
    'audit.log',
    'exceptions.log',
    'rejections.log'
  ];
  
  const stats = {};
  
  logFiles.forEach(file => {
    const filePath = path.join(logsDir, file);
    if (fs.existsSync(filePath)) {
      const stat = fs.statSync(filePath);
      stats[file] = {
        size: stat.size,
        sizeFormatted: formatFileSize(stat.size),
        modified: stat.mtime,
        created: stat.birthtime
      };
    }
  });
  
  return {
    directory: logsDir,
    files: stats,
    totalSize: Object.values(stats).reduce((sum, file) => sum + file.size, 0)
  };
};

// Função para formatar tamanho de arquivo
function formatFileSize(bytes) {
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  if (bytes === 0) return '0 Bytes';
  const i = Math.floor(Math.log(bytes) / Math.log(1024));
  return Math.round(bytes / Math.pow(1024, i) * 100) / 100 + ' ' + sizes[i];
}

// Exportar logger e utilitários
export default loggers;
export { 
  logger, 
  performanceLogger, 
  auditLogger, 
  requestLogger, 
  errorLogger, 
  getLogStats 
};