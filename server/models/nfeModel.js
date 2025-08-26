import db from './database.js';

export const getAllNfes = () => {
  const stmt = db.prepare(`
    SELECT
      n.*,
      COUNT(p.id) as produtosCount,
      COALESCE(SUM(p.valorTotal), 0) as valorTotal,
      COALESCE(SUM(p.discount), 0) as discountTotal,
      COALESCE(SUM(p.netPrice), 0) as netPriceTotal
    FROM nfes n
    LEFT JOIN produtos p ON n.id = p.nfeId
    GROUP BY n.id
    ORDER BY n.createdAt DESC
  `);
  const rows = stmt.all();

  return rows.map((row) => {
    let hiddenItems = [];
    try {
      hiddenItems = row.hiddenItems ? JSON.parse(row.hiddenItems) : [];
    } catch {
      hiddenItems = [];
    }
    return {
      ...row,
      hiddenItems,
      showHidden: Boolean(row.showHidden),
    };
  });
};

export const getNfeById = (id) => {
  const nfeStmt = db.prepare('SELECT * FROM nfes WHERE id = ?');
  const nfe = nfeStmt.get(id);
  if (!nfe) {
    return null;
  }

  const produtosStmt = db.prepare(`
    SELECT
      id, nfeId, codigo, descricao, ncm, cfop, unidade, quantidade,
      valorUnitario, valorTotal, baseCalculoICMS, valorICMS, aliquotaICMS,
      baseCalculoIPI, valorIPI, aliquotaIPI, ean, reference, brand,
      imageUrl, descricao_complementar, custoExtra, freteProporcional,
      COALESCE(discount, 0) as discount, COALESCE(netPrice, 0) as netPrice
    FROM produtos
    WHERE nfeId = ?
  `);
  const produtos = produtosStmt.all(id);

  let hiddenItems = [];
  try {
    hiddenItems = nfe.hiddenItems ? JSON.parse(nfe.hiddenItems) : [];
  } catch {
    hiddenItems = [];
  }

  return {
    ...nfe,
    hiddenItems,
    showHidden: Boolean(nfe.showHidden),
    produtos,
  };
};

export const getNfeByChave = (chaveNFE) => {
  if (!chaveNFE) return null;
  const stmt = db.prepare('SELECT * FROM nfes WHERE chaveNFE = ?');
  return stmt.get(chaveNFE) || null;
};

export const saveNfe = ({
  id,
  data,
  numero,
  chaveNFE,
  fornecedor,
  valor,
  itens,
  produtos,
  impostoEntrada,
  xapuriMarkup,
  epitaMarkup,
  roundingType,
  valorFrete,
  hiddenItems,
  showHidden,
}) => {
  // Determina ID efetivo: prioriza chaveNFE; se já existir uma NFE com a mesma chave, reutiliza o mesmo ID
  const selectByChave = db.prepare('SELECT id FROM nfes WHERE chaveNFE = ?');
  const existing = chaveNFE ? selectByChave.get(chaveNFE) : null;
  const effectiveId = (existing && existing.id) ? existing.id : (chaveNFE || id);

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
      imageUrl, descricao_complementar, custoExtra, freteProporcional,
      discount, netPrice
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  const deleteProdutos = db.prepare('DELETE FROM produtos WHERE nfeId = ?');

  db.transaction(() => {
    insertNFE.run(
      effectiveId,
      data,
      numero,
      chaveNFE,
      fornecedor,
      valor,
      itens,
      impostoEntrada || 12,
      xapuriMarkup || 160,
      epitaMarkup || 130,
      roundingType || 'none',
      valorFrete || 0,
      JSON.stringify(hiddenItems || []),
      showHidden || 0,
    );

    deleteProdutos.run(effectiveId);

    if (produtos && Array.isArray(produtos)) {
      produtos.forEach((produto) => {
        insertProduto.run(
          effectiveId,
          produto.codigo,
          produto.descricao,
          produto.ncm,
          produto.cfop,
          produto.unidade,
          produto.quantidade,
          produto.valorUnitario,
          produto.valorTotal,
          produto.baseCalculoICMS,
          produto.valorICMS,
          produto.aliquotaICMS,
          produto.baseCalculoIPI,
          produto.valorIPI,
          produto.aliquotaIPI,
          produto.ean,
          produto.reference,
          produto.brand,
          produto.imageUrl,
          produto.descricao_complementar,
          produto.custoExtra ?? 0,
          produto.freteProporcional ?? 0,
          produto.discount ?? 0,
          produto.netPrice ?? 0,
        );
      });
    }
  })();

  return id;
};

export const updateNfe = (
  id,
  {
    fornecedor,
    impostoEntrada,
    xapuriMarkup,
    epitaMarkup,
    roundingType,
    valorFrete,
    hiddenItems,
    showHidden,
  },
) => {
  const current = db
    .prepare('SELECT hiddenItems, showHidden FROM nfes WHERE id = ?')
    .get(id);
  const currentHidden = (() => {
    try {
      return current?.hiddenItems ? JSON.parse(current.hiddenItems) : [];
    } catch {
      return [];
    }
  })();
  const nextHidden = hiddenItems !== undefined ? hiddenItems : currentHidden;
  const nextShowHidden =
    showHidden !== undefined
      ? showHidden
        ? 1
        : 0
      : (current?.showHidden ?? 0);

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
    JSON.stringify(nextHidden),
    nextShowHidden,
    id,
  );

  return result.changes;
};

export const deleteNfe = (id) => {
  const deleteStmt = db.prepare('DELETE FROM nfes WHERE id = ?');
  const result = deleteStmt.run(id);
  return result.changes;
};
