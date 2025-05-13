import React, { useState, useEffect } from 'react';
import { 
  Search, AlertTriangle, Plus, Download, FileSpreadsheet, 
  Package2, Calendar, ArrowUpCircle, ArrowDownCircle, Edit2,
  Trash2, X, Filter, RefreshCcw
} from 'lucide-react';
import Button from '../components/ui/Button';
import { useRestaurante } from '../contexts/RestauranteContext';
import { formatarDinheiro } from '../utils/formatters';
import { supabase } from '../services/supabase';
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

interface MovimentacaoEstoque {
  id: string;
  insumo_id: string;
  tipo: 'entrada' | 'saida';
  quantidade: number;
  motivo: string;
  observacao?: string;
}

const Estoque: React.FC = () => {
  const [insumos, setInsumos] = useState<Insumo[]>([]);
  const [loading, setLoading] = useState(false);
  const [busca, setBusca] = useState('');
  const [filtroStatus, setFiltroStatus] = useState<'todos' | 'ativos' | 'vencidos' | 'proximos'>('todos');
  const [visualizacao, setVisualizacao] = useState<'cards' | 'tabela'>('cards');
  const [showNovoInsumoModal, setShowNovoInsumoModal] = useState(false);
  const [showMovimentacaoModal, setShowMovimentacaoModal] = useState(false);
  const [insumoSelecionado, setInsumoSelecionado] = useState<Insumo | null>(null);
  const [formData, setFormData] = useState({
    nome: '',
    descricao: '',
    unidade_medida: 'un',
    quantidade: 0,
    quantidade_minima: 0,
    data_validade: '',
    preco_unitario: 0
  });
  const [movimentacao, setMovimentacao] = useState({
    tipo: 'entrada' as 'entrada' | 'saida',
    quantidade: 0,
    motivo: '',
    observacao: ''
  });

  useEffect(() => {
    carregarInsumos();
  }, []);

  const carregarInsumos = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('insumos')
        .select('*')
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
    setLoading(true);

    try {
      if (!formData.nome || !formData.unidade_medida) {
        throw new Error('Preencha os campos obrigatórios');
      }

      const { data: restaurante } = await supabase
        .from('restaurantes')
        .select('id')
        .single();

      if (!restaurante) {
        throw new Error('Restaurante não encontrado');
      }

      const { error } = await supabase
        .from('insumos')
        .insert({
          ...formData,
          restaurante_id: restaurante.id
        });

      if (error) throw error;

      toast.success('Insumo cadastrado com sucesso!');
      setShowNovoInsumoModal(false);
      carregarInsumos();
      resetForm();
    } catch (error) {
      console.error('Erro ao salvar insumo:', error);
      toast.error(error instanceof Error ? error.message : 'Erro ao salvar insumo');
    } finally {
      setLoading(false);
    }
  };

  const handleMovimentacao = async () => {
    if (!insumoSelecionado) return;
    setLoading(true);

    try {
      if (movimentacao.tipo === 'saida' && insumoSelecionado.quantidade < movimentacao.quantidade) {
        throw new Error('Quantidade insuficiente em estoque');
      }

      const { error } = await supabase
        .from('movimentacoes_estoque')
        .insert({
          insumo_id: insumoSelecionado.id,
          ...movimentacao,
          created_by: (await supabase.auth.getUser()).data.user?.id
        });

      if (error) throw error;

      toast.success(`${movimentacao.tipo === 'entrada' ? 'Entrada' : 'Saída'} registrada com sucesso!`);
      setShowMovimentacaoModal(false);
      setInsumoSelecionado(null);
      carregarInsumos();
      resetMovimentacao();
    } catch (error) {
      console.error('Erro ao registrar movimentação:', error);
      toast.error(error instanceof Error ? error.message : 'Erro ao registrar movimentação');
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setFormData({
      nome: '',
      descricao: '',
      unidade_medida: 'un',
      quantidade: 0,
      quantidade_minima: 0,
      data_validade: '',
      preco_unitario: 0
    });
  };

  const resetMovimentacao = () => {
    setMovimentacao({
      tipo: 'entrada',
      quantidade: 0,
      motivo: '',
      observacao: ''
    });
  };

  const isVencido = (data_validade?: string) => {
    if (!data_validade) return false;
    return new Date(data_validade) < new Date();
  };

  const isProximoVencer = (data_validade?: string) => {
    if (!data_validade) return false;
    const hoje = new Date();
    const validade = new Date(data_validade);
    const diasRestantes = Math.ceil((validade.getTime() - hoje.getTime()) / (1000 * 60 * 60 * 24));
    return diasRestantes <= 7 && diasRestantes > 0;
  };

  const getStatusColor = (insumo: Insumo) => {
    if (isVencido(insumo.data_validade)) return 'border-red-500 bg-red-50';
    if (isProximoVencer(insumo.data_validade)) return 'border-yellow-500 bg-yellow-50';
    if (insumo.quantidade <= insumo.quantidade_minima) return 'border-orange-500 bg-orange-50';
    return 'border-green-500 bg-green-50';
  };

  const insumosFiltrados = insumos.filter(insumo => {
    const matchBusca = insumo.nome.toLowerCase().includes(busca.toLowerCase()) ||
                      insumo.descricao?.toLowerCase().includes(busca.toLowerCase());
    
    const matchStatus = filtroStatus === 'todos' ||
      (filtroStatus === 'ativos' && insumo.ativo) ||
      (filtroStatus === 'vencidos' && isVencido(insumo.data_validade)) ||
      (filtroStatus === 'proximos' && isProximoVencer(insumo.data_validade));

    return matchBusca && matchStatus;
  });

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Controle de Estoque</h1>
          <p className="text-gray-500 mt-1">
            Gerenciamento de insumos e matéria-prima
          </p>
        </div>
        <div className="mt-4 md:mt-0 flex flex-wrap gap-2">
          <Button 
            variant="ghost"
            icon={<FileSpreadsheet size={18} />}
            onClick={() => toast.success('Relatório exportado em Excel!')}
          >
            Excel
          </Button>
          <Button 
            variant="ghost"
            icon={<Download size={18} />}
            onClick={() => toast.success('Relatório exportado em PDF!')}
          >
            PDF
          </Button>
          <Button 
            variant="primary"
            icon={<Plus size={18} />}
            onClick={() => {
              resetForm();
              setShowNovoInsumoModal(true);
            }}
          >
            Novo Insumo
          </Button>
        </div>
      </div>

      {/* Alertas */}
      {insumos.some(i => isVencido(i.data_validade) || isProximoVencer(i.data_validade)) && (
        <div className="bg-yellow-50 border-l-4 border-yellow-500 p-4">
          <div className="flex">
            <AlertTriangle className="h-5 w-5 text-yellow-400" />
            <div className="ml-3">
              <h3 className="text-sm font-medium text-yellow-800">
                Atenção aos Vencimentos
              </h3>
              <div className="mt-2 text-sm text-yellow-700">
                <p>
                  Existem produtos vencidos ou próximos do vencimento.
                  Por favor, verifique a lista abaixo.
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Filtros */}
      <div className="bg-white rounded-lg shadow-sm p-4">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
            <input
              type="text"
              placeholder="Buscar insumos..."
              value={busca}
              onChange={(e) => setBusca(e.target.value)}
              className="pl-10 w-full rounded-lg border border-gray-300 py-2 px-4 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>

          <div>
            <select
              value={filtroStatus}
              onChange={(e) => setFiltroStatus(e.target.value as typeof filtroStatus)}
              className="w-full border border-gray-300 rounded-md py-2 pl-3 pr-10 focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="todos">Todos os status</option>
              <option value="ativos">Ativos</option>
              <option value="vencidos">Vencidos</option>
              <option value="proximos">Próximos do vencimento</option>
            </select>
          </div>

          <div className="md:col-span-2">
            <div className="flex rounded-md shadow-sm">
              <button
                onClick={() => setVisualizacao('cards')}
                className={`flex-1 px-4 py-2 text-sm font-medium rounded-l-md ${
                  visualizacao === 'cards'
                    ? 'bg-blue-50 text-blue-600 border-blue-500'
                    : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'
                } border`}
              >
                Cards
              </button>
              <button
                onClick={() => setVisualizacao('tabela')}
                className={`flex-1 px-4 py-2 text-sm font-medium rounded-r-md ${
                  visualizacao === 'tabela'
                    ? 'bg-blue-50 text-blue-600 border-blue-500'
                    : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'
                } border`}
              >
                Tabela
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Lista de Insumos */}
      {visualizacao === 'cards' ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {insumosFiltrados.map((insumo) => (
            <div
              key={insumo.id}
              className={`bg-white rounded-lg shadow-sm overflow-hidden border-l-4 ${getStatusColor(insumo)}`}
            >
              <div className="p-4">
                <div className="flex justify-between items-start">
                  <div>
                    <h3 className="font-medium text-gray-900">{insumo.nome}</h3>
                    <p className="text-sm text-gray-500">{insumo.descricao}</p>
                  </div>
                  <div className="flex items-center space-x-2">
                    <button
                      onClick={() => {
                        setInsumoSelecionado(insumo);
                        setShowMovimentacaoModal(true);
                      }}
                      className="p-1 text-gray-400 hover:text-gray-600"
                    >
                      <Package2 size={18} />
                    </button>
                    <button
                      onClick={() => {
                        setInsumoSelecionado(insumo);
                        setFormData({
                          nome: insumo.nome,
                          descricao: insumo.descricao || '',
                          unidade_medida: insumo.unidade_medida,
                          quantidade: insumo.quantidade,
                          quantidade_minima: insumo.quantidade_minima,
                          data_validade: insumo.data_validade || '',
                          preco_unitario: insumo.preco_unitario || 0
                        });
                        setShowNovoInsumoModal(true);
                      }}
                      className="p-1 text-gray-400 hover:text-gray-600"
                    >
                      <Edit2 size={18} />
                    </button>
                  </div>
                </div>

                <div className="mt-4 space-y-2">
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-gray-500">Quantidade</span>
                    <span className={`font-medium ${
                      insumo.quantidade <= insumo.quantidade_minima
                        ? 'text-red-600'
                        : 'text-gray-900'
                    }`}>
                      {insumo.quantidade} {insumo.unidade_medida}
                    </span>
                  </div>

                  <div className="flex justify-between items-center">
                    <span className="text-sm text-gray-500">Mínimo</span>
                    <span className="text-sm text-gray-900">
                      {insumo.quantidade_minima} {insumo.unidade_medida}
                    </span>
                  </div>

                  {insumo.data_validade && (
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-gray-500">Validade</span>
                      <span className={`text-sm ${
                        isVencido(insumo.data_validade)
                          ? 'text-red-600'
                          : isProximoVencer(insumo.data_validade)
                            ? 'text-yellow-600'
                            : 'text-gray-900'
                      }`}>
                        {new Date(insumo.data_validade).toLocaleDateString()}
                      </span>
                    </div>
                  )}

                  {insumo.preco_unitario && (
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-gray-500">Preço Unitário</span>
                      <span className="text-sm text-gray-900">
                        {formatarDinheiro(insumo.preco_unitario)}
                      </span>
                    </div>
                  )}
                </div>

                <div className="mt-4 flex justify-end space-x-2">
                  <Button
                    variant="ghost"
                    size="sm"
                    icon={<ArrowUpCircle size={16} />}
                    onClick={() => {
                      setInsumoSelecionado(insumo);
                      setMovimentacao({ ...movimentacao, tipo: 'entrada' });
                      setShowMovimentacaoModal(true);
                    }}
                  >
                    Entrada
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    icon={<ArrowDownCircle size={16} />}
                    onClick={() => {
                      setInsumoSelecionado(insumo);
                      setMovimentacao({ ...movimentacao, tipo: 'saida' });
                      setShowMovimentacaoModal(true);
                    }}
                  >
                    Saída
                  </Button>
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="bg-white rounded-lg shadow overflow-hidden">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Produto
                </th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Quantidade
                </th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Validade
                </th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Status
                </th>
                <th scope="col" className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Ações
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {insumosFiltrados.map((insumo) => (
                <tr key={insumo.id}>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div>
                      <div className="text-sm font-medium text-gray-900">
                        {insumo.nome}
                      </div>
                      <div className="text-sm text-gray-500">
                        {insumo.descricao}
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className={`text-sm ${
                      insumo.quantidade <= insumo.quantidade_minima
                        ? 'text-red-600 font-medium'
                        : 'text-gray-900'
                    }`}>
                      {insumo.quantidade} {insumo.unidade_medida}
                      {insumo.quantidade <= insumo.quantidade_minima && (
                        <span className="ml-2 text-xs bg-red-100 text-red-800 px-2 py-0.5 rounded-full">
                          Abaixo do mínimo
                        </span>
                      )}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    {insumo.data_validade && (
                      <div className={`text-sm ${
                        isVencido(insumo.data_validade)
                          ? 'text-red-600'
                          : isProximoVencer(insumo.data_validade)
                            ? 'text-yellow-600'
                            : 'text-gray-900'
                      }`}>
                        {new Date(insumo.data_validade).toLocaleDateString()}
                      </div>
                    )}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                      isVencido(insumo.data_validade)
                        ? 'bg-red-100 text-red-800'
                        : isProximoVencer(insumo.data_validade)
                          ? 'bg-yellow-100 text-yellow-800'
                          : 'bg-green-100 text-green-800'
                    }`}>
                      {isVencido(insumo.data_validade)
                        ? 'Vencido'
                        : isProximoVencer(insumo.data_validade)
                          ? 'Próximo ao vencimento'
                          : 'OK'}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                    <Button
                      variant="ghost"
                      size="sm"
                      icon={<ArrowUpCircle size={16} />}
                      onClick={() => {
                        setInsumoSelecionado(insumo);
                        setMovimentacao({ ...movimentacao, tipo: 'entrada' });
                        setShowMovimentacaoModal(true);
                      }}
                      className="mr-2"
                    >
                      Entrada
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      icon={<ArrowDownCircle size={16} />}
                      onClick={() => {
                        setInsumoSelecionado(insumo);
                        setMovimentacao({ ...movimentacao, tipo: 'saida' });
                        setShowMovimentacaoModal(true);
                      }}
                      className="mr-2"
                    >
                      Saída
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      icon={<Edit2 size={16} />}
                      onClick={() => {
                        setInsumoSelecionado(insumo);
                        setFormData({
                          nome: insumo.nome,
                          descricao: insumo.descricao || '',
                          unidade_medida: insumo.unidade_medida,
                          quantidade: insumo.quantidade,
                          quantidade_minima: insumo.quantidade_minima,
                          data_validade: insumo.data_validade || '',
                          preco_unitario: insumo.preco_unitario || 0
                        });
                        setShowNovoInsumoModal(true);
                      }}
                    >
                      Editar
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Modal de Novo/Editar Insumo */}
      {showNovoInsumoModal && (
        <div className="fixed inset-0 z-50 overflow-y-auto">
          <div className="flex items-center justify-center min-h-screen px-4 pt-4 pb-20 text-center sm:block sm:p-0">
            <div className="fixed inset-0 transition-opacity" aria-hidden="true">
              <div className="absolute inset-0 bg-gray-500 opacity-75"></div>
            </div>

            <div className="inline-block align-bottom bg-white rounded-lg text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-lg sm:w-full">
              <form onSubmit={handleSubmit}>
                <div className="px-4 pt-5 pb-4 sm:p-6 sm:pb-4">
                  <h3 className="text-lg font-medium text-gray-900 mb-4">
                    {insumoSelecionado ? 'Editar Insumo' : 'Novo Insumo'}
                  </h3>

                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700">
                        Nome do Insumo
                      </label>
                      <input
                        type="text"
                        value={formData.nome}
                        onChange={(e) => setFormData({ ...formData, nome: e.target.value })}
                        className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:ring-blue-500 focus:border-blue-500"
                        required
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700">
                        Descrição
                      </label>
                      <textarea
                        value={formData.descricao}
                        onChange={(e) => setFormData({ ...formData, descricao: e.target.value })}
                        rows={3}
                        className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:ring-blue-500 focus:border-blue-500"
                      />
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700">
                          Unidade de Medida
                        </label>
                        <select
                          value={formData.unidade_medida}
                          onChange={(e) => setFormData({ ...formData, unidade_medida: e.target.value })}
                          className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:ring-blue-500 focus:border-blue-500"
                        >
                          <option value="un">Unidade</option>
                          <option value="kg">Quilograma</option>
                          <option value="g">Grama</option>
                          <option value="l">Litro</option>
                          <option value="ml">Mililitro</option>
                        </select>
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700">
                          Quantidade Mínima
                        </label>
                        <input
                          type="number"
                          step="0.01"
                          min="0"
                          value={formData.quantidade_minima}
                          onChange={(e) => setFormData({ ...formData, quantidade_minima: parseFloat(e.target.value) })}
                          className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:ring-blue-500 focus:border-blue-500"
                          required
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700">
                        Data de Validade
                      </label>
                      <input
                        type="date"
                        value={formData.data_validade}
                        onChange={(e) => setFormData({ ...formData, data_validade: e.target.value })}
                        className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:ring-blue-500 focus:border-blue-500"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700">
                        Preço Unitário
                      </label>
                      <div className="mt-1 relative rounded-md shadow-sm">
                        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                          <span className="text-gray-500 sm:text-sm">R$</span>
                        </div>
                        <input
                          type="number"
                          step="0.01"
                          min="0"
                          value={formData.preco_unitario}
                          onChange={(e) => setFormData({ ...formData, preco_unitario: parseFloat(e.target.value) })}
                          className="pl-8 block w-full rounded-md border-gray-300 shadow-sm focus:ring-blue-500 focus:border-blue-500"
                        />
                      </div>
                    </div>
                  </div>
                </div>

                <div className="bg-gray-50 px-4 py-3 sm:px-6 sm:flex sm:flex-row-reverse">
                  <Button
                    type="submit"
                    variant="primary"
                    isLoading={loading}
                    className="w-full sm:w-auto sm:ml-3"
                  >
                    {insumoSelecionado ? 'Atualizar' : 'Cadastrar'}
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    onClick={() => {
                      setShowNovoInsumoModal(false);
                      setInsumoSelecionado(null);
                      resetForm();
                    }}
                    className="w-full sm:w-auto mt-3 sm:mt-0"
                  >
                    Cancelar
                  </Button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* Modal de Movimentação */}
      {showMovimentacaoModal && insumoSelecionado && (
        <div className="fixed inset-0 z-50 overflow-y-auto">
          <div className="flex items-center justify-center min-h-screen px-4 pt-4 pb-20 text-center sm:block sm:p-0">
            <div className="fixed inset-0 transition-opacity" aria-hidden="true">
              <div className="absolute inset-0 bg-gray-500 opacity-75"></div>
            </div>

            <div className="inline-block align-bottom bg-white rounded-lg text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-lg sm:w-full">
              <div className="px-4 pt-5 pb-4 sm:p-6 sm:pb-4">
                <h3 className="text-lg font-medium text-gray-900 mb-4">
                  {movimentacao.tipo === 'entrada' ? 'Entrada' : 'Saída'} de Estoque
                </h3>

                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700">
                      Produto
                    </label>
                    <input
                      type="text"
                      value={insumoSelecionado.nome}
                      disabled
                      className="mt-1 block w-full rounded-md border-gray-300 bg-gray-50"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700">
                      Quantidade ({insumoSelecionado.unidade_medida})
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      value={movimentacao.quantidade}
                      onChange={(e) => setMovimentacao({ ...movimentacao, quantidade: parseFloat(e.target.value) })}
                      className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:ring-blue-500 focus:border-blue-500"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700">
                      Motivo
                    </label>
                    <select
                      value={movimentacao.motivo}
                      onChange={(e) => setMovimentacao({ ...movimentacao, motivo: e.target.value })}
                      className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:ring-blue-500 focus:border-blue-500"
                      required
                    >
                      <option value="">Selecione um motivo</option>
                      {movimentacao.tipo === 'entrada' ? (
                        <>
                          <option value="compra">Compra</option>
                          <option value="devolucao">Devolução</option>
                          <option value="ajuste">Ajuste de Inventário</option>
                        </>
                      ) : (
                        <>
                          <option value="producao">Produção</option>
                          <option value="perda">Perda/Quebra</option>
                          <option value="vencimento">Vencimento</option>
                          <option value="ajuste">Ajuste de Inventário</option>
                        </>
                      )}
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700">
                      Observação
                    </label>
                    <textarea
                      value={movimentacao.observacao}
                      onChange={(e) => setMovimentacao({ ...movimentacao, observacao: e.target.value })}
                      rows={3}
                      className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:ring-blue-500 focus:border-blue-500"
                    />
                  </div>
                </div>
              </div>

              <div className="bg-gray-50 px-4 py-3 sm:px-6 sm:flex sm:flex-row-reverse">
                <Button
                  variant="primary"
                  onClick={handleMovimentacao}
                  isLoading={loading}
                  className="w-full sm:w-auto sm:ml-3"
                >
                  Confirmar
                </Button>
                <Button
                  variant="ghost"
                  onClick={() => {
                    setShowMovimentacaoModal(false);
                    setInsumoSelecionado(null);
                    resetMovimentacao();
                  }}
                  className="w-full sm:w-auto mt-3 sm:mt-0"
                >
                  Cancelar
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Estoque;