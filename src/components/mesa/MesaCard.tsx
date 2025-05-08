import React, { useState } from 'react';
import { Clock, Users, CreditCard, MoreVertical, ClipboardEdit } from 'lucide-react';
import { formatarTempo, formatarDinheiro } from '../../utils/formatters';
import { useRestaurante } from '../../contexts/RestauranteContext';
import Button from '../ui/Button';
import ComandaModal from '../comanda/ComandaModal';

interface MesaCardProps {
  mesa: Mesa;
}

const MesaCard: React.FC<MesaCardProps> = ({ mesa }) => {
  const [comandaModalAberta, setComandaModalAberta] = useState(false);
  const [menuAberto, setMenuAberto] = useState(false);
  const { ocuparMesa, liberarMesa, solicitarPagamento } = useRestaurante();

  const statusClasses = {
    livre: 'border-l-4 border-green-500 bg-green-50',
    ocupada: 'border-l-4 border-blue-500 bg-blue-50',
    aguardando: 'border-l-4 border-orange-500 bg-orange-50',
  };

  const statusText = {
    livre: 'Livre',
    ocupada: 'Ocupada',
    aguardando: 'Aguardando Pagamento',
  };

  const handleMenuToggle = () => {
    setMenuAberto(!menuAberto);
  };

  const handleAcao = (acao: string) => {
    setMenuAberto(false);
    
    switch (acao) {
      case 'ocupar':
        ocuparMesa(mesa.id);
        break;
      case 'comanda':
        setComandaModalAberta(true);
        break;
      case 'pagamento':
        solicitarPagamento(mesa.id);
        break;
      case 'liberar':
        liberarMesa(mesa.id);
        break;
      default:
        break;
    }
  };

  return (
    <>
      <div className={`rounded-lg shadow-sm overflow-hidden ${statusClasses[mesa.status]}`}>
        <div className="p-4">
          <div className="flex justify-between items-start">
            <div>
              <h3 className="text-lg font-semibold">{`Mesa ${mesa.numero}`}</h3>
              <p className={`text-sm mt-1 ${
                mesa.status === 'livre' ? 'text-green-600' :
                mesa.status === 'ocupada' ? 'text-blue-600' : 'text-orange-600'
              }`}>
                {statusText[mesa.status]}
              </p>
            </div>
            <div className="relative">
              <button 
                onClick={handleMenuToggle}
                className="text-gray-500 hover:text-gray-700 focus:outline-none"
              >
                <MoreVertical size={20} />
              </button>
              
              {menuAberto && (
                <div className="absolute right-0 mt-2 w-48 bg-white rounded-md shadow-lg z-10">
                  <div className="py-1">
                    {mesa.status === 'livre' && (
                      <button 
                        onClick={() => handleAcao('ocupar')}
                        className="block w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                      >
                        Ocupar Mesa
                      </button>
                    )}
                    
                    {mesa.status === 'ocupada' && (
                      <>
                        <button 
                          onClick={() => handleAcao('comanda')}
                          className="block w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                        >
                          Ver Comanda
                        </button>
                        <button 
                          onClick={() => handleAcao('pagamento')}
                          className="block w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                        >
                          Solicitar Pagamento
                        </button>
                      </>
                    )}
                    
                    {mesa.status === 'aguardando' && (
                      <button 
                        onClick={() => handleAcao('liberar')}
                        className="block w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                      >
                        Liberar Mesa
                      </button>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>

          {mesa.status !== 'livre' && (
            <div className="mt-4 space-y-2">
              <div className="flex items-center text-sm text-gray-600">
                <Clock size={16} className="mr-2" />
                <span>
                  {mesa.horarioAbertura ? formatarTempo(mesa.horarioAbertura) : 'Sem registro'}
                </span>
              </div>
              
              <div className="flex items-center text-sm text-gray-600">
                <Users size={16} className="mr-2" />
                <span>{mesa.capacidade} pessoas</span>
              </div>
              
              {mesa.valorTotal > 0 && (
                <div className="flex items-center text-sm font-medium">
                  <CreditCard size={16} className="mr-2" />
                  <span>{formatarDinheiro(mesa.valorTotal)}</span>
                </div>
              )}
            </div>
          )}
          
          <div className="mt-4">
            {mesa.status === 'livre' && (
              <Button 
                variant="success" 
                size="sm" 
                fullWidth 
                onClick={() => handleAcao('ocupar')}
              >
                Ocupar Mesa
              </Button>
            )}
            
            {mesa.status === 'ocupada' && (
              <Button 
                variant="primary" 
                size="sm" 
                fullWidth 
                icon={<ClipboardEdit size={16} />}
                onClick={() => handleAcao('comanda')}
              >
                Ver Comanda
              </Button>
            )}
            
            {mesa.status === 'aguardando' && (
              <Button 
                variant="warning" 
                size="sm" 
                fullWidth 
                onClick={() => handleAcao('liberar')}
              >
                Finalizar
              </Button>
            )}
          </div>
        </div>
      </div>

      {/* Modal de Comanda */}
      <ComandaModal 
        isOpen={comandaModalAberta} 
        onClose={() => setComandaModalAberta(false)} 
        mesaId={mesa.id} 
      />
    </>
  );
};

export default MesaCard;