import { Product } from '../../types/nfe';

// Calculates cost with discount (Gross Cost - Average Discount)
export const calculateCostWithDiscount = (product: Product): number => {
  const unitDiscount = product.quantity > 0 ? (product.discount || 0) / product.quantity : 0;
  return product.unitPrice - unitDiscount;
};

// Calculates net cost (Cost with discount × (1 + Entry Tax / 100))
export const calculateNetCost = (product: Product, entryTax: number): number => {
  const costWithDiscount = calculateCostWithDiscount(product);
  return costWithDiscount * (1 + (entryTax / 100));
};

export const calculateSalePrice = (product: Product, markup: number): number => {
  const markupMultiplier = 1 + markup / 100;
  return product.netPrice * markupMultiplier;
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

export const calculateTotals = (products: Product[], entryTax: number) => {
  return products.reduce((acc, product) => {
    const costWithDiscount = calculateCostWithDiscount(product);
    const netCost = calculateNetCost(product, entryTax);
    return {
      grossTotal: acc.grossTotal + product.totalPrice,
      discountTotal: acc.discountTotal + (product.discount || 0),
      netTotal: acc.netTotal + product.netPrice,
      netCostTotal: acc.netCostTotal + netCost,
    };
  }, {
    grossTotal: 0,
    discountTotal: 0,
    netTotal: 0,
    netCostTotal: 0,
  });
};

// Calculates proportional freight per item
export const calculateProportionalFreight = (
  products: Product[],
  freightValue: number,
  entryTax: number
): number[] => {
  // First, calculate the net cost of each item
  const netCosts = products.map(p => calculateNetCost(p, entryTax));
  const totalNetCost = netCosts.reduce((acc, v) => acc + v, 0);
  if (totalNetCost === 0) return products.map(() => 0);
  // Distribute freight proportionally to the net cost
  return netCosts.map(cost => (cost / totalNetCost) * freightValue);
};
