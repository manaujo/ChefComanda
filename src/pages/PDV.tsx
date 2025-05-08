import React, { useState, useEffect } from 'react';
import { Search, ShoppingCart, Trash2, Plus, Minus, CreditCard, Receipt, ArrowLeft } from 'lucide-react';
import { useRestaurante } from '../contexts/RestauranteContext';
import { formatarDinheiro } from '../utils/formatters';
import Button from '../components/ui/Button';
import { useNavigate } from 'react-router-dom';

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

const PDV: React.FC = () => {
  const navigate = useNavigate();
  const { produtos, categorias, mesas, itensComanda } = useRestaurante();
  const [busca, setBusca] = useState('');
  const [categoriaSelecionada, setCategoriaSelecionada] = useState('todas');
  const [pedidoAtual, setPedidoAtual] = useState<OrderItem[]>([]);
  const [comandasPendentes, setComandasPendentes] = useState<ComandaPendente[]>([]);
  const [comandaSelecionada, setComandaSelecionada] = useState<ComandaPendente | null>(null);
  const [formaPagamento, setFormaPagamento] = useState<'dinheiro' | 'cartao' | 'pix'>('dinheiro');
  
  // Carregar comandas pendentes
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

  // Filtrar produtos
  const produtosFiltrados = produtos.filter(produto => {
    const matchBusca = produto.nome.toLowerCase().includes(busca.toLowerCase());
    const matchCategoria = categoriaSelecionada === 'todas' || produto.categoria === categoriaSelecionada;
    return matchBusca && matchCategoria && produto.disponivel;
  });

  // Calcular totais
  const subtotal = comandaSelecionada 
    ? comandaSelecionada.total 
    : pedidoAtual.reduce((total, item) => total + (item.preco * item.quantidade), 0);
  const taxaServico = subtotal * 0.1;
  const total = subtotal + taxaServico;

  const adicionarItem = (produto: Produto) => {
    if (comandaSelecionada) return; // Não permitir adicionar itens em comanda pendente
    
    setPedidoAtual(items => {
      const itemExistente = items.find(item => item.id === produto.id);
      if (itemExistente) {
        return items.map(item =>
          item.id === produto.id
            ? { ...item, quantidade: item.quantidade + 1 }
            : item
        );
      }
      return [...items, {
        id: produto.id,
        nome: produto.nome,
        quantidade: 1,
        preco: produto.preco
      }];
    });
  };

  const atualizarQuantidade = (itemId: number, delta: number) => {
    if (comandaSelecionada) return; // Não permitir alterar itens em comanda pendente
    
    setPedidoAtual(items =>
      items.map(item => {
        if (item.id === itemId) {
          const novaQuantidade = item.quantidade + delta;
          return novaQuantidade > 0
            ? { ...item, quantidade: novaQuantidade }
            : item;
        }
        return item;
      }).filter(item => item.quantidade > 0)
    );
  };

  const limparPedido = () => {
    setPedidoAtual([]);
    setComandaSelecionada(null);
  };

  const finalizarPedido = () => {
    // Implementar lógica de finalização
    console.log('Pedido finalizado:', {
      comanda: comandaSelecionada,
      items: pedidoAtual,
      subtotal,
      taxaServico,
      total,
      formaPagamento
    });
    
    // Remover comanda da lista após finalização
    if (comandaSelecionada) {
      setComandasPendentes(prev => 
        prev.filter(c => c.id !== comandaSelecionada.id)
      );
    }
    
    limparPedido();
  };

  const selecionarComanda = (comanda: ComandaPendente) => {
    setComandaSelecionada(comanda);
    setPedidoAtual(comanda.itens);
  };

  return (
    <div className="min-h-screen bg-gray-100 dark:bg-gray-900">
      {/* Header */}
      <header className="bg-white dark:bg-gray-800 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-4">
            <div className="flex items-center">
              <button
                onClick={() => navigate(-1)}
                className="mr-4 text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300"
              >
                <ArrowLeft size={24} />
              </button>
              <h1 className="text-2xl font-bold text-gray-900 dark:text-white">PDV</h1>
            </div>
            <div className="flex items-center space-x-4">
              <span className="text-sm text-gray-500 dark:text-gray-400">
                Operador: João Silva
              </span>
              <span className="text-sm text-gray-500 dark:text-gray-400">
                Caixa aberto às 08:00
              </span>
            </div>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Lado Esquerdo: Comandas Pendentes e Produtos */}
          <div className="space-y-6">
            {/* Comandas Pendentes */}
            {comandasPendentes.length > 0 && (
              <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
                <h2 className="text-lg font-medium text-gray-900 dark:text-white mb-4">
                  Comandas Aguardando Pagamento
                </h2>
                <div className="space-y-4">
                  {comandasPendentes.map(comanda => (
                    <button
                      key={comanda.id}
                      onClick={() => selecionarComanda(comanda)}
                      className={`w-full p-4 rounded-lg border ${
                        comandaSelecionada?.id === comanda.id
                          ? 'border-blue-500 bg-blue-50 dark:bg-blue-900'
                          : 'border-gray-200 dark:border-gray-700'
                      } hover:bg-gray-50 dark:hover:bg-gray-700`}
                    >
                      <div className="flex justify-between items-center">
                        <div>
                          <h3 className="font-medium">Mesa {comanda.mesa}</h3>
                          <p className="text-sm text-gray-500">
                            {new Date(comanda.horario).toLocaleTimeString()}
                          </p>
                        </div>
                        <p className="font-semibold text-lg">
                          {formatarDinheiro(comanda.total)}
                        </p>
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Produtos */}
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
              <div className="space-y-4">
                {/* Busca */}
                <div className="relative">
                  <Search className="absolute left-3 top-2.5 text-gray-400" size={20} />
                  <input
                    type="text"
                    placeholder="Buscar produtos..."
                    value={busca}
                    onChange={(e) => setBusca(e.target.value)}
                    className="pl-10 w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 py-2 px-4 text-gray-900 dark:text-gray-100"
                  />
                </div>

                {/* Categorias */}
                <div className="flex gap-2 overflow-x-auto pb-2">
                  <button
                    onClick={() => setCategoriaSelecionada('todas')}
                    className={`px-4 py-2 rounded-full whitespace-nowrap ${
                      categoriaSelecionada === 'todas'
                        ? 'bg-blue-500 text-white'
                        : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300'
                    }`}
                  >
                    Todas
                  </button>
                  {categorias.map(categoria => (
                    <button
                      key={categoria}
                      onClick={() => setCategoriaSelecionada(categoria)}
                      className={`px-4 py-2 rounded-full whitespace-nowrap ${
                        categoriaSelecionada === categoria
                          ? 'bg-blue-500 text-white'
                          : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300'
                      }`}
                    >
                      {categoria}
                    </button>
                  ))}
                </div>

                {/* Grid de Produtos */}
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                  {produtosFiltrados.map(produto => (
                    <button
                      key={produto.id}
                      onClick={() => adicionarItem(produto)}
                      disabled={!!comandaSelecionada}
                      className={`p-4 border border-gray-200 dark:border-gray-700 rounded-lg text-left ${
                        comandaSelecionada
                          ? 'opacity-50 cursor-not-allowed'
                          : 'hover:bg-gray-50 dark:hover:bg-gray-700'
                      } transition-colors`}
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

          {/* Pedido Atual */}
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow">
            <div className="p-6 border-b border-gray-200 dark:border-gray-700">
              <div className="flex items-center justify-between">
                <h2 className="text-lg font-medium text-gray-900 dark:text-white">
                  {comandaSelecionada 
                    ? `Comanda - Mesa ${comandaSelecionada.mesa}`
                    : 'Novo Pedido'
                  }
                </h2>
                <div className="flex items-center text-sm text-gray-500 dark:text-gray-400">
                  <ShoppingCart size={16} className="mr-1" />
                  <span>{pedidoAtual.length} itens</span>
                </div>
              </div>
            </div>

            <div className="p-6 flex flex-col h-[calc(100vh-400px)]">
              <div className="flex-1 overflow-y-auto">
                {pedidoAtual.length === 0 ? (
                  <div className="text-center py-8">
                    <ShoppingCart size={48} className="mx-auto text-gray-400 dark:text-gray-600" />
                    <p className="mt-2 text-gray-500 dark:text-gray-400">
                      Nenhum item adicionado
                    </p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {pedidoAtual.map(item => (
                      <div
                        key={item.id}
                        className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-700 rounded-lg"
                      >
                        <div className="flex-1">
                          <h4 className="font-medium text-gray-900 dark:text-white">{item.nome}</h4>
                          <p className="text-sm text-gray-500 dark:text-gray-400">
                            {formatarDinheiro(item.preco)} un
                          </p>
                        </div>
                        
                        <div className="flex items-center space-x-3">
                          {!comandaSelecionada && (
                            <>
                              <button
                                onClick={() => atualizarQuantidade(item.id, -1)}
                                className="p-1 text-gray-500 dark:text-gray-400 hover:text-red-500 dark:hover:text-red-400"
                              >
                                <Minus size={16} />
                              </button>
                              <span className="font-medium text-gray-900 dark:text-white">
                                {item.quantidade}
                              </span>
                              <button
                                onClick={() => atualizarQuantidade(item.id, 1)}
                                className="p-1 text-gray-500 dark:text-gray-400 hover:text-green-500 dark:hover:text-green-400"
                              >
                                <Plus size={16} />
                              </button>
                            </>
                          )}
                          <span className="font-medium text-gray-900 dark:text-white">
                            {formatarDinheiro(item.preco * item.quantidade)}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div className="mt-6 pt-6 border-t border-gray-200 dark:border-gray-700">
                <div className="space-y-4">
                  <div className="flex justify-between text-gray-500 dark:text-gray-400">
                    <span>Subtotal</span>
                    <span>{formatarDinheiro(subtotal)}</span>
                  </div>
                  <div className="flex justify-between text-gray-500 dark:text-gray-400">
                    <span>Taxa de serviço (10%)</span>
                    <span>{formatarDinheiro(taxaServico)}</span>
                  </div>
                  <div className="flex justify-between text-xl font-semibold text-gray-900 dark:text-white">
                    <span>Total</span>
                    <span>{formatarDinheiro(total)}</span>
                  </div>

                  {/* Formas de Pagamento */}
                  <div className="grid grid-cols-3 gap-4">
                    <button
                      onClick={() => setFormaPagamento('dinheiro')}
                      className={`p-4 rounded-lg border text-center ${
                        formaPagamento === 'dinheiro'
                          ? 'border-blue-500 bg-blue-50 dark:bg-blue-900 text-blue-600 dark:text-blue-400'
                          : 'border-gray-200 dark:border-gray-700'
                      }`}
                    >
                      <Receipt size={24} className="mx-auto mb-2" />
                      <span className="text-sm">Dinheiro</span>
                    </button>
                    <button
                      onClick={() => setFormaPagamento('cartao')}
                      className={`p-4 rounded-lg border text-center ${
                        formaPagamento === 'cartao'
                          ? 'border-blue-500 bg-blue-50 dark:bg-blue-900 text-blue-600 dark:text-blue-400'
                          : 'border-gray-200 dark:border-gray-700'
                      }`}
                    >
                      <CreditCard size={24} className="mx-auto mb-2" />
                      <span className="text-sm">Cartão</span>
                    </button>
                    <button
                      onClick={() => setFormaPagamento('pix')}
                      className={`p-4 rounded-lg border text-center ${
                        formaPagamento === 'pix'
                          ? 'border-blue-500 bg-blue-50 dark:bg-blue-900 text-blue-600 dark:text-blue-400'
                          : 'border-gray-200 dark:border-gray-700'
                      }`}
                    >
                      <Receipt size={24} className="mx-auto mb-2" />
                      <span className="text-sm">PIX</span>
                    </button>
                  </div>
                </div>

                <div className="mt-6 space-y-3">
                  <Button
                    variant="primary"
                    fullWidth
                    disabled={pedidoAtual.length === 0}
                    onClick={finalizarPedido}
                  >
                    Finalizar {comandaSelecionada ? 'Pagamento' : 'Pedido'}
                  </Button>
                  <Button
                    variant="ghost"
                    fullWidth
                    disabled={pedidoAtual.length === 0}
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
    </div>
  );
};

export default PDV;