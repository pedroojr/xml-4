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
    order: 2
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
    order: 4
  },
  { 
    id: 'ean', 
    header: 'EAN', 
    initiallyVisible: true,
    width: 'w-fit',
    minWidth: 120,
    order: 5
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
    order: 9
  },
  { 
    id: 'quantity', 
    header: 'Qtd.', 
    initiallyVisible: true, 
    alignment: 'right',
    width: 'w-fit',
    minWidth: 80,
    order: 10,
    format: (value: number) => value.toLocaleString()
  },
  { 
    id: 'unitPrice', 
    header: 'Custo Bruto', 
    initiallyVisible: true, 
    alignment: 'right',
    width: 'w-fit',
    minWidth: 112,
    order: 11,
    format: (value: number) => value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
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
      const unitDiscount = product.quantity > 0 ? product.discount / product.quantity : 0;
      return product.unitPrice - unitDiscount;
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
    format: (value: number) => value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
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
      const unitDiscount = product.quantity > 0 ? product.discount / product.quantity : 0;
      const custoComDesconto = product.unitPrice - unitDiscount;
      // Aqui assumimos que o impostoEntrada está disponível globalmente ou é passado como parâmetro
      // O valor real será calculado no ProductTable.tsx
      return custoComDesconto; // O valor real com imposto será calculado no ProductTable
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
    getValue: (product: Product) => product.quantity > 0 ? product.discount / product.quantity : 0
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
