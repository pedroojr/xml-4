import { Product } from '../../types/nfe';

// Calcula o custo com desconto (Custo Bruto - Desconto Médio)
export const calculateCustoComDesconto = (product: Product): number => {
  const quantidade = product.quantidade || product.quantity || 0;
  const valorUnitario = product.valorUnitario || product.unitPrice || 0;
  const desconto = product.discount || 0;
  
  // Evitar divisão por zero e valores inválidos
  if (quantidade <= 0 || isNaN(valorUnitario) || isNaN(desconto)) {
    return valorUnitario;
  }
  
  const unitDiscount = desconto / quantidade;
  const result = valorUnitario - unitDiscount;
  
  // Garantir que o resultado seja um número válido
  return isNaN(result) ? valorUnitario : result;
};

// Calcula o custo líquido (Custo c/ desconto × (1 + Imposto de Entrada / 100))
export const calculateCustoLiquido = (product: Product, impostoEntrada: number): number => {
  const custoComDesconto = calculateCustoComDesconto(product);
  const imposto = isNaN(impostoEntrada) ? 0 : impostoEntrada;
  
  const result = custoComDesconto * (1 + (imposto / 100));
  
  // Garantir que o resultado seja um número válido
  return isNaN(result) ? custoComDesconto : result;
};

export const calculateSalePrice = (product: Product, markup: number): number => {
  const netPrice = product.netPrice || 0;
  const markupValue = isNaN(markup) ? 0 : markup;
  const markupMultiplier = 1 + markupValue / 100;
  
  const result = netPrice * markupMultiplier;
  
  // Garantir que o resultado seja um número válido
  return isNaN(result) ? netPrice : result;
};

export type RoundingType = '90' | '50' | 'none';

export const roundPrice = (price: number, type: RoundingType): number => {
  switch (type) {
    case '90':
      return Math.floor(price) + 0.90;
    case '50':
      return Math.ceil(price * 2) / 2; // Rounds up to nearest 0.50
    case 'none':
      return Number(price.toFixed(2)); // Ensure we don't get floating point errors
    default:
      return Number(price.toFixed(2));
  }
};

export const calculateTotals = (products: Product[], impostoEntrada: number) => {
  return products.reduce((acc, product) => {
    const custoComDesconto = calculateCustoComDesconto(product);
    const custoLiquido = calculateCustoLiquido(product, impostoEntrada);
    return {
      totalBruto: acc.totalBruto + product.totalPrice,
      totalDesconto: acc.totalDesconto + product.discount,
      totalLiquido: acc.totalLiquido + product.netPrice,
      totalCustoLiquido: acc.totalCustoLiquido + custoLiquido,
    };
  }, {
    totalBruto: 0,
    totalDesconto: 0,
    totalLiquido: 0,
    totalCustoLiquido: 0,
  });
};

// Função para calcular o frete proporcional por item
export const calcularFreteProporcional = (
  products: Product[],
  valorFrete: number,
  impostoEntrada: number
): number[] => {
  // Primeiro, calcula o custo líquido de cada item
  const custosLiquidos = products.map(p => calculateCustoLiquido(p, impostoEntrada));
  const totalCustoLiquido = custosLiquidos.reduce((acc, v) => acc + v, 0);
  if (totalCustoLiquido === 0) return products.map(() => 0);
  // Rateia o frete proporcionalmente ao custo líquido
  return custosLiquidos.map(custo => (custo / totalCustoLiquido) * valorFrete);
};
