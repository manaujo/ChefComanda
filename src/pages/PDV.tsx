import React, { useState, useEffect } from 'react';
import { 
  ShoppingCart, Plus, Minus, Trash2, CreditCard, 
  DollarSign, QrCode, Calculator, Receipt, Search,
  Filter, X, Check, Clock, User
} from 'lucide-react';
import Button from '../components/ui/Button';
import { useRestaurante } from '../contexts/RestauranteContext';
import { formatarDinheiro } from '../utils/formatters';
import { Database } from '../types/database';
import toast from 'react-hot-toast';

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

const PDV: React.FC = () => {
  const { produtos, refreshData } = useRestaurante();
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
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    refreshData();
  }, []);

  // Get unique categories
  const categorias = Array.from(new Set(produtos.map(produto => produto.categoria)));

  // Filter products
  const produtosFiltrados = produtos.filter(produto => {
    const matchBusca = produto.nome.toLowerCase().includes(busca.toLowerCase());
    const matchCategoria = categoriaSelecionada === 'todos' || produto.categoria === categoriaSelecionada;
    return matchBusca && matchCategoria && produto.disponivel;
  });

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
      // Simular finalização da venda
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      toast.success('Venda finalizada com sucesso!');
      
      // Limpar carrinho
      setItensVenda([]);
      setCliente({});
      setFormaPagamento(null);
      setValorRecebido('');
      setDesconto({ tipo: 'percentual', valor: 0 });
      setTaxaServico(false);
      setShowPagamentoModal(false);
    } catch (error) {
      console.error('Error finalizing sale:', error);
      toast.error('Erro ao finalizar venda');
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

  return (
    <div className="min-h-screen bg-gray-100 dark:bg-gray-900">
      <div className="flex h-screen">
        {/* Produtos - Lado Esquerdo */}
        <div className="flex-1 bg-white dark:bg-gray-800 p-6 overflow-y-auto">
          <div className="mb-6">
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">
              Ponto de Venda
            </h1>
            
            {/* Filtros */}
            <div className="flex flex-col md:flex-row gap-4 mb-6">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
                <input
                  type="text"
                  placeholder="Buscar produtos..."
                  value={busca}
                  onChange={(e) => setBusca(e.target.value)}
                  className="pl-10 w-full rounded-lg border border-gray-300 dark:border-gray-600 py-2 px-4 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white"
                />
              </div>
              
              <select
                value={categoriaSelecionada}
                onChange={(e) => setCategoriaSelecionada(e.target.value)}
                className="border border-gray-300 dark:border-gray-600 rounded-md py-2 pl-3 pr-10 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white"
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
                onClick={() => adicionarItem(produto)}
                className="bg-white dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-lg p-4 cursor-pointer hover:shadow-md transition-shadow"
              >
                <div className="text-center">
                  <h3 className="font-medium text-gray-900 dark:text-white text-sm mb-1">
                    {produto.nome}
                  </h3>
                  <p className="text-xs text-gray-500 dark:text-gray-400 mb-2">
                    {produto.categoria}
                  </p>
                  <p className="text-lg font-bold text-blue-600 dark:text-blue-400">
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
                className="w-full text-sm border border-gray-300 dark:border-gray-600 rounded-md py-2 px-3 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white"
              />
              <input
                type="text"
                placeholder="Telefone"
                value={cliente.telefone || ''}
                onChange={(e) => setCliente({ ...cliente, telefone: e.target.value })}
                className="w-full text-sm border border-gray-300 dark:border-gray-600 rounded-md py-2 px-3 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white"
              />
              <input
                type="number"
                placeholder="Número da mesa"
                value={cliente.mesa || ''}
                onChange={(e) => setCliente({ ...cliente, mesa: parseInt(e.target.value) || undefined })}
                className="w-full text-sm border border-gray-300 dark:border-gray-600 rounded-md py-2 px-3 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white"
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

      {/* Modal de Pagamento */}
      {showPagamentoModal && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-black bg-opacity-50">
          <div className="flex items-center justify-center min-h-screen p-4">
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl w-full max-w-md">
              <div className="flex justify-between items-center p-6 border-b border-gray-200 dark:border-gray-700">
                <h3 className="text-lg font-medium text-gray-900 dark:text-white">
                  Finalizar Pagamento
                </h3>
                <button
                  onClick={() => setShowPagamentoModal(false)}
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
                    {formatarDinheiro(calcularTotal())}
                  </p>
                </div>

                {/* Formas de Pagamento */}
                <div className="space-y-3 mb-6">
                  <button
                    onClick={() => setFormaPagamento('pix')}
                    className={`w-full p-4 rounded-lg border-2 transition-colors ${
                      formaPagamento === 'pix'
                        ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20'
                        : 'border-gray-200 dark:border-gray-600 hover:border-blue-200'
                    }`}
                  >
                    <div className="flex items-center">
                      <QrCode size={24} className="text-blue-500" />
                      <span className="ml-3 font-medium text-gray-900 dark:text-white">PIX</span>
                    </div>
                  </button>

                  <button
                    onClick={() => setFormaPagamento('cartao')}
                    className={`w-full p-4 rounded-lg border-2 transition-colors ${
                      formaPagamento === 'cartao'
                        ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20'
                        : 'border-gray-200 dark:border-gray-600 hover:border-blue-200'
                    }`}
                  >
                    <div className="flex items-center">
                      <CreditCard size={24} className="text-blue-500" />
                      <span className="ml-3 font-medium text-gray-900 dark:text-white">Cartão</span>
                    </div>
                  </button>

                  <button
                    onClick={() => setFormaPagamento('dinheiro')}
                    className={`w-full p-4 rounded-lg border-2 transition-colors ${
                      formaPagamento === 'dinheiro'
                        ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20'
                        : 'border-gray-200 dark:border-gray-600 hover:border-blue-200'
                    }`}
                  >
                    <div className="flex items-center">
                      <DollarSign size={24} className="text-blue-500" />
                      <span className="ml-3 font-medium text-gray-900 dark:text-white">Dinheiro</span>
                    </div>
                  </button>
                </div>

                {/* Valor Recebido (apenas para dinheiro) */}
                {formaPagamento === 'dinheiro' && (
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
                  onClick={finalizarVenda}
                  isLoading={loading}
                  disabled={!formaPagamento}
                  icon={<Receipt size={20} />}
                >
                  Confirmar Pagamento
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