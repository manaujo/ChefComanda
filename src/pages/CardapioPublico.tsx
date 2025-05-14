import React, { useState, useEffect } from 'react';
import { ChefHat, ShoppingBag, X, Plus, Minus, Search } from 'lucide-react';
import { formatarDinheiro } from '../utils/formatters';
import Button from '../components/ui/Button';
import toast from 'react-hot-toast';
import { cardapioItems } from '../data/mockData';

interface CartItem {
  id: number;
  nome: string;
  quantidade: number;
  preco: number;
  observacao?: string;
}

const CardapioPublico: React.FC = () => {
  const [loading, setLoading] = useState(true);
  const [cartItems, setCartItems] = useState<CartItem[]>([]);
  const [showCart, setShowCart] = useState(false);
  const [showProductModal, setShowProductModal] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState<(typeof cardapioItems)[0] | null>(null);
  const [quantidade, setQuantidade] = useState(1);
  const [observacao, setObservacao] = useState('');
  const [activeCategory, setActiveCategory] = useState('Menu Principal');
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    setTimeout(() => setLoading(false), 1000);
  }, []);

  const menuSections = [
    { id: 'menu-principal', title: 'Menu Principal' },
    { id: 'menu-kids', title: 'Menu Kids' },
    { id: 'entradas', title: 'Entradas' },
    { id: 'bebidas', title: 'Bebidas' },
    { id: 'sobremesas', title: 'Sobremesas' }
  ];

  const filteredProducts = cardapioItems.filter(produto => {
    const matchSearch = produto.nome.toLowerCase().includes(searchTerm.toLowerCase()) ||
                       produto.descricao.toLowerCase().includes(searchTerm.toLowerCase());
    const matchCategory = produto.categoria === activeCategory;
    return matchSearch && matchCategory;
  });

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

  const totalValue = cartItems.reduce((sum, item) => sum + (item.preco * item.quantidade), 0);

  if (loading) {
    return (
      <div className="min-h-screen bg-[#FAF7F2] flex items-center justify-center">
        <div className="text-center">
          <ChefHat className="w-12 h-12 mx-auto mb-4 text-[#8B0000] animate-bounce" />
          <p className="text-[#4A4A4A]">Carregando cardápio...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#FAF7F2]">
      {/* Header */}
      <header className="fixed top-0 left-0 right-0 z-50 bg-white shadow-md">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="h-16 flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <ChefHat className="h-8 w-8 text-[#8B0000]" />
              <span className="text-xl font-serif text-[#4A4A4A]">
                Cardápio Online
              </span>
            </div>
            <button
              onClick={() => setShowCart(true)}
              className="relative p-2 text-[#8B0000] hover:text-[#6B0000] transition-colors"
            >
              <ShoppingBag size={24} />
              {cartItems.length > 0 && (
                <span className="absolute -top-1 -right-1 bg-[#8B0000] text-white text-xs w-5 h-5 flex items-center justify-center rounded-full">
                  {cartItems.length}
                </span>
              )}
            </button>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <div className="relative h-[40vh] bg-cover bg-center" style={{ 
        backgroundImage: 'url(https://images.pexels.com/photos/958545/pexels-photo-958545.jpeg)'
      }}>
        <div className="absolute inset-0 bg-black bg-opacity-50 flex items-center justify-center">
          <div className="text-center text-white">
            <h1 className="text-4xl md:text-5xl font-serif mb-4">Nosso Cardápio</h1>
            <p className="text-xl opacity-90 font-light">Sabores únicos e inesquecíveis</p>
          </div>
        </div>
      </div>

      {/* Search Bar */}
      <div className="sticky top-16 bg-white shadow-md z-40 py-4">
        <div className="max-w-7xl mx-auto px-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
            <input
              type="text"
              placeholder="Buscar no cardápio..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10 w-full rounded-lg border border-gray-200 py-2 px-4 focus:ring-2 focus:ring-[#8B0000] focus:border-[#8B0000]"
            />
          </div>
        </div>
      </div>

      {/* Navigation */}
      <nav className="sticky top-32 bg-white shadow-sm z-30">
        <div className="max-w-7xl mx-auto px-4">
          <div className="flex overflow-x-auto py-4 space-x-8 no-scrollbar">
            {menuSections.map((section) => (
              <button
                key={section.id}
                onClick={() => setActiveCategory(section.title)}
                className={`whitespace-nowrap text-sm font-medium px-3 py-2 rounded-full transition-colors ${
                  activeCategory === section.title
                    ? 'bg-[#8B0000] text-white'
                    : 'text-gray-600 hover:text-[#8B0000]'
                }`}
              >
                {section.title}
              </button>
            ))}
          </div>
        </div>
      </nav>

      {/* Menu Content */}
      <main className="max-w-7xl mx-auto px-4 py-8">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {filteredProducts.map((produto) => (
            <div
              key={produto.id}
              onClick={() => {
                setSelectedProduct(produto);
                setShowProductModal(true);
              }}
              className="bg-white rounded-lg overflow-hidden shadow-md hover:shadow-lg transition-shadow cursor-pointer transform hover:scale-[1.02] duration-300"
            >
              <div className="h-48 bg-cover bg-center" style={{
                backgroundImage: `url(${produto.imagem})`
              }} />
              <div className="p-4">
                <h3 className="font-serif text-xl text-[#4A4A4A]">{produto.nome}</h3>
                <p className="mt-2 text-gray-600 text-sm line-clamp-2">{produto.descricao}</p>
                <p className="mt-4 text-xl font-bold text-[#8B0000]">
                  {formatarDinheiro(produto.preco)}
                </p>
              </div>
            </div>
          ))}
        </div>
      </main>

      {/* Product Modal */}
      {showProductModal && selectedProduct && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-black bg-opacity-50 flex items-center justify-center">
          <div className="relative bg-white w-full max-w-2xl mx-4 rounded-lg shadow-xl">
            <button
              onClick={() => {
                setShowProductModal(false);
                setSelectedProduct(null);
                setQuantidade(1);
                setObservacao('');
              }}
              className="absolute top-4 right-4 z-10 p-2 bg-white rounded-full shadow-md text-gray-500 hover:text-gray-700"
            >
              <X size={20} />
            </button>

            <div className="h-64 bg-cover bg-center" style={{
              backgroundImage: `url(${selectedProduct.imagem})`
            }} />

            <div className="p-6">
              <h2 className="text-2xl font-serif text-[#4A4A4A]">{selectedProduct.nome}</h2>
              <p className="mt-2 text-gray-600">{selectedProduct.descricao}</p>
              <p className="mt-4 text-2xl font-bold text-[#8B0000]">
                {formatarDinheiro(selectedProduct.preco)}
              </p>

              <div className="mt-6 space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Quantidade
                  </label>
                  <div className="flex items-center space-x-4">
                    <button
                      onClick={() => setQuantidade(Math.max(1, quantidade - 1))}
                      className="p-2 border rounded-full hover:bg-gray-100"
                    >
                      <Minus size={16} />
                    </button>
                    <span className="text-lg font-medium w-8 text-center">
                      {quantidade}
                    </span>
                    <button
                      onClick={() => setQuantidade(quantidade + 1)}
                      className="p-2 border rounded-full hover:bg-gray-100"
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
                    className="w-full border border-gray-300 rounded-md shadow-sm p-2 focus:ring-[#8B0000] focus:border-[#8B0000]"
                    placeholder="Ex: Sem cebola, molho à parte..."
                  />
                </div>

                <Button
                  variant="primary"
                  fullWidth
                  onClick={addToCart}
                  className="bg-[#8B0000] hover:bg-[#6B0000]"
                >
                  Adicionar ao Carrinho • {formatarDinheiro(selectedProduct.preco * quantidade)}
                </Button>
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
              <h2 className="text-lg font-medium text-[#4A4A4A]">Seu Pedido</h2>
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
                      <h4 className="font-medium text-[#4A4A4A]">{item.nome}</h4>
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
                <span className="font-medium text-[#4A4A4A]">Total</span>
                <span className="text-xl font-bold text-[#8B0000]">
                  {formatarDinheiro(totalValue)}
                </span>
              </div>
              <Button
                variant="primary"
                fullWidth
                className="bg-[#8B0000] hover:bg-[#6B0000]"
                onClick={() => {
                  toast.success('Pedido enviado com sucesso!');
                  setCartItems([]);
                  setShowCart(false);
                }}
              >
                Finalizar Pedido
              </Button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default CardapioPublico;