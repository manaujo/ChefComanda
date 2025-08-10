import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { 
  ChefHat, Clock, Star, MapPin, Phone, Instagram, 
  Search, Filter, ShoppingCart, Plus, Minus, X,
  Utensils, Coffee, Cake, Wine, Soup
} from 'lucide-react';
import { supabase } from '../services/supabase';
import { formatarDinheiro } from '../utils/formatters';
import Button from '../components/ui/Button';
import toast from 'react-hot-toast';

interface CardapioItem {
  id: string;
  nome: string;
  descricao: string;
  preco: number;
  categoria: string;
  imagem_url: string;
  ordem: number;
  ativo: boolean;
  disponivel_online: boolean;
}

interface Restaurante {
  id: string;
  nome: string;
  telefone: string;
  configuracoes?: {
    nome_exibicao?: string;
    tempo_entrega?: string;
    whatsapp?: string;
    endereco?: string;
    horario_funcionamento?: string;
  };
}

interface ItemCarrinho {
  item: CardapioItem;
  quantidade: number;
  observacao?: string;
}

const CardapioPublico: React.FC = () => {
  const { restauranteId } = useParams<{ restauranteId: string }>();
  const [restaurante, setRestaurante] = useState<Restaurante | null>(null);
  const [items, setItems] = useState<CardapioItem[]>([]);
  const [categorias, setCategorias] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [categoriaSelecionada, setCategoriaSelecionada] = useState('todas');
  const [busca, setBusca] = useState('');
  const [carrinho, setCarrinho] = useState<ItemCarrinho[]>([]);
  const [showCarrinho, setShowCarrinho] = useState(false);
  const [itemSelecionado, setItemSelecionado] = useState<CardapioItem | null>(null);
  const [observacao, setObservacao] = useState('');

  useEffect(() => {
    if (restauranteId) {
      loadRestauranteData();
      loadCardapioItems();
    }
  }, [restauranteId]);

  const loadRestauranteData = async () => {
    try {
      const { data, error } = await supabase
        .from('restaurantes')
        .select('id, nome, telefone, configuracoes')
        .eq('id', restauranteId)
        .single();

      if (error) throw error;
      setRestaurante(data);
    } catch (error) {
      console.error('Error loading restaurant data:', error);
      toast.error('Restaurante não encontrado');
    }
  };

  const loadCardapioItems = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('cardapio_online')
        .select('*')
        .eq('restaurante_id', restauranteId)
        .eq('ativo', true)
        .eq('disponivel_online', true)
        .order('ordem');

      if (error) throw error;

      setItems(data || []);
      
      // Extract unique categories
      const uniqueCategories = Array.from(new Set((data || []).map(item => item.categoria)));
      setCategorias(uniqueCategories);
    } catch (error) {
      console.error('Error loading cardapio items:', error);
      toast.error('Erro ao carregar cardápio');
    } finally {
      setLoading(false);
    }
  };

  const filteredItems = items.filter(item => {
    const matchBusca = item.nome.toLowerCase().includes(busca.toLowerCase()) ||
                      item.descricao.toLowerCase().includes(busca.toLowerCase());
    const matchCategoria = categoriaSelecionada === 'todas' || item.categoria === categoriaSelecionada;
    return matchBusca && matchCategoria;
  });

  const adicionarAoCarrinho = (item: CardapioItem, quantidade: number = 1) => {
    const itemExistente = carrinho.find(c => c.item.id === item.id);
    
    if (itemExistente) {
      setCarrinho(carrinho.map(c => 
        c.item.id === item.id 
          ? { ...c, quantidade: c.quantidade + quantidade, observacao: observacao || c.observacao }
          : c
      ));
    } else {
      setCarrinho([...carrinho, { item, quantidade, observacao: observacao || undefined }]);
    }
    
    setItemSelecionado(null);
    setObservacao('');
    toast.success(`${item.nome} adicionado ao carrinho!`);
  };

  const removerDoCarrinho = (itemId: string) => {
    setCarrinho(carrinho.filter(c => c.item.id !== itemId));
  };

  const alterarQuantidade = (itemId: string, novaQuantidade: number) => {
    if (novaQuantidade <= 0) {
      removerDoCarrinho(itemId);
      return;
    }

    setCarrinho(carrinho.map(c => 
      c.item.id === itemId ? { ...c, quantidade: novaQuantidade } : c
    ));
  };

  const calcularTotal = () => {
    return carrinho.reduce((total, c) => total + (c.item.preco * c.quantidade), 0);
  };

  const getCategoryIcon = (categoria: string) => {
    const icons: Record<string, React.ReactNode> = {
      'Entradas': <Soup className="w-5 h-5" />,
      'Pratos Principais': <Utensils className="w-5 h-5" />,
      'Menu Principal': <Utensils className="w-5 h-5" />,
      'Sobremesas': <Cake className="w-5 h-5" />,
      'Bebidas': <Coffee className="w-5 h-5" />,
      'Vinhos': <Wine className="w-5 h-5" />,
      'Lanches': <Coffee className="w-5 h-5" />,
      'Menu Kids': <Star className="w-5 h-5" />
    };
    return icons[categoria] || <Utensils className="w-5 h-5" />;
  };

  const finalizarPedido = () => {
    if (carrinho.length === 0) {
      toast.error('Adicione itens ao carrinho primeiro');
      return;
    }

    // Simular envio do pedido
    const pedidoTexto = carrinho.map(c => 
      `${c.quantidade}x ${c.item.nome}${c.observacao ? ` (${c.observacao})` : ''} - ${formatarDinheiro(c.item.preco * c.quantidade)}`
    ).join('\n');
    
    const total = calcularTotal();
    const mensagem = `🍽️ *Novo Pedido - ${restaurante?.nome}*\n\n${pedidoTexto}\n\n*Total: ${formatarDinheiro(total)}*\n\nPor favor, confirme o pedido e informe o tempo de preparo.`;
    
    const whatsappNumber = restaurante?.configuracoes?.whatsapp || restaurante?.telefone || '';
    const whatsappUrl = `https://wa.me/${whatsappNumber.replace(/\D/g, '')}?text=${encodeURIComponent(mensagem)}`;
    window.open(whatsappUrl, '_blank');
    
    toast.success('Pedido enviado via WhatsApp!');
    setCarrinho([]);
    setShowCarrinho(false);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-t-4 border-red-500 mx-auto mb-4"></div>
          <p className="text-gray-600">Carregando cardápio...</p>
        </div>
      </div>
    );
  }

  if (!restaurante) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <ChefHat className="w-16 h-16 text-gray-400 mx-auto mb-4" />
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Restaurante não encontrado</h1>
          <p className="text-gray-600">Verifique se o QR Code está correto</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center space-x-3">
              <div className="p-2 bg-gradient-to-br from-red-600 to-red-700 rounded-lg">
                <ChefHat className="w-6 h-6 text-white" />
              </div>
              <div>
                <h1 className="text-xl font-bold text-gray-900">{restaurante.nome}</h1>
                <p className="text-sm text-gray-500">Cardápio Digital</p>
              </div>
            </div>
            
            <button
              onClick={() => setShowCarrinho(true)}
              className="relative p-3 bg-red-600 text-white rounded-full hover:bg-red-700 transition-colors"
            >
              <ShoppingCart className="w-6 h-6" />
              {carrinho.length > 0 && (
                <span className="absolute -top-2 -right-2 bg-yellow-500 text-white text-xs rounded-full w-6 h-6 flex items-center justify-center font-bold">
                  {carrinho.reduce((acc, c) => acc + c.quantidade, 0)}
                </span>
              )}
            </button>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="bg-gradient-to-r from-red-600 via-red-700 to-red-800 text-white py-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-3xl md:text-4xl font-bold mb-4">
            Bem-vindo ao {restaurante.configuracoes?.nome_exibicao || restaurante.nome}
          </h2>
          <p className="text-xl text-red-100 mb-6">
            Explore nosso delicioso cardápio e faça seu pedido
          </p>
          <div className="flex items-center justify-center space-x-6 text-red-100">
            <div className="flex items-center">
              <Clock className="w-5 h-5 mr-2" />
              <span>Entrega em {restaurante.configuracoes?.tempo_entrega || '30-45 min'}</span>
            </div>
            <div className="flex items-center">
              <Star className="w-5 h-5 mr-2 text-yellow-400" />
              <span>4.8 (120 avaliações)</span>
            </div>
          </div>
        </div>
      </section>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Filtros */}
        <div className="bg-white rounded-lg shadow-sm p-6 mb-8">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
              <input
                type="text"
                placeholder="Buscar pratos..."
                value={busca}
                onChange={(e) => setBusca(e.target.value)}
                className="pl-10 w-full rounded-lg border border-gray-300 py-3 px-4 focus:ring-2 focus:ring-red-500 focus:border-red-500 text-lg"
              />
            </div>
            
            <div className="flex flex-wrap gap-2">
              <button
                onClick={() => setCategoriaSelecionada('todas')}
                className={`flex items-center px-4 py-2 rounded-lg font-medium transition-colors ${
                  categoriaSelecionada === 'todas'
                    ? 'bg-red-600 text-white'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                <Filter className="w-4 h-4 mr-2" />
                Todas
              </button>
              {categorias.map(categoria => (
                <button
                  key={categoria}
                  onClick={() => setCategoriaSelecionada(categoria)}
                  className={`flex items-center px-4 py-2 rounded-lg font-medium transition-colors ${
                    categoriaSelecionada === categoria
                      ? 'bg-red-600 text-white'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  {getCategoryIcon(categoria)}
                  <span className="ml-2">{categoria}</span>
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Lista de Produtos por Categoria */}
        {categorias.map(categoria => {
          const itemsCategoria = filteredItems.filter(item => item.categoria === categoria);
          
          if (itemsCategoria.length === 0) return null;
          
          return (
            <section key={categoria} className="mb-12">
              <div className="flex items-center mb-6">
                <div className="p-3 bg-red-100 rounded-lg mr-4">
                  {getCategoryIcon(categoria)}
                </div>
                <div>
                  <h2 className="text-2xl font-bold text-gray-900">{categoria}</h2>
                  <p className="text-gray-600">{itemsCategoria.length} {itemsCategoria.length === 1 ? 'item' : 'itens'}</p>
                </div>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {itemsCategoria.map(item => (
                  <div
                    key={item.id}
                    className="bg-white rounded-xl shadow-sm overflow-hidden hover:shadow-lg transition-all duration-300 cursor-pointer"
                    onClick={() => setItemSelecionado(item)}
                  >
                    {item.imagem_url ? (
                      <div className="relative h-48 overflow-hidden">
                        <img
                          src={item.imagem_url}
                          alt={item.nome}
                          className="w-full h-full object-cover hover:scale-105 transition-transform duration-300"
                          onError={(e) => {
                            // Fallback para imagem padrão se a imagem não carregar
                            const target = e.target as HTMLImageElement;
                            target.src = 'https://images.pexels.com/photos/958545/pexels-photo-958545.jpeg';
                          }}
                        />
                        <div className="absolute top-3 right-3 bg-white/90 backdrop-blur-sm px-3 py-1 rounded-full">
                          <span className="text-lg font-bold text-red-600">
                            {formatarDinheiro(item.preco)}
                          </span>
                        </div>
                      </div>
                    ) : (
                      <div className="h-48 bg-gradient-to-br from-gray-100 to-gray-200 flex items-center justify-center">
                        <div className="text-center">
                          <Utensils className="w-12 h-12 text-gray-400 mx-auto mb-2" />
                          <span className="text-lg font-bold text-red-600">
                            {formatarDinheiro(item.preco)}
                          </span>
                        </div>
                      </div>
                    )}
                    
                    <div className="p-6">
                      <h3 className="text-xl font-bold text-gray-900 mb-2">{item.nome}</h3>
                      <p className="text-gray-600 text-sm mb-4 line-clamp-3">{item.descricao}</p>
                      
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-2">
                          <span className="text-xs bg-red-100 text-red-800 px-2 py-1 rounded-full font-medium">
                            {item.categoria}
                          </span>
                        </div>
                        <Button
                          variant="primary"
                          size="sm"
                          icon={<Plus size={16} />}
                          onClick={(e) => {
                            e.stopPropagation();
                            adicionarAoCarrinho(item);
                          }}
                        >
                          Adicionar
                        </Button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </section>
          );
        })}

        {filteredItems.length === 0 && (
          <div className="text-center py-16">
            <Utensils className="w-16 h-16 text-gray-300 mx-auto mb-4" />
            <h3 className="text-xl font-medium text-gray-900 mb-2">
              Nenhum item encontrado
            </h3>
            <p className="text-gray-500">
              Tente ajustar os filtros de busca ou categoria
            </p>
          </div>
        )}
      </div>

      {/* Modal de Detalhes do Item */}
      {itemSelecionado && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-black bg-opacity-50">
          <div className="flex items-center justify-center min-h-screen p-4">
            <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg max-h-[90vh] overflow-hidden">
              <div className="relative">
                {itemSelecionado.imagem_url ? (
                  <img
                    src={itemSelecionado.imagem_url}
                    alt={itemSelecionado.nome}
                    className="w-full h-64 object-cover"
                    onError={(e) => {
                      const target = e.target as HTMLImageElement;
                      target.src = 'https://images.pexels.com/photos/958545/pexels-photo-958545.jpeg';
                    }}
                  />
                ) : (
                  <div className="w-full h-64 bg-gradient-to-br from-gray-100 to-gray-200 flex items-center justify-center">
                    <Utensils className="w-16 h-16 text-gray-400" />
                  </div>
                )}
                
                <button
                  onClick={() => setItemSelecionado(null)}
                  className="absolute top-4 right-4 p-2 bg-white/90 backdrop-blur-sm rounded-full text-gray-600 hover:text-gray-800"
                >
                  <X size={20} />
                </button>
                
                <div className="absolute bottom-4 right-4 bg-white/90 backdrop-blur-sm px-4 py-2 rounded-full">
                  <span className="text-2xl font-bold text-red-600">
                    {formatarDinheiro(itemSelecionado.preco)}
                  </span>
                </div>
              </div>
              
              <div className="p-6">
                <div className="mb-4">
                  <span className="text-sm bg-red-100 text-red-800 px-3 py-1 rounded-full font-medium">
                    {itemSelecionado.categoria}
                  </span>
                </div>
                
                <h2 className="text-2xl font-bold text-gray-900 mb-3">
                  {itemSelecionado.nome}
                </h2>
                
                <p className="text-gray-600 mb-6 leading-relaxed">
                  {itemSelecionado.descricao}
                </p>
                
                <div className="mb-6">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Observações (opcional)
                  </label>
                  <textarea
                    value={observacao}
                    onChange={(e) => setObservacao(e.target.value)}
                    placeholder="Ex: Sem cebola, molho à parte, bem passado..."
                    className="w-full border border-gray-300 rounded-lg py-3 px-4 focus:ring-2 focus:ring-red-500 focus:border-red-500 resize-none"
                    rows={3}
                  />
                </div>
                
                <Button
                  variant="primary"
                  fullWidth
                  size="lg"
                  onClick={() => adicionarAoCarrinho(itemSelecionado)}
                  icon={<Plus size={20} />}
                  className="bg-gradient-to-r from-red-600 to-red-700 hover:from-red-700 hover:to-red-800 text-lg font-semibold py-4"
                >
                  Adicionar ao Carrinho
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal do Carrinho */}
      {showCarrinho && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-black bg-opacity-50">
          <div className="flex items-center justify-center min-h-screen p-4">
            <div className="bg-white rounded-2xl shadow-xl w-full max-w-md max-h-[90vh] overflow-hidden">
              <div className="flex justify-between items-center p-6 border-b border-gray-200">
                <h3 className="text-xl font-bold text-gray-900">Seu Pedido</h3>
                <button
                  onClick={() => setShowCarrinho(false)}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <X size={24} />
                </button>
              </div>
              
              <div className="p-6 max-h-96 overflow-y-auto">
                {carrinho.length === 0 ? (
                  <div className="text-center py-8">
                    <ShoppingCart className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                    <p className="text-gray-500">Seu carrinho está vazio</p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {carrinho.map((c) => (
                      <div key={c.item.id} className="bg-gray-50 rounded-lg p-4">
                        <div className="flex justify-between items-start mb-3">
                          <div className="flex-1">
                            <h4 className="font-medium text-gray-900">{c.item.nome}</h4>
                            <p className="text-sm text-gray-500">{formatarDinheiro(c.item.preco)} cada</p>
                            {c.observacao && (
                              <p className="text-xs text-gray-600 mt-1 italic">"{c.observacao}"</p>
                            )}
                          </div>
                          <button
                            onClick={() => removerDoCarrinho(c.item.id)}
                            className="text-red-500 hover:text-red-700 p-1"
                          >
                            <X size={16} />
                          </button>
                        </div>
                        
                        <div className="flex items-center justify-between">
                          <div className="flex items-center space-x-3">
                            <button
                              onClick={() => alterarQuantidade(c.item.id, c.quantidade - 1)}
                              className="w-8 h-8 rounded-full bg-gray-200 flex items-center justify-center hover:bg-gray-300 transition-colors"
                            >
                              <Minus size={14} />
                            </button>
                            <span className="w-8 text-center font-medium">{c.quantidade}</span>
                            <button
                              onClick={() => alterarQuantidade(c.item.id, c.quantidade + 1)}
                              className="w-8 h-8 rounded-full bg-gray-200 flex items-center justify-center hover:bg-gray-300 transition-colors"
                            >
                              <Plus size={14} />
                            </button>
                          </div>
                          
                          <span className="font-bold text-gray-900">
                            {formatarDinheiro(c.item.preco * c.quantidade)}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
              
              {carrinho.length > 0 && (
                <div className="border-t border-gray-200 p-6">
                  <div className="flex justify-between items-center mb-4">
                    <span className="text-xl font-bold text-gray-900">Total</span>
                    <span className="text-2xl font-bold text-red-600">
                      {formatarDinheiro(calcularTotal())}
                    </span>
                  </div>
                  
                  <Button
                    variant="primary"
                    fullWidth
                    size="lg"
                    onClick={finalizarPedido}
                    className="bg-gradient-to-r from-green-600 to-green-700 hover:from-green-700 hover:to-green-800 text-lg font-semibold py-4"
                  >
                    Finalizar Pedido via WhatsApp
                  </Button>
                  
                  <p className="text-xs text-gray-500 text-center mt-3">
                    Você será redirecionado para o WhatsApp para confirmar o pedido
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Footer */}
      <footer className="bg-gray-900 text-white py-12 mt-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div>
              <div className="flex items-center space-x-3 mb-4">
                <div className="p-2 bg-gradient-to-br from-red-600 to-red-700 rounded-lg">
                  <ChefHat className="w-6 h-6 text-white" />
                </div>
                <span className="text-xl font-bold">
                  {restaurante.configuracoes?.nome_exibicao || restaurante.nome}
                </span>
              </div>
              <p className="text-gray-400">
                Sabores únicos e experiências inesquecíveis
              </p>
            </div>
            
            <div>
              <h3 className="text-lg font-semibold mb-4">Contato</h3>
              <div className="space-y-2">
                <div className="flex items-center">
                  <Phone className="w-4 h-4 mr-2 text-gray-400" />
                  <span className="text-gray-300">
                    {restaurante.configuracoes?.whatsapp || restaurante.telefone}
                  </span>
                </div>
                {restaurante.configuracoes?.endereco && (
                  <div className="flex items-center">
                    <MapPin className="w-4 h-4 mr-2 text-gray-400" />
                    <span className="text-gray-300">{restaurante.configuracoes.endereco}</span>
                  </div>
                )}
              </div>
            </div>
            
            <div>
              <h3 className="text-lg font-semibold mb-4">Horário de Funcionamento</h3>
              <div className="text-gray-300 whitespace-pre-line text-sm">
                {restaurante.configuracoes?.horario_funcionamento || 
                 'Segunda a Quinta: 11h às 23h\nSexta e Sábado: 11h às 00h\nDomingo: 11h às 22h'}
              </div>
            </div>
          </div>
          
          <div className="border-t border-gray-800 mt-8 pt-8 text-center">
            <p className="text-gray-400">
              © 2025 {restaurante.configuracoes?.nome_exibicao || restaurante.nome} - Cardápio Digital powered by ChefComanda
            </p>
          </div>
        </div>
      </footer>

      {/* Floating Action Button para Carrinho */}
      {carrinho.length > 0 && !showCarrinho && (
        <button
          onClick={() => setShowCarrinho(true)}
          className="fixed bottom-6 right-6 bg-red-600 text-white p-4 rounded-full shadow-lg hover:bg-red-700 transition-colors z-40"
        >
          <div className="relative">
            <ShoppingCart className="w-6 h-6" />
            <span className="absolute -top-2 -right-2 bg-yellow-500 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center font-bold">
              {carrinho.reduce((acc, c) => acc + c.quantidade, 0)}
            </span>
          </div>
        </button>
      )}
    </div>
  );
};

export default CardapioPublico;