import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { ShoppingBag, ChefHat, X, Plus, Minus } from 'lucide-react';
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
  const [cartItems, setCartItems] = useState<CartItem[]>([]);
  const [showCart, setShowCart] = useState(false);
  const [showOrderForm, setShowOrderForm] = useState(false);
  const [showProductModal, setShowProductModal] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState<Produto | null>(null);
  const [quantidade, setQuantidade] = useState(1);
  const [observacao, setObservacao] = useState('');
  const [orderData, setOrderData] = useState<OrderFormData>({
    nome: '',
    mesa: ''
  });

  useEffect(() => {
    setTimeout(() => setLoading(false), 1000);
  }, []);

  const menuSections = [
    { id: 'principais', title: 'Menu Principal', categories: ['Carnes', 'Massas', 'Frutos do Mar'] },
    { id: 'kids', title: 'Menu Kids', categories: ['Kids'] },
    { id: 'entradas', title: 'Entradas', categories: ['Entradas', 'Petiscos'] },
    { id: 'bebidas', title: 'Bebidas', categories: ['Bebidas', 'Drinks'] },
    { id: 'sobremesas', title: 'Sobremesas', categories: ['Sobremesas'] }
  ];

  const addToCart = () => {
    if (!selectedProduct) return;
    
    setCartItems(prev => {
      const existingItem = prev.find(item => item.id === selectedProduct.id);
      if (existingItem) {
        return prev.map(item =>
          item.id === selectedProduct.id
            ? { ...item, quantidade: item.quantidade + quantidade }
            : item
        );
      }
      return [...prev, {
        id: selectedProduct.id,
        nome: selectedProduct.nome,
        quantidade,
        preco: selectedProduct.preco,
        observacao
      }];
    });
    
    toast.success('Item adicionado ao carrinho!');
    setShowProductModal(false);
    setQuantidade(1);
    setObservacao('');
    setSelectedProduct(null);
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
      <div className="min-h-screen bg-neutral-50 flex items-center justify-center">
        <div className="text-center">
          <ChefHat className="w-12 h-12 mx-auto mb-4 text-red-800 animate-bounce" />
          <p className="text-gray-600">Carregando cardápio...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-neutral-50">
      {/* Header */}
      <header className="fixed top-0 left-0 right-0 z-50 bg-white shadow-md">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="h-16 flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <ChefHat className="h-8 w-8 text-red-800" />
              <span className="text-xl font-bold text-gray-900">
                Chef Comanda
              </span>
            </div>
            <button
              onClick={() => setShowCart(true)}
              className="relative p-2 text-gray-600 hover:text-gray-800"
            >
              <ShoppingBag size={24} />
              {cartItems.length > 0 && (
                <span className="absolute -top-1 -right-1 bg-red-800 text-white text-xs w-5 h-5 flex items-center justify-center rounded-full">
                  {cartItems.length}
                </span>
              )}
            </button>
          </div>
        </div>
      </header>

      <main className="pt-16">
        {/* Hero Section */}
        <div className="relative h-96 bg-cover bg-center" style={{ backgroundImage: 'url(https://images.pexels.com/photos/1267320/pexels-photo-1267320.jpeg?auto=compress&cs=tinysrgb&w=1260&h=750&dpr=2)' }}>
          <div className="absolute inset-0 bg-black bg-opacity-50 flex items-center justify-center">
            <div className="text-center text-white">
              <h1 className="text-4xl md:text-5xl font-bold mb-4">Nosso Cardápio</h1>
              <p className="text-xl opacity-90">Descubra sabores únicos e inesquecíveis</p>
            </div>
          </div>
        </div>

        {/* Menu Sections */}
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
          {menuSections.map((section) => {
            const sectionProducts = produtos.filter(p => 
              section.categories.includes(p.categoria) && p.disponivel
            );

            if (sectionProducts.length === 0) return null;

            return (
              <section key={section.id} className="mb-16" id={section.id}>
                <h2 className="text-3xl font-bold text-gray-900 mb-8 text-center">
                  {section.title}
                </h2>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                  {sectionProducts.map((produto) => (
                    <div
                      key={produto.id}
                      onClick={() => {
                        setSelectedProduct(produto);
                        setShowProductModal(true);
                      }}
                      className="bg-white rounded-lg shadow-md overflow-hidden cursor-pointer transform transition-transform hover:scale-105"
                    >
                      <div className="h-48 bg-cover bg-center" style={{
                        backgroundImage: `url(https://images.pexels.com/photos/675951/pexels-photo-675951.jpeg?auto=compress&cs=tinysrgb&w=1260&h=750&dpr=2)`
                      }} />
                      <div className="p-4">
                        <h3 className="text-xl font-semibold text-gray-900 mb-2">
                          {produto.nome}
                        </h3>
                        <p className="text-gray-600 text-sm mb-3 line-clamp-2">
                          {produto.descricao}
                        </p>
                        <p className="text-xl font-bold text-red-800">
                          {formatarDinheiro(produto.preco)}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </section>
            );
          })}
        </div>
      </main>

      {/* Product Modal */}
      {showProductModal && selectedProduct && (
        <div className="fixed inset-0 z-50 overflow-y-auto">
          <div className="flex items-center justify-center min-h-screen px-4 pt-4 pb-20 text-center sm:block sm:p-0">
            <div className="fixed inset-0 transition-opacity" aria-hidden="true">
              <div className="absolute inset-0 bg-gray-500 opacity-75"></div>
            </div>

            <div className="inline-block align-bottom bg-white rounded-lg text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-2xl sm:w-full">
              <div className="relative">
                <button
                  onClick={() => {
                    setShowProductModal(false);
                    setSelectedProduct(null);
                    setQuantidade(1);
                    setObservacao('');
                  }}
                  className="absolute top-4 right-4 z-10 p-2 bg-white rounded-full shadow-md"
                >
                  <X size={20} />
                </button>
                <div className="h-64 bg-cover bg-center" style={{
                  backgroundImage: `url(https://images.pexels.com/photos/675951/pexels-photo-675951.jpeg?auto=compress&cs=tinysrgb&w=1260&h=750&dpr=2)`
                }} />
              </div>

              <div className="p-6">
                <h3 className="text-2xl font-bold text-gray-900 mb-2">
                  {selectedProduct.nome}
                </h3>
                <p className="text-gray-600 mb-4">
                  {selectedProduct.descricao}
                </p>
                <p className="text-2xl font-bold text-red-800 mb-6">
                  {formatarDinheiro(selectedProduct.preco)}
                </p>

                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Quantidade
                    </label>
                    <div className="flex items-center space-x-4">
                      <button
                        onClick={() => setQuantidade(Math.max(1, quantidade - 1))}
                        className="p-2 border rounded-full"
                      >
                        <Minus size={16} />
                      </button>
                      <span className="text-lg font-medium w-8 text-center">
                        {quantidade}
                      </span>
                      <button
                        onClick={() => setQuantidade(quantidade + 1)}
                        className="p-2 border rounded-full"
                      >
                        <Plus size={16} />
                      </button>
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Observações
                    </label>
                    <textarea
                      value={observacao}
                      onChange={(e) => setObservacao(e.target.value)}
                      rows={3}
                      className="w-full border border-gray-300 rounded-md shadow-sm p-2"
                      placeholder="Ex: Sem cebola, molho à parte..."
                    />
                  </div>

                  <Button
                    variant="primary"
                    fullWidth
                    onClick={addToCart}
                    className="bg-red-800 hover:bg-red-900"
                  >
                    Adicionar ao Carrinho • {formatarDinheiro(selectedProduct.preco * quantidade)}
                  </Button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

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
                      {item.observacao && (
                        <p className="text-sm text-gray-500">{item.observacao}</p>
                      )}
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
                className="bg-red-800 hover:bg-red-900"
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
                      Seu Nome
                    </label>
                    <input
                      type="text"
                      value={orderData.nome}
                      onChange={(e) => setOrderData({ ...orderData, nome: e.target.value })}
                      className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:ring-red-800 focus:border-red-800"
                      placeholder="Como podemos te chamar?"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700">
                      Número da Mesa
                    </label>
                    <input
                      type="text"
                      value={orderData.mesa}
                      onChange={(e) => setOrderData({ ...orderData, mesa: e.target.value })}
                      className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:ring-red-800 focus:border-red-800"
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
                  className="w-full sm:w-auto sm:ml-3 bg-red-800 hover:bg-red-900"
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