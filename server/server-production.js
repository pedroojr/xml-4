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
const PORT = process.env.PORT || 3001;

// Middleware de segurança para produção
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com"],
      fontSrc: ["'self'", "https://fonts.gstatic.com"],
      imgSrc: ["'self'", "data:", "https:"],
      scriptSrc: ["'self'"],
      connectSrc: ["'self'", "https://xml.lojasrealce.shop"],
    },
  },
  crossOriginEmbedderPolicy: false,
}));

// CORS configurado para produção
app.use(cors({
  origin: process.env.ALLOWED_ORIGINS?.split(',') || [
    'https://seu-dominio.com',
    'https://www.seu-dominio.com',
    'http://localhost:5173'
  ],
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));

app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// Helpers para sanitização de entrada
const toNumber = (val) => {
  if (val === null || val === undefined) return 0;
  if (typeof val === 'number' && Number.isFinite(val)) return val;
  const str = String(val).replace(/[^\d,.-]/g, '').replace(',', '.');
  const n = parseFloat(str);
  return Number.isFinite(n) ? n : 0;
};
const toText = (val, fallback = '') => {
  if (val === null || val === undefined) return fallback;
  const s = String(val);
  return s.length ? s : fallback;
};

// Configuração do upload
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 10 * 1024 * 1024 // 10MB
  },
  fileFilter: (req, file, cb) => {
    // Aceitar arquivos XML independente do nome do campo
    if (file.mimetype === 'text/xml' || file.mimetype === 'application/xml' || file.originalname.endsWith('.xml')) {
      cb(null, true);
    } else {
      cb(new Error('Apenas arquivos XML são permitidos'), false);
    }
  }
});

// Inicializar banco de dados
const dbPath = process.env.DB_PATH || path.join(__dirname, 'database.sqlite');
const db = new Database(dbPath, { verbose: console.log });

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

  // Índices para melhor performance
  db.exec(`
    CREATE INDEX IF NOT EXISTS idx_nfes_fornecedor ON nfes(fornecedor);
    CREATE INDEX IF NOT EXISTS idx_nfes_data ON nfes(data);
    CREATE INDEX IF NOT EXISTS idx_produtos_nfeId ON produtos(nfeId);
    CREATE INDEX IF NOT EXISTS idx_produtos_codigo ON produtos(codigo);
  `);

  // Migração: adicionar coluna discount se não existir
  try {
    db.exec('ALTER TABLE produtos ADD COLUMN discount REAL DEFAULT 0');
  } catch (e) { /* Coluna já existe */ }
  // Garantir que valores nulos de discount virem 0
  try {
    db.exec('UPDATE produtos SET discount = COALESCE(discount, 0)');
  } catch (e) { /* Tabela pode não existir ainda em alguns ambientes */ }
  // Migração: adicionar coluna custoExtra se não existir
  try {
    db.exec('ALTER TABLE produtos ADD COLUMN custoExtra REAL DEFAULT 0');
  } catch (e) { /* Coluna já existe */ }
  // Migração: adicionar coluna freteProporcional se não existir
  try {
    db.exec('ALTER TABLE produtos ADD COLUMN freteProporcional REAL DEFAULT 0');
  } catch (e) { /* Coluna já existe */ }
};

initDatabase();

