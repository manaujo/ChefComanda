import React, { useState, useEffect } from 'react';
import { X, User, Clock, TrendingUp, AlertTriangle, Calendar, BarChart3 } from 'lucide-react';
import Button from '../ui/Button';
import { formatarDinheiro } from '../../utils/formatters';
import CaixaService from '../../services/CaixaService';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  LineChart,
  Line
} from 'recharts';

interface RelatorioOperadorModalProps {
  isOpen: boolean;
  onClose: () => void;
  operadorId: string;
  operadorNome: string;
  restauranteId: string;
}

const RelatorioOperadorModal: React.FC<RelatorioOperadorModalProps> = ({
  isOpen,
  onClose,
  operadorId,
  operadorNome,
  restauranteId
}) => {
  const [loading, setLoading] = useState(false);
  const [periodo, setPeriodo] = useState('30dias');
  const [estatisticas, setEstatisticas] = useState<any>(null);
  const [caixasDetalhados, setCaixasDetalhados] = useState<any[]>([]);

  useEffect(() => {
    if (isOpen && operadorId) {
      loadOperatorData();
    }
  }, [isOpen, operadorId, periodo]);

  const loadOperatorData = async () => {
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

      // Carregar estatísticas do operador
      const stats = await CaixaService.getEstatisticasOperador(
        restauranteId,
        operadorId,
        startDate.toISOString(),
        endDate
      );

      setEstatisticas(stats);

      // Carregar caixas detalhados
      const caixas = await CaixaService.getCaixasPorPeriodo(
        restauranteId,
        startDate.toISOString(),
        endDate
      );

      const caixasDoOperador = caixas.filter(c => c.operador_id === operadorId);
      setCaixasDetalhados(caixasDoOperador);
    } catch (error) {
      console.error('Error loading operator data:', error);
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  const chartData = caixasDetalhados.map(caixa => ({
    data: new Date(caixa.data_abertura).toLocaleDateString('pt-BR', { 
      day: '2-digit', 
      month: '2-digit' 
    }),
    entradas: caixa.entradas_total,
    saidas: caixa.saidas_total,
    diferenca: caixa.diferenca
  }));

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      <div className="flex items-center justify-center min-h-screen px-4 pt-4 pb-20 text-center sm:block sm:p-0">
        <div className="fixed inset-0 transition-opacity" aria-hidden="true">
          <div className="absolute inset-0 bg-gray-500 opacity-75"></div>
        </div>

        <div className="inline-block align-bottom bg-white rounded-lg text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-4xl sm:w-full">
          <div className="flex justify-between items-center bg-gray-100 px-6 py-4 border-b">
            <div className="flex items-center">
              <div className="p-2 bg-blue-100 rounded-lg mr-3">
                <User size={20} className="text-blue-600" />
              </div>
              <div>
                <h2 className="text-lg font-medium text-gray-900">
                  Relatório do Operador
                </h2>
                <p className="text-sm text-gray-500">{operadorNome}</p>
              </div>
            </div>
            <div className="flex items-center space-x-3">
              <select
                value={periodo}
                onChange={(e) => setPeriodo(e.target.value)}
                className="border border-gray-300 rounded-md py-1 px-3 text-sm focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="hoje">Hoje</option>
                <option value="7dias">Últimos 7 dias</option>
                <option value="30dias">Últimos 30 dias</option>
                <option value="mes">Este mês</option>
              </select>
              <button 
                onClick={onClose}
                className="text-gray-400 hover:text-gray-500"
              >
                <X size={24} />
              </button>
            </div>
          </div>
          
          <div className="bg-white px-6 py-4 max-h-[calc(100vh-200px)] overflow-y-auto">
            {loading ? (
              <div className="flex justify-center items-center h-64">
                <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
              </div>
            ) : (
              <div className="space-y-6">
                {/* Cards de Estatísticas */}
                {estatisticas && (
                  <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                    <div className="bg-blue-50 rounded-lg p-4">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-sm text-blue-600">Total de Caixas</p>
                          <p className="text-2xl font-bold text-blue-800">{estatisticas.total_caixas}</p>
                        </div>
                        <Calendar className="w-8 h-8 text-blue-500" />
                      </div>
                    </div>

                    <div className="bg-green-50 rounded-lg p-4">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-sm text-green-600">Total Entradas</p>
                          <p className="text-2xl font-bold text-green-800">
                            {formatarDinheiro(estatisticas.total_entradas)}
                          </p>
                        </div>
                        <TrendingUp className="w-8 h-8 text-green-500" />
                      </div>
                    </div>

                    <div className="bg-red-50 rounded-lg p-4">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-sm text-red-600">Total Saídas</p>
                          <p className="text-2xl font-bold text-red-800">
                            {formatarDinheiro(estatisticas.total_saidas)}
                          </p>
                        </div>
                        <TrendingUp className="w-8 h-8 text-red-500 transform rotate-180" />
                      </div>
                    </div>

                    <div className="bg-purple-50 rounded-lg p-4">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-sm text-purple-600">Tempo Médio</p>
                          <p className="text-2xl font-bold text-purple-800">
                            {estatisticas.media_tempo_operacao.toFixed(1)}h
                          </p>
                        </div>
                        <Clock className="w-8 h-8 text-purple-500" />
                      </div>
                    </div>
                  </div>
                )}

                {/* Gráfico de Movimentações */}
                {chartData.length > 0 && (
                  <div className="bg-gray-50 rounded-lg p-6">
                    <h3 className="text-lg font-medium text-gray-900 mb-4">
                      Movimentações por Período
                    </h3>
                    <div className="h-64">
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={chartData}>
                          <CartesianGrid strokeDasharray="3 3" />
                          <XAxis dataKey="data" />
                          <YAxis />
                          <Tooltip 
                            formatter={(value: any, name: string) => [
                              formatarDinheiro(value), 
                              name === 'entradas' ? 'Entradas' : 
                              name === 'saidas' ? 'Saídas' : 'Diferença'
                            ]}
                          />
                          <Bar dataKey="entradas" name="Entradas" fill="#10B981" />
                          <Bar dataKey="saidas" name="Saídas" fill="#EF4444" />
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                  </div>
                )}

                {/* Lista de Caixas */}
                <div className="bg-gray-50 rounded-lg p-6">
                  <h3 className="text-lg font-medium text-gray-900 mb-4">
                    Histórico de Caixas
                  </h3>
                  <div className="space-y-3">
                    {caixasDetalhados.map(caixa => (
                      <div key={caixa.id} className="bg-white rounded-lg p-4 border">
                        <div className="flex justify-between items-start">
                          <div>
                            <div className="flex items-center space-x-2 mb-2">
                              <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                                caixa.status === 'aberto' 
                                  ? 'bg-green-100 text-green-800' 
                                  : 'bg-gray-100 text-gray-800'
                              }`}>
                                {caixa.status === 'aberto' ? 'Aberto' : 'Fechado'}
                              </span>
                              {caixa.diferenca !== 0 && (
                                <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                                  caixa.diferenca > 0 
                                    ? 'bg-green-100 text-green-800' 
                                    : 'bg-red-100 text-red-800'
                                }`}>
                                  {caixa.diferenca > 0 ? 'Sobra' : 'Falta'}: {formatarDinheiro(Math.abs(caixa.diferenca))}
                                </span>
                              )}
                            </div>
                            <p className="text-sm text-gray-600">
                              Abertura: {new Date(caixa.data_abertura).toLocaleString('pt-BR')}
                            </p>
                            {caixa.data_fechamento && (
                              <p className="text-sm text-gray-600">
                                Fechamento: {new Date(caixa.data_fechamento).toLocaleString('pt-BR')}
                              </p>
                            )}
                            {caixa.tempo_operacao_horas && (
                              <p className="text-sm text-gray-600">
                                Tempo de operação: {caixa.tempo_operacao_horas.toFixed(1)} horas
                              </p>
                            )}
                          </div>
                          <div className="text-right">
                            <div className="space-y-1 text-sm">
                              <div>
                                <span className="text-gray-500">Inicial: </span>
                                <span className="font-medium">{formatarDinheiro(caixa.valor_inicial)}</span>
                              </div>
                              <div>
                                <span className="text-green-600">Entradas: </span>
                                <span className="font-medium">+{formatarDinheiro(caixa.entradas_total)}</span>
                              </div>
                              <div>
                                <span className="text-red-600">Saídas: </span>
                                <span className="font-medium">-{formatarDinheiro(caixa.saidas_total)}</span>
                              </div>
                              <div className="border-t pt-1">
                                <span className="text-gray-500">Saldo: </span>
                                <span className="font-bold">{formatarDinheiro(caixa.saldo_calculado)}</span>
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}

                    {caixasDetalhados.length === 0 && (
                      <div className="text-center py-8 text-gray-500">
                        <Calendar size={32} className="mx-auto mb-2 opacity-50" />
                        <p>Nenhum caixa encontrado no período</p>
                      </div>
                    )}
                  </div>
                </div>

                {/* Alertas e Observações */}
                {estatisticas && estatisticas.total_diferencas !== 0 && (
                  <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                    <div className="flex items-start">
                      <AlertTriangle className="h-5 w-5 text-yellow-500 mt-0.5 mr-3 flex-shrink-0" />
                      <div className="text-sm text-yellow-700">
                        <p className="font-medium mb-1">Atenção às Diferenças</p>
                        <p>
                          Este operador apresentou diferenças entre o valor calculado e o valor informado 
                          no fechamento do caixa. Total de diferenças: {formatarDinheiro(Math.abs(estatisticas.total_diferencas))}
                        </p>
                        {estatisticas.maior_diferenca > 0 && (
                          <p className="mt-1">
                            Maior sobra: {formatarDinheiro(estatisticas.maior_diferenca)}
                          </p>
                        )}
                        {estatisticas.menor_diferenca < 0 && (
                          <p className="mt-1">
                            Maior falta: {formatarDinheiro(Math.abs(estatisticas.menor_diferenca))}
                          </p>
                        )}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
          
          <div className="bg-gray-50 px-6 py-3 flex justify-end">
            <Button variant="ghost" onClick={onClose}>
              Fechar
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default RelatorioOperadorModal;