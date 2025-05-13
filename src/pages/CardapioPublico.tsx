import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { ChefHat, Coffee, ShoppingBag, Plus, Minus, X, ArrowRight } from 'lucide-react';
import { useRestaurante } from '../contexts/RestauranteContext';
import { formatarDinheiro } from '../utils/formatters';
import Button from '../components/ui/Button';
import toast from 'react-hot-toast';

interface CartItem {
  id: number;
  nome: string;
  quantidade: number;
  preco: number;
  observacao?: string;
}

interface OrderFormData {
  nome: string;
  mesa?: string;
}

const CardapioPublico: React.FC = () => {
  const { produtos, categorias } = useRestaurante();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [categoriaSelecionada, setCategoriaSelecionada] = useState<string>('todos');
  const [cartItems, setCartItems] = useState<CartItem[]>([]);
  const [showCart, setShowCart] = useState(false);
  const [showOrderForm, setShowOrderForm] = useState(false);
  const [orderData, setOrderData] = useState<OrderFormData>({
    nome: '',
    mesa: ''
  });

  useEffect(() => {
    setTimeout(() => setLoading(false), 1000);
  }, []);

  const addToCart = (produto: Produto) => {
    setCartItems(prev => {
      const existingItem = prev.find(item => item.id === produto.id);
      if (existingItem) {
        return prev.map(item =>
          item.id === produto.id
            ? { ...item, quantidade: item.quantidade + 1 }
            : item
        );
      }
      return [...prev, { id: produto.id, nome: produto.nome, quantidade: 1, preco: produto.preco }];
    });
    toast.success('Item adicionado ao carrinho!');
  };

  const updateQuantity = (id: number, delta: number) => {
    setCartItems(prev => {
      const newItems = prev.map(item => {
        if (item.id === id) {
          const newQuantity = item.quantidade + delta;
          return newQuantity > 0 ? { ...item, quantidade: newQuantity } : null;
        }
        return item;
      }).filter((item): item is CartItem => item !== null);
      return newItems;
    });
  };

  const handleSubmitOrder = async () => {
    try {
      // Here you would integrate with your order processing system
      toast.success('Pedido enviado com sucesso!');
      setCartItems([]);
      setShowOrderForm(false);
      setShowCart(false);
    } catch (error) {
      toast.error('Erro ao enviar pedido');
    }
  };

  const totalValue = cartItems.reduce((sum, item) => sum + (item.preco * item.quantidade), 0);

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <Coffee className="w-12 h-12 mx-auto mb-4 text-blue-500 animate-spin" />
          <p className="text-gray-600">Carregando cardápio...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="text-center max-w-md">
          <ChefHat className="w-16 h-16 mx-auto mb-4 text-gray-400" />
          <h2 className="text-xl font-bold text-gray-900 mb-2">
            Cardápio Indisponível
          </h2>
          <p className="text-gray-600">{error}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white shadow-sm sticky top-0 z-10">
        <div className="max-w-4xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <ChefHat className="h-8 w-8 text-blue-600" />
              <div>
                <h1 className="text-xl font-bold text-gray-900">
                  Chef Comanda
                </h1>
                <p className="text-sm text-gray-500">
                  Cardápio Digital
                </p>
              </div>
            </div>
            <button
              onClick={() => setShowCart(true)}
              className="relative p-2 text-gray-500 hover:text-gray-700"
            >
              <ShoppingBag size={24} />
              {cartItems.length > 0 && (
                <span className="absolute -top-1 -right-1 bg-blue-600 text-white text-xs w-5 h-5 flex items-center justify-center rounded-full">
                  {cartItems.length}
                </span>
              )}
            </button>
          </div>
        </div>
      </div>

      {/* Categories */}
      <div className="bg-white shadow-sm mb-6">
        <div className="max-w-4xl mx-auto px-4 py-3 overflow-x-auto">
          <div className="flex space-x-2">
            <button
              onClick={() => setCategoriaSelecionada('todos')}
              className={`px-4 py-2 rounded-full text-sm font-medium transition-colors ${
                categoriaSelecionada === 'todos'
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              Todos
            </button>
            {categorias.map((categoria) => (
              <button
                key={categoria}
                onClick={() => setCategoriaSelecionada(categoria)}
                className={`px-4 py-2 rounded-full text-sm font-medium whitespace-nowrap transition-colors ${
                  categoriaSelecionada === categoria
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                {categoria}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Products */}
      <div className="max-w-4xl mx-auto px-4 pb-24">
        <div className="grid gap-6">
          {categorias.map((categoria) => {
            const produtosDaCategoria = produtos.filter(
              p => (categoriaSelecionada === 'todos' || p.categoria === categoriaSelecionada) &&
                   p.categoria === categoria &&
                   p.disponivel
            );

            if (produtosDaCategoria.length === 0) return null;

            return (
              <div key={categoria}>
                <h2 className="text-2xl font-bold text-gray-900 mb-4">
                  {categoria}
                </h2>
                <div className="grid gap-4">
                  {produtosDaCategoria.map((produto) => (
                    <div
                      key={produto.id}
                      className="bg-white rounded-lg shadow-sm p-4 flex justify-between items-center"
                    >
                      <div className="flex-1">
                        <h3 className="text-lg font-medium text-gray-900">
                          {produto.nome}
                        </h3>
                        <p className="text-sm text-gray-500 mt-1">
                          {produto.descricao}
                        </p>
                        <p className="text-lg font-medium text-blue-600 mt-2">
                          {formatarDinheiro(produto.preco)}
                        </p>
                      </div>
                      <Button
                        variant="primary"
                        size="sm"
                        onClick={() => addToCart(produto)}
                        icon={<Plus size={16} />}
                      >
                        Adicionar
                      </Button>
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Cart Sidebar */}
      <div
        className={`fixed inset-y-0 right-0 w-full sm:w-96 bg-white shadow-xl transform transition-transform ${
          showCart ? 'translate-x-0' : 'translate-x-full'
        } z-50`}
      >
        <div className="h-full flex flex-col">
          <div className="p-4 border-b">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-medium">Seu Pedido</h2>
              <button
                onClick={() => setShowCart(false)}
                className="p-2 text-gray-500 hover:text-gray-700"
              >
                <X size={20} />
              </button>
            </div>
          </div>

          <div className="flex-1 overflow-y-auto p-4">
            {cartItems.length === 0 ? (
              <div className="text-center py-8">
                <ShoppingBag size={48} className="mx-auto text-gray-300 mb-4" />
                <p className="text-gray-500">Seu carrinho está vazio</p>
              </div>
            ) : (
              <div className="space-y-4">
                {cartItems.map((item) => (
                  <div key={item.id} className="flex items-center justify-between">
                    <div className="flex-1">
                      <h4 className="font-medium">{item.nome}</h4>
                      <p className="text-sm text-gray-500">
                        {formatarDinheiro(item.preco)}
                      </p>
                    </div>
                    <div className="flex items-center space-x-2">
                      <button
                        onClick={() => updateQuantity(item.id, -1)}
                        className="p-1 text-gray-500 hover:text-gray-700"
                      >
                        <Minus size={16} />
                      </button>
                      <span className="w-8 text-center">{item.quantidade}</span>
                      <button
                        onClick={() => updateQuantity(item.id, 1)}
                        className="p-1 text-gray-500 hover:text-gray-700"
                      >
                        <Plus size={16} />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {cartItems.length > 0 && (
            <div className="p-4 border-t">
              <div className="flex justify-between items-center mb-4">
                <span className="font-medium">Total</span>
                <span className="text-xl font-bold">
                  {formatarDinheiro(totalValue)}
                </span>
              </div>
              <Button
                variant="primary"
                fullWidth
                onClick={() => setShowOrderForm(true)}
                icon={<ArrowRight size={18} />}
              >
                Finalizar Pedido
              </Button>
            </div>
          )}
        </div>
      </div>

      {/* Order Form Modal */}
      {showOrderForm && (
        <div className="fixed inset-0 z-50 overflow-y-auto">
          <div className="flex items-center justify-center min-h-screen px-4 pt-4 pb-20 text-center sm:block sm:p-0">
            <div className="fixed inset-0 transition-opacity" aria-hidden="true">
              <div className="absolute inset-0 bg-gray-500 opacity-75"></div>
            </div>

            <div className="inline-block align-bottom bg-white rounded-lg text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-lg sm:w-full">
              <div className="bg-white px-4 pt-5 pb-4 sm:p-6 sm:pb-4">
                <h3 className="text-lg font-medium mb-4">
                  Finalizar Pedido
                </h3>

                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700">
                      Seu Nome (opcional)
                    </label>
                    <input
                      type="text"
                      value={orderData.nome}
                      onChange={(e) => setOrderData({ ...orderData, nome: e.target.value })}
                      className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:ring-blue-500 focus:border-blue-500"
                      placeholder="Como podemos te chamar?"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700">
                      Número da Mesa (opcional)
                    </label>
                    <input
                      type="text"
                      value={orderData.mesa}
                      onChange={(e) => setOrderData({ ...orderData, mesa: e.target.value })}
                      className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:ring-blue-500 focus:border-blue-500"
                      placeholder="Ex: 15"
                    />
                  </div>

                  <div className="bg-gray-50 p-4 rounded-lg">
                    <h4 className="font-medium mb-2">Resumo do Pedido</h4>
                    <div className="space-y-2">
                      {cartItems.map((item) => (
                        <div key={item.id} className="flex justify-between text-sm">
                          <span>{item.quantidade}x {item.nome}</span>
                          <span>{formatarDinheiro(item.preco * item.quantidade)}</span>
                        </div>
                      ))}
                      <div className="pt-2 border-t border-gray-200 font-medium">
                        <div className="flex justify-between">
                          <span>Total</span>
                          <span>{formatarDinheiro(totalValue)}</span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              <div className="bg-gray-50 px-4 py-3 sm:px-6 sm:flex sm:flex-row-reverse">
                <Button
                  variant="primary"
                  onClick={handleSubmitOrder}
                  className="w-full sm:w-auto sm:ml-3"
                >
                  Confirmar Pedido
                </Button>
                <Button
                  variant="ghost"
                  onClick={() => setShowOrderForm(false)}
                  className="w-full sm:w-auto mt-3 sm:mt-0"
                >
                  Voltar
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default CardapioPublico;