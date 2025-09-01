import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { 
  Upload, 
  FileText, 
  Building2, 
  Calendar, 
  Package2, 
  TrendingUp, 
  Settings, 
  History,
  Plus,
  ArrowRight,
  Zap,
  Shield,
  BarChart3,
  Download,
  Search,
  Filter,
  RefreshCw,
  AlertTriangle,
  DollarSign,
  Hash,
  Receipt,
  Bookmark,
  Trophy,
  Info,
  ArrowUpRight,
  ArrowDownRight
} from "lucide-react";
import FileUpload from "@/components/FileUpload";
import { XmlIntegration } from "@/components/XmlIntegration";
import FileUploadPDF from "@/components/FileUploadPDF";
import ProductPreview from "@/components/product-preview/ProductPreview";
import { useNFEStorage } from "@/hooks/useNFEStorage";
import { useAutoSave } from "@/hooks/useAutoSave";
import { nfeAPI, uploadAPI } from "@/services/api";
import { Product } from "@/types/nfe";
import { NFE } from "@/hooks/useNFEStorage";
import { RoundingType } from "@/components/product-preview/productCalculations";
import { parseNFeXML } from "@/utils/nfeParser";
import { formatCurrency, formatDate } from '@/utils/formatters';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { toast } from "@/components/ui/use-toast";
import SavedNFEList from '@/components/SavedNFEList';

