import React, { useState, useEffect } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { Info, History, Edit2, Trash2 } from "lucide-react";
import FileUpload from "@/components/FileUpload";

import FileUploadPDF from "@/components/FileUploadPDF";
import ProductPreview from "@/components/product-preview/ProductPreview";
import { useNFEStorage } from "@/hooks/useNFEStorage";
import type { NFE } from "@/services/api";
import { Product } from "@/types/nfe";
import { RoundingType } from "@/components/product-preview/productCalculations";
import { parseNFeXML } from "@/utils/nfeParser";

const Index = () => {
  const [products, setProducts] = useState<Product[]>([]);
  const [currentNFeId, setCurrentNFeId] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [currentTab, setCurrentTab] = useState("upload");
  const [xmlContentForDataSystem, setXmlContentForDataSystem] = useState<string | null>(null);
  const [pdfItems, setPdfItems] = useState<{ item: string; descricao: string; quantidade: number; totalBruto: number; totalLiquido: number }[]>([]);
  // Removed local states for hiddenItems, showHidden, markups, roundingType, impostoEntrada
  const [invoiceNumber, setInvoiceNumber] = useState<string>("");
  const [brandName, setBrandName] = useState<string>("");
  const [isEditingBrand, setIsEditingBrand] = useState(false);

  const { savedNFEs, saveNFE, removeNFE, updateHiddenItems, updateShowHidden, updateNFE, loadNFEs, loadNFEById } = useNFEStorage();
  // Normalizador defensivo: aceita array, string JSON ou indefinido
  const normalizeProdutosFromAny = (produtos: unknown): any[] => {
    if (Array.isArray(produtos)) return produtos;
    if (typeof produtos === 'string') {
      try {
        const parsed = JSON.parse(produtos);
        return Array.isArray(parsed) ? parsed : [];
      } catch {
        return [];
      }
    }
    return [];
  };

  // Estado centralizado no servidor - SEM estado local
  const currentNFE = currentNFeId ? savedNFEs.find(nfe => nfe.id === currentNFeId) : null;
  
  // Estado de ocultos persistente no localStorage (à prova de reset)
  const storageKey = currentNFeId ? `hidden-items:${currentNFeId}` : '';
  const [hiddenItems, setHiddenItems] = useState<Set<string>>(() => {
    if (!storageKey) return new Set();
    try {
      return new Set(JSON.parse(localStorage.getItem(storageKey) || '[]'));
    } catch {
      return new Set();
    }
  });

  // Persistir mudanças no localStorage
  useEffect(() => {
    if (storageKey && hiddenItems.size > 0) {
      localStorage.setItem(storageKey, JSON.stringify([...hiddenItems]));
    } else if (storageKey) {
      localStorage.removeItem(storageKey);
    }
  }, [hiddenItems, storageKey]);

  // Função para gerar ID estável do produto (mesma regra do ProductPreview)
  const getProductId = (p: Product, index: number) => {
    if (p.ean && p.ean.length > 0) return String(p.ean);
    if (p.code && p.code.length > 0) return `cod:${p.code}:${index}`;
    if (p.reference) return `ref:${p.reference}:${index}`;
    return `idx:${index}`;
  };

  // Função para alternar visibilidade (à prova de reset)
  const toggleHidden = (product: Product, index: number) => {
    const id = getProductId(product, index);
    setHiddenItems(prev => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  // Estado local para mudanças pendentes (não salvas no servidor)
  const [pendingChanges, setPendingChanges] = useState<{
    showHidden?: boolean;
    xapuriMarkup?: number;
    epitaMarkup?: number;
    impostoEntrada?: number;
    roundingType?: RoundingType;
  }>({});
  
  // LOG DE PROVA: Carregado hiddenItems do servidor
  useEffect(() => {
    if (currentNFeId && currentNFE) {
      console.log('🔍 PROVA - Carregado hiddenItems do servidor:', {
        nfeId: currentNFE.id,
        hiddenItems: currentNFE.hiddenItems || [],
        showHidden: currentNFE.showHidden,
        produtosCount: currentNFE.produtos?.length,
        timestamp: new Date().toISOString()
      });
    }
  }, [currentNFeId, currentNFE]);
  
  // Valores vindos APENAS do servidor, mas com mudanças pendentes aplicadas
  const xapuriMarkup = pendingChanges.xapuriMarkup ?? currentNFE?.xapuriMarkup ?? 160;
  const epitaMarkup = pendingChanges.epitaMarkup ?? currentNFE?.epitaMarkup ?? 130;
  const impostoEntrada = pendingChanges.impostoEntrada ?? currentNFE?.impostoEntrada ?? 12;
  const roundingType = (pendingChanges.roundingType ?? currentNFE?.roundingType ?? 'none') as RoundingType;
  const showHidden = pendingChanges.showHidden ?? currentNFE?.showHidden ?? false;
  
  // DEBUG: Log para valores derivados
  useEffect(() => {
    if (currentNFeId) {
      console.log('🔍 DEBUG - Valores Derivados:', {
        xapuriMarkup,
        epitaMarkup,
        impostoEntrada,
        roundingType,
        hiddenItems: Array.from(hiddenItems),
        showHidden,
        pendingChanges,
        timestamp: new Date().toISOString()
      });
    }
  }, [currentNFeId, xapuriMarkup, epitaMarkup, impostoEntrada, roundingType, hiddenItems, showHidden, pendingChanges]);
  
  // DEBUG: Log para savedNFEs
  useEffect(() => {
    console.log('🔍 DEBUG - savedNFEs atualizado:', {
      count: savedNFEs.length,
      nfes: savedNFEs.map(n => ({ id: n.id, numero: n.numero, xapuriMarkup: n.xapuriMarkup, hiddenItems: n.hiddenItems, showHidden: n.showHidden })),
      timestamp: new Date().toISOString()
    });
  }, [savedNFEs]);

  // Sincronização automática quando currentNFeId muda
  useEffect(() => {
    if (currentNFeId && currentNFE) {
      // DEBUG: Log dos dados brutos do servidor
      console.log('🔍 DEBUG - Dados brutos do servidor:', {
        nfeId: currentNFE.id,
        produtosCount: currentNFE.produtos?.length,
        primeiroProduto: currentNFE.produtos?.[0],
        todosProdutos: currentNFE.produtos,
        hiddenItemsFromServer: currentNFE.hiddenItems,
        timestamp: new Date().toISOString()
      });

      // Aplicar fonte da verdade para itens ocultos: servidor, com fallback localStorage
      const serverIds = new Set<string>(Array.isArray(currentNFE.hiddenItems) ? currentNFE.hiddenItems : []);
      const localIdsArray: string[] = (() => {
        if (!storageKey) return [] as string[];
        try { return JSON.parse(localStorage.getItem(storageKey) || '[]'); } catch { return []; }
      })();
      const localIds = new Set<string>(localIdsArray);
      const finalIds = serverIds.size > 0 ? serverIds : localIds;
      setHiddenItems(finalIds);
      if (storageKey) {
        try { localStorage.setItem(storageKey, JSON.stringify(Array.from(finalIds))); } catch {}
      }

      // Normalizar produtos para garantir compatibilidade
      const normalizedProducts: Product[] = normalizeProdutosFromAny(currentNFE.produtos).map((p, index) => {
        // DEBUG: Log de cada produto sendo normalizado
        console.log('🔍 DEBUG - Normalizando produto:', {
          original: p,
          codigo: p.codigo,
          quantidade: p.quantidade,
          valorUnitario: p.valorUnitario,
          valorTotal: p.valorTotal
        });

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
          netPrice: p.valorUnitario ?? 0,
          discount: 0,
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
      });

      // DEBUG: Log dos produtos normalizados
      console.log('🔍 DEBUG - Produtos normalizados:', {
        count: normalizedProducts.length,
        primeiroNormalizado: normalizedProducts[0],
        timestamp: new Date().toISOString()
      });

      // Evitar "abre e fecha": só aplicar se houver produtos.
      // Quando o backend retorna apenas um resumo (produtos vazio), mantemos o estado atual.
      if (normalizedProducts.length > 0) {
        setProducts(normalizedProducts);
      } else {
        console.log('🔍 DEBUG - Mantendo produtos atuais (backend retornou lista vazia para este snapshot).');
      }
      setInvoiceNumber(currentNFE.numero);
      setBrandName(currentNFE.fornecedor);
    }
  }, [currentNFeId, currentNFE]);

  // Sincronização forçada mais segura: pausa quando uma NFE está aberta
  useEffect(() => {
    if (!currentNFeId) {
      const syncInterval = setInterval(() => {
        console.log('🔍 PROVA - Polling preservado (sem NFE aberta)');
        loadNFEs();
      }, 10000);
      return () => clearInterval(syncInterval);
    }
  }, [currentNFeId, loadNFEs]);

  const extractNFeInfo = (xmlDoc: Document) => {
    const nfeNode = xmlDoc.querySelector('NFe');
    if (!nfeNode) return null;

    const ideNode = nfeNode.querySelector('ide');
    const emitNode = nfeNode.querySelector('emit');
    const destNode = nfeNode.querySelector('dest');

    if (!ideNode || !emitNode) return null;

    const numero = ideNode.querySelector('nNF')?.textContent || '';
    const dataEmissao = ideNode.querySelector('dhEmi')?.textContent || '';
    const chaveNFE = nfeNode.querySelector('infNFe')?.getAttribute('Id')?.replace('NFe', '') || '';
    
    const emitNome = emitNode.querySelector('xNome')?.textContent || '';
    const emitCNPJ = emitNode.querySelector('CNPJ')?.textContent || emitNode.querySelector('CPF')?.textContent || '';

    return {
      numero,
      dataEmissao,
      chaveNFE,
      emitNome,
      emitCNPJ
    };
  };

  const handleDeleteCurrentNFe = () => {
    if (currentNFeId) {
      removeNFE(currentNFeId);
      setProducts([]);
      setCurrentNFeId(null);
      setInvoiceNumber("");
      setBrandName("");
      setIsEditingBrand(false);
      setXmlContentForDataSystem(null);
      setCurrentTab("upload");
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
      
      const nfeId = `nfe_${Date.now()}`;
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
        showHidden: showHidden
      };
      
      saveNFE(nfe);
      setCurrentTab("upload");
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
    // Busca defensiva da NFE por ID para garantir dados mais recentes e normalizados
    let nfeFull: NFE = nfe;
    try {
      const fetched = await loadNFEById(nfe.id);
      if (fetched) nfeFull = fetched;
    } catch {}
    
    // RESTAURAR ITENS OCULTOS DA NFE CARREGADA
    if (nfeFull.hiddenItems && Array.isArray(nfeFull.hiddenItems)) {
      const serverHiddenItems = new Set(nfeFull.hiddenItems);
      console.log('🔍 DEBUG - Restaurando itens ocultos ao carregar NFE:', {
        nfeId: nfeFull.id,
        serverHiddenItems: Array.from(serverHiddenItems),
        timestamp: new Date().toISOString()
      });
      setHiddenItems(serverHiddenItems);
    } else {
      // Se não há itens ocultos no servidor, limpar estado local
    setHiddenItems(new Set());
    }
    
    // Normaliza campos vindos do servidor para o shape usado na UI
    const normalized = normalizeProdutosFromAny(nfeFull.produtos).map((p: NFE['produtos'][0], index) => ({
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
      netPrice: p.valorUnitario ?? 0,
      discount: 0,
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
    }));
    setProducts(normalized);
    setCurrentNFeId(nfeFull.id);
    setInvoiceNumber(nfeFull.numero);
    setBrandName(nfeFull.fornecedor);
    setIsEditingBrand(false);
    setXmlContentForDataSystem(null);
    setCurrentTab("upload");
  };

  const handleXapuriMarkupChange = async (value: number) => {
    if (currentNFeId) {
      // Aplicar mudança localmente primeiro
      setPendingChanges(prev => ({ ...prev, xapuriMarkup: value }));
      
      // Salvar no servidor
      await updateNFE(currentNFeId, { xapuriMarkup: value });
      
      // Limpar mudança pendente após confirmação
      setPendingChanges(prev => {
        const { xapuriMarkup, ...rest } = prev;
        return rest;
      });
    }
  };

  const handleEpitaMarkupChange = async (value: number) => {
    if (currentNFeId) {
      // Aplicar mudança localmente primeiro
      setPendingChanges(prev => ({ ...prev, epitaMarkup: value }));
      
      // Salvar no servidor
      await updateNFE(currentNFeId, { epitaMarkup: value });
      
      // Limpar mudança pendente após confirmação
      setPendingChanges(prev => {
        const { epitaMarkup, ...rest } = prev;
        return rest;
      });
    }
  };

  const handleImpostoEntradaChange = async (value: number) => {
    if (currentNFeId) {
      // Aplicar mudança localmente primeiro
      setPendingChanges(prev => ({ ...prev, impostoEntrada: value }));
      
      // Salvar no servidor
      await updateNFE(currentNFeId, { impostoEntrada: value });
      
      // Limpar mudança pendente após confirmação
      setPendingChanges(prev => {
        const { impostoEntrada, ...rest } = prev;
        return rest;
      });
    }
  };

  const handleRoundingTypeChange = async (value: RoundingType) => {
    if (currentNFeId) {
      // Aplicar mudança localmente primeiro
      setPendingChanges(prev => ({ ...prev, roundingType: value }));
      
      // Salvar no servidor
      await updateNFE(currentNFeId, { roundingType: value });
      
      // Limpar mudança pendente após confirmação
      setPendingChanges(prev => {
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
          showHidden: showHidden
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
  }, [currentNFeId, products, invoiceNumber, brandName, impostoEntrada, xapuriMarkup, epitaMarkup, roundingType, hiddenItems, showHidden, updateNFE]);

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 to-slate-100">
      <div className="w-full px-4 py-8">
        {products.length === 0 && (
          <div className="w-full flex gap-8">
            {/* Sidebar com notas importadas */}
            {savedNFEs.length > 0 && (
              <div className="w-80 flex-shrink-0">
                <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6 sticky top-8">
                  <h3 className="text-lg font-semibold text-slate-900 mb-4 flex items-center gap-2">
                    <History size={20} />
                    Notas Importadas
                  </h3>
                  <div className="space-y-2 max-h-[calc(100vh-200px)] overflow-y-auto">
                    {Array.isArray(savedNFEs) ? (
                      savedNFEs.length > 0 ? (
                        savedNFEs.map((nfe) => (
                      <button
                        key={nfe.id}
                        onClick={() => handleLoadNFe(nfe)}
                        className="w-full text-left p-3 rounded-lg border border-slate-200 hover:border-blue-300 hover:bg-blue-50 transition-colors group"
                      >
                        <div className="font-medium text-slate-900 group-hover:text-blue-700 truncate">
                          {nfe.fornecedor}
                        </div>
                        <div className="text-sm text-slate-600 flex items-center justify-between">
                          <span>NF-e {nfe.numero}</span>
                          <span className="text-xs bg-slate-100 px-2 py-1 rounded">
                            {nfe.itens} itens
                          </span>
                        </div>
                      </button>
                        ))
                      ) : (
                        <div className="text-center py-4 text-slate-500">
                          Nenhuma NF-e salva ainda
                        </div>
                      )
                    ) : (
                      <div className="text-center py-4 text-slate-500">
                        Carregando NF-es...
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* Conteúdo principal */}
            <div className="flex-1 space-y-8">
              <div className="text-center">
                <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-blue-50 text-blue-700 text-sm font-medium mb-4">
                  <Info size={16} />
                  <span>Importador de NF-e</span>
                </div>
                <h1 className="text-3xl font-bold text-slate-900 mb-2">Importação de Produtos via XML</h1>
                <p className="text-slate-600 w-full max-w-2xl">
                  Faça upload do arquivo XML da NF-e para importar automaticamente os produtos
                </p>
              </div>

              <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-8">
                <div className="w-full">
                  <Tabs defaultValue="upload" value={currentTab} onValueChange={setCurrentTab} className="w-full">
                                      <TabsList className="grid w-full grid-cols-2 mb-6">
                    <TabsTrigger value="upload">Upload de XML</TabsTrigger>
                    <TabsTrigger value="pdf">Upload de PDF</TabsTrigger>
                  </TabsList>
                    
                    <TabsContent value="upload">
                      <FileUpload onFileSelect={handleFileSelect} />
                    </TabsContent>
                    


                    <TabsContent value="pdf">
                      <FileUploadPDF onItemsExtracted={setPdfItems} />
                      {pdfItems.length > 0 && (
                        <div className="mt-8">
                          <h2 className="text-xl font-bold mb-4 text-center">Produtos extraídos do PDF</h2>
                          <div className="overflow-x-auto">
                            <table className="min-w-full bg-white border border-gray-200 rounded-lg">
                              <thead>
                                <tr>
                                  <th className="px-4 py-2 border">Item</th>
                                  <th className="px-4 py-2 border">Descrição</th>
                                  <th className="px-4 py-2 border">Quantidade</th>
                                  <th className="px-4 py-2 border">Total Bruto</th>
                                  <th className="px-4 py-2 border">Total Líquido</th>
                                </tr>
                              </thead>
                              <tbody>
                                {pdfItems.map((item, idx) => (
                                  <tr key={idx}>
                                    <td className="px-4 py-2 border">{item.item}</td>
                                    <td className="px-4 py-2 border">{item.descricao}</td>
                                    <td className="px-4 py-2 border">{item.quantidade}</td>
                                    <td className="px-4 py-2 border">{item.totalBruto}</td>
                                    <td className="px-4 py-2 border">{item.totalLiquido}</td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          </div>
                        </div>
                      )}
                    </TabsContent>
                  </Tabs>
                </div>
              </div>
            </div>
          </div>
        )}

        {isProcessing && (
          <div className="text-center py-8">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-700 mx-auto"></div>
            <p className="mt-4 text-slate-600">Processando arquivo XML...</p>
          </div>
        )}

        {products.length > 0 && (
          <div className="w-full animate-fade-up">
            <div className="flex justify-between items-center mb-4">
              <div className="flex items-center gap-2">
                {isEditingBrand ? (
                  <div className="flex items-center gap-2">
                    <Input
                      value={brandName}
                      onChange={(e) => setBrandName(e.target.value)}
                      className="w-96 text-base font-medium"
                      autoFocus
                      onBlur={() => handleBrandNameChange(brandName)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') handleBrandNameChange(brandName);
                      }}
                    />
                  </div>
                ) : (
                  <div className="flex items-center gap-2">
                    <h1 className="text-xl font-medium">
                      {brandName}
                      {invoiceNumber && `: ${invoiceNumber}`}
                    </h1>
                    <button
                      onClick={() => setIsEditingBrand(true)}
                      className="text-gray-400 hover:text-gray-600"
                    >
                      <Edit2 size={14} />
                    </button>
                  </div>
                )}
              </div>

              <div className="flex items-center gap-2">
                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <Button
                      variant="outline"
                      size="sm"
                      className="flex items-center gap-2 text-red-600 hover:text-red-700"
                    >
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
            </div>

            <ProductPreview
              products={products}
              hiddenItemIds={hiddenItems}
              onToggleVisibilityById={(id) => {
                // Calcula o PRÓXIMO conjunto uma única vez e usa tanto local quanto servidor
                let nextArray: string[] = [];
                setHiddenItems(prev => {
                  const next = new Set(prev);
                  if (next.has(id)) {
                    next.delete(id);
                } else {
                    next.add(id);
                  }
                  nextArray = Array.from(next);
                  // Persistência local imediata para resistir a refresh
                  if (storageKey) {
                    try { localStorage.setItem(storageKey, JSON.stringify(nextArray)); } catch {}
                  }
                  return next;
                });
                
                if (currentNFeId) {
                  updateHiddenItems(currentNFeId, nextArray);
                  // Refrescar lista do servidor para refletir o novo estado
                  loadNFEs();
                }
              }}
              onNewFile={() => {
                setProducts([]);
                setCurrentNFeId(null);
                setInvoiceNumber("");
                setBrandName("");
                setIsEditingBrand(false);
                setXmlContentForDataSystem(null);
                setCurrentTab("upload");
              }}
              xapuriMarkup={xapuriMarkup}
              epitaMarkup={epitaMarkup}
              impostoEntrada={impostoEntrada}
              roundingType={roundingType}
              onXapuriMarkupChange={handleXapuriMarkupChange}
              onEpitaMarkupChange={handleEpitaMarkupChange}
              onImpostoEntradaChange={handleImpostoEntradaChange}
              onRoundingTypeChange={handleRoundingTypeChange}
            />
          </div>
        )}
      </div>
    </div>
  );
};

export default Index;

