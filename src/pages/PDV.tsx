import React, { useState, useEffect } from 'react';
import { 
  CreditCard, Plus, Search, Filter, Clock, User, 
  ShoppingCart, DollarSign, Coffee, Truck, Zap, 
  Package, X, Minus, Receipt, Percent, Music,
  AlertTriangle, CheckCircle, Eye, RefreshCw,
  Sparkles, ArrowRight, Calculator, Target
} from 'lucide-react';
import Button from '../components/ui/Button';
import PDVStatusBar from '../components/pdv/PDVStatusBar';
import PDVControlModal from '../components/pdv/PDVControlModal';
import { formatarDinheiro } from '../utils/formatters';
import { useAuth } from '../contexts/AuthContext';
import { useRestaurante } from '../contexts/RestauranteContext';
import { usePermissions } from '../hooks/useEmployeeAuth';
import { supabase } from '../services/supabase';
import CaixaService from '../services/CaixaService';
import toast from 'react-hot-toast';

interface PedidoAvulso {
  id: string;
  numero: number;
  cliente_nome: string;
  cliente_telefone?: string;
  tipo: 'balcao' | 'delivery' | 'rapido';
  status: 'aberto' | 'em_preparo' | 'pronto' | 'entregue' | 'pago' | 'cancelado';
  valor_total: number;
  observacao?: string;
  endereco_entrega?: string;
  created_at: string;
  itens: Array<{
    id: string;
    produto_id: string;
    produto_nome: string;
    categoria: string;
    quantidade: number;
    preco_unitario: number;
    observacao?: string;
    status: string;
  }>;
}

interface ItemCarrinho {
  produto: any;
  quantidade: number;
  observacao: string;
}

interface PagamentoData {
  formaPagamento: 'pix' | 'dinheiro' | 'cartao' | null;
  taxaServico: boolean;
  couvertArtistico: boolean;
  desconto: {
    tipo: 'percentual' | 'valor';
    valor: number;
  };
}

