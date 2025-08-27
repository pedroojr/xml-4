import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { Info, Edit2, Trash2 } from 'lucide-react';
import UploadPanel from '@/components/UploadPanel';
import ProductPreview from '@/components/product-preview/ProductPreview';
import { useNFEStorage } from '@/hooks/useNFEStorage';
import { useHiddenItems } from '@/hooks/useHiddenItems';
import { useNfeSync } from '@/hooks/useNfeSync';
import type { NFE } from '@/services/api';
import { Product } from '@/types/nfe';
import { RoundingType } from '@/components/product-preview/productCalculations';
import { parseNFeXML } from '@/utils/nfeParser';

const Index: React.FC = () => {
  const [products, setProducts] = useState<Product[]>([]);
  const [currentNFeId, setCurrentNFeId] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [invoiceNumber, setInvoiceNumber] = useState('');
  const [brandName, setBrandName] = useState('');
  const [isEditingBrand, setIsEditingBrand] = useState(false);

  const {
    savedNFEs,
    saveNFE,
    removeNFE,
    updateHiddenItems,
    updateNFE,
    loadNFEs,
    loadNFEById,
  } = useNFEStorage();

  const currentNFE = currentNFeId
    ? savedNFEs.find((nfe) => nfe.id === currentNFeId)
    : null;

  const { hiddenItems, setHiddenItems, toggleHiddenById } = useHiddenItems(
    currentNFeId,
    currentNFE?.hiddenItems,
    updateHiddenItems,
    loadNFEs,
  );

  const [pendingChanges, setPendingChanges] = useState<{ 
    showHidden?: boolean;
    xapuriMarkup?: number;
    epitaMarkup?: number;
    impostoEntrada?: number;
    roundingType?: RoundingType;
  }>({});

  const xapuriMarkup = pendingChanges.xapuriMarkup ?? currentNFE?.xapuriMarkup ?? 160;
  const epitaMarkup = pendingChanges.epitaMarkup ?? currentNFE?.epitaMarkup ?? 130;
  const impostoEntrada = pendingChanges.impostoEntrada ?? currentNFE?.impostoEntrada ?? 12;
  const roundingType = (pendingChanges.roundingType ?? currentNFE?.roundingType ?? 'none') as RoundingType;
  const showHidden = pendingChanges.showHidden ?? currentNFE?.showHidden ?? false;

  useNfeSync({
    currentNFeId,
    products,
    invoiceNumber,
    brandName,
    impostoEntrada,
    xapuriMarkup,
    epitaMarkup,
    roundingType,
    hiddenItems,
    showHidden,
    pendingChanges,
    loadNFEs,
    updateNFE,
  });

  const handleDeleteCurrentNFe = () => {
    if (currentNFeId) {
      removeNFE(currentNFeId);
      setProducts([]);
      setCurrentNFeId(null);
      setInvoiceNumber('');
      setBrandName('');
      setIsEditingBrand(false);
      setHiddenItems(new Set());
    }
  };

  const handleFileSelect = async (file: File) => {
    setIsProcessing(true);
    try {
      const text = await file.text();
      const xmlDoc = new DOMParser().parseFromString(text, 'text/xml');
      const extractedProducts = parseNFeXML(text);
      const nfeId = `nfe_${Date.now()}`;
      setProducts(extractedProducts);
      setCurrentNFeId(nfeId);
      setInvoiceNumber(xmlDoc.querySelector('nNF')?.textContent || '');
      setBrandName(xmlDoc.querySelector('emit xNome')?.textContent || '');
      const nfe: NFE = {
        id: nfeId,
        data: new Date().toISOString(),
        numero: xmlDoc.querySelector('nNF')?.textContent || '',
        chaveNFE: xmlDoc.querySelector('infNFe')?.getAttribute('Id')?.replace('NFe', '') || '',
        fornecedor: xmlDoc.querySelector('emit xNome')?.textContent || '',
        valor: extractedProducts.reduce((s, p) => s + p.totalPrice, 0),
        itens: extractedProducts.length,
        produtos: extractedProducts,
        impostoEntrada,
        xapuriMarkup,
        epitaMarkup,
        roundingType,
        hiddenItems: Array.from(hiddenItems),
        showHidden,
      };
      saveNFE(nfe);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleLoadNFe = async (nfe: NFE) => {
    setPendingChanges({});
    let source = nfe;
    if (!nfe.produtos || nfe.produtos.length === 0) {
      source = await loadNFEById(nfe.id);
    }
    setProducts(source.produtos || []);
    setCurrentNFeId(source.id);
    setInvoiceNumber(source.numero);
    setBrandName(source.fornecedor);
    setHiddenItems(new Set(source.hiddenItems || []));
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 to-slate-100">
      <div className="w-full px-4 py-8 space-y-8">
        {products.length === 0 && (
          <div className="text-center space-y-6">
            <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-blue-50 text-blue-700 text-sm font-medium">
              <Info size={16} />
              <span>Importador de NF-e</span>
            </div>
            <UploadPanel onFileSelect={handleFileSelect} />
          </div>
        )}

        {isProcessing && (
          <div className="text-center py-8">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-700 mx-auto"></div>
            <p className="mt-4 text-slate-600">Processando arquivo XML...</p>
          </div>
        )}

        {products.length > 0 && (
          <div className="space-y-4">
            <div className="flex justify-between items-center">
              {isEditingBrand ? (
                <Input
                  value={brandName}
                  onChange={(e) => setBrandName(e.target.value)}
                  className="w-96 text-base font-medium"
                  autoFocus
                  onBlur={() => setIsEditingBrand(false)}
                  onKeyDown={(e) => e.key === 'Enter' && setIsEditingBrand(false)}
                />
              ) : (
                <div className="flex items-center gap-2">
                  <h1 className="text-xl font-medium">
                    {brandName}
                    {invoiceNumber && `: ${invoiceNumber}`}
                  </h1>
                  <button onClick={() => setIsEditingBrand(true)} className="text-gray-400 hover:text-gray-600">
                    <Edit2 size={14} />
                  </button>
                </div>
              )}

              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button variant="outline" size="sm" className="flex items-center gap-2 text-red-600 hover:text-red-700">
                    <Trash2 size={16} />
                    Excluir NF
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Excluir Nota Fiscal</AlertDialogTitle>
                    <AlertDialogDescription>
                      Tem certeza que deseja excluir esta nota fiscal? Esta ação não pode ser desfeita.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Cancelar</AlertDialogCancel>
                    <AlertDialogAction onClick={handleDeleteCurrentNFe} className="bg-red-600 hover:bg-red-700">
                      Excluir
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            </div>

            <ProductPreview
              products={products}
              hiddenItemIds={hiddenItems}
              onToggleVisibilityById={toggleHiddenById}
              onNewFile={() => {
                setProducts([]);
                setCurrentNFeId(null);
                setInvoiceNumber('');
                setBrandName('');
                setIsEditingBrand(false);
                setHiddenItems(new Set());
              }}
              xapuriMarkup={xapuriMarkup}
              epitaMarkup={epitaMarkup}
              impostoEntrada={impostoEntrada}
              roundingType={roundingType}
              onXapuriMarkupChange={(v) => setPendingChanges((p) => ({ ...p, xapuriMarkup: v }))}
              onEpitaMarkupChange={(v) => setPendingChanges((p) => ({ ...p, epitaMarkup: v }))}
              onImpostoEntradaChange={(v) => setPendingChanges((p) => ({ ...p, impostoEntrada: v }))}
              onRoundingTypeChange={(v) => setPendingChanges((p) => ({ ...p, roundingType: v }))}
            />
          </div>
        )}
      </div>
    </div>
  );
};

export default Index;
