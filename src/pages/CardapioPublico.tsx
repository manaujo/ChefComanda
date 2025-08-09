import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { ChefHat, Search } from 'lucide-react';
import { formatarDinheiro } from '../utils/formatters';
import { supabase } from '../services/supabase';
import { CRUDService } from '../services/CRUDService';

interface CardapioItem {
  id: string;
  nome: string;
  descricao: string;
  preco: number;
  categoria: string;
  imagem_url: string;
  disponivel_online: boolean;
}

interface Categoria {
  id: string;
  nome: string;
  ativa: boolean;
}

const CardapioPublico: React.FC = () => {
  const { restauranteId } = useParams<{ restauranteId: string }>();
  const [cardapioItems, setCardapioItems] = useState<CardapioItem[]>([]);
  const [categorias, setCategorias] = useState<Categoria[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeCategory, setActiveCategory] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [restauranteNome, setRestauranteNome] = useState('');

  useEffect(() => {
    if (restauranteId) {
      loadCardapioData();
    }
  }, [restauranteId]);

  const loadCardapioData = async () => {
    try {
      setLoading(true);
      
      // Load restaurant info
      const { data: restaurante } = await supabase
        .from('restaurantes')
        .select('nome')
        .eq('id', restauranteId)
        .single();

      if (restaurante) {
        setRestauranteNome(restaurante.nome);
      }

      // Load cardapio items
      const { data: items } = await supabase
        .from('cardapio_online')
        .select('*')
        .eq('restaurante_id', restauranteId)
        .eq('ativo', true)
        .eq('disponivel_online', true)
        .order('ordem');

      if (items) {
        setCardapioItems(items);
        
        // Get unique categories from items
        const uniqueCategories = Array.from(new Set(items.map(item => item.categoria)));
        const categoriesData = uniqueCategories.map((cat, index) => ({
          id: `cat-${index}`,
          nome: cat,
          ativa: true
        }));
        
        setCategorias(categoriesData);
        
        // Set first category as active
        if (categoriesData.length > 0) {
          setActiveCategory(categoriesData[0].nome);
        }
      }
    } catch (error) {
      console.error('Error loading cardapio data:', error);
    } finally {
      setLoading(false);
    }
  };

  const menuSections = categorias.map(categoria => ({
    id: categoria.nome.toLowerCase().replace(/\s+/g, '-'),
    title: categoria.nome
  }));

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
            <h1 className="text-4xl md:text-5xl font-serif mb-4">
              {restauranteNome || 'Nosso Cardápio'}
            </h1>
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
              className="pl-10 w-full rounded-lg border border-gray-200 py-2 px-4 focus:ring-2 focus:ring-red-600 focus:border-red-600"
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
                    ? 'bg-red-700 text-white'
                    : 'text-gray-600 hover:text-red-600'
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
                  <p className="text-xl font-bold text-red-700">
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
          
          {filteredProducts.length === 0 && (
            <div className="col-span-full text-center py-12">
              <p className="text-gray-500">
                {searchTerm 
                  ? 'Nenhum produto encontrado para sua busca'
                  : 'Nenhum produto disponível nesta categoria'
                }
              </p>
            </div>
          )}
        </div>
      </main>
    </div>
  );
};

export default CardapioPublico;