const PDV: React.FC = () => {
  const { user, userRole, isEmployee } = useAuth();
  const { hasPermission } = usePermissions();
  const { 
    restaurante, 
    mesas, 
    produtos, 
    comandas, 
    itensComanda, 
    refreshData,
    finalizarPagamento 
  } = useRestaurante();

  // Estados do PDV
  const [caixaAtual, setCaixaAtual] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // Estados das vendas avulsas
  const [pedidosAvulsos, setPedidosAvulsos] = useState<PedidoAvulso[]>([]);
  const [showNovoAvulsoModal, setShowNovoAvulsoModal] = useState(false);
  const [showCarrinhoModal, setShowCarrinhoModal] = useState(false);
  const [showPagamentoModal, setShowPagamentoModal] = useState(false);
  const [pedidoParaPagamento, setPedidoParaPagamento] = useState<any>(null);
  const [tipoPedidoParaPagamento, setTipoPedidoParaPagamento] = useState<'mesa' | 'avulso'>('mesa');

  // Estados do carrinho
  const [carrinho, setCarrinho] = useState<ItemCarrinho[]>([]);
  const [clienteData, setClienteData] = useState({
    nome: '',
    telefone: '',
    tipo: 'balcao' as 'balcao' | 'delivery' | 'rapido',
    endereco: '',
    observacao: ''
  });

  // Estados de filtros e busca
  const [searchTerm, setSearchTerm] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('todas');
  const [statusFilter, setStatusFilter] = useState('todos');

  // Estados do pagamento
  const [pagamentoData, setPagamentoData] = useState<PagamentoData>({
    formaPagamento: null,
    taxaServico: false,
    couvertArtistico: false,
    desconto: { tipo: 'percentual', valor: 0 }
  });

  // Verificar permissões
  const temPermissao = hasPermission('pdv') || (userRole === 'admin' && !isEmployee);

  useEffect(() => {
    if (restaurante?.id && temPermissao) {
      loadPDVData();
    }
  }, [restaurante?.id, temPermissao]);

  // Auto-refresh a cada 30 segundos
  useEffect(() => {
    const interval = setInterval(() => {
      if (restaurante?.id && temPermissao) {
        refreshPDVData();
      }
    }, 30000);

    return () => clearInterval(interval);
  }, [restaurante?.id, temPermissao]);

  const loadPDVData = async () => {
    try {
      setLoading(true);
      await refreshData();
      await loadCaixaAtual();
      await loadPedidosAvulsos();
    } catch (error) {
      console.error('Error loading PDV data:', error);
      toast.error('Erro ao carregar dados do PDV');
    } finally {
      setLoading(false);
    }
  };

  const refreshPDVData = async () => {
    try {
      setRefreshing(true);
      await refreshData();
      await loadPedidosAvulsos();
    } catch (error) {
      console.error('Error refreshing PDV data:', error);
    } finally {
      setRefreshing(false);
    }
  };

  const loadCaixaAtual = async () => {
    try {
      if (!restaurante?.id || !user?.id) return;

      // Buscar caixa aberto do operador atual
      const caixa = await CaixaService.getCaixaAberto(restaurante.id, user.id);
      setCaixaAtual(caixa);
    } catch (error) {
      console.error('Error loading current cash register:', error);
    }
  };

  const loadPedidosAvulsos = async () => {
    try {
      if (!restaurante?.id) return;

      const { data, error } = await supabase
        .from('pedidos')
        .select(`
          *,
          itens:itens_pedido(
            *,
            produto:produtos(nome, categoria)
          )
        `)
        .eq('restaurante_id', restaurante.id)
        .neq('status', 'pago')
        .neq('status', 'cancelado')
        .order('created_at', { ascending: false });

      if (error) throw error;

      const pedidosFormatados: PedidoAvulso[] = (data || []).map((pedido: any) => ({
        ...pedido,
        itens: (pedido.itens || []).map((item: any) => ({
          ...item,
          produto_nome: item.produto?.nome || 'Produto não encontrado',
          categoria: item.produto?.categoria || 'Sem categoria'
        }))
      }));

      setPedidosAvulsos(pedidosFormatados);
    } catch (error) {
      console.error('Error loading pedidos avulsos:', error);
    }
  };

  const criarPedidoAvulso = async () => {
    if (carrinho.length === 0) {
      toast.error('Adicione itens ao carrinho primeiro');
      return;
    }

    if (!clienteData.nome) {
      toast.error('Informe o nome do cliente');
      return;
    }

    if (clienteData.tipo === 'delivery' && !clienteData.endereco) {
      toast.error('Informe o endereço para delivery');
      return;
    }

    try {
      setLoading(true);

      // Criar pedido
      const { data: pedido, error: pedidoError } = await supabase
        .from('pedidos')
        .insert({
          restaurante_id: restaurante?.id,
          cliente_nome: clienteData.nome,
          cliente_telefone: clienteData.telefone || null,
          tipo: clienteData.tipo,
          endereco_entrega: clienteData.tipo === 'delivery' ? clienteData.endereco : null,
          observacao: clienteData.observacao || null,
          usuario_id: user?.id
        })
        .select()
        .single();

      if (pedidoError) throw pedidoError;

      // Adicionar itens ao pedido
      const itensParaInserir = carrinho.map(item => ({
        pedido_id: pedido.id,
        produto_id: item.produto.id,
        quantidade: item.quantidade,
        preco_unitario: item.produto.preco,
        observacao: item.observacao || null
      }));

      const { error: itensError } = await supabase
        .from('itens_pedido')
        .insert(itensParaInserir);

      if (itensError) throw itensError;

      toast.success(`Pedido #${pedido.numero} criado com sucesso!`);
      
      // Limpar formulário
      setCarrinho([]);
      setClienteData({
        nome: '',
        telefone: '',
        tipo: 'balcao',
        endereco: '',
        observacao: ''
      });
      setShowNovoAvulsoModal(false);
      setShowCarrinhoModal(false);
      
      await loadPedidosAvulsos();
    } catch (error) {
      console.error('Error creating pedido avulso:', error);
      toast.error('Erro ao criar pedido avulso');
    } finally {
      setLoading(false);
    }
  };

  const adicionarAoCarrinho = (produto: any) => {
    const itemExistente = carrinho.find(item => item.produto.id === produto.id);
    
    if (itemExistente) {
      setCarrinho(carrinho.map(item => 
        item.produto.id === produto.id 
          ? { ...item, quantidade: item.quantidade + 1 }
          : item
      ));
    } else {
      setCarrinho([...carrinho, { produto, quantidade: 1, observacao: '' }]);
    }
    
    toast.success(`${produto.nome} adicionado ao carrinho!`);
  };

  const alterarQuantidadeCarrinho = (produtoId: string, novaQuantidade: number) => {
    if (novaQuantidade <= 0) {
      setCarrinho(carrinho.filter(item => item.produto.id !== produtoId));
      return;
    }

    setCarrinho(carrinho.map(item => 
      item.produto.id === produtoId 
        ? { ...item, quantidade: novaQuantidade }
        : item
    ));
  };

  const calcularTotalCarrinho = () => {
    return carrinho.reduce((total, item) => total + (item.produto.preco * item.quantidade), 0);
  };

  const calcularTotalPagamento = (valorBase: number) => {
    const valorTaxaServico = pagamentoData.taxaServico ? valorBase * 0.1 : 0;
    const valorCouvert = pagamentoData.couvertArtistico ? 15 : 0;
    
    const calcularDesconto = () => {
      if (pagamentoData.desconto.tipo === 'percentual') {
        return (valorBase + valorTaxaServico + valorCouvert) * (pagamentoData.desconto.valor / 100);
      }
      return pagamentoData.desconto.valor;
    };

    const valorDesconto = calcularDesconto();
    return {
      valorBase,
      valorTaxaServico,
      valorCouvert,
      valorDesconto,
      valorTotal: valorBase + valorTaxaServico + valorCouvert - valorDesconto
    };
  };

  const finalizarPagamentoPedido = async () => {
    if (!pagamentoData.formaPagamento) {
      toast.error('Selecione uma forma de pagamento');
      return;
    }

    try {
      setLoading(true);

      if (tipoPedidoParaPagamento === 'mesa') {
        // Finalizar pagamento de mesa
        await finalizarPagamento(pedidoParaPagamento.id, pagamentoData.formaPagamento);
      } else {
        // Finalizar pagamento de pedido avulso
        const { error } = await supabase.rpc('finalizar_pagamento_pedido', {
          p_pedido_id: pedidoParaPagamento.id,
          p_forma_pagamento: pagamentoData.formaPagamento,
          p_usuario_id: user?.id
        });

        if (error) throw error;
      }

      toast.success('Pagamento finalizado com sucesso!');
      setShowPagamentoModal(false);
      setPedidoParaPagamento(null);
      resetPagamentoData();
      await loadPDVData();
    } catch (error) {
      console.error('Error finalizing payment:', error);
      toast.error('Erro ao finalizar pagamento');
    } finally {
      setLoading(false);
    }
  };

  const resetPagamentoData = () => {
    setPagamentoData({
      formaPagamento: null,
      taxaServico: false,
      couvertArtistico: false,
      desconto: { tipo: 'percentual', valor: 0 }
    });
  };

  const getTipoIcon = (tipo: string) => {
    switch (tipo) {
      case 'balcao': return <Coffee className="w-5 h-5" />;
      case 'delivery': return <Truck className="w-5 h-5" />;
      case 'rapido': return <Zap className="w-5 h-5" />;
      default: return <Package className="w-5 h-5" />;
    }
  };

  const getTipoColor = (tipo: string) => {
    switch (tipo) {
      case 'balcao': return 'bg-blue-100 text-blue-800 dark:bg-blue-900/50 dark:text-blue-200';
      case 'delivery': return 'bg-green-100 text-green-800 dark:bg-green-900/50 dark:text-green-200';
      case 'rapido': return 'bg-purple-100 text-purple-800 dark:bg-purple-900/50 dark:text-purple-200';
      default: return 'bg-gray-100 text-gray-800 dark:bg-gray-900/50 dark:text-gray-200';
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'aberto': return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/50 dark:text-yellow-200';
      case 'em_preparo': return 'bg-blue-100 text-blue-800 dark:bg-blue-900/50 dark:text-blue-200';
      case 'pronto': return 'bg-green-100 text-green-800 dark:bg-green-900/50 dark:text-green-200';
      default: return 'bg-gray-100 text-gray-800 dark:bg-gray-900/50 dark:text-gray-200';
    }
  };

  // Filtrar produtos
  const produtosFiltrados = produtos.filter(produto => {
    const matchSearch = produto.nome.toLowerCase().includes(searchTerm.toLowerCase());
    const matchCategory = categoryFilter === 'todas' || produto.categoria === categoryFilter;
    return matchSearch && matchCategory && produto.disponivel;
  });

  // Obter categorias únicas
  const categorias = Array.from(new Set(produtos.map(p => p.categoria)));

  // Combinar pedidos de mesas e avulsos
  const todosPedidos = [
    // Pedidos de mesas
    ...mesas
      .filter(mesa => mesa.status === 'ocupada')
      .map(mesa => {
        const itensMesa = itensComanda.filter(item => 
          item.mesa_id === mesa.id && 
          item.status !== 'entregue' && 
          item.status !== 'cancelado'
        );
        const valorMesa = itensMesa.reduce((total, item) => 
          total + (item.preco_unitario * item.quantidade), 0
        );

        return {
          id: mesa.id,
          tipo_origem: 'mesa' as const,
          numero: mesa.numero,
          cliente: mesa.garcom || 'Mesa sem garçom',
          valor_total: valorMesa,
          itens: itensMesa,
          status: mesa.status,
          created_at: mesa.horario_abertura || mesa.created_at
        };
      }),
    // Pedidos avulsos
    ...pedidosAvulsos.map(pedido => ({
      id: pedido.id,
      tipo_origem: 'avulso' as const,
      numero: pedido.numero,
      cliente: pedido.cliente_nome,
      valor_total: pedido.valor_total,
      itens: pedido.itens,
      status: pedido.status,
      tipo_pedido: pedido.tipo,
      created_at: pedido.created_at
    }))
  ];

  // Filtrar pedidos
  const pedidosFiltrados = todosPedidos.filter(pedido => {
    const matchSearch = pedido.cliente.toLowerCase().includes(searchTerm.toLowerCase()) ||
                       pedido.numero.toString().includes(searchTerm);
    
    let matchStatus = true;
    if (statusFilter === 'ocupadas') {
      matchStatus = pedido.tipo_origem === 'mesa' && pedido.status === 'ocupada';
    } else if (statusFilter === 'abertos') {
      matchStatus = pedido.tipo_origem === 'avulso' && pedido.status === 'aberto';
    } else if (statusFilter === 'prontos') {
      matchStatus = pedido.status === 'pronto';
    }
    
    return matchSearch && matchStatus;
  });

  // Verificar permissões
  if (!temPermissao) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-50 dark:bg-gray-900">
        <div className="text-center">
          <AlertTriangle size={48} className="mx-auto text-red-500 mb-4" />
          <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-2">Acesso Restrito</h2>
          <p className="text-gray-600 dark:text-gray-400">
            Você não tem permissão para acessar o PDV.
          </p>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-50 dark:bg-gray-900">
        <div className="text-center">
          <div className="relative">
            <div className="w-20 h-20 border-4 border-blue-200 dark:border-blue-800 border-t-blue-600 dark:border-t-blue-400 rounded-full animate-spin mx-auto mb-4"></div>
            <div className="absolute inset-0 flex items-center justify-center">
              <CreditCard className="w-8 h-8 text-blue-600 dark:text-blue-400" />
            </div>
          </div>
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
            Carregando PDV
          </h3>
          <p className="text-gray-600 dark:text-gray-400">
            Aguarde enquanto carregamos o ponto de venda...
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-blue-50/30 to-indigo-50/30 dark:from-gray-900 dark:via-gray-800 dark:to-gray-700">
      <div className="p-6 max-w-7xl mx-auto">
        {/* Header Moderno */}
        <div className="mb-8">
          <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center">
            <div className="mb-6 lg:mb-0">
              <div className="flex items-center mb-4">
                <div className="relative">
                  <div className="p-4 bg-gradient-to-br from-blue-500 via-blue-600 to-indigo-600 rounded-3xl shadow-2xl mr-6 transform rotate-3 hover:rotate-0 transition-transform duration-300">
                    <CreditCard size={32} className="text-white" />
                  </div>
                  <div className="absolute -top-2 -right-2 w-6 h-6 bg-gradient-to-r from-yellow-400 to-orange-500 rounded-full flex items-center justify-center shadow-lg">
                    <Sparkles className="w-3 h-3 text-white" />
                  </div>
                </div>
                <div>
                  <h1 className="text-4xl font-bold bg-gradient-to-r from-gray-900 via-blue-800 to-indigo-900 dark:from-white dark:via-blue-200 dark:to-indigo-200 bg-clip-text text-transparent">
                    Ponto de Venda
                  </h1>
                  <p className="text-xl text-gray-600 dark:text-gray-400 mt-2">
                    Gerencie vendas de mesas e pedidos avulsos
                  </p>
                </div>
              </div>
            </div>
            
            <div className="flex flex-wrap gap-3">
              <Button
                variant="ghost"
                icon={<RefreshCw size={18} />}
                onClick={refreshPDVData}
                isLoading={refreshing}
                className="bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm shadow-lg hover:shadow-xl transition-all duration-300 border border-white/20 dark:border-gray-700/50"
              >
                Atualizar
              </Button>
              <Button
                onClick={() => setShowNovoAvulsoModal(true)}
                className="bg-gradient-to-r from-green-600 via-green-700 to-emerald-700 hover:from-green-700 hover:via-green-800 hover:to-emerald-800 text-white px-8 py-3 rounded-2xl flex items-center gap-3 transition-all duration-300 shadow-xl hover:shadow-2xl transform hover:scale-105 active:scale-95"
              >
                <Plus className="w-5 h-5" />
                <span className="font-semibold">Nova Venda Avulsa</span>
              </Button>
            </div>
          </div>
        </div>

        {/* Status do Caixa */}
        <PDVStatusBar 
          caixaAtual={caixaAtual}
          onAbrirPDV={() => {}}
          onFecharPDV={() => {}}
        />

        {/* Filtros */}
        <div className="bg-white/90 dark:bg-gray-800/90 backdrop-blur-sm rounded-3xl shadow-xl border border-white/20 dark:border-gray-700/50 p-6 mb-8">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
              <input
                type="text"
                placeholder="Buscar mesa, cliente ou pedido..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-3 bg-gray-50/50 dark:bg-gray-700/50 border border-gray-200/50 dark:border-gray-600/50 rounded-2xl focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 focus:border-blue-500 dark:focus:border-blue-400 transition-all duration-200 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400"
              />
            </div>

            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="px-4 py-3 bg-gray-50/50 dark:bg-gray-700/50 border border-gray-200/50 dark:border-gray-600/50 rounded-2xl focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 focus:border-blue-500 dark:focus:border-blue-400 transition-all duration-200 text-gray-900 dark:text-white"
            >
              <option value="todos">Todos os pedidos</option>
              <option value="ocupadas">Mesas Ocupadas</option>
              <option value="abertos">Pedidos Abertos</option>
              <option value="prontos">Prontos para Entrega</option>
            </select>

            <div className="flex items-center justify-center">
              <span className="text-sm font-medium text-gray-600 dark:text-gray-400">
                {pedidosFiltrados.length} {pedidosFiltrados.length === 1 ? 'pedido' : 'pedidos'}
              </span>
            </div>

            <div className="flex items-center justify-center">
              <div className="flex items-center space-x-2">
                <div className="w-3 h-3 bg-green-500 rounded-full animate-pulse"></div>
                <span className="text-sm font-medium text-gray-600 dark:text-gray-400">
                  {refreshing ? 'Atualizando...' : 'Tempo real'}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Grid de Pedidos */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {pedidosFiltrados.map((pedido) => (
            <div
              key={`${pedido.tipo_origem}-${pedido.id}`}
              className="group bg-white/90 dark:bg-gray-800/90 backdrop-blur-sm rounded-3xl shadow-xl border border-white/20 dark:border-gray-700/50 overflow-hidden hover:shadow-2xl transition-all duration-300 hover:transform hover:scale-105"
            >
              {/* Header do Card */}
              <div className="relative overflow-hidden">
                <div className={`p-6 ${
                  pedido.tipo_origem === 'mesa' 
                    ? 'bg-gradient-to-r from-blue-500 to-blue-600'
                    : pedido.tipo_pedido === 'balcao'
                      ? 'bg-gradient-to-r from-purple-500 to-purple-600'
                      : pedido.tipo_pedido === 'delivery'
                        ? 'bg-gradient-to-r from-green-500 to-green-600'
                        : 'bg-gradient-to-r from-orange-500 to-orange-600'
                }`}>
                  <div className="absolute top-0 right-0 w-24 h-24 bg-white/10 rounded-full -mr-12 -mt-12"></div>
                  <div className="relative flex justify-between items-start">
                    <div className="flex items-center">
                      <div className="p-3 bg-white/20 backdrop-blur-sm rounded-2xl mr-4">
                        {pedido.tipo_origem === 'mesa' ? (
                          <Coffee className="w-6 h-6 text-white" />
                        ) : (
                          getTipoIcon(pedido.tipo_pedido || 'balcao')
                        )}
                      </div>
                      <div className="text-white">
                        <h3 className="text-lg font-bold">
                          {pedido.tipo_origem === 'mesa' 
                            ? `Mesa ${pedido.numero}`
                            : `Pedido #${pedido.numero}`
                          }
                        </h3>
                        <p className="text-sm opacity-90">{pedido.cliente}</p>
                        <div className="flex items-center mt-1">
                          <span className={`px-3 py-1 rounded-full text-xs font-bold ${
                            pedido.tipo_origem === 'mesa' 
                              ? 'bg-blue-200/30 text-white'
                              : getTipoColor(pedido.tipo_pedido || 'balcao') + ' bg-white/20 text-white'
                          }`}>
                            {pedido.tipo_origem === 'mesa' 
                              ? 'Mesa'
                              : pedido.tipo_pedido === 'balcao' ? 'Balcão'
                                : pedido.tipo_pedido === 'delivery' ? 'Delivery'
                                : 'Rápido'
                            }
                          </span>
                        </div>
                      </div>
                    </div>
                    <div className="text-right text-white">
                      <p className="text-sm opacity-80">
                        {new Date(pedido.created_at).toLocaleTimeString('pt-BR', {
                          hour: '2-digit',
                          minute: '2-digit'
                        })}
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Conteúdo do Card */}
              <div className="p-6">
                {/* Valor Total */}
                <div className="mb-4">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-500 dark:text-gray-400">Valor Total</span>
                    <span className="text-2xl font-bold text-gray-900 dark:text-white">
                      {formatarDinheiro(pedido.valor_total)}
                    </span>
                  </div>
                </div>

                {/* Itens */}
                <div className="mb-4">
                  <h4 className="text-sm font-bold text-gray-700 dark:text-gray-300 mb-2">
                    Itens ({pedido.itens.length})
                  </h4>
                  <div className="space-y-1 max-h-24 overflow-y-auto">
                    {pedido.itens.slice(0, 3).map((item: any, index: number) => (
                      <div key={index} className="flex justify-between text-xs">
                        <span className="text-gray-600 dark:text-gray-400">
                          {item.quantidade}x {item.produto_nome || item.nome}
                        </span>
                        <span className="text-gray-900 dark:text-white font-medium">
                          {formatarDinheiro((item.preco_unitario || item.preco) * item.quantidade)}
                        </span>
                      </div>
                    ))}
                    {pedido.itens.length > 3 && (
                      <div className="text-xs text-gray-500 dark:text-gray-400 text-center">
                        +{pedido.itens.length - 3} itens
                      </div>
                    )}
                  </div>
                </div>

                {/* Status */}
                <div className="mb-4">
                  <span className={`px-3 py-2 rounded-full text-sm font-bold ${getStatusColor(pedido.status)}`}>
                    {pedido.status === 'ocupada' ? 'Mesa Ocupada' :
                     pedido.status === 'aberto' ? 'Pedido Aberto' :
                     pedido.status === 'em_preparo' ? 'Em Preparo' :
                     pedido.status === 'pronto' ? 'Pronto' : pedido.status}
                  </span>
                </div>

                {/* Botão de Pagamento */}
                <Button
                  onClick={() => {
                    setPedidoParaPagamento(pedido);
                    setTipoPedidoParaPagamento(pedido.tipo_origem);
                    setShowPagamentoModal(true);
                  }}
                  variant="primary"
                  fullWidth
                  className="bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700 text-white rounded-2xl py-3 font-semibold shadow-lg hover:shadow-xl transition-all duration-200 transform hover:scale-105"
                  icon={<Receipt size={18} />}
                >
                  Finalizar Pagamento
                </Button>
              </div>
            </div>
          ))}
        </div>

        {pedidosFiltrados.length === 0 && (
          <div className="text-center py-16">
            <div className="relative mb-8">
              <div className="w-32 h-32 bg-gradient-to-br from-gray-100 to-gray-200 dark:from-gray-700 dark:to-gray-600 rounded-full mx-auto flex items-center justify-center shadow-2xl">
                <CreditCard className="w-16 h-16 text-gray-400 dark:text-gray-500" />
              </div>
              <div className="absolute -top-2 -right-2 w-8 h-8 bg-gradient-to-r from-blue-500 to-purple-600 rounded-full flex items-center justify-center shadow-lg transform translate-x-16">
                <Sparkles className="w-4 h-4 text-white" />
              </div>
            </div>
            <h3 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">
              Nenhum pedido encontrado
            </h3>
            <p className="text-lg text-gray-600 dark:text-gray-400 mb-8 max-w-md mx-auto">
              {searchTerm || statusFilter !== 'todos'
                ? 'Tente ajustar os filtros de busca para encontrar o que procura'
                : 'Quando houver mesas ocupadas ou pedidos avulsos, eles aparecerão aqui para finalização'
              }
            </p>
            <Button
              onClick={() => setShowNovoAvulsoModal(true)}
              className="bg-gradient-to-r from-green-600 via-green-700 to-emerald-700 hover:from-green-700 hover:via-green-800 hover:to-emerald-800 text-white px-8 py-4 rounded-2xl font-semibold shadow-xl hover:shadow-2xl transform hover:scale-105 transition-all duration-300"
              icon={<Plus size={20} />}
            >
              Criar Primeira Venda Avulsa
            </Button>
          </div>
        )}

        {/* Modal de Nova Venda Avulsa */}
        {showNovoAvulsoModal && (
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-50">
            <div className="bg-white/95 dark:bg-gray-800/95 backdrop-blur-sm rounded-3xl max-w-4xl w-full max-h-[95vh] overflow-hidden shadow-2xl border border-white/20 dark:border-gray-700/50">
              {/* Header do Modal */}
              <div className="relative overflow-hidden">
                <div className="bg-gradient-to-r from-green-600 via-green-700 to-emerald-700 p-8">
                  <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full -mr-16 -mt-16"></div>
                  <div className="relative flex justify-between items-center">
                    <div className="flex items-center">
                      <div className="p-3 bg-white/20 backdrop-blur-sm rounded-2xl mr-4">
                        <ShoppingCart size={24} className="text-white" />
                      </div>
                      <div className="text-white">
                        <h2 className="text-2xl font-bold">Nova Venda Avulsa</h2>
                        <p className="text-green-100">
                          Crie um pedido rápido para balcão, delivery ou retirada
                        </p>
                      </div>
                    </div>
                    <button
                      onClick={() => {
                        setShowNovoAvulsoModal(false);
                        setCarrinho([]);
                        setClienteData({
                          nome: '',
                          telefone: '',
                          tipo: 'balcao',
                          endereco: '',
                          observacao: ''
                        });
                      }}
                      className="p-2 text-white/70 hover:text-white hover:bg-white/20 rounded-xl transition-colors"
                    >
                      <X size={24} />
                    </button>
                  </div>
                </div>
              </div>

              <div className="p-8 overflow-y-auto max-h-[calc(95vh-200px)]">
                {/* Dados do Cliente */}
                <div className="mb-8">
                  <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-4">
                    Dados do Cliente
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-2">
                        Nome do Cliente *
                      </label>
                      <input
                        type="text"
                        value={clienteData.nome}
                        onChange={(e) => setClienteData({ ...clienteData, nome: e.target.value })}
                        className="w-full px-4 py-3 bg-gray-50/50 dark:bg-gray-700/50 border border-gray-200/50 dark:border-gray-600/50 rounded-2xl focus:ring-2 focus:ring-green-500 dark:focus:ring-green-400 focus:border-green-500 dark:focus:border-green-400 transition-all duration-200 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400"
                        placeholder="Nome completo"
                        required
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-2">
                        Telefone
                      </label>
                      <input
                        type="tel"
                        value={clienteData.telefone}
                        onChange={(e) => setClienteData({ ...clienteData, telefone: e.target.value })}
                        className="w-full px-4 py-3 bg-gray-50/50 dark:bg-gray-700/50 border border-gray-200/50 dark:border-gray-600/50 rounded-2xl focus:ring-2 focus:ring-green-500 dark:focus:ring-green-400 focus:border-green-500 dark:focus:border-green-400 transition-all duration-200 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400"
                        placeholder="(00) 00000-0000"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-2">
                        Tipo de Pedido
                      </label>
                      <select
                        value={clienteData.tipo}
                        onChange={(e) => setClienteData({ ...clienteData, tipo: e.target.value as any })}
                        className="w-full px-4 py-3 bg-gray-50/50 dark:bg-gray-700/50 border border-gray-200/50 dark:border-gray-600/50 rounded-2xl focus:ring-2 focus:ring-green-500 dark:focus:ring-green-400 focus:border-green-500 dark:focus:border-green-400 transition-all duration-200 text-gray-900 dark:text-white"
                      >
                        <option value="balcao">Balcão</option>
                        <option value="delivery">Delivery</option>
                        <option value="rapido">Retirada Rápida</option>
                      </select>
                    </div>

                    {clienteData.tipo === 'delivery' && (
                      <div>
                        <label className="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-2">
                          Endereço de Entrega *
                        </label>
                        <input
                          type="text"
                          value={clienteData.endereco}
                          onChange={(e) => setClienteData({ ...clienteData, endereco: e.target.value })}
                          className="w-full px-4 py-3 bg-gray-50/50 dark:bg-gray-700/50 border border-gray-200/50 dark:border-gray-600/50 rounded-2xl focus:ring-2 focus:ring-green-500 dark:focus:ring-green-400 focus:border-green-500 dark:focus:border-green-400 transition-all duration-200 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400"
                          placeholder="Endereço completo"
                          required
                        />
                      </div>
                    )}
                  </div>

                  {clienteData.tipo !== 'delivery' && (
                    <div className="mt-4">
                      <label className="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-2">
                        Observações
                      </label>
                      <textarea
                        value={clienteData.observacao}
                        onChange={(e) => setClienteData({ ...clienteData, observacao: e.target.value })}
                        className="w-full px-4 py-3 bg-gray-50/50 dark:bg-gray-700/50 border border-gray-200/50 dark:border-gray-600/50 rounded-2xl focus:ring-2 focus:ring-green-500 dark:focus:ring-green-400 focus:border-green-500 dark:focus:border-green-400 transition-all duration-200 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400"
                        rows={3}
                        placeholder="Observações do pedido..."
                      />
                    </div>
                  )}
                </div>

                {/* Botão para Adicionar Produtos */}
                <div className="mb-8">
                  <Button
                    onClick={() => setShowCarrinhoModal(true)}
                    variant="primary"
                    fullWidth
                    className="bg-gradient-to-r from-blue-600 to-indigo-700 hover:from-blue-700 hover:to-indigo-800 text-white rounded-2xl py-4 font-semibold shadow-lg hover:shadow-xl transition-all duration-200 transform hover:scale-105"
                    icon={<ShoppingCart size={20} />}
                  >
                    Adicionar Produtos ({carrinho.length})
                  </Button>
                </div>

                {/* Carrinho */}
                {carrinho.length > 0 && (
                  <div className="mb-8">
                    <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-4">
                      Carrinho
                    </h3>
                    <div className="space-y-3 max-h-40 overflow-y-auto">
                      {carrinho.map((item) => (
                        <div key={item.produto.id} className="bg-gray-50/50 dark:bg-gray-700/50 rounded-2xl p-4">
                          <div className="flex justify-between items-start">
                            <div className="flex-1">
                              <h4 className="font-medium text-gray-900 dark:text-white">
                                {item.quantidade}x {item.produto.nome}
                              </h4>
                              <p className="text-sm text-gray-500 dark:text-gray-400">
                                {formatarDinheiro(item.produto.preco)} cada
                              </p>
                            </div>
                            <div className="text-right">
                              <p className="font-bold text-gray-900 dark:text-white">
                                {formatarDinheiro(item.produto.preco * item.quantidade)}
                              </p>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                    <div className="mt-4 pt-4 border-t border-gray-200/50 dark:border-gray-700/50">
                      <div className="flex justify-between items-center">
                        <span className="text-lg font-bold text-gray-900 dark:text-white">Total</span>
                        <span className="text-2xl font-bold text-green-600 dark:text-green-400">
                          {formatarDinheiro(calcularTotalCarrinho())}
                        </span>
                      </div>
                    </div>
                  </div>
                )}

                {/* Botões de Ação */}
                <div className="flex gap-4">
                  <Button
                    type="button"
                    variant="ghost"
                    onClick={() => {
                      setShowNovoAvulsoModal(false);
                      setCarrinho([]);
                      setClienteData({
                        nome: '',
                        telefone: '',
                        tipo: 'balcao',
                        endereco: '',
                        observacao: ''
                      });
                    }}
                    className="flex-1 bg-gray-100/80 dark:bg-gray-700/80 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600 rounded-2xl py-4 font-semibold transition-all duration-200"
                  >
                    Cancelar
                  </Button>
                  <Button
                    onClick={criarPedidoAvulso}
                    variant="primary"
                    isLoading={loading}
                    disabled={!clienteData.nome || carrinho.length === 0}
                    className="flex-1 bg-gradient-to-r from-green-600 via-green-700 to-emerald-700 hover:from-green-700 hover:via-green-800 hover:to-emerald-800 text-white rounded-2xl py-4 font-semibold shadow-xl hover:shadow-2xl transition-all duration-200 transform hover:scale-105"
                    icon={<CheckCircle size={20} />}
                  >
                    Criar Pedido
                  </Button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Modal de Seleção de Produtos */}
        {showCarrinhoModal && (
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-50">
            <div className="bg-white/95 dark:bg-gray-800/95 backdrop-blur-sm rounded-3xl max-w-6xl w-full max-h-[95vh] overflow-hidden shadow-2xl border border-white/20 dark:border-gray-700/50">
              {/* Header */}
              <div className="relative overflow-hidden">
                <div className="bg-gradient-to-r from-blue-600 via-blue-700 to-indigo-700 p-8">
                  <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full -mr-16 -mt-16"></div>
                  <div className="relative flex justify-between items-center">
                    <div className="flex items-center">
                      <div className="p-3 bg-white/20 backdrop-blur-sm rounded-2xl mr-4">
                        <Package size={24} className="text-white" />
                      </div>
                      <div className="text-white">
                        <h2 className="text-2xl font-bold">Selecionar Produtos</h2>
                        <p className="text-blue-100">
                          Adicione produtos ao carrinho da venda avulsa
                        </p>
                      </div>
                    </div>
                    <button
                      onClick={() => setShowCarrinhoModal(false)}
                      className="p-2 text-white/70 hover:text-white hover:bg-white/20 rounded-xl transition-colors"
                    >
                      <X size={24} />
                    </button>
                  </div>
                </div>
              </div>

              <div className="p-8 overflow-y-auto max-h-[calc(95vh-280px)]">
                {/* Filtros */}
                <div className="mb-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="relative">
                      <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                      <input
                        type="text"
                        placeholder="Buscar produtos..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="w-full pl-10 pr-4 py-3 bg-gray-50/50 dark:bg-gray-700/50 border border-gray-200/50 dark:border-gray-600/50 rounded-2xl focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 focus:border-blue-500 dark:focus:border-blue-400 transition-all duration-200 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400"
                      />
                    </div>

                    <select
                      value={categoryFilter}
                      onChange={(e) => setCategoryFilter(e.target.value)}
                      className="px-4 py-3 bg-gray-50/50 dark:bg-gray-700/50 border border-gray-200/50 dark:border-gray-600/50 rounded-2xl focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 focus:border-blue-500 dark:focus:border-blue-400 transition-all duration-200 text-gray-900 dark:text-white"
                    >
                      <option value="todas">Todas as categorias</option>
                      {categorias.map(categoria => (
                        <option key={categoria} value={categoria}>{categoria}</option>
                      ))}
                    </select>
                  </div>
                </div>

                {/* Grid de Produtos */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {produtosFiltrados.map((produto) => (
                    <div 
                      key={produto.id}
                      className="group bg-white/90 dark:bg-gray-800/90 backdrop-blur-sm rounded-3xl shadow-xl border border-white/20 dark:border-gray-700/50 overflow-hidden hover:shadow-2xl transition-all duration-300 hover:transform hover:scale-105"
                    >
                      {/* Imagem do Produto */}
                      <div className="relative h-40 overflow-hidden">
                        {produto.imagem_url ? (
                          <img
                            src={produto.imagem_url}
                            alt={produto.nome}
                            className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-300"
                          />
                        ) : (
                          <div className="w-full h-full bg-gradient-to-br from-gray-100 to-gray-200 dark:from-gray-700 dark:to-gray-600 flex items-center justify-center">
                            <Package className="w-12 h-12 text-gray-400 dark:text-gray-500" />
                          </div>
                        )}
                        <div className="absolute top-3 right-3 bg-white/95 dark:bg-gray-800/95 backdrop-blur-sm px-3 py-1 rounded-full shadow-lg">
                          <span className="text-sm font-bold text-blue-600 dark:text-blue-400">
                            {formatarDinheiro(produto.preco)}
                          </span>
                        </div>
                      </div>

                      {/* Info do Produto */}
                      <div className="p-6">
                        <h3 className="font-bold text-lg text-gray-900 dark:text-white mb-2 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
                          {produto.nome}
                        </h3>
                        <p className="text-sm text-gray-600 dark:text-gray-400 mb-4 line-clamp-2">
                          {produto.descricao}
                        </p>
                        <div className="flex items-center justify-between mb-4">
                          <span className="text-xs bg-blue-100 dark:bg-blue-900/50 text-blue-800 dark:text-blue-200 px-3 py-1 rounded-full font-medium">
                            {produto.categoria}
                          </span>
                        </div>
                        
                        <Button
                          onClick={() => adicionarAoCarrinho(produto)}
                          variant="primary"
                          fullWidth
                          icon={<Plus size={18} />}
                          className="bg-gradient-to-r from-blue-600 to-indigo-700 hover:from-blue-700 hover:to-indigo-800 text-white rounded-2xl py-3 font-semibold shadow-lg hover:shadow-xl transition-all duration-200 transform hover:scale-105"
                        >
                          Adicionar
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>

                {produtosFiltrados.length === 0 && (
                  <div className="text-center py-8">
                    <Package className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                    <p className="text-gray-500">Nenhum produto encontrado</p>
                  </div>
                )}
              </div>

              {/* Footer */}
              <div className="bg-gray-50/90 dark:bg-gray-700/90 backdrop-blur-sm px-8 py-6 border-t border-gray-200/50 dark:border-gray-600/50">
                <div className="flex justify-between items-center">
                  <div>
                    <p className="text-sm text-gray-500 dark:text-gray-400">
                      {carrinho.length} {carrinho.length === 1 ? 'item' : 'itens'} no carrinho
                    </p>
                    {carrinho.length > 0 && (
                      <p className="text-lg font-bold text-gray-900 dark:text-white">
                        Total: {formatarDinheiro(calcularTotalCarrinho())}
                      </p>
                    )}
                  </div>
                  <Button
                    onClick={() => setShowCarrinhoModal(false)}
                    variant="primary"
                    className="bg-gradient-to-r from-green-600 to-emerald-700 hover:from-green-700 hover:to-emerald-800 text-white px-8 py-3 rounded-2xl font-semibold shadow-xl hover:shadow-2xl transition-all duration-200 transform hover:scale-105"
                    icon={<CheckCircle size={20} />}
                  >
                    Confirmar Seleção
                  </Button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Modal de Pagamento */}
        {showPagamentoModal && pedidoParaPagamento && (
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-50">
            <div className="bg-white/95 dark:bg-gray-800/95 backdrop-blur-sm rounded-3xl max-w-2xl w-full max-h-[95vh] overflow-hidden shadow-2xl border border-white/20 dark:border-gray-700/50">
              {/* Header */}
              <div className="relative overflow-hidden">
                <div className="bg-gradient-to-r from-green-600 via-green-700 to-emerald-700 p-8">
                  <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full -mr-16 -mt-16"></div>
                  <div className="relative flex justify-between items-center">
                    <div className="flex items-center">
                      <div className="p-3 bg-white/20 backdrop-blur-sm rounded-2xl mr-4">
                        <Receipt size={24} className="text-white" />
                      </div>
                      <div className="text-white">
                        <h2 className="text-2xl font-bold">Finalizar Pagamento</h2>
                        <p className="text-green-100">
                          {tipoPedidoParaPagamento === 'mesa' 
                            ? `Mesa ${pedidoParaPagamento.numero}`
                            : `Pedido #${pedidoParaPagamento.numero} - ${pedidoParaPagamento.cliente}`
                          }
                        </p>
                      </div>
                    </div>
                    <button
                      onClick={() => {
                        setShowPagamentoModal(false);
                        setPedidoParaPagamento(null);
                        resetPagamentoData();
                      }}
                      className="p-2 text-white/70 hover:text-white hover:bg-white/20 rounded-xl transition-colors"
                    >
                      <X size={24} />
                    </button>
                  </div>
                </div>
              </div>

              <div className="p-8 overflow-y-auto max-h-[calc(95vh-200px)]">
                {/* Resumo do Pedido */}
                <div className="mb-6">
                  <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-4">
                    Resumo do Pedido
                  </h3>
                  <div className="bg-gray-50/50 dark:bg-gray-700/50 rounded-2xl p-6">
                    <div className="space-y-2">
                      {pedidoParaPagamento.itens?.slice(0, 5).map((item: any, index: number) => (
                        <div key={index} className="flex justify-between text-sm">
                          <span className="text-gray-600 dark:text-gray-400">
                            {item.quantidade}x {item.produto_nome || item.nome}
                          </span>
                          <span className="text-gray-900 dark:text-white font-medium">
                            {formatarDinheiro((item.preco_unitario || item.preco) * item.quantidade)}
                          </span>
                        </div>
                      ))}
                      {pedidoParaPagamento.itens?.length > 5 && (
                        <div className="text-xs text-gray-500 dark:text-gray-400 text-center">
                          +{pedidoParaPagamento.itens.length - 5} itens
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                {/* Adicionais */}
                <div className="mb-6">
                  <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-4">
                    Adicionais
                  </h3>
                  <div className="space-y-4">
                    <div className="flex items-center justify-between p-4 bg-gray-50/50 dark:bg-gray-700/50 rounded-2xl">
                      <div className="flex items-center">
                        <input
                          type="checkbox"
                          id="taxaServico"
                          checked={pagamentoData.taxaServico}
                          onChange={(e) => setPagamentoData({ 
                            ...pagamentoData, 
                            taxaServico: e.target.checked 
                          })}
                          className="h-4 w-4 text-green-600 focus:ring-green-500 border-gray-300 rounded"
                        />
                        <label htmlFor="taxaServico" className="ml-3 text-sm font-medium text-gray-700 dark:text-gray-300">
                          Taxa de Serviço (10%)
                        </label>
                      </div>
                      <span className="text-sm font-bold text-gray-900 dark:text-white">
                        {formatarDinheiro(pagamentoData.taxaServico ? pedidoParaPagamento.valor_total * 0.1 : 0)}
                      </span>
                    </div>

                    <div className="flex items-center justify-between p-4 bg-gray-50/50 dark:bg-gray-700/50 rounded-2xl">
                      <div className="flex items-center">
                        <input
                          type="checkbox"
                          id="couvert"
                          checked={pagamentoData.couvertArtistico}
                          onChange={(e) => setPagamentoData({ 
                            ...pagamentoData, 
                            couvertArtistico: e.target.checked 
                          })}
                          className="h-4 w-4 text-green-600 focus:ring-green-500 border-gray-300 rounded"
                        />
                        <label htmlFor="couvert" className="ml-3 text-sm font-medium text-gray-700 dark:text-gray-300">
                          Couvert Artístico
                        </label>
                      </div>
                      <span className="text-sm font-bold text-gray-900 dark:text-white">
                        {formatarDinheiro(pagamentoData.couvertArtistico ? 15 : 0)}
                      </span>
                    </div>

                    {/* Desconto */}
                    <div className="p-4 bg-gray-50/50 dark:bg-gray-700/50 rounded-2xl">
                      <h4 className="text-sm font-bold text-gray-700 dark:text-gray-300 mb-3">Desconto</h4>
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <select
                            value={pagamentoData.desconto.tipo}
                            onChange={(e) => setPagamentoData({
                              ...pagamentoData,
                              desconto: { ...pagamentoData.desconto, tipo: e.target.value as any }
                            })}
                            className="w-full px-3 py-2 bg-white dark:bg-gray-600 border border-gray-300 dark:border-gray-500 rounded-xl text-sm"
                          >
                            <option value="percentual">Percentual (%)</option>
                            <option value="valor">Valor (R$)</option>
                          </select>
                        </div>
                        <div>
                          <input
                            type="number"
                            value={pagamentoData.desconto.valor}
                            onChange={(e) => setPagamentoData({
                              ...pagamentoData,
                              desconto: { ...pagamentoData.desconto, valor: parseFloat(e.target.value) || 0 }
                            })}
                            min="0"
                            step={pagamentoData.desconto.tipo === 'percentual' ? '1' : '0.01'}
                            className="w-full px-3 py-2 bg-white dark:bg-gray-600 border border-gray-300 dark:border-gray-500 rounded-xl text-sm"
                            placeholder={pagamentoData.desconto.tipo === 'percentual' ? "0%" : "R$ 0,00"}
                          />
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Total */}
                <div className="mb-6">
                  <div className="bg-gradient-to-r from-green-50 to-emerald-50 dark:from-green-900/20 dark:to-emerald-900/20 rounded-2xl p-6 border border-green-200/50 dark:border-green-700/50">
                    <div className="flex justify-between items-center">
                      <div>
                        <p className="text-lg font-semibold text-green-700 dark:text-green-300">
                          Total a Pagar
                        </p>
                        <p className="text-sm text-green-600 dark:text-green-400">
                          {pedidoParaPagamento.itens?.length || 0} {(pedidoParaPagamento.itens?.length || 0) === 1 ? 'item' : 'itens'}
                        </p>
                      </div>
                      <div className="text-right">
                        <span className="text-3xl font-bold text-green-600 dark:text-green-400">
                          {formatarDinheiro(calcularTotalPagamento(pedidoParaPagamento.valor_total).valorTotal)}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Formas de Pagamento */}
                <div className="mb-6">
                  <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-4">
                    Forma de Pagamento
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <button
                      onClick={() => setPagamentoData({ ...pagamentoData, formaPagamento: 'pix' })}
                      className={`p-6 rounded-2xl border-2 transition-all duration-300 transform hover:scale-105 ${
                        pagamentoData.formaPagamento === 'pix'
                          ? 'border-blue-500 bg-gradient-to-br from-blue-50 to-blue-100 dark:from-blue-900/30 dark:to-blue-800/20 shadow-lg'
                          : 'border-gray-200 dark:border-gray-600 hover:border-blue-300 bg-white/50 dark:bg-gray-700/50 hover:shadow-md'
                      }`}
                    >
                      <div className="text-center">
                        <div className="p-3 bg-blue-100 dark:bg-blue-900/50 rounded-2xl w-fit mx-auto mb-3">
                          <Target className="w-6 h-6 text-blue-600 dark:text-blue-400" />
                        </div>
                        <span className="font-bold text-gray-900 dark:text-white">PIX</span>
                      </div>
                    </button>

                    <button
                      onClick={() => setPagamentoData({ ...pagamentoData, formaPagamento: 'cartao' })}
                      className={`p-6 rounded-2xl border-2 transition-all duration-300 transform hover:scale-105 ${
                        pagamentoData.formaPagamento === 'cartao'
                          ? 'border-purple-500 bg-gradient-to-br from-purple-50 to-purple-100 dark:from-purple-900/30 dark:to-purple-800/20 shadow-lg'
                          : 'border-gray-200 dark:border-gray-600 hover:border-purple-300 bg-white/50 dark:bg-gray-700/50 hover:shadow-md'
                      }`}
                    >
                      <div className="text-center">
                        <div className="p-3 bg-purple-100 dark:bg-purple-900/50 rounded-2xl w-fit mx-auto mb-3">
                          <CreditCard className="w-6 h-6 text-purple-600 dark:text-purple-400" />
                        </div>
                        <span className="font-bold text-gray-900 dark:text-white">Cartão</span>
                      </div>
                    </button>

                    <button
                      onClick={() => setPagamentoData({ ...pagamentoData, formaPagamento: 'dinheiro' })}
                      className={`p-6 rounded-2xl border-2 transition-all duration-300 transform hover:scale-105 ${
                        pagamentoData.formaPagamento === 'dinheiro'
                          ? 'border-green-500 bg-gradient-to-br from-green-50 to-green-100 dark:from-green-900/30 dark:to-green-800/20 shadow-lg'
                          : 'border-gray-200 dark:border-gray-600 hover:border-green-300 bg-white/50 dark:bg-gray-700/50 hover:shadow-md'
                      }`}
                    >
                      <div className="text-center">
                        <div className="p-3 bg-green-100 dark:bg-green-900/50 rounded-2xl w-fit mx-auto mb-3">
                          <DollarSign className="w-6 h-6 text-green-600 dark:text-green-400" />
                        </div>
                        <span className="font-bold text-gray-900 dark:text-white">Dinheiro</span>
                      </div>
                    </button>
                  </div>
                </div>

                {/* Botões de Ação */}
                <div className="flex gap-4">
                  <Button
                    type="button"
                    variant="ghost"
                    onClick={() => {
                      setShowPagamentoModal(false);
                      setPedidoParaPagamento(null);
                      resetPagamentoData();
                    }}
                    className="flex-1 bg-gray-100/80 dark:bg-gray-700/80 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600 rounded-2xl py-4 font-semibold transition-all duration-200"
                  >
                    Cancelar
                  </Button>
                  <Button
                    onClick={finalizarPagamentoPedido}
                    variant="primary"
                    isLoading={loading}
                    disabled={!pagamentoData.formaPagamento}
                    className="flex-1 bg-gradient-to-r from-green-600 via-green-700 to-emerald-700 hover:from-green-700 hover:via-green-800 hover:to-emerald-800 text-white rounded-2xl py-4 font-semibold shadow-xl hover:shadow-2xl transition-all duration-200 transform hover:scale-105"
                    icon={<CheckCircle size={20} />}
                  >
                    Confirmar Pagamento
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

export default PDV;