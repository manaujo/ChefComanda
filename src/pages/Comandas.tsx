import React, { useState, useEffect } from 'react';
import { 
  Filter, Calendar, Clock, CheckCircle, CookingPot, ArrowUp, ArrowLeft,
  ChefHat, Timer, AlertTriangle, Utensils, Coffee, Users, Bell,
  PlayCircle, Pause, RotateCcw, Eye, Zap, Flame, Star, Package,
  TrendingUp, Activity, Target, Gauge, Award, Sparkles
} from 'lucide-react';
import Button from '../components/ui/Button';
import { useRestaurante } from '../contexts/RestauranteContext';
import ComandaItem from '../components/comanda/ComandaItem';
import ComandaModal from '../components/comanda/ComandaModal';
import { formatarDinheiro, formatarTempo } from '../utils/formatters';
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
  const [tempoAtual, setTempoAtual] = useState(new Date());
  const [viewMode, setViewMode] = useState<'fila' | 'mesas'>('fila');
  
  const isPageActive = usePageActive();
  const { currentRoute } = usePreventReload();
  
  useEffect(() => {
    const handleScroll = () => {
      setShowBackToTop(window.scrollY > 400);
    };

    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  // Atualizar tempo a cada minuto
  useEffect(() => {
    const interval = setInterval(() => {
      setTempoAtual(new Date());
    }, 60000);

    return () => clearInterval(interval);
  }, []);

  // Salvar estado dos filtros
  useEffect(() => {
    sessionStorage.setItem('comandas_filters', JSON.stringify({
      filtroStatus,
      filtroMesa,
      viewMode
    }));
  }, [filtroStatus, filtroMesa, viewMode]);

  // Restaurar estado dos filtros
  useEffect(() => {
    const savedFilters = sessionStorage.getItem('comandas_filters');
    if (savedFilters) {
      try {
        const parsed = JSON.parse(savedFilters);
        setFiltroStatus(parsed.filtroStatus || 'todos');
        setFiltroMesa(parsed.filtroMesa || null);
        setViewMode(parsed.viewMode || 'fila');
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
        return 'border-yellow-500 bg-gradient-to-br from-yellow-50 to-amber-100 dark:from-yellow-900/20 dark:to-amber-800/30';
      case 'preparando':
        return 'border-blue-500 bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-blue-900/20 dark:to-indigo-800/30';
      case 'pronto':
        return 'border-green-500 bg-gradient-to-br from-green-50 to-emerald-100 dark:from-green-900/20 dark:to-emerald-800/30';
      case 'entregue':
        return 'border-gray-500 bg-gradient-to-br from-gray-50 to-slate-100 dark:from-gray-900/20 dark:to-slate-800/30';
      default:
        return 'border-gray-200 bg-white dark:bg-gray-800';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'pendente':
        return <Timer className="w-6 h-6 text-yellow-600 animate-pulse" />;
      case 'preparando':
        return <Flame className="w-6 h-6 text-blue-600 animate-bounce" />;
      case 'pronto':
        return <CheckCircle className="w-6 h-6 text-green-600" />;
      case 'entregue':
        return <CheckCircle className="w-6 h-6 text-gray-600" />;
      default:
        return <Clock className="w-6 h-6 text-gray-600" />;
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'pendente':
        return 'Aguardando Preparo';
      case 'preparando':
        return 'Em Preparo';
      case 'pronto':
        return 'Pronto para Entrega';
      case 'entregue':
        return 'Entregue';
      default:
        return status;
    }
  };

  const getPriorityLevel = (item: ComandaItemData) => {
    const tempoEspera = (tempoAtual.getTime() - new Date(item.created_at).getTime()) / (1000 * 60);
    
    if (tempoEspera > 30) return 'alta';
    if (tempoEspera > 15) return 'media';
    return 'baixa';
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'alta':
        return 'border-red-500 bg-red-100 text-red-800 animate-pulse';
      case 'media':
        return 'border-orange-500 bg-orange-100 text-orange-800';
      default:
        return 'border-blue-500 bg-blue-100 text-blue-800';
    }
  };

  const getPriorityIcon = (priority: string) => {
    switch (priority) {
      case 'alta':
        return <AlertTriangle className="w-4 h-4" />;
      case 'media':
        return <Clock className="w-4 h-4" />;
      default:
        return <Timer className="w-4 h-4" />;
    }
  };

  const handleStatusUpdate = (itemId: string, novoStatus: 'preparando' | 'pronto') => {
    atualizarStatusItem(itemId, novoStatus);
  };

  const abrirComandaModal = (mesaId: string) => {
    setMesaSelecionada(mesaId);
    setComandaModalAberta(true);
  };

  // Organizar itens por prioridade e status para criar fila de preparo
  const organizarFilaPreparo = () => {
    const todosItens = mesasFiltradasIds.flatMap(mesaId => {
      const mesa = mesas.find(m => m.id === mesaId);
      const itens = itensPorMesa[mesaId] || [];
      
      return itens
        .filter(item => item.status !== 'entregue' && item.status !== 'cancelado')
        .map(item => ({
          ...item,
          mesa: mesa,
          prioridade: getPriorityLevel(item),
          tempoEspera: Math.floor((tempoAtual.getTime() - new Date(item.created_at).getTime()) / (1000 * 60))
        }));
    });

    // Ordenar por status (pendente primeiro) e depois por tempo de criação
    return todosItens.sort((a, b) => {
      const statusOrder = { 'pendente': 0, 'preparando': 1, 'pronto': 2 };
      const statusDiff = statusOrder[a.status] - statusOrder[b.status];
      
      if (statusDiff !== 0) return statusDiff;
      
      // Se mesmo status, ordenar por tempo (mais antigo primeiro)
      return new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
    });
  };

  const filaItens = organizarFilaPreparo();
  const itensPendentes = filaItens.filter(item => item.status === 'pendente');
  const itensPreparando = filaItens.filter(item => item.status === 'preparando');
  const itensProntos = filaItens.filter(item => item.status === 'pronto');

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-blue-50/30 to-indigo-50/30 dark:from-gray-900 dark:via-gray-800 dark:to-gray-700">
      {/* Header Moderno */}
      <header className="bg-white/90 dark:bg-gray-800/90 backdrop-blur-sm shadow-xl border-b border-gray-200/50 dark:border-gray-700/50 sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-20">
            <div className="flex items-center">
              <button
                onClick={() => navigate(-1)}
                className="mr-6 p-3 text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-2xl transition-all duration-200 hover:scale-110"
              >
                <ArrowLeft size={24} />
              </button>
              <div className="flex items-center">
                <div className="relative">
                  <div className="p-4 bg-gradient-to-br from-orange-500 via-red-600 to-red-700 rounded-3xl shadow-2xl mr-6 transform rotate-3 hover:rotate-0 transition-transform duration-300">
                    <ChefHat size={32} className="text-white" />
                  </div>
                  <div className="absolute -top-2 -right-2 w-6 h-6 bg-gradient-to-r from-yellow-400 to-orange-500 rounded-full flex items-center justify-center shadow-lg animate-pulse">
                    <Flame className="w-3 h-3 text-white" />
                  </div>
                </div>
                <div>
                  <h1 className="text-3xl font-bold bg-gradient-to-r from-gray-900 via-red-800 to-orange-900 dark:from-white dark:via-red-200 dark:to-orange-200 bg-clip-text text-transparent">
                    Central da Cozinha
                  </h1>
                  <p className="text-lg text-gray-600 dark:text-gray-400 mt-1">
                    Fila de preparo e gerenciamento de pedidos
                  </p>
                </div>
              </div>
            </div>
            <div className="flex items-center space-x-4">
              <div className="flex items-center bg-white/80 dark:bg-gray-700/80 backdrop-blur-sm rounded-2xl shadow-lg px-6 py-3 text-sm border border-white/20 dark:border-gray-600/50">
                <Calendar size={18} className="text-gray-400 dark:text-gray-500 mr-3" />
                <span className="text-gray-700 dark:text-gray-300 font-medium">
                  {new Date().toLocaleDateString('pt-BR', { 
                    weekday: 'long', 
                    day: 'numeric', 
                    month: 'long' 
                  })}
                </span>
              </div>
              <div className="flex items-center bg-green-100 dark:bg-green-900/50 rounded-2xl shadow-lg px-6 py-3 text-sm border border-green-200 dark:border-green-700">
                <Clock size={18} className="text-green-600 dark:text-green-400 mr-3" />
                <span className="text-green-800 dark:text-green-200 font-bold">
                  {tempoAtual.toLocaleTimeString('pt-BR', { 
                    hour: '2-digit', 
                    minute: '2-digit' 
                  })}
                </span>
              </div>
            </div>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Estatísticas da Cozinha */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <div className="bg-gradient-to-br from-yellow-500 to-amber-600 rounded-3xl shadow-xl p-6 text-white transform hover:scale-105 transition-all duration-300">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-yellow-100 text-sm font-medium">Na Fila</p>
                <p className="text-4xl font-bold mt-2">{itensPendentes.length}</p>
                <p className="text-yellow-200 text-xs mt-1">Aguardando preparo</p>
              </div>
              <div className="p-4 bg-white/20 rounded-2xl">
                <Timer size={32} />
              </div>
            </div>
          </div>

          <div className="bg-gradient-to-br from-blue-500 to-indigo-600 rounded-3xl shadow-xl p-6 text-white transform hover:scale-105 transition-all duration-300">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-blue-100 text-sm font-medium">Em Preparo</p>
                <p className="text-4xl font-bold mt-2">{itensPreparando.length}</p>
                <p className="text-blue-200 text-xs mt-1">Sendo preparados</p>
              </div>
              <div className="p-4 bg-white/20 rounded-2xl">
                <Flame size={32} />
              </div>
            </div>
          </div>

          <div className="bg-gradient-to-br from-green-500 to-emerald-600 rounded-3xl shadow-xl p-6 text-white transform hover:scale-105 transition-all duration-300">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-green-100 text-sm font-medium">Prontos</p>
                <p className="text-4xl font-bold mt-2">{itensProntos.length}</p>
                <p className="text-green-200 text-xs mt-1">Para entrega</p>
              </div>
              <div className="p-4 bg-white/20 rounded-2xl">
                <CheckCircle size={32} />
              </div>
            </div>
          </div>

          <div className="bg-gradient-to-br from-purple-500 to-violet-600 rounded-3xl shadow-xl p-6 text-white transform hover:scale-105 transition-all duration-300">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-purple-100 text-sm font-medium">Mesas Ativas</p>
                <p className="text-4xl font-bold mt-2">{mesasFiltradasIds.length}</p>
                <p className="text-purple-200 text-xs mt-1">Com pedidos</p>
              </div>
              <div className="p-4 bg-white/20 rounded-2xl">
                <Coffee size={32} />
              </div>
            </div>
          </div>
        </div>

        {/* Controles de Visualização */}
        <div className="bg-white/90 dark:bg-gray-800/90 backdrop-blur-sm rounded-3xl shadow-xl border border-white/20 dark:border-gray-700/50 p-6 mb-8">
          <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-6">
            <div className="flex items-center space-x-4">
              <div className="flex items-center">
                <Filter size={20} className="text-gray-500 dark:text-gray-400 mr-3" />
                <h3 className="text-lg font-bold text-gray-700 dark:text-gray-300">Controles da Cozinha</h3>
              </div>
            </div>
            
            <div className="flex flex-wrap gap-4">
              {/* Modo de Visualização */}
              <div className="flex bg-gray-100 dark:bg-gray-700 rounded-2xl p-1">
                <Button
                  variant={viewMode === 'fila' ? 'primary' : 'ghost'}
                  size="sm"
                  onClick={() => setViewMode('fila')}
                  className="rounded-xl font-semibold px-6"
                  icon={<Target size={16} />}
                >
                  Fila de Preparo
                </Button>
                <Button
                  variant={viewMode === 'mesas' ? 'primary' : 'ghost'}
                  size="sm"
                  onClick={() => setViewMode('mesas')}
                  className="rounded-xl font-semibold px-6"
                  icon={<Coffee size={16} />}
                >
                  Por Mesa
                </Button>
              </div>

              {/* Filtros de Status */}
              <div className="flex flex-wrap gap-3">
                <Button
                  variant={filtroStatus === 'todos' ? 'primary' : 'ghost'}
                  size="sm"
                  onClick={() => setFiltroStatus('todos')}
                  className="rounded-2xl font-semibold"
                  icon={<Activity size={16} />}
                >
                  Todos ({filaItens.length})
                </Button>
                <Button
                  variant={filtroStatus === 'pendente' ? 'warning' : 'ghost'}
                  size="sm"
                  onClick={() => setFiltroStatus('pendente')}
                  className="rounded-2xl font-semibold"
                  icon={<Timer size={16} />}
                >
                  Pendentes ({itensPendentes.length})
                </Button>
                <Button
                  variant={filtroStatus === 'preparando' ? 'primary' : 'ghost'}
                  size="sm"
                  onClick={() => setFiltroStatus('preparando')}
                  className="rounded-2xl font-semibold"
                  icon={<Flame size={16} />}
                >
                  Preparando ({itensPreparando.length})
                </Button>
                <Button
                  variant={filtroStatus === 'pronto' ? 'success' : 'ghost'}
                  size="sm"
                  onClick={() => setFiltroStatus('pronto')}
                  className="rounded-2xl font-semibold"
                  icon={<CheckCircle size={16} />}
                >
                  Prontos ({itensProntos.length})
                </Button>
              </div>
            </div>
          </div>
        </div>

        {/* Visualização por Fila de Preparo */}
        {viewMode === 'fila' && (
          <div className="space-y-8">
            {/* Fila de Pendentes */}
            {itensPendentes.length > 0 && (
              <div className="bg-white/95 dark:bg-gray-800/95 backdrop-blur-sm rounded-3xl shadow-2xl border border-white/20 dark:border-gray-700/50 overflow-hidden">
                <div className="bg-gradient-to-r from-yellow-500 to-amber-600 px-8 py-6">
                  <div className="flex items-center justify-between text-white">
                    <div className="flex items-center">
                      <div className="p-3 bg-white/20 backdrop-blur-sm rounded-2xl mr-4">
                        <Timer size={28} />
                      </div>
                      <div>
                        <h2 className="text-2xl font-bold">Fila de Preparo</h2>
                        <p className="text-yellow-100">{itensPendentes.length} itens aguardando</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-3xl font-bold">{itensPendentes.length}</div>
                      <div className="text-yellow-200 text-sm">Próximos</div>
                    </div>
                  </div>
                </div>
                
                <div className="p-8">
                  <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
                    {itensPendentes.map((item, index) => (
                      <div 
                        key={item.id}
                        className="group relative bg-gradient-to-br from-white to-yellow-50 dark:from-gray-700 dark:to-yellow-900/20 rounded-3xl shadow-xl border-l-4 border-yellow-500 hover:shadow-2xl transition-all duration-300 hover:transform hover:scale-105 overflow-hidden"
                      >
                        {/* Número da Posição na Fila */}
                        <div className="absolute top-4 right-4 w-12 h-12 bg-gradient-to-br from-yellow-500 to-amber-600 rounded-full flex items-center justify-center shadow-lg">
                          <span className="text-white font-bold text-lg">#{index + 1}</span>
                        </div>

                        {/* Badge de Prioridade */}
                        <div className="absolute top-4 left-4">
                          <div className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-bold ${getPriorityColor(item.prioridade)}`}>
                            {getPriorityIcon(item.prioridade)}
                            <span className="ml-1 uppercase">{item.prioridade}</span>
                          </div>
                        </div>

                        <div className="p-6 pt-16">
                          <div className="flex items-center mb-4">
                            <div className="p-3 bg-yellow-100 dark:bg-yellow-900/50 rounded-2xl mr-4">
                              <Coffee size={20} className="text-yellow-600 dark:text-yellow-400" />
                            </div>
                            <div>
                              <h3 className="text-xl font-bold text-gray-900 dark:text-white">
                                Mesa {item.mesa?.numero}
                              </h3>
                              <p className="text-sm text-gray-600 dark:text-gray-400">
                                {item.mesa?.garcom || 'Garçom não atribuído'}
                              </p>
                            </div>
                          </div>

                          <div className="bg-gradient-to-r from-gray-50 to-yellow-50 dark:from-gray-600 dark:to-yellow-900/30 rounded-2xl p-4 mb-4">
                            <div className="flex items-center justify-between mb-2">
                              <h4 className="font-bold text-lg text-gray-900 dark:text-white">
                                {item.quantidade}x {item.nome}
                              </h4>
                              <span className="text-lg font-bold text-yellow-600 dark:text-yellow-400">
                                {formatarDinheiro(item.preco_unitario * item.quantidade)}
                              </span>
                            </div>
                            
                            {item.observacao && (
                              <div className="bg-white/80 dark:bg-gray-700/80 rounded-xl p-3 mb-3">
                                <p className="text-sm text-gray-700 dark:text-gray-300 italic">
                                  "📝 {item.observacao}"
                                </p>
                              </div>
                            )}

                            <div className="flex items-center justify-between text-sm">
                              <div className="flex items-center text-gray-600 dark:text-gray-400">
                                <Clock size={14} className="mr-1" />
                                <span>Pedido há {item.tempoEspera} min</span>
                              </div>
                              <div className="flex items-center text-blue-600 dark:text-blue-400">
                                <Package size={14} className="mr-1" />
                                <span>{item.categoria}</span>
                              </div>
                            </div>
                          </div>

                          <Button
                            variant="primary"
                            fullWidth
                            onClick={() => handleStatusUpdate(item.id, 'preparando')}
                            className="bg-gradient-to-r from-blue-600 to-indigo-700 hover:from-blue-700 hover:to-indigo-800 text-white rounded-2xl py-4 font-bold text-lg shadow-xl hover:shadow-2xl transition-all duration-200 transform hover:scale-105"
                            icon={<PlayCircle size={20} />}
                          >
                            Iniciar Preparo
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* Itens em Preparo */}
            {itensPreparando.length > 0 && (
              <div className="bg-white/95 dark:bg-gray-800/95 backdrop-blur-sm rounded-3xl shadow-2xl border border-white/20 dark:border-gray-700/50 overflow-hidden">
                <div className="bg-gradient-to-r from-blue-500 to-indigo-600 px-8 py-6">
                  <div className="flex items-center justify-between text-white">
                    <div className="flex items-center">
                      <div className="p-3 bg-white/20 backdrop-blur-sm rounded-2xl mr-4">
                        <Flame size={28} className="animate-bounce" />
                      </div>
                      <div>
                        <h2 className="text-2xl font-bold">Em Preparo</h2>
                        <p className="text-blue-100">{itensPreparando.length} itens sendo preparados</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-3xl font-bold">{itensPreparando.length}</div>
                      <div className="text-blue-200 text-sm">Ativos</div>
                    </div>
                  </div>
                </div>
                
                <div className="p-8">
                  <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
                    {itensPreparando.map((item) => (
                      <div 
                        key={item.id}
                        className="group relative bg-gradient-to-br from-white to-blue-50 dark:from-gray-700 dark:to-blue-900/20 rounded-3xl shadow-xl border-l-4 border-blue-500 hover:shadow-2xl transition-all duration-300 hover:transform hover:scale-105 overflow-hidden"
                      >
                        {/* Indicador de Preparo Ativo */}
                        <div className="absolute top-4 right-4 w-4 h-4 bg-blue-500 rounded-full animate-pulse"></div>

                        <div className="p-6">
                          <div className="flex items-center mb-4">
                            <div className="p-3 bg-blue-100 dark:bg-blue-900/50 rounded-2xl mr-4">
                              <Coffee size={20} className="text-blue-600 dark:text-blue-400" />
                            </div>
                            <div>
                              <h3 className="text-xl font-bold text-gray-900 dark:text-white">
                                Mesa {item.mesa?.numero}
                              </h3>
                              <p className="text-sm text-gray-600 dark:text-gray-400">
                                {item.mesa?.garcom || 'Garçom não atribuído'}
                              </p>
                            </div>
                          </div>

                          <div className="bg-gradient-to-r from-gray-50 to-blue-50 dark:from-gray-600 dark:to-blue-900/30 rounded-2xl p-4 mb-4">
                            <div className="flex items-center justify-between mb-2">
                              <h4 className="font-bold text-lg text-gray-900 dark:text-white">
                                {item.quantidade}x {item.nome}
                              </h4>
                              <span className="text-lg font-bold text-blue-600 dark:text-blue-400">
                                {formatarDinheiro(item.preco_unitario * item.quantidade)}
                              </span>
                            </div>
                            
                            {item.observacao && (
                              <div className="bg-white/80 dark:bg-gray-700/80 rounded-xl p-3 mb-3">
                                <p className="text-sm text-gray-700 dark:text-gray-300 italic">
                                  "📝 {item.observacao}"
                                </p>
                              </div>
                            )}

                            <div className="flex items-center justify-between text-sm">
                              <div className="flex items-center text-gray-600 dark:text-gray-400">
                                <Clock size={14} className="mr-1" />
                                <span>Iniciado há {item.tempoEspera} min</span>
                              </div>
                              <div className="flex items-center text-blue-600 dark:text-blue-400">
                                <Package size={14} className="mr-1" />
                                <span>{item.categoria}</span>
                              </div>
                            </div>
                          </div>

                          <Button
                            variant="success"
                            fullWidth
                            onClick={() => handleStatusUpdate(item.id, 'pronto')}
                            className="bg-gradient-to-r from-green-600 to-emerald-700 hover:from-green-700 hover:to-emerald-800 text-white rounded-2xl py-4 font-bold text-lg shadow-xl hover:shadow-2xl transition-all duration-200 transform hover:scale-105"
                            icon={<CheckCircle size={20} />}
                          >
                            Marcar como Pronto
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* Itens Prontos */}
            {itensProntos.length > 0 && (
              <div className="bg-white/95 dark:bg-gray-800/95 backdrop-blur-sm rounded-3xl shadow-2xl border border-white/20 dark:border-gray-700/50 overflow-hidden">
                <div className="bg-gradient-to-r from-green-500 to-emerald-600 px-8 py-6">
                  <div className="flex items-center justify-between text-white">
                    <div className="flex items-center">
                      <div className="p-3 bg-white/20 backdrop-blur-sm rounded-2xl mr-4">
                        <CheckCircle size={28} />
                      </div>
                      <div>
                        <h2 className="text-2xl font-bold">Prontos para Entrega</h2>
                        <p className="text-green-100">{itensProntos.length} itens aguardando entrega</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-3xl font-bold">{itensProntos.length}</div>
                      <div className="text-green-200 text-sm">Finalizados</div>
                    </div>
                  </div>
                </div>
                
                <div className="p-8">
                  <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-4 gap-6">
                    {itensProntos.map((item) => (
                      <div 
                        key={item.id}
                        className="group relative bg-gradient-to-br from-white to-green-50 dark:from-gray-700 dark:to-green-900/20 rounded-3xl shadow-xl border-l-4 border-green-500 hover:shadow-2xl transition-all duration-300 hover:transform hover:scale-105 overflow-hidden"
                      >
                        {/* Indicador de Pronto */}
                        <div className="absolute top-4 right-4">
                          <div className="w-8 h-8 bg-green-500 rounded-full flex items-center justify-center shadow-lg">
                            <CheckCircle size={16} className="text-white" />
                          </div>
                        </div>

                        <div className="p-6">
                          <div className="flex items-center mb-4">
                            <div className="p-3 bg-green-100 dark:bg-green-900/50 rounded-2xl mr-4">
                              <Coffee size={20} className="text-green-600 dark:text-green-400" />
                            </div>
                            <div>
                              <h3 className="text-lg font-bold text-gray-900 dark:text-white">
                                Mesa {item.mesa?.numero}
                              </h3>
                              <p className="text-sm text-gray-600 dark:text-gray-400">
                                {item.mesa?.garcom || 'Garçom não atribuído'}
                              </p>
                            </div>
                          </div>

                          <div className="bg-gradient-to-r from-gray-50 to-green-50 dark:from-gray-600 dark:to-green-900/30 rounded-2xl p-4 mb-4">
                            <h4 className="font-bold text-lg text-gray-900 dark:text-white mb-2">
                              {item.quantidade}x {item.nome}
                            </h4>
                            
                            {item.observacao && (
                              <div className="bg-white/80 dark:bg-gray-700/80 rounded-xl p-3 mb-3">
                                <p className="text-sm text-gray-700 dark:text-gray-300 italic">
                                  "📝 {item.observacao}"
                                </p>
                              </div>
                            )}

                            <div className="flex items-center justify-between text-sm">
                              <div className="flex items-center text-gray-600 dark:text-gray-400">
                                <Clock size={14} className="mr-1" />
                                <span>Pronto há {Math.max(0, item.tempoEspera - 20)} min</span>
                              </div>
                              <div className="flex items-center text-green-600 dark:text-green-400">
                                <Star size={14} className="mr-1" />
                                <span>Finalizado</span>
                              </div>
                            </div>
                          </div>

                          <div className="bg-green-100 dark:bg-green-900/30 rounded-2xl p-3 text-center">
                            <p className="text-green-800 dark:text-green-200 font-bold text-sm">
                              ✅ Aguardando Garçom
                            </p>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* Itens em Preparo */}
            {itensPreparando.length > 0 && (
              <div className="bg-white/95 dark:bg-gray-800/95 backdrop-blur-sm rounded-3xl shadow-2xl border border-white/20 dark:border-gray-700/50 overflow-hidden">
                <div className="bg-gradient-to-r from-blue-500 to-indigo-600 px-8 py-6">
                  <div className="flex items-center justify-between text-white">
                    <div className="flex items-center">
                      <div className="p-3 bg-white/20 backdrop-blur-sm rounded-2xl mr-4">
                        <Flame size={28} className="animate-bounce" />
                      </div>
                      <div>
                        <h2 className="text-2xl font-bold">Em Preparo Agora</h2>
                        <p className="text-blue-100">{itensPreparando.length} itens sendo preparados</p>
                      </div>
                    </div>
                  </div>
                </div>
                
                <div className="p-8">
                  <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
                    {itensPreparando.map((item) => (
                      <div 
                        key={item.id}
                        className="group relative bg-gradient-to-br from-white to-blue-50 dark:from-gray-700 dark:to-blue-900/20 rounded-3xl shadow-xl border-l-4 border-blue-500 hover:shadow-2xl transition-all duration-300 hover:transform hover:scale-105 overflow-hidden"
                      >
                        {/* Indicador de Preparo Ativo */}
                        <div className="absolute top-4 right-4 w-4 h-4 bg-blue-500 rounded-full animate-pulse"></div>

                        <div className="p-6">
                          <div className="flex items-center mb-4">
                            <div className="p-3 bg-blue-100 dark:bg-blue-900/50 rounded-2xl mr-4">
                              <Coffee size={20} className="text-blue-600 dark:text-blue-400" />
                            </div>
                            <div>
                              <h3 className="text-xl font-bold text-gray-900 dark:text-white">
                                Mesa {item.mesa?.numero}
                              </h3>
                              <p className="text-sm text-gray-600 dark:text-gray-400">
                                {item.mesa?.garcom || 'Garçom não atribuído'}
                              </p>
                            </div>
                          </div>

                          <div className="bg-gradient-to-r from-gray-50 to-blue-50 dark:from-gray-600 dark:to-blue-900/30 rounded-2xl p-4 mb-4">
                            <div className="flex items-center justify-between mb-2">
                              <h4 className="font-bold text-lg text-gray-900 dark:text-white">
                                {item.quantidade}x {item.nome}
                              </h4>
                              <span className="text-lg font-bold text-blue-600 dark:text-blue-400">
                                {formatarDinheiro(item.preco_unitario * item.quantidade)}
                              </span>
                            </div>
                            
                            {item.observacao && (
                              <div className="bg-white/80 dark:bg-gray-700/80 rounded-xl p-3 mb-3">
                                <p className="text-sm text-gray-700 dark:text-gray-300 italic">
                                  "📝 {item.observacao}"
                                </p>
                              </div>
                            )}

                            <div className="flex items-center justify-between text-sm">
                              <div className="flex items-center text-gray-600 dark:text-gray-400">
                                <Clock size={14} className="mr-1" />
                                <span>Preparando há {item.tempoEspera} min</span>
                              </div>
                              <div className="flex items-center text-blue-600 dark:text-blue-400">
                                <Flame size={14} className="mr-1" />
                                <span>Ativo</span>
                              </div>
                            </div>
                          </div>

                          <Button
                            variant="success"
                            fullWidth
                            onClick={() => handleStatusUpdate(item.id, 'pronto')}
                            className="bg-gradient-to-r from-green-600 to-emerald-700 hover:from-green-700 hover:to-emerald-800 text-white rounded-2xl py-4 font-bold text-lg shadow-xl hover:shadow-2xl transition-all duration-200 transform hover:scale-105"
                            icon={<CheckCircle size={20} />}
                          >
                            Marcar como Pronto
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Visualização por Mesa (modo tradicional) */}
        {viewMode === 'mesas' && (
          <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
            {mesasFiltradasIds.length === 0 ? (
              <div className="col-span-full bg-white/90 dark:bg-gray-800/90 backdrop-blur-sm rounded-3xl shadow-xl p-12 text-center border border-white/20 dark:border-gray-700/50">
                <div className="relative mb-8">
                  <div className="w-32 h-32 bg-gradient-to-br from-gray-100 to-gray-200 dark:from-gray-700 dark:to-gray-600 rounded-full mx-auto flex items-center justify-center shadow-2xl">
                    <ChefHat className="w-16 h-16 text-gray-400 dark:text-gray-500" />
                  </div>
                  <div className="absolute -top-2 -right-2 w-8 h-8 bg-gradient-to-r from-orange-500 to-red-600 rounded-full flex items-center justify-center shadow-lg transform translate-x-16">
                    <Sparkles className="w-4 h-4 text-white" />
                  </div>
                </div>
                <h3 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">
                  Cozinha Tranquila
                </h3>
                <p className="text-lg text-gray-600 dark:text-gray-400 mb-8 max-w-md mx-auto">
                  Não há pedidos pendentes no momento. A cozinha está livre para preparar novos pratos!
                </p>
                <div className="flex justify-center space-x-4">
                  <div className="flex items-center bg-green-100 dark:bg-green-900/50 px-4 py-2 rounded-full">
                    <CheckCircle className="w-5 h-5 text-green-600 dark:text-green-400 mr-2" />
                    <span className="text-green-800 dark:text-green-200 font-medium">Tudo em dia</span>
                  </div>
                </div>
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
                    className={`rounded-3xl shadow-xl overflow-hidden border-l-4 hover:shadow-2xl transition-all duration-300 hover:transform hover:scale-105 ${getStatusColor(statusPrioritario)}`}
                  >
                    <div className="px-6 py-6">
                      <div className="flex justify-between items-start mb-6">
                        <div className="flex items-center">
                          <div className="p-3 bg-white/60 dark:bg-gray-700/60 rounded-2xl mr-4 shadow-lg">
                            {getStatusIcon(statusPrioritario)}
                          </div>
                          <div>
                            <h3 className="font-bold text-2xl text-gray-900 dark:text-white">
                              Mesa {mesa.numero}
                            </h3>
                            <div className="flex items-center mt-2 text-sm text-gray-600 dark:text-gray-400">
                              <Clock size={16} className="mr-2" />
                              <span className="font-medium">{new Date(horarioMaisRecente).toLocaleTimeString('pt-BR')}</span>
                              <span className="mx-3">•</span>
                              <Users size={16} className="mr-1" />
                              <span className="font-medium">{mesa.garcom || 'Garçom não atribuído'}</span>
                            </div>
                          </div>
                        </div>
                        <div className="text-right">
                          <div className="bg-white/80 dark:bg-gray-700/80 rounded-2xl p-3 shadow-lg">
                            <p className="text-gray-600 dark:text-gray-400 text-sm font-medium">Total</p>
                            <p className="font-bold text-xl text-gray-900 dark:text-white">
                              {formatarDinheiro(valorTotal)}
                            </p>
                          </div>
                        </div>
                      </div>

                      <div className="space-y-4">
                        {itens
                          .filter(item => item.status !== 'entregue' && item.status !== 'cancelado')
                          .map(item => (
                          <div 
                            key={item.id}
                            className={`p-4 rounded-2xl shadow-lg border-l-4 ${getStatusColor(item.status)}`}
                          >
                            <div className="flex justify-between items-start">
                              <div className="flex-1">
                                <div className="flex items-center mb-2">
                                  <span className="text-2xl font-bold text-gray-900 dark:text-white mr-3">
                                    {item.quantidade}x
                                  </span>
                                  <div>
                                    <h4 className="font-bold text-lg text-gray-900 dark:text-white">
                                      {item.nome}
                                    </h4>
                                    <div className="flex items-center space-x-2 mt-1">
                                      <span className="text-xs bg-gray-200 dark:bg-gray-600 text-gray-700 dark:text-gray-300 px-2 py-1 rounded-full font-medium">
                                        {item.categoria}
                                      </span>
                                      <span className={`text-xs px-2 py-1 rounded-full font-bold ${
                                        item.status === 'pendente' ? 'bg-yellow-200 text-yellow-800' :
                                        item.status === 'preparando' ? 'bg-blue-200 text-blue-800' :
                                        'bg-green-200 text-green-800'
                                      }`}>
                                        {getStatusText(item.status)}
                                      </span>
                                    </div>
                                  </div>
                                </div>
                                
                                {item.observacao && (
                                  <div className="bg-white/80 dark:bg-gray-700/80 rounded-xl p-3 mt-3">
                                    <p className="text-sm text-gray-700 dark:text-gray-300 italic">
                                      "📝 {item.observacao}"
                                    </p>
                                  </div>
                                )}

                                <div className="flex items-center mt-3 text-sm text-gray-600 dark:text-gray-400">
                                  <Clock size={14} className="mr-1" />
                                  <span>Pedido há {Math.floor((tempoAtual.getTime() - new Date(item.created_at).getTime()) / (1000 * 60))} min</span>
                                </div>
                              </div>
                              
                              <div className="flex flex-col items-center space-y-3 ml-4">
                                {item.status === 'pendente' && (
                                  <Button
                                    variant="primary"
                                    size="sm"
                                    icon={<PlayCircle size={18} />}
                                    onClick={() => handleStatusUpdate(item.id, 'preparando')}
                                    className="bg-gradient-to-r from-blue-600 to-indigo-700 hover:from-blue-700 hover:to-indigo-800 text-white rounded-2xl px-6 py-3 font-bold shadow-lg hover:shadow-xl transition-all duration-200 transform hover:scale-105"
                                  >
                                    Iniciar
                                  </Button>
                                )}
                                {item.status === 'preparando' && (
                                  <Button
                                    variant="success"
                                    size="sm"
                                    icon={<CheckCircle size={18} />}
                                    onClick={() => handleStatusUpdate(item.id, 'pronto')}
                                    className="bg-gradient-to-r from-green-600 to-emerald-700 hover:from-green-700 hover:to-emerald-800 text-white rounded-2xl px-6 py-3 font-bold shadow-lg hover:shadow-xl transition-all duration-200 transform hover:scale-105"
                                  >
                                    Finalizar
                                  </Button>
                                )}
                                {item.status === 'pronto' && (
                                  <div className="bg-green-100 dark:bg-green-900/50 rounded-2xl px-4 py-2">
                                    <span className="text-green-800 dark:text-green-200 font-bold text-sm">
                                      ✅ Pronto
                                    </span>
                                  </div>
                                )}
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>

                      <div className="mt-6 flex justify-end">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => abrirComandaModal(mesaId)}
                          className="bg-white/60 dark:bg-gray-700/60 text-gray-700 dark:text-gray-300 hover:bg-white dark:hover:bg-gray-700 rounded-2xl px-6 py-3 font-semibold shadow-md hover:shadow-lg transition-all duration-200"
                          icon={<Eye size={18} />}
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
        )}

        {/* Estado Vazio para Fila */}
        {viewMode === 'fila' && filaItens.length === 0 && (
          <div className="bg-white/90 dark:bg-gray-800/90 backdrop-blur-sm rounded-3xl shadow-xl p-12 text-center border border-white/20 dark:border-gray-700/50">
            <div className="relative mb-8">
              <div className="w-32 h-32 bg-gradient-to-br from-gray-100 to-gray-200 dark:from-gray-700 dark:to-gray-600 rounded-full mx-auto flex items-center justify-center shadow-2xl">
                <ChefHat className="w-16 h-16 text-gray-400 dark:text-gray-500" />
              </div>
              <div className="absolute -top-2 -right-2 w-8 h-8 bg-gradient-to-r from-green-500 to-emerald-600 rounded-full flex items-center justify-center shadow-lg transform translate-x-16">
                <CheckCircle className="w-4 h-4 text-white" />
              </div>
            </div>
            <h3 className="text-3xl font-bold text-gray-900 dark:text-white mb-4">
              🎉 Fila Vazia!
            </h3>
            <p className="text-xl text-gray-600 dark:text-gray-400 mb-8 max-w-md mx-auto">
              Excelente trabalho! Não há pedidos pendentes na cozinha no momento.
            </p>
            <div className="flex justify-center space-x-4">
              <div className="flex items-center bg-green-100 dark:bg-green-900/50 px-6 py-3 rounded-full">
                <Award className="w-6 h-6 text-green-600 dark:text-green-400 mr-2" />
                <span className="text-green-800 dark:text-green-200 font-bold">Cozinha em Dia</span>
              </div>
            </div>
          </div>
        )}

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
            className="fixed bottom-8 right-8 bg-gradient-to-r from-red-600 to-red-700 hover:from-red-700 hover:to-red-800 text-white p-4 rounded-full shadow-2xl hover:shadow-3xl transition-all duration-300 transform hover:scale-110 z-50"
          >
            <ArrowUp size={24} />
          </button>
        )}

        {/* Indicador de Atualização em Tempo Real */}
        <div className="fixed bottom-8 left-8 bg-white/90 dark:bg-gray-800/90 backdrop-blur-sm rounded-2xl shadow-xl border border-white/20 dark:border-gray-700/50 px-4 py-3 z-40">
          <div className="flex items-center space-x-2">
            <div className="w-3 h-3 bg-green-500 rounded-full animate-pulse"></div>
            <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
              Tempo Real
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Comandas;