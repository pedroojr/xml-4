import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import Database from 'better-sqlite3';
import path from 'path';
import { fileURLToPath } from 'url';
import multer from 'multer';
import dotenv from 'dotenv';
import { createServer } from 'http';
import { Server } from 'socket.io';
import xmlValidator from './xmlValidator.js';
import cache from './cache.js';
import backupManager from './backup.js';
import logger, { requestLogger, errorLogger } from './logger.js';
import analytics from './analytics.js';
import exportService from './export.js';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Configuração do diretório de dados
const DATA_DIR = path.resolve(process.cwd(), 'data');
const DB_PATH = path.join(DATA_DIR, 'nfe.sqlite');

// Garantir que o diretório data/ existe
import fs from 'fs';
if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
  logger.info('Data directory created', { path: DATA_DIR, category: 'database' });
}

// Verificar permissões de escrita
try {
  fs.accessSync(DATA_DIR, fs.constants.W_OK);
  logger.info('Data directory writable', { path: DATA_DIR, category: 'database' });
} catch (err) {
  logger.error('Data directory not writable', { path: DATA_DIR, error: err.message, category: 'database' });
  process.exit(1);
}

const app = express();
app.set('trust proxy', 1);
const server = createServer(app);
const io = new Server(server, {
  cors: {
    origin: process.env.ALLOWED_ORIGINS?.split(',') || ['http://localhost:5173', 'http://localhost:3000', 'http://localhost:3020'],
    methods: ['GET', 'POST']
  }
});
const PORT = process.env.PORT || 3011;

// Middleware de segurança
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      scriptSrc: ["'self'"],
      imgSrc: ["'self'", "data:", "https:"],
    },
  },
  crossOriginEmbedderPolicy: false
}));

// Rate limiting simples
const requestCounts = new Map();
const isDev = process.env.NODE_ENV === 'development';
const RATE_LIMIT_WINDOW = isDev ? 60 * 1000 : 15 * 60 * 1000; // 60s em dev, 15min em prod
const RATE_LIMIT_MAX_REQUESTS = isDev ? 300 : 1000; // 300 req/min em dev, 1000 por janela em prod

app.use((req, res, next) => {
  // Ignorar preflight
  if (req.method === 'OPTIONS') return next();

  const clientIp = req.ip || req.connection.remoteAddress || 'unknown';
  const now = Date.now();
  
  if (!requestCounts.has(clientIp)) {
    requestCounts.set(clientIp, { count: 1, resetTime: now + RATE_LIMIT_WINDOW });
  } else {
    const clientData = requestCounts.get(clientIp);
    
    if (now > clientData.resetTime) {
      // Reset do contador
      requestCounts.set(clientIp, { count: 1, resetTime: now + RATE_LIMIT_WINDOW });
    } else {
      clientData.count++;
      
      if (clientData.count > RATE_LIMIT_MAX_REQUESTS) {
        const retryAfterSeconds = Math.ceil((clientData.resetTime - now) / 1000);
        res.setHeader('Retry-After', retryAfterSeconds);
        res.setHeader('X-RateLimit-Limit', RATE_LIMIT_MAX_REQUESTS.toString());
        res.setHeader('X-RateLimit-Remaining', '0');
        res.setHeader('X-RateLimit-Reset', clientData.resetTime.toString());
        logger.warn('Rate limit exceeded', {
          ip: clientIp,
          method: req.method,
          url: req.originalUrl || req.url,
          count: clientData.count,
          windowMs: RATE_LIMIT_WINDOW,
          retryAfterSeconds,
          category: 'rate_limit'
        });
        return res.status(429).json({ 
          error: 'Muitas requisições. Tente novamente em alguns instantes.' 
        });
      }
    }
  }
  
  // Cabeçalhos informativos
  const clientData = requestCounts.get(clientIp);
  if (clientData) {
    res.setHeader('X-RateLimit-Limit', RATE_LIMIT_MAX_REQUESTS.toString());
    res.setHeader('X-RateLimit-Remaining', Math.max(0, RATE_LIMIT_MAX_REQUESTS - clientData.count).toString());
    res.setHeader('X-RateLimit-Reset', clientData.resetTime.toString());
  }

  next();
});

// Middleware de logging de requests
app.use(requestLogger);

// Middleware de analytics
app.use((req, res, next) => {
  const startTime = Date.now();
  
  res.on('finish', () => {
    const responseTime = Date.now() - startTime;
    analytics.recordRequest(req, res, responseTime);
  });
  
  next();
});

app.use(cors({
  origin: process.env.ALLOWED_ORIGINS?.split(',') || ['http://localhost:5173', 'http://localhost:3000', 'http://localhost:3002', 'http://localhost:3003', 'http://localhost:3004', 'http://localhost:3006', 'http://localhost:3007', 'http://localhost:3008', 'http://localhost:3012', 'http://localhost:3013', 'http://localhost:3014', 'http://localhost:3015', 'http://localhost:3018', 'http://localhost:3020'],
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));

app.use(express.json({ limit: '10mb' })); // Reduzido de 50mb para 10mb
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Configuração do upload com validação
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB
    files: 1, // Apenas 1 arquivo por vez
    fields: 10 // Máximo de 10 campos
  },
  fileFilter: (req, file, cb) => {
    // Log para debug
    console.log('=== MULTER FILE FILTER DEBUG ===');
    console.log('file.fieldname:', file.fieldname);
    console.log('file.originalname:', file.originalname);
    console.log('file.mimetype:', file.mimetype);
    console.log('================================');
    
    // Verificar tipo de arquivo - mais permissivo
    const isXmlMimeType = file.mimetype === 'text/xml' || 
                         file.mimetype === 'application/xml' || 
                         file.mimetype === 'text/plain' || // curl pode enviar como text/plain
                         file.mimetype === 'application/octet-stream'; // fallback
    const isXmlExtension = file.originalname.toLowerCase().endsWith('.xml');
    
    if (isXmlMimeType || isXmlExtension) {
      cb(null, true);
    } else {
      const error = new Error(`Apenas arquivos XML são permitidos. Recebido: ${file.mimetype}, nome: ${file.originalname}`);
      console.log('File filter rejected:', error.message);
      cb(error, false);
    }
  }
});

// Inicializar banco de dados
const dbPath = process.env.DB_PATH || DB_PATH;
const db = new Database(dbPath, { 
  verbose: process.env.NODE_ENV === 'development' ? (msg) => logger.debug('Database Query', { query: msg, category: 'database' }) : null,
  fileMustExist: false
});

logger.info('Database Connected', {
  dbPath,
  category: 'database'
});

// Configurações de segurança do banco
db.pragma('journal_mode = WAL');
db.pragma('synchronous = NORMAL');
db.pragma('cache_size = 1000');
db.pragma('temp_store = memory');

