import React, { useState, useEffect } from 'react';
import { 
  BarChart4, TrendingUp, Users, ShoppingCart, AlertTriangle,
  Sun, Moon, CreditCard, Clock, Coffee, ChevronRight,
  FileText, ShoppingBag, PieChart, Plus, ArrowRight
} from 'lucide-react';
import { useRestaurante } from '../contexts/RestauranteContext';
import { useAuth } from '../contexts/AuthContext';
import { useTheme } from '../contexts/ThemeContext';
import { formatarDinheiro } from '../utils/formatters';
import Button from '../components/ui/Button';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import toast from 'react-hot-toast';

const Dashboard: React.FC = () => {
  const { mesas, getDashboardData, getVendasData } = useRestaurante();
  const { displayName } = useAuth();
  const { theme } = useTheme();
  const [periodoSelecionado, setPeriodoSelecionado] = useState('7dias');
  const [dashboardData, setDashboardData] = useState<any>(null);
  const [vendasData, setVendasData] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  
  useEffect(() => {
    loadDashboardData();
  }, []);

  const loadDashboardData = async () => {
    setLoading(true);
    try {
      const data = await getDashboardData();
      if (data) {
        setDashboardData(data);
      }

      const vendas = await getVendasData();
      if (vendas) {
        setVendasData(vendas);
      }
    } catch (error) {
      console.error('Error loading dashboard data:', error);
      toast.error('Erro ao carregar dados do dashboard');
    } finally {
      setLoading(false);
    }
  };
  
  const mesasOcupadas = mesas.filter(mesa => mesa.status === 'ocupada');
  const mesasAguardandoPagamento = mesas.filter(mesa => mesa.status === 'aguardando');
  
  // Métricas calculadas
  const vendasHoje = dashboardData?.vendasHoje || 0;
  const vendasMes = dashboardData?.vendasMes || 0;
  const tempoMedioAtendimento = 28; // minutos
  const clientesAtivos = dashboardData?.mesasOcupadas || 0;
  const comandasAbertas = dashboardData?.comandasAbertas || 0;
  const comandasFechadas = 125;

  // Dados para gráficos
  const vendasPorHora = [
    { hora: '08:00', vendas: 450 },
    { hora: '10:00', vendas: 890 },
    { hora: '12:00', vendas: 1250 },
    { hora: '14:00', vendas: 980 },
    { hora: '16:00', vendas: 760 },
    { hora: '18:00', vendas: 1100 },
    { hora: '20:00', vendas: 1450 }
  ];

  const produtosMaisVendidos = dashboardData?.produtosMaisVendidos || [];
  const alertasEstoque = dashboardData?.alertasEstoque || [];

  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Bom dia';
    if (hour < 18) return 'Boa tarde';
    return 'Boa noite';
  };

  return (
    <div className="space-y-6">
      {/* Header com saudação */}
      <div className="bg-gradient-to-r from-blue-500 to-blue-600 dark:from-blue-600 dark:to-blue-700 rounded-lg shadow-lg p-6 text-white">
        <div className="flex items-center justify-between">
          <div>
            <div className="flex items-center space-x-2">
              {theme === 'dark' ? (
                <Moon className="text-blue-100" size={24} />
              ) : (
                <Sun className="text-yellow-200" size={24} />
              )}
              <h1 className="text-2xl font-bold">
                {getGreeting()}, {displayName || 'Usuário'}!
              </h1>
            </div>
            <p className="mt-1 text-blue-100">
              Aqui está o resumo do seu restaurante
            </p>
          </div>
          <div className="hidden md:flex items-center space-x-4">
            <div className="text-right">
              <p className="text-sm text-blue-100">{new Date().toLocaleDateString()}</p>
              <p className="text-lg font-semibold">{new Date().toLocaleTimeString()}</p>
            </div>
          </div>
        </div>
      </div>

      {loading ? (
        <div className="flex justify-center items-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
        </div>
      ) : (
        <>
          {/* Cards de métricas principais */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-500 dark:text-gray-400">Vendas Hoje</p>
                  <p className="text-2xl font-bold text-gray-900 dark:text-white mt-1">
                    {formatarDinheiro(vendasHoje)}
                  </p>
                  <p className="text-sm text-green-500 mt-1">+12% vs ontem</p>
                </div>
                <div className="p-3 bg-blue-100 dark:bg-blue-900/50 rounded-full">
                  <TrendingUp size={24} className="text-blue-600 dark:text-blue-400" />
                </div>
              </div>
            </div>

            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-500 dark:text-gray-400">Vendas do Mês</p>
                  <p className="text-2xl font-bold text-gray-900 dark:text-white mt-1">
                    {formatarDinheiro(vendasMes)}
                  </p>
                  <p className="text-sm text-green-500 mt-1">+8% vs mês anterior</p>
                </div>
                <div className="p-3 bg-green-100 dark:bg-green-900/50 rounded-full">
                  <BarChart4 size={24} className="text-green-600 dark:text-green-400" />
                </div>
              </div>
            </div>

            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-500 dark:text-gray-400">Tempo Médio</p>
                  <p className="text-2xl font-bold text-gray-900 dark:text-white mt-1">
                    {tempoMedioAtendimento} min
                  </p>
                  <p className="text-sm text-green-500 mt-1">-5% vs média</p>
                </div>
                <div className="p-3 bg-purple-100 dark:bg-purple-900/50 rounded-full">
                  <Clock size={24} className="text-purple-600 dark:text-purple-400" />
                </div>
              </div>
            </div>

            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-500 dark:text-gray-400">Clientes Ativos</p>
                  <p className="text-2xl font-bold text-gray-900 dark:text-white mt-1">
                    {clientesAtivos}
                  </p>
                  <p className="text-sm text-green-500 mt-1">+15% vs média</p>
                </div>
                <div className="p-3 bg-orange-100 dark:bg-orange-900/50 rounded-full">
                  <Users size={24} className="text-orange-600 dark:text-orange-400" />
                </div>
              </div>
            </div>
          </div>

          {/* Gráficos e Análises */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Gráfico de Vendas por Hora */}
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-6">
              <h2 className="text-lg font-medium text-gray-900 dark:text-white mb-6">
                Vendas por Hora
              </h2>
              <div className="h-80">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={vendasPorHora}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="hora" />
                    <YAxis />
                    <Tooltip />
                    <Legend />
                    <Bar dataKey="vendas" name="Vendas (R$)" fill="#3B82F6" />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Produtos Mais Vendidos */}
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-6">
              <h2 className="text-lg font-medium text-gray-900 dark:text-white mb-6">
                Produtos Mais Vendidos
              </h2>
              <div className="space-y-4">
                {produtosMaisVendidos.map((produto: any, index: number) => (
                  <div key={index} className="flex items-center">
                    <div className="flex-1">
                      <div className="flex items-center">
                        <span className="text-sm font-medium text-gray-900 dark:text-white">
                          {produto.nome}
                        </span>
                        <span className="ml-2 text-sm text-gray-500 dark:text-gray-400">
                          ({produto.quantidade} un)
                        </span>
                      </div>
                      <div className="mt-1 h-2 bg-gray-200 dark:bg-gray-700 rounded-full">
                        <div
                          className="h-full bg-blue-500 rounded-full transition-all"
                          style={{ width: `${(produto.quantidade / (produtosMaisVendidos[0]?.quantidade || 1)) * 100}%` }}
                        />
                      </div>
                    </div>
                    <div className="ml-4 text-right">
                      <span className="text-sm font-medium text-gray-900 dark:text-white">
                        {formatarDinheiro(produto.valor)}
                      </span>
                    </div>
                  </div>
                ))}

                {produtosMaisVendidos.length === 0 && (
                  <div className="text-center py-8 text-gray-500">
                    Nenhum produto vendido no período
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Status das Comandas */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-6">
              <h2 className="text-lg font-medium text-gray-900 dark:text-white mb-6">
                Status das Comandas
              </h2>
              <div className="grid grid-cols-2 gap-4">
                <div className="bg-blue-50 dark:bg-blue-900/20 p-4 rounded-lg">
                  <p className="text-sm text-gray-500 dark:text-gray-400">Abertas</p>
                  <p className="text-2xl font-bold text-blue-600 dark:text-blue-400">
                    {comandasAbertas}
                  </p>
                </div>
                <div className="bg-green-50 dark:bg-green-900/20 p-4 rounded-lg">
                  <p className="text-sm text-gray-500 dark:text-gray-400">Fechadas</p>
                  <p className="text-2xl font-bold text-green-600 dark:text-green-400">
                    {comandasFechadas}
                  </p>
                </div>
              </div>
            </div>

            {/* Alertas */}
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-6">
              <h2 className="text-lg font-medium text-gray-900 dark:text-white mb-6">
                Alertas do Sistema
              </h2>
              <div className="space-y-4">
                {alertasEstoque.map((alerta: any) => (
                  <div
                    key={alerta.id}
                    className="p-4 bg-red-50 dark:bg-red-900/20 rounded-lg"
                  >
                    <div className="flex items-center space-x-3">
                      <AlertTriangle className="text-red-500 dark:text-red-400" size={20} />
                      <div>
                        <h3 className="text-sm font-medium text-red-800 dark:text-red-200">
                          Estoque Baixo: {alerta.produto}
                        </h3>
                        <p className="text-xs text-red-600 dark:text-red-300">
                          Quantidade atual: {alerta.quantidadeAtual} {alerta.unidade}
                        </p>
                      </div>
                    </div>
                  </div>
                ))}

                {alertasEstoque.length === 0 && (
                  <div className="text-center py-8 text-gray-500">
                    Nenhum alerta de estoque
                  </div>
                )}
              </div>
            </div>
          </div>
        </>
      )}

      {/* Botão de atualizar */}
      <div className="flex justify-center">
        <Button
          variant="primary"
          onClick={loadDashboardData}
          isLoading={loading}
        >
          Atualizar Dados
        </Button>
      </div>
    </div>
  );
};

export default Dashboard;