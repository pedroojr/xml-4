import Database from 'better-sqlite3';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const db = new Database(join(__dirname, '..', 'database.sqlite'));

try {
  // Excluir todas as NFEs (produtos serão excluídos automaticamente devido à constraint ON DELETE CASCADE)
  const deleteAllNFEs = db.prepare('DELETE FROM nfes');
  const result = deleteAllNFEs.run();
  
  console.log(`✅ ${result.changes} NFEs excluídas com sucesso`);
} catch (error) {
  console.error('❌ Erro ao excluir NFEs:', error);
} finally {
  db.close();
}