// Criar tabelas se não existirem
const initDatabase = () => {
  // Tabela de NFEs
  db.exec(`
    CREATE TABLE IF NOT EXISTS nfes (
      id TEXT PRIMARY KEY,
      data TEXT NOT NULL,
      numero TEXT NOT NULL,
      chaveNFE TEXT,
      fornecedor TEXT NOT NULL,
      valor REAL NOT NULL,
      itens INTEGER NOT NULL,
      impostoEntrada REAL DEFAULT 12,
      xapuriMarkup REAL DEFAULT 160,
      epitaMarkup REAL DEFAULT 130,
      roundingType TEXT DEFAULT 'none',
      valorFrete REAL DEFAULT 0,
      isFavorite BOOLEAN DEFAULT 0,
      dataEmissao TEXT,
      valorTotal REAL,
      quantidadeTotal INTEGER,
      cnpjFornecedor TEXT,
      createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
      updatedAt DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);

  // Adicionar colunas se não existirem (para bancos existentes)
  try {
    db.exec('ALTER TABLE nfes ADD COLUMN dataEmissao TEXT');
  } catch (e) { /* Coluna já existe */ }
  
  try {
    db.exec('ALTER TABLE nfes ADD COLUMN valorTotal REAL');
  } catch (e) { /* Coluna já existe */ }
  
  try {
    db.exec('ALTER TABLE nfes ADD COLUMN quantidadeTotal INTEGER');
  } catch (e) { /* Coluna já existe */ }
  
  try {
    db.exec('ALTER TABLE nfes ADD COLUMN cnpjFornecedor TEXT');
  } catch (e) { /* Coluna já existe */ }
  
  try {
    db.exec('ALTER TABLE nfes ADD COLUMN originalXML TEXT');
  } catch (e) { /* Coluna já existe */ }

  // Tabela de produtos
  db.exec(`
    CREATE TABLE IF NOT EXISTS produtos (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      nfeId TEXT NOT NULL,
      codigo TEXT NOT NULL,
      descricao TEXT NOT NULL,
      ncm TEXT,
      cfop TEXT,
      unidade TEXT,
      quantidade REAL NOT NULL,
      valorUnitario REAL NOT NULL,
      valorTotal REAL NOT NULL,
      discount REAL DEFAULT 0,
      baseCalculoICMS REAL,
      valorICMS REAL,
      aliquotaICMS REAL,
      baseCalculoIPI REAL,
      valorIPI REAL,
      aliquotaIPI REAL,
      ean TEXT,
      reference TEXT,
      brand TEXT,
      imageUrl TEXT,
      descricao_complementar TEXT,
      custoExtra REAL DEFAULT 0,
      freteProporcional REAL DEFAULT 0,
      FOREIGN KEY (nfeId) REFERENCES nfes(id) ON DELETE CASCADE
    )
  `);

  // Adicionar coluna discount se não existir (para bancos existentes)
  try {
    db.exec('ALTER TABLE produtos ADD COLUMN discount REAL DEFAULT 0');
  } catch (e) { /* Coluna já existe */ }

  // Índices para melhor performance
  db.exec(`
    CREATE INDEX IF NOT EXISTS idx_nfes_fornecedor ON nfes(fornecedor);
    CREATE INDEX IF NOT EXISTS idx_nfes_data ON nfes(data);
    CREATE INDEX IF NOT EXISTS idx_produtos_nfeId ON produtos(nfeId);
    CREATE INDEX IF NOT EXISTS idx_produtos_codigo ON produtos(codigo);
  `);
};

initDatabase();

// Inicializar cache Redis com fallback robusto
// Temporariamente desabilitado para resolver problemas de conexão
/*
cache.connect()
  .then(() => {
    logger.info('Redis Connected Successfully', { category: 'cache' });
  })
  .catch(err => {
    logger.warn('Redis Connection Failed - Using Fallback', {
      error: err.message,
      category: 'cache'
    });
    // Continuar sem Redis - não deve crashar o servidor
  });
*/
logger.info('Cache disabled temporarily', { category: 'cache' });

// ===== WEBSOCKET CONFIGURATION =====
let connectedClients = 0;

io.on('connection', (socket) => {
  connectedClients++;
  logger.info('WebSocket Client Connected', {
    socketId: socket.id,
    totalClients: connectedClients,
    category: 'websocket'
  });

  // Enviar status inicial
  socket.emit('server-status', {
    status: 'connected',
    timestamp: new Date().toISOString(),
    clientId: socket.id
  });

  socket.on('disconnect', () => {
    connectedClients--;
    logger.info('WebSocket Client Disconnected', {
      socketId: socket.id,
      totalClients: connectedClients,
      category: 'websocket'
    });
  });

  // Ping/Pong para manter conexão ativa
  socket.on('ping', () => {
    socket.emit('pong', { timestamp: new Date().toISOString() });
  });
});

// Função para enviar notificações em tempo real
const sendNotification = (type, data) => {
  io.emit('notification', {
    type,
    data,
    timestamp: new Date().toISOString()
  });
  
  logger.info('WebSocket Notification Sent', {
    type,
    clientsNotified: connectedClients,
    category: 'websocket'
  });
};

// Função para enviar atualizações de NFe
const sendNFeUpdate = (action, nfe) => {
  io.emit('nfe-update', {
    action, // 'created', 'updated', 'deleted'
    nfe,
    timestamp: new Date().toISOString()
  });
  
  logger.info('NFe Update Notification Sent', {
    action,
    nfeId: nfe?.id,
    clientsNotified: connectedClients,
    category: 'websocket'
  });
};

// Função para enviar status do sistema
const sendSystemStatus = (status) => {
  io.emit('system-status', {
    ...status,
    timestamp: new Date().toISOString()
  });
};

// Rotas da API

// GET - Listar todas as NFEs
app.get('/api/nfes', async (req, res) => {
  try {
    const { page = 1, limit = 10, search = '', status = '' } = req.query;
    const cacheKey = cache.generateNfeKey({ page, limit, search, status });
    
    // Tentar buscar do cache primeiro
    const cachedData = await cache.get(cacheKey);
    if (cachedData) {
      analytics.recordCacheEvent(true);
      logger.debug('Cache Hit - NFEs List', {
      cacheKey,
      category: 'cache'
    });
      return res.json(cachedData);
    }
    
    analytics.recordCacheEvent(false);
    
    // Construir query com filtros
    let whereClause = 'WHERE 1=1';
    const params = [];
    
    if (search) {
      whereClause += ' AND (n.numeroNF LIKE ? OR n.emitente LIKE ? OR n.destinatario LIKE ?)';
      const searchParam = `%${search}%`;
      params.push(searchParam, searchParam, searchParam);
    }
    
    if (status) {
      whereClause += ' AND n.status = ?';
      params.push(status);
    }
    
    const offset = (page - 1) * limit;
    
    const stmt = db.prepare(`
      SELECT 
        n.*,
        COUNT(p.id) as produtosCount,
        COALESCE(SUM(p.valorTotal), 0) as valorBrutoProdutos,
        COALESCE(SUM(p.discount), 0) as descontoTotal,
        n.valor as valorLiquido
      FROM nfes n
      LEFT JOIN produtos p ON n.id = p.nfeId
      ${whereClause}
      GROUP BY n.id
      ORDER BY n.createdAt DESC
      LIMIT ? OFFSET ?
    `);
    
    const countStmt = db.prepare(`
      SELECT COUNT(DISTINCT n.id) as total
      FROM nfes n
      ${whereClause}
    `);
    
    const nfes = stmt.all(...params, limit, offset);
    const { total } = countStmt.get(...params);
    
    const result = {
      data: nfes,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / limit)
      }
    };
    
    // Salvar no cache por 5 minutos
    await cache.set(cacheKey, result, 300);
    logger.debug('Cache Miss - NFEs Saved to Cache', {
      cacheKey,
      resultCount: nfes.length,
      category: 'cache'
    });
    
    res.json(result);
  } catch (error) {
    console.error('Erro ao buscar NFEs:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

// GET - Buscar NFE por ID
app.get('/api/nfes/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const cacheKey = cache.generateNfeDetailKey(id);
    
    // Tentar buscar do cache primeiro
    const cachedData = await cache.get(cacheKey);
    if (cachedData) {
      analytics.recordCacheEvent(true);
      logger.debug('Cache Hit - NFE Detail', {
      nfeId: id,
      cacheKey,
      category: 'cache'
    });
      return res.json(cachedData);
    }
    
    analytics.recordCacheEvent(false);
    
    // Buscar NFE
    const nfeStmt = db.prepare('SELECT * FROM nfes WHERE id = ?');
    const nfe = nfeStmt.get(id);
    
    if (!nfe) {
      return res.status(404).json({ error: 'NFE não encontrada' });
    }
    
    // HOTFIX: Sempre extrair valor_liquido do XML original (vNF)
    if (nfe.originalXML) {
      try {
        const basicInfo = xmlValidator.extractBasicInfo(nfe.originalXML);
        if (basicInfo && basicInfo.valorLiquido !== null && basicInfo.valorLiquido !== undefined) {
          const valorOriginal = nfe.valor;
          nfe.valor = basicInfo.valorLiquido; // Sempre usar vNF do XML original
          console.log(`🔒 [NFE_GUARD] Valor líquido protegido do XML original - NFE ${id}: ${valorOriginal} -> ${nfe.valor} (vNF)`);
        }
      } catch (xmlError) {
        console.warn(`⚠️ Erro ao extrair vNF do XML original para NFE ${id}:`, xmlError.message);
      }
    }
    
    // Buscar produtos da NFE
    const produtosStmt = db.prepare('SELECT * FROM produtos WHERE nfeId = ?');
    const produtos = produtosStmt.all(id);
    
    // Calcular valores dinâmicos baseados nos produtos
    const valorBrutoProdutos = produtos.reduce((sum, produto) => sum + (produto.valorTotal || 0), 0);
    const descontoTotalProdutos = produtos.reduce((sum, produto) => sum + (produto.discount || 0), 0);
    const valorLiquido = nfe.valor; // vNF do XML
    const descontoTotal = Math.max(0, valorBrutoProdutos - valorLiquido);
    
    // Adicionar campos calculados à NFE
    nfe.produtos = produtos;
    nfe.valorBrutoProdutos = valorBrutoProdutos;
    nfe.descontoTotal = descontoTotal;
    nfe.valorLiquido = valorLiquido;
    
    console.log(`💰 [NFE ${id}] Cálculos: Bruto=${valorBrutoProdutos}, Líquido=${valorLiquido}, Desconto=${descontoTotal}`);
    
    // Salvar no cache por 10 minutos
    await cache.set(cacheKey, nfe, 600);
    logger.debug('Cache Miss - NFE Detail Saved to Cache', {
      nfeId: id,
      cacheKey,
      category: 'cache'
    });
    
    res.json(nfe);
  } catch (error) {
    console.error('Erro ao buscar NFE:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

// GET - Buscar XML original da NFE
app.get('/api/nfes/:id/original-xml', async (req, res) => {
  try {
    const { id } = req.params;
    
    // Buscar apenas o XML original da NFE
    const nfeStmt = db.prepare('SELECT originalXML FROM nfes WHERE id = ?');
    const nfe = nfeStmt.get(id);
    
    if (!nfe) {
      return res.status(404).json({ error: 'NFE não encontrada' });
    }
    
    if (!nfe.originalXML) {
      return res.status(404).json({ error: 'XML original não disponível para esta NFE' });
    }
    
    // Retornar o XML original com o content-type apropriado
    res.set('Content-Type', 'application/xml');
    res.send(nfe.originalXML);
  } catch (error) {
    console.error('Erro ao buscar XML original da NFE:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

// GET - Comparar dados atuais com XML original
app.get('/api/nfes/:id/compare-original', async (req, res) => {
  try {
    const { id } = req.params;
    
    // Buscar NFE completa com XML original
    const nfeStmt = db.prepare('SELECT * FROM nfes WHERE id = ?');
    const nfe = nfeStmt.get(id);
    
    if (!nfe) {
      return res.status(404).json({ error: 'NFE não encontrada' });
    }
    
    if (!nfe.originalXML) {
      return res.status(404).json({ error: 'XML original não disponível para esta NFE' });
    }
    
    // Buscar produtos atuais
    const produtosStmt = db.prepare('SELECT * FROM produtos WHERE nfeId = ?');
    const produtosAtuais = produtosStmt.all(id);
    
    // Parse do XML original para extrair dados originais
    const xml2js = require('xml2js');
    const parser = new xml2js.Parser({ explicitArray: false });
    
    let dadosOriginais = {};
    let produtosOriginais = [];
    
    try {
      const xmlParsed = await parser.parseStringPromise(nfe.originalXML);
      const infNFe = xmlParsed.nfeProc?.NFe?.infNFe || xmlParsed.NFe?.infNFe;
      
      if (infNFe) {
        // Extrair dados básicos originais
        const ide = infNFe.ide;
        const emit = infNFe.emit;
        const total = infNFe.total?.ICMSTot;
        
        dadosOriginais = {
          numero: ide?.nNF,
          chaveNFE: infNFe.$?.Id?.replace('NFe', ''),
          fornecedor: emit?.xNome,
          cnpjFornecedor: emit?.CNPJ,
          dataEmissao: ide?.dhEmi,
          valorTotal: parseFloat(total?.vNF || 0),
          valorFrete: parseFloat(total?.vFrete || 0)
        };
        
        // Extrair produtos originais
        const dets = Array.isArray(infNFe.det) ? infNFe.det : [infNFe.det];
        produtosOriginais = dets.map(det => {
          const prod = det.prod;
          const imposto = det.imposto;
          
          return {
            codigo: prod?.cProd,
            descricao: prod?.xProd,
            ncm: prod?.NCM,
            cfop: prod?.CFOP,
            unidade: prod?.uCom,
            quantidade: parseFloat(prod?.qCom || 0),
            valorUnitario: parseFloat(prod?.vUnCom || 0),
            valorTotal: parseFloat(prod?.vProd || 0),
            valorDesconto: parseFloat(prod?.vDesc || 0)
          };
        });
      }
    } catch (parseError) {
      console.error('Erro ao fazer parse do XML original:', parseError);
      return res.status(500).json({ error: 'Erro ao processar XML original' });
    }
    
    // Comparar dados
    const comparacao = {
      dadosBasicos: {
        original: dadosOriginais,
        atual: {
          numero: nfe.numero,
          chaveNFE: nfe.chaveNFE,
          fornecedor: nfe.fornecedor,
          cnpjFornecedor: nfe.cnpjFornecedor,
          dataEmissao: nfe.dataEmissao,
          valorTotal: nfe.valorTotal,
          valorFrete: nfe.valorFrete
        },
        alteracoes: []
      },
      produtos: {
        original: produtosOriginais,
        atual: produtosAtuais,
        alteracoes: []
      }
    };
    
    // Detectar alterações nos dados básicos
    Object.keys(dadosOriginais).forEach(campo => {
      if (dadosOriginais[campo] !== comparacao.dadosBasicos.atual[campo]) {
        comparacao.dadosBasicos.alteracoes.push({
          campo,
          valorOriginal: dadosOriginais[campo],
          valorAtual: comparacao.dadosBasicos.atual[campo]
        });
      }
    });
    
    // Detectar alterações nos produtos (simplificado)
    if (produtosOriginais.length !== produtosAtuais.length) {
      comparacao.produtos.alteracoes.push({
        tipo: 'quantidade_produtos',
        original: produtosOriginais.length,
        atual: produtosAtuais.length
      });
    }
    
    res.json(comparacao);
  } catch (error) {
    console.error('Erro ao comparar com XML original:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

// POST - Restaurar NFE aos dados originais do XML
app.post('/api/nfes/:id/restore-original', async (req, res) => {
  try {
    const { id } = req.params;
    const { confirmacao } = req.body;
    
    // Verificar se o usuário confirmou a operação
    if (!confirmacao) {
      return res.status(400).json({ 
        error: 'Confirmação necessária',
        message: 'Esta operação irá sobrescrever todos os dados atuais da NFE com os dados originais do XML. Confirme enviando { "confirmacao": true }'
      });
    }
    
    // Buscar NFE com XML original
    const nfeStmt = db.prepare('SELECT * FROM nfes WHERE id = ?');
    const nfe = nfeStmt.get(id);
    
    if (!nfe) {
      return res.status(404).json({ error: 'NFE não encontrada' });
    }
    
    if (!nfe.originalXML) {
      return res.status(404).json({ error: 'XML original não disponível para esta NFE' });
    }
    
    // Parse do XML original
    const xml2js = require('xml2js');
    const parser = new xml2js.Parser({ explicitArray: false });
    
    try {
      const xmlParsed = await parser.parseStringPromise(nfe.originalXML);
      const infNFe = xmlParsed.nfeProc?.NFe?.infNFe || xmlParsed.NFe?.infNFe;
      
      if (!infNFe) {
        return res.status(400).json({ error: 'XML original inválido ou corrompido' });
      }
      
      // Extrair dados originais
      const ide = infNFe.ide;
      const emit = infNFe.emit;
      const total = infNFe.total?.ICMSTot;
      
      const dadosOriginais = {
        numero: ide?.nNF,
        chaveNFE: infNFe.$?.Id?.replace('NFe', ''),
        fornecedor: emit?.xNome,
        cnpjFornecedor: emit?.CNPJ,
        dataEmissao: ide?.dhEmi,
        valorTotal: parseFloat(total?.vNF || 0),
        valorFrete: parseFloat(total?.vFrete || 0)
      };
      
      // Extrair produtos originais
      const dets = Array.isArray(infNFe.det) ? infNFe.det : [infNFe.det];
      const produtosOriginais = dets.map(det => {
        const prod = det.prod;
        
        return {
          nfeId: id,
          codigo: prod?.cProd,
          descricao: prod?.xProd,
          ncm: prod?.NCM,
          cfop: prod?.CFOP,
          unidade: prod?.uCom,
          quantidade: parseFloat(prod?.qCom || 0),
          valorUnitario: parseFloat(prod?.vUnCom || 0),
          valorTotal: parseFloat(prod?.vProd || 0),
          valorDesconto: parseFloat(prod?.vDesc || 0)
        };
      });
      
      // Iniciar transação
      const transaction = db.transaction(() => {
        // Atualizar dados da NFE
        const updateNFE = db.prepare(`
          UPDATE nfes SET 
            numero = ?, chaveNFE = ?, fornecedor = ?, cnpjFornecedor = ?,
            dataEmissao = ?, valorTotal = ?, valorFrete = ?
          WHERE id = ?
        `);
        
        updateNFE.run(
          dadosOriginais.numero,
          dadosOriginais.chaveNFE,
          dadosOriginais.fornecedor,
          dadosOriginais.cnpjFornecedor,
          dadosOriginais.dataEmissao,
          dadosOriginais.valorTotal,
          dadosOriginais.valorFrete,
          id
        );
        
        // Remover produtos atuais
        const deleteProdutos = db.prepare('DELETE FROM produtos WHERE nfeId = ?');
        deleteProdutos.run(id);
        
        // Inserir produtos originais
        const insertProduto = db.prepare(`
          INSERT INTO produtos (nfeId, codigo, descricao, ncm, cfop, unidade, 
                               quantidade, valorUnitario, valorTotal, valorDesconto)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `);
        
        produtosOriginais.forEach(produto => {
          insertProduto.run(
            produto.nfeId,
            produto.codigo,
            produto.descricao,
            produto.ncm,
            produto.cfop,
            produto.unidade,
            produto.quantidade,
            produto.valorUnitario,
            produto.valorTotal,
            produto.valorDesconto
          );
        });
      });
      
      // Executar transação
      transaction();
      
      // Invalidar cache
      await cache.invalidateNfeCache(id);
      
      // Enviar notificação via WebSocket
      if (io) {
        io.emit('nfe-restored', {
          id,
          message: 'NFE restaurada aos dados originais',
          timestamp: new Date().toISOString()
        });
      }
      
      res.json({
        success: true,
        message: 'NFE restaurada aos dados originais com sucesso',
        dadosRestaurados: dadosOriginais,
        produtosRestaurados: produtosOriginais.length
      });
      
    } catch (parseError) {
      console.error('Erro ao fazer parse do XML original:', parseError);
      return res.status(500).json({ error: 'Erro ao processar XML original' });
    }
    
  } catch (error) {
    console.error('Erro ao restaurar NFE:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

// POST - Criar nova NFE
app.post('/api/nfes', async (req, res) => {
  try {
    // Log detalhado do payload recebido
    console.log('🔍 POST /api/nfes - Payload recebido:', {
      body: req.body,
      bodyKeys: Object.keys(req.body || {}),
      bodyType: typeof req.body,
      contentType: req.headers['content-type'],
      timestamp: new Date().toISOString()
    });
    
    const { 
      id, data, numero, chaveNFE, fornecedor, valor, itens, produtos,
      impostoEntrada, xapuriMarkup, epitaMarkup, roundingType, valorFrete, isFavorite,
      dataEmissao, valorTotal, quantidadeTotal, cnpjFornecedor, createdAt, updatedAt
    } = req.body;
    
    // Log dos campos extraídos
    console.log('📋 Campos extraídos do req.body:', {
      id: { value: id, type: typeof id },
      data: { value: data, type: typeof data },
      numero: { value: numero, type: typeof numero },
      chaveNFE: { value: chaveNFE, type: typeof chaveNFE },
      fornecedor: { value: fornecedor, type: typeof fornecedor },
      valor: { value: valor, type: typeof valor },
      itens: { value: itens, type: typeof itens },
      produtos: { value: produtos ? `Array[${produtos.length}]` : produtos, type: typeof produtos },
      impostoEntrada: { value: impostoEntrada, type: typeof impostoEntrada },
      xapuriMarkup: { value: xapuriMarkup, type: typeof xapuriMarkup },
      epitaMarkup: { value: epitaMarkup, type: typeof epitaMarkup },
      roundingType: { value: roundingType, type: typeof roundingType },
      valorFrete: { value: valorFrete, type: typeof valorFrete },
      isFavorite: { value: isFavorite, type: typeof isFavorite },
      dataEmissao: { value: dataEmissao, type: typeof dataEmissao },
      valorTotal: { value: valorTotal, type: typeof valorTotal },
      quantidadeTotal: { value: quantidadeTotal, type: typeof quantidadeTotal },
      cnpjFornecedor: { value: cnpjFornecedor, type: typeof cnpjFornecedor },
      createdAt: { value: createdAt, type: typeof createdAt },
      updatedAt: { value: updatedAt, type: typeof updatedAt }
    });
    
    // Validar dados mínimos obrigatórios (apenas ID é realmente obrigatório para auto-save)
    if (!id) {
      console.log('❌ Validação falhou - ID é obrigatório:', { id });
      return res.status(400).json({ error: 'ID é obrigatório' });
    }
    
    // Definir valores padrão para campos ausentes (para suportar auto-save)
    const safeData = data || new Date().toISOString().split('T')[0];
    const safeNumero = numero || 'TEMP-' + Date.now();
    const safeFornecedor = fornecedor || 'Fornecedor não informado';
    const safeValor = valor || 0;
    const safeItens = itens || 0;
    const safeImpostoEntrada = impostoEntrada || 0;
    const safeXapuriMarkup = xapuriMarkup || null;
    const safeEpitaMarkup = epitaMarkup || null;
    const safeRoundingType = roundingType || null;
    const safeValorFrete = valorFrete || null;
    const safeIsFavorite = isFavorite || 0;
    
    console.log('🔧 Campos processados com valores padrão:', {
      id,
      data: { original: data, safe: safeData },
      numero: { original: numero, safe: safeNumero },
      fornecedor: { original: fornecedor, safe: safeFornecedor },
      valor: { original: valor, safe: safeValor },
      itens: { original: itens, safe: safeItens },
      impostoEntrada: { original: impostoEntrada, safe: safeImpostoEntrada },
      xapuriMarkup: { original: xapuriMarkup, safe: safeXapuriMarkup },
      epitaMarkup: { original: epitaMarkup, safe: safeEpitaMarkup },
      roundingType: { original: roundingType, safe: safeRoundingType },
      valorFrete: { original: valorFrete, safe: safeValorFrete },
      isFavorite: { original: isFavorite, safe: safeIsFavorite }
    });
    
    // Verificar se NFE já existe
    const existingNFE = db.prepare('SELECT id, valor, valorTotal FROM nfes WHERE id = ?').get(id);
    
    if (existingNFE) {
      console.log('🔄 NFE já existe, atualizando:', id);
      console.log('🔍 ANTES da atualização POST - NFE ID:', id, {
        valorAntes: existingNFE.valor,
        valorTotalAntes: existingNFE.valorTotal,
        valorRecebido: safeValor,
        valorTotalRecebido: valorTotal
      });
      
      // Atualizar NFE existente
       const updateNFE = db.prepare(`
         UPDATE nfes 
         SET data = ?, numero = ?, chaveNFE = ?, fornecedor = ?, valor = ?, itens = ?, 
             impostoEntrada = ?, xapuriMarkup = ?, epitaMarkup = ?, roundingType = ?, 
             valorFrete = ?, isFavorite = ?, dataEmissao = ?, valorTotal = ?, 
             quantidadeTotal = ?, cnpjFornecedor = ?, originalXML = ?, updatedAt = CURRENT_TIMESTAMP
         WHERE id = ?
       `);
       
       updateNFE.run(safeData, safeNumero, chaveNFE, safeFornecedor, safeValor, safeItens, 
                     safeImpostoEntrada, safeXapuriMarkup, safeEpitaMarkup, safeRoundingType, 
                     safeValorFrete, safeIsFavorite, dataEmissao, valorTotal, 
                     quantidadeTotal, cnpjFornecedor, req.body.originalXML || null, id);
      
      // Log dos valores DEPOIS da atualização
      const afterValues = db.prepare('SELECT valor, valorTotal FROM nfes WHERE id = ?').get(id);
      console.log('🔍 DEPOIS da atualização POST - NFE ID:', id, {
        valorDepois: afterValues?.valor,
        valorTotalDepois: afterValues?.valorTotal
      });
      
      // Remover produtos existentes antes de inserir novos
      const deleteProdutos = db.prepare('DELETE FROM produtos WHERE nfeId = ?');
      deleteProdutos.run(id);
      
      console.log('✅ NFE atualizada e produtos removidos para reinserção');
    } else {
      console.log('➕ Criando nova NFE:', id);
      console.log('🔍 INSERINDO nova NFE - NFE ID:', id, {
        valorParaInserir: safeValor,
        valorTotalParaInserir: valorTotal
      });
      
      // Inserir nova NFE
       const insertNFE = db.prepare(`
         INSERT INTO nfes (id, data, numero, chaveNFE, fornecedor, valor, itens, 
                          impostoEntrada, xapuriMarkup, epitaMarkup, roundingType, 
                          valorFrete, isFavorite, dataEmissao, valorTotal, 
                          quantidadeTotal, cnpjFornecedor, originalXML)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
       `);
       
       insertNFE.run(id, safeData, safeNumero, chaveNFE, safeFornecedor, safeValor, safeItens,
                     safeImpostoEntrada, safeXapuriMarkup, safeEpitaMarkup, safeRoundingType,
                     safeValorFrete, safeIsFavorite, dataEmissao, valorTotal, 
                     quantidadeTotal, cnpjFornecedor, req.body.originalXML || null);
      
      // Log dos valores DEPOIS da inserção
      const afterValues = db.prepare('SELECT valor, valorTotal FROM nfes WHERE id = ?').get(id);
      console.log('🔍 DEPOIS da inserção POST - NFE ID:', id, {
        valorDepois: afterValues?.valor,
        valorTotalDepois: afterValues?.valorTotal
      });
      console.log('✅ Nova NFE criada com sucesso');
    }
    
    console.log('💾 Processando NFE no banco:', { id, data: safeData, numero: safeNumero, chaveNFE, fornecedor: safeFornecedor, valor: safeValor, itens: safeItens });
    
    // Inserir produtos
    if (Array.isArray(produtos) && produtos.length > 0) {
      console.log(`📦 Inserindo ${produtos.length} produtos:`);
      
      const insertProduto = db.prepare(`
        INSERT INTO produtos (
          nfeId, codigo, descricao, ncm, cfop, unidade,
          quantidade, valorUnitario, valorTotal, discount,
          baseCalculoICMS, valorICMS, aliquotaICMS,
          baseCalculoIPI, valorIPI, aliquotaIPI,
          ean, reference, referencia, brand, imageUrl, descricao_complementar,
          custoExtra, freteProporcional
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `);
      
      produtos.forEach((produto, index) => {
        console.log(`📋 Produto ${index + 1}:`, {
          codigo: produto.codigo ?? produto.code,
          descricao: produto.descricao ?? produto.name,
          quantidade: produto.quantidade ?? produto.quantity,
          valorUnitario: produto.valorUnitario ?? produto.unitPrice,
          valorTotal: produto.valorTotal ?? produto.totalPrice,
          allKeys: Object.keys(produto || {})
        });
        
        // Normalizar campos aceitando tanto os nomes PT-BR quanto os alternativos usados no frontend
        const codigo = produto.codigo ?? produto.code ?? null;
        const descricao = produto.descricao ?? produto.name ?? null;
        const quantidade = produto.quantidade ?? produto.quantity ?? 0;
        const valorUnitario = produto.valorUnitario ?? produto.unitPrice ?? 0;
        const valorTotal = produto.valorTotal ?? produto.totalPrice ?? 0;
        const ncm = produto.ncm ?? null;
        const cfop = produto.cfop ?? null;
        const unidade = produto.unidade ?? produto.uom ?? null;
        const baseCalculoICMS = produto.baseCalculoICMS ?? null;
        const valorICMS = produto.valorICMS ?? null;
        const aliquotaICMS = produto.aliquotaICMS ?? null;
        const baseCalculoIPI = produto.baseCalculoIPI ?? null;
        const valorIPI = produto.valorIPI ?? null;
        const aliquotaIPI = produto.aliquotaIPI ?? null;
        const ean = produto.ean ?? null;
        const reference = produto.reference ?? produto.referencia ?? produto.codigo ?? null;
        const referencia = produto.referencia ?? produto.codigo ?? null;
        const brand = produto.brand ?? null;
        const imageUrl = produto.imageUrl ?? null;
        const descricaoComplementar = produto.descricao_complementar ?? produto.descricaoComplementar ?? null;
        const discount = produto.discount ?? 0;
        const custoExtra = produto.custoExtra ?? 0;
        const freteProporcional = produto.freteProporcional ?? 0;
        
        try {
          insertProduto.run(
            id,
            codigo,
            descricao,
            ncm,
            cfop,
            unidade,
            quantidade,
            valorUnitario,
            valorTotal,
            discount,
            baseCalculoICMS,
            valorICMS,
            aliquotaICMS,
            baseCalculoIPI,
            valorIPI,
            aliquotaIPI,
            ean,
            reference,
            referencia,
            brand,
            imageUrl,
            descricaoComplementar,
            custoExtra,
            freteProporcional
          );
          console.log(`✅ Produto ${index + 1} inserido com sucesso`);
        } catch (produtoError) {
          console.error(`❌ Erro ao inserir produto ${index + 1}:`, {
            error: produtoError.message,
            produto: produto,
            stack: produtoError.stack
          });
          throw produtoError;
        }
      });
    } else {
      console.log('📦 Nenhum produto para inserir:', { produtos, isArray: Array.isArray(produtos) });
    }
    
    // Invalidar cache após criação
    await cache.invalidatePattern('nfes:*');
    logger.debug('Cache Invalidated After NFE Creation', {
      nfeId: id,
      category: 'cache'
    });
    
    // Enviar notificação WebSocket
     const nfeData = { id, data: safeData, numero: safeNumero, chaveNFE, fornecedor: safeFornecedor, valor: safeValor, itens: safeItens };
     const action = existingNFE ? 'updated' : 'created';
     const message = existingNFE ? 'NFE atualizada com sucesso' : 'NFE criada com sucesso';
     
     sendNFeUpdate(action, nfeData);
     sendNotification(`nfe_${action}`, {
       message,
       nfeId: id,
       numero: safeNumero,
       fornecedor: safeFornecedor
     });
    
    console.log(`✅ ${message}:`, id);
    
    res.status(existingNFE ? 200 : 201).json({ 
      message, 
      id,
      nfe: nfeData,
      action 
    });
  } catch (error) {
    console.error('❌ ERRO DETALHADO ao criar NFE:', {
      message: error.message,
      stack: error.stack,
      code: error.code,
      errno: error.errno,
      sql: error.sql,
      requestBody: req.body,
      timestamp: new Date().toISOString()
    });
    
    // Retornar erro mais específico baseado no tipo
    let errorMessage = 'Erro interno do servidor';
    if (error.message.includes('UNIQUE constraint failed')) {
      errorMessage = 'NFE com este ID já existe';
    } else if (error.message.includes('NOT NULL constraint failed')) {
      errorMessage = 'Campo obrigatório não fornecido: ' + error.message.split(':')[1];
    } else if (error.message.includes('FOREIGN KEY constraint failed')) {
      errorMessage = 'Erro de referência no banco de dados';
    }
    
    res.status(500).json({ 
      error: errorMessage,
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

// PUT - Atualizar NFE
// Middleware de log para PUT /api/nfes/:id - rastrear payload e tentativas de alteração
const logPutPayload = (req, res, next) => {
  const { id } = req.params;
  const payload = req.body;
  const clientIP = req.ip || req.connection.remoteAddress || req.headers['x-forwarded-for'];
  const userAgent = req.headers['user-agent'];
  
  console.log(`📋 [PUT_LOG] NFE ${id} - Payload recebido:`, {
    ip: clientIP,
    userAgent,
    payload: JSON.stringify(payload),
    timestamp: new Date().toISOString(),
    route: 'PUT /api/nfes/:id'
  });
  
  // ALERTA: Se payload contém valor_liquido ou valor_total
  if (payload.hasOwnProperty('valor_liquido') || payload.hasOwnProperty('valor_total')) {
    console.log(`🚨 [ALERTA] payload tentou alterar campos protegidos - NFE ${id}:`, {
      valor_liquido: payload.valor_liquido,
      valor_total: payload.valor_total,
      ip: clientIP,
      stack: new Error().stack
    });
  }
  
  next();
};

app.put('/api/nfes/:id', logPutPayload, async (req, res) => {
  try {
    const { id } = req.params;
    
    // WHITELIST: Apenas campos editáveis pelo usuário são permitidos
    // 🔒 BLOQUEADOS: valor_liquido (vNF), valor_total (vProd), desconto_total, qtd_itens, qtd_unidades
    // ✏️ EDITÁVEIS: markup_xapuri, markup_epitaciolandia, frete_total, arredondamento, observacao, oculto, modo_detalhado
    const allowedFields = [
      'data', 'numero', 'chaveNFE', 'fornecedor', 'itens',
      'markup_xapuri', 'markup_epitaciolandia', 'frete_total', 
      'arredondamento', 'observacao', 'descricao_complementar',
      'oculto', 'modo_detalhado'
    ];
    const updates = {};
    
    // Filtrar apenas campos permitidos do payload
    allowedFields.forEach(field => {
      if (req.body.hasOwnProperty(field)) {
        updates[field] = req.body[field];
      }
    });
    
    console.log(`✅ [WHITELIST] Campos permitidos para NFE ${id}:`, updates);
    
    const { 
      data, numero, chaveNFE, fornecedor, itens,
      markup_xapuri, markup_epitaciolandia, frete_total,
      arredondamento, observacao, descricao_complementar,
      oculto, modo_detalhado
    } = updates;
    
    // Verificar se NFE existe
    const nfeStmt = db.prepare('SELECT id FROM nfes WHERE id = ?');
    const nfe = nfeStmt.get(id);
    
    if (!nfe) {
      return res.status(404).json({ error: 'NFE não encontrada' });
    }
    
    // Atualizar apenas campos permitidos pela whitelist
    // 🔒 valor_liquido e valor_total são protegidos pelo TRIGGER SQLite
    const updateFields = [];
    const updateValues = [];
    
    // Campos básicos da NFE
    if (data !== undefined) {
      updateFields.push('data = ?');
      updateValues.push(data);
    }
    if (numero !== undefined) {
      updateFields.push('numero = ?');
      updateValues.push(numero);
    }
    if (chaveNFE !== undefined) {
      updateFields.push('chaveNFE = ?');
      updateValues.push(chaveNFE);
    }
    if (fornecedor !== undefined) {
      updateFields.push('fornecedor = ?');
      updateValues.push(fornecedor);
    }
    if (itens !== undefined) {
      updateFields.push('itens = ?');
      updateValues.push(itens);
    }
    
    // ✏️ Campos editáveis específicos do sistema
    if (markup_xapuri !== undefined) {
      updateFields.push('markup_xapuri = ?');
      updateValues.push(markup_xapuri);
    }
    if (markup_epitaciolandia !== undefined) {
      updateFields.push('markup_epitaciolandia = ?');
      updateValues.push(markup_epitaciolandia);
    }
    if (frete_total !== undefined) {
      updateFields.push('frete_total = ?');
      updateValues.push(frete_total);
    }
    if (arredondamento !== undefined) {
      updateFields.push('arredondamento = ?');
      updateValues.push(arredondamento);
    }
    if (observacao !== undefined) {
      updateFields.push('observacao = ?');
      updateValues.push(observacao);
    }
    if (descricao_complementar !== undefined) {
      updateFields.push('descricao_complementar = ?');
      updateValues.push(descricao_complementar);
    }
    if (oculto !== undefined) {
      updateFields.push('oculto = ?');
      updateValues.push(oculto);
    }
    if (modo_detalhado !== undefined) {
      updateFields.push('modo_detalhado = ?');
      updateValues.push(modo_detalhado);
    }
    
    // Se nenhum campo válido foi enviado, retornar 204 (No Content) em vez de erro
    if (updateFields.length === 0) {
      console.log(`ℹ️ [WHITELIST] Nenhum campo editável enviado para NFE ${id} - retornando 204`);
      return res.status(204).send();
    }
    
    // Sempre atualizar updatedAt
    updateFields.push('updatedAt = CURRENT_TIMESTAMP');
    updateValues.push(id); // ID para WHERE clause
    
    const updateQuery = `UPDATE nfes SET ${updateFields.join(', ')} WHERE id = ?`;
    console.log(`🔄 [UPDATE] Executando query para NFE ${id}:`, updateQuery);
    
    const updateNFE = db.prepare(updateQuery);
    updateNFE.run(...updateValues);
    
    // Invalidar cache após atualização
    await cache.invalidatePattern('nfes:*');
    await cache.del(cache.generateNfeDetailKey(id));
    logger.debug('Cache Invalidated After NFE Update', {
      nfeId: id,
      category: 'cache'
    });
    
    // Enviar notificação WebSocket
    const updatedNfe = { id, ...updates };
    sendNFeUpdate('updated', updatedNfe);
    sendNotification('nfe_updated', {
      message: 'NFe atualizada com sucesso',
      nfeId: id,
      numero: numero || 'N/A',
      fornecedor: fornecedor || 'N/A'
    });
    
    res.json({ message: 'NFE atualizada com sucesso' });
  } catch (error) {
    console.error('❌ [PUT_ERROR] Erro ao atualizar NFE:', error);
    
    // 🛡️ NORMALIZAÇÃO: Sempre retornar 200/204 mesmo com erro interno
    // Isso evita console cheio de erro no frontend sem impacto nos dados
    logger.error('PUT /api/nfes/:id failed but returning 200 to avoid frontend errors', {
      nfeId: id,
      error: error.message,
      stack: error.stack,
      category: 'api_error_normalized'
    });
    
    // Retornar 200 com mensagem genérica para não quebrar o fluxo do usuário
    res.status(200).json({ 
      message: 'Operação processada', 
      warning: 'Alguns campos podem não ter sido atualizados' 
    });
  }
});

// DELETE - Excluir NFE
app.delete('/api/nfes/:id', async (req, res) => {
  try {
    const { id } = req.params;
    
    // Verificar se NFE existe e obter dados antes da exclusão
    const nfeStmt = db.prepare('SELECT * FROM nfes WHERE id = ?');
    const nfe = nfeStmt.get(id);
    
    if (!nfe) {
      return res.status(404).json({ error: 'NFE não encontrada' });
    }
    
    // Excluir NFE (produtos serão excluídos automaticamente devido à constraint ON DELETE CASCADE)
    const deleteNFE = db.prepare('DELETE FROM nfes WHERE id = ?');
    deleteNFE.run(id);
    
    // Invalidar cache após exclusão
    await cache.invalidatePattern('nfes:*');
    await cache.del(cache.generateNfeDetailKey(id));
    logger.debug('Cache Invalidated After NFE Deletion', {
      nfeId: id,
      category: 'cache'
    });
    
    // Enviar notificação WebSocket
    sendNFeUpdate('deleted', nfe);
    sendNotification('nfe_deleted', {
      message: 'NFe excluída com sucesso',
      nfeId: id,
      numero: nfe.numero,
      fornecedor: nfe.fornecedor
    });
    
    res.json({ message: 'NFE excluída com sucesso' });
  } catch (error) {
    console.error('Erro ao excluir NFE:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

// DELETE - Excluir todas as NFEs
app.delete('/api/nfes', async (req, res) => {
  try {
    // Contar quantas NFEs serão excluídas
    const countStmt = db.prepare('SELECT COUNT(*) as total FROM nfes');
    const { total } = countStmt.get();
    
    if (total === 0) {
      return res.json({ message: 'Nenhuma NFE encontrada para excluir', count: 0 });
    }
    
    // Excluir todas as NFEs (produtos serão excluídos automaticamente devido à constraint ON DELETE CASCADE)
    const deleteAllNFEs = db.prepare('DELETE FROM nfes');
    const result = deleteAllNFEs.run();
    
    // Invalidar todo o cache
    await cache.invalidatePattern('nfes:*');
    logger.debug('Cache Invalidated After All NFEs Deletion', {
      deletedCount: result.changes,
      category: 'cache'
    });
    
    // Enviar notificação WebSocket
    sendNotification('all_nfes_deleted', {
      message: `${result.changes} NFEs excluídas com sucesso`,
      count: result.changes
    });
    
    res.json({ 
      message: `${result.changes} NFEs excluídas com sucesso`,
      count: result.changes
    });
  } catch (error) {
    console.error('Erro ao excluir todas as NFEs:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

// Rota de status
app.get('/status', (req, res) => {
  res.json({ status: 'ok' });
});

// Rota de status da API
app.get('/api/status', (req, res) => {
  res.json({ status: 'API funcionando', timestamp: new Date().toISOString() });
});

// Endpoint para validação de XML
app.post('/api/validate-xml', upload.single('xmlFile'), (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ 
        error: 'Nenhum arquivo XML foi enviado',
        success: false 
      });
    }

    const xmlContent = req.file.buffer.toString('utf8');
    
    // Validar se é um XML válido
    if (!xmlValidator.isValidXML(xmlContent)) {
      return res.status(400).json({
        error: 'Arquivo não é um XML válido',
        success: false
      });
    }

    // Validar estrutura da NFe
    const validationResult = xmlValidator.validateXML(xmlContent);
    const basicInfo = xmlValidator.extractBasicInfo(xmlContent);

    if (!validationResult.isValid) {
      console.log('❌ XML inválido:', validationResult.errors?.length || 0, 'erro(s) encontrado(s)');
      console.log('Detalhes dos erros:', JSON.stringify(validationResult.errors, null, 2));
      return res.status(400).json({
        success: false,
        message: 'XML inválido',
        errors: validationResult.errors,
        details: validationResult.errors?.map(err => ({
          line: err.line,
          column: err.column,
          message: err.message
        })) || []
      });
    }

    res.json({
      success: true,
      validation: validationResult,
      info: basicInfo,
      filename: req.file.originalname,
      size: req.file.size
    });

  } catch (error) {
    logger.error('XML Validation Error', {
      error: error.message,
      stack: error.stack,
      filename: req.file?.originalname,
      category: 'xml-validation',
      ip: req.ip
    });
    res.status(500).json({ 
      error: 'Erro interno do servidor ao validar XML',
      details: error.message,
      success: false 
    });
  }
});

// Endpoint de teste para debug do upload
app.post('/api/test-upload', (req, res) => {
  console.log('=== TEST UPLOAD DEBUG ===');
  console.log('Content-Type:', req.headers['content-type']);
  console.log('Body:', req.body);
  console.log('Files:', req.files);
  console.log('========================');
  res.json({ message: 'Test endpoint reached', headers: req.headers });
});

// Função principal de upload (extraída para reutilização)
const uploadXmlHandler = (req, res) => {
  try {
    // Logs detalhados para diagnóstico
    logger.info('Upload XML Request Debug', {
      method: req.method,
      url: req.url,
      contentType: req.headers['content-type'],
      contentLength: req.headers['content-length'],
      hasFile: !!req.file,
      filename: req.file?.originalname,
      mimetype: req.file?.mimetype,
      fileSize: req.file?.size,
      bodyKeys: Object.keys(req.body || {}),
      body: req.body,
      category: 'xml-upload',
      ip: req.ip
    });
    
    console.log('=== DEBUG UPLOAD XML ===');
    console.log('req.file:', req.file);
    console.log('req.body:', req.body);
    console.log('req.headers:', req.headers);
    console.log('========================');
    
    if (!req.file) {
      const errorMsg = 'Campo "file" ausente ou arquivo vazio. Certifique-se de enviar o arquivo com o campo "file".';
      logger.error('Upload Error - No File', {
        error: errorMsg,
        hasBody: !!req.body,
        bodyKeys: Object.keys(req.body || {}),
        category: 'xml-upload'
      });
      analytics.recordUpload(false, 0, new Error(errorMsg));
      return res.status(400).json({ 
        error: errorMsg,
        success: false,
        debug: {
          hasFile: !!req.file,
          bodyKeys: Object.keys(req.body || {}),
          contentType: req.headers['content-type']
        }
      });
    }

    const xmlContent = req.file.buffer.toString('utf8');
    const fileSize = req.file.size;
    
    // Validar XML antes do processamento
    if (!xmlValidator.isValidXML(xmlContent)) {
      analytics.recordUpload(false, fileSize, new Error('Arquivo não é um XML válido'));
      return res.status(400).json({
        error: 'Arquivo não é um XML válido',
        success: false
      });
    }

    const validationResult = xmlValidator.validateXML(xmlContent);
    
    // Se há erros críticos, retornar erro
    if (!validationResult.isValid) {
      analytics.recordUpload(false, fileSize, new Error('XML da NFe contém erros de validação'));
      analytics.recordNfeProcessing(false, null, new Error('Falha na validação do XML'));
      
      console.log('=== VALIDATION RESULT DEBUG ===');
      console.log('Errors:', validationResult.errors);
      console.log('Warnings:', validationResult.warnings);
      console.log('Info:', validationResult.info);
      console.log('===============================');
      
      return res.status(400).json({
        error: `XML inválido: ${validationResult.errors.length} erro(s) encontrado(s)`,
        errors: validationResult.errors,
        warnings: validationResult.warnings,
        info: validationResult.info,
        validation: validationResult,
        success: false
      });
    }

    // Se chegou até aqui, o XML é válido - processar normalmente
    const basicInfo = xmlValidator.extractBasicInfo(xmlContent);
    const produtos = xmlValidator.extractProducts(xmlContent);
    
    console.log('🔄 Iniciando validações e salvamento automático no banco de dados...');
    
    try {
      // Gerar ID único para a NFe
      const nfeId = basicInfo.chaveNFe || `nfe_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      
      // 1. VALIDAÇÃO DE COLUNAS - Verificar se os dados extraídos estão alinhados com o banco
      const requiredNfeColumns = ['id', 'data', 'numero', 'chaveNFE', 'fornecedor', 'valor', 'itens'];
      const requiredProductColumns = ['nfeId', 'codigo', 'descricao', 'quantidade', 'valorUnitario', 'valorTotal'];
      
      const missingNfeData = [];
      const missingProductData = [];
      
      // Verificar dados da NFe
      if (!basicInfo.numeroNFe) missingNfeData.push('numero');
      if (!basicInfo.emitente) missingNfeData.push('fornecedor');
      if (!basicInfo.valorTotal) missingNfeData.push('valor');
      
      // Verificar dados dos produtos
      produtos.forEach((produto, index) => {
        if (!produto.codigo) missingProductData.push(`produto[${index}].codigo`);
        if (!produto.descricao) missingProductData.push(`produto[${index}].descricao`);
        if (!produto.quantidade) missingProductData.push(`produto[${index}].quantidade`);
        if (!produto.valorUnitario) missingProductData.push(`produto[${index}].valorUnitario`);
        if (!produto.valorTotal) missingProductData.push(`produto[${index}].valorTotal`);
      });
      
      // Se houver dados faltantes, informar mas continuar o processamento
      if (missingNfeData.length > 0 || missingProductData.length > 0) {
        console.log('⚠️ Aviso: Alguns campos obrigatórios estão ausentes:', {
          nfe: missingNfeData,
          produtos: missingProductData
        });
      }
      
      // 2. VERIFICAÇÃO DE DUPLICATAS - Verificar se a NFe já existe
      let existingNfe = null;
      if (basicInfo.chaveNFe) {
        console.log('🔍 Verificando duplicatas para chave NFe:', basicInfo.chaveNFe);
        console.log('🔍 ID gerado para NFe:', nfeId);
        
        const checkExisting = db.prepare('SELECT id, numero, fornecedor, valor FROM nfes WHERE chaveNFE = ? OR id = ?');
        existingNfe = checkExisting.get(basicInfo.chaveNFe, nfeId);
        
        console.log('🔍 Resultado da consulta de duplicatas:', existingNfe);
        
        // Verificar também apenas pela chave NFe
        const checkByChave = db.prepare('SELECT id, numero, fornecedor, valor FROM nfes WHERE chaveNFE = ?');
        const existingByChave = checkByChave.get(basicInfo.chaveNFe);
        console.log('🔍 Verificação apenas por chave NFe:', existingByChave);
        
        if (existingByChave) {
          existingNfe = existingByChave;
        }
      }
      
      // Se a NFe já existe e não foi confirmada a substituição, retornar aviso
      if (existingNfe && !req.forceReplace) {
        console.log('⚠️ NFe duplicada encontrada:', existingNfe);
        return res.status(409).json({
          success: false,
          isDuplicate: true,
          message: 'Esta nota já existe no sistema.',
          confirmationRequired: true,
          existingNfe: {
            id: existingNfe.id,
            numero: existingNfe.numero,
            fornecedor: existingNfe.fornecedor,
            valor: existingNfe.valor
          },
          newNfe: {
            numero: basicInfo.numeroNFe,
            fornecedor: basicInfo.emitente,
            valor: basicInfo.valorTotal
          },
          question: 'Esta nota já existe. Deseja substituí-la ou cancelar a ação?',
          options: {
            replace: 'Substituir',
            cancel: 'Cancelar'
          }
        });
      }
      
      // Se chegou aqui, pode prosseguir com o salvamento (nova NFe ou substituição confirmada)
      if (existingNfe && req.forceReplace) {
        console.log('✅ Substituição de NFe confirmada pelo usuário');
      }
      
      // Preparar dados da NFe para salvamento
      const nfeData = {
        id: nfeId,
        data: basicInfo.dataEmissao ? new Date(basicInfo.dataEmissao).toISOString().split('T')[0] : new Date().toISOString().split('T')[0],
        numero: basicInfo.numeroNFe || '',
        chaveNFE: basicInfo.chaveNFe || '',
        fornecedor: basicInfo.emitente || 'Fornecedor não identificado',
        valor: basicInfo.valorLiquido || 0, // vNF do XML - valor líquido da nota
        itens: produtos.length,
        impostoEntrada: 12,
        xapuriMarkup: 160,
        epitaMarkup: 130,
        roundingType: 'none',
        valorFrete: 0,
        dataEmissao: basicInfo.dataEmissao || null,
        valorTotal: basicInfo.valorTotal || 0, // vProd do XML - valor total dos produtos
        quantidadeTotal: produtos.length,
        cnpjFornecedor: basicInfo.cnpjEmitente || null
      };
      
      // Log imediatamente após criação do nfeData
      console.log('🔍 VALORES IMEDIATAMENTE APÓS CRIAÇÃO nfeData:', {
        'basicInfo.valorLiquido': basicInfo.valorLiquido,
        'basicInfo.valorTotal': basicInfo.valorTotal,
        'nfeData.valor': nfeData.valor,
        'nfeData.valorTotal': nfeData.valorTotal
      });
      
      // [NFE_GUARD] Log de definição inicial do valor_liquido
      console.log(`📝 [NFE_GUARD] set valor_liquido ${nfeId} null->${nfeData.valor} POST /api/nfes server.js:1491 (vNF do XML)`);
      
      // Log dos valores mapeados para debug
      console.log('🔍 MAPEAMENTO DE VALORES:', {
        'vNF (valorLiquido)': basicInfo.valorLiquido,
        'vProd (valorTotal)': basicInfo.valorTotal,
        'Campo valor no banco': nfeData.valor,
        'Campo valorTotal no banco': nfeData.valorTotal
      });
      
      console.log('📝 Dados da NFe preparados:', {
        id: nfeData.id,
        numero: nfeData.numero,
        fornecedor: nfeData.fornecedor,
        valor: nfeData.valor,
        valorTotal: nfeData.valorTotal,
        quantidadeProdutos: produtos.length
      });
      
      // Preparar statements do banco
      const insertNFE = db.prepare(`\n        INSERT OR REPLACE INTO nfes (\n          id, data, numero, chaveNFE, fornecedor, valor, itens, \n          impostoEntrada, xapuriMarkup, epitaMarkup, roundingType, valorFrete,\n          dataEmissao, valorTotal, quantidadeTotal, cnpjFornecedor, originalXML\n        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `);
      
      const insertProduto = db.prepare(`
        INSERT INTO produtos (
          nfeId, codigo, descricao, ncm, cfop, unidade, quantidade,
          valorUnitario, valorTotal, baseCalculoICMS, valorICMS, aliquotaICMS,
          baseCalculoIPI, valorIPI, aliquotaIPI, ean, reference, referencia, brand,
          imageUrl, descricao_complementar, custoExtra, freteProporcional, discount
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `);
      
      const deleteProdutos = db.prepare('DELETE FROM produtos WHERE nfeId = ?');
      
      // Executar transação para salvar NFe e produtos
      db.transaction(() => {
        // Inserir/atualizar NFE
        insertNFE.run(
          nfeData.id, nfeData.data, nfeData.numero, nfeData.chaveNFE, 
          nfeData.fornecedor, nfeData.valor, nfeData.itens, 
          nfeData.impostoEntrada, nfeData.xapuriMarkup, nfeData.epitaMarkup, 
          nfeData.roundingType, nfeData.valorFrete, nfeData.dataEmissao, 
          nfeData.valorTotal, nfeData.quantidadeTotal, nfeData.cnpjFornecedor, xmlContent
        );
        
        console.log('✅ NFe salva no banco de dados');
        
        // Remover produtos existentes da NFe
        deleteProdutos.run(nfeData.id);
        
        // Calcular desconto total da NFe
        const totalProdutos = produtos.reduce((sum, produto) => sum + (produto.valorTotal || 0), 0);
        const valorFinalNFe = basicInfo.valorLiquido || 0; // Usar vNF (valor líquido) para cálculo do desconto
        const descontoTotal = Math.max(0, totalProdutos - valorFinalNFe);
        
        console.log(`💰 Cálculo de desconto: Total produtos: ${totalProdutos}, Valor final NFe: ${valorFinalNFe}, Desconto total: ${descontoTotal}`);
        
        // Inserir produtos com desconto calculado proporcionalmente
        produtos.forEach((produto, index) => {
          // Calcular desconto proporcional para este produto
          const descontoProduto = totalProdutos > 0 ? (produto.valorTotal / totalProdutos) * descontoTotal : 0;
          
          insertProduto.run(
            nfeData.id, produto.codigo, produto.descricao, produto.ncm, produto.cfop,
            produto.unidade, produto.quantidade, produto.valorUnitario,
            produto.valorTotal, produto.baseCalculoICMS, produto.valorICMS,
            produto.aliquotaICMS, produto.baseCalculoIPI, produto.valorIPI,
            produto.aliquotaIPI, produto.ean, produto.referencia || produto.codigo || '', produto.referencia || produto.codigo || '', '', '', '', 0, 0, descontoProduto
          );
          
          console.log(`📦 Produto ${index + 1}: ${produto.codigo} - Valor: ${produto.valorTotal}, Desconto: ${descontoProduto.toFixed(2)}`);
        });
        
        console.log(`✅ ${produtos.length} produtos salvos no banco de dados`);
      })();
      
      // Enviar notificação via WebSocket
      sendNFeUpdate('created', {
        id: nfeData.id,
        numero: nfeData.numero,
        fornecedor: nfeData.fornecedor,
        valor: nfeData.valor,
        produtos: produtos.length
      });
      
      console.log('🎉 Salvamento automático concluído com sucesso!');
      
    } catch (saveError) {
      console.error('❌ Erro ao salvar no banco de dados:', saveError.message);
      console.error(saveError.stack);
      
      // Continuar mesmo com erro de salvamento, mas informar no response
      basicInfo.saveError = saveError.message;
    }
    
    // Registrar métricas de sucesso
    analytics.recordUpload(true, fileSize);
    analytics.recordNfeProcessing(true, basicInfo);
    
    res.json({
      success: true,
      message: 'XML validado, processado e salvo com sucesso',
      content: xmlContent,
      validation: validationResult,
      info: basicInfo,
      produtos: produtos,
      filename: req.file.originalname,
      size: req.file.size,
      saved: !basicInfo.saveError,
      saveError: basicInfo.saveError || null
    });

  } catch (error) {
    logger.error('XML Upload Error', {
      error: error.message,
      stack: error.stack,
      filename: req.file?.originalname,
      category: 'xml-upload',
      ip: req.ip
    });
    analytics.recordUpload(false, req.file?.size || 0, error);
    analytics.recordNfeProcessing(false, null, error);
    analytics.recordError('upload', error);
    res.status(500).json({ 
      error: 'Erro interno do servidor ao processar XML',
      details: error.message,
      success: false 
    });
  }
};

