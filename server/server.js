import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import Database from 'better-sqlite3';
import path from 'path';
import { fileURLToPath } from 'url';
import multer from 'multer';
import dotenv from 'dotenv';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
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
const RATE_LIMIT_WINDOW = 15 * 60 * 1000; // 15 minutos
const RATE_LIMIT_MAX_REQUESTS = 1000; // máximo de requests por janela

app.use((req, res, next) => {
  const clientIp = req.ip || req.connection.remoteAddress;
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
        return res.status(429).json({ 
          error: 'Muitas requisições. Tente novamente em alguns minutos.' 
        });
      }
    }
  }
  
  next();
});

app.use(cors({
  origin: process.env.ALLOWED_ORIGINS?.split(',') || ['http://localhost:5173', 'http://localhost:3000', 'http://localhost:3002', 'http://localhost:3003', 'http://localhost:3004', 'http://localhost:3006', 'http://localhost:3007', 'http://localhost:3008', 'http://localhost:3012', 'http://localhost:3013', 'http://localhost:3014', 'http://localhost:3015', 'http://localhost:3018'],
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
    // Validar extensão do arquivo
    const allowedExtensions = ['.xml', '.txt'];
    const fileExtension = path.extname(file.originalname).toLowerCase();
    
    if (allowedExtensions.includes(fileExtension)) {
      cb(null, true);
    } else {
      cb(new Error('Apenas arquivos XML são permitidos'), false);
    }
  }
});

// Inicializar banco de dados
const dbPath = process.env.DB_PATH || path.join(__dirname, 'database.sqlite');
const db = new Database(dbPath, { 
  verbose: process.env.NODE_ENV === 'development' ? console.log : null,
  fileMustExist: false
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
      createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
      updatedAt DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);

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

  // Índices para melhor performance
  db.exec(`
    CREATE INDEX IF NOT EXISTS idx_nfes_fornecedor ON nfes(fornecedor);
    CREATE INDEX IF NOT EXISTS idx_nfes_data ON nfes(data);
    CREATE INDEX IF NOT EXISTS idx_produtos_nfeId ON produtos(nfeId);
    CREATE INDEX IF NOT EXISTS idx_produtos_codigo ON produtos(codigo);
  `);
};

initDatabase();

// Rotas da API

// GET - Listar todas as NFEs
app.get('/api/nfes', (req, res) => {
  try {
    const stmt = db.prepare(`
      SELECT 
        n.*,
        COUNT(p.id) as produtosCount,
        SUM(p.valorTotal) as valorTotal
      FROM nfes n
      LEFT JOIN produtos p ON n.id = p.nfeId
      GROUP BY n.id
      ORDER BY n.createdAt DESC
    `);
    const nfes = stmt.all();
    res.json(nfes);
  } catch (error) {
    console.error('Erro ao buscar NFEs:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

// GET - Buscar NFE por ID
app.get('/api/nfes/:id', (req, res) => {
  try {
    const { id } = req.params;
    
    // Buscar NFE
    const nfeStmt = db.prepare('SELECT * FROM nfes WHERE id = ?');
    const nfe = nfeStmt.get(id);
    
    if (!nfe) {
      return res.status(404).json({ error: 'NFE não encontrada' });
    }
    
    // Buscar produtos da NFE
    const produtosStmt = db.prepare('SELECT * FROM produtos WHERE nfeId = ?');
    const produtos = produtosStmt.all(id);
    
    // Adicionar produtos à NFE
    nfe.produtos = produtos;
    
    res.json(nfe);
  } catch (error) {
    console.error('Erro ao buscar NFE:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

// POST - Criar nova NFE
app.post('/api/nfes', (req, res) => {
  try {
    const { id, data, numero, chaveNFE, fornecedor, valor, itens, produtos } = req.body;
    
    // Validar dados obrigatórios
    if (!id || !data || !numero || !fornecedor || !valor || !itens) {
      return res.status(400).json({ error: 'Dados obrigatórios não fornecidos' });
    }
    
    // Inserir NFE
    const insertNFE = db.prepare(`
      INSERT INTO nfes (id, data, numero, chaveNFE, fornecedor, valor, itens)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `);
    
    insertNFE.run(id, data, numero, chaveNFE, fornecedor, valor, itens);
    
    // Inserir produtos
    if (Array.isArray(produtos) && produtos.length > 0) {
      const insertProduto = db.prepare(`
        INSERT INTO produtos (
          nfeId, codigo, descricao, ncm, cfop, unidade,
          quantidade, valorUnitario, valorTotal,
          baseCalculoICMS, valorICMS, aliquotaICMS,
          baseCalculoIPI, valorIPI, aliquotaIPI,
          ean, reference, brand, imageUrl, descricao_complementar
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `);
      
      produtos.forEach(produto => {
        insertProduto.run(
          id,
          produto.codigo,
          produto.descricao,
          produto.ncm,
          produto.cfop,
          produto.unidade,
          produto.quantidade,
          produto.valorUnitario,
          produto.valorTotal,
          produto.baseCalculoICMS,
          produto.valorICMS,
          produto.aliquotaICMS,
          produto.baseCalculoIPI,
          produto.valorIPI,
          produto.aliquotaIPI,
          produto.ean,
          produto.reference,
          produto.brand,
          produto.imageUrl,
          produto.descricao_complementar
        );
      });
    }
    
    res.status(201).json({ message: 'NFE criada com sucesso', id });
  } catch (error) {
    console.error('Erro ao criar NFE:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

// PUT - Atualizar NFE
app.put('/api/nfes/:id', (req, res) => {
  try {
    const { id } = req.params;
    const { data, numero, chaveNFE, fornecedor, valor, itens } = req.body;
    
    // Verificar se NFE existe
    const nfeStmt = db.prepare('SELECT id FROM nfes WHERE id = ?');
    const nfe = nfeStmt.get(id);
    
    if (!nfe) {
      return res.status(404).json({ error: 'NFE não encontrada' });
    }
    
    // Atualizar NFE
    const updateNFE = db.prepare(`
      UPDATE nfes
      SET data = ?, numero = ?, chaveNFE = ?, fornecedor = ?, valor = ?, itens = ?, updatedAt = CURRENT_TIMESTAMP
      WHERE id = ?
    `);
    
    updateNFE.run(data, numero, chaveNFE, fornecedor, valor, itens, id);
    
    res.json({ message: 'NFE atualizada com sucesso' });
  } catch (error) {
    console.error('Erro ao atualizar NFE:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

// DELETE - Excluir NFE
app.delete('/api/nfes/:id', (req, res) => {
  try {
    const { id } = req.params;
    
    // Verificar se NFE existe
    const nfeStmt = db.prepare('SELECT id FROM nfes WHERE id = ?');
    const nfe = nfeStmt.get(id);
    
    if (!nfe) {
      return res.status(404).json({ error: 'NFE não encontrada' });
    }
    
    // Excluir NFE (produtos serão excluídos automaticamente devido à constraint ON DELETE CASCADE)
    const deleteNFE = db.prepare('DELETE FROM nfes WHERE id = ?');
    deleteNFE.run(id);
    
    res.json({ message: 'NFE excluída com sucesso' });
  } catch (error) {
    console.error('Erro ao excluir NFE:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

// Rota de status
app.get('/status', (req, res) => {
  res.json({ status: 'ok' });
});

// Rota de status da API
app.get('/api/status', (req, res) => {
  res.json({ status: 'ok' });
});

// Iniciar servidor
app.listen(PORT, () => {
  console.log(`Servidor rodando na porta ${PORT}`);
  console.log(`Banco de dados: ${dbPath}`);
});