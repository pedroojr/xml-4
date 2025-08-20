import React, { useState, useEffect, useCallback } from 'react';
import { Table, TableBody, TableHead, TableHeader, TableRow, TableCell } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Eye, EyeOff, Image as ImageIcon, Copy, Check, ArrowLeftRight, Search, Filter } from "lucide-react";
import { Product } from '../../types/nfe';
import { Column } from './types/column';
import { calculateSalePrice, roundPrice, RoundingType, calculateCustoComDesconto, calculateCustoLiquido } from './productCalculations';
import { toast } from "sonner";
import { formatNumberForCopy, formatCurrency, formatNumber } from '../../utils/formatters';
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { extrairTamanhoDaDescricao, extrairTamanhoDaReferencia } from '../../utils/sizeParser';
import { ResizableBox } from 'react-resizable';
import 'react-resizable/css/styles.css';
import { ProductFilter, ProductFilters } from './ProductFilter';
import { copyNumberToClipboard, copyToClipboard } from '@/utils/clipboard';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
  TooltipProvider as Provider,
} from "@/components/ui/tooltip";
import { Copiavel } from '@/components/ui/copiavel';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { useNFEStorage } from '@/hooks/useNFEStorage';

interface ProductTableProps {
  products: Product[];
  visibleColumns: Set<string>;
  columns: Column[];
  hiddenItems: Set<number>;
  handleToggleVisibility: (index: number) => void;
  handleImageSearch: (index: number, product: Product) => void;
  xapuriMarkup: number;
  epitaMarkup: number;
  roundingType: RoundingType;
  impostoEntrada: number;
  onImpostoEntradaChange: (value: number) => void;
  onXapuriMarkupChange: (value: number) => void;
  onEpitaMarkupChange: (value: number) => void;
  onRoundingTypeChange: (value: RoundingType) => void;
}

// Adiciona nfeId ao tipo Product localmente para evitar erro de tipagem
interface ProductWithNfeId extends Product {
  nfeId?: string;
}

const CellContent: React.FC<{
  value: any;
  column: Column;
}> = ({ value, column }) => {
  const getFormatacao = () => {
    if (typeof value === 'number') {
      if (column.id.toLowerCase().includes('price') || 
          column.id.toLowerCase().includes('valor') || 
          column.id === 'unitPrice' || 
          column.id === 'netPrice') {
        return 'moeda';
      }
      return 'numero';
    }
    return 'texto';
  };

  return (
    <Copiavel
      valor={value}
      formatacao={getFormatacao()}
      className={cn(
        "w-full flex items-center justify-center",
        column.id === 'name' && "whitespace-normal text-center"
      )}
    />
  );
};

