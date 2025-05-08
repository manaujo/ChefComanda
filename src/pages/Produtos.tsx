import React, { useState } from 'react';
import { Plus, Filter, Search, Edit2, Trash2, AlertTriangle } from 'lucide-react';
import Button from '../components/ui/Button';
import { useRestaurante } from '../contexts/RestauranteContext';
import { formatarDinheiro } from '../utils/formatters';

const Produtos: React.FC = () => {
  const { produtos, categorias } = useRestaurante();
  const [busca, setBusca] = useState('');
  const [categoriaSelecionada, setCategoriaSelecionada] = useState('todas');
  const [ordenacao, setOrdenacao] = useState<'nome' | 'preco' | 'estoque'>('nome');
  
  // Filtrar produtos
  const produtosFiltrados = produtos
    .filter(produto => {
      const matchBusca = produto.nome.toLowerCase().includes(busca.toLowerCase()) ||
                        produto.descricao.toLowerCase().includes(busca.toLowerCase());
      const matchCategoria = categoriaSelecionada === 'todas' || produto.categoria === categoriaSelecionada;
      return matchBusca && matchCategoria;
    })
    .sort((a, b) => {
      switch (ordenacao) {
        case 'preco':
          return a.preco - b.preco;
        case 'estoque':
          return a.estoque - b.estoque;
        default:
          return a.nome.localeCompare(b.nome);
      }
    });

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Produtos</h1>
          <p className="text-gray-500 mt-1">
            Gerenciamento de produtos e estoque
          </p>
        </div>
        <div className="mt-4 md:mt-0">
          <Button
            variant="primary"
            icon={<Plus size={18} />}
          >
            Novo Produto
          </Button>
        </div>
      </div>

      {/* Filtros e Busca */}
      <div className="bg-white rounded-lg shadow-sm p-4">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* Busca */}
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

          {/* Filtro por Categoria */}
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

          {/* Ordenação */}
          <div>
            <select
              value={ordenacao}
              onChange={(e) => setOrdenacao(e.target.value as 'nome' | 'preco' | 'estoque')}
              className="w-full border border-gray-300 rounded-md py-2 pl-3 pr-10 focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="nome">Ordenar por nome</option>
              <option value="preco">Ordenar por preço</option>
              <option value="estoque">Ordenar por estoque</option>
            </select>
          </div>
        </div>
      </div>

      {/* Lista de Produtos */}
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
                Estoque
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
            {produtosFiltrados.map((produto) => (
              <tr key={produto.id}>
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="flex items-center">
                    <div>
                      <div className="text-sm font-medium text-gray-900">
                        {produto.nome}
                      </div>
                      <div className="text-sm text-gray-500">
                        {produto.descricao}
                      </div>
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
                  <div className="flex items-center">
                    <span className={`text-sm ${
                      produto.estoque <= produto.estoqueMinimo
                        ? 'text-red-600 font-medium'
                        : 'text-gray-900'
                    }`}>
                      {produto.estoque} un
                    </span>
                    {produto.estoque <= produto.estoqueMinimo && (
                      <AlertTriangle size={16} className="ml-2 text-red-500" />
                    )}
                  </div>
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
                  <div className="flex justify-end space-x-2">
                    <Button
                      variant="ghost"
                      size="sm"
                      icon={<Edit2 size={16} />}
                    >
                      Editar
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="text-red-600 hover:text-red-900"
                      icon={<Trash2 size={16} />}
                    >
                      Excluir
                    </Button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default Produtos;