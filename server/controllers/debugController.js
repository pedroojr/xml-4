import db, { DB_PATH } from '../models/database.js';

export const getDbInfo = (req, res) => {
  try {
    const cols = db.prepare('PRAGMA table_info(nfes)').all();
    res.json({ DB_OPEN: DB_PATH, NFES_COLUMNS: cols });
  } catch (e) {
    res.status(500).json({ DB_OPEN: DB_PATH, error: e?.message || String(e) });
  }
};
