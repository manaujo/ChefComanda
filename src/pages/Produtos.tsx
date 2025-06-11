import React, { useState } from 'react';
import { 
  Plus, Search, Filter, Edit2, Trash2, Upload, Download, 
  FileSpreadsheet, AlertTriangle, MoreVertical, X
} from 'lucide-react';
import Button from '../components/ui/Button';
import { useRestaurante } from '../contexts/RestauranteContext';
import { formatarDinheiro } from '../utils/formatters';
import toast from 'react-hot-toast';

interface ProdutoFormData {
  nome: string;
  categoria: string;
  preco: number;
  descricao?: string;
  disponivel: boolean;
  imagem?: File;
}

const Produtos: React.FC = () => {
  const { produtos, adicionarProduto, atualizarProduto, excluirProduto } = useRestaurante();
  
  // Derive categories from products
  const categorias = Array.from(new Set(produtos?.map(produto => produto.categoria) || []));
  
  const [busca, setBusca] = useState('');
  const [categoriaSelecionada, setCategoriaSelecionada] = useState('todas');
  const [statusFiltro, setStatusFiltro] = useState<'todos' | 'ativos' | 'inativos'>('todos');
  const [visualizacao, setVisualizacao] = useState<'cards' | 'tabela'>('cards');
  const [showModal, setShowModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [produtoSelecionado, setProdutoSelecionado] = useState<any | null>(null);
  const [formData, setFormData] = useState<ProdutoFormData>({
    nome: '',
    categoria: '',
    preco: 0,
    descricao: '',
    disponivel: true
  });
  const [loading, setLoading] = useState(false);
  const [page, setPage] = useState(1);
  const itemsPerPage = 12;

  // Filtrar produtos
  const produtosFiltrados = (produtos || [])
    .filter(produto => {
      const matchBusca = produto.nome.toLowerCase().includes(busca.toLowerCase()) ||
                        (produto.descricao || '').toLowerCase().includes(busca.toLowerCase());
      const matchCategoria = categoriaSelecionada === 'todas' || produto.categoria === categoriaSelecionada;
      const matchStatus = statusFiltro === 'todos' || 
                         (statusFiltro === 'ativos' && produto.disponivel) ||
                         (statusFiltro === 'inativos' && !produto.disponivel);
      return matchBusca && matchCategoria && matchStatus;
    });

  const totalPages = Math.ceil(produtosFiltrados.length / itemsPerPage);
  const paginatedProdutos = produtosFiltrados.slice(
    (page - 1) * itemsPerPage,
    page * itemsPerPage
  );

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setFormData(prev => ({ ...prev, imagem: e.target.files![0] }));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      // Validate form data
      if (!formData.nome || !formData.categoria || formData.preco <= 0) {
        throw new Error('Preencha todos os campos obrigatórios');
      }

      if (produtoSelecionado) {
        await atualizarProduto(produtoSelecionado.id, {
          nome: formData.nome,
          categoria: formData.categoria,
          preco: formData.preco,
          descricao: formData.descricao || '',
          disponivel: formData.disponivel
        });
      } else {
        await adicionarProduto({
          nome: formData.nome,
          categoria: formData.categoria,
          preco: formData.preco,
          descricao: formData.descricao || '',
          disponivel: formData.disponivel
        });
      }
      
      setShowModal(false);
      resetForm();
    } catch (error) {
      console.error('Erro ao salvar produto:', error);
      toast.error(error instanceof Error ? error.message : 'Erro ao salvar produto');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!produtoSelecionado) return;
    
    setLoading(true);
    try {
      await excluirProduto(produtoSelecionado.id);
      setShowDeleteModal(false);
      setProdutoSelecionado(null);
    } catch (error) {
      console.error('Erro ao excluir produto:', error);
      toast.error('Erro ao excluir produto');
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setFormData({
      nome: '',
      categoria: '',
      preco: 0,
      descricao: '',
      disponivel: true
    });
    setProdutoSelecionado(null);
  };

  const editProduto = (produto: any) => {
    setProdutoSelecionado(produto);
    setFormData({
      nome: produto.nome,
      categoria: produto.categoria,
      preco: produto.preco,
      descricao: produto.descricao || '',
      disponivel: produto.disponivel
    });
    setShowModal(true);
  };

  const exportarProdutos = (formato: 'pdf' | 'excel') => {
    toast.success(`Lista de produtos exportada em ${formato.toUpperCase()}`);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Produtos</h1>
          <p className="text-gray-500 mt-1">
            Gerenciamento do menu do cardápio
          </p>
        </div>
        <div className="mt-4 md:mt-0 flex flex-wrap gap-2">
          <Button 
            variant="ghost"
            icon={<FileSpreadsheet size={18} />}
            onClick={() => exportarProdutos('excel')}
          >
            Excel
          </Button>
          <Button 
            variant="ghost"
            icon={<Download size={18} />}
            onClick={() => exportarProdutos('pdf')}
          >
            PDF
          </Button>
          <Button 
            variant="primary"
            icon={<Plus size={18} />}
            onClick={() => {
              resetForm();
              setShowModal(true);
            }}
          >
            Novo Produto
          </Button>
        </div>
      </div>

      {/* Filtros e Busca */}
      <div className="bg-white rounded-lg shadow-sm p-4">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <Search size={18} className="text-gray-400" />
            </div>
            <input
              type="text"
              placeholder="Buscar produtos..."
              value={busca}
              onChange={(e) => setBusca(e.target.value)}
              className="pl-10 pr-4 py-2 w-full border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
            />
          </div>

          <div>
            <select
              value={categoriaSelecionada}
              onChange={(e) => setCategoriaSelecionada(e.target.value)}
              className="w-full border border-gray-300 rounded-md py-2 pl-3 pr-10 focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="todas">Todas as categorias</option>
              {categorias.map((categoria) => (
                <option key={categoria} value={categoria}>
                  {categoria}
                </option>
              ))}
            </select>
          </div>

          <div>
            <select
              value={statusFiltro}
              onChange={(e) => setStatusFiltro(e.target.value as 'todos' | 'ativos' | 'inativos')}
              className="w-full border border-gray-300 rounded-md py-2 pl-3 pr-10 focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="todos">Todos os status</option>
              <option value="ativos">Ativos</option>
              <option value="inativos">Inativos</option>
            </select>
          </div>

          <div>
            <div className="flex rounded-md shadow-sm">
              <button
                onClick={() => setVisualizacao('cards')}
                className={`flex-1 px-4 py-2 text-sm font-medium rounded-l-md ${
                  visualizacao === 'cards'
                    ? 'bg-blue-50 text-blue-600 border-blue-500'
                    : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'
                } border`}
              >
                Cards
              </button>
              <button
                onClick={() => setVisualizacao('tabela')}
                className={`flex-1 px-4 py-2 text-sm font-medium rounded-r-md ${
                  visualizacao === 'tabela'
                    ? 'bg-blue-50 text-blue-600 border-blue-500'
                    : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'
                } border`}
              >
                Tabela
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Lista de Produtos */}
      {visualizacao === 'cards' ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {paginatedProdutos.map((produto) => (
            <div
              key={produto.id}
              className={`bg-white rounded-lg shadow-sm overflow-hidden border-l-4 ${
                produto.disponivel
                  ? 'border-green-500'
                  : 'border-red-500'
              }`}
            >
              <div className="p-4">
                <div className="flex justify-between items-start">
                  <div>
                    <h3 className="font-medium text-gray-900">{produto.nome}</h3>
                    <p className="text-sm text-gray-500 mt-1">{produto.descricao}</p>
                  </div>
                  <div className="relative">
                    <button
                      className="text-gray-400 hover:text-gray-600"
                      onClick={() => {
                        setProdutoSelecionado(produto);
                      }}
                    >
                      <MoreVertical size={20} />
                    </button>
                  </div>
                </div>

                <div className="mt-4 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-500">Categoria</span>
                    <span className="text-sm font-medium px-2 py-1 bg-blue-100 text-blue-800 rounded-full">
                      {produto.categoria}
                    </span>
                  </div>
                  
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-500">Preço</span>
                    <span className="font-medium text-gray-900">
                      {formatarDinheiro(produto.preco)}
                    </span>
                  </div>

                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-500">Status</span>
                    <span className={`text-sm font-medium px-2 py-1 rounded-full ${
                      produto.disponivel
                        ? 'bg-green-100 text-green-800'
                        : 'bg-red-100 text-red-800'
                    }`}>
                      {produto.disponivel ? 'Disponível' : 'Indisponível'}
                    </span>
                  </div>
                </div>

                <div className="mt-4 flex justify-end space-x-2">
                  <Button
                    variant="ghost"
                    size="sm"
                    icon={<Edit2 size={16} />}
                    onClick={() => editProduto(produto)}
                  >
                    Editar
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="text-red-600 hover:text-red-700"
                    icon={<Trash2 size={16} />}
                    onClick={() => {
                      setProdutoSelecionado(produto);
                      setShowDeleteModal(true);
                    }}
                  >
                    Excluir
                  </Button>
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="bg-white rounded-lg shadow overflow-hidden">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Produto
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
              {paginatedProdutos.map((produto) => (
                <tr key={produto.id}>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div>
                      <div className="text-sm font-medium text-gray-900">
                        {produto.nome}
                      </div>
                      <div className="text-sm text-gray-500">
                        {produto.descricao}
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-blue-100 text-blue-800">
                      {produto.categoria}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {formatarDinheiro(produto.preco)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                      produto.disponivel
                        ? 'bg-green-100 text-green-800'
                        : 'bg-red-100 text-red-800'
                    }`}>
                      {produto.disponivel ? 'Disponível' : 'Indisponível'}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                    <Button
                      variant="ghost"
                      size="sm"
                      icon={<Edit2 size={16} />}
                      onClick={() => editProduto(produto)}
                      className="mr-2"
                    >
                      Editar
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="text-red-600 hover:text-red-700"
                      icon={<Trash2 size={16} />}
                      onClick={() => {
                        setProdutoSelecionado(produto);
                        setShowDeleteModal(true);
                      }}
                    >
                      Excluir
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Paginação */}
      {totalPages > 1 && (
        <div className="flex justify-center mt-6">
          <nav className="relative z-0 inline-flex rounded-md shadow-sm -space-x-px">
            <button
              onClick={() => setPage(p => Math.max(1, p - 1))}
              disabled={page === 1}
              className="relative inline-flex items-center px-2 py-2 rounded-l-md border border-gray-300 bg-white text-sm font-medium text-gray-500 hover:bg-gray-50"
            >
              Anterior
            </button>
            {Array.from({ length: totalPages }, (_, i) => i + 1).map((p) => (
              <button
                key={p}
                onClick={() => setPage(p)}
                className={`relative inline-flex items-center px-4 py-2 border text-sm font-medium ${
                  page === p
                    ? 'z-10 bg-blue-50 border-blue-500 text-blue-600'
                    : 'bg-white border-gray-300 text-gray-500 hover:bg-gray-50'
                }`}
              >
                {p}
              </button>
            ))}
            <button
              onClick={() => setPage(p => Math.min(totalPages, p + 1))}
              disabled={page === totalPages}
              className="relative inline-flex items-center px-2 py-2 rounded-r-md border border-gray-300 bg-white text-sm font-medium text-gray-500 hover:bg-gray-50"
            >
              Próxima
            </button>
          </nav>
        </div>
      )}

      {/* Modal de Produto */}
      {showModal && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-black bg-opacity-50 flex items-center justify-center">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-2xl m-4">
            <div className="flex justify-between items-center px-6 py-4 border-b">
              <h3 className="text-lg font-medium">
                {produtoSelecionado ? 'Editar Produto' : 'Novo Produto'}
              </h3>
              <button
                onClick={() => {
                  setShowModal(false);
                  resetForm();
                }}
                className="text-gray-400 hover:text-gray-500"
              >
                <X size={24} />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-6">
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700">
                    Nome do Produto
                  </label>
                  <input
                    type="text"
                    value={formData.nome}
                    onChange={(e) => setFormData({ ...formData, nome: e.target.value })}
                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700">
                    Categoria
                  </label>
                  <select
                    value={formData.categoria}
                    onChange={(e) => setFormData({ ...formData, categoria: e.target.value })}
                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                    required
                  >
                    <option value="">Selecione uma categoria</option>
                    {categorias.map((categoria) => (
                      <option key={categoria} value={categoria}>
                        {categoria}
                      </option>
                    ))}
                    <option value="Bebidas">Bebidas</option>
                    <option value="Pratos Principais">Pratos Principais</option>
                    <option value="Sobremesas">Sobremesas</option>
                    <option value="Entradas">Entradas</option>
                    <option value="Lanches">Lanches</option>
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
                      onChange={(e) => setFormData({ ...formData, preco: parseFloat(e.target.value) })}
                      className="pl-8 block w-full rounded-md border-gray-300 focus:border-blue-500 focus:ring-blue-500"
                      required
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700">
                    Descrição
                  </label>
                  <textarea
                    value={formData.descricao}
                    onChange={(e) => setFormData({ ...formData, descricao: e.target.value })}
                    rows={3}
                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700">
                    Imagem do Produto
                  </label>
                  <div className="mt-1 flex justify-center px-6 pt-5 pb-6 border-2 border-gray-300 border-dashed rounded-md">
                    <div className="space-y-1 text-center">
                      <Upload size={24} className="mx-auto text-gray-400" />
                      <div className="flex text-sm text-gray-600">
                        <label
                          htmlFor="file-upload"
                          className="relative cursor-pointer bg-white rounded-md font-medium text-blue-600 hover:text-blue-500 focus-within:outline-none focus-within:ring-2 focus-within:ring-offset-2 focus-within:ring-blue-500"
                        >
                          <span>Fazer upload de arquivo</span>
                          <input
                            id="file-upload"
                            name="file-upload"
                            type="file"
                            className="sr-only"
                            accept="image/*"
                            onChange={handleFileChange}
                          />
                        </label>
                        <p className="pl-1">ou arraste e solte</p>
                      </div>
                      <p className="text-xs text-gray-500">
                        PNG, JPG até 5MB
                      </p>
                    </div>
                  </div>
                </div>

                <div className="flex items-center">
                  <input
                    type="checkbox"
                    checked={formData.disponivel}
                    onChange={(e) => setFormData({ ...formData, disponivel: e.target.checked })}
                    className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                  />
                  <label className="ml-2 block text-sm text-gray-900">
                    Produto disponível para venda
                  </label>
                </div>
              </div>

              <div className="mt-6 flex justify-end space-x-3">
                <Button
                  type="button"
                  variant="ghost"
                  onClick={() => {
                    setShowModal(false);
                    resetForm();
                  }}
                >
                  Cancelar
                </Button>
                <Button
                  type="submit"
                  variant="primary"
                  isLoading={loading}
                >
                  {produtoSelecionado ? 'Atualizar' : 'Cadastrar'}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal de Confirmação de Exclusão */}
      {showDeleteModal && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-black bg-opacity-50 flex items-center justify-center">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-md m-4">
            <div className="p-6">
              <div className="flex items-center justify-center w-12 h-12 mx-auto bg-red-100 rounded-full">
                <AlertTriangle className="w-6 h-6 text-red-600" />
              </div>
              <div className="mt-3 text-center sm:mt-5">
                <h3 className="text-lg font-medium text-gray-900">
                  Confirmar Exclusão
                </h3>
                <div className="mt-2">
                  <p className="text-sm text-gray-500">
                    Tem certeza que deseja excluir este produto? Esta ação não pode ser desfeita.
                  </p>
                </div>
              </div>
            </div>
            <div className="px-6 py-3 bg-gray-50 flex justify-end space-x-3">
              <Button
                variant="ghost"
                onClick={() => {
                  setShowDeleteModal(false);
                  setProdutoSelecionado(null);
                }}
              >
                Cancelar
              </Button>
              <Button
                variant="danger"
                isLoading={loading}
                onClick={handleDelete}
              >
                Excluir
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Produtos;