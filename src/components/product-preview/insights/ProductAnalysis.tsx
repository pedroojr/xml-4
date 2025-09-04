
import React from 'react';
import { Product } from '../../../types/nfe';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { formatCurrency, formatNumber } from '../../../utils/formatters';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

interface ProductAnalysisProps {
  products: Product[];
}

// Mapping of NCM to detailed descriptions
const NCM_DESCRIPTIONS: Record<string, string> = {
  '39249000': 'Bicos de Mamadeira e acessórios plásticos para alimentação infantil',
  '39241000': 'Conjuntos de mamadeiras e acessórios plásticos',
  '96032100': 'Escovas de dentes, incluídas as escovas para dentaduras',
  '40149090': 'Artigos de higiene ou de farmácia de borracha vulcanizada',
  // Add more NCMs as needed
};

export const ProductAnalysis: React.FC<ProductAnalysisProps> = ({ products }) => {
  // Size analysis with normalization
  const normalizeSize = (size: string): string => {
    const normalized = size.toUpperCase().trim();
    const mapping: Record<string, string> = {
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
    return mapping[normalized] || size;
  };

  const sizeStats = products.reduce((acc, product) => {
    const size = normalizeSize(product.size || 'Not specified');
    if (!acc[size]) {
      acc[size] = {
        quantity: 0,
        totalValue: 0,
        products: []
      };
    }
    acc[size].quantity += product.quantity;
    acc[size].totalValue += product.netPrice;
    acc[size].products.push(product);
    return acc;
  }, {} as Record<string, { quantity: number; totalValue: number; products: Product[] }>);

  // NCM analysis with detailed descriptions
  const ncmStats = products.reduce((acc, product) => {
    if (!acc[product.ncm]) {
      acc[product.ncm] = {
        quantity: 0,
        totalValue: 0,
        description: NCM_DESCRIPTIONS[product.ncm] || product.description.split(' ')[0]
      };
    }
    acc[product.ncm].quantity += product.quantity;
    acc[product.ncm].totalValue += product.netPrice;
    return acc;
  }, {} as Record<string, { quantity: number; totalValue: number; description: string }>);

  // Expanded price range analysis
  const getPriceRange = (price: number): string => {
    if (price <= 50) return 'Até R$ 50';
    if (price <= 100) return 'R$ 51 a R$ 100';
    if (price <= 200) return 'R$ 101 a R$ 200';
    if (price <= 500) return 'R$ 201 a R$ 500';
    return 'Acima de R$ 500';
  };

  const priceRangeStats = products.reduce((acc, product) => {
    const unitPrice = product.netPrice / product.quantity;
    const range = getPriceRange(unitPrice);
    if (!acc[range]) {
      acc[range] = {
        quantity: 0,
        totalValue: 0,
        products: []
      };
    }
    acc[range].quantity += product.quantity;
    acc[range].totalValue += product.netPrice;
    acc[range].products.push(product);
    return acc;
  }, {} as Record<string, { quantity: number; totalValue: number; products: Product[] }>);

  // Calculate total value for percentages
  const totalProductValue = products.reduce((acc, prod) => acc + prod.netPrice, 0);

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
              {Object.entries(sizeStats)
                .sort((a, b) => b[1].totalValue - a[1].totalValue)
                .map(([size, stats]) => {
                  const totalPercentage = (stats.totalValue / totalProductValue) * 100;
                  return (
                    <TableRow key={size}>
                      <TableCell className="font-medium">{size}</TableCell>
                      <TableCell className="text-right">
                        {formatNumber(stats.quantity)}
                      </TableCell>
                      <TableCell className="text-right">
                        {formatCurrency(stats.totalValue)}
                      </TableCell>
                      <TableCell className="text-right">
                        {formatCurrency(stats.totalValue / stats.quantity)}
                      </TableCell>
                      <TableCell className="text-right">
                        {totalPercentage.toFixed(1)}%
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
                .sort((a, b) => b[1].totalValue - a[1].totalValue)
                .map(([ncm, stats]) => {
                  const totalPercentage = (stats.totalValue / totalProductValue) * 100;
                  return (
                    <TableRow key={ncm}>
                      <TableCell className="font-medium">{ncm}</TableCell>
                      <TableCell>{stats.description}</TableCell>
                      <TableCell className="text-right">
                        {formatNumber(stats.quantity)}
                      </TableCell>
                      <TableCell className="text-right">
                        {formatCurrency(stats.totalValue)}
                      </TableCell>
                      <TableCell className="text-right">
                        {totalPercentage.toFixed(1)}%
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
              {Object.entries(priceRangeStats)
                .sort((a, b) => {
                  const order = [
                    'Até R$ 50',
                    'R$ 51 a R$ 100',
                    'R$ 101 a R$ 200',
                    'R$ 201 a R$ 500',
                    'Acima de R$ 500'
                  ];
                  return order.indexOf(a[0]) - order.indexOf(b[0]);
                })
                .map(([range, stats]) => {
                  const totalPercentage = (stats.totalValue / totalProductValue) * 100;
                  const averagePrice = stats.totalValue / stats.quantity;
                  return (
                    <TableRow key={range}>
                      <TableCell className="font-medium">{range}</TableCell>
                      <TableCell className="text-right">
                        {formatNumber(stats.quantity)}
                      </TableCell>
                      <TableCell className="text-right">
                        {formatCurrency(stats.totalValue)}
                      </TableCell>
                      <TableCell className="text-right">
                        {totalPercentage.toFixed(1)}%
                      </TableCell>
                      <TableCell className="text-right">
                        {formatCurrency(averagePrice)}
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