// Middleware de logging para produção
app.use((req, res, next) => {
  console.log(`${new Date().toISOString()} - ${req.method} ${req.path} - ${req.ip}`);
  next();
});

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
    const produtosStmt = db.prepare('SELECT p.*, COALESCE(p.discount, 0) AS discount FROM produtos p WHERE p.nfeId = ?');
    const produtos = produtosStmt.all(id);
    const produtosNormalized = Array.isArray(produtos) ? produtos.map(p => ({
      ...p,
      discount: toNumber(p.discount)
    })) : [];
    
    res.json({
      ...nfe,
      produtos: produtosNormalized
    });
  } catch (error) {
    console.error('Erro ao buscar NFE:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

// POST - Criar nova NFE
app.post('/api/nfes', (req, res) => {
  try {
    const { id, data, numero, chaveNFE, fornecedor, valor, itens, produtos, impostoEntrada, xapuriMarkup, epitaMarkup, roundingType, valorFrete, hiddenItems, showHidden } = req.body || {};

    if (!id || !data || !numero || !fornecedor) {
      return res.status(400).json({ error: 'Campos obrigatórios ausentes (id, data, numero, fornecedor)' });
    }

    // Sanitiza produtos
    const safeProdutos = Array.isArray(produtos) ? produtos.map(p => ({
      codigo: toText(p?.codigo, ''),
      descricao: toText(p?.descricao, ''),
      ncm: toText(p?.ncm, ''),
      cfop: toText(p?.cfop, ''),
      unidade: toText(p?.unidade, ''),
      quantidade: toNumber(p?.quantidade),
      valorUnitario: toNumber(p?.valorUnitario ?? p?.unitPrice),
      valorTotal: toNumber(p?.valorTotal ?? p?.totalPrice),
      discount: toNumber(p?.discount),
      baseCalculoICMS: toNumber(p?.baseCalculoICMS),
      valorICMS: toNumber(p?.valorICMS),
      aliquotaICMS: toNumber(p?.aliquotaICMS),
      baseCalculoIPI: toNumber(p?.baseCalculoIPI),
      valorIPI: toNumber(p?.valorIPI),
      aliquotaIPI: toNumber(p?.aliquotaIPI),
      ean: toText(p?.ean, ''),
      reference: toText(p?.reference, ''),
      brand: toText(p?.brand, ''),
      imageUrl: toText(p?.imageUrl, ''),
      descricao_complementar: toText(p?.descricao_complementar, ''),
      custoExtra: toNumber(p?.custoExtra),
      freteProporcional: toNumber(p?.freteProporcional),
    })) : [];

    const safeValor = toNumber(valor);
    const safeItens = toNumber(itens);
    
    const insertNFE = db.prepare(`
      INSERT OR REPLACE INTO nfes (
        id, data, numero, chaveNFE, fornecedor, valor, itens, 
        impostoEntrada, xapuriMarkup, epitaMarkup, roundingType, valorFrete,
        hiddenItems, showHidden
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);
    
    // Preparação dinâmica para inserção em 'produtos' conforme colunas existentes
    const tableCols = db.prepare('PRAGMA table_info(produtos)').all().map(c => c.name);
    const desiredCols = [
      'nfeId','codigo','descricao','ncm','cfop','unidade','quantidade',
      'valorUnitario','valorTotal','discount','baseCalculoICMS','valorICMS','aliquotaICMS',
      'baseCalculoIPI','valorIPI','aliquotaIPI','ean','reference','brand',
      'imageUrl','descricao_complementar','custoExtra','freteProporcional'
    ];
    const cols = desiredCols.filter(c => tableCols.includes(c));
    const placeholders = cols.map(() => '?').join(', ');
    const insertProduto = db.prepare(`INSERT INTO produtos (${cols.join(', ')}) VALUES (${placeholders})`);
    
    const deleteProdutos = db.prepare('DELETE FROM produtos WHERE nfeId = ?');
    
    db.transaction(() => {
      // Inserir/atualizar NFE
      insertNFE.run(
        id, data, numero, chaveNFE ?? null, fornecedor, safeValor, safeItens,
        impostoEntrada || 12, xapuriMarkup || 160, epitaMarkup || 130,
        roundingType || 'none', valorFrete || 0,
        JSON.stringify(hiddenItems || []), showHidden ? 1 : 0
      );
      
      // Remover produtos antigos
      deleteProdutos.run(id);
      
      // Inserir novos produtos
      if (safeProdutos && Array.isArray(safeProdutos)) {
        safeProdutos.forEach(produto => {
          const values = cols.map(col => {
            switch (col) {
              case 'nfeId': return id;
              case 'codigo': return produto.codigo;
              case 'descricao': return produto.descricao;
              case 'ncm': return produto.ncm;
              case 'cfop': return produto.cfop;
              case 'unidade': return produto.unidade;
              case 'quantidade': return produto.quantidade;
              case 'valorUnitario': return produto.valorUnitario;
              case 'valorTotal': return produto.valorTotal;
              case 'discount': return produto.discount || 0;
              case 'baseCalculoICMS': return produto.baseCalculoICMS;
              case 'valorICMS': return produto.valorICMS;
              case 'aliquotaICMS': return produto.aliquotaICMS;
              case 'baseCalculoIPI': return produto.baseCalculoIPI;
              case 'valorIPI': return produto.valorIPI;
              case 'aliquotaIPI': return produto.aliquotaIPI;
              case 'ean': return produto.ean;
              case 'reference': return produto.reference;
              case 'brand': return produto.brand;
              case 'imageUrl': return produto.imageUrl;
              case 'descricao_complementar': return produto.descricao_complementar;
              case 'custoExtra': return produto.custoExtra || 0;
              case 'freteProporcional': return produto.freteProporcional || 0;
              default: return null;
            }
          });
          insertProduto.run(...values);
        });
      }
    })();
    
    res.json({ message: 'NFE salva com sucesso', id });
  } catch (error) {
    console.error('Erro ao salvar NFE:', error?.message || error);
    res.status(500).json({ error: 'Erro interno do servidor', details: String(error?.message || error) });
  }
});

// PUT - Atualizar NFE
app.put('/api/nfes/:id', (req, res) => {
  try {
    const { id } = req.params;
    const { fornecedor, impostoEntrada, xapuriMarkup, epitaMarkup, roundingType, valorFrete, hiddenItems, showHidden } = req.body || {};
    
    const updateStmt = db.prepare(`
      UPDATE nfes SET 
        fornecedor = COALESCE(?, fornecedor),
        impostoEntrada = COALESCE(?, impostoEntrada),
        xapuriMarkup = COALESCE(?, xapuriMarkup), 
        epitaMarkup = COALESCE(?, epitaMarkup),
        roundingType = COALESCE(?, roundingType),
        valorFrete = COALESCE(?, valorFrete),
        hiddenItems = COALESCE(?, hiddenItems),
        showHidden = COALESCE(?, showHidden),
        updatedAt = CURRENT_TIMESTAMP
      WHERE id = ?
    `);
    
    const result = updateStmt.run(
      fornecedor ?? null,
      impostoEntrada ?? null,
      xapuriMarkup ?? null,
      epitaMarkup ?? null,
      roundingType ?? null,
      valorFrete ?? null,
      JSON.stringify(hiddenItems ?? null),
      showHidden !== undefined ? (showHidden ? 1 : 0) : null,
      id
    );
    
    if (result.changes === 0) {
      return res.status(404).json({ error: 'NFE não encontrada' });
    }
    
    res.json({ message: 'NFE atualizada com sucesso' });
  } catch (error) {
    console.error('Erro ao atualizar NFE:', error?.message || error);
    res.status(500).json({ error: 'Erro interno do servidor', details: String(error?.message || error) });
  }
});

// DELETE - Excluir NFE
app.delete('/api/nfes/:id', (req, res) => {
  try {
    const { id } = req.params;
    
    const deleteStmt = db.prepare('DELETE FROM nfes WHERE id = ?');
    const result = deleteStmt.run(id);
    
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
app.post('/api/upload-xml', upload.any(), (req, res) => {
  try {
    if (!req.files || req.files.length === 0) {
      return res.status(400).json({ error: 'Nenhum arquivo enviado' });
    }
    
    // Pegar o primeiro arquivo XML enviado
    const xmlFile = req.files[0];
    const xmlContent = xmlFile.buffer.toString('utf-8');
    
    // Aqui você pode adicionar a lógica de parsing do XML
    // Por enquanto, apenas retornamos o conteúdo
    res.json({ 
      message: 'Arquivo recebido com sucesso',
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
    database: 'connected',
    environment: 'production'
  });
});

// Middleware de tratamento de erros
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ error: 'Algo deu errado!' });
});

// Iniciar servidor
app.listen(PORT, '0.0.0.0', () => {
  console.log(`🚀 Servidor de produção rodando na porta ${PORT}`);
  console.log(`📊 Banco de dados: ${dbPath}`);
  console.log(`🌐 Ambiente: Produção`);
  console.log(`📋 API Status: http://localhost:${PORT}/api/status`);
});

// Graceful shutdown
process.on('SIGINT', () => {
  console.log('\n🛑 Encerrando servidor...');
  db.close();
  process.exit(0);
});
