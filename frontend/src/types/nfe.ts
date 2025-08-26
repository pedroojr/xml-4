export interface Product {
  codigo: string;
  descricao: string;
  ncm: string;
  cfop: string;
  unidade: string;
  quantidade: number;
  valorUnitario: number;
  valorTotal: number; // valor total do XML
  baseCalculoICMS: number;
  valorICMS: number;
  aliquotaICMS: number;
  baseCalculoIPI: number;
  valorIPI: number;
  aliquotaIPI: number;
  xapuriPrice?: number;
  epitaPrice?: number;
  ean?: string;
  reference?: string;
  brand?: string;
  netPrice: number; // total líquido (valorTotal - discount)
  discount: number;
  imageUrl?: string;
  tags?: string[];
  salePrice: number; // preço de venda calculado
  color?: string;
  size?: string;
  fornecedor?: string;
  descricao_complementar?: string;
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
  fornecedor: string;
  hiddenItems?: Set<number>;
  xapuriMarkup?: number;
  epitaMarkup?: number;
  roundingType?: string;
}
