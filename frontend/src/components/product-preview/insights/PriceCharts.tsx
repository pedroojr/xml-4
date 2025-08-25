import React from 'react';
import { Product } from '../../../types/nfe';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  LineChart,
  Line
} from 'recharts';
import { formatCurrency } from '../../../utils/formatters';

interface PriceChartsProps {
  products: Product[];
  xapuriMarkup: number;
  epitaMarkup: number;
}

export const PriceCharts: React.FC<PriceChartsProps> = ({
  products,
  xapuriMarkup,
  epitaMarkup
}) => {
  // Cores para os gráficos
  const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884d8', '#82ca9d'];

  // Preparar dados para o gráfico de distribuição de preços
  const preparePriceDistribution = () => {
    const priceRanges = [0, 50, 100, 200, 500, 1000, Infinity];
    const distribution = priceRanges.slice(0, -1).map((min, index) => {
      const max = priceRanges[index + 1];
      const count = products.filter(p => {
        const price = p.netPrice;
        return price >= min && price < max;
      }).length;
      
      const label = max === Infinity 
        ? `Acima de R$${min}` 
        : `R$${min} - R$${max}`;
      
      return { name: label, value: count };
    }).filter(range => range.value > 0);

    return distribution;
  };

  // Preparar dados para o gráfico de comparação de preços
  const preparePriceComparison = () => {
    return products.slice(0, 10).map(product => ({
      name: product.name.substring(0, 15) + '...',
      custo: product.netPrice,
      vendaXapuri: product.netPrice * (1 + xapuriMarkup / 100),
      vendaEpita: product.netPrice * (1 + epitaMarkup / 100),
    }));
  };

  // Preparar dados para o gráfico de margem por produto
  const prepareMarginByProduct = () => {
    return products.slice(0, 10).map(product => {
      const custoUnitario = product.quantity > 0 ? product.netPrice / product.quantity : product.netPrice;
      const vendaXapuri = custoUnitario * (1 + xapuriMarkup / 100);
      const vendaEpita = custoUnitario * (1 + epitaMarkup / 100);
      
      const margemXapuri = ((vendaXapuri - custoUnitario) / vendaXapuri) * 100;
      const margemEpita = ((vendaEpita - custoUnitario) / vendaEpita) * 100;
      
      return {
        name: product.name.substring(0, 15) + '...',
        margemXapuri: parseFloat(margemXapuri.toFixed(1)),
        margemEpita: parseFloat(margemEpita.toFixed(1)),
      };
    });
  };

  // Formatar valores para o tooltip
  const formatTooltipValue = (value: number) => {
    return formatCurrency(value);
  };

  const formatPercentage = (value: number) => {
    return `${value.toFixed(1)}%`;
  };

  const priceDistribution = preparePriceDistribution();
  const priceComparison = preparePriceComparison();
  const marginByProduct = prepareMarginByProduct();

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Distribuição de Preços de Custo</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-[300px]">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={priceDistribution}
                    cx="50%"
                    cy="50%"
                    labelLine={true}
                    label={({ name, percent }) => `${name} (${(percent * 100).toFixed(0)}%)`}
                    outerRadius={80}
                    fill="#8884d8"
                    dataKey="value"
                  >
                    {priceDistribution.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip formatter={(value: number) => [`${value} produtos`, 'Quantidade']} />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Comparação de Preços (Top 10 Produtos)</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-[300px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={priceComparison}
                  margin={{ top: 20, right: 30, left: 20, bottom: 5 }}
                >
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="name" />
                  <YAxis />
                  <Tooltip formatter={formatTooltipValue} />
                  <Legend />
                  <Bar dataKey="custo" name="Preço de Custo" fill="#8884d8" />
                  <Bar dataKey="vendaXapuri" name="Venda Xapuri" fill="#82ca9d" />
                  <Bar dataKey="vendaEpita" name="Venda Epitaciolândia" fill="#ffc658" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Margem de Lucro por Produto (%)</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-[300px]">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart
                data={marginByProduct}
                margin={{ top: 20, right: 30, left: 20, bottom: 5 }}
              >
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" />
                <YAxis />
                <Tooltip formatter={formatPercentage} />
                <Legend />
                <Line 
                  type="monotone" 
                  dataKey="margemXapuri" 
                  name="Margem Xapuri" 
                  stroke="#82ca9d" 
                  activeDot={{ r: 8 }} 
                />
                <Line 
                  type="monotone" 
                  dataKey="margemEpita" 
                  name="Margem Epitaciolândia" 
                  stroke="#ffc658" 
                  activeDot={{ r: 8 }} 
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};