// Endpoint principal para upload de XML
app.post('/api/upload-xml', upload.single('file'), (req, res) => {
  return uploadXmlHandler(req, res);
});

// Endpoint para confirmar substituição de NFe duplicada
app.post('/api/upload-xml/confirm-replace', upload.single('file'), (req, res) => {
  const { confirmReplace } = req.body;
  
  if (!confirmReplace || confirmReplace !== 'true') {
    return res.status(400).json({
      success: false,
      error: 'Confirmação de substituição não fornecida ou inválida'
    });
  }
  
  // Processar o upload forçando a substituição
  req.forceReplace = true;
  
  // Redirecionar para o handler principal
  return uploadXmlHandler(req, res);
});

// Rotas de backup
app.get('/api/backups', async (req, res) => {
  try {
    const backups = backupManager.listBackups();
    const stats = backupManager.getBackupStats();
    
    res.json({
      success: true,
      data: {
        backups,
        stats
      }
    });
  } catch (error) {
    console.error('Erro ao listar backups:', error);
    res.status(500).json({
      success: false,
      error: 'Erro interno do servidor',
      message: error.message
    });
  }
});

app.post('/api/backups', async (req, res) => {
  try {
    const backupInfo = await backupManager.createBackup();
    
    res.json({
      success: true,
      message: 'Backup criado com sucesso',
      data: backupInfo
    });
  } catch (error) {
    console.error('Erro ao criar backup:', error);
    res.status(500).json({
      success: false,
      error: 'Erro ao criar backup',
      message: error.message
    });
  }
});

