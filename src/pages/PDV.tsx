import React, { useState, useEffect } from 'react';
import { 
  Menu, X, Search, Filter, Clock, Users, CreditCard, Receipt, ArrowLeft, 
  ArrowUpCircle, Music, Percent, AlertTriangle, Coffee, ShoppingBag, Store
} from 'lucide-react';
import Button from '../components/ui/Button';
import { useRestaurante } from '../contexts/RestauranteContext';
import { useAuth } from '../contexts/AuthContext';
import { formatarDinheiro, formatarTempo } from '../utils/formatters';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';

interface OrderItem {
  id: number;
  nome: string;
  quantidade: number;
  preco: number;
  observacao?: string;
}

interface ComandaPendente {
  id: number;
  mesa: number;
  total: number;
  itens: OrderItem[];
  horario: string;
}

interface CaixaState {
  isOpen: boolean;
  valorInicial: number;
  operador: string;
  dataAbertura?: Date;
  saldoAtual: number;
}

interface IFoodPedido {
  id: string;
  cliente: string;
  itens: OrderItem[];
  total: number;
  status: 'pendente' | 'aceito' | 'recusado';
  horario: string;
}

interface PedidoCaixa {
  id: number;
  cliente: string;
  itens: OrderItem[];
  total: number;
  status: 'pendente' | 'finalizado';
  horario: string;
}

type TabType = 'mesas' | 'ifood' | 'caixa';

