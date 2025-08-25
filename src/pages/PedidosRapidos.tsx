import React, { useState, useEffect } from 'react';
import { 
  Plus, Search, Filter, Clock, User, MapPin, Phone, 
  CreditCard, QrCode, Wallet, ShoppingBag, X, Check,
  AlertTriangle, RefreshCw, Package, DollarSign, Zap,
  Sparkles, Coffee, Truck, Home, Receipt, Eye
} from 'lucide-react';
import Button from '../components/ui/Button';
import { formatarDinheiro } from '../utils/formatters';
import { useAuth } from '../contexts/AuthContext';
import { useRestaurante } from '../contexts/RestauranteContext';
import { usePermissions } from '../hooks/useEmployeeAuth';
import { supabase } from '../services/supabase';
import CaixaService from '../services/CaixaService';
import toast from 'react-hot-toast';

interface Pedido {
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
  itens: ItemPedido[];
}

interface ItemPedido {
  id: string;
  produto_id: string;
  produto_nome: string;
  categoria: string;
  quantidade: number;
  preco_unitario: number;
  observacao?: string;
  status: 'pendente' | 'preparando' | 'pronto' | 'entregue' | 'cancelado';
}

interface ItemCarrinho {
  produto_id: string;
  nome: string;
  preco: number;
  categoria: string;
  quantidade: number;
  observacao?: string;
}

