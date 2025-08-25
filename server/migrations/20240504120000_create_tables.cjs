exports.up = async function(knex) {
  await knex.schema.createTable('nfes', table => {
    table.text('id').primary();
    table.text('data').notNullable();
    table.text('numero').notNullable();
    table.text('chaveNFE');
    table.text('fornecedor').notNullable();
    table.float('valor').notNullable();
    table.integer('itens').notNullable();
    table.float('impostoEntrada').defaultTo(12);
    table.float('xapuriMarkup').defaultTo(160);
    table.float('epitaMarkup').defaultTo(130);
    table.text('roundingType').defaultTo('none');
    table.float('valorFrete').defaultTo(0);
    table.text('hiddenItems').defaultTo('[]');
    table.boolean('showHidden').defaultTo(0);
    table.boolean('isFavorite').defaultTo(0);
    table.timestamp('createdAt').defaultTo(knex.fn.now());
    table.timestamp('updatedAt').defaultTo(knex.fn.now());
  });

  await knex.schema.createTable('produtos', table => {
    table.increments('id').primary();
    table.text('nfeId').notNullable();
    table.text('codigo').notNullable();
    table.text('descricao').notNullable();
    table.text('ncm');
    table.text('cfop');
    table.text('unidade');
    table.float('quantidade').notNullable();
    table.float('valorUnitario').notNullable();
    table.float('valorTotal').notNullable();
    table.float('baseCalculoICMS');
    table.float('valorICMS');
    table.float('aliquotaICMS');
    table.float('baseCalculoIPI');
    table.float('valorIPI');
    table.float('aliquotaIPI');
    table.text('ean');
    table.text('reference');
    table.text('brand');
    table.text('imageUrl');
    table.text('descricao_complementar');
    table.float('custoExtra').defaultTo(0);
    table.float('freteProporcional').defaultTo(0);
    table.foreign('nfeId').references('id').inTable('nfes').onDelete('CASCADE');
  });

  await knex.schema.raw('CREATE INDEX IF NOT EXISTS idx_nfes_fornecedor ON nfes(fornecedor);');
  await knex.schema.raw('CREATE INDEX IF NOT EXISTS idx_nfes_data ON nfes(data);');
  await knex.schema.raw('CREATE INDEX IF NOT EXISTS idx_produtos_nfeId ON produtos(nfeId);');
  await knex.schema.raw('CREATE INDEX IF NOT EXISTS idx_produtos_codigo ON produtos(codigo);');
};

exports.down = async function(knex) {
  await knex.schema.dropTableIfExists('produtos');
  await knex.schema.dropTableIfExists('nfes');
};
