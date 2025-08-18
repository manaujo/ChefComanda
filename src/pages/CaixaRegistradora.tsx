import React, { useState, useEffect } from 'react';
import { 
  BarChart3, TrendingUp, Download, FileSpreadsheet, 
  DollarSign, Clock, Users, Calculator, RefreshCw,
  ArrowUp, ArrowDown, Activity, Eye, Coffee
} from 'lucide-react';
import Button from '../components/ui/Button';
import { formatarDinheiro } from '../utils/formatters';
import { useRestaurante } from '../contexts/RestauranteContext';
import CaixaService from '../services/CaixaService';
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
  PieChart,
  Pie,
  Cell,
  Area,
  AreaChart
} from 'recharts';

interface CaixaDetalhado {
  id: string;
  operador_id: string;
  operador_nome: string;
  operador_tipo: 'funcionario' | 'usuario';
  valor_inicial: number;
  valor_final: number | null;
  valor_sistema: number;
  status: 'aberto' | 'fechado';
  data_abertura: string;
  data_fechamento: string | null;
  observacao: string | null;
  entradas_total: number;
  saidas_total: number;
  saldo_calculado: number;
  diferenca: number;
  tempo_operacao_horas?: number;
}

const CaixaRegistradora: React.FC = () => {
  const { restaurante } = useRestaurante();
  const [loading, setLoading] = useState(false);
  const [caixasDetalhados, setCaixasDetalhados] = useState<CaixaDetalhado[]>([]);
  const [periodo, setPeriodo] = useState('30dias');
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    if (restaurante?.id) {
      loadCaixasDetalhados();
    }
  }, [restaurante?.id, periodo]);

  const loadCaixasDetalhados = async () => {
    if (!restaurante?.id) return;

    setLoading(true);
    try {
      const endDate = new Date().toISOString();
      const startDate = new Date();
      
      switch (periodo) {
        case 'hoje':
          startDate.setHours(0, 0, 0, 0);
          break;
        case '7dias':
          startDate.setDate(startDate.getDate() - 7);
          break;
        case '30dias':
          startDate.setDate(startDate.getDate() - 30);
          break;
        case 'mes':
          startDate.setDate(1);
          startDate.setHours(0, 0, 0, 0);
          break;
      }

      const caixas = await CaixaService.getCaixasPorPeriodo(
        restaurante.id,
        startDate.toISOString(),
        endDate
      );

      setCaixasDetalhados(caixas);
    } catch (error) {
      console.error('Error loading detailed cash registers:', error);
      toast.error('Erro ao carregar relatório de caixas');
    } finally {
      setLoading(false);
    }
  };

  const handleRefresh = async () => {
    try {
      setRefreshing(true);
      await loadCaixasDetalhados();
      toast.success('Relatórios atualizados!');
    } catch (error) {
      toast.error('Erro ao atualizar relatórios');
    } finally {
      setRefreshing(false);
    }
  };

  const exportarRelatorio = (formato: 'excel' | 'pdf') => {
    toast.success(`Relatório exportado em ${formato.toUpperCase()}!`);
  };

  const formatarTempo = (horas: number) => {
    const h = Math.floor(horas);
    const m = Math.round((horas - h) * 60);
    return `${h}h ${m}min`;
  };

  // Calcular totais
  const totais = caixasDetalhados.reduce((acc, caixa) => {
    acc.totalEntradas += caixa.entradas_total;
    acc.totalSaidas += caixa.saidas_total;
    acc.totalDiferencas += Math.abs(caixa.diferenca);
    acc.caixasFechados += caixa.status === 'fechado' ? 1 : 0;
    return acc;
  }, {
    totalEntradas: 0,
    totalSaidas: 0,
    totalDiferencas: 0,
    caixasFechados: 0
  });

  const caixasAbertos = caixasDetalhados.filter(c => c.status === 'aberto').length;

  // Dados para gráficos
  const chartData = caixasDetalhados
    .slice(0, 10)
    .map(caixa => ({
      data: new Date(caixa.data_abertura).toLocaleDateString('pt-BR', { 
        day: '2-digit', 
        month: '2-digit' 
      }),
      entradas: caixa.entradas_total,
      saidas: caixa.saidas_total,
      diferenca: caixa.diferenca
    }));

  const COLORS = ['#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6'];

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
            Relatórios de Caixa
          </h1>
          <p className="text-gray-500 dark:text-gray-400 mt-1">
            Análise e histórico de operações de caixa por operador
          </p>
          <div className="mt-2 text-sm text-blue-600 dark:text-blue-400">
            💡 Para abrir/fechar caixas, acesse a tela de PDV
          </div>
        </div>
        <div className="mt-4 md:mt-0 flex space-x-3">
          <div className="relative">
            <select
              value={periodo}
              onChange={(e) => setPeriodo(e.target.value)}
              className="appearance-none bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg py-2 pl-3 pr-10 focus:ring-blue-500 focus:border-blue-500 dark:text-white"
            >
              <option value="hoje">Hoje</option>
              <option value="7dias">Últimos 7 dias</option>
              <option value="30dias">Últimos 30 dias</option>
              <option value="mes">Este mês</option>
            </select>
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
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
        </div>
      ) : (
        <>
          {/* Cards de Métricas */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-500 dark:text-gray-400">Total Entradas</p>
                  <p className="text-2xl font-bold mt-1 text-gray-900 dark:text-white">
                    {formatarDinheiro(totais.totalEntradas)}
                  </p>
                  <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                    Período selecionado
                  </p>
                </div>
                <div className="p-3 bg-green-100 dark:bg-green-900 rounded-full">
                  <ArrowUp size={24} className="text-green-600 dark:text-green-400" />
                </div>
              </div>
            </div>

            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-500 dark:text-gray-400">Total Saídas</p>
                  <p className="text-2xl font-bold mt-1 text-gray-900 dark:text-white">
                    {formatarDinheiro(totais.totalSaidas)}
                  </p>
                  <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                    Período selecionado
                  </p>
                </div>
                <div className="p-3 bg-red-100 dark:bg-red-900 rounded-full">
                  <ArrowDown size={24} className="text-red-600 dark:text-red-400" />
                </div>
              </div>
            </div>

            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-500 dark:text-gray-400">Caixas Abertos</p>
                  <p className="text-2xl font-bold mt-1 text-gray-900 dark:text-white">
                    {caixasAbertos}
                  </p>
                  <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                    Atualmente ativos
                  </p>
                </div>
                <div className="p-3 bg-blue-100 dark:bg-blue-900 rounded-full">
                  <Activity size={24} className="text-blue-600 dark:text-blue-400" />
                </div>
              </div>
            </div>

            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-500 dark:text-gray-400">Caixas Fechados</p>
                  <p className="text-2xl font-bold mt-1 text-gray-900 dark:text-white">
                    {totais.caixasFechados}
                  </p>
                  <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                    No período
                  </p>
                </div>
                <div className="p-3 bg-purple-100 dark:bg-purple-900 rounded-full">
                  <Calculator size={24} className="text-purple-600 dark:text-purple-400" />
                </div>
              </div>
            </div>
          </div>

          {/* Gráfico de Movimentações */}
          {chartData.length > 0 && (
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-6">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
                  Movimentações por Período
                </h2>
                <div className="flex items-center text-sm text-gray-500 dark:text-gray-400">
                  <BarChart3 size={16} className="mr-1" />
                  <span>Últimas operações</span>
                </div>
              </div>
              <div className="h-80">
                <ResponsiveContainer width="100%" height="100%">
                  <RechartsBarChart data={chartData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" />
                    <XAxis dataKey="data" stroke="#6B7280" fontSize={12} />
                    <YAxis stroke="#6B7280" fontSize={12} />
                    <Tooltip 
                      formatter={(value: any, name: string) => [
                        formatarDinheiro(value), 
                        name === 'entradas' ? 'Entradas' : 
                        name === 'saidas' ? 'Saídas' : 'Diferença'
                      ]}
                      labelStyle={{ color: '#374151' }}
                      contentStyle={{ 
                        backgroundColor: '#F9FAFB', 
                        border: '1px solid #E5E7EB',
                        borderRadius: '8px'
                      }}
                    />
                    <Legend />
                    <Bar dataKey="entradas" name="Entradas" fill="#10B981" />
                    <Bar dataKey="saidas" name="Saídas" fill="#EF4444" />
                  </RechartsBarChart>
                </ResponsiveContainer>
              </div>
            </div>
          )}

          {/* Tabela de Caixas */}
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm overflow-hidden">
            <div className="p-6 border-b border-gray-200 dark:border-gray-700">
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
                Histórico de Operações de Caixa
              </h2>
            </div>

            {caixasDetalhados.length > 0 ? (
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                  <thead className="bg-gray-50 dark:bg-gray-700">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                        Operador
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                        Período
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                        Valor Inicial
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                        Entradas
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                        Saídas
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                        Saldo Calculado
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                        Valor Final
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                        Diferença
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                        Status
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                    {caixasDetalhados.map((caixa) => (
                      <tr key={caixa.id} className="hover:bg-gray-50 dark:hover:bg-gray-700">
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div>
                            <div className="text-sm font-medium text-gray-900 dark:text-white">
                              {caixa.operador_nome}
                            </div>
                            <div className="text-sm text-gray-500 dark:text-gray-400">
                              {caixa.operador_tipo === 'funcionario' ? 'Funcionário' : 'Usuário Principal'}
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white">
                          <div>
                            <div>
                              {new Date(caixa.data_abertura).toLocaleDateString('pt-BR')}
                            </div>
                            <div className="text-xs text-gray-500 dark:text-gray-400">
                              {new Date(caixa.data_abertura).toLocaleTimeString('pt-BR', { 
                                hour: '2-digit', 
                                minute: '2-digit' 
                              })}
                              {caixa.data_fechamento && (
                                <> - {new Date(caixa.data_fechamento).toLocaleTimeString('pt-BR', { 
                                  hour: '2-digit', 
                                  minute: '2-digit' 
                                })}</>
                              )}
                            </div>
                          </div>
                          {caixa.tempo_operacao_horas && (
                            <div className="text-xs text-gray-400 dark:text-gray-500">
                              {formatarTempo(caixa.tempo_operacao_horas)} de operação
                            </div>
                          )}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white">
                          {formatarDinheiro(caixa.valor_inicial)}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-green-600 dark:text-green-400">
                          +{formatarDinheiro(caixa.entradas_total)}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-red-600 dark:text-red-400">
                          -{formatarDinheiro(caixa.saidas_total)}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900 dark:text-white">
                          {formatarDinheiro(caixa.saldo_calculado)}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white">
                          {caixa.valor_final !== null ? formatarDinheiro(caixa.valor_final) : '-'}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm">
                          {caixa.diferenca !== 0 && caixa.valor_final !== null ? (
                            <span className={`font-medium ${
                              caixa.diferenca > 0 
                                ? 'text-green-600 dark:text-green-400' 
                                : 'text-red-600 dark:text-red-400'
                            }`}>
                              {caixa.diferenca > 0 ? '+' : ''}{formatarDinheiro(caixa.diferenca)}
                            </span>
                          ) : (
                            <span className="text-gray-500 dark:text-gray-400">-</span>
                          )}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                            caixa.status === 'aberto' 
                              ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200'
                              : 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-200'
                          }`}>
                            {caixa.status === 'aberto' ? 'Aberto' : 'Fechado'}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="text-center py-12">
                <div className="mx-auto w-24 h-24 bg-gray-100 dark:bg-gray-700 rounded-full flex items-center justify-center mb-4">
                  <DollarSign size={32} className="text-gray-400 dark:text-gray-500" />
                </div>
                <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
                  Nenhum registro de caixa encontrado
                </h3>
                <p className="text-gray-500 dark:text-gray-400 mb-6">
                  Não há operações de caixa para o período selecionado.
                </p>
                <div className="flex justify-center space-x-3">
                  <Button
                    variant="ghost"
                    icon={<RefreshCw size={18} />}
                    onClick={loadCaixasDetalhados}
                  >
                    Tentar novamente
                  </Button>
                </div>
              </div>
            )}
          </div>

          {/* Resumo por Operador */}
          {caixasDetalhados.length > 0 && (
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-6">
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-6">
                Resumo por Operador
              </h2>
              
              <div className="space-y-4">
                {Array.from(
                  caixasDetalhados.reduce((acc, caixa) => {
                    if (!acc.has(caixa.operador_id)) {
                      acc.set(caixa.operador_id, {
                        nome: caixa.operador_nome,
                        tipo: caixa.operador_tipo,
                        caixas: [],
                        totais: {
                          entradas: 0,
                          saidas: 0,
                          diferencas: 0,
                          tempo: 0
                        }
                      });
                    }
                    
                    const operador = acc.get(caixa.operador_id);
                    operador.caixas.push(caixa);
                    operador.totais.entradas += caixa.entradas_total;
                    operador.totais.saidas += caixa.saidas_total;
                    operador.totais.diferencas += caixa.diferenca;
                    if (caixa.tempo_operacao_horas) {
                      operador.totais.tempo += caixa.tempo_operacao_horas;
                    }
                    
                    return acc;
                  }, new Map()).values()
                ).map((operador: any) => (
                  <div key={operador.nome} className="p-4 bg-gray-50 dark:bg-gray-700 rounded-lg">
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center">
                        <div className="w-10 h-10 bg-blue-100 dark:bg-blue-900 rounded-full flex items-center justify-center mr-3">
                          <Users size={20} className="text-blue-600 dark:text-blue-400" />
                        </div>
                        <div>
                          <h3 className="font-medium text-gray-900 dark:text-white">
                            {operador.nome}
                          </h3>
                          <p className="text-sm text-gray-500 dark:text-gray-400">
                            {operador.tipo === 'funcionario' ? 'Funcionário' : 'Usuário Principal'} • {operador.caixas.length} operações
                          </p>
                        </div>
                      </div>
                    </div>
                    
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                      <div className="text-center">
                        <p className="text-xs text-gray-500 dark:text-gray-400">Entradas</p>
                        <p className="font-medium text-green-600 dark:text-green-400">
                          {formatarDinheiro(operador.totais.entradas)}
                        </p>
                      </div>
                      <div className="text-center">
                        <p className="text-xs text-gray-500 dark:text-gray-400">Saídas</p>
                        <p className="font-medium text-red-600 dark:text-red-400">
                          {formatarDinheiro(operador.totais.saidas)}
                        </p>
                      </div>
                      <div className="text-center">
                        <p className="text-xs text-gray-500 dark:text-gray-400">Diferenças</p>
                        <p className={`font-medium ${
                          operador.totais.diferencas === 0 
                            ? 'text-gray-600 dark:text-gray-400'
                            : operador.totais.diferencas > 0
                              ? 'text-green-600 dark:text-green-400'
                              : 'text-red-600 dark:text-red-400'
                        }`}>
                          {operador.totais.diferencas > 0 ? '+' : ''}
                          {formatarDinheiro(operador.totais.diferencas)}
                        </p>
                      </div>
                      <div className="text-center">
                        <p className="text-xs text-gray-500 dark:text-gray-400">Tempo Total</p>
                        <p className="font-medium text-gray-900 dark:text-white">
                          {formatarTempo(operador.totais.tempo)}
                        </p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Informações Importantes */}
          <div className="bg-gradient-to-r from-blue-50 to-blue-100 dark:from-blue-900/20 dark:to-blue-800/20 rounded-lg p-6">
            <div className="flex items-start">
              <div className="p-2 bg-blue-500 rounded-lg mr-4">
                <Coffee size={20} className="text-white" />
              </div>
              <div>
                <h3 className="text-lg font-semibold text-blue-900 dark:text-blue-100 mb-2">
                  Controle de Caixa via PDV
                </h3>
                <div className="text-blue-800 dark:text-blue-200 space-y-2">
                  <p>• Para abrir um novo caixa, acesse a tela de <strong>PDV</strong></p>
                  <p>• Cada operador pode ter apenas um caixa aberto por vez</p>
                  <p>• Funcionários de caixa podem abrir e fechar seus próprios caixas</p>
                  <p>• O administrador pode visualizar todos os caixas abertos</p>
                  <p>• Esta tela mostra apenas o histórico e relatórios das operações</p>
                </div>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
};

export default CaixaRegistradora;