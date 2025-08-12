import React, { useState, useEffect } from 'react';
import { 
  CreditCard, DollarSign, Receipt, ArrowUpCircle, ArrowDownCircle,
  Plus, Minus, FileSpreadsheet, Download, AlertTriangle, X, User,
  Clock, TrendingUp, BarChart3, Users
} from 'lucide-react';
import Button from '../components/ui/Button';
import { formatarDinheiro } from '../utils/formatters';
import { supabase } from '../services/supabase';
import { useAuth } from '../contexts/AuthContext';
import { useRestaurante } from '../contexts/RestauranteContext';
import toast from 'react-hot-toast';

interface CaixaOperador {
  id: string;
  restaurante_id: string;
  operador_id: string;
  operador_nome: string;
  operador_tipo: 'funcionario' | 'usuario';
  valor_inicial: number;
  valor_final?: number;
  valor_sistema: number;
  status: 'aberto' | 'fechado';
  data_abertura: string;
  data_fechamento?: string;
  observacao?: string;
  created_at: string;
  updated_at: string;
}

interface MovimentacaoCaixa {
  id: string;
  caixa_id: string;
  tipo: 'entrada' | 'saida';
  valor: number;
  motivo: string;
  observacao?: string;
  forma_pagamento?: string;
  usuario_id: string;
  created_at: string;
}

interface OperadorDisponivel {
  id: string;
  nome: string;
  tipo: 'funcionario' | 'usuario';
  role?: string;
}

