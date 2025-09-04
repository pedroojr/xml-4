export interface Product {
  id?: number;
  nfeId?: string;
  codigo: string;
  code?: string;
  descricao: string;
  ncm?: string;
  cfop?: string;
  unidade?: string;
  uom?: string;
  un?: string;
  quantidade: number;
  valorUnitario: number;
  valorTotal: number;
  baseCalculoICMS?: number;
  valorICMS?: number;
  aliquotaICMS?: number;
  baseCalculoIPI?: number;
  valorIPI?: number;
  aliquotaIPI?: number;
  xapuriPrice?: number;
  epitaPrice?: number;
  name?: string;
  ean?: string;
  reference?: string;
  brand?: string;
  totalPrice?: number;
  netPrice?: number;
  discount?: number;
  quantity?: number;
  imageUrl?: string;
  tags?: string[];
  salePrice?: number;
  color?: string;
  size?: string;
  fornecedor?: string;
  descricao_complementar?: string;
  unitPrice?: number;
  freteProporcional?: number;
  custoExtra?: number;
}

export interface NFE {
  id: string;
  data: string;
  numero: string;
  chaveNFE?: string;
  valorTotal?: number; // Valor total da NFE do XML
  totalImpostos?: number;
  quantidadeTotal?: number;
  dataEmissao?: string;
  fornecedor: string;
  cnpjFornecedor?: string;
  produtos?: Product[];
  isFavorite?: boolean;
  itens?: number;
  valor?: number;
  descontoPercent?: number;
  brandName?: string;
  invoiceNumber?: string;
  impostoEntrada?: number;
  xapuriMarkup?: number;
  epitaMarkup?: number;
  roundingType?: '90' | '50' | 'none';
  valorFrete?: number;
  createdAt?: string;
  updatedAt?: string;
  produtosCount?: number;
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
