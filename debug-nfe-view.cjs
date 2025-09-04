const axios = require('axios');

// Simula o comportamento do componente NFEView
async function debugNFEView() {
  try {
    console.log('🔍 Simulando carregamento do NFEView...');
    
    // Simula a chamada da API como no useEffect
    const response = await axios.get('http://localhost:3011/api/nfes/23250101933349000572550040003073661354363657');
    const nfeDetail = response.data;
    
    console.log('📊 Dados recebidos da API:', {
      id: nfeDetail.id,
      numero: nfeDetail.numero,
      fornecedor: nfeDetail.fornecedor,
      produtosLength: nfeDetail.produtos?.length || 0
    });
    
    // Simula a lógica do componente
    const nfe = nfeDetail;
    const produtos = Array.isArray(nfe.produtos) ? nfe.produtos : [];
    
    console.log('🔍 Produtos processados:', {
      isArray: Array.isArray(produtos),
      length: produtos.length,
      firstProduct: produtos[0] || null
    });
    
    // Simula a renderização dos produtos
    produtos.forEach((produto, index) => {
      console.log(`📦 Produto ${index + 1}:`, {
        descricao: produto.descricao || 'Sem descrição',
        codigo: produto.codigo || 'Sem código',
        unidade: produto.unidade || 'Sem unidade',
        ncm: produto.ncm || 'Sem NCM',
        discount: produto.discount,
        hasDiscount: produto.discount && produto.discount > 0,
        valorTotal: produto.valorTotal || 0,
        quantidade: produto.quantidade || 0,
        valorUnitario: produto.valorUnitario || 0
      });
    });
    
  } catch (error) {
    console.error('❌ Erro ao debugar NFEView:', error.message);
  }
}

debugNFEView();