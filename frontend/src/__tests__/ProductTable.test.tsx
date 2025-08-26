import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { vi } from 'vitest';
import { ProductTable } from '@/components/product-preview/ProductTable';
import { getDefaultColumns } from '@/components/product-preview/types/column';
import { Product } from '@/types/nfe';
import { formatCurrency } from '@/utils/formatters';

vi.mock('@/hooks/useNFEStorage', () => ({
  useNFEStorage: () => ({ updateProdutoCustoExtra: vi.fn() })
}));

vi.mock('sonner', () => ({
  toast: { success: vi.fn(), error: vi.fn() }
}));

vi.mock('react-resizable', () => ({
  ResizableBox: ({ children }: { children: React.ReactNode }) => <div>{children}</div>
}));

vi.mock('@/components/product-preview/ProductFilter', () => ({
  ProductFilter: ({ onFilterChange }: any) => (
    <input
      aria-label="Buscar em todas as colunas"
      onChange={(e: any) =>
        onFilterChange({ searchTerm: e.target.value, showOnlyWithImages: false })
      }
    />
  ),
}));

describe('ProductTable', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  const columns = getDefaultColumns().filter((c) =>
    ['code', 'name', 'quantity', 'unitPrice', 'totalPrice'].includes(c.id)
  );
  const visibleColumns = new Set(columns.map((c) => c.id));

  const products: Product[] = [
    {
      codigo: '001',
      descricao: 'Produto A',
      ncm: '',
      cfop: '',
      unidade: '',
      quantidade: 2,
      valorUnitario: 10,
      valorTotal: 20,
      baseCalculoICMS: 0,
      valorICMS: 0,
      aliquotaICMS: 0,
      baseCalculoIPI: 0,
      valorIPI: 0,
      aliquotaIPI: 0,
      xapuriPrice: 0,
      epitaPrice: 0,
      code: '001',
      name: 'Produto A',
      totalPrice: 20,
      netPrice: 20,
      discount: 0,
      quantity: 2,
      unitPrice: 10,
      salePrice: 0
    } as any,
    {
      codigo: '002',
      descricao: 'Produto B',
      ncm: '',
      cfop: '',
      unidade: '',
      quantidade: 1,
      valorUnitario: 5,
      valorTotal: 5,
      baseCalculoICMS: 0,
      valorICMS: 0,
      aliquotaICMS: 0,
      baseCalculoIPI: 0,
      valorIPI: 0,
      aliquotaIPI: 0,
      xapuriPrice: 0,
      epitaPrice: 0,
      code: '002',
      name: 'Produto B',
      totalPrice: 5,
      netPrice: 5,
      discount: 0,
      quantity: 1,
      unitPrice: 5,
      salePrice: 0
    } as any
  ];

  const defaultProps = {
    products,
    visibleColumns,
    columns,
    hiddenItems: new Set<number>(),
    handleToggleVisibility: () => {},
    handleImageSearch: () => {},
    xapuriMarkup: 0,
    epitaMarkup: 0,
    roundingType: 'none' as const,
    impostoEntrada: 0,
    onImpostoEntradaChange: () => {},
    onXapuriMarkupChange: () => {},
    onEpitaMarkupChange: () => {},
    onRoundingTypeChange: () => {}
  };

  it('renders columns and formats values', () => {
    render(<ProductTable {...defaultProps} />);

    expect(screen.getByText('Código')).toBeInTheDocument();
    expect(screen.getByText('Descrição')).toBeInTheDocument();
    const cells = screen.getAllByRole('cell');
    expect(cells.some(c => c.textContent?.includes(formatCurrency(20)))).toBe(true);
    expect(cells.some(c => c.textContent?.includes(formatCurrency(5)))).toBe(true);
  });

  it('filters products based on search term', async () => {
    render(<ProductTable {...defaultProps} />);

    const searchInput = screen.getByLabelText('Buscar em todas as colunas');
    fireEvent.change(searchInput, { target: { value: 'Produto B' } });

    await waitFor(() => {
      expect(screen.queryByText('Produto A')).not.toBeInTheDocument();
    });
    expect(screen.getByText('Produto B')).toBeInTheDocument();
  });
});
