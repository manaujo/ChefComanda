import React, { useState } from 'react';
import { X } from 'lucide-react';
import Button from '../ui/Button';
import { useRestaurante } from '../../contexts/RestauranteContext';

interface NovoMesaModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const NovoMesaModal: React.FC<NovoMesaModalProps> = ({ isOpen, onClose }) => {
  const [numero, setNumero] = useState<string>('');
  const [capacidade, setCapacidade] = useState<string>('4');
  const [garcom, setGarcom] = useState<string>('');
  const [error, setError] = useState<string>('');
  const [loading, setLoading] = useState(false);
  
  const { adicionarMesa } = useRestaurante();

  const garcons = [
    { id: 1, nome: 'Carlos Silva' },
    { id: 2, nome: 'Ana Santos' },
    { id: 3, nome: 'Pedro Oliveira' }
  ];

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
      
      // Add table
      await adicionarMesa({
        numero: numeroInt,
        capacidade: capacidadeInt,
        garcom: garcom || undefined
      });
      
      // Clear and close modal
      setNumero('');
      setCapacidade('4');
      setGarcom('');
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
      <div className="flex items-center justify-center min-h-screen px-4 pt-4 pb-20 text-center sm:block sm:p-0">
        <div className="fixed inset-0 transition-opacity" aria-hidden="true">
          <div className="absolute inset-0 bg-gray-500 opacity-75"></div>
        </div>

        <span className="hidden sm:inline-block sm:align-middle sm:h-screen" aria-hidden="true">&#8203;</span>

        <div className="inline-block align-bottom bg-white rounded-lg text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-lg sm:w-full">
          <div className="bg-white px-4 pt-5 pb-4 sm:p-6 sm:pb-4">
            <div className="flex justify-between items-start">
              <h3 className="text-lg font-medium text-gray-900">Nova Mesa</h3>
              <button 
                onClick={onClose}
                className="bg-white rounded-md text-gray-400 hover:text-gray-500 focus:outline-none"
              >
                <X size={20} />
              </button>
            </div>
            
            <form onSubmit={handleSubmit} className="mt-4">
              {error && (
                <div className="mb-4 bg-red-50 border-l-4 border-red-500 p-4">
                  <p className="text-sm text-red-700">{error}</p>
                </div>
              )}
              
              <div className="mb-4">
                <label htmlFor="numero" className="block text-sm font-medium text-gray-700">
                  Número da Mesa
                </label>
                <input
                  type="number"
                  id="numero"
                  value={numero}
                  onChange={(e) => setNumero(e.target.value)}
                  className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2 focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                  placeholder="Ex: 1"
                  min="1"
                  required
                />
              </div>
              
              <div className="mb-4">
                <label htmlFor="capacidade" className="block text-sm font-medium text-gray-700">
                  Capacidade
                </label>
                <select
                  id="capacidade"
                  value={capacidade}
                  onChange={(e) => setCapacidade(e.target.value)}
                  className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2 focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                >
                  <option value="2">2 pessoas</option>
                  <option value="4">4 pessoas</option>
                  <option value="6">6 pessoas</option>
                  <option value="8">8 pessoas</option>
                  <option value="10">10 pessoas</option>
                </select>
              </div>

              <div className="mb-4">
                <label htmlFor="garcom" className="block text-sm font-medium text-gray-700">
                  Garçom Responsável (Opcional)
                </label>
                <select
                  id="garcom"
                  value={garcom}
                  onChange={(e) => setGarcom(e.target.value)}
                  className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2 focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                >
                  <option value="">Selecione um garçom</option>
                  {garcons.map(g => (
                    <option key={g.id} value={g.nome}>{g.nome}</option>
                  ))}
                </select>
              </div>
              
              <div className="mt-6 flex justify-end space-x-3">
                <Button 
                  type="button" 
                  variant="ghost" 
                  onClick={onClose}
                  disabled={loading}
                >
                  Cancelar
                </Button>
                <Button 
                  type="submit" 
                  variant="primary"
                  isLoading={loading}
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