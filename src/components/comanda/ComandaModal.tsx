import React from 'react';
import { X, Clock, Trash2 } from 'lucide-react';
import Button from '../ui/Button';
import { useRestaurante } from '../../contexts/RestauranteContext';
import { formatarDinheiro } from '../../utils/formatters';
import toast from 'react-hot-toast';
import { Database } from '../../types/database';

type Mesa = Database['public']['Tables']['mesas']['Row'];

interface ComandaModalProps {
  isOpen: boolean;
  onClose: () => void;
  mesaId: string;
}

const ComandaModal: React.FC<ComandaModalProps> = ({ isOpen, onClose, mesaId }) => {
  const { mesas, comandas, itensComanda, removerItemComanda } = useRestaurante();
  
  const mesa = mesas.find(m => m.id === mesaId);
  const comanda = comandas.find(c => c.mesa_id === mesaId && c.status === 'aberta');
  // Filtrar apenas itens ativos (não entregues ou cancelados)
  const itens = itensComanda.filter(item => 
    item.mesa_id === mesaId && 
    item.status !== 'entregue' && 
    item.status !== 'cancelado'
  );
  
  const valorTotal = itens.reduce((total, item) => {
    return total + (item.preco_unitario * item.quantidade);
  }, 0);

  const handleRemoveItem = async (itemId: string) => {
    if (window.confirm('Tem certeza que deseja remover este item?')) {
      try {
        await removerItemComanda(itemId);
        toast.success('Item removido com sucesso!');
      } catch (error) {
        console.error('Error removing item:', error);
      }
    }
  };
  
  if (!isOpen || !mesa) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      <div className="flex items-end sm:items-center justify-center min-h-screen p-0 sm:p-4 text-center">
        <div className="fixed inset-0 transition-opacity" aria-hidden="true" onClick={onClose}>
          <div className="absolute inset-0 bg-gray-500 dark:bg-gray-900 opacity-75"></div>
        </div>

        <div className="inline-block align-bottom bg-white dark:bg-gray-800 rounded-t-2xl sm:rounded-lg text-left overflow-hidden shadow-xl transform transition-all w-full sm:my-8 sm:align-middle sm:max-w-3xl sm:w-full max-h-[95vh] flex flex-col">
          <div className="flex justify-between items-center bg-gray-100 dark:bg-gray-700 px-4 sm:px-6 py-3 border-b border-gray-200 dark:border-gray-600">
            <h2 className="text-base sm:text-lg font-medium text-gray-900 dark:text-white">
              Comanda - Mesa {mesa.numero}
            </h2>
            <button
              onClick={onClose}
              className="bg-white dark:bg-gray-800 rounded-md p-1 text-gray-400 hover:text-gray-500 focus:outline-none"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
          
          <div className="bg-white dark:bg-gray-800 px-4 sm:px-6 py-4 overflow-y-auto flex-1">
            <div className="flex justify-between items-center mb-4 sm:mb-6">
              <div>
                <p className="text-xs sm:text-sm text-gray-500 dark:text-gray-400">
                  {mesa.garcom ? `Garçom: ${mesa.garcom}` : 'Garçom não atribuído'}
                </p>
                <p className="text-xs sm:text-sm text-gray-500 dark:text-gray-400">
                  Horário de abertura: {mesa.horario_abertura ? new Date(mesa.horario_abertura).toLocaleTimeString('pt-BR') : 'N/A'}
                </p>
              </div>
            </div>
            
            {/* Items List */}
            {itens.length === 0 ? (
              <div className="py-6 text-center text-gray-500 dark:text-gray-400">
                <p className="text-sm sm:text-base">Nenhum item adicionado à comanda</p>
              </div>
            ) : (
              <div className="divide-y divide-gray-200 dark:divide-gray-700">
                {itens.map((item) => (
                  <div key={item.id} className="py-3 sm:py-4 flex flex-col sm:flex-row justify-between sm:items-start gap-3">
                    <div className="flex-1">
                      <div className="flex items-start">
                        <span className="font-medium text-sm sm:text-base dark:text-gray-200">{item.quantidade}x</span>
                        <div className="ml-2 sm:ml-3 flex-1">
                          <h4 className="font-medium text-sm sm:text-base dark:text-white">{item.nome}</h4>
                          {item.observacao && (
                            <p className="text-xs sm:text-sm text-gray-500 dark:text-gray-400 mt-1">{item.observacao}</p>
                          )}
                          <div className="flex flex-wrap gap-2 mt-2">
                            <div className="text-xs bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 px-2 py-1 rounded">
                              {item.categoria}
                            </div>
                            <div className={`text-xs px-2 py-1 rounded ${
                            item.status === 'pendente' ? 'bg-yellow-100 text-yellow-800' :
                            item.status === 'preparando' ? 'bg-blue-100 text-blue-800' :
                            item.status === 'pronto' ? 'bg-green-100 text-green-800' :
                            'bg-gray-100 text-gray-800'
                          }`}>
                            {item.status.charAt(0).toUpperCase() + item.status.slice(1)}
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center justify-between sm:justify-end sm:space-x-4 sm:flex-shrink-0">
                      <div className="text-right">
                        <p className="text-gray-500 dark:text-gray-400 text-xs sm:text-sm">{formatarDinheiro(item.preco_unitario)} un</p>
                        <p className="font-medium text-sm sm:text-base dark:text-white">{formatarDinheiro(item.preco_unitario * item.quantidade)}</p>
                      </div>
                      <button
                        onClick={() => handleRemoveItem(item.id)}
                        className="text-red-500 hover:text-red-700 dark:text-red-400 dark:hover:text-red-300 transition-colors p-1 sm:p-1.5 rounded-full hover:bg-red-50 dark:hover:bg-red-900/20"
                      >
                        <Trash2 className="w-4 h-4 sm:w-[18px] sm:h-[18px]" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
            
            {/* Total */}
            <div className="mt-4 sm:mt-6 pt-4 border-t border-gray-200 dark:border-gray-700">
              <div className="flex justify-between items-center font-medium">
                <span className="text-base sm:text-lg dark:text-white">Total</span>
                <span className="text-lg sm:text-xl dark:text-white">{formatarDinheiro(valorTotal)}</span>
              </div>
            </div>
          </div>

          <div className="bg-gray-50 dark:bg-gray-700 px-4 sm:px-6 py-3 flex justify-end border-t border-gray-200 dark:border-gray-600">
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