const fs = require('fs');
const path = require('path');
const Database = require('better-sqlite3');

// Conectar ao banco de dados
const db = new Database('./data/nfe.sqlite');

// Função para testar a preservação do XML original
function testXMLPreservation() {
  try {
    console.log('🧪 Testando funcionalidade de preservação do XML original...');
    
    // Ler o arquivo XML de exemplo
    const xmlPath = path.join(__dirname, '..', 'exemplo-nfe.xml');
    const xmlContent = fs.readFileSync(xmlPath, 'utf8');
    
    console.log('📄 XML carregado com sucesso');
    console.log(`📏 Tamanho do XML: ${xmlContent.length} caracteres`);
    
    // Criar dados de teste simples
    const nfeId = 'test-xml-preservation-' + Date.now();
    
    const nfeData = {
      id: nfeId,
      data: new Date().toISOString().split('T')[0],
      numero: '999',
      chaveNFE: nfeId,
      fornecedor: 'EMPRESA FORNECEDORA LTDA - TESTE',
      valor: 1000.00,
      itens: 1,
      impostoEntrada: 12,
      xapuriMarkup: 160,
      epitaMarkup: 130,
      roundingType: 'none',
      valorFrete: 0,
      isFavorite: 0,
      dataEmissao: new Date().toISOString(),
      valorTotal: 1000.00,
      quantidadeTotal: 1,
      cnpjFornecedor: '14200166000187',
      originalXML: xmlContent // ✅ Salvando o XML original
    };
    
    // Inserir NFE com XML original
    const insertNFE = db.prepare(`
      INSERT OR REPLACE INTO nfes (
        id, data, numero, chaveNFE, fornecedor, valor, itens,
        impostoEntrada, xapuriMarkup, epitaMarkup, roundingType,
        valorFrete, isFavorite, dataEmissao, valorTotal,
        quantidadeTotal, cnpjFornecedor, originalXML
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);
    
    insertNFE.run(
      nfeData.id, nfeData.data, nfeData.numero, nfeData.chaveNFE,
      nfeData.fornecedor, nfeData.valor, nfeData.itens, nfeData.impostoEntrada,
      nfeData.xapuriMarkup, nfeData.epitaMarkup, nfeData.roundingType,
      nfeData.valorFrete, nfeData.isFavorite, nfeData.dataEmissao,
      nfeData.valorTotal, nfeData.quantidadeTotal, nfeData.cnpjFornecedor,
      nfeData.originalXML
    );
    
    console.log('✅ NFE inserida com XML original preservado');
    console.log(`📋 ID da NFE: ${nfeData.id}`);
    
    // Verificar se o XML foi salvo corretamente
    const checkStmt = db.prepare('SELECT id, fornecedor, CASE WHEN originalXML IS NULL THEN \'SEM XML\' ELSE \'COM XML ORIGINAL\' END as status FROM nfes WHERE id = ?');
    const result = checkStmt.get(nfeData.id);
    
    console.log('🔍 Verificação:', result);
    
    // Testar recuperação do XML original
    const xmlStmt = db.prepare('SELECT originalXML FROM nfes WHERE id = ?');
    const xmlResult = xmlStmt.get(nfeData.id);
    
    if (xmlResult && xmlResult.originalXML) {
      console.log('✅ XML original recuperado com sucesso!');
      console.log(`📏 Tamanho do XML: ${xmlResult.originalXML.length} caracteres`);
      
      // Verificar se o XML recuperado é idêntico ao original
      const isIdentical = xmlResult.originalXML === xmlContent;
      console.log(`🔄 XML idêntico ao original: ${isIdentical ? '✅ SIM' : '❌ NÃO'}`);
      
      if (isIdentical) {
        console.log('\n🎉 SUCESSO! A funcionalidade de preservação do XML original está funcionando perfeitamente!');
        console.log('\n📋 Endpoints disponíveis para esta NFE:');
        console.log(`   • GET /api/nfes/${nfeData.id}/original-xml`);
        console.log(`   • GET /api/nfes/${nfeData.id}/compare-original`);
        console.log(`   • POST /api/nfes/${nfeData.id}/restore-original`);
      }
    } else {
      console.log('❌ Erro: XML original não foi salvo corretamente');
    }
    
  } catch (error) {
    console.error('❌ Erro no teste:', error.message);
  } finally {
    db.close();
  }
}

// Executar o teste
testXMLPreservation();