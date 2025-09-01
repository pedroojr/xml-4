import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import logger from './logger.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

class AnalyticsService {
  constructor() {
    this.metricsFile = path.join(__dirname, 'analytics-metrics.json');
    this.initializeMetrics();
  }

  initializeMetrics() {
    if (!fs.existsSync(this.metricsFile)) {
      const initialMetrics = {
        requests: {
          total: 0,
          byEndpoint: {},
          byMethod: {},
          byStatusCode: {}
        },
        uploads: {
          total: 0,
          successful: 0,
          failed: 0,
          totalSize: 0
        },
        nfes: {
          total: 0,
          processed: 0,
          errors: 0,
          byMonth: {}
        },
        performance: {
          averageResponseTime: 0,
          slowestEndpoints: [],
          cacheHitRate: 0,
          totalCacheHits: 0,
          totalCacheMisses: 0
        },
        system: {
          uptime: 0,
          startTime: new Date().toISOString(),
          lastRestart: new Date().toISOString()
        },
        errors: {
          total: 0,
          byType: {},
          recent: []
        }
      };
      
      fs.writeFileSync(this.metricsFile, JSON.stringify(initialMetrics, null, 2));
      logger.info('Analytics metrics initialized', {
        service: 'xml-importer-server',
        category: 'analytics',
        metricsFile: this.metricsFile
      });
    }
  }

  getMetrics() {
    try {
      const data = fs.readFileSync(this.metricsFile, 'utf8');
      const metrics = JSON.parse(data);
      
      // Calcular uptime atual
      const startTime = new Date(metrics.system.startTime);
      metrics.system.uptime = Math.floor((Date.now() - startTime.getTime()) / 1000);
      
      return metrics;
    } catch (error) {
      logger.error('Error reading analytics metrics', {
        service: 'xml-importer-server',
        category: 'analytics',
        error: error.message
      });
      return null;
    }
  }

  updateMetrics(updates) {
    try {
      const metrics = this.getMetrics();
      if (!metrics) return;

      // Aplicar atualizações
      this.deepMerge(metrics, updates);
      
      fs.writeFileSync(this.metricsFile, JSON.stringify(metrics, null, 2));
    } catch (error) {
      logger.error('Error updating analytics metrics', {
        service: 'xml-importer-server',
        category: 'analytics',
        error: error.message
      });
    }
  }

  deepMerge(target, source) {
    for (const key in source) {
      if (source[key] && typeof source[key] === 'object' && !Array.isArray(source[key])) {
        if (!target[key]) target[key] = {};
        this.deepMerge(target[key], source[key]);
      } else {
        target[key] = source[key];
      }
    }
  }

  // Registrar requisição HTTP
  recordRequest(req, res, responseTime) {
    const endpoint = req.route ? req.route.path : req.path;
    const method = req.method;
    const statusCode = res.statusCode;

    const updates = {
      requests: {
        total: this.getMetrics()?.requests?.total + 1 || 1,
        byEndpoint: {
          [endpoint]: (this.getMetrics()?.requests?.byEndpoint?.[endpoint] || 0) + 1
        },
        byMethod: {
          [method]: (this.getMetrics()?.requests?.byMethod?.[method] || 0) + 1
        },
        byStatusCode: {
          [statusCode]: (this.getMetrics()?.requests?.byStatusCode?.[statusCode] || 0) + 1
        }
      }
    };

    if (responseTime) {
      const currentMetrics = this.getMetrics();
      const currentAvg = currentMetrics?.performance?.averageResponseTime || 0;
      const totalRequests = currentMetrics?.requests?.total || 0;
      
      updates.performance = {
        averageResponseTime: ((currentAvg * totalRequests) + responseTime) / (totalRequests + 1)
      };
    }

    this.updateMetrics(updates);
  }

  // Registrar upload de arquivo
  recordUpload(success, fileSize = 0, error = null) {
    const currentMetrics = this.getMetrics();
    const updates = {
      uploads: {
        total: (currentMetrics?.uploads?.total || 0) + 1,
        successful: success ? (currentMetrics?.uploads?.successful || 0) + 1 : (currentMetrics?.uploads?.successful || 0),
        failed: !success ? (currentMetrics?.uploads?.failed || 0) + 1 : (currentMetrics?.uploads?.failed || 0),
        totalSize: (currentMetrics?.uploads?.totalSize || 0) + fileSize
      }
    };

    if (error) {
      this.recordError('upload', error);
    }

    this.updateMetrics(updates);
  }

