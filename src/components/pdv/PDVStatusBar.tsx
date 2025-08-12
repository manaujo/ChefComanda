import React from 'react';
import { User, Clock, DollarSign, CreditCard, AlertCircle } from 'lucide-react';
import { formatarDinheiro } from '../../utils/formatters';
import Button from '../ui/Button';

interface PDVStatusBarProps {
  caixaAtual: any;
  onAbrirPDV: () => void;
  onFecharPDV: () => void;
}

const PDVStatusBar: React.FC<PDVStatusBarProps> = ({
  caixaAtual,
  onAbrirPDV,
  onFecharPDV
}) => {
  const calcularTempoAberto = () => {
    if (!caixaAtual?.data_abertura) return '';
    
    const inicio = new Date(caixaAtual.data_abertura);
    const agora = new Date();
    const diffMs = agora.getTime() - inicio.getTime();
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    const diffMinutes = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));
    
    if (diffHours > 0) {
      return `${diffHours}h ${diffMinutes}min`;
    }
    return `${diffMinutes}min`;
  };

  if (!caixaAtual) {
    return (
      <div className="bg-red-50 border-l-4 border-red-500 p-4 mb-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center">
            <AlertCircle className="h-5 w-5 text-red-500 mr-2" />
            <div>
              <h3 className="text-sm font-medium text-red-800">PDV Fechado</h3>
              <p className="text-sm text-red-700">
                O PDV precisa ser aberto por um operador autorizado para realizar vendas.
              </p>
            </div>
          </div>
          <Button
            variant="primary"
            onClick={onAbrirPDV}
            icon={<CreditCard size={16} />}
          >
            Abrir PDV
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-green-50 border-l-4 border-green-500 p-4 mb-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-6">
          <div className="flex items-center">
            <User className="h-5 w-5 text-green-500 mr-2" />
            <div>
              <p className="text-sm font-medium text-green-800">
                {caixaAtual.operador_nome}
              </p>
              <p className="text-xs text-green-700">
                {caixaAtual.operador_tipo === 'funcionario' ? 'Funcionário' : 'Usuário Principal'}
              </p>
            </div>
          </div>

          <div className="flex items-center">
            <Clock className="h-5 w-5 text-green-500 mr-2" />
            <div>
              <p className="text-sm font-medium text-green-800">
                Aberto há {calcularTempoAberto()}
              </p>
              <p className="text-xs text-green-700">
                {new Date(caixaAtual.data_abertura).toLocaleTimeString('pt-BR')}
              </p>
            </div>
          </div>

          <div className="flex items-center">
            <DollarSign className="h-5 w-5 text-green-500 mr-2" />
            <div>
              <p className="text-sm font-medium text-green-800">
                {formatarDinheiro(caixaAtual.valor_sistema)}
              </p>
              <p className="text-xs text-green-700">
                Saldo atual
              </p>
            </div>
          </div>
        </div>

        <Button
          variant="warning"
          onClick={onFecharPDV}
          icon={<CreditCard size={16} />}
        >
          Fechar PDV
        </Button>
      </div>
    </div>
  );
};

export default PDVStatusBar;