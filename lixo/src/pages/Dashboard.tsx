import React, { useState } from 'react';
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { 
  FileText, 
  Package2, 
  Hash, 
  DollarSign, 
  Receipt, 
  Bookmark,
  Trophy,
  Settings,
  TrendingUp,
  Info,
  ArrowUpRight,
  ArrowDownRight
} from 'lucide-react';
import { useNFEStorage } from '@/hooks/useNFEStorage';
import { formatCurrency } from '@/utils/formatters';
import { useNavigate } from 'react-router-dom';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { toast } from "@/components/ui/use-toast";
import SavedNFEList from '@/components/SavedNFEList';

const Dashboard = () => {
  const navigate = useNavigate();
  const { savedNFEs, toggleFavorite } = useNFEStorage();
  const [periodoSelecionado, setPeriodoSelecionado] = useState('mes');

  // Cálculos dos totais com verificações de segurança
  const totalNotas = savedNFEs.length;
  const totalProdutos = savedNFEs.reduce((acc, nfe) => acc + (Array.isArray(nfe.produtos) ? nfe.produtos.length : 0), 0);
  const quantidadeTotal = savedNFEs.reduce((acc, nfe) => 
    acc + (Array.isArray(nfe.produtos) ? nfe.produtos.reduce((sum, prod) => sum + (Number(prod.quantity) || 0), 0) : 0), 0);
  const valorTotal = savedNFEs.reduce((acc, nfe) => acc + (Number(nfe.valor) || 0), 0);
  const totalImpostos = valorTotal * 0.17; // 17% de impostos
  const notasFavoritas = savedNFEs.filter(nfe => nfe.isFavorite).length;

  // Cálculo do volume de compras por fornecedor
  const volumePorFornecedor = savedNFEs.reduce((acc: any, nfe) => {
    const fornecedorNome = nfe.fornecedor || 'Fornecedor não especificado';
    if (!acc[fornecedorNome]) {
      acc[fornecedorNome] = {
        valor: 0,
        itens: 0,
        performance: 0,
        crescimento: Math.random() * 20 - 10 // Simulação de crescimento (-10% a +10%)
      };
    }
    acc[fornecedorNome].valor += Number(nfe.valor) || 0;
    acc[fornecedorNome].itens += Number(nfe.itens) || 0;
    return acc;
  }, {});

  // Convertendo para array e ordenando por valor
  const fornecedoresOrdenados = Object.entries(volumePorFornecedor)
    .map(([nome, dados]: [string, any]) => ({
      name: nome,
      value: dados.valor,
      items: dados.itens,
      performance: '80%',
      crescimento: dados.crescimento
    }))
    .sort((a, b) => b.value - a.value);

  // Encontrar o fornecedor com maior crescimento
  const fornecedorMaiorCrescimento = fornecedoresOrdenados[0] || {
    name: 'Nenhum fornecedor',
    value: 0,
    items: 0,
    crescimento: 0
  };

  // Função para navegar para a página de produtos com filtros
  const navegarParaProdutos = (filtro?: string) => {
    navigate('/produtos', { state: { filtro } });
  };

  const handleNFESelect = (nfeId: string) => {
    navigate(`/nfe/${nfeId}`);
  };

  const formattedNFEs = savedNFEs.map(nfe => ({
    id: nfe.id,
    numero: nfe.numero,
    fornecedor: nfe.fornecedor,
    dataEmissao: nfe.data,
    quantidadeItens: Array.isArray(nfe.produtos) ? nfe.produtos.length : 0
  }));

  return (
    <div className="w-full p-4 space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold">Dashboard</h1>
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
          <Button variant="outline" size="sm">
            <Settings className="w-4 h-4 mr-2" />
            Filtros
          </Button>
          <Button variant="outline" size="sm">
            <TrendingUp className="w-4 h-4 mr-2" />
            Atualizar
          </Button>
        </div>
      </div>

      {/* Cards de Métricas */}
      <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-6 gap-4">
        <Card 
          className="bg-white hover:bg-gray-50 cursor-pointer transition-colors"
          onClick={() => navegarParaProdutos('notas')}
        >
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
                      <p>Clique para ver todas as notas</p>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              </div>
              <div className="flex items-center mt-2 text-xs">
                <ArrowUpRight className="w-3 h-3 text-green-500 mr-1" />
                <span className="text-green-600">+5% em relação ao mês anterior</span>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card 
          className="bg-white hover:bg-gray-50 cursor-pointer transition-colors"
          onClick={() => navegarParaProdutos('produtos')}
        >
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
                      <p>Clique para ver todos os produtos</p>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              </div>
              <div className="flex items-center mt-2 text-xs">
                <ArrowUpRight className="w-3 h-3 text-green-500 mr-1" />
                <span className="text-green-600">+12% em relação ao mês anterior</span>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card 
          className="bg-white hover:bg-gray-50 cursor-pointer transition-colors"
          onClick={() => navegarParaProdutos('quantidade')}
        >
          <CardContent className="p-4">
            <div className="flex flex-col">
              <span className="text-sm text-muted-foreground">Quantidade Total</span>
              <div className="flex items-center mt-2">
                <Hash className="w-4 h-4 text-orange-500 mr-2" />
                <span className="text-2xl font-bold">{quantidadeTotal}</span>
                <span className="text-xs text-muted-foreground ml-2">Unidades</span>
              </div>
              <div className="flex items-center mt-2 text-xs">
                <ArrowDownRight className="w-3 h-3 text-red-500 mr-1" />
                <span className="text-red-600">-3% em relação ao mês anterior</span>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card 
          className="bg-white hover:bg-gray-50 cursor-pointer transition-colors"
          onClick={() => navegarParaProdutos('valor')}
        >
          <CardContent className="p-4">
            <div className="flex flex-col">
              <span className="text-sm text-muted-foreground">Valor Total</span>
              <div className="flex items-center mt-2">
                <DollarSign className="w-4 h-4 text-purple-500 mr-2" />
                <span className="text-2xl font-bold">{formatCurrency(valorTotal)}</span>
              </div>
              <div className="flex items-center mt-2 text-xs">
                <ArrowUpRight className="w-3 h-3 text-green-500 mr-1" />
                <span className="text-green-600">+8% em relação ao mês anterior</span>
              </div>
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
              <div className="flex items-center mt-2 text-xs">
                <ArrowUpRight className="w-3 h-3 text-green-500 mr-1" />
                <span className="text-green-600">+8% em relação ao mês anterior</span>
              </div>
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
              <div className="flex items-center mt-2 text-xs">
                <ArrowUpRight className="w-3 h-3 text-green-500 mr-1" />
                <span className="text-green-600">+2 novas este mês</span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Seção de Fornecedores VIP e Gráfico */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card className="bg-white">
          <CardContent className="p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <Trophy className="w-5 h-5 text-yellow-500" />
                <h2 className="text-lg font-semibold">Fornecedores VIP</h2>
                <span className="text-xs bg-yellow-100 text-yellow-800 px-2 py-1 rounded">Benefícios VIP</span>
              </div>
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Info className="w-4 h-4 text-gray-400" />
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>Fornecedores com maior volume de compras</p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            </div>
            
            <div className="space-y-4">
              {fornecedoresOrdenados.map((fornecedor, index) => (
                <div key={index} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg hover:bg-gray-100 cursor-pointer transition-colors">
                  <div className="flex items-center gap-3">
                    <span className="w-6 h-6 flex items-center justify-center bg-white rounded-full text-sm font-medium">
                      {index + 1}
                    </span>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-medium">{fornecedor.name}</span>
                        {index < 2 && (
                          <span className="text-xs bg-yellow-500 text-white px-1.5 py-0.5 rounded">VIP</span>
                        )}
                      </div>
                      <div className="text-sm text-muted-foreground">
                        {formatCurrency(fornecedor.value)} • {fornecedor.items} itens
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className={`text-sm ${fornecedor.crescimento >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                      {fornecedor.crescimento >= 0 ? '+' : ''}{fornecedor.crescimento.toFixed(1)}%
                    </span>
                    {fornecedor.crescimento >= 0 ? (
                      <ArrowUpRight className="w-4 h-4 text-green-500" />
                    ) : (
                      <ArrowDownRight className="w-4 h-4 text-red-500" />
                    )}
                  </div>
                </div>
              ))}
            </div>

            <div className="mt-6 space-y-2">
              <Button 
                variant="outline" 
                className="w-full text-sm"
                onClick={() => {
                  toast({
                    title: "Gerando proposta VIP",
                    description: "A proposta será gerada e enviada para o fornecedor selecionado.",
                  });
                }}
              >
                Gerar proposta para fornecedor VIP
              </Button>
              <Button variant="outline" className="w-full text-sm">
                Configurar critérios de classificação VIP
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Gráfico de Volume de Compras */}
        <Card className="bg-white">
          <CardContent className="p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold">Volume de Compras por Fornecedor</h2>
              <select
                className="px-2 py-1 border rounded-md text-sm"
                value={periodoSelecionado}
                onChange={(e) => setPeriodoSelecionado(e.target.value)}
              >
                <option value="semana">Por Semana</option>
                <option value="mes">Por Mês</option>
                <option value="trimestre">Por Trimestre</option>
              </select>
            </div>
            <div className="h-[400px] flex items-end gap-4">
              {fornecedoresOrdenados.map((item, index) => (
                <TooltipProvider key={index}>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <div className="flex-1 flex flex-col items-center group">
                        <div 
                          className="w-full bg-gradient-to-t from-yellow-500 to-yellow-400 rounded-t group-hover:from-yellow-600 group-hover:to-yellow-500 transition-colors"
                          style={{ 
                            height: `${(item.value / fornecedoresOrdenados[0].value) * 300}px`,
                          }}
                        />
                        <span className="text-xs mt-2 font-medium truncate w-full text-center">
                          {item.name}
                        </span>
                      </div>
                    </TooltipTrigger>
                    <TooltipContent>
                      <div className="space-y-1">
                        <p className="font-medium">{item.name}</p>
                        <p className="text-sm">Valor: {formatCurrency(item.value)}</p>
                        <p className="text-sm">Itens: {item.items}</p>
                        <p className="text-sm">Crescimento: {item.crescimento.toFixed(1)}%</p>
                      </div>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Indicadores Comparativos */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card className="bg-white">
          <CardContent className="p-6">
            <h3 className="text-lg font-semibold mb-4">Evolução Mensal</h3>
            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <span>Valor Total</span>
                <span className="text-green-600">+8%</span>
              </div>
              <div className="flex justify-between items-center">
                <span>Quantidade de Notas</span>
                <span className="text-green-600">+5%</span>
              </div>
              <div className="flex justify-between items-center">
                <span>Média por Nota</span>
                <span className="text-red-600">-3%</span>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-white">
          <CardContent className="p-6">
            <h3 className="text-lg font-semibold mb-4">Fornecedor em Destaque</h3>
            <div className="space-y-4">
              <div className="flex items-center gap-2">
                <Trophy className="w-5 h-5 text-yellow-500" />
                <span className="font-medium">{fornecedorMaiorCrescimento.name}</span>
              </div>
              <div className="text-sm space-y-2">
                <div className="flex justify-between">
                  <span>Crescimento</span>
                  <span className="text-green-600">
                    +{fornecedorMaiorCrescimento.crescimento.toFixed(1)}%
                  </span>
                </div>
                <div className="flex justify-between">
                  <span>Volume</span>
                  <span>{formatCurrency(fornecedorMaiorCrescimento.value)}</span>
                </div>
                <div className="flex justify-between">
                  <span>Itens</span>
                  <span>{fornecedorMaiorCrescimento.items}</span>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-white">
          <CardContent className="p-6">
            <h3 className="text-lg font-semibold mb-4">Produtos em Alta</h3>
            <div className="space-y-4">
              <div className="p-3 bg-gray-50 rounded-lg">
                <div className="font-medium">Calça Jeans Skinny</div>
                <div className="text-sm text-gray-600">150 unidades • +25%</div>
              </div>
              <div className="p-3 bg-gray-50 rounded-lg">
                <div className="font-medium">Camiseta Básica</div>
                <div className="text-sm text-gray-600">200 unidades • +18%</div>
              </div>
              <div className="p-3 bg-gray-50 rounded-lg">
                <div className="font-medium">Vestido Floral</div>
                <div className="text-sm text-gray-600">80 unidades • +15%</div>
              </div>
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
};

export default Dashboard; 