  // Registrar processamento de NFe
  recordNfeProcessing(success, nfeData = null, error = null) {
    const currentMetrics = this.getMetrics();
    const currentMonth = new Date().toISOString().substring(0, 7); // YYYY-MM
    
    const updates = {
      nfes: {
        total: (currentMetrics?.nfes?.total || 0) + 1,
        processed: success ? (currentMetrics?.nfes?.processed || 0) + 1 : (currentMetrics?.nfes?.processed || 0),
        errors: !success ? (currentMetrics?.nfes?.errors || 0) + 1 : (currentMetrics?.nfes?.errors || 0),
        byMonth: {
          [currentMonth]: (currentMetrics?.nfes?.byMonth?.[currentMonth] || 0) + 1
        }
      }
    };

    if (error) {
      this.recordError('nfe_processing', error);
    }

    this.updateMetrics(updates);
  }

  // Registrar hit/miss do cache
  recordCacheEvent(isHit) {
    const currentMetrics = this.getMetrics();
    const totalHits = (currentMetrics?.performance?.totalCacheHits || 0) + (isHit ? 1 : 0);
    const totalMisses = (currentMetrics?.performance?.totalCacheMisses || 0) + (!isHit ? 1 : 0);
    const total = totalHits + totalMisses;
    
    const updates = {
      performance: {
        totalCacheHits: totalHits,
        totalCacheMisses: totalMisses,
        cacheHitRate: total > 0 ? (totalHits / total) * 100 : 0
      }
    };

    this.updateMetrics(updates);
  }

  // Registrar erro
  recordError(type, error) {
    const currentMetrics = this.getMetrics();
    const errorEntry = {
      type,
      message: error.message || error,
      timestamp: new Date().toISOString(),
      stack: error.stack || null
    };

    const recentErrors = currentMetrics?.errors?.recent || [];
    recentErrors.unshift(errorEntry);
    
    // Manter apenas os últimos 50 erros
    if (recentErrors.length > 50) {
      recentErrors.splice(50);
    }

    const updates = {
      errors: {
        total: (currentMetrics?.errors?.total || 0) + 1,
        byType: {
          [type]: (currentMetrics?.errors?.byType?.[type] || 0) + 1
        },
        recent: recentErrors
      }
    };

    this.updateMetrics(updates);
  }

  // Obter estatísticas resumidas
  getSummaryStats() {
    const metrics = this.getMetrics();
    if (!metrics) return null;

    return {
      requests: {
        total: metrics.requests.total,
        averageResponseTime: Math.round(metrics.performance.averageResponseTime),
        mostUsedEndpoints: this.getTopEntries(metrics.requests.byEndpoint, 5)
      },
      uploads: {
        total: metrics.uploads.total,
        successRate: metrics.uploads.total > 0 ? 
          Math.round((metrics.uploads.successful / metrics.uploads.total) * 100) : 0,
        totalSizeMB: Math.round(metrics.uploads.totalSize / (1024 * 1024) * 100) / 100
      },
      nfes: {
        total: metrics.nfes.total,
        successRate: metrics.nfes.total > 0 ? 
          Math.round((metrics.nfes.processed / metrics.nfes.total) * 100) : 0,
        monthlyDistribution: metrics.nfes.byMonth
      },
      performance: {
        uptime: this.formatUptime(metrics.system.uptime),
        cacheHitRate: Math.round(metrics.performance.cacheHitRate),
        errorRate: metrics.requests.total > 0 ? 
          Math.round((metrics.errors.total / metrics.requests.total) * 100) : 0
      },
      errors: {
        total: metrics.errors.total,
        recentCount: metrics.errors.recent.length,
        topTypes: this.getTopEntries(metrics.errors.byType, 3)
      }
    };
  }

  getTopEntries(obj, limit) {
    return Object.entries(obj)
      .sort(([,a], [,b]) => b - a)
      .slice(0, limit)
      .map(([key, value]) => ({ name: key, count: value }));
  }

  formatUptime(seconds) {
    const days = Math.floor(seconds / 86400);
    const hours = Math.floor((seconds % 86400) / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    
    if (days > 0) return `${days}d ${hours}h ${minutes}m`;
    if (hours > 0) return `${hours}h ${minutes}m`;
    return `${minutes}m`;
  }

  // Resetar métricas (para testes ou limpeza)
  resetMetrics() {
    if (fs.existsSync(this.metricsFile)) {
      fs.unlinkSync(this.metricsFile);
    }
    this.initializeMetrics();
    
    logger.info('Analytics metrics reset', {
      service: 'xml-importer-server',
      category: 'analytics'
    });
  }
}

export default new AnalyticsService();