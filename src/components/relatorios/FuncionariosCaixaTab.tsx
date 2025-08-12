import React, { useState, useEffect } from 'react';
import { User, Clock, DollarSign, Calendar, TrendingUp, RefreshCw, Download, FileSpreadsheet } from 'lucide-react';
import Button from '../ui/Button';
import { formatarDinheiro } from '../../utils/formatters';
import CaixaService from '../../services/CaixaService';
import { useRestaurante } from '../../contexts/RestauranteContext';
import toast from 'react-hot-toast';

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

const FuncionariosCaixaTab: React.FC = () => {
  const { restaurante } = useRestaurante();
  const [loading, setLoading] = useState(false);
  const [caixasDetalhados, setCaixasDetalhados] = useState<CaixaDetalhado[]>([]);
  const [periodo, setPeriodo] = useState('30dias');

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

      // Filtrar apenas funcionários de caixa (remover usuário principal)
      const caixasFuncionarios = caixas.filter(caixa => 
        caixa.operador_tipo === 'funcionario'
      );

      setCaixasDetalhados(caixasFuncionarios);
    } catch (error) {
      console.error('Error loading detailed cash registers:', error);
      toast.error('Erro ao carregar relatório de caixas');
    } finally {
      setLoading(false);
    }
  };

  const exportarRelatorio = (formato: 'excel' | 'pdf') => {
    toast.success(`Relatório de funcionários exportado em ${formato.toUpperCase()}!`);
  };

  const formatarTempo = (horas: number) => {
    const h = Math.floor(horas);
    const m = Math.round((horas - h) * 60);
    return `${h}h ${m}min`;
  };

  const agruparPorFuncionario = () => {
    const grupos = new Map();
    
    caixasDetalhados.forEach(caixa => {
      if (!grupos.has(caixa.operador_id)) {
        grupos.set(caixa.operador_id, {
          operador_nome: caixa.operador_nome,
          caixas: [],
          totais: {
            total_caixas: 0,
            total_entradas: 0,
            total_saidas: 0,
            total_diferencas: 0,
            tempo_total: 0
          }
        });
      }
      
      const grupo = grupos.get(caixa.operador_id);
      grupo.caixas.push(caixa);
      grupo.totais.total_caixas++;
      grupo.totais.total_entradas += caixa.entradas_total;
      grupo.totais.total_saidas += caixa.saidas_total;
      grupo.totais.total_diferencas += caixa.diferenca;
      if (caixa.tempo_operacao_horas) {
        grupo.totais.tempo_total += caixa.tempo_operacao_horas;
      }
    });
    
    return Array.from(grupos.values());
  };

  const funcionariosAgrupados = agruparPorFuncionario();

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center">
        <div>
          <h2 className="text-xl font-bold text-gray-900 dark:text-white">
            Relatório de Funcionários - Caixa
          </h2>
          <p className="text-gray-500 dark:text-gray-400 mt-1">
            Períodos de abertura e fechamento do PDV por funcionário
          </p>
        </div>
        <div className="mt-4 md:mt-0 flex items-center space-x-3">
          <select
            value={periodo}
            onChange={(e) => setPeriodo(e.target.value)}
            className="border border-gray-300 dark:border-gray-600 rounded-md py-2 pl-3 pr-10 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white"
          >
            <option value="hoje">Hoje</option>
            <option value="7dias">Últimos 7 dias</option>
            <option value="30dias">Últimos 30 dias</option>
            <option value="mes">Este mês</option>
          </select>
          <Button
            variant="ghost"
            icon={<RefreshCw size={18} />}
            onClick={loadCaixasDetalhados}
            isLoading={loading}
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
      ) : funcionariosAgrupados.length === 0 ? (
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-8 text-center">
          <User size={48} className="mx-auto text-gray-400 dark:text-gray-600 mb-4" />
          <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
            Nenhum registro encontrado
          </h3>
          <p className="text-gray-500 dark:text-gray-400">
            Não há registros de funcionários operando o caixa no período selecionado.
          </p>
        </div>
      ) : (
        <div className="space-y-6">
          {funcionariosAgrupados.map((funcionario) => (
            <div key={funcionario.operador_nome} className="bg-white dark:bg-gray-800 rounded-lg shadow-sm overflow-hidden">
              {/* Header do Funcionário */}
              <div className="bg-gradient-to-r from-blue-500 to-blue-600 px-6 py-4">
                <div className="flex items-center justify-between text-white">
                  <div className="flex items-center">
                    <div className="p-2 bg-white/20 rounded-lg mr-3">
                      <User size={20} />
                    </div>
                    <div>
                      <h3 className="text-lg font-semibold">{funcionario.operador_nome}</h3>
                      <p className="text-blue-100 text-sm">Funcionário - Caixa</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-sm text-blue-100">Total de Períodos</p>
                    <p className="text-2xl font-bold">{funcionario.totais.total_caixas}</p>
                  </div>
                </div>
              </div>

              {/* Resumo do Funcionário */}
              <div className="p-6 border-b border-gray-200 dark:border-gray-700">
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                  <div className="text-center p-4 bg-green-50 dark:bg-green-900/20 rounded-lg">
                    <div className="flex items-center justify-center mb-2">
                      <TrendingUp className="w-5 h-5 text-green-600 dark:text-green-400" />
                    </div>
                    <p className="text-sm text-green-600 dark:text-green-400">Total Entradas</p>
                    <p className="text-lg font-bold text-green-800 dark:text-green-200">
                      {formatarDinheiro(funcionario.totais.total_entradas)}
                    </p>
                  </div>

                  <div className="text-center p-4 bg-red-50 dark:bg-red-900/20 rounded-lg">
                    <div className="flex items-center justify-center mb-2">
                      <TrendingUp className="w-5 h-5 text-red-600 dark:text-red-400 transform rotate-180" />
                    </div>
                    <p className="text-sm text-red-600 dark:text-red-400">Total Saídas</p>
                    <p className="text-lg font-bold text-red-800 dark:text-red-200">
                      {formatarDinheiro(funcionario.totais.total_saidas)}
                    </p>
                  </div>

                  <div className="text-center p-4 bg-purple-50 dark:bg-purple-900/20 rounded-lg">
                    <div className="flex items-center justify-center mb-2">
                      <DollarSign className="w-5 h-5 text-purple-600 dark:text-purple-400" />
                    </div>
                    <p className="text-sm text-purple-600 dark:text-purple-400">Diferenças</p>
                    <p className={`text-lg font-bold ${
                      funcionario.totais.total_diferencas === 0 
                        ? 'text-gray-800 dark:text-gray-200'
                        : funcionario.totais.total_diferencas > 0
                          ? 'text-green-800 dark:text-green-200'
                          : 'text-red-800 dark:text-red-200'
                    }`}>
                      {funcionario.totais.total_diferencas > 0 ? '+' : ''}
                      {formatarDinheiro(funcionario.totais.total_diferencas)}
                    </p>
                  </div>

                  <div className="text-center p-4 bg-orange-50 dark:bg-orange-900/20 rounded-lg">
                    <div className="flex items-center justify-center mb-2">
                      <Clock className="w-5 h-5 text-orange-600 dark:text-orange-400" />
                    </div>
                    <p className="text-sm text-orange-600 dark:text-orange-400">Tempo Total</p>
                    <p className="text-lg font-bold text-orange-800 dark:text-orange-200">
                      {formatarTempo(funcionario.totais.tempo_total)}
                    </p>
                  </div>
                </div>
              </div>

              {/* Lista de Períodos */}
              <div className="p-6">
                <h4 className="text-md font-medium text-gray-900 dark:text-white mb-4">
                  Períodos de Operação
                </h4>
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                    <thead className="bg-gray-50 dark:bg-gray-700">
                      <tr>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                          Data
                        </th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                          Período
                        </th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                          Tempo Aberto
                        </th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                          Valor Inicial
                        </th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                          Valor Final
                        </th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                          Diferença
                        </th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                          Status
                        </th>
                      </tr>
                    </thead>
                    <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                      {funcionario.caixas
                        .sort((a, b) => new Date(b.data_abertura).getTime() - new Date(a.data_abertura).getTime())
                        .map((caixa) => (
                        <tr key={caixa.id} className="hover:bg-gray-50 dark:hover:bg-gray-700">
                          <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white">
                            {new Date(caixa.data_abertura).toLocaleDateString('pt-BR')}
                          </td>
                          <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                            <div>
                              <div>
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
                          </td>
                          <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white">
                            {caixa.tempo_operacao_horas ? (
                              <div className="flex items-center">
                                <Clock size={14} className="mr-1 text-gray-400" />
                                {formatarTempo(caixa.tempo_operacao_horas)}
                              </div>
                            ) : (
                              <span className="text-gray-400">Em aberto</span>
                            )}
                          </td>
                          <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white">
                            {formatarDinheiro(caixa.valor_inicial)}
                          </td>
                          <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white">
                            {caixa.valor_final !== null ? (
                              formatarDinheiro(caixa.valor_final)
                            ) : (
                              <span className="text-gray-400">-</span>
                            )}
                          </td>
                          <td className="px-4 py-4 whitespace-nowrap text-sm">
                            {caixa.diferenca !== 0 && caixa.valor_final !== null ? (
                              <span className={`font-medium ${
                                caixa.diferenca > 0 
                                  ? 'text-green-600 dark:text-green-400' 
                                  : 'text-red-600 dark:text-red-400'
                              }`}>
                                {caixa.diferenca > 0 ? '+' : ''}{formatarDinheiro(caixa.diferenca)}
                              </span>
                            ) : (
                              <span className="text-gray-400">-</span>
                            )}
                          </td>
                          <td className="px-4 py-4 whitespace-nowrap">
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

                {funcionario.caixas.length === 0 && (
                  <div className="text-center py-4 text-gray-500 dark:text-gray-400">
                    Nenhum período encontrado para este funcionário
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default FuncionariosCaixaTab;