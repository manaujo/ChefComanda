import React, { useState } from 'react';
import { X, Search } from 'lucide-react';
import Button from '../ui/Button';
import { useRestaurante } from '../../contexts/RestauranteContext';
import { formatarDinheiro } from '../../utils/formatters';

interface AdicionarItemModalProps {
  isOpen: boolean;
  onClose: () => void;
  mesaId: number;
}

const AdicionarItemModal: React.FC<AdicionarItemModalProps> = ({ isOpen, onClose, mesaId }) => {
  const [busca, setBusca] = useState('');
  const [categoriaSelecionada, setCategoriaSelecionada] = useState('todos');
  const [produtoSelecionado, setProdutoSelecionado] = useState<Produto | null>(null);
  const [quantidade, setQuantidade] = useState(1);
  const [observacao, setObservacao] = useState('');
  
  const { produtos, categorias, adicionarItemComanda } = useRestaurante();
  
  // Filtrar produtos
  const produtosFiltrados = produtos.filter(produto => {
    const matchBusca = produto.nome.toLowerCase().includes(busca.toLowerCase());
    const matchCategoria = categoriaSelecionada === 'todos' || produto.categoria === categoriaSelecionada;
    return matchBusca && matchCategoria;
  });
  
  const handleSubmit = () => {
    if (!produtoSelecionado) return;
    
    adicionarItemComanda({
      mesaId,
      produtoId: produtoSelecionado.id,
      nome: produtoSelecionado.nome,
      categoria: produtoSelecionado.categoria,
      quantidade,
      preco: produtoSelecionado.preco,
      observacao,
    });
    
    // Resetar formulário
    setProdutoSelecionado(null);
    setQuantidade(1);
    setObservacao('');
    onClose();
  };
  
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      <div className="flex items-center justify-center min-h-screen px-4 pt-4 pb-20 text-center sm:block sm:p-0">
        <div className="fixed inset-0 transition-opacity" aria-hidden="true">
          <div className="absolute inset-0 bg-gray-500 opacity-75"></div>
        </div>

        <span className="hidden sm:inline-block sm:align-middle sm:h-screen" aria-hidden="true">&#8203;</span>

        <div className="inline-block align-bottom bg-white rounded-lg text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-3xl sm:w-full">
          <div className="flex justify-between items-center bg-gray-100 px-6 py-3 border-b">
            <h2 className="text-lg font-medium text-gray-900">
              Adicionar Item à Comanda
            </h2>
            <button 
              onClick={onClose}
              className="bg-white rounded-md text-gray-400 hover:text-gray-500 focus:outline-none"
            >
              <X size={20} />
            </button>
          </div>
          
          <div className="bg-white px-6 py-4">
            {/* Barra de busca e filtros */}
            <div className="flex flex-col md:flex-row md:items-center gap-4 mb-6">
              <div className="relative flex-1">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                 <Search size={18} className="text-gray-400" />
                </div>
                <input
                  type="text"
                  placeholder="Buscar produto..."
                  value={busca}
                  onChange={(e) => setBusca(e.target.value)}
                  className="pl-10 pr-4 py-2 border border-gray-300 rounded-md w-full focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
              
              <div className="w-full md:w-auto">
                <select
                  value={categoriaSelecionada}
                  onChange={(e) => setCategoriaSelecionada(e.target.value)}
                  className="w-full md:w-auto border border-gray-300 rounded-md py-2 pl-3 pr-10 focus:ring-blue-500 focus:border-blue-500"
                >
                  <option value="todos">Todas categorias</option>
                  {categorias.map((categoria) => (
                    <option key={categoria} value={categoria}>
                      {categoria}
                    </option>
                  ))}
                </select>
              </div>
            </div>
            
            {produtoSelecionado ? (
              // Formulário de detalhes do item
              <div className="space-y-4">
                <div className="bg-blue-50 p-4 rounded-md flex justify-between items-center">
                  <div>
                    <h3 className="font-medium">{produtoSelecionado.nome}</h3>
                    <p className="text-sm text-gray-500">{produtoSelecionado.categoria}</p>
                  </div>
                  <div className="text-right">
                    <p className="font-medium">{formatarDinheiro(produtoSelecionado.preco)}</p>
                  </div>
                </div>
                
                <div>
                  <label htmlFor="quantidade" className="block text-sm font-medium text-gray-700 mb-1">
                    Quantidade
                  </label>
                  <div className="flex items-center">
                    <button
                      type="button"
                      className="px-3 py-2 border border-gray-300 rounded-l-md bg-gray-50 text-gray-500 hover:bg-gray-100"
                      onClick={() => setQuantidade(Math.max(1, quantidade - 1))}
                    >
                      -
                    </button>
                    <input
                      type="number"
                      id="quantidade"
                      value={quantidade}
                      onChange={(e) => setQuantidade(Math.max(1, parseInt(e.target.value) || 1))}
                      className="border-y border-gray-300 py-2 text-center w-16"
                      min="1"
                    />
                    <button
                      type="button"
                      className="px-3 py-2 border border-gray-300 rounded-r-md bg-gray-50 text-gray-500 hover:bg-gray-100"
                      onClick={() => setQuantidade(quantidade + 1)}
                    >
                      +
                    </button>
                    
                    <div className="ml-4 font-medium">
                      Total: {formatarDinheiro(produtoSelecionado.preco * quantidade)}
                    </div>
                  </div>
                </div>
                
                <div>
                  <label htmlFor="observacao" className="block text-sm font-medium text-gray-700 mb-1">
                    Observações
                  </label>
                  <textarea
                    id="observacao"
                    value={observacao}
                    onChange={(e) => setObservacao(e.target.value)}
                    className="w-full border border-gray-300 rounded-md py-2 px-3 focus:ring-blue-500 focus:border-blue-500"
                    rows={3}
                    placeholder="Ex: Sem cebola, molho à parte, etc."
                  ></textarea>
                </div>
                
                <div className="pt-4 flex justify-between">
                  <Button
                    variant="ghost"
                    onClick={() => setProdutoSelecionado(null)}
                  >
                    Voltar
                  </Button>
                  
                  <Button
                    variant="primary"
                    onClick={handleSubmit}
                  >
                    Adicionar Item
                  </Button>
                </div>
              </div>
            ) : (
              // Lista de produtos
              <div className="max-h-96 overflow-y-auto">
                {produtosFiltrados.length === 0 ? (
                  <div className="py-6 text-center text-gray-500">
                    <p>Nenhum produto encontrado</p>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {produtosFiltrados.map((produto) => (
                      <div 
                        key={produto.id}
                        className="border border-gray-200 rounded-md p-3 cursor-pointer hover:bg-gray-50 transition-colors"
                        onClick={() => setProdutoSelecionado(produto)}
                      >
                        <div className="flex justify-between">
                          <div>
                            <h3 className="font-medium">{produto.nome}</h3>
                            <p className="text-sm text-gray-500">{produto.categoria}</p>
                            {produto.disponivel ? (
                              <span className="text-xs bg-green-100 text-green-800 px-2 py-0.5 rounded-full mt-1 inline-block">
                                Disponível
                              </span>
                            ) : (
                              <span className="text-xs bg-red-100 text-red-800 px-2 py-0.5 rounded-full mt-1 inline-block">
                                Indisponível
                              </span>
                            )}
                          </div>
                          <div>
                            <p className="font-medium">{formatarDinheiro(produto.preco)}</p>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
          
          {!produtoSelecionado && (
            <div className="bg-gray-50 px-6 py-3 flex justify-end">
              <Button variant="ghost" onClick={onClose}>
                Cancelar
              </Button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default AdicionarItemModal;