// Script de teste para verificar se o frontend recebe os dados corretos da API
const axios = require('axios');

async function testFrontendAPI() {
  try {
    console.log('🔍 Testando comunicação frontend -> backend...');
    
    // Simular requisição do frontend através do proxy
    const response = await axios.get('http://localhost:3020/api/nfes/23250101933349000572550040003073661354363657');
    
    console.log('✅ Resposta recebida:', {
      status: response.status,
      dataType: typeof response.data,
      hasProducts: !!response.data.produtos,
      productsLength: response.data.produtos ? response.data.produtos.length : 0
    });
    
    if (response.data.produtos && response.data.produtos.length > 0) {
      const firstProduct = response.data.produtos[0];
      console.log('🔍 Primeiro produto recebido:', {
        codigo: firstProduct.codigo,
        unidade: firstProduct.unidade,
        descricao: firstProduct.descricao,
        discount: firstProduct.discount,
        hasCodigoField: 'codigo' in firstProduct,
        hasUnidadeField: 'unidade' in firstProduct,
        codigoType: typeof firstProduct.codigo,
        unidadeType: typeof firstProduct.unidade
      });
      
      // Verificar se há campos null
      const nullFields = [];
      if (firstProduct.codigo === null) nullFields.push('codigo');
      if (firstProduct.unidade === null) nullFields.push('unidade');
      if (firstProduct.descricao === null) nullFields.push('descricao');
      
      if (nullFields.length > 0) {
        console.log('❌ Campos NULL encontrados:', nullFields);
      } else {
        console.log('✅ Nenhum campo NULL encontrado');
      }
    }
    
  } catch (error) {
    console.error('❌ Erro na requisição:', {
      message: error.message,
      status: error.response?.status,
      data: error.response?.data
    });
  }
}

testFrontendAPI();