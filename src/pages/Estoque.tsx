import React, { useState } from 'react';
import { Search, AlertTriangle, ArrowUp, ArrowDown, Filter, RefreshCcw } from 'lucide-react';
import Button from '../components/ui/Button';
import { useRestaurante } from '../contexts/RestauranteContext';

const Estoque: React.FC = () => {
  const { produtos, categorias, alertasEstoque } = useRestaurante();
  const [busca, setBusca] = useState('');
  const [categoriaSelecionada, setCategoriaSelecionada] = useState('todas');
  const [filtroEstoque, setFiltroEstoque] = useState<'todos' | 'baixo' | 'normal'>('todos');
  
  // Filtrar produtos
  const produtosFiltrados = produtos.filter(produto => {
    const matchBusca = produto.nome.toLowerCase().includes(busca.toLowerCase());
    const matchCategoria = categoriaSelecionada === 'todas' || produto.categoria === categoriaSelecionada;
    const matchEstoque = filtroEstoque === 'todos' || 
      (filtroEstoque === 'baixo' && produto.estoque <= produto.estoqueMinimo) ||
      (filtroEstoque === 'normal' && produto.estoque > produto.estoqueMinimo);
    
    return matchBusca && matchCategoria && matchEstoque;
  });

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Controle de Estoque</h1>
          <p className="text-gray-500 mt-1">
            Gerenciamento de estoque e alertas
          </p>
        </div>
        <div className="mt-4 md:mt-0 flex space-x-3">
          <Button 
            variant="ghost" 
            icon={<RefreshCcw size={18} />}
          >
            Atualizar
          </Button>
          <Button 
            variant="primary"
            icon={<ArrowDown size={18} />}
          >
            Entrada de Estoque
          </Button>
        </div>
      </div>

      {/* Alertas de Estoque Baixo */}
      {alertasEstoque.length > 0 && (
        <div className="bg-red-50 border-l-4 border-red-500 p-4">
          <div className="flex">
            <div className="flex-shrink-0">
              <AlertTriangle className="h-5 w-5 text-red-400" />
            </div>
            <div className="ml-3">
              <h3 className="text-sm font-medium text-red-800">
                Alertas de Estoque Baixo
              </h3>
              <div className="mt-2 text-sm text-red-700">
                <ul className="list-disc pl-5 space-y-1">
                  {alertasEstoque.map(alerta => (
                    <li key={alerta.id}>
                      {alerta.produto} - {alerta.quantidade} unidades (Mínimo: {alerta.estoqueMinimo})
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Filtros */}
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

          {/* Filtro por Status de Estoque */}
          <div>
            <select
              value={filtroEstoque}
              onChange={(e) => setFiltroEstoque(e.target.value as 'todos' | 'baixo' | 'normal')}
              className="w-full border border-gray-300 rounded-md py-2 pl-3 pr-10 focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="todos">Todos os níveis</option>
              <option value="baixo">Estoque baixo</option>
              <option value="normal">Estoque normal</option>
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
                Estoque Atual
              </th>
              <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Estoque Mínimo
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
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="flex items-center">
                    <span className={`text-sm ${
                      produto.estoque <= produto.estoqueMinimo
                        ? 'text-red-600 font-medium'
                        : 'text-gray-900'
                    }`}>
                      {produto.estoque} unidades
                    </span>
                    {produto.estoque <= produto.estoqueMinimo && (
                      <AlertTriangle size={16} className="ml-2 text-red-500" />
                    )}
                  </div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                  {produto.estoqueMinimo} unidades
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                    produto.estoque > produto.estoqueMinimo
                      ? 'bg-green-100 text-green-800'
                      : 'bg-red-100 text-red-800'
                  }`}>
                    {produto.estoque > produto.estoqueMinimo ? 'Normal' : 'Baixo'}
                  </span>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                  <div className="flex justify-end space-x-2">
                    <Button
                      variant="ghost"
                      size="sm"
                      icon={<ArrowUp size={16} />}
                      className="text-green-600 hover:text-green-900"
                    >
                      Entrada
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      icon={<ArrowDown size={16} />}
                      className="text-red-600 hover:text-red-900"
                    >
                      Saída
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

export default Estoque;