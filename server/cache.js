import { createClient } from 'redis';

class CacheManager {
  constructor() {
    this.client = null;
    this.isConnected = false;
  }

  async connect() {
    try {
      this.client = createClient({
        url: process.env.REDIS_URL || 'redis://localhost:6379',
        socket: {
          connectTimeout: 5000,
          lazyConnect: true
        }
      });

      this.client.on('error', (err) => {
        console.log('❌ Redis Client Error:', err.message);
        this.isConnected = false;
      });

      this.client.on('connect', () => {
        console.log('🔄 Conectando ao Redis...');
      });

      this.client.on('ready', () => {
        console.log('✅ Redis conectado com sucesso');
        this.isConnected = true;
      });

      this.client.on('end', () => {
        console.log('🔌 Conexão Redis encerrada');
        this.isConnected = false;
      });

      await this.client.connect();
    } catch (error) {
      console.log('⚠️ Redis não disponível, continuando sem cache:', error.message);
      this.isConnected = false;
    }
  }

  async get(key) {
    if (!this.isConnected || !this.client) {
      return null;
    }

    try {
      const value = await this.client.get(key);
      return value ? JSON.parse(value) : null;
    } catch (error) {
      console.log('❌ Erro ao buscar cache:', error.message);
      return null;
    }
  }

  async set(key, value, ttlSeconds = 300) {
    if (!this.isConnected || !this.client) {
      return false;
    }

    try {
      await this.client.setEx(key, ttlSeconds, JSON.stringify(value));
      return true;
    } catch (error) {
      console.log('❌ Erro ao salvar cache:', error.message);
      return false;
    }
  }

  async del(key) {
    if (!this.isConnected || !this.client) {
      return false;
    }

    try {
      await this.client.del(key);
      return true;
    } catch (error) {
      console.log('❌ Erro ao deletar cache:', error.message);
      return false;
    }
  }

  async invalidatePattern(pattern) {
    if (!this.isConnected || !this.client) {
      return false;
    }

    try {
      const keys = await this.client.keys(pattern);
      if (keys.length > 0) {
        await this.client.del(keys);
        console.log(`🗑️ Cache invalidado: ${keys.length} chaves removidas`);
      }
      return true;
    } catch (error) {
      console.log('❌ Erro ao invalidar cache:', error.message);
      return false;
    }
  }

  async disconnect() {
    if (this.client) {
      try {
        await this.client.disconnect();
        console.log('🔌 Redis desconectado');
      } catch (error) {
        console.log('❌ Erro ao desconectar Redis:', error.message);
      }
    }
  }

  // Gera chave de cache para NFEs
  generateNfeKey(filters = {}) {
    const { page = 1, limit = 10, search = '', status = '' } = filters;
    return `nfes:${page}:${limit}:${search}:${status}`;
  }

  // Gera chave de cache para NFE específica
  generateNfeDetailKey(id) {
    return `nfe:${id}`;
  }

  // Gera chave de cache para estatísticas
  generateStatsKey() {
    return 'nfes:stats';
  }
}

export default new CacheManager();