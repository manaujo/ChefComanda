import React from 'react';
import { X, Clock } from 'lucide-react';
import Button from '../ui/Button';
import ComandaItem from './ComandaItem';
import { useRestaurante } from '../../contexts/RestauranteContext';
import { formatarDinheiro } from '../../utils/formatters';

interface ComandaModalProps {
  isOpen: boolean;
  onClose: () => void;
  mesaId: number;
}

const ComandaModal: React.FC<ComandaModalProps> = ({ isOpen, onClose, mesaId }) => {
  const { mesas, itensComanda } = useRestaurante();
  
  const mesa = mesas.find(m => m.id === mesaId);
  const itensDaMesa = itensComanda.filter(item => item.mesaId === mesaId);
  
  const valorTotal = itensDaMesa.reduce((total, item) => {
    return total + (item.preco * item.quantidade);
  }, 0);
  
  if (!isOpen || !mesa) return null;

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
              Comanda - Mesa {mesa.numero}
            </h2>
            <button 
              onClick={onClose}
              className="bg-white rounded-md text-gray-400 hover:text-gray-500 focus:outline-none"
            >
              <X size={20} />
            </button>
          </div>
          
          <div className="bg-white px-6 py-4 max-h-[calc(100vh-200px)] overflow-y-auto">
            <div className="flex justify-between items-center mb-6">
              <div>
                <p className="text-sm text-gray-500">
                  {mesa.garcom ? `Garçom: ${mesa.garcom}` : 'Garçom não atribuído'}
                </p>
                <p className="text-sm text-gray-500">
                  Horário de abertura: {mesa.horarioAbertura ? new Date(mesa.horarioAbertura).toLocaleTimeString('pt-BR') : 'N/A'}
                </p>
              </div>
            </div>
            
            {/* Lista de Itens */}
            {itensDaMesa.length === 0 ? (
              <div className="py-6 text-center text-gray-500">
                <p>Nenhum item adicionado à comanda</p>
              </div>
            ) : (
              <div className="divide-y divide-gray-200">
                {itensDaMesa.map((item) => (
                  <ComandaItem 
                    key={item.id} 
                    item={item}
                    onRemove={() => {}}
                  />
                ))}
              </div>
            )}
            
            {/* Total */}
            <div className="mt-6 pt-4 border-t border-gray-200">
              <div className="flex justify-between items-center font-medium">
                <span className="text-lg">Total</span>
                <span className="text-xl">{formatarDinheiro(valorTotal)}</span>
              </div>
            </div>
          </div>
          
          <div className="bg-gray-50 px-6 py-3 flex justify-end">
            <Button
              variant="ghost"
              size="md"
              onClick={onClose}
            >
              Fechar
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ComandaModal;