const CaixaRegistradora: React.FC = () => {
  const { user } = useAuth();
  const { restaurante, funcionarios } = useRestaurante();
  const [loading, setLoading] = useState(false);
  const [caixaAtual, setCaixaAtual] = useState<CaixaOperador | null>(null);
  const [movimentacoes, setMovimentacoes] = useState<MovimentacaoCaixa[]>([]);
  const [operadoresDisponiveis, setOperadoresDisponiveis] = useState<OperadorDisponivel[]>([]);
  const [showAbrirModal, setShowAbrirModal] = useState(false);
  const [showMovimentacaoModal, setShowMovimentacaoModal] = useState(false);
  const [showFecharModal, setShowFecharModal] = useState(false);
  const [valorInicial, setValorInicial] = useState('');
  const [operadorSelecionado, setOperadorSelecionado] = useState('');
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
      loadOperadoresDisponiveis();
    }
  }, [user, restaurante]);

  const loadOperadoresDisponiveis = async () => {
    try {
      const operadores: OperadorDisponivel[] = [];
      
      // Adicionar o usuário atual como operador
      operadores.push({
        id: user?.id || '',
        nome: user?.user_metadata?.name || 'Usuário Principal',
        tipo: 'usuario'
      });

      // Adicionar funcionários com função de caixa
      const funcionariosCaixa = funcionarios.filter(func => 
        (func.role === 'cashier' || func.role === 'admin') && func.active
      );

      funcionariosCaixa.forEach(func => {
        operadores.push({
          id: func.id,
          nome: func.name,
          tipo: 'funcionario',
          role: func.role
        });
      });

      setOperadoresDisponiveis(operadores);
    } catch (error) {
      console.error('Error loading operators:', error);
    }
  };

  const loadCaixaAtual = async () => {
    try {
      if (!restaurante?.id) return;

      // Get current open cash register
      const { data: caixa } = await supabase
        .from('caixas_operadores')
        .select('*')
        .eq('restaurante_id', restaurante.id)
        .eq('status', 'aberto')
        .maybeSingle();

      setCaixaAtual(caixa);

      if (caixa) {
        // Load movements
        const { data: movs } = await supabase
          .from('movimentacoes_caixa')
          .select('*')
          .eq('caixa_id', caixa.id)
          .order('created_at', { ascending: true });

        setMovimentacoes(movs || []);
      }
    } catch (error) {
      console.error('Error loading cash register:', error);
      toast.error('Erro ao carregar caixa');
    }
  };

  const handleAbrirCaixa = async () => {
    try {
      setLoading(true);

      const valor = parseFloat(valorInicial);
      if (isNaN(valor) || valor < 0) {
        throw new Error('Valor inicial inválido');
      }

      if (!operadorSelecionado) {
        throw new Error('Selecione um operador');
      }

      const operador = operadoresDisponiveis.find(op => op.id === operadorSelecionado);
      if (!operador) {
        throw new Error('Operador não encontrado');
      }

      // Create new cash register
      const { data: caixa, error } = await supabase
        .from('caixas_operadores')
        .insert({
          restaurante_id: restaurante?.id,
          operador_id: operador.id,
          operador_nome: operador.nome,
          operador_tipo: operador.tipo,
          valor_inicial: valor,
          valor_sistema: valor
        })
        .select()
        .single();

      if (error) throw error;

      setCaixaAtual(caixa);
      setShowAbrirModal(false);
      setValorInicial('');
      setOperadorSelecionado('');
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

      // Create new movement
      const { error } = await supabase
        .from('movimentacoes_caixa')
        .insert({
          caixa_id: caixaAtual?.id,
          tipo: novaMovimentacao.tipo,
          valor,
          motivo: novaMovimentacao.motivo,
          observacao: novaMovimentacao.observacao,
          forma_pagamento: novaMovimentacao.formaPagamento,
          usuario_id: user?.id
        });

      if (error) throw error;

      // Update sistema value
      const novoValorSistema = caixaAtual?.valor_sistema || 0;
      const valorAtualizado = novaMovimentacao.tipo === 'entrada' 
        ? novoValorSistema + valor 
        : novoValorSistema - valor;

      await supabase
        .from('caixas_operadores')
        .update({ valor_sistema: valorAtualizado })
        .eq('id', caixaAtual?.id);

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

      // Close cash register
      const { error } = await supabase
        .from('caixas_operadores')
        .update({
          valor_final: valor,
          status: 'fechado',
          data_fechamento: new Date().toISOString(),
          observacao
        })
        .eq('id', caixaAtual?.id);

      if (error) throw error;

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
              .eq('caixa_id', data.id)
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

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Caixa Registradora</h1>
          <p className="text-gray-500 mt-1">
            Controle de entradas e saídas por operador
          </p>
          {caixaAtual && (
            <div className="mt-2 flex items-center text-sm text-blue-600">
              <User size={16} className="mr-1" />
              <span>Operador: {caixaAtual.operador_nome}</span>
              <span className="mx-2">•</span>
              <Clock size={16} className="mr-1" />
              <span>Aberto em: {new Date(caixaAtual.data_abertura).toLocaleString('pt-BR')}</span>
            </div>
          )}
        </div>
        <div className="mt-4 md:mt-0 flex space-x-3">
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
            >
              Abrir Caixa
            </Button>
          ) : (
            <Button
              variant="warning"
              icon={<ArrowDownCircle size={18} />}
              onClick={() => setShowFecharModal(true)}
            >
              Fechar Caixa
            </Button>
          )}
        </div>
      </div>

      {caixaAtual ? (
        <>
          {/* Cards de Resumo */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            <div className="bg-white rounded-lg shadow-sm p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-500">Saldo em Caixa</p>
                  <p className="text-2xl font-bold mt-1">{formatarDinheiro(totais.saldo)}</p>
                  <p className="text-sm text-gray-500 mt-1">Valor atual</p>
                </div>
                <div className="p-3 bg-blue-100 rounded-full">
                  <DollarSign size={24} className="text-blue-600" />
                </div>
              </div>
            </div>

            <div className="bg-white rounded-lg shadow-sm p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-500">Entradas</p>
                  <p className="text-2xl font-bold mt-1">{formatarDinheiro(totais.entradas)}</p>
                  <p className="text-sm text-gray-500 mt-1">Total de entradas</p>
                </div>
                <div className="p-3 bg-green-100 rounded-full">
                  <Plus size={24} className="text-green-600" />
                </div>
              </div>
            </div>

            <div className="bg-white rounded-lg shadow-sm p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-500">Saídas</p>
                  <p className="text-2xl font-bold mt-1">{formatarDinheiro(totais.saidas)}</p>
                  <p className="text-sm text-gray-500 mt-1">Total de saídas</p>
                </div>
                <div className="p-3 bg-red-100 rounded-full">
                  <Minus size={24} className="text-red-600" />
                </div>
              </div>
            </div>

            <div className="bg-white rounded-lg shadow-sm p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-500">Operador</p>
                  <p className="text-lg font-bold mt-1">{caixaAtual.operador_nome}</p>
                  <p className="text-sm text-gray-500 mt-1">
                    {caixaAtual.operador_tipo === 'funcionario' ? 'Funcionário' : 'Usuário Principal'}
                  </p>
                </div>
                <div className="p-3 bg-purple-100 rounded-full">
                  <User size={24} className="text-purple-600" />
                </div>
              </div>
            </div>
          </div>

          {/* Ações Rápidas */}
          <div className="bg-white rounded-lg shadow-sm p-6">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-medium">Ações Rápidas</h2>
              <div className="space-x-3">
                <Button
                  variant="primary"
                  icon={<Plus size={18} />}
                  onClick={() => {
                    setNovaMovimentacao({
                      ...novaMovimentacao,
                      tipo: 'entrada'
                    });
                    setShowMovimentacaoModal(true);
                  }}
                >
                  Nova Entrada
                </Button>
                <Button
                  variant="warning"
                  icon={<Minus size={18} />}
                  onClick={() => {
                    setNovaMovimentacao({
                      ...novaMovimentacao,
                      tipo: 'saida'
                    });
                    setShowMovimentacaoModal(true);
                  }}
                >
                  Nova Saída
                </Button>
              </div>
            </div>
          </div>

          {/* Lista de Movimentações */}
          <div className="bg-white rounded-lg shadow-sm overflow-hidden">
            <div className="p-6">
              <h2 className="text-lg font-medium mb-6">Movimentações do Caixa</h2>
              <div className="space-y-4">
                {movimentacoes.map((mov) => (
                  <div
                    key={mov.id}
                    className={`p-4 rounded-lg ${
                      mov.tipo === 'entrada'
                        ? 'bg-green-50 border-l-4 border-green-500'
                        : 'bg-red-50 border-l-4 border-red-500'
                    }`}
                  >
                    <div className="flex justify-between items-start">
                      <div>
                        <p className="font-medium">{mov.motivo}</p>
                        {mov.observacao && (
                          <p className="text-sm text-gray-500 mt-1">{mov.observacao}</p>
                        )}
                        <div className="flex items-center mt-2 space-x-2">
                          <span className="text-xs bg-white px-2 py-1 rounded">
                            {new Date(mov.created_at).toLocaleTimeString()}
                          </span>
                          {mov.forma_pagamento && (
                            <span className="text-xs bg-white px-2 py-1 rounded capitalize">
                              {mov.forma_pagamento}
                            </span>
                          )}
                        </div>
                      </div>
                      <p className={`font-medium ${
                        mov.tipo === 'entrada' ? 'text-green-600' : 'text-red-600'
                      }`}>
                        {mov.tipo === 'entrada' ? '+' : '-'} {formatarDinheiro(mov.valor)}
                      </p>
                    </div>
                  </div>
                ))}

                {movimentacoes.length === 0 && (
                  <div className="text-center py-8 text-gray-500">
                    Nenhuma movimentação registrada
                  </div>
                )}
              </div>
            </div>
          </div>
        </>
      ) : (
        <div className="bg-white rounded-lg shadow-sm p-8 text-center">
          <div className="max-w-md mx-auto">
            <Receipt size={48} className="mx-auto text-gray-400 mb-4" />
            <h2 className="text-xl font-medium text-gray-900 mb-2">
              Nenhum Caixa Aberto
            </h2>
            <p className="text-gray-500 mb-6">
              Para iniciar as operações, abra um novo caixa selecionando o operador responsável.
            </p>
            <Button
              variant="primary"
              icon={<ArrowUpCircle size={18} />}
              onClick={() => setShowAbrirModal(true)}
            >
              Abrir Novo Caixa
            </Button>
          </div>
        </div>
      )}

      {/* Modal de Abertura de Caixa */}
      {showAbrirModal && (
        <div className="fixed inset-0 z-50 overflow-y-auto">
          <div className="flex items-center justify-center min-h-screen px-4 pt-4 pb-20 text-center sm:block sm:p-0">
            <div className="fixed inset-0 transition-opacity" aria-hidden="true">
              <div className="absolute inset-0 bg-gray-500 opacity-75"></div>
            </div>

            <div className="inline-block align-bottom bg-white rounded-lg text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-lg sm:w-full">
              <div className="bg-white px-4 pt-5 pb-4 sm:p-6 sm:pb-4">
                <div className="sm:flex sm:items-start">
                  <div className="mx-auto flex-shrink-0 flex items-center justify-center h-12 w-12 rounded-full bg-blue-100 sm:mx-0 sm:h-10 sm:w-10">
                    <ArrowUpCircle className="h-6 w-6 text-blue-600" />
                  </div>
                  <div className="mt-3 text-center sm:mt-0 sm:ml-4 sm:text-left w-full">
                    <h3 className="text-lg font-medium text-gray-900">
                      Abrir Caixa
                    </h3>
                    <div className="mt-2 space-y-4">
                      <p className="text-sm text-gray-500">
                        Selecione o operador responsável e informe o valor inicial em dinheiro.
                      </p>
                      
                      <div>
                        <label className="block text-sm font-medium text-gray-700">
                          Operador Responsável
                        </label>
                        <select
                          value={operadorSelecionado}
                          onChange={(e) => setOperadorSelecionado(e.target.value)}
                          className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:ring-blue-500 focus:border-blue-500"
                          required
                        >
                          <option value="">Selecione um operador</option>
                          {operadoresDisponiveis.map(operador => (
                            <option key={operador.id} value={operador.id}>
                              {operador.nome} ({operador.tipo === 'funcionario' ? 'Funcionário' : 'Usuário Principal'})
                            </option>
                          ))}
                        </select>
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700">
                          Valor Inicial
                        </label>
                        <div className="mt-1 relative rounded-md shadow-sm">
                          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                            <span className="text-gray-500 sm:text-sm">R$</span>
                          </div>
                          <input
                            type="number"
                            step="0.01"
                            min="0"
                            value={valorInicial}
                            onChange={(e) => setValorInicial(e.target.value)}
                            className="focus:ring-blue-500 focus:border-blue-500 block w-full pl-10 pr-12 sm:text-sm border-gray-300 rounded-md"
                            placeholder="0,00"
                          />
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
              <div className="bg-gray-50 px-4 py-3 sm:px-6 sm:flex sm:flex-row-reverse">
                <Button
                  variant="primary"
                  onClick={handleAbrirCaixa}
                  isLoading={loading}
                  className="w-full sm:w-auto sm:ml-3"
                  disabled={!operadorSelecionado || !valorInicial}
                >
                  Abrir Caixa
                </Button>
                <Button
                  variant="ghost"
                  onClick={() => setShowAbrirModal(false)}
                  className="w-full sm:w-auto mt-3 sm:mt-0"
                >
                  Cancelar
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal de Nova Movimentação */}
      {showMovimentacaoModal && (
        <div className="fixed inset-0 z-50 overflow-y-auto">
          <div className="flex items-center justify-center min-h-screen px-4 pt-4 pb-20 text-center sm:block sm:p-0">
            <div className="fixed inset-0 transition-opacity" aria-hidden="true">
              <div className="absolute inset-0 bg-gray-500 opacity-75"></div>
            </div>

            <div className="inline-block align-bottom bg-white rounded-lg text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-lg sm:w-full">
              <div className="bg-white px-4 pt-5 pb-4 sm:p-6 sm:pb-4">
                <div className="sm:flex sm:items-start">
                  <div className={`mx-auto flex-shrink-0 flex items-center justify-center h-12 w-12 rounded-full sm:mx-0 sm:h-10 sm:w-10 ${
                    novaMovimentacao.tipo === 'entrada'
                      ? 'bg-green-100'
                      : 'bg-red-100'
                  }`}>
                    {novaMovimentacao.tipo === 'entrada' ? (
                      <Plus className="h-6 w-6 text-green-600" />
                    ) : (
                      <Minus className="h-6 w-6 text-red-600" />
                    )}
                  </div>
                  <div className="mt-3 text-center sm:mt-0 sm:ml-4 sm:text-left w-full">
                    <h3 className="text-lg font-medium text-gray-900">
                      {novaMovimentacao.tipo === 'entrada' ? 'Nova Entrada' : 'Nova Saída'}
                    </h3>
                    <div className="mt-2 space-y-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700">
                          Valor
                        </label>
                        <div className="mt-1 relative rounded-md shadow-sm">
                          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                            <span className="text-gray-500 sm:text-sm">R$</span>
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
                            className="focus:ring-blue-500 focus:border-blue-500 block w-full pl-10 pr-12 sm:text-sm border-gray-300 rounded-md"
                            placeholder="0,00"
                          />
                        </div>
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700">
                          Motivo
                        </label>
                        <input
                          type="text"
                          value={novaMovimentacao.motivo}
                          onChange={(e) => setNovaMovimentacao({
                            ...novaMovimentacao,
                            motivo: e.target.value
                          })}
                          className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                          placeholder="Motivo da movimentação"
                        />
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700">
                          Forma de Pagamento
                        </label>
                        <select
                          value={novaMovimentacao.formaPagamento}
                          onChange={(e) => setNovaMovimentacao({
                            ...novaMovimentacao,
                            formaPagamento: e.target.value
                          })}
                          className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                        >
                          <option value="dinheiro">Dinheiro</option>
                          <option value="pix">PIX</option>
                          <option value="cartao">Cartão</option>
                        </select>
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700">
                          Observação
                        </label>
                        <textarea
                          value={novaMovimentacao.observacao}
                          onChange={(e) => setNovaMovimentacao({
                            ...novaMovimentacao,
                            observacao: e.target.value
                          })}
                          rows={3}
                          className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                          placeholder="Observações adicionais"
                        />
                      </div>
                    </div>
                  </div>
                </div>
              </div>
              <div className="bg-gray-50 px-4 py-3 sm:px-6 sm:flex sm:flex-row-reverse">
                <Button
                  variant={novaMovimentacao.tipo === 'entrada' ? 'primary' : 'warning'}
                  onClick={handleNovaMovimentacao}
                  isLoading={loading}
                  className="w-full sm:w-auto sm:ml-3"
                >
                  Confirmar
                </Button>
                <Button
                  variant="ghost"
                  onClick={() => setShowMovimentacaoModal(false)}
                  className="w-full sm:w-auto mt-3 sm:mt-0"
                >
                  Cancelar
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal de Fechamento de Caixa */}
      {showFecharModal && (
        <div className="fixed inset-0 z-50 overflow-y-auto">
          <div className="flex items-center justify-center min-h-screen px-4 pt-4 pb-20 text-center sm:block sm:p-0">
            <div className="fixed inset-0 transition-opacity" aria-hidden="true">
              <div className="absolute inset-0 bg-gray-500 opacity-75"></div>
            </div>

            <div className="inline-block align-bottom bg-white rounded-lg text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-lg sm:w-full">
              <div className="bg-white px-4 pt-5 pb-4 sm:p-6 sm:pb-4">
                <div className="sm:flex sm:items-start">
                  <div className="mx-auto flex-shrink-0 flex items-center justify-center h-12 w-12 rounded-full bg-yellow-100 sm:mx-0 sm:h-10 sm:w-10">
                    <ArrowDownCircle className="h-6 w-6 text-yellow-600" />
                  </div>
                  <div className="mt-3 text-center sm:mt-0 sm:ml-4 sm:text-left">
                    <h3 className="text-lg font-medium text-gray-900">
                      Fechar Caixa
                    </h3>
                    <div className="mt-2">
                      <p className="text-sm text-gray-500">
                        Operador: <strong>{caixaAtual?.operador_nome}</strong>
                      </p>
                      <p className="text-sm text-gray-500 mb-4">
                        Informe o valor final em dinheiro para fechar o caixa.
                      </p>
                      
                      <div className="bg-blue-50 p-4 rounded-md mb-4">
                        <div className="text-sm">
                          <div className="flex justify-between mb-1">
                            <span>Valor inicial:</span>
                            <span className="font-medium">{formatarDinheiro(caixaAtual?.valor_inicial || 0)}</span>
                          </div>
                          <div className="flex justify-between mb-1">
                            <span>Saldo calculado:</span>
                            <span className="font-medium">{formatarDinheiro(totais.saldo)}</span>
                          </div>
                          {diferenca !== 0 && (
                            <div className={`flex justify-between font-medium ${
                              diferenca > 0 ? 'text-green-600' : 'text-red-600'
                            }`}>
                              <span>Diferença:</span>
                              <span>{diferenca > 0 ? '+' : ''}{formatarDinheiro(Math.abs(diferenca))}</span>
                            </div>
                          )}
                        </div>
                      </div>
                      
                      <div className="space-y-4">
                        <div>
                          <label className="block text-sm font-medium text-gray-700">
                            Valor em Caixa
                          </label>
                          <div className="mt-1 relative rounded-md shadow-sm">
                            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                              <span className="text-gray-500 sm:text-sm">R$</span>
                            </div>
                            <input
                              type="number"
                              step="0.01"
                              min="0"
                              value={valorFinal}
                              onChange={(e) => setValorFinal(e.target.value)}
                              className="focus:ring-blue-500 focus:border-blue-500 block w-full pl-10 pr-12 sm:text-sm border-gray-300 rounded-md"
                              placeholder="0,00"
                            />
                          </div>
                        </div>

                        <div>
                          <label className="block text-sm font-medium text-gray-700">
                            Observações
                          </label>
                          <textarea
                            value={observacao}
                            onChange={(e) => setObservacao(e.target.value)}
                            rows={3}
                            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                            placeholder="Observações sobre o fechamento"
                          />
                        </div>

                        <div className="bg-yellow-50 p-4 rounded-md">
                          <div className="flex">
                            <div className="flex-shrink-0">
                              <AlertTriangle className="h-5 w-5 text-yellow-400" />
                            </div>
                            <div className="ml-3">
                              <h3 className="text-sm font-medium text-yellow-800">
                                Atenção
                              </h3>
                              <div className="mt-2 text-sm text-yellow-700">
                                <p>
                                  Após o fechamento do caixa, não será possível registrar novas movimentações.
                                  Certifique-se de que todas as operações foram registradas.
                                </p>
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
              <div className="bg-gray-50 px-4 py-3 sm:px-6 sm:flex sm:flex-row-reverse">
                <Button
                  variant="warning"
                  onClick={handleFecharCaixa}
                  isLoading={loading}
                  className="w-full sm:w-auto sm:ml-3"
                >
                  Fechar Caixa
                </Button>
                <Button
                  variant="ghost"
                  onClick={() => setShowFecharModal(false)}
                  className="w-full sm:w-auto mt-3 sm:mt-0"
                >
                  Cancelar
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default CaixaRegistradora;