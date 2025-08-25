import Database from 'better-sqlite3';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export const DB_PATH = process.env.DB_PATH || path.join(__dirname, 'database.sqlite');
if (process.env.DEBUG_DB === 'true') {
  console.log('DB_OPEN', DB_PATH);
}

const db = new Database(DB_PATH, { verbose: process.env.DEBUG_DB === 'true' ? console.log : undefined });

export const initDatabase = () => {
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

export default db;