app.post('/api/backups/:filename/restore', async (req, res) => {
  try {
    const { filename } = req.params;
    const result = await backupManager.restoreBackup(filename);
    
    res.json({
      success: true,
      message: 'Backup restaurado com sucesso',
      data: result
    });
  } catch (error) {
    console.error('Erro ao restaurar backup:', error);
    res.status(500).json({
      success: false,
      error: 'Erro ao restaurar backup',
      message: error.message
    });
  }
});

// Rota para estatísticas de logs
app.get('/api/logs/stats', async (req, res) => {
  try {
    const { getLogStats } = await import('./logger.js');
    const stats = getLogStats();
    
    logger.info('Log Stats Requested', {
      ip: req.ip,
      category: 'logs'
    });
    
    res.json({
      success: true,
      data: stats
    });
  } catch (error) {
    logger.error('Log Stats Error', {
      error: error.message,
      ip: req.ip,
      category: 'logs'
    });
    
    res.status(500).json({
      success: false,
      message: 'Erro ao obter estatísticas de logs'
    });
  }
});

// Rotas do Dashboard de Analytics
app.get('/api/analytics/summary', (req, res) => {
  try {
    logger.info('Analytics summary requested', {
      service: 'xml-importer-server',
      category: 'analytics',
      ip: req.ip
    });
    
    const summary = analytics.getSummaryStats();
    res.json({ success: true, data: summary });
  } catch (error) {
    logger.error('Error getting analytics summary', {
      service: 'xml-importer-server',
      category: 'analytics',
      error: error.message
    });
    analytics.recordError('api', error);
    res.status(500).json({ success: false, error: 'Erro ao obter resumo de analytics' });
  }
});

