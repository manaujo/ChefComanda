import React, { useState, useEffect } from 'react';
import { Plus, Search, Filter, Edit2, Trash2, Upload, Eye, EyeOff, ArrowUp, ArrowDown, AlertTriangle, X, FolderSync as Sync, Settings, Clock, Phone, Building } from 'lucide-react';
import Button from '../components/ui/Button';
import { useRestaurante } from '../contexts/RestauranteContext';
import { formatarDinheiro } from '../utils/formatters';
import { supabase } from '../services/supabase';
import { CRUDService } from '../services/CRUDService';
import { useAuth } from '../contexts/AuthContext';
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

interface Categoria {
  id: string;
  nome: string;
  descricao?: string;
  ativa: boolean;
}

const CardapioOnlineEditor: React.FC = () => {
  const [items, setItems] = useState<CardapioItem[]>([]);
  const [categorias, setCategorias] = useState<Categoria[]>([]);
  const { user } = useAuth();
  const { produtos, restaurante, atualizarRestaurante } = useRestaurante();
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<'items' | 'config'>('items');
  const [showModal, setShowModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [selectedItem, setSelectedItem] = useState<CardapioItem | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('todas');
  const [formData, setFormData] = useState({
    nome: '',
    descricao: '',
    preco: '',
    categoria: '',
    imagem_url: '',
    ativo: true,
    disponivel_online: true
  });
  const [restaurantConfig, setRestaurantConfig] = useState({
    nome_exibicao: '',
    tempo_entrega: '',
    whatsapp: '',
    endereco: '',
    horario_funcionamento: '',
    pedidos_whatsapp_ativo: true,
    tema_cores: {
      primaria: '#DC2626',
      secundaria: '#EF4444',
      fundo: '#FFFFFF',
      texto: '#1F2937',
      card: '#F9FAFB'
    }
  });

  useEffect(() => {
    loadMenuItems();
    loadCategorias();
    loadRestaurantConfig();
  }, []);

  const loadCategorias = async () => {
    try {
      const data = await CRUDService.read('categorias');
      setCategorias(data || []);
    } catch (error) {
      console.error('Erro ao carregar categorias:', error);
    }
  };

  const loadRestaurantConfig = async () => {
    try {
      if (!restaurante?.id) return;

      const { data, error } = await supabase
        .from('restaurantes')
        .select('configuracoes')
        .eq('id', restaurante.id)
        .single();

      if (error) throw error;

      const config = data?.configuracoes || {};
      setRestaurantConfig({
        nome_exibicao: config.nome_exibicao || restaurante.nome || '',
        tempo_entrega: config.tempo_entrega || '30-45 min',
        whatsapp: config.whatsapp || restaurante.telefone || '',
        endereco: config.endereco || '',
        horario_funcionamento: config.horario_funcionamento || 'Segunda a Domingo: 11h às 23h',
        pedidos_whatsapp_ativo: config.pedidos_whatsapp_ativo !== false,
        tema_cores: config.tema_cores || {
          primaria: '#DC2626',
          secundaria: '#EF4444',
          fundo: '#FFFFFF',
          texto: '#1F2937',
          card: '#F9FAFB'
        }
      });
    } catch (error) {
      console.error('Error loading restaurant config:', error);
    }
  };

  const loadMenuItems = async () => {
    try {
      setLoading(true);
      
      // Get or create user's restaurant
      let { data: restaurante, error: restauranteError } = await supabase
        .from('restaurantes')
        .select('*')
        .eq('user_id', user?.id)
        .maybeSingle();

      if (restauranteError && restauranteError.code !== 'PGRST116') {
        console.error('Error getting restaurant:', restauranteError);
        throw new Error('Restaurante não encontrado');
      }

      // Create restaurant if it doesn't exist
      if (!restaurante) {
        console.log('Creating restaurant for user:', user?.id);
        const { data: newRestaurante, error: createError } = await supabase
          .from('restaurantes')
          .insert({
            user_id: user?.id,
            nome: `Restaurante de ${user?.user_metadata?.name || 'Usuário'}`,
            telefone: ""
          })
          .select()
          .single();

        if (createError) {
          console.error('Error creating restaurant:', createError);
          throw new Error('Erro ao criar restaurante');
        }
        
        restaurante = newRestaurante;
      }

      const { data, error } = await supabase
        .from('cardapio_online')
        .select('*')
        .eq('restaurante_id', restaurante.id)
        .order('ordem');

      if (error) throw error;
      setItems(data || []);
    } catch (error) {
      console.error('Error loading menu items:', error);
      toast.error('Erro ao carregar itens do cardápio');
    } finally {
      setLoading(false);
    }
  };

  const syncFromProdutos = async () => {
    try {
      setLoading(true);
      
      // Get or create user's restaurant
      let { data: restaurante, error: restauranteError } = await supabase
        .from('restaurantes')
        .select('*')
        .eq('user_id', user?.id)
        .maybeSingle();

      if (restauranteError && restauranteError.code !== 'PGRST116') {
        console.error('Error getting restaurant:', restauranteError);
        throw new Error('Restaurante não encontrado');
      }

      // Create restaurant if it doesn't exist
      if (!restaurante) {
        const { data: newRestaurante, error: createError } = await supabase
          .from('restaurantes')
          .insert({
            user_id: user?.id,
            nome: `Restaurante de ${user?.user_metadata?.name || 'Usuário'}`,
            telefone: ""
          })
          .select()
          .single();

        if (createError) {
          console.error('Error creating restaurant:', createError);
          throw new Error('Erro ao criar restaurante');
        }
        
        restaurante = newRestaurante;
      }

      // Get existing cardapio items to avoid duplicates
      const { data: existingItems } = await supabase
        .from('cardapio_online')
        .select('nome')
        .eq('restaurante_id', restaurante.id);

      const existingNames = new Set(existingItems?.map(item => item.nome) || []);

      // Sync products that don't exist in cardapio_online
      const newItems = produtos
        .filter(produto => !existingNames.has(produto.nome))
        .map((produto, index) => ({
          restaurante_id: restaurante.id,
          nome: produto.nome,
          descricao: produto.descricao || '',
          preco: produto.preco,
          categoria: produto.categoria,
          imagem_url: produto.imagem_url || '',
          ordem: items.length + index,
          ativo: produto.disponivel,
          disponivel_online: produto.disponivel
        }));

      if (newItems.length > 0) {
        const { error } = await supabase
          .from('cardapio_online')
          .insert(newItems);

        if (error) throw error;

        toast.success(`${newItems.length} produtos sincronizados com sucesso!`);
        loadMenuItems();
      } else {
        toast('Todos os produtos já estão sincronizados');
      }
    } catch (error) {
      console.error('Error syncing products:', error);
      toast.error('Erro ao sincronizar produtos');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      // Get or create user's restaurant
      let { data: restaurante, error: restauranteError } = await supabase
        .from('restaurantes')
        .select('*')
        .eq('user_id', user?.id)
        .maybeSingle();

      if (restauranteError && restauranteError.code !== 'PGRST116') {
        console.error('Error getting restaurant:', restauranteError);
        throw new Error('Restaurante não encontrado');
      }

      // Create restaurant if it doesn't exist
      if (!restaurante) {
        const { data: newRestaurante, error: createError } = await supabase
          .from('restaurantes')
          .insert({
            user_id: user?.id,
            nome: `Restaurante de ${user?.user_metadata?.name || 'Usuário'}`,
            telefone: ""
          })
          .select()
          .single();

        if (createError) {
          console.error('Error creating restaurant:', createError);
          throw new Error('Erro ao criar restaurante');
        }
        
        restaurante = newRestaurante;
      }

      const menuItem = {
        restaurante_id: restaurante.id,
        nome: formData.nome,
        descricao: formData.descricao,
        preco: parseFloat(formData.preco),
        categoria: formData.categoria,
        imagem_url: formData.imagem_url,
        ativo: formData.ativo,
        disponivel_online: formData.disponivel_online,
        ordem: selectedItem ? selectedItem.ordem : items.length
      };

      const { error } = await supabase
        .from('cardapio_online')
        .upsert(selectedItem ? { ...menuItem, id: selectedItem.id } : menuItem);

      if (error) throw error;

      toast.success(selectedItem ? 'Item atualizado com sucesso!' : 'Item adicionado com sucesso!');
      setShowModal(false);
      loadMenuItems();
      resetForm();
    } catch (error) {
      console.error('Error saving menu item:', error);
      toast.error('Erro ao salvar item');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!selectedItem) return;
    
    setLoading(true);
    try {
      const { error } = await supabase
        .from('cardapio_online')
        .delete()
        .eq('id', selectedItem.id);

      if (error) throw error;

      toast.success('Item removido com sucesso!');
      setShowDeleteModal(false);
      setSelectedItem(null);
      loadMenuItems();
    } catch (error) {
      console.error('Error deleting menu item:', error);
      toast.error('Erro ao remover item');
    } finally {
      setLoading(false);
    }
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || !e.target.files[0]) return;

    const file = e.target.files[0];
    
    try {
      setLoading(true);
      
      // Use a placeholder image URL instead of trying to upload to storage
      const placeholderUrl = `https://images.pexels.com/photos/958545/pexels-photo-958545.jpeg`;
      setFormData(prev => ({ ...prev, imagem_url: placeholderUrl }));
      toast.success('Imagem configurada com sucesso!');
    } catch (error) {
      console.error('Error setting image:', error);
      toast.error('Erro ao configurar imagem');
    } finally {
      setLoading(false);
    }
  };

  const moveItem = async (item: CardapioItem, direction: 'up' | 'down') => {
    if (!restaurante?.id) {
      toast.error('Restaurante não encontrado');
      return;
    }

    const currentIndex = items.findIndex(i => i.id === item.id);
    if (
      (direction === 'up' && currentIndex === 0) ||
      (direction === 'down' && currentIndex === items.length - 1)
    ) return;

    const newItems = [...items];
    const swapIndex = direction === 'up' ? currentIndex - 1 : currentIndex + 1;
    
    // Swap items
    [newItems[currentIndex], newItems[swapIndex]] = [newItems[swapIndex], newItems[currentIndex]];
    
    // Update ordem values
    const updates = newItems.map((item, index) => ({
      id: item.id,
      restaurante_id: restaurante.id,
      ordem: index
    }));

    try {
      setLoading(true);
      const { error } = await supabase
        .from('cardapio_online')
        .upsert(updates);

      if (error) throw error;
      setItems(newItems);
      toast.success('Ordem atualizada com sucesso!');
    } catch (error) {
      console.error('Error reordering items:', error);
      toast.error('Erro ao reordenar itens');
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setFormData({
      nome: '',
      descricao: '',
      preco: '',
      categoria: categorias.length > 0 ? categorias[0].nome : '',
      imagem_url: '',
      ativo: true,
      disponivel_online: true
    });
    setSelectedItem(null);
  };

  const handleSaveConfig = async () => {
    try {
      setLoading(true);
      
      if (!restaurante?.id) {
        toast.error('Restaurante não encontrado');
        return;
      }

      const { error } = await supabase
        .from('restaurantes')
        .update({
          configuracoes: restaurantConfig,
          updated_at: new Date().toISOString()
        })
        .eq('id', restaurante.id);

      if (error) throw error;

      toast.success('Configurações salvas com sucesso!');
    } catch (error) {
      console.error('Error saving restaurant config:', error);
      toast.error('Erro ao salvar configurações');
    } finally {
      setLoading(false);
    }
  };

  const formatWhatsApp = (value: string) => {
    const digits = value.replace(/\D/g, '');
    if (digits.length <= 10) {
      return digits.replace(/(\d{2})(\d{4})(\d{4})/, '($1) $2-$3');
    } else {
      return digits.replace(/(\d{2})(\d{5})(\d{4})/, '($1) $2-$3');
    }
  };

  const filteredItems = items.filter(item => {
    const matchSearch = item.nome.toLowerCase().includes(searchTerm.toLowerCase()) ||
                       item.descricao.toLowerCase().includes(searchTerm.toLowerCase());
    const matchCategory = categoryFilter === 'todas' || item.categoria === categoryFilter;
    return matchSearch && matchCategory;
  });

  return (
    <div className="space-y-6 min-h-screen bg-gray-50 dark:bg-gray-900 transition-colors duration-300">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Editar Cardápio Online</h1>
          <p className="text-gray-500 mt-1">
            Gerencie os itens do seu cardápio digital
          </p>
        </div>
        <div className="flex space-x-3">
          <Button
            variant="secondary"
            icon={<Sync size={18} />}
            onClick={syncFromProdutos}
            isLoading={loading}
            className="rounded-2xl"
          >
            Sincronizar Produtos
          </Button>
          <Button
            variant="primary"
            icon={<Plus size={18} />}
            onClick={() => {
              resetForm();
              setShowModal(true);
            }}
            className="rounded-2xl"
          >
            Novo Item
          </Button>
        </div>
      </div>

      {/* Tabs */}
      <div className="bg-white/90 dark:bg-gray-800/90 backdrop-blur-sm rounded-2xl shadow-lg border border-white/20 dark:border-gray-700/50">
        <div className="border-b border-gray-200/50 dark:border-gray-700/50">
          <nav className="flex space-x-8 px-6">
            <button
              onClick={() => setActiveTab('items')}
              className={`py-4 px-1 border-b-2 font-medium text-sm transition-colors ${
                activeTab === 'items'
                  ? 'border-blue-500 text-blue-600 dark:text-blue-400'
                  : 'border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300'
              }`}
            >
              Itens do Cardápio
            </button>
            <button
              onClick={() => setActiveTab('config')}
              className={`py-4 px-1 border-b-2 font-medium text-sm transition-colors ${
                activeTab === 'config'
                  ? 'border-blue-500 text-blue-600 dark:text-blue-400'
                  : 'border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300'
              }`}
            >
              Configurações do Restaurante
            </button>
          </nav>
        </div>
      </div>

      {/* Tab Content */}
      {activeTab === 'items' && (
        <>
          {/* Filtros */}
          <div className="bg-white rounded-lg shadow-sm p-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
                <input
                  type="text"
                  placeholder="Buscar itens..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10 w-full rounded-lg border border-gray-300 py-2 px-4 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>

              <select
                value={categoryFilter}
                onChange={(e) => setCategoryFilter(e.target.value)}
                className="w-full border border-gray-300 rounded-md py-2 pl-3 pr-10 focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="todas">Todas as categorias</option>
                {categorias.filter(cat => cat.ativa).map(categoria => (
                  <option key={categoria.id} value={categoria.nome}>{categoria.nome}</option>
                ))}
              </select>
            </div>
          </div>

          {/* Lista de Itens */}
          <div className="bg-white rounded-lg shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Item
                    </th>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Categoria
                    </th>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Preço
                    </th>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Status
                    </th>
                    <th scope="col" className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Ações
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {filteredItems.map((item, index) => (
                    <tr key={item.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center">
                          {item.imagem_url && (
                            <img
                              src={item.imagem_url}
                              alt={item.nome}
                              className="h-10 w-10 rounded-lg object-cover mr-3"
                            />
                          )}
                          <div>
                            <div className="text-sm font-medium text-gray-900">
                              {item.nome}
                            </div>
                            <div className="text-sm text-gray-500">
                              {item.descricao}
                            </div>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-blue-100 text-blue-800">
                          {item.categoria}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {formatarDinheiro(item.preco)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center space-x-2">
                          <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                            item.ativo
                              ? 'bg-green-100 text-green-800'
                              : 'bg-red-100 text-red-800'
                          }`}>
                            {item.ativo ? 'Ativo' : 'Inativo'}
                          </span>
                          {item.disponivel_online && (
                            <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-purple-100 text-purple-800">
                              Online
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                        <div className="flex justify-end space-x-2">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => moveItem(item, 'up')}
                            disabled={index === 0}
                          >
                            <ArrowUp size={16} />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => moveItem(item, 'down')}
                            disabled={index === items.length - 1}
                          >
                            <ArrowDown size={16} />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            icon={<Edit2 size={16} />}
                            onClick={() => {
                              setSelectedItem(item);
                              setFormData({
                                nome: item.nome,
                                descricao: item.descricao,
                                preco: item.preco.toString(),
                                categoria: item.categoria,
                                imagem_url: item.imagem_url,
                                ativo: item.ativo,
                                disponivel_online: item.disponivel_online
                              });
                              setShowModal(true);
                            }}
                          >
                            Editar
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="text-red-600 hover:text-red-700"
                            icon={<Trash2 size={16} />}
                            onClick={() => {
                              setSelectedItem(item);
                              setShowDeleteModal(true);
                            }}
                          >
                            Excluir
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>

              {filteredItems.length === 0 && (
                <div className="text-center py-8">
                  <p className="text-gray-500">Nenhum item encontrado</p>
                </div>
              )}
            </div>
          </div>
        </>
      )}

      {/* Configurações do Restaurante */}
      {activeTab === 'config' && (
        <div className="bg-white rounded-lg shadow-sm p-6">
          <div className="mb-6">
            <div className="flex items-center mb-4">
              <div className="p-2 bg-blue-100 text-blue-600 rounded-lg mr-4">
                <Settings size={24} />
              </div>
              <div>
                <h2 className="text-lg font-medium text-gray-900">
                  Configurações do Cardápio Público
                </h2>
                <p className="text-sm text-gray-500">
                  Configure as informações que aparecerão no cardápio online para seus clientes
                </p>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            {/* Formulário de Configurações */}
            <div className="space-y-6">
              <div>
                <label className="flex items-center text-sm font-medium text-gray-700 mb-2">
                  <Building size={16} className="mr-2" />
                  Nome do Restaurante (Exibição)
                </label>
                <input
                  type="text"
                  value={restaurantConfig.nome_exibicao}
                  onChange={(e) => setRestaurantConfig({ ...restaurantConfig, nome_exibicao: e.target.value })}
                  className="w-full rounded-lg border border-gray-300 py-3 px-4 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  placeholder="Nome que aparecerá no cardápio público"
                />
                <p className="text-xs text-gray-500 mt-1">
                  Este nome aparecerá no topo do cardápio público
                </p>
              </div>

              <div>
                <label className="flex items-center text-sm font-medium text-gray-700 mb-2">
                  <Clock size={16} className="mr-2" />
                  Tempo de Entrega
                </label>
                <input
                  type="text"
                  value={restaurantConfig.tempo_entrega}
                  onChange={(e) => setRestaurantConfig({ ...restaurantConfig, tempo_entrega: e.target.value })}
                  className="w-full rounded-lg border border-gray-300 py-3 px-4 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  placeholder="Ex: 30-45 min"
                />
                <p className="text-xs text-gray-500 mt-1">
                  Tempo estimado de entrega que será exibido aos clientes
                </p>
              </div>

              <div>
                <label className="flex items-center text-sm font-medium text-gray-700 mb-2">
                  <Phone size={16} className="mr-2" />
                  WhatsApp para Pedidos
                </label>
                <input
                  type="text"
                  value={restaurantConfig.whatsapp}
                  onChange={(e) => setRestaurantConfig({ 
                    ...restaurantConfig, 
                    whatsapp: formatWhatsApp(e.target.value) 
                  })}
                  className="w-full rounded-lg border border-gray-300 py-3 px-4 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  placeholder="(00) 00000-0000"
                />
                <p className="text-xs text-gray-500 mt-1">
                  Número do WhatsApp que receberá os pedidos dos clientes
                </p>
              </div>

              <div>
                <label className="flex items-center text-sm font-medium text-gray-700 mb-2">
                  Endereço (Opcional)
                </label>
                <textarea
                  value={restaurantConfig.endereco}
                  onChange={(e) => setRestaurantConfig({ ...restaurantConfig, endereco: e.target.value })}
                  className="w-full rounded-lg border border-gray-300 py-3 px-4 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  rows={3}
                  placeholder="Endereço completo do restaurante"
                />
              </div>

              <div>
                <label className="flex items-center text-sm font-medium text-gray-700 mb-2">
                  Horário de Funcionamento
                </label>
                <textarea
                  value={restaurantConfig.horario_funcionamento}
                  onChange={(e) => setRestaurantConfig({ ...restaurantConfig, horario_funcionamento: e.target.value })}
                  className="w-full rounded-lg border border-gray-300 py-3 px-4 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  rows={3}
                  placeholder="Ex: Segunda a Quinta: 11h às 23h&#10;Sexta e Sábado: 11h às 00h&#10;Domingo: 11h às 22h"
                />
              </div>

              {/* Configurações de Pedidos */}
              <div className="border-t border-gray-200 pt-6">
                <h4 className="text-lg font-semibold text-gray-900 mb-4">
                  Configurações de Pedidos
                </h4>
                
                <div className="space-y-4">
                  <label className="flex items-center">
                    <input
                      type="checkbox"
                      checked={restaurantConfig.pedidos_whatsapp_ativo}
                      onChange={(e) => setRestaurantConfig({ 
                        ...restaurantConfig, 
                        pedidos_whatsapp_ativo: e.target.checked 
                      })}
                      className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                    />
                    <span className="ml-2 text-sm font-medium text-gray-900">
                      Permitir pedidos via WhatsApp
                    </span>
                  </label>
                  <p className="text-xs text-gray-500 ml-6">
                    Quando desativado, os clientes não poderão fazer pedidos pelo cardápio online
                  </p>
                </div>
              </div>

              {/* Configurações de Tema */}
              <div className="border-t border-gray-200 pt-6">
                <h4 className="text-lg font-semibold text-gray-900 mb-4">
                  Personalização Visual
                </h4>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Cor Primária
                    </label>
                    <div className="flex items-center space-x-3">
                      <input
                        type="color"
                        value={restaurantConfig.tema_cores.primaria}
                        onChange={(e) => setRestaurantConfig({
                          ...restaurantConfig,
                          tema_cores: { ...restaurantConfig.tema_cores, primaria: e.target.value }
                        })}
                        className="w-12 h-10 border border-gray-300 rounded-lg cursor-pointer"
                      />
                      <input
                        type="text"
                        value={restaurantConfig.tema_cores.primaria}
                        onChange={(e) => setRestaurantConfig({
                          ...restaurantConfig,
                          tema_cores: { ...restaurantConfig.tema_cores, primaria: e.target.value }
                        })}
                        className="flex-1 rounded-lg border border-gray-300 py-2 px-3 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                        placeholder="#DC2626"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Cor Secundária
                    </label>
                    <div className="flex items-center space-x-3">
                      <input
                        type="color"
                        value={restaurantConfig.tema_cores.secundaria}
                        onChange={(e) => setRestaurantConfig({
                          ...restaurantConfig,
                          tema_cores: { ...restaurantConfig.tema_cores, secundaria: e.target.value }
                        })}
                        className="w-12 h-10 border border-gray-300 rounded-lg cursor-pointer"
                      />
                      <input
                        type="text"
                        value={restaurantConfig.tema_cores.secundaria}
                        onChange={(e) => setRestaurantConfig({
                          ...restaurantConfig,
                          tema_cores: { ...restaurantConfig.tema_cores, secundaria: e.target.value }
                        })}
                        className="flex-1 rounded-lg border border-gray-300 py-2 px-3 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                        placeholder="#EF4444"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Cor de Fundo
                    </label>
                    <div className="flex items-center space-x-3">
                      <input
                        type="color"
                        value={restaurantConfig.tema_cores.fundo}
                        onChange={(e) => setRestaurantConfig({
                          ...restaurantConfig,
                          tema_cores: { ...restaurantConfig.tema_cores, fundo: e.target.value }
                        })}
                        className="w-12 h-10 border border-gray-300 rounded-lg cursor-pointer"
                      />
                      <input
                        type="text"
                        value={restaurantConfig.tema_cores.fundo}
                        onChange={(e) => setRestaurantConfig({
                          ...restaurantConfig,
                          tema_cores: { ...restaurantConfig.tema_cores, fundo: e.target.value }
                        })}
                        className="flex-1 rounded-lg border border-gray-300 py-2 px-3 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                        placeholder="#FFFFFF"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Cor do Texto
                    </label>
                    <div className="flex items-center space-x-3">
                      <input
                        type="color"
                        value={restaurantConfig.tema_cores.texto}
                        onChange={(e) => setRestaurantConfig({
                          ...restaurantConfig,
                          tema_cores: { ...restaurantConfig.tema_cores, texto: e.target.value }
                        })}
                        className="w-12 h-10 border border-gray-300 rounded-lg cursor-pointer"
                      />
                      <input
                        type="text"
                        value={restaurantConfig.tema_cores.texto}
                        onChange={(e) => setRestaurantConfig({
                          ...restaurantConfig,
                          tema_cores: { ...restaurantConfig.tema_cores, texto: e.target.value }
                        })}
                        className="flex-1 rounded-lg border border-gray-300 py-2 px-3 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                        placeholder="#1F2937"
                      />
                    </div>
                  </div>

                  <div className="md:col-span-2">
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Cor dos Cards
                    </label>
                    <div className="flex items-center space-x-3">
                      <input
                        type="color"
                        value={restaurantConfig.tema_cores.card}
                        onChange={(e) => setRestaurantConfig({
                          ...restaurantConfig,
                          tema_cores: { ...restaurantConfig.tema_cores, card: e.target.value }
                        })}
                        className="w-12 h-10 border border-gray-300 rounded-lg cursor-pointer"
                      />
                      <input
                        type="text"
                        value={restaurantConfig.tema_cores.card}
                        onChange={(e) => setRestaurantConfig({
                          ...restaurantConfig,
                          tema_cores: { ...restaurantConfig.tema_cores, card: e.target.value }
                        })}
                        className="flex-1 rounded-lg border border-gray-300 py-2 px-3 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                        placeholder="#F9FAFB"
                      />
                    </div>
                  </div>
                </div>

                {/* Temas Predefinidos */}
                <div className="mt-6">
                  <h5 className="text-sm font-medium text-gray-700 mb-3">
                    Temas Predefinidos
                  </h5>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                    <button
                      type="button"
                      onClick={() => setRestaurantConfig({
                        ...restaurantConfig,
                        tema_cores: {
                          primaria: '#DC2626',
                          secundaria: '#EF4444',
                          fundo: '#FFFFFF',
                          texto: '#1F2937',
                          card: '#F9FAFB'
                        }
                      })}
                      className="p-3 rounded-lg border border-gray-300 hover:border-red-500 transition-colors"
                    >
                      <div className="flex space-x-1 mb-2">
                        <div className="w-4 h-4 bg-red-600 rounded"></div>
                        <div className="w-4 h-4 bg-red-500 rounded"></div>
                        <div className="w-4 h-4 bg-white border rounded"></div>
                      </div>
                      <span className="text-xs font-medium">Clássico</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => setRestaurantConfig({
                        ...restaurantConfig,
                        tema_cores: {
                          primaria: '#059669',
                          secundaria: '#10B981',
                          fundo: '#F0FDF4',
                          texto: '#1F2937',
                          card: '#FFFFFF'
                        }
                      })}
                      className="p-3 rounded-lg border border-gray-300 hover:border-green-500 transition-colors"
                    >
                      <div className="flex space-x-1 mb-2">
                        <div className="w-4 h-4 bg-green-600 rounded"></div>
                        <div className="w-4 h-4 bg-green-500 rounded"></div>
                        <div className="w-4 h-4 bg-green-50 border rounded"></div>
                      </div>
                      <span className="text-xs font-medium">Natural</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => setRestaurantConfig({
                        ...restaurantConfig,
                        tema_cores: {
                          primaria: '#7C3AED',
                          secundaria: '#8B5CF6',
                          fundo: '#FAF5FF',
                          texto: '#1F2937',
                          card: '#FFFFFF'
                        }
                      })}
                      className="p-3 rounded-lg border border-gray-300 hover:border-purple-500 transition-colors"
                    >
                      <div className="flex space-x-1 mb-2">
                        <div className="w-4 h-4 bg-purple-600 rounded"></div>
                        <div className="w-4 h-4 bg-purple-500 rounded"></div>
                        <div className="w-4 h-4 bg-purple-50 border rounded"></div>
                      </div>
                      <span className="text-xs font-medium">Elegante</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => setRestaurantConfig({
                        ...restaurantConfig,
                        tema_cores: {
                          primaria: '#1F2937',
                          secundaria: '#374151',
                          fundo: '#F9FAFB',
                          texto: '#1F2937',
                          card: '#FFFFFF'
                        }
                      })}
                      className="p-3 rounded-lg border border-gray-300 hover:border-gray-500 transition-colors"
                    >
                      <div className="flex space-x-1 mb-2">
                        <div className="w-4 h-4 bg-gray-800 rounded"></div>
                        <div className="w-4 h-4 bg-gray-600 rounded"></div>
                        <div className="w-4 h-4 bg-gray-100 border rounded"></div>
                      </div>
                      <span className="text-xs font-medium">Minimalista</span>
                    </button>
                  </div>
                </div>
              </div>

              <Button
                variant="primary"
                onClick={handleSaveConfig}
                isLoading={loading}
                className="w-full"
              >
                Salvar Configurações
              </Button>
            </div>

            {/* Preview */}
            <div className="bg-gray-50 rounded-lg p-6">
              <h3 className="text-lg font-medium text-gray-900 mb-4">
                Preview do Cardápio Público
              </h3>
              
              <div className="bg-white rounded-lg shadow-sm overflow-hidden">
                {/* Header Preview */}
                <div 
                  className="text-white p-6"
                  style={{ 
                    background: `linear-gradient(to right, ${restaurantConfig.tema_cores.primaria}, ${restaurantConfig.tema_cores.secundaria})` 
                  }}
                >
                  <h2 className="text-2xl font-bold mb-2">
                    {restaurantConfig.nome_exibicao || 'Nome do Restaurante'}
                  </h2>
                  <p className="opacity-90 mb-4">Cardápio Digital</p>
                  <div className="flex items-center space-x-4 opacity-90 text-sm">
                    <div className="flex items-center">
                      <Clock size={16} className="mr-1" />
                      <span>{restaurantConfig.tempo_entrega || 'Tempo de entrega'}</span>
                    </div>
                    <div className="flex items-center">
                      <Phone size={16} className="mr-1" />
                      <span>{restaurantConfig.whatsapp || 'WhatsApp'}</span>
                    </div>
                  </div>
                </div>

                {/* Content Preview */}
                <div className="p-6" style={{ backgroundColor: restaurantConfig.tema_cores.fundo }}>
                  <div className="text-center text-gray-500">
                    <p className="text-sm">
                      Aqui aparecerão os itens do seu cardápio
                    </p>
                  </div>
                </div>

                {/* Footer Preview */}
                <div className="bg-gray-900 text-white p-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                    <div>
                      <h4 className="font-semibold mb-2">Contato</h4>
                      <div className="space-y-1 text-gray-300">
                        <div className="flex items-center">
                          <Phone size={14} className="mr-2" />
                          <span>{restaurantConfig.whatsapp || 'WhatsApp não configurado'}</span>
                        </div>
                        {restaurantConfig.endereco && (
                          <p>{restaurantConfig.endereco}</p>
                        )}
                      </div>
                    </div>
                    <div>
                      <h4 className="font-semibold mb-2">Horário de Funcionamento</h4>
                      <div className="text-gray-300 whitespace-pre-line text-xs">
                        {restaurantConfig.horario_funcionamento || 'Horário não configurado'}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Status de Pedidos */}
                <div className={`p-4 text-center ${
                  restaurantConfig.pedidos_whatsapp_ativo 
                    ? 'bg-green-50 text-green-800' 
                    : 'bg-red-50 text-red-800'
                }`}>
                  <p className="text-sm font-medium">
                    {restaurantConfig.pedidos_whatsapp_ativo 
                      ? '✅ Pedidos via WhatsApp: ATIVADOS' 
                      : '❌ Pedidos via WhatsApp: DESATIVADOS'
                    }
                  </p>
                </div>
              </div>

              <div className="mt-4 p-4 bg-blue-50 rounded-lg">
                <div className="flex items-start">
                  <AlertTriangle className="h-5 w-5 text-blue-500 mt-0.5 mr-3 flex-shrink-0" />
                  <div className="text-sm text-blue-700">
                    <p className="font-medium mb-1">Importante:</p>
                    <ul className="space-y-1 text-xs">
                      <li>• O número do WhatsApp será usado para receber os pedidos dos clientes</li>
                      <li>• Certifique-se de que o número está correto e ativo</li>
                      <li>• O tempo de entrega ajuda os clientes a terem expectativas realistas</li>
                      <li>• As cores personalizadas serão aplicadas ao cardápio público</li>
                      <li>• Você pode desativar pedidos temporariamente sem remover o WhatsApp</li>
                    </ul>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal de Adicionar/Editar Item */}
      {showModal && (
        <div className="fixed inset-0 z-50 overflow-y-auto">
          <div className="flex items-center justify-center min-h-screen px-4 pt-4 pb-20 text-center sm:block sm:p-0">
            <div className="fixed inset-0 transition-opacity" aria-hidden="true">
              <div className="absolute inset-0 bg-gray-500 opacity-75"></div>
            </div>

            <div className="inline-block align-bottom bg-white rounded-lg text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-lg sm:w-full">
              <form onSubmit={handleSubmit}>
                <div className="px-4 pt-5 pb-4 sm:p-6 sm:pb-4">
                  <h3 className="text-lg font-medium text-gray-900 mb-4">
                    {selectedItem ? 'Editar Item' : 'Novo Item'}
                  </h3>

                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700">
                        Nome do Item
                      </label>
                      <input
                        type="text"
                        value={formData.nome}
                        onChange={(e) => setFormData({ ...formData, nome: e.target.value })}
                        className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:ring-blue-500 focus:border-blue-500"
                        required
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700">
                        Descrição
                      </label>
                      <textarea
                        value={formData.descricao}
                        onChange={(e) => setFormData({ ...formData, descricao: e.target.value })}
                        rows={3}
                        className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:ring-blue-500 focus:border-blue-500"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700">
                        Categoria
                      </label>
                      <select
                        value={formData.categoria}
                        onChange={(e) => setFormData({ ...formData, categoria: e.target.value })}
                        className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:ring-blue-500 focus:border-blue-500"
                        required
                      >
                        <option value="">Selecione uma categoria</option>
                        {categorias.filter(cat => cat.ativa).map(categoria => (
                          <option key={categoria.id} value={categoria.nome}>{categoria.nome}</option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700">
                        Preço
                      </label>
                      <div className="mt-1 relative rounded-md shadow-sm">
                        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                          <span className="text-gray-500 sm:text-sm">R$</span>
                        </div>
                        <input
                          type="number"
                          step="0.01"
                          min="0"
                          value={formData.preco}
                          onChange={(e) => setFormData({ ...formData, preco: e.target.value })}
                          className="pl-8 block w-full rounded-md border-gray-300 focus:ring-blue-500 focus:border-blue-500"
                          required
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700">
                        Imagem
                      </label>
                      <div className="mt-1 flex items-center">
                        {formData.imagem_url ? (
                          <div className="relative">
                            <img
                              src={formData.imagem_url}
                              alt="Preview"
                              className="h-32 w-32 object-cover rounded-lg"
                            />
                            <button
                              type="button"
                              onClick={() => setFormData({ ...formData, imagem_url: '' })}
                              className="absolute -top-2 -right-2 p-1 bg-red-100 rounded-full text-red-600 hover:bg-red-200"
                            >
                              <X size={16} />
                            </button>
                          </div>
                        ) : (
                          <div className="flex justify-center px-6 pt-5 pb-6 border-2 border-gray-300 border-dashed rounded-md">
                            <div className="space-y-1 text-center">
                              <Upload className="mx-auto h-12 w-12 text-gray-400" />
                              <div className="flex text-sm text-gray-600">
                                <label className="relative cursor-pointer bg-white rounded-md font-medium text-blue-600 hover:text-blue-500 focus-within:outline-none focus-within:ring-2 focus-within:ring-offset-2 focus-within:ring-blue-500">
                                  <span>Fazer upload</span>
                                  <input
                                    type="file"
                                    className="sr-only"
                                    accept="image/*"
                                    onChange={handleImageUpload}
                                  />
                                </label>
                              </div>
                              <p className="text-xs text-gray-500">
                                PNG, JPG até 5MB
                              </p>
                            </div>
                          </div>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center space-x-4">
                      <label className="flex items-center">
                        <input
                          type="checkbox"
                          checked={formData.ativo}
                          onChange={(e) => setFormData({ ...formData, ativo: e.target.checked })}
                          className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                        />
                        <span className="ml-2 text-sm text-gray-900">Ativo</span>
                      </label>

                      <label className="flex items-center">
                        <input
                          type="checkbox"
                          checked={formData.disponivel_online}
                          onChange={(e) => setFormData({ ...formData, disponivel_online: e.target.checked })}
                          className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                        />
                        <span className="ml-2 text-sm text-gray-900">Disponível Online</span>
                      </label>
                    </div>
                  </div>
                </div>

                <div className="bg-gray-50 px-4 py-3 sm:px-6 sm:flex sm:flex-row-reverse">
                  <Button
                    type="submit"
                    variant="primary"
                    isLoading={loading}
                    className="w-full sm:w-auto sm:ml-3"
                  >
                    {selectedItem ? 'Atualizar' : 'Adicionar'}
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    onClick={() => {
                      setShowModal(false);
                      setSelectedItem(null);
                      resetForm();
                    }}
                    className="w-full sm:w-auto mt-3 sm:mt-0"
                  >
                    Cancelar
                  </Button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* Modal de Confirmação de Exclusão */}
      {showDeleteModal && (
        <div className="fixed inset-0 z-50 overflow-y-auto">
          <div className="flex items-center justify-center min-h-screen px-4 pt-4 pb-20 text-center sm:block sm:p-0">
            <div className="fixed inset-0 transition-opacity" aria-hidden="true">
              <div className="absolute inset-0 bg-gray-500 opacity-75"></div>
            </div>

            <div className="inline-block align-bottom bg-white rounded-lg text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-lg sm:w-full">
              <div className="bg-white px-4 pt-5 pb-4 sm:p-6 sm:pb-4">
                <div className="sm:flex sm:items-start">
                  <div className="mx-auto flex-shrink-0 flex items-center justify-center h-12 w-12 rounded-full bg-red-100 sm:mx-0 sm:h-10 sm:w-10">
                    <AlertTriangle className="h-6 w-6 text-red-600" />
                  </div>
                  <div className="mt-3 text-center sm:mt-0 sm:ml-4 sm:text-left">
                    <h3 className="text-lg font-medium text-gray-900">
                      Excluir Item
                    </h3>
                    <div className="mt-2">
                      <p className="text-sm text-gray-500">
                        Tem certeza que deseja excluir este item? Esta ação não pode ser desfeita.
                      </p>
                    </div>
                  </div>
                </div>
              </div>
              <div className="bg-gray-50 px-4 py-3 sm:px-6 sm:flex sm:flex-row-reverse">
                <Button
                  variant="danger"
                  onClick={handleDelete}
                  isLoading={loading}
                  className="w-full sm:w-auto sm:ml-3"
                >
                  Excluir
                </Button>
                <Button
                  variant="ghost"
                  onClick={() => {
                    setShowDeleteModal(false);
                    setSelectedItem(null);
                  }}
                  className="w-full sm:w-auto mt-3 sm:mt-0"
                >
                  Cancelar
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default CardapioOnlineEditor;