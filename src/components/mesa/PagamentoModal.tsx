import React, { useState } from 'react';
import { X, CreditCard, QrCode, Wallet } from 'lucide-react';
import Button from '../ui/Button';
import { useRestaurante } from '../../contexts/RestauranteContext';
import { formatarDinheiro } from '../../utils/formatters';
import toast from 'react-hot-toast';

interface PagamentoModalProps {
  isOpen: boolean;
  onClose: () => void;
  mesa: Mesa;
}

const PagamentoModal: React.FC<PagamentoModalProps> = ({ isOpen, onClose, mesa }) => {
  const [formaPagamento, setFormaPagamento] = useState<'pix' | 'dinheiro' | 'cartao' | null>(null);
  const [loading, setLoading] = useState(false);
  
  const { finalizarPagamento } = useRestaurante();

  const handlePagamento = async () => {
    if (!formaPagamento) {
      toast.error('Selecione uma forma de pagamento');
      return;
    }

    setLoading(true);
    try {
      await finalizarPagamento(mesa.id, formaPagamento);
      toast.success('Pagamento finalizado com sucesso!');
      onClose();
    } catch (error) {
      toast.error('Erro ao processar pagamento');
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
          <div className="flex justify-between items-center bg-gray-100 px-6 py-3 border-b">
            <h2 className="text-lg font-medium text-gray-900">
              Pagamento - Mesa {mesa.numero}
            </h2>
            <button 
              onClick={onClose}
              className="text-gray-400 hover:text-gray-500"
            >
              <X size={24} />
            </button>
          </div>

          <div className="px-6 py-4">
            <div className="mb-6">
              <h3 className="text-lg font-medium text-gray-900 mb-2">
                Total a Pagar
              </h3>
              <p className="text-3xl font-bold text-gray-900">
                {formatarDinheiro(mesa.valorTotal)}
              </p>
            </div>

            <div className="space-y-4">
              <button
                onClick={() => setFormaPagamento('pix')}
                className={`w-full p-4 rounded-lg border-2 transition-colors ${
                  formaPagamento === 'pix'
                    ? 'border-blue-500 bg-blue-50'
                    : 'border-gray-200 hover:border-blue-200'
                }`}
              >
                <div className="flex items-center">
                  <QrCode size={24} className="text-blue-500" />
                  <span className="ml-3 font-medium">PIX</span>
                </div>
              </button>

              <button
                onClick={() => setFormaPagamento('cartao')}
                className={`w-full p-4 rounded-lg border-2 transition-colors ${
                  formaPagamento === 'cartao'
                    ? 'border-blue-500 bg-blue-50'
                    : 'border-gray-200 hover:border-blue-200'
                }`}
              >
                <div className="flex items-center">
                  <CreditCard size={24} className="text-blue-500" />
                  <span className="ml-3 font-medium">Cartão</span>
                </div>
              </button>

              <button
                onClick={() => setFormaPagamento('dinheiro')}
                className={`w-full p-4 rounded-lg border-2 transition-colors ${
                  formaPagamento === 'dinheiro'
                    ? 'border-blue-500 bg-blue-50'
                    : 'border-gray-200 hover:border-blue-200'
                }`}
              >
                <div className="flex items-center">
                  <Wallet size={24} className="text-blue-500" />
                  <span className="ml-3 font-medium">Dinheiro</span>
                </div>
              </button>
            </div>
          </div>

          <div className="bg-gray-50 px-6 py-3 flex justify-end space-x-3">
            <Button
              variant="ghost"
              onClick={onClose}
            >
              Cancelar
            </Button>
            <Button
              variant="primary"
              onClick={handlePagamento}
              isLoading={loading}
              disabled={!formaPagamento}
            >
              Finalizar Pagamento
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PagamentoModal;