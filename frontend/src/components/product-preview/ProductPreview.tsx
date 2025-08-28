import React, { useState, useEffect } from 'react';
import { Product } from '../../types/nfe';
import { calculateSalePrice, roundPrice, RoundingType, calcularFreteProporcional } from './productCalculations';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";
import { ProductAnalysis } from './insights/ProductAnalysis';
import { ProductToolbar } from './ProductToolbar';
import { ProductTable } from './ProductTable';
import { getDefaultColumns, compactColumns, Column } from './types/column';
import { ProductAnalysisTabs } from './ProductAnalysisTabs';
import { ExportOptions } from './ExportOptions';
import { ProductImageModal } from './ProductImageModal';
import { useImpostoEntrada } from '../../hooks/useImpostoEntrada';

interface ProductPreviewProps {
  products: Product[];
  onProductUpdate?: (index: number, product: Product) => void;
  editable?: boolean;
  onConfigurationUpdate?: (xapuriMarkup: number, epitaMarkup: number, roundingType: string) => void;
  onNewFile?: (products: Product[]) => void;
  hiddenItems?: Set<number>;
  onToggleVisibility?: (index: number) => void;
  xapuriMarkup: number;
  epitaMarkup: number;
  roundingType: RoundingType;
  onXapuriMarkupChange: (value: number) => void;
  onEpitaMarkupChange: (value: number) => void;
  onRoundingTypeChange: (value: RoundingType) => void;
}

