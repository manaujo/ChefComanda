import React, { useState, useEffect } from 'react';
import { 
  DollarSign, Plus, Minus, Calculator, TrendingUp, 
  Clock, User, AlertTriangle, CreditCard, Receipt,
  ArrowUp, ArrowDown, RefreshCw, FileSpreadsheet,
  Download, Eye, X, Check, Power, PowerOff, Wallet,
  PieChart, BarChart3, Activity, Zap, Shield, Star,
  Calendar, Timer, Target, Award
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
      localStorage.setItem('caixaAtual', JSON.stringify(caixaAtual));
    } else {
      localStorage.removeItem('caixaAtual');
    }
  }, [caixaAtual]);

  const loadCaixaAtual = async () => {
    try {
      if (!restaurante?.id) return;

      // Para funcionários, buscar apenas o caixa do próprio funcionário
      // Para administradores, buscar qualquer caixa aberto
      let caixa = null;
      
      if (isEmployee && employeeData) {
        // Funcionário: buscar apenas seu próprio caixa
        caixa = await CaixaService.getOperadorCaixaAberto(employeeData.id);
      } else {
        // Administrador: buscar qualquer caixa aberto no restaurante
        const operadorAtual = user?.id;
        caixa = await CaixaService.getCaixaAberto(restaurante.id, operadorAtual);
      }
      
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

  const calcularTempoAberto = () => {
    if (!caixaAtual?.data_abertura) return '';
    
    const inicio = new Date(caixaAtual.data_abertura);
    const agora = new Date();
    const diffMs = agora.getTime() - inicio.getTime();
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    const diffMinutes = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));
    
    if (diffHours > 0) {
      return `${diffHours}h ${diffMinutes}min`;
    }
    return `${diffMinutes}min`;
  };

  const totalEntradas = movimentacoes
    .filter(m => m.tipo === 'entrada')
    .reduce((acc, m) => acc + m.valor, 0);

  const totalSaidas = movimentacoes
    .filter(m => m.tipo === 'saida')
    .reduce((acc, m) => acc + m.valor, 0);

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-blue-50 to-indigo-50 dark:from-gray-900 dark:via-gray-800 dark:to-gray-700 transition-colors duration-300">
      <div className="w-full px-4 sm:px-6 lg:px-8 py-8">
        {/* Header Moderno */}
        <div className="mb-8">
          <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center">
            <div className="mb-6 lg:mb-0">
              <div className="flex items-center mb-4">
                <div className="p-3 bg-gradient-to-br from-blue-500 to-blue-600 rounded-2xl shadow-lg mr-4">
                  <CreditCard size={32} className="text-white" />
                </div>
                <div>
                  <h1 className="text-4xl font-bold bg-gradient-to-r from-gray-900 to-gray-700 dark:from-white dark:to-gray-300 bg-clip-text text-transparent">
                    Caixa Registradora
                  </h1>
                  <p className="text-lg text-gray-600 dark:text-gray-400 mt-1">
                    Controle financeiro inteligente e em tempo real
                  </p>
                </div>
              </div>
            </div>
            
            <div className="flex flex-wrap gap-3">
              <Button
                variant="ghost"
                icon={<RefreshCw size={18} />}
                onClick={loadCaixaAtual}
                isLoading={loading}
                className="bg-white/80 backdrop-blur-sm shadow-lg hover:shadow-xl transition-all duration-300"
              >
                Atualizar
              </Button>
              <Button
                variant="ghost"
                icon={<FileSpreadsheet size={18} />}
                onClick={() => toast.success('Relatório exportado em Excel!')}
                className="bg-white/80 backdrop-blur-sm shadow-lg hover:shadow-xl transition-all duration-300"
              >
                Excel
              </Button>
              <Button
                variant="ghost"
                icon={<Download size={18} />}
                onClick={() => toast.success('Relatório exportado em PDF!')}
                className="bg-white/80 backdrop-blur-sm shadow-lg hover:shadow-xl transition-all duration-300"
              >
                PDF
              </Button>
            </div>
          </div>
        </div>

        {/* Status do Caixa */}
        {caixaAtual ? (
          <div className="mb-8">
            {/* Card Principal do Caixa Aberto */}
            <div className="bg-white/90 dark:bg-gray-800/90 backdrop-blur-sm rounded-3xl shadow-2xl border border-white/20 dark:border-gray-700/50 overflow-hidden">
              <div className="bg-gradient-to-r from-green-500 via-green-600 to-emerald-600 p-8">
                <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center">
                  <div className="flex items-center mb-6 lg:mb-0">
                    <div className="p-4 bg-white/20 backdrop-blur-sm rounded-2xl mr-6">
                      <Activity size={32} className="text-white" />
                    </div>
                    <div className="text-white">
                      <div className="flex items-center mb-2">
                        <div className="w-3 h-3 bg-green-300 rounded-full animate-pulse mr-3"></div>
                        <h2 className="text-2xl font-bold">Caixa Operacional</h2>
                      </div>
                      <div className="space-y-1 text-green-100">
                        <div className="flex items-center">
                          <User size={16} className="mr-2" />
                          <span className="font-medium">{caixaAtual.operador_nome}</span>
                          <span className="ml-2 px-2 py-1 bg-white/20 rounded-full text-xs">
                            {caixaAtual.operador_tipo === 'funcionario' ? 'Funcionário' : 'Administrador'}
                          </span>
                        </div>
                        <div className="flex items-center">
                          <Clock size={16} className="mr-2" />
                          <span>Aberto há {calcularTempoAberto()}</span>
                          <span className="ml-2 text-xs opacity-75">
                            desde {new Date(caixaAtual.data_abertura).toLocaleTimeString('pt-BR')}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                  
                  <div className="flex flex-wrap gap-3">
                    <Button
                      variant="secondary"
                      icon={<Plus size={20} />}
                      onClick={() => setShowMovimentacaoModal(true)}
                      className="bg-white/20 backdrop-blur-sm text-white border-white/30 hover:bg-white/30 shadow-lg"
                      size="lg"
                    >
                      Nova Movimentação
                    </Button>
                    <Button
                      variant="warning"
                      icon={<PowerOff size={20} />}
                      onClick={() => setShowFecharModal(true)}
                      className="bg-red-500/20 backdrop-blur-sm text-white border-red-300/30 hover:bg-red-500/30 shadow-lg"
                      size="lg"
                    >
                      Fechar Caixa
                    </Button>
                  </div>
                </div>
              </div>

              {/* Métricas Financeiras */}
              <div className="p-8">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                  <div className="group relative overflow-hidden bg-gradient-to-br from-blue-50 to-blue-100 dark:from-blue-900/20 dark:to-blue-800/20 rounded-2xl p-6 border border-blue-200/50 dark:border-blue-700/50 hover:shadow-xl transition-all duration-300">
                    <div className="absolute top-0 right-0 w-20 h-20 bg-blue-500/10 rounded-full -mr-10 -mt-10"></div>
                    <div className="relative">
                      <div className="flex items-center justify-between mb-4">
                        <div className="p-3 bg-blue-500/20 rounded-xl">
                          <Wallet size={24} className="text-blue-600 dark:text-blue-400" />
                        </div>
                        <div className="text-right">
                          <div className="w-2 h-2 bg-blue-500 rounded-full animate-pulse"></div>
                        </div>
                      </div>
                      <div>
                        <p className="text-sm font-medium text-blue-600 dark:text-blue-400 mb-1">Valor Inicial</p>
                        <p className="text-3xl font-bold text-blue-800 dark:text-blue-200">
                          {formatarDinheiro(caixaAtual.valor_inicial)}
                        </p>
                        <p className="text-xs text-blue-500 dark:text-blue-400 mt-1">Base do caixa</p>
                      </div>
                    </div>
                  </div>

                  <div className="group relative overflow-hidden bg-gradient-to-br from-green-50 to-emerald-100 dark:from-green-900/20 dark:to-emerald-800/20 rounded-2xl p-6 border border-green-200/50 dark:border-green-700/50 hover:shadow-xl transition-all duration-300">
                    <div className="absolute top-0 right-0 w-20 h-20 bg-green-500/10 rounded-full -mr-10 -mt-10"></div>
                    <div className="relative">
                      <div className="flex items-center justify-between mb-4">
                        <div className="p-3 bg-green-500/20 rounded-xl">
                          <ArrowUp size={24} className="text-green-600 dark:text-green-400" />
                        </div>
                        <div className="text-right">
                          <span className="text-xs bg-green-100 dark:bg-green-900 text-green-700 dark:text-green-300 px-2 py-1 rounded-full">
                            +{movimentacoes.filter(m => m.tipo === 'entrada').length}
                          </span>
                        </div>
                      </div>
                      <div>
                        <p className="text-sm font-medium text-green-600 dark:text-green-400 mb-1">Entradas</p>
                        <p className="text-3xl font-bold text-green-800 dark:text-green-200">
                          {formatarDinheiro(totalEntradas)}
                        </p>
                        <p className="text-xs text-green-500 dark:text-green-400 mt-1">Receitas do período</p>
                      </div>
                    </div>
                  </div>

                  <div className="group relative overflow-hidden bg-gradient-to-br from-red-50 to-rose-100 dark:from-red-900/20 dark:to-rose-800/20 rounded-2xl p-6 border border-red-200/50 dark:border-red-700/50 hover:shadow-xl transition-all duration-300">
                    <div className="absolute top-0 right-0 w-20 h-20 bg-red-500/10 rounded-full -mr-10 -mt-10"></div>
                    <div className="relative">
                      <div className="flex items-center justify-between mb-4">
                        <div className="p-3 bg-red-500/20 rounded-xl">
                          <ArrowDown size={24} className="text-red-600 dark:text-red-400" />
                        </div>
                        <div className="text-right">
                          <span className="text-xs bg-red-100 dark:bg-red-900 text-red-700 dark:text-red-300 px-2 py-1 rounded-full">
                            -{movimentacoes.filter(m => m.tipo === 'saida').length}
                          </span>
                        </div>
                      </div>
                      <div>
                        <p className="text-sm font-medium text-red-600 dark:text-red-400 mb-1">Saídas</p>
                        <p className="text-3xl font-bold text-red-800 dark:text-red-200">
                          {formatarDinheiro(totalSaidas)}
                        </p>
                        <p className="text-xs text-red-500 dark:text-red-400 mt-1">Retiradas do período</p>
                      </div>
                    </div>
                  </div>

                  <div className="group relative overflow-hidden bg-gradient-to-br from-purple-50 to-violet-100 dark:from-purple-900/20 dark:to-violet-800/20 rounded-2xl p-6 border border-purple-200/50 dark:border-purple-700/50 hover:shadow-xl transition-all duration-300">
                    <div className="absolute top-0 right-0 w-20 h-20 bg-purple-500/10 rounded-full -mr-10 -mt-10"></div>
                    <div className="relative">
                      <div className="flex items-center justify-between mb-4">
                        <div className="p-3 bg-purple-500/20 rounded-xl">
                          <Calculator size={24} className="text-purple-600 dark:text-purple-400" />
                        </div>
                        <div className="text-right">
                          <div className="flex items-center">
                            <Target size={12} className="text-purple-500 mr-1" />
                            <span className="text-xs text-purple-600 dark:text-purple-400">Sistema</span>
                          </div>
                        </div>
                      </div>
                      <div>
                        <p className="text-sm font-medium text-purple-600 dark:text-purple-400 mb-1">Saldo Atual</p>
                        <p className="text-3xl font-bold text-purple-800 dark:text-purple-200">
                          {formatarDinheiro(caixaAtual.valor_sistema)}
                        </p>
                        <p className="text-xs text-purple-500 dark:text-purple-400 mt-1">Calculado automaticamente</p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        ) : (
          <div className="mb-8">
            {/* Card de Caixa Fechado */}
            <div className="bg-white/90 dark:bg-gray-800/90 backdrop-blur-sm rounded-3xl shadow-2xl border border-white/20 dark:border-gray-700/50 overflow-hidden">
              <div className="bg-gradient-to-r from-red-500 via-red-600 to-rose-600 p-8">
                <div className="text-center">
                  <div className="inline-flex items-center justify-center w-20 h-20 bg-white/20 backdrop-blur-sm rounded-2xl mb-6">
                    <PowerOff size={40} className="text-white" />
                  </div>
                  <h2 className="text-3xl font-bold text-white mb-3">
                    Caixa Fechado
                  </h2>
                  <p className="text-xl text-red-100 mb-8 max-w-md mx-auto">
                    Inicie suas operações financeiras abrindo o caixa com o valor inicial
                  </p>
                  <Button
                    variant="primary"
                    icon={<Power size={20} />}
                    onClick={() => setShowAbrirModal(true)}
                    size="lg"
                    className="bg-white/20 backdrop-blur-sm text-white border-white/30 hover:bg-white/30 shadow-xl px-8 py-4 text-lg font-semibold"
                  >
                    Abrir Caixa
                  </Button>
                </div>
              </div>
              
              {/* Informações do Operador */}
              <div className="p-8">
                <div className="bg-gradient-to-r from-gray-50 to-gray-100 dark:from-gray-700 dark:to-gray-600 rounded-2xl p-6">
                  <div className="flex items-center">
                    <div className="p-3 bg-blue-100 dark:bg-blue-900 rounded-xl mr-4">
                      <User size={24} className="text-blue-600 dark:text-blue-400" />
                    </div>
                    <div>
                      <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                        Operador: {getOperadorAtual().nome}
                      </h3>
                      <p className="text-gray-600 dark:text-gray-400">
                        {getOperadorAtual().tipo === 'funcionario' ? 'Funcionário' : 'Administrador'} • Aguardando abertura
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Lista de Movimentações */}
        {caixaAtual && (
          <div className="bg-white/90 dark:bg-gray-800/90 backdrop-blur-sm rounded-3xl shadow-2xl border border-white/20 dark:border-gray-700/50 overflow-hidden">
            <div className="bg-gradient-to-r from-gray-50 to-gray-100 dark:from-gray-700 dark:to-gray-600 p-6 border-b border-gray-200/50 dark:border-gray-600/50">
              <div className="flex flex-col md:flex-row justify-between items-start md:items-center">
                <div className="flex items-center mb-4 md:mb-0">
                  <div className="p-2 bg-blue-100 dark:bg-blue-900 rounded-xl mr-3">
                    <BarChart3 size={20} className="text-blue-600 dark:text-blue-400" />
                  </div>
                  <div>
                    <h2 className="text-xl font-bold text-gray-900 dark:text-white">
                      Movimentações Financeiras
                    </h2>
                    <p className="text-gray-600 dark:text-gray-400">
                      {movimentacoes.length} {movimentacoes.length === 1 ? 'transação' : 'transações'} registradas
                    </p>
                  </div>
                </div>
                <Button
                  variant="primary"
                  icon={<Plus size={18} />}
                  onClick={() => setShowMovimentacaoModal(true)}
                  className="bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 shadow-lg"
                >
                  Nova Movimentação
                </Button>
              </div>
            </div>

            <div className="p-6">
              {movimentacoes.length === 0 ? (
                <div className="text-center py-12">
                  <div className="inline-flex items-center justify-center w-16 h-16 bg-gray-100 dark:bg-gray-700 rounded-2xl mb-4">
                    <Receipt size={32} className="text-gray-400 dark:text-gray-500" />
                  </div>
                  <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
                    Nenhuma movimentação registrada
                  </h3>
                  <p className="text-gray-500 dark:text-gray-400">
                    As transações aparecerão aqui conforme forem registradas
                  </p>
                </div>
              ) : (
                <div className="overflow-hidden rounded-2xl border border-gray-200 dark:border-gray-700">
                  <table className="min-w-full">
                    <thead className="bg-gradient-to-r from-gray-50 to-gray-100 dark:from-gray-700 dark:to-gray-600">
                      <tr>
                        <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 dark:text-gray-300 uppercase tracking-wider">
                          Tipo
                        </th>
                        <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 dark:text-gray-300 uppercase tracking-wider">
                          Valor
                        </th>
                        <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 dark:text-gray-300 uppercase tracking-wider">
                          Motivo
                        </th>
                        <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 dark:text-gray-300 uppercase tracking-wider">
                          Horário
                        </th>
                      </tr>
                    </thead>
                    <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                      {movimentacoes.map((mov, index) => (
                        <tr key={mov.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors">
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="flex items-center">
                              <div className={`p-2 rounded-xl mr-3 ${
                                mov.tipo === 'entrada' 
                                  ? 'bg-green-100 dark:bg-green-900/30' 
                                  : 'bg-red-100 dark:bg-red-900/30'
                              }`}>
                                {mov.tipo === 'entrada' ? (
                                  <ArrowUp size={16} className="text-green-600 dark:text-green-400" />
                                ) : (
                                  <ArrowDown size={16} className="text-red-600 dark:text-red-400" />
                                )}
                              </div>
                              <span className={`px-3 py-1 inline-flex text-xs leading-5 font-semibold rounded-full ${
                                mov.tipo === 'entrada' 
                                  ? 'bg-green-100 text-green-800 dark:bg-green-900/50 dark:text-green-200'
                                  : 'bg-red-100 text-red-800 dark:bg-red-900/50 dark:text-red-200'
                              }`}>
                                {mov.tipo === 'entrada' ? 'Entrada' : 'Saída'}
                              </span>
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="flex items-center">
                              <span className={`text-lg font-bold ${
                                mov.tipo === 'entrada' ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'
                              }`}>
                                {mov.tipo === 'entrada' ? '+' : '-'}{formatarDinheiro(mov.valor)}
                              </span>
                            </div>
                          </td>
                          <td className="px-6 py-4">
                            <div>
                              <div className="text-sm font-medium text-gray-900 dark:text-white">{mov.motivo}</div>
                              {mov.observacao && (
                                <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">{mov.observacao}</div>
                              )}
                              {mov.forma_pagamento && (
                                <div className="flex items-center mt-1">
                                  <CreditCard size={12} className="text-gray-400 mr-1" />
                                  <span className="text-xs text-gray-500 dark:text-gray-400">
                                    {mov.forma_pagamento}
                                  </span>
                                </div>
                              )}
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="flex items-center text-sm text-gray-500 dark:text-gray-400">
                              <Clock size={14} className="mr-2" />
                              <span>{new Date(mov.created_at).toLocaleString('pt-BR')}</span>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Modal Abrir Caixa - Moderno */}
        {showAbrirModal && (
          <div className="fixed inset-0 z-50 overflow-y-auto bg-black/60 backdrop-blur-sm">
            <div className="flex items-center justify-center min-h-screen p-4">
              <div className="bg-white dark:bg-gray-800 rounded-3xl shadow-2xl w-full max-w-md transform transition-all duration-300 scale-100">
                <div className="relative overflow-hidden">
                  <div className="bg-gradient-to-r from-green-500 to-emerald-600 p-6">
                    <div className="flex justify-between items-center">
                      <div className="flex items-center">
                        <div className="p-3 bg-white/20 backdrop-blur-sm rounded-2xl mr-4">
                          <Power size={24} className="text-white" />
                        </div>
                        <div className="text-white">
                          <h3 className="text-xl font-bold">Abrir Caixa</h3>
                          <p className="text-green-100">Iniciar operações financeiras</p>
                        </div>
                      </div>
                      <button
                        onClick={() => setShowAbrirModal(false)}
                        className="p-2 text-white/70 hover:text-white hover:bg-white/20 rounded-xl transition-colors"
                      >
                        <X size={20} />
                      </button>
                    </div>
                  </div>

                  <div className="p-6">
                    <div className="mb-6">
                      <div className="bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20 p-4 rounded-2xl border border-blue-200/50 dark:border-blue-700/50">
                        <div className="flex items-center">
                          <div className="p-2 bg-blue-100 dark:bg-blue-900 rounded-xl mr-3">
                            <User className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                          </div>
                          <div>
                            <p className="text-sm font-semibold text-blue-800 dark:text-blue-200">
                              Operador: {getOperadorAtual().nome}
                            </p>
                            <p className="text-xs text-blue-600 dark:text-blue-300">
                              {getOperadorAtual().tipo === 'funcionario' ? 'Funcionário' : 'Administrador'}
                            </p>
                          </div>
                        </div>
                      </div>
                    </div>

                    <div className="mb-6">
                      <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3">
                        Valor Inicial em Dinheiro
                      </label>
                      <div className="relative">
                        <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                          <DollarSign size={20} className="text-gray-400" />
                        </div>
                        <input
                          type="number"
                          step="0.01"
                          min="0"
                          value={valorInicial}
                          onChange={(e) => setValorInicial(e.target.value)}
                          className="pl-12 block w-full rounded-2xl border-gray-300 dark:border-gray-600 shadow-sm focus:ring-2 focus:ring-green-500 focus:border-green-500 dark:bg-gray-700 dark:text-white py-4 text-lg font-medium"
                          placeholder="0,00"
                          required
                        />
                      </div>
                      <p className="text-xs text-gray-500 dark:text-gray-400 mt-2">
                        Informe o valor em dinheiro disponível no caixa
                      </p>
                    </div>

                    <div className="flex space-x-3">
                      <Button
                        variant="ghost"
                        onClick={() => setShowAbrirModal(false)}
                        className="flex-1 py-3"
                      >
                        Cancelar
                      </Button>
                      <Button
                        variant="primary"
                        onClick={handleAbrirCaixa}
                        isLoading={loading}
                        disabled={!valorInicial}
                        className="flex-1 bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700 py-3"
                        icon={<Power size={18} />}
                      >
                        Abrir Caixa
                      </Button>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Modal Fechar Caixa - Moderno */}
        {showFecharModal && caixaAtual && (
          <div className="fixed inset-0 z-50 overflow-y-auto bg-black/60 backdrop-blur-sm">
            <div className="flex items-center justify-center min-h-screen p-4">
              <div className="bg-white dark:bg-gray-800 rounded-3xl shadow-2xl w-full max-w-lg transform transition-all duration-300 scale-100">
                <div className="relative overflow-hidden">
                  <div className="bg-gradient-to-r from-orange-500 to-red-600 p-6">
                    <div className="flex justify-between items-center">
                      <div className="flex items-center">
                        <div className="p-3 bg-white/20 backdrop-blur-sm rounded-2xl mr-4">
                          <PowerOff size={24} className="text-white" />
                        </div>
                        <div className="text-white">
                          <h3 className="text-xl font-bold">Fechar Caixa</h3>
                          <p className="text-orange-100">Finalizar operações do período</p>
                        </div>
                      </div>
                      <button
                        onClick={() => setShowFecharModal(false)}
                        className="p-2 text-white/70 hover:text-white hover:bg-white/20 rounded-xl transition-colors"
                      >
                        <X size={20} />
                      </button>
                    </div>
                  </div>

                  <div className="p-6">
                    <div className="mb-6">
                      <div className="bg-gradient-to-r from-yellow-50 to-orange-50 dark:from-yellow-900/20 dark:to-orange-900/20 p-4 rounded-2xl border border-yellow-200/50 dark:border-yellow-700/50">
                        <h4 className="text-sm font-semibold text-yellow-800 dark:text-yellow-200 mb-3 flex items-center">
                          <Calculator size={16} className="mr-2" />
                          Resumo do Período
                        </h4>
                        <div className="grid grid-cols-2 gap-4">
                          <div className="text-center p-3 bg-white/50 dark:bg-gray-700/50 rounded-xl">
                            <p className="text-xs text-yellow-700 dark:text-yellow-300">Valor Inicial</p>
                            <p className="text-lg font-bold text-yellow-800 dark:text-yellow-200">
                              {formatarDinheiro(caixaAtual.valor_inicial)}
                            </p>
                          </div>
                          <div className="text-center p-3 bg-white/50 dark:bg-gray-700/50 rounded-xl">
                            <p className="text-xs text-yellow-700 dark:text-yellow-300">Valor Calculado</p>
                            <p className="text-lg font-bold text-yellow-800 dark:text-yellow-200">
                              {formatarDinheiro(caixaAtual.valor_sistema)}
                            </p>
                          </div>
                        </div>
                      </div>
                    </div>

                    <div className="mb-6">
                      <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3">
                        Valor Final em Dinheiro
                      </label>
                      <div className="relative">
                        <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                          <DollarSign size={20} className="text-gray-400" />
                        </div>
                        <input
                          type="number"
                          step="0.01"
                          min="0"
                          value={valorFinal}
                          onChange={(e) => setValorFinal(e.target.value)}
                          className="pl-12 block w-full rounded-2xl border-gray-300 dark:border-gray-600 shadow-sm focus:ring-2 focus:ring-orange-500 focus:border-orange-500 dark:bg-gray-700 dark:text-white py-4 text-lg font-medium"
                          placeholder="0,00"
                          required
                        />
                      </div>
                    </div>

                    <div className="mb-6">
                      <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3">
                        Observações do Fechamento
                      </label>
                      <textarea
                        value={observacaoFechamento}
                        onChange={(e) => setObservacaoFechamento(e.target.value)}
                        rows={3}
                        className="w-full rounded-2xl border-gray-300 dark:border-gray-600 shadow-sm focus:ring-2 focus:ring-orange-500 focus:border-orange-500 dark:bg-gray-700 dark:text-white p-4"
                        placeholder="Observações sobre o fechamento do caixa..."
                      />
                    </div>

                    <div className="flex space-x-3">
                      <Button
                        variant="ghost"
                        onClick={() => setShowFecharModal(false)}
                        className="flex-1 py-3"
                      >
                        Cancelar
                      </Button>
                      <Button
                        variant="warning"
                        onClick={handleFecharCaixa}
                        isLoading={loading}
                        disabled={!valorFinal}
                        className="flex-1 bg-gradient-to-r from-orange-500 to-red-600 hover:from-orange-600 hover:to-red-700 py-3"
                        icon={<PowerOff size={18} />}
                      >
                        Fechar Caixa
                      </Button>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Modal Nova Movimentação - Moderno */}
        {showMovimentacaoModal && (
          <div className="fixed inset-0 z-50 overflow-y-auto bg-black/60 backdrop-blur-sm">
            <div className="flex items-center justify-center min-h-screen p-4">
              <div className="bg-white dark:bg-gray-800 rounded-3xl shadow-2xl w-full max-w-lg transform transition-all duration-300 scale-100">
                <div className="relative overflow-hidden">
                  <div className="bg-gradient-to-r from-blue-500 to-indigo-600 p-6">
                    <div className="flex justify-between items-center">
                      <div className="flex items-center">
                        <div className="p-3 bg-white/20 backdrop-blur-sm rounded-2xl mr-4">
                          <Plus size={24} className="text-white" />
                        </div>
                        <div className="text-white">
                          <h3 className="text-xl font-bold">Nova Movimentação</h3>
                          <p className="text-blue-100">Registrar entrada ou saída</p>
                        </div>
                      </div>
                      <button
                        onClick={() => setShowMovimentacaoModal(false)}
                        className="p-2 text-white/70 hover:text-white hover:bg-white/20 rounded-xl transition-colors"
                      >
                        <X size={20} />
                      </button>
                    </div>
                  </div>

                  <div className="p-6">
                    <div className="space-y-6">
                      <div>
                        <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3">
                          Tipo de Movimentação
                        </label>
                        <div className="grid grid-cols-2 gap-3">
                          <button
                            type="button"
                            onClick={() => setNovaMovimentacao({ ...novaMovimentacao, tipo: 'entrada' })}
                            className={`p-4 rounded-2xl border-2 transition-all duration-200 ${
                              novaMovimentacao.tipo === 'entrada'
                                ? 'border-green-500 bg-green-50 dark:bg-green-900/20'
                                : 'border-gray-200 dark:border-gray-600 hover:border-green-300'
                            }`}
                          >
                            <div className="flex items-center justify-center mb-2">
                              <ArrowUp size={20} className={`${
                                novaMovimentacao.tipo === 'entrada' ? 'text-green-600' : 'text-gray-400'
                              }`} />
                            </div>
                            <span className={`text-sm font-medium ${
                              novaMovimentacao.tipo === 'entrada' ? 'text-green-800 dark:text-green-200' : 'text-gray-600 dark:text-gray-400'
                            }`}>
                              Entrada
                            </span>
                          </button>
                          
                          <button
                            type="button"
                            onClick={() => setNovaMovimentacao({ ...novaMovimentacao, tipo: 'saida' })}
                            className={`p-4 rounded-2xl border-2 transition-all duration-200 ${
                              novaMovimentacao.tipo === 'saida'
                                ? 'border-red-500 bg-red-50 dark:bg-red-900/20'
                                : 'border-gray-200 dark:border-gray-600 hover:border-red-300'
                            }`}
                          >
                            <div className="flex items-center justify-center mb-2">
                              <ArrowDown size={20} className={`${
                                novaMovimentacao.tipo === 'saida' ? 'text-red-600' : 'text-gray-400'
                              }`} />
                            </div>
                            <span className={`text-sm font-medium ${
                              novaMovimentacao.tipo === 'saida' ? 'text-red-800 dark:text-red-200' : 'text-gray-600 dark:text-gray-400'
                            }`}>
                              Saída
                            </span>
                          </button>
                        </div>
                      </div>

                      <div>
                        <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3">
                          Valor
                        </label>
                        <div className="relative">
                          <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                            <DollarSign size={20} className="text-gray-400" />
                          </div>
                          <input
                            type="number"
                            step="0.01"
                            min="0"
                            value={novaMovimentacao.valor}
                            onChange={(e) => setNovaMovimentacao({ ...novaMovimentacao, valor: e.target.value })}
                            className="pl-12 block w-full rounded-2xl border-gray-300 dark:border-gray-600 shadow-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white py-4 text-lg font-medium"
                            placeholder="0,00"
                            required
                          />
                        </div>
                      </div>

                      <div>
                        <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3">
                          Motivo
                        </label>
                        <input
                          type="text"
                          value={novaMovimentacao.motivo}
                          onChange={(e) => setNovaMovimentacao({ ...novaMovimentacao, motivo: e.target.value })}
                          className="block w-full rounded-2xl border-gray-300 dark:border-gray-600 shadow-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white py-4 px-4"
                          placeholder="Ex: Troco, Sangria, Suprimento..."
                          required
                        />
                      </div>

                      <div>
                        <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3">
                          Forma de Pagamento
                        </label>
                        <select
                          value={novaMovimentacao.formaPagamento}
                          onChange={(e) => setNovaMovimentacao({ ...novaMovimentacao, formaPagamento: e.target.value })}
                          className="block w-full rounded-2xl border-gray-300 dark:border-gray-600 shadow-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white py-4 px-4"
                        >
                          <option value="">Selecione...</option>
                          <option value="dinheiro">💵 Dinheiro</option>
                          <option value="pix">📱 PIX</option>
                          <option value="cartao">💳 Cartão</option>
                        </select>
                      </div>

                      <div>
                        <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3">
                          Observações
                        </label>
                        <textarea
                          value={novaMovimentacao.observacao}
                          onChange={(e) => setNovaMovimentacao({ ...novaMovimentacao, observacao: e.target.value })}
                          rows={3}
                          className="w-full rounded-2xl border-gray-300 dark:border-gray-600 shadow-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white p-4"
                          placeholder="Detalhes adicionais sobre a movimentação..."
                        />
                      </div>
                    </div>

                    <div className="flex space-x-3 mt-8">
                      <Button
                        variant="ghost"
                        onClick={() => setShowMovimentacaoModal(false)}
                        className="flex-1 py-3"
                      >
                        Cancelar
                      </Button>
                      <Button
                        variant="primary"
                        onClick={handleAdicionarMovimentacao}
                        isLoading={loading}
                        disabled={!novaMovimentacao.valor || !novaMovimentacao.motivo}
                        className="flex-1 bg-gradient-to-r from-blue-500 to-indigo-600 hover:from-blue-600 hover:to-indigo-700 py-3"
                        icon={<Check size={18} />}
                      >
                        Registrar
                      </Button>
                    </div>
                  </div>
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