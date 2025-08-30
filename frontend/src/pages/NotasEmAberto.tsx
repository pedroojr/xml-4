import { useNavigate } from 'react-router-dom';
import { Card, CardContent } from "@/components/ui/card";
import { History, FileText, Calendar, Package } from "lucide-react";
import { useNFEStorage } from "@/hooks/useNFEStorage";
import { NFE } from "@/types/nfe";

const NotasEmAberto = () => {
  const navigate = useNavigate();
  const { savedNFEs } = useNFEStorage();

  const handleNFESelect = (nfe: NFE) => {
    navigate(`/nfe/${nfe.id}`);
  };

  const formatDate = (dateString: string) => {
    try {
      const date = new Date(dateString);
      return date.toLocaleDateString('pt-BR');
    } catch {
      return dateString;
    }
  };

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
        <div className="text-sm text-slate-500">
          {Array.isArray(savedNFEs) ? savedNFEs.length : 0} nota(s) salva(s)
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
            Importar NFE
          </button>
        </div>
      )}
    </div>
  );
};

export default NotasEmAberto;