const ProductPreview: React.FC<ProductPreviewProps> = ({ 
  products, 
  onProductUpdate, 
  editable = false,
  onConfigurationUpdate,
  onNewFile,
  hiddenItems = new Set(),
  onToggleVisibility,
  xapuriMarkup,
  epitaMarkup,
  roundingType,
  onXapuriMarkupChange,
  onEpitaMarkupChange,
  onRoundingTypeChange
}) => {
  const { impostoEntrada, setImpostoEntrada } = useImpostoEntrada(0);

  const [valorFrete, setValorFrete] = useState<number>(0);

  // Calculate suggested markups
  const totalBruto = products.reduce((sum, p) => sum + p.totalPrice, 0);
  const totalLiquido = products.reduce((sum, p) => sum + p.netPrice, 0);
  
  // Markup sugerido para Xapuri (ajustando para custo líquido)
  const precoVendaXapuri = totalBruto * 2.2;
  const xapuriSuggestedMarkup = totalLiquido > 0 ? Math.round(((precoVendaXapuri / totalLiquido) - 1) * 100) : 120;
  
  // Markup sugerido para Epitaciolândia (já está em relação ao custo líquido)
  const epitaSuggestedMarkup = 130; // Equivalente a preço = custo líquido * 2.3

  const [localHiddenItems, setLocalHiddenItems] = useState<Set<number>>(hiddenItems);
  const [compactMode, setCompactMode] = useState(() => {
    const saved = localStorage.getItem('compactMode');
    return saved ? JSON.parse(saved) : false;
  });
  
  const [selectedImageProduct, setSelectedImageProduct] = useState<Product | null>(null);
  const [isImageModalOpen, setIsImageModalOpen] = useState(false);
  const [isExportModalOpen, setIsExportModalOpen] = useState(false);
  const [invoiceNumber, setInvoiceNumber] = useState<string | null>(null);
  const [brandName, setBrandName] = useState<string | null>(null);

  const columns = getDefaultColumns();
  const [visibleColumns, setVisibleColumns] = useState<Set<string>>(() => {
    const saved = localStorage.getItem('visibleColumns');
    if (saved) {
      const parsedColumns = JSON.parse(saved) as string[];
      return new Set(parsedColumns);
    }
    return new Set(compactMode ? compactColumns : [...columns.map(col => col.id), 'tags']);
  });

  const [sortedColumns, setSortedColumns] = useState<Column[]>(() => {
    const savedColumnOrder = localStorage.getItem('columnOrder');
    if (savedColumnOrder) {
      const orderMap = JSON.parse(savedColumnOrder) as Record<string, number>;
      return [...columns].sort((a, b) => (orderMap[a.id] || a.order || 0) - (orderMap[b.id] || b.order || 0));
    }
    return [...columns].sort((a, b) => (a.order || 0) - (b.order || 0));
  });

  useEffect(() => {
    setLocalHiddenItems(hiddenItems);
  }, [hiddenItems]);

  useEffect(() => {
    localStorage.setItem('xapuriMarkup', xapuriMarkup.toString());
    localStorage.setItem('epitaMarkup', epitaMarkup.toString());
    localStorage.setItem('roundingType', roundingType);
    localStorage.setItem('compactMode', JSON.stringify(compactMode));
    localStorage.setItem('impostoEntrada', impostoEntrada.toString());
  }, [xapuriMarkup, epitaMarkup, roundingType, compactMode, impostoEntrada]);

  useEffect(() => {
    const savedColumnOrder = localStorage.getItem('columnOrder');
    if (savedColumnOrder) {
      const orderMap = JSON.parse(savedColumnOrder) as Record<string, number>;
      const newSortedColumns = [...columns].sort((a, b) => (orderMap[a.id] || a.order || 0) - (orderMap[b.id] || b.order || 0));
      setSortedColumns(newSortedColumns);
    }
  }, [columns]);

  const handleMarkupChange = (xapuri: number, epita: number, rounding: RoundingType) => {
    onXapuriMarkupChange(xapuri);
    onEpitaMarkupChange(epita);
    onRoundingTypeChange(rounding);
    onConfigurationUpdate?.(xapuri, epita, rounding);
  };

  const handleImageSearch = async (index: number, product: Product) => {
    const searchTerms = `${product.ean} ${product.code} ${product.name}`;
    window.open(`https://www.google.com/search?q=${encodeURIComponent(searchTerms)}&tbm=isch`, '_blank');
  };

  const toggleColumn = (columnId: string) => {
    const newVisibleColumns = new Set(visibleColumns);
    if (newVisibleColumns.has(columnId)) {
      newVisibleColumns.delete(columnId);
    } else {
      newVisibleColumns.add(columnId);
    }
    setVisibleColumns(newVisibleColumns);
    localStorage.setItem('visibleColumns', JSON.stringify(Array.from(newVisibleColumns)));
  };

  const toggleCompactMode = () => {
    const newMode = !compactMode;
    setCompactMode(newMode);
    const newColumns = new Set(newMode ? compactColumns : columns.map(col => col.id));
    setVisibleColumns(newColumns);
    localStorage.setItem('visibleColumns', JSON.stringify(Array.from(newColumns)));
    localStorage.setItem('compactMode', JSON.stringify(newMode));
  };

  const handleToggleVisibility = (index: number) => {
    if (onToggleVisibility) {
      onToggleVisibility(index);
    } else {
      const newHiddenItems = new Set(localHiddenItems);
      if (newHiddenItems.has(index)) {
        newHiddenItems.delete(index);
        toast.success('Item exibido novamente');
      } else {
        newHiddenItems.add(index);
        toast.success('Item ocultado');
      }
      setLocalHiddenItems(newHiddenItems);
    }
  };

  const handleNewFileRequest = () => {
    const fileInput = document.createElement('input');
    fileInput.type = 'file';
    fileInput.accept = '.xml';
    fileInput.onchange = async (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (file) {
        try {
          onNewFile?.(products);
          toast.success('Nova nota carregada com sucesso');
        } catch (error) {
          toast.error('Erro ao carregar nova nota');
        }
      }
    };
    fileInput.click();
  };

  const effectiveHiddenItems = onToggleVisibility ? hiddenItems : localHiddenItems;

  // Calcular frete proporcional para cada item
  const fretesProporcionais = calcularFreteProporcional(products, valorFrete, impostoEntrada);
  // Adiciona o campo nfeId para cada produto (usando invoiceNumber ou um valor fixo se não houver)
  const nfeId = invoiceNumber || 'nfe-id-unico';
  // Atualizar produtos com frete proporcional
  const productsWithFrete = products.map((p, idx) => ({
    ...p,
    nfeId,
    freteProporcional: fretesProporcionais[idx] || 0,
    // Custo final unitário: custo líquido unitário + frete proporcional unitário
    netPrice: (p.netPrice || 0) + (fretesProporcionais[idx] || 0)
  }));

  return (
    <div className="w-full max-w-full flex-1">
      <div className="rounded-lg border bg-white shadow-sm">
        <Tabs defaultValue="unified" className="w-full">
          <div className="sticky top-0 z-10 bg-white border-b">
            <TabsList className="w-full justify-start rounded-none border-0">
              <TabsTrigger value="unified">Visão Unificada</TabsTrigger>
              <TabsTrigger value="insights">Insights e Análises</TabsTrigger>
            </TabsList>
          </div>

          <TabsContent value="unified" className="p-0 w-full">
            <ProductToolbar
              xapuriMarkup={xapuriMarkup}
              epitaMarkup={epitaMarkup}
              impostoEntrada={impostoEntrada}
              roundingType={roundingType}
              onXapuriMarkupChange={(value) => handleMarkupChange(value, epitaMarkup, roundingType)}
              onEpitaMarkupChange={(value) => handleMarkupChange(xapuriMarkup, value, roundingType)}
              onImpostoEntradaChange={setImpostoEntrada}
              onRoundingChange={(value) => handleMarkupChange(xapuriMarkup, epitaMarkup, value)}
              compactMode={compactMode}
              toggleCompactMode={toggleCompactMode}
              columns={sortedColumns}
              visibleColumns={visibleColumns}
              onToggleColumn={toggleColumn}
              onNewFileRequest={handleNewFileRequest}
              xapuriSuggestedMarkup={xapuriSuggestedMarkup}
              epitaSuggestedMarkup={epitaSuggestedMarkup}
              totalItems={products.length}
              filteredItems={products.length - effectiveHiddenItems.size}
              valorFrete={valorFrete}
              onValorFreteChange={setValorFrete}
            />

            <ProductTable
              products={productsWithFrete}
              visibleColumns={visibleColumns}
              columns={sortedColumns}
              hiddenItems={effectiveHiddenItems}
              handleToggleVisibility={handleToggleVisibility}
              handleImageSearch={handleImageSearch}
              xapuriMarkup={xapuriMarkup}
              epitaMarkup={epitaMarkup}
              impostoEntrada={impostoEntrada}
              roundingType={roundingType}
              onXapuriMarkupChange={onXapuriMarkupChange}
              onEpitaMarkupChange={onEpitaMarkupChange}
              onImpostoEntradaChange={setImpostoEntrada}
              onRoundingTypeChange={onRoundingTypeChange}
            />
          </TabsContent>

          <TabsContent value="insights" className="p-4">
            <div className="space-y-8 w-full">
              <ProductAnalysisTabs 
                products={products} 
                xapuriMarkup={xapuriMarkup} 
                epitaMarkup={epitaMarkup} 
              />
              <ProductAnalysis products={products} />
            </div>
          </TabsContent>
        </Tabs>
      </div>
      
      {isImageModalOpen && selectedImageProduct && (
        <ProductImageModal
          isOpen={isImageModalOpen}
          onClose={() => setIsImageModalOpen(false)}
          imageUrl={selectedImageProduct?.imageUrl || ''}
          productName={selectedImageProduct?.name || ''}
          productEan={selectedImageProduct?.ean || ''}
          onSearchNew={() => {
            if (selectedImageProduct) {
              handleImageSearch(products.indexOf(selectedImageProduct), selectedImageProduct);
            }
          }}
          onDownload={() => {
            if (selectedImageProduct) {
              // Implementar lógica de download aqui
            }
          }}
        />
      )}
      
      {isExportModalOpen && (
        <ExportOptions
          products={products}
          invoiceNumber={invoiceNumber || ''}
          brandName={brandName || ''}
          isOpen={isExportModalOpen}
          onClose={() => setIsExportModalOpen(false)}
        />
      )}
    </div>
  );
};

export default ProductPreview;
