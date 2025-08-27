import React, { useState, useEffect } from 'react';
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

  // Chave para persistência local dos itens ocultos por NFE
  const storageKey = currentNFeId ? `hidden-items:${currentNFeId}` : '';

//
  // Sincronização automática quando currentNFeId muda
  useEffect(() => {
    if (currentNFeId && currentNFE) {
      // Aplicar fonte da verdade para itens ocultos: servidor, com fallback localStorage
      const serverIds = new Set<string>(
        Array.isArray(currentNFE.hiddenItems) ? currentNFE.hiddenItems : [],
      );
      const localIdsArray: string[] = (() => {
        if (!storageKey) return [] as string[];
        try {
          return JSON.parse(localStorage.getItem(storageKey) || '[]');
        } catch {
          return [];
        }
      })();
      const localIds = new Set<string>(localIdsArray);
      const finalIds = serverIds.size > 0 ? serverIds : localIds;
      setHiddenItems(finalIds);
      if (storageKey) {
        try {
          localStorage.setItem(
            storageKey,
            JSON.stringify(Array.from(finalIds)),
          );
        } catch (err) {
          console.error(err);
        }
      }

      // Normalizar produtos para garantir compatibilidade
      const normalizedProducts: Product[] = (currentNFE.produtos || []).map(
        (p, index) => {
          return {
            codigo: p.codigo ?? '',
            descricao: p.descricao ?? '',
            cor: 'Cor não cadastrada', // Valor padrão para cor
            ncm: p.ncm ?? '',
            cfop: p.cfop ?? '',
            unidade: p.unidade ?? '',
            quantidade: p.quantidade ?? 0,
            valorUnitario: p.valorUnitario ?? 0,
            valorTotal: p.valorTotal ?? 0,
            baseCalculoICMS: p.baseCalculoICMS ?? 0,
            valorICMS: p.valorICMS ?? 0,
            aliquotaICMS: p.aliquotaICMS ?? 0,
            baseCalculoIPI: p.baseCalculoIPI ?? 0,
            valorIPI: p.valorIPI ?? 0,
            aliquotaIPI: p.aliquotaIPI ?? 0,
            xapuriPrice: 0,
            epitaPrice: 0,
            code: p.codigo ?? '',
            name: p.descricao ?? '',
            ean: p.ean ?? '',
            reference: p.reference ?? '',
            brand: p.brand ?? '',
            totalPrice: p.valorTotal ?? 0,
            discount: p.discount ?? 0,
            netPrice: (() => {
              const valorTotal = p.valorTotal ?? 0;
              const discount = p.discount ?? 0;
              const unitPrice = p.valorUnitario ?? 0;
              const quantidade = p.quantidade ?? 1;
              
              // Se valorTotal for muito alto (mais de 10x o preço unitário), usar cálculo alternativo
              if (valorTotal > unitPrice * quantidade * 10) {
                console.warn('Valor total muito alto detectado:', { valorTotal, unitPrice, quantidade, discount });
                // Calcular baseado no preço unitário
                return (unitPrice * quantidade) - discount;
              }
              
              return valorTotal - discount;
            })(),
            quantity: p.quantidade ?? 0,
            imageUrl: p.imageUrl ?? '',
            tags: [],
            salePrice: 0,
            uom: p.unidade ?? '',
            color: 'Cor não cadastrada',
            size: undefined,
            fornecedor: undefined,
            descricao_complementar: p.descricao_complementar ?? '',
            unitPrice: p.valorUnitario ?? 0,
            freteProporcional: p.freteProporcional ?? 0,
            custoExtra: p.custoExtra ?? 0,
          };
        },
      );

      setProducts(normalizedProducts);
      setInvoiceNumber(currentNFE.numero);
      setBrandName(currentNFE.fornecedor);
    }
  }, [currentNFeId, currentNFE, storageKey]);

  // Sincronização forçada a cada mudança (menos agressiva)
  useEffect(() => {
    if (currentNFeId) {
      // Recarregar dados do servidor a cada 5 segundos (em vez de 1s)
      const syncInterval = setInterval(() => {
        // Só sincronizar se não houver mudanças pendentes
        if (Object.keys(pendingChanges).length === 0) {
          loadNFEs();
        }
      }, 5000); // 5 segundos em vez de 1 segundo

      return () => clearInterval(syncInterval);
    }
  }, [currentNFeId, loadNFEs, pendingChanges, currentNFE?.hiddenItems]);

  const extractNFeInfo = (xmlDoc: Document) => {
    const nfeNode = xmlDoc.querySelector('NFe');
    if (!nfeNode) return null;

    const ideNode = nfeNode.querySelector('ide');
    const emitNode = nfeNode.querySelector('emit');
    const destNode = nfeNode.querySelector('dest');

    if (!ideNode || !emitNode) return null;

    const numero = ideNode.querySelector('nNF')?.textContent || '';
    const dataEmissao = ideNode.querySelector('dhEmi')?.textContent || '';
    const chaveNFE =
      nfeNode.querySelector('infNFe')?.getAttribute('Id')?.replace('NFe', '') ||
      '';

    const emitNome = emitNode.querySelector('xNome')?.textContent || '';
    const emitCNPJ =
      emitNode.querySelector('CNPJ')?.textContent ||
      emitNode.querySelector('CPF')?.textContent ||
      '';

    return {
      numero,
      dataEmissao,
      chaveNFE,
      emitNome,
      emitCNPJ,
    };
  };

  const handleDeleteCurrentNFe = () => {
    if (currentNFeId) {
      removeNFE(currentNFeId);
      setProducts([]);
      setCurrentNFeId(null);
      setInvoiceNumber('');
      setBrandName('');
      setIsEditingBrand(false);
      setXmlContentForDataSystem(null);
      setCurrentTab('upload');
    }
  };

  const handleFileSelect = async (file: File) => {
    setIsProcessing(true);
    try {
      const text = await file.text();
      const xmlDoc = new DOMParser().parseFromString(text, 'text/xml');

      const nfeInfo = extractNFeInfo(xmlDoc);
      if (!nfeInfo) {
        throw new Error('Arquivo XML inválido ou não é uma NF-e');
      }

      const extractedProducts = parseNFeXML(text);
      setProducts(extractedProducts);

      // Usar a chave da NFe como ID estável para evitar duplicidade
      const nfeId = nfeInfo.chaveNFE || `nfe_${Date.now()}`;
      setCurrentNFeId(nfeId);
      setInvoiceNumber(nfeInfo.numero);
      setBrandName(nfeInfo.emitNome);
      setXmlContentForDataSystem(text);

      // Salvar NFE
      const nfe = {
        id: nfeId,
        data: nfeInfo.dataEmissao,
        numero: nfeInfo.numero,
        chaveNFE: nfeInfo.chaveNFE,
        fornecedor: nfeInfo.emitNome,
        valor: extractedProducts.reduce((sum, p) => sum + p.valorTotal, 0),
        itens: extractedProducts.length,
        produtos: extractedProducts,
        impostoEntrada: impostoEntrada,
        xapuriMarkup: xapuriMarkup,
        epitaMarkup: epitaMarkup,
        roundingType: roundingType,
        hiddenItems: Array.from(hiddenItems), // Salvar itens ocultos atuais
        showHidden: showHidden,
      };

      saveNFE(nfe);
      // Não mudar a aba - deixar os produtos visíveis
    } catch (error) {
      console.error('Erro ao processar arquivo:', error);
      alert('Erro ao processar arquivo XML. Verifique se é uma NF-e válida.');
    } finally {
      setIsProcessing(false);
    }
  };

  const extractInvoiceNumber = (xmlDoc: Document): string => {
    const ideNode = xmlDoc.querySelector('ide');
    if (!ideNode) return '';

    const numero = ideNode.querySelector('nNF')?.textContent || '';
    return numero;
  };

  const handleLoadNFe = async (nfe: NFE) => {
    // Limpar mudanças pendentes ao carregar nova NFE
    setPendingChanges({});

    // RESTAURAR ITENS OCULTOS DA NFE CARREGADA
    if (nfe.hiddenItems && Array.isArray(nfe.hiddenItems)) {
      const serverHiddenItems = new Set(nfe.hiddenItems);
      setHiddenItems(serverHiddenItems);
    } else {
      // Se não há itens ocultos no servidor, limpar estado local
      setHiddenItems(new Set());
    }

    // Se a lista de produtos não veio neste objeto (GET /nfes), buscar a NFE completa
    let sourceNfe = nfe as NFE;
    if (!Array.isArray(nfe.produtos) || nfe.produtos.length === 0) {
      try {
        const full = await loadNFEById(nfe.id);
        sourceNfe = full;
      } catch (e) {
        console.error('Erro ao carregar NFE completa:', e);
      }
    }

    // Normaliza campos vindos do servidor para o shape usado na UI
    const normalized = (sourceNfe.produtos || []).map(
      (p: NFE['produtos'][0], index) => ({
        codigo: p.codigo ?? '',
        descricao: p.descricao ?? '',
        cor: 'Cor não cadastrada',
        ncm: p.ncm ?? '',
        cfop: p.cfop ?? '',
        unidade: p.unidade ?? '',
        quantidade: p.quantidade ?? 0,
        valorUnitario: p.valorUnitario ?? 0,
        valorTotal: p.valorTotal ?? 0,
        baseCalculoICMS: p.baseCalculoICMS ?? 0,
        valorICMS: p.valorICMS ?? 0,
        aliquotaICMS: p.aliquotaICMS ?? 0,
        baseCalculoIPI: p.baseCalculoIPI ?? 0,
        valorIPI: p.valorIPI ?? 0,
        aliquotaIPI: p.aliquotaIPI ?? 0,
        xapuriPrice: 0,
        epitaPrice: 0,
        code: p.codigo ?? '',
        name: p.descricao ?? '',
        ean: p.ean ?? '',
        reference: p.reference ?? '',
        brand: p.brand ?? '',
        totalPrice: p.valorTotal ?? 0,
        discount: p.discount ?? 0,
        netPrice: (() => {
          const valorTotal = p.valorTotal ?? 0;
          const discount = p.discount ?? 0;
          const unitPrice = p.valorUnitario ?? 0;
          const quantidade = p.quantidade ?? 1;
          
          // Se valorTotal for muito alto (mais de 10x o preço unitário), usar cálculo alternativo
          if (valorTotal > unitPrice * quantidade * 10) {
            console.warn('Valor total muito alto detectado:', { valorTotal, unitPrice, quantidade, discount });
            // Calcular baseado no preço unitário
            return (unitPrice * quantidade) - discount;
          }
          
          return valorTotal - discount;
        })(),
        quantity: p.quantidade ?? 0,
        imageUrl: p.imageUrl ?? '',
        tags: [],
        salePrice: 0,
        uom: p.unidade ?? '',
        color: 'Cor não cadastrada',
        size: undefined,
        fornecedor: undefined,
        descricao_complementar: p.descricao_complementar ?? '',
        unitPrice: p.valorUnitario ?? 0,
        freteProporcional: p.freteProporcional ?? 0,
        custoExtra: p.custoExtra ?? 0,
      }),
    );

    setProducts(normalized);
    setCurrentNFeId(sourceNfe.id);
    setInvoiceNumber(sourceNfe.numero);
    setBrandName(sourceNfe.fornecedor);
    setIsEditingBrand(false);
    setXmlContentForDataSystem(null);
    // Não mudar a aba - deixar os produtos visíveis
  };

  const handleXapuriMarkupChange = async (value: number) => {
    if (currentNFeId) {
      // Aplicar mudança localmente primeiro
      setPendingChanges((prev) => ({ ...prev, xapuriMarkup: value }));

      // Salvar no servidor
      await updateNFE(currentNFeId, { xapuriMarkup: value });

      // Limpar mudança pendente após confirmação
      setPendingChanges((prev) => {
        const { xapuriMarkup, ...rest } = prev;
        return rest;
      });
    }
  };

  const handleEpitaMarkupChange = async (value: number) => {
    if (currentNFeId) {
      // Aplicar mudança localmente primeiro
      setPendingChanges((prev) => ({ ...prev, epitaMarkup: value }));

      // Salvar no servidor
      await updateNFE(currentNFeId, { epitaMarkup: value });

      // Limpar mudança pendente após confirmação
      setPendingChanges((prev) => {
        const { epitaMarkup, ...rest } = prev;
        return rest;
      });
    }
  };

  const handleImpostoEntradaChange = async (value: number) => {
    if (currentNFeId) {
      // Aplicar mudança localmente primeiro
      setPendingChanges((prev) => ({ ...prev, impostoEntrada: value }));

      // Salvar no servidor
      await updateNFE(currentNFeId, { impostoEntrada: value });

      // Limpar mudança pendente após confirmação
      setPendingChanges((prev) => {
        const { impostoEntrada, ...rest } = prev;
        return rest;
      });
    }
  };

  const handleRoundingTypeChange = async (value: RoundingType) => {
    if (currentNFeId) {
      // Aplicar mudança localmente primeiro
      setPendingChanges((prev) => ({ ...prev, roundingType: value }));

      // Salvar no servidor
      await updateNFE(currentNFeId, { roundingType: value });

      // Limpar mudança pendente após confirmação
      setPendingChanges((prev) => {
        const { roundingType, ...rest } = prev;
        return rest;
      });
    }
  };

  const handleBrandNameChange = (newName: string) => {
    setBrandName(newName);
    setIsEditingBrand(false);
  };

  // Auto-save quando o usuário sair da página
  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (currentNFeId && products.length > 0) {
        // Salvar automaticamente antes de sair
        const nfe: Partial<NFE> = {
          id: currentNFeId,
          data: new Date().toISOString().split('T')[0],
          numero: invoiceNumber,
          fornecedor: brandName,
          valor: products.reduce((sum, p) => sum + p.valorTotal, 0),
          itens: products.length,
          produtos: products,
          impostoEntrada: impostoEntrada,
          xapuriMarkup: xapuriMarkup,
          epitaMarkup: epitaMarkup,
          roundingType: roundingType,
          hiddenItems: Array.from(hiddenItems),
          showHidden: showHidden,
        };

        // Atualizar no servidor
        updateNFE(currentNFeId, nfe);
        // Aviso padrão do navegador
        e.preventDefault();
        e.returnValue = '';
      }
    };

    window.addEventListener('beforeunload', handleBeforeUnload);

    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
    };
  }, [
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
    updateNFE,
  ]);

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

  // (removido bloco duplicado de handlers após merge)

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
