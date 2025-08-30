import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ArrowLeft, FileText, Building2, Calendar, Package2, Receipt } from 'lucide-react';
import { useNFEStorage } from '@/hooks/useNFEStorage';
import { nfeAPI } from '@/services/api';
import { formatCurrency, formatDate } from '@/utils/formatters';
import { toast } from 'sonner';

const NFEView = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { savedNFEs, loadNFEs } = useNFEStorage();
  const [nfeDetail, setNfeDetail] = useState<any | null>(null);

  useEffect(() => {
    const fetchData = async () => {
      try {
        await loadNFEs();
        if (id) {
          const detail = await nfeAPI.getById(id);
          setNfeDetail(detail);
        }
      } catch (err) {
        // Silencia erros aqui; tratamento visual abaixo
        console.error('Erro ao carregar NFE detalhada:', err);
      }
    };
    fetchData();
  }, [id, loadNFEs]);

  const nfe = nfeDetail || (Array.isArray(savedNFEs) ? savedNFEs.find(nfe => nfe.id === id) : undefined);

  useEffect(() => {
    if (!nfe && Array.isArray(savedNFEs) && savedNFEs.length > 0) {
      toast.error('Nota fiscal não encontrada');
      navigate(-1);
    }
  }, [nfe, savedNFEs, navigate]);

  if (!nfe) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh]">
        <FileText className="w-16 h-16 text-gray-300 mb-4" />
        <h2 className="text-xl font-semibold mb-2">Nota Fiscal não encontrada</h2>
        <p className="text-gray-500 mb-4">A nota fiscal que você está procurando não existe ou foi removida.</p>
        <Button onClick={() => navigate(-1)}>
          <ArrowLeft className="w-4 h-4 mr-2" />
          Voltar
        </Button>
      </div>
    );
  }
  
  const produtos = Array.isArray(nfe.produtos) ? nfe.produtos : [];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="outline" onClick={() => navigate(-1)}>
            <ArrowLeft className="w-4 h-4 mr-2" />
            Voltar
          </Button>
          <h1 className="text-2xl font-bold">Nota Fiscal {nfe.numero || 'Sem número'}</h1>
        </div>
        <Button variant="outline" onClick={() => window.print()}>
          Imprimir / Exportar PDF
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="text-lg font-semibold">
              Informações da Nota
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center gap-2">
              <FileText className="w-4 h-4 text-gray-500" />
              <span className="font-medium">Número:</span>
              <span>{nfe.numero}</span>
            </div>
            <div className="flex items-center gap-2">
              <Building2 className="w-4 h-4 text-gray-500" />
              <span className="font-medium">Fornecedor:</span>
              <span>{nfe.fornecedor}</span>
            </div>
            <div className="flex items-center gap-2">
              <Calendar className="w-4 h-4 text-gray-500" />
              <span className="font-medium">Data de Emissão:</span>
              <span>{formatDate(new Date(nfe.data))}</span>
            </div>
            <div className="flex items-center gap-2">
              <Receipt className="w-4 h-4 text-gray-500" />
              <span className="font-medium">Valor Total:</span>
              <span>{formatCurrency(nfe.valor)}</span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-lg font-semibold">
              Resumo dos Produtos
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <div className="flex items-center gap-2">
                  <Package2 className="w-4 h-4 text-gray-500" />
                  <span>Total de Itens:</span>
                </div>
                <span className="font-medium">{produtos.length}</span>
              </div>
              <div className="flex justify-between items-center">
                <span>Valor Médio por Item:</span>
                <span className="font-medium">
                  {formatCurrency((nfe.valor || 0) / (produtos.length || 1))}
                </span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg font-semibold">
            Lista de Produtos
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {produtos.map((produto, index) => (
              <div
                key={index}
                className="p-4 rounded-lg border border-gray-200 hover:bg-gray-50 transition-colors"
              >
                <div className="flex justify-between items-start">
                  <div>
                    <h3 className="font-medium">{produto.descricao || 'Sem descrição'}</h3>
                    <p className="text-sm text-gray-500">
                      {produto.codigo || 'Sem código'} • {produto.ncm || 'Sem NCM'}
                    </p>
                    {(produto as any).informacoesAdicionais && (
                      <p className="text-sm text-gray-600 mt-2">
                        {(produto as any).informacoesAdicionais}
                      </p>
                    )}
                  </div>
                  <div className="text-right">
                    <p className="font-medium">{formatCurrency(produto.valorTotal || 0)}</p>
                    <p className="text-sm text-gray-500">
                      {produto.quantidade || 0} x {formatCurrency(produto.valorUnitario || 0)}
                    </p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default NFEView;