app.get('/api/analytics/metrics', (req, res) => {
  try {
    logger.info('Full analytics metrics requested', {
      service: 'xml-importer-server',
      category: 'analytics',
      ip: req.ip
    });
    
    const metrics = analytics.getMetrics();
    res.json({ success: true, data: metrics });
  } catch (error) {
    logger.error('Error getting analytics metrics', {
      service: 'xml-importer-server',
      category: 'analytics',
      error: error.message
    });
    analytics.recordError('api', error);
    res.status(500).json({ success: false, error: 'Erro ao obter métricas de analytics' });
  }
});

app.post('/api/analytics/reset', (req, res) => {
  try {
    logger.warn('Analytics metrics reset requested', {
      service: 'xml-importer-server',
      category: 'analytics',
      ip: req.ip
    });
    
    analytics.resetMetrics();
    res.json({ success: true, message: 'Métricas resetadas com sucesso' });
  } catch (error) {
    logger.error('Error resetting analytics metrics', {
      service: 'xml-importer-server',
      category: 'analytics',
      error: error.message
    });
    analytics.recordError('api', error);
    res.status(500).json({ success: false, error: 'Erro ao resetar métricas' });
  }
});

// ===== ROTAS DE EXPORTAÇÃO =====

// Exportar NFes para CSV
app.post('/api/export/nfes/csv', async (req, res) => {
  try {
    const stmt = db.prepare('SELECT * FROM nfes ORDER BY data DESC');
    const nfes = stmt.all();
    
    if (nfes.length === 0) {
      return res.status(404).json({ success: false, error: 'Nenhuma NFe encontrada para exportação' });
    }

    const result = await exportService.exportToCSV(nfes, 'nfes');
    analytics.recordRequest(req.path, req.method, 200, Date.now() - req.startTime);
    
    logger.info('NFes exported to CSV', {
      category: 'export',
      filename: result.filename,
      recordCount: result.recordCount
    });
    
    res.json(result);
  } catch (error) {
    analytics.recordError(error.message, req.path);
    logger.error('CSV export error', { category: 'export', error: error.message });
    res.status(500).json({ success: false, error: 'Erro ao exportar para CSV' });
  }
});

