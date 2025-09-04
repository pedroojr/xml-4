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
const PORT = process.env.PORT || 4005;

// Middleware
app.use(helmet());
app.use(cors({
  origin: process.env.ALLOWED_ORIGINS?.split(',') || ['http://localhost:4000'],
  credentials: true
}));
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// Configuração do upload
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 10 * 1024 * 1024 // 10MB
  }
});

// Inicializar banco de dados
const DB_PATH = process.env.DB_PATH || path.join(__dirname, 'database.sqlite');
if (process.env.DEBUG_DB === 'true') {
  console.log('DB_OPEN', DB_PATH);
}
const db = new Database(DB_PATH, { verbose: process.env.DEBUG_DB === 'true' ? console.log : undefined });

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
      hiddenItems TEXT DEFAULT '[]',
      showHidden BOOLEAN DEFAULT 0,
      isFavorite BOOLEAN DEFAULT 0,
      createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
      updatedAt DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);
  
  // Adicionar colunas se não existirem (para bancos existentes)
  try {
    db.exec(`ALTER TABLE nfes ADD COLUMN hiddenItems TEXT DEFAULT '[]'`);
  } catch (e) {
    // Coluna já existe
  }
  try {
    db.exec(`ALTER TABLE nfes ADD COLUMN showHidden BOOLEAN DEFAULT 0`);
  } catch (e) {
    // Coluna já existe
  }

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

// Logar colunas reais da tabela nfes em runtime para auditoria
if (process.env.DEBUG_DB === 'true') {
  try {
    const cols = db.prepare('PRAGMA table_info(nfes)').all();
    console.log('NFES_COLUMNS', cols);
  } catch (e) {
    console.error('NFES_COLUMNS_ERROR', e?.message || e);
  }
}

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
    const rows = stmt.all();

    const nfes = rows.map((row) => {
      let hiddenItems = [];
      try {
        hiddenItems = row.hiddenItems ? JSON.parse(row.hiddenItems) : [];
      } catch (e) {
        hiddenItems = [];
      }
      return {
        id: row.id,
        date: row.data,
        number: row.numero,
        nfeKey: row.chaveNFE,
        supplier: row.fornecedor,
        value: row.valor,
        items: row.itens,
        entryTax: row.impostoEntrada,
        xapuriMarkup: row.xapuriMarkup,
        epitaMarkup: row.epitaMarkup,
        roundingType: row.roundingType,
        freightValue: row.valorFrete,
        hiddenItems,
        showHidden: Boolean(row.showHidden),
        createdAt: row.createdAt,
        updatedAt: row.updatedAt
      };
    });

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
    const nfeRow = nfeStmt.get(id);
    
    if (!nfeRow) {
      return res.status(404).json({ error: 'NFE não encontrada' });
    }
    
    // Buscar produtos da NFE
    const produtosStmt = db.prepare('SELECT * FROM produtos WHERE nfeId = ?');
    const produtosRows = produtosStmt.all(id);
    
    // Parse do hiddenItems de JSON string para array
    let hiddenItems = [];
    try {
      hiddenItems = nfeRow.hiddenItems ? JSON.parse(nfeRow.hiddenItems) : [];
    } catch (e) {
      hiddenItems = [];
    }
    
    const produtos = produtosRows.map((p) => ({
      id: p.id,
      code: p.codigo,
      description: p.descricao,
      ncm: p.ncm,
      cfop: p.cfop,
      unit: p.unidade,
      quantity: p.quantidade,
      unitPrice: p.valorUnitario,
      totalPrice: p.valorTotal,
      icmsBase: p.baseCalculoICMS,
      icmsValue: p.valorICMS,
      icmsRate: p.aliquotaICMS,
      ipiBase: p.baseCalculoIPI,
      ipiValue: p.valorIPI,
      ipiRate: p.aliquotaIPI,
      ean: p.ean,
      reference: p.reference,
      brand: p.brand,
      imageUrl: p.imageUrl,
      additionalDescription: p.descricao_complementar,
      extraCost: p.custoExtra,
      freightShare: p.freteProporcional
    }));

    const nfe = {
      id: nfeRow.id,
      date: nfeRow.data,
      number: nfeRow.numero,
      nfeKey: nfeRow.chaveNFE,
      supplier: nfeRow.fornecedor,
      value: nfeRow.valor,
      items: nfeRow.itens,
      entryTax: nfeRow.impostoEntrada,
      xapuriMarkup: nfeRow.xapuriMarkup,
      epitaMarkup: nfeRow.epitaMarkup,
      roundingType: nfeRow.roundingType,
      freightValue: nfeRow.valorFrete,
      hiddenItems,
      showHidden: Boolean(nfeRow.showHidden),
      products: produtos,
      createdAt: nfeRow.createdAt,
      updatedAt: nfeRow.updatedAt
    };

    res.json(nfe);
  } catch (error) {
    console.error('Erro ao buscar NFE:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

// POST - Criar nova NFE
app.post('/api/nfes', (req, res) => {
  try {
    const { id, date, number, nfeKey, supplier, value, items, products, entryTax, xapuriMarkup, epitaMarkup, roundingType, freightValue, hiddenItems, showHidden } = req.body;
    
    const insertNFE = db.prepare(`
      INSERT OR REPLACE INTO nfes (
        id, data, numero, chaveNFE, fornecedor, valor, itens,
        impostoEntrada, xapuriMarkup, epitaMarkup, roundingType, valorFrete,
        hiddenItems, showHidden
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
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
        id, date, number, nfeKey, supplier, value, items,
        entryTax || 12, xapuriMarkup || 160, epitaMarkup || 130,
        roundingType || 'none', freightValue || 0,
        JSON.stringify(hiddenItems || []), showHidden || 0
      );
      
      // Remover produtos antigos
      deleteProdutos.run(id);
      
      // Inserir novos produtos
      if (products && Array.isArray(products)) {
        products.forEach(produto => {
          insertProduto.run(
            id, produto.code, produto.description, produto.ncm, produto.cfop,
            produto.unit, produto.quantity, produto.unitPrice,
            produto.totalPrice, produto.icmsBase, produto.icmsValue,
            produto.icmsRate, produto.ipiBase, produto.ipiValue,
            produto.ipiRate, produto.ean, produto.reference, produto.brand,
            produto.imageUrl, produto.additionalDescription,
            produto.extraCost || 0, produto.freightShare || 0
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
    const { supplier, entryTax, xapuriMarkup, epitaMarkup, roundingType, freightValue, hiddenItems, showHidden } = req.body;
    
    // Buscar estado atual para preservar hiddenItems/showHidden em updates parciais
    const current = db.prepare('SELECT hiddenItems, showHidden FROM nfes WHERE id = ?').get(id);
    const currentHidden = (() => { try { return current?.hiddenItems ? JSON.parse(current.hiddenItems) : []; } catch { return []; } })();
    const nextHidden = hiddenItems !== undefined ? hiddenItems : currentHidden;
    const nextShowHidden = showHidden !== undefined ? (showHidden ? 1 : 0) : (current?.showHidden ?? 0);

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
      supplier ?? null,
      entryTax ?? null,
      xapuriMarkup ?? null,
      epitaMarkup ?? null,
      roundingType ?? null,
      freightValue ?? null,
      JSON.stringify(nextHidden),
      nextShowHidden,
      id
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
app.post('/api/upload-xml', upload.single('xml'), (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'Nenhum arquivo enviado' });
    }
    
    const xmlContent = req.file.buffer.toString('utf-8');
    
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
    database: 'connected'
  });
});

// Endpoint de diagnóstico: expõe DB_OPEN e colunas de nfes
if (process.env.DEBUG_DB === 'true') {
  app.get('/api/_debug/db', (req, res) => {
    try {
      const cols = db.prepare('PRAGMA table_info(nfes)').all();
      res.json({ DB_OPEN: DB_PATH, NFES_COLUMNS: cols });
    } catch (e) {
      res.status(500).json({ DB_OPEN: DB_PATH, error: e?.message || String(e) });
    }
  });
}

// Middleware de tratamento de erros
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ error: 'Algo deu errado!' });
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