const Index = () => {
  const navigate = useNavigate();
  const [products, setProducts] = useState<Product[]>([]);
  const [currentNFeId, setCurrentNFeId] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [currentView, setCurrentView] = useState<"welcome" | "upload" | "products" | "dashboard">("welcome");
  const [pdfItems, setPdfItems] = useState<any[]>([]);
  const [hiddenItems, setHiddenItems] = useState<Set<number>>(new Set());
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedFornecedor, setSelectedFornecedor] = useState<string | null>(null);
  
  // Configurações
  const [xapuriMarkup, setXapuriMarkup] = useState(() => {
    const saved = localStorage.getItem('xapuriMarkup');
    return saved ? parseInt(saved) : 160;
  });
  const [epitaMarkup, setEpitaMarkup] = useState(() => {
    const saved = localStorage.getItem('epitaMarkup');
    return saved ? parseInt(saved) : 130;
  });
  const [impostoEntrada, setImpostoEntrada] = useState(() => {
    const saved = localStorage.getItem('impostoEntrada');
    return saved ? parseInt(saved) : 12;
  });
  const [roundingType, setRoundingType] = useState<RoundingType>(() => {
    const saved = localStorage.getItem('roundingType');
    return (saved as RoundingType) || 'none';
  });
  
  const [invoiceNumber, setInvoiceNumber] = useState<string>("");
  const [brandName, setBrandName] = useState<string>("");
  const [isEditingBrand, setIsEditingBrand] = useState(false);
  
  // Estado para confirmação de duplicata
  const [duplicateConfirmation, setDuplicateConfirmation] = useState<{
    file: File;
    duplicateInfo: {
      existingNfe: {
        id: string;
        numero: string;
        fornecedor: string;
        valor: number;
      };
      newNfe: {
        numero: string;
        fornecedor: string;
        valor: number;
      };
      question: string;
      options: {
        replace: string;
        cancel: string;
      };
    };
  } | null>(null);

  const { savedNFEs, saveNFE, removeNFE, loadNFEs } = useNFEStorage();

  // Criar objeto NFE atual para auto-save
  const currentNFE: NFE | null = currentNFeId ? {
    id: currentNFeId,
    data: new Date().toISOString().split('T')[0],
    numero: invoiceNumber || '',
    fornecedor: brandName || '',
    valor: products.reduce((sum, p) => sum + (p.totalPrice ?? 0), 0),
    itens: products.length,
    produtos: products,
    chaveNFE: '',
    impostoEntrada: impostoEntrada,
    xapuriMarkup: xapuriMarkup,
    epitaMarkup: epitaMarkup,
    roundingType: roundingType
  } : null;

  // Configurar auto-save
  const { saveImmediately } = useAutoSave(currentNFE, { enabled: currentNFeId !== null });

  // Carregar NFEs ao montar o componente
  useEffect(() => {
    loadNFEs();
  }, [loadNFEs]);

  // Estatísticas das NFEs
  const stats = {
    totalNFEs: Array.isArray(savedNFEs) ? savedNFEs.length : 0,
    totalProdutos: Array.isArray(savedNFEs) ? savedNFEs.reduce((sum, nfe) => sum + (nfe.itens || 0), 0) : 0,
    valorTotal: Array.isArray(savedNFEs) ? savedNFEs.reduce((sum, nfe) => sum + (nfe.valor || 0), 0) : 0,
    fornecedores: Array.isArray(savedNFEs) ? [...new Set(savedNFEs.map(nfe => nfe.fornecedor))].length : 0
  };

  // Filtrar NFEs
  const filteredNFEs = Array.isArray(savedNFEs) ? savedNFEs.filter(nfe => {
    const matchesSearch = !searchTerm || 
      nfe.fornecedor.toLowerCase().includes(searchTerm.toLowerCase()) ||
      nfe.numero.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesFornecedor = !selectedFornecedor || nfe.fornecedor === selectedFornecedor;
    return matchesSearch && matchesFornecedor;
  }) : [];

  // Dashboard variables
  const [periodoSelecionado, setPeriodoSelecionado] = useState('mes');
  const totalNotas = Array.isArray(savedNFEs) ? savedNFEs.length : 0;
  const totalProdutos = Array.isArray(savedNFEs) ? savedNFEs.reduce((acc, nfe) => acc + (Array.isArray(nfe.produtos) ? nfe.produtos.length : 0), 0) : 0;
  const quantidadeTotal = Array.isArray(savedNFEs) ? savedNFEs.reduce((acc, nfe) => 
    acc + (Array.isArray(nfe.produtos) ? nfe.produtos.reduce((sum, prod) => sum + (Number(prod.quantidade) || 0), 0) : 0), 0) : 0;
  const valorTotal = Array.isArray(savedNFEs) ? savedNFEs.reduce((acc, nfe) => acc + (Number(nfe.valor) || 0), 0) : 0;
  const totalImpostos = valorTotal * 0.17;
  const notasFavoritas = Array.isArray(savedNFEs) ? savedNFEs.filter(nfe => nfe.isFavorite).length : 0;

  // Volume por fornecedor
  const volumePorFornecedor = Array.isArray(savedNFEs) ? savedNFEs.reduce((acc: any, nfe) => {
    const fornecedorNome = nfe.fornecedor || 'Fornecedor não especificado';
    if (!acc[fornecedorNome]) {
      acc[fornecedorNome] = {
        valor: 0,
        itens: 0,
        performance: 0,
        crescimento: 0
      };
    }
    acc[fornecedorNome].valor += Number(nfe.valor) || 0;
    acc[fornecedorNome].itens += Number(nfe.itens) || 0;
    return acc;
  }, {}) : {};

  const fornecedoresOrdenados = Object.entries(volumePorFornecedor)
    .map(([nome, dados]: [string, any]) => ({
      name: nome,
      value: dados.valor,
      items: dados.itens,
      performance: '80%',
      crescimento: dados.crescimento
    }))
    .sort((a, b) => b.value - a.value);

  const fornecedorMaiorCrescimento = fornecedoresOrdenados[0] || {
    name: 'Nenhum fornecedor',
    value: 0,
    items: 0,
    crescimento: 0
  };

  const handleNFESelect = (nfeId: string) => {
    window.open(`/notas-em-aberto/${nfeId}`, '_blank');
  };

  const formattedNFEs = Array.isArray(savedNFEs) ? savedNFEs.map(nfe => ({
    id: nfe.id,
    numero: nfe.numero,
    fornecedor: nfe.fornecedor,
    dataEmissao: nfe.data,
    quantidadeItens: Array.isArray(nfe.produtos) ? nfe.produtos.length : 0
  })) : [];

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
      setHiddenItems(new Set());
      setCurrentNFeId(null);
      setInvoiceNumber("");
      setBrandName("");
      setIsEditingBrand(false);
      setCurrentView("welcome");
    }
  };

  const handleFileSelect = async (file: File) => {
    setIsProcessing(true);
    try {
      // Primeiro, validar o XML usando o novo endpoint
      const validationResult = await uploadAPI.uploadWithValidation(file);
      
      if (!validationResult.success) {
        throw new Error(validationResult.error || 'Erro na validação do XML');
      }

      if (!validationResult.validation.isValid) {
        const errorMsg = `XML da NFe contém erros:\n${validationResult.validation.errors.join('\n')}`;
        throw new Error(errorMsg);
      }

      // Se há warnings, mostrar mas continuar
      if (validationResult.validation.warnings.length > 0) {
        console.warn('⚠️ Avisos na validação XML:', validationResult.validation.warnings);
      }

      // Processar o XML validado
      const text = validationResult.content || await file.text();
      const xmlDoc = new DOMParser().parseFromString(text, 'text/xml');
      
      const nfeInfo = extractNFeInfo(xmlDoc);
      if (!nfeInfo) {
        throw new Error('Arquivo XML inválido ou não é uma NF-e');
      }

      const extractedProducts = parseNFeXML(text);
      setProducts(extractedProducts);
      setHiddenItems(new Set());
      
      const nfeId = (nfeInfo.chaveNFE && nfeInfo.chaveNFE.trim()) ? nfeInfo.chaveNFE.trim() : `nfe_${Date.now()}`;
      setCurrentNFeId(nfeId);
      setInvoiceNumber(nfeInfo.numero);
      setBrandName(nfeInfo.emitNome);
      
      // Salvar NFE com todos os campos necessários
      const valorTotal = extractedProducts.reduce((sum, p) => sum + (p.totalPrice ?? 0), 0);
      const quantidadeTotal = extractedProducts.reduce((sum, p) => sum + (p.quantity ?? 0), 0);
      
      const nfe: NFE = {
           id: nfeId,
           data: nfeInfo.dataEmissao ?? new Date().toISOString().split('T')[0],
           numero: nfeInfo.numero || '',
           fornecedor: nfeInfo.emitNome || '',
           valor: valorTotal,
           itens: extractedProducts.length,
           produtos: extractedProducts,
           chaveNFE: nfeInfo.chaveNFE || '',
           impostoEntrada: impostoEntrada,
           xapuriMarkup: xapuriMarkup,
           epitaMarkup: epitaMarkup,
           roundingType: roundingType as 'none' | 'up' | 'down' | 'nearest'
         };
      
      console.log('🔍 Debug NFE validada e processada:', {
        id: nfe.id,
        fornecedor: nfe.fornecedor,
        numero: nfe.numero,
        valor: nfe.valor,
        produtosLength: nfe.produtos?.length || 0,
        validationInfo: validationResult.info
      });
      
      saveImmediately(nfe);
      setCurrentView("products");
    } catch (error: any) {
      console.error('Erro ao processar arquivo:', error);
      
      // Tratar especificamente erros 409 (duplicatas)
      if (error && typeof error === 'object' && error.response?.status === 409 && error.response?.data?.isDuplicate) {
        const duplicateData = error.response.data;
        setDuplicateConfirmation({
          file,
          duplicateInfo: {
            existingNfe: duplicateData.existingNfe,
            newNfe: duplicateData.newNfe,
            question: duplicateData.question,
            options: duplicateData.options
          }
        });
        return; // Não mostrar erro, aguardar confirmação do usuário
      } else {
        const errorMessage = error instanceof Error ? error.message : 'Erro desconhecido ao processar XML';
        alert(`❌ Erro ao processar arquivo XML:\n\n${errorMessage}`);
      }
    } finally {
      setIsProcessing(false);
    }
  };

  const handleXmlFromIntegration = (xmlContent: string) => {
    handleFileSelect(new File([xmlContent], 'nfe.xml', { type: 'text/xml' }));
  };

  const handleLoadNFe = async (nfe: NFE) => {
    try {
      const detailed = await nfeAPI.getById(nfe.id);
      const produtos = Array.isArray(detailed.produtos) ? detailed.produtos : [];

      setProducts(produtos);
      setHiddenItems(new Set());
      setCurrentNFeId(detailed.id);
      setInvoiceNumber(detailed.numero);
      setBrandName(detailed.fornecedor);
      setIsEditingBrand(false);
      setCurrentView("products");
    } catch (err) {
      console.error('Falha ao carregar NFE detalhada:', err);
      setProducts(Array.isArray(nfe.produtos) ? nfe.produtos : []);
      setHiddenItems(new Set());
      setCurrentNFeId(nfe.id);
      setInvoiceNumber(nfe.numero);
      setBrandName(nfe.fornecedor);
      setIsEditingBrand(false);
      setCurrentView("products");
    }
  };

  const handleXapuriMarkupChange = (value: number) => {
    setXapuriMarkup(value);
    localStorage.setItem('xapuriMarkup', value.toString());
  };

  const handleEpitaMarkupChange = (value: number) => {
    setEpitaMarkup(value);
    localStorage.setItem('epitaMarkup', value.toString());
  };

  const handleImpostoEntradaChange = (value: number) => {
    setImpostoEntrada(value);
    localStorage.setItem('impostoEntrada', value.toString());
  };

  const handleRoundingTypeChange = (value: RoundingType) => {
    setRoundingType(value);
    localStorage.setItem('roundingType', value.toString());
  };

  const handleBrandNameChange = (newName: string) => {
    setBrandName(newName);
    setIsEditingBrand(false);
  };

  // Funções para lidar com confirmação de duplicata
  const handleConfirmReplace = async () => {
    if (!duplicateConfirmation) return;
    
    setIsProcessing(true);
    try {
      const result = await uploadAPI.uploadWithConfirmation(duplicateConfirmation.file, true);
      
      if (result.success) {
        // Processar o XML após confirmação de substituição
        const text = result.content || await duplicateConfirmation.file.text();
        const xmlDoc = new DOMParser().parseFromString(text, 'text/xml');
        
        const nfeInfo = extractNFeInfo(xmlDoc);
        if (!nfeInfo) {
          throw new Error('Arquivo XML inválido ou não é uma NF-e');
        }

        const extractedProducts = parseNFeXML(text);
        setProducts(extractedProducts);
        setHiddenItems(new Set());
        
        const nfeId = (nfeInfo.chaveNFE && nfeInfo.chaveNFE.trim()) ? nfeInfo.chaveNFE.trim() : `nfe_${Date.now()}`;
        setCurrentNFeId(nfeId);
        setInvoiceNumber(nfeInfo.numero);
        setBrandName(nfeInfo.emitNome);
        
        // Salvar NFE substituída
        const valorTotal = extractedProducts.reduce((sum, p) => sum + (p.totalPrice ?? 0), 0);
        const quantidadeTotal = extractedProducts.reduce((sum, p) => sum + (p.quantity ?? 0), 0);
        
        const nfe: NFE = {
          id: nfeId,
          data: nfeInfo.dataEmissao ?? new Date().toISOString().split('T')[0],
          numero: nfeInfo.numero || '',
          fornecedor: nfeInfo.emitNome || '',
          valor: valorTotal,
          itens: extractedProducts.length,
          produtos: extractedProducts,
          chaveNFE: nfeInfo.chaveNFE || '',
          impostoEntrada: impostoEntrada,
          xapuriMarkup: xapuriMarkup,
          epitaMarkup: epitaMarkup,
          roundingType: roundingType as 'none' | 'up' | 'down' | 'nearest'
        };
        
        saveImmediately(nfe);
        setCurrentView("products");
        alert(`✅ Arquivo ${duplicateConfirmation.file.name} substituído com sucesso!`);
      } else {
        throw new Error(result.error || 'Erro ao substituir arquivo');
      }
    } catch (error: any) {
      console.error('Erro ao substituir arquivo:', error);
      const errorMessage = error instanceof Error ? error.message : 'Erro desconhecido ao substituir XML';
      alert(`❌ Erro ao substituir arquivo:\n\n${errorMessage}`);
    } finally {
      setDuplicateConfirmation(null);
      setIsProcessing(false);
    }
  };

  const handleCancelReplace = () => {
    setDuplicateConfirmation(null);
    alert('ℹ️ Substituição cancelada');
  };

  // Renderizar tela de boas-vindas
  if (currentView === "welcome") {
  return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50">
        <div className="max-w-7xl mx-auto px-4 py-12">


          {/* Cards de Estatísticas */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-16">
            <Card className="bg-white/80 backdrop-blur-sm border-0 shadow-lg hover:shadow-xl transition-all duration-300">
              <CardContent className="p-6 text-center">
                <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center mx-auto mb-4">
                  <FileText className="w-6 h-6 text-blue-600" />
                </div>
                <div className="text-3xl font-bold text-slate-900 mb-2">{stats.totalNFEs}</div>
                <div className="text-slate-600">Notas Fiscais</div>
              </CardContent>
            </Card>

            <Card className="bg-white/80 backdrop-blur-sm border-0 shadow-lg hover:shadow-xl transition-all duration-300">
              <CardContent className="p-6 text-center">
                <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center mx-auto mb-4">
                  <Package2 className="w-6 h-6 text-green-600" />
                </div>
                <div className="text-3xl font-bold text-slate-900 mb-2">{stats.totalProdutos}</div>
                <div className="text-slate-600">Produtos</div>
              </CardContent>
            </Card>

            <Card className="bg-white/80 backdrop-blur-sm border-0 shadow-lg hover:shadow-xl transition-all duration-300">
              <CardContent className="p-6 text-center">
                <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center mx-auto mb-4">
                  <TrendingUp className="w-6 h-6 text-purple-600" />
                </div>
                <div className="text-3xl font-bold text-slate-900 mb-2">{formatCurrency(stats.valorTotal)}</div>
                <div className="text-slate-600">Valor Total</div>
              </CardContent>
            </Card>

            <Card className="bg-white/80 backdrop-blur-sm border-0 shadow-lg hover:shadow-xl transition-all duration-300">
              <CardContent className="p-6 text-center">
                <div className="w-12 h-12 bg-orange-100 rounded-lg flex items-center justify-center mx-auto mb-4">
                  <Building2 className="w-6 h-6 text-orange-600" />
                </div>
                <div className="text-3xl font-bold text-slate-900 mb-2">{stats.fornecedores}</div>
                <div className="text-slate-600">Fornecedores</div>
              </CardContent>
            </Card>
          </div>

          {/* Ações Principais */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-16">
            <Card className="bg-white/80 backdrop-blur-sm border-0 shadow-lg hover:shadow-xl transition-all duration-300 cursor-pointer group" onClick={() => setCurrentView("upload")}>
              <CardContent className="p-8 text-center">
                <div className="w-16 h-16 bg-gradient-to-r from-blue-500 to-blue-600 rounded-full flex items-center justify-center mx-auto mb-6 group-hover:scale-110 transition-transform duration-300">
                  <Upload className="w-8 h-8 text-white" />
                </div>
                <h3 className="text-2xl font-bold text-slate-900 mb-3">Importar Nova NF-e</h3>
                <p className="text-slate-600 mb-6">
                  Faça upload de arquivos XML de notas fiscais eletrônicas para processamento
                </p>
                <Button size="lg" className="group-hover:bg-blue-700 transition-colors">
                  Começar Importação
                  <ArrowRight className="w-4 h-4 ml-2" />
                </Button>
              </CardContent>
            </Card>

            <Card className="bg-white/80 backdrop-blur-sm border-0 shadow-lg hover:shadow-xl transition-all duration-300 cursor-pointer group" onClick={() => setCurrentView("dashboard")}>
              <CardContent className="p-8 text-center">
                <div className="w-16 h-16 bg-gradient-to-r from-green-500 to-green-600 rounded-full flex items-center justify-center mx-auto mb-6 group-hover:scale-110 transition-transform duration-300">
                  <BarChart3 className="w-8 h-8 text-white" />
                </div>
                <h3 className="text-2xl font-bold text-slate-900 mb-3">Dashboard</h3>
                <p className="text-slate-600 mb-6">
                  Visualize estatísticas, histórico e gerencie suas notas fiscais
                </p>
                <Button size="lg" variant="outline" className="group-hover:bg-green-50 transition-colors">
                  Ver Dashboard
                  <ArrowRight className="w-4 h-4 ml-2" />
                </Button>
              </CardContent>
            </Card>
          </div>

          {/* NFEs Recentes */}
          {filteredNFEs.length > 0 && (
            <Card className="bg-white/80 backdrop-blur-sm border-0 shadow-lg">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="text-2xl">Notas Fiscais Recentes</CardTitle>
                    <CardDescription>
                      Suas últimas importações e processamentos
                    </CardDescription>
                  </div>
                  <Button variant="outline" onClick={() => navigate('/dashboard')}>
                    Ver Todas
                    <ArrowRight className="w-4 h-4 ml-2" />
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {filteredNFEs.slice(0, 6).map((nfe) => (
                    <Card 
                        key={nfe.id}
                      className="hover:shadow-md transition-shadow cursor-pointer border-l-4 border-l-blue-500"
                        onClick={() => window.open(`/notas-em-aberto/${nfe.id}`, '_blank')}
                    >
                      <CardContent className="p-4">
                        <div className="flex items-start justify-between mb-3">
                          <div className="flex-1">
                            <h4 className="font-semibold text-slate-900 truncate">{nfe.fornecedor}</h4>
                            <p className="text-sm text-slate-600">NF-e {nfe.numero}</p>
                        </div>
                          <Badge variant="secondary" className="text-xs">
                            {nfe.itens} itens
                          </Badge>
                        </div>
                        <div className="flex items-center justify-between text-sm text-slate-500">
                          <span>{formatDate(new Date(nfe.data))}</span>
                          <span className="font-medium">{formatCurrency(nfe.valor)}</span>
                      </div>
                      </CardContent>
                    </Card>
                    ))}
                  </div>
              </CardContent>
            </Card>
          )}


        </div>
                </div>
    );
  }

  // Renderizar tela de upload
  if (currentView === "upload") {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50">
        <div className="max-w-6xl mx-auto px-4 py-8">
          {/* Header */}
          <div className="text-center mb-8">
            <Button 
              variant="ghost" 
              onClick={() => setCurrentView("welcome")}
              className="mb-4"
            >
              ← Voltar ao Início
            </Button>
            <h1 className="text-4xl font-bold text-slate-900 mb-4">Importar Nota Fiscal</h1>
            <p className="text-lg text-slate-600">
              Escolha uma das opções abaixo para importar sua NF-e
                </p>
              </div>

          {/* Opções de Upload */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-12">
            <Card className="bg-white/80 backdrop-blur-sm border-0 shadow-lg">
              <CardHeader className="text-center">
                <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Upload className="w-8 h-8 text-blue-600" />
                </div>
                <CardTitle className="text-2xl">Upload de Arquivo</CardTitle>
                <CardDescription>
                  Faça upload de um arquivo XML de NF-e do seu computador
                </CardDescription>
              </CardHeader>
              <CardContent>
                      <FileUpload onFileSelect={handleFileSelect} />
              </CardContent>
            </Card>

            <Card className="bg-white/80 backdrop-blur-sm border-0 shadow-lg">
              <CardHeader className="text-center">
                <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Download className="w-8 h-8 text-green-600" />
                </div>
                <CardTitle className="text-2xl">Download de XML</CardTitle>
                <CardDescription>
                  Faça download de arquivos XML de URLs externas
                </CardDescription>
              </CardHeader>
              <CardContent>
                <XmlIntegration onXmlReceived={handleXmlFromIntegration} />
              </CardContent>
            </Card>
          </div>

          {/* NFEs Existentes */}
          {filteredNFEs.length > 0 && (
            <Card className="bg-white/80 backdrop-blur-sm border-0 shadow-lg">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="text-xl">Continuar Trabalhando</CardTitle>
                    <CardDescription>
                      Selecione uma NF-e existente para continuar
                    </CardDescription>
                  </div>
                  <div className="flex gap-2">
                    <div className="relative">
                      <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-slate-400" />
                      <input
                        type="text"
                        placeholder="Buscar NF-e..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="pl-10 pr-4 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      />
                    </div>
                    <select
                      value={selectedFornecedor || ""}
                      onChange={(e) => setSelectedFornecedor(e.target.value || null)}
                      className="px-4 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    >
                      <option value="">Todos os fornecedores</option>
                      {Array.isArray(savedNFEs) && [...new Set(savedNFEs.map(nfe => nfe.fornecedor))].map(fornecedor => (
                        <option key={fornecedor} value={fornecedor}>{fornecedor}</option>
                      ))}
                    </select>
                          </div>
                        </div>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {filteredNFEs.map((nfe) => (
                    <Card 
                      key={nfe.id} 
                      className="hover:shadow-md transition-shadow cursor-pointer border-l-4 border-l-blue-500"
                      onClick={() => window.open(`/notas-em-aberto/${nfe.id}`, '_blank')}
                    >
                      <CardContent className="p-4">
                        <div className="flex items-start justify-between mb-3">
                          <div className="flex-1">
                            <h4 className="font-semibold text-slate-900 truncate">{nfe.fornecedor}</h4>
                            <p className="text-sm text-slate-600">NF-e {nfe.numero}</p>
                </div>
                          <Badge variant="secondary" className="text-xs">
                            {nfe.itens} itens
                          </Badge>
              </div>
                        <div className="flex items-center justify-between text-sm text-slate-500">
                          <span>{formatDate(new Date(nfe.data))}</span>
                          <span className="font-medium">{formatCurrency(nfe.valor)}</span>
            </div>
                      </CardContent>
                    </Card>
                  ))}
          </div>
              </CardContent>
            </Card>
        )}

          {/* Loading */}
        {isProcessing && (
            <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
              <Card className="bg-white p-8 text-center">
                <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-blue-600 mx-auto mb-4"></div>
                <h3 className="text-xl font-semibold mb-2">Processando NF-e...</h3>
                <p className="text-slate-600">Aguarde enquanto processamos seu arquivo XML</p>
              </Card>
                  </div>
                )}
              </div>
      </div>
    );
  }

  // Renderizar tela de produtos
  if (currentView === "products") {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50">
        <div className="max-w-7xl mx-auto px-4 py-8">
          {/* Header */}
          <div className="flex items-center justify-between mb-8">
            <div className="flex items-center gap-4">
                    <Button
                variant="ghost" 
                onClick={() => setCurrentView("upload")}
              >
                ← Voltar ao Upload
              </Button>
              <div>
                <h1 className="text-3xl font-bold text-slate-900">
                  {brandName}
                  {invoiceNumber && (
                    <span className="text-xl text-slate-600 ml-3">
                      NF-e {invoiceNumber}
                    </span>
                  )}
                </h1>
                <p className="text-slate-600">
                  {products.length} produtos encontrados • {formatCurrency(products.reduce((sum, p) => sum + (p.totalPrice ?? 0), 0))}
                </p>
              </div>
            </div>
            <div className="flex gap-3">
              <Button variant="outline" onClick={() => setCurrentView("welcome")}>
                <History className="w-4 h-4 mr-2" />
                Nova Importação
              </Button>
              <Button variant="outline" onClick={() => navigate('/dashboard')}>
                <BarChart3 className="w-4 h-4 mr-2" />
                Dashboard
                    </Button>
              </div>
            </div>

          {/* Configurações */}
          <Card className="bg-white/80 backdrop-blur-sm border-0 shadow-lg mb-8">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Settings className="w-5 h-5" />
                Configurações de Markup
              </CardTitle>
              <CardDescription>
                Ajuste os percentuais de markup para Xapuri e Epitá
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">
                    Markup Xapuri (%)
                  </label>
                  <input
                    type="number"
                    value={xapuriMarkup}
                    onChange={(e) => handleXapuriMarkupChange(parseInt(e.target.value) || 0)}
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">
                    Markup Epitá (%)
                  </label>
                  <input
                    type="number"
                    value={epitaMarkup}
                    onChange={(e) => handleEpitaMarkupChange(parseInt(e.target.value) || 0)}
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">
                    Imposto de Entrada (%)
                  </label>
                  <input
                    type="number"
                    value={impostoEntrada}
                    onChange={(e) => handleImpostoEntradaChange(parseInt(e.target.value) || 0)}
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Preview dos Produtos */}
            <ProductPreview
              products={products}
              hiddenItems={hiddenItems}
              onToggleVisibility={(index) => {
                const newHiddenItems = new Set(hiddenItems);
                if (newHiddenItems.has(index)) {
                  newHiddenItems.delete(index);
                } else {
                  newHiddenItems.add(index);
                }
                setHiddenItems(newHiddenItems);
              }}
              onNewFile={() => {
                setProducts([]);
                setHiddenItems(new Set());
                setCurrentNFeId(null);
                setInvoiceNumber("");
                setBrandName("");
                setIsEditingBrand(false);
              setCurrentView("upload");
              }}
              onDeleteRequest={handleDeleteCurrentNFe}
              xapuriMarkup={xapuriMarkup}
              epitaMarkup={epitaMarkup}
              roundingType={roundingType}
              onXapuriMarkupChange={handleXapuriMarkupChange}
              onEpitaMarkupChange={handleEpitaMarkupChange}
              onRoundingTypeChange={handleRoundingTypeChange}
            />
      </div>
    </div>
  );
  }

  // Modal de Confirmação de Duplicata
  // Renderizar tela de dashboard
  if (currentView === "dashboard") {
    return (
      <div className="w-full p-4 space-y-6">
        <div className="flex justify-between items-center">
          <div className="flex items-center gap-4">
            <Button
              variant="ghost" 
              onClick={() => setCurrentView("welcome")}
            >
              ← Voltar ao Início
            </Button>
            <h1 className="text-2xl font-bold">Dashboard</h1>
          </div>
          <div className="flex gap-4">
            <select
              className="px-3 py-1 border rounded-md text-sm"
              value={periodoSelecionado}
              onChange={(e) => setPeriodoSelecionado(e.target.value)}
            >
              <option value="semana">Última Semana</option>
              <option value="mes">Último Mês</option>
              <option value="trimestre">Último Trimestre</option>
              <option value="ano">Último Ano</option>
            </select>
          </div>
        </div>

        {/* Cards de Métricas */}
        <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-6 gap-4">
          <Card className="bg-white hover:bg-gray-50 transition-colors">
            <CardContent className="p-4">
              <div className="flex flex-col">
                <span className="text-sm text-muted-foreground">Total de Notas</span>
                <div className="flex items-center mt-2">
                  <FileText className="w-4 h-4 text-blue-500 mr-2" />
                  <span className="text-2xl font-bold">{totalNotas}</span>
                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Info className="w-4 h-4 ml-2 text-gray-400" />
                      </TooltipTrigger>
                      <TooltipContent>
                        <p>Total de notas fiscais importadas</p>
                      </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                </div>
                {totalNotas > 0 && (
                  <div className="flex items-center mt-2 text-xs">
                    <span className="text-gray-600">Baseado em {totalNotas} nota{totalNotas !== 1 ? 's' : ''} processada{totalNotas !== 1 ? 's' : ''}</span>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          <Card className="bg-white hover:bg-gray-50 transition-colors">
            <CardContent className="p-4">
              <div className="flex flex-col">
                <span className="text-sm text-muted-foreground">Total de Produtos</span>
                <div className="flex items-center mt-2">
                  <Package2 className="w-4 h-4 text-green-500 mr-2" />
                  <span className="text-2xl font-bold">{totalProdutos}</span>
                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Info className="w-4 h-4 ml-2 text-gray-400" />
                      </TooltipTrigger>
                      <TooltipContent>
                        <p>Total de produtos nas notas fiscais</p>
                      </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                </div>
                {totalProdutos > 0 && (
                  <div className="flex items-center mt-2 text-xs">
                    <span className="text-gray-600">Distribuídos em {totalNotas} nota{totalNotas !== 1 ? 's' : ''}</span>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          <Card className="bg-white hover:bg-gray-50 transition-colors">
            <CardContent className="p-4">
              <div className="flex flex-col">
                <span className="text-sm text-muted-foreground">Quantidade Total</span>
                <div className="flex items-center mt-2">
                  <Hash className="w-4 h-4 text-orange-500 mr-2" />
                  <span className="text-2xl font-bold">{quantidadeTotal}</span>
                  <span className="text-xs text-muted-foreground ml-2">Unidades</span>
                </div>
                {quantidadeTotal > 0 && (
                  <div className="flex items-center mt-2 text-xs">
                    <span className="text-gray-600">Média de {(quantidadeTotal / Math.max(totalProdutos, 1)).toFixed(1)} por produto</span>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          <Card className="bg-white hover:bg-gray-50 transition-colors">
            <CardContent className="p-4">
              <div className="flex flex-col">
                <span className="text-sm text-muted-foreground">Valor Total</span>
                <div className="flex items-center mt-2">
                  <DollarSign className="w-4 h-4 text-purple-500 mr-2" />
                  <span className="text-2xl font-bold">{formatCurrency(valorTotal)}</span>
                </div>
                {valorTotal > 0 && (
                  <div className="flex items-center mt-2 text-xs">
                    <span className="text-gray-600">Média de {formatCurrency(valorTotal / Math.max(totalNotas, 1))} por nota</span>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          <Card className="bg-white hover:bg-gray-50 cursor-pointer transition-colors">
            <CardContent className="p-4">
              <div className="flex flex-col">
                <span className="text-sm text-muted-foreground">Total de Impostos</span>
                <div className="flex items-center mt-2">
                  <Receipt className="w-4 h-4 text-red-500 mr-2" />
                  <span className="text-2xl font-bold">{formatCurrency(totalImpostos)}</span>
                  <span className="text-xs text-muted-foreground ml-2">17% do valor</span>
                </div>
                {totalImpostos > 0 && (
                  <div className="flex items-center mt-2 text-xs">
                    <span className="text-gray-600">Estimativa baseada em 17% do valor total</span>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          <Card className="bg-white hover:bg-gray-50 cursor-pointer transition-colors">
            <CardContent className="p-4">
              <div className="flex flex-col">
                <span className="text-sm text-muted-foreground">Notas Favoritas</span>
                <div className="flex items-center mt-2">
                  <Bookmark className="w-4 h-4 text-yellow-500 mr-2" />
                  <span className="text-2xl font-bold">{notasFavoritas}</span>
                </div>
                {notasFavoritas > 0 && (
                  <div className="flex items-center mt-2 text-xs">
                    <span className="text-gray-600">{((notasFavoritas / Math.max(totalNotas, 1)) * 100).toFixed(1)}% das notas marcadas</span>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </div>

        <SavedNFEList
          nfes={formattedNFEs}
          onNFESelect={handleNFESelect}
        />
      </div>
    );
  }

  return (
    <>
      {duplicateConfirmation && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <Card className="w-full max-w-md mx-4">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-orange-600">
                <AlertTriangle className="h-5 w-5" />
                NFe Duplicada Detectada
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-sm text-gray-600">
                {duplicateConfirmation.duplicateInfo.question}
              </p>
              
              <div className="space-y-3">
                <div className="p-3 bg-red-50 rounded-lg border border-red-200">
                  <h4 className="font-medium text-red-800 mb-2">NFe Existente:</h4>
                  <div className="text-sm text-red-700">
                    <p>Número: {duplicateConfirmation.duplicateInfo.existingNfe.numero}</p>
                    <p>Fornecedor: {duplicateConfirmation.duplicateInfo.existingNfe.fornecedor}</p>
                    <p>Valor: R$ {duplicateConfirmation.duplicateInfo.existingNfe.valor.toFixed(2)}</p>
                  </div>
                </div>
                
                <div className="p-3 bg-blue-50 rounded-lg border border-blue-200">
                  <h4 className="font-medium text-blue-800 mb-2">Nova NFe:</h4>
                  <div className="text-sm text-blue-700">
                    <p>Número: {duplicateConfirmation.duplicateInfo.newNfe.numero}</p>
                    <p>Fornecedor: {duplicateConfirmation.duplicateInfo.newNfe.fornecedor}</p>
                    <p>Valor: R$ {duplicateConfirmation.duplicateInfo.newNfe.valor.toFixed(2)}</p>
                  </div>
                </div>
              </div>
              
              <div className="flex gap-2 pt-4">
                <Button 
                  variant="outline" 
                  onClick={handleCancelReplace}
                  className="flex-1"
                  disabled={isProcessing}
                >
                  {duplicateConfirmation.duplicateInfo.options.cancel}
                </Button>
                <Button 
                  onClick={handleConfirmReplace}
                  className="flex-1 bg-orange-600 hover:bg-orange-700"
                  disabled={isProcessing}
                >
                  {isProcessing ? 'Processando...' : duplicateConfirmation.duplicateInfo.options.replace}
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
      {null}
    </>
  );
};

export default Index;

// Última atualização: sáb, 30 de ago de 2025 05:13:01
