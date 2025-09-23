import React, { useState, useEffect } from "react";
import { useParams } from "react-router-dom";
import {
  ChefHat,
  Clock,
  Star,
  MapPin,
  Phone,
  Instagram,
  Search,
  Filter,
  ShoppingCart,
  Plus,
  Minus,
  X,
  Utensils,
  Coffee,
  Cake,
  Wine,
  Soup,
  AlertTriangle
} from "lucide-react";
import { supabase } from "../services/supabase";
import { formatarDinheiro } from "../utils/formatters";
import Button from "../components/ui/Button";
import toast from "react-hot-toast";

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
    pedidos_whatsapp_ativo?: boolean;
    tema_cores?: {
      primaria: string;
      secundaria: string;
      fundo: string;
      texto: string;
      card: string;
    };
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
  const [categoriaSelecionada, setCategoriaSelecionada] = useState("todas");
  const [busca, setBusca] = useState("");
  const [carrinho, setCarrinho] = useState<ItemCarrinho[]>([]);
  const [showCarrinho, setShowCarrinho] = useState(false);
  const [itemSelecionado, setItemSelecionado] = useState<CardapioItem | null>(
    null
  );
  const [observacao, setObservacao] = useState("");

  useEffect(() => {
    if (restauranteId) {
      loadRestauranteData();
      loadCardapioItems();
    }
  }, [restauranteId]);

  const loadRestauranteData = async () => {
    try {
      console.log('Loading restaurant data for ID:', restauranteId);
      
      const { data, error } = await supabase
        .from("restaurantes")
        .select("*")
        .eq("id", restauranteId)
        .maybeSingle();

      if (error) {
        console.error("Error loading restaurant data:", error);
        console.log("Error details:", error);
        return;
      }

      if (!data) {
        console.log("No restaurant data found for ID:", restauranteId);
        setRestaurante(null);
        return;
      }

      console.log("Restaurant data loaded successfully:", data);
      setRestaurante(data);
    } catch (error) {
      console.error("Error loading restaurant data:", error);
    }
  };

  const loadCardapioItems = async () => {
    try {
      setLoading(true);
      
      if (!restauranteId) {
        throw new Error('ID do restaurante não fornecido');
      }
      
      console.log('Loading cardapio items for restaurant:', restauranteId);
      
      const { data, error } = await supabase
        .from("cardapio_online")
        .select("*")
        .eq("restaurante_id", restauranteId)
        .eq("ativo", true)
        .eq("disponivel_online", true)
        .order("ordem");

      if (error) {
        console.error("Error loading cardapio items:", error);
        throw error;
      }

      console.log('Cardapio items loaded:', data?.length || 0);
      setItems(data || []);

      // Extract unique categories
      const uniqueCategories = Array.from(
        new Set((data || []).map((item) => item.categoria))
      );
      setCategorias(uniqueCategories);
    } catch (error) {
      console.error("Error loading cardapio items:", error);
    } finally {
      setLoading(false);
    }
  };

  const filteredItems = items.filter((item) => {
    const matchBusca =
      item.nome.toLowerCase().includes(busca.toLowerCase()) ||
      item.descricao.toLowerCase().includes(busca.toLowerCase());
    const matchCategoria =
      categoriaSelecionada === "todas" ||
      item.categoria === categoriaSelecionada;
    return matchBusca && matchCategoria;
  });

  const adicionarAoCarrinho = (item: CardapioItem, quantidade: number = 1) => {
    const itemExistente = carrinho.find((c) => c.item.id === item.id);

    if (itemExistente) {
      setCarrinho(
        carrinho.map((c) =>
          c.item.id === item.id
            ? {
                ...c,
                quantidade: c.quantidade + quantidade,
                observacao: observacao || c.observacao
              }
            : c
        )
      );
    } else {
      setCarrinho([
        ...carrinho,
        { item, quantidade, observacao: observacao || undefined }
      ]);
    }

    setItemSelecionado(null);
    setObservacao("");
    toast.success(`${item.nome} adicionado ao carrinho!`);
  };

  const removerDoCarrinho = (itemId: string) => {
    setCarrinho(carrinho.filter((c) => c.item.id !== itemId));
  };

  const alterarQuantidade = (itemId: string, novaQuantidade: number) => {
    if (novaQuantidade <= 0) {
      removerDoCarrinho(itemId);
      return;
    }

    setCarrinho(
      carrinho.map((c) =>
        c.item.id === itemId ? { ...c, quantidade: novaQuantidade } : c
      )
    );
  };

  const calcularTotal = () => {
    return carrinho.reduce(
      (total, c) => total + c.item.preco * c.quantidade,
      0
    );
  };

  const getCategoryIcon = (categoria: string) => {
    const icons: Record<string, React.ReactNode> = {
      Entradas: <Soup className="w-5 h-5" />,
      "Pratos Principais": <Utensils className="w-5 h-5" />,
      "Menu Principal": <Utensils className="w-5 h-5" />,
      Sobremesas: <Cake className="w-5 h-5" />,
      Bebidas: <Coffee className="w-5 h-5" />,
      Vinhos: <Wine className="w-5 h-5" />,
      Lanches: <Coffee className="w-5 h-5" />,
      "Menu Kids": <Star className="w-5 h-5" />
    };
    return icons[categoria] || <Utensils className="w-5 h-5" />;
  };

  // Obter cores do tema
  const temaCores = restaurante?.configuracoes?.tema_cores || {
    primaria: '#DC2626',
    secundaria: '#EF4444',
    fundo: '#F9FAFB',
    texto: '#1F2937',
    card: '#FFFFFF'
  };

  const finalizarPedido = () => {
    if (carrinho.length === 0) {
      toast.error("Adicione itens ao carrinho primeiro");
      return;
    }

    // Verificar se pedidos estão ativados
    if (restaurante?.configuracoes?.pedidos_whatsapp_ativo === false) {
      toast.error("Pedidos via WhatsApp estão temporariamente desativados");
      return;
    }

    // Simular envio do pedido
    const pedidoTexto = carrinho
      .map(
        (c) =>
          `${c.quantidade}x ${c.item.nome}${
            c.observacao ? ` (${c.observacao})` : ""
          } - ${formatarDinheiro(c.item.preco * c.quantidade)}`
      )
      .join("\n");

    const total = calcularTotal();
    const mensagem = `🍽️ *Novo Pedido - ${
      restaurante?.nome
    }*\n\n${pedidoTexto}\n\n*Total: ${formatarDinheiro(
      total
    )}*\n\nPor favor, confirme o pedido e informe o tempo de preparo.`;

    const whatsappNumber =
      restaurante?.configuracoes?.whatsapp || restaurante?.telefone || "";
    const whatsappUrl = `https://wa.me/${whatsappNumber.replace(
      /\D/g,
      ""
    )}?text=${encodeURIComponent(mensagem)}`;
    window.open(whatsappUrl, "_blank");

    toast.success("Pedido enviado via WhatsApp!");
    setCarrinho([]);
    setShowCarrinho(false);
  };

  if (loading) {
    return (
      <div 
        className="min-h-screen flex items-center justify-center"
        style={{ backgroundColor: temaCores.fundo }}
      >
        <div className="text-center">
          <div 
            className="animate-spin rounded-full h-16 w-16 border-t-4 mx-auto mb-4"
            style={{ borderTopColor: temaCores.primaria }}
          ></div>
          <p style={{ color: temaCores.texto }}>Carregando cardápio...</p>
        </div>
      </div>
    );
  }

  if (!restaurante) {
    return (
      <div 
        className="min-h-screen flex items-center justify-center"
        style={{ backgroundColor: temaCores.fundo }}
      >
        <div className="text-center">
          <ChefHat className="w-16 h-16 mx-auto mb-4" style={{ color: temaCores.primaria }} />
          <h1 className="text-2xl font-bold mb-2" style={{ color: temaCores.texto }}>
            Restaurante não encontrado
          </h1>
          <p style={{ color: temaCores.texto, opacity: 0.7 }}>Verifique se o QR Code está correto</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen" style={{ backgroundColor: temaCores.fundo }}>
      {/* Header */}
      <header 
        className="shadow-lg sticky top-0 z-40 backdrop-blur-sm"
        style={{ backgroundColor: `${temaCores.card}F0` }}
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center space-x-3">
              <div 
                className="p-2 rounded-xl shadow-lg"
                style={{ 
                  background: `linear-gradient(to bottom right, ${temaCores.primaria}, ${temaCores.secundaria})` 
                }}
              >
                <ChefHat className="w-6 h-6 text-white" />
              </div>
              <div>
                <h1 className="text-xl font-bold" style={{ color: temaCores.texto }}>
                  {restaurante.configuracoes?.nome_exibicao || restaurante.nome}
                </h1>
                <p className="text-sm" style={{ color: temaCores.texto, opacity: 0.7 }}>
                  Cardápio Digital
                </p>
              </div>
            </div>

            <button
              onClick={() => setShowCarrinho(true)}
              className="relative p-3 text-white rounded-full transition-all duration-300 hover:scale-110 shadow-lg"
              style={{ 
                backgroundColor: temaCores.primaria,
                boxShadow: `0 4px 20px ${temaCores.primaria}40`
              }}
            >
              <ShoppingCart className="w-6 h-6" />
              {carrinho.length > 0 && (
                <span className="absolute -top-2 -right-2 bg-yellow-500 text-white text-xs rounded-full w-6 h-6 flex items-center justify-center font-bold animate-pulse">
                  {carrinho.reduce((acc, c) => acc + c.quantidade, 0)}
                </span>
              )}
            </button>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section 
        className="text-white py-16 relative overflow-hidden"
        style={{ 
          background: `linear-gradient(135deg, ${temaCores.primaria}, ${temaCores.secundaria}, ${temaCores.primaria}DD)` 
        }}
      >
        {/* Background Pattern */}
        <div className="absolute inset-0 opacity-10">
          <div className="absolute top-10 left-10 w-32 h-32 bg-white rounded-full"></div>
          <div className="absolute top-32 right-20 w-20 h-20 bg-white rounded-full"></div>
          <div className="absolute bottom-20 left-1/3 w-24 h-24 bg-white rounded-full"></div>
        </div>
        
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <div className="relative">
            <h2 className="text-4xl md:text-5xl font-bold mb-6 leading-tight">
            Bem-vindo ao{" "}
            {restaurante.configuracoes?.nome_exibicao || restaurante.nome}
          </h2>
            <p className="text-xl md:text-2xl opacity-90 mb-8 max-w-2xl mx-auto leading-relaxed">
              Explore nosso delicioso cardápio e {restaurante.configuracoes?.pedidos_whatsapp_ativo !== false ? 'faça seu pedido' : 'conheça nossos pratos'}
          </p>
            <div className="flex flex-wrap items-center justify-center gap-6 opacity-90">
              <div className="flex items-center bg-white/20 backdrop-blur-sm px-4 py-2 rounded-full">
              <Clock className="w-5 h-5 mr-2" />
              <span>
                Entrega em{" "}
                {restaurante.configuracoes?.tempo_entrega || "30-45 min"}
              </span>
            </div>
              <div className="flex items-center bg-white/20 backdrop-blur-sm px-4 py-2 rounded-full">
              <Star className="w-5 h-5 mr-2 text-yellow-400" />
              <span>4.8 (120 avaliações)</span>
            </div>
              {restaurante.configuracoes?.pedidos_whatsapp_ativo === false && (
                <div className="flex items-center bg-yellow-500/20 backdrop-blur-sm px-4 py-2 rounded-full border border-yellow-300/30">
                  <AlertTriangle className="w-5 h-5 mr-2 text-yellow-300" />
                  <span className="text-yellow-100">Pedidos temporariamente desativados</span>
                </div>
              )}
            </div>
          </div>
        </div>
      </section>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Filtros */}
        <div 
          className="rounded-2xl shadow-xl p-6 mb-8 backdrop-blur-sm border border-white/20"
          style={{ backgroundColor: `${temaCores.card}F0` }}
        >
          <div className="flex flex-col md:flex-row gap-4">
            <div className="relative flex-1">
              <Search
                className="absolute left-3 top-1/2 -translate-y-1/2"
                style={{ color: `${temaCores.texto}80` }}
                size={20}
              />
              <input
                type="text"
                placeholder="Buscar pratos..."
                value={busca}
                onChange={(e) => setBusca(e.target.value)}
                className="pl-10 w-full rounded-xl border border-gray-200 py-3 px-4 text-lg transition-all duration-300 focus:ring-2 focus:border-transparent shadow-sm"
                style={{ 
                  backgroundColor: temaCores.fundo,
                  color: temaCores.texto,
                  '--tw-ring-color': temaCores.primaria
                } as React.CSSProperties}
              />
            </div>

            <div className="flex flex-wrap gap-2">
              <button
                onClick={() => setCategoriaSelecionada("todas")}
                className={`flex items-center px-6 py-3 rounded-xl font-semibold transition-all duration-300 shadow-md hover:shadow-lg transform hover:scale-105 ${
                  categoriaSelecionada === "todas"
                    ? "text-white"
                    : "hover:shadow-lg"
                }`}
                style={{
                  backgroundColor: categoriaSelecionada === "todas" ? temaCores.primaria : temaCores.card,
                  color: categoriaSelecionada === "todas" ? 'white' : temaCores.texto,
                  borderColor: categoriaSelecionada === "todas" ? temaCores.primaria : 'transparent',
                  border: '2px solid'
                }}
              >
                <Filter className="w-4 h-4 mr-2" />
                Todas
              </button>
              {categorias.map((categoria) => (
                <button
                  key={categoria}
                  onClick={() => setCategoriaSelecionada(categoria)}
                  className={`flex items-center px-6 py-3 rounded-xl font-semibold transition-all duration-300 shadow-md hover:shadow-lg transform hover:scale-105 ${
                    categoriaSelecionada === categoria
                      ? "text-white"
                      : "hover:shadow-lg"
                  }`}
                  style={{
                    backgroundColor: categoriaSelecionada === categoria ? temaCores.primaria : temaCores.card,
                    color: categoriaSelecionada === categoria ? 'white' : temaCores.texto,
                    borderColor: categoriaSelecionada === categoria ? temaCores.primaria : 'transparent',
                    border: '2px solid'
                  }}
                >
                  {getCategoryIcon(categoria)}
                  <span className="ml-2">{categoria}</span>
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Lista de Produtos por Categoria */}
        {categorias.map((categoria) => {
          const itemsCategoria = filteredItems.filter(
            (item) => item.categoria === categoria
          );

          if (itemsCategoria.length === 0) return null;

          return (
            <section key={categoria} className="mb-12">
              <div className="flex items-center mb-6">
                <div 
                  className="p-4 rounded-2xl mr-4 shadow-lg"
                  style={{ backgroundColor: `${temaCores.primaria}20` }}
                >
                  {getCategoryIcon(categoria)}
                </div>
                <div>
                  <h2 className="text-3xl font-bold" style={{ color: temaCores.texto }}>
                    {categoria}
                  </h2>
                  <p style={{ color: temaCores.texto, opacity: 0.7 }}>
                    {itemsCategoria.length}{" "}
                    {itemsCategoria.length === 1 ? "item" : "itens"}
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                {itemsCategoria.map((item) => (
                  <div
                    key={item.id}
                    className="rounded-3xl shadow-xl overflow-hidden hover:shadow-2xl transition-all duration-500 cursor-pointer transform hover:scale-105 hover:-translate-y-2 group"
                    style={{ backgroundColor: temaCores.card }}
                    onClick={() => setItemSelecionado(item)}
                  >
                    {item.imagem_url ? (
                      <div className="relative h-56 overflow-hidden">
                        <img
                          src={item.imagem_url}
                          alt={item.nome}
                          className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
                          onError={(e) => {
                            // Fallback para imagem padrão se a imagem não carregar
                            const target = e.target as HTMLImageElement;
                            target.src =
                              "https://images.pexels.com/photos/958545/pexels-photo-958545.jpeg";
                          }}
                        />
                        <div className="absolute top-4 right-4 bg-white/95 backdrop-blur-sm px-4 py-2 rounded-2xl shadow-lg">
                          <span className="text-lg font-bold" style={{ color: temaCores.primaria }}>
                            {formatarDinheiro(item.preco)}
                          </span>
                        </div>
                        <div className="absolute inset-0 bg-gradient-to-t from-black/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
                      </div>
                    ) : (
                      <div 
                        className="h-56 flex items-center justify-center relative overflow-hidden"
                        style={{ backgroundColor: `${temaCores.primaria}10` }}
                      >
                        <div className="absolute inset-0 bg-gradient-to-br from-transparent to-black/5"></div>
                        <div className="text-center">
                          <Utensils className="w-16 h-16 mx-auto mb-3" style={{ color: temaCores.primaria }} />
                          <span className="text-xl font-bold" style={{ color: temaCores.primaria }}>
                            {formatarDinheiro(item.preco)}
                          </span>
                        </div>
                      </div>
                    )}

                    <div className="p-6 relative">
                      <h3 className="text-xl font-bold mb-3 group-hover:text-opacity-80 transition-colors" style={{ color: temaCores.texto }}>
                        {item.nome}
                      </h3>
                      <p className="text-sm mb-4 line-clamp-3 leading-relaxed" style={{ color: temaCores.texto, opacity: 0.7 }}>
                        {item.descricao}
                      </p>

                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-2">
                          <span 
                            className="text-xs px-3 py-1 rounded-full font-semibold"
                            style={{ 
                              backgroundColor: `${temaCores.primaria}20`,
                              color: temaCores.primaria
                            }}
                          >
                            {item.categoria}
                          </span>
                        </div>
                        {restaurante.configuracoes?.pedidos_whatsapp_ativo !== false ? (
                          <Button
                          variant="primary"
                          size="sm"
                          icon={<Plus size={16} />}
                          onClick={(e) => {
                            e.stopPropagation();
                            adicionarAoCarrinho(item);
                          }}
                            className="rounded-xl font-semibold shadow-lg hover:shadow-xl transition-all duration-300 transform hover:scale-105"
                            style={{ 
                              backgroundColor: temaCores.primaria,
                              borderColor: temaCores.primaria
                            }}
                        >
                          Adicionar
                        </Button>
                        ) : (
                          <div className="text-xs text-gray-500 bg-gray-100 px-3 py-2 rounded-full">
                            Pedidos desativados
                          </div>
                        )}
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
            <Utensils className="w-20 h-20 mx-auto mb-6" style={{ color: `${temaCores.primaria}60` }} />
            <h3 className="text-2xl font-bold mb-3" style={{ color: temaCores.texto }}>
              Nenhum item encontrado
            </h3>
            <p style={{ color: temaCores.texto, opacity: 0.7 }}>
              Tente ajustar os filtros de busca ou categoria
            </p>
          </div>
        )}
      </div>

      {/* Modal de Detalhes do Item */}
      {itemSelecionado && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-black bg-opacity-50">
          <div className="flex items-center justify-center min-h-screen p-4">
            <div 
              className="rounded-3xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-hidden"
              style={{ backgroundColor: temaCores.card }}
            >
              <div className="relative">
                {itemSelecionado.imagem_url ? (
                  <img
                    src={itemSelecionado.imagem_url}
                    alt={itemSelecionado.nome}
                    className="w-full h-72 object-cover"
                    onError={(e) => {
                      const target = e.target as HTMLImageElement;
                      target.src =
                        "https://images.pexels.com/photos/958545/pexels-photo-958545.jpeg";
                    }}
                  />
                ) : (
                  <div 
                    className="w-full h-72 flex items-center justify-center"
                    style={{ backgroundColor: `${temaCores.primaria}10` }}
                  >
                    <Utensils className="w-20 h-20" style={{ color: temaCores.primaria }} />
                  </div>
                )}

                <button
                  onClick={() => setItemSelecionado(null)}
                  className="absolute top-4 right-4 p-3 bg-white/95 backdrop-blur-sm rounded-full hover:bg-white transition-all duration-300 shadow-lg hover:shadow-xl"
                  style={{ color: temaCores.texto }}
                >
                  <X size={20} />
                </button>

                <div className="absolute bottom-4 right-4 bg-white/95 backdrop-blur-sm px-6 py-3 rounded-2xl shadow-lg">
                  <span className="text-2xl font-bold" style={{ color: temaCores.primaria }}>
                    {formatarDinheiro(itemSelecionado.preco)}
                  </span>
                </div>
              </div>

              <div className="p-6">
                <div className="mb-4">
                  <span 
                    className="text-sm px-4 py-2 rounded-full font-semibold"
                    style={{ 
                      backgroundColor: `${temaCores.primaria}20`,
                      color: temaCores.primaria
                    }}
                  >
                    {itemSelecionado.categoria}
                  </span>
                </div>

                <h2 className="text-3xl font-bold mb-4" style={{ color: temaCores.texto }}>
                  {itemSelecionado.nome}
                </h2>

                <p className="mb-6 leading-relaxed text-lg" style={{ color: temaCores.texto, opacity: 0.8 }}>
                  {itemSelecionado.descricao}
                </p>

                <div className="mb-6">
                  <label className="block text-sm font-semibold mb-3" style={{ color: temaCores.texto }}>
                    Observações (opcional)
                  </label>
                  <textarea
                    value={observacao}
                    onChange={(e) => setObservacao(e.target.value)}
                    placeholder="Ex: Sem cebola, molho à parte, bem passado..."
                    className="w-full border border-gray-200 rounded-xl py-3 px-4 resize-none transition-all duration-300 focus:ring-2 focus:border-transparent shadow-sm"
                    style={{ 
                      backgroundColor: temaCores.fundo,
                      color: temaCores.texto,
                      '--tw-ring-color': temaCores.primaria
                    } as React.CSSProperties}
                    rows={3}
                  />
                </div>

                {restaurante.configuracoes?.pedidos_whatsapp_ativo !== false ? (
                  <Button
                  variant="primary"
                  fullWidth
                  size="lg"
                  onClick={() => adicionarAoCarrinho(itemSelecionado)}
                  icon={<Plus size={20} />}
                    className="text-lg font-bold py-4 rounded-2xl shadow-xl hover:shadow-2xl transition-all duration-300 transform hover:scale-105"
                    style={{ 
                      background: `linear-gradient(to right, ${temaCores.primaria}, ${temaCores.secundaria})`,
                      color: 'white'
                    }}
                >
                  Adicionar ao Carrinho
                </Button>
                ) : (
                  <div className="text-center p-4 bg-yellow-50 rounded-2xl border border-yellow-200">
                    <AlertTriangle className="w-6 h-6 text-yellow-600 mx-auto mb-2" />
                    <p className="text-yellow-800 font-semibold">
                      Pedidos temporariamente desativados
                    </p>
                    <p className="text-yellow-600 text-sm mt-1">
                      Entre em contato diretamente pelo telefone
                    </p>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal do Carrinho */}
      {showCarrinho && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-black bg-opacity-50">
          <div className="flex items-center justify-center min-h-screen p-4">
            <div 
              className="rounded-3xl shadow-2xl w-full max-w-md max-h-[90vh] overflow-hidden"
              style={{ backgroundColor: temaCores.card }}
            >
              <div 
                className="flex justify-between items-center p-6 border-b"
                style={{ 
                  borderColor: `${temaCores.primaria}20`,
                  background: `linear-gradient(135deg, ${temaCores.primaria}05, ${temaCores.secundaria}05)`
                }}
              >
                <h3 className="text-xl font-bold" style={{ color: temaCores.texto }}>Seu Pedido</h3>
                <button
                  onClick={() => setShowCarrinho(false)}
                  className="p-2 rounded-full hover:bg-white/50 transition-colors"
                  style={{ color: temaCores.texto }}
                >
                  <X size={24} />
                </button>
              </div>

              <div className="p-6 max-h-96 overflow-y-auto">
                {carrinho.length === 0 ? (
                  <div className="text-center py-8">
                    <ShoppingCart className="w-20 h-20 mx-auto mb-4" style={{ color: `${temaCores.primaria}60` }} />
                    <p style={{ color: temaCores.texto, opacity: 0.7 }}>Seu carrinho está vazio</p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {carrinho.map((c) => (
                      <div
                        key={c.item.id}
                        className="rounded-2xl p-4 border shadow-sm"
                        style={{ 
                          backgroundColor: temaCores.fundo,
                          borderColor: `${temaCores.primaria}20`
                        }}
                      >
                        <div className="flex justify-between items-start mb-3">
                          <div className="flex-1">
                            <h4 className="font-semibold" style={{ color: temaCores.texto }}>
                              {c.item.nome}
                            </h4>
                            <p className="text-sm" style={{ color: temaCores.texto, opacity: 0.7 }}>
                              {formatarDinheiro(c.item.preco)} cada
                            </p>
                            {c.observacao && (
                              <p className="text-xs mt-1 italic" style={{ color: temaCores.texto, opacity: 0.6 }}>
                                "{c.observacao}"
                              </p>
                            )}
                          </div>
                          <button
                            onClick={() => removerDoCarrinho(c.item.id)}
                            className="p-2 rounded-full hover:bg-red-100 transition-colors"
                            style={{ color: temaCores.secundaria }}
                          >
                            <X size={16} />
                          </button>
                        </div>

                        <div className="flex items-center justify-between">
                          <div className="flex items-center space-x-3">
                            <button
                              onClick={() =>
                                alterarQuantidade(c.item.id, c.quantidade - 1)
                              }
                              className="w-10 h-10 rounded-full flex items-center justify-center transition-all duration-300 hover:scale-110 shadow-md"
                              style={{ backgroundColor: `${temaCores.primaria}20`, color: temaCores.primaria }}
                            >
                              <Minus size={14} />
                            </button>
                            <span className="w-10 text-center font-bold text-lg" style={{ color: temaCores.texto }}>
                              {c.quantidade}
                            </span>
                            <button
                              onClick={() =>
                                alterarQuantidade(c.item.id, c.quantidade + 1)
                              }
                              className="w-10 h-10 rounded-full flex items-center justify-center transition-all duration-300 hover:scale-110 shadow-md"
                              style={{ backgroundColor: `${temaCores.primaria}20`, color: temaCores.primaria }}
                            >
                              <Plus size={14} />
                            </button>
                          </div>

                          <span className="font-bold text-lg" style={{ color: temaCores.texto }}>
                            {formatarDinheiro(c.item.preco * c.quantidade)}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {carrinho.length > 0 && (
                <div 
                  className="border-t p-6"
                  style={{ borderColor: `${temaCores.primaria}20` }}
                >
                  <div className="flex justify-between items-center mb-4">
                    <span className="text-xl font-bold" style={{ color: temaCores.texto }}>
                      Total
                    </span>
                    <span className="text-3xl font-bold" style={{ color: temaCores.primaria }}>
                      {formatarDinheiro(calcularTotal())}
                    </span>
                  </div>

                  {restaurante.configuracoes?.pedidos_whatsapp_ativo !== false ? (
                    <Button
                    variant="primary"
                    fullWidth
                    size="lg"
                    onClick={finalizarPedido}
                      className="text-lg font-bold py-4 rounded-2xl shadow-xl hover:shadow-2xl transition-all duration-300 transform hover:scale-105"
                      style={{ 
                        background: `linear-gradient(to right, #059669, #10B981)`,
                        color: 'white'
                      }}
                  >
                    Finalizar Pedido via WhatsApp
                  </Button>
                  ) : (
                    <div className="text-center p-4 bg-yellow-50 rounded-2xl border border-yellow-200">
                      <AlertTriangle className="w-6 h-6 text-yellow-600 mx-auto mb-2" />
                      <p className="text-yellow-800 font-semibold">
                        Pedidos temporariamente desativados
                      </p>
                      <p className="text-yellow-600 text-sm mt-1">
                        Entre em contato pelo telefone: {restaurante.configuracoes?.whatsapp || restaurante.telefone}
                      </p>
                    </div>
                  )}

                  <p className="text-xs text-gray-500 text-center mt-3">
                    {restaurante.configuracoes?.pedidos_whatsapp_ativo !== false 
                      ? 'Você será redirecionado para o WhatsApp para confirmar o pedido'
                      : 'Pedidos via WhatsApp estão temporariamente desativados'
                    }
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Footer */}
      <footer 
        className="text-white py-16 mt-20 relative overflow-hidden"
        style={{ 
          background: `linear-gradient(135deg, #1F2937, #374151, #1F2937)`
        }}
      >
        {/* Background Pattern */}
        <div className="absolute inset-0 opacity-5">
          <div className="absolute top-10 left-10 w-40 h-40 bg-white rounded-full"></div>
          <div className="absolute bottom-10 right-10 w-32 h-32 bg-white rounded-full"></div>
          <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-60 h-60 bg-white rounded-full"></div>
        </div>
        
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="relative grid grid-cols-1 md:grid-cols-3 gap-8">
            <div>
              <div className="flex items-center space-x-3 mb-4">
                <div 
                  className="p-3 rounded-2xl shadow-lg"
                  style={{ 
                    background: `linear-gradient(to bottom right, ${temaCores.primaria}, ${temaCores.secundaria})` 
                  }}
                >
                  <ChefHat className="w-6 h-6 text-white" />
                </div>
                <span className="text-2xl font-bold">
                  {restaurante.configuracoes?.nome_exibicao || restaurante.nome}
                </span>
              </div>
              <p className="text-gray-300 text-lg">
                Sabores únicos e experiências inesquecíveis
              </p>
            </div>

            <div>
              <h3 className="text-xl font-bold mb-4">Contato</h3>
              <div className="space-y-2">
                <div className="flex items-center">
                  <Phone className="w-4 h-4 mr-2 text-gray-400" />
                  <span className="text-gray-300">
                    {restaurante.configuracoes?.whatsapp ||
                      restaurante.telefone}
                  </span>
                </div>
                {restaurante.configuracoes?.endereco && (
                  <div className="flex items-center">
                    <MapPin className="w-4 h-4 mr-2 text-gray-400" />
                    <span className="text-gray-300">
                      {restaurante.configuracoes.endereco}
                    </span>
                  </div>
                )}
              </div>
            </div>

            <div>
              <h3 className="text-xl font-bold mb-4">
                Horário de Funcionamento
              </h3>
              <div className="text-gray-300 whitespace-pre-line">
                {restaurante.configuracoes?.horario_funcionamento ||
                  "Segunda a Quinta: 11h às 23h\nSexta e Sábado: 11h às 00h\nDomingo: 11h às 22h"}
              </div>
            </div>
          </div>

          <div className="border-t border-gray-700 mt-12 pt-8 text-center relative">
            <p className="text-gray-400">
              © 2025{" "}
              {restaurante.configuracoes?.nome_exibicao || restaurante.nome} -
              Cardápio Digital powered by ChefComanda
            </p>
          </div>
        </div>
      </footer>

      {/* Floating Action Button para Carrinho */}
      {carrinho.length > 0 && !showCarrinho && restaurante.configuracoes?.pedidos_whatsapp_ativo !== false && (
        <button
          onClick={() => setShowCarrinho(true)}
          className="fixed bottom-6 right-6 text-white p-4 rounded-full shadow-2xl transition-all duration-300 hover:scale-110 z-40 animate-bounce"
          style={{ 
            backgroundColor: temaCores.primaria,
            boxShadow: `0 10px 30px ${temaCores.primaria}60`
          }}
        >
          <div className="relative">
            <ShoppingCart className="w-6 h-6" />
            <span className="absolute -top-2 -right-2 bg-yellow-500 text-white text-xs rounded-full w-6 h-6 flex items-center justify-center font-bold animate-pulse">
              {carrinho.reduce((acc, c) => acc + c.quantidade, 0)}
            </span>
          </div>
        </button>
      )}
    </div>
  );
};

export default CardapioPublico;
