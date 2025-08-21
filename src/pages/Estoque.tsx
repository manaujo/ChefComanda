import React, { useState, useEffect } from 'react';
import { 
  Package, Plus, Search, Filter, AlertTriangle, TrendingUp, 
  Edit, Trash2, ArrowUp, ArrowDown, Calendar, Download,
  FileSpreadsheet, RefreshCw, Eye, Clock, User, Zap,
  CheckCircle, XCircle, Activity, BarChart3, X
} from 'lucide-react';
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

      const insumoData = {
        restaurante_id: restaurante.id,
        nome: formData.nome,
        descricao: formData.descricao || null,
        unidade_medida: formData.unidade_medida,
        quantidade: parseFloat(formData.quantidade) || 0,
        quantidade_minima: parseFloat(formData.quantidade_minima) || 0,
        data_validade: formData.data_validade || null,
        preco_unitario: formData.preco_unitario ? parseFloat(formData.preco_unitario) : null,
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
      return 'border-red-500 bg-red-50';
    } else if (insumo.quantidade <= insumo.quantidade_minima) {
      return 'border-yellow-500 bg-yellow-50';
    }
    return 'border-green-500 bg-green-50';
  };

  const getStatusIcon = (insumo: Insumo) => {
    if (insumo.quantidade === 0) {
      return <XCircle className="w-5 h-5 text-red-500" />;
    } else if (insumo.quantidade <= insumo.quantidade_minima) {
      return <AlertTriangle className="w-5 h-5 text-yellow-500" />;
    }
    return <CheckCircle className="w-5 h-5 text-green-500" />;
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
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-3">
            <Package className="w-8 h-8 text-blue-600" />
            Controle de Estoque
          </h1>
          <p className="text-gray-600 mt-2">Gerencie insumos e matérias-primas</p>
        </div>
        <div className="flex space-x-3">
          <Button
            variant="ghost"
            icon={<RefreshCw size={18} />}
            onClick={loadInsumos}
            isLoading={loading}
          >
            Atualizar
          </Button>
          <Button
            onClick={() => {
              resetForm();
              setShowModal(true);
            }}
            className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-lg flex items-center gap-2 transition-colors"
          >
            <Plus className="w-5 h-5" />
            Novo Insumo
          </Button>
        </div>
      </div>

      {/* Alertas de Estoque */}
      {(insumosComEstoqueCritico.length > 0 || insumosComEstoqueBaixo.length > 0) && (
        <div className="mb-6 space-y-4">
          {insumosComEstoqueCritico.length > 0 && (
            <div className="bg-red-50 border-l-4 border-red-500 p-4 rounded-lg">
              <div className="flex items-center">
                <XCircle className="h-5 w-5 text-red-500 mr-2" />
                <div>
                  <h3 className="text-sm font-medium text-red-800">
                    Estoque Crítico - {insumosComEstoqueCritico.length} {insumosComEstoqueCritico.length === 1 ? 'item' : 'itens'}
                  </h3>
                  <div className="mt-1 text-sm text-red-700">
                    {insumosComEstoqueCritico.slice(0, 3).map(insumo => insumo.nome).join(', ')}
                    {insumosComEstoqueCritico.length > 3 && ` e mais ${insumosComEstoqueCritico.length - 3}`}
                  </div>
                </div>
              </div>
            </div>
          )}

          {insumosComEstoqueBaixo.length > 0 && (
            <div className="bg-yellow-50 border-l-4 border-yellow-500 p-4 rounded-lg">
              <div className="flex items-center">
                <AlertTriangle className="h-5 w-5 text-yellow-500 mr-2" />
                <div>
                  <h3 className="text-sm font-medium text-yellow-800">
                    Estoque Baixo - {insumosComEstoqueBaixo.length} {insumosComEstoqueBaixo.length === 1 ? 'item' : 'itens'}
                  </h3>
                  <div className="mt-1 text-sm text-yellow-700">
                    {insumosComEstoqueBaixo.slice(0, 3).map(insumo => insumo.nome).join(', ')}
                    {insumosComEstoqueBaixo.length > 3 && ` e mais ${insumosComEstoqueBaixo.length - 3}`}
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Filtros */}
      <div className="bg-white rounded-lg shadow-sm border p-6 mb-6">
        <div className="flex flex-col md:flex-row gap-4">
          <div className="flex-1">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
              <input
                type="text"
                placeholder="Buscar insumos..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
          </div>
          <div className="flex space-x-2">
            <Button
              variant={statusFilter === 'todos' ? 'primary' : 'ghost'}
              size="sm"
              onClick={() => setStatusFilter('todos')}
            >
              Todos ({insumos.filter(i => i.ativo).length})
            </Button>
            <Button
              variant={statusFilter === 'critico' ? 'danger' : 'ghost'}
              size="sm"
              onClick={() => setStatusFilter('critico')}
            >
              Crítico ({insumosComEstoqueCritico.length})
            </Button>
            <Button
              variant={statusFilter === 'baixo' ? 'warning' : 'ghost'}
              size="sm"
              onClick={() => setStatusFilter('baixo')}
            >
              Baixo ({insumosComEstoqueBaixo.length})
            </Button>
            <Button
              variant={statusFilter === 'ok' ? 'success' : 'ghost'}
              size="sm"
              onClick={() => setStatusFilter('ok')}
            >
              OK ({insumos.filter(i => i.quantidade > i.quantidade_minima && i.ativo).length})
            </Button>
          </div>
        </div>
      </div>

      {/* Lista de Insumos */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-6">
        {filteredInsumos.map((insumo) => (
          <div key={insumo.id} className={`bg-white rounded-lg shadow-sm border-l-4 overflow-hidden hover:shadow-md transition-shadow ${getStatusColor(insumo)}`}>
            <div className="p-6">
              <div className="flex justify-between items-start mb-3">
                <div className="flex items-center">
                  {getStatusIcon(insumo)}
                  <h3 className="text-lg font-semibold text-gray-900 ml-2">{insumo.nome}</h3>
                </div>
                <div className="flex space-x-1">
                  <button
                    onClick={() => handleEdit(insumo)}
                    className="text-blue-600 hover:text-blue-800 p-1"
                  >
                    <Edit className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => handleDelete(insumo.id)}
                    className="text-red-600 hover:text-red-800 p-1"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
              
              {insumo.descricao && (
                <p className="text-gray-600 text-sm mb-3">{insumo.descricao}</p>
              )}
              
              <div className="space-y-2 mb-4">
                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-500">Quantidade atual:</span>
                  <span className="font-semibold">{insumo.quantidade.toFixed(3)} {insumo.unidade_medida}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-500">Mínimo:</span>
                  <span className="text-sm">{insumo.quantidade_minima.toFixed(3)} {insumo.unidade_medida}</span>
                </div>
                {insumo.preco_unitario && (
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-gray-500">Preço unitário:</span>
                    <span className="text-sm">{formatarDinheiro(insumo.preco_unitario)}</span>
                  </div>
                )}
                {insumo.data_validade && (
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-gray-500">Validade:</span>
                    <span className="text-sm">{new Date(insumo.data_validade).toLocaleDateString('pt-BR')}</span>
                  </div>
                )}
              </div>

              <div className="flex gap-2">
                <Button
                  onClick={() => {
                    setSelectedInsumo(insumo);
                    setShowMovimentacaoModal(true);
                  }}
                  variant="primary"
                  size="sm"
                  className="flex-1 flex items-center justify-center gap-2"
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
                  className="flex items-center justify-center gap-2"
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
        <div className="text-center py-12">
          <Package className="w-16 h-16 text-gray-300 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">Nenhum insumo encontrado</h3>
          <p className="text-gray-500">
            {searchTerm || statusFilter !== 'todos' 
              ? 'Tente ajustar os filtros de busca'
              : 'Comece adicionando seu primeiro insumo ao estoque'
            }
          </p>
        </div>
      )}

      {/* Modal de Adicionar/Editar Insumo */}
      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg max-w-md w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <h2 className="text-xl font-semibold text-gray-900 mb-6">
                {editingInsumo ? 'Editar Insumo' : 'Novo Insumo'}
              </h2>
              
              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Nome do Insumo
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.nome}
                    onChange={(e) => setFormData({ ...formData, nome: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="Ex: Carne Bovina"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Descrição (opcional)
                  </label>
                  <textarea
                    value={formData.descricao}
                    onChange={(e) => setFormData({ ...formData, descricao: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    rows={3}
                    placeholder="Descrição do insumo..."
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Unidade de Medida
                    </label>
                    <select
                      value={formData.unidade_medida}
                      onChange={(e) => setFormData({ ...formData, unidade_medida: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
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
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Quantidade Atual
                    </label>
                    <input
                      type="number"
                      step="0.001"
                      min="0"
                      required
                      value={formData.quantidade}
                      onChange={(e) => setFormData({ ...formData, quantidade: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      placeholder="0.000"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Quantidade Mínima
                    </label>
                    <input
                      type="number"
                      step="0.001"
                      min="0"
                      required
                      value={formData.quantidade_minima}
                      onChange={(e) => setFormData({ ...formData, quantidade_minima: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      placeholder="0.000"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Preço Unitário (opcional)
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      value={formData.preco_unitario}
                      onChange={(e) => setFormData({ ...formData, preco_unitario: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      placeholder="0.00"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Data de Validade (opcional)
                  </label>
                  <input
                    type="date"
                    value={formData.data_validade}
                    onChange={(e) => setFormData({ ...formData, data_validade: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>

                <div className="flex gap-3 pt-4">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => {
                      setShowModal(false);
                      resetForm();
                    }}
                    className="flex-1"
                  >
                    Cancelar
                  </Button>
                  <Button
                    type="submit"
                    className="flex-1 bg-blue-600 hover:bg-blue-700 text-white"
                  >
                    {editingInsumo ? 'Atualizar' : 'Criar'} Insumo
                  </Button>
                </div>
              </form>
            </div>
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
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg max-w-4xl w-full max-h-[90vh] overflow-hidden">
            <div className="flex justify-between items-center p-6 border-b border-gray-200">
              <h3 className="text-lg font-medium text-gray-900">
                Histórico - {selectedInsumo.nome}
              </h3>
              <button
                onClick={() => {
                  setShowHistoricoModal(false);
                  setSelectedInsumo(null);
                }}
                className="text-gray-400 hover:text-gray-500"
              >
                <X size={24} />
              </button>
            </div>
            <div className="p-6 overflow-y-auto max-h-[calc(90vh-120px)]">
              <HistoricoMovimentacoes 
                insumoId={selectedInsumo.id}
                insumoNome={selectedInsumo.nome}
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Estoque;