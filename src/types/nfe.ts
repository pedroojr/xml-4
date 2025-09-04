export interface Product {
  code: string;
  description: string;
  ncm: string;
  cfop: string;
  unit: string;
  quantity: number;
  unitPrice: number;
  totalPrice: number;
  icmsBase: number;
  icmsValue: number;
  icmsRate: number;
  ipiBase: number;
  ipiValue: number;
  ipiRate: number;
  xapuriPrice?: number;
  epitaPrice?: number;
  ean?: string;
  reference?: string;
  brand?: string;
  netPrice: number;
  discount: number;
  imageUrl?: string;
  tags?: string[];
  salePrice?: number;
  uom?: string;
  color?: string;
  size?: string;
  supplier?: string;
  additionalDescription?: string;
  freightShare?: number;
  extraCost?: number;
}

export interface NFE {
  id: string;
  date: string;
  number: string;
  nfeKey: string;
  totalValue: number;
  totalTaxes: number;
  totalQuantity: number;
  issueDate: string;
  supplier: string;
  supplierCnpj: string;
  products: Product[];
  isFavorite?: boolean;
  items?: number;
  value?: number;
  brandName?: string;
  invoiceNumber?: string;
  entryTax: number;
}

export interface NFEItem {
  id: string;
  code: string;
  description: string;
  quantity: number;
  value: number;
  unit: string;
  ncm: string;
  cfop: string;
  taxes: {
    icms: number;
    ipi: number;
    pis: number;
    cofins: number;
  };
}

export interface SavedNFe {
  id: string;
  products: Product[];
  date: string;
  name: string;
  invoiceNumber?: string;
  brandName?: string;
  hiddenItems?: Set<number>;
  xapuriMarkup?: number;
  epitaMarkup?: number;
  roundingType?: string;
}
