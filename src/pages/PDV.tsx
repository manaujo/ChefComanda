import React from "react";
import { Button } from "@/components/ui/button";
import { Plus, Search, Store, X } from "lucide-react";

const PDV = ({
  ifoodPedidos,
  formatarDinheiro,
  formatarTempo,
  handleRejectIFoodOrder,
  handleAcceptIFoodOrder,
  showAddItemModal,
  setShowAddItemModal,
  busca,
  setBusca,
  categorias,
  categoriaSelecionada,
  setCategoriaSelecionada,
  produtosFiltrados,
  adicionarItem,
  pedidoAtual,
  total,
  user,
  caixa,
  setCaixa,
  showCaixaModal,
  setShowCaixaModal,
  toast,
  loading,
}) => {
  const [activeTab, setActiveTab] = React.useState("ifood");

  return (
    <div className="space-y-6">
      {/* Tabs */}
      <div className="flex space-x-4 border-b border-gray-200 dark:border-gray-700">
        <button
          onClick={() => setActiveTab("ifood")}
          className={`px-4 py-2 font-medium ${
            activeTab === "ifood"
              ? "border-b-2 border-blue-500 text-blue-500"
              : "text-gray-500 hover:text-gray-700"
          }`}
        >
          Pedidos iFood
        </button>
      </div>

      {/* Conteúdo da aba iFood */}
      {activeTab === "ifood" && (
        <div className="space-y-6">
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm overflow-hidden">
            <div className="p-6">
              {ifoodPedidos.length === 0 ? (
                <div className="text-center py-8">
                  <Store size={48} className="mx-auto text-gray-400 dark:text-gray-600" />
                  <p className="mt-2 text-gray-500 dark:text-gray-400">
                    Nenhum pedido iFood
                  </p>
                </div>
              ) : (
                <div className="space-y-6">
                  {ifoodPedidos.map(pedido => (
                    <div
                      key={pedido.id}
                      className="border border-gray-200 dark:border-gray-700 rounded-lg p-6"
                    >
                      <div className="flex justify-between items-start mb-4">
                        <div>
                          <h3 className="font-medium text-gray-900 dark:text-white">
                            Pedido #{pedido.id}
                          </h3>
                          <p className="text-sm text-gray-500 dark:text-gray-400">
                            Cliente: {pedido.cliente}
                          </p>
                          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                            {formatarTempo(pedido.horario)}
                          </p>
                        </div>
                        <span className="text-lg font-semibold text-gray-900 dark:text-white">
                          {formatarDinheiro(pedido.total)}
                        </span>
                      </div>

                      <div className="space-y-2 mb-6">
                        {pedido.itens.map((item, index) => (
                          <div
                            key={index}
                            className="flex justify-between text-sm"
                          >
                            <span className="text-gray-700 dark:text-gray-300">
                              {item.quantidade}x {item.nome}
                            </span>
                            <span className="text-gray-500 dark:text-gray-400">
                              {formatarDinheiro(item.preco * item.quantidade)}
                            </span>
                          </div>
                        ))}
                      </div>

                      <div className="flex justify-end space-x-3">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleRejectIFoodOrder(pedido.id)}
                          className="text-red-600 dark:text-red-400"
                        >
                          Recusar
                        </Button>
                        <Button
                          variant="primary"
                          size="sm"
                          onClick={() => handleAcceptIFoodOrder(pedido.id)}
                        >
                          Aceitar
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Modal de Adicionar Item */}
      {showAddItemModal && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-black bg-opacity-50 flex items-center justify-center">
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl w-full max-w-4xl m-4">
            <div className="p-6">
              <div className="flex justify-between items-center mb-6">
                <h3 className="text-lg font-medium text-gray-900 dark:text-white">Adicionar Item</h3>
                <button 
                  onClick={() => setShowAddItemModal(false)}
                  className="text-gray-400 dark:text-gray-500 hover:text-gray-500 dark:hover:text-gray-400 transition-colors"
                >
                  <X size={24} />
                </button>
              </div>

              <div className="space-y-6">
                {/* Busca */}
                <div className="relative">
                  <Search className="absolute left-3 top-2.5 text-gray-400" size={20} />
                  <input
                    type="text"
                    placeholder="Buscar produtos..."
                    value={busca}
                    onChange={(e) => setBusca(e.target.value)}
                    className="pl-10 w-full rounded-lg border border-gray-300 dark:border-gray-600 py-2 px-4 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white"
                  />
                </div>

                {/* Categorias */}
                <div className="flex gap-2 overflow-x-auto pb-2">
                  <button
                    onClick={() => setCategoriaSelecionada('todas')}
                    className={`px-4 py-2 rounded-full whitespace-nowrap transition-colors ${
                      categoriaSelecionada === 'todas'
                        ? 'bg-blue-500 text-white'
                        : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
                    }`}
                  >
                    Todas
                  </button>
                  {categorias.map(categoria => (
                    <button
                      key={categoria}
                      onClick={() => setCategoriaSelecionada(categoria)}
                      className={`px-4 py-2 rounded-full whitespace-nowrap transition-colors ${
                        categoriaSelecionada === categoria
                          ? 'bg-blue-500 text-white'
                          : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
                      }`}
                    >
                      {categoria}
                    </button>
                  ))}
                </div>

                {/* Grid de Produtos */}
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4 max-h-[60vh] overflow-y-auto">
                  {produtosFiltrados.map(produto => (
                    <button
                      key={produto.id}
                      onClick={() => adicionarItem(produto)}
                      className="p-4 border border-gray-200 dark:border-gray-700 rounded-lg text-left hover:bg-gray-50 dark:hover:bg-gray-700 transition-all hover:border-blue-300 dark:hover:border-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      <h3 className="font-medium text-gray-900 dark:text-white">{produto.nome}</h3>
                      <p className="text-sm text-gray-500 dark:text-gray-400">{produto.categoria}</p>
                      <p className="mt-2 font-semibold text-blue-600 dark:text-blue-400">
                        {formatarDinheiro(produto.preco)}
                      </p>
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal de Abertura de Caixa */}
      {showCaixaModal && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-black bg-opacity-50 flex items-center justify-center">
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl w-full max-w-md m-4">
            <div className="p-6">
              <div className="flex justify-between items-center mb-6">
                <h3 className="text-lg font-medium text-gray-900 dark:text-white">Abertura de Caixa</h3>
                <button 
                  onClick={() => setShowCaixaModal(false)}
                  className="text-gray-400 dark:text-gray-500 hover:text-gray-500 dark:hover:text-gray-400 transition-colors"
                >
                  <X size={24} />
                </button>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                    Operador
                  </label>
                  <input
                    type="text"
                    value={user?.email || ''}
                    disabled
                    className="mt-1 block w-full rounded-md border-gray-300 dark:border-gray-600 bg-gray-100 dark:bg-gray-700 cursor-not-allowed p-2 text-gray-500 dark:text-gray-400"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                    Valor Inicial em Caixa
                  </label>
                  <div className="mt-1 relative rounded-md shadow-sm">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                      <span className="text-gray-500 dark:text-gray-400 sm:text-sm">R$</span>
                    </div>
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      value={caixa.valorInicial}
                      onChange={(e) => setCaixa({ ...caixa, valorInicial: parseFloat(e.target.value) || 0 })}
                      className="pl-12 block w-full pr-12 sm:text-sm border-gray-300 dark:border-gray-600 rounded-md focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white p-2"
                      placeholder="0,00"
                    />
                  </div>
                </div>

                <Button
                  variant="primary"
                  fullWidth
                  onClick={() => {
                    setCaixa(prev => ({
                      ...prev,
                      isOpen: true,
                      dataAbertura: new Date(),
                      saldoAtual: prev.valorInicial
                    }));
                    setShowCaixaModal(false);
                    toast.success('Caixa aberto com sucesso!');
                  }}
                  isLoading={loading}
                >
                  Abrir Caixa
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default PDV;
