import React, { useState, useEffect } from 'react';
import { Plus, Search, Edit, Trash2, Package, DollarSign, Tag, Image, Upload, X, Loader2 } from 'lucide-react';
import Button from '../components/ui/Button';
import { CRUDService } from '../services/CRUDService';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../services/supabase';
import toast from 'react-hot-toast';

interface Produto {
  id: string;
  nome: string;
  descricao: string;
  preco: number;
  categoria: string;
  disponivel: boolean;
  imagem_url?: string;
  created_at: string;
  updated_at: string;
}

export default function Produtos() {
  const { user } = useAuth();
  const [produtos, setProdutos] = useState<Produto[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Produto | null>(null);
  const [uploadingImage, setUploadingImage] = useState(false);
  const [imagePreview, setImagePreview] = useState<string>('');

  const [formData, setFormData] = useState({
    nome: '',
    descricao: '',
    preco: '',
    categoria: '',
    disponivel: true,
    imagem_url: ''
  });

  const categorias = ['Entradas', 'Pratos Principais', 'Sobremesas', 'Bebidas', 'Lanches'];

  useEffect(() => {
    loadProdutos();
  }, []);

  const loadProdutos = async () => {
    try {
      setLoading(true);
      const data = await CRUDService.read('produtos');
      setProdutos(data || []);
    } catch (error) {
      console.error('Erro ao carregar produtos:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      // Get restaurant ID first
      const { data: restaurante, error: restauranteError } = await supabase
        .from('restaurantes')
        .select('id')
        .eq('user_id', user?.id)
        .single();

      if (restauranteError) {
        console.error('Error getting restaurant:', restauranteError);
        throw new Error('Restaurante não encontrado');
      }

      const productData = {
        ...formData,
        preco: parseFloat(formData.preco),
        restaurante_id: restaurante.id
      };

      if (editingProduct) {
        await CRUDService.update('produtos', editingProduct.id, productData);
      } else {
        await CRUDService.create('produtos', productData);
      }

      await loadProdutos();
      resetForm();
      setShowModal(false);
    } catch (error) {
      console.error('Erro ao salvar produto:', error);
    }
  };

  const handleEdit = (produto: Produto) => {
    setEditingProduct(produto);
    setImagePreview(produto.imagem_url || '');
    setFormData({
      nome: produto.nome,
      descricao: produto.descricao,
      preco: produto.preco.toString(),
      categoria: produto.categoria,
      disponivel: produto.disponivel,
      imagem_url: produto.imagem_url || ''
    });
    setShowModal(true);
  };

  const handleDelete = async (id: string) => {
    if (confirm('Tem certeza que deseja excluir este produto?')) {
      try {
        await CRUDService.delete('produtos', id);
        await loadProdutos();
      } catch (error) {
        console.error('Erro ao excluir produto:', error);
      }
    }
  };

  const resetForm = () => {
    setFormData({
      nome: '',
      descricao: '',
      preco: '',
      categoria: '',
      disponivel: true,
      imagem_url: ''
    });
    setEditingProduct(null);
    setImagePreview('');
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file type
    if (!file.type.startsWith('image/')) {
      toast.error('Por favor, selecione apenas arquivos de imagem');
      return;
    }

    // Validate file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      toast.error('A imagem deve ter no máximo 5MB');
      return;
    }

    setUploadingImage(true);
    try {
      // Generate unique filename
      const fileExt = file.name.split('.').pop();
      const fileName = `${Date.now()}_${file.name.replace(/[^a-zA-Z0-9.-]/g, '_')}`;
      const filePath = `${fileName}`;

      // Upload to Supabase Storage
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('produtos')
        .upload(filePath, file, {
          cacheControl: '3600',
          upsert: false
        });

      if (uploadError) {
        console.error('Upload error:', uploadError);
        throw new Error('Erro ao fazer upload da imagem');
      }

      // Get public URL
      const { data: { publicUrl } } = supabase.storage
        .from('produtos')
        .getPublicUrl(filePath);

      // Update form data and preview
      setFormData(prev => ({ ...prev, imagem_url: publicUrl }));
      setImagePreview(publicUrl);
      
      toast.success('Imagem enviada com sucesso!');
    } catch (error) {
      console.error('Error uploading image:', error);
      toast.error(error instanceof Error ? error.message : 'Erro ao enviar imagem');
    } finally {
      setUploadingImage(false);
    }
  };

  const removeImage = () => {
    setFormData(prev => ({ ...prev, imagem_url: '' }));
    setImagePreview('');
  };

  const filteredProdutos = produtos.filter(produto => {
    const matchesSearch = produto.nome.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         produto.descricao.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCategory = !selectedCategory || produto.categoria === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-3">
            <Package className="w-8 h-8 text-blue-600" />
            Produtos
          </h1>
          <p className="text-gray-600 mt-2">Gerencie o cardápio do seu restaurante</p>
        </div>
        <Button
          onClick={() => {
            resetForm();
            setShowModal(true);
          }}
          className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-lg flex items-center gap-2 transition-colors"
        >
          <Plus className="w-5 h-5" />
          Novo Produto
        </Button>
      </div>

      {/* Filtros */}
      <div className="bg-white rounded-lg shadow-sm border p-6 mb-6">
        <div className="flex flex-col md:flex-row gap-4">
          <div className="flex-1">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
              <input
                type="text"
                placeholder="Buscar produtos..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
          </div>
          <select
            value={selectedCategory}
            onChange={(e) => setSelectedCategory(e.target.value)}
            className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          >
            <option value="">Todas as categorias</option>
            {categorias.map(categoria => (
              <option key={categoria} value={categoria}>{categoria}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Lista de Produtos */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredProdutos.map((produto) => (
          <div key={produto.id} className="bg-white rounded-lg shadow-sm border overflow-hidden hover:shadow-md transition-shadow">
            {produto.imagem_url && (
              <img
                src={produto.imagem_url}
                alt={produto.nome}
                className="w-full h-48 object-cover"
              />
            )}
            <div className="p-6">
              <div className="flex justify-between items-start mb-3">
                <h3 className="text-lg font-semibold text-gray-900">{produto.nome}</h3>
                <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                  produto.disponivel 
                    ? 'bg-green-100 text-green-800' 
                    : 'bg-red-100 text-red-800'
                }`}>
                  {produto.disponivel ? 'Disponível' : 'Indisponível'}
                </span>
              </div>
              
              <p className="text-gray-600 text-sm mb-3 line-clamp-2">{produto.descricao}</p>
              
              <div className="flex items-center gap-4 mb-4">
                <div className="flex items-center gap-1 text-green-600">
                  <DollarSign className="w-4 h-4" />
                  <span className="font-semibold">R$ {produto.preco.toFixed(2)}</span>
                </div>
                <div className="flex items-center gap-1 text-gray-500">
                  <Tag className="w-4 h-4" />
                  <span className="text-sm">{produto.categoria}</span>
                </div>
              </div>

              <div className="flex gap-2">
                <Button
                  onClick={() => handleEdit(produto)}
                  variant="outline"
                  size="sm"
                  className="flex-1 flex items-center justify-center gap-2"
                >
                  <Edit className="w-4 h-4" />
                  Editar
                </Button>
                <Button
                  onClick={() => handleDelete(produto.id)}
                  variant="outline"
                  size="sm"
                  className="flex items-center justify-center gap-2 text-red-600 border-red-200 hover:bg-red-50"
                >
                  <Trash2 className="w-4 h-4" />
                  Excluir
                </Button>
              </div>
            </div>
          </div>
        ))}
      </div>

      {filteredProdutos.length === 0 && (
        <div className="text-center py-12">
          <Package className="w-16 h-16 text-gray-300 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">Nenhum produto encontrado</h3>
          <p className="text-gray-500">
            {searchTerm || selectedCategory 
              ? 'Tente ajustar os filtros de busca'
              : 'Comece adicionando seu primeiro produto ao cardápio'
            }
          </p>
        </div>
      )}

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg max-w-md w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <h2 className="text-xl font-semibold text-gray-900 mb-6">
                {editingProduct ? 'Editar Produto' : 'Novo Produto'}
              </h2>
              
              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Nome do Produto
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.nome}
                    onChange={(e) => setFormData({ ...formData, nome: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="Ex: Hambúrguer Artesanal"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Descrição
                  </label>
                  <textarea
                    required
                    value={formData.descricao}
                    onChange={(e) => setFormData({ ...formData, descricao: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    rows={3}
                    placeholder="Descreva o produto..."
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Preço (R$)
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      required
                      value={formData.preco}
                      onChange={(e) => setFormData({ ...formData, preco: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      placeholder="0.00"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Categoria
                    </label>
                    <select
                      required
                      value={formData.categoria}
                      onChange={(e) => setFormData({ ...formData, categoria: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    >
                      <option value="">Selecione...</option>
                      {categorias.map(categoria => (
                        <option key={categoria} value={categoria}>{categoria}</option>
                      ))}
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Imagem do Produto (opcional)
                  </label>
                  
                  {imagePreview ? (
                    <div className="relative">
                      <img
                        src={imagePreview}
                        alt="Preview do produto"
                        className="w-full h-48 object-cover rounded-lg border border-gray-300"
                      />
                      <button
                        type="button"
                        onClick={removeImage}
                        className="absolute top-2 right-2 p-1 bg-red-500 text-white rounded-full hover:bg-red-600 transition-colors"
                      >
                        <X size={16} />
                      </button>
                    </div>
                  ) : (
                    <div className="relative">
                      <input
                        type="file"
                        accept="image/*"
                        onChange={handleImageUpload}
                        className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                        disabled={uploadingImage}
                      />
                      <div className={`w-full h-32 border-2 border-dashed border-gray-300 rounded-lg flex flex-col items-center justify-center hover:border-blue-400 transition-colors ${
                        uploadingImage ? 'bg-gray-50' : 'hover:bg-gray-50'
                      }`}>
                        {uploadingImage ? (
                          <div className="flex flex-col items-center">
                            <Loader2 className="w-8 h-8 text-blue-500 animate-spin mb-2" />
                            <span className="text-sm text-gray-600">Enviando imagem...</span>
                          </div>
                        ) : (
                          <div className="flex flex-col items-center">
                            <Upload className="w-8 h-8 text-gray-400 mb-2" />
                            <span className="text-sm text-gray-600">Clique para enviar uma imagem</span>
                            <span className="text-xs text-gray-500 mt-1">PNG, JPG até 5MB</span>
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                  </div>

                <div className="flex items-center">
                  <input
                    type="checkbox"
                    id="disponivel"
                    checked={formData.disponivel}
                    onChange={(e) => setFormData({ ...formData, disponivel: e.target.checked })}
                    className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                  />
                  <label htmlFor="disponivel" className="ml-2 block text-sm text-gray-700">
                    Produto disponível
                  </label>
                </div>

                <div className="flex gap-3 pt-4">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => {
                      setShowModal(false);
                      resetForm();
                    }}
                    className="flex-1"
                  >
                    Cancelar
                  </Button>
                  <Button
                    type="submit"
                    className="flex-1 bg-blue-600 hover:bg-blue-700 text-white"
                  >
                    {editingProduct ? 'Atualizar' : 'Criar'} Produto
                  </Button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}