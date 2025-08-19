import React, { useState } from 'react';
import { X, ArrowUp, ArrowDown, Package, AlertTriangle, Calculator, Save } from 'lucide-react';
import Button from '../ui/Button';
import { formatarDinheiro } from '../../utils/formatters';
import toast from 'react-hot-toast';

interface Insumo {
  id: string;
  nome: string;
  descricao?: string;
  unidade_medida: string;
  quantidade: number;
  quantidade_minima: number;
  data_validade?: string;
  preco_unitario?: number;
  ativo: boolean;
}

interface MovimentacaoModalProps {
  isOpen: boolean;
  onClose: () => void;
  insumo: Insumo | null;
  onMovimentacao: (insumoId: string, tipo: 'entrada' | 'saida', quantidade: number, motivo: string, observacao?: string) => Promise<void>;
}

const MovimentacaoModal: React.FC<MovimentacaoModalProps> = ({
  isOpen,
  onClose,
  insumo,
  onMovimentacao
}) => {
  const [tipo, setTipo] = useState<'entrada' | 'saida'>('entrada');
  const [quantidade, setQuantidade] = useState('');
  const [motivo, setMotivo] = useState('');
  const [observacao, setObservacao] = useState('');
  const [loading, setLoading] = useState(false);

  const motivosEntrada = [
    'Compra de insumos',
    'Devolução de fornecedor',
    'Ajuste de inventário',
    'Transferência entre estoques',
    'Outros'
  ];

  const motivosSaida = [
    'Uso na produção',
    'Venda direta',
    'Perda/Vencimento',
    'Transferência entre estoques',
    'Ajuste de inventário',
    'Outros'
  ];

  const resetForm = () => {
    setTipo('entrada');
    setQuantidade('');
    setMotivo('');
    setObservacao('');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!insumo) return;
    
    const qtd = parseFloat(quantidade);
    if (isNaN(qtd) || qtd <= 0) {
      toast.error('Quantidade deve ser maior que zero');
      return;
    }

    if (tipo === 'saida' && qtd > insumo.quantidade) {
      toast.error(`Quantidade insuficiente em estoque. Disponível: ${insumo.quantidade} ${insumo.unidade_medida}`);
      return;
    }

    if (!motivo) {
      toast.error('Selecione um motivo para a movimentação');
      return;
    }

    setLoading(true);
    try {
      await onMovimentacao(insumo.id, tipo, qtd, motivo, observacao || undefined);
      resetForm();
      onClose();
    } catch (error) {
      console.error('Error in movimentacao:', error);
    } finally {
      setLoading(false);
    }
  };

  const calcularNovaQuantidade = () => {
    if (!insumo || !quantidade) return insumo?.quantidade || 0;
    
    const qtd = parseFloat(quantidade);
    if (isNaN(qtd)) return insumo.quantidade;
    
    return tipo === 'entrada' 
      ? insumo.quantidade + qtd 
      : Math.max(0, insumo.quantidade - qtd);
  };

  if (!isOpen || !insumo) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-black/60 backdrop-blur-sm">
      <div className="flex items-center justify-center min-h-screen p-4">
        <div className="bg-white dark:bg-gray-800 rounded-3xl shadow-2xl w-full max-w-lg transform transition-all duration-300 scale-100">
          <div className="relative overflow-hidden">
            {/* Header */}
            <div className={`px-8 py-6 ${
              tipo === 'entrada' 
                ? 'bg-gradient-to-r from-green-500 to-emerald-600' 
                : 'bg-gradient-to-r from-red-500 to-rose-600'
            }`}>
              <div className="flex justify-between items-center">
                <div className="flex items-center">
                  <div className="p-3 bg-white/20 backdrop-blur-sm rounded-2xl mr-4">
                    {tipo === 'entrada' ? (
                      <ArrowUp size={24} className="text-white" />
                    ) : (
                      <ArrowDown size={24} className="text-white" />
                    )}
                  </div>
                  <div className="text-white">
                    <h3 className="text-xl font-bold">
                      {tipo === 'entrada' ? 'Entrada de Estoque' : 'Saída de Estoque'}
                    </h3>
                    <p className={tipo === 'entrada' ? 'text-green-100' : 'text-red-100'}>
                      {insumo.nome}
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => {
                    onClose();
                    resetForm();
                  }}
                  className="p-2 text-white/70 hover:text-white hover:bg-white/20 rounded-xl transition-colors"
                >
                  <X size={20} />
                </button>
              </div>
            </div>

            <form onSubmit={handleSubmit} className="p-8">
              {/* Informações do Insumo */}
              <div className="mb-6">
                <div className="bg-gradient-to-r from-gray-50 to-gray-100 dark:from-gray-700 dark:to-gray-600 rounded-2xl p-4 border border-gray-200/50 dark:border-gray-600/50">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center">
                      <div className="p-2 bg-blue-100 dark:bg-blue-900 rounded-xl mr-3">
                        <Package size={20} className="text-blue-600 dark:text-blue-400" />
                      </div>
                      <div>
                        <h4 className="font-semibold text-gray-900 dark:text-white">{insumo.nome}</h4>
                        <p className="text-sm text-gray-600 dark:text-gray-400">
                          Estoque atual: <span className="font-medium">{insumo.quantidade} {insumo.unidade_medida}</span>
                        </p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-xs text-gray-500 dark:text-gray-400">Mínimo</p>
                      <p className="font-medium text-gray-900 dark:text-white">
                        {insumo.quantidade_minima} {insumo.unidade_medida}
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Tipo de Movimentação */}
              <div className="mb-6">
                <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3">
                  Tipo de Movimentação
                </label>
                <div className="grid grid-cols-2 gap-3">
                  <button
                    type="button"
                    onClick={() => setTipo('entrada')}
                    className={`p-4 rounded-2xl border-2 transition-all duration-200 ${
                      tipo === 'entrada'
                        ? 'border-green-500 bg-green-50 dark:bg-green-900/20'
                        : 'border-gray-200 dark:border-gray-600 hover:border-green-300'
                    }`}
                  >
                    <div className="flex items-center justify-center mb-2">
                      <ArrowUp size={20} className={`${
                        tipo === 'entrada' ? 'text-green-600' : 'text-gray-400'
                      }`} />
                    </div>
                    <span className={`text-sm font-medium ${
                      tipo === 'entrada' ? 'text-green-800 dark:text-green-200' : 'text-gray-600 dark:text-gray-400'
                    }`}>
                      Entrada
                    </span>
                  </button>
                  
                  <button
                    type="button"
                    onClick={() => setTipo('saida')}
                    className={`p-4 rounded-2xl border-2 transition-all duration-200 ${
                      tipo === 'saida'
                        ? 'border-red-500 bg-red-50 dark:bg-red-900/20'
                        : 'border-gray-200 dark:border-gray-600 hover:border-red-300'
                    }`}
                  >
                    <div className="flex items-center justify-center mb-2">
                      <ArrowDown size={20} className={`${
                        tipo === 'saida' ? 'text-red-600' : 'text-gray-400'
                      }`} />
                    </div>
                    <span className={`text-sm font-medium ${
                      tipo === 'saida' ? 'text-red-800 dark:text-red-200' : 'text-gray-600 dark:text-gray-400'
                    }`}>
                      Saída
                    </span>
                  </button>
                </div>
              </div>

              {/* Quantidade */}
              <div className="mb-6">
                <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3">
                  Quantidade ({insumo.unidade_medida})
                </label>
                <div className="relative">
                  <input
                    type="number"
                    step="0.001"
                    min="0.001"
                    max={tipo === 'saida' ? insumo.quantidade : undefined}
                    value={quantidade}
                    onChange={(e) => setQuantidade(e.target.value)}
                    className="w-full rounded-2xl border-gray-300 dark:border-gray-600 shadow-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white py-4 px-4 text-lg font-medium"
                    placeholder="0.000"
                    required
                  />
                  {tipo === 'saida' && quantidade && parseFloat(quantidade) > insumo.quantidade && (
                    <div className="absolute right-3 top-1/2 -translate-y-1/2">
                      <AlertTriangle size={20} className="text-red-500" />
                    </div>
                  )}
                </div>
                
                {/* Preview da Nova Quantidade */}
                {quantidade && (
                  <div className="mt-3 p-3 bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20 rounded-xl border border-blue-200/50 dark:border-blue-700/50">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center">
                        <Calculator size={16} className="text-blue-600 dark:text-blue-400 mr-2" />
                        <span className="text-sm font-medium text-blue-800 dark:text-blue-200">
                          Nova quantidade:
                        </span>
                      </div>
                      <span className={`font-bold ${
                        calcularNovaQuantidade() <= insumo.quantidade_minima
                          ? 'text-red-600 dark:text-red-400'
                          : 'text-blue-800 dark:text-blue-200'
                      }`}>
                        {calcularNovaQuantidade().toFixed(3)} {insumo.unidade_medida}
                      </span>
                    </div>
                    {calcularNovaQuantidade() <= insumo.quantidade_minima && (
                      <div className="mt-2 flex items-center text-xs text-red-600 dark:text-red-400">
                        <AlertTriangle size={12} className="mr-1" />
                        <span>Ficará abaixo do estoque mínimo</span>
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Motivo */}
              <div className="mb-6">
                <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3">
                  Motivo da Movimentação
                </label>
                <select
                  value={motivo}
                  onChange={(e) => setMotivo(e.target.value)}
                  className="w-full rounded-2xl border-gray-300 dark:border-gray-600 shadow-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white py-4 px-4"
                  required
                >
                  <option value="">Selecione um motivo</option>
                  {(tipo === 'entrada' ? motivosEntrada : motivosSaida).map(motivoOption => (
                    <option key={motivoOption} value={motivoOption}>
                      {motivoOption}
                    </option>
                  ))}
                </select>
              </div>

              {/* Observações */}
              <div className="mb-8">
                <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3">
                  Observações (opcional)
                </label>
                <textarea
                  value={observacao}
                  onChange={(e) => setObservacao(e.target.value)}
                  rows={3}
                  className="w-full rounded-2xl border-gray-300 dark:border-gray-600 shadow-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white p-4"
                  placeholder="Detalhes adicionais sobre a movimentação..."
                />
              </div>

              {/* Botões */}
              <div className="flex space-x-3">
                <Button
                  type="button"
                  variant="ghost"
                  onClick={() => {
                    onClose();
                    resetForm();
                  }}
                  className="flex-1 py-3"
                >
                  Cancelar
                </Button>
                <Button
                  type="submit"
                  variant={tipo === 'entrada' ? 'success' : 'warning'}
                  isLoading={loading}
                  disabled={!quantidade || !motivo || (tipo === 'saida' && parseFloat(quantidade) > insumo.quantidade)}
                  className={`flex-1 py-3 ${
                    tipo === 'entrada'
                      ? 'bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700'
                      : 'bg-gradient-to-r from-red-500 to-rose-600 hover:from-red-600 hover:to-rose-700'
                  }`}
                  icon={<Save size={18} />}
                >
                  Confirmar {tipo === 'entrada' ? 'Entrada' : 'Saída'}
                </Button>
              </div>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
};

export default MovimentacaoModal;