const ColumnFilterButton: React.FC<{
  column: Column;
  values: string[];
  selectedValues: Set<string>;
  onFilter: (values: Set<string>) => void;
}> = ({ column, values, selectedValues, onFilter }) => {
  const [searchText, setSearchText] = useState('');
  const [localSelected, setLocalSelected] = useState<Set<string>>(selectedValues);
  const [filteredValues, setFilteredValues] = useState<string[]>(values);

  useEffect(() => {
    const filtered = values.filter((value) =>
      String(value).toLowerCase().includes(searchText.toLowerCase())
    );
    setFilteredValues(filtered);
  }, [searchText, values]);

  const handleSelectAll = () => {
    setLocalSelected(new Set(filteredValues));
  };

  const handleClearAll = () => {
    setLocalSelected(new Set());
  };

  const handleToggleValue = (value: string) => {
    const newSelected = new Set(localSelected);
    if (newSelected.has(value)) {
      newSelected.delete(value);
    } else {
      newSelected.add(value);
    }
    setLocalSelected(newSelected);
  };

  const handleApply = () => {
    onFilter(localSelected);
  };

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button
          variant={selectedValues.size < values.length ? "default" : "ghost"}
          size="icon"
          className={cn(
            "h-8 w-8 p-0",
            selectedValues.size < values.length ? "opacity-100" : "opacity-0 group-hover:opacity-100",
            "transition-opacity duration-200"
          )}
        >
          <Filter className="h-4 w-4" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-80">
        <div className="space-y-4">
          <div className="space-y-2">
            <Input
              placeholder="Buscar valores..."
              value={searchText}
              onChange={(e) => setSearchText(e.target.value)}
            />
          </div>
          
          <div className="flex space-x-2">
            <Button
              variant="outline"
              size="sm"
              onClick={handleSelectAll}
              className="flex-1"
            >
              Selecionar tudo
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={handleClearAll}
              className="flex-1"
            >
              Limpar
            </Button>
          </div>

          <div className="max-h-[200px] overflow-auto space-y-1">
            {filteredValues.map((value) => (
              <div key={value} className="flex items-center space-x-2">
                <Checkbox
                  checked={localSelected.has(value)}
                  onCheckedChange={() => handleToggleValue(value)}
                />
                <span className="text-sm">
                  {value || '(Espaços em branco)'}
                </span>
              </div>
            ))}
          </div>

          <div className="flex justify-between items-center">
            <span className="text-sm text-muted-foreground">
              {localSelected.size} de {values.length} selecionados
            </span>
            <Button size="sm" onClick={handleApply}>
              Aplicar
            </Button>
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
};

const renderColumnHeader = (column: Column, products: Product[], visibleColumns: Set<string>, handleDragStart: (columnId: string) => void, handleDragOver: (columnId: string) => void, handleDragEnd: () => void, draggedColumn: string | null, dragOverColumn: string | null, columnFilters: Record<string, Set<string>>, handleFilter: (columnId: string, selectedValues: Set<string>) => void) => {
  const uniqueValues = Array.from(new Set(products.map(p => String(p[column.id] || ''))));
  const selectedValues = columnFilters[column.id] || new Set(uniqueValues);

  return (
    <div className="flex items-center justify-between w-full relative">
      <div
        className="flex items-center space-x-2 cursor-move flex-1"
        draggable
        onDragStart={() => handleDragStart(column.id)}
        onDragOver={() => handleDragOver(column.id)}
        onDragEnd={handleDragEnd}
        style={{
          opacity: draggedColumn === column.id ? 0.5 : 1,
          background: dragOverColumn === column.id ? 'rgba(0,0,0,0.05)' : 'transparent'
        }}
      >
        <span>{column.header}</span>
      </div>
      
      <div className="flex items-center space-x-1">
        {column.id !== 'image' && (
          <ColumnFilterButton
            column={column}
            values={uniqueValues}
            selectedValues={selectedValues}
            onFilter={(values) => handleFilter(column.id, values)}
          />
        )}
        
        {column.id !== 'image' && (
          <div
            className="absolute right-0 top-0 bottom-0 w-2 cursor-col-resize hover:bg-slate-300/50"
            onMouseDown={(e) => {
              e.preventDefault();
              const startX = e.pageX;
              const startWidth = columnWidths[column.id] || column.minWidth || getMinWidth(column.id);
              
              const handleMouseMove = (e: MouseEvent) => {
                const width = Math.max(
                  getMinWidth(column.id),
                  startWidth + (e.pageX - startX)
                );
                handleColumnResize(column.id, width);
              };
              
              const handleMouseUp = () => {
                document.removeEventListener('mousemove', handleMouseMove);
                document.removeEventListener('mouseup', handleMouseUp);
              };
              
              document.addEventListener('mousemove', handleMouseMove);
              document.addEventListener('mouseup', handleMouseUp);
            }}
          />
        )}
      </div>
    </div>
  );
};

export const ProductTable: React.FC<ProductTableProps> = ({
  products,
  visibleColumns,
  columns,
  hiddenItems,
  handleToggleVisibility,
  handleImageSearch,
  xapuriMarkup,
  epitaMarkup,
  roundingType,
  impostoEntrada,
  onImpostoEntradaChange,
  onXapuriMarkupChange,
  onEpitaMarkupChange,
  onRoundingTypeChange,
}) => {
  const { updateProdutoCustoExtra } = useNFEStorage();
  const [showHidden, setShowHidden] = useState(() => {
    const saved = localStorage.getItem('showHidden');
    return saved ? JSON.parse(saved) : false;
  });
  const [filters, setFilters] = useState<ProductFilters>({
    searchTerm: '',
    showOnlyWithImages: false
  });
  const [copiedField, setCopiedField] = useState<string>('');
  const [columnWidths, setColumnWidths] = useState<Record<string, number>>(() => {
    const saved = localStorage.getItem('columnWidths');
    return saved ? JSON.parse(saved) : {};
  });
  const [sortedColumns, setSortedColumns] = useState<Column[]>(() => {
    const savedColumnOrder = localStorage.getItem('columnOrder');
    if (savedColumnOrder) {
      const orderMap = JSON.parse(savedColumnOrder) as Record<string, number>;
      return [...columns].sort((a, b) => (orderMap[a.id] || a.order || 0) - (orderMap[b.id] || b.order || 0));
    }
    return [...columns].sort((a, b) => (a.order || 0) - (b.order || 0));
  });
  const [draggedColumn, setDraggedColumn] = useState<string | null>(null);
  const [dragOverColumn, setDragOverColumn] = useState<string | null>(null);
  const [columnFilters, setColumnFilters] = useState<Record<string, Set<string>>>({});
  // Estado local para custo extra de cada produto
  const [custoExtraMap, setCustoExtraMap] = useState<{ [codigo: string]: string }>(() => {
    const initial: { [codigo: string]: string } = {};
    products.forEach(p => {
      initial[p.codigo] = p.custoExtra !== undefined && p.custoExtra !== null ? String(p.custoExtra) : '';
    });
    return initial;
  });

  useEffect(() => {
    localStorage.setItem('showHidden', JSON.stringify(showHidden));
  }, [showHidden]);

  // Effect to persist column order
  useEffect(() => {
    const orderMap = sortedColumns.reduce((acc, col, index) => {
      acc[col.id] = index;
      return acc;
    }, {} as Record<string, number>);
    
    localStorage.setItem('columnOrder', JSON.stringify(orderMap));
  }, [sortedColumns]);

  const handleColumnResize = useCallback((columnId: string, width: number) => {
    const newWidths = { ...columnWidths, [columnId]: width };
    setColumnWidths(newWidths);
    localStorage.setItem('columnWidths', JSON.stringify(newWidths));
  }, [columnWidths]);

  const handleCopyToClipboard = async (value: any, column: Column, field: string) => {
    try {
      const formattedValue = formatValueForCopy(value, column);
      await navigator.clipboard.writeText(formattedValue);
      setCopiedField(field);
      toast.success('Copiado para a área de transferência');
      setTimeout(() => setCopiedField(''), 2000);
    } catch (err) {
      toast.error('Erro ao copiar');
    }
  };

  const formatValueForCopy = (value: any, column: Column): string => {
    if (typeof value === 'number') {
      if (column.id.toLowerCase().includes('price') || 
          column.id.toLowerCase().includes('discount') || 
          column.id === 'unitPrice' || 
          column.id === 'netPrice') {
        return formatNumberForCopy(value, 2);
      }
      if (column.id === 'quantity') {
        return formatNumberForCopy(value, 4);
      }
    }
    return value?.toString() || '';
  };

  const handleDragStart = (columnId: string) => {
    setDraggedColumn(columnId);
  };

  const handleDragOver = (columnId: string) => {
    if (draggedColumn && draggedColumn !== columnId) {
      setDragOverColumn(columnId);
    }
  };

  const handleDragEnd = () => {
    if (draggedColumn && dragOverColumn) {
      const draggedIndex = sortedColumns.findIndex(col => col.id === draggedColumn);
      const dropIndex = sortedColumns.findIndex(col => col.id === dragOverColumn);
      
      if (draggedIndex !== -1 && dropIndex !== -1 && draggedIndex !== dropIndex) {
        const newColumns = [...sortedColumns];
        const [draggedItem] = newColumns.splice(draggedIndex, 1);
        newColumns.splice(dropIndex, 0, draggedItem);
        
        setSortedColumns(newColumns);
        
        // Salvar a nova ordem no localStorage
        const orderMap = newColumns.reduce((acc, col, index) => {
          acc[col.id] = index;
          return acc;
        }, {} as Record<string, number>);
        
        localStorage.setItem('columnOrder', JSON.stringify(orderMap));
        toast.success(`Coluna "${draggedItem.header}" movida com sucesso`);
      }
    }
    
    setDraggedColumn(null);
    setDragOverColumn(null);
  };

  const handleFilter = (columnId: string, selectedValues: Set<string>) => {
    setColumnFilters(prev => ({
      ...prev,
      [columnId]: selectedValues
    }));
  };

  let filteredProducts = products.filter(product => {
    const isItemHidden = hiddenItems.has(products.indexOf(product));

    // Se mostrar apenas ocultados, filtra só os ocultos
    if (showHidden) {
      if (!isItemHidden) return false;
    } else {
      // Se não mostrar ocultados, filtra só os visíveis (exceto na busca)
      if (!filters.searchTerm && isItemHidden) return false;
    }

    if (filters.searchTerm) {
      // Divide o termo de busca em múltiplos termos separados por espaço
      const searchTerms = filters.searchTerm.toLowerCase().split(' ').filter(term => term.trim() !== '');
      // Verifica se todos os termos de busca estão presentes em algum campo do produto
      const matchesAllTerms = searchTerms.every(term => {
        return (
          product.code?.toLowerCase().includes(term) ||
          product.name?.toLowerCase().includes(term) ||
          product.ean?.toLowerCase().includes(term) ||
          product.reference?.toLowerCase().includes(term) ||
          product.descricao_complementar?.toLowerCase().includes(term)
        );
      });
      if (!matchesAllTerms) return false;
      // Em modo de busca, mostra todos os que passaram no filtro acima
    }

    // Filtro por produtos com imagem
    if (filters.showOnlyWithImages) {
      if (!product.imageUrl) return false;
    }

    // Column filters
    const passesColumnFilters = Object.entries(columnFilters).every(([columnId, selectedValues]) => {
      if (selectedValues.size === 0) return true;
      const value = String(product[columnId] || '');
      return selectedValues.has(value);
    });

    return passesColumnFilters;
  });

  // Se houver busca e NÃO estiver mostrando apenas ocultos, ordenar para ocultos ficarem no final
  const sortedFilteredProducts = (filters.searchTerm && !showHidden)
    ? filteredProducts.sort((a, b) => {
        const aHidden = hiddenItems.has(products.indexOf(a));
        const bHidden = hiddenItems.has(products.indexOf(b));
        if (aHidden === bHidden) return 0;
        if (aHidden) return 1;
        return -1;
      })
    : filteredProducts;

  // Calcular a média de desconto em percentual
  const calculateAverageDiscountPercent = () => {
    if (products.length === 0) return 0;
    
    const totalOriginalPrice = products.reduce((acc, p) => acc + p.totalPrice, 0);
    const totalDiscount = products.reduce((acc, p) => acc + p.discount, 0);
    
    return totalOriginalPrice > 0 ? (totalDiscount / totalOriginalPrice) * 100 : 0;
  };

  // Calcular a quantidade total de unidades
  const calculateTotalQuantity = (prods: Product[]) => {
    return prods.reduce((acc, p) => acc + p.quantity, 0);
  };

  // Função para calcular o valor líquido total (Valor Total - Desconto Total)
  const calculateTotalNetValue = (prods: Product[]) => {
    const totalValue = prods.reduce((acc, p) => acc + p.totalPrice, 0);
    const totalDiscount = prods.reduce((acc, p) => acc + p.discount, 0);
    return totalValue - totalDiscount;
  };

  const averageDiscountPercent = calculateAverageDiscountPercent();
  const totalQuantity = calculateTotalQuantity(products);
  const filteredTotalQuantity = calculateTotalQuantity(filteredProducts);

  const handleFilterChange = (newFilters: ProductFilters) => {
    setFilters(newFilters);
  };

  // Efeito para recalcular os valores quando o imposto de entrada mudar
  useEffect(() => {
    // Força a re-renderização da tabela quando o imposto de entrada mudar
    setFilters(prevFilters => ({ ...prevFilters }));
  }, [impostoEntrada]);

  const handleCopyValue = async (value: any) => {
    try {
      let success;
      let displayValue = value;
      
      if (typeof value === 'number') {
        success = await copyNumberToClipboard(value, 2);
        displayValue = formatCurrency(value);
      } else if (value !== null && value !== undefined) {
        success = await copyToClipboard(String(value));
      } else {
        toast.error('Valor inválido para cópia');
        return;
      }

      if (success) {
        toast.success(`Copiado: ${displayValue}`, {
          duration: 1500,
          position: 'bottom-right',
          icon: <Check className="h-4 w-4 text-green-500" />,
          className: 'bg-green-50 text-green-800 border border-green-200'
        });
      } else {
        throw new Error('Falha ao copiar valor');
      }
    } catch (error) {
      console.error('Erro ao copiar:', error);
      toast.error('Erro ao copiar valor para a área de transferência', {
        icon: <Copy className="h-4 w-4 text-red-500" />,
        className: 'bg-red-50 text-red-800 border border-red-200'
      });
    }
  };

  const calcularCustoComImposto = (custoLiquido: number): number => {
    return custoLiquido * (1 + (impostoEntrada / 100));
  };

  return (
    <div className="w-full space-y-4">
      <ProductFilter onFilterChange={handleFilterChange} products={products} />
      <div className="bg-slate-50/80 p-3 rounded-lg border border-slate-200">
        <div className="space-y-3">
          <div className="flex items-center space-x-2">
            <Switch
              id="show-hidden"
              checked={showHidden}
              onCheckedChange={setShowHidden}
            />
            <Label htmlFor="show-hidden" className="text-sm font-medium">
              Mostrar apenas ocultados
            </Label>
          </div>
          
          <div className="grid grid-cols-1 sm:grid-cols-5 gap-3">
            <Card className="bg-white/50">
              <CardContent className="p-3">
                <div className="text-xs font-medium text-muted-foreground">Quantidade</div>
                <div className="text-sm font-medium">
                  <span className="font-semibold">{sortedFilteredProducts.length}</span>
                </div>
              </CardContent>
            </Card>
            <Card className="bg-white/50">
              <CardContent className="p-3">
                <div className="text-xs font-medium text-muted-foreground">Quantidade de Unidades</div>
                <div className="text-sm font-medium tabular-nums">
                  <span className="font-semibold">{Math.floor(filteredTotalQuantity)}</span>
                </div>
              </CardContent>
            </Card>
            <Card className="bg-white/50">
              <CardContent className="p-3">
                <div className="text-xs font-medium text-muted-foreground">Valor Total</div>
                <div className="text-sm font-medium tabular-nums">
                  {sortedFilteredProducts.reduce((acc, p) => acc + p.totalPrice, 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                </div>
              </CardContent>
            </Card>
            <Card className="bg-white/50">
              <CardContent className="p-3">
                <div className="text-xs font-medium text-muted-foreground">Valor Líquido</div>
                <div className="text-sm font-medium tabular-nums">
                  {calculateTotalNetValue(sortedFilteredProducts).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                </div>
              </CardContent>
            </Card>
            <Card className="bg-white/50">
              <CardContent className="p-3">
                <div className="text-xs font-medium text-muted-foreground">Desconto Médio</div>
                <div className="text-sm font-medium tabular-nums">{averageDiscountPercent.toFixed(1)}%</div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>

      <div className="border rounded-lg overflow-auto">
        <Table>
          <TableHeader>
            <TableRow className="bg-slate-50/80">
              {sortedColumns.map((column) => (
                visibleColumns.has(column.id) && (
                  <TableHead
                    key={column.id}
                    className={cn(
                      "h-9 px-3 text-xs font-medium select-none group relative text-center",
                      column.id === 'xapuriPrice' && "bg-blue-50/50 text-blue-700",
                      column.id === 'epitaPrice' && "bg-emerald-50/50 text-emerald-700",
                      draggedColumn === column.id && "bg-slate-200",
                      dragOverColumn === column.id && "bg-slate-100"
                    )}
                    style={{ 
                      width: columnWidths[column.id] || column.minWidth,
                      minWidth: getMinWidth(column.id)
                    }}
                    draggable
                    onDragStart={() => handleDragStart(column.id)}
                    onDragOver={(e) => {
                      e.preventDefault();
                      handleDragOver(column.id);
                    }}
                    onDrop={(e) => {
                      e.preventDefault();
                      handleDragEnd();
                    }}
                  >
                    {renderColumnHeader(column, products, visibleColumns, handleDragStart, handleDragOver, handleDragEnd, draggedColumn, dragOverColumn, columnFilters, handleFilter)}
                  </TableHead>
                )
              ))}
              <TableHead className="w-12 text-center text-xs font-medium">
                Ações
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {sortedFilteredProducts.map((product: ProductWithNfeId, index) => {
              const productIndex = products.indexOf(product);
              const isHidden = hiddenItems.has(productIndex);

              // Calcular o custo com desconto (Custo Bruto - Desconto Médio)
              const custoComDesconto = calculateCustoComDesconto(product);
              
              // Calcular o custo líquido (Custo c/ desconto + Imposto de Entrada)
              const custoLiquido = calculateCustoLiquido(product, impostoEntrada);
              // Novo: custo líquido + frete proporcional
              const custoLiquidoComFrete = custoLiquido + (product.freteProporcional || 0);
              
              // Calcular preços de venda com base no custo líquido + frete proporcional
              const xapuriPrice = roundPrice(calculateSalePrice({ ...product, netPrice: custoLiquidoComFrete }, xapuriMarkup), roundingType);
              const epitaPrice = roundPrice(calculateSalePrice({ ...product, netPrice: custoLiquidoComFrete }, epitaMarkup), roundingType);
              
              const tamanhoReferencia = extrairTamanhoDaReferencia(product.reference);
              const tamanhoDescricao = extrairTamanhoDaDescricao(product.name);
              const tamanho = tamanhoReferencia || tamanhoDescricao || '';

              return (
                <TableRow 
                  key={`${product.code}-${productIndex}`}
                  className={cn(
                    "h-10 hover:bg-slate-50/80 transition-colors",
                    isHidden && "opacity-60"
                  )}
                >
                  {sortedColumns.map((column) => {
                    if (!visibleColumns.has(column.id)) return null;

                    if (column.id === 'image') {
                      return (
                        <TableCell key={column.id} className="w-12 p-0 text-center">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleImageSearch(productIndex, product)}
                            className="h-10 w-full rounded-none opacity-0 hover:opacity-100 focus:opacity-100 group-hover:opacity-100"
                          >
                            <ImageIcon className="h-4 w-4" />
                          </Button>
                        </TableCell>
                      );
                    }

                    // Campo editável para custo extra
                    if (column.id === 'custoExtra') {
                      return (
                        <TableCell key={column.id} className="text-right">
                          <Input
                            type="number"
                            min="0"
                            step="0.01"
                            value={custoExtraMap[product.codigo] ?? ''}
                            onChange={e => {
                              setCustoExtraMap(prev => ({ ...prev, [product.codigo]: e.target.value }));
                              // Persistir o valor no armazenamento da nota
                              const valor = parseFloat(e.target.value) || 0;
                              if (product.nfeId) {
                                updateProdutoCustoExtra(product.nfeId, product.codigo, valor);
                              }
                            }}
                            className="w-24 text-right"
                          />
                        </TableCell>
                      );
                    }

                    // Ajustar preços finais para somar custo extra
                    let value: any = column.getValue ? 
                      column.getValue(product) : 
                      product[column.id as keyof Product];
                    if (column.id === 'xapuriPrice') {
                      const custoExtra = parseFloat(custoExtraMap[product.codigo] || '0') || 0;
                      const custoLiquido = calculateCustoLiquido(product, impostoEntrada);
                      const custoLiquidoComFrete = custoLiquido + (product.freteProporcional || 0);
                      value = roundPrice(calculateSalePrice({ ...product, netPrice: custoLiquidoComFrete }, xapuriMarkup), roundingType) + custoExtra;
                    }
                    if (column.id === 'epitaPrice') {
                      const custoExtra = parseFloat(custoExtraMap[product.codigo] || '0') || 0;
                      const custoLiquido = calculateCustoLiquido(product, impostoEntrada);
                      const custoLiquidoComFrete = custoLiquido + (product.freteProporcional || 0);
                      value = roundPrice(calculateSalePrice({ ...product, netPrice: custoLiquidoComFrete }, epitaMarkup), roundingType) + custoExtra;
                    }
                    if (column.id === 'size') value = tamanho;
                    if (column.id === 'netPrice') {
                      // Custo Líquido = custo unitário + frete proporcional
                      const custoLiquido = calculateCustoLiquido(product, impostoEntrada);
                      const freteProporcional = product.freteProporcional || 0;
                      value = custoLiquido + freteProporcional;
                    }

                    return (
                      <TableCell
                        key={column.id}
                        className={cn(
                          "px-3 group relative text-sm hover:bg-slate-100 transition-colors text-center align-middle",
                          column.id === 'name' && "break-words whitespace-normal",
                          column.id === 'xapuriPrice' && "bg-blue-50/50 hover:bg-blue-100/50",
                          column.id === 'epitaPrice' && "bg-emerald-50/50 hover:bg-emerald-100/50"
                        )}
                        style={{ 
                          minWidth: getMinWidth(column.id)
                        }}
                      >
                        <CellContent value={value} column={column} />
                      </TableCell>
                    );
                  })}
                  <TableCell className="w-12 p-0 text-center">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleToggleVisibility(productIndex)}
                      className="h-10 w-full rounded-none opacity-0 hover:opacity-100 focus:opacity-100 group-hover:opacity-100"
                    >
                      {isHidden ? (
                        <Eye className="h-4 w-4" />
                      ) : (
                        <EyeOff className="h-4 w-4" />
                      )}
                    </Button>
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </div>
    </div>
  );
};

// Função auxiliar para definir larguras mínimas baseadas no tipo de coluna
const getMinWidth = (columnId: string): number => {
  switch (columnId) {
    case 'code':
      return 120; // Código do produto
    case 'name':
      return 250; // Descrição do produto
    case 'quantity':
      return 80; // Quantidade
    case 'unitPrice':
    case 'unitPriceWithDiscount': // Nova coluna de custo com desconto
    case 'netPrice':
    case 'xapuriPrice':
    case 'epitaPrice':
    case 'totalPrice':
      return 110; // Campos de preço
    case 'reference':
      return 100; // Referência
    case 'ean':
      return 130; // Código EAN
    case 'brand':
      return 100; // Marca
    case 'size':
      return 80; // Tamanho
    case 'image':
      return 50; // Coluna de imagem
    default:
      return 100; // Largura mínima padrão
  }
};