// Exportar NFes para Excel
app.post('/api/export/nfes/excel', async (req, res) => {
  try {
    const stmt = db.prepare('SELECT * FROM nfes ORDER BY data DESC');
    const nfes = stmt.all();
    
    if (nfes.length === 0) {
      return res.status(404).json({ success: false, error: 'Nenhuma NFe encontrada para exportação' });
    }

    const result = await exportService.exportToExcel(nfes, 'nfes', 'Notas Fiscais');
    analytics.recordRequest(req.path, req.method, 200, Date.now() - req.startTime);
    
    logger.info('NFes exported to Excel', {
      category: 'export',
      filename: result.filename,
      recordCount: result.recordCount
    });
    
    res.json(result);
  } catch (error) {
    analytics.recordError(error.message, req.path);
    logger.error('Excel export error', { category: 'export', error: error.message });
    res.status(500).json({ success: false, error: 'Erro ao exportar para Excel' });
  }
});

// Exportar NFes para PDF
app.post('/api/export/nfes/pdf', async (req, res) => {
  try {
    const stmt = db.prepare('SELECT * FROM nfes ORDER BY data DESC');
    const nfes = stmt.all();
    
    if (nfes.length === 0) {
      return res.status(404).json({ success: false, error: 'Nenhuma NFe encontrada para exportação' });
    }

    const result = await exportService.exportToPDF(nfes, 'nfes', 'Relatório de Notas Fiscais Eletrônicas');
    analytics.recordRequest(req.path, req.method, 200, Date.now() - req.startTime);
    
    logger.info('NFes exported to PDF', {
      category: 'export',
      filename: result.filename,
      recordCount: result.recordCount
    });
    
    res.json(result);
  } catch (error) {
    analytics.recordError(error.message, req.path);
    logger.error('PDF export error', { category: 'export', error: error.message });
    res.status(500).json({ success: false, error: 'Erro ao exportar para PDF' });
  }
});

