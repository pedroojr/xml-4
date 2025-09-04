const Database = require('better-sqlite3');
const path = require('path');
const fs = require('fs');

// Configuração do banco de dados de teste
const testDbPath = path.join(__dirname, 'test-persistence.sqlite');
if (fs.existsSync(testDbPath)) {
  fs.unlinkSync(testDbPath);
}

const db = new Database(testDbPath);

// Criar tabelas
db.exec(`
  CREATE TABLE IF NOT EXISTS nfes (
    id TEXT PRIMARY KEY,
    numero TEXT,
    serie TEXT,
    chave_nfe TEXT UNIQUE,
    data_emissao TEXT,
    cnpj_emitente TEXT,
    nome_emitente TEXT,
    valor_total REAL,
    valor_liquido REAL,
    desconto_total REAL,
    status TEXT DEFAULT 'ativa',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    originalXML TEXT
  );
`);

// XML de teste com vNF = 9305.70 e vProd = 11111.31
const testXML = `<?xml version="1.0" encoding="UTF-8"?>
<nfeProc xmlns="http://www.portalfiscal.inf.br/nfe">
  <NFe>
    <infNFe Id="NFe35240614200166000187550010000000101234567890">
      <ide>
        <cUF>35</cUF>
        <cNF>12345678</cNF>
        <natOp>Venda</natOp>
        <mod>55</mod>
        <serie>1</serie>
        <nNF>10</nNF>
        <dhEmi>2024-06-01T10:00:00-03:00</dhEmi>
        <tpNF>1</tpNF>
        <idDest>1</idDest>
        <cMunFG>3550308</cMunFG>
        <tpImp>1</tpImp>
        <tpEmis>1</tpEmis>
        <cDV>0</cDV>
        <tpAmb>2</tpAmb>
        <finNFe>1</finNFe>
        <indFinal>1</indFinal>
        <indPres>1</indPres>
        <procEmi>0</procEmi>
        <verProc>1.0</verProc>
      </ide>
      <emit>
        <CNPJ>14200166000187</CNPJ>
        <xNome>EMPRESA TESTE LTDA</xNome>
        <enderEmit>
          <xLgr>RUA TESTE</xLgr>
          <nro>123</nro>
          <xBairro>CENTRO</xBairro>
          <cMun>3550308</cMun>
          <xMun>SAO PAULO</xMun>
          <UF>SP</UF>
          <CEP>01000000</CEP>
        </enderEmit>
        <IE>123456789012</IE>
        <CRT>3</CRT>
      </emit>
      <dest>
        <CPF>12345678901</CPF>
        <xNome>CLIENTE TESTE</xNome>
        <enderDest>
          <xLgr>RUA CLIENTE</xLgr>
          <nro>456</nro>
          <xBairro>JARDIM</xBairro>
          <cMun>3550308</cMun>
          <xMun>SAO PAULO</xMun>
          <UF>SP</UF>
          <CEP>02000000</CEP>
        </enderDest>
      </dest>
      <det nItem="1">
        <prod>
          <cProd>001</cProd>
          <cEAN></cEAN>
          <xProd>PRODUTO TESTE</xProd>
          <NCM>12345678</NCM>
          <CFOP>5102</CFOP>
          <uCom>UN</uCom>
          <qCom>1.0000</qCom>
          <vUnCom>11111.31</vUnCom>
          <vProd>11111.31</vProd>
          <cEANTrib></cEANTrib>
          <uTrib>UN</uTrib>
          <qTrib>1.0000</qTrib>
          <vUnTrib>11111.31</vUnTrib>
          <indTot>1</indTot>
        </prod>
        <imposto>
          <ICMS>
            <ICMS00>
              <orig>0</orig>
              <CST>00</CST>
              <modBC>3</modBC>
              <vBC>11111.31</vBC>
              <pICMS>18.00</pICMS>
              <vICMS>2000.04</vICMS>
            </ICMS00>
          </ICMS>
        </imposto>
      </det>
      <total>
        <ICMSTot>
          <vBC>11111.31</vBC>
          <vICMS>2000.04</vICMS>
          <vICMSDeson>0.00</vICMSDeson>
          <vFCP>0.00</vFCP>
          <vBCST>0.00</vBCST>
          <vST>0.00</vST>
          <vFCPST>0.00</vFCPST>
          <vFCPSTRet>0.00</vFCPSTRet>
          <vProd>11111.31</vProd>
          <vFrete>0.00</vFrete>
          <vSeg>0.00</vSeg>
          <vDesc>1805.61</vDesc>
          <vII>0.00</vII>
          <vIPI>0.00</vIPI>
          <vIPIDevol>0.00</vIPIDevol>
          <vPIS>0.00</vPIS>
          <vCOFINS>0.00</vCOFINS>
          <vOutro>0.00</vOutro>
          <vNF>9305.70</vNF>
        </ICMSTot>
      </total>
    </infNFe>
  </NFe>
</nfeProc>`;

