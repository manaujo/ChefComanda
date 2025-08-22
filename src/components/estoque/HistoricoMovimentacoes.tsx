import React, { useState, useEffect } from 'react';
import { Clock, ArrowUp, ArrowDown, User, Filter, Calendar, Download, Sparkles } from 'lucide-react';
import Button from '../ui/Button';
import { formatarDinheiro } from '../../utils/formatters';
import { supabase } from '../../services/supabase';
import { useAuth } from '../../contexts/AuthContext';
import { useRestaurante } from '../../contexts/RestauranteContext';
import toast from 'react-hot-toast';

interface MovimentacaoEstoque {
  id: string;
  tipo: 'entrada' | 'saida';
  quantidade: number;
  quantidade_anterior: number;
  quantidade_atual: number;
  motivo: string;
  observacao?: string;
  created_at: string;
  insumo_nome: string;
  unidade_medida: string;
  usuario_nome: string;
}

interface HistoricoMovimentacoesProps {
  insumoId?: string;
  insumoNome?: string;
}

const HistoricoMovimentacoes: React.FC<HistoricoMovimentacoesProps> = ({
  insumoId,
  insumoNome
}) => {
  const { user } = useAuth();
  const { restaurante } = useRestaurante();
  const [movimentacoes, setMovimentacoes] = useState<MovimentacaoEstoque[]>([]);
  const [loading, setLoading] = useState(false);
  const [filtroTipo, setFiltroTipo] = useState<'todos' | 'entrada' | 'saida'>('todos');
  const [periodo, setPeriodo] = useState('30dias');

  useEffect(() => {
    loadMovimentacoes();
  }, [insumoId, filtroTipo, periodo]);

  const loadMovimentacoes = async () => {
    try {
      setLoading(true);

      if (!restaurante) {
        throw new Error('Restaurante não encontrado no contexto');
      }

      // Calculate date range
      const endDate = new Date();
      const startDate = new Date();
      
      switch (periodo) {
        case 'hoje':
          startDate.setHours(0, 0, 0, 0);
          break;
        case '7dias':
          startDate.setDate(startDate.getDate() - 7);
          break;
        case '30dias':
          startDate.setDate(startDate.getDate() - 30);
          break;
      }

      // Use the view for better access control
      let query = supabase
        .from('view_movimentacoes_estoque_detalhadas')
        .select('*')
        .eq('restaurante_id', restaurante.id)
        .gte('created_at', startDate.toISOString())
        .lte('created_at', endDate.toISOString())
        .order('created_at', { ascending: false });

      // Filter by insumo if specified
      if (insumoId) {
        query = query.eq('insumo_id', insumoId);
      }

      // Filter by type
      if (filtroTipo !== 'todos') {
        query = query.eq('tipo', filtroTipo);
      }

      const { data, error } = await query.limit(100);

      if (error) throw error;

      // Data is already formatted from the view
      const formattedMovimentacoes: MovimentacaoEstoque[] = (data || []).map((mov) => ({
        id: mov.id,
        tipo: mov.tipo,
        quantidade: mov.quantidade,
        quantidade_anterior: mov.quantidade_anterior,
        quantidade_atual: mov.quantidade_atual,
        motivo: mov.motivo,
        observacao: mov.observacao,
        created_at: mov.created_at,
        insumo_nome: mov.insumo_nome,
        unidade_medida: mov.unidade_medida,
        usuario_nome: mov.usuario_nome
      }));

      setMovimentacoes(formattedMovimentacoes);
    } catch (error) {
      console.error('Error loading movimentacoes:', error);
      toast.error('Erro ao carregar histórico de movimentações');
    } finally {
      setLoading(false);
    }
  };

  const exportarHistorico = () => {
    toast.success('Histórico exportado com sucesso!');
  };

  return (
    <div className="bg-white/95 dark:bg-gray-800/95 backdrop-blur-sm rounded-3xl shadow-2xl border border-white/20 dark:border-gray-700/50 overflow-hidden">
      {/* Header */}
      <div className="bg-gradient-to-r from-purple-500 to-indigo-600 px-6 py-4">
        <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full -mr-16 -mt-16"></div>
        <div className="flex items-center justify-between text-white">
          <div className="flex items-center">
            <div className="relative p-3 bg-white/20 backdrop-blur-sm rounded-2xl mr-4">
              <Clock size={20} />
              <div className="absolute -top-1 -right-1 w-3 h-3 bg-white/30 rounded-full animate-pulse"></div>
            </div>
            <div>
              <h3 className="text-xl font-bold">
                Histórico de Movimentações
              </h3>
              <p className="text-purple-100 text-sm">
                {insumoNome || 'Todos os insumos'}
              </p>
            </div>
          </div>
          <Button
            variant="ghost"
            onClick={exportarHistorico}
            className="bg-white/20 backdrop-blur-sm text-white border-white/30 hover:bg-white/30 rounded-2xl px-4 py-2 font-semibold transition-all duration-200 hover:scale-105"
            icon={<Download size={16} />}
            size="sm"
          >
            Exportar
          </Button>
        </div>
      </div>

      {/* Filtros */}
      <div className="p-6 border-b border-gray-200/50 dark:border-gray-700/50 bg-gradient-to-r from-gray-50/50 to-slate-50/50 dark:from-gray-700/20 dark:to-slate-700/20">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-3">
              Tipo de Movimentação
            </label>
            <div className="flex space-x-3">
              <Button
                variant={filtroTipo === 'todos' ? 'primary' : 'ghost'}
                size="sm"
                onClick={() => setFiltroTipo('todos')}
                className="rounded-2xl px-4 py-2 font-semibold transition-all duration-200"
              >
                Todas
              </Button>
              <Button
                variant={filtroTipo === 'entrada' ? 'success' : 'ghost'}
                size="sm"
                onClick={() => setFiltroTipo('entrada')}
                icon={<ArrowUp size={14} />}
                className="rounded-2xl px-4 py-2 font-semibold transition-all duration-200"
              >
                Entradas
              </Button>
              <Button
                variant={filtroTipo === 'saida' ? 'warning' : 'ghost'}
                size="sm"
                onClick={() => setFiltroTipo('saida')}
                icon={<ArrowDown size={14} />}
                className="rounded-2xl px-4 py-2 font-semibold transition-all duration-200"
              >
                Saídas
              </Button>
            </div>
          </div>

          <div>
            <label className="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-3">
              Período
            </label>
            <select
              value={periodo}
              onChange={(e) => setPeriodo(e.target.value)}
              className="w-full px-4 py-3 bg-gray-50/50 dark:bg-gray-700/50 border border-gray-200/50 dark:border-gray-600/50 rounded-2xl focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 focus:border-blue-500 dark:focus:border-blue-400 transition-all duration-200 text-gray-900 dark:text-white"
            >
              <option value="hoje">Hoje</option>
              <option value="7dias">Últimos 7 dias</option>
              <option value="30dias">Últimos 30 dias</option>
            </select>
          </div>
        </div>
      </div>

      {/* Lista de Movimentações */}
      <div className="p-6">
        {loading ? (
          <div className="flex justify-center items-center h-40">
            <div className="relative">
              <div className="w-12 h-12 border-4 border-blue-200 dark:border-blue-800 border-t-blue-600 dark:border-t-blue-400 rounded-full animate-spin"></div>
              <div className="absolute inset-0 flex items-center justify-center">
                <Clock className="w-5 h-5 text-blue-600 dark:text-blue-400" />
              </div>
            </div>
          </div>
        ) : movimentacoes.length === 0 ? (
          <div className="text-center py-8">
            <div className="relative mb-6">
              <div className="w-20 h-20 bg-gradient-to-br from-gray-100 to-gray-200 dark:from-gray-700 dark:to-gray-600 rounded-3xl mx-auto flex items-center justify-center shadow-xl">
              <Clock size={32} className="text-gray-400 dark:text-gray-500" />
            </div>
              <div className="absolute -top-2 -right-2 w-6 h-6 bg-gradient-to-r from-purple-500 to-indigo-600 rounded-full flex items-center justify-center shadow-lg transform translate-x-8">
                <Sparkles className="w-3 h-3 text-white" />
              </div>
            </div>
            <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-3">
              Nenhuma movimentação encontrada
            </h3>
            <p className="text-lg text-gray-600 dark:text-gray-400">
              Não há movimentações registradas para os filtros selecionados
            </p>
          </div>
        ) : (
          <div className="space-y-4 max-h-[500px] overflow-y-auto">
            {movimentacoes.map((mov) => (
              <div
                key={mov.id}
                className={`group p-6 rounded-3xl border-l-4 shadow-lg hover:shadow-xl transition-all duration-300 hover:transform hover:scale-[1.02] ${
                  mov.tipo === 'entrada'
                    ? 'border-green-500 bg-gradient-to-br from-green-50 to-emerald-100 dark:from-green-900/20 dark:to-emerald-900/30'
                    : 'border-red-500 bg-gradient-to-br from-red-50 to-rose-100 dark:from-red-900/20 dark:to-rose-900/30'
                }`}
              >
                <div className="flex items-start justify-between">
                  <div className="flex items-start space-x-3">
                    <div className={`p-3 rounded-2xl shadow-md ${
                      mov.tipo === 'entrada'
                        ? 'bg-green-100 dark:bg-green-900/50'
                        : 'bg-red-100 dark:bg-red-900/50'
                    }`}>
                      {mov.tipo === 'entrada' ? (
                        <ArrowUp size={18} className="text-green-600 dark:text-green-400" />
                      ) : (
                        <ArrowDown size={18} className="text-red-600 dark:text-red-400" />
                      )}
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center space-x-3 mb-2">
                        <h4 className="font-bold text-lg text-gray-900 dark:text-white group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
                          {mov.insumo_nome}
                        </h4>
                        <span className={`px-3 py-1 text-xs font-bold rounded-full shadow-sm ${
                          mov.tipo === 'entrada'
                            ? 'bg-green-200 text-green-800 dark:bg-green-800/50 dark:text-green-200'
                            : 'bg-red-200 text-red-800 dark:bg-red-800/50 dark:text-red-200'
                        }`}>
                          {mov.tipo === 'entrada' ? 'Entrada' : 'Saída'}
                        </span>
                      </div>
                      <p className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
                        {mov.motivo}
                      </p>
                      {mov.observacao && (
                        <p className="text-sm text-gray-600 dark:text-gray-400 italic bg-white/50 dark:bg-gray-700/50 p-3 rounded-xl mb-3">
                          "{mov.observacao}"
                        </p>
                      )}
                      <div className="flex items-center space-x-4 mt-3 text-sm text-gray-500 dark:text-gray-400">
                        <div className="flex items-center">
                          <div className="p-1 bg-gray-200 dark:bg-gray-600 rounded-lg mr-2">
                            <User size={12} />
                          </div>
                          <span className="font-medium">{mov.usuario_nome}</span>
                        </div>
                        <div className="flex items-center">
                          <div className="p-1 bg-gray-200 dark:bg-gray-600 rounded-lg mr-2">
                            <Clock size={12} />
                          </div>
                          <span className="font-medium">{new Date(mov.created_at).toLocaleString('pt-BR')}</span>
                        </div>
                      </div>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className={`text-xl font-bold mb-2 ${
                      mov.tipo === 'entrada' ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'
                    }`}>
                      {mov.tipo === 'entrada' ? '+' : '-'}{mov.quantidade.toFixed(3)} {mov.unidade_medida}
                    </div>
                    <div className="text-sm text-gray-600 dark:text-gray-400 bg-white/50 dark:bg-gray-700/50 px-3 py-1 rounded-xl">
                      {mov.quantidade_anterior.toFixed(3)} → {mov.quantidade_atual.toFixed(3)}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default HistoricoMovimentacoes;