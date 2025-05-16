import React, { useState, useEffect } from 'react';
import { ChefHat, Search } from 'lucide-react';
import { formatarDinheiro } from '../utils/formatters';
import { cardapioItems } from '../data/mockData';

const CardapioPublico: React.FC = () => {
  const [loading, setLoading] = useState(true);
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
              className="bg-white rounded-lg overflow-hidden shadow-md hover:shadow-lg transition-shadow transform hover:scale-[1.02] duration-300"
            >
              <div className="h-48 bg-cover bg-center" style={{
                backgroundImage: `url(${produto.imagem})`
              }} />
              <div className="p-6">
                <h3 className="font-serif text-xl text-[#4A4A4A] mb-2">{produto.nome}</h3>
                <p className="text-gray-600 text-sm mb-4">{produto.descricao}</p>
                <div className="flex items-center justify-between">
                  <p className="text-xl font-bold text-[#8B0000]">
                    {formatarDinheiro(produto.preco)}
                  </p>
                  {produto.disponivel ? (
                    <span className="text-xs bg-green-100 text-green-800 px-2 py-1 rounded-full">
                      Disponível
                    </span>
                  ) : (
                    <span className="text-xs bg-red-100 text-red-800 px-2 py-1 rounded-full">
                      Indisponível
                    </span>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      </main>
    </div>
  );
};

export default CardapioPublico;