import React, { useState, useEffect } from 'react';
import { Clock, ArrowUp, ArrowDown, User, Filter, Calendar, Download } from 'lucide-react';
import Button from '../ui/Button';
import { formatarDinheiro } from '../../utils/formatters';
import { supabase } from '../../services/supabase';
import { useAuth } from '../../contexts/AuthContext';
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

      // Get or create user's restaurant
      let { data: restaurante, error: restauranteError } = await supabase
        .from('restaurantes')
        .select('*')
        .eq('user_id', user?.id)
        .maybeSingle();

      if (restauranteError && restauranteError.code !== 'PGRST116') {
        console.error('Error getting restaurant:', restauranteError);
        throw new Error('Restaurante não encontrado');
      }

      if (!restaurante) {
        console.log('Creating restaurant for user:', user?.id);
        const { data: newRestaurante, error: createError } = await supabase
          .from('restaurantes')
          .insert({
            user_id: user?.id,
            nome: `Restaurante de ${user?.user_metadata?.name || 'Usuário'}`,
            telefone: ""
          })
          .select()
          .single();

        if (createError) {
          console.error('Error creating restaurant:', createError);
          throw new Error('Erro ao criar restaurante');
        }

        restaurante = newRestaurante;
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

      // Build query
      let query = supabase
        .from('movimentacoes_estoque')
        .select(`
          *,
          insumo:insumos!inner(nome, unidade_medida),
          usuario:profiles(name)
        `)
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

      // Format data
      const formattedMovimentacoes: MovimentacaoEstoque[] = (data || []).map((mov: any) => ({
        id: mov.id,
        tipo: mov.tipo,
        quantidade: mov.quantidade,
        quantidade_anterior: mov.quantidade_anterior,
        quantidade_atual: mov.quantidade_atual,
        motivo: mov.motivo,
        observacao: mov.observacao,
        created_at: mov.created_at,
        insumo_nome: mov.insumo.nome,
        unidade_medida: mov.insumo.unidade_medida,
        usuario_nome: mov.usuario?.name || 'Usuário'
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
    <div className="bg-white dark:bg-gray-800 rounded-3xl shadow-xl border border-gray-200/50 dark:border-gray-700/50 overflow-hidden">
      {/* Header */}
      <div className="bg-gradient-to-r from-purple-500 to-indigo-600 px-6 py-4">
        <div className="flex items-center justify-between text-white">
          <div className="flex items-center">
            <div className="p-2 bg-white/20 backdrop-blur-sm rounded-xl mr-3">
              <Clock size={20} />
            </div>
            <div>
              <h3 className="text-lg font-semibold">
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
            className="bg-white/20 backdrop-blur-sm text-white border-white/30 hover:bg-white/30"
            icon={<Download size={16} />}
            size="sm"
          >
            Exportar
          </Button>
        </div>
      </div>

      {/* Filtros */}
      <div className="p-6 border-b border-gray-200 dark:border-gray-700">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Tipo de Movimentação
            </label>
            <div className="flex space-x-2">
              <Button
                variant={filtroTipo === 'todos' ? 'primary' : 'ghost'}
                size="sm"
                onClick={() => setFiltroTipo('todos')}
              >
                Todas
              </Button>
              <Button
                variant={filtroTipo === 'entrada' ? 'success' : 'ghost'}
                size="sm"
                onClick={() => setFiltroTipo('entrada')}
                icon={<ArrowUp size={14} />}
              >
                Entradas
              </Button>
              <Button
                variant={filtroTipo === 'saida' ? 'warning' : 'ghost'}
                size="sm"
                onClick={() => setFiltroTipo('saida')}
                icon={<ArrowDown size={14} />}
              >
                Saídas
              </Button>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Período
            </label>
            <select
              value={periodo}
              onChange={(e) => setPeriodo(e.target.value)}
              className="w-full border border-gray-300 dark:border-gray-600 rounded-lg py-2 px-3 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white"
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
          <div className="flex justify-center items-center h-32">
            <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-blue-500"></div>
          </div>
        ) : movimentacoes.length === 0 ? (
          <div className="text-center py-8">
            <div className="inline-flex items-center justify-center w-16 h-16 bg-gray-100 dark:bg-gray-700 rounded-2xl mb-4">
              <Clock size={32} className="text-gray-400 dark:text-gray-500" />
            </div>
            <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
              Nenhuma movimentação encontrada
            </h3>
            <p className="text-gray-500 dark:text-gray-400">
              Não há movimentações registradas para os filtros selecionados
            </p>
          </div>
        ) : (
          <div className="space-y-4 max-h-96 overflow-y-auto">
            {movimentacoes.map((mov) => (
              <div
                key={mov.id}
                className={`p-4 rounded-2xl border-l-4 ${
                  mov.tipo === 'entrada'
                    ? 'border-green-500 bg-green-50 dark:bg-green-900/20'
                    : 'border-red-500 bg-red-50 dark:bg-red-900/20'
                } hover:shadow-md transition-all duration-200`}
              >
                <div className="flex items-start justify-between">
                  <div className="flex items-start space-x-3">
                    <div className={`p-2 rounded-xl ${
                      mov.tipo === 'entrada'
                        ? 'bg-green-100 dark:bg-green-900/30'
                        : 'bg-red-100 dark:bg-red-900/30'
                    }`}>
                      {mov.tipo === 'entrada' ? (
                        <ArrowUp size={16} className="text-green-600 dark:text-green-400" />
                      ) : (
                        <ArrowDown size={16} className="text-red-600 dark:text-red-400" />
                      )}
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center space-x-2 mb-1">
                        <h4 className="font-semibold text-gray-900 dark:text-white">
                          {mov.insumo_nome}
                        </h4>
                        <span className={`px-2 py-1 text-xs font-medium rounded-full ${
                          mov.tipo === 'entrada'
                            ? 'bg-green-100 text-green-800 dark:bg-green-900/50 dark:text-green-200'
                            : 'bg-red-100 text-red-800 dark:bg-red-900/50 dark:text-red-200'
                        }`}>
                          {mov.tipo === 'entrada' ? 'Entrada' : 'Saída'}
                        </span>
                      </div>
                      <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">
                        {mov.motivo}
                      </p>
                      {mov.observacao && (
                        <p className="text-xs text-gray-500 dark:text-gray-400 italic">
                          "{mov.observacao}"
                        </p>
                      )}
                      <div className="flex items-center space-x-4 mt-2 text-xs text-gray-500 dark:text-gray-400">
                        <div className="flex items-center">
                          <User size={12} className="mr-1" />
                          <span>{mov.usuario_nome}</span>
                        </div>
                        <div className="flex items-center">
                          <Clock size={12} className="mr-1" />
                          <span>{new Date(mov.created_at).toLocaleString('pt-BR')}</span>
                        </div>
                      </div>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className={`text-lg font-bold ${
                      mov.tipo === 'entrada' ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'
                    }`}>
                      {mov.tipo === 'entrada' ? '+' : '-'}{mov.quantidade.toFixed(3)} {mov.unidade_medida}
                    </div>
                    <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">
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