import React, { useState } from 'react';
import { PlusCircle, Filter, RefreshCcw } from 'lucide-react';
import Button from '../components/ui/Button';
import MesaCard from '../components/mesa/MesaCard';
import NovoMesaModal from '../components/mesa/NovoMesaModal';
import { useRestaurante } from '../contexts/RestauranteContext';
import toast from 'react-hot-toast';

const Mesas: React.FC = () => {
  const { mesas } = useRestaurante();
  const [filtro, setFiltro] = useState<string>('todas');
  const [modalAberto, setModalAberto] = useState(false);
  
  // Aplicar filtro
  const mesasFiltradas = filtro === 'todas' 
    ? mesas 
    : mesas.filter(mesa => mesa.status === filtro);
  
  const contadores = {
    todas: mesas.length,
    livre: mesas.filter(mesa => mesa.status === 'livre').length,
    ocupada: mesas.filter(mesa => mesa.status === 'ocupada').length,
    aguardando: mesas.filter(mesa => mesa.status === 'aguardando').length,
  };

  const handleRefresh = () => {
    toast.success('Mesas atualizadas!');
  };

  return (
    <div className="space-y-6">
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

      {/* Filtros */}
      <div className="bg-white rounded-lg shadow-sm p-4">
        <div className="flex items-center mb-2">
          <Filter size={16} className="text-gray-500 mr-2" />
          <h3 className="text-sm font-medium">Filtrar por status</h3>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button
            variant={filtro === 'todas' ? 'primary' : 'ghost'}
            size="sm"
            onClick={() => setFiltro('todas')}
          >
            Todas ({contadores.todas})
          </Button>
          <Button
            variant={filtro === 'livre' ? 'success' : 'ghost'}
            size="sm"
            onClick={() => setFiltro('livre')}
          >
            Livres ({contadores.livre})
          </Button>
          <Button
            variant={filtro === 'ocupada' ? 'secondary' : 'ghost'}
            size="sm"
            onClick={() => setFiltro('ocupada')}
          >
            Ocupadas ({contadores.ocupada})
          </Button>
          <Button
            variant={filtro === 'aguardando' ? 'warning' : 'ghost'}
            size="sm"
            onClick={() => setFiltro('aguardando')}
          >
            Aguardando ({contadores.aguardando})
          </Button>
        </div>
      </div>

      {/* Lista de Mesas */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
        {mesasFiltradas.map((mesa) => (
          <MesaCard key={mesa.id} mesa={mesa} />
        ))}
      </div>

      {/* Modal de Nova Mesa */}
      <NovoMesaModal 
        isOpen={modalAberto} 
        onClose={() => setModalAberto(false)} 
      />
    </div>
  );
};

export default Mesas;