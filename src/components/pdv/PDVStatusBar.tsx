import React from 'react';
import { User, Clock, DollarSign, CreditCard, AlertCircle } from 'lucide-react';
import { formatarDinheiro } from '../../utils/formatters';
import Button from '../ui/Button';
import { useAuth } from '../../contexts/AuthContext';
import { useRestaurante } from '../../contexts/RestauranteContext';
import CaixaService from '../../services/CaixaService';
import { useState, useEffect } from 'react';

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
  const [todosCaixasAbertos, setTodosCaixasAbertos] = useState<any[]>([]);
  const { user, isEmployee } = useAuth();
  const { restaurante } = useRestaurante();

  useEffect(() => {
    if (!isEmployee && restaurante?.id) {
      loadTodosCaixasAbertos();
    }
  }, [isEmployee, restaurante?.id]);

  const loadTodosCaixasAbertos = async () => {
    try {
      if (!restaurante?.id) return;
      const caixas = await CaixaService.getTodosCaixasAbertos(restaurante.id);
      setTodosCaixasAbertos(caixas);
    } catch (error) {
      console.error('Error loading all cash registers:', error);
    }
  };

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
      <div className="space-y-4">
        {/* Mostrar outros caixas abertos se for administrador */}
        {!isEmployee && todosCaixasAbertos.length > 0 && (
          <div className="bg-blue-50 border-l-4 border-blue-500 p-4">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center">
                <CreditCard className="h-5 w-5 text-blue-500 mr-2" />
                <div>
                  <h3 className="text-sm font-medium text-blue-800">
                    Caixas Abertos no Restaurante
                  </h3>
                  <p className="text-sm text-blue-700">
                    {todosCaixasAbertos.length} {todosCaixasAbertos.length === 1 ? 'caixa aberto' : 'caixas abertos'} por funcionários
                  </p>
                </div>
              </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
              {todosCaixasAbertos.map(caixa => (
                <div key={caixa.id} className="bg-white rounded-lg p-3 border border-blue-200">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-gray-900">
                        {caixa.operador_nome}
                      </p>
                      <p className="text-xs text-gray-500">
                        {caixa.operador_tipo === 'funcionario' ? 'Funcionário' : 'Usuário'}
                      </p>
                      <p className="text-xs text-gray-500">
                        {new Date(caixa.data_abertura).toLocaleTimeString('pt-BR')}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-medium text-gray-900">
                        {formatarDinheiro(caixa.valor_sistema)}
                      </p>
                      <p className="text-xs text-gray-500">Saldo</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        <div className="bg-red-50 border-l-4 border-red-500 p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center">
            <AlertCircle className="h-5 w-5 text-red-500 mr-2" />
            <div>
              <h3 className="text-sm font-medium text-red-800">PDV Fechado</h3>
              <p className="text-sm text-red-700">
                {isEmployee 
                  ? 'Você precisa abrir seu próprio caixa para realizar vendas.'
                  : 'O PDV precisa ser aberto por um operador autorizado para realizar vendas.'
                }
              </p>
            </div>
          </div>
          <Button
            variant="primary"
            onClick={onAbrirPDV}
            icon={<CreditCard size={16} />}
          >
            {isEmployee ? 'Abrir Meu PDV' : 'Abrir PDV'}
          </Button>
        </div>
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