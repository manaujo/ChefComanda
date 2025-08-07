import React, { useState, useEffect } from 'react';
import { 
  BarChart, PieChart, TrendingUp, Download, Calendar,
  FileSpreadsheet, Filter, ChevronDown, Users, ShoppingBag,
  DollarSign, Clock, Package, AlertTriangle, RefreshCw,
  ArrowUp, ArrowDown, Activity, Eye
} from 'lucide-react';
import Button from '../components/ui/Button';
import { formatarDinheiro } from '../utils/formatters';
import { useRestaurante } from '../contexts/RestauranteContext';
import toast from 'react-hot-toast';
import { 
  BarChart as RechartsBarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  Legend, 
  ResponsiveContainer,
  LineChart,
  Line,
  PieChart as RechartsPieChart,
  Pie,
  Cell,
  Area,
  AreaChart
} from 'recharts';

interface VendaDiaria {
  data: string;
  total: number;
  quantidade: number;
  ticket_medio: number;
}

interface VendaProduto {
  nome: string;
  quantidade: number;
  total: number;
  percentual: number;
  categoria: string;
}

interface VendaGarcom {
  nome: string;
  vendas: number;
  total: number;
  mesas: number;
  percentual: number;
}

interface MetricaComparativa {
  periodo: string;
  atual: number;
  anterior: number;
  crescimento: number;
}

