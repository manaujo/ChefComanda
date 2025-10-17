import React, { useState } from 'react';
import { X } from 'lucide-react';
import Button from '../ui/Button';
import { useRestaurante } from '../../contexts/RestauranteContext';
import { useAuth } from '../../contexts/AuthContext';

interface NovoMesaModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const NovoMesaModal: React.FC<NovoMesaModalProps> = ({ isOpen, onClose }) => {
  const [numero, setNumero] = useState<string>('');
  const [capacidade, setCapacidade] = useState<string>('4');
  const [error, setError] = useState<string>('');
  const [loading, setLoading] = useState(false);
  
  const { adicionarMesa } = useRestaurante();
  const { displayName, isEmployee, employeeData } = useAuth();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    
    try {
      // Validations
      if (!numero || !capacidade) {
        setError('Preencha todos os campos obrigatórios');
        return;
      }
      
      const numeroInt = parseInt(numero);
      const capacidadeInt = parseInt(capacidade);
      
      if (isNaN(numeroInt) || numeroInt <= 0) {
        setError('Número da mesa inválido');
        return;
      }
      
      if (isNaN(capacidadeInt) || capacidadeInt <= 0) {
        setError('Capacidade inválida');
        return;
      }
      
      // Determinar garçom baseado no usuário logado
      let garcomNome = '';
      if (isEmployee && employeeData?.role === 'waiter') {
        garcomNome = employeeData.name;
      } else if (displayName) {
        garcomNome = displayName;
      }
      
      // Add table
      await adicionarMesa({
        numero: numeroInt,
        capacidade: capacidadeInt,
        garcom: garcomNome || undefined
      });
      
      // Clear and close modal
      setNumero('');
      setCapacidade('4');
      onClose();
    } catch (error) {
      console.error('Error adding mesa:', error);
      setError('Erro ao adicionar mesa');
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;


  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      <div className="flex items-end sm:items-center justify-center min-h-screen p-0 sm:p-4">
        <div className="fixed inset-0 transition-opacity" aria-hidden="true" onClick={onClose}>
          <div className="absolute inset-0 bg-gray-500 dark:bg-gray-900 opacity-75"></div>
        </div>

        <div className="inline-block align-bottom bg-white dark:bg-gray-800 rounded-t-2xl sm:rounded-lg text-left overflow-hidden shadow-xl transform transition-all w-full sm:my-8 sm:align-middle sm:max-w-lg">
          <div className="bg-white dark:bg-gray-800 px-4 sm:px-6 pt-5 pb-4 sm:pb-6">
            <div className="flex justify-between items-start mb-4">
              <h3 className="text-lg font-medium text-gray-900 dark:text-white">Nova Mesa</h3>
              <button
                onClick={onClose}
                className="bg-white dark:bg-gray-700 rounded-md p-1 text-gray-400 hover:text-gray-500 dark:text-gray-300 dark:hover:text-gray-200 focus:outline-none"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <form onSubmit={handleSubmit}>
              {error && (
                <div className="mb-4 bg-red-50 dark:bg-red-900/20 border-l-4 border-red-500 p-3">
                  <p className="text-xs sm:text-sm text-red-700 dark:text-red-400">{error}</p>
                </div>
              )}

              <div className="mb-4">
                <label htmlFor="numero" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Número da Mesa
                </label>
                <input
                  type="number"
                  id="numero"
                  value={numero}
                  onChange={(e) => setNumero(e.target.value)}
                  className="block w-full border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white rounded-md shadow-sm p-2.5 focus:ring-blue-500 focus:border-blue-500 text-sm"
                  placeholder="Ex: 1"
                  min="1"
                  required
                />
              </div>

              <div className="mb-4">
                <label htmlFor="capacidade" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Capacidade (Pessoas)
                </label>
                <input
                  type="number"
                  id="capacidade"
                  value={capacidade}
                  onChange={(e) => setCapacidade(e.target.value)}
                  className="block w-full border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white rounded-md shadow-sm p-2.5 focus:ring-blue-500 focus:border-blue-500 text-sm"
                  placeholder="Ex: 4"
                  min="1"
                  max="50"
                  required
                />
                <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                  Defina a quantidade de pessoas que a mesa comporta (1-50)
                </p>
              </div>

              {/* Informação sobre garçom responsável */}
              <div className="mb-4 p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
                <p className="text-xs sm:text-sm text-blue-800 dark:text-blue-300 font-medium">
                  Garçom Responsável: {
                    isEmployee && employeeData?.role === 'waiter'
                      ? employeeData.name
                      : displayName || 'Usuário Principal'
                  }
                </p>
                <p className="text-[10px] sm:text-xs text-blue-600 dark:text-blue-400 mt-1">
                  A mesa será automaticamente atribuída ao operador logado
                </p>
              </div>

              <div className="mt-6 flex flex-col-reverse sm:flex-row justify-end gap-2 sm:gap-3">
                <Button
                  type="button"
                  variant="ghost"
                  onClick={onClose}
                  disabled={loading}
                  fullWidth
                  className="sm:w-auto"
                >
                  Cancelar
                </Button>
                <Button
                  type="submit"
                  variant="primary"
                  isLoading={loading}
                  fullWidth
                  className="sm:w-auto"
                >
                  Adicionar Mesa
                </Button>
              </div>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
};

export default NovoMesaModal;