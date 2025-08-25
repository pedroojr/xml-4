import Database from 'better-sqlite3';
import config from '../config/index.js';

export const DB_PATH = config.dbPath;
if (config.debugDb) {
  console.log('DB_OPEN', DB_PATH);
}

const db = new Database(DB_PATH, { verbose: config.debugDb ? console.log : undefined });

// Logar colunas reais da tabela nfes em runtime para auditoria
if (config.debugDb) {
  try {
    const cols = db.prepare('PRAGMA table_info(nfes)').all();
    console.log('NFES_COLUMNS', cols);
  } catch (e) {
    console.error('NFES_COLUMNS_ERROR', e?.message || e);
  }
}

export default db;