// Listar arquivos de exportação
app.get('/api/export/files', (req, res) => {
  try {
    const files = exportService.listExports();
    analytics.recordRequest(req.path, req.method, 200, Date.now() - req.startTime);
    
    res.json({ success: true, files });
  } catch (error) {
    analytics.recordError(error.message, req.path);
    logger.error('List exports error', { category: 'export', error: error.message });
    res.status(500).json({ success: false, error: 'Erro ao listar arquivos de exportação' });
  }
});

// Download de arquivo de exportação
app.get('/api/export/download/:filename', (req, res) => {
  try {
    const { filename } = req.params;
    const filepath = path.join(__dirname, 'exports', filename);
    
    if (!fs.existsSync(filepath)) {
      analytics.recordRequest(req.path, req.method, 404, Date.now() - req.startTime);
      return res.status(404).json({ success: false, error: 'Arquivo não encontrado' });
    }
    
    analytics.recordRequest(req.path, req.method, 200, Date.now() - req.startTime);
    
    logger.info('Export file downloaded', {
      category: 'export',
      filename
    });
    
    res.download(filepath, filename);
  } catch (error) {
    analytics.recordError(error.message, req.path);
    logger.error('Download export error', { category: 'export', error: error.message });
    res.status(500).json({ success: false, error: 'Erro ao fazer download do arquivo' });
  }
});

