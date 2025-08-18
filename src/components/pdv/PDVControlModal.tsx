import React, { useState, useEffect } from 'react';
import { X, User, DollarSign, Clock, AlertTriangle, CreditCard } from 'lucide-react';
import Button from '../ui/Button';
import { formatarDinheiro } from '../../utils/formatters';
import { useAuth } from '../../contexts/AuthContext';
import { useRestaurante } from '../../contexts/RestauranteContext';
import { useEmployeeAuth } from '../../hooks/useEmployeeAuth';
import CaixaService from '../../services/CaixaService';
import toast from 'react-hot-toast';

interface PDVControlModalProps {
  isOpen: boolean;
  onClose: () => void;
  mode: 'abrir' | 'fechar';
  caixaAtual?: any;
  onCaixaChange: (caixa: any) => void;
}

const PDVControlModal: React.FC<PDVControlModalProps> = ({
  isOpen,
  onClose,
  mode,
  caixaAtual,
  onCaixaChange
}) => {
  const { user, isEmployee, employeeData, displayName } = useAuth();
  const { employeeData: currentEmployeeData } = useEmployeeAuth();
  const { restaurante, funcionarios } = useRestaurante();
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    valorInicial: '',
    valorFinal: '',
    observacao: ''
  });

  useEffect(() => {
    if (isOpen) {
      if (mode === 'fechar' && caixaAtual) {
        // Pre-fill with current cash register data
        setFormData(prev => ({
          ...prev,
          valorFinal: ''
        }));
      }
    }
  }, [isOpen, mode, caixaAtual]);

  // Obter dados do operador atual
  const getOperadorAtual = () => {
    if (isEmployee && (employeeData || currentEmployeeData)) {
      const empData = employeeData || currentEmployeeData;
      return {
        id: empData.id,
        nome: empData.name,
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

  const handleAbrirPDV = async () => {
    try {
      setLoading(true);

      const valor = parseFloat(formData.valorInicial);
      if (isNaN(valor) || valor < 0) {
        throw new Error('Valor inicial inválido');
      }

      if (!restaurante?.id) {
        throw new Error('Restaurante não encontrado');
      }

      const operador = getOperadorAtual();

      // Verificar se o operador já tem um caixa aberto (apenas para este operador específico)
      const caixaExistente = await CaixaService.getOperadorCaixaAberto(operador.id);
      if (caixaExistente) {
        throw new Error('Você já possui um caixa aberto. Feche o caixa atual antes de abrir um novo.');
      }

      const caixa = await CaixaService.abrirCaixa({
        restauranteId: restaurante.id,
        operadorId: operador.id,
        operadorNome: operador.nome,
        operadorTipo: operador.tipo,
        valorInicial: valor
      });

      // Registrar abertura do PDV como movimentação especial
      await CaixaService.adicionarMovimentacao({
        caixaId: caixa.id,
        tipo: 'entrada',
        valor: 0,
        motivo: 'Abertura do PDV',
        observacao: `PDV aberto por ${operador.nome} às ${new Date().toLocaleTimeString('pt-BR')}`,
        usuarioId: user?.id || ''
      });

      onCaixaChange(caixa);
      toast.success(`PDV aberto por ${operador.nome}!`);
      onClose();
      
      // Salvar no localStorage para persistir entre navegações
      localStorage.setItem('pdvAtual', JSON.stringify(caixa));
    } catch (error) {
      console.error('Error opening PDV:', error);
      toast.error(error instanceof Error ? error.message : 'Erro ao abrir PDV');
    } finally {
      setLoading(false);
    }
  };

  const handleFecharPDV = async () => {
    try {
      setLoading(true);

      const valor = parseFloat(formData.valorFinal);
      if (isNaN(valor) || valor < 0) {
        throw new Error('Valor final inválido');
      }

      // Registrar fechamento do PDV como movimentação especial
      await CaixaService.adicionarMovimentacao({
        caixaId: caixaAtual.id,
        tipo: 'saida',
        valor: 0,
        motivo: 'Fechamento do PDV',
        observacao: `PDV fechado às ${new Date().toLocaleTimeString('pt-BR')}. ${formData.observacao}`,
        usuarioId: user?.id || ''
      });

      await CaixaService.fecharCaixa(caixaAtual.id, valor, formData.observacao);

      onCaixaChange(null);
      toast.success('PDV fechado com sucesso!');
      onClose();
      
      // Remover do localStorage
      localStorage.removeItem('pdvAtual');
    } catch (error) {
      console.error('Error closing PDV:', error);
      toast.error(error instanceof Error ? error.message : 'Erro ao fechar PDV');
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setFormData({
      valorInicial: '',
      valorFinal: '',
      observacao: ''
    });
  };

  if (!isOpen) return null;

  const operadorAtual = getOperadorAtual();

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-black bg-opacity-50">
      <div className="flex items-center justify-center min-h-screen p-4">
        <div className="bg-white rounded-lg shadow-xl w-full max-w-md">
          <div className="flex justify-between items-center p-6 border-b border-gray-200">
            <h3 className="text-lg font-medium text-gray-900">
              {mode === 'abrir' ? 'Abrir PDV' : 'Fechar PDV'}
            </h3>
            <button
              onClick={() => {
                onClose();
                resetForm();
              }}
              className="text-gray-400 hover:text-gray-500"
            >
              <X size={24} />
            </button>
          </div>

          <div className="p-6">
            {mode === 'abrir' ? (
              <div className="space-y-4">
                <div className="bg-blue-50 p-4 rounded-lg">
                  <div className="flex items-center">
                    <CreditCard className="h-5 w-5 text-blue-500 mr-2" />
                    <div>
                      <h4 className="text-sm font-medium text-blue-800">Abertura do PDV</h4>
                      <p className="text-sm text-blue-600">
                        Informe o valor inicial em dinheiro para abrir seu PDV.
                      </p>
                    </div>
                  </div>
                </div>

                <div className="bg-gray-50 p-4 rounded-lg">
                  <div className="flex items-center">
                    <User className="h-5 w-5 text-gray-500 mr-2" />
                    <div>
                      <p className="text-sm font-medium text-gray-700">Operador</p>
                      <p className="text-sm text-gray-600">
                        {operadorAtual.nome} ({operadorAtual.tipo === 'funcionario' ? 'Funcionário' : 'Usuário Principal'})
                      </p>
                    </div>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Valor Inicial em Dinheiro
                  </label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                      <span className="text-gray-500 sm:text-sm">R$</span>
                    </div>
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      value={formData.valorInicial}
                      onChange={(e) => setFormData({ ...formData, valorInicial: e.target.value })}
                      className="pl-8 block w-full rounded-md border-gray-300 shadow-sm focus:ring-blue-500 focus:border-blue-500"
                      placeholder="0,00"
                      required
                    />
                  </div>
                </div>
              </div>
            ) : (
              <div className="space-y-4">
                <div className="bg-yellow-50 p-4 rounded-lg">
                  <div className="flex items-start">
                    <AlertTriangle className="h-5 w-5 text-yellow-500 mt-0.5 mr-2" />
                    <div>
                      <h4 className="text-sm font-medium text-yellow-800">Fechamento do PDV</h4>
                      <p className="text-sm text-yellow-700">
                        Operador: <strong>{caixaAtual?.operador_nome}</strong>
                      </p>
                      <p className="text-sm text-yellow-700">
                        Informe o valor final em dinheiro para fechar o PDV.
                      </p>
                    </div>
                  </div>
                </div>

                {caixaAtual && (
                  <div className="bg-gray-50 p-4 rounded-lg">
                    <h4 className="text-sm font-medium text-gray-700 mb-2">Resumo do Período</h4>
                    <div className="space-y-1 text-sm">
                      <div className="flex justify-between">
                        <span>Valor inicial:</span>
                        <span className="font-medium">{formatarDinheiro(caixaAtual.valor_inicial)}</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Valor calculado:</span>
                        <span className="font-medium">{formatarDinheiro(caixaAtual.valor_sistema)}</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Abertura:</span>
                        <span className="font-medium">
                          {new Date(caixaAtual.data_abertura).toLocaleString('pt-BR')}
                        </span>
                      </div>
                    </div>
                  </div>
                )}

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Valor Final em Dinheiro
                  </label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                      <span className="text-gray-500 sm:text-sm">R$</span>
                    </div>
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      value={formData.valorFinal}
                      onChange={(e) => setFormData({ ...formData, valorFinal: e.target.value })}
                      className="pl-8 block w-full rounded-md border-gray-300 shadow-sm focus:ring-blue-500 focus:border-blue-500"
                      placeholder="0,00"
                      required
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Observações do Fechamento
                  </label>
                  <textarea
                    value={formData.observacao}
                    onChange={(e) => setFormData({ ...formData, observacao: e.target.value })}
                    rows={3}
                    className="w-full rounded-md border-gray-300 shadow-sm focus:ring-blue-500 focus:border-blue-500"
                    placeholder="Observações sobre o fechamento do PDV..."
                  />
                </div>
              </div>
            )}
          </div>

          <div className="bg-gray-50 px-6 py-3 flex justify-end space-x-3">
            <Button
              variant="ghost"
              onClick={() => {
                onClose();
                resetForm();
              }}
            >
              Cancelar
            </Button>
            <Button
              variant={mode === 'abrir' ? 'primary' : 'warning'}
              onClick={mode === 'abrir' ? handleAbrirPDV : handleFecharPDV}
              isLoading={loading}
              disabled={
                mode === 'abrir' 
                  ? !formData.valorInicial
                  : !formData.valorFinal
              }
            >
              {mode === 'abrir' ? 'Abrir PDV' : 'Fechar PDV'}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PDVControlModal;