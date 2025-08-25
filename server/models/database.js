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