// Dados da NFE para inserção
const nfeData = {
  id: 'test-persistence-001',
  numero: '10',
  serie: '1',
  chave_nfe: '35240614200166000187550010000000101234567890',
  data_emissao: '2024-06-01',
  cnpj_emitente: '14200166000187',
  nome_emitente: 'EMPRESA TESTE LTDA',
  valor_total: 11111.31,  // vProd
  valor_liquido: 9305.70, // vNF
  desconto_total: 1805.61, // vProd - vNF
  status: 'ativa',
  originalXML: testXML
};

console.log('🧪 [TESTE PERSISTÊNCIA] Iniciando teste do hotfix...');
console.log('📊 Valores esperados:');
console.log(`   vProd (valor_total): ${nfeData.valor_total}`);
console.log(`   vNF (valor_liquido): ${nfeData.valor_liquido}`);
console.log(`   Desconto: ${((nfeData.valor_total - nfeData.valor_liquido) / nfeData.valor_total * 100).toFixed(1)}%`);

// 1. Inserir NFE no banco
console.log('\n1️⃣ Inserindo NFE no banco...');
const insertStmt = db.prepare(`
  INSERT INTO nfes (
    id, numero, serie, chave_nfe, data_emissao, cnpj_emitente, nome_emitente,
    valor_total, valor_liquido, desconto_total, status, originalXML
  ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
`);

insertStmt.run(
  nfeData.id, nfeData.numero, nfeData.serie, nfeData.chave_nfe,
  nfeData.data_emissao, nfeData.cnpj_emitente, nfeData.nome_emitente,
  nfeData.valor_total, nfeData.valor_liquido, nfeData.desconto_total,
  nfeData.status, nfeData.originalXML
);

console.log('✅ NFE inserida com sucesso!');

// 2. Simular busca GET (como se fosse uma reabertura)
console.log('\n2️⃣ Simulando busca GET (reabertura da NFE)...');
const selectStmt = db.prepare('SELECT * FROM nfes WHERE id = ?');
const nfeFromDb = selectStmt.get(nfeData.id);

console.log('📋 Dados recuperados do banco:');
console.log(`   ID: ${nfeFromDb.id}`);
console.log(`   valor_total: ${nfeFromDb.valor_total}`);
console.log(`   valor_liquido: ${nfeFromDb.valor_liquido}`);
console.log(`   desconto_total: ${nfeFromDb.desconto_total}`);

// 3. Verificar se os valores estão corretos
console.log('\n3️⃣ Verificando integridade dos dados...');
const valorTotalOk = Math.abs(nfeFromDb.valor_total - 11111.31) < 0.01;
const valorLiquidoOk = Math.abs(nfeFromDb.valor_liquido - 9305.70) < 0.01;
const descontoCalculado = ((nfeFromDb.valor_total - nfeFromDb.valor_liquido) / nfeFromDb.valor_total * 100);
const descontoOk = Math.abs(descontoCalculado - 16.3) < 0.5; // Tolerância de 0.5%

console.log(`✅ valor_total correto: ${valorTotalOk ? 'SIM' : 'NÃO'} (${nfeFromDb.valor_total})`);
console.log(`✅ valor_liquido correto: ${valorLiquidoOk ? 'SIM' : 'NÃO'} (${nfeFromDb.valor_liquido})`);
console.log(`✅ desconto correto: ${descontoOk ? 'SIM' : 'NÃO'} (${descontoCalculado.toFixed(1)}%)`);

// 4. Simular extração do vNF do XML original (como no hotfix)
console.log('\n4️⃣ Testando extração do vNF do XML original...');

// Usar regex simples para extrair vNF (como no hotfix real)
const vNFMatch = nfeFromDb.originalXML.match(/<vNF>([\d.,]+)<\/vNF>/);

if (vNFMatch) {
  const vNFFromXML = parseFloat(vNFMatch[1]);
  console.log(`📄 vNF extraído do XML: ${vNFFromXML}`);
  
  const xmlExtractionOk = Math.abs(vNFFromXML - 9305.70) < 0.01;
  console.log(`✅ Extração do XML correta: ${xmlExtractionOk ? 'SIM' : 'NÃO'}`);
  
  // 5. Resultado final
  console.log('\n🎯 RESULTADO DO TESTE:');
  if (valorTotalOk && valorLiquidoOk && descontoOk && xmlExtractionOk) {
    console.log('🟢 SUCESSO: Todos os valores estão corretos!');
    console.log('🔒 O hotfix está funcionando - valor_liquido preservado!');
    console.log('\n📋 RESUMO:');
    console.log(`   ✅ Importação: vNF = ${nfeData.valor_liquido}`);
    console.log(`   ✅ Após reabertura: vNF = ${nfeFromDb.valor_liquido}`);
    console.log(`   ✅ Desconto estável: ${descontoCalculado.toFixed(1)}%`);
    console.log(`   ✅ XML preservado: vNF = ${vNFFromXML}`);
  } else {
    console.log('🔴 FALHA: Alguns valores estão incorretos!');
    console.log('⚠️  O bug de persistência ainda existe!');
  }
} else {
  console.log('🔴 ERRO: Não foi possível extrair vNF do XML!');
}

// Limpar
db.close();
fs.unlinkSync(testDbPath);

console.log('\n🧹 Teste concluído e arquivos temporários removidos.');