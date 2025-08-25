import React, { useState, useEffect } from 'react';
import { X, Search, Plus, Minus, ShoppingCart, Send, Trash2, Package, AlertTriangle } from 'lucide-react';
import Button from '../ui/Button';
import { useRestaurante } from '../../contexts/RestauranteContext';
import { formatarDinheiro } from '../../utils/formatters';
import toast from 'react-hot-toast';
import { Database } from '../../types/database';

type Produto = Database['public']['Tables']['produtos']['Row'];

interface ItemCarrinho {
  produto: Produto;
  quantidade: number;
  observacao: string;
}

interface CarrinhoMesaModalProps {
  isOpen: boolean;
  onClose: () => void;
  mesaId: string;
}

const CarrinhoMesaModal: React.FC<CarrinhoMesaModalProps> = ({ isOpen, onClose, mesaId }) => {
  const [busca, setBusca] = useState('');
  const [categoriaSelecionada, setCategoriaSelecionada] = useState('todos');
  const [carrinho, setCarrinho] = useState<ItemCarrinho[]>([]);
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<'produtos' | 'carrinho'>('produtos');
  
  const { produtos, comandas, criarComanda, adicionarItemComanda, refreshData, mesas } = useRestaurante();
  
  const mesa = mesas.find(m => m.id === mesaId);
  
  useEffect(() => {
    if (isOpen) {
      refreshData();
      setCarrinho([]);
      setActiveTab('produtos');
    }
  }, [isOpen]);
  
  // Get unique categories
  const categorias = Array.from(new Set(produtos.map(produto => produto.categoria)));
  
  // Filter products
  const produtosFiltrados = produtos.filter(produto => {
    const matchBusca = produto.nome.toLowerCase().includes(busca.toLowerCase());
    const matchCategoria = categoriaSelecionada === 'todos' || produto.categoria === categoriaSelecionada;
    return matchBusca && matchCategoria && produto.disponivel;
  });

  const adicionarAoCarrinho = (produto: Produto) => {
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

  const removerDoCarrinho = (produtoId: string) => {
    setCarrinho(carrinho.filter(item => item.produto.id !== produtoId));
  };

  const alterarQuantidade = (produtoId: string, novaQuantidade: number) => {
    if (novaQuantidade <= 0) {
      removerDoCarrinho(produtoId);
      return;
    }

    setCarrinho(carrinho.map(item => 
      item.produto.id === produtoId 
        ? { ...item, quantidade: novaQuantidade }
        : item
    ));
  };

  const alterarObservacao = (produtoId: string, observacao: string) => {
    setCarrinho(carrinho.map(item => 
      item.produto.id === produtoId 
        ? { ...item, observacao }
        : item
    ));
  };

  const calcularTotal = () => {
    return carrinho.reduce((total, item) => total + (item.produto.preco * item.quantidade), 0);
  };

  const enviarParaCozinha = async () => {
    if (carrinho.length === 0) {
      toast.error('Adicione itens ao carrinho primeiro');
      return;
    }

    setLoading(true);
    try {
      // Find or create comanda for this mesa
      let comandaId = comandas.find(c => c.mesa_id === mesaId && c.status === 'aberta')?.id;
      
      if (!comandaId) {
        comandaId = await criarComanda(mesaId);
      }
      
      // Add all items to comanda
      for (const item of carrinho) {
        await adicionarItemComanda({
          comandaId,
          produtoId: item.produto.id,
          quantidade: item.quantidade,
          observacao: item.observacao || undefined,
        });
      }
      
      // Refresh data to update UI
      await refreshData();
      
      toast.success(`${carrinho.length} ${carrinho.length === 1 ? 'item enviado' : 'itens enviados'} para a cozinha!`);
      setCarrinho([]);
      onClose();
    } catch (error) {
      console.error('Error sending to kitchen:', error);
      toast.error('Erro ao enviar pedido para a cozinha');
    } finally {
      setLoading(false);
    }
  };
  
  if (!isOpen || !mesa) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-black/60 backdrop-blur-sm">
      <div className="flex items-center justify-center min-h-screen p-4">
        <div className="bg-white dark:bg-gray-800 rounded-3xl shadow-2xl w-full max-w-6xl max-h-[90vh] overflow-hidden border border-white/20 dark:border-gray-700/50">
          {/* Header */}
          <div className="relative overflow-hidden">
            <div className="bg-gradient-to-r from-blue-600 via-blue-700 to-indigo-700 p-6">
              <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full -mr-16 -mt-16"></div>
              <div className="relative flex justify-between items-center">
                <div className="flex items-center">
                  <div className="p-3 bg-white/20 backdrop-blur-sm rounded-2xl mr-4">
                    <ShoppingCart size={24} className="text-white" />
                  </div>
                  <div className="text-white">
                    <h2 className="text-2xl font-bold">
                      Criar Pedido - Mesa {mesa.numero}
                    </h2>
                    <p className="text-blue-100">
                      Selecione os produtos e envie para a cozinha
                    </p>
                  </div>
                </div>
                <div className="flex items-center space-x-4">
                  {carrinho.length > 0 && (
                    <div className="bg-white/20 backdrop-blur-sm px-4 py-2 rounded-2xl">
                      <span className="text-white font-bold">
                        {carrinho.length} {carrinho.length === 1 ? 'item' : 'itens'}
                      </span>
                    </div>
                  )}
                  <button
                    onClick={() => {
                      onClose();
                      setCarrinho([]);
                    }}
                    className="p-2 text-white/70 hover:text-white hover:bg-white/20 rounded-xl transition-colors"
                  >
                    <X size={24} />
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* Tabs */}
          <div className="bg-gray-50 dark:bg-gray-700 border-b border-gray-200 dark:border-gray-600">
            <div className="flex">
              <button
                onClick={() => setActiveTab('produtos')}
                className={`flex-1 py-4 px-6 text-center font-semibold transition-colors ${
                  activeTab === 'produtos'
                    ? 'bg-white dark:bg-gray-800 text-blue-600 dark:text-blue-400 border-b-2 border-blue-600'
                    : 'text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200'
                }`}
              >
                <Package className="w-5 h-5 mx-auto mb-1" />
                Produtos
              </button>
              <button
                onClick={() => setActiveTab('carrinho')}
                className={`flex-1 py-4 px-6 text-center font-semibold transition-colors relative ${
                  activeTab === 'carrinho'
                    ? 'bg-white dark:bg-gray-800 text-blue-600 dark:text-blue-400 border-b-2 border-blue-600'
                    : 'text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200'
                }`}
              >
                <ShoppingCart className="w-5 h-5 mx-auto mb-1" />
                Carrinho
                {carrinho.length > 0 && (
                  <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full w-6 h-6 flex items-center justify-center">
                    {carrinho.length}
                  </span>
                )}
              </button>
            </div>
          </div>

          <div className="p-6 overflow-y-auto max-h-[calc(90vh-200px)]">
            {activeTab === 'produtos' ? (
              <div className="space-y-6">
                {/* Search and filters */}
                <div className="flex flex-col md:flex-row gap-4">
                  <div className="relative flex-1">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
                    <input
                      type="text"
                      placeholder="Buscar produtos..."
                      value={busca}
                      onChange={(e) => setBusca(e.target.value)}
                      className="pl-10 w-full rounded-2xl border border-gray-200 dark:border-gray-600 py-3 px-4 bg-gray-50 dark:bg-gray-700 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-gray-900 dark:text-white"
                    />
                  </div>
                  
                  <select
                    value={categoriaSelecionada}
                    onChange={(e) => setCategoriaSelecionada(e.target.value)}
                    className="rounded-2xl border border-gray-200 dark:border-gray-600 py-3 px-4 bg-gray-50 dark:bg-gray-700 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-gray-900 dark:text-white"
                  >
                    <option value="todos">Todas categorias</option>
                    {categorias.map((categoria) => (
                      <option key={categoria} value={categoria}>
                        {categoria}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Product list */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {produtosFiltrados.map((produto) => (
                    <div 
                      key={produto.id}
                      className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg border border-gray-200 dark:border-gray-700 overflow-hidden hover:shadow-xl transition-all duration-300 hover:scale-105"
                    >
                      {produto.imagem_url && (
                        <img
                          src={produto.imagem_url}
                          alt={produto.nome}
                          className="w-full h-32 object-cover"
                        />
                      )}
                      <div className="p-4">
                        <h3 className="font-bold text-gray-900 dark:text-white mb-2">{produto.nome}</h3>
                        <p className="text-sm text-gray-600 dark:text-gray-400 mb-3 line-clamp-2">
                          {produto.descricao}
                        </p>
                        <div className="flex items-center justify-between mb-3">
                          <span className="text-xs bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200 px-2 py-1 rounded-full">
                            {produto.categoria}
                          </span>
                          <span className="font-bold text-lg text-gray-900 dark:text-white">
                            {formatarDinheiro(produto.preco)}
                          </span>
                        </div>
                        <Button
                          onClick={() => adicionarAoCarrinho(produto)}
                          variant="primary"
                          size="sm"
                          fullWidth
                          icon={<Plus size={16} />}
                          className="rounded-xl"
                        >
                          Adicionar
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>

                {produtosFiltrados.length === 0 && (
                  <div className="text-center py-12">
                    <Package className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                    <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
                      Nenhum produto encontrado
                    </h3>
                    <p className="text-gray-500 dark:text-gray-400">
                      Tente ajustar os filtros de busca
                    </p>
                  </div>
                )}
              </div>
            ) : (
              <div className="space-y-6">
                {carrinho.length === 0 ? (
                  <div className="text-center py-12">
                    <ShoppingCart className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                    <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
                      Carrinho vazio
                    </h3>
                    <p className="text-gray-500 dark:text-gray-400 mb-6">
                      Adicione produtos na aba "Produtos" para criar o pedido
                    </p>
                    <Button
                      onClick={() => setActiveTab('produtos')}
                      variant="primary"
                      icon={<Package size={18} />}
                    >
                      Escolher Produtos
                    </Button>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {carrinho.map((item) => (
                      <div
                        key={item.produto.id}
                        className="bg-gray-50 dark:bg-gray-700 rounded-2xl p-6 border border-gray-200 dark:border-gray-600"
                      >
                        <div className="flex justify-between items-start mb-4">
                          <div className="flex-1">
                            <h4 className="font-bold text-gray-900 dark:text-white text-lg">
                              {item.produto.nome}
                            </h4>
                            <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">
                              {item.produto.categoria} • {formatarDinheiro(item.produto.preco)} cada
                            </p>
                            <div className="text-lg font-bold text-blue-600 dark:text-blue-400">
                              Total: {formatarDinheiro(item.produto.preco * item.quantidade)}
                            </div>
                          </div>
                          <button
                            onClick={() => removerDoCarrinho(item.produto.id)}
                            className="text-red-500 hover:text-red-700 p-2 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-xl transition-colors"
                          >
                            <Trash2 size={18} />
                          </button>
                        </div>

                        {/* Quantity controls */}
                        <div className="flex items-center space-x-4 mb-4">
                          <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                            Quantidade:
                          </span>
                          <div className="flex items-center space-x-3">
                            <button
                              onClick={() => alterarQuantidade(item.produto.id, item.quantidade - 1)}
                              className="w-10 h-10 rounded-full bg-gray-200 dark:bg-gray-600 flex items-center justify-center hover:bg-gray-300 dark:hover:bg-gray-500 transition-colors"
                            >
                              <Minus size={16} />
                            </button>
                            <span className="w-12 text-center font-bold text-lg">
                              {item.quantidade}
                            </span>
                            <button
                              onClick={() => alterarQuantidade(item.produto.id, item.quantidade + 1)}
                              className="w-10 h-10 rounded-full bg-gray-200 dark:bg-gray-600 flex items-center justify-center hover:bg-gray-300 dark:hover:bg-gray-500 transition-colors"
                            >
                              <Plus size={16} />
                            </button>
                          </div>
                        </div>

                        {/* Observations */}
                        <div>
                          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                            Observações (opcional)
                          </label>
                          <textarea
                            value={item.observacao}
                            onChange={(e) => alterarObservacao(item.produto.id, e.target.value)}
                            placeholder="Ex: Sem cebola, molho à parte, bem passado..."
                            className="w-full rounded-xl border border-gray-200 dark:border-gray-600 py-3 px-4 bg-white dark:bg-gray-800 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-gray-900 dark:text-white resize-none"
                            rows={2}
                          />
                        </div>
                      </div>
                    ))}

                    {/* Total */}
                    <div className="bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20 rounded-2xl p-6 border border-blue-200 dark:border-blue-700">
                      <div className="flex justify-between items-center">
                        <span className="text-xl font-bold text-gray-900 dark:text-white">
                          Total do Pedido
                        </span>
                        <span className="text-3xl font-bold text-blue-600 dark:text-blue-400">
                          {formatarDinheiro(calcularTotal())}
                        </span>
                      </div>
                      <p className="text-sm text-blue-700 dark:text-blue-300 mt-2">
                        {carrinho.reduce((total, item) => total + item.quantidade, 0)} {carrinho.reduce((total, item) => total + item.quantidade, 0) === 1 ? 'item' : 'itens'} no carrinho
                      </p>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="bg-gray-50 dark:bg-gray-700 px-6 py-4 border-t border-gray-200 dark:border-gray-600">
            <div className="flex justify-between items-center">
              <div className="flex space-x-3">
                <Button
                  variant="ghost"
                  onClick={() => {
                    onClose();
                    setCarrinho([]);
                  }}
                  className="bg-gray-200 dark:bg-gray-600 text-gray-700 dark:text-gray-300 hover:bg-gray-300 dark:hover:bg-gray-500"
                >
                  Cancelar
                </Button>
                {carrinho.length > 0 && (
                  <Button
                    variant="warning"
                    onClick={() => setCarrinho([])}
                    icon={<Trash2 size={18} />}
                    className="bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300 hover:bg-red-200 dark:hover:bg-red-900/50"
                  >
                    Limpar Carrinho
                  </Button>
                )}
              </div>
              
              {carrinho.length > 0 && (
                <Button
                  onClick={enviarParaCozinha}
                  variant="primary"
                  isLoading={loading}
                  icon={<Send size={18} />}
                  className="bg-gradient-to-r from-green-600 to-emerald-700 hover:from-green-700 hover:to-emerald-800 text-white px-8 py-3 font-semibold shadow-xl"
                >
                  Enviar para Cozinha
                </Button>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CarrinhoMesaModal;