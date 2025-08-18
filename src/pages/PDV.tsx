import React, { useState, useEffect } from 'react';
import { 
  ShoppingCart, Plus, Minus, Trash2, CreditCard, 
  DollarSign, QrCode, Calculator, Receipt, Search,
  Filter, X, Check, Clock, User, Coffee, CheckCircle,
  Power, PowerOff
} from 'lucide-react';
import Button from '../components/ui/Button';
import PDVControlModal from '../components/pdv/PDVControlModal';
import PDVStatusBar from '../components/pdv/PDVStatusBar';
import PDVService from '../services/PDVService';
import CaixaService from '../services/CaixaService';
import { useRestaurante } from '../contexts/RestauranteContext';
import { useAuth } from '../contexts/AuthContext';
import { formatarDinheiro } from '../utils/formatters';
import { Database } from '../types/database';
import toast from 'react-hot-toast';
import { usePageActive } from '../hooks/usePageVisibility';
import { usePreventReload } from '../hooks/usePreventReload';

type Produto = Database['public']['Tables']['produtos']['Row'];

interface ItemVenda {
  produto: Produto;
  quantidade: number;
  observacao?: string;
}

interface Cliente {
  nome?: string;
  telefone?: string;
  mesa?: number;
}

interface ComandaMesa {
  mesa_id: string;
  mesa_numero: number;
  mesa_capacidade: number;
  garcom?: string;
  horario_abertura?: string;
  itens: ComandaItemData[];
  valor_total: number;
}

