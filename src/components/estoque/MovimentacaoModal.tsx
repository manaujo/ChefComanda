import React, { useState } from 'react';
import { X, ArrowUp, ArrowDown, Package, AlertTriangle, Calculator, Save, Gauge } from 'lucide-react';
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
    
    // Converter quantidade diretamente sem multiplicação
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
      console.log('Registrando movimentação:', {
        insumoId: insumo.id,
        tipo,
        quantidade: qtd,
        motivo,
        observacao
      });
      
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
        <div className="bg-white/95 dark:bg-gray-800/95 backdrop-blur-sm rounded-3xl shadow-2xl w-full max-w-lg transform transition-all duration-300 scale-100 border border-white/20 dark:border-gray-700/50">
          <div className="relative overflow-hidden">
            {/* Header */}
            <div className={`px-8 py-6 ${
              tipo === 'entrada' 
                ? 'bg-gradient-to-r from-green-500 to-emerald-600' 
                : 'bg-gradient-to-r from-red-500 to-rose-600'
            }`}>
              <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full -mr-16 -mt-16"></div>
              <div className="flex justify-between items-center">
                <div className="flex items-center">
                  <div className="relative p-3 bg-white/20 backdrop-blur-sm rounded-2xl mr-4">
                    {tipo === 'entrada' ? (
                      <ArrowUp size={24} className="text-white" />
                    ) : (
                      <ArrowDown size={24} className="text-white" />
                    )}
                    <div className="absolute -top-1 -right-1 w-3 h-3 bg-white/30 rounded-full animate-pulse"></div>
                  </div>
                  <div className="text-white">
                    <h3 className="text-2xl font-bold">
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
                  className="p-3 text-white/70 hover:text-white hover:bg-white/20 rounded-2xl transition-all duration-200 hover:scale-110"
                >
                  <X size={20} />
                </button>
              </div>
            </div>

            <form onSubmit={handleSubmit} className="p-8">
              {/* Informações do Insumo */}
              <div className="mb-6">
                <div className="bg-gradient-to-r from-gray-50 to-gray-100 dark:from-gray-700 dark:to-gray-600 rounded-2xl p-6 border border-gray-200/50 dark:border-gray-600/50 shadow-lg">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center">
                      <div className="p-3 bg-blue-100 dark:bg-blue-900/50 rounded-2xl mr-4 shadow-md">
                        <Package size={20} className="text-blue-600 dark:text-blue-400" />
                      </div>
                      <div>
                        <h4 className="font-bold text-lg text-gray-900 dark:text-white">{insumo.nome}</h4>
                        <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                          Estoque atual: <span className="font-medium">{insumo.quantidade} {insumo.unidade_medida}</span>
                        </p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">Mínimo</p>
                      <p className="font-bold text-gray-900 dark:text-white">
                        {insumo.quantidade_minima} {insumo.unidade_medida}
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Tipo de Movimentação */}
              <div className="mb-6">
                <label className="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-4">
                  Tipo de Movimentação
                </label>
                <div className="grid grid-cols-2 gap-4">
                  <button
                    type="button"
                    onClick={() => setTipo('entrada')}
                    className={`p-6 rounded-2xl border-2 transition-all duration-300 transform hover:scale-105 ${
                      tipo === 'entrada'
                        ? 'border-green-500 bg-gradient-to-br from-green-50 to-emerald-100 dark:from-green-900/30 dark:to-emerald-900/20 shadow-lg'
                        : 'border-gray-200 dark:border-gray-600 hover:border-green-300 bg-white/50 dark:bg-gray-700/50 hover:shadow-md'
                    }`}
                  >
                    <div className="flex items-center justify-center mb-3">
                      <ArrowUp size={20} className={`${
                        tipo === 'entrada' ? 'text-green-600' : 'text-gray-400'
                      }`} />
                    </div>
                    <span className={`text-sm font-bold ${
                      tipo === 'entrada' ? 'text-green-800 dark:text-green-200' : 'text-gray-600 dark:text-gray-400'
                    }`}>
                      Entrada
                    </span>
                  </button>
                  
                  <button
                    type="button"
                    onClick={() => setTipo('saida')}
                    className={`p-6 rounded-2xl border-2 transition-all duration-300 transform hover:scale-105 ${
                      tipo === 'saida'
                        ? 'border-red-500 bg-gradient-to-br from-red-50 to-rose-100 dark:from-red-900/30 dark:to-rose-900/20 shadow-lg'
                        : 'border-gray-200 dark:border-gray-600 hover:border-red-300 bg-white/50 dark:bg-gray-700/50 hover:shadow-md'
                    }`}
                  >
                    <div className="flex items-center justify-center mb-3">
                      <ArrowDown size={20} className={`${
                        tipo === 'saida' ? 'text-red-600' : 'text-gray-400'
                      }`} />
                    </div>
                    <span className={`text-sm font-bold ${
                      tipo === 'saida' ? 'text-red-800 dark:text-red-200' : 'text-gray-600 dark:text-gray-400'
                    }`}>
                      Saída
                    </span>
                  </button>
                </div>
              </div>

              {/* Quantidade */}
              <div className="mb-6">
                <label className="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-4">
                  Quantidade ({insumo.unidade_medida})
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                    <Gauge className="w-5 h-5 text-gray-400 dark:text-gray-500" />
                  </div>
                  <input
                    type="number"
                    step="0.001"
                    min="0.001"
                    max={tipo === 'saida' ? insumo.quantidade : undefined}
                    value={quantidade}
                    onChange={(e) => setQuantidade(e.target.value)}
                    className="w-full pl-12 pr-4 py-4 bg-gray-50/50 dark:bg-gray-700/50 border border-gray-200/50 dark:border-gray-600/50 rounded-2xl focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 focus:border-blue-500 dark:focus:border-blue-400 transition-all duration-200 text-lg font-medium text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400"
                    placeholder="0.000"
                    required
                  />
                  {tipo === 'saida' && quantidade && parseFloat(quantidade) > insumo.quantidade && (
                    <div className="absolute right-4 top-1/2 -translate-y-1/2">
                      <AlertTriangle size={20} className="text-red-500" />
                    </div>
                  )}
                </div>
                
                {/* Preview da Nova Quantidade */}
                {quantidade && (
                  <div className="mt-4 p-4 bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20 rounded-2xl border border-blue-200/50 dark:border-blue-700/50 shadow-md">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center">
                        <Calculator size={16} className="text-blue-600 dark:text-blue-400 mr-2" />
                        <span className="text-sm font-bold text-blue-800 dark:text-blue-200">
                          Nova quantidade:
                        </span>
                      </div>
                      <span className={`font-bold text-lg ${
                        calcularNovaQuantidade() <= insumo.quantidade_minima
                          ? 'text-red-600 dark:text-red-400'
                          : 'text-blue-800 dark:text-blue-200'
                      }`}>
                        {calcularNovaQuantidade().toFixed(3)} {insumo.unidade_medida}
                      </span>
                    </div>
                    {calcularNovaQuantidade() <= insumo.quantidade_minima && (
                      <div className="mt-3 flex items-center text-sm text-red-600 dark:text-red-400 font-medium">
                        <AlertTriangle size={12} className="mr-1" />
                        <span>Ficará abaixo do estoque mínimo</span>
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Motivo */}
              <div className="mb-6">
                <label className="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-4">
                  Motivo da Movimentação
                </label>
                <select
                  value={motivo}
                  onChange={(e) => setMotivo(e.target.value)}
                  className="w-full px-4 py-4 bg-gray-50/50 dark:bg-gray-700/50 border border-gray-200/50 dark:border-gray-600/50 rounded-2xl focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 focus:border-blue-500 dark:focus:border-blue-400 transition-all duration-200 text-gray-900 dark:text-white"
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
                <label className="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-4">
                  Observações (opcional)
                </label>
                <textarea
                  value={observacao}
                  onChange={(e) => setObservacao(e.target.value)}
                  rows={3}
                  className="w-full px-4 py-4 bg-gray-50/50 dark:bg-gray-700/50 border border-gray-200/50 dark:border-gray-600/50 rounded-2xl focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 focus:border-blue-500 dark:focus:border-blue-400 transition-all duration-200 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400"
                  placeholder="Detalhes adicionais sobre a movimentação..."
                />
              </div>

              {/* Botões */}
              <div className="flex space-x-4">
                <Button
                  type="button"
                  variant="ghost"
                  onClick={() => {
                    onClose();
                    resetForm();
                  }}
                  className="flex-1 bg-gray-100/80 dark:bg-gray-700/80 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600 rounded-2xl py-4 font-semibold transition-all duration-200"
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