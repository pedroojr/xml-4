const path = require('path');

const config = {
  // Configurações do servidor
  server: {
    port: process.env.PORT || 3011,
    host: process.env.HOST || '0.0.0.0',
    corsOrigins: process.env.CORS_ORIGINS ? process.env.CORS_ORIGINS.split(',') : ['http://localhost:5173'],
  },

  // Configurações do banco de dados
  database: {
    path: process.env.DB_PATH || path.join(__dirname, 'data', 'nfes.db'),
    backupDir: process.env.BACKUP_DIR || path.join(__dirname, 'backups'),
  },

  // Configurações de cache
  cache: {
    enabled: process.env.CACHE_ENABLED === 'true',
    host: process.env.REDIS_HOST || 'localhost',
    port: process.env.REDIS_PORT || 6379,
    password: process.env.REDIS_PASSWORD,
    ttl: parseInt(process.env.CACHE_TTL) || 300, // 5 minutos
  },

  // Configurações de upload
  upload: {
    maxFileSize: parseInt(process.env.MAX_FILE_SIZE) || 10 * 1024 * 1024, // 10MB
    allowedTypes: ['text/xml', 'application/xml'],
    uploadDir: process.env.UPLOAD_DIR || path.join(__dirname, 'uploads'),
  },

  // Configurações de log
  logging: {
    level: process.env.LOG_LEVEL || 'info',
    file: process.env.LOG_FILE || path.join(__dirname, 'logs', 'app.log'),
  },

  // Configurações de segurança
  security: {
    rateLimit: {
      windowMs: 15 * 60 * 1000, // 15 minutos
      max: parseInt(process.env.RATE_LIMIT) || 100,
    },
  },

  // Configurações de analytics
  analytics: {
    metricsFile: process.env.METRICS_FILE || path.join(__dirname, 'data', 'analytics-metrics.json'),
    maxErrors: parseInt(process.env.MAX_ERRORS) || 50,
  },
};

module.exports = config;