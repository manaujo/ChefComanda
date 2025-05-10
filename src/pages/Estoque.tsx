import React, { useState } from 'react';
import { 
  Search, AlertTriangle, ArrowUp, ArrowDown, Filter, 
  Plus, Download, FileSpreadsheet, Archive, Package2
} from 'lucide-react';
import Button from '../components/ui/Button';
import { useRestaurante } from '../contexts/RestauranteContext';
import { formatarDinheiro } from '../utils/formatters';

interface NovoItemEstoque {
  nome: string;
  categoria: string;
  quantidade: number;
  unidadeMedida: string;
  precoCusto?: number;
  fornecedor?: string;
  estoqueMinimo: number;
}

const Estoque: React.FC = () => {
  const { produtos, categorias, alertasEstoque } = useRestaurante();
  const [busca, setBusca] = useState('');
  const [categoriaSelecionada, setCategoriaSelecionada] = useState('todas');
  const [filtroEstoque, setFiltroEstoque] = useState<'todos' | 'baixo' | 'normal'>('todos');
  const [visualizacao, setVisualizacao] = useState<'cards' | 'tabela'>('cards');
  const [showNovoItemModal, setShowNovoItemModal] = useState(false);
  const [showAtualizarEstoqueModal, setShowAtualizarEstoqueModal] = useState(false);
  const [produtoSelecionado, setProdutoSelecionado] = useState<Produto | null>(null);
  const [novoItem, setNovoItem] = useState<NovoItemEstoque>({
    nome: '',
    categoria: '',
    quantidade: 0,
    unidadeMedida: 'un',
    estoqueMinimo: 0
  });
  
  // Filtrar produtos
  const produtosFiltrados = produtos.filter(produto => {
    const matchBusca = produto.nome.toLowerCase().includes(busca.toLowerCase()) ||
                      produto.descricao.toLowerCase().includes(busca.toLowerCase());
    const matchCategoria = categoriaSelecionada === 'todas' || produto.categoria === categoriaSelecionada;
    const matchEstoque = filtroEstoque === 'todos' || 
      (filtroEstoque === 'baixo' && produto.estoque <= produto.estoqueMinimo) ||
      (filtroEstoque === 'normal' && produto.estoque > produto.estoqueMinimo);
    
    return matchBusca && matchCategoria && matchEstoque;
  });

  const handleNovoItem = () => {
    // Implementar lógica de adicionar novo item
    setShowNovoItemModal(false);
  };

  const handleAtualizarEstoque = (tipo: 'entrada' | 'saida', quantidade: number) => {
    if (!produtoSelecionado) return;
    // Implementar lógica de atualização
    setShowAtualizarEstoqueModal(false);
    setProdutoSelecionado(null);
  };

  const exportarEstoque = (formato: 'pdf' | 'excel') => {
    // Implementar lógica de exportação
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Controle de Estoque</h1>
          <p className="text-gray-500 mt-1">
            Gerenciamento de produtos e inventário
          </p>
        </div>
        <div className="mt-4 md:mt-0 flex flex-wrap gap-2">
          <Button 
            variant="ghost"
            icon={<FileSpreadsheet size={18} />}
            onClick={() => exportarEstoque('excel')}
          >
            Exportar Excel
          </Button>
          <Button 
            variant="ghost"
            icon={<Download size={18} />}
            onClick={() => exportarEstoque('pdf')}
          >
            Exportar PDF
          </Button>
          <Button 
            variant="primary"
            icon={<Plus size={18} />}
            onClick={() => setShowNovoItemModal(true)}
          >
            Novo Produto
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
              value={filtroEstoque}
              onChange={(e) => setFiltroEstoque(e.target.value as 'todos' | 'baixo' | 'normal')}
              className="w-full border border-gray-300 rounded-md py-2 pl-3 pr-10 focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="todos">Todos os níveis</option>
              <option value="baixo">Estoque baixo</option>
              <option value="normal">Estoque normal</option>
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
          {produtosFiltrados.map((produto) => (
            <div
              key={produto.id}
              className={`bg-white rounded-lg shadow-sm overflow-hidden border-l-4 ${
                produto.estoque <= produto.estoqueMinimo
                  ? 'border-red-500'
                  : 'border-green-500'
              }`}
            >
              <div className="p-4">
                <div className="flex justify-between items-start">
                  <div>
                    <h3 className="font-medium text-gray-900">{produto.nome}</h3>
                    <p className="text-sm text-gray-500">{produto.descricao}</p>
                  </div>
                  <span className={`px-2 py-1 text-xs font-medium rounded-full ${
                    produto.disponivel
                      ? 'bg-green-100 text-green-800'
                      : 'bg-red-100 text-red-800'
                  }`}>
                    {produto.disponivel ? 'Ativo' : 'Inativo'}
                  </span>
                </div>

                <div className="mt-4 space-y-2">
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-gray-500">Estoque Atual</span>
                    <span className={`font-medium ${
                      produto.estoque <= produto.estoqueMinimo
                        ? 'text-red-600'
                        : 'text-gray-900'
                    }`}>
                      {produto.estoque} un
                    </span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-gray-500">Estoque Mínimo</span>
                    <span className="text-sm text-gray-900">{produto.estoqueMinimo} un</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-gray-500">Preço de Custo</span>
                    <span className="text-sm text-gray-900">{formatarDinheiro(produto.preco)}</span>
                  </div>
                </div>

                <div className="mt-4 flex justify-end space-x-2">
                  <Button
                    variant="ghost"
                    size="sm"
                    icon={<ArrowUp size={16} />}
                    onClick={() => {
                      setProdutoSelecionado(produto);
                      setShowAtualizarEstoqueModal(true);
                    }}
                  >
                    Atualizar
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    icon={<Archive size={16} />}
                    className="text-gray-600"
                  >
                    Inativar
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
                      {produto.disponivel ? 'Ativo' : 'Inativo'}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                    <Button
                      variant="ghost"
                      size="sm"
                      icon={<ArrowUp size={16} />}
                      onClick={() => {
                        setProdutoSelecionado(produto);
                        setShowAtualizarEstoqueModal(true);
                      }}
                      className="mr-2"
                    >
                      Atualizar
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      icon={<Archive size={16} />}
                      className="text-gray-600"
                    >
                      Inativar
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Modal de Novo Item */}
      {showNovoItemModal && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-black bg-opacity-50 flex items-center justify-center">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-lg m-4">
            <div className="px-6 py-4 border-b border-gray-200">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-medium text-gray-900">
                  Novo Produto
                </h3>
                <button
                  onClick={() => setShowNovoItemModal(false)}
                  className="text-gray-400 hover:text-gray-500"
                >
                  <span className="sr-only">Fechar</span>
                  ×
                </button>
              </div>
            </div>
            <div className="px-6 py-4">
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700">
                    Nome do Produto
                  </label>
                  <input
                    type="text"
                    value={novoItem.nome}
                    onChange={(e) => setNovoItem({ ...novoItem, nome: e.target.value })}
                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700">
                    Categoria
                  </label>
                  <select
                    value={novoItem.categoria}
                    onChange={(e) => setNovoItem({ ...novoItem, categoria: e.target.value })}
                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                  >
                    <option value="">Selecione uma categoria</option>
                    {categorias.map((categoria) => (
                      <option key={categoria} value={categoria}>
                        {categoria}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700">
                      Quantidade Inicial
                    </label>
                    <input
                      type="number"
                      value={novoItem.quantidade}
                      onChange={(e) => setNovoItem({ ...novoItem, quantidade: parseInt(e.target.value) })}
                      className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700">
                      Unidade de Medida
                    </label>
                    <select
                      value={novoItem.unidadeMedida}
                      onChange={(e) => setNovoItem({ ...novoItem, unidadeMedida: e.target.value })}
                      className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                    >
                      <option value="un">Unidade</option>
                      <option value="kg">Quilograma</option>
                      <option value="g">Grama</option>
                      <option value="l">Litro</option>
                      <option value="ml">Mililitro</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700">
                    Estoque Mínimo
                  </label>
                  <input
                    type="number"
                    value={novoItem.estoqueMinimo}
                    onChange={(e) => setNovoItem({ ...novoItem, estoqueMinimo: parseInt(e.target.value) })}
                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700">
                    Preço de Custo (opcional)
                  </label>
                  <div className="mt-1 relative rounded-md shadow-sm">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                      <span className="text-gray-500 sm:text-sm">R$</span>
                    </div>
                    <input
                      type="number"
                      step="0.01"
                      value={novoItem.precoCusto || ''}
                      onChange={(e) => setNovoItem({ ...novoItem, precoCusto: parseFloat(e.target.value) })}
                      className="pl-8 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700">
                    Fornecedor (opcional)
                  </label>
                  <input
                    type="text"
                    value={novoItem.fornecedor || ''}
                    onChange={(e) => setNovoItem({ ...novoItem, fornecedor: e.target.value })}
                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                  />
                </div>
              </div>
            </div>
            <div className="px-6 py-4 bg-gray-50 border-t border-gray-200 flex justify-end space-x-3">
              <Button
                variant="ghost"
                onClick={() => setShowNovoItemModal(false)}
              >
                Cancelar
              </Button>
              <Button
                variant="primary"
                onClick={handleNovoItem}
              >
                Adicionar Produto
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Modal de Atualizar Estoque */}
      {showAtualizarEstoqueModal && produtoSelecionado && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-black bg-opacity-50 flex items-center justify-center">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-lg m-4">
            <div className="px-6 py-4 border-b border-gray-200">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-medium text-gray-900">
                  Atualizar Estoque - {produtoSelecionado.nome}
                </h3>
                <button
                  onClick={() => {
                    setShowAtualizarEstoqueModal(false);
                    setProdutoSelecionado(null);
                  }}
                  className="text-gray-400 hover:text-gray-500"
                >
                  <span className="sr-only">Fechar</span>
                  ×
                </button>
              </div>
            </div>
            <div className="px-6 py-4">
              <div className="space-y-4">
                <div className="flex justify-between items-center p-4 bg-gray-50 rounded-lg">
                  <div>
                    <p className="text-sm text-gray-500">Estoque Atual</p>
                    <p className="text-2xl font-bold">{produtoSelecionado.estoque}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-500">Estoque Mínimo</p>
                    <p className="text-lg">{produtoSelecionado.estoqueMinimo}</p>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <Button
                    variant="success"
                    fullWidth
                    icon={<ArrowUp size={18} />}
                    onClick={() => handleAtualizarEstoque('entrada', 1)}
                  >
                    Entrada
                  </Button>
                  <Button
                    variant="danger"
                    fullWidth
                    icon={<ArrowDown size={18} />}
                    onClick={() => handleAtualizarEstoque('saida', 1)}
                  >
                    Saída
                  </Button>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700">
                    Quantidade
                  </label>
                  <input
                    type="number"
                    min="1"
                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700">
                    Motivo
                  </label>
                  <select
                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                  >
                    <option value="compra">Nova Compra</option>
                    <option value="ajuste">Ajuste de Inventário</option>
                    <option value="perda">Perda/Quebra</option>
                    <option value="venda">Venda</option>
                    <option value="outro">Outro</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700">
                    Observações (opcional)
                  </label>
                  <textarea
                    rows={3}
                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                  ></textarea>
                </div>
              </div>
            </div>
            <div className="px-6 py-4 bg-gray-50 border-t border-gray-200 flex justify-end space-x-3">
              <Button
                variant="ghost"
                onClick={() => {
                  setShowAtualizarEstoqueModal(false);
                  setProdutoSelecionado(null);
                }}
              >
                Cancelar
              </Button>
              <Button
                variant="primary"
                onClick={() => handleAtualizarEstoque('entrada', 1)}
              >
                Confirmar
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Estoque;