import React, { useState, useEffect } from 'react';
import { 
  CreditCard, DollarSign, QrCode, Search, ShoppingBag, 
  Plus, Trash2, ArrowRight, Receipt, Clock, Users
} from 'lucide-react';
import Button from '../components/ui/Button';
import { useRestaurante } from '../contexts/RestauranteContext';
import { formatarDinheiro } from '../utils/formatters';
import toast from 'react-hot-toast';

const PDV: React.FC = () => {
  const { mesas, produtos, comandas, itensComanda, finalizarComanda, refreshData } = useRestaurante();
  
  const [mesaSelecionada, setMesaSelecionada] = useState<string | null>(null);
  const [produtoSelecionado, setProdutoSelecionado] = useState<any | null>(null);
  const [quantidade, setQuantidade] = useState(1);
  const [observacao, setObservacao] = useState('');
  const [busca, setBusca] = useState('');
  const [categoriaSelecionada, setCategoriaSelecionada] = useState('todas');
  const [formaPagamento, setFormaPagamento] = useState<'dinheiro' | 'cartao' | 'pix'>('dinheiro');
  const [loading, setLoading] = useState(false);
  const [itensVenda, setItensVenda] = useState<any[]>([]);
  
  // Obter mesas ocupadas
  const mesasOcupadas = mesas.filter(mesa => mesa.status === 'ocupada');
  
  // Obter categorias únicas
  const categorias = Array.from(new Set(produtos.map(produto => produto.categoria)));
  
  // Filtrar produtos
  const produtosFiltrados = produtos.filter(produto => {
    const matchBusca = produto.nome.toLowerCase().includes(busca.toLowerCase());
    const matchCategoria = categoriaSelecionada === 'todas' || produto.categoria === categoriaSelecionada;
    return matchBusca && matchCategoria && produto.disponivel;
  });

  // Obter itens da mesa selecionada
  const getItensMesa = () => {
    if (!mesaSelecionada) return [];
    
    // Encontrar a comanda aberta para esta mesa
    const comanda = comandas.find(c => c.mesa_id === mesaSelecionada && c.status === 'aberta');
    if (!comanda) return [];
    
    // Retornar os itens desta comanda
    return itensComanda.filter(item => item.comanda_id === comanda.id);
  };
  
  // Calcular valor total da venda
  const calcularTotal = () => {
    if (mesaSelecionada) {
      // Se uma mesa está selecionada, calcular o total dos itens da mesa
      const itensMesa = getItensMesa();
      return itensMesa.reduce((total, item) => total + (item.preco_unitario * item.quantidade), 0);
    } else {
      // Se não, calcular o total dos itens da venda direta
      return itensVenda.reduce((total, item) => total + (item.preco * item.quantidade), 0);
    }
  };

  // Adicionar produto à venda direta
  const adicionarProdutoVenda = () => {
    if (!produtoSelecionado) return;
    
    const novoItem = {
      id: Date.now().toString(),
      produto_id: produtoSelecionado.id,
      nome: produtoSelecionado.nome,
      preco: produtoSelecionado.preco,
      quantidade,
      observacao
    };
    
    setItensVenda([...itensVenda, novoItem]);
    setProdutoSelecionado(null);
    setQuantidade(1);
    setObservacao('');
    
    toast.success('Produto adicionado!');
  };
  
  // Remover produto da venda direta
  const removerProdutoVenda = (id: string) => {
    setItensVenda(itensVenda.filter(item => item.id !== id));
  };
  
  // Finalizar venda
  const finalizarVenda = async () => {
    if (mesaSelecionada) {
      // Finalizar venda de uma mesa
      const comanda = comandas.find(c => c.mesa_id === mesaSelecionada && c.status === 'aberta');
      if (!comanda) {
        toast.error('Nenhuma comanda aberta para esta mesa');
        return;
      }
      
      setLoading(true);
      try {
        await finalizarComanda(comanda.id, formaPagamento);
        setMesaSelecionada(null);
        toast.success('Venda finalizada com sucesso!');
        
        // Refresh data to update UI
        await refreshData();
      } catch (error) {
        console.error('Error finalizing sale:', error);
        toast.error('Erro ao finalizar venda');
      } finally {
        setLoading(false);
      }
    } else {
      // Finalizar venda direta
      if (itensVenda.length === 0) {
        toast.error('Adicione pelo menos um produto');
        return;
      }
      
      setLoading(true);
      try {
        // Implementar lógica para salvar venda direta
        // ...
        
        setItensVenda([]);
        toast.success('Venda finalizada com sucesso!');
      } catch (error) {
        console.error('Error finalizing direct sale:', error);
        toast.error('Erro ao finalizar venda');
      } finally {
        setLoading(false);
      }
    }
  };

  // Carregar dados ao montar o componente
  useEffect(() => {
    refreshData();
  }, []);

  return (
    <div className="flex h-screen bg-gray-100 dark:bg-gray-900">
      {/* Produtos */}
      <div className="w-2/3 p-4 overflow-y-auto">
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-4 mb-4">
          <div className="flex flex-col md:flex-row space-y-2 md:space-y-0 md:space-x-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
              <input
                type="text"
                placeholder="Buscar produtos..."
                value={busca}
                onChange={(e) => setBusca(e.target.value)}
                className="pl-10 w-full rounded-lg border border-gray-300 dark:border-gray-700 py-2 px-4 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white"
              />
            </div>
            
            <select
              value={categoriaSelecionada}
              onChange={(e) => setCategoriaSelecionada(e.target.value)}
              className="rounded-lg border border-gray-300 dark:border-gray-700 py-2 px-4 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white"
            >
              <option value="todas">Todas as categorias</option>
              {categorias.map(categoria => (
                <option key={categoria} value={categoria}>{categoria}</option>
              ))}
            </select>
          </div>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {produtosFiltrados.map(produto => (
            <div
              key={produto.id}
              className="bg-white dark:bg-gray-800 rounded-lg shadow-sm overflow-hidden cursor-pointer hover:shadow-md transition-shadow"
              onClick={() => setProdutoSelecionado(produto)}
            >
              <div className="p-4">
                <div className="flex justify-between">
                  <div>
                    <h3 className="font-medium text-gray-900 dark:text-white">{produto.nome}</h3>
                    <p className="text-sm text-gray-500 dark:text-gray-400">{produto.categoria}</p>
                  </div>
                  <div className="text-right">
                    <p className="font-medium text-gray-900 dark:text-white">{formatarDinheiro(produto.preco)}</p>
                  </div>
                </div>
              </div>
            </div>
          ))}
          
          {produtosFiltrados.length === 0 && (
            <div className="col-span-full text-center py-8 text-gray-500 dark:text-gray-400">
              Nenhum produto encontrado
            </div>
          )}
        </div>
      </div>
      
      {/* Painel de Venda */}
      <div className="w-1/3 bg-white dark:bg-gray-800 border-l border-gray-200 dark:border-gray-700 flex flex-col">
        {/* Cabeçalho */}
        <div className="p-4 border-b border-gray-200 dark:border-gray-700">
          <h2 className="text-lg font-medium text-gray-900 dark:text-white">Nova Venda</h2>
          
          {/* Seleção de Mesa */}
          <div className="mt-4">
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Selecione uma mesa (opcional)
            </label>
            <div className="grid grid-cols-4 gap-2">
              <button
                className={`p-2 rounded-md text-center ${
                  mesaSelecionada === null
                    ? 'bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200 border-2 border-blue-500'
                    : 'bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-gray-200'
                }`}
                onClick={() => setMesaSelecionada(null)}
              >
                Balcão
              </button>
              
              {mesasOcupadas.map(mesa => (
                <button
                  key={mesa.id}
                  className={`p-2 rounded-md text-center ${
                    mesaSelecionada === mesa.id
                      ? 'bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200 border-2 border-blue-500'
                      : 'bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-gray-200'
                  }`}
                  onClick={() => setMesaSelecionada(mesa.id)}
                >
                  Mesa {mesa.numero}
                </button>
              ))}
            </div>
          </div>
        </div>
        
        {/* Detalhes do Produto Selecionado */}
        {produtoSelecionado && !mesaSelecionada && (
          <div className="p-4 border-b border-gray-200 dark:border-gray-700">
            <div className="bg-blue-50 dark:bg-blue-900/20 p-4 rounded-lg">
              <div className="flex justify-between items-start">
                <div>
                  <h3 className="font-medium text-gray-900 dark:text-white">{produtoSelecionado.nome}</h3>
                  <p className="text-sm text-gray-500 dark:text-gray-400">{produtoSelecionado.categoria}</p>
                </div>
                <p className="font-medium text-gray-900 dark:text-white">{formatarDinheiro(produtoSelecionado.preco)}</p>
              </div>
              
              <div className="mt-4">
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Quantidade
                </label>
                <div className="flex items-center">
                  <button
                    className="px-3 py-1 bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-l-md"
                    onClick={() => setQuantidade(Math.max(1, quantidade - 1))}
                  >
                    -
                  </button>
                  <input
                    type="number"
                    min="1"
                    value={quantidade}
                    onChange={(e) => setQuantidade(Math.max(1, parseInt(e.target.value) || 1))}
                    className="w-16 text-center py-1 border-y border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white"
                  />
                  <button
                    className="px-3 py-1 bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-r-md"
                    onClick={() => setQuantidade(quantidade + 1)}
                  >
                    +
                  </button>
                  
                  <div className="ml-4 font-medium text-gray-900 dark:text-white">
                    Total: {formatarDinheiro(produtoSelecionado.preco * quantidade)}
                  </div>
                </div>
              </div>
              
              <div className="mt-4">
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Observações
                </label>
                <textarea
                  value={observacao}
                  onChange={(e) => setObservacao(e.target.value)}
                  className="w-full rounded-md border border-gray-300 dark:border-gray-600 py-2 px-3 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white"
                  rows={2}
                  placeholder="Ex: Sem cebola, molho à parte, etc."
                ></textarea>
              </div>
              
              <div className="mt-4 flex justify-between">
                <Button
                  variant="ghost"
                  onClick={() => setProdutoSelecionado(null)}
                >
                  Cancelar
                </Button>
                
                <Button
                  variant="primary"
                  icon={<Plus size={16} />}
                  onClick={adicionarProdutoVenda}
                >
                  Adicionar
                </Button>
              </div>
            </div>
          </div>
        )}
        
        {/* Lista de Itens */}
        <div className="flex-1 overflow-y-auto p-4">
          <h3 className="font-medium text-gray-900 dark:text-white mb-4">
            {mesaSelecionada 
              ? `Itens da Mesa ${mesas.find(m => m.id === mesaSelecionada)?.numero}`
              : 'Itens da Venda'
            }
          </h3>
          
          {mesaSelecionada ? (
            // Itens da mesa selecionada
            <>
              {getItensMesa().length === 0 ? (
                <div className="text-center py-8 text-gray-500 dark:text-gray-400">
                  Nenhum item na comanda
                </div>
              ) : (
                <div className="space-y-4">
                  {getItensMesa().map(item => (
                    <div key={item.id} className="flex justify-between items-start">
                      <div>
                        <div className="flex items-center">
                          <span className="font-medium text-gray-900 dark:text-white">{item.quantidade}x</span>
                          <span className="ml-2 text-gray-900 dark:text-white">{item.nome}</span>
                        </div>
                        {item.observacao && (
                          <p className="text-sm text-gray-500 dark:text-gray-400 ml-6">{item.observacao}</p>
                        )}
                      </div>
                      <div className="text-right">
                        <p className="text-gray-900 dark:text-white">{formatarDinheiro(item.preco_unitario * item.quantidade)}</p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
              
              {/* Informações da mesa */}
              {mesaSelecionada && (
                <div className="mt-6 bg-gray-50 dark:bg-gray-700 p-4 rounded-lg">
                  <div className="flex justify-between items-center mb-2">
                    <div className="flex items-center">
                      <Clock size={16} className="text-gray-500 dark:text-gray-400 mr-2" />
                      <span className="text-sm text-gray-700 dark:text-gray-300">
                        {mesas.find(m => m.id === mesaSelecionada)?.horario_abertura 
                          ? new Date(mesas.find(m => m.id === mesaSelecionada)?.horario_abertura!).toLocaleTimeString() 
                          : 'N/A'
                        }
                      </span>
                    </div>
                    <div className="flex items-center">
                      <Users size={16} className="text-gray-500 dark:text-gray-400 mr-2" />
                      <span className="text-sm text-gray-700 dark:text-gray-300">
                        {mesas.find(m => m.id === mesaSelecionada)?.capacidade || 0} pessoas
                      </span>
                    </div>
                  </div>
                  <div className="flex items-center">
                    <ShoppingBag size={16} className="text-gray-500 dark:text-gray-400 mr-2" />
                    <span className="text-sm text-gray-700 dark:text-gray-300">
                      {getItensMesa().length} itens
                    </span>
                  </div>
                </div>
              )}
            </>
          ) : (
            // Itens da venda direta
            <>
              {itensVenda.length === 0 ? (
                <div className="text-center py-8 text-gray-500 dark:text-gray-400">
                  Nenhum item adicionado
                </div>
              ) : (
                <div className="space-y-4">
                  {itensVenda.map(item => (
                    <div key={item.id} className="flex justify-between items-start">
                      <div>
                        <div className="flex items-center">
                          <span className="font-medium text-gray-900 dark:text-white">{item.quantidade}x</span>
                          <span className="ml-2 text-gray-900 dark:text-white">{item.nome}</span>
                        </div>
                        {item.observacao && (
                          <p className="text-sm text-gray-500 dark:text-gray-400 ml-6">{item.observacao}</p>
                        )}
                      </div>
                      <div className="flex items-center">
                        <p className="text-gray-900 dark:text-white mr-2">{formatarDinheiro(item.preco * item.quantidade)}</p>
                        <button
                          onClick={() => removerProdutoVenda(item.id)}
                          className="text-red-500 hover:text-red-700 dark:text-red-400 dark:hover:text-red-300"
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </>
          )}
        </div>
        
        {/* Rodapé com Total e Pagamento */}
        <div className="p-4 border-t border-gray-200 dark:border-gray-700">
          <div className="mb-4">
            <div className="flex justify-between items-center mb-2">
              <span className="text-gray-700 dark:text-gray-300">Subtotal</span>
              <span className="font-medium text-gray-900 dark:text-white">{formatarDinheiro(calcularTotal())}</span>
            </div>
            
            <div className="flex justify-between items-center">
              <span className="text-gray-700 dark:text-gray-300">Total</span>
              <span className="text-xl font-bold text-gray-900 dark:text-white">{formatarDinheiro(calcularTotal())}</span>
            </div>
          </div>
          
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Forma de Pagamento
            </label>
            <div className="grid grid-cols-3 gap-2">
              <button
                className={`p-2 flex flex-col items-center justify-center rounded-md ${
                  formaPagamento === 'dinheiro'
                    ? 'bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200 border-2 border-blue-500'
                    : 'bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-gray-200'
                }`}
                onClick={() => setFormaPagamento('dinheiro')}
              >
                <DollarSign size={20} />
                <span className="text-xs mt-1">Dinheiro</span>
              </button>
              
              <button
                className={`p-2 flex flex-col items-center justify-center rounded-md ${
                  formaPagamento === 'cartao'
                    ? 'bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200 border-2 border-blue-500'
                    : 'bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-gray-200'
                }`}
                onClick={() => setFormaPagamento('cartao')}
              >
                <CreditCard size={20} />
                <span className="text-xs mt-1">Cartão</span>
              </button>
              
              <button
                className={`p-2 flex flex-col items-center justify-center rounded-md ${
                  formaPagamento === 'pix'
                    ? 'bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200 border-2 border-blue-500'
                    : 'bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-gray-200'
                }`}
                onClick={() => setFormaPagamento('pix')}
              >
                <QrCode size={20} />
                <span className="text-xs mt-1">PIX</span>
              </button>
            </div>
          </div>
          
          <Button
            variant="primary"
            fullWidth
            size="lg"
            icon={<Receipt size={20} />}
            onClick={finalizarVenda}
            isLoading={loading}
            disabled={(mesaSelecionada && getItensMesa().length === 0) || (!mesaSelecionada && itensVenda.length === 0)}
          >
            Finalizar Venda
          </Button>
        </div>
      </div>
    </div>
  );
};

export default PDV;