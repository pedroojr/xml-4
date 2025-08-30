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
  RefreshCw
} from "lucide-react";
import FileUpload from "@/components/FileUpload";
import { XmlIntegration } from "@/components/XmlIntegration";
import FileUploadPDF from "@/components/FileUploadPDF";
import ProductPreview from "@/components/product-preview/ProductPreview";
import { useNFEStorage } from "@/hooks/useNFEStorage";
import { nfeAPI } from "@/services/api";
import { Product, NFE } from "@/types/nfe";
import { RoundingType } from "@/components/product-preview/productCalculations";
import { parseNFeXML } from "@/utils/nfeParser";
import { formatCurrency, formatDate } from '@/utils/formatters';

const Index = () => {
  const navigate = useNavigate();
  const [products, setProducts] = useState<Product[]>([]);
  const [currentNFeId, setCurrentNFeId] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [currentView, setCurrentView] = useState<"welcome" | "upload" | "products">("welcome");
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

  const { savedNFEs, saveNFE, removeNFE, loadNFEs } = useNFEStorage();

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
      const text = await file.text();
      const xmlDoc = new DOMParser().parseFromString(text, 'text/xml');
      
      const nfeInfo = extractNFeInfo(xmlDoc);
      if (!nfeInfo) {
        throw new Error('Arquivo XML inválido ou não é uma NF-e');
      }

      const extractedProducts = parseNFeXML(text);
      setProducts(extractedProducts);
      setHiddenItems(new Set());
      
      const nfeId = `nfe_${Date.now()}`;
      setCurrentNFeId(nfeId);
      setInvoiceNumber(nfeInfo.numero);
      setBrandName(nfeInfo.emitNome);
      
      // Salvar NFE
      const nfe: NFE = {
        id: nfeId,
        data: nfeInfo.dataEmissao,
        numero: nfeInfo.numero,
        chaveNFE: nfeInfo.chaveNFE,
        fornecedor: nfeInfo.emitNome,
        cnpjFornecedor: nfeInfo.emitCNPJ,
        valorTotal: extractedProducts.reduce((sum, p) => sum + (p.totalPrice ?? 0), 0),
        totalImpostos: 0,
        quantidadeTotal: extractedProducts.length,
        dataEmissao: nfeInfo.dataEmissao,
        produtos: extractedProducts,
        impostoEntrada: impostoEntrada
      };
      
      saveNFE({
        ...nfe,
        valor: nfe.valorTotal ?? 0,
        itens: nfe.produtos.length
      });
      setCurrentView("products");
    } catch (error) {
      console.error('Erro ao processar arquivo:', error);
      alert('Erro ao processar arquivo XML. Verifique se é uma NF-e válida.');
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

  // Renderizar tela de boas-vindas
  if (currentView === "welcome") {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50">
        <div className="max-w-7xl mx-auto px-4 py-12">
          {/* Header Hero */}
          <div className="text-center mb-16">
            <div className="inline-flex items-center justify-center w-20 h-20 bg-gradient-to-r from-blue-600 to-indigo-600 rounded-full mb-6">
              <FileText className="w-10 h-10 text-white" />
            </div>
            <h1 className="text-5xl font-bold text-slate-900 mb-4">
              XML Importer
            </h1>
            <p className="text-xl text-slate-600 max-w-2xl mx-auto">
              Processe notas fiscais eletrônicas de forma inteligente e automatizada. 
              Importe XMLs, visualize produtos e calcule markups com precisão.
            </p>
          </div>

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

            <Card className="bg-white/80 backdrop-blur-sm border-0 shadow-lg hover:shadow-xl transition-all duration-300 cursor-pointer group" onClick={() => navigate('/dashboard')}>
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
                      onClick={() => handleLoadNFe(nfe)}
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

          {/* Recursos */}
          <div className="mt-16 text-center">
            <h2 className="text-3xl font-bold text-slate-900 mb-8">Recursos Principais</h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
              <div className="text-center">
                <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Zap className="w-8 h-8 text-blue-600" />
                </div>
                <h3 className="text-xl font-semibold text-slate-900 mb-2">Processamento Rápido</h3>
                <p className="text-slate-600">Importe e processe NFEs em segundos com nossa tecnologia otimizada</p>
              </div>
              <div className="text-center">
                <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Shield className="w-8 h-8 text-green-600" />
                </div>
                <h3 className="text-xl font-semibold text-slate-900 mb-2">Seguro e Confiável</h3>
                <p className="text-slate-600">Seus dados são protegidos com as melhores práticas de segurança</p>
              </div>
              <div className="text-center">
                <div className="w-16 h-16 bg-purple-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <BarChart3 className="w-8 h-8 text-purple-600" />
                </div>
                <h3 className="text-xl font-semibold text-slate-900 mb-2">Análises Inteligentes</h3>
                <p className="text-slate-600">Insights valiosos sobre seus produtos e fornecedores</p>
              </div>
            </div>
          </div>
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
                <CardTitle className="text-2xl">Integração de Sistema</CardTitle>
                <CardDescription>
                  Conecte com sistemas externos para importação automática
                </CardDescription>
              </CardHeader>
              <CardContent>
                <XmlIntegration onXmlContent={handleXmlFromIntegration} />
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
                      onClick={() => handleLoadNFe(nfe)}
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

  return null;
};

export default Index;

// Última atualização: sáb, 30 de ago de 2025 05:13:01
