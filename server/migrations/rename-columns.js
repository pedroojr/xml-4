import Database from 'better-sqlite3';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const dbPath = process.env.DB_PATH || path.join(__dirname, '..', 'database.sqlite');
const db = new Database(dbPath);

const renameColumns = (table, columns) => {
  for (const [oldName, newName] of Object.entries(columns)) {
    try {
      db.exec(`ALTER TABLE ${table} RENAME COLUMN ${oldName} TO ${newName}`);
    } catch (e) {
      // ignore if column already renamed or doesn't exist
    }
  }
};

renameColumns('nfes', {
  data: 'date',
  numero: 'number',
  chaveNFE: 'nfeKey',
  fornecedor: 'supplier',
  valor: 'value',
  itens: 'items',
  impostoEntrada: 'entryTax',
  valorFrete: 'freightValue'
});

renameColumns('produtos', {
  codigo: 'code',
  descricao: 'description',
  unidade: 'unit',
  quantidade: 'quantity',
  valorUnitario: 'unitPrice',
  valorTotal: 'totalPrice',
  baseCalculoICMS: 'icmsBase',
  valorICMS: 'icmsValue',
  aliquotaICMS: 'icmsRate',
  baseCalculoIPI: 'ipiBase',
  valorIPI: 'ipiValue',
  aliquotaIPI: 'ipiRate',
  descricao_complementar: 'additionalDescription',
  custoExtra: 'extraCost',
  freteProporcional: 'freightShare'
});

db.close();

console.log('Column rename migration completed.');
