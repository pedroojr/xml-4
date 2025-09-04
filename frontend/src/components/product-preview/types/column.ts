import { Product } from '../../../types/nfe';

export interface Column {
  id: string;
  header: string;
  initiallyVisible: boolean;
  alignment?: 'left' | 'right';
  width?: string;
  format?: (value: any, product?: Product) => string;
  getValue?: (product: Product) => any;
  minWidth?: number;
  order?: number; // Add an order property to track column position
}

export const getDefaultColumns = (): Column[] => [
  { 
    id: 'image', 
    header: 'Imagem', 
    initiallyVisible: true,
    width: 'w-fit',
    minWidth: 48,
    order: 0
  },
  { 
    id: 'code', 
    header: 'Código', 
    initiallyVisible: true,
    width: 'w-fit',
    minWidth: 100,
    order: 1
  },
  { 
    id: 'name', 
    header: 'Descrição', 
    initiallyVisible: true,
    width: 'w-fit',
    minWidth: 300,
    order: 2,
    getValue: (product: Product) => product.descricao || product.name || ''
  },
  { 
    id: 'size', 
    header: 'Tam.', 
    initiallyVisible: true,
    width: 'w-fit',
    minWidth: 64,
    order: 3
  },
  { 
    id: 'reference', 
    header: 'Referência', 
    initiallyVisible: true,
    width: 'w-fit',
    minWidth: 120,
    order: 4,
    getValue: (product: Product) => product.reference || product.codigo || product.code || ''
  },
  { 
    id: 'ean', 
    header: 'EAN', 
    initiallyVisible: true,
    width: 'w-fit',
    minWidth: 120,
    order: 5,
    getValue: (product: Product) => product.ean || ''
  },
  { 
    id: 'color', 
    header: 'Cor', 
    initiallyVisible: true,
    width: 'w-fit',
    minWidth: 96,
    order: 6
  },
  { 
    id: 'ncm', 
    header: 'NCM', 
    initiallyVisible: true,
    width: 'w-fit',
    minWidth: 96,
    order: 7
  },
  { 
    id: 'cfop', 
    header: 'CFOP', 
    initiallyVisible: true,
    width: 'w-fit',
    minWidth: 80,
    order: 8
  },
  { 
    id: 'uom', 
    header: 'UN', 
    initiallyVisible: true,
    width: 'w-fit',
    minWidth: 56,
    order: 9,
    getValue: (product: Product) => product.uom || product.un || product.unidade || ''
  },
  { 
    id: 'quantity', 
    header: 'Qtd.', 
    initiallyVisible: true, 
    alignment: 'right',
    width: 'w-fit',
    minWidth: 80,
    order: 10,
    format: (value: number) => value.toLocaleString(),
    getValue: (product: Product) => (product.quantidade ?? product.quantity ?? 0)
  },
  { 
    id: 'unitPrice', 
    header: 'Custo Bruto', 
    initiallyVisible: true, 
    alignment: 'right',
    width: 'w-fit',
    minWidth: 112,
    order: 11,
    format: (value: number) => value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' }),
    getValue: (product: Product) => (product.valorUnitario ?? product.unitPrice ?? 0)
  },
  { 
    id: 'unitPriceWithDiscount', 
    header: 'Custo c/ desconto', 
    initiallyVisible: true, 
    alignment: 'right',
    width: 'w-fit',
    minWidth: 112,
    order: 12,
    format: (value: number) => value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' }),
    getValue: (product: Product) => {
      const quantidade = (product.quantidade ?? product.quantity ?? 0);
      const unitDiscount = quantidade > 0 ? (product.discount || 0) / quantidade : 0;
      const unitPrice = (product.valorUnitario ?? product.unitPrice ?? 0);
      return unitPrice - unitDiscount;
    }
  },
  { 
    id: 'totalPrice', 
    header: 'Total', 
    initiallyVisible: true, 
    alignment: 'right',
    width: 'w-fit',
    minWidth: 112,
    order: 13,
    format: (value: number) => value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' }),
    getValue: (product: Product) => (product.valorTotal ?? product.totalPrice ?? 0)
  },
  { 
    id: 'netPrice', 
    header: 'Custo Líquido', 
    initiallyVisible: true, 
    alignment: 'right',
    width: 'w-fit',
    minWidth: 112,
    order: 14,
    format: (value: number) => value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' }),
    getValue: (product: Product) => {
      const quantidade = (product.quantidade ?? product.quantity ?? 0);
      const unitDiscount = quantidade > 0 ? (product.discount || 0) / quantidade : 0;
      const unitPrice = (product.valorUnitario ?? product.unitPrice ?? 0);
      // O valor real com imposto será calculado no ProductTable
      return unitPrice - unitDiscount;
    }
  },
  { 
    id: 'freteProporcional', 
    header: 'Frete Proporcional', 
    initiallyVisible: true, 
    alignment: 'right',
    width: 'w-fit',
    minWidth: 112,
    order: 14.5,
    format: (value: number) => value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' }),
    getValue: (product: Product) => product.freteProporcional ?? 0
  },
  {
    id: 'custoExtra',
    header: 'Custo Extra',
    initiallyVisible: true,
    alignment: 'right',
    width: 'w-fit',
    minWidth: 112,
    order: 14.6,
    format: (value: number) => value?.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' }) || '',
    getValue: (product: Product) => product.custoExtra ?? 0
  },
  { 
    id: 'unitDiscount', 
    header: 'Desc. Un.', 
    initiallyVisible: true, 
    alignment: 'right',
    width: 'w-fit',
    minWidth: 112,
    order: 15,
    format: (value: number) => value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' }),
    getValue: (product: Product) => {
      const quantidade = (product.quantidade ?? product.quantity ?? 0);
      return quantidade > 0 ? (product.discount || 0) / quantidade : 0;
    }
  },
  { 
    id: 'xapuriPrice', 
    header: 'Preço Xap.', 
    initiallyVisible: true, 
    alignment: 'right',
    width: 'w-fit',
    minWidth: 112,
    order: 16,
    format: (value: number) => value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
  },
  { 
    id: 'epitaPrice', 
    header: 'Preço Epit.', 
    initiallyVisible: true, 
    alignment: 'right',
    width: 'w-fit',
    minWidth: 112,
    order: 17,
    format: (value: number) => value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
  },
  {
    id: 'descricao_complementar',
    header: 'Descrição Complementar',
    initiallyVisible: false,
    width: 'w-fit',
    minWidth: 350,
    order: 18,
    getValue: (product: Product) => product.descricao_complementar || ''
  }
];

export const compactColumns = [
  'name',
  'ean',
  'quantity',
  'netPrice',
  'xapuriPrice',
  'epitaPrice'
];
