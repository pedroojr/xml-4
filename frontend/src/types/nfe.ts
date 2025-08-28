export interface Product {
  codigo: string;
  descricao: string;
  ncm: string;
  cfop: string;
  unidade: string;
  quantidade: number;
  valorUnitario: number;
  valorTotal: number;
  baseCalculoICMS: number;
  valorICMS: number;
  aliquotaICMS: number;
  baseCalculoIPI: number;
  valorIPI: number;
  aliquotaIPI: number;
  xapuriPrice?: number;
  epitaPrice?: number;
  code: string;
  name: string;
  ean?: string;
  reference?: string;
  brand?: string;
  totalPrice: number;
  netPrice: number;
  discount: number;
  quantity: number;
  imageUrl?: string;
  tags?: string[];
  salePrice?: number;
  uom?: string;
  color?: string;
  size?: string;
  fornecedor?: string;
  descricao_complementar?: string;
  unitPrice: number;
  freteProporcional?: number;
  custoExtra?: number;
}

export interface NFE {
  id: string;
  data: string;
  numero: string;
  chaveNFE: string;
  valorTotal: number;
  totalImpostos: number;
  quantidadeTotal: number;
  dataEmissao: string;
  fornecedor: string;
  cnpjFornecedor: string;
  produtos: Product[];
  isFavorite?: boolean;
  itens?: number;
  valor?: number;
  brandName?: string;
  invoiceNumber?: string;
  impostoEntrada: number;
}

export interface NFEItem {
  id: string;
  codigo: string;
  descricao: string;
  quantidade: number;
  valor: number;
  unidade: string;
  ncm: string;
  cfop: string;
  impostos: {
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
