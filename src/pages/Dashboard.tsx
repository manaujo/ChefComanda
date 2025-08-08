import React, { useState, useEffect } from 'react';
import { 
  BarChart3, Users, ShoppingCart, TrendingUp, AlertTriangle, 
  Coffee, Clock, DollarSign, Package, ChefHat, CreditCard,
  ArrowUp, ArrowDown, Activity, Eye, RefreshCw, ClipboardList
} from 'lucide-react';
import { useRestaurante } from '../contexts/RestauranteContext';
import { formatarDinheiro, formatarTempo } from '../utils/formatters';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, 
  PieChart, Pie, Cell, LineChart, Line, AreaChart, Area 
} from 'recharts';
import Button from '../components/ui/Button';
import toast from 'react-hot-toast';

const Dashboard: React.FC = () => {
  const { 
    mesas, 
    produtos, 
    comandas, 
    itensComanda, 
    getDashboardData, 
    getVendasData,
    refreshData 
  } = useRestaurante();
  
  const [dashboardData, setDashboardData] = useState<any>(null);
  const [vendasData, setVendasData] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [dataInitialized, setDataInitialized] = useState(false);

  useEffect(() => {
    // Só carrega dados uma vez quando o componente monta
    if (!dataInitialized) {
      loadDashboardData();
    }
  }, [dataInitialized]);

  const loadDashboardData = async () => {
    try {
      setLoading(true);
      await refreshData();
      
      const [dashboard, vendas] = await Promise.all([
        getDashboardData(),
        getVendasData()
      ]);
      
      setDashboardData(dashboard);
      setVendasData(vendas || []);
      setDataInitialized(true);
    } catch (error) {
      console.error('Error loading dashboard data:', error);
      toast.error('Erro ao carregar dados do dashboard');
    } finally {
      setLoading(false);
    }
  };

  const handleRefresh = async () => {
    try {
      setRefreshing(true);
      await loadDashboardData();
      toast.success('Dados atualizados!');
    } catch (error) {
      toast.error('Erro ao atualizar dados');
    } finally {
      setRefreshing(false);
    }
  };

  // Calcular métricas em tempo real
  const mesasOcupadas = mesas.filter(mesa => mesa.status === 'ocupada').length;
  const mesasLivres = mesas.filter(mesa => mesa.status === 'livre').length;
  const comandasAbertas = comandas.filter(comanda => comanda.status === 'aberta').length;
  
  const vendasHoje = vendasData.reduce((acc, venda) => acc + venda.total, 0);
  const pedidosHoje = vendasData.reduce((acc, venda) => acc + venda.quantidade, 0);
  const ticketMedio = pedidosHoje > 0 ? vendasHoje / pedidosHoje : 0;

  // Produtos com estoque baixo
  const produtosEstoqueBaixo = produtos.filter(produto => 
    produto.estoque <= produto.estoque_minimo
  );

  // Itens pendentes na cozinha
  const itensPendentes = itensComanda.filter(item => 
    item.status === 'pendente' || item.status === 'preparando'
  );

  // Produtos mais vendidos hoje
  const produtosMaisVendidos = itensComanda
    .reduce((acc, item) => {
      const existing = acc.find(p => p.nome === item.nome);
      if (existing) {
        existing.quantidade += item.quantidade;
        existing.valor += item.preco_unitario * item.quantidade;
      } else {
        acc.push({
          nome: item.nome,
          quantidade: item.quantidade,
          valor: item.preco_unitario * item.quantidade
        });
      }
      return acc;
    }, [] as any[])
    .sort((a, b) => b.quantidade - a.quantidade)
    .slice(0, 5);

  // Dados para gráficos
  const mesasData = [
    { name: 'Livres', value: mesasLivres, color: '#10B981' },
    { name: 'Ocupadas', value: mesasOcupadas, color: '#3B82F6' },
    { name: 'Aguardando', value: mesas.filter(m => m.status === 'aguardando').length, color: '#F59E0B' }
  ];

  const vendasChartData = vendasData.map(venda => ({
    data: new Date(venda.data).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' }),
    vendas: venda.total,
    pedidos: venda.quantidade
  }));

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-red-500"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-start">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Dashboard</h1>
          <p className="text-gray-600 dark:text-gray-400 mt-1">
            Visão geral do seu restaurante em tempo real
          </p>
        </div>
        <Button
          variant="ghost"
          icon={<RefreshCw size={18} />}
          onClick={handleRefresh}
          isLoading={refreshing}
        >
          Atualizar
        </Button>
      </div>

      {/* Alertas Críticos */}
      {(produtosEstoqueBaixo.length > 0 || itensPendentes.length > 5) && (
        <div className="bg-gradient-to-r from-red-50 to-orange-50 border-l-4 border-red-500 p-4 rounded-lg">
          <div className="flex items-center">
            <AlertTriangle className="h-5 w-5 text-red-500 mr-2" />
            <div>
              <h3 className="text-sm font-medium text-red-800">Atenção Necessária</h3>
              <div className="mt-1 text-sm text-red-700">
                {produtosEstoqueBaixo.length > 0 && (
                  <p>{produtosEstoqueBaixo.length} produto(s) com estoque baixo</p>
                )}
                {itensPendentes.length > 5 && (
                  <p>{itensPendentes.length} itens aguardando preparo</p>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Cards de Métricas Principais */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="bg-gradient-to-br from-blue-500 to-blue-600 rounded-xl shadow-lg p-6 text-white">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-blue-100 text-sm font-medium">Vendas Hoje</p>
              <p className="text-3xl font-bold mt-1">{formatarDinheiro(vendasHoje)}</p>
              <div className="flex items-center mt-2">
                <ArrowUp size={16} className="text-green-300" />
                <span className="text-blue-100 text-sm ml-1">+12% vs ontem</span>
              </div>
            </div>
            <div className="p-3 bg-white/20 rounded-full">
              <TrendingUp size={28} />
            </div>
          </div>
        </div>

        <div className="bg-gradient-to-br from-green-500 to-green-600 rounded-xl shadow-lg p-6 text-white">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-green-100 text-sm font-medium">Pedidos Hoje</p>
              <p className="text-3xl font-bold mt-1">{pedidosHoje}</p>
              <div className="flex items-center mt-2">
                <ArrowUp size={16} className="text-green-300" />
                <span className="text-green-100 text-sm ml-1">+8% vs ontem</span>
              </div>
            </div>
            <div className="p-3 bg-white/20 rounded-full">
              <ShoppingCart size={28} />
            </div>
          </div>
        </div>

        <div className="bg-gradient-to-br from-purple-500 to-purple-600 rounded-xl shadow-lg p-6 text-white">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-purple-100 text-sm font-medium">Ticket Médio</p>
              <p className="text-3xl font-bold mt-1">{formatarDinheiro(ticketMedio)}</p>
              <div className="flex items-center mt-2">
                <ArrowUp size={16} className="text-green-300" />
                <span className="text-purple-100 text-sm ml-1">+5% vs ontem</span>
              </div>
            </div>
            <div className="p-3 bg-white/20 rounded-full">
              <DollarSign size={28} />
            </div>
          </div>
        </div>

        <div className="bg-gradient-to-br from-orange-500 to-orange-600 rounded-xl shadow-lg p-6 text-white">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-orange-100 text-sm font-medium">Mesas Ativas</p>
              <p className="text-3xl font-bold mt-1">{mesasOcupadas}</p>
              <p className="text-orange-100 text-sm mt-1">{mesasLivres} livres</p>
            </div>
            <div className="p-3 bg-white/20 rounded-full">
              <Coffee size={28} />
            </div>
          </div>
        </div>
      </div>

      {/* Gráficos e Informações */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Gráfico de Vendas */}
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
              Vendas dos Últimos 7 Dias
            </h2>
            <div className="flex items-center text-sm text-gray-500 dark:text-gray-400">
              <Activity size={16} className="mr-1" />
              <span>Tempo real</span>
            </div>
          </div>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={vendasChartData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" />
                <XAxis dataKey="data" stroke="#6B7280" fontSize={12} />
                <YAxis stroke="#6B7280" fontSize={12} />
                <Tooltip 
                  formatter={(value: any, name: string) => [
                    name === 'vendas' ? formatarDinheiro(value) : value,
                    name === 'vendas' ? 'Vendas' : 'Pedidos'
                  ]}
                  labelStyle={{ color: '#374151' }}
                  contentStyle={{ 
                    backgroundColor: '#F9FAFB', 
                    border: '1px solid #E5E7EB',
                    borderRadius: '8px'
                  }}
                />
                <Line 
                  type="monotone" 
                  dataKey="vendas" 
                  stroke="#3B82F6" 
                  strokeWidth={3}
                  dot={{ fill: '#3B82F6', strokeWidth: 2, r: 4 }}
                  activeDot={{ r: 6, stroke: '#3B82F6', strokeWidth: 2 }}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Status das Mesas */}
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-6">
            Status das Mesas
          </h2>
          <div className="flex items-center justify-center h-64">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={mesasData}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={100}
                  paddingAngle={5}
                  dataKey="value"
                >
                  {mesasData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip 
                  formatter={(value: any) => [value, 'Mesas']}
                  contentStyle={{ 
                    backgroundColor: '#F9FAFB', 
                    border: '1px solid #E5E7EB',
                    borderRadius: '8px'
                  }}
                />
              </PieChart>
            </ResponsiveContainer>
          </div>
          <div className="flex justify-center space-x-4 mt-4">
            {mesasData.map((item, index) => (
              <div key={index} className="flex items-center">
                <div 
                  className="w-3 h-3 rounded-full mr-2"
                  style={{ backgroundColor: item.color }}
                ></div>
                <span className="text-sm text-gray-600 dark:text-gray-400">
                  {item.name}: {item.value}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Seção de Informações Detalhadas */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Comandas Ativas */}
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
              Comandas Ativas
            </h3>
            <div className="p-2 bg-blue-100 dark:bg-blue-900 rounded-lg">
              <ClipboardList size={20} className="text-blue-600 dark:text-blue-400" />
            </div>
          </div>
          
          <div className="space-y-3 max-h-64 overflow-y-auto">
            {mesas
              .filter(mesa => mesa.status === 'ocupada')
              .slice(0, 5)
              .map(mesa => {
                const itensMesa = itensComanda.filter(item => item.mesa_id === mesa.id);
                const valorMesa = itensMesa.reduce((acc, item) => acc + (item.preco_unitario * item.quantidade), 0);
                
                return (
                  <div key={mesa.id} className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-700 rounded-lg">
                    <div>
                      <p className="font-medium text-gray-900 dark:text-white">Mesa {mesa.numero}</p>
                      <div className="flex items-center text-sm text-gray-500 dark:text-gray-400">
                        <Clock size={14} className="mr-1" />
                        <span>{mesa.horario_abertura ? formatarTempo(mesa.horario_abertura) : 'N/A'}</span>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="font-medium text-gray-900 dark:text-white">
                        {formatarDinheiro(valorMesa)}
                      </p>
                      <p className="text-sm text-gray-500 dark:text-gray-400">
                        {itensMesa.length} {itensMesa.length === 1 ? 'item' : 'itens'}
                      </p>
                    </div>
                  </div>
                );
              })}
            
            {mesasOcupadas === 0 && (
              <div className="text-center py-8 text-gray-500 dark:text-gray-400">
                <Coffee size={32} className="mx-auto mb-2 opacity-50" />
                <p>Nenhuma mesa ocupada</p>
              </div>
            )}
          </div>
        </div>

        {/* Produtos Mais Vendidos */}
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
              Mais Vendidos Hoje
            </h3>
            <div className="p-2 bg-green-100 dark:bg-green-900 rounded-lg">
              <TrendingUp size={20} className="text-green-600 dark:text-green-400" />
            </div>
          </div>
          
          <div className="space-y-3 max-h-64 overflow-y-auto">
            {produtosMaisVendidos.map((produto, index) => (
              <div key={index} className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-700 rounded-lg">
                <div className="flex items-center">
                  <div className="w-8 h-8 bg-green-100 dark:bg-green-900 rounded-full flex items-center justify-center mr-3">
                    <span className="text-sm font-bold text-green-600 dark:text-green-400">
                      {index + 1}
                    </span>
                  </div>
                  <div>
                    <p className="font-medium text-gray-900 dark:text-white">{produto.nome}</p>
                    <p className="text-sm text-gray-500 dark:text-gray-400">
                      {produto.quantidade} vendidos
                    </p>
                  </div>
                </div>
                <p className="font-medium text-gray-900 dark:text-white">
                  {formatarDinheiro(produto.valor)}
                </p>
              </div>
            ))}
            
            {produtosMaisVendidos.length === 0 && (
              <div className="text-center py-8 text-gray-500 dark:text-gray-400">
                <ShoppingCart size={32} className="mx-auto mb-2 opacity-50" />
                <p>Nenhuma venda hoje</p>
              </div>
            )}
          </div>
        </div>

        {/* Alertas de Estoque */}
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
              Alertas de Estoque
            </h3>
            <div className="p-2 bg-red-100 dark:bg-red-900 rounded-lg">
              <Package size={20} className="text-red-600 dark:text-red-400" />
            </div>
          </div>
          
          <div className="space-y-3 max-h-64 overflow-y-auto">
            {produtosEstoqueBaixo.slice(0, 5).map(produto => (
              <div key={produto.id} className="flex items-center justify-between p-3 bg-red-50 dark:bg-red-900/20 rounded-lg border border-red-200 dark:border-red-800">
                <div>
                  <p className="font-medium text-gray-900 dark:text-white">{produto.nome}</p>
                  <p className="text-sm text-red-600 dark:text-red-400">
                    Estoque: {produto.estoque} (mín: {produto.estoque_minimo})
                  </p>
                </div>
                <div className="p-1 bg-red-100 dark:bg-red-900 rounded-full">
                  <AlertTriangle size={16} className="text-red-600 dark:text-red-400" />
                </div>
              </div>
            ))}
            
            {produtosEstoqueBaixo.length === 0 && (
              <div className="text-center py-8 text-gray-500 dark:text-gray-400">
                <Package size={32} className="mx-auto mb-2 opacity-50" />
                <p>Estoque em dia</p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Seção de Atividade da Cozinha */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Pedidos Pendentes */}
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
              Cozinha - Pedidos Pendentes
            </h3>
            <div className="flex items-center space-x-2">
              <div className="p-2 bg-yellow-100 dark:bg-yellow-900 rounded-lg">
                <ChefHat size={20} className="text-yellow-600 dark:text-yellow-400" />
              </div>
              <span className="text-sm font-medium text-gray-600 dark:text-gray-400">
                {itensPendentes.length} itens
              </span>
            </div>
          </div>
          
          <div className="space-y-3 max-h-64 overflow-y-auto">
            {itensPendentes.slice(0, 6).map(item => (
              <div key={item.id} className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-700 rounded-lg">
                <div>
                  <p className="font-medium text-gray-900 dark:text-white">
                    Mesa {mesas.find(m => m.id === item.mesa_id)?.numero} - {item.nome}
                  </p>
                  <div className="flex items-center space-x-2 mt-1">
                    <span className={`text-xs px-2 py-1 rounded-full ${
                      item.status === 'pendente' 
                        ? 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200'
                        : 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200'
                    }`}>
                      {item.status === 'pendente' ? 'Pendente' : 'Preparando'}
                    </span>
                    <span className="text-sm text-gray-500 dark:text-gray-400">
                      Qtd: {item.quantidade}
                    </span>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-sm text-gray-500 dark:text-gray-400">
                    {formatarTempo(item.created_at)}
                  </p>
                </div>
              </div>
            ))}
            
            {itensPendentes.length === 0 && (
              <div className="text-center py-8 text-gray-500 dark:text-gray-400">
                <ChefHat size={32} className="mx-auto mb-2 opacity-50" />
                <p>Nenhum pedido pendente</p>
              </div>
            )}
          </div>
        </div>

        {/* Resumo Financeiro */}
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
              Resumo Financeiro
            </h3>
            <div className="p-2 bg-green-100 dark:bg-green-900 rounded-lg">
              <CreditCard size={20} className="text-green-600 dark:text-green-400" />
            </div>
          </div>
          
          <div className="space-y-4">
            <div className="flex items-center justify-between p-4 bg-gradient-to-r from-green-50 to-green-100 dark:from-green-900/20 dark:to-green-800/20 rounded-lg">
              <div>
                <p className="text-sm text-green-700 dark:text-green-300">Faturamento Hoje</p>
                <p className="text-2xl font-bold text-green-800 dark:text-green-200">
                  {formatarDinheiro(vendasHoje)}
                </p>
              </div>
              <ArrowUp className="text-green-600 dark:text-green-400" size={24} />
            </div>
            
            <div className="flex items-center justify-between p-4 bg-gradient-to-r from-blue-50 to-blue-100 dark:from-blue-900/20 dark:to-blue-800/20 rounded-lg">
              <div>
                <p className="text-sm text-blue-700 dark:text-blue-300">Ticket Médio</p>
                <p className="text-2xl font-bold text-blue-800 dark:text-blue-200">
                  {formatarDinheiro(ticketMedio)}
                </p>
              </div>
              <BarChart3 className="text-blue-600 dark:text-blue-400" size={24} />
            </div>
            
            <div className="flex items-center justify-between p-4 bg-gradient-to-r from-purple-50 to-purple-100 dark:from-purple-900/20 dark:to-purple-800/20 rounded-lg">
              <div>
                <p className="text-sm text-purple-700 dark:text-purple-300">Comandas Abertas</p>
                <p className="text-2xl font-bold text-purple-800 dark:text-purple-200">
                  {comandasAbertas}
                </p>
              </div>
              <Coffee className="text-purple-600 dark:text-purple-400" size={24} />
            </div>
          </div>
        </div>
      </div>

      {/* Ações Rápidas */}
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
          Ações Rápidas
        </h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Button
            variant="primary"
            className="h-20 flex-col space-y-2"
            onClick={() => window.location.href = '/dashboard/mesas'}
          >
            <Coffee size={24} />
            <span>Mesas</span>
          </Button>
          
          <Button
            variant="secondary"
            className="h-20 flex-col space-y-2"
            onClick={() => window.location.href = '/dashboard/comandas'}
          >
            <ClipboardList size={24} />
            <span>Comandas</span>
          </Button>
          
          <Button
            variant="success"
            className="h-20 flex-col space-y-2"
            onClick={() => window.location.href = '/dashboard/pdv'}
          >
            <CreditCard size={24} />
            <span>PDV</span>
          </Button>
          
          <Button
            variant="warning"
            className="h-20 flex-col space-y-2"
            onClick={() => window.location.href = '/dashboard/estoque'}
          >
            <Package size={24} />
            <span>Estoque</span>
          </Button>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;