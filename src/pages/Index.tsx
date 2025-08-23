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
  const currentNFE = currentNFeId ? savedNFEs.find(nfe => nfe.id === currentNFeId) : null;
  
  // DEBUG: Log para identificar divergências
  useEffect(() => {
    if (currentNFeId && currentNFE) {
      console.log('🔍 DEBUG - NFE Carregada:', {
        id: currentNFE.id,
        hiddenItems: currentNFE.hiddenItems,
        showHidden: currentNFE.showHidden,
        produtosCount: currentNFE.produtos?.length,
        xapuriMarkup: currentNFE.xapuriMarkup,
        epitaMarkup: currentNFE.epitaMarkup,
        timestamp: new Date().toISOString()
      });
    } else {
      console.log('🔍 DEBUG - NFE NÃO encontrada:', {
        currentNFeId,
        savedNFEsCount: savedNFEs.length,
        savedNFEs: savedNFEs.map(n => ({ id: n.id, numero: n.numero, xapuriMarkup: n.xapuriMarkup })),
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
    if (currentNFeId) {
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
  }, [currentNFeId, xapuriMarkup, epitaMarkup, impostoEntrada, roundingType, hiddenItems, showHidden]);

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
      console.log('🔍 DEBUG - Carregando produtos da NFE:', {
        nfeId: currentNFE.id,
        produtosCount: currentNFE.produtos?.length,
        produtos: currentNFE.produtos,
        hiddenItems: currentNFE.hiddenItems,
        showHidden: currentNFE.showHidden
      });
      
      // Normalizar produtos para garantir compatibilidade
      const normalizedProducts = currentNFE.produtos?.map(p => ({
        ...p,
        codigo: p.codigo ?? p.code ?? '',
        descricao: p.descricao ?? p.description ?? p.name ?? '',
        cor: p.cor ?? '',
        totalPrice: p.totalPrice ?? p.valorTotal ?? 0
      })) || [];
      
      console.log('🔍 DEBUG - Produtos normalizados:', {
        count: normalizedProducts.length,
        produtos: normalizedProducts
      });
      
      setProducts(normalizedProducts);
      setInvoiceNumber(currentNFE.numero);
      setBrandName(currentNFE.fornecedor);
    } else {
      console.log('🔍 DEBUG - NFE não encontrada ou sem ID:', {
        currentNFeId,
        currentNFE: currentNFE ? { id: currentNFE.id, produtosCount: currentNFE.produtos?.length } : null
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
      
      // Salvar NFE com valores padrão
      const nfe = {
        id: nfeId,
        data: nfeInfo.dataEmissao,
        numero: nfeInfo.numero,
        chaveNFE: nfeInfo.chaveNFE,
        fornecedor: nfeInfo.emitNome,
        valor: extractedProducts.reduce((sum, p) => sum + p.totalPrice, 0),
        itens: extractedProducts.length,
        produtos: extractedProducts,
        impostoEntrada: 12,
        xapuriMarkup: 160,
        epitaMarkup: 130,
        roundingType: 'none',
        hiddenItems: [],
        showHidden: false
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

  const handleLoadNFe = (nfe: NFE) => {
    console.log('🔍 DEBUG - Carregando NFE:', {
      nfeId: nfe.id,
      produtosCount: nfe.produtos?.length,
      produtos: nfe.produtos,
      hiddenItems: nfe.hiddenItems,
      showHidden: nfe.showHidden
    });
    
    setCurrentNFeId(nfe.id);
    // Os produtos e outros dados serão carregados via useEffect
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

  // Função robusta para ocultar/exibir itens
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
                    {savedNFEs.map((nfe) => (
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

