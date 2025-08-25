import React, { useState } from 'react';
import { Clock, Users, CreditCard, MoreVertical, ClipboardEdit, Printer, Plus, Trash2, Receipt } from 'lucide-react';
import { formatarTempo, formatarDinheiro } from '../../utils/formatters';
import { useRestaurante } from '../../contexts/RestauranteContext';
import Button from '../ui/Button';
import ComandaModal from '../comanda/ComandaModal';
import CarrinhoMesaModal from './CarrinhoMesaModal';
import AdicionarItemRapidoModal from './AdicionarItemRapidoModal';
import PagamentoModal from './PagamentoModal';
import toast from 'react-hot-toast';
import { Database } from '../../types/database';

type Mesa = Database['public']['Tables']['mesas']['Row'];

interface MesaCardProps {
  mesa: Mesa;
}

const MesaCard: React.FC<MesaCardProps> = ({ mesa }) => {
  const [comandaModalAberta, setComandaModalAberta] = useState(false);
  const [carrinhoModalAberto, setCarrinhoModalAberto] = useState(false);
  const [itemRapidoModalAberto, setItemRapidoModalAberto] = useState(false);
  const [pagamentoModalAberto, setPagamentoModalAberto] = useState(false);
  const [menuAberto, setMenuAberto] = useState(false);
  
  const { ocuparMesa, liberarMesa, excluirMesa, criarComanda, comandas, refreshData } = useRestaurante();

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

  const handleAcao = async (acao: string) => {
    setMenuAberto(false);
    
    try {
      switch (acao) {
        case 'ocupar':
          await ocuparMesa(mesa.id);
          break;
        case 'comanda':
          setComandaModalAberta(true);
          break;
        case 'adicionar':
          setCarrinhoModalAberto(true);
          break;
        case 'item-rapido':
          setItemRapidoModalAberto(true);
          break;
        case 'imprimir':
          toast.success('Comanda enviada para impressão!');
          break;
        case 'pagamento':
          setPagamentoModalAberto(true);
          break;
        case 'liberar':
          await liberarMesa(mesa.id);
          break;
        case 'excluir':
          if (window.confirm('Tem certeza que deseja excluir esta mesa?')) {
            await excluirMesa(mesa.id);
          }
          break;
        default:
          break;
      }
    } catch (error) {
      console.error('Error handling action:', error);
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
                          onClick={() => handleAcao('adicionar')}
                          className="block w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                        >
                          Adicionar Itens
                        </button>
                        <button 
                          onClick={() => handleAcao('item-rapido')}
                          className="block w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                        >
                          Item Rápido
                        </button>
                        <button 
                          onClick={() => handleAcao('imprimir')}
                          className="block w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                        >
                          Imprimir Comanda
                        </button>
                        <button 
                          onClick={() => handleAcao('pagamento')}
                          className="block w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                        >
                          Pagamento
                        </button>
                      </>
                    )}
                    
                    {mesa.status === 'aguardando' && (
                      <button 
                        onClick={() => handleAcao('liberar')}
                        className="block w-full text-left px-4 py-2 text-sm text-red-600 hover:bg-gray-100"
                      >
                        Liberar Mesa
                      </button>
                    )}
                    
                    {mesa.status === 'livre' && (
                      <button 
                        onClick={() => handleAcao('excluir')}
                        className="block w-full text-left px-4 py-2 text-sm text-red-600 hover:bg-gray-100"
                      >
                        Excluir Mesa
                      </button>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>

          {mesa.status !== 'livre' && (
            <div className="mt-4 space-y-2">
              {mesa.horario_abertura && (
                <div className="flex items-center text-sm text-gray-600">
                  <Clock size={16} className="mr-2" />
                  <span>
                    {formatarTempo(mesa.horario_abertura)}
                  </span>
                </div>
              )}
              
              <div className="flex items-center text-sm text-gray-600">
                <Users size={16} className="mr-2" />
                <span>{mesa.capacidade} pessoas</span>
              </div>
              
              {mesa.valor_total > 0 && (
                <div className="flex items-center text-sm font-medium">
                  <CreditCard size={16} className="mr-2" />
                  <span>{formatarDinheiro(mesa.valor_total)}</span>
                </div>
              )}
            </div>
          )}
          
          <div className="mt-4 flex flex-wrap gap-2">
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
              <>
                <Button 
                  variant="primary" 
                  size="sm"
                  icon={<ClipboardEdit size={16} />}
                  onClick={() => handleAcao('comanda')}
                >
                  Ver Comanda
                </Button>
                <Button 
                  variant="secondary" 
                  size="sm"
                  icon={<Plus size={16} />}
                  onClick={() => handleAcao('adicionar')}
                >
                  Adicionar Itens
                </Button>
                <Button 
                  variant="ghost" 
                  size="sm"
                  icon={<Plus size={16} />}
                  onClick={() => handleAcao('item-rapido')}
                  className="text-purple-600 hover:text-purple-700"
                >
                  Item Rápido
                </Button>
                <Button 
                  variant="ghost" 
                  size="sm"
                  icon={<Receipt size={16} />}
                  onClick={() => handleAcao('imprimir')}
                >
                  Imprimir
                </Button>
                <Button 
                  variant="warning" 
                  size="sm"
                  icon={<CreditCard size={16} />}
                  onClick={() => handleAcao('pagamento')}
                >
                  Pagamento
                </Button>
              </>
            )}
            
            {mesa.status === 'aguardando' && (
              <Button 
                variant="success" 
                size="sm" 
                fullWidth
                onClick={() => handleAcao('liberar')}
              >
                Liberar Mesa
              </Button>
            )}
            
            {mesa.status === 'livre' && (
              <Button 
                variant="danger" 
                size="sm" 
                fullWidth
                onClick={() => handleAcao('excluir')}
              >
                Excluir Mesa
              </Button>
            )}
          </div>
        </div>
      </div>

      {/* Modais */}
      <ComandaModal 
        isOpen={comandaModalAberta} 
        onClose={() => setComandaModalAberta(false)} 
        mesaId={mesa.id} 
      />
      
      <CarrinhoMesaModal
        isOpen={carrinhoModalAberto}
        onClose={() => setCarrinhoModalAberto(false)}
        mesaId={mesa.id}
      />

      <AdicionarItemRapidoModal
        isOpen={itemRapidoModalAberto}
        onClose={() => setItemRapidoModalAberto(false)}
        mesaId={mesa.id}
      />
      <PagamentoModal
        isOpen={pagamentoModalAberto}
        onClose={() => setPagamentoModalAberto(false)}
        mesa={mesa}
      />
    </>
  );
};

export default MesaCard;