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
import { useNFEStorage, NFE } from "@/hooks/useNFEStorage";
import { Product } from "@/types/nfe";
import { RoundingType } from "@/components/product-preview/productCalculations";
import { parseNFeXML } from "@/utils/nfeParser";

const Index = () => {
  const [products, setProducts] = useState<Product[]>([]);
  const [currentNFeId, setCurrentNFeId] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [currentTab, setCurrentTab] = useState("upload");
  const [xmlContentForDataSystem, setXmlContentForDataSystem] = useState<string | null>(null);
  const [pdfItems, setPdfItems] = useState<any[]>([]);
  const [invoiceNumber, setInvoiceNumber] = useState<string>("");
  const [brandName, setBrandName] = useState<string>("");
  const [isEditingBrand, setIsEditingBrand] = useState(false);

  const { savedNFEs, saveNFE, removeNFE, updateHiddenItems, updateShowHidden, updateNFE, loadNFEs } = useNFEStorage();

  // Estado centralizado no servidor - SEM estado local
  const currentNFE = currentNFeId && savedNFEs && savedNFEs.length > 0 
    ? savedNFEs.find(nfe => nfe && nfe.id && nfe.id === currentNFeId) 
    : null;
  
  // DEBUG: Log para identificar divergências
  useEffect(() => {
    if (currentNFeId && currentNFE && currentNFE.id) {
      console.log('🔍 DEBUG - NFE Carregada:', {
        id: currentNFE.id,
        hiddenItems: currentNFE.hiddenItems,
        showHidden: currentNFE.showHidden,
        productsCount: currentNFE.products?.length,
        xapuriMarkup: currentNFE.xapuriMarkup,
        epitaMarkup: currentNFE.epitaMarkup,
        timestamp: new Date().toISOString()
      });
    } else {
      console.log('🔍 DEBUG - NFE NÃO encontrada:', {
        currentNFeId,
        savedNFEsCount: savedNFEs?.length || 0,
        savedNFEs: savedNFEs?.map(n => n && n.id ? { id: n.id, number: n.number, xapuriMarkup: n.xapuriMarkup } : 'INVALID_NFE').filter(n => n !== 'INVALID_NFE') || [],
        timestamp: new Date().toISOString()
      });
    }
  }, [currentNFeId, currentNFE, savedNFEs]);

  // Valores vindos APENAS do servidor
  const xapuriMarkup = currentNFE?.xapuriMarkup || 160;
  const epitaMarkup = currentNFE?.epitaMarkup || 130;
  const impostoEntrada = currentNFE?.impostoEntrada || 12;
  const roundingType = (currentNFE?.roundingType as RoundingType) || 'none';
  const hiddenItems = new Set(currentNFE?.hiddenItems || []);
  const showHidden = currentNFE?.showHidden || false;

  // DEBUG: Log para valores derivados
  useEffect(() => {
    if (currentNFeId && currentNFE && currentNFE.id) {
      console.log('🔍 DEBUG - Valores Derivados:', {
        xapuriMarkup,
        epitaMarkup,
        impostoEntrada,
        roundingType,
        hiddenItems: Array.from(hiddenItems),
        showHidden,
        timestamp: new Date().toISOString()
      });
    }
  }, [currentNFeId, currentNFE, xapuriMarkup, epitaMarkup, impostoEntrada, roundingType, hiddenItems, showHidden]);

  // DEBUG: Log para savedNFEs
  useEffect(() => {
    if (savedNFEs && Array.isArray(savedNFEs)) {
      console.log('🔍 DEBUG - savedNFEs atualizado:', {
        count: savedNFEs.length,
        nfes: savedNFEs.map(n => n && n.id ? { id: n.id, number: n.number, xapuriMarkup: n.xapuriMarkup, hiddenItems: n.hiddenItems, showHidden: n.showHidden } : 'INVALID_NFE').filter(n => n !== 'INVALID_NFE'),
        timestamp: new Date().toISOString()
      });
    } else {
      console.warn('⚠️ savedNFEs não é um array válido:', savedNFEs);
    }
  }, [savedNFEs]);

  // Sincronização automática quando currentNFeId muda
  useEffect(() => {
    if (currentNFeId && currentNFE) {
      console.log('🔍 DEBUG - Carregando products da NFE:', {
        nfeId: currentNFE.id,
        productsCount: currentNFE.products?.length,
        products: currentNFE.products,
        hiddenItems: currentNFE.hiddenItems,
        showHidden: currentNFE.showHidden
      });
      
      // Normalizar products para garantir compatibilidade
      const normalizedProducts = currentNFE.products?.map(p => ({
        ...p,
        code: p.code ?? p.code ?? '',
        description: p.description ?? p.description ?? p.name ?? '',
        cor: p.cor ?? '',
        totalPrice: p.totalPrice ?? p.totalValue ?? 0
      })) || [];
      
      console.log('🔍 DEBUG - Produtos normalizados:', {
        count: normalizedProducts.length,
        products: normalizedProducts
      });
      
      setProducts(normalizedProducts);
      setInvoiceNumber(currentNFE.number);
      setBrandName(currentNFE.supplier);
    } else {
      console.log('🔍 DEBUG - NFE não encontrada ou sem ID:', {
        currentNFeId,
        currentNFE: currentNFE ? { id: currentNFE.id, productsCount: currentNFE.products?.length } : null
      });
    }
  }, [currentNFeId, currentNFE]);

  // Sincronização forçada a cada mudança
  useEffect(() => {
    if (currentNFeId) {
      // Recarregar dados do servidor a cada mudança
      const syncInterval = setInterval(() => {
        loadNFEs();
      }, 1000); // Sincronizar a cada 1 segundo

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

    const number = ideNode.querySelector('nNF')?.textContent || '';
    const issueDate = ideNode.querySelector('dhEmi')?.textContent || '';
    const chaveNFE = nfeNode.querySelector('infNFe')?.getAttribute('Id')?.replace('NFe', '') || '';
    
    const emitNome = emitNode.querySelector('xNome')?.textContent || '';
    const emitCNPJ = emitNode.querySelector('CNPJ')?.textContent || emitNode.querySelector('CPF')?.textContent || '';

    return {
      number,
      issueDate,
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
      console.log('🔍 DEBUG - Produtos extraídos do XML:', {
        count: extractedProducts.length,
        products: extractedProducts
      });
      
      const nfeId = `nfe_${Date.now()}`;
      
      // Salvar NFE com valores padrão
      const nfe = {
        id: nfeId,
        date: nfeInfo.issueDate,
        number: nfeInfo.number,
        chaveNFE: nfeInfo.chaveNFE,
        supplier: nfeInfo.emitNome,
        value: extractedProducts.reduce((sum, p) => sum + p.totalPrice, 0),
        items: extractedProducts.length,
        products: extractedProducts,
        impostoEntrada: 12,
        xapuriMarkup: 160,
        epitaMarkup: 130,
        roundingType: 'none',
        hiddenItems: [],
        showHidden: false
      };
      
      console.log('🔍 DEBUG - Salvando NFE:', {
        nfeId: nfe.id,
        productsCount: nfe.products.length,
        products: nfe.products
      });
      
      // Salvar NFE
      const result = await saveNFE(nfe);
      console.log('🔍 DEBUG - NFE salva com resultado:', result);
      
      // Fazer GET específico da NFE recém-criada para garantir sincronização
      if (result && result.id) {
        try {
          await loadNFEs(); // Recarregar lista completa
          console.log('🔍 DEBUG - Lista de NFEs recarregada após salvar');
          
          // Aguardar um pouco para garantir que os dados foram sincronizados
          setTimeout(async () => {
            // Buscar NFE específica para confirmar que foi salva
            const savedNFE = savedNFEs.find(n => n && n.id === result.id);
            if (savedNFE && savedNFE.products && savedNFE.products.length > 0) {
              console.log('🔍 DEBUG - NFE encontrada após salvar:', {
                id: savedNFE.id,
                productsCount: savedNFE.products.length
              });
              
              // Definir como NFE atual
              setCurrentNFeId(result.id);
              setInvoiceNumber(nfeInfo.number);
              setBrandName(nfeInfo.emitNome);
              setXmlContentForDataSystem(text);
              
              // Carregar products da NFE salva
              const normalizedProducts = savedNFE.products.map(p => ({
                ...p,
                code: p.code ?? p.code ?? '',
                description: p.description ?? p.description ?? p.name ?? '',
                cor: p.cor ?? '',
                totalPrice: p.totalPrice ?? p.totalValue ?? 0
              }));
              
              setProducts(normalizedProducts);
              
              console.log('🔍 DEBUG - Produtos carregados da NFE salva:', {
                nfeId: result.id,
                productsCount: normalizedProducts.length
              });
            } else {
              console.warn('⚠️ NFE não encontrada ou sem products após salvar:', result.id);
              // Fallback: usar products extraídos diretamente
              setCurrentNFeId(result.id);
              setInvoiceNumber(nfeInfo.number);
              setBrandName(nfeInfo.emitNome);
              setXmlContentForDataSystem(text);
              setProducts(extractedProducts);
            }
          }, 500); // Aguardar 500ms para sincronização
          
        } catch (error) {
          console.error('❌ Erro ao recarregar NFEs após salvar:', error);
          // Fallback: usar products extraídos diretamente
          setCurrentNFeId(result.id);
          setInvoiceNumber(nfeInfo.number);
          setBrandName(nfeInfo.emitNome);
          setXmlContentForDataSystem(text);
          setProducts(extractedProducts);
        }
      } else {
        console.error('❌ NFE salva mas sem ID retornado');
        // Fallback: usar products extraídos diretamente
        setCurrentNFeId(nfeId);
        setInvoiceNumber(nfeInfo.number);
        setBrandName(nfeInfo.emitNome);
        setXmlContentForDataSystem(text);
        setProducts(extractedProducts);
      }
      
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
    
    const number = ideNode.querySelector('nNF')?.textContent || '';
    return number;
  };

  const handleLoadNFe = (nfe: NFE) => {
    console.log('🔍 DEBUG - Carregando NFE existente:', {
      nfeId: nfe.id,
      productsCount: nfe.products?.length,
      products: nfe.products,
      hiddenItems: nfe.hiddenItems,
      showHidden: nfe.showHidden
    });
    
    // Definir como NFE atual
    setCurrentNFeId(nfe.id);
    
    // Carregar products IMEDIATAMENTE se existirem
    if (nfe.products && nfe.products.length > 0) {
      console.log('🔍 DEBUG - Carregando products da NFE existente:', {
        count: nfe.products.length,
        products: nfe.products
      });
      
      // Normalizar products para garantir compatibilidade
      const normalizedProducts = nfe.products.map(p => ({
        ...p,
        code: p.code ?? p.code ?? '',
        description: p.description ?? p.description ?? p.name ?? '',
        cor: p.cor ?? '',
        totalPrice: p.totalPrice ?? p.totalValue ?? 0
      }));
      
      setProducts(normalizedProducts);
      setInvoiceNumber(nfe.number);
      setBrandName(nfe.supplier);
      
      console.log('🔍 DEBUG - Produtos carregados da NFE existente:', {
        count: normalizedProducts.length,
        products: normalizedProducts
      });
    } else {
      console.warn('⚠️ NFE sem products:', nfe.id);
      setProducts([]);
    }
  };

  // Funções que SALVAM DIRETAMENTE NO SERVIDOR e FORÇAM SINCRONIZAÇÃO
  const handleXapuriMarkupChange = async (value: number) => {
    if (currentNFeId) {
      await updateNFE(currentNFeId, { xapuriMarkup: value });
      // Forçar sincronização imediata
      await loadNFEs();
    }
  };

  const handleEpitaMarkupChange = async (value: number) => {
    if (currentNFeId) {
      await updateNFE(currentNFeId, { epitaMarkup: value });
      // Forçar sincronização imediata
      await loadNFEs();
    }
  };

  const handleImpostoEntradaChange = async (value: number) => {
    if (currentNFeId) {
      await updateNFE(currentNFeId, { impostoEntrada: value });
      // Forçar sincronização imediata
      await loadNFEs();
    }
  };

  const handleRoundingTypeChange = async (value: RoundingType) => {
    if (currentNFeId) {
      await updateNFE(currentNFeId, { roundingType: value });
      // Forçar sincronização imediata
      await loadNFEs();
    }
  };

  const handleBrandNameChange = (newName: string) => {
    setBrandName(newName);
    setIsEditingBrand(false);
  };

  // Função robusta para ocultar/exibir items
  const handleToggleVisibility = async (index: number) => {
    if (!currentNFeId) return;
    
    const newHiddenItems = new Set(hiddenItems);
    if (newHiddenItems.has(index)) {
      newHiddenItems.delete(index);
    } else {
      newHiddenItems.add(index);
    }
    
    // Salvar IMEDIATAMENTE no servidor
    await updateHiddenItems(currentNFeId, Array.from(newHiddenItems));
    // Forçar sincronização imediata
    await loadNFEs();
  };

  // Função robusta para switch "Mostrar apenas ocultados"
  const handleShowHiddenChange = async (value: boolean) => {
    if (!currentNFeId) return;
    
    // Salvar IMEDIATAMENTE no servidor
    await updateShowHidden(currentNFeId, value);
    // Forçar sincronização imediata
    await loadNFEs();
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 to-slate-100">
      <div className="w-full px-4 py-8">
        {(!products || products.length === 0) && (
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
                    {savedNFEs.map((nfe) => (
                      <button
                        key={nfe.id}
                        onClick={() => handleLoadNFe(nfe)}
                        className="w-full text-left p-3 rounded-lg border border-slate-200 hover:border-blue-300 hover:bg-blue-50 transition-colors group"
                      >
                        <div className="font-medium text-slate-900 group-hover:text-blue-700 truncate">
                          {nfe.supplier}
                        </div>
                        <div className="text-sm text-slate-600 flex items-center justify-between">
                          <span>NF-e {nfe.number}</span>
                          <span className="text-xs bg-slate-100 px-2 py-1 rounded">
                            {nfe.items} items
                          </span>
                        </div>
                      </button>
                    ))}
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
                  Faça upload do arquivo XML da NF-e para importar automaticamente os products
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
                                    <td className="px-4 py-2 border">{item.description}</td>
                                    <td className="px-4 py-2 border">{item.quantity}</td>
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

        {products && products.length > 0 && (
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
              hiddenItems={hiddenItems}
              showHidden={showHidden}
              onToggleVisibility={handleToggleVisibility}
              onShowHiddenChange={handleShowHiddenChange}
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
              roundingType={roundingType}
              impostoEntrada={impostoEntrada}
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

