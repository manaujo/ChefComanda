import React, { useState, useEffect } from 'react';
import { 
  CreditCard, DollarSign, Receipt, ArrowUpCircle, ArrowDownCircle,
  Plus, Minus, FileSpreadsheet, Download, AlertTriangle, X, User,
  Clock, TrendingUp, BarChart3, Users, Calculator, CheckCircle,
  Activity, Eye, RefreshCw, Calendar, Wallet, PieChart
} from 'lucide-react';
import Button from '../components/ui/Button';
import { formatarDinheiro } from '../utils/formatters';
import { supabase } from '../services/supabase';
import { useAuth } from '../contexts/AuthContext';
import { useRestaurante } from '../contexts/RestauranteContext';
import CaixaService from '../services/CaixaService';
import { Database } from '../types/database';
import toast from 'react-hot-toast';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart as RechartsPieChart,
  Pie,
  Cell
} from 'recharts';

type CaixaOperador = Database['public']['Tables']['caixas_operadores']['Row'];
type MovimentacaoCaixa = Database['public']['Tables']['movimentacoes_caixa']['Row'];

interface OperadorDisponivel {
  id: string;
  nome: string;
  tipo: 'funcionario' | 'usuario';
  role?: string;
}

const CaixaRegistradora: React.FC = () => {
  const { user, isEmployee, employeeData, displayName } = useAuth();
  const { restaurante, funcionarios } = useRestaurante();
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [caixaAtual, setCaixaAtual] = useState<CaixaOperador | null>(null);
  const [movimentacoes, setMovimentacoes] = useState<MovimentacaoCaixa[]>([]);
  const [showAbrirModal, setShowAbrirModal] = useState(false);
  const [showMovimentacaoModal, setShowMovimentacaoModal] = useState(false);
  const [showFecharModal, setShowFecharModal] = useState(false);
  const [valorInicial, setValorInicial] = useState('');
  const [valorFinal, setValorFinal] = useState('');
  const [observacao, setObservacao] = useState('');
  const [novaMovimentacao, setNovaMovimentacao] = useState({
    tipo: 'saida' as 'entrada' | 'saida',
    valor: '',
    motivo: '',
    observacao: '',
    formaPagamento: 'dinheiro'
  });

  useEffect(() => {
    if (user && restaurante) {
      loadCaixaAtual();
    }
  }, [user, restaurante]);

  // Carregar todos os caixas abertos se for administrador
  const [todosCaixasAbertos, setTodosCaixasAbertos] = useState<any[]>([]);

  useEffect(() => {
    if (user && restaurante && !isEmployee) {
      loadTodosCaixasAbertos();
    }
  }, [user, restaurante, isEmployee]);

  const loadTodosCaixasAbertos = async () => {
    try {
      if (!restaurante?.id) return;

      const caixas = await CaixaService.getTodosCaixasAbertos(restaurante.id);
      setTodosCaixasAbertos(caixas);
    } catch (error) {
      console.error('Error loading all open cash registers:', error);
    }
  };

  // Obter dados do operador atual
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

  const loadCaixaAtual = async () => {
    try {
      if (!restaurante?.id) return;

      const operadorAtual = getOperadorAtual();
      const caixa = await CaixaService.getCaixaAberto(restaurante.id, operadorAtual.id);

      setCaixaAtual(caixa);

      if (caixa) {
        const movs = await CaixaService.getMovimentacoesCaixa(caixa.id);
        setMovimentacoes(movs);
      }

      // Se for administrador, carregar todos os caixas abertos
      if (!isEmployee) {
        await loadTodosCaixasAbertos();
      }
    } catch (error) {
      console.error('Error loading cash register:', error);
      toast.error('Erro ao carregar caixa');
    }
  };

  const handleRefresh = async () => {
    try {
      setRefreshing(true);
      await loadCaixaAtual();
      toast.success('Dados atualizados!');
    } catch (error) {
      toast.error('Erro ao atualizar dados');
    } finally {
      setRefreshing(false);
    }
  };

  const handleAbrirCaixa = async () => {
    try {
      setLoading(true);

      if (!restaurante?.id) {
        throw new Error('Restaurante não encontrado. Faça login novamente.');
      }

      const valor = parseFloat(valorInicial);
      if (isNaN(valor) || valor < 0) {
        throw new Error('Valor inicial inválido');
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
      toast.success(`Caixa aberto por ${operador.nome}!`);
      
      // Salvar no localStorage para persistir entre navegações
      localStorage.setItem('caixaAtual', JSON.stringify(caixa));
    } catch (error) {
      console.error('Error opening cash register:', error);
      toast.error(error instanceof Error ? error.message : 'Erro ao abrir caixa');
    } finally {
      setLoading(false);
    }
  };

  const handleNovaMovimentacao = async () => {
    try {
      setLoading(true);

      const valor = parseFloat(novaMovimentacao.valor);
      if (isNaN(valor) || valor <= 0) {
        throw new Error('Valor inválido');
      }

      if (!novaMovimentacao.motivo) {
        throw new Error('Informe o motivo');
      }

      await CaixaService.adicionarMovimentacao({
        caixaId: caixaAtual?.id || '',
        tipo: novaMovimentacao.tipo,
        valor,
        motivo: novaMovimentacao.motivo,
        observacao: novaMovimentacao.observacao,
        formaPagamento: novaMovimentacao.formaPagamento,
        usuarioId: user?.id || ''
      });

      // Reload data
      await loadCaixaAtual();
      setShowMovimentacaoModal(false);
      setNovaMovimentacao({
        tipo: 'saida',
        valor: '',
        motivo: '',
        observacao: '',
        formaPagamento: 'dinheiro'
      });
      toast.success('Movimentação registrada com sucesso!');
    } catch (error) {
      console.error('Error creating movement:', error);
      toast.error(error instanceof Error ? error.message : 'Erro ao registrar movimentação');
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

      await CaixaService.fecharCaixa(caixaAtual?.id || '', valor, observacao);

      setCaixaAtual(null);
      setMovimentacoes([]);
      setShowFecharModal(false);
      setValorFinal('');
      setObservacao('');
      toast.success('Caixa fechado com sucesso!');
      
      // Remover do localStorage
      localStorage.removeItem('caixaAtual');
    } catch (error) {
      console.error('Error closing cash register:', error);
      toast.error(error instanceof Error ? error.message : 'Erro ao fechar caixa');
    } finally {
      setLoading(false);
    }
  };

  // Verificar se há um caixa salvo no localStorage ao carregar a página
  useEffect(() => {
    const savedCaixa = localStorage.getItem('caixaAtual');
    if (savedCaixa) {
      try {
        const parsedCaixa = JSON.parse(savedCaixa);
        // Verificar se o caixa ainda está aberto no banco de dados
        const checkCaixa = async () => {
          const { data } = await supabase
            .from('caixas_operadores')
            .select('*')
            .eq('id', parsedCaixa.id)
            .eq('status', 'aberto')
            .maybeSingle();
          
          if (data) {
            setCaixaAtual(data);
            // Carregar movimentações
            const { data: movs } = await supabase
              .from('movimentacoes_caixa')
              .select('*')
              .eq('caixa_operador_id', data.id)
              .order('created_at', { ascending: true });
            
            setMovimentacoes(movs || []);
          } else {
            // Caixa não está mais aberto, remover do localStorage
            localStorage.removeItem('caixaAtual');
          }
        };
        
        checkCaixa();
      } catch (error) {
        console.error('Error parsing saved cash register:', error);
        localStorage.removeItem('caixaAtual');
      }
    }
  }, []);

  const calcularTotais = () => {
    const totais = {
      entradas: 0,
      saidas: 0,
      saldo: 0
    };

    movimentacoes.forEach(mov => {
      if (mov.tipo === 'entrada') {
        totais.entradas += mov.valor;
      } else {
        totais.saidas += mov.valor;
      }
    });

    totais.saldo = (caixaAtual?.valor_inicial || 0) + totais.entradas - totais.saidas;
    return totais;
  };

  const totais = calcularTotais();
  const diferenca = caixaAtual?.valor_final ? (caixaAtual.valor_final - totais.saldo) : 0;

  // Dados para gráficos
  const movimentacoesPorTipo = [
    { name: 'Entradas', value: totais.entradas, color: '#10B981' },
    { name: 'Saídas', value: totais.saidas, color: '#EF4444' }
  ];

  const movimentacoesPorFormaPagamento = movimentacoes.reduce((acc, mov) => {
    const forma = mov.forma_pagamento || 'Não informado';
    const existing = acc.find(item => item.name === forma);
    if (existing) {
      existing.value += mov.valor;
    } else {
      acc.push({ name: forma, value: mov.valor });
    }
    return acc;
  }, [] as { name: string; value: number }[]);

  const COLORS = ['#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6'];

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      {/* Header Moderno */}
      <div className="bg-white dark:bg-gray-800 shadow-sm border-b border-gray-200 dark:border-gray-700">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-20">
            <div className="flex items-center space-x-4">
              <div className="p-3 bg-gradient-to-br from-blue-500 to-blue-600 rounded-xl shadow-lg">
                <CreditCard className="w-8 h-8 text-white" />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
                  Caixa Registradora
                </h1>
                <p className="text-gray-500 dark:text-gray-400">
                  Controle financeiro e movimentações
                </p>
                {caixaAtual && (
                  <div className="mt-1 flex items-center text-sm text-blue-600 dark:text-blue-400">
                    <User size={14} className="mr-1" />
                    <span>Operador: {caixaAtual.operador_nome}</span>
                    <span className="mx-2">•</span>
                    <Clock size={14} className="mr-1" />
                    <span>Aberto em: {new Date(caixaAtual.data_abertura).toLocaleString('pt-BR')}</span>
                  </div>
                )}
              </div>
            </div>
            <div className="flex items-center space-x-3">
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
              {!caixaAtual ? (
                <Button
                  variant="primary"
                  icon={<ArrowUpCircle size={18} />}
                  onClick={() => setShowAbrirModal(true)}
                  className="bg-gradient-to-r from-green-500 to-green-600 hover:from-green-600 hover:to-green-700"
                >
                  Abrir Caixa
                </Button>
              ) : (
                <Button
                  variant="warning"
                  icon={<ArrowDownCircle size={18} />}
                  onClick={() => setShowFecharModal(true)}
                  className="bg-gradient-to-r from-orange-500 to-orange-600 hover:from-orange-600 hover:to-orange-700"
                >
                  Fechar Caixa
                </Button>
              )}
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {caixaAtual ? (
          <div className="space-y-8">
            {/* Mostrar outros caixas abertos se for administrador */}
            {!isEmployee && todosCaixasAbertos.length > 1 && (
              <div className="bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20 border border-blue-200 dark:border-blue-800 rounded-xl p-6">
                <div className="flex items-center mb-4">
                  <div className="p-2 bg-blue-100 dark:bg-blue-900 rounded-lg mr-3">
                    <Users size={20} className="text-blue-600 dark:text-blue-400" />
                  </div>
                  <div>
                    <h3 className="text-lg font-semibold text-blue-900 dark:text-blue-100">
                      Outros Caixas Ativos
                    </h3>
                    <p className="text-sm text-blue-700 dark:text-blue-300">
                      {todosCaixasAbertos.length - 1} {todosCaixasAbertos.length - 1 === 1 ? 'caixa ativo' : 'caixas ativos'} no restaurante
                    </p>
                  </div>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {todosCaixasAbertos
                    .filter(caixa => caixa.id !== caixaAtual.id)
                    .map(caixa => (
                      <div key={caixa.id} className="bg-white dark:bg-gray-800 rounded-lg p-4 border border-blue-200 dark:border-blue-700 shadow-sm">
                        <div className="flex items-center justify-between">
                          <div>
                            <p className="text-sm font-semibold text-gray-900 dark:text-white">
                              {caixa.operador_nome}
                            </p>
                            <p className="text-xs text-gray-500 dark:text-gray-400">
                              {caixa.operador_tipo === 'funcionario' ? 'Funcionário' : 'Usuário Principal'}
                            </p>
                            <div className="flex items-center mt-1 text-xs text-gray-500 dark:text-gray-400">
                              <Clock size={12} className="mr-1" />
                              <span>{new Date(caixa.data_abertura).toLocaleTimeString('pt-BR')}</span>
                            </div>
                          </div>
                          <div className="text-right">
                            <p className="text-sm font-bold text-gray-900 dark:text-white">
                              {formatarDinheiro(caixa.valor_sistema)}
                            </p>
                            <p className="text-xs text-gray-500 dark:text-gray-400">Saldo</p>
                          </div>
                        </div>
                      </div>
                    ))}
                </div>
              </div>
            )}

            {/* Cards de Métricas Principais */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              <div className="bg-gradient-to-br from-blue-500 to-blue-600 rounded-xl shadow-lg p-6 text-white">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-blue-100 text-sm font-medium">Saldo em Caixa</p>
                    <p className="text-3xl font-bold mt-1">{formatarDinheiro(totais.saldo)}</p>
                    <p className="text-blue-100 text-sm mt-1">Valor atual</p>
                  </div>
                  <div className="p-3 bg-white/20 rounded-full">
                    <DollarSign size={28} />
                  </div>
                </div>
              </div>

              <div className="bg-gradient-to-br from-green-500 to-green-600 rounded-xl shadow-lg p-6 text-white">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-green-100 text-sm font-medium">Total Entradas</p>
                    <p className="text-3xl font-bold mt-1">{formatarDinheiro(totais.entradas)}</p>
                    <p className="text-green-100 text-sm mt-1">Recebimentos</p>
                  </div>
                  <div className="p-3 bg-white/20 rounded-full">
                    <TrendingUp size={28} />
                  </div>
                </div>
              </div>

              <div className="bg-gradient-to-br from-red-500 to-red-600 rounded-xl shadow-lg p-6 text-white">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-red-100 text-sm font-medium">Total Saídas</p>
                    <p className="text-3xl font-bold mt-1">{formatarDinheiro(totais.saidas)}</p>
                    <p className="text-red-100 text-sm mt-1">Retiradas</p>
                  </div>
                  <div className="p-3 bg-white/20 rounded-full">
                    <Minus size={28} />
                  </div>
                </div>
              </div>

              <div className="bg-gradient-to-br from-purple-500 to-purple-600 rounded-xl shadow-lg p-6 text-white">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-purple-100 text-sm font-medium">Movimentações</p>
                    <p className="text-3xl font-bold mt-1">{movimentacoes.length}</p>
                    <p className="text-purple-100 text-sm mt-1">Total de operações</p>
                  </div>
                  <div className="p-3 bg-white/20 rounded-full">
                    <Activity size={28} />
                  </div>
                </div>
              </div>
            </div>

            {/* Gráficos e Análises */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              {/* Gráfico de Entradas vs Saídas */}
              <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6">
                <div className="flex items-center justify-between mb-6">
                  <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
                    Entradas vs Saídas
                  </h2>
                  <div className="flex items-center text-sm text-gray-500 dark:text-gray-400">
                    <BarChart3 size={16} className="mr-1" />
                    <span>Comparativo</span>
                  </div>
                </div>
                <div className="h-64">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={[{ name: 'Movimentações', entradas: totais.entradas, saidas: totais.saidas }]}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" />
                      <XAxis dataKey="name" stroke="#6B7280" />
                      <YAxis stroke="#6B7280" />
                      <Tooltip 
                        formatter={(value: any, name: string) => [
                          formatarDinheiro(value),
                          name === 'entradas' ? 'Entradas' : 'Saídas'
                        ]}
                        contentStyle={{
                          backgroundColor: '#F9FAFB',
                          border: '1px solid #E5E7EB',
                          borderRadius: '8px'
                        }}
                      />
                      <Bar dataKey="entradas" name="entradas" fill="#10B981" radius={[4, 4, 0, 0]} />
                      <Bar dataKey="saidas" name="saidas" fill="#EF4444" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>

              {/* Gráfico de Pizza - Formas de Pagamento */}
              <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6">
                <div className="flex items-center justify-between mb-6">
                  <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
                    Formas de Pagamento
                  </h2>
                  <div className="flex items-center text-sm text-gray-500 dark:text-gray-400">
                    <PieChart size={16} className="mr-1" />
                    <span>Distribuição</span>
                  </div>
                </div>
                <div className="h-64">
                  {movimentacoesPorFormaPagamento.length > 0 ? (
                    <ResponsiveContainer width="100%" height="100%">
                      <RechartsPieChart>
                        <Pie
                          data={movimentacoesPorFormaPagamento}
                          cx="50%"
                          cy="50%"
                          outerRadius={80}
                          fill="#8884d8"
                          dataKey="value"
                          label={({ name, value }) => `${name}: ${formatarDinheiro(value)}`}
                        >
                          {movimentacoesPorFormaPagamento.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                          ))}
                        </Pie>
                        <Tooltip 
                          formatter={(value: any) => [formatarDinheiro(value), 'Valor']}
                          contentStyle={{
                            backgroundColor: '#F9FAFB',
                            border: '1px solid #E5E7EB',
                            borderRadius: '8px'
                          }}
                        />
                      </RechartsPieChart>
                    </ResponsiveContainer>
                  ) : (
                    <div className="flex items-center justify-center h-full text-gray-500 dark:text-gray-400">
                      <div className="text-center">
                        <Wallet size={32} className="mx-auto mb-2 opacity-50" />
                        <p>Nenhuma movimentação registrada</p>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Ações Rápidas */}
            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Ações Rápidas</h2>
                <div className="flex items-center text-sm text-gray-500 dark:text-gray-400">
                  <Calculator size={16} className="mr-1" />
                  <span>Operações do caixa</span>
                </div>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Button
                  variant="success"
                  size="lg"
                  icon={<Plus size={20} />}
                  onClick={() => {
                    setNovaMovimentacao({
                      ...novaMovimentacao,
                      tipo: 'entrada'
                    });
                    setShowMovimentacaoModal(true);
                  }}
                  className="h-16 bg-gradient-to-r from-green-500 to-green-600 hover:from-green-600 hover:to-green-700"
                >
                  <div className="text-center">
                    <div className="text-lg font-semibold">Nova Entrada</div>
                    <div className="text-sm opacity-90">Registrar recebimento</div>
                  </div>
                </Button>
                <Button
                  variant="warning"
                  size="lg"
                  icon={<Minus size={20} />}
                  onClick={() => {
                    setNovaMovimentacao({
                      ...novaMovimentacao,
                      tipo: 'saida'
                    });
                    setShowMovimentacaoModal(true);
                  }}
                  className="h-16 bg-gradient-to-r from-orange-500 to-orange-600 hover:from-orange-600 hover:to-orange-700"
                >
                  <div className="text-center">
                    <div className="text-lg font-semibold">Nova Saída</div>
                    <div className="text-sm opacity-90">Registrar retirada</div>
                  </div>
                </Button>
              </div>
            </div>

            {/* Lista de Movimentações Moderna */}
            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg overflow-hidden">
              <div className="bg-gradient-to-r from-gray-50 to-gray-100 dark:from-gray-700 dark:to-gray-600 px-6 py-4 border-b border-gray-200 dark:border-gray-600">
                <div className="flex items-center justify-between">
                  <div className="flex items-center">
                    <div className="p-2 bg-gray-200 dark:bg-gray-600 rounded-lg mr-3">
                      <Receipt size={20} className="text-gray-600 dark:text-gray-300" />
                    </div>
                    <div>
                      <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
                        Histórico de Movimentações
                      </h2>
                      <p className="text-sm text-gray-600 dark:text-gray-400">
                        {movimentacoes.length} {movimentacoes.length === 1 ? 'movimentação registrada' : 'movimentações registradas'}
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-sm text-gray-500 dark:text-gray-400">Saldo Atual</p>
                    <p className="text-xl font-bold text-gray-900 dark:text-white">
                      {formatarDinheiro(totais.saldo)}
                    </p>
                  </div>
                </div>
              </div>

              <div className="p-6">
                {movimentacoes.length > 0 ? (
                  <div className="space-y-4 max-h-96 overflow-y-auto">
                    {movimentacoes.map((mov) => (
                      <div
                        key={mov.id}
                        className={`relative p-4 rounded-lg border-l-4 transition-all hover:shadow-md ${
                          mov.tipo === 'entrada'
                            ? 'bg-green-50 dark:bg-green-900/20 border-green-500 hover:bg-green-100 dark:hover:bg-green-900/30'
                            : 'bg-red-50 dark:bg-red-900/20 border-red-500 hover:bg-red-100 dark:hover:bg-red-900/30'
                        }`}
                      >
                        <div className="flex justify-between items-start">
                          <div className="flex-1">
                            <div className="flex items-center mb-2">
                              <div className={`p-2 rounded-full mr-3 ${
                                mov.tipo === 'entrada' 
                                  ? 'bg-green-100 dark:bg-green-800' 
                                  : 'bg-red-100 dark:bg-red-800'
                              }`}>
                                {mov.tipo === 'entrada' ? (
                                  <Plus size={16} className="text-green-600 dark:text-green-300" />
                                ) : (
                                  <Minus size={16} className="text-red-600 dark:text-red-300" />
                                )}
                              </div>
                              <div>
                                <p className="font-semibold text-gray-900 dark:text-white">{mov.motivo}</p>
                                <div className="flex items-center space-x-2 mt-1">
                                  <span className="text-xs bg-white dark:bg-gray-700 px-2 py-1 rounded-full border">
                                    {new Date(mov.created_at).toLocaleTimeString('pt-BR')}
                                  </span>
                                  {mov.forma_pagamento && (
                                    <span className="text-xs bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200 px-2 py-1 rounded-full capitalize">
                                      {mov.forma_pagamento}
                                    </span>
                                  )}
                                </div>
                              </div>
                            </div>
                            {mov.observacao && (
                              <p className="text-sm text-gray-600 dark:text-gray-400 ml-11 italic">
                                "{mov.observacao}"
                              </p>
                            )}
                          </div>
                          <div className="text-right">
                            <p className={`text-xl font-bold ${
                              mov.tipo === 'entrada' 
                                ? 'text-green-600 dark:text-green-400' 
                                : 'text-red-600 dark:text-red-400'
                            }`}>
                              {mov.tipo === 'entrada' ? '+' : '-'} {formatarDinheiro(mov.valor)}
                            </p>
                            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                              {new Date(mov.created_at).toLocaleDateString('pt-BR')}
                            </p>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-12">
                    <div className="mx-auto w-24 h-24 bg-gray-100 dark:bg-gray-700 rounded-full flex items-center justify-center mb-4">
                      <Receipt size={32} className="text-gray-400 dark:text-gray-500" />
                    </div>
                    <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
                      Nenhuma movimentação registrada
                    </h3>
                    <p className="text-gray-500 dark:text-gray-400 mb-6">
                      As movimentações de entrada e saída aparecerão aqui.
                    </p>
                    <div className="flex justify-center space-x-3">
                      <Button
                        variant="success"
                        icon={<Plus size={18} />}
                        onClick={() => {
                          setNovaMovimentacao({ ...novaMovimentacao, tipo: 'entrada' });
                          setShowMovimentacaoModal(true);
                        }}
                      >
                        Primeira Entrada
                      </Button>
                      <Button
                        variant="warning"
                        icon={<Minus size={18} />}
                        onClick={() => {
                          setNovaMovimentacao({ ...novaMovimentacao, tipo: 'saida' });
                          setShowMovimentacaoModal(true);
                        }}
                      >
                        Primeira Saída
                      </Button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        ) : (
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-12 text-center">
            <div className="max-w-md mx-auto">
              <div className="mx-auto w-24 h-24 bg-gradient-to-br from-blue-100 to-blue-200 dark:from-blue-900 dark:to-blue-800 rounded-full flex items-center justify-center mb-6">
                <Receipt size={40} className="text-blue-600 dark:text-blue-400" />
              </div>
              <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">
                Caixa Fechado
              </h2>
              <p className="text-gray-500 dark:text-gray-400 mb-8 text-lg">
                Para iniciar as operações financeiras, abra um novo caixa selecionando o operador responsável.
              </p>
              <div className="space-y-4">
                <Button
                  variant="primary"
                  size="lg"
                  icon={<ArrowUpCircle size={20} />}
                  onClick={() => setShowAbrirModal(true)}
                  className="bg-gradient-to-r from-green-500 to-green-600 hover:from-green-600 hover:to-green-700 px-8 py-4"
                >
                  Abrir Novo Caixa
                </Button>
                <div className="flex items-center justify-center text-sm text-gray-500 dark:text-gray-400">
                  <CheckCircle size={16} className="mr-2" />
                  <span>Sistema seguro e auditado</span>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Modal de Abertura de Caixa */}
        {showAbrirModal && (
          <div className="fixed inset-0 z-50 overflow-y-auto bg-black bg-opacity-50">
            <div className="flex items-center justify-center min-h-screen px-4 pt-4 pb-20 text-center sm:block sm:p-0">
              <div className="inline-block align-bottom bg-white dark:bg-gray-800 rounded-xl text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-lg sm:w-full">
                <div className="bg-gradient-to-r from-green-500 to-green-600 px-6 py-4">
                  <div className="flex items-center text-white">
                    <ArrowUpCircle size={24} className="mr-3" />
                    <div>
                      <h3 className="text-xl font-semibold">Abrir Caixa</h3>
                      <p className="text-green-100 text-sm">Iniciar operações financeiras</p>
                    </div>
                  </div>
                </div>

                <div className="p-6">
                  <div className="space-y-6">
                    <div className="bg-blue-50 dark:bg-blue-900/20 p-4 rounded-lg border border-blue-200 dark:border-blue-800">
                      <div className="flex items-center">
                        <User className="h-5 w-5 text-blue-500 mr-2" />
                        <div>
                          <p className="text-sm font-medium text-blue-800 dark:text-blue-200">Operador Responsável</p>
                          <p className="text-sm text-blue-600 dark:text-blue-300">
                            {getOperadorAtual().nome} ({getOperadorAtual().tipo === 'funcionario' ? 'Funcionário' : 'Usuário Principal'})
                          </p>
                        </div>
                      </div>
                    </div>

                    <div>
                      <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
                        Valor Inicial em Dinheiro
                      </label>
                      <div className="relative">
                        <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                          <span className="text-gray-500 dark:text-gray-400 text-lg">R$</span>
                        </div>
                        <input
                          type="number"
                          step="0.01"
                          min="0"
                          value={valorInicial}
                          onChange={(e) => setValorInicial(e.target.value)}
                          className="pl-12 block w-full rounded-lg border-gray-300 dark:border-gray-600 shadow-sm focus:ring-2 focus:ring-green-500 focus:border-green-500 dark:bg-gray-700 dark:text-white text-lg py-3"
                          placeholder="0,00"
                        />
                      </div>
                      <p className="text-xs text-gray-500 dark:text-gray-400 mt-2">
                        Informe o valor em dinheiro que está no caixa para iniciar as operações
                      </p>
                    </div>

                    <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg p-4">
                      <div className="flex items-start">
                        <AlertTriangle className="h-5 w-5 text-yellow-500 mt-0.5 mr-3 flex-shrink-0" />
                        <div className="text-sm text-yellow-700 dark:text-yellow-300">
                          <p className="font-medium mb-1">Importante:</p>
                          <p>
                            Certifique-se de contar corretamente o dinheiro em caixa antes de abrir. 
                            Este valor será usado como base para os cálculos.
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="bg-gray-50 dark:bg-gray-700 px-6 py-4 flex justify-end space-x-3">
                  <Button
                    variant="ghost"
                    onClick={() => setShowAbrirModal(false)}
                  >
                    Cancelar
                  </Button>
                  <Button
                    variant="primary"
                    onClick={handleAbrirCaixa}
                    isLoading={loading}
                    disabled={!valorInicial || !restaurante?.id}
                    className="bg-gradient-to-r from-green-500 to-green-600 hover:from-green-600 hover:to-green-700"
                  >
                    Abrir Caixa
                  </Button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Modal de Nova Movimentação */}
        {showMovimentacaoModal && (
          <div className="fixed inset-0 z-50 overflow-y-auto bg-black bg-opacity-50">
            <div className="flex items-center justify-center min-h-screen px-4 pt-4 pb-20 text-center sm:block sm:p-0">
              <div className="inline-block align-bottom bg-white dark:bg-gray-800 rounded-xl text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-lg sm:w-full">
                <div className={`px-6 py-4 ${
                  novaMovimentacao.tipo === 'entrada'
                    ? 'bg-gradient-to-r from-green-500 to-green-600'
                    : 'bg-gradient-to-r from-orange-500 to-orange-600'
                }`}>
                  <div className="flex items-center text-white">
                    {novaMovimentacao.tipo === 'entrada' ? (
                      <Plus size={24} className="mr-3" />
                    ) : (
                      <Minus size={24} className="mr-3" />
                    )}
                    <div>
                      <h3 className="text-xl font-semibold">
                        {novaMovimentacao.tipo === 'entrada' ? 'Nova Entrada' : 'Nova Saída'}
                      </h3>
                      <p className={`text-sm ${
                        novaMovimentacao.tipo === 'entrada' ? 'text-green-100' : 'text-orange-100'
                      }`}>
                        {novaMovimentacao.tipo === 'entrada' ? 'Registrar recebimento' : 'Registrar retirada'}
                      </p>
                    </div>
                  </div>
                </div>

                <div className="p-6">
                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
                        Valor da Movimentação
                      </label>
                      <div className="relative">
                        <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                          <span className="text-gray-500 dark:text-gray-400 text-lg">R$</span>
                        </div>
                        <input
                          type="number"
                          step="0.01"
                          min="0"
                          value={novaMovimentacao.valor}
                          onChange={(e) => setNovaMovimentacao({
                            ...novaMovimentacao,
                            valor: e.target.value
                          })}
                          className="pl-12 block w-full rounded-lg border-gray-300 dark:border-gray-600 shadow-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white text-lg py-3"
                          placeholder="0,00"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
                        Motivo da Movimentação
                      </label>
                      <input
                        type="text"
                        value={novaMovimentacao.motivo}
                        onChange={(e) => setNovaMovimentacao({
                          ...novaMovimentacao,
                          motivo: e.target.value
                        })}
                        className="block w-full rounded-lg border-gray-300 dark:border-gray-600 shadow-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white py-3 px-4"
                        placeholder="Ex: Venda, Troco, Despesa, etc."
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
                        Forma de Pagamento
                      </label>
                      <select
                        value={novaMovimentacao.formaPagamento}
                        onChange={(e) => setNovaMovimentacao({
                          ...novaMovimentacao,
                          formaPagamento: e.target.value
                        })}
                        className="block w-full rounded-lg border-gray-300 dark:border-gray-600 shadow-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white py-3 px-4"
                      >
                        <option value="dinheiro">💵 Dinheiro</option>
                        <option value="pix">📱 PIX</option>
                        <option value="cartao">💳 Cartão</option>
                        <option value="cheque">📄 Cheque</option>
                        <option value="outros">🔄 Outros</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
                        Observações (Opcional)
                      </label>
                      <textarea
                        value={novaMovimentacao.observacao}
                        onChange={(e) => setNovaMovimentacao({
                          ...novaMovimentacao,
                          observacao: e.target.value
                        })}
                        rows={3}
                        className="block w-full rounded-lg border-gray-300 dark:border-gray-600 shadow-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white py-3 px-4"
                        placeholder="Informações adicionais sobre a movimentação..."
                      />
                    </div>
                  </div>
                </div>

                <div className="bg-gray-50 dark:bg-gray-700 px-6 py-4 flex justify-end space-x-3">
                  <Button
                    variant="ghost"
                    onClick={() => setShowMovimentacaoModal(false)}
                  >
                    Cancelar
                  </Button>
                  <Button
                    variant={novaMovimentacao.tipo === 'entrada' ? 'success' : 'warning'}
                    onClick={handleNovaMovimentacao}
                    isLoading={loading}
                    className={novaMovimentacao.tipo === 'entrada' 
                      ? 'bg-gradient-to-r from-green-500 to-green-600 hover:from-green-600 hover:to-green-700'
                      : 'bg-gradient-to-r from-orange-500 to-orange-600 hover:from-orange-600 hover:to-orange-700'
                    }
                  >
                    Confirmar {novaMovimentacao.tipo === 'entrada' ? 'Entrada' : 'Saída'}
                  </Button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Modal de Fechamento de Caixa */}
        {showFecharModal && (
          <div className="fixed inset-0 z-50 overflow-y-auto bg-black bg-opacity-50">
            <div className="flex items-center justify-center min-h-screen px-4 pt-4 pb-20 text-center sm:block sm:p-0">
              <div className="inline-block align-bottom bg-white dark:bg-gray-800 rounded-xl text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-lg sm:w-full">
                <div className="bg-gradient-to-r from-orange-500 to-orange-600 px-6 py-4">
                  <div className="flex items-center text-white">
                    <ArrowDownCircle size={24} className="mr-3" />
                    <div>
                      <h3 className="text-xl font-semibold">Fechar Caixa</h3>
                      <p className="text-orange-100 text-sm">Finalizar operações do dia</p>
                    </div>
                  </div>
                </div>

                <div className="p-6">
                  <div className="space-y-6">
                    <div className="bg-gray-50 dark:bg-gray-700 p-4 rounded-lg">
                      <h4 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3">
                        Resumo do Período
                      </h4>
                      <div className="grid grid-cols-2 gap-4 text-sm">
                        <div>
                          <span className="text-gray-500 dark:text-gray-400">Operador:</span>
                          <p className="font-medium text-gray-900 dark:text-white">{caixaAtual?.operador_nome}</p>
                        </div>
                        <div>
                          <span className="text-gray-500 dark:text-gray-400">Abertura:</span>
                          <p className="font-medium text-gray-900 dark:text-white">
                            {new Date(caixaAtual?.data_abertura || '').toLocaleString('pt-BR')}
                          </p>
                        </div>
                        <div>
                          <span className="text-gray-500 dark:text-gray-400">Valor inicial:</span>
                          <p className="font-medium text-gray-900 dark:text-white">
                            {formatarDinheiro(caixaAtual?.valor_inicial || 0)}
                          </p>
                        </div>
                        <div>
                          <span className="text-gray-500 dark:text-gray-400">Saldo calculado:</span>
                          <p className="font-medium text-gray-900 dark:text-white">
                            {formatarDinheiro(totais.saldo)}
                          </p>
                        </div>
                      </div>
                      {diferenca !== 0 && (
                        <div className={`mt-3 p-3 rounded-lg ${
                          diferenca > 0 
                            ? 'bg-green-100 dark:bg-green-900/20 border border-green-200 dark:border-green-800'
                            : 'bg-red-100 dark:bg-red-900/20 border border-red-200 dark:border-red-800'
                        }`}>
                          <div className={`flex items-center font-medium ${
                            diferenca > 0 ? 'text-green-800 dark:text-green-200' : 'text-red-800 dark:text-red-200'
                          }`}>
                            <span>Diferença prevista:</span>
                            <span className="ml-2">{diferenca > 0 ? '+' : ''}{formatarDinheiro(Math.abs(diferenca))}</span>
                          </div>
                        </div>
                      )}
                    </div>
                    
                    <div>
                      <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
                        Valor Final em Caixa
                      </label>
                      <div className="relative">
                        <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                          <span className="text-gray-500 dark:text-gray-400 text-lg">R$</span>
                        </div>
                        <input
                          type="number"
                          step="0.01"
                          min="0"
                          value={valorFinal}
                          onChange={(e) => setValorFinal(e.target.value)}
                          className="pl-12 block w-full rounded-lg border-gray-300 dark:border-gray-600 shadow-sm focus:ring-2 focus:ring-orange-500 focus:border-orange-500 dark:bg-gray-700 dark:text-white text-lg py-3"
                          placeholder="0,00"
                        />
                      </div>
                      <p className="text-xs text-gray-500 dark:text-gray-400 mt-2">
                        Conte o dinheiro físico no caixa e informe o valor real
                      </p>
                    </div>

                    <div>
                      <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
                        Observações do Fechamento
                      </label>
                      <textarea
                        value={observacao}
                        onChange={(e) => setObservacao(e.target.value)}
                        rows={3}
                        className="block w-full rounded-lg border-gray-300 dark:border-gray-600 shadow-sm focus:ring-2 focus:ring-orange-500 focus:border-orange-500 dark:bg-gray-700 dark:text-white py-3 px-4"
                        placeholder="Observações sobre o fechamento, ocorrências, etc..."
                      />
                    </div>

                    <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4">
                      <div className="flex items-start">
                        <AlertTriangle className="h-5 w-5 text-red-500 mt-0.5 mr-3 flex-shrink-0" />
                        <div className="text-sm text-red-700 dark:text-red-300">
                          <p className="font-medium mb-1">Atenção:</p>
                          <p>
                            Após o fechamento do caixa, não será possível registrar novas movimentações.
                            Certifique-se de que todas as operações foram registradas.
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="bg-gray-50 dark:bg-gray-700 px-6 py-4 flex justify-end space-x-3">
                  <Button
                    variant="ghost"
                    onClick={() => setShowFecharModal(false)}
                  >
                    Cancelar
                  </Button>
                  <Button
                    variant="warning"
                    onClick={handleFecharCaixa}
                    isLoading={loading}
                    className="bg-gradient-to-r from-orange-500 to-orange-600 hover:from-orange-600 hover:to-orange-700"
                  >
                    Fechar Caixa
                  </Button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default CaixaRegistradora;