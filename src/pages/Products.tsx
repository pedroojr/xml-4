import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Search, Filter, Download, ChevronLeft, ChevronRight } from "lucide-react";
import { ProductTable } from '@/components/product-preview/ProductTable';
import { getDefaultColumns } from '@/components/product-preview/types/column';
import { useNFEStorage } from '@/hooks/useNFEStorage';
import { Switch } from "@/components/ui/switch";
import { useProductSettings } from '@/hooks/useProductSettings';
import { useTranslation } from 'react-i18next';

const ITEMS_PER_PAGE = 50;

const Products = () => {
  const { t } = useTranslation();
  const [searchTerm, setSearchTerm] = React.useState('');
  const [currentPage, setCurrentPage] = React.useState(1);
  const { savedNFEs } = useNFEStorage();

  // Usando o novo hook para gerenciar as configurações
  const {
    settings,
    toggleHiddenItem,
    toggleVisibleColumn,
    updateMarkup,
    updateRoundingType,
    updateImpostoEntrada,
    toggleShowOnlyWithImage,
    toggleShowOnlyHidden
  } = useProductSettings({
    visibleColumns: new Set(getDefaultColumns().map(col => col.id))
  });

  // Extrair todos os produtos das NFEs
  const allProducts = React.useMemo(() => {
    return savedNFEs.reduce((acc: any[], nfe) => {
      const nfeProducts = nfe.products.map(productItem => ({
        ...productItem,
        nfeId: nfe.id,
        supplier: nfe.supplier,
        date: nfe.date,
        entryTax: nfe.entryTax
      }));
      return [...acc, ...nfeProducts];
    }, []);
  }, [savedNFEs]);

  // Filtrar produtos baseado na busca e configurações
  const filteredProducts = React.useMemo(() => {
    return allProducts.filter(product => {
      const searchLower = searchTerm.toLowerCase();
      const matchesSearch =
        (product.code?.toString().toLowerCase().includes(searchLower) ||
        product.description?.toLowerCase().includes(searchLower) ||
        product.ean?.toString().includes(searchLower) ||
        product.reference?.toLowerCase().includes(searchLower) ||
        product.supplier?.toLowerCase().includes(searchLower) ||
        product.additionalDescription?.toLowerCase().includes(searchLower));

      const matchesImageFilter = !settings.showOnlyWithImage || product.imageUrl;
      const matchesHiddenFilter = !settings.showOnlyHidden || settings.hiddenItems.has(product.id);

      return matchesSearch && matchesImageFilter && matchesHiddenFilter;
    });
  }, [allProducts, searchTerm, settings.showOnlyWithImage, settings.showOnlyHidden, settings.hiddenItems]);

  // Paginação
  const totalPages = Math.ceil(filteredProducts.length / ITEMS_PER_PAGE);
  const paginatedProducts = React.useMemo(() => {
    const start = (currentPage - 1) * ITEMS_PER_PAGE;
    return filteredProducts.slice(start, start + ITEMS_PER_PAGE);
  }, [filteredProducts, currentPage]);

  // Funções de manipulação
  const handleSearch = (value: string) => {
    setSearchTerm(value);
    setCurrentPage(1);
  };

  const handlePageChange = (page: number) => {
    setCurrentPage(page);
  };

  const handleExport = () => {
    console.log('Exporting products:', filteredProducts);
  };

  const handleImageSearch = (index: number, product: any) => {
    console.log('Search image for product:', product);
  };

  // Estatísticas dos produtos
  const totalQuantity = filteredProducts.reduce((acc, prod) => acc + (prod.quantity || 0), 0);
  const totalUnits = filteredProducts.length;
  const totalValue = filteredProducts.reduce((acc, prod) => acc + (prod.totalPrice || 0), 0);
  const averageDiscount = filteredProducts.reduce((acc, prod) => acc + (prod.desconto || 0), 0) / filteredProducts.length || 0;

  // Renderizar números de página
  const renderPageNumbers = () => {
    const pages = [];
    const maxVisiblePages = 5;
    let startPage = Math.max(1, currentPage - Math.floor(maxVisiblePages / 2));
    let endPage = Math.min(totalPages, startPage + maxVisiblePages - 1);

    if (endPage - startPage + 1 < maxVisiblePages) {
      startPage = Math.max(1, endPage - maxVisiblePages + 1);
    }

    for (let i = startPage; i <= endPage; i++) {
      pages.push(
        <Button
          key={i}
          variant={currentPage === i ? "default" : "outline"}
          size="sm"
          onClick={() => handlePageChange(i)}
          className="w-8 h-8 p-0"
        >
          {i}
        </Button>
      );
    }

    return pages;
  };

  return (
    <div className="w-full px-4 py-8 space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold text-gray-900">{t('products')}</h1>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={handleExport}>
            <Download className="h-4 w-4 mr-2" />
            {t('export')}
          </Button>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>{t('filtersSearch')}</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="flex gap-4">
              <div className="flex-1 relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                <Input
                  placeholder={t('searchPlaceholder')}
                  value={searchTerm}
                  onChange={(e) => handleSearch(e.target.value)}
                  className="pl-10"
                />
              </div>
              <Button variant="outline">
                <Filter className="h-4 w-4 mr-2" />
                {t('advancedFilters')}
              </Button>
            </div>

            <div className="flex items-center gap-6">
              <div className="flex items-center space-x-2">
                <Switch
                  id="showHidden"
                  checked={settings.showOnlyHidden}
                  onCheckedChange={toggleShowOnlyHidden}
                />
                <label
                  htmlFor="showHidden"
                  className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                >
                  {t('showOnlyHidden')}
                </label>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="text-2xl font-bold">{totalUnits}</div>
            <div className="text-sm text-muted-foreground">{t('unitQuantity')}</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="text-2xl font-bold">{totalQuantity}</div>
            <div className="text-sm text-muted-foreground">{t('totalItems')}</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="text-2xl font-bold">R$ {totalValue.toFixed(2)}</div>
            <div className="text-sm text-muted-foreground">{t('totalValue')}</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="text-2xl font-bold">{averageDiscount.toFixed(1)}%</div>
            <div className="text-sm text-muted-foreground">{t('averageDiscount')}</div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardContent className="p-0">
          <ProductTable
            products={paginatedProducts}
            visibleColumns={settings.visibleColumns}
            columns={getDefaultColumns()}
            hiddenItems={settings.hiddenItems}
            handleToggleVisibility={toggleHiddenItem}
            handleImageSearch={handleImageSearch}
            xapuriMarkup={settings.xapuriMarkup}
            epitaMarkup={settings.epitaMarkup}
            roundingType={settings.roundingType}
            impostoEntrada={settings.impostoEntrada}
            onImpostoEntradaChange={updateImpostoEntrada}
            onXapuriMarkupChange={(value) => updateMarkup('xapuri', value)}
            onEpitaMarkupChange={(value) => updateMarkup('epita', value)}
            onRoundingTypeChange={updateRoundingType}
          />
        </CardContent>
      </Card>

      {/* Paginação */}
      {totalPages > 1 && (
        <div className="flex justify-center items-center gap-2 mt-4">
          <Button
            variant="outline"
            size="sm"
            onClick={() => handlePageChange(currentPage - 1)}
            disabled={currentPage === 1}
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>

          {renderPageNumbers()}

          <Button
            variant="outline"
            size="sm"
            onClick={() => handlePageChange(currentPage + 1)}
            disabled={currentPage === totalPages}
          >
            <ChevronRight className="h-4 w-4" />
          </Button>

          <span className="text-sm text-muted-foreground ml-4">
            {t('pageOf', { current: currentPage, total: totalPages })}
          </span>
        </div>
      )}
    </div>
  );
};

export default Products;