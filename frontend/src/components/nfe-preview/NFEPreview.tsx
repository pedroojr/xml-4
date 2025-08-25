import React from 'react';
import { NFE } from '../../types/nfe';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { formatCurrency, formatNumber } from '@/utils/formatters';
import { copyNumberToClipboard, copyToClipboard } from '@/utils/clipboard';
import { toast } from 'sonner';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useNFEStorage } from '@/hooks/useNFEStorage';

interface NFEPreviewProps {
  nfe: NFE;
  onClose: () => void;
}

const NFEPreview: React.FC<NFEPreviewProps> = ({ nfe, onClose }) => {
  const { updateNFEImpostoEntrada } = useNFEStorage();

  const handleCopyValue = async (value: number | string) => {
    let success;
    if (typeof value === 'number') {
      success = await copyNumberToClipboard(value);
    } else {
      success = await copyToClipboard(value);
    }
    
    if (success) {
      toast.success('Valor copiado para a área de transferência');
    } else {
      toast.error('Erro ao copiar valor');
    }
  };

  const handleImpostoEntradaChange = (value: string) => {
    const numValue = parseFloat(value) || 0;
    if (numValue >= 0 && numValue <= 100) {
      updateNFEImpostoEntrada(nfe.id, numValue);
    }
  };

  return (
            <Card className="w-full mx-auto">
      <CardContent className="p-6">
        <div className="space-y-6">
          <div className="flex justify-between items-start">
            <div>
              <h2 className="text-2xl font-bold">NFE {nfe.numero}</h2>
              <p className="text-sm text-muted-foreground">{nfe.fornecedor}</p>
            </div>
            <Button variant="outline" onClick={onClose}>Fechar</Button>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="impostoEntrada">Imposto de Entrada (%)</Label>
              <Input
                id="impostoEntrada"
                type="number"
                min="0"
                max="100"
                step="0.1"
                value={nfe.impostoEntrada || 0}
                onChange={(e) => handleImpostoEntradaChange(e.target.value)}
                className="w-full"
              />
            </div>
            <div className="space-y-2">
              <Label>Data de Emissão</Label>
              <p className="text-sm">{new Date(nfe.dataEmissao).toLocaleDateString('pt-BR')}</p>
            </div>
          </div>

          <div className="space-y-4">
            <h3 className="font-semibold">Detalhes da Nota</h3>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Valor Total</Label>
                <p className="text-lg font-semibold">{formatCurrency(nfe.valorTotal)}</p>
              </div>
              <div>
                <Label>Quantidade de Itens</Label>
                <p className="text-lg font-semibold">{formatNumber(nfe.quantidadeTotal)}</p>
              </div>
            </div>
          </div>

          <div className="space-y-4">
            <h3 className="font-semibold">Produtos</h3>
            <div className="max-h-60 overflow-y-auto">
              {nfe.itens.map((item: any, index: number) => (
                <div key={index} className="p-3 bg-gray-50 rounded-lg mb-2">
                  <div className="font-medium">{item.descricao}</div>
                  <div className="text-sm text-muted-foreground">
                    {item.quantidade} unidades • {formatCurrency(item.valor)}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default NFEPreview; 