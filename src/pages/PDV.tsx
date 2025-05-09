import React, { useState, useEffect } from 'react';
import { Search, ShoppingCart, Trash2, Plus, Minus, CreditCard, Receipt, ArrowLeft, X, User, Clock, ArrowUpCircle } from 'lucide-react';
import { useRestaurante } from '../contexts/RestauranteContext';
import { useAuth } from '../contexts/AuthContext';
import { formatarDinheiro, formatarTempo } from '../utils/formatters';
import Button from '../components/ui/Button';
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

const PDV: React.FC = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { produtos, categorias, mesas, itensComanda } = useRestaurante();
  const [busca, setBusca] = useState('');
  const [categoriaSelecionada, setCategoriaSelecionada] = useState('todas');
  const [pedidoAtual, setPedidoAtual] = useState<OrderItem[]>([]);
  const [comandasPendentes, setComandasPendentes] = useState<ComandaPendente[]>([]);
  const [comandaSelecionada, setComandaSelecionada] = useState<ComandaPendente | null>(null);
  const [formaPagamento, setFormaPagamento] = useState<'dinheiro' | 'cartao' | 'pix'>('dinheiro');
  const [showAddItemModal, setShowAddItemModal] = useState(false);
  const [caixa, setCaixa] = useState<CaixaState>({
    isOpen: false,
    valorInicial: 0,
    operador: user?.email || '',
    saldoAtual: 0
  });
  const [showCaixaModal, setShowCaixaModal] = useState(false);
  const [loading, setLoading] = useState(false);
  
  useEffect(() => {
    const mesasAguardando = mesas.filter(m => m.status === 'aguardando');
    const comandas: ComandaPendente[] = mesasAguardando.map(mesa => {
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

  const produtosFiltrados = produtos.filter(produto => {
    const matchBusca = produto.nome.toLowerCase().includes(busca.toLowerCase());
    const matchCategoria = categoriaSelecionada === 'todas' || produto.categoria === categoriaSelecionada;
    return matchBusca && matchCategoria && produto.disponivel;
  });

  const subtotal = comandaSelecionada 
    ? comandaSelecionada.total 
    : pedidoAtual.reduce((total, item) => total + (item.preco * item.quantidade), 0);
  const taxaServico = subtotal * 0.1;
  const total = subtotal + taxaServico;

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

  const removerItem = (itemId: number) => {
    setLoading(true);
    setTimeout(() => {
      if (comandaSelecionada) {
        const item = comandaSelecionada.itens.find(i => i.id === itemId);
        if (!item) return;

        const comandaAtualizada = {
          ...comandaSelecionada,
          itens: comandaSelecionada.itens.filter(i => i.id !== itemId),
          total: comandaSelecionada.total - (item.preco * item.quantidade)
        };
        setComandaSelecionada(comandaAtualizada);
        setComandasPendentes(prev => 
          prev.map(c => c.id === comandaSelecionada.id ? comandaAtualizada : c)
        );
        toast.success('Item removido da comanda');
      } else {
        setPedidoAtual(prev => prev.filter(item => item.id !== itemId));
        toast.success('Item removido do pedido');
      }
      setLoading(false);
    }, 300);
  };

  const atualizarQuantidade = (itemId: number, delta: number) => {
    if (comandaSelecionada) {
      const comandaAtualizada = {
        ...comandaSelecionada,
        itens: comandaSelecionada.itens.map(item => {
          if (item.id === itemId) {
            const novaQuantidade = Math.max(1, item.quantidade + delta);
            return { ...item, quantidade: novaQuantidade };
          }
          return item;
        })
      };
      setComandaSelecionada(comandaAtualizada);
      setComandasPendentes(prev => 
        prev.map(c => c.id === comandaSelecionada.id ? comandaAtualizada : c)
      );
    } else {
      setPedidoAtual(prev =>
        prev.map(item => {
          if (item.id === itemId) {
            const novaQuantidade = Math.max(1, item.quantidade + delta);
            return { ...item, quantidade: novaQuantidade };
          }
          return item;
        })
      );
    }
  };

  const abrirCaixa = (valor: number) => {
    setLoading(true);
    setTimeout(() => {
      setCaixa({
        isOpen: true,
        valorInicial: valor,
        operador: user?.email || '',
        dataAbertura: new Date(),
        saldoAtual: valor
      });
      setShowCaixaModal(false);
      toast.success('Caixa aberto com sucesso!');
      setLoading(false);
    }, 500);
  };

  const fecharCaixa = () => {
    setLoading(true);
    setTimeout(() => {
      setCaixa({
        isOpen: false,
        valorInicial: 0,
        operador: '',
        saldoAtual: 0
      });
      toast.success('Caixa fechado com sucesso!');
      setLoading(false);
    }, 500);
  };

  const limparPedido = () => {
    setPedidoAtual([]);
    setComandaSelecionada(null);
    toast.success('Pedido limpo');
  };

  const finalizarPedido = () => {
    setLoading(true);
    setTimeout(() => {
      if (comandaSelecionada) {
        setComandasPendentes(prev => 
          prev.filter(c => c.id !== comandaSelecionada.id)
        );
      }
      
      setCaixa(prev => ({
        ...prev,
        saldoAtual: prev.saldoAtual + total
      }));
      
      toast.success('Pagamento finalizado com sucesso!');
      limparPedido();
      setLoading(false);
    }, 1000);
  };

  return (
    <div className="min-h-screen bg-gray-100">
      {/* Header */}
      <header className="bg-white shadow-sm border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center">
              <button
                onClick={() => navigate(-1)}
                className="mr-4 text-gray-500 hover:text-gray-700 transition-colors"
              >
                <ArrowLeft size={24} />
              </button>
              <div>
                <h1 className="text-xl font-semibold text-gray-900">PDV</h1>
                <p className="text-sm text-gray-500">Ponto de Venda</p>
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
                    <p className="text-sm text-gray-500">{caixa.operador}</p>
                    <p className="text-lg font-semibold text-gray-900">
                      {formatarDinheiro(caixa.saldoAtual)}
                    </p>
                  </div>
                  <Button
                    variant="warning"
                    onClick={fecharCaixa}
                    isLoading={loading}
                  >
                    Fechar Caixa
                  </Button>
                </div>
              )}
            </div>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Comandas Pendentes */}
          <div>
            <div className="bg-white rounded-lg shadow-sm p-6 mb-6">
              <h2 className="text-lg font-medium text-gray-900 mb-4">
                Comandas Aguardando Pagamento
              </h2>
              
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {comandasPendentes.map(comanda => (
                  <button
                    key={comanda.id}
                    onClick={() => setComandaSelecionada(comanda)}
                    className={`p-4 rounded-lg border transition-all ${
                      comandaSelecionada?.id === comanda.id
                        ? 'border-blue-500 bg-blue-50 ring-2 ring-blue-200'
                        : 'border-gray-200 hover:border-blue-300 hover:bg-gray-50'
                    }`}
                  >
                    <div className="flex justify-between items-start mb-2">
                      <div>
                        <h3 className="font-medium text-lg">Mesa {comanda.mesa}</h3>
                        <p className="text-sm text-gray-500 flex items-center">
                          <Clock size={14} className="mr-1" />
                          {formatarTempo(comanda.horario)}
                        </p>
                      </div>
                      <span className="text-lg font-semibold text-blue-600">
                        {formatarDinheiro(comanda.total)}
                      </span>
                    </div>
                    <div className="text-sm text-gray-500">
                      {comanda.itens.length} itens
                    </div>
                  </button>
                ))}
              </div>
              
              {comandasPendentes.length === 0 && (
                <div className="text-center py-8 text-gray-500">
                  <ShoppingCart size={48} className="mx-auto mb-3 text-gray-400" />
                  <p>Nenhuma comanda aguardando pagamento</p>
                </div>
              )}
            </div>
          </div>

          {/* Pedido Atual */}
          <div className="bg-white rounded-lg shadow-sm overflow-hidden">
            <div className="p-6 border-b border-gray-200">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-lg font-medium text-gray-900">
                    {comandaSelecionada 
                      ? `Comanda - Mesa ${comandaSelecionada.mesa}`
                      : 'Novo Pedido'
                    }
                  </h2>
                  <p className="text-sm text-gray-500 mt-1">
                    {(comandaSelecionada?.itens || pedidoAtual).length} itens
                  </p>
                </div>
                <Button
                  variant="primary"
                  onClick={() => setShowAddItemModal(true)}
                  disabled={!caixa.isOpen}
                  icon={<Plus size={20} />}
                >
                  Adicionar Item
                </Button>
              </div>
            </div>

            <div className="divide-y divide-gray-200 max-h-[calc(100vh-400px)] overflow-y-auto p-6">
              {(comandaSelecionada?.itens || pedidoAtual).length === 0 ? (
                <div className="text-center py-8">
                  <ShoppingCart size={48} className="mx-auto text-gray-400" />
                  <p className="mt-2 text-gray-500">
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
                      <h4 className="font-medium text-gray-900">{item.nome}</h4>
                      {item.observacao && (
                        <p className="text-sm text-gray-500 mt-1">{item.observacao}</p>
                      )}
                      <div className="flex items-center mt-2">
                        <button
                          onClick={() => atualizarQuantidade(item.id, -1)}
                          className="text-gray-500 hover:text-red-500 transition-colors"
                        >
                          <Minus size={16} />
                        </button>
                        <span className="mx-3 font-medium">{item.quantidade}</span>
                        <button
                          onClick={() => atualizarQuantidade(item.id, 1)}
                          className="text-gray-500 hover:text-green-500 transition-colors"
                        >
                          <Plus size={16} />
                        </button>
                      </div>
                    </div>
                    
                    <div className="text-right ml-4">
                      <p className="text-sm text-gray-500">
                        {formatarDinheiro(item.preco)} un
                      </p>
                      <p className="font-medium text-gray-900">
                        {formatarDinheiro(item.preco * item.quantidade)}
                      </p>
                      <button
                        onClick={() => removerItem(item.id)}
                        className="text-red-500 hover:text-red-700 transition-colors mt-2"
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>

            <div className="p-6 bg-gray-50 border-t border-gray-200">
              <div className="space-y-4">
                <div className="flex justify-between text-gray-500">
                  <span>Subtotal</span>
                  <span>{formatarDinheiro(subtotal)}</span>
                </div>
                <div className="flex justify-between text-gray-500">
                  <span>Taxa de serviço (10%)</span>
                  <span>{formatarDinheiro(taxaServico)}</span>
                </div>
                <div className="flex justify-between text-xl font-semibold text-gray-900 pt-4 border-t border-gray-200">
                  <span>Total</span>
                  <span>{formatarDinheiro(total)}</span>
                </div>

                <div className="grid grid-cols-3 gap-4 mt-6">
                  <button
                    onClick={() => setFormaPagamento('dinheiro')}
                    className={`p-4 rounded-lg border text-center transition-all ${
                      formaPagamento === 'dinheiro'
                        ? 'border-blue-500 bg-blue-50 text-blue-700'
                        : 'border-gray-200 hover:border-blue-200 hover:bg-gray-50'
                    }`}
                  >
                    <Receipt size={24} className="mx-auto mb-2" />
                    <span className="text-sm">Dinheiro</span>
                  </button>
                  <button
                    onClick={() => setFormaPagamento('cartao')}
                    className={`p-4 rounded-lg border text-center transition-all ${
                      formaPagamento === 'cartao'
                        ? 'border-blue-500 bg-blue-50 text-blue-700'
                        : 'border-gray-200 hover:border-blue-200 hover:bg-gray-50'
                    }`}
                  >
                    <CreditCard size={24} className="mx-auto mb-2" />
                    <span className="text-sm">Cartão</span>
                  </button>
                  <button
                    onClick={() => setFormaPagamento('pix')}
                    className={`p-4 rounded-lg border text-center transition-all ${
                      formaPagamento === 'pix'
                        ? 'border-blue-500 bg-blue-50 text-blue-700'
                        : 'border-gray-200 hover:border-blue-200 hover:bg-gray-50'
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
                    onClick={finalizarPedido}
                    isLoading={loading}
                  >
                    Finalizar {comandaSelecionada ? 'Pagamento' : 'Pedido'}
                  </Button>
                  
                  <Button
                    variant="ghost"
                    fullWidth
                    disabled={(comandaSelecionada?.itens || pedidoAtual).length === 0}
                    onClick={limparPedido}
                    icon={<Trash2 size={18} />}
                  >
                    {comandaSelecionada ? 'Cancelar' : 'Limpar'}
                  </Button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Modal de Adicionar Item */}
      {showAddItemModal && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-black bg-opacity-50 flex items-center justify-center">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-4xl m-4">
            <div className="p-6">
              <div className="flex justify-between items-center mb-6">
                <h3 className="text-lg font-medium">Adicionar Item</h3>
                <button 
                  onClick={() => setShowAddItemModal(false)}
                  className="text-gray-400 hover:text-gray-500 transition-colors"
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
                    className="pl-10 w-full rounded-lg border border-gray-300 py-2 px-4 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>

                {/* Categorias */}
                <div className="flex gap-2 overflow-x-auto pb-2">
                  <button
                    onClick={() => setCategoriaSelecionada('todas')}
                    className={`px-4 py-2 rounded-full whitespace-nowrap transition-colors ${
                      categoriaSelecionada === 'todas'
                        ? 'bg-blue-500 text-white'
                        : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
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
                          : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
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
                      className="p-4 border border-gray-200 rounded-lg text-left hover:bg-gray-50 transition-all hover:border-blue-300 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      <h3 className="font-medium text-gray-900">{produto.nome}</h3>
                      <p className="text-sm text-gray-500">{produto.categoria}</p>
                      <p className="mt-2 font-semibold text-blue-600">
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

      {/* Modal de Abertura de Caixa */}
      {showCaixaModal && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-black bg-opacity-50 flex items-center justify-center">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-md m-4">
            <div className="p-6">
              <div className="flex justify-between items-center mb-6">
                <h3 className="text-lg font-medium">Abertura de Caixa</h3>
                <button 
                  onClick={() => setShowCaixaModal(false)}
                  className="text-gray-400 hover:text-gray-500 transition-colors"
                >
                  <X size={24} />
                </button>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700">
                    Operador
                  </label>
                  <input
                    type="text"
                    value={user?.email || ''}
                    disabled
                    className="mt-1 block w-full rounded-md border-gray-300 bg-gray-100 cursor-not-allowed p-2"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700">
                    Valor Inicial em Caixa
                  </label>
                  <div className="mt-1 relative rounded-md shadow-sm">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                      <span className="text-gray-500 sm:text-sm">R$</span>
                    </div>
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      value={caixa.valorInicial}
                      onChange={(e) => setCaixa({ ...caixa, valorInicial: parseFloat(e.target.value) || 0 })}
                      className="pl-12 block w-full pr-12 sm:text-sm border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500 p-2"
                      placeholder="0,00"
                    />
                  </div>
                </div>

                <Button
                  variant="primary"
                  fullWidth
                  onClick={() => abrirCaixa(caixa.valorInicial)}
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