import React, { useState, useEffect } from 'react';
import { X, Search, Plus, Minus, ShoppingCart, Send, Trash2, Package, AlertTriangle, Filter, Star, Coffee, Utensils, Wine, Sparkles, Eye, ChefHat } from 'lucide-react';
import Button from '../ui/Button';
import { useRestaurante } from '../../contexts/RestauranteContext';
import { formatarDinheiro } from '../../utils/formatters';
import toast from 'react-hot-toast';
import { Database } from '../../types/database';
import ThermalPrinterService from '../../services/ThermalPrinterService';

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
      setBusca('');
      setCategoriaSelecionada('todos');
    }
  }, [isOpen]);
  
  // Get unique categories
  const categorias = Array.from(new Set(produtos.map(produto => produto.categoria)));
  
  // Filter products
  const produtosFiltrados = produtos.filter(produto => {
    const matchBusca = produto.nome.toLowerCase().includes(busca.toLowerCase()) ||
                     produto.descricao?.toLowerCase().includes(busca.toLowerCase());
    const matchCategoria = categoriaSelecionada === 'todos' || produto.categoria === categoriaSelecionada;
    return matchBusca && matchCategoria && produto.disponivel;
  });

  const getCategoryIcon = (categoria: string) => {
    const icons: Record<string, React.ReactNode> = {
      'Entradas': <Coffee className="w-4 h-4" />,
      'Menu Principal': <Utensils className="w-4 h-4" />,
      'Pratos Principais': <Utensils className="w-4 h-4" />,
      'Sobremesas': <Star className="w-4 h-4" />,
      'Bebidas': <Coffee className="w-4 h-4" />,
      'Vinhos': <Wine className="w-4 h-4" />,
      'Lanches': <Coffee className="w-4 h-4" />,
      'Menu Kids': <Star className="w-4 h-4" />
    };
    return icons[categoria] || <Package className="w-4 h-4" />;
  };

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
    
    // Auto-switch to carrinho tab when item is added
    if (activeTab === 'produtos') {
      setTimeout(() => setActiveTab('carrinho'), 500);
    }
  };

  const removerDoCarrinho = (produtoId: string) => {
    setCarrinho(carrinho.filter(item => item.produto.id !== produtoId));
    toast.success('Item removido do carrinho');
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
      
      // Impressão automática da comanda na cozinha
      try {
        await ThermalPrinterService.printKitchenOrder(
          'ChefComanda', // Nome do restaurante - você pode pegar do contexto
          mesa?.numero || 0,
          carrinho.map(item => ({
            nome: item.produto.nome,
            quantidade: item.quantidade,
            observacao: item.observacao
          })),
          'Pedido enviado via sistema' // Observações gerais
        );
        console.log('✅ Comanda enviada para impressão na cozinha');
      } catch (printError) {
        console.warn('⚠️ Erro na impressão automática da cozinha:', printError);
        // Não falhar o envio por causa da impressão
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
        <div className="bg-white/95 dark:bg-gray-800/95 backdrop-blur-sm rounded-3xl shadow-2xl w-full max-w-7xl max-h-[95vh] overflow-hidden border border-white/20 dark:border-gray-700/50">
          {/* Header */}
          <div className="relative overflow-hidden">
            <div className="bg-gradient-to-r from-blue-600 via-blue-700 to-indigo-700 p-8">
              <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full -mr-16 -mt-16"></div>
              <div className="relative flex justify-between items-center">
                <div className="flex items-center">
                  <div className="p-4 bg-white/20 backdrop-blur-sm rounded-2xl mr-6">
                    <ChefHat size={32} className="text-white" />
                  </div>
                  <div className="text-white">
                    <h2 className="text-3xl font-bold">
                      Criar Pedido - Mesa {mesa.numero}
                    </h2>
                    <p className="text-blue-100 text-lg">
                      Selecione os produtos e envie para a cozinha
                    </p>
                  </div>
                </div>
                <div className="flex items-center space-x-4">
                  {carrinho.length > 0 && (
                    <div className="bg-white/20 backdrop-blur-sm px-6 py-3 rounded-2xl">
                      <span className="text-white font-bold text-lg">
                        {carrinho.length} {carrinho.length === 1 ? 'item' : 'itens'}
                      </span>
                    </div>
                  )}
                  <button
                    onClick={() => {
                      onClose();
                      setCarrinho([]);
                    }}
                    className="p-3 text-white/70 hover:text-white hover:bg-white/20 rounded-2xl transition-colors"
                  >
                    <X size={28} />
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* Tabs */}
          <div className="bg-gray-50/80 dark:bg-gray-700/80 border-b border-gray-200/50 dark:border-gray-600/50">
            <div className="flex">
              <button
                onClick={() => setActiveTab('produtos')}
                className={`flex-1 py-6 px-8 text-center font-bold text-lg transition-all duration-300 ${
                  activeTab === 'produtos'
                    ? 'bg-white dark:bg-gray-800 text-blue-600 dark:text-blue-400 border-b-4 border-blue-600 shadow-lg'
                    : 'text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200 hover:bg-white/50 dark:hover:bg-gray-700/50'
                }`}
              >
                <div className="flex items-center justify-center space-x-3">
                  <Package className="w-6 h-6" />
                  <span>Produtos</span>
                  <span className="text-sm bg-blue-100 dark:bg-blue-900/50 text-blue-800 dark:text-blue-200 px-3 py-1 rounded-full">
                    {produtosFiltrados.length}
                  </span>
                </div>
              </button>
              <button
                onClick={() => setActiveTab('carrinho')}
                className={`flex-1 py-6 px-8 text-center font-bold text-lg transition-all duration-300 relative ${
                  activeTab === 'carrinho'
                    ? 'bg-white dark:bg-gray-800 text-blue-600 dark:text-blue-400 border-b-4 border-blue-600 shadow-lg'
                    : 'text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200 hover:bg-white/50 dark:hover:bg-gray-700/50'
                }`}
              >
                <div className="flex items-center justify-center space-x-3">
                  <ShoppingCart className="w-6 h-6" />
                  <span>Carrinho</span>
                  {carrinho.length > 0 && (
                    <span className="bg-red-500 text-white text-sm rounded-full w-8 h-8 flex items-center justify-center font-bold shadow-lg animate-pulse">
                      {carrinho.length}
                    </span>
                  )}
                </div>
              </button>
            </div>
          </div>

          <div className="p-8 overflow-y-auto max-h-[calc(95vh-280px)]">
            {activeTab === 'produtos' ? (
              <div className="space-y-8">
                {/* Search and filters */}
                <div className="bg-white/90 dark:bg-gray-800/90 backdrop-blur-sm rounded-3xl shadow-xl border border-white/20 dark:border-gray-700/50 p-6">
                  <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
                    <div className="lg:col-span-2 relative">
                      <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 w-6 h-6" />
                      <input
                        type="text"
                        placeholder="Buscar produtos por nome ou descrição..."
                        value={busca}
                        onChange={(e) => setBusca(e.target.value)}
                        className="pl-12 w-full rounded-2xl border border-gray-200/50 dark:border-gray-600/50 py-4 px-6 bg-gray-50/50 dark:bg-gray-700/50 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-gray-900 dark:text-white text-lg placeholder-gray-500 dark:placeholder-gray-400 transition-all duration-200"
                      />
                    </div>
                    
                    <div className="lg:col-span-2">
                      <div className="flex flex-wrap gap-3">
                        <Button
                          variant={categoriaSelecionada === 'todos' ? 'primary' : 'ghost'}
                          onClick={() => setCategoriaSelecionada('todos')}
                          className="rounded-2xl px-6 py-3 font-semibold transition-all duration-200"
                        >
                          <Filter className="w-4 h-4 mr-2" />
                          Todas ({produtos.filter(p => p.disponivel).length})
                        </Button>
                        {categorias.map((categoria) => (
                          <Button
                            key={categoria}
                            variant={categoriaSelecionada === categoria ? 'primary' : 'ghost'}
                            onClick={() => setCategoriaSelecionada(categoria)}
                            className="rounded-2xl px-6 py-3 font-semibold transition-all duration-200"
                          >
                            <div className="flex items-center space-x-2">
                              {getCategoryIcon(categoria)}
                              <span>{categoria} ({produtos.filter(p => p.categoria === categoria && p.disponivel).length})</span>
                            </div>
                          </Button>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Product grid */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                  {produtosFiltrados.map((produto) => (
                    <div 
                      key={produto.id}
                      className="group bg-white/90 dark:bg-gray-800/90 backdrop-blur-sm rounded-3xl shadow-xl border border-white/20 dark:border-gray-700/50 overflow-hidden hover:shadow-2xl transition-all duration-300 hover:transform hover:scale-105"
                    >
                      {/* Product Image */}
                      <div className="relative h-48 overflow-hidden">
                        {produto.imagem_url ? (
                          <img
                            src={produto.imagem_url}
                            alt={produto.nome}
                            className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-300"
                          />
                        ) : (
                          <div className="w-full h-full bg-gradient-to-br from-gray-100 to-gray-200 dark:from-gray-700 dark:to-gray-600 flex items-center justify-center">
                            <Utensils className="w-16 h-16 text-gray-400 dark:text-gray-500" />
                          </div>
                        )}
                        <div className="absolute top-4 right-4 bg-white/95 dark:bg-gray-800/95 backdrop-blur-sm px-4 py-2 rounded-2xl shadow-lg">
                          <span className="text-lg font-bold text-blue-600 dark:text-blue-400">
                            {formatarDinheiro(produto.preco)}
                          </span>
                        </div>
                        <div className="absolute bottom-4 left-4 bg-white/95 dark:bg-gray-800/95 backdrop-blur-sm px-3 py-1 rounded-full">
                          <span className="text-xs font-bold text-gray-700 dark:text-gray-300">
                            {produto.categoria}
                          </span>
                        </div>
                      </div>

                      {/* Product Info */}
                      <div className="p-6">
                        <h3 className="font-bold text-xl text-gray-900 dark:text-white mb-3 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
                          {produto.nome}
                        </h3>
                        <p className="text-sm text-gray-600 dark:text-gray-400 mb-4 line-clamp-3 leading-relaxed">
                          {produto.descricao}
                        </p>
                        
                        <Button
                          onClick={() => adicionarAoCarrinho(produto)}
                          variant="primary"
                          fullWidth
                          icon={<Plus size={18} />}
                          className="bg-gradient-to-r from-blue-600 to-indigo-700 hover:from-blue-700 hover:to-indigo-800 text-white rounded-2xl py-4 font-semibold shadow-lg hover:shadow-xl transition-all duration-200 transform hover:scale-105"
                        >
                          Adicionar ao Carrinho
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>

                {produtosFiltrados.length === 0 && (
                  <div className="text-center py-16">
                    <div className="relative mb-8">
                      <div className="w-32 h-32 bg-gradient-to-br from-gray-100 to-gray-200 dark:from-gray-700 dark:to-gray-600 rounded-full mx-auto flex items-center justify-center shadow-2xl">
                        <Package className="w-16 h-16 text-gray-400 dark:text-gray-500" />
                      </div>
                      <div className="absolute -top-2 -right-2 w-8 h-8 bg-gradient-to-r from-blue-500 to-purple-600 rounded-full flex items-center justify-center shadow-lg transform translate-x-16">
                        <Sparkles className="w-4 h-4 text-white" />
                      </div>
                    </div>
                    <h3 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">
                      Nenhum produto encontrado
                    </h3>
                    <p className="text-lg text-gray-600 dark:text-gray-400 mb-8 max-w-md mx-auto">
                      Tente ajustar os filtros de busca ou categoria para encontrar o que procura
                    </p>
                  </div>
                )}
              </div>
            ) : (
              <div className="space-y-8">
                {carrinho.length === 0 ? (
                  <div className="text-center py-16">
                    <div className="relative mb-8">
                      <div className="w-32 h-32 bg-gradient-to-br from-gray-100 to-gray-200 dark:from-gray-700 dark:to-gray-600 rounded-full mx-auto flex items-center justify-center shadow-2xl">
                        <ShoppingCart className="w-16 h-16 text-gray-400 dark:text-gray-500" />
                      </div>
                      <div className="absolute -top-2 -right-2 w-8 h-8 bg-gradient-to-r from-blue-500 to-purple-600 rounded-full flex items-center justify-center shadow-lg transform translate-x-16">
                        <Sparkles className="w-4 h-4 text-white" />
                      </div>
                    </div>
                    <h3 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">
                      Carrinho vazio
                    </h3>
                    <p className="text-lg text-gray-600 dark:text-gray-400 mb-8 max-w-md mx-auto">
                      Adicione produtos na aba "Produtos" para criar o pedido da mesa
                    </p>
                    <Button
                      onClick={() => setActiveTab('produtos')}
                      variant="primary"
                      icon={<Package size={20} />}
                      className="bg-gradient-to-r from-blue-600 to-indigo-700 hover:from-blue-700 hover:to-indigo-800 text-white px-8 py-4 rounded-2xl font-semibold shadow-xl"
                    >
                      Escolher Produtos
                    </Button>
                  </div>
                ) : (
                  <div className="space-y-6">
                    {carrinho.map((item) => (
                      <div
                        key={item.produto.id}
                        className="bg-white/90 dark:bg-gray-800/90 backdrop-blur-sm rounded-3xl p-8 border border-white/20 dark:border-gray-700/50 shadow-xl hover:shadow-2xl transition-all duration-300"
                      >
                        <div className="flex justify-between items-start mb-6">
                          <div className="flex-1">
                            <div className="flex items-start space-x-4">
                              {item.produto.imagem_url && (
                                <img
                                  src={item.produto.imagem_url}
                                  alt={item.produto.nome}
                                  className="w-20 h-20 rounded-2xl object-cover shadow-lg"
                                />
                              )}
                              <div className="flex-1">
                                <h4 className="font-bold text-2xl text-gray-900 dark:text-white mb-2">
                                  {item.produto.nome}
                                </h4>
                                <p className="text-gray-600 dark:text-gray-400 mb-3 leading-relaxed">
                                  {item.produto.descricao}
                                </p>
                                <div className="flex items-center space-x-4">
                                  <span className="text-sm bg-blue-100 dark:bg-blue-900/50 text-blue-800 dark:text-blue-200 px-4 py-2 rounded-full font-semibold">
                                    {item.produto.categoria}
                                  </span>
                                  <span className="text-lg text-gray-600 dark:text-gray-400">
                                    {formatarDinheiro(item.produto.preco)} cada
                                  </span>
                                </div>
                              </div>
                            </div>
                          </div>
                          <button
                            onClick={() => removerDoCarrinho(item.produto.id)}
                            className="text-red-500 hover:text-red-700 p-3 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-2xl transition-all duration-200 hover:scale-110"
                          >
                            <Trash2 size={24} />
                          </button>
                        </div>

                        {/* Quantity controls */}
                        <div className="flex items-center justify-between mb-6">
                          <div className="flex items-center space-x-6">
                            <span className="text-lg font-bold text-gray-700 dark:text-gray-300">
                              Quantidade:
                            </span>
                            <div className="flex items-center space-x-4">
                              <button
                                onClick={() => alterarQuantidade(item.produto.id, item.quantidade - 1)}
                                className="w-12 h-12 rounded-full bg-gray-200 dark:bg-gray-600 flex items-center justify-center hover:bg-gray-300 dark:hover:bg-gray-500 transition-all duration-200 hover:scale-110 shadow-lg"
                              >
                                <Minus size={20} />
                              </button>
                              <span className="w-16 text-center font-bold text-2xl text-gray-900 dark:text-white">
                                {item.quantidade}
                              </span>
                              <button
                                onClick={() => alterarQuantidade(item.produto.id, item.quantidade + 1)}
                                className="w-12 h-12 rounded-full bg-gray-200 dark:bg-gray-600 flex items-center justify-center hover:bg-gray-300 dark:hover:bg-gray-500 transition-all duration-200 hover:scale-110 shadow-lg"
                              >
                                <Plus size={20} />
                              </button>
                            </div>
                          </div>
                          <div className="text-right">
                            <p className="text-sm text-gray-500 dark:text-gray-400 mb-1">Subtotal</p>
                            <p className="text-3xl font-bold text-blue-600 dark:text-blue-400">
                              {formatarDinheiro(item.produto.preco * item.quantidade)}
                            </p>
                          </div>
                        </div>

                        {/* Observations */}
                        <div>
                          <label className="block text-lg font-bold text-gray-700 dark:text-gray-300 mb-3">
                            Observações (opcional)
                          </label>
                          <textarea
                            value={item.observacao}
                            onChange={(e) => alterarObservacao(item.produto.id, e.target.value)}
                            placeholder="Ex: Sem cebola, molho à parte, bem passado, sem sal..."
                            className="w-full rounded-2xl border border-gray-200/50 dark:border-gray-600/50 py-4 px-6 bg-gray-50/50 dark:bg-gray-700/50 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-gray-900 dark:text-white resize-none text-lg placeholder-gray-500 dark:placeholder-gray-400 transition-all duration-200"
                            rows={3}
                          />
                        </div>
                      </div>
                    ))}

                    {/* Total */}
                    <div className="bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20 rounded-3xl p-8 border border-blue-200/50 dark:border-blue-700/50 shadow-xl">
                      <div className="flex justify-between items-center">
                        <div>
                          <p className="text-lg font-semibold text-blue-700 dark:text-blue-300 mb-2">
                            Total do Pedido
                          </p>
                          <p className="text-sm text-blue-600 dark:text-blue-400">
                            {carrinho.reduce((total, item) => total + item.quantidade, 0)} {carrinho.reduce((total, item) => total + item.quantidade, 0) === 1 ? 'item' : 'itens'} no carrinho
                          </p>
                        </div>
                        <div className="text-right">
                          <span className="text-4xl font-bold text-blue-600 dark:text-blue-400">
                            {formatarDinheiro(calcularTotal())}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="bg-gray-50/90 dark:bg-gray-700/90 backdrop-blur-sm px-8 py-6 border-t border-gray-200/50 dark:border-gray-600/50">
            <div className="flex justify-between items-center">
              <div className="flex space-x-4">
                <Button
                  variant="ghost"
                  onClick={() => {
                    onClose();
                    setCarrinho([]);
                  }}
                  className="bg-gray-200/80 dark:bg-gray-600/80 text-gray-700 dark:text-gray-300 hover:bg-gray-300 dark:hover:bg-gray-500 px-8 py-4 rounded-2xl font-semibold text-lg transition-all duration-200"
                >
                  Cancelar
                </Button>
                {carrinho.length > 0 && (
                  <Button
                    variant="warning"
                    onClick={() => setCarrinho([])}
                    icon={<Trash2 size={20} />}
                    className="bg-red-100/80 dark:bg-red-900/30 text-red-700 dark:text-red-300 hover:bg-red-200 dark:hover:bg-red-900/50 px-8 py-4 rounded-2xl font-semibold text-lg transition-all duration-200"
                  >
                    Limpar Carrinho
                  </Button>
                )}
              </div>
              
              {carrinho.length > 0 && (
                <div className="flex items-center space-x-6">
                  <div className="text-right">
                    <p className="text-sm text-gray-500 dark:text-gray-400">Total</p>
                    <p className="text-2xl font-bold text-gray-900 dark:text-white">
                      {formatarDinheiro(calcularTotal())}
                    </p>
                  </div>
                  <Button
                    onClick={enviarParaCozinha}
                    variant="primary"
                    isLoading={loading}
                    icon={<Send size={20} />}
                    className="bg-gradient-to-r from-green-600 to-emerald-700 hover:from-green-700 hover:to-emerald-800 text-white px-10 py-4 rounded-2xl font-bold text-lg shadow-xl hover:shadow-2xl transition-all duration-200 transform hover:scale-105"
                  >
                    Enviar para Cozinha
                  </Button>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CarrinhoMesaModal;