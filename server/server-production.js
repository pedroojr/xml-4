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
              connectSrc: ["'self'"],
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

// Configuração do upload
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 10 * 1024 * 1024 // 10MB
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
      -- colunas de resolução de cor
      color_code_detected TEXT,
      color_name_resolved TEXT,
      brand_color_id INTEGER,
      resolved_via TEXT,
      needs_color_mapping INTEGER DEFAULT 0,
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

  // Tabelas de cores por marca
  db.exec(`
    CREATE TABLE IF NOT EXISTS brand_colors (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      brand TEXT NOT NULL,
      code TEXT NOT NULL,
      name TEXT NOT NULL,
      UNIQUE(brand, code)
    );
    CREATE TABLE IF NOT EXISTS brand_color_aliases (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      brand TEXT NOT NULL,
      alias TEXT NOT NULL,
      color_name TEXT NOT NULL,
      UNIQUE(brand, alias)
    );
    CREATE TABLE IF NOT EXISTS brand_color_rules (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      brand TEXT NOT NULL,
      ean TEXT,
      referencia TEXT,
      modelo TEXT,
      color_name TEXT NOT NULL
    );
    CREATE TABLE IF NOT EXISTS brand_defaults (
      brand TEXT PRIMARY KEY,
      default_color TEXT
    );
  `);
};
// Utilidades de detecção e resolução de cor
const regexColorCode = /\b([0-9A-Za-z]{3,5})\b/g;

const detectBrand = (produto, fornecedor) => {
  const pBrand = (produto.brand || '').toString().trim();
  if (pBrand) return pBrand;
  return (fornecedor || '').toString().trim();
};

const detectColorCode = (produto) => {
  const text = [produto.descricao, produto.descricao_complementar]
    .filter(Boolean)
    .join(' ');
  let match;
  const candidates = [];
  while ((match = regexColorCode.exec(text)) !== null) {
    candidates.push(match[1]);
  }
  // Priorizar códigos com 4 dígitos/letras
  const preferred = candidates.find(c => c.length === 4) || candidates[0];
  return preferred || null;
};

// Prepared statements para resolução
const psColorByCode = db.prepare('SELECT id, name FROM brand_colors WHERE brand = ? AND code = ?');
const psAlias = db.prepare('SELECT color_name FROM brand_color_aliases WHERE brand = ? AND alias = ?');
const psRule = db.prepare(`
  SELECT color_name FROM brand_color_rules 
  WHERE brand = ? AND (
    (ean IS NOT NULL AND ean = ?) OR
    (referencia IS NOT NULL AND referencia = ?) OR
    (modelo IS NOT NULL AND modelo = ?)
  ) ORDER BY id DESC LIMIT 1`);
const psDefault = db.prepare('SELECT default_color FROM brand_defaults WHERE brand = ?');

