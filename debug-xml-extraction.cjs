const fs = require('fs');
const { DOMParser } = require('xmldom');

// Função parseNumber do frontend
function parseNumber(value) {
  if (!value) return 0;
  const str = value.toString();
  // Remove espaços e substitui vírgula por ponto
  const cleaned = str.replace(/\s/g, '').replace(',', '.');
  const num = parseFloat(cleaned);
  return isNaN(num) ? 0 : num;
}

// Função simplificada de extração baseada no parseNFeXML
function extractProductsFromXML(xmlContent) {
  const parser = new DOMParser();
  const xmlDoc = parser.parseFromString(xmlContent, 'text/xml');
  
  const products = [];
  const detElements = xmlDoc.getElementsByTagName('det');
  
  console.log(`\n🔍 Encontrados ${detElements.length} elementos 'det' no XML`);
  
  for (let i = 0; i < detElements.length; i++) {
    const det = detElements[i];
    const prodElement = det.getElementsByTagName('prod')[0];
    
    if (!prodElement) {
      console.log(`⚠️ Produto ${i + 1}: Elemento 'prod' não encontrado`);
      continue;
    }
    
    // Extrair dados básicos do produto
    const codigo = prodElement.getElementsByTagName('cProd')[0]?.textContent || '';
    const descricao = prodElement.getElementsByTagName('xProd')[0]?.textContent || '';
    const ncm = prodElement.getElementsByTagName('NCM')[0]?.textContent || '';
    const cfop = prodElement.getElementsByTagName('CFOP')[0]?.textContent || '';
    const unidade = prodElement.getElementsByTagName('uCom')[0]?.textContent || '';
    const quantidadeStr = prodElement.getElementsByTagName('qCom')[0]?.textContent || '0';
    const valorUnitarioStr = prodElement.getElementsByTagName('vUnCom')[0]?.textContent || '0';
    const valorTotalStr = prodElement.getElementsByTagName('vProd')[0]?.textContent || '0';
    
    // Converter valores
    const quantidade = parseNumber(quantidadeStr);
    const valorUnitario = parseNumber(valorUnitarioStr);
    const valorTotal = parseNumber(valorTotalStr);
    
    const produto = {
      codigo,
      descricao,
      ncm,
      cfop,
      unidade,
      quantidade,
      valorUnitario,
      valorTotal
    };
    
    products.push(produto);
    
    console.log(`\n📦 Produto ${i + 1}:`);
    console.log(`   Código: ${codigo}`);
    console.log(`   Descrição: ${descricao}`);
    console.log(`   NCM: ${ncm}`);
    console.log(`   CFOP: ${cfop}`);
    console.log(`   Unidade: ${unidade}`);
    console.log(`   Quantidade: ${quantidadeStr} -> ${quantidade}`);
    console.log(`   Valor Unitário: ${valorUnitarioStr} -> ${valorUnitario}`);
    console.log(`   Valor Total: ${valorTotalStr} -> ${valorTotal}`);
  }
  
  return products;
}

// Função principal
function debugXMLExtraction() {
  try {
    console.log('🚀 Iniciando depuração da extração XML...');
    
    // Ler o arquivo XML de exemplo
    const xmlPath = './exemplo-nfe.xml';
    if (!fs.existsSync(xmlPath)) {
      console.error('❌ Arquivo exemplo-nfe.xml não encontrado!');
      return;
    }
    
    const xmlContent = fs.readFileSync(xmlPath, 'utf8');
    console.log(`✅ XML carregado com sucesso (${xmlContent.length} caracteres)`);
    
    // Extrair produtos
    const products = extractProductsFromXML(xmlContent);
    
    console.log(`\n📊 RESUMO DA EXTRAÇÃO:`);
    console.log(`   Total de produtos extraídos: ${products.length}`);
    
    if (products.length > 0) {
      const totalValor = products.reduce((sum, p) => sum + p.valorTotal, 0);
      const totalQuantidade = products.reduce((sum, p) => sum + p.quantidade, 0);
      
      console.log(`   Valor total dos produtos: R$ ${totalValor.toFixed(2)}`);
      console.log(`   Quantidade total: ${totalQuantidade}`);
      
      // Salvar resultado em arquivo JSON para análise
      const debugData = {
        timestamp: new Date().toISOString(),
        totalProdutos: products.length,
        valorTotal: totalValor,
        quantidadeTotal: totalQuantidade,
        produtos: products
      };
      
      fs.writeFileSync('./debug-extraction-results.json', JSON.stringify(debugData, null, 2));
      console.log('\n💾 Resultados salvos em debug-extraction-results.json');
    }
    
  } catch (error) {
    console.error('❌ Erro durante a depuração:', error.message);
    console.error(error.stack);
  }
}

// Executar depuração
debugXMLExtraction();