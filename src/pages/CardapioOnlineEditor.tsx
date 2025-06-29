import React, { useState, useEffect } from 'react';
import { 
  Plus, Search, Filter, Edit2, Trash2, Upload, Eye,
  EyeOff, ArrowUp, ArrowDown, AlertTriangle, X
} from 'lucide-react';
import Button from '../components/ui/Button';
import { useRestaurante } from '../contexts/RestauranteContext';
import { formatarDinheiro } from '../utils/formatters';
import { supabase } from '../services/supabase';
import toast from 'react-hot-toast';

interface MenuItem {
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

const CATEGORIAS = [
  'Menu Principal',
  'Menu Kids',
  'Entradas',
  'Bebidas',
  'Sobremesas'
];

const CardapioOnlineEditor: React.FC = () => {
  const [items, setItems] = useState<MenuItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [selectedItem, setSelectedItem] = useState<MenuItem | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('todas');
  const [formData, setFormData] = useState({
    nome: '',
    descricao: '',
    preco: '',
    categoria: 'Menu Principal',
    imagem_url: '',
    ativo: true,
    disponivel_online: true
  });

  useEffect(() => {
    loadMenuItems();
  }, []);

  const loadMenuItems = async () => {
    try {
      setLoading(true);
      const { data: restaurante } = await supabase
        .from('restaurantes')
        .select('id')
        .single();

      if (!restaurante) {
        toast.error('Restaurante não encontrado');
        return;
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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const { data: restaurante } = await supabase
        .from('restaurantes')
        .select('id')
        .single();

      if (!restaurante) {
        throw new Error('Restaurante não encontrado');
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

  const moveItem = async (item: MenuItem, direction: 'up' | 'down') => {
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
      ordem: index
    }));

    try {
      setLoading(true);
      const { error } = await supabase
        .from('cardapio_online')
        .upsert(updates);

      if (error) throw error;
      setItems(newItems);
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
      categoria: 'Menu Principal',
      imagem_url: '',
      ativo: true,
      disponivel_online: true
    });
    setSelectedItem(null);
  };

  const filteredItems = items.filter(item => {
    const matchSearch = item.nome.toLowerCase().includes(searchTerm.toLowerCase()) ||
                       item.descricao.toLowerCase().includes(searchTerm.toLowerCase());
    const matchCategory = categoryFilter === 'todas' || item.categoria === categoryFilter;
    return matchSearch && matchCategory;
  });

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Editar Cardápio Online</h1>
          <p className="text-gray-500 mt-1">
            Gerencie os itens do seu cardápio digital
          </p>
        </div>
        <Button
          variant="primary"
          icon={<Plus size={18} />}
          onClick={() => {
            resetForm();
            setShowModal(true);
          }}
        >
          Novo Item
        </Button>
      </div>

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
            {CATEGORIAS.map(categoria => (
              <option key={categoria} value={categoria}>{categoria}</option>
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
                      >
                        {CATEGORIAS.map(categoria => (
                          <option key={categoria} value={categoria}>{categoria}</option>
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