const Relatorios: React.FC = () => {
  const { 
    getVendasData, 
    getDashboardData, 
    funcionarios, 
    produtos, 
    itensComanda, 
    mesas,
    refreshData 
  } = useRestaurante();
  
  const [periodoSelecionado, setPeriodoSelecionado] = useState('7dias');
  const [categoriaAtiva, setCategoriaAtiva] = useState('vendas');
  const [vendasDiarias, setVendasDiarias] = useState<VendaDiaria[]>([]);
  const [vendasProdutos, setVendasProdutos] = useState<VendaProduto[]>([]);
  const [vendasGarcons, setVendasGarcons] = useState<VendaGarcom[]>([]);
  const [metricas, setMetricas] = useState<MetricaComparativa[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  
  useEffect(() => {
    loadReportData();
  }, [periodoSelecionado]);

  const loadReportData = async () => {
    setLoading(true);
    try {
      await refreshData();
      
      // Carregar dados de vendas diárias
      const vendasData = await getVendasData();
      if (vendasData) {
        const vendasFormatadas = vendasData.map(venda => ({
          data: new Date(venda.data).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' }),
          total: venda.total || 0,
          quantidade: venda.quantidade || 0,
          ticket_medio: venda.quantidade > 0 ? venda.total / venda.quantidade : 0
        }));
        setVendasDiarias(vendasFormatadas);
      }

      // Carregar dados de produtos mais vendidos baseado nos itens de comanda reais
      const produtosVendidos = itensComanda.reduce((acc, item) => {
        const existing = acc.find(p => p.nome === item.nome);
        if (existing) {
          existing.quantidade += item.quantidade;
          existing.total += item.preco_unitario * item.quantidade;
        } else {
          acc.push({
            nome: item.nome,
            quantidade: item.quantidade,
            total: item.preco_unitario * item.quantidade,
            categoria: item.categoria,
            percentual: 0
          });
        }
        return acc;
      }, [] as VendaProduto[]);

      // Calcular percentuais
      const totalVendas = produtosVendidos.reduce((acc, produto) => acc + produto.total, 0);
      const produtosComPercentual = produtosVendidos.map(produto => ({
        ...produto,
        percentual: totalVendas > 0 ? (produto.total / totalVendas) * 100 : 0
      })).sort((a, b) => b.quantidade - a.quantidade);

      setVendasProdutos(produtosComPercentual);

      // Carregar dados de vendas por garçom
      await loadVendasPorGarcom();
      
      // Carregar métricas comparativas
      loadMetricasComparativas();
    } catch (error) {
      console.error('Error loading report data:', error);
      toast.error('Erro ao carregar dados dos relatórios');
    } finally {
      setLoading(false);
    }
  };

  const loadVendasPorGarcom = async () => {
    try {
      const garcons = funcionarios.filter(func => func.role === 'waiter');
      
      if (garcons.length === 0) {
        setVendasGarcons([]);
        return;
      }

      // Calcular vendas por garçom baseado nas mesas ocupadas
      const vendasPorGarcom: VendaGarcom[] = garcons.map(garcom => {
        const mesasDoGarcom = mesas.filter(mesa => mesa.garcom === garcom.name);
        const vendasGarcom = mesasDoGarcom.reduce((acc, mesa) => {
          const itensMesa = itensComanda.filter(item => item.mesa_id === mesa.id);
          return acc + itensMesa.reduce((total, item) => total + (item.preco_unitario * item.quantidade), 0);
        }, 0);
        
        return {
          nome: garcom.name,
          vendas: mesasDoGarcom.filter(mesa => mesa.status !== 'livre').length,
          total: vendasGarcom,
          mesas: mesasDoGarcom.length,
          percentual: 0
        };
      });
      
      // Calcular percentuais
      const totalVendas = vendasPorGarcom.reduce((acc, g) => acc + g.total, 0);
      const vendasComPercentual = vendasPorGarcom.map(garcom => ({
        ...garcom,
        percentual: totalVendas > 0 ? Math.round((garcom.total / totalVendas) * 100) : 0
      })).sort((a, b) => b.total - a.total);
      
      setVendasGarcons(vendasComPercentual);
    } catch (error) {
      console.error('Error loading garçom data:', error);
      setVendasGarcons([]);
    }
  };

  const loadMetricasComparativas = () => {
    // Simular métricas comparativas (em um sistema real, viria do banco)
    const metricas: MetricaComparativa[] = [
      {
        periodo: 'Vendas',
        atual: vendasDiarias.reduce((acc, v) => acc + v.total, 0),
        anterior: vendasDiarias.reduce((acc, v) => acc + v.total, 0) * 0.88,
        crescimento: 12
      },
      {
        periodo: 'Pedidos',
        atual: vendasDiarias.reduce((acc, v) => acc + v.quantidade, 0),
        anterior: vendasDiarias.reduce((acc, v) => acc + v.quantidade, 0) * 0.92,
        crescimento: 8
      },
      {
        periodo: 'Ticket Médio',
        atual: vendasDiarias.reduce((acc, v) => acc + v.ticket_medio, 0) / Math.max(vendasDiarias.length, 1),
        anterior: (vendasDiarias.reduce((acc, v) => acc + v.ticket_medio, 0) / Math.max(vendasDiarias.length, 1)) * 0.95,
        crescimento: 5
      }
    ];
    
    setMetricas(metricas);
  };

  const handleRefresh = async () => {
    try {
      setRefreshing(true);
      await loadReportData();
      toast.success('Relatórios atualizados!');
    } catch (error) {
      toast.error('Erro ao atualizar relatórios');
    } finally {
      setRefreshing(false);
    }
  };
  
  const totalVendas = vendasDiarias.reduce((acc, dia) => acc + dia.total, 0);
  const totalPedidos = vendasDiarias.reduce((acc, dia) => acc + dia.quantidade, 0);
  const ticketMedio = totalPedidos > 0 ? totalVendas / totalPedidos : 0;

  const exportarRelatorio = (formato: 'excel' | 'pdf') => {
    toast.success(`Relatório exportado em ${formato.toUpperCase()}!`);
  };

  // Cores para os gráficos
  const COLORS = ['#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6', '#F97316'];

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Relatórios</h1>
          <p className="text-gray-500 dark:text-gray-400 mt-1">
            Análise detalhada de vendas e desempenho
          </p>
        </div>
        <div className="mt-4 md:mt-0 flex items-center space-x-3">
          <div className="relative">
            <select
              value={periodoSelecionado}
              onChange={(e) => setPeriodoSelecionado(e.target.value)}
              className="appearance-none bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg py-2 pl-3 pr-10 focus:ring-red-500 focus:border-red-500 dark:text-white"
            >
              <option value="hoje">Hoje</option>
              <option value="7dias">Últimos 7 dias</option>
              <option value="30dias">Últimos 30 dias</option>
              <option value="mes">Este mês</option>
            </select>
            <ChevronDown className="absolute right-3 top-3 text-gray-400 dark:text-gray-500" size={16} />
          </div>
          
          <Button
            variant="ghost"
            icon={<RefreshCw size={18} />}
            onClick={handleRefresh}
            isLoading={refreshing}
          >
            Atualizar
          </Button>
          
          <Button
            variant="ghost"
            icon={<FileSpreadsheet size={18} />}
            onClick={() => exportarRelatorio('excel')}
          >
            Excel
          </Button>
          <Button
            variant="ghost"
            icon={<Download size={18} />}
            onClick={() => exportarRelatorio('pdf')}
          >
            PDF
          </Button>
        </div>
      </div>

      {loading ? (
        <div className="flex justify-center items-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-red-500"></div>
        </div>
      ) : (
        <>
          {/* Cards de Métricas Comparativas */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {metricas.map((metrica, index) => (
              <div key={index} className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-500 dark:text-gray-400">{metrica.periodo} no Período</p>
                    <p className="text-2xl font-bold mt-1 text-gray-900 dark:text-white">
                      {metrica.periodo === 'Vendas' || metrica.periodo === 'Ticket Médio' 
                        ? formatarDinheiro(metrica.atual)
                        : Math.round(metrica.atual)
                      }
                    </p>
                    <div className="flex items-center mt-2">
                      {metrica.crescimento >= 0 ? (
                        <ArrowUp size={16} className="text-green-500" />
                      ) : (
                        <ArrowDown size={16} className="text-red-500" />
                      )}
                      <span className={`text-sm ml-1 ${
                        metrica.crescimento >= 0 ? 'text-green-500' : 'text-red-500'
                      }`}>
                        {Math.abs(metrica.crescimento)}% vs período anterior
                      </span>
                    </div>
                  </div>
                  <div className="p-3 bg-gradient-to-br from-red-100 to-red-200 dark:from-red-900 dark:to-red-800 rounded-full">
                    {index === 0 && <TrendingUp size={24} className="text-red-600 dark:text-red-400" />}
                    {index === 1 && <ShoppingBag size={24} className="text-red-600 dark:text-red-400" />}
                    {index === 2 && <DollarSign size={24} className="text-red-600 dark:text-red-400" />}
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Navegação por Categoria */}
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6">
            <div className="flex flex-wrap gap-4">
              <Button
                variant={categoriaAtiva === 'vendas' ? 'primary' : 'ghost'}
                onClick={() => setCategoriaAtiva('vendas')}
                icon={<BarChart size={18} />}
                className="flex-1 md:flex-none"
              >
                Vendas
              </Button>
              <Button
                variant={categoriaAtiva === 'produtos' ? 'primary' : 'ghost'}
                onClick={() => setCategoriaAtiva('produtos')}
                icon={<ShoppingBag size={18} />}
                className="flex-1 md:flex-none"
              >
                Produtos
              </Button>
              <Button
                variant={categoriaAtiva === 'garcons' ? 'primary' : 'ghost'}
                onClick={() => setCategoriaAtiva('garcons')}
                icon={<Users size={18} />}
                className="flex-1 md:flex-none"
              >
                Garçons
              </Button>
              <Button
                variant={categoriaAtiva === 'operacional' ? 'primary' : 'ghost'}
                onClick={() => setCategoriaAtiva('operacional')}
                icon={<Activity size={18} />}
                className="flex-1 md:flex-none"
              >
                Operacional
              </Button>
            </div>
          </div>

          {/* Conteúdo da Categoria */}
          {categoriaAtiva === 'vendas' && (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Gráfico de Vendas Diárias */}
              <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6">
                <div className="flex items-center justify-between mb-6">
                  <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
                    Evolução de Vendas
                  </h2>
                  <div className="flex items-center text-sm text-gray-500 dark:text-gray-400">
                    <Activity size={16} className="mr-1" />
                    <span>Últimos 7 dias</span>
                  </div>
                </div>
                <div className="h-80">
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={vendasDiarias}>
                      <defs>
                        <linearGradient id="colorVendas" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#3B82F6" stopOpacity={0.8}/>
                          <stop offset="95%" stopColor="#3B82F6" stopOpacity={0.1}/>
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" />
                      <XAxis dataKey="data" stroke="#6B7280" fontSize={12} />
                      <YAxis stroke="#6B7280" fontSize={12} />
                      <Tooltip 
                        formatter={(value: any) => [formatarDinheiro(value), 'Vendas']}
                        labelStyle={{ color: '#374151' }}
                        contentStyle={{ 
                          backgroundColor: '#F9FAFB', 
                          border: '1px solid #E5E7EB',
                          borderRadius: '8px'
                        }}
                      />
                      <Area 
                        type="monotone" 
                        dataKey="total" 
                        stroke="#3B82F6" 
                        fillOpacity={1} 
                        fill="url(#colorVendas)"
                        strokeWidth={3}
                      />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              </div>

              {/* Gráfico de Pedidos */}
              <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6">
                <div className="flex items-center justify-between mb-6">
                  <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
                    Volume de Pedidos
                  </h2>
                  <div className="flex items-center text-sm text-gray-500 dark:text-gray-400">
                    <ShoppingBag size={16} className="mr-1" />
                    <span>Por dia</span>
                  </div>
                </div>
                <div className="h-80">
                  <ResponsiveContainer width="100%" height="100%">
                    <RechartsBarChart data={vendasDiarias}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" />
                      <XAxis dataKey="data" stroke="#6B7280" fontSize={12} />
                      <YAxis stroke="#6B7280" fontSize={12} />
                      <Tooltip 
                        formatter={(value: any) => [value, 'Pedidos']}
                        labelStyle={{ color: '#374151' }}
                        contentStyle={{ 
                          backgroundColor: '#F9FAFB', 
                          border: '1px solid #E5E7EB',
                          borderRadius: '8px'
                        }}
                      />
                      <Bar dataKey="quantidade" fill="#10B981" radius={[4, 4, 0, 0]} />
                    </RechartsBarChart>
                  </ResponsiveContainer>
                </div>
              </div>
            </div>
          )}

          {categoriaAtiva === 'produtos' && (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Produtos Mais Vendidos */}
              <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6">
                <div className="flex items-center justify-between mb-6">
                  <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
                    Produtos Mais Vendidos
                  </h2>
                  <div className="flex items-center text-sm text-gray-500 dark:text-gray-400">
                    <TrendingUp size={16} className="mr-1" />
                    <span>Por quantidade</span>
                  </div>
                </div>
                <div className="space-y-4 max-h-80 overflow-y-auto">
                  {vendasProdutos.slice(0, 8).map((produto, index) => (
                    <div key={index} className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-700 rounded-lg">
                      <div className="flex items-center">
                        <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-blue-600 rounded-full flex items-center justify-center mr-4">
                          <span className="text-white font-bold text-sm">{index + 1}</span>
                        </div>
                        <div>
                          <h3 className="font-medium text-gray-900 dark:text-white">{produto.nome}</h3>
                          <div className="flex items-center space-x-2 mt-1">
                            <span className="text-xs bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200 px-2 py-1 rounded-full">
                              {produto.categoria}
                            </span>
                            <span className="text-sm text-gray-500 dark:text-gray-400">
                              {produto.quantidade} vendidos
                            </span>
                          </div>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="font-medium text-gray-900 dark:text-white">
                          {formatarDinheiro(produto.total)}
                        </p>
                        <p className="text-sm text-gray-500 dark:text-gray-400">
                          {produto.percentual.toFixed(1)}% das vendas
                        </p>
                      </div>
                    </div>
                  ))}
                  
                  {vendasProdutos.length === 0 && (
                    <div className="text-center py-8 text-gray-500 dark:text-gray-400">
                      <ShoppingBag size={32} className="mx-auto mb-2 opacity-50" />
                      <p>Nenhum produto vendido no período</p>
                    </div>
                  )}
                </div>
              </div>

              {/* Gráfico de Pizza - Vendas por Categoria */}
              <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6">
                <div className="flex items-center justify-between mb-6">
                  <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
                    Vendas por Categoria
                  </h2>
                  <div className="flex items-center text-sm text-gray-500 dark:text-gray-400">
                    <PieChart size={16} className="mr-1" />
                    <span>Distribuição</span>
                  </div>
                </div>
                <div className="h-80">
                  <ResponsiveContainer width="100%" height="100%">
                    <RechartsPieChart>
                      <Pie
                        data={vendasProdutos.slice(0, 6)}
                        cx="50%"
                        cy="50%"
                        outerRadius={100}
                        fill="#8884d8"
                        dataKey="total"
                        label={({ nome, percentual }) => `${nome}: ${percentual.toFixed(1)}%`}
                      >
                        {vendasProdutos.slice(0, 6).map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip 
                        formatter={(value: any) => [formatarDinheiro(value), 'Vendas']}
                        contentStyle={{ 
                          backgroundColor: '#F9FAFB', 
                          border: '1px solid #E5E7EB',
                          borderRadius: '8px'
                        }}
                      />
                    </RechartsPieChart>
                  </ResponsiveContainer>
                </div>
              </div>
            </div>
          )}

          {categoriaAtiva === 'garcons' && (
            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
                  Desempenho dos Garçons
                </h2>
                <div className="flex items-center text-sm text-gray-500 dark:text-gray-400">
                  <Users size={16} className="mr-1" />
                  <span>Ranking por vendas</span>
                </div>
              </div>
              <div className="space-y-4">
                {vendasGarcons.length > 0 ? (
                  vendasGarcons.map((garcom, index) => (
                    <div key={index} className="p-4 bg-gray-50 dark:bg-gray-700 rounded-lg">
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center">
                          <div className="w-10 h-10 bg-gradient-to-br from-purple-500 to-purple-600 rounded-full flex items-center justify-center mr-4">
                            <span className="text-white font-bold text-sm">{index + 1}</span>
                          </div>
                          <div>
                            <h3 className="font-medium text-gray-900 dark:text-white">{garcom.nome}</h3>
                            <p className="text-sm text-gray-500 dark:text-gray-400">
                              {garcom.vendas} vendas • {garcom.mesas} mesas atendidas
                            </p>
                          </div>
                        </div>
                        <div className="text-right">
                          <p className="font-medium text-gray-900 dark:text-white">
                            {formatarDinheiro(garcom.total)}
                          </p>
                          <p className="text-sm text-gray-500 dark:text-gray-400">
                            {garcom.percentual}% do faturamento
                          </p>
                        </div>
                      </div>
                      <div className="w-full bg-gray-200 dark:bg-gray-600 rounded-full h-2">
                        <div
                          className="bg-gradient-to-r from-purple-500 to-purple-600 h-2 rounded-full transition-all duration-500"
                          style={{ width: `${garcom.percentual}%` }}
                        ></div>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="text-center py-8 text-gray-500 dark:text-gray-400">
                    <Users size={32} className="mx-auto mb-2 opacity-50" />
                    <p>Nenhum garçom com vendas no período</p>
                  </div>
                )}
              </div>
            </div>
          )}

          {categoriaAtiva === 'operacional' && (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Tempo Médio de Atendimento */}
              <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6">
                <div className="flex items-center justify-between mb-6">
                  <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
                    Eficiência Operacional
                  </h2>
                  <div className="p-2 bg-blue-100 dark:bg-blue-900 rounded-lg">
                    <Clock size={20} className="text-blue-600 dark:text-blue-400" />
                  </div>
                </div>
                
                <div className="space-y-4">
                  <div className="p-4 bg-gradient-to-r from-blue-50 to-blue-100 dark:from-blue-900/20 dark:to-blue-800/20 rounded-lg">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm text-blue-700 dark:text-blue-300">Tempo Médio de Preparo</p>
                        <p className="text-2xl font-bold text-blue-800 dark:text-blue-200">18 min</p>
                      </div>
                      <Clock className="text-blue-600 dark:text-blue-400" size={24} />
                    </div>
                  </div>
                  
                  <div className="p-4 bg-gradient-to-r from-green-50 to-green-100 dark:from-green-900/20 dark:to-green-800/20 rounded-lg">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm text-green-700 dark:text-green-300">Taxa de Ocupação</p>
                        <p className="text-2xl font-bold text-green-800 dark:text-green-200">
                          {mesas.length > 0 ? Math.round((mesasOcupadas / mesas.length) * 100) : 0}%
                        </p>
                      </div>
                      <Coffee className="text-green-600 dark:text-green-400" size={24} />
                    </div>
                  </div>
                  
                  <div className="p-4 bg-gradient-to-r from-purple-50 to-purple-100 dark:from-purple-900/20 dark:to-purple-800/20 rounded-lg">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm text-purple-700 dark:text-purple-300">Itens na Fila</p>
                        <p className="text-2xl font-bold text-purple-800 dark:text-purple-200">
                          {itensComanda.filter(item => item.status === 'pendente').length}
                        </p>
                      </div>
                      <Package className="text-purple-600 dark:text-purple-400" size={24} />
                    </div>
                  </div>
                </div>
              </div>

              {/* Status dos Produtos */}
              <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6">
                <div className="flex items-center justify-between mb-6">
                  <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
                    Status dos Produtos
                  </h2>
                  <div className="p-2 bg-green-100 dark:bg-green-900 rounded-lg">
                    <Package size={20} className="text-green-600 dark:text-green-400" />
                  </div>
                </div>
                
                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="text-center p-4 bg-green-50 dark:bg-green-900/20 rounded-lg">
                      <p className="text-2xl font-bold text-green-600 dark:text-green-400">
                        {produtos.filter(p => p.disponivel).length}
                      </p>
                      <p className="text-sm text-green-700 dark:text-green-300">Disponíveis</p>
                    </div>
                    <div className="text-center p-4 bg-red-50 dark:bg-red-900/20 rounded-lg">
                      <p className="text-2xl font-bold text-red-600 dark:text-red-400">
                        {produtos.filter(p => !p.disponivel).length}
                      </p>
                      <p className="text-sm text-red-700 dark:text-red-300">Indisponíveis</p>
                    </div>
                  </div>
                  
                  {produtosEstoqueBaixo.length > 0 && (
                    <div className="border-t border-gray-200 dark:border-gray-700 pt-4">
                      <h4 className="font-medium text-gray-900 dark:text-white mb-3">
                        Produtos com Estoque Baixo
                      </h4>
                      <div className="space-y-2">
                        {produtosEstoqueBaixo.slice(0, 3).map(produto => (
                          <div key={produto.id} className="flex items-center justify-between p-2 bg-red-50 dark:bg-red-900/20 rounded">
                            <span className="text-sm text-gray-900 dark:text-white">{produto.nome}</span>
                            <span className="text-sm text-red-600 dark:text-red-400 font-medium">
                              {produto.estoque}/{produto.estoque_minimo}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Resumo Geral */}
          <div className="bg-gradient-to-r from-gray-50 to-gray-100 dark:from-gray-800 dark:to-gray-700 rounded-xl shadow-lg p-6">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-6">
              Resumo do Período
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
              <div className="text-center">
                <div className="p-3 bg-blue-100 dark:bg-blue-900 rounded-full w-fit mx-auto mb-3">
                  <DollarSign size={24} className="text-blue-600 dark:text-blue-400" />
                </div>
                <p className="text-2xl font-bold text-gray-900 dark:text-white">
                  {formatarDinheiro(totalVendas)}
                </p>
                <p className="text-sm text-gray-500 dark:text-gray-400">Faturamento Total</p>
              </div>
              
              <div className="text-center">
                <div className="p-3 bg-green-100 dark:bg-green-900 rounded-full w-fit mx-auto mb-3">
                  <ShoppingBag size={24} className="text-green-600 dark:text-green-400" />
                </div>
                <p className="text-2xl font-bold text-gray-900 dark:text-white">{totalPedidos}</p>
                <p className="text-sm text-gray-500 dark:text-gray-400">Total de Pedidos</p>
              </div>
              
              <div className="text-center">
                <div className="p-3 bg-purple-100 dark:bg-purple-900 rounded-full w-fit mx-auto mb-3">
                  <BarChart size={24} className="text-purple-600 dark:text-purple-400" />
                </div>
                <p className="text-2xl font-bold text-gray-900 dark:text-white">
                  {formatarDinheiro(ticketMedio)}
                </p>
                <p className="text-sm text-gray-500 dark:text-gray-400">Ticket Médio</p>
              </div>
              
              <div className="text-center">
                <div className="p-3 bg-orange-100 dark:bg-orange-900 rounded-full w-fit mx-auto mb-3">
                  <Coffee size={24} className="text-orange-600 dark:text-orange-400" />
                </div>
                <p className="text-2xl font-bold text-gray-900 dark:text-white">{mesas.length}</p>
                <p className="text-sm text-gray-500 dark:text-gray-400">Total de Mesas</p>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
};

export default Relatorios;