const resolveColor = (brand, produto) => {
  let resolved_via = null;
  let brand_color_id = null;
  let color_name_resolved = null;
  const code = detectColorCode(produto);

  if (code) {
    const byCode = psColorByCode.get(brand, code) || psColorByCode.get('GLOBAL', code);
    if (byCode) {
      brand_color_id = byCode.id;
      color_name_resolved = byCode.name;
      resolved_via = 'brand_colors';
      return { code, color_name_resolved, brand_color_id, resolved_via, needs_color_mapping: 0 };
    }
    const byAlias = psAlias.get(brand, code) || psAlias.get('GLOBAL', code);
    if (byAlias) {
      color_name_resolved = byAlias.color_name;
      resolved_via = 'brand_color_aliases';
      return { code, color_name_resolved, brand_color_id, resolved_via, needs_color_mapping: 0 };
    }
  }

  const rule = psRule.get(brand, produto.ean || null, produto.reference || null, produto.codigo || null)
    || psRule.get('GLOBAL', produto.ean || null, produto.reference || null, produto.codigo || null);
  if (rule) {
    color_name_resolved = rule.color_name;
    resolved_via = 'brand_color_rules';
    return { code, color_name_resolved, brand_color_id, resolved_via, needs_color_mapping: 0 };
  }

  const def = psDefault.get(brand) || psDefault.get('GLOBAL');
  if (def && def.default_color) {
    color_name_resolved = def.default_color;
    resolved_via = 'brand_defaults';
    return { code, color_name_resolved, brand_color_id, resolved_via, needs_color_mapping: 0 };
  }

  return { code, color_name_resolved: 'Cor não cadastrada', brand_color_id: null, resolved_via: 'unresolved', needs_color_mapping: 1 };
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

// POST - Criar nova NFE
app.post('/api/nfes', (req, res) => {
  try {
    const { id, data, numero, chaveNFE, fornecedor, valor, itens, produtos, impostoEntrada, xapuriMarkup, epitaMarkup, roundingType, valorFrete } = req.body;
    
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
        imageUrl, descricao_complementar, custoExtra, freteProporcional,
        color_code_detected, color_name_resolved, brand_color_id, resolved_via, needs_color_mapping
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);
    
    const deleteProdutos = db.prepare('DELETE FROM produtos WHERE nfeId = ?');
    
    db.transaction(() => {
      // Inserir/atualizar NFE
      insertNFE.run(
        id, data, numero, chaveNFE, fornecedor, valor, itens,
        impostoEntrada || 12, xapuriMarkup || 160, epitaMarkup || 130,
        roundingType || 'none', valorFrete || 0
      );
      
      // Remover produtos antigos
      deleteProdutos.run(id);
      
      // Inserir novos produtos
      if (produtos && Array.isArray(produtos)) {
        produtos.forEach(produto => {
          const brand = detectBrand(produto, fornecedor);
          const { code, color_name_resolved, brand_color_id, resolved_via, needs_color_mapping } = resolveColor(brand, produto);
          insertProduto.run(
            id, produto.codigo, produto.descricao, produto.ncm, produto.cfop,
            produto.unidade, produto.quantidade, produto.valorUnitario,
            produto.valorTotal, produto.baseCalculoICMS, produto.valorICMS,
            produto.aliquotaICMS, produto.baseCalculoIPI, produto.valorIPI,
            produto.aliquotaIPI, produto.ean, produto.reference, brand,
            produto.imageUrl, produto.descricao_complementar,
            produto.custoExtra || 0, produto.freteProporcional || 0,
            code || null, color_name_resolved, brand_color_id, resolved_via, needs_color_mapping
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
    
    const updateStmt = db.prepare(`
      UPDATE nfes SET 
        fornecedor = ?, impostoEntrada = ?, xapuriMarkup = ?, 
        epitaMarkup = ?, roundingType = ?, valorFrete = ?, 
        updatedAt = CURRENT_TIMESTAMP
      WHERE id = ?
    `);
    
    const result = updateStmt.run(
      fornecedor, impostoEntrada, xapuriMarkup, epitaMarkup, 
      roundingType, valorFrete, id
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
    database: 'connected',
    environment: 'production'
  });
});

// --- CRUD: Brands helper ---
app.get('/api/brands', (req, res) => {
  try {
    const rows = db.prepare(`
      SELECT DISTINCT brand FROM (
        SELECT brand FROM brand_colors
        UNION ALL SELECT brand FROM brand_color_aliases
        UNION ALL SELECT brand FROM brand_color_rules
        UNION ALL SELECT brand FROM brand_defaults
      ) WHERE brand IS NOT NULL AND TRIM(brand) <> '' ORDER BY brand
    `).all();
    res.json(rows.map(r => r.brand));
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: 'Erro ao listar marcas' });
  }
});

// --- CRUD: brand_colors ---
app.get('/api/brands/:brand/colors', (req, res) => {
  try {
    const { brand } = req.params;
    const rows = db.prepare('SELECT id, code, name FROM brand_colors WHERE brand = ? ORDER BY code').all(brand);
    res.json(rows);
  } catch (e) { res.status(500).json({ error: 'Erro ao listar cores' }); }
});

app.post('/api/brands/:brand/colors', (req, res) => {
  try {
    const { brand } = req.params;
    const { code, name } = req.body;
    if (!code || !name) return res.status(400).json({ error: 'code e name são obrigatórios' });
    db.prepare('INSERT OR IGNORE INTO brand_colors(brand, code, name) VALUES (?, ?, ?)').run(brand, code, name);
    res.json({ message: 'Cor criada' });
  } catch (e) { res.status(500).json({ error: 'Erro ao criar cor' }); }
});

app.put('/api/brands/:brand/colors/:code', (req, res) => {
  try {
    const { brand, code } = req.params;
    const { name, newCode } = req.body;
    const stmt = db.prepare('UPDATE brand_colors SET name = COALESCE(?, name), code = COALESCE(?, code) WHERE brand = ? AND code = ?');
    const r = stmt.run(name ?? null, newCode ?? null, brand, code);
    if (!r.changes) return res.status(404).json({ error: 'Cor não encontrada' });
    res.json({ message: 'Cor atualizada' });
  } catch (e) { res.status(500).json({ error: 'Erro ao atualizar cor' }); }
});

app.delete('/api/brands/:brand/colors/:code', (req, res) => {
  try {
    const { brand, code } = req.params;
    const r = db.prepare('DELETE FROM brand_colors WHERE brand = ? AND code = ?').run(brand, code);
    if (!r.changes) return res.status(404).json({ error: 'Cor não encontrada' });
    res.json({ message: 'Cor removida' });
  } catch (e) { res.status(500).json({ error: 'Erro ao remover cor' }); }
});

// --- CRUD: aliases ---
app.get('/api/brands/:brand/aliases', (req, res) => {
  try {
    const { brand } = req.params;
    const rows = db.prepare('SELECT id, alias, color_name FROM brand_color_aliases WHERE brand = ? ORDER BY alias').all(brand);
    res.json(rows);
  } catch (e) { res.status(500).json({ error: 'Erro ao listar aliases' }); }
});

app.post('/api/brands/:brand/aliases', (req, res) => {
  try {
    const { brand } = req.params;
    const { alias, color_name } = req.body;
    if (!alias || !color_name) return res.status(400).json({ error: 'alias e color_name são obrigatórios' });
    db.prepare('INSERT OR IGNORE INTO brand_color_aliases(brand, alias, color_name) VALUES (?, ?, ?)').run(brand, alias, color_name);
    res.json({ message: 'Alias criado' });
  } catch (e) { res.status(500).json({ error: 'Erro ao criar alias' }); }
});

app.put('/api/brands/:brand/aliases/:alias', (req, res) => {
  try {
    const { brand, alias } = req.params;
    const { color_name, newAlias } = req.body;
    const r = db.prepare('UPDATE brand_color_aliases SET color_name = COALESCE(?, color_name), alias = COALESCE(?, alias) WHERE brand = ? AND alias = ?')
      .run(color_name ?? null, newAlias ?? null, brand, alias);
    if (!r.changes) return res.status(404).json({ error: 'Alias não encontrado' });
    res.json({ message: 'Alias atualizado' });
  } catch (e) { res.status(500).json({ error: 'Erro ao atualizar alias' }); }
});

app.delete('/api/brands/:brand/aliases/:alias', (req, res) => {
  try {
    const { brand, alias } = req.params;
    const r = db.prepare('DELETE FROM brand_color_aliases WHERE brand = ? AND alias = ?').run(brand, alias);
    if (!r.changes) return res.status(404).json({ error: 'Alias não encontrado' });
    res.json({ message: 'Alias removido' });
  } catch (e) { res.status(500).json({ error: 'Erro ao remover alias' }); }
});

// --- CRUD: rules ---
app.get('/api/brands/:brand/rules', (req, res) => {
  try {
    const { brand } = req.params;
    const rows = db.prepare('SELECT id, ean, referencia, modelo, color_name FROM brand_color_rules WHERE brand = ? ORDER BY id DESC').all(brand);
    res.json(rows);
  } catch (e) { res.status(500).json({ error: 'Erro ao listar regras' }); }
});

app.post('/api/brands/:brand/rules', (req, res) => {
  try {
    const { brand } = req.params;
    const { ean, referencia, modelo, color_name } = req.body;
    if (!color_name) return res.status(400).json({ error: 'color_name é obrigatório' });
    db.prepare('INSERT INTO brand_color_rules(brand, ean, referencia, modelo, color_name) VALUES (?, ?, ?, ?, ?)')
      .run(brand, ean || null, referencia || null, modelo || null, color_name);
    res.json({ message: 'Regra criada' });
  } catch (e) { res.status(500).json({ error: 'Erro ao criar regra' }); }
});

app.delete('/api/brands/:brand/rules/:id', (req, res) => {
  try {
    const { brand, id } = req.params;
    const r = db.prepare('DELETE FROM brand_color_rules WHERE brand = ? AND id = ?').run(brand, id);
    if (!r.changes) return res.status(404).json({ error: 'Regra não encontrada' });
    res.json({ message: 'Regra removida' });
  } catch (e) { res.status(500).json({ error: 'Erro ao remover regra' }); }
});

// --- CRUD: defaults ---
app.get('/api/brands/:brand/default', (req, res) => {
  try {
    const { brand } = req.params;
    const row = db.prepare('SELECT default_color FROM brand_defaults WHERE brand = ?').get(brand);
    res.json({ brand, default_color: row?.default_color || null });
  } catch (e) { res.status(500).json({ error: 'Erro ao obter default' }); }
});

app.put('/api/brands/:brand/default', (req, res) => {
  try {
    const { brand } = req.params;
    const { default_color } = req.body;
    db.prepare('INSERT INTO brand_defaults(brand, default_color) VALUES(?, ?) ON CONFLICT(brand) DO UPDATE SET default_color = excluded.default_color')
      .run(brand, default_color || null);
    res.json({ message: 'Default atualizado' });
  } catch (e) { res.status(500).json({ error: 'Erro ao atualizar default' }); }
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
