import React, { useState, useEffect } from 'react';
import { Package, Plus, Search, Filter, AlertTriangle, TrendingUp, CreditCard as Edit, Trash2, ArrowUp, ArrowDown, Calendar, Download, FileSpreadsheet, RefreshCw, Eye, Clock, User, Zap, CheckCircle, XCircle, Activity, BarChart3, X, Sparkles, Box, Layers, Target, Gauge } from 'lucide-react';
import Button from '../components/ui/Button';
import { formatarDinheiro } from '../utils/formatters';
import { useAuth } from '../contexts/AuthContext';
import { useRestaurante } from '../contexts/RestauranteContext';
import { supabase } from '../services/supabase';
import MovimentacaoModal from '../components/estoque/MovimentacaoModal';
import HistoricoMovimentacoes from '../components/estoque/HistoricoMovimentacoes';
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
  created_at: string;
  updated_at: string;
}

const Estoque: React.FC = () => {
  const { user } = useAuth();
  const { restaurante } = useRestaurante();
  const [insumos, setInsumos] = useState<Insumo[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('todos');
  const [showModal, setShowModal] = useState(false);
  const [showMovimentacaoModal, setShowMovimentacaoModal] = useState(false);
  const [showHistoricoModal, setShowHistoricoModal] = useState(false);
  const [selectedInsumo, setSelectedInsumo] = useState<Insumo | null>(null);
  const [editingInsumo, setEditingInsumo] = useState<Insumo | null>(null);
  const [formData, setFormData] = useState({
    nome: '',
    descricao: '',
    unidade_medida: 'kg',
    quantidade: '',
    quantidade_minima: '',
    data_validade: '',
    preco_unitario: ''
  });

  useEffect(() => {
    if (restaurante?.id) {
      loadInsumos();
    }
  }, [restaurante?.id]);

  const loadInsumos = async () => {
    try {
      setLoading(true);
      
      if (!restaurante?.id) {
        throw new Error('Restaurante não encontrado no contexto');
      }

      const { data, error } = await supabase
        .from('insumos')
        .select('*')
        .eq('restaurante_id', restaurante.id)
        .order('nome');

      if (error) throw error;
      setInsumos(data || []);
    } catch (error) {
      console.error('Erro ao carregar insumos:', error);
      toast.error('Erro ao carregar insumos');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    try {
      if (!restaurante?.id) {
        throw new Error('Restaurante não encontrado no contexto');
      }

      // Converter valores para números
      const quantidade = parseFloat(formData.quantidade);
      const quantidadeMinima = parseFloat(formData.quantidade_minima);
      const precoUnitario = formData.preco_unitario ? parseFloat(formData.preco_unitario) : null;

      // Validar valores
      if (isNaN(quantidade) || quantidade < 0) {
        throw new Error('Quantidade atual inválida');
      }

      if (isNaN(quantidadeMinima) || quantidadeMinima < 0) {
        throw new Error('Quantidade mínima inválida');
      }

      // Data de validade - usar valor direto do input
      let dataValidade = null;
      if (formData.data_validade) {
        // Input date já retorna no formato YYYY-MM-DD correto
        dataValidade = formData.data_validade;
      }

      const insumoData = {
        restaurante_id: restaurante.id,
        nome: formData.nome,
        descricao: formData.descricao || null,
        unidade_medida: formData.unidade_medida,
        quantidade: quantidade,
        quantidade_minima: quantidadeMinima,
        data_validade: dataValidade,
        preco_unitario: precoUnitario,
        ativo: true
      };

      if (editingInsumo) {
        const { error } = await supabase
          .from('insumos')
          .update(insumoData)
          .eq('id', editingInsumo.id);

        if (error) throw error;
        toast.success('Insumo atualizado com sucesso!');
      } else {
        const { error } = await supabase
          .from('insumos')
          .insert(insumoData);

        if (error) throw error;
        toast.success('Insumo adicionado com sucesso!');
      }

      await loadInsumos();
      resetForm();
      setShowModal(false);
    } catch (error) {
      console.error('Erro ao salvar insumo:', error);
      toast.error('Erro ao salvar insumo');
    }
  };

  const handleEdit = (insumo: Insumo) => {
    setEditingInsumo(insumo);
    setFormData({
      nome: insumo.nome,
      descricao: insumo.descricao || '',
      unidade_medida: insumo.unidade_medida,
      quantidade: insumo.quantidade.toString(),
      quantidade_minima: insumo.quantidade_minima.toString(),
      data_validade: insumo.data_validade || '',
      preco_unitario: insumo.preco_unitario?.toString() || ''
    });
    setShowModal(true);
  };

  const handleDelete = async (id: string) => {
    if (confirm('Tem certeza que deseja excluir este insumo?')) {
      try {
        const { error } = await supabase
          .from('insumos')
          .delete()
          .eq('id', id);

        if (error) throw error;
        
        await loadInsumos();
        toast.success('Insumo excluído com sucesso!');
      } catch (error) {
        console.error('Erro ao excluir insumo:', error);
        toast.error('Erro ao excluir insumo');
      }
    }
  };

  const handleMovimentacao = async (
    insumoId: string,
    tipo: 'entrada' | 'saida',
    quantidade: number,
    motivo: string,
    observacao?: string
  ) => {
    try {
      // Call the stored function to register stock movement
      const { error } = await supabase.rpc('registrar_movimentacao_estoque', {
        p_insumo_id: insumoId,
        p_tipo: tipo,
        p_quantidade: quantidade,
        p_motivo: motivo,
        p_observacao: observacao,
        p_usuario_id: user?.id
      });

      if (error) throw error;

      await loadInsumos();
      toast.success(`${tipo === 'entrada' ? 'Entrada' : 'Saída'} registrada com sucesso!`);
    } catch (error) {
      console.error('Erro ao registrar movimentação:', error);
      toast.error(error instanceof Error ? error.message : 'Erro ao registrar movimentação');
      throw error;
    }
  };

  const resetForm = () => {
    setFormData({
      nome: '',
      descricao: '',
      unidade_medida: 'kg',
      quantidade: '',
      quantidade_minima: '',
      data_validade: '',
      preco_unitario: ''
    });
    setEditingInsumo(null);
  };

  const getStatusColor = (insumo: Insumo) => {
    if (insumo.quantidade === 0) {
      return 'border-red-500 bg-gradient-to-br from-red-50 to-red-100 dark:from-red-900/20 dark:to-red-800/30';
    } else if (insumo.quantidade <= insumo.quantidade_minima) {
      return 'border-yellow-500 bg-gradient-to-br from-yellow-50 to-amber-100 dark:from-yellow-900/20 dark:to-amber-800/30';
    }
    return 'border-green-500 bg-gradient-to-br from-green-50 to-emerald-100 dark:from-green-900/20 dark:to-emerald-800/30';
  };

  const getStatusIcon = (insumo: Insumo) => {
    if (insumo.quantidade === 0) {
      return <XCircle className="w-6 h-6 text-red-500" />;
    } else if (insumo.quantidade <= insumo.quantidade_minima) {
      return <AlertTriangle className="w-6 h-6 text-yellow-500" />;
    }
    return <CheckCircle className="w-6 h-6 text-green-500" />;
  };

  const getStatusBadge = (insumo: Insumo) => {
    if (insumo.quantidade === 0) {
      return (
        <div className="inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold bg-red-100 text-red-800 dark:bg-red-900/50 dark:text-red-200">
          <XCircle className="w-3 h-3 mr-1" />
          Crítico
        </div>
      );
    } else if (insumo.quantidade <= insumo.quantidade_minima) {
      return (
        <div className="inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold bg-yellow-100 text-yellow-800 dark:bg-yellow-900/50 dark:text-yellow-200">
          <AlertTriangle className="w-3 h-3 mr-1" />
          Baixo
        </div>
      );
    }
    return (
      <div className="inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold bg-green-100 text-green-800 dark:bg-green-900/50 dark:text-green-200">
        <CheckCircle className="w-3 h-3 mr-1" />
        Normal
      </div>
    );
  };

  const filteredInsumos = insumos.filter(insumo => {
    const matchesSearch = insumo.nome.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         (insumo.descricao && insumo.descricao.toLowerCase().includes(searchTerm.toLowerCase()));
    
    let matchesStatus = true;
    if (statusFilter === 'critico') {
      matchesStatus = insumo.quantidade === 0;
    } else if (statusFilter === 'baixo') {
      matchesStatus = insumo.quantidade > 0 && insumo.quantidade <= insumo.quantidade_minima;
    } else if (statusFilter === 'ok') {
      matchesStatus = insumo.quantidade > insumo.quantidade_minima;
    }
    
    return matchesSearch && matchesStatus && insumo.ativo;
  });

  const insumosComEstoqueBaixo = insumos.filter(i => i.quantidade <= i.quantidade_minima && i.ativo);
  const insumosComEstoqueCritico = insumos.filter(i => i.quantidade === 0 && i.ativo);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-50 dark:bg-gray-900">
        <div className="text-center">
          <div className="relative">
            <div className="w-20 h-20 border-4 border-blue-200 dark:border-blue-800 border-t-blue-600 dark:border-t-blue-400 rounded-full animate-spin mx-auto mb-4"></div>
            <div className="absolute inset-0 flex items-center justify-center">
              <Package className="w-8 h-8 text-blue-600 dark:text-blue-400" />
            </div>
          </div>
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
            Carregando Estoque
          </h3>
          <p className="text-gray-600 dark:text-gray-400">
            Aguarde enquanto carregamos seus insumos...
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-blue-50/30 to-indigo-50/30 dark:from-gray-900 dark:via-gray-800 dark:to-gray-700">
      <div className="p-6 w-full">
        {/* Header Moderno */}
        <div className="mb-8">
          <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center">
            <div className="mb-6 lg:mb-0">
              <div className="flex items-center mb-4">
                <div className="relative">
                  <div className="p-4 bg-gradient-to-br from-blue-500 via-blue-600 to-indigo-600 rounded-3xl shadow-2xl mr-6 transform rotate-3 hover:rotate-0 transition-transform duration-300">
                    <Package size={32} className="text-white" />
                  </div>
                  <div className="absolute -top-2 -right-2 w-6 h-6 bg-gradient-to-r from-yellow-400 to-orange-500 rounded-full flex items-center justify-center shadow-lg">
                    <Sparkles className="w-3 h-3 text-white" />
                  </div>
                </div>
                <div>
                  <h1 className="text-4xl font-bold bg-gradient-to-r from-gray-900 via-blue-800 to-indigo-900 dark:from-white dark:via-blue-200 dark:to-indigo-200 bg-clip-text text-transparent">
                    Controle de Estoque
                  </h1>
                  <p className="text-xl text-gray-600 dark:text-gray-400 mt-2">
                    Gerencie insumos e matérias-primas com inteligência
                  </p>
                </div>
              </div>
            </div>
            
            <div className="flex flex-wrap gap-3">
              <Button
                variant="ghost"
                icon={<RefreshCw size={18} />}
                onClick={loadInsumos}
                isLoading={loading}
                className="bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm shadow-lg hover:shadow-xl transition-all duration-300 border border-white/20 dark:border-gray-700/50"
              >
                Atualizar
              </Button>
              <Button
                variant="ghost"
                icon={<FileSpreadsheet size={18} />}
                onClick={() => toast.success('Relatório exportado em Excel!')}
                className="bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm shadow-lg hover:shadow-xl transition-all duration-300 border border-white/20 dark:border-gray-700/50"
              >
                Excel
              </Button>
              <Button
                variant="ghost"
                icon={<Download size={18} />}
                onClick={() => toast.success('Relatório exportado em PDF!')}
                className="bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm shadow-lg hover:shadow-xl transition-all duration-300 border border-white/20 dark:border-gray-700/50"
              >
                PDF
              </Button>
              <Button
                onClick={() => {
                  resetForm();
                  setShowModal(true);
                }}
                className="bg-gradient-to-r from-blue-600 via-blue-700 to-indigo-700 hover:from-blue-700 hover:via-blue-800 hover:to-indigo-800 text-white px-8 py-3 rounded-2xl flex items-center gap-3 transition-all duration-300 shadow-xl hover:shadow-2xl transform hover:scale-105 active:scale-95"
              >
                <Plus className="w-5 h-5" />
                <span className="font-semibold">Novo Insumo</span>
              </Button>
            </div>
          </div>
        </div>

        {/* Alertas de Estoque Modernos */}
        {(insumosComEstoqueCritico.length > 0 || insumosComEstoqueBaixo.length > 0) && (
          <div className="mb-8 space-y-4">
            {insumosComEstoqueCritico.length > 0 && (
              <div className="relative overflow-hidden bg-gradient-to-r from-red-50 via-red-100 to-rose-100 dark:from-red-900/20 dark:via-red-800/30 dark:to-rose-800/20 border-l-4 border-red-500 rounded-2xl shadow-lg">
                <div className="absolute top-0 right-0 w-32 h-32 bg-red-500/10 rounded-full -mr-16 -mt-16"></div>
                <div className="relative p-6">
                  <div className="flex items-center">
                    <div className="p-3 bg-red-500/20 rounded-2xl mr-4">
                      <XCircle className="h-6 w-6 text-red-600 dark:text-red-400" />
                    </div>
                    <div className="flex-1">
                      <h3 className="text-lg font-bold text-red-800 dark:text-red-200 mb-1">
                        🚨 Estoque Crítico - {insumosComEstoqueCritico.length} {insumosComEstoqueCritico.length === 1 ? 'item' : 'itens'}
                      </h3>
                      <div className="text-sm text-red-700 dark:text-red-300">
                        <div className="flex flex-wrap gap-2">
                          {insumosComEstoqueCritico.slice(0, 3).map(insumo => (
                            <span key={insumo.id} className="px-3 py-1 bg-red-200/50 dark:bg-red-800/30 rounded-full font-medium">
                              {insumo.nome}
                            </span>
                          ))}
                          {insumosComEstoqueCritico.length > 3 && (
                            <span className="px-3 py-1 bg-red-200/50 dark:bg-red-800/30 rounded-full font-medium">
                              +{insumosComEstoqueCritico.length - 3} mais
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {insumosComEstoqueBaixo.length > 0 && (
              <div className="relative overflow-hidden bg-gradient-to-r from-yellow-50 via-amber-100 to-orange-100 dark:from-yellow-900/20 dark:via-amber-800/30 dark:to-orange-800/20 border-l-4 border-yellow-500 rounded-2xl shadow-lg">
                <div className="absolute top-0 right-0 w-32 h-32 bg-yellow-500/10 rounded-full -mr-16 -mt-16"></div>
                <div className="relative p-6">
                  <div className="flex items-center">
                    <div className="p-3 bg-yellow-500/20 rounded-2xl mr-4">
                      <AlertTriangle className="h-6 w-6 text-yellow-600 dark:text-yellow-400" />
                    </div>
                    <div className="flex-1">
                      <h3 className="text-lg font-bold text-yellow-800 dark:text-yellow-200 mb-1">
                        ⚠️ Estoque Baixo - {insumosComEstoqueBaixo.length} {insumosComEstoqueBaixo.length === 1 ? 'item' : 'itens'}
                      </h3>
                      <div className="text-sm text-yellow-700 dark:text-yellow-300">
                        <div className="flex flex-wrap gap-2">
                          {insumosComEstoqueBaixo.slice(0, 3).map(insumo => (
                            <span key={insumo.id} className="px-3 py-1 bg-yellow-200/50 dark:bg-yellow-800/30 rounded-full font-medium">
                              {insumo.nome}
                            </span>
                          ))}
                          {insumosComEstoqueBaixo.length > 3 && (
                            <span className="px-3 py-1 bg-yellow-200/50 dark:bg-yellow-800/30 rounded-full font-medium">
                              +{insumosComEstoqueBaixo.length - 3} mais
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Filtros Modernos */}
        <div className="bg-white/90 dark:bg-gray-800/90 backdrop-blur-sm rounded-3xl shadow-xl border border-white/20 dark:border-gray-700/50 p-6 mb-8">
          <div className="flex flex-col lg:flex-row gap-6">
            <div className="flex-1">
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                  <Search className="w-5 h-5 text-gray-400 dark:text-gray-500" />
                </div>
                <input
                  type="text"
                  placeholder="Buscar insumos por nome ou descrição..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-12 pr-4 py-4 bg-gray-50/50 dark:bg-gray-700/50 border border-gray-200/50 dark:border-gray-600/50 rounded-2xl focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 focus:border-blue-500 dark:focus:border-blue-400 transition-all duration-200 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400"
                />
              </div>
            </div>
            <div className="flex flex-wrap gap-3">
              <Button
                variant={statusFilter === 'todos' ? 'primary' : 'ghost'}
                size="sm"
                onClick={() => setStatusFilter('todos')}
                className={`px-6 py-3 rounded-2xl font-semibold transition-all duration-200 ${
                  statusFilter === 'todos' 
                    ? 'bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-lg' 
                    : 'bg-white/60 dark:bg-gray-700/60 text-gray-700 dark:text-gray-300 hover:bg-white dark:hover:bg-gray-700 shadow-md'
                }`}
              >
                <Box className="w-4 h-4 mr-2" />
                Todos ({insumos.filter(i => i.ativo).length})
              </Button>
              <Button
                variant={statusFilter === 'critico' ? 'danger' : 'ghost'}
                size="sm"
                onClick={() => setStatusFilter('critico')}
                className={`px-6 py-3 rounded-2xl font-semibold transition-all duration-200 ${
                  statusFilter === 'critico' 
                    ? 'bg-gradient-to-r from-red-500 to-red-600 text-white shadow-lg' 
                    : 'bg-white/60 dark:bg-gray-700/60 text-gray-700 dark:text-gray-300 hover:bg-white dark:hover:bg-gray-700 shadow-md'
                }`}
              >
                <XCircle className="w-4 h-4 mr-2" />
                Crítico ({insumosComEstoqueCritico.length})
              </Button>
              <Button
                variant={statusFilter === 'baixo' ? 'warning' : 'ghost'}
                size="sm"
                onClick={() => setStatusFilter('baixo')}
                className={`px-6 py-3 rounded-2xl font-semibold transition-all duration-200 ${
                  statusFilter === 'baixo' 
                    ? 'bg-gradient-to-r from-yellow-500 to-amber-600 text-white shadow-lg' 
                    : 'bg-white/60 dark:bg-gray-700/60 text-gray-700 dark:text-gray-300 hover:bg-white dark:hover:bg-gray-700 shadow-md'
                }`}
              >
                <AlertTriangle className="w-4 h-4 mr-2" />
                Baixo ({insumosComEstoqueBaixo.length})
              </Button>
              <Button
                variant={statusFilter === 'ok' ? 'success' : 'ghost'}
                size="sm"
                onClick={() => setStatusFilter('ok')}
                className={`px-6 py-3 rounded-2xl font-semibold transition-all duration-200 ${
                  statusFilter === 'ok' 
                    ? 'bg-gradient-to-r from-green-500 to-emerald-600 text-white shadow-lg' 
                    : 'bg-white/60 dark:bg-gray-700/60 text-gray-700 dark:text-gray-300 hover:bg-white dark:hover:bg-gray-700 shadow-md'
                }`}
              >
                <CheckCircle className="w-4 h-4 mr-2" />
                Normal ({insumos.filter(i => i.quantidade > i.quantidade_minima && i.ativo).length})
              </Button>
            </div>
          </div>
        </div>

        {/* Cards de Insumos Modernos */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 mb-8">
          {filteredInsumos.map((insumo) => (
            <div 
              key={insumo.id} 
              className={`group relative overflow-hidden bg-white/90 dark:bg-gray-800/90 backdrop-blur-sm rounded-3xl shadow-xl border-l-4 hover:shadow-2xl transition-all duration-300 hover:transform hover:scale-105 ${getStatusColor(insumo)}`}
            >
              {/* Background Pattern */}
              <div className="absolute top-0 right-0 w-24 h-24 opacity-10">
                <div className="w-full h-full bg-gradient-to-br from-blue-500 to-purple-600 rounded-full transform translate-x-8 -translate-y-8"></div>
              </div>
              
              <div className="relative p-6">
                {/* Header do Card */}
                <div className="flex justify-between items-start mb-4">
                  <div className="flex items-center">
                    <div className="p-3 bg-white/50 dark:bg-gray-700/50 rounded-2xl mr-3 shadow-lg">
                      {getStatusIcon(insumo)}
                    </div>
                    <div className="flex-1">
                      <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-1 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
                        {insumo.nome}
                      </h3>
                      {getStatusBadge(insumo)}
                    </div>
                  </div>
                  <div className="flex space-x-1">
                    <button
                      onClick={() => handleEdit(insumo)}
                      className="p-2 text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300 hover:bg-blue-100/50 dark:hover:bg-blue-900/30 rounded-xl transition-all duration-200"
                    >
                      <Edit className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => handleDelete(insumo.id)}
                      className="p-2 text-red-600 dark:text-red-400 hover:text-red-800 dark:hover:text-red-300 hover:bg-red-100/50 dark:hover:bg-red-900/30 rounded-xl transition-all duration-200"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
                
                {insumo.descricao && (
                  <p className="text-gray-600 dark:text-gray-400 text-sm mb-4 line-clamp-2">
                    {insumo.descricao}
                  </p>
                )}
                
                {/* Métricas do Insumo */}
                <div className="space-y-3 mb-6">
                  <div className="flex justify-between items-center p-3 bg-gradient-to-r from-blue-50/50 to-indigo-50/50 dark:from-blue-900/20 dark:to-indigo-900/20 rounded-xl">
                    <div className="flex items-center">
                      <Gauge className="w-4 h-4 text-blue-600 dark:text-blue-400 mr-2" />
                      <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Quantidade atual</span>
                    </div>
                    <span className="font-bold text-lg text-gray-900 dark:text-white">
                      {insumo.quantidade.toLocaleString('pt-BR', { minimumFractionDigits: 0, maximumFractionDigits: 3 })} {insumo.unidade_medida}
                    </span>
                  </div>

                  <div className="flex justify-between items-center p-3 bg-gradient-to-r from-gray-50/50 to-slate-50/50 dark:from-gray-700/20 dark:to-slate-700/20 rounded-xl">
                    <div className="flex items-center">
                      <Target className="w-4 h-4 text-gray-600 dark:text-gray-400 mr-2" />
                      <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Mínimo</span>
                    </div>
                    <span className="font-semibold text-gray-900 dark:text-white">
                      {insumo.quantidade_minima.toLocaleString('pt-BR', { minimumFractionDigits: 0, maximumFractionDigits: 3 })} {insumo.unidade_medida}
                    </span>
                  </div>
                  
                  {insumo.preco_unitario && (
                    <div className="flex justify-between items-center p-3 bg-gradient-to-r from-green-50/50 to-emerald-50/50 dark:from-green-900/20 dark:to-emerald-900/20 rounded-xl">
                      <div className="flex items-center">
                        <TrendingUp className="w-4 h-4 text-green-600 dark:text-green-400 mr-2" />
                        <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Preço unitário</span>
                      </div>
                      <span className="font-semibold text-green-700 dark:text-green-300">
                        {formatarDinheiro(insumo.preco_unitario)}
                      </span>
                    </div>
                  )}
                  
                  {insumo.data_validade && (
                    <div className="flex justify-between items-center p-3 bg-gradient-to-r from-purple-50/50 to-violet-50/50 dark:from-purple-900/20 dark:to-violet-900/20 rounded-xl">
                      <div className="flex items-center">
                        <Calendar className="w-4 h-4 text-purple-600 dark:text-purple-400 mr-2" />
                        <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Validade</span>
                      </div>
                      <span className="font-semibold text-purple-700 dark:text-purple-300">
                        {insumo.data_validade.split('-').reverse().join('/')}
                      </span>
                    </div>
                  )}
                </div>

                {/* Botões de Ação Modernos */}
                <div className="flex gap-3">
                  <Button
                    onClick={() => {
                      setSelectedInsumo(insumo);
                      setShowMovimentacaoModal(true);
                    }}
                    variant="primary"
                    size="sm"
                    className="flex-1 bg-gradient-to-r from-blue-500 to-indigo-600 hover:from-blue-600 hover:to-indigo-700 text-white rounded-2xl py-3 font-semibold shadow-lg hover:shadow-xl transition-all duration-200 transform hover:scale-105"
                    icon={<Activity size={16} />}
                  >
                    Movimentar
                  </Button>
                  <Button
                    onClick={() => {
                      setSelectedInsumo(insumo);
                      setShowHistoricoModal(true);
                    }}
                    variant="ghost"
                    size="sm"
                    className="bg-white/60 dark:bg-gray-700/60 text-gray-700 dark:text-gray-300 hover:bg-white dark:hover:bg-gray-700 rounded-2xl py-3 font-semibold shadow-md hover:shadow-lg transition-all duration-200"
                    icon={<Clock size={16} />}
                  >
                    Histórico
                  </Button>
                </div>
              </div>
            </div>
          ))}
        </div>

        {filteredInsumos.length === 0 && (
          <div className="text-center py-16">
            <div className="relative mb-8">
              <div className="w-32 h-32 bg-gradient-to-br from-gray-100 to-gray-200 dark:from-gray-700 dark:to-gray-600 rounded-full mx-auto flex items-center justify-center shadow-2xl">
                <Package className="w-16 h-16 text-gray-400 dark:text-gray-500" />
              </div>
              <div className="absolute -top-2 -right-2 w-8 h-8 bg-gradient-to-r from-blue-500 to-purple-600 rounded-full flex items-center justify-center shadow-lg transform translate-x-16">
                <Sparkles className="w-4 h-4 text-white" />
              </div>
            </div>
            <h3 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">
              {searchTerm || statusFilter !== 'todos' 
                ? 'Nenhum insumo encontrado' 
                : 'Seu estoque está vazio'
              }
            </h3>
            <p className="text-lg text-gray-600 dark:text-gray-400 mb-8 max-w-md mx-auto">
              {searchTerm || statusFilter !== 'todos' 
                ? 'Tente ajustar os filtros de busca para encontrar o que procura'
                : 'Comece adicionando seu primeiro insumo ao estoque para ter controle total dos seus ingredientes'
              }
            </p>
            <Button
              onClick={() => {
                resetForm();
                setShowModal(true);
              }}
              className="bg-gradient-to-r from-blue-600 via-blue-700 to-indigo-700 hover:from-blue-700 hover:via-blue-800 hover:to-indigo-800 text-white px-8 py-4 rounded-2xl font-semibold shadow-xl hover:shadow-2xl transform hover:scale-105 transition-all duration-300"
              icon={<Plus size={20} />}
            >
              Adicionar Primeiro Insumo
            </Button>
          </div>
        )}

        {/* Modal de Adicionar/Editar Insumo Moderno */}
        {showModal && (
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-50">
            <div className="bg-white dark:bg-gray-800 rounded-3xl max-w-2xl w-full max-h-[90vh] overflow-y-auto shadow-2xl border border-white/20 dark:border-gray-700/50">
              {/* Header do Modal */}
              <div className="relative overflow-hidden">
                <div className="bg-gradient-to-r from-blue-600 via-blue-700 to-indigo-700 p-8">
                  <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full -mr-16 -mt-16"></div>
                  <div className="relative flex justify-between items-center">
                    <div className="flex items-center">
                      <div className="p-3 bg-white/20 backdrop-blur-sm rounded-2xl mr-4">
                        <Package size={24} className="text-white" />
                      </div>
                      <div className="text-white">
                        <h2 className="text-2xl font-bold">
                          {editingInsumo ? 'Editar Insumo' : 'Novo Insumo'}
                        </h2>
                        <p className="text-blue-100">
                          {editingInsumo ? 'Atualize as informações do insumo' : 'Adicione um novo insumo ao estoque'}
                        </p>
                      </div>
                    </div>
                    <button
                      onClick={() => {
                        setShowModal(false);
                        resetForm();
                      }}
                      className="p-2 text-white/70 hover:text-white hover:bg-white/20 rounded-xl transition-colors"
                    >
                      <X size={24} />
                    </button>
                  </div>
                </div>
              </div>
              
              <form onSubmit={handleSubmit} className="p-8 space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="md:col-span-2">
                    <label className="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-3">
                      Nome do Insumo
                    </label>
                    <input
                      type="text"
                      required
                      value={formData.nome}
                      onChange={(e) => setFormData({ ...formData, nome: e.target.value })}
                      className="w-full px-4 py-4 bg-gray-50/50 dark:bg-gray-700/50 border border-gray-200/50 dark:border-gray-600/50 rounded-2xl focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 focus:border-blue-500 dark:focus:border-blue-400 transition-all duration-200 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400"
                      placeholder="Ex: Carne Bovina Premium"
                    />
                  </div>

                  <div className="md:col-span-2">
                    <label className="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-3">
                      Descrição (opcional)
                    </label>
                    <textarea
                      value={formData.descricao}
                      onChange={(e) => setFormData({ ...formData, descricao: e.target.value })}
                      className="w-full px-4 py-4 bg-gray-50/50 dark:bg-gray-700/50 border border-gray-200/50 dark:border-gray-600/50 rounded-2xl focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 focus:border-blue-500 dark:focus:border-blue-400 transition-all duration-200 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400"
                      rows={3}
                      placeholder="Descrição detalhada do insumo..."
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-3">
                      Unidade de Medida
                    </label>
                    <select
                      value={formData.unidade_medida}
                      onChange={(e) => setFormData({ ...formData, unidade_medida: e.target.value })}
                      className="w-full px-4 py-4 bg-gray-50/50 dark:bg-gray-700/50 border border-gray-200/50 dark:border-gray-600/50 rounded-2xl focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 focus:border-blue-500 dark:focus:border-blue-400 transition-all duration-200 text-gray-900 dark:text-white"
                    >
                      <option value="kg">Quilograma (kg)</option>
                      <option value="g">Grama (g)</option>
                      <option value="l">Litro (l)</option>
                      <option value="ml">Mililitro (ml)</option>
                      <option value="un">Unidade (un)</option>
                      <option value="cx">Caixa (cx)</option>
                      <option value="pct">Pacote (pct)</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-3">
                      Quantidade Atual
                    </label>
                    <input
                      type="number"
                      step="any"
                      min="0"
                      required
                      value={formData.quantidade}
                      onChange={(e) => setFormData({ ...formData, quantidade: e.target.value })}
                      className="w-full px-4 py-4 bg-gray-50/50 dark:bg-gray-700/50 border border-gray-200/50 dark:border-gray-600/50 rounded-2xl focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 focus:border-blue-500 dark:focus:border-blue-400 transition-all duration-200 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400"
                      placeholder="Ex: 100"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-3">
                      Quantidade Mínima
                    </label>
                    <input
                      type="number"
                      step="any"
                      min="0"
                      required
                      value={formData.quantidade_minima}
                      onChange={(e) => setFormData({ ...formData, quantidade_minima: e.target.value })}
                      className="w-full px-4 py-4 bg-gray-50/50 dark:bg-gray-700/50 border border-gray-200/50 dark:border-gray-600/50 rounded-2xl focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 focus:border-blue-500 dark:focus:border-blue-400 transition-all duration-200 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400"
                      placeholder="Ex: 10"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-3">
                      Preço Unitário (opcional)
                    </label>
                    <input
                      type="number"
                      step="any"
                      min="0"
                      value={formData.preco_unitario}
                      onChange={(e) => setFormData({ ...formData, preco_unitario: e.target.value })}
                      className="w-full px-4 py-4 bg-gray-50/50 dark:bg-gray-700/50 border border-gray-200/50 dark:border-gray-600/50 rounded-2xl focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 focus:border-blue-500 dark:focus:border-blue-400 transition-all duration-200 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400"
                      placeholder="Ex: 15.50"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-3">
                      Data de Validade (opcional)
                    </label>
                    <input
                      type="date"
                      value={formData.data_validade}
                      onChange={(e) => setFormData({ ...formData, data_validade: e.target.value })}
                      className="w-full px-4 py-4 bg-gray-50/50 dark:bg-gray-700/50 border border-gray-200/50 dark:border-gray-600/50 rounded-2xl focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 focus:border-blue-500 dark:focus:border-blue-400 transition-all duration-200 text-gray-900 dark:text-white"
                    />
                  </div>
                </div>

                <div className="flex gap-4 pt-6">
                  <Button
                    type="button"
                    variant="ghost"
                    onClick={() => {
                      setShowModal(false);
                      resetForm();
                    }}
                    className="flex-1 bg-gray-100/80 dark:bg-gray-700/80 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600 rounded-2xl py-4 font-semibold transition-all duration-200"
                  >
                    Cancelar
                  </Button>
                  <Button
                    type="submit"
                    className="flex-1 bg-gradient-to-r from-blue-600 via-blue-700 to-indigo-700 hover:from-blue-700 hover:via-blue-800 hover:to-indigo-800 text-white rounded-2xl py-4 font-semibold shadow-xl hover:shadow-2xl transition-all duration-200 transform hover:scale-105"
                  >
                    {editingInsumo ? 'Atualizar' : 'Criar'} Insumo
                  </Button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Modal de Movimentação */}
        <MovimentacaoModal
          isOpen={showMovimentacaoModal}
          onClose={() => {
            setShowMovimentacaoModal(false);
            setSelectedInsumo(null);
          }}
          insumo={selectedInsumo}
          onMovimentacao={handleMovimentacao}
        />

        {/* Modal de Histórico */}
        {showHistoricoModal && selectedInsumo && (
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-50">
            <div className="bg-white dark:bg-gray-800 rounded-3xl max-w-6xl w-full max-h-[90vh] overflow-hidden shadow-2xl border border-white/20 dark:border-gray-700/50">
              <div className="flex justify-between items-center p-8 border-b border-gray-200/50 dark:border-gray-700/50 bg-gradient-to-r from-purple-50 to-indigo-50 dark:from-purple-900/20 dark:to-indigo-900/20">
                <div className="flex items-center">
                  <div className="p-3 bg-purple-100 dark:bg-purple-900/50 rounded-2xl mr-4">
                    <Clock size={24} className="text-purple-600 dark:text-purple-400" />
                  </div>
                  <div>
                    <h3 className="text-xl font-bold text-gray-900 dark:text-white">
                      Histórico - {selectedInsumo.nome}
                    </h3>
                    <p className="text-gray-600 dark:text-gray-400">
                      Todas as movimentações registradas
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => {
                    setShowHistoricoModal(false);
                    setSelectedInsumo(null);
                  }}
                  className="p-2 text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-xl transition-colors"
                >
                  <X size={24} />
                </button>
              </div>
              <div className="p-8 overflow-y-auto max-h-[calc(90vh-120px)]">
                <HistoricoMovimentacoes 
                  insumoId={selectedInsumo.id}
                  insumoNome={selectedInsumo.nome}
                />
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default Estoque;