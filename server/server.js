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
const PORT = process.env.PORT || 3010;

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
const RATE_LIMIT_MAX_REQUESTS = 100; // máximo de requests por janela

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
  origin: process.env.ALLOWED_ORIGINS?.split(',') || ['http://localhost:5173', 'http://localhost:3000', 'http://localhost:3002', 'http://localhost:3003', 'http://localhost:3004', 'http://localhost:3006', 'http://localhost:3007', 'http://localhost:3008'],
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
    
    res.json({
      ...nfe,
      produtos
    });
  } catch (error) {
    console.error('Erro ao buscar NFE:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

// Função de validação de entrada
const validateNFEData = (data) => {
  const errors = [];
  
  if (!data.id || typeof data.id !== 'string' || data.id.trim().length === 0) {
    errors.push('ID é obrigatório e deve ser uma string válida');
  }
  
  if (!data.fornecedor || typeof data.fornecedor !== 'string' || data.fornecedor.trim().length === 0) {
    errors.push('Fornecedor é obrigatório');
  }
  
  if (!data.numero || typeof data.numero !== 'string') {
    errors.push('Número da NFE é obrigatório');
  }
  
  if (data.valor !== undefined && (typeof data.valor !== 'number' || data.valor < 0)) {
    errors.push('Valor deve ser um número positivo');
  }
  
  if (data.itens !== undefined && (typeof data.itens !== 'number' || data.itens < 0)) {
    errors.push('Quantidade de itens deve ser um número positivo');
  }
  
  return errors;
};

// Função de sanitização
const sanitizeString = (str) => {
  if (typeof str !== 'string') return str;
  return str.trim().replace(/[<>"'&]/g, '');
};

// POST - Criar nova NFE
app.post('/api/nfes', (req, res) => {
  try {
    const { id, data, numero, chaveNFE, fornecedor, valor, itens, produtos, impostoEntrada, xapuriMarkup, epitaMarkup, roundingType, valorFrete } = req.body;
    
    // Validar dados de entrada
    const validationErrors = validateNFEData(req.body);
    if (validationErrors.length > 0) {
      return res.status(400).json({ 
        error: 'Dados inválidos', 
        details: validationErrors 
      });
    }
    
    // Sanitizar strings
    const sanitizedData = {
      id: sanitizeString(id),
      data: sanitizeString(data),
      numero: sanitizeString(numero),
      chaveNFE: sanitizeString(chaveNFE),
      fornecedor: sanitizeString(fornecedor),
      valor: parseFloat(valor) || 0,
      itens: parseInt(itens) || 0,
      impostoEntrada: parseFloat(impostoEntrada) || 12,
      xapuriMarkup: parseFloat(xapuriMarkup) || 160,
      epitaMarkup: parseFloat(epitaMarkup) || 130,
      roundingType: sanitizeString(roundingType) || 'none',
      valorFrete: parseFloat(valorFrete) || 0
    };
    
    const insertNFE = db.prepare(`
      INSERT OR REPLACE INTO nfes (
        id, data, numero, chaveNFE, fornecedor, valor, itens, 
        impostoEntrada, xapuriMarkup, epitaMarkup, roundingType, valorFrete
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);
    
    const insertProduto = db.prepare(`
      INSERT INTO produtos (
        nfeId, codigo, descricao, ncm, cfop, unidade, quantidade,
        valorUnitario, valorTotal, baseCalculoICMS, valorICMS, aliquotaICMS,
        baseCalculoIPI, valorIPI, aliquotaIPI, ean, reference, brand,
        imageUrl, descricao_complementar, custoExtra, freteProporcional
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);
    
    const deleteProdutos = db.prepare('DELETE FROM produtos WHERE nfeId = ?');
    
    db.transaction(() => {
      // Inserir/atualizar NFE
      insertNFE.run(
        sanitizedData.id, sanitizedData.data, sanitizedData.numero, 
        sanitizedData.chaveNFE, sanitizedData.fornecedor, sanitizedData.valor, 
        sanitizedData.itens, sanitizedData.impostoEntrada, sanitizedData.xapuriMarkup, 
        sanitizedData.epitaMarkup, sanitizedData.roundingType, sanitizedData.valorFrete
      );
      
      // Remover produtos antigos
      deleteProdutos.run(id);
      
      // Inserir novos produtos
      if (produtos && Array.isArray(produtos)) {
        produtos.forEach(produto => {
          // Validar e sanitizar dados do produto
          const sanitizedProduto = {
            codigo: sanitizeString(produto.codigo) || '',
            descricao: sanitizeString(produto.descricao) || '',
            ncm: sanitizeString(produto.ncm),
            cfop: sanitizeString(produto.cfop),
            unidade: sanitizeString(produto.unidade),
            quantidade: parseFloat(produto.quantidade) || 0,
            valorUnitario: parseFloat(produto.valorUnitario) || 0,
            valorTotal: parseFloat(produto.valorTotal) || 0,
            baseCalculoICMS: parseFloat(produto.baseCalculoICMS) || 0,
            valorICMS: parseFloat(produto.valorICMS) || 0,
            aliquotaICMS: parseFloat(produto.aliquotaICMS) || 0,
            baseCalculoIPI: parseFloat(produto.baseCalculoIPI) || 0,
            valorIPI: parseFloat(produto.valorIPI) || 0,
            aliquotaIPI: parseFloat(produto.aliquotaIPI) || 0,
            ean: sanitizeString(produto.ean),
            reference: sanitizeString(produto.reference),
            brand: sanitizeString(produto.brand),
            imageUrl: sanitizeString(produto.imageUrl),
            descricao_complementar: sanitizeString(produto.descricao_complementar),
            custoExtra: parseFloat(produto.custoExtra) || 0,
            freteProporcional: parseFloat(produto.freteProporcional) || 0
          };
          
          insertProduto.run(
            sanitizedData.id, sanitizedProduto.codigo, sanitizedProduto.descricao, 
            sanitizedProduto.ncm, sanitizedProduto.cfop, sanitizedProduto.unidade, 
            sanitizedProduto.quantidade, sanitizedProduto.valorUnitario, sanitizedProduto.valorTotal, 
            sanitizedProduto.baseCalculoICMS, sanitizedProduto.valorICMS, sanitizedProduto.aliquotaICMS,
            sanitizedProduto.baseCalculoIPI, sanitizedProduto.valorIPI, sanitizedProduto.aliquotaIPI, 
            sanitizedProduto.ean, sanitizedProduto.reference, sanitizedProduto.brand,
            sanitizedProduto.imageUrl, sanitizedProduto.descricao_complementar,
            sanitizedProduto.custoExtra, sanitizedProduto.freteProporcional
          );
        });
      }
    })();
    
    res.json({ message: 'NFE salva com sucesso', id });
  } catch (error) {
    console.error('Erro ao salvar NFE:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

// PUT - Atualizar NFE
app.put('/api/nfes/:id', (req, res) => {
  try {
    const { id } = req.params;
    const { fornecedor, impostoEntrada, xapuriMarkup, epitaMarkup, roundingType, valorFrete } = req.body;
    
    // Validar ID do parâmetro
    if (!id || typeof id !== 'string' || id.trim().length === 0) {
      return res.status(400).json({ error: 'ID inválido' });
    }
    
    // Validar dados de entrada
    const errors = [];
    if (fornecedor !== undefined && (typeof fornecedor !== 'string' || fornecedor.trim().length === 0)) {
      errors.push('Fornecedor deve ser uma string válida');
    }
    if (impostoEntrada !== undefined && (typeof impostoEntrada !== 'number' || impostoEntrada < 0)) {
      errors.push('Imposto de entrada deve ser um número positivo');
    }
    if (xapuriMarkup !== undefined && (typeof xapuriMarkup !== 'number' || xapuriMarkup < 0)) {
      errors.push('Markup Xapuri deve ser um número positivo');
    }
    if (epitaMarkup !== undefined && (typeof epitaMarkup !== 'number' || epitaMarkup < 0)) {
      errors.push('Markup Epita deve ser um número positivo');
    }
    if (valorFrete !== undefined && (typeof valorFrete !== 'number' || valorFrete < 0)) {
      errors.push('Valor do frete deve ser um número positivo');
    }
    
    if (errors.length > 0) {
      return res.status(400).json({ error: 'Dados inválidos', details: errors });
    }
    
    // Sanitizar dados
    const sanitizedData = {
      fornecedor: fornecedor ? sanitizeString(fornecedor) : undefined,
      impostoEntrada: impostoEntrada !== undefined ? parseFloat(impostoEntrada) : undefined,
      xapuriMarkup: xapuriMarkup !== undefined ? parseFloat(xapuriMarkup) : undefined,
      epitaMarkup: epitaMarkup !== undefined ? parseFloat(epitaMarkup) : undefined,
      roundingType: roundingType ? sanitizeString(roundingType) : undefined,
      valorFrete: valorFrete !== undefined ? parseFloat(valorFrete) : undefined
    };
    
    const updateStmt = db.prepare(`
      UPDATE nfes SET 
        fornecedor = ?, impostoEntrada = ?, xapuriMarkup = ?, 
        epitaMarkup = ?, roundingType = ?, valorFrete = ?, 
        updatedAt = CURRENT_TIMESTAMP
      WHERE id = ?
    `);
    
    const result = updateStmt.run(
      sanitizedData.fornecedor, sanitizedData.impostoEntrada, sanitizedData.xapuriMarkup, 
      sanitizedData.epitaMarkup, sanitizedData.roundingType, sanitizedData.valorFrete, 
      sanitizeString(id)
    );
    
    if (result.changes === 0) {
      return res.status(404).json({ error: 'NFE não encontrada' });
    }
    
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
    
    // Validar ID
    if (!id || typeof id !== 'string' || id.trim().length === 0) {
      return res.status(400).json({ error: 'ID inválido' });
    }
    
    const sanitizedId = sanitizeString(id);
    const deleteStmt = db.prepare('DELETE FROM nfes WHERE id = ?');
    const result = deleteStmt.run(sanitizedId);
    
    if (result.changes === 0) {
      return res.status(404).json({ error: 'NFE não encontrada' });
    }
    
    res.json({ message: 'NFE excluída com sucesso' });
  } catch (error) {
    console.error('Erro ao excluir NFE:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

// POST - Upload de arquivo XML
app.post('/api/upload-xml', upload.single('xml'), (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'Nenhum arquivo enviado' });
    }
    
    // Validar tipo de arquivo
    const allowedMimeTypes = ['text/xml', 'application/xml', 'text/plain'];
    if (!allowedMimeTypes.includes(req.file.mimetype)) {
      return res.status(400).json({ 
        error: 'Tipo de arquivo inválido. Apenas arquivos XML são permitidos.' 
      });
    }
    
    // Validar tamanho do arquivo (já limitado pelo multer, mas verificação adicional)
    if (req.file.size > 10 * 1024 * 1024) {
      return res.status(400).json({ 
        error: 'Arquivo muito grande. Tamanho máximo: 10MB' 
      });
    }
    
    const xmlContent = req.file.buffer.toString('utf-8');
    
    // Validação básica de XML
    if (!xmlContent.trim().startsWith('<?xml') && !xmlContent.trim().startsWith('<')) {
      return res.status(400).json({ 
        error: 'Conteúdo do arquivo não parece ser XML válido' 
      });
    }
    
    // Aqui você pode adicionar a lógica de parsing do XML
    // Por enquanto, apenas retornamos o conteúdo
    res.json({ 
      message: 'Arquivo recebido com sucesso',
      filename: req.file.originalname,
      size: req.file.size,
      content: xmlContent.substring(0, 500) + '...' // Primeiros 500 caracteres
    });
  } catch (error) {
    console.error('Erro no upload:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

// GET - Status do servidor
app.get('/api/status', (req, res) => {
  res.json({ 
    status: 'online',
    timestamp: new Date().toISOString(),
    database: 'connected'
  });
});

// Middleware de tratamento de erros
app.use((err, req, res, next) => {
  // Log do erro com informações de contexto
  const errorInfo = {
    timestamp: new Date().toISOString(),
    method: req.method,
    url: req.url,
    ip: req.ip || req.connection.remoteAddress,
    userAgent: req.get('User-Agent'),
    error: err.message,
    stack: process.env.NODE_ENV === 'development' ? err.stack : undefined
  };
  
  console.error('Error occurred:', JSON.stringify(errorInfo, null, 2));
  
  // Resposta baseada no tipo de erro
  if (err.code === 'LIMIT_FILE_SIZE') {
    return res.status(400).json({ 
      error: 'Arquivo muito grande. Tamanho máximo permitido: 10MB' 
    });
  }
  
  if (err.code === 'LIMIT_UNEXPECTED_FILE') {
    return res.status(400).json({ 
      error: 'Tipo de arquivo não permitido' 
    });
  }
  
  if (err.message.includes('Apenas arquivos XML são permitidos')) {
    return res.status(400).json({ 
      error: 'Apenas arquivos XML são permitidos' 
    });
  }
  
  // Erro genérico (não expor detalhes em produção)
  const message = process.env.NODE_ENV === 'development' 
    ? err.message 
    : 'Erro interno do servidor';
    
  res.status(500).json({ error: message });
});

// Iniciar servidor
app.listen(PORT, '0.0.0.0', () => {
  console.log(`🚀 Servidor rodando na porta ${PORT}`);
  console.log(`📊 Banco de dados: ${path.join(__dirname, 'database.sqlite')}`);
  console.log(`🌐 Acesse: http://localhost:${PORT}`);
  console.log(`📋 API Status: http://localhost:${PORT}/api/status`);
});

// Graceful shutdown
process.on('SIGINT', () => {
  console.log('\n🛑 Encerrando servidor...');
  db.close();
  process.exit(0);
});