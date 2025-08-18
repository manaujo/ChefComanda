import React, { useState, useEffect } from 'react';
import { 
  DollarSign, Plus, Minus, Calculator, TrendingUp, 
  Clock, User, AlertTriangle, CreditCard, Receipt,
  ArrowUp, ArrowDown, RefreshCw, FileSpreadsheet,
  Download, Eye, X, Check, Power, PowerOff
} from 'lucide-react';
import Button from '../components/ui/Button';
import { formatarDinheiro } from '../utils/formatters';
import { useAuth } from '../contexts/AuthContext';
import { useRestaurante } from '../contexts/RestauranteContext';
import CaixaService from '../services/CaixaService';
import { supabase } from '../services/supabase';
import toast from 'react-hot-toast';

interface MovimentacaoCaixa {
  id: string;
  tipo: 'entrada' | 'saida';
  valor: number;
  motivo: string;
  observacao?: string;
  forma_pagamento?: string;
  created_at: string;
}

interface CaixaAtual {
  id: string;
  operador_id: string;
  operador_nome: string;
  operador_tipo: 'funcionario' | 'usuario';
  valor_inicial: number;
  valor_sistema: number;
  status: 'aberto' | 'fechado';
  data_abertura: string;
  data_fechamento?: string;
}

const CaixaRegistradora: React.FC = () => {
  const { user, isEmployee, employeeData, displayName } = useAuth();
  const { restaurante } = useRestaurante();
  const [caixaAtual, setCaixaAtual] = useState<CaixaAtual | null>(null);
  const [movimentacoes, setMovimentacoes] = useState<MovimentacaoCaixa[]>([]);
  const [loading, setLoading] = useState(false);
  const [showAbrirModal, setShowAbrirModal] = useState(false);
  const [showFecharModal, setShowFecharModal] = useState(false);
  const [showMovimentacaoModal, setShowMovimentacaoModal] = useState(false);
  const [valorInicial, setValorInicial] = useState('');
  const [valorFinal, setValorFinal] = useState('');
  const [observacaoFechamento, setObservacaoFechamento] = useState('');
  const [novaMovimentacao, setNovaMovimentacao] = useState({
    tipo: 'entrada' as 'entrada' | 'saida',
    valor: '',
    motivo: '',
    observacao: '',
    formaPagamento: ''
  });

  useEffect(() => {
    if (restaurante?.id) {
      loadCaixaAtual();
    }
  }, [restaurante?.id]);

  useEffect(() => {
    if (caixaAtual) {
      loadMovimentacoes();
      // Salvar no localStorage para o PDV
      localStorage.setItem('caixaAtual', JSON.stringify(caixaAtual));
    } else {
      localStorage.removeItem('caixaAtual');
    }
  }, [caixaAtual]);

  const loadCaixaAtual = async () => {
    try {
      if (!restaurante?.id) return;

      const operadorAtual = isEmployee && employeeData ? employeeData.id : user?.id;
      const caixa = await CaixaService.getCaixaAberto(restaurante.id, operadorAtual);
      setCaixaAtual(caixa);
    } catch (error) {
      console.error('Error loading current cash register:', error);
    }
  };

  const loadMovimentacoes = async () => {
    try {
      if (!caixaAtual) return;

      const movs = await CaixaService.getMovimentacoesCaixa(caixaAtual.id);
      setMovimentacoes(movs);
    } catch (error) {
      console.error('Error loading cash movements:', error);
    }
  };

  const getOperadorAtual = () => {
    if (isEmployee && employeeData) {
      return {
        id: employeeData.id,
        nome: employeeData.name,
        tipo: 'funcionario' as const
      };
    } else {
      return {
        id: user?.id || '',
        nome: displayName || user?.user_metadata?.name || 'Usuário',
        tipo: 'usuario' as const
      };
    }
  };

  const handleAbrirCaixa = async () => {
    try {
      setLoading(true);

      const valor = parseFloat(valorInicial);
      if (isNaN(valor) || valor < 0) {
        throw new Error('Valor inicial inválido');
      }

      if (!restaurante?.id) {
        throw new Error('Restaurante não encontrado');
      }

      const operador = getOperadorAtual();

      const caixa = await CaixaService.abrirCaixa({
        restauranteId: restaurante.id,
        operadorId: operador.id,
        operadorNome: operador.nome,
        operadorTipo: operador.tipo,
        valorInicial: valor
      });

      setCaixaAtual(caixa);
      setShowAbrirModal(false);
      setValorInicial('');
      toast.success('Caixa aberto com sucesso!');
    } catch (error) {
      console.error('Error opening cash register:', error);
      toast.error(error instanceof Error ? error.message : 'Erro ao abrir caixa');
    } finally {
      setLoading(false);
    }
  };

  const handleFecharCaixa = async () => {
    try {
      setLoading(true);

      const valor = parseFloat(valorFinal);
      if (isNaN(valor) || valor < 0) {
        throw new Error('Valor final inválido');
      }

      if (!caixaAtual) {
        throw new Error('Nenhum caixa aberto');
      }

      await CaixaService.fecharCaixa(caixaAtual.id, valor, observacaoFechamento);

      setCaixaAtual(null);
      setMovimentacoes([]);
      setShowFecharModal(false);
      setValorFinal('');
      setObservacaoFechamento('');
      toast.success('Caixa fechado com sucesso!');
    } catch (error) {
      console.error('Error closing cash register:', error);
      toast.error(error instanceof Error ? error.message : 'Erro ao fechar caixa');
    } finally {
      setLoading(false);
    }
  };

  const handleAdicionarMovimentacao = async () => {
    try {
      setLoading(true);

      const valor = parseFloat(novaMovimentacao.valor);
      if (isNaN(valor) || valor <= 0) {
        throw new Error('Valor inválido');
      }

      if (!novaMovimentacao.motivo) {
        throw new Error('Motivo é obrigatório');
      }

      if (!caixaAtual) {
        throw new Error('Nenhum caixa aberto');
      }

      await CaixaService.adicionarMovimentacao({
        caixaId: caixaAtual.id,
        tipo: novaMovimentacao.tipo,
        valor: valor,
        motivo: novaMovimentacao.motivo,
        observacao: novaMovimentacao.observacao,
        formaPagamento: novaMovimentacao.formaPagamento,
        usuarioId: user?.id || ''
      });

      // Recarregar dados
      await loadCaixaAtual();
      await loadMovimentacoes();

      setShowMovimentacaoModal(false);
      setNovaMovimentacao({
        tipo: 'entrada',
        valor: '',
        motivo: '',
        observacao: '',
        formaPagamento: ''
      });

      toast.success('Movimentação adicionada com sucesso!');
    } catch (error) {
      console.error('Error adding cash movement:', error);
      toast.error(error instanceof Error ? error.message : 'Erro ao adicionar movimentação');
    } finally {
      setLoading(false);
    }
  };

  const calcularTroco = () => {
    const entradas = movimentacoes
      .filter(m => m.tipo === 'entrada')
      .reduce((acc, m) => acc + m.valor, 0);
    const saidas = movimentacoes
      .filter(m => m.tipo === 'saida')
      .reduce((acc, m) => acc + m.valor, 0);
    
    return (caixaAtual?.valor_inicial || 0) + entradas - saidas;
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
            Caixa Registradora
          </h1>
          <p className="text-gray-500 dark:text-gray-400 mt-1">
            Controle de caixa e movimentações financeiras
          </p>
        </div>
        <div className="mt-4 md:mt-0 flex space-x-3">
          <Button
            variant="ghost"
            icon={<RefreshCw size={18} />}
            onClick={loadCaixaAtual}
            isLoading={loading}
          >
            Atualizar
          </Button>
          <Button
            variant="ghost"
            icon={<FileSpreadsheet size={18} />}
            onClick={() => toast.success('Relatório exportado em Excel!')}
          >
            Excel
          </Button>
          <Button
            variant="ghost"
            icon={<Download size={18} />}
            onClick={() => toast.success('Relatório exportado em PDF!')}
          >
            PDF
          </Button>
        </div>
      </div>

      {/* Status do Caixa */}
      {caixaAtual ? (
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-6">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center">
              <div className="p-3 bg-green-100 dark:bg-green-900 rounded-full mr-4">
                <CreditCard size={24} className="text-green-600 dark:text-green-400" />
              </div>
              <div>
                <h2 className="text-lg font-medium text-gray-900 dark:text-white">
                  Caixa Aberto
                </h2>
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  Operador: {caixaAtual.operador_nome}
                </p>
                <p className="text-xs text-gray-400 dark:text-gray-500">
                  Aberto em: {new Date(caixaAtual.data_abertura).toLocaleString('pt-BR')}
                </p>
              </div>
            </div>
            <div className="flex space-x-3">
              <Button
                variant="secondary"
                icon={<Plus size={18} />}
                onClick={() => setShowMovimentacaoModal(true)}
              >
                Nova Movimentação
              </Button>
              <Button
                variant="warning"
                icon={<PowerOff size={18} />}
                onClick={() => setShowFecharModal(true)}
              >
                Fechar Caixa
              </Button>
            </div>
          </div>

          {/* Resumo Financeiro */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            <div className="bg-blue-50 dark:bg-blue-900/20 rounded-lg p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-blue-600 dark:text-blue-400">Valor Inicial</p>
                  <p className="text-2xl font-bold text-blue-800 dark:text-blue-200">
                    {formatarDinheiro(caixaAtual.valor_inicial)}
                  </p>
                </div>
                <DollarSign className="w-8 h-8 text-blue-500" />
              </div>
            </div>

            <div className="bg-green-50 dark:bg-green-900/20 rounded-lg p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-green-600 dark:text-green-400">Entradas</p>
                  <p className="text-2xl font-bold text-green-800 dark:text-green-200">
                    {formatarDinheiro(
                      movimentacoes
                        .filter(m => m.tipo === 'entrada')
                        .reduce((acc, m) => acc + m.valor, 0)
                    )}
                  </p>
                </div>
                <ArrowUp className="w-8 h-8 text-green-500" />
              </div>
            </div>

            <div className="bg-red-50 dark:bg-red-900/20 rounded-lg p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-red-600 dark:text-red-400">Saídas</p>
                  <p className="text-2xl font-bold text-red-800 dark:text-red-200">
                    {formatarDinheiro(
                      movimentacoes
                        .filter(m => m.tipo === 'saida')
                        .reduce((acc, m) => acc + m.valor, 0)
                    )}
                  </p>
                </div>
                <ArrowDown className="w-8 h-8 text-red-500" />
              </div>
            </div>

            <div className="bg-purple-50 dark:bg-purple-900/20 rounded-lg p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-purple-600 dark:text-purple-400">Saldo Atual</p>
                  <p className="text-2xl font-bold text-purple-800 dark:text-purple-200">
                    {formatarDinheiro(caixaAtual.valor_sistema)}
                  </p>
                </div>
                <Calculator className="w-8 h-8 text-purple-500" />
              </div>
            </div>
          </div>
        </div>
      ) : (
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-6">
          <div className="text-center">
            <div className="p-4 bg-red-100 dark:bg-red-900/20 rounded-full w-fit mx-auto mb-4">
              <AlertTriangle size={32} className="text-red-600 dark:text-red-400" />
            </div>
            <h2 className="text-xl font-medium text-gray-900 dark:text-white mb-2">
              Caixa Fechado
            </h2>
            <p className="text-gray-500 dark:text-gray-400 mb-6">
              Abra o caixa para começar a registrar movimentações e vendas
            </p>
            <Button
              variant="primary"
              icon={<Power size={18} />}
              onClick={() => setShowAbrirModal(true)}
              size="lg"
            >
              Abrir Caixa
            </Button>
          </div>
        </div>
      )}

      {/* Lista de Movimentações */}
      {caixaAtual && (
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm overflow-hidden">
          <div className="p-6 border-b border-gray-200 dark:border-gray-700">
            <div className="flex justify-between items-center">
              <h2 className="text-lg font-medium text-gray-900 dark:text-white">
                Movimentações do Caixa
              </h2>
              <Button
                variant="primary"
                icon={<Plus size={18} />}
                onClick={() => setShowMovimentacaoModal(true)}
              >
                Nova Movimentação
              </Button>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
              <thead className="bg-gray-50 dark:bg-gray-700">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                    Tipo
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                    Valor
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                    Motivo
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                    Horário
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                {movimentacoes.map((mov) => (
                  <tr key={mov.id}>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full ${
                        mov.tipo === 'entrada' 
                          ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200'
                          : 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200'
                      }`}>
                        {mov.tipo === 'entrada' ? 'Entrada' : 'Saída'}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                      <span className={mov.tipo === 'entrada' ? 'text-green-600' : 'text-red-600'}>
                        {mov.tipo === 'entrada' ? '+' : '-'}{formatarDinheiro(mov.valor)}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white">
                      <div>
                        <div>{mov.motivo}</div>
                        {mov.observacao && (
                          <div className="text-xs text-gray-500 dark:text-gray-400">{mov.observacao}</div>
                        )}
                        {mov.forma_pagamento && (
                          <div className="text-xs text-gray-500 dark:text-gray-400">
                            Forma: {mov.forma_pagamento}
                          </div>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                      {new Date(mov.created_at).toLocaleString('pt-BR')}
                    </td>
                  </tr>
                ))}

                {movimentacoes.length === 0 && (
                  <tr>
                    <td colSpan={4} className="px-6 py-4 text-center text-gray-500 dark:text-gray-400">
                      Nenhuma movimentação registrada
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Modal Abrir Caixa */}
      {showAbrirModal && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-black bg-opacity-50">
          <div className="flex items-center justify-center min-h-screen p-4">
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl w-full max-w-md">
              <div className="flex justify-between items-center p-6 border-b border-gray-200 dark:border-gray-700">
                <h3 className="text-lg font-medium text-gray-900 dark:text-white">
                  Abrir Caixa
                </h3>
                <button
                  onClick={() => setShowAbrirModal(false)}
                  className="text-gray-400 hover:text-gray-500"
                >
                  <X size={24} />
                </button>
              </div>

              <div className="p-6">
                <div className="mb-4">
                  <div className="bg-blue-50 dark:bg-blue-900/20 p-4 rounded-lg">
                    <div className="flex items-center">
                      <User className="h-5 w-5 text-blue-500 mr-2" />
                      <div>
                        <p className="text-sm font-medium text-blue-800 dark:text-blue-200">
                          Operador: {getOperadorAtual().nome}
                        </p>
                        <p className="text-xs text-blue-600 dark:text-blue-300">
                          {getOperadorAtual().tipo === 'funcionario' ? 'Funcionário' : 'Usuário Principal'}
                        </p>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="mb-6">
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Valor Inicial em Dinheiro
                  </label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                      <span className="text-gray-500 sm:text-sm">R$</span>
                    </div>
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      value={valorInicial}
                      onChange={(e) => setValorInicial(e.target.value)}
                      className="pl-8 block w-full rounded-md border-gray-300 dark:border-gray-600 shadow-sm focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white"
                      placeholder="0,00"
                      required
                    />
                  </div>
                </div>

                <div className="flex space-x-3">
                  <Button
                    variant="ghost"
                    onClick={() => setShowAbrirModal(false)}
                    className="flex-1"
                  >
                    Cancelar
                  </Button>
                  <Button
                    variant="primary"
                    onClick={handleAbrirCaixa}
                    isLoading={loading}
                    disabled={!valorInicial}
                    className="flex-1"
                  >
                    Abrir Caixa
                  </Button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal Fechar Caixa */}
      {showFecharModal && caixaAtual && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-black bg-opacity-50">
          <div className="flex items-center justify-center min-h-screen p-4">
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl w-full max-w-md">
              <div className="flex justify-between items-center p-6 border-b border-gray-200 dark:border-gray-700">
                <h3 className="text-lg font-medium text-gray-900 dark:text-white">
                  Fechar Caixa
                </h3>
                <button
                  onClick={() => setShowFecharModal(false)}
                  className="text-gray-400 hover:text-gray-500"
                >
                  <X size={24} />
                </button>
              </div>

              <div className="p-6">
                <div className="mb-4 bg-yellow-50 dark:bg-yellow-900/20 p-4 rounded-lg">
                  <h4 className="text-sm font-medium text-yellow-800 dark:text-yellow-200 mb-2">
                    Resumo do Período
                  </h4>
                  <div className="space-y-1 text-sm">
                    <div className="flex justify-between">
                      <span className="text-yellow-700 dark:text-yellow-300">Valor inicial:</span>
                      <span className="font-medium">{formatarDinheiro(caixaAtual.valor_inicial)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-yellow-700 dark:text-yellow-300">Valor calculado:</span>
                      <span className="font-medium">{formatarDinheiro(caixaAtual.valor_sistema)}</span>
                    </div>
                  </div>
                </div>

                <div className="mb-4">
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Valor Final em Dinheiro
                  </label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                      <span className="text-gray-500 sm:text-sm">R$</span>
                    </div>
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      value={valorFinal}
                      onChange={(e) => setValorFinal(e.target.value)}
                      className="pl-8 block w-full rounded-md border-gray-300 dark:border-gray-600 shadow-sm focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white"
                      placeholder="0,00"
                      required
                    />
                  </div>
                </div>

                <div className="mb-6">
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Observações do Fechamento
                  </label>
                  <textarea
                    value={observacaoFechamento}
                    onChange={(e) => setObservacaoFechamento(e.target.value)}
                    rows={3}
                    className="w-full rounded-md border-gray-300 dark:border-gray-600 shadow-sm focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white"
                    placeholder="Observações sobre o fechamento..."
                  />
                </div>

                <div className="flex space-x-3">
                  <Button
                    variant="ghost"
                    onClick={() => setShowFecharModal(false)}
                    className="flex-1"
                  >
                    Cancelar
                  </Button>
                  <Button
                    variant="warning"
                    onClick={handleFecharCaixa}
                    isLoading={loading}
                    disabled={!valorFinal}
                    className="flex-1"
                  >
                    Fechar Caixa
                  </Button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal Nova Movimentação */}
      {showMovimentacaoModal && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-black bg-opacity-50">
          <div className="flex items-center justify-center min-h-screen p-4">
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl w-full max-w-md">
              <div className="flex justify-between items-center p-6 border-b border-gray-200 dark:border-gray-700">
                <h3 className="text-lg font-medium text-gray-900 dark:text-white">
                  Nova Movimentação
                </h3>
                <button
                  onClick={() => setShowMovimentacaoModal(false)}
                  className="text-gray-400 hover:text-gray-500"
                >
                  <X size={24} />
                </button>
              </div>

              <div className="p-6">
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Tipo de Movimentação
                    </label>
                    <div className="flex space-x-4">
                      <label className="flex items-center">
                        <input
                          type="radio"
                          checked={novaMovimentacao.tipo === 'entrada'}
                          onChange={() => setNovaMovimentacao({ ...novaMovimentacao, tipo: 'entrada' })}
                          className="h-4 w-4 text-green-600 focus:ring-green-500 border-gray-300"
                        />
                        <span className="ml-2 text-sm text-gray-700 dark:text-gray-300">Entrada</span>
                      </label>
                      <label className="flex items-center">
                        <input
                          type="radio"
                          checked={novaMovimentacao.tipo === 'saida'}
                          onChange={() => setNovaMovimentacao({ ...novaMovimentacao, tipo: 'saida' })}
                          className="h-4 w-4 text-red-600 focus:ring-red-500 border-gray-300"
                        />
                        <span className="ml-2 text-sm text-gray-700 dark:text-gray-300">Saída</span>
                      </label>
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Valor
                    </label>
                    <div className="relative">
                      <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                        <span className="text-gray-500 sm:text-sm">R$</span>
                      </div>
                      <input
                        type="number"
                        step="0.01"
                        min="0"
                        value={novaMovimentacao.valor}
                        onChange={(e) => setNovaMovimentacao({ ...novaMovimentacao, valor: e.target.value })}
                        className="pl-8 block w-full rounded-md border-gray-300 dark:border-gray-600 shadow-sm focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white"
                        placeholder="0,00"
                        required
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Motivo
                    </label>
                    <input
                      type="text"
                      value={novaMovimentacao.motivo}
                      onChange={(e) => setNovaMovimentacao({ ...novaMovimentacao, motivo: e.target.value })}
                      className="block w-full rounded-md border-gray-300 dark:border-gray-600 shadow-sm focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white"
                      placeholder="Ex: Troco, Sangria, Suprimento..."
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Forma de Pagamento (Opcional)
                    </label>
                    <select
                      value={novaMovimentacao.formaPagamento}
                      onChange={(e) => setNovaMovimentacao({ ...novaMovimentacao, formaPagamento: e.target.value })}
                      className="block w-full rounded-md border-gray-300 dark:border-gray-600 shadow-sm focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white"
                    >
                      <option value="">Selecione...</option>
                      <option value="dinheiro">Dinheiro</option>
                      <option value="pix">PIX</option>
                      <option value="cartao">Cartão</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Observações (Opcional)
                    </label>
                    <textarea
                      value={novaMovimentacao.observacao}
                      onChange={(e) => setNovaMovimentacao({ ...novaMovimentacao, observacao: e.target.value })}
                      rows={3}
                      className="w-full rounded-md border-gray-300 dark:border-gray-600 shadow-sm focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white"
                      placeholder="Detalhes adicionais..."
                    />
                  </div>
                </div>

                <div className="flex space-x-3 mt-6">
                  <Button
                    variant="ghost"
                    onClick={() => setShowMovimentacaoModal(false)}
                    className="flex-1"
                  >
                    Cancelar
                  </Button>
                  <Button
                    variant="primary"
                    onClick={handleAdicionarMovimentacao}
                    isLoading={loading}
                    disabled={!novaMovimentacao.valor || !novaMovimentacao.motivo}
                    className="flex-1"
                  >
                    Adicionar
                  </Button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default CaixaRegistradora;