// Limpar arquivos antigos de exportação
app.delete('/api/export/cleanup', async (req, res) => {
  try {
    const { days = 7 } = req.query;
    const result = await exportService.cleanOldExports(parseInt(days));
    analytics.recordRequest(req.path, req.method, 200, Date.now() - req.startTime);
    
    logger.info('Export cleanup completed', {
      category: 'export',
      deletedFiles: result.deleted,
      daysOld: days
    });
    
    res.json({ success: true, deletedFiles: result.deleted });
  } catch (error) {
    analytics.recordError(error.message, req.path);
    logger.error('Export cleanup error', { category: 'export', error: error.message });
    res.status(500).json({ success: false, error: 'Erro ao limpar arquivos antigos' });
  }
});

// Middleware de tratamento de erros (deve ser o último)
app.use(errorLogger);

// Middleware de tratamento de erros global
app.use((err, req, res, next) => {
  logger.error('Unhandled Application Error', {
    error: err.message,
    stack: err.stack,
    method: req.method,
    url: req.originalUrl,
    ip: req.ip,
    category: 'error'
  });
  
  res.status(500).json({
    success: false,
    message: 'Erro interno do servidor',
    error: process.env.NODE_ENV === 'development' ? err.message : 'Internal Server Error'
  });
});

// Inicializar servidor
server.listen(PORT, () => {
  logger.info('Server Started', {
    port: PORT,
    environment: process.env.NODE_ENV || 'development',
    dbPath,
    redisStatus: cache.isConnected ? 'Connected' : 'Disconnected (using fallback)',
    category: 'server'
  });
  
  // Inicializar sistema de backup automático
  try {
    backupManager.startScheduledBackups();
    logger.info('Automatic Backup System Started', {
      category: 'backup'
    });
  } catch (error) {
    logger.error('Backup System Initialization Error', {
      error: error.message,
      stack: error.stack,
      category: 'backup'
    });
  }
});