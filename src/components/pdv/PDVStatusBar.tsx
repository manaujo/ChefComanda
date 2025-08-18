import React from 'react';
import { Power, PowerOff, User, DollarSign, Clock, AlertTriangle } from 'lucide-react';
import Button from '../ui/Button';
import { formatarDinheiro } from '../../utils/formatters';
import { useAuth } from '../../contexts/AuthContext';
import { useEmployeeAuth } from '../../hooks/useEmployeeAuth';

interface Caixa {
  id: string;
  operador_id: string;
  operador_nome: string;
  data_abertura: string;
  valor_inicial: number;
  valor_sistema: number;
}

interface PDVStatusBarProps {
  caixaAtual?: Caixa | null;
  onAbrirPDV: () => void;
  onFecharPDV: () => void;
}

const PDVStatusBar: React.FC<PDVStatusBarProps> = ({
  caixaAtual,
  onAbrirPDV,
  onFecharPDV
}) => {
  const { user, isEmployee, displayName } = useAuth();
  const { employeeData } = useEmployeeAuth();

  // Obter dados do operador atual
  const getOperadorAtual = () => {
    if (isEmployee && employeeData) {
      return {
        id: employeeData.id,
        nome: employeeData.name,
        tipo: 'funcionario' as const
      };
    } else {
      return {
        id: user?.id || '',
        nome: displayName || user?.user_metadata?.name || 'Usuário',
        tipo: 'usuario' as const
      };
    }
  };

  const operadorAtual = getOperadorAtual();
  const isOperadorDoCaixa = caixaAtual?.operador_id === operadorAtual.id;
  
  // Se é funcionário e não tem caixa próprio, mostrar que pode abrir
  const podeAbrirCaixa = !caixaAtual || isOperadorDoCaixa;

  const formatarTempo = (dataAbertura: string) => {
    const agora = new Date();
    const abertura = new Date(dataAbertura);
    const diferencaMs = agora.getTime() - abertura.getTime();
    const horas = Math.floor(diferencaMs / (1000 * 60 * 60));
    const minutos = Math.floor((diferencaMs % (1000 * 60 * 60)) / (1000 * 60));
    
    if (horas > 0) {
      return `${horas}h ${minutos}min`;
    }
    return `${minutos}min`;
  };

  return (
    <div className="flex items-center justify-between">
      <div className="flex items-center space-x-6">
        {/* Status do PDV */}
        <div className="flex items-center space-x-3">
          <div
            className={`p-2 rounded-full ${
              caixaAtual
                ? 'bg-green-100 dark:bg-green-900'
                : 'bg-red-100 dark:bg-red-900'
            }`}
          >
            {caixaAtual ? (
              <Power className="w-5 h-5 text-green-600 dark:text-green-400" />
            ) : (
              <PowerOff className="w-5 h-5 text-red-600 dark:text-red-400" />
            )}
          </div>
          <div>
            <div className="flex items-center space-x-2">
              <span className="text-sm font-medium text-gray-900 dark:text-white">
                PDV {caixaAtual ? 'Aberto' : 'Fechado'}
              </span>
              {caixaAtual && (
                <span
                  className={`px-2 py-1 rounded-full text-xs font-medium ${
                    isOperadorDoCaixa
                      ? 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200'
                      : 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200'
                  }`}
                >
                  {isOperadorDoCaixa ? 'Seu Caixa' : 'Outro Operador'}
                </span>
              )}
            </div>
            <div className="text-xs text-gray-500 dark:text-gray-400">
              {caixaAtual ? (
                <div className="flex items-center space-x-4">
                  <div className="flex items-center">
                    <User className="w-3 h-3 mr-1" />
                    <span>{caixaAtual.operador_nome}</span>
                  </div>
                  <div className="flex items-center">
                    <Clock className="w-3 h-3 mr-1" />
                    <span>Aberto há {formatarTempo(caixaAtual.data_abertura)}</span>
                  </div>
                </div>
              ) : (
                'Nenhum caixa aberto'
              )}
            </div>
          </div>
        </div>

        {/* Informações do Caixa */}
        {caixaAtual && (
          <div className="flex items-center space-x-6">
            <div className="text-center">
              <div className="text-xs text-gray-500 dark:text-gray-400">Valor Inicial</div>
              <div className="text-sm font-medium text-gray-900 dark:text-white">
                {formatarDinheiro(caixaAtual.valor_inicial)}
              </div>
            </div>
            <div className="text-center">
              <div className="text-xs text-gray-500 dark:text-gray-400">Saldo Atual</div>
              <div className="text-sm font-medium text-gray-900 dark:text-white">
                {formatarDinheiro(caixaAtual.valor_sistema)}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Ações */}
      <div className="flex items-center space-x-3">
        {/* Alertas */}
        {caixaAtual && !isOperadorDoCaixa && (
          <div className="flex items-center text-yellow-600 dark:text-yellow-400">
            <AlertTriangle className="w-4 h-4 mr-1" />
            <span className="text-xs">
              Caixa operado por {caixaAtual.operador_nome}
            </span>
          </div>
        )}

        {/* Botões de Controle */}
        {!caixaAtual ? (
          <Button
            variant="success"
            onClick={onAbrirPDV}
            icon={<Power size={18} />}
            className="bg-green-600 hover:bg-green-700 text-white"
          >
            Abrir PDV
          </Button>
        ) : isOperadorDoCaixa ? (
          <Button
            variant="warning"
            onClick={onFecharPDV}
            icon={<PowerOff size={18} />}
            className="bg-orange-600 hover:bg-orange-700 text-white"
          >
            Fechar PDV
          </Button>
        ) : (
          <Button disabled className="bg-gray-400 text-white">
            PDV ocupado
          </Button>
        )}
      </div>
    </div>
  );
};

export default PDVStatusBar;
