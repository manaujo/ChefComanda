import React, { useState, useEffect } from 'react';
import { Filter, Calendar, Clock, CheckCircle, CookingPot, ArrowUp, ArrowLeft } from 'lucide-react';
import Button from '../components/ui/Button';
import { useRestaurante } from '../contexts/RestauranteContext';
import ComandaItem from '../components/comanda/ComandaItem';
import ComandaModal from '../components/comanda/ComandaModal';
import { formatarDinheiro } from '../utils/formatters';
import { useNavigate } from 'react-router-dom';
import { usePageActive } from '../hooks/usePageVisibility';
import { usePreventReload } from '../hooks/usePreventReload';

const Comandas: React.FC = () => {
  const navigate = useNavigate();
  const { mesas, itensComanda, atualizarStatusItem, restaurante } = useRestaurante();
  const [filtroStatus, setFiltroStatus] = useState<string>('todos');
  const [filtroMesa, setFiltroMesa] = useState<string | null>(null);
  const [comandaModalAberta, setComandaModalAberta] = useState(false);
  const [mesaSelecionada, setMesaSelecionada] = useState<string | null>(null);
  const [showBackToTop, setShowBackToTop] = useState(false);
  const [dataInitialized, setDataInitialized] = useState(false);
  
  const isPageActive = usePageActive();
  const { currentRoute } = usePreventReload();
  
  useEffect(() => {
    const handleScroll = () => {
      setShowBackToTop(window.scrollY > 400);
    };

    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  // Salvar estado dos filtros
  useEffect(() => {
    sessionStorage.setItem('comandas_filters', JSON.stringify({
      filtroStatus,
      filtroMesa
    }));
  }, [filtroStatus, filtroMesa]);

  // Restaurar estado dos filtros
  useEffect(() => {
    const savedFilters = sessionStorage.getItem('comandas_filters');
    if (savedFilters) {
      try {
        const parsed = JSON.parse(savedFilters);
        setFiltroStatus(parsed.filtroStatus || 'todos');
        setFiltroMesa(parsed.filtroMesa || null);
      } catch (error) {
        console.error('Error restoring comandas filters:', error);
      }
    }
  }, []);
  const scrollToTop = () => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };
  
  // Agrupar itens por mesa
  const itensPorMesa = itensComanda.reduce((acc, item) => {
    const mesaKey = item.mesa_id;
    if (!acc[mesaKey]) {
      acc[mesaKey] = [];
    }
    acc[mesaKey].push(item);
    return acc;
  }, {} as Record<string, ComandaItemData[]>);
  
  // Aplicar filtros
  const mesasFiltradasIds = Object.keys(itensPorMesa)
    .filter(mesaId => {
      // Verificar se a mesa pertence ao restaurante do usuário logado
      const mesa = mesas.find(m => m.id === mesaId);
      if (!mesa || mesa.restaurante_id !== restaurante?.id) {
        return false;
      }
      
      // Filtrar apenas itens de comandas abertas
      const itensDoMesa = itensPorMesa[mesaId];
      if (!itensDoMesa || !Array.isArray(itensDoMesa)) {
        return false;
      }
      
      // Verificar se há pelo menos um item que não foi entregue
      const temItensAtivos = itensDoMesa.some(item => 
        item.status !== 'entregue' && item.status !== 'cancelado'
      );
      
      if (!temItensAtivos) {
        return false;
      }
      
      if (filtroMesa !== null && mesaId !== filtroMesa) {
        return false;
      }
      
      if (filtroStatus !== 'todos') {
        const temItemComStatus = itensDoMesa.some(
          item => item.status === filtroStatus && item.status !== 'entregue' && item.status !== 'cancelado'
        );
        return temItemComStatus;
      }
      
      return true;
    });

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pendente':
        return 'border-yellow-500 bg-yellow-50 dark:bg-yellow-900/20';
      case 'preparando':
        return 'border-blue-500 bg-blue-50 dark:bg-blue-900/20';
      case 'pronto':
        return 'border-green-500 bg-green-50 dark:bg-green-900/20';
      case 'entregue':
        return 'border-gray-500 bg-gray-50 dark:bg-gray-900/20';
      default:
        return 'border-gray-200 bg-white dark:bg-gray-800';
    }
  };

  const handleStatusUpdate = (itemId: string, novoStatus: 'preparando' | 'pronto') => {
    atualizarStatusItem(itemId, novoStatus);
  };

  const abrirComandaModal = (mesaId: string) => {
    setMesaSelecionada(mesaId);
    setComandaModalAberta(true);
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 transition-colors duration-300">
      {/* Header */}
      <header className="bg-white/90 dark:bg-gray-800/90 backdrop-blur-sm shadow-lg border-b border-gray-200/50 dark:border-gray-700/50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center">
              <button
                onClick={() => navigate(-1)}
                className="mr-4 p-2 text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-xl transition-all duration-200"
              >
                <ArrowLeft size={24} />
              </button>
              <div>
                <h1 className="text-xl font-semibold text-gray-900 dark:text-white">Comandas</h1>
                <p className="text-sm text-gray-500 dark:text-gray-400">Gerenciamento de comandas e pedidos</p>
              </div>
            </div>
            <div className="flex items-center space-x-3">
              <div className="flex items-center bg-white/80 dark:bg-gray-700/80 backdrop-blur-sm rounded-xl shadow-md px-4 py-2 text-sm border border-white/20 dark:border-gray-600/50">
                <Calendar size={16} className="text-gray-400 dark:text-gray-500 mr-2" />
                <span className="text-gray-700 dark:text-gray-300">Hoje</span>
              </div>
            </div>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Filtros */}
        <div className="bg-white/90 dark:bg-gray-800/90 backdrop-blur-sm rounded-2xl shadow-lg border border-white/20 dark:border-gray-700/50 p-6 mb-6">
          <div className="flex items-center mb-3">
            <Filter size={16} className="text-gray-500 dark:text-gray-400 mr-2" />
            <h3 className="text-sm font-bold text-gray-700 dark:text-gray-300">Filtros</h3>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="text-sm font-bold text-gray-700 dark:text-gray-300 block mb-3">Status</label>
              <div className="flex flex-wrap gap-3">
                <Button
                  variant={filtroStatus === 'todos' ? 'primary' : 'ghost'}
                  size="sm"
                  onClick={() => setFiltroStatus('todos')}
                  className="rounded-2xl font-semibold"
                >
                  Todos
                </Button>
                <Button
                  variant={filtroStatus === 'pendente' ? 'warning' : 'ghost'}
                  size="sm"
                  onClick={() => setFiltroStatus('pendente')}
                  className="rounded-2xl font-semibold"
                >
                  Pendentes
                </Button>
                <Button
                  variant={filtroStatus === 'preparando' ? 'primary' : 'ghost'}
                  size="sm"
                  onClick={() => setFiltroStatus('preparando')}
                  className="rounded-2xl font-semibold"
                >
                  Preparando
                </Button>
                <Button
                  variant={filtroStatus === 'pronto' ? 'success' : 'ghost'}
                  size="sm"
                  onClick={() => setFiltroStatus('pronto')}
                  className="rounded-2xl font-semibold"
                >
                  Prontos
                </Button>
              </div>
            </div>
            
            <div>
              <label className="text-sm font-bold text-gray-700 dark:text-gray-300 block mb-3">Mesa</label>
              <div className="flex flex-wrap gap-3">
                <Button
                  variant={filtroMesa === null ? 'primary' : 'ghost'}
                  size="sm"
                  onClick={() => setFiltroMesa(null)}
                  className="rounded-2xl font-semibold"
                >
                  Todas
                </Button>
                {mesas
                  .filter(mesa => mesa.status !== 'livre')
                  .map(mesa => (
                    <Button
                      key={mesa.id}
                      variant={filtroMesa === mesa.id ? 'secondary' : 'ghost'}
                      size="sm"
                      onClick={() => setFiltroMesa(mesa.id)}
                      className="rounded-2xl font-semibold"
                    >
                      Mesa {mesa.numero}
                    </Button>
                  ))}
              </div>
            </div>
          </div>
        </div>

        {/* Lista de Comandas */}
        <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
          {mesasFiltradasIds.length === 0 ? (
            <div className="col-span-full bg-white dark:bg-gray-800 rounded-lg shadow-sm p-8 text-center">
              <p className="text-gray-500 dark:text-gray-400">Nenhuma comanda encontrada com os filtros aplicados</p>
            </div>
          ) : (
            mesasFiltradasIds.map(mesaId => {
              const mesa = mesas.find(m => m.id === mesaId);
              if (!mesa) return null;
              
              const itens = itensPorMesa[mesaId] || [];
              if (itens.length === 0) return null;
              
              const horarioMaisRecente = new Date(
                Math.max(...itens.map(item => new Date(item.created_at).getTime()))
              );
              
              const valorTotal = itens.reduce(
                (total, item) => total + item.preco_unitario * item.quantidade,
                0
              );

              const statusPrioritario = itens.some(item => item.status === 'pendente')
                ? 'pendente'
                : itens.some(item => item.status === 'preparando')
                  ? 'preparando'
                  : itens.some(item => item.status === 'pronto')
                    ? 'pronto'
                    : 'entregue';
              
              return (
                <div 
                  key={mesaId} 
                  className={`rounded-lg shadow-sm overflow-hidden border-l-4 ${getStatusColor(statusPrioritario)}`}
                >
                  <div className="px-6 py-4">
                    <div className="flex justify-between items-start">
                      <div>
                        <h3 className="font-medium text-lg text-gray-900 dark:text-white">
                          Mesa {mesa.numero}
                        </h3>
                        <div className="flex items-center mt-1 text-sm text-gray-500 dark:text-gray-400">
                          <Clock size={14} className="mr-1" />
                          <span>{new Date(horarioMaisRecente).toLocaleTimeString('pt-BR')}</span>
                          <span className="mx-2">•</span>
                          <span>{mesa.garcom || 'Garçom não atribuído'}</span>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="text-gray-500 dark:text-gray-400 text-sm">Total</p>
                        <p className="font-medium text-lg text-gray-900 dark:text-white">
                          {formatarDinheiro(valorTotal)}
                        </p>
                      </div>
                    </div>

                    <div className="mt-4 space-y-4">
                      {itens.map(item => (
                        <div 
                          key={item.id}
                          className={`p-4 rounded-lg ${getStatusColor(item.status)}`}
                        >
                          <div className="flex justify-between items-start">
                            <div>
                              <p className="font-medium text-gray-900 dark:text-white">
                                {item.quantidade}x {item.nome}
                              </p>
                              {item.observacao && (
                                <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                                  {item.observacao}
                                </p>
                              )}
                            </div>
                            <div className="flex items-center space-x-2">
                              {item.status === 'pendente' && (
                                <Button
                                  variant="primary"
                                  size="sm"
                                  icon={<CookingPot size={16} />}
                                  onClick={() => handleStatusUpdate(item.id, 'preparando')}
                                >
                                  Preparar
                                </Button>
                              )}
                              {item.status === 'preparando' && (
                                <Button
                                  variant="success"
                                  size="sm"
                                  icon={<CheckCircle size={16} />}
                                  onClick={() => handleStatusUpdate(item.id, 'pronto')}
                                >
                                  Pronto
                                </Button>
                              )}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>

                    <div className="mt-4 flex justify-end">
                      <Button
                        variant="primary"
                        size="sm"
                        onClick={() => abrirComandaModal(mesaId)}
                      >
                        Ver Comanda Completa
                      </Button>
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Modal de Comanda */}
        {mesaSelecionada && (
          <ComandaModal 
            isOpen={comandaModalAberta} 
            onClose={() => setComandaModalAberta(false)} 
            mesaId={mesaSelecionada} 
          />
        )}

        {/* Back to Top Button */}
        {showBackToTop && (
          <button
            onClick={scrollToTop}
            className="fixed bottom-8 right-8 bg-red-600 dark:bg-red-500 text-white p-4 rounded-full shadow-lg hover:bg-red-700 dark:hover:bg-red-600 transition-colors flex items-center space-x-2"
          >
            <ArrowUp size={20} />
            <span>Voltar</span>
          </button>
        )}
      </div>
    </div>
  );
};

export default Comandas;