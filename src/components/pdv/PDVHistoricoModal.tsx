import React, { useState, useEffect } from 'react';
import { X, Calendar, Clock, DollarSign, TrendingUp, User, BarChart3 } from 'lucide-react';
import Button from '../ui/Button';
import { formatarDinheiro } from '../../utils/formatters';
import PDVService, { HistoricoPDV } from '../../services/PDVService';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer
} from 'recharts';

interface PDVHistoricoModalProps {
  isOpen: boolean;
  onClose: () => void;
  operadorId: string;
  operadorNome: string;
  restauranteId: string;
}

const PDVHistoricoModal: React.FC<PDVHistoricoModalProps> = ({
  isOpen,
  onClose,
  operadorId,
  operadorNome,
  restauranteId
}) => {
  const [loading, setLoading] = useState(false);
  const [periodo, setPeriodo] = useState('30dias');
  const [historico, setHistorico] = useState<HistoricoPDV[]>([]);
  const [estatisticas, setEstatisticas] = useState<any>(null);

  useEffect(() => {
    if (isOpen && operadorId) {
      loadHistorico();
    }
  }, [isOpen, operadorId, periodo]);

  const loadHistorico = async () => {
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

      const [historicoData, estatisticasData] = await Promise.all([
        PDVService.getHistoricoPDVOperador(
          restauranteId,
          operadorId,
          startDate.toISOString(),
          endDate
        ),
        PDVService.getEstatisticasOperador(
          restauranteId,
          operadorId,
          30
        )
      ]);

      setHistorico(historicoData);
      setEstatisticas(estatisticasData);
    } catch (error) {
      console.error('Error loading PDV history:', error);
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  const chartData = historico.map(h => ({
    data: new Date(h.data_abertura).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' }),
    vendas: h.total_vendas,
    quantidade: h.quantidade_vendas
  }));

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-black bg-opacity-50">
      <div className="flex items-center justify-center min-h-screen p-4">
        <div className="bg-white rounded-lg shadow-xl w-full max-w-6xl max-h-[90vh] overflow-hidden">
          <div className="flex justify-between items-center p-6 border-b border-gray-200">
            <div className="flex items-center">
              <div className="p-2 bg-blue-100 rounded-lg mr-3">
                <User size={20} className="text-blue-600" />
              </div>
              <div>
                <h3 className="text-lg font-medium text-gray-900">
                  Histórico PDV - {operadorNome}
                </h3>
                <p className="text-sm text-gray-500">
                  Relatório detalhado de sessões e vendas
                </p>
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

          <div className="p-6 overflow-y-auto max-h-[calc(90vh-120px)]">
            {loading ? (
              <div className="flex justify-center items-center h-64">
                <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
              </div>
            ) : (
              <div className="space-y-6">
                {/* Estatísticas Resumidas */}
                {estatisticas && (
                  <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                    <div className="bg-blue-50 rounded-lg p-4">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-sm text-blue-600">Total Sessões</p>
                          <p className="text-2xl font-bold text-blue-800">{estatisticas.total_sessoes}</p>
                        </div>
                        <Calendar className="w-8 h-8 text-blue-500" />
                      </div>
                    </div>

                    <div className="bg-green-50 rounded-lg p-4">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-sm text-green-600">Total Vendas</p>
                          <p className="text-2xl font-bold text-green-800">
                            {formatarDinheiro(estatisticas.total_vendas)}
                          </p>
                        </div>
                        <DollarSign className="w-8 h-8 text-green-500" />
                      </div>
                    </div>

                    <div className="bg-purple-50 rounded-lg p-4">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-sm text-purple-600">Ticket Médio</p>
                          <p className="text-2xl font-bold text-purple-800">
                            {formatarDinheiro(estatisticas.ticket_medio)}
                          </p>
                        </div>
                        <TrendingUp className="w-8 h-8 text-purple-500" />
                      </div>
                    </div>

                    <div className="bg-orange-50 rounded-lg p-4">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-sm text-orange-600">Tempo Médio</p>
                          <p className="text-2xl font-bold text-orange-800">
                            {estatisticas.media_tempo_sessao.toFixed(1)}h
                          </p>
                        </div>
                        <Clock className="w-8 h-8 text-orange-500" />
                      </div>
                    </div>
                  </div>
                )}

                {/* Gráfico de Performance */}
                {chartData.length > 0 && (
                  <div className="bg-gray-50 rounded-lg p-6">
                    <h3 className="text-lg font-medium text-gray-900 mb-4">
                      Performance por Sessão
                    </h3>
                    <div className="h-64">
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={chartData}>
                          <CartesianGrid strokeDasharray="3 3" />
                          <XAxis dataKey="data" />
                          <YAxis />
                          <Tooltip 
                            formatter={(value: any, name: string) => [
                              name === 'vendas' ? formatarDinheiro(value) : value,
                              name === 'vendas' ? 'Total Vendas' : 'Quantidade'
                            ]}
                          />
                          <Bar dataKey="vendas" name="vendas" fill="#3B82F6" />
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                  </div>
                )}

                {/* Lista Detalhada de Sessões */}
                <div className="bg-white rounded-lg border border-gray-200">
                  <div className="p-4 border-b border-gray-200">
                    <h3 className="text-lg font-medium text-gray-900">
                      Sessões Detalhadas
                    </h3>
                  </div>
                  <div className="divide-y divide-gray-200">
                    {historico.map((sessao) => (
                      <div key={sessao.id} className="p-4">
                        <div className="flex items-center justify-between mb-3">
                          <div className="flex items-center space-x-4">
                            <div className="flex items-center">
                              <Calendar className="h-4 w-4 text-gray-400 mr-1" />
                              <span className="text-sm font-medium">
                                {new Date(sessao.data_abertura).toLocaleDateString('pt-BR')}
                              </span>
                            </div>
                            <div className="flex items-center">
                              <Clock className="h-4 w-4 text-gray-400 mr-1" />
                              <span className="text-sm text-gray-600">
                                {new Date(sessao.data_abertura).toLocaleTimeString('pt-BR')} - 
                                {sessao.data_fechamento 
                                  ? new Date(sessao.data_fechamento).toLocaleTimeString('pt-BR')
                                  : 'Em aberto'
                                }
                              </span>
                            </div>
                            {sessao.tempo_operacao && (
                              <span className="text-sm text-gray-600">
                                ({sessao.tempo_operacao.toFixed(1)}h)
                              </span>
                            )}
                          </div>
                          <div className="flex items-center space-x-2">
                            <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                              sessao.data_fechamento 
                                ? 'bg-gray-100 text-gray-800' 
                                : 'bg-green-100 text-green-800'
                            }`}>
                              {sessao.data_fechamento ? 'Fechado' : 'Aberto'}
                            </span>
                            {sessao.diferenca !== 0 && (
                              <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                                sessao.diferenca > 0 
                                  ? 'bg-green-100 text-green-800' 
                                  : 'bg-red-100 text-red-800'
                              }`}>
                                {sessao.diferenca > 0 ? 'Sobra' : 'Falta'}: {formatarDinheiro(Math.abs(sessao.diferenca))}
                              </span>
                            )}
                          </div>
                        </div>

                        <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                          <div className="text-center p-2 bg-blue-50 rounded">
                            <p className="text-xs text-blue-600">Inicial</p>
                            <p className="font-medium text-blue-800">
                              {formatarDinheiro(sessao.valor_inicial)}
                            </p>
                          </div>
                          <div className="text-center p-2 bg-green-50 rounded">
                            <p className="text-xs text-green-600">Vendas</p>
                            <p className="font-medium text-green-800">
                              {formatarDinheiro(sessao.total_vendas)}
                            </p>
                          </div>
                          <div className="text-center p-2 bg-purple-50 rounded">
                            <p className="text-xs text-purple-600">Quantidade</p>
                            <p className="font-medium text-purple-800">
                              {sessao.quantidade_vendas}
                            </p>
                          </div>
                          <div className="text-center p-2 bg-orange-50 rounded">
                            <p className="text-xs text-orange-600">Sistema</p>
                            <p className="font-medium text-orange-800">
                              {formatarDinheiro(sessao.valor_sistema)}
                            </p>
                          </div>
                          <div className="text-center p-2 bg-gray-50 rounded">
                            <p className="text-xs text-gray-600">Final</p>
                            <p className="font-medium text-gray-800">
                              {sessao.valor_final ? formatarDinheiro(sessao.valor_final) : 'N/A'}
                            </p>
                          </div>
                        </div>
                      </div>
                    ))}

                    {historico.length === 0 && (
                      <div className="p-8 text-center text-gray-500">
                        <Calendar size={48} className="mx-auto mb-4 opacity-50" />
                        <p>Nenhuma sessão encontrada no período</p>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default PDVHistoricoModal;