const PDV: React.FC = () => {
  const { produtos, refreshData, mesas, itensComanda, finalizarPagamento, liberarMesa, restaurante } = useRestaurante();
  const { user, isEmployee, employeeData } = useAuth();
  const [itensVenda, setItensVenda] = useState<ItemVenda[]>([]);
  const [busca, setBusca] = useState('');
  const [categoriaSelecionada, setCategoriaSelecionada] = useState('todos');
  const [cliente, setCliente] = useState<Cliente>({});
  const [formaPagamento, setFormaPagamento] = useState<'dinheiro' | 'cartao' | 'pix' | null>(null);
  const [valorRecebido, setValorRecebido] = useState<string>('');
  const [desconto, setDesconto] = useState({
    tipo: 'percentual' as 'percentual' | 'valor',
    valor: 0
  });
  const [taxaServico, setTaxaServico] = useState(false);
  const [showPagamentoModal, setShowPagamentoModal] = useState(false);
  const [showComandasModal, setComandasModal] = useState(false);
  const [comandasSelecionada, setComandaSelecionada] = useState<ComandaMesa | null>(null);
  const [showPDVModal, setShowPDVModal] = useState(false);
  const [pdvModalMode, setPDVModalMode] = useState<'abrir' | 'fechar'>('abrir');
  const [caixaPDV, setCaixaPDV] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  
  const isPageActive = usePageActive();
  const { currentRoute } = usePreventReload();

  useEffect(() => {
    // Carrega dados sempre que o componente monta ou contexto muda
    Promise.all([
      refreshData(),
      loadCaixaPDV()
    ]);
  }, [user, restaurante?.id]);

  // Carregar caixa do PDV
  const loadCaixaPDV = async () => {
    try {
      if (!restaurante?.id) return;

      // Verificar se há um caixa aberto para o operador atual
      const operadorAtual = isEmployee && employeeData ? employeeData.id : user?.id;
      const caixa = await CaixaService.getCaixaAberto(restaurante.id, operadorAtual);
      setCaixaPDV(caixa);

      // Verificar localStorage também
      const savedCaixa = localStorage.getItem('pdvAtual');
      if (savedCaixa && !caixa) {
        try {
          const parsedCaixa = JSON.parse(savedCaixa);
          // Verificar se ainda está aberto no banco e pertence ao operador atual
          const { data } = await supabase
            .from('caixas_operadores')
            .select('*')
            .eq('id', parsedCaixa.id)
            .eq('operador_id', operadorAtual)
            .eq('status', 'aberto')
            .maybeSingle();
          
          if (data) {
            setCaixaPDV(data);
          } else {
            localStorage.removeItem('pdvAtual');
          }
        } catch (error) {
          localStorage.removeItem('pdvAtual');
        }
      }
    } catch (error) {
      console.error('Error loading PDV cash register:', error);
    }
  };

  // Salvar estado do carrinho no sessionStorage
  useEffect(() => {
    if (itensVenda.length > 0) {
      sessionStorage.setItem('pdv_carrinho', JSON.stringify({
        itensVenda,
        cliente,
        desconto,
        taxaServico,
        formaPagamento,
        valorRecebido
      }));
    }
  }, [itensVenda, cliente, desconto, taxaServico, formaPagamento, valorRecebido]);

  // Restaurar estado do carrinho ao carregar
  useEffect(() => {
    const savedState = sessionStorage.getItem('pdv_carrinho');
    if (savedState && itensVenda.length === 0) {
      try {
        const parsed = JSON.parse(savedState);
        setItensVenda(parsed.itensVenda || []);
        setCliente(parsed.cliente || {});
        setDesconto(parsed.desconto || { tipo: 'percentual', valor: 0 });
        setTaxaServico(parsed.taxaServico || false);
        setFormaPagamento(parsed.formaPagamento || null);
        setValorRecebido(parsed.valorRecebido || '');
      } catch (error) {
        console.error('Error restoring PDV state:', error);
      }
    }
  }, []);

  // Get unique categories
  const categorias = Array.from(new Set(produtos.map(produto => produto.categoria)));

  // Filter products
  const produtosFiltrados = produtos.filter(produto => {
    const matchBusca = produto.nome.toLowerCase().includes(busca.toLowerCase());
    const matchCategoria = categoriaSelecionada === 'todos' || produto.categoria === categoriaSelecionada;
    return matchBusca && matchCategoria && produto.disponivel;
  });

  // Agrupar comandas por mesa
  const comandasPorMesa = (): ComandaMesa[] => {
    // Filtrar apenas mesas do restaurante atual que estão ocupadas
    const mesasComComandas = mesas.filter(mesa => 
      mesa.status === 'ocupada' && 
      // Verificar se a mesa pertence ao restaurante do usuário logado
      mesa.restaurante_id === restaurante?.id
    );
    
    return mesasComComandas.map(mesa => {
      const itensDaMesa = itensComanda.filter(item => item.mesa_id === mesa.id);
      const valorTotal = itensDaMesa.reduce((total, item) => {
        return total + (item.preco_unitario * item.quantidade);
      }, 0);

      return {
        mesa_id: mesa.id,
        mesa_numero: mesa.numero,
        mesa_capacidade: mesa.capacidade,
        garcom: mesa.garcom,
        horario_abertura: mesa.horario_abertura,
        itens: itensDaMesa,
        valor_total: valorTotal
      };
    }).filter(comanda => comanda.itens.length > 0);
  };

  const adicionarItem = (produto: Produto) => {
    const itemExistente = itensVenda.find(item => item.produto.id === produto.id);
    
    if (itemExistente) {
      setItensVenda(itensVenda.map(item =>
        item.produto.id === produto.id
          ? { ...item, quantidade: item.quantidade + 1 }
          : item
      ));
    } else {
      setItensVenda([...itensVenda, { produto, quantidade: 1 }]);
    }
  };

  const removerItem = (produtoId: string) => {
    setItensVenda(itensVenda.filter(item => item.produto.id !== produtoId));
  };

  const alterarQuantidade = (produtoId: string, novaQuantidade: number) => {
    if (novaQuantidade <= 0) {
      removerItem(produtoId);
      return;
    }

    setItensVenda(itensVenda.map(item =>
      item.produto.id === produtoId
        ? { ...item, quantidade: novaQuantidade }
        : item
    ));
  };

  const calcularSubtotal = () => {
    return itensVenda.reduce((total, item) => {
      return total + (item.produto.preco * item.quantidade);
    }, 0);
  };

  const calcularTaxaServico = () => {
    return taxaServico ? calcularSubtotal() * 0.1 : 0;
  };

  const calcularDesconto = () => {
    const subtotal = calcularSubtotal() + calcularTaxaServico();
    if (desconto.tipo === 'percentual') {
      return subtotal * (desconto.valor / 100);
    }
    return desconto.valor;
  };

  const calcularTotal = () => {
    return calcularSubtotal() + calcularTaxaServico() - calcularDesconto();
  };

  const calcularTroco = () => {
    if (formaPagamento !== 'dinheiro' || !valorRecebido) return 0;
    const recebido = parseFloat(valorRecebido);
    const total = calcularTotal();
    return Math.max(0, recebido - total);
  };

  const finalizarVenda = async () => {
    if (itensVenda.length === 0) {
      toast.error('Adicione pelo menos um item à venda');
      return;
    }

    if (!caixaPDV) {
      toast.error('PDV precisa estar aberto para realizar vendas');
      return;
    }

    if (!formaPagamento) {
      toast.error('Selecione uma forma de pagamento');
      return;
    }

    if (formaPagamento === 'dinheiro') {
      const recebido = parseFloat(valorRecebido);
      const total = calcularTotal();
      if (isNaN(recebido) || recebido < total) {
        toast.error('Valor recebido insuficiente');
        return;
      }
    }

    setLoading(true);
    try {
      // Registrar venda no PDV
      await PDVService.registrarVenda(restaurante?.id || '', caixaPDV.id, {
        itens: itensVenda.map(item => ({
          produto_id: item.produto.id,
          nome: item.produto.nome,
          quantidade: item.quantidade,
          preco_unitario: item.produto.preco,
          observacao: item.observacao
        })),
        valor_total: calcularTotal(),
        forma_pagamento: formaPagamento,
        desconto: calcularDesconto(),
        taxa_servico: calcularTaxaServico(),
        cliente: {
          nome: cliente.nome,
          telefone: cliente.telefone,
          mesa: cliente.mesa
        }
      });
      
      toast.success('Venda finalizada com sucesso!');
      
      // Limpar carrinho
      setItensVenda([]);
      setCliente({});
      setFormaPagamento(null);
      setValorRecebido('');
      setDesconto({ tipo: 'percentual', valor: 0 });
      setTaxaServico(false);
      setShowPagamentoModal(false);
      sessionStorage.removeItem('pdv_carrinho');
      
      // Recarregar dados do caixa para atualizar saldo
      await loadCaixaPDV();
    } catch (error) {
      console.error('Error finalizing sale:', error);
      toast.error('Erro ao finalizar venda');
    } finally {
      setLoading(false);
    }
  };

  const finalizarComandaMesa = async (comanda: ComandaMesa) => {
    if (!formaPagamento) {
      toast.error('Selecione uma forma de pagamento');
      return;
    }

    setLoading(true);
    try {
      // Finalizar pagamento da comanda
      await finalizarPagamento(comanda.mesa_id, formaPagamento);
      
      // Liberar a mesa
      await liberarMesa(comanda.mesa_id);
      
      // Atualizar dados
      await refreshData();
      
      toast.success(`Comanda da Mesa ${comanda.mesa_numero} finalizada com sucesso!`);
      setComandaSelecionada(null);
      setFormaPagamento(null);
      setComandasModal(false);
    } catch (error) {
      console.error('Error finalizing comanda:', error);
      toast.error('Erro ao finalizar comanda');
    } finally {
      setLoading(false);
    }
  };

  const limparCarrinho = () => {
    setItensVenda([]);
    setCliente({});
    setDesconto({ tipo: 'percentual', valor: 0 });
    setTaxaServico(false);
  };

  const comandasDisponiveis = comandasPorMesa();

  return (
    <div className="min-h-screen bg-gray-100 dark:bg-gray-900">
      {/* Barra de Status do PDV */}
      <div className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 p-4">
        <PDVStatusBar
          caixaAtual={caixaPDV}
          onAbrirPDV={() => {
            setPDVModalMode('abrir');
            setShowPDVModal(true);
          }}
          onFecharPDV={() => {
            setPDVModalMode('fechar');
            setShowPDVModal(true);
          }}
        />
      </div>

      <div className="flex h-screen">
        {/* Produtos - Lado Esquerdo */}
        <div className="flex-1 bg-white dark:bg-gray-800 p-6 overflow-y-auto pt-2">
          <div className="mb-6">
            <div className="flex justify-between items-center mb-4">
              <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
                Ponto de Venda
              </h1>
              <Button
                variant="secondary"
                icon={<Coffee size={18} />}
                onClick={() => setComandasModal(true)}
              >
                Comandas das Mesas ({comandasDisponiveis.length})
              </Button>
            </div>
            
            {/* Filtros */}
            <div className="flex flex-col md:flex-row gap-4 mb-6">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
                <input
                  type="text"
                  placeholder="Buscar produtos..."
                  value={busca}
                  onChange={(e) => setBusca(e.target.value)}
                  className="pl-10 w-full rounded-lg border border-gray-300 dark:border-gray-600 py-2 px-4 focus:ring-2 focus:ring-red-500 focus:border-red-500 dark:bg-gray-700 dark:text-white"
                />
              </div>
              
              <select
                value={categoriaSelecionada}
                onChange={(e) => setCategoriaSelecionada(e.target.value)}
                className="border border-gray-300 dark:border-gray-600 rounded-md py-2 pl-3 pr-10 focus:ring-red-500 focus:border-red-500 dark:bg-gray-700 dark:text-white"
              >
                <option value="todos">Todas as categorias</option>
                {categorias.map((categoria) => (
                  <option key={categoria} value={categoria}>
                    {categoria}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Grid de Produtos */}
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {produtosFiltrados.map((produto) => (
              <div
                key={produto.id}
                onClick={() => {
                  if (!caixaPDV) {
                    toast.error('PDV precisa estar aberto para adicionar itens');
                    return;
                  }
                  adicionarItem(produto);
                }}
                className={`bg-white dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-lg p-4 cursor-pointer hover:shadow-md transition-shadow ${
                  !caixaPDV ? 'opacity-50 cursor-not-allowed' : ''
                }`}
              >
                <div className="text-center">
                  <h3 className="font-medium text-gray-900 dark:text-white text-sm mb-1">
                    {produto.nome}
                  </h3>
                  <p className="text-xs text-gray-500 dark:text-gray-400 mb-2">
                    {produto.categoria}
                  </p>
                  <p className="text-lg font-bold text-red-600 dark:text-red-400">
                    {formatarDinheiro(produto.preco)}
                  </p>
                  {produto.estoque <= produto.estoque_minimo && (
                    <span className="text-xs bg-red-100 text-red-800 px-2 py-1 rounded-full mt-1 inline-block">
                      Estoque baixo
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>

          {produtosFiltrados.length === 0 && (
            <div className="text-center py-8">
              <p className="text-gray-500 dark:text-gray-400">
                Nenhum produto encontrado
              </p>
            </div>
          )}
        </div>

        {/* Carrinho - Lado Direito */}
        <div className="w-96 bg-white dark:bg-gray-800 border-l border-gray-200 dark:border-gray-700 flex flex-col">
          {/* Header do Carrinho */}
          <div className="p-6 border-b border-gray-200 dark:border-gray-700">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-medium text-gray-900 dark:text-white">
                Carrinho
              </h2>
              {itensVenda.length > 0 && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={limparCarrinho}
                  icon={<Trash2 size={16} />}
                >
                  Limpar
                </Button>
              )}
            </div>
          </div>

          {/* Dados do Cliente */}
          <div className="p-4 border-b border-gray-200 dark:border-gray-700">
            <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Cliente (Opcional)
            </h3>
            <div className="space-y-2">
              <input
                type="text"
                placeholder="Nome do cliente"
                value={cliente.nome || ''}
                onChange={(e) => setCliente({ ...cliente, nome: e.target.value })}
                className="w-full text-sm border border-gray-300 dark:border-gray-600 rounded-md py-2 px-3 focus:ring-red-500 focus:border-red-500 dark:bg-gray-700 dark:text-white"
              />
              <input
                type="text"
                placeholder="Telefone"
                value={cliente.telefone || ''}
                onChange={(e) => setCliente({ ...cliente, telefone: e.target.value })}
                className="w-full text-sm border border-gray-300 dark:border-gray-600 rounded-md py-2 px-3 focus:ring-red-500 focus:border-red-500 dark:bg-gray-700 dark:text-white"
              />
              <input
                type="number"
                placeholder="Número da mesa"
                value={cliente.mesa || ''}
                onChange={(e) => setCliente({ ...cliente, mesa: parseInt(e.target.value) || undefined })}
                className="w-full text-sm border border-gray-300 dark:border-gray-600 rounded-md py-2 px-3 focus:ring-red-500 focus:border-red-500 dark:bg-gray-700 dark:text-white"
              />
            </div>
          </div>

          {/* Itens do Carrinho */}
          <div className="flex-1 overflow-y-auto p-4">
            {itensVenda.length === 0 ? (
              <div className="text-center py-8">
                <ShoppingCart size={48} className="mx-auto text-gray-400 dark:text-gray-600 mb-4" />
                <p className="text-gray-500 dark:text-gray-400">
                  Carrinho vazio
                </p>
                <p className="text-sm text-gray-400 dark:text-gray-500">
                  Clique nos produtos para adicionar
                </p>
              </div>
            ) : (
              <div className="space-y-4">
                {itensVenda.map((item) => (
                  <div
                    key={item.produto.id}
                    className="bg-gray-50 dark:bg-gray-700 rounded-lg p-3"
                  >
                    <div className="flex justify-between items-start mb-2">
                      <div className="flex-1">
                        <h4 className="font-medium text-gray-900 dark:text-white text-sm">
                          {item.produto.nome}
                        </h4>
                        <p className="text-xs text-gray-500 dark:text-gray-400">
                          {formatarDinheiro(item.produto.preco)} cada
                        </p>
                      </div>
                      <button
                        onClick={() => removerItem(item.produto.id)}
                        className="text-red-500 hover:text-red-700 p-1"
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                    
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-2">
                        <button
                          onClick={() => alterarQuantidade(item.produto.id, item.quantidade - 1)}
                          className="w-8 h-8 rounded-full bg-gray-200 dark:bg-gray-600 flex items-center justify-center hover:bg-gray-300 dark:hover:bg-gray-500"
                        >
                          <Minus size={14} />
                        </button>
                        <span className="w-8 text-center font-medium text-gray-900 dark:text-white">
                          {item.quantidade}
                        </span>
                        <button
                          onClick={() => alterarQuantidade(item.produto.id, item.quantidade + 1)}
                          className="w-8 h-8 rounded-full bg-gray-200 dark:bg-gray-600 flex items-center justify-center hover:bg-gray-300 dark:hover:bg-gray-500"
                        >
                          <Plus size={14} />
                        </button>
                      </div>
                      
                      <span className="font-medium text-gray-900 dark:text-white">
                        {formatarDinheiro(item.produto.preco * item.quantidade)}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Resumo e Pagamento */}
          {itensVenda.length > 0 && (
            <div className="border-t border-gray-200 dark:border-gray-700 p-4">
              {/* Adicionais */}
              <div className="space-y-2 mb-4">
                <div className="flex items-center justify-between">
                  <label className="flex items-center text-sm">
                    <input
                      type="checkbox"
                      checked={taxaServico}
                      onChange={(e) => setTaxaServico(e.target.checked)}
                      className="mr-2 h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                    />
                    Taxa de Serviço (10%)
                  </label>
                  <span className="text-sm font-medium">
                    {formatarDinheiro(calcularTaxaServico())}
                  </span>
                </div>

                {/* Desconto */}
                <div className="space-y-2">
                  <div className="flex items-center space-x-2">
                    <select
                      value={desconto.tipo}
                      onChange={(e) => setDesconto({ ...desconto, tipo: e.target.value as 'percentual' | 'valor' })}
                      className="text-xs border border-gray-300 dark:border-gray-600 rounded py-1 px-2 dark:bg-gray-700 dark:text-white"
                    >
                      <option value="percentual">% Desconto</option>
                      <option value="valor">R$ Desconto</option>
                    </select>
                    <input
                      type="number"
                      value={desconto.valor}
                      onChange={(e) => setDesconto({ ...desconto, valor: parseFloat(e.target.value) || 0 })}
                      min="0"
                      step={desconto.tipo === 'percentual' ? '1' : '0.01'}
                      className="flex-1 text-xs border border-gray-300 dark:border-gray-600 rounded py-1 px-2 dark:bg-gray-700 dark:text-white"
                      placeholder="0"
                    />
                  </div>
                  {calcularDesconto() > 0 && (
                    <p className="text-xs text-green-600 dark:text-green-400">
                      Desconto: -{formatarDinheiro(calcularDesconto())}
                    </p>
                  )}
                </div>
              </div>

              {/* Totais */}
              <div className="space-y-2 mb-4 pt-2 border-t border-gray-200 dark:border-gray-700">
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600 dark:text-gray-400">Subtotal:</span>
                  <span className="text-gray-900 dark:text-white">{formatarDinheiro(calcularSubtotal())}</span>
                </div>
                {taxaServico && (
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600 dark:text-gray-400">Taxa de Serviço:</span>
                    <span className="text-gray-900 dark:text-white">{formatarDinheiro(calcularTaxaServico())}</span>
                  </div>
                )}
                {calcularDesconto() > 0 && (
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600 dark:text-gray-400">Desconto:</span>
                    <span className="text-green-600 dark:text-green-400">-{formatarDinheiro(calcularDesconto())}</span>
                  </div>
                )}
                <div className="flex justify-between text-lg font-bold pt-2 border-t border-gray-200 dark:border-gray-700">
                  <span className="text-gray-900 dark:text-white">Total:</span>
                  <span className="text-gray-900 dark:text-white">{formatarDinheiro(calcularTotal())}</span>
                </div>
              </div>

              <Button
                variant="primary"
                fullWidth
                size="lg"
                onClick={() => setShowPagamentoModal(true)}
                icon={<CreditCard size={20} />}
              >
                Finalizar Venda
              </Button>
            </div>
          )}
        </div>
      </div>

      {/* Modal de Comandas das Mesas */}
      {showComandasModal && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-black bg-opacity-50">
          <div className="flex items-center justify-center min-h-screen p-4">
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl w-full max-w-4xl max-h-[90vh] overflow-hidden">
              <div className="flex justify-between items-center p-6 border-b border-gray-200 dark:border-gray-700">
                <h3 className="text-lg font-medium text-gray-900 dark:text-white">
                  Comandas das Mesas
                </h3>
                <button
                  onClick={() => setComandasModal(false)}
                  className="text-gray-400 hover:text-gray-500"
                >
                  <X size={24} />
                </button>
              </div>

              <div className="p-6 overflow-y-auto max-h-[calc(90vh-120px)]">
                {comandasDisponiveis.length === 0 ? (
                  <div className="text-center py-8">
                    <Coffee size={48} className="mx-auto text-gray-400 mb-4" />
                    <p className="text-gray-500">Nenhuma comanda ativa</p>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {comandasDisponiveis.map((comanda) => (
                      <div
                        key={comanda.mesa_id}
                        className="bg-gray-50 dark:bg-gray-700 rounded-lg p-4 border border-gray-200 dark:border-gray-600"
                      >
                        <div className="flex justify-between items-start mb-4">
                          <div>
                            <h4 className="font-medium text-gray-900 dark:text-white">
                              Mesa {comanda.mesa_numero}
                            </h4>
                            <div className="text-sm text-gray-500 dark:text-gray-400 space-y-1">
                              <p>Capacidade: {comanda.mesa_capacidade} pessoas</p>
                              {comanda.garcom && <p>Garçom: {comanda.garcom}</p>}
                              {comanda.horario_abertura && (
                                <div className="flex items-center">
                                  <Clock size={14} className="mr-1" />
                                  <span>
                                    {new Date(comanda.horario_abertura).toLocaleTimeString('pt-BR')}
                                  </span>
                                </div>
                              )}
                            </div>
                          </div>
                          <div className="text-right">
                            <p className="text-lg font-bold text-gray-900 dark:text-white">
                              {formatarDinheiro(comanda.valor_total)}
                            </p>
                            <p className="text-sm text-gray-500 dark:text-gray-400">
                              {comanda.itens.length} {comanda.itens.length === 1 ? 'item' : 'itens'}
                            </p>
                          </div>
                        </div>

                        <div className="space-y-2 mb-4">
                          {comanda.itens.slice(0, 3).map((item) => (
                            <div key={item.id} className="flex justify-between text-sm">
                              <span>{item.quantidade}x {item.nome}</span>
                              <span>{formatarDinheiro(item.preco_unitario * item.quantidade)}</span>
                            </div>
                          ))}
                          {comanda.itens.length > 3 && (
                            <p className="text-xs text-gray-500 dark:text-gray-400">
                              +{comanda.itens.length - 3} {comanda.itens.length - 3 === 1 ? 'item' : 'itens'}
                            </p>
                          )}
                        </div>

                        <Button
                          variant="primary"
                          fullWidth
                          size="sm"
                          onClick={() => {
                            setComandaSelecionada(comanda);
                            setComandasModal(false);
                            setShowPagamentoModal(true);
                          }}
                          icon={<CreditCard size={16} />}
                        >
                          Finalizar Pagamento
                        </Button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal de Pagamento */}
      {showPagamentoModal && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-black bg-opacity-50">
          <div className="flex items-center justify-center min-h-screen p-4">
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl w-full max-w-md">
              <div className="flex justify-between items-center p-6 border-b border-gray-200 dark:border-gray-700">
                <h3 className="text-lg font-medium text-gray-900 dark:text-white">
                  {comandasSelecionada 
                    ? `Finalizar Mesa ${comandasSelecionada.mesa_numero}`
                    : 'Finalizar Pagamento'
                  }
                </h3>
                <button
                  onClick={() => {
                    setShowPagamentoModal(false);
                    setComandaSelecionada(null);
                    setFormaPagamento(null);
                  }}
                  className="text-gray-400 hover:text-gray-500"
                >
                  <X size={24} />
                </button>
              </div>

              <div className="p-6">
                {/* Total */}
                <div className="text-center mb-6">
                  <p className="text-sm text-gray-500 dark:text-gray-400">Total a pagar</p>
                  <p className="text-3xl font-bold text-gray-900 dark:text-white">
                    {comandasSelecionada 
                      ? formatarDinheiro(comandasSelecionada.valor_total)
                      : formatarDinheiro(calcularTotal())
                    }
                  </p>
                  {comandasSelecionada && (
                    <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                      Mesa {comandasSelecionada.mesa_numero} • {comandasSelecionada.itens.length} {comandasSelecionada.itens.length === 1 ? 'item' : 'itens'}
                    </p>
                  )}
                </div>

                {/* Formas de Pagamento */}
                <div className="space-y-3 mb-6">
                  <button
                    onClick={() => setFormaPagamento('pix')}
                    className={`w-full p-4 rounded-lg border-2 transition-colors ${
                      formaPagamento === 'pix'
                        ? 'border-red-500 bg-red-50 dark:bg-red-900/20'
                        : 'border-gray-200 dark:border-gray-600 hover:border-red-200'
                    }`}
                  >
                    <div className="flex items-center">
                      <QrCode size={24} className="text-red-500" />
                      <span className="ml-3 font-medium text-gray-900 dark:text-white">PIX</span>
                    </div>
                  </button>

                  <button
                    onClick={() => setFormaPagamento('cartao')}
                    className={`w-full p-4 rounded-lg border-2 transition-colors ${
                      formaPagamento === 'cartao'
                        ? 'border-red-500 bg-red-50 dark:bg-red-900/20'
                        : 'border-gray-200 dark:border-gray-600 hover:border-red-200'
                    }`}
                  >
                    <div className="flex items-center">
                      <CreditCard size={24} className="text-red-500" />
                      <span className="ml-3 font-medium text-gray-900 dark:text-white">Cartão</span>
                    </div>
                  </button>

                  <button
                    onClick={() => setFormaPagamento('dinheiro')}
                    className={`w-full p-4 rounded-lg border-2 transition-colors ${
                      formaPagamento === 'dinheiro'
                        ? 'border-red-500 bg-red-50 dark:bg-red-900/20'
                        : 'border-gray-200 dark:border-gray-600 hover:border-red-200'
                    }`}
                  >
                    <div className="flex items-center">
                      <DollarSign size={24} className="text-red-500" />
                      <span className="ml-3 font-medium text-gray-900 dark:text-white">Dinheiro</span>
                    </div>
                  </button>
                </div>

                {/* Valor Recebido (apenas para dinheiro) */}
                {formaPagamento === 'dinheiro' && !comandasSelecionada && (
                  <div className="mb-6">
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Valor Recebido
                    </label>
                    <div className="relative">
                      <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                        <span className="text-gray-500 dark:text-gray-400 sm:text-sm">R$</span>
                      </div>
                      <input
                        type="number"
                        step="0.01"
                        min="0"
                        value={valorRecebido}
                        onChange={(e) => setValorRecebido(e.target.value)}
                        className="pl-8 block w-full rounded-md border-gray-300 dark:border-gray-600 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white"
                        placeholder="0,00"
                      />
                    </div>
                    {valorRecebido && (
                      <div className="mt-2 text-sm">
                        <p className="text-gray-600 dark:text-gray-400">
                          Troco: <span className="font-medium text-gray-900 dark:text-white">
                            {formatarDinheiro(calcularTroco())}
                          </span>
                        </p>
                      </div>
                    )}
                  </div>
                )}

                <Button
                  variant="primary"
                  fullWidth
                  size="lg"
                  onClick={() => {
                    if (comandasSelecionada) {
                      finalizarComandaMesa(comandasSelecionada);
                    } else {
                      finalizarVenda();
                    }
                  }}
                  isLoading={loading}
                  disabled={!formaPagamento}
                  disabled={!formaPagamento || !caixaPDV}
                  icon={<Receipt size={20} />}
                >
                  Confirmar Pagamento
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal de Controle do PDV */}
      <PDVControlModal
        isOpen={showPDVModal}
        onClose={() => setShowPDVModal(false)}
        mode={pdvModalMode}
        caixaAtual={caixaPDV}
        onCaixaChange={(caixa) => {
          setCaixaPDV(caixa);
          if (caixa) {
            localStorage.setItem('pdvAtual', JSON.stringify(caixa));
          } else {
            localStorage.removeItem('pdvAtual');
          }
        }}
      />
    </div>
  );
};

export default PDV;