const PDV: React.FC = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { produtos, categorias, mesas, itensComanda } = useRestaurante();
  const [activeTab, setActiveTab] = useState<TabType>('mesas');
  const [busca, setBusca] = useState('');
  const [categoriaSelecionada, setCategoriaSelecionada] = useState('todas');
  const [pedidoAtual, setPedidoAtual] = useState<OrderItem[]>([]);
  const [comandasPendentes, setComandasPendentes] = useState<ComandaPendente[]>([]);
  const [comandaSelecionada, setComandaSelecionada] = useState<ComandaPendente | null>(null);
  const [formaPagamento, setFormaPagamento] = useState<'dinheiro' | 'cartao' | 'pix'>('dinheiro');
  const [showAddItemModal, setShowAddItemModal] = useState(false);
  const [showPedidoCaixaModal, setShowPedidoCaixaModal] = useState(false);
  const [nomeClienteCaixa, setNomeClienteCaixa] = useState('');
  const [incluirTaxaServico, setIncluirTaxaServico] = useState(true);
  const [incluirCouvert, setIncluirCouvert] = useState(false);
  const [valorCouvert, setValorCouvert] = useState<string>('15.00');
  const [desconto, setDesconto] = useState<string>('');
  const [descontoError, setDescontoError] = useState<string>('');
  const [caixa, setCaixa] = useState<CaixaState>({
    isOpen: false,
    valorInicial: 0,
    operador: user?.email || '',
    saldoAtual: 0
  });
  const [showCaixaModal, setShowCaixaModal] = useState(false);
  const [loading, setLoading] = useState(false);

  // Mock iFood orders
  const [ifoodPedidos] = useState<IFoodPedido[]>([
    {
      id: 'IF123',
      cliente: 'João Silva',
      itens: [
        { id: 1, nome: 'X-Burger', quantidade: 2, preco: 25.90 },
        { id: 2, nome: 'Coca-Cola', quantidade: 2, preco: 6.00 }
      ],
      total: 63.80,
      status: 'pendente',
      horario: new Date().toISOString()
    }
  ]);

  // Mock caixa orders
  const [pedidosCaixa, setPedidosCaixa] = useState<PedidoCaixa[]>([]);

  useEffect(() => {
    const mesasComComandas = mesas.filter(m => m.status === 'ocupada' || m.status === 'aguardando');
    const comandas: ComandaPendente[] = mesasComComandas.map(mesa => {
      const itens = itensComanda
        .filter(item => item.mesaId === mesa.id)
        .map(item => ({
          id: item.id,
          nome: item.nome,
          quantidade: item.quantidade,
          preco: item.preco,
          observacao: item.observacao
        }));

      return {
        id: mesa.id,
        mesa: mesa.numero,
        total: mesa.valorTotal,
        itens,
        horario: mesa.horarioAbertura || new Date().toISOString()
      };
    });
    
    setComandasPendentes(comandas);
  }, [mesas, itensComanda]);

  const handleDescontoChange = (value: string) => {
    setDescontoError('');
    
    if (value === '') {
      setDesconto('');
      return;
    }

    const numeroDesconto = parseFloat(value);
    if (isNaN(numeroDesconto)) {
      setDescontoError('Digite um número válido');
      return;
    }

    if (numeroDesconto < 0) {
      setDescontoError('O desconto não pode ser negativo');
      return;
    }

    if (numeroDesconto > 100) {
      setDescontoError('O desconto não pode ser maior que 100%');
      return;
    }

    setDesconto(value);
  };

  const produtosFiltrados = produtos.filter(produto => {
    const matchBusca = produto.nome.toLowerCase().includes(busca.toLowerCase());
    const matchCategoria = categoriaSelecionada === 'todas' || produto.categoria === categoriaSelecionada;
    return matchBusca && matchCategoria && produto.disponivel;
  });

  const calcularTotais = () => {
    const subtotal = comandaSelecionada 
      ? comandaSelecionada.total 
      : pedidoAtual.reduce((total, item) => total + (item.preco * item.quantidade), 0);
    
    const descontoValor = desconto ? (subtotal * (parseFloat(desconto) / 100)) : 0;
    const subtotalComDesconto = subtotal - descontoValor;
    
    const taxaServico = incluirTaxaServico ? subtotalComDesconto * 0.1 : 0;
    const couvert = incluirCouvert ? parseFloat(valorCouvert) || 0 : 0;
    const total = subtotalComDesconto + taxaServico + couvert;

    return { 
      subtotal, 
      descontoValor,
      subtotalComDesconto,
      taxaServico, 
      couvert, 
      total 
    };
  };

  const { subtotal, descontoValor, subtotalComDesconto, taxaServico, couvert, total } = calcularTotais();

  const adicionarItem = (produto: Produto) => {
    setLoading(true);
    setTimeout(() => {
      const novoItem = {
        id: Date.now(),
        nome: produto.nome,
        quantidade: 1,
        preco: produto.preco
      };

      if (comandaSelecionada) {
        const comandaAtualizada = {
          ...comandaSelecionada,
          itens: [...comandaSelecionada.itens, novoItem],
          total: comandaSelecionada.total + produto.preco
        };
        setComandaSelecionada(comandaAtualizada);
        setComandasPendentes(prev => 
          prev.map(c => c.id === comandaSelecionada.id ? comandaAtualizada : c)
        );
        toast.success('Item adicionado à comanda');
      } else {
        setPedidoAtual(prev => [...prev, novoItem]);
        toast.success('Item adicionado ao pedido');
      }
      
      setShowAddItemModal(false);
      setLoading(false);
    }, 500);
  };

  const handleAcceptIFoodOrder = (pedidoId: string) => {
    setLoading(true);
    setTimeout(() => {
      const pedido = ifoodPedidos.find(p => p.id === pedidoId);
      if (!pedido) return;

      // Create a new comanda for iFood order
      const novaComanda: ComandaPendente = {
        id: Date.now(),
        mesa: 0, // Special identifier for iFood orders
        total: pedido.total,
        itens: pedido.itens,
        horario: new Date().toISOString()
      };

      setComandasPendentes(prev => [...prev, novaComanda]);
      toast.success(`Pedido ${pedidoId} aceito e comanda criada`);
      setLoading(false);
    }, 500);
  };

  const handleRejectIFoodOrder = (pedidoId: string) => {
    setLoading(true);
    setTimeout(() => {
      toast.success(`Pedido ${pedidoId} recusado`);
      setLoading(false);
    }, 500);
  };

  const handleCreateCaixaOrder = () => {
    if (!nomeClienteCaixa || pedidoAtual.length === 0) {
      toast.error('Preencha o nome do cliente e adicione itens ao pedido');
      return;
    }

    const novoPedido: PedidoCaixa = {
      id: Date.now(),
      cliente: nomeClienteCaixa,
      itens: pedidoAtual,
      total: total,
      status: 'pendente',
      horario: new Date().toISOString()
    };

    setPedidosCaixa(prev => [...prev, novoPedido]);
    setPedidoAtual([]);
    setNomeClienteCaixa('');
    setShowPedidoCaixaModal(false);
    toast.success('Pedido de caixa criado com sucesso');
  };

  return (
    <div className="min-h-screen bg-gray-100 dark:bg-gray-900">
      {/* Header */}
      <header className="bg-white dark:bg-gray-800 shadow-sm border-b border-gray-200 dark:border-gray-700">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center">
              <button
                onClick={() => navigate(-1)}
                className="mr-4 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300 transition-colors"
              >
                <ArrowLeft size={24} />
              </button>
              <div>
                <h1 className="text-xl font-semibold text-gray-900 dark:text-white">PDV</h1>
                <p className="text-sm text-gray-500 dark:text-gray-400">Ponto de Venda</p>
              </div>
            </div>
            
            <div className="flex items-center space-x-4">
              {!caixa.isOpen ? (
                <Button
                  variant="primary"
                  onClick={() => setShowCaixaModal(true)}
                  icon={<ArrowUpCircle size={20} />}
                >
                  Abrir Caixa
                </Button>
              ) : (
                <div className="flex items-center space-x-4">
                  <div className="text-right">
                    <p className="text-sm text-gray-500 dark:text-gray-400">{caixa.operador}</p>
                    <p className="text-lg font-semibold text-gray-900 dark:text-white">
                      {formatarDinheiro(caixa.saldoAtual)}
                    </p>
                  </div>
                  <Button
                    variant="warning"
                    onClick={() => {
                      setCaixa({
                        isOpen: false,
                        valorInicial: 0,
                        operador: '',
                        saldoAtual: 0
                      });
                      toast.success('Caixa fechado com sucesso');
                    }}
                    isLoading={loading}
                  >
                    Fechar Caixa
                  </Button>
                </div>
              )}
            </div>
          </div>

          {/* Tabs */}
          <div className="flex space-x-4 -mb-px">
            <button
              onClick={() => setActiveTab('mesas')}
              className={`py-4 px-1 border-b-2 font-medium text-sm ${
                activeTab === 'mesas'
                  ? 'border-blue-500 text-blue-600 dark:text-blue-400'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300 dark:text-gray-400 dark:hover:text-gray-300'
              }`}
            >
              <div className="flex items-center space-x-2">
                <Coffee size={20} />
                <span>Mesas</span>
              </div>
            </button>

            <button
              onClick={() => setActiveTab('ifood')}
              className={`py-4 px-1 border-b-2 font-medium text-sm ${
                activeTab === 'ifood'
                  ? 'border-blue-500 text-blue-600 dark:text-blue-400'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300 dark:text-gray-400 dark:hover:text-gray-300'
              }`}
            >
              <div className="flex items-center space-x-2">
                <ShoppingBag size={20} />
                <span>iFood</span>
              </div>
            </button>

            <button
              onClick={() => setActiveTab('caixa')}
              className={`py-4 px-1 border-b-2 font-medium text-sm ${
                activeTab === 'caixa'
                  ? 'border-blue-500 text-blue-600 dark:text-blue-400'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300 dark:text-gray-400 dark:hover:text-gray-300'
              }`}
            >
              <div className="flex items-center space-x-2">
                <Store size={20} />
                <span>Pedidos de Caixa</span>
              </div>
            </button>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Mesas Tab */}
        {activeTab === 'mesas' && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            {/* Comandas em Aberto */}
            <div>
              <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-6 mb-6">
                <h2 className="text-lg font-medium text-gray-900 dark:text-white mb-4">
                  Comandas em Aberto
                </h2>
                
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {comandasPendentes.map(comanda => {
                    const tempoAberto = new Date(comanda.horario);
                    const horasAberto = Math.floor((new Date().getTime() - tempoAberto.getTime()) / (1000 * 60 * 60));
                    
                    return (
                      <button
                        key={comanda.id}
                        onClick={() => setComandaSelecionada(comanda)}
                        className={`p-4 rounded-lg border transition-all ${
                          comandaSelecionada?.id === comanda.id
                            ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/50 ring-2 ring-blue-200 dark:ring-blue-800'
                            : horasAberto >= 2
                            ? 'border-orange-300 shadow-orange-100 dark:border-orange-700'
                            : 'border-gray-200 dark:border-gray-700 hover:border-blue-300 dark:hover:border-blue-600 hover:bg-gray-50 dark:hover:bg-gray-700'
                        }`}
                      >
                        <div className="flex justify-between items-start mb-2">
                          <div>
                            <h3 className="font-medium text-gray-900 dark:text-white">Mesa {comanda.mesa}</h3>
                            <p className="text-sm text-gray-500 dark:text-gray-400 flex items-center">
                              <Clock size={14} className="mr-1" />
                              {formatarTempo(comanda.horario)}
                            </p>
                          </div>
                          <span className="text-lg font-semibold text-blue-600 dark:text-blue-400">
                            {formatarDinheiro(comanda.total)}
                          </span>
                        </div>
                        <div className="flex justify-between items-center mt-3">
                          <span className="text-sm text-gray-500 dark:text-gray-400">
                            {comanda.itens.length} itens
                          </span>
                          <div className="flex space-x-2">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={(e) => {
                                e.stopPropagation();
                                setShowAddItemModal(true);
                                setComandaSelecionada(comanda);
                              }}
                            >
                              Adicionar
                            </Button>
                            <Button
                              variant="primary"
                              size="sm"
                              onClick={(e) => {
                                e.stopPropagation();
                                setComandaSelecionada(comanda);
                              }}
                            >
                              Fechar
                            </Button>
                          </div>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>

            {/* Pedido Atual */}
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm overflow-hidden">
              <div className="p-6 border-b border-gray-200 dark:border-gray-700">
                <div className="flex items-center justify-between">
                  <div>
                    <h2 className="text-lg font-medium text-gray-900 dark:text-white">
                      {comandaSelecionada 
                        ? `Comanda - Mesa ${comandaSelecionada.mesa}`
                        : 'Novo Pedido'
                      }
                    </h2>
                    <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                      {(comandaSelecionada?.itens || pedidoAtual).length} itens
                    </p>
                  </div>
                  <Button
                    variant="primary"
                    onClick={() => setShowAddItemModal(true)}
                    disabled={!caixa.isOpen}
                    icon={<Menu size={20} />}
                  >
                    Adicionar Item
                  </Button>
                </div>
              </div>

              <div className="divide-y divide-gray-200 dark:divide-gray-700 max-h-[calc(100vh-600px)] overflow-y-auto p-6">
                {(comandaSelecionada?.itens || pedidoAtual).length === 0 ? (
                  <div className="text-center py-8">
                    <Receipt size={48} className="mx-auto text-gray-400 dark:text-gray-600" />
                    <p className="mt-2 text-gray-500 dark:text-gray-400">
                      Nenhum item adicionado
                    </p>
                  </div>
                ) : (
                  (comandaSelecionada?.itens || pedidoAtual).map(item => (
                    <div
                      key={item.id}
                      className="py-4 first:pt-0 last:pb-0 flex items-center justify-between"
                    >
                      <div className="flex-1">
                        <h4 className="font-medium text-gray-900 dark:text-white">{item.nome}</h4>
                        {item.observacao && (
                          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">{item.observacao}</p>
                        )}
                        <div className="flex items-center mt-2">
                          <button
                            onClick={() => {
                              if (comandaSelecionada) {
                                const updatedItems = comandaSelecionada.itens.map(i =>
                                  i.id === item.id
                                    ? { ...i, quantidade: Math.max(1, i.quantidade - 1) }
                                    : i
                                );
                                setComandaSelecionada({
                                  ...comandaSelecionada,
                                  itens: updatedItems,
                                  total: updatedItems.reduce((acc, i) => acc + (i.preco * i.quantidade), 0)
                                });
                              } else {
                                setPedidoAtual(prev =>
                                  prev.map(i =>
                                    i.id === item.id
                                      ? { ...i, quantidade: Math.max(1, i.quantidade - 1) }
                                      : i
                                  )
                                );
                              }
                            }}
                            className="text-gray-500 hover:text-red-500 dark:text-gray-400 dark:hover:text-red-400 transition-colors"
                          >
                            <Menu size={16} />
                          </button>
                          <span className="mx-3 font-medium text-gray-900 dark:text-white">{item.quantidade}</span>
                          <button
                            onClick={() => {
                              if (comandaSelecionada) {
                                const updatedItems = comandaSelecionada.itens.map(i =>
                                  i.id === item.id
                                    ? { ...i, quantidade: i.quantidade + 1 }
                                    : i
                                );
                                setComandaSelecionada({
                                  ...comandaSelecionada,
                                  itens: updatedItems,
                                  total: updatedItems.reduce((acc, i) => acc + (i.preco * i.quantidade), 0)
                                });
                              } else {
                                setPedidoAtual(prev =>
                                  prev.map(i =>
                                    i.id === item.id
                                      ? { ...i, quantidade: i.quantidade + 1 }
                                      : i
                                  )
                                );
                              }
                            }}
                            className="text-gray-500 hover:text-green-500 dark:text-gray-400 dark:hover:text-green-400 transition-colors"
                          >
                            <Menu size={16} />
                          </button>
                        </div>
                      </div>
                      
                      <div className="text-right ml-4">
                        <p className="text-sm text-gray-500 dark:text-gray-400">
                          {formatarDinheiro(item.preco)} un
                        </p>
                        <p className="font-medium text-gray-900 dark:text-white">
                          {formatarDinheiro(item.preco * item.quantidade)}
                        </p>
                        <button
                          onClick={() => {
                            if (comandaSelecionada) {
                              const updatedItems = comandaSelecionada.itens.filter(i => i.id !== item.id);
                              setComandaSelecionada({
                                ...comandaSelecionada,
                                itens: updatedItems,
                                total: updatedItems.reduce((acc, i) => acc + (i.preco * i.quantidade), 0)
                              });
                            } else {
                              setPedidoAtual(prev => prev.filter(i => i.id !== item.id));
                            }
                          }}
                          className="text-red-500 hover:text-red-700 dark:text-red-400 dark:hover:text-red-300 transition-colors mt-2"
                        >
                          <X size={16} />
                        </button>
                      </div>
                    </div>
                  ))
                )}
              </div>

              <div className="p-6 bg-gray-50 dark:bg-gray-800 border-t border-gray-200 dark:border-gray-700">
                <div className="space-y-4">
                  {/* Taxas e Adicionais */}
                  <div className="space-y-3 border-b border-gray-200 dark:border-gray-700 pb-4">
                    <div className="flex items-center justify-between">
                      <label className="flex items-center space-x-2">
                        <input
                          type="checkbox"
                          checked={incluirTaxaServico}
                          onChange={(e) => setIncluirTaxaServico(e.target.checked)}
                          className="rounded border-gray-300 text-blue-600 focus:ring-blue-500 dark:border-gray-600 dark:bg-gray-700"
                        />
                        <span className="text-sm text-gray-700 dark:text-gray-300">Incluir taxa de serviço (10%)</span>
                      </label>
                      {incluirTaxaServico && (
                        <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                          {formatarDinheiro(taxaServico)}
                        </span>
                      )}
                    </div>

                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <label className="flex items-center space-x-2">
                          <input
                            type="checkbox"
                            checked={incluirCouvert}
                            onChange={(e) => setIncluirCouvert(e.target.checked)}
                            className="rounded border-gray-300 text-blue-600 focus:ring-blue-500 dark:border-gray-600 dark:bg-gray-700"
                          />
                          <span className="text-sm text-gray-700 dark:text-gray-300">Adicionar Couvert Artístico</span>
                        </label>
                        {incluirCouvert && (
                          <div className="flex items-center space-x-2">
                            <span className="text-sm text-gray-500 dark:text-gray-400">R$</span>
                            <input
                              type="number"
                              value={valorCouvert}
                              onChange={(e) => setValorCouvert(e.target.value)}
                              className="w-20 rounded-md border-gray-300 text-right text-sm dark:border-gray-600 dark:bg-gray-700 dark:text-white"
                              step="0.01"
                              min="0"
                            />
                          </div>
                        )}
                      </div>
                      {incluirCouvert && (
                        <p className="text-xs text-gray-500 dark:text-gray-400 italic flex items-center">
                          <Music size={12} className="mr-1" />
                          O couvert artístico é uma taxa opcional cobrada por apresentações ao vivo
                        </p>
                      )}
                    </div>

                    {/* Desconto */}
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <label className="flex items-center space-x-2">
                          <Percent size={16} className="text-gray-500 dark:text-gray-400" />
                          <span className="text-sm text-gray-700 dark:text-gray-300">Aplicar Desconto</span>
                        </label>
                        <div className="flex items-center space-x-2">
                          <input
                            type="number"
                            value={desconto}
                            onChange={(e) => handleDescontoChange(e.target.value)}
                            className={`w-20 rounded-md text-right text-sm ${
                              descontoError 
                                ? 'border-red-300 focus:ring-red-500 focus:border-red-500' 
                                : 'border-gray-300 focus:ring-blue-500 focus:border-blue-500'
                            } dark:border-gray-600 dark:bg-gray-700 dark:text-white`}
                            placeholder="0"
                            min="0"
                            max="100"
                            step="0.1"
                          />
                          <span className="text-sm text-gray-500 dark:text-gray-400">%</span>
                        </div>
                      </div>
                      {descontoError && (
                        <p className="text-xs text-red-500 dark:text-red-400 flex items-center">
                          <AlertTriangle size={12} className="mr-1" />
                          {descontoError}
                        </p>
                      )}
                      {desconto && !descontoError && (
                        <p className="text-xs text-green-500 dark:text-green-400 italic">
                          Desconto de {formatarDinheiro(descontoValor)} aplicado
                        </p>
                      )}
                    </div>
                  </div>

                  {/* Totais */}
                  <div className="space-y-2">
                    <div className="flex justify-between text-gray-500 dark:text-gray-400">
                      <span>Subtotal</span>
                      <span>{formatarDinheiro(subtotal)}</span>
                    </div>
                    
                    {desconto && !descontoError && (
                      <>
                        <div className="flex justify-between text-gray-500 dark:text-gray-400">
                          <span>Desconto ({desconto}%)</span>
                          <span>- {formatarDinheiro(descontoValor)}</span>
                        </div>
                        <div className="flex justify-between text-gray-700 dark:text-gray-300 font-medium">
                          <span>Subtotal com desconto</span>
                          <span>{formatarDinheiro(subtotalComDesconto)}</span>
                        </div>
                      </>
                    )}
                    
                    {incluirTaxaServico && (
                      <div className="flex justify-between text-gray-500 dark:text-gray-400">
                        <span>Taxa de serviço (10%)</span>
                        <span>{formatarDinheiro(taxaServico)}</span>
                      </div>
                    )}
                    
                    {incluirCouvert && parseFloat(valorCouvert) > 0 && (
                      <div className="flex justify-between text-gray-500 dark:text-gray-400">
                        <span>Couvert Artístico</span>
                        <span>{formatarDinheiro(parseFloat(valorCouvert))}</span>
                      </div>
                    )}
                    
                    <div className="flex justify-between text-xl font-semibold text-gray-900 dark:text-white pt-4 border-t border-gray-200 dark:border-gray-700">
                      <span>Total</span>
                      <span>{formatarDinheiro(total)}</span>
                    </div>
                  </div>

                  <div className="grid grid-cols-3 gap-4 mt-6">
                    <button
                      onClick={() => setFormaPagamento('dinheiro')}
                      className={`p-4 rounded-lg border text-center transition-all ${
                        formaPagamento === 'dinheiro'
                          ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/50 text-blue-700 dark:text-blue-400'
                          : 'border-gray-200 dark:border-gray-700 hover:border-blue-200 dark:hover:border-blue-800 hover:bg-gray-50 dark:hover:bg-gray-700'
                      }`}
                    >
                      <Receipt size={24} className="mx-auto mb-2" />
                      <span className="text-sm">Dinheiro</span>
                    </button>
                    <button
                      onClick={() => setFormaPagamento('cartao')}
                      className={`p-4 rounded-lg border text-center transition-all ${
                        formaPagamento === 'cartao'
                          ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/50 text-blue-700 dark:text-blue-400'
                          : 'border-gray-200 dark:border-gray-700 hover:border-blue-200 dark:hover:border-blue-800 hover:bg-gray-50 dark:hover:bg-gray-700'
                      }`}
                    >
                      <CreditCard size={24} className="mx-auto mb-2" />
                      <span className="text-sm">Cartão</span>
                    </button>
                    <button
                      onClick={() => setFormaPagamento('pix')}
                      className={`p-4 rounded-lg border text-center transition-all ${
                        formaPagamento === 'pix'
                          ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/50 text-blue-700 dark:text-blue-400'
                          : 'border-gray-200 dark:border-gray-700 hover:border-blue-200 dark:hover:border-blue-800 hover:bg-gray-50 dark:hover:bg-gray-700'
                      }`}
                    >
                      <Receipt size={24} className="mx-auto mb-2" />
                      <span className="text-sm">PIX</span>
                    </button>
                  </div>

                  <div className="space-y-3 pt-4">
                    <Button
                      variant="primary"
                      fullWidth
                      size="lg"
                      disabled={!caixa.isOpen || (comandaSelecionada?.itens || pedidoAtual).length === 0}
                      onClick={() => {
                        toast.success('Pagamento finalizado com sucesso!');
                        if (comandaSelecionada) {
                          setComandasPendentes(prev => prev.filter(c => c.id !== comandaSelecionada.id));
                        }
                        setComandaSelecionada(null);
                        setPedidoAtual([]);
                      }}
                      isLoading={loading}
                    >
                      Finalizar {comandaSelecionada ? 'Pagamento' : 'Pedido'}
                    </Button>
                    
                    <Button
                      variant="ghost"
                      fullWidth
                      disabled={(comandaSelecionada?.itens || pedidoAtual).length === 0}
                      onClick={() => {
                        setComandaSelecionada(null);
                        setPedidoAtual([]);
                      }}
                      icon={<X size={18} />}
                    >
                      {comandaSelecionada ? 'Cancelar' : 'Limpar'}
                    </Button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* iFood Tab */}
        {activeTab === 'ifood' && (
          <div className="space-y-6">
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm overflow-hidden">
              <div className="p-6">
                <h2 className="text-lg font-medium text-gray-900 dark:text-white mb-6">
                  Pedidos iFood
                </h2>

                {ifoodPedidos.length === 0 ? (
                  <div className="text-center py-8">
                    <ShoppingBag size={48} className="mx-auto text-gray-400 dark:text-gray-600" />
                    <p className="mt-2 text-gray-500 dark:text-gray-400">
                      Nenhum pedido pendente
                    </p>
                  </div>
                ) : (
                  <div className="space-y-6">
                    {ifoodPedidos.map(pedido => (
                      <div
                        key={pedido.id}
                        className="border border-gray-200 dark:border-gray-700 rounded-lg p-6"
                      >
                        <div className="flex justify-between items-start mb-4">
                          <div>
                            <h3 className="font-medium text-gray-900 dark:text-white">
                              Pedido #{pedido.id}
                            </h3>
                            <p className="text-sm text-gray-500 dark:text-gray-400">
                              Cliente: {pedido.cliente}
                            </p>
                            <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                              {formatarTempo(pedido.horario)}
                            </p>
                          </div>
                          <span className="text-lg font-semibold text-gray-900 dark:text-white">
                            {formatarDinheiro(pedido.total)}
                          </span>
                        </div>

                        <div className="space-y-2 mb-6">
                          {pedido.itens.map((item, index) => (
                            <div
                              key={index}
                              className="flex justify-between text-sm"
                            >
                              <span className="text-gray-700 dark:text-gray-300">
                                {item.quantidade}x {item.nome}
                              </span>
                              <span className="text-gray-500 dark:text-gray-400">
                                {formatarDinheiro(item.preco * item.quantidade)}
                              </span>
                            </div>
                          ))}
                        </div>

                        <div className="flex justify-end space-x-3">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleRejectIFoodOrder(pedido.id)}
                            className="text-red-600 dark:text-red-400"
                          >
                            Recusar
                          </Button>
                          <Button
                            variant="primary"
                            size="sm"
                            onClick={() => handleAcceptIFoodOrder(pedido.id)}
                          >
                            Aceitar
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Pedidos de Caixa Tab */}
        {activeTab === 'caixa' && (
          <div className="space-y-6">
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm overflow-hidden">
              <div className="p-6">
                <div className="flex justify-between items-center mb-6">
                  <h2 className="text-lg font-medium text-gray-900 dark:text-white">
                    Pedidos de Caixa
                  </h2>
                  <Button
                    variant="primary"
                    onClick={() => setShowPedidoCaixaModal(true)}
                    icon={<Plus size={20} />}
                  >
                    Criar Pedido
                  </Button>
                </div>

                {pedidosCaixa.length === 0 ? (
                  <div className="text-center py-8">
                    <Store size={48} className="mx-auto text-gray-400 dark:text-gray-600" />
                    <p className="mt-2 text-gray-500 dark:text-gray-400">
                      Nenhum pedido de caixa
                    </p>
                  </div>
                ) : (
                  <div className="space-y-6">
                    {pedidosCaixa.map(pedido => (
                      <div
                        key={pedido.id}
                        className="border border-gray-200 dark:border-gray-700 rounded-lg p-6"
                      >
                        <div className="flex justify-between items-start mb-4">
                          <div>
                            <h3 className="font-medium text-gray-900 dark:text-white">
                              {pedido.cliente}
                            </h3>
                            <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                              {formatarTempo(pedido.horario)}
                            </p>
                          </div>
                          <span className="text-lg font-semibold text-gray-900 dark:text-white">
                            {formatarDinheiro(pedido.total)}
                          </span>
                        </div>

                        <div className="space-y-2">
                          {pedido.itens.map((item, index) => (
                            <div
                              key={index}
                              className="flex justify-between text-sm"
                            >
                              <span className="text-gray-700 dark:text-gray-300">
                                {item.quantidade}x {item.nome}
                              </span>
                              <span className="text-gray-500 dark:text-gray-400">
                                {formatarDinheiro(item.preco * item.quantidade)}
                              </span>
                            </div>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Modal de Adicionar Item */}
      {showAddItemModal && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-black bg-opacity-50 flex items-center justify-center">
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl w-full max-w-4xl m-4">
            <div className="p-6">
              <div className="flex justify-between items-center mb-6">
                <h3 className="text-lg font-medium text-gray-900 dark:text-white">Adicionar Item</h3>
                <button 
                  onClick={() => setShowAddItemModal(false)}
                  className="text-gray-400 dark:text-gray-500 hover:text-gray-500 dark:hover:text-gray-400 transition-colors"
                >
                  <X size={24} />
                </button>
              </div>

              <div className="space-y-6">
                {/* Busca */}
                <div className="relative">
                  <Search className="absolute left-3 top-2.5 text-gray-400" size={20} />
                  <input
                    type="text"
                    placeholder="Buscar produtos..."
                    value={busca}
                    onChange={(e) => setBusca(e.target.value)}
                    className="pl-10 w-full rounded-lg border border-gray-300 dark:border-gray-600 py-2 px-4 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white"
                  />
                </div>

                {/* Categorias */}
                <div className="flex gap-2 overflow-x-auto pb-2">
                  <button
                    onClick={() => setCategoriaSelecionada('todas')}
                    className={`px-4 py-2 rounded-full whitespace-nowrap transition-colors ${
                      categoriaSelecionada === 'todas'
                        ? 'bg-blue-500 text-white'
                        : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
                    }`}
                  >
                    Todas
                  </button>
                  {categorias.map(categoria => (
                    <button
                      key={categoria}
                      onClick={() => setCategoriaSelecionada(categoria)}
                      className={`px-4 py-2 rounded-full whitespace-nowrap transition-colors ${
                        categoriaSelecionada === categoria
                          ? 'bg-blue-500 text-white'
                          : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
                      }`}
                    >
                      {categoria}
                    </button>
                  ))}
                </div>

                {/* Grid de Produtos */}
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4 max-h-[60vh] overflow-y-auto">
                  {produtosFiltrados.map(produto => (
                    <button
                      key={produto.id}
                      onClick={() => adicionarItem(produto)}
                      className="p-4 border border-gray-200 dark:border-gray-700 rounded-lg text-left hover:bg-gray-50 dark:hover:bg-gray-700 transition-all hover:border-blue-300 dark:hover:border-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      <h3 className="font-medium text-gray-900 dark:text-white">{produto.nome}</h3>
                      <p className="text-sm text-gray-500 dark:text-gray-400">{produto.categoria}</p>
                      <p className="mt-2 font-semibold text-blue-600 dark:text-blue-400">
                        {formatarDinheiro(produto.preco)}
                      </p>
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal de Pedido de Caixa */}
      {showPedidoCaixaModal && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-black bg-opacity-50 flex items-center justify-center">
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl w-full max-w-4xl m-4">
            <div className="p-6">
              <div className="flex justify-between items-center mb-6">
                <h3 className="text-lg font-medium text-gray-900 dark:text-white">
                  Novo Pedido de Caixa
                </h3>
                <button 
                  onClick={() => setShowPedidoCaixaModal(false)}
                  className="text-gray-400 dark:text-gray-500 hover:text-gray-500 dark:hover:text-gray-400 transition-colors"
                >
                  <X size={24} />
                </button>
              </div>

              <div className="space-y-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                    Nome do Cliente
                  </label>
                  <input
                    type="text"
                    value={nomeClienteCaixa}
                    onChange={(e) => setNomeClienteCaixa(e.target.value)}
                    className="mt-1 block w-full rounded-md border-gray-300 dark:border-gray-600 shadow-sm focus:border-blue-500 focus:ring-blue-500 dark:bg-gray-700 dark:text-white sm:text-sm"
                    placeholder="Digite o nome do cliente"
                  />
                </div>

                <div>
                  <Button
                    variant="primary"
                    fullWidth
                    onClick={() => setShowAddItemModal(true)}
                    icon={<Plus size={20} />}
                  >
                    Adicionar Itens
                  </Button>
                </div>

                {pedidoAtual.length > 0 && (
                  <div className="space-y-4">
                    <h4 className="font-medium text-gray-900 dark:text-white">
                      Itens do Pedido
                    </h4>
                    <div className="space-y-2">
                      {pedidoAtual.map(item => (
                        <div
                          key={item.id}
                          className="flex justify-between items-center"
                        >
                          <div>
                            <p className="text-gray-900 dark:text-white">
                              {item.quantidade}x {item.nome}
                            </p>
                            <p className="text-sm text-gray-500 dark:text-gray-400">
                              {formatarDinheiro(item.preco)} un
                            </p>
                          </div>
                          <span className="font-medium text-gray-900 dark:text-white">
                            {formatarDinheiro(item.preco * item.quantidade)}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                <div className="pt-6 border-t border-gray-200 dark:border-gray-700">
                  <div className="flex justify-between items-center">
                    <span className="text-lg font-medium text-gray-900 dark:text-white">
                      Total
                    </span>
                    <span className="text-xl font-semibold text-gray-900 dark:text-white">
                      {formatarDinheiro(total)}
                    </span>
                  </div>
                </div>

                <div className="flex justify-end space-x-3">
                  <Button
                    variant="ghost"
                    onClick={() => {
                      setShowPedidoCaixaModal(false);
                      setPedidoAtual([]);
                      setNomeClienteCaixa('');
                    }}
                  >
                    Cancelar
                  </Button>
                  <Button
                    variant="primary"
                    onClick={handleCreateCaixaOrder}
                    disabled={!nomeClienteCaixa || pedidoAtual.length === 0}
                  >
                    Criar Pedido
                  </Button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal de Abertura de Caixa */}
      {showCaixaModal && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-black bg-opacity-50 flex items-center justify-center">
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl w-full max-w-md m-4">
            <div className="p-6">
              <div className="flex justify-between items-center mb-6">
                <h3 className="text-lg font-medium text-gray-900 dark:text-white">Abertura de Caixa</h3>
                <button 
                  onClick={() => setShowCaixaModal(false)}
                  className="text-gray-400 dark:text-gray-500 hover:text-gray-500 dark:hover:text-gray-400 transition-colors"
                >
                  <X size={24} />
                </button>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                    Operador
                  </label>
                  <input
                    type="text"
                    value={user?.email || ''}
                    disabled
                    className="mt-1 block w-full rounded-md border-gray-300 dark:border-gray-600 bg-gray-100 dark:bg-gray-700 cursor-not-allowed p-2 text-gray-500 dark:text-gray-400"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                    Valor Inicial em Caixa
                  </label>
                  <div className="mt-1 relative rounded-md shadow-sm">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                      <span className="text-gray-500 dark:text-gray-400 sm:text-sm">R$</span>
                    </div>
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      value={caixa.valorInicial}
                      onChange={(e) => setCaixa({ ...caixa, valorInicial: parseFloat(e.target.value) || 0 })}
                      className="pl-12 block w-full pr-12 sm:text-sm border-gray-300 dark:border-gray-600 rounded-md focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white p-2"
                      placeholder="0,00"
                    />
                  </div>
                </div>

                <Button
                  variant="primary"
                  fullWidth
                  onClick={() => {
                    setCaixa(prev => ({
                      ...prev,
                      isOpen: true,
                      dataAbertura: new Date(),
                      saldoAtual: prev.valorInicial
                    }));
                    setShowCaixaModal(false);
                    toast.success('Caixa aberto com sucesso!');
                  }}
                  isLoading={loading}
                >
                  Abrir Caixa
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default PDV;