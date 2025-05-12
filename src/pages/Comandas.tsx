import React, { useState, useEffect } from 'react';
import { Filter, Calendar, Clock, CheckCircle, CookingPot, ArrowUp, ArrowLeft } from 'lucide-react';
import Button from '../components/ui/Button';
import { useRestaurante } from '../contexts/RestauranteContext';
import ComandaItem from '../components/comanda/ComandaItem';
import ComandaModal from '../components/comanda/ComandaModal';
import { formatarDinheiro } from '../utils/formatters';
import { useNavigate } from 'react-router-dom';

const Comandas: React.FC = () => {
  const navigate = useNavigate();
  const { mesas, itensComanda, atualizarStatusItem } = useRestaurante();
  const [filtroStatus, setFiltroStatus] = useState<string>('todos');
  const [filtroMesa, setFiltroMesa] = useState<number | null>(null);
  const [comandaModalAberta, setComandaModalAberta] = useState(false);
  const [mesaSelecionada, setMesaSelecionada] = useState<number | null>(null);
  const [showBackToTop, setShowBackToTop] = useState(false);
  
  useEffect(() => {
    const handleScroll = () => {
      setShowBackToTop(window.scrollY > 400);
    };

    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const scrollToTop = () => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };
  
  // Agrupar itens por mesa
  const itensPorMesa = itensComanda.reduce((acc, item) => {
    const mesaKey = item.mesaId;
    if (!acc[mesaKey]) {
      acc[mesaKey] = [];
    }
    acc[mesaKey].push(item);
    return acc;
  }, {} as Record<number, ItemComanda[]>);
  
  // Aplicar filtros
  const mesasFiltradasIds = Object.keys(itensPorMesa)
    .map(Number)
    .filter(mesaId => {
      if (filtroMesa !== null && mesaId !== filtroMesa) {
        return false;
      }
      
      if (filtroStatus !== 'todos') {
        const temItemComStatus = itensPorMesa[mesaId].some(
          item => item.status === filtroStatus
        );
        return temItemComStatus;
      }
      
      return true;
    });

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pendente':
        return 'border-yellow-500 bg-yellow-50';
      case 'preparando':
        return 'border-blue-500 bg-blue-50';
      case 'pronto':
        return 'border-green-500 bg-green-50';
      case 'entregue':
        return 'border-gray-500 bg-gray-50';
      default:
        return 'border-gray-200 bg-white';
    }
  };

  const handleStatusUpdate = (itemId: number, novoStatus: 'preparando' | 'pronto') => {
    atualizarStatusItem(itemId, novoStatus);
  };

  const abrirComandaModal = (mesaId: number) => {
    setMesaSelecionada(mesaId);
    setComandaModalAberta(true);
  };

  return (
    <div className="min-h-screen bg-gray-100">
      {/* Header */}
      <header className="bg-white shadow-sm border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center">
              <button
                onClick={() => navigate(-1)}
                className="mr-4 text-gray-500 hover:text-gray-700 transition-colors"
              >
                <ArrowLeft size={24} />
              </button>
              <div>
                <h1 className="text-xl font-semibold text-gray-900">Comandas</h1>
                <p className="text-sm text-gray-500">Gerenciamento de comandas e pedidos</p>
              </div>
            </div>
            <div className="flex items-center space-x-3">
              <div className="flex items-center bg-white rounded-md shadow-sm px-3 py-2 text-sm">
                <Calendar size={16} className="text-gray-400 mr-2" />
                <span>Hoje</span>
              </div>
            </div>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Filtros */}
        <div className="bg-white rounded-lg shadow-sm p-4 mb-6">
          <div className="flex items-center mb-3">
            <Filter size={16} className="text-gray-500 mr-2" />
            <h3 className="text-sm font-medium">Filtros</h3>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="text-sm text-gray-700 block mb-2">Status</label>
              <div className="flex flex-wrap gap-2">
                <Button
                  variant={filtroStatus === 'todos' ? 'primary' : 'ghost'}
                  size="sm"
                  onClick={() => setFiltroStatus('todos')}
                >
                  Todos
                </Button>
                <Button
                  variant={filtroStatus === 'pendente' ? 'warning' : 'ghost'}
                  size="sm"
                  onClick={() => setFiltroStatus('pendente')}
                >
                  Pendentes
                </Button>
                <Button
                  variant={filtroStatus === 'preparando' ? 'primary' : 'ghost'}
                  size="sm"
                  onClick={() => setFiltroStatus('preparando')}
                >
                  Preparando
                </Button>
                <Button
                  variant={filtroStatus === 'pronto' ? 'success' : 'ghost'}
                  size="sm"
                  onClick={() => setFiltroStatus('pronto')}
                >
                  Prontos
                </Button>
              </div>
            </div>
            
            <div>
              <label className="text-sm text-gray-700 block mb-2">Mesa</label>
              <div className="flex flex-wrap gap-2">
                <Button
                  variant={filtroMesa === null ? 'primary' : 'ghost'}
                  size="sm"
                  onClick={() => setFiltroMesa(null)}
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
            <div className="col-span-full bg-white rounded-lg shadow-sm p-8 text-center">
              <p className="text-gray-500">Nenhuma comanda encontrada com os filtros aplicados</p>
            </div>
          ) : (
            mesasFiltradasIds.map(mesaId => {
              const mesa = mesas.find(m => m.id === mesaId);
              if (!mesa) return null;
              
              const itens = itensPorMesa[mesaId];
              const horarioMaisRecente = new Date(
                Math.max(...itens.map(item => new Date(item.horario).getTime()))
              );
              
              const valorTotal = itens.reduce(
                (total, item) => total + item.preco * item.quantidade,
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
                        <h3 className="font-medium text-lg">
                          Mesa {mesa.numero}
                        </h3>
                        <div className="flex items-center mt-1 text-sm text-gray-500">
                          <Clock size={14} className="mr-1" />
                          <span>{new Date(horarioMaisRecente).toLocaleTimeString('pt-BR')}</span>
                          <span className="mx-2">•</span>
                          <span>{mesa.garcom || 'Garçom não atribuído'}</span>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="text-gray-500 text-sm">Total</p>
                        <p className="font-medium text-lg">
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
                              <p className="font-medium">{item.quantidade}x {item.nome}</p>
                              {item.observacao && (
                                <p className="text-sm text-gray-600 mt-1">{item.observacao}</p>
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
            className="fixed bottom-8 right-8 bg-blue-600 text-white p-4 rounded-full shadow-lg hover:bg-blue-700 transition-colors flex items-center space-x-2"
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