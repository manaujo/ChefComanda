import React, { useState, useEffect } from 'react';
import { PlusCircle, Filter, RefreshCcw } from 'lucide-react';
import Button from '../components/ui/Button';
import MesaCard from '../components/mesa/MesaCard';
import NovoMesaModal from '../components/mesa/NovoMesaModal';
import { useRestaurante } from '../contexts/RestauranteContext';
import toast from 'react-hot-toast';
import { usePageActive } from '../hooks/usePageVisibility';
import { usePreventReload } from '../hooks/usePreventReload';

const Mesas: React.FC = () => {
  const { mesas, refreshData } = useRestaurante();
  const [filtro, setFiltro] = useState<string>('todas');
  const [modalAberto, setModalAberto] = useState(false);
  const [dataInitialized, setDataInitialized] = useState(false);
  
  const isPageActive = usePageActive();
  const { currentRoute } = usePreventReload();
  
  useEffect(() => {
    // Só carrega dados uma vez quando o componente monta
    if (!dataInitialized) {
      refreshData().then(() => {
        setDataInitialized(true);
      });
    }
  }, [dataInitialized]);

  // Salvar estado do filtro
  useEffect(() => {
    sessionStorage.setItem('mesas_filter', filtro);
  }, [filtro]);

  // Restaurar estado do filtro
  useEffect(() => {
    const savedFilter = sessionStorage.getItem('mesas_filter');
    if (savedFilter) {
      setFiltro(savedFilter);
    }
  }, []);
  
  // Apply filter
  const mesasFiltradas = filtro === 'todas' 
    ? mesas 
    : mesas.filter(mesa => mesa.status === filtro);
  
  const contadores = {
    todas: mesas.length,
    livre: mesas.filter(mesa => mesa.status === 'livre').length,
    ocupada: mesas.filter(mesa => mesa.status === 'ocupada').length,
    aguardando: mesas.filter(mesa => mesa.status === 'aguardando').length,
  };

  const handleRefresh = async () => {
    try {
      await refreshData();
      toast.success('Mesas atualizadas!');
    } catch (error) {
      console.error('Error refreshing data:', error);
      toast.error('Erro ao atualizar mesas');
    }
  };

  return (
    <div className="space-y-6 min-h-screen bg-gray-50 dark:bg-gray-900 transition-colors duration-300">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Mesas</h1>
          <p className="text-gray-500 mt-1">
            Gerenciamento de mesas e pedidos
          </p>
        </div>
        <div className="mt-4 md:mt-0 flex space-x-3">
          <Button 
            variant="ghost" 
            icon={<RefreshCcw size={18} />}
            onClick={handleRefresh}
            className="bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm"
          >
            Atualizar
          </Button>
          <Button 
            variant="primary" 
            icon={<PlusCircle size={18} />}
            onClick={() => setModalAberto(true)}
          >
            Nova Mesa
          </Button>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white/90 dark:bg-gray-800/90 backdrop-blur-sm rounded-2xl shadow-lg border border-white/20 dark:border-gray-700/50 p-6">
        <div className="flex items-center mb-2">
          <Filter size={16} className="text-gray-500 mr-2" />
          <h3 className="text-sm font-bold text-gray-700 dark:text-gray-300">Filtrar por status</h3>
        </div>
        <div className="flex flex-wrap gap-3">
          <Button
            variant={filtro === 'todas' ? 'primary' : 'ghost'}
            size="sm"
            onClick={() => setFiltro('todas')}
            className="rounded-2xl font-semibold"
          >
            Todas ({contadores.todas})
          </Button>
          <Button
            variant={filtro === 'livre' ? 'success' : 'ghost'}
            size="sm"
            onClick={() => setFiltro('livre')}
            className="rounded-2xl font-semibold"
          >
            Livres ({contadores.livre})
          </Button>
          <Button
            variant={filtro === 'ocupada' ? 'secondary' : 'ghost'}
            size="sm"
            onClick={() => setFiltro('ocupada')}
            className="rounded-2xl font-semibold"
          >
            Ocupadas ({contadores.ocupada})
          </Button>
          <Button
            variant={filtro === 'aguardando' ? 'warning' : 'ghost'}
            size="sm"
            onClick={() => setFiltro('aguardando')}
            className="rounded-2xl font-semibold"
          >
            Aguardando ({contadores.aguardando})
          </Button>
        </div>
      </div>

      {/* Tables List */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
        {mesasFiltradas.map((mesa) => (
          <MesaCard key={mesa.id} mesa={mesa} />
        ))}
        
        {mesasFiltradas.length === 0 && (
          <div className="col-span-full text-center py-8">
            <p className="text-gray-500">Nenhuma mesa encontrada</p>
          </div>
        )}
      </div>

      {/* New Table Modal */}
      <NovoMesaModal 
        isOpen={modalAberto} 
        onClose={() => setModalAberto(false)} 
      />
    </div>
  );
};

export default Mesas;