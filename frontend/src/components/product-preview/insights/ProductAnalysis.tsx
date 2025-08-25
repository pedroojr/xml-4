
import React from 'react';
import { Product } from '../../../types/nfe';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { formatCurrency, formatNumber } from '../../../utils/formatters';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

interface ProductAnalysisProps {
  products: Product[];
}

// Mapeamento de NCM para descrições detalhadas
const NCM_DESCRIPTIONS: Record<string, string> = {
  '39249000': 'Bicos de Mamadeira e acessórios plásticos para alimentação infantil',
  '39241000': 'Conjuntos de mamadeiras e acessórios plásticos',
  '96032100': 'Escovas de dentes, incluídas as escovas para dentaduras',
  '40149090': 'Artigos de higiene ou de farmácia de borracha vulcanizada',
  // Adicione mais NCMs conforme necessário
};

export const ProductAnalysis: React.FC<ProductAnalysisProps> = ({ products }) => {
  // Análises por tamanho com normalização
  const normalizeTamanho = (tamanho: string): string => {
    const normalizado = tamanho.toUpperCase().trim();
    const mapeamento: Record<string, string> = {
      'P': 'PEQUENO',
      'M': 'MÉDIO',
      'G': 'GRANDE',
      'PP': 'EXTRA PEQUENO',
      'GG': 'EXTRA GRANDE',
      '0-6M': '0-6 MESES',
      '6-12M': '6-12 MESES',
      '12-18M': '12-18 MESES',
      '18-24M': '18-24 MESES',
    };
    return mapeamento[normalizado] || tamanho;
  };

  const tamanhoStats = products.reduce((acc, product) => {
    const tamanho = normalizeTamanho(product.size || 'Não especificado');
    if (!acc[tamanho]) {
      acc[tamanho] = {
        quantidade: 0,
        valorTotal: 0,
        produtos: []
      };
    }
    acc[tamanho].quantidade += product.quantity;
    acc[tamanho].valorTotal += product.netPrice;
    acc[tamanho].produtos.push(product);
    return acc;
  }, {} as Record<string, { quantidade: number; valorTotal: number; produtos: Product[] }>);

  // Análises por NCM com descrições detalhadas
  const ncmStats = products.reduce((acc, product) => {
    if (!acc[product.ncm]) {
      acc[product.ncm] = {
        quantidade: 0,
        valorTotal: 0,
        descricao: NCM_DESCRIPTIONS[product.ncm] || product.name.split(' ')[0]
      };
    }
    acc[product.ncm].quantidade += product.quantity;
    acc[product.ncm].valorTotal += product.netPrice;
    return acc;
  }, {} as Record<string, { quantidade: number; valorTotal: number; descricao: string }>);

  // Análise por faixa de preço expandida
  const getFaixaPreco = (preco: number): string => {
    if (preco <= 50) return 'Até R$ 50';
    if (preco <= 100) return 'R$ 51 a R$ 100';
    if (preco <= 200) return 'R$ 101 a R$ 200';
    if (preco <= 500) return 'R$ 201 a R$ 500';
    return 'Acima de R$ 500';
  };

  const faixaPrecoStats = products.reduce((acc, product) => {
    const precoUnitario = product.netPrice / product.quantity;
    const faixa = getFaixaPreco(precoUnitario);
    if (!acc[faixa]) {
      acc[faixa] = {
        quantidade: 0,
        valorTotal: 0,
        produtos: []
      };
    }
    acc[faixa].quantidade += product.quantity;
    acc[faixa].valorTotal += product.netPrice;
    acc[faixa].produtos.push(product);
    return acc;
  }, {} as Record<string, { quantidade: number; valorTotal: number; produtos: Product[] }>);

  // Calcula o valor total para percentuais
  const valorTotalProdutos = products.reduce((acc, prod) => acc + prod.netPrice, 0);

  return (
    <div className="space-y-8">
      <Card className="shadow-md">
        <CardHeader>
          <CardTitle>Análise por Tamanho</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow className="bg-slate-50">
                <TableHead className="font-semibold">Tamanho</TableHead>
                <TableHead className="font-semibold text-right">Quantidade</TableHead>
                <TableHead className="font-semibold text-right">Valor Total</TableHead>
                <TableHead className="font-semibold text-right">Preço Médio</TableHead>
                <TableHead className="font-semibold text-right">% do Total</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {Object.entries(tamanhoStats)
                .sort((a, b) => b[1].valorTotal - a[1].valorTotal)
                .map(([tamanho, stats]) => {
                  const percentualTotal = (stats.valorTotal / valorTotalProdutos) * 100;
                  return (
                    <TableRow key={tamanho}>
                      <TableCell className="font-medium">{tamanho}</TableCell>
                      <TableCell className="text-right">
                        {formatNumber(stats.quantidade)}
                      </TableCell>
                      <TableCell className="text-right">
                        {formatCurrency(stats.valorTotal)}
                      </TableCell>
                      <TableCell className="text-right">
                        {formatCurrency(stats.valorTotal / stats.quantidade)}
                      </TableCell>
                      <TableCell className="text-right">
                        {percentualTotal.toFixed(1)}%
                      </TableCell>
                    </TableRow>
                  );
                })}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Card className="shadow-md">
        <CardHeader>
          <CardTitle>Análise por NCM</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow className="bg-slate-50">
                <TableHead className="font-semibold">NCM</TableHead>
                <TableHead className="font-semibold">Descrição</TableHead>
                <TableHead className="font-semibold text-right">Quantidade</TableHead>
                <TableHead className="font-semibold text-right">Valor Total</TableHead>
                <TableHead className="font-semibold text-right">% do Total</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {Object.entries(ncmStats)
                .sort((a, b) => b[1].valorTotal - a[1].valorTotal)
                .map(([ncm, stats]) => {
                  const percentualTotal = (stats.valorTotal / valorTotalProdutos) * 100;
                  return (
                    <TableRow key={ncm}>
                      <TableCell className="font-medium">{ncm}</TableCell>
                      <TableCell>{stats.descricao}</TableCell>
                      <TableCell className="text-right">
                        {formatNumber(stats.quantidade)}
                      </TableCell>
                      <TableCell className="text-right">
                        {formatCurrency(stats.valorTotal)}
                      </TableCell>
                      <TableCell className="text-right">
                        {percentualTotal.toFixed(1)}%
                      </TableCell>
                    </TableRow>
                  );
                })}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Card className="shadow-md">
        <CardHeader>
          <CardTitle>Análise por Faixa de Preço</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow className="bg-slate-50">
                <TableHead className="font-semibold">Faixa de Preço</TableHead>
                <TableHead className="font-semibold text-right">Quantidade</TableHead>
                <TableHead className="font-semibold text-right">Valor Total</TableHead>
                <TableHead className="font-semibold text-right">% do Total</TableHead>
                <TableHead className="font-semibold text-right">Preço Médio</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {Object.entries(faixaPrecoStats)
                .sort((a, b) => {
                  const ordem = [
                    'Até R$ 50',
                    'R$ 51 a R$ 100',
                    'R$ 101 a R$ 200',
                    'R$ 201 a R$ 500',
                    'Acima de R$ 500'
                  ];
                  return ordem.indexOf(a[0]) - ordem.indexOf(b[0]);
                })
                .map(([faixa, stats]) => {
                  const percentualTotal = (stats.valorTotal / valorTotalProdutos) * 100;
                  const precoMedio = stats.valorTotal / stats.quantidade;
                  return (
                    <TableRow key={faixa}>
                      <TableCell className="font-medium">{faixa}</TableCell>
                      <TableCell className="text-right">
                        {formatNumber(stats.quantidade)}
                      </TableCell>
                      <TableCell className="text-right">
                        {formatCurrency(stats.valorTotal)}
                      </TableCell>
                      <TableCell className="text-right">
                        {percentualTotal.toFixed(1)}%
                      </TableCell>
                      <TableCell className="text-right">
                        {formatCurrency(precoMedio)}
                      </TableCell>
                    </TableRow>
                  );
                })}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
};
