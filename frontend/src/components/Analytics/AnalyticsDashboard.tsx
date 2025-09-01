import React, { useState, useEffect } from 'react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  PieChart,
  Pie,
  Cell,
  LineChart,
  Line,
  ResponsiveContainer
} from 'recharts';
import {
  Activity,
  Upload,
  FileText,
  Clock,
  TrendingUp,
  AlertTriangle,
  Database,
  Zap,
  RefreshCw
} from 'lucide-react';

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884D8'];

const AnalyticsDashboard = () => {
  const [summary, setSummary] = useState(null);
  const [metrics, setMetrics] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [lastUpdate, setLastUpdate] = useState(new Date());

  const fetchAnalytics = async () => {
    try {
      setLoading(true);
      const [summaryRes, metricsRes] = await Promise.all([
        fetch('/api/analytics/summary'),
        fetch('/api/analytics/metrics')
      ]);

      if (!summaryRes.ok || !metricsRes.ok) {
        throw new Error('Erro ao carregar dados de analytics');
      }

      const summaryData = await summaryRes.json();
      const metricsData = await metricsRes.json();

      setSummary(summaryData.data);
      setMetrics(metricsData.data);
      setLastUpdate(new Date());
      setError(null);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const resetMetrics = async () => {
    if (!confirm('Tem certeza que deseja resetar todas as métricas? Esta ação não pode ser desfeita.')) {
      return;
    }

    try {
      const response = await fetch('/api/analytics/reset', {
        method: 'POST'
      });

      if (!response.ok) {
        throw new Error('Erro ao resetar métricas');
      }

      await fetchAnalytics();
      alert('Métricas resetadas com sucesso!');
    } catch (err) {
      alert('Erro ao resetar métricas: ' + err.message);
    }
  };

  useEffect(() => {
    fetchAnalytics();
    
    // Auto-refresh a cada 30 segundos
    const interval = setInterval(fetchAnalytics, 30000);
    return () => clearInterval(interval);
  }, []);

  if (loading && !summary) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-lg p-4">
        <div className="flex items-center">
          <AlertTriangle className="h-5 w-5 text-red-500 mr-2" />
          <span className="text-red-700">Erro: {error}</span>
        </div>
        <button
          onClick={fetchAnalytics}
          className="mt-2 px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700"
        >
          Tentar Novamente
        </button>
      </div>
    );
  }

  // Preparar dados para gráficos
  const endpointData = summary?.requests?.mostUsedEndpoints?.map(item => ({
    name: item.name.replace('/api/', ''),
    requests: item.count
  })) || [];

  const monthlyData = Object.entries(summary?.nfes?.monthlyDistribution || {}).map(([month, count]) => ({
    month: month.substring(5), // Pegar apenas MM
    nfes: count
  }));

  const errorTypeData = summary?.errors?.topTypes?.map(item => ({
    name: item.name,
    value: item.count
  })) || [];

  const statusCodeData = Object.entries(metrics?.requests?.byStatusCode || {}).map(([code, count]) => ({
    code,
    count,
    fill: code.startsWith('2') ? '#00C49F' : code.startsWith('4') ? '#FFBB28' : '#FF8042'
  }));

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Dashboard de Analytics</h1>
          <p className="text-gray-600 mt-1">
            Última atualização: {lastUpdate.toLocaleTimeString()}
          </p>
        </div>
        <div className="flex space-x-2">
          <button
            onClick={fetchAnalytics}
            disabled={loading}
            className="flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
          >
            <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
            Atualizar
          </button>
          <button
            onClick={resetMetrics}
            className="flex items-center px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700"
          >
            <AlertTriangle className="h-4 w-4 mr-2" />
            Resetar Métricas
          </button>
        </div>
      </div>

      {/* Cards de Resumo */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center">
            <Activity className="h-8 w-8 text-blue-600" />
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Total de Requisições</p>
              <p className="text-2xl font-bold text-gray-900">{summary?.requests?.total || 0}</p>
            </div>
          </div>
          <div className="mt-4">
            <p className="text-sm text-gray-600">
              Tempo médio: {summary?.requests?.averageResponseTime || 0}ms
            </p>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center">
            <Upload className="h-8 w-8 text-green-600" />
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Uploads</p>
              <p className="text-2xl font-bold text-gray-900">{summary?.uploads?.total || 0}</p>
            </div>
          </div>
          <div className="mt-4">
            <p className="text-sm text-gray-600">
              Taxa de sucesso: {summary?.uploads?.successRate || 0}%
            </p>
            <p className="text-sm text-gray-600">
              Total: {summary?.uploads?.totalSizeMB || 0} MB
            </p>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center">
            <FileText className="h-8 w-8 text-purple-600" />
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">NFes Processadas</p>
              <p className="text-2xl font-bold text-gray-900">{summary?.nfes?.total || 0}</p>
            </div>
          </div>
          <div className="mt-4">
            <p className="text-sm text-gray-600">
              Taxa de sucesso: {summary?.nfes?.successRate || 0}%
            </p>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center">
            <Clock className="h-8 w-8 text-orange-600" />
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Uptime</p>
              <p className="text-2xl font-bold text-gray-900">{summary?.performance?.uptime || '0m'}</p>
            </div>
          </div>
          <div className="mt-4">
            <p className="text-sm text-gray-600">
              Cache Hit Rate: {summary?.performance?.cacheHitRate || 0}%
            </p>
          </div>
        </div>
      </div>

      {/* Gráficos */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Endpoints Mais Usados */}
        <div className="bg-white rounded-lg shadow p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Endpoints Mais Usados</h3>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={endpointData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="name" />
              <YAxis />
              <Tooltip />
              <Bar dataKey="requests" fill="#3B82F6" />
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* NFes por Mês */}
        <div className="bg-white rounded-lg shadow p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">NFes Processadas por Mês</h3>
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={monthlyData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="month" />
              <YAxis />
              <Tooltip />
              <Line type="monotone" dataKey="nfes" stroke="#10B981" strokeWidth={2} />
            </LineChart>
          </ResponsiveContainer>
        </div>

        {/* Status Codes */}
        <div className="bg-white rounded-lg shadow p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Códigos de Status HTTP</h3>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={statusCodeData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="code" />
              <YAxis />
              <Tooltip />
              <Bar dataKey="count" fill={(entry) => entry.fill} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Tipos de Erro */}
        <div className="bg-white rounded-lg shadow p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Tipos de Erro</h3>
          {errorTypeData.length > 0 ? (
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={errorTypeData}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                  outerRadius={80}
                  fill="#8884d8"
                  dataKey="value"
                >
                  {errorTypeData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          ) : (
            <div className="flex items-center justify-center h-64 text-gray-500">
              <div className="text-center">
                <Zap className="h-12 w-12 mx-auto mb-2" />
                <p>Nenhum erro registrado</p>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Métricas Detalhadas */}
      <div className="bg-white rounded-lg shadow p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Métricas Detalhadas</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div>
            <h4 className="font-medium text-gray-900 mb-2">Performance</h4>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-600">Tempo médio de resposta:</span>
                <span className="font-medium">{summary?.requests?.averageResponseTime || 0}ms</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Taxa de erro:</span>
                <span className="font-medium">{summary?.performance?.errorRate || 0}%</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Cache Hit Rate:</span>
                <span className="font-medium">{summary?.performance?.cacheHitRate || 0}%</span>
              </div>
            </div>
          </div>

          <div>
            <h4 className="font-medium text-gray-900 mb-2">Sistema</h4>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-600">Uptime:</span>
                <span className="font-medium">{summary?.performance?.uptime || '0m'}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Total de erros:</span>
                <span className="font-medium">{summary?.errors?.total || 0}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Erros recentes:</span>
                <span className="font-medium">{summary?.errors?.recentCount || 0}</span>
              </div>
            </div>
          </div>

          <div>
            <h4 className="font-medium text-gray-900 mb-2">Dados</h4>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-600">Total de uploads:</span>
                <span className="font-medium">{summary?.uploads?.total || 0}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Tamanho total:</span>
                <span className="font-medium">{summary?.uploads?.totalSizeMB || 0} MB</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">NFes processadas:</span>
                <span className="font-medium">{summary?.nfes?.total || 0}</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AnalyticsDashboard;