import { Product } from '../../types/nfe';

// Calcula o custo com desconto (Custo Bruto - Desconto Médio)
export const calculateCustoComDesconto = (product: Product): number => {
  const quantity = product.quantity || product.quantidade || 0;
  const unitPrice = product.unitPrice || product.valorUnitario || 0;
  const discount = product.discount || 0;
  
  if (quantity <= 0 || isNaN(quantity) || isNaN(unitPrice) || isNaN(discount)) {
    return unitPrice;
  }
  
  const unitDiscount = discount / quantity;
  return unitPrice - unitDiscount;
};

// Calcula o custo líquido (Custo c/ desconto × (1 + Imposto de Entrada / 100))
export const calculateCustoLiquido = (product: Product, impostoEntrada: number): number => {
  const custoComDesconto = calculateCustoComDesconto(product);
  const imposto = isNaN(impostoEntrada) ? 0 : impostoEntrada;
  
  if (isNaN(custoComDesconto)) {
    return 0;
  }
  
  return custoComDesconto * (1 + (imposto / 100));
};

export const calculateSalePrice = (product: Product, markup: number): number => {
  const netPrice = product.netPrice || 0;
  const markupValue = isNaN(markup) ? 0 : markup;
  
  if (isNaN(netPrice)) {
    return 0;
  }
  
  const markupMultiplier = 1 + markupValue / 100;
  return netPrice * markupMultiplier;
};

export type RoundingType = '90' | '50' | 'none';

export const roundPrice = (price: number, type: RoundingType): number => {
  if (isNaN(price) || price === null || price === undefined) {
    return 0;
  }
  
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
  // Validar entrada
  const safeValorFrete = isNaN(valorFrete) ? 0 : valorFrete;
  const safeImpostoEntrada = isNaN(impostoEntrada) ? 0 : impostoEntrada;
  
  // Primeiro, calcula o custo líquido de cada item
  const custosLiquidos = products.map(p => {
    const custoLiquido = calculateCustoLiquido(p, safeImpostoEntrada);
    return isNaN(custoLiquido) ? 0 : custoLiquido;
  });
  
  const totalCustoLiquido = custosLiquidos.reduce((acc, v) => acc + v, 0);
  if (totalCustoLiquido === 0) return products.map(() => 0);
  
  // Rateia o frete proporcionalmente ao custo líquido
  return custosLiquidos.map(custo => {
    const freteProporcional = (custo / totalCustoLiquido) * safeValorFrete;
    return isNaN(freteProporcional) ? 0 : freteProporcional;
  });
};
