import { useNavigate, useParams } from 'react-router-dom';
import { useState, useEffect } from 'react';
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { History, FileText, Calendar, Package, ArrowLeft, Trash2 } from "lucide-react";
import { useNFEStorage } from "@/hooks/useNFEStorage";
import { useNFEAPI } from "@/hooks/useNFEAPI";
import { useAutoSave } from "@/hooks/useAutoSave";
import { NFE, Product } from "@/types/nfe";
import { nfeAPI } from "@/services/api";
import ProductPreview from "@/components/product-preview/ProductPreview";
import { RoundingType } from "@/components/product-preview/productCalculations";
import { toast } from 'sonner';

const NotasEmAberto = () => {
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const { savedNFEs } = useNFEStorage();
  const { deleteAllNFEs } = useNFEAPI();
  
  // Estados para edição de produtos
  const [products, setProducts] = useState<Product[]>([]);
  const [currentNFeId, setCurrentNFeId] = useState<string | null>(null);
  const [isLoadingProducts, setIsLoadingProducts] = useState(false);
  const [invoiceNumber, setInvoiceNumber] = useState<string>("");
  const [brandName, setBrandName] = useState<string>("");
  const [isEditingBrand, setIsEditingBrand] = useState(false);
  const [hiddenItems, setHiddenItems] = useState<Set<number>>(new Set());
  
  // Configurações (carregadas do localStorage)
  const [xapuriMarkup, setXapuriMarkup] = useState<number>(() => {
    const saved = localStorage.getItem('xapuriMarkup');
    return saved ? parseFloat(saved) || 0 : 0;
  });
  const [epitaMarkup, setEpitaMarkup] = useState<number>(() => {
    const saved = localStorage.getItem('epitaMarkup');
    return saved ? parseFloat(saved) || 0 : 0;
  });
  const [impostoEntrada, setImpostoEntrada] = useState<number>(() => {
    const saved = localStorage.getItem('impostoEntrada');
    return saved ? parseFloat(saved) || 0 : 0;
  });
  const [roundingType, setRoundingType] = useState<RoundingType>(() => {
    const saved = localStorage.getItem('roundingType');
    return (saved as RoundingType) || 'none';
  });

  // Criar objeto NFE atual para auto-save
  const currentNFE: NFE | null = currentNFeId ? {
    id: currentNFeId,
    data: new Date().toISOString().split('T')[0],
    numero: invoiceNumber || '',
    fornecedor: brandName || '',
    valor: products.reduce((sum, p) => sum + (p.totalPrice ?? 0), 0),
    itens: products.length,
    produtos: products,
    impostoEntrada: impostoEntrada,
    xapuriMarkup: xapuriMarkup,
    epitaMarkup: epitaMarkup,
    roundingType: roundingType as RoundingType
  } : null;

  // Configurar auto-save
  // useAutoSave(currentNFE, { enabled: currentNFeId !== null });

  // Carregar NFE específica se ID for fornecido na URL
  useEffect(() => {
    if (id && Array.isArray(savedNFEs)) {
      const nfe = savedNFEs.find(n => n.id === id);
      if (nfe) {
        handleLoadNFe(nfe);
      }
    }
  }, [id, savedNFEs]);

  const handleLoadNFe = async (nfe: NFE) => {
    setIsLoadingProducts(true);
    try {
      const detailed = await nfeAPI.getById(nfe.id);
      const produtos = Array.isArray(detailed.produtos) ? detailed.produtos : [];

      setProducts(produtos);
      setHiddenItems(new Set());
      setCurrentNFeId(detailed.id);
      setInvoiceNumber(detailed.numero);
      setBrandName(detailed.fornecedor);
      setIsEditingBrand(false);
      
      // Restaurar valores salvos da NFE ou usar valores padrão do localStorage
      if (detailed.xapuriMarkup !== undefined && detailed.xapuriMarkup !== null) {
        setXapuriMarkup(parseFloat(detailed.xapuriMarkup.toString()) || 0);
      }
      if (detailed.epitaMarkup !== undefined && detailed.epitaMarkup !== null) {
        setEpitaMarkup(parseFloat(detailed.epitaMarkup.toString()) || 0);
      }
      if (detailed.impostoEntrada !== undefined && detailed.impostoEntrada !== null) {
        setImpostoEntrada(parseFloat(detailed.impostoEntrada.toString()) || 0);
      }
      if (detailed.roundingType) {
        setRoundingType(detailed.roundingType as RoundingType);
      }
    } catch (err) {
      console.error('Falha ao carregar NFE detalhada:', err);
      setProducts(Array.isArray(nfe.produtos) ? nfe.produtos : []);
      setHiddenItems(new Set());
      setCurrentNFeId(nfe.id);
      setInvoiceNumber(nfe.numero);
      setBrandName(nfe.fornecedor);
      setIsEditingBrand(false);
      
      // Em caso de erro, restaurar valores salvos da NFE básica ou usar valores padrão do localStorage
      if (nfe.xapuriMarkup !== undefined && nfe.xapuriMarkup !== null) {
        setXapuriMarkup(parseFloat(nfe.xapuriMarkup.toString()) || 0);
      }
      if (nfe.epitaMarkup !== undefined && nfe.epitaMarkup !== null) {
        setEpitaMarkup(parseFloat(nfe.epitaMarkup.toString()) || 0);
      }
      if (nfe.impostoEntrada !== undefined && nfe.impostoEntrada !== null) {
        setImpostoEntrada(parseFloat(nfe.impostoEntrada.toString()) || 0);
      }
      if (nfe.roundingType) {
        setRoundingType(nfe.roundingType as RoundingType);
      }
    } finally {
      setIsLoadingProducts(false);
    }
  };

  const handleNFESelect = (nfe: NFE) => {
    // Abrir em nova aba direcionando para esta mesma página com o ID da NFE
    window.open(`/notas-em-aberto/${nfe.id}`, '_blank');
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
    localStorage.setItem('roundingType', value);
  };

  const handleDeleteAllNFEs = async () => {
    if (!Array.isArray(savedNFEs) || savedNFEs.length === 0) {
      toast.error('Não há notas para excluir');
      return;
    }

    const confirmDelete = window.confirm(
      `Tem certeza que deseja excluir todas as ${savedNFEs.length} notas fiscais? Esta ação não pode ser desfeita.`
    );

    if (confirmDelete) {
      try {
        await deleteAllNFEs();
        // Limpar estado local se houver NFE sendo editada
        setCurrentNFeId(null);
        setProducts([]);
        setInvoiceNumber('');
        setBrandName('');
        setHiddenItems(new Set());
      } catch (error) {
        console.error('Erro ao excluir todas as NFEs:', error);
      }
    }
  };

  const handleBackToList = () => {
    setProducts([]);
    setCurrentNFeId(null);
    navigate('/notas-em-aberto');
  };

  const formatDate = (dateString: string) => {
    try {
      const date = new Date(dateString);
      return date.toLocaleDateString('pt-BR');
    } catch {
      return dateString;
    }
  };

  // Se há produtos carregados, mostrar interface de edição
  if (products.length > 0 && currentNFeId) {
    return (
      <div className="w-full p-4 space-y-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button
              onClick={handleBackToList}
              className="p-2 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
            >
              <ArrowLeft className="w-5 h-5 text-gray-600" />
            </button>
            <div className="p-2 bg-blue-100 rounded-lg">
              <FileText className="w-6 h-6 text-blue-600" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-slate-900">{brandName}</h1>
              <p className="text-slate-600">NF-e {invoiceNumber} - Editando produtos</p>
            </div>
          </div>
        </div>

        {isLoadingProducts ? (
          <div className="flex items-center justify-center py-12">
            <div className="text-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
              <p className="text-slate-600">Carregando produtos...</p>
            </div>
          </div>
        ) : (
          <ProductPreview
            products={products}
            xapuriMarkup={xapuriMarkup}
            epitaMarkup={epitaMarkup}
            roundingType={roundingType}
            onXapuriMarkupChange={handleXapuriMarkupChange}
            onEpitaMarkupChange={handleEpitaMarkupChange}
            onRoundingTypeChange={handleRoundingTypeChange}
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
          />
        )}
      </div>
    );
  }

  return (
    <div className="w-full p-4 space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-blue-100 rounded-lg">
            <History className="w-6 h-6 text-blue-600" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-slate-900">Notas em Aberto</h1>
            <p className="text-slate-600">Gerencie suas notas fiscais importadas</p>
          </div>
        </div>
        <div className="flex items-center gap-4">
          <div className="text-sm text-slate-500">
            {Array.isArray(savedNFEs) ? savedNFEs.length : 0} nota(s) salva(s)
          </div>
          {Array.isArray(savedNFEs) && savedNFEs.length > 0 && (
            <Button
              variant="destructive"
              size="sm"
              onClick={handleDeleteAllNFEs}
              className="flex items-center gap-2"
            >
              <Trash2 className="w-4 h-4" />
              Excluir Todas
            </Button>
          )}
        </div>
      </div>

      {Array.isArray(savedNFEs) && savedNFEs.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {savedNFEs.map((nfe) => (
            <Card
              key={nfe.id}
              className="cursor-pointer transition-all hover:shadow-lg hover:scale-[1.02] border-l-4 border-l-blue-500"
              onClick={() => handleNFESelect(nfe)}
            >
              <CardContent className="p-6">
                <div className="space-y-4">
                  {/* Header com ícone */}
                  <div className="flex items-start justify-between">
                    <div className="p-2 bg-slate-100 rounded-lg">
                      <FileText className="w-5 h-5 text-slate-600" />
                    </div>
                    <div className="text-xs text-slate-500 bg-slate-100 px-2 py-1 rounded">
                      NF-e {nfe.numero}
                    </div>
                  </div>

                  {/* Informações principais */}
                  <div className="space-y-2">
                    <div className="font-semibold text-slate-900 text-lg leading-tight">
                      {nfe.fornecedor}
                    </div>
                    
                    <div className="flex items-center gap-2 text-sm text-slate-600">
                      <Calendar className="w-4 h-4" />
                      <span>{formatDate(nfe.data)}</span>
                    </div>

                    <div className="flex items-center gap-2 text-sm text-slate-600">
                      <Package className="w-4 h-4" />
                      <span>
                        {Array.isArray(nfe.produtos) ? nfe.produtos.length : 0} produto(s)
                      </span>
                    </div>
                  </div>

                  {/* Footer com valor total se disponível */}
                  {nfe.valorTotal && (
                    <div className="pt-3 border-t border-slate-200">
                      <div className="text-sm text-slate-500">Valor Total</div>
                      <div className="font-semibold text-green-600">
                        R$ {nfe.valorTotal.toLocaleString('pt-BR', {
                          minimumFractionDigits: 2,
                          maximumFractionDigits: 2
                        })}
                      </div>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <div className="text-center py-16">
          <div className="mx-auto w-24 h-24 bg-slate-100 rounded-full flex items-center justify-center mb-4">
            <History className="w-12 h-12 text-slate-400" />
          </div>
          <h3 className="text-lg font-semibold text-slate-900 mb-2">
            Nenhuma nota fiscal encontrada
          </h3>
          <p className="text-slate-600 mb-6">
            Importe arquivos XML na página inicial para começar
          </p>
          <button
            onClick={() => navigate('/')}
            className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            Editar NFE
          </button>
        </div>
      )}
    </div>
  );
};

export default NotasEmAberto;