const PedidosRapidos: React.FC = () => {
  const { user, userRole, isEmployee } = useAuth();
  const { hasPermission } = usePermissions();
  const { restaurante, produtos } = useRestaurante();
  
  const [pedidos, setPedidos] = useState<Pedido[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [showPagamentoModal, setShowPagamentoModal] = useState(false);
  const [selectedPedido, setSelectedPedido] = useState<Pedido | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('todos');
  const [tipoFilter, setTipoFilter] = useState('todos');
  
  // Form states
  const [formData, setFormData] = useState({
    cliente_nome: '',
    cliente_telefone: '',
    tipo: 'balcao' as 'balcao' | 'delivery' | 'rapido',
    endereco_entrega: '',
    observacao: ''
  });
  const [carrinho, setCarrinho] = useState<ItemCarrinho[]>([]);
  const [produtoSelecionado, setProdutoSelecionado] = useState('');
  const [quantidadeProduto, setQuantidadeProduto] = useState(1);
  const [observacaoProduto, setObservacaoProduto] = useState('');
  
  // Payment states
  const [formaPagamento, setFormaPagamento] = useState<'pix' | 'dinheiro' | 'cartao' | null>(null);
  const [caixaAtual, setCaixaAtual] = useState<any>(null);

  // Verificar permissões
  const temPermissao = hasPermission('pdv') || (userRole === 'admin' && !isEmployee);

  useEffect(() => {
    if (restaurante?.id && temPermissao) {
      loadPedidos();
      loadCaixaAtual();
    }
  }, [restaurante?.id, temPermissao]);

  // Realtime subscription para pedidos
  useEffect(() => {
    if (!restaurante?.id) return;

    const channel = supabase
      .channel('pedidos_changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'pedidos',
          filter: `restaurante_id=eq.${restaurante.id}`
        },
        () => {
          loadPedidos();
        }
      )
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'itens_pedido'
        },
        () => {
          loadPedidos();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [restaurante?.id]);

  const loadCaixaAtual = async () => {
    try {
      if (!restaurante?.id || !user?.id) return;

      const caixa = await CaixaService.getOperadorCaixaAberto(user.id);
      setCaixaAtual(caixa);
    } catch (error) {
      console.error('Error loading caixa:', error);
    }
  };

  const loadPedidos = async () => {
    try {
      setLoading(true);
      
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
        .order('created_at', { ascending: false });

      if (error) throw error;

      const pedidosFormatados: Pedido[] = (data || []).map(pedido => ({
        ...pedido,
        itens: pedido.itens.map((item: any) => ({
          id: item.id,
          produto_id: item.produto_id,
          produto_nome: item.produto.nome,
          categoria: item.produto.categoria,
          quantidade: item.quantidade,
          preco_unitario: item.preco_unitario,
          observacao: item.observacao,
          status: item.status
        }))
      }));

      setPedidos(pedidosFormatados);
    } catch (error) {
      console.error('Error loading pedidos:', error);
      toast.error('Erro ao carregar pedidos');
    } finally {
      setLoading(false);
    }
  };

  const adicionarItemCarrinho = () => {
    if (!produtoSelecionado) {
      toast.error('Selecione um produto');
      return;
    }

    const produto = produtos.find(p => p.id === produtoSelecionado);
    if (!produto) return;

    const itemExistente = carrinho.find(item => item.produto_id === produtoSelecionado);
    
    if (itemExistente) {
      setCarrinho(carrinho.map(item => 
        item.produto_id === produtoSelecionado 
          ? { ...item, quantidade: item.quantidade + quantidadeProduto }
          : item
      ));
    } else {
      setCarrinho([...carrinho, {
        produto_id: produto.id,
        nome: produto.nome,
        preco: produto.preco,
        categoria: produto.categoria,
        quantidade: quantidadeProduto,
        observacao: observacaoProduto || undefined
      }]);
    }

    setProdutoSelecionado('');
    setQuantidadeProduto(1);
    setObservacaoProduto('');
    toast.success('Item adicionado ao pedido!');
  };

  const removerItemCarrinho = (produtoId: string) => {
    setCarrinho(carrinho.filter(item => item.produto_id !== produtoId));
  };

  const calcularTotal = () => {
    return carrinho.reduce((total, item) => total + (item.preco * item.quantidade), 0);
  };

  const handleSubmitPedido = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!restaurante?.id || !user?.id) {
      toast.error('Dados do restaurante não encontrados');
      return;
    }

    if (carrinho.length === 0) {
      toast.error('Adicione pelo menos um item ao pedido');
      return;
    }

    if (!formData.cliente_nome.trim()) {
      toast.error('Nome do cliente é obrigatório');
      return;
    }

    if (formData.tipo === 'delivery' && !formData.endereco_entrega?.trim()) {
      toast.error('Endereço de entrega é obrigatório para delivery');
      return;
    }

    try {
      setLoading(true);

      // Criar pedido
      const { data: novoPedido, error: pedidoError } = await supabase
        .from('pedidos')
        .insert({
          restaurante_id: restaurante.id,
          cliente_nome: formData.cliente_nome.trim(),
          cliente_telefone: formData.cliente_telefone?.trim() || null,
          tipo: formData.tipo,
          endereco_entrega: formData.tipo === 'delivery' ? formData.endereco_entrega?.trim() : null,
          observacao: formData.observacao?.trim() || null,
          usuario_id: user.id,
          status: 'aberto'
        })
        .select()
        .single();

      if (pedidoError) throw pedidoError;

      // Adicionar itens ao pedido
      const itensParaInserir = carrinho.map(item => ({
        pedido_id: novoPedido.id,
        produto_id: item.produto_id,
        quantidade: item.quantidade,
        preco_unitario: item.preco,
        observacao: item.observacao || null,
        status: 'pendente'
      }));

      const { error: itensError } = await supabase
        .from('itens_pedido')
        .insert(itensParaInserir);

      if (itensError) throw itensError;

      toast.success(`Pedido #${novoPedido.numero} criado com sucesso!`);
      
      // Reset form
      setFormData({
        cliente_nome: '',
        cliente_telefone: '',
        tipo: 'balcao',
        endereco_entrega: '',
        observacao: ''
      });
      setCarrinho([]);
      setShowModal(false);
      
      // Reload pedidos
      await loadPedidos();
    } catch (error) {
      console.error('Error creating pedido:', error);
      toast.error('Erro ao criar pedido');
    } finally {
      setLoading(false);
    }
  };

  const handlePagamento = async () => {
    if (!selectedPedido || !formaPagamento) {
      toast.error('Selecione uma forma de pagamento');
      return;
    }

    try {
      setLoading(true);

      // Finalizar pagamento usando a função do banco
      const { error } = await supabase.rpc('finalizar_pagamento_pedido', {
        p_pedido_id: selectedPedido.id,
        p_forma_pagamento: formaPagamento,
        p_usuario_id: user?.id
      });

      if (error) throw error;

      toast.success(`Pagamento do Pedido #${selectedPedido.numero} finalizado!`);
      
      setShowPagamentoModal(false);
      setSelectedPedido(null);
      setFormaPagamento(null);
      
      // Reload data
      await loadPedidos();
      await loadCaixaAtual();
    } catch (error) {
      console.error('Error processing payment:', error);
      toast.error('Erro ao processar pagamento');
    } finally {
      setLoading(false);
    }
  };

  const cancelarPedido = async (pedidoId: string) => {
    if (!confirm('Tem certeza que deseja cancelar este pedido?')) return;

    try {
      const { error } = await supabase
        .from('pedidos')
        .update({ status: 'cancelado' })
        .eq('id', pedidoId);

      if (error) throw error;

      toast.success('Pedido cancelado');
      await loadPedidos();
    } catch (error) {
      console.error('Error canceling pedido:', error);
      toast.error('Erro ao cancelar pedido');
    }
  };

  const getTipoIcon = (tipo: string) => {
    switch (tipo) {
      case 'balcao': return <Coffee className="w-5 h-5" />;
      case 'delivery': return <Truck className="w-5 h-5" />;
      case 'rapido': return <Zap className="w-5 h-5" />;
      default: return <ShoppingBag className="w-5 h-5" />;
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
      case 'entregue': return 'bg-gray-100 text-gray-800 dark:bg-gray-900/50 dark:text-gray-200';
      case 'pago': return 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/50 dark:text-emerald-200';
      case 'cancelado': return 'bg-red-100 text-red-800 dark:bg-red-900/50 dark:text-red-200';
      default: return 'bg-gray-100 text-gray-800 dark:bg-gray-900/50 dark:text-gray-200';
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'aberto': return 'Aguardando Pagamento';
      case 'em_preparo': return 'Em Preparo';
      case 'pronto': return 'Pronto';
      case 'entregue': return 'Entregue';
      case 'pago': return 'Pago';
      case 'cancelado': return 'Cancelado';
      default: return status;
    }
  };

  const filteredPedidos = pedidos.filter(pedido => {
    const matchSearch = pedido.cliente_nome.toLowerCase().includes(searchTerm.toLowerCase()) ||
                       pedido.numero.toString().includes(searchTerm);
    const matchStatus = statusFilter === 'todos' || pedido.status === statusFilter;
    const matchTipo = tipoFilter === 'todos' || pedido.tipo === tipoFilter;
    return matchSearch && matchStatus && matchTipo;
  });

  // Verificar permissões
  if (!temPermissao) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-50 dark:bg-gray-900">
        <div className="text-center">
          <AlertTriangle size={48} className="mx-auto text-red-500 mb-4" />
          <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-2">Acesso Restrito</h2>
          <p className="text-gray-600 dark:text-gray-400">
            Apenas administradores e funcionários do caixa têm acesso aos pedidos rápidos.
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
              <Zap className="w-8 h-8 text-blue-600 dark:text-blue-400" />
            </div>
          </div>
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
            Carregando Pedidos
          </h3>
          <p className="text-gray-600 dark:text-gray-400">
            Aguarde enquanto carregamos os pedidos rápidos...
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
                  <div className="p-4 bg-gradient-to-br from-purple-500 via-purple-600 to-indigo-600 rounded-3xl shadow-2xl mr-6 transform rotate-3 hover:rotate-0 transition-transform duration-300">
                    <Zap size={32} className="text-white" />
                  </div>
                  <div className="absolute -top-2 -right-2 w-6 h-6 bg-gradient-to-r from-yellow-400 to-orange-500 rounded-full flex items-center justify-center shadow-lg">
                    <Sparkles className="w-3 h-3 text-white" />
                  </div>
                </div>
                <div>
                  <h1 className="text-4xl font-bold bg-gradient-to-r from-gray-900 via-purple-800 to-indigo-900 dark:from-white dark:via-purple-200 dark:to-indigo-200 bg-clip-text text-transparent">
                    Pedidos Rápidos
                  </h1>
                  <p className="text-xl text-gray-600 dark:text-gray-400 mt-2">
                    Balcão, Delivery e Pedidos Expressos
                  </p>
                </div>
              </div>
            </div>
            
            <div className="flex flex-wrap gap-3">
              <Button
                variant="ghost"
                icon={<RefreshCw size={18} />}
                onClick={loadPedidos}
                isLoading={loading}
                className="bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm shadow-lg hover:shadow-xl transition-all duration-300 border border-white/20 dark:border-gray-700/50"
              >
                Atualizar
              </Button>
              <Button
                onClick={() => setShowModal(true)}
                className="bg-gradient-to-r from-purple-600 via-purple-700 to-indigo-700 hover:from-purple-700 hover:via-purple-800 hover:to-indigo-800 text-white px-8 py-3 rounded-2xl flex items-center gap-3 transition-all duration-300 shadow-xl hover:shadow-2xl transform hover:scale-105 active:scale-95"
              >
                <Plus className="w-5 h-5" />
                <span className="font-semibold">Novo Pedido</span>
              </Button>
            </div>
          </div>
        </div>

        {/* Filtros */}
        <div className="bg-white/90 dark:bg-gray-800/90 backdrop-blur-sm rounded-3xl shadow-xl border border-white/20 dark:border-gray-700/50 p-6 mb-8">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
              <input
                type="text"
                placeholder="Buscar por cliente ou número..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-3 bg-gray-50/50 dark:bg-gray-700/50 border border-gray-200/50 dark:border-gray-600/50 rounded-2xl focus:ring-2 focus:ring-purple-500 dark:focus:ring-purple-400 focus:border-purple-500 dark:focus:border-purple-400 transition-all duration-200 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400"
              />
            </div>

            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="px-4 py-3 bg-gray-50/50 dark:bg-gray-700/50 border border-gray-200/50 dark:border-gray-600/50 rounded-2xl focus:ring-2 focus:ring-purple-500 dark:focus:ring-purple-400 focus:border-purple-500 dark:focus:border-purple-400 transition-all duration-200 text-gray-900 dark:text-white"
            >
              <option value="todos">Todos os status</option>
              <option value="aberto">Aguardando Pagamento</option>
              <option value="em_preparo">Em Preparo</option>
              <option value="pronto">Pronto</option>
              <option value="pago">Pago</option>
              <option value="cancelado">Cancelado</option>
            </select>

            <select
              value={tipoFilter}
              onChange={(e) => setTipoFilter(e.target.value)}
              className="px-4 py-3 bg-gray-50/50 dark:bg-gray-700/50 border border-gray-200/50 dark:border-gray-600/50 rounded-2xl focus:ring-2 focus:ring-purple-500 dark:focus:ring-purple-400 focus:border-purple-500 dark:focus:border-purple-400 transition-all duration-200 text-gray-900 dark:text-white"
            >
              <option value="todos">Todos os tipos</option>
              <option value="balcao">Balcão</option>
              <option value="delivery">Delivery</option>
              <option value="rapido">Rápido</option>
            </select>

            <div className="flex items-center justify-center">
              <span className="text-sm font-medium text-gray-600 dark:text-gray-400">
                {filteredPedidos.length} {filteredPedidos.length === 1 ? 'pedido' : 'pedidos'}
              </span>
            </div>
          </div>
        </div>

        {/* Lista de Pedidos */}
        <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
          {filteredPedidos.map((pedido) => (
            <div
              key={pedido.id}
              className="group bg-white/90 dark:bg-gray-800/90 backdrop-blur-sm rounded-3xl shadow-xl border border-white/20 dark:border-gray-700/50 overflow-hidden hover:shadow-2xl transition-all duration-300 hover:transform hover:scale-105"
            >
              {/* Header do Card */}
              <div className="relative overflow-hidden">
                <div className={`p-6 ${
                  pedido.tipo === 'balcao' ? 'bg-gradient-to-r from-blue-500 to-blue-600' :
                  pedido.tipo === 'delivery' ? 'bg-gradient-to-r from-green-500 to-green-600' :
                  'bg-gradient-to-r from-purple-500 to-purple-600'
                }`}>
                  <div className="absolute top-0 right-0 w-24 h-24 bg-white/10 rounded-full -mr-12 -mt-12"></div>
                  <div className="relative flex justify-between items-start">
                    <div className="flex items-center">
                      <div className="p-3 bg-white/20 backdrop-blur-sm rounded-2xl mr-4">
                        {getTipoIcon(pedido.tipo)}
                      </div>
                      <div className="text-white">
                        <h3 className="text-xl font-bold">Pedido #{pedido.numero}</h3>
                        <div className="flex items-center mt-1">
                          <span className={`px-3 py-1 rounded-full text-xs font-bold ${getTipoColor(pedido.tipo)} bg-white/20 text-white`}>
                            {pedido.tipo.charAt(0).toUpperCase() + pedido.tipo.slice(1)}
                          </span>
                        </div>
                      </div>
                    </div>
                    <div className="text-right text-white">
                      <p className="text-2xl font-bold">{formatarDinheiro(pedido.valor_total)}</p>
                      <p className="text-sm opacity-80">
                        {new Date(pedido.created_at).toLocaleTimeString('pt-BR')}
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Conteúdo do Card */}
              <div className="p-6">
                {/* Informações do Cliente */}
                <div className="mb-4">
                  <div className="flex items-center mb-2">
                    <User className="w-4 h-4 text-gray-500 dark:text-gray-400 mr-2" />
                    <span className="font-bold text-gray-900 dark:text-white">{pedido.cliente_nome}</span>
                  </div>
                  {pedido.cliente_telefone && (
                    <div className="flex items-center mb-2">
                      <Phone className="w-4 h-4 text-gray-500 dark:text-gray-400 mr-2" />
                      <span className="text-sm text-gray-600 dark:text-gray-400">{pedido.cliente_telefone}</span>
                    </div>
                  )}
                  {pedido.endereco_entrega && (
                    <div className="flex items-center">
                      <MapPin className="w-4 h-4 text-gray-500 dark:text-gray-400 mr-2" />
                      <span className="text-sm text-gray-600 dark:text-gray-400">{pedido.endereco_entrega}</span>
                    </div>
                  )}
                </div>

                {/* Status */}
                <div className="mb-4">
                  <span className={`px-3 py-2 rounded-full text-sm font-bold ${getStatusColor(pedido.status)}`}>
                    {getStatusText(pedido.status)}
                  </span>
                </div>

                {/* Itens do Pedido */}
                <div className="mb-4">
                  <h4 className="text-sm font-bold text-gray-700 dark:text-gray-300 mb-2">
                    Itens ({pedido.itens.length})
                  </h4>
                  <div className="space-y-2 max-h-32 overflow-y-auto">
                    {pedido.itens.map((item) => (
                      <div key={item.id} className="flex justify-between items-center text-sm bg-gray-50/50 dark:bg-gray-700/50 rounded-xl p-3">
                        <div>
                          <span className="font-medium text-gray-900 dark:text-white">
                            {item.quantidade}x {item.produto_nome}
                          </span>
                          {item.observacao && (
                            <p className="text-xs text-gray-500 dark:text-gray-400 italic">
                              "{item.observacao}"
                            </p>
                          )}
                        </div>
                        <span className="font-bold text-gray-900 dark:text-white">
                          {formatarDinheiro(item.preco_unitario * item.quantidade)}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Ações */}
                <div className="flex gap-3">
                  {pedido.status === 'aberto' && (
                    <>
                      <Button
                        onClick={() => {
                          setSelectedPedido(pedido);
                          setShowPagamentoModal(true);
                        }}
                        variant="success"
                        size="sm"
                        className="flex-1 bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700 text-white rounded-2xl py-3 font-semibold shadow-lg hover:shadow-xl transition-all duration-200 transform hover:scale-105"
                        icon={<CreditCard size={16} />}
                      >
                        Pagar
                      </Button>
                      <Button
                        onClick={() => cancelarPedido(pedido.id)}
                        variant="ghost"
                        size="sm"
                        className="bg-red-100/80 dark:bg-red-900/30 text-red-700 dark:text-red-300 hover:bg-red-200 dark:hover:bg-red-900/50 rounded-2xl py-3 font-semibold transition-all duration-200"
                        icon={<X size={16} />}
                      >
                        Cancelar
                      </Button>
                    </>
                  )}
                  
                  {(pedido.status === 'em_preparo' || pedido.status === 'pronto' || pedido.status === 'pago') && (
                    <Button
                      onClick={() => {
                        setSelectedPedido(pedido);
                        // Aqui poderia abrir um modal de detalhes se necessário
                      }}
                      variant="ghost"
                      size="sm"
                      className="flex-1 bg-gray-100/80 dark:bg-gray-700/80 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600 rounded-2xl py-3 font-semibold transition-all duration-200"
                      icon={<Eye size={16} />}
                    >
                      Ver Detalhes
                    </Button>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>

        {filteredPedidos.length === 0 && (
          <div className="text-center py-16">
            <div className="relative mb-8">
              <div className="w-32 h-32 bg-gradient-to-br from-gray-100 to-gray-200 dark:from-gray-700 dark:to-gray-600 rounded-full mx-auto flex items-center justify-center shadow-2xl">
                <Zap className="w-16 h-16 text-gray-400 dark:text-gray-500" />
              </div>
              <div className="absolute -top-2 -right-2 w-8 h-8 bg-gradient-to-r from-purple-500 to-indigo-600 rounded-full flex items-center justify-center shadow-lg transform translate-x-16">
                <Sparkles className="w-4 h-4 text-white" />
              </div>
            </div>
            <h3 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">
              {searchTerm || statusFilter !== 'todos' || tipoFilter !== 'todos'
                ? 'Nenhum pedido encontrado'
                : 'Nenhum pedido criado ainda'
              }
            </h3>
            <p className="text-lg text-gray-600 dark:text-gray-400 mb-8 max-w-md mx-auto">
              {searchTerm || statusFilter !== 'todos' || tipoFilter !== 'todos'
                ? 'Tente ajustar os filtros de busca para encontrar o que procura'
                : 'Comece criando seu primeiro pedido rápido para atendimento no balcão ou delivery'
              }
            </p>
            <Button
              onClick={() => setShowModal(true)}
              className="bg-gradient-to-r from-purple-600 via-purple-700 to-indigo-700 hover:from-purple-700 hover:via-purple-800 hover:to-indigo-800 text-white px-8 py-4 rounded-2xl font-semibold shadow-xl hover:shadow-2xl transform hover:scale-105 transition-all duration-300"
              icon={<Plus size={20} />}
            >
              Criar Primeiro Pedido
            </Button>
          </div>
        )}

        {/* Modal de Novo Pedido */}
        {showModal && (
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-50">
            <div className="bg-white/95 dark:bg-gray-800/95 backdrop-blur-sm rounded-3xl max-w-4xl w-full max-h-[90vh] overflow-y-auto shadow-2xl border border-white/20 dark:border-gray-700/50">
              {/* Header do Modal */}
              <div className="relative overflow-hidden">
                <div className="bg-gradient-to-r from-purple-600 via-purple-700 to-indigo-700 p-8">
                  <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full -mr-16 -mt-16"></div>
                  <div className="relative flex justify-between items-center">
                    <div className="flex items-center">
                      <div className="p-3 bg-white/20 backdrop-blur-sm rounded-2xl mr-4">
                        <Plus size={24} className="text-white" />
                      </div>
                      <div className="text-white">
                        <h2 className="text-2xl font-bold">Novo Pedido Rápido</h2>
                        <p className="text-purple-100">Criar pedido para balcão, delivery ou expresso</p>
                      </div>
                    </div>
                    <button
                      onClick={() => {
                        setShowModal(false);
                        setCarrinho([]);
                        setFormData({
                          cliente_nome: '',
                          cliente_telefone: '',
                          tipo: 'balcao',
                          endereco_entrega: '',
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
              
              <form onSubmit={handleSubmitPedido} className="p-8">
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                  {/* Dados do Pedido */}
                  <div className="space-y-6">
                    <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-4">
                      Dados do Pedido
                    </h3>

                    <div>
                      <label className="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-3">
                        Tipo do Pedido
                      </label>
                      <div className="grid grid-cols-3 gap-3">
                        {[
                          { value: 'balcao', label: 'Balcão', icon: <Coffee size={16} />, color: 'blue' },
                          { value: 'delivery', label: 'Delivery', icon: <Truck size={16} />, color: 'green' },
                          { value: 'rapido', label: 'Rápido', icon: <Zap size={16} />, color: 'purple' }
                        ].map((tipo) => (
                          <button
                            key={tipo.value}
                            type="button"
                            onClick={() => setFormData({ ...formData, tipo: tipo.value as any })}
                            className={`p-4 rounded-2xl border-2 transition-all duration-300 ${
                              formData.tipo === tipo.value
                                ? `border-${tipo.color}-500 bg-gradient-to-br from-${tipo.color}-50 to-${tipo.color}-100 dark:from-${tipo.color}-900/30 dark:to-${tipo.color}-800/20 shadow-lg`
                                : 'border-gray-200 dark:border-gray-600 hover:border-gray-300 bg-white/50 dark:bg-gray-700/50 hover:shadow-md'
                            }`}
                          >
                            <div className="flex flex-col items-center">
                              <div className={`mb-2 ${
                                formData.tipo === tipo.value 
                                  ? `text-${tipo.color}-600 dark:text-${tipo.color}-400` 
                                  : 'text-gray-400'
                              }`}>
                                {tipo.icon}
                              </div>
                              <span className={`text-sm font-bold ${
                                formData.tipo === tipo.value 
                                  ? `text-${tipo.color}-800 dark:text-${tipo.color}-200` 
                                  : 'text-gray-600 dark:text-gray-400'
                              }`}>
                                {tipo.label}
                              </span>
                            </div>
                          </button>
                        ))}
                      </div>
                    </div>

                    <div>
                      <label className="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-3">
                        Nome do Cliente
                      </label>
                      <input
                        type="text"
                        value={formData.cliente_nome}
                        onChange={(e) => setFormData({ ...formData, cliente_nome: e.target.value })}
                        className="w-full px-4 py-4 bg-gray-50/50 dark:bg-gray-700/50 border border-gray-200/50 dark:border-gray-600/50 rounded-2xl focus:ring-2 focus:ring-purple-500 dark:focus:ring-purple-400 focus:border-purple-500 dark:focus:border-purple-400 transition-all duration-200 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400"
                        placeholder="Nome completo do cliente"
                        required
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-3">
                        Telefone (opcional)
                      </label>
                      <input
                        type="tel"
                        value={formData.cliente_telefone}
                        onChange={(e) => setFormData({ ...formData, cliente_telefone: e.target.value })}
                        className="w-full px-4 py-4 bg-gray-50/50 dark:bg-gray-700/50 border border-gray-200/50 dark:border-gray-600/50 rounded-2xl focus:ring-2 focus:ring-purple-500 dark:focus:ring-purple-400 focus:border-purple-500 dark:focus:border-purple-400 transition-all duration-200 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400"
                        placeholder="(00) 00000-0000"
                      />
                    </div>

                    {formData.tipo === 'delivery' && (
                      <div>
                        <label className="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-3">
                          Endereço de Entrega
                        </label>
                        <textarea
                          value={formData.endereco_entrega}
                          onChange={(e) => setFormData({ ...formData, endereco_entrega: e.target.value })}
                          className="w-full px-4 py-4 bg-gray-50/50 dark:bg-gray-700/50 border border-gray-200/50 dark:border-gray-600/50 rounded-2xl focus:ring-2 focus:ring-purple-500 dark:focus:ring-purple-400 focus:border-purple-500 dark:focus:border-purple-400 transition-all duration-200 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400"
                          rows={3}
                          placeholder="Endereço completo para entrega"
                          required
                        />
                      </div>
                    )}

                    <div>
                      <label className="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-3">
                        Observações (opcional)
                      </label>
                      <textarea
                        value={formData.observacao}
                        onChange={(e) => setFormData({ ...formData, observacao: e.target.value })}
                        className="w-full px-4 py-4 bg-gray-50/50 dark:bg-gray-700/50 border border-gray-200/50 dark:border-gray-600/50 rounded-2xl focus:ring-2 focus:ring-purple-500 dark:focus:ring-purple-400 focus:border-purple-500 dark:focus:border-purple-400 transition-all duration-200 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400"
                        rows={3}
                        placeholder="Observações gerais do pedido"
                      />
                    </div>
                  </div>

                  {/* Adicionar Itens */}
                  <div className="space-y-6">
                    <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-4">
                      Itens do Pedido
                    </h3>

                    {/* Adicionar Produto */}
                    <div className="bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20 rounded-2xl p-6 border border-blue-200/50 dark:border-blue-700/50">
                      <h4 className="font-bold text-blue-800 dark:text-blue-200 mb-4">
                        Adicionar Item
                      </h4>
                      
                      <div className="space-y-4">
                        <select
                          value={produtoSelecionado}
                          onChange={(e) => setProdutoSelecionado(e.target.value)}
                          className="w-full px-4 py-3 bg-white/50 dark:bg-gray-700/50 border border-blue-200/50 dark:border-blue-600/50 rounded-2xl focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 focus:border-blue-500 dark:focus:border-blue-400 transition-all duration-200 text-gray-900 dark:text-white"
                        >
                          <option value="">Selecione um produto</option>
                          {produtos.filter(p => p.disponivel).map(produto => (
                            <option key={produto.id} value={produto.id}>
                              {produto.nome} - {formatarDinheiro(produto.preco)} ({produto.categoria})
                            </option>
                          ))}
                        </select>

                        <div className="grid grid-cols-2 gap-4">
                          <div>
                            <label className="block text-sm font-medium text-blue-700 dark:text-blue-300 mb-2">
                              Quantidade
                            </label>
                            <input
                              type="number"
                              min="1"
                              value={quantidadeProduto}
                              onChange={(e) => setQuantidadeProduto(parseInt(e.target.value) || 1)}
                              className="w-full px-4 py-3 bg-white/50 dark:bg-gray-700/50 border border-blue-200/50 dark:border-blue-600/50 rounded-2xl focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 focus:border-blue-500 dark:focus:border-blue-400 transition-all duration-200 text-gray-900 dark:text-white"
                            />
                          </div>
                          <div className="flex items-end">
                            <Button
                              type="button"
                              onClick={adicionarItemCarrinho}
                              disabled={!produtoSelecionado}
                              className="w-full bg-gradient-to-r from-blue-500 to-indigo-600 hover:from-blue-600 hover:to-indigo-700 text-white rounded-2xl py-3 font-semibold shadow-lg hover:shadow-xl transition-all duration-200"
                              icon={<Plus size={16} />}
                            >
                              Adicionar
                            </Button>
                          </div>
                        </div>

                        <div>
                          <label className="block text-sm font-medium text-blue-700 dark:text-blue-300 mb-2">
                            Observação do Item (opcional)
                          </label>
                          <input
                            type="text"
                            value={observacaoProduto}
                            onChange={(e) => setObservacaoProduto(e.target.value)}
                            className="w-full px-4 py-3 bg-white/50 dark:bg-gray-700/50 border border-blue-200/50 dark:border-blue-600/50 rounded-2xl focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 focus:border-blue-500 dark:focus:border-blue-400 transition-all duration-200 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400"
                            placeholder="Ex: Sem cebola, molho à parte..."
                          />
                        </div>
                      </div>
                    </div>

                    {/* Lista de Itens no Carrinho */}
                    <div>
                      <h4 className="font-bold text-gray-900 dark:text-white mb-4">
                        Itens Adicionados ({carrinho.length})
                      </h4>
                      
                      {carrinho.length === 0 ? (
                        <div className="text-center py-8 bg-gray-50/50 dark:bg-gray-700/50 rounded-2xl">
                          <Package className="w-12 h-12 text-gray-400 dark:text-gray-500 mx-auto mb-3" />
                          <p className="text-gray-500 dark:text-gray-400">
                            Nenhum item adicionado ainda
                          </p>
                        </div>
                      ) : (
                        <div className="space-y-3 max-h-64 overflow-y-auto">
                          {carrinho.map((item, index) => (
                            <div key={index} className="flex justify-between items-center bg-gray-50/50 dark:bg-gray-700/50 rounded-2xl p-4">
                              <div className="flex-1">
                                <div className="flex items-center justify-between">
                                  <span className="font-medium text-gray-900 dark:text-white">
                                    {item.quantidade}x {item.nome}
                                  </span>
                                  <button
                                    type="button"
                                    onClick={() => removerItemCarrinho(item.produto_id)}
                                    className="text-red-500 hover:text-red-700 p-1 rounded-full hover:bg-red-100 dark:hover:bg-red-900/30 transition-colors"
                                  >
                                    <X size={16} />
                                  </button>
                                </div>
                                <div className="flex items-center justify-between mt-1">
                                  <span className="text-sm text-gray-500 dark:text-gray-400">
                                    {item.categoria} • {formatarDinheiro(item.preco)} cada
                                  </span>
                                  <span className="font-bold text-gray-900 dark:text-white">
                                    {formatarDinheiro(item.preco * item.quantidade)}
                                  </span>
                                </div>
                                {item.observacao && (
                                  <p className="text-xs text-gray-600 dark:text-gray-400 italic mt-1">
                                    "{item.observacao}"
                                  </p>
                                )}
                              </div>
                            </div>
                          ))}
                          
                          {/* Total */}
                          <div className="border-t border-gray-200/50 dark:border-gray-600/50 pt-4">
                            <div className="flex justify-between items-center">
                              <span className="text-lg font-bold text-gray-900 dark:text-white">Total</span>
                              <span className="text-2xl font-bold text-purple-600 dark:text-purple-400">
                                {formatarDinheiro(calcularTotal())}
                              </span>
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                <div className="flex gap-4 pt-8 border-t border-gray-200/50 dark:border-gray-600/50 mt-8">
                  <Button
                    type="button"
                    variant="ghost"
                    onClick={() => {
                      setShowModal(false);
                      setCarrinho([]);
                      setFormData({
                        cliente_nome: '',
                        cliente_telefone: '',
                        tipo: 'balcao',
                        endereco_entrega: '',
                        observacao: ''
                      });
                    }}
                    className="flex-1 bg-gray-100/80 dark:bg-gray-700/80 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600 rounded-2xl py-4 font-semibold transition-all duration-200"
                  >
                    Cancelar
                  </Button>
                  <Button
                    type="submit"
                    disabled={carrinho.length === 0 || !formData.cliente_nome.trim()}
                    className="flex-1 bg-gradient-to-r from-purple-600 via-purple-700 to-indigo-700 hover:from-purple-700 hover:via-purple-800 hover:to-indigo-800 text-white rounded-2xl py-4 font-semibold shadow-xl hover:shadow-2xl transition-all duration-200 transform hover:scale-105"
                    isLoading={loading}
                  >
                    Criar Pedido
                  </Button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Modal de Pagamento */}
        {showPagamentoModal && selectedPedido && (
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-50">
            <div className="bg-white/95 dark:bg-gray-800/95 backdrop-blur-sm rounded-3xl max-w-lg w-full shadow-2xl border border-white/20 dark:border-gray-700/50">
              {/* Header do Modal */}
              <div className="relative overflow-hidden">
                <div className="bg-gradient-to-r from-green-600 via-green-700 to-emerald-700 p-6">
                  <div className="absolute top-0 right-0 w-24 h-24 bg-white/10 rounded-full -mr-12 -mt-12"></div>
                  <div className="relative flex justify-between items-center">
                    <div className="flex items-center">
                      <div className="p-3 bg-white/20 backdrop-blur-sm rounded-2xl mr-4">
                        <CreditCard size={20} className="text-white" />
                      </div>
                      <div className="text-white">
                        <h3 className="text-xl font-bold">Pagamento</h3>
                        <p className="text-green-100">Pedido #{selectedPedido.numero} - {selectedPedido.cliente_nome}</p>
                      </div>
                    </div>
                    <button
                      onClick={() => {
                        setShowPagamentoModal(false);
                        setSelectedPedido(null);
                        setFormaPagamento(null);
                      }}
                      className="p-2 text-white/70 hover:text-white hover:bg-white/20 rounded-xl transition-colors"
                    >
                      <X size={20} />
                    </button>
                  </div>
                </div>
              </div>

              <div className="p-6">
                {/* Resumo do Pedido */}
                <div className="mb-6 p-4 bg-gray-50/50 dark:bg-gray-700/50 rounded-2xl">
                  <div className="flex justify-between items-center mb-3">
                    <span className="font-bold text-gray-900 dark:text-white">Total do Pedido</span>
                    <span className="text-2xl font-bold text-green-600 dark:text-green-400">
                      {formatarDinheiro(selectedPedido.valor_total)}
                    </span>
                  </div>
                  <div className="text-sm text-gray-600 dark:text-gray-400">
                    {selectedPedido.itens.length} {selectedPedido.itens.length === 1 ? 'item' : 'itens'}
                  </div>
                </div>

                {/* Formas de Pagamento */}
                <div className="space-y-4 mb-6">
                  <h4 className="font-bold text-gray-900 dark:text-white">Forma de Pagamento</h4>
                  
                  <button
                    onClick={() => setFormaPagamento('pix')}
                    className={`w-full p-4 rounded-2xl border-2 transition-all duration-300 ${
                      formaPagamento === 'pix'
                        ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/30 shadow-lg'
                        : 'border-gray-200 dark:border-gray-600 hover:border-blue-300 bg-white/50 dark:bg-gray-700/50 hover:shadow-md'
                    }`}
                  >
                    <div className="flex items-center">
                      <QrCode size={24} className="text-blue-500 mr-3" />
                      <span className="font-medium text-gray-900 dark:text-white">PIX</span>
                    </div>
                  </button>

                  <button
                    onClick={() => setFormaPagamento('cartao')}
                    className={`w-full p-4 rounded-2xl border-2 transition-all duration-300 ${
                      formaPagamento === 'cartao'
                        ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/30 shadow-lg'
                        : 'border-gray-200 dark:border-gray-600 hover:border-blue-300 bg-white/50 dark:bg-gray-700/50 hover:shadow-md'
                    }`}
                  >
                    <div className="flex items-center">
                      <CreditCard size={24} className="text-blue-500 mr-3" />
                      <span className="font-medium text-gray-900 dark:text-white">Cartão</span>
                    </div>
                  </button>

                  <button
                    onClick={() => setFormaPagamento('dinheiro')}
                    className={`w-full p-4 rounded-2xl border-2 transition-all duration-300 ${
                      formaPagamento === 'dinheiro'
                        ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/30 shadow-lg'
                        : 'border-gray-200 dark:border-gray-600 hover:border-blue-300 bg-white/50 dark:bg-gray-700/50 hover:shadow-md'
                    }`}
                  >
                    <div className="flex items-center">
                      <Wallet size={24} className="text-blue-500 mr-3" />
                      <span className="font-medium text-gray-900 dark:text-white">Dinheiro</span>
                    </div>
                  </button>
                </div>

                {/* Aviso sobre Caixa */}
                {!caixaAtual && (
                  <div className="mb-6 p-4 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-2xl">
                    <div className="flex items-start">
                      <AlertTriangle className="h-5 w-5 text-yellow-500 mt-0.5 mr-3 flex-shrink-0" />
                      <div className="text-sm text-yellow-700 dark:text-yellow-300">
                        <p className="font-medium mb-1">Caixa Fechado</p>
                        <p>
                          O pagamento será registrado, mas não será contabilizado no caixa pois não há caixa aberto no momento.
                        </p>
                      </div>
                    </div>
                  </div>
                )}

                <div className="flex gap-4">
                  <Button
                    type="button"
                    variant="ghost"
                    onClick={() => {
                      setShowPagamentoModal(false);
                      setSelectedPedido(null);
                      setFormaPagamento(null);
                    }}
                    className="flex-1 bg-gray-100/80 dark:bg-gray-700/80 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600 rounded-2xl py-4 font-semibold transition-all duration-200"
                  >
                    Cancelar
                  </Button>
                  <Button
                    onClick={handlePagamento}
                    disabled={!formaPagamento}
                    className="flex-1 bg-gradient-to-r from-green-600 via-green-700 to-emerald-700 hover:from-green-700 hover:via-green-800 hover:to-emerald-800 text-white rounded-2xl py-4 font-semibold shadow-xl hover:shadow-2xl transition-all duration-200 transform hover:scale-105"
                    isLoading={loading}
                    icon={<Receipt size={18} />}
                  >
                    Finalizar Pagamento
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

export default PedidosRapidos;