import React, { useState, useEffect } from "react";
import {
  Calculator,
  PieChart,
  TrendingUp,
  AlertTriangle,
  Download,
  FileSpreadsheet,
  Plus,
  Edit,
  Trash2,
  Search,
  Filter,
  Calendar,
  DollarSign,
  Package,
  BarChart3,
  RefreshCw,
  Target,
  Zap,
  Sparkles,
  X
} from "lucide-react";
import Button from "../components/ui/Button";
import { formatarDinheiro } from "../utils/formatters";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  PieChart as RechartsPieChart,
  Pie,
  Cell
} from "recharts";
import toast from "react-hot-toast";
import { supabase } from "../services/supabase";
import { useAuth } from "../contexts/AuthContext";
import { useRestaurante } from "../contexts/RestauranteContext";

interface CMVProduto {
  id: string;
  produto_id: string;
  produto_nome: string;
  categoria: string;
  custo_unitario: number;
  quantidade_vendida: number;
  receita_total: number;
  custo_total: number;
  margem_lucro: number;
  percentual_cmv: number;
  periodo_inicio: string;
  periodo_fim: string;
}

interface Produto {
  id: string;
  nome: string;
  categoria: string;
  preco: number;
}

const CMV: React.FC = () => {
  const { user } = useAuth();
  const { restaurante, produtos } = useRestaurante();
  const [cmvProdutos, setCmvProdutos] = useState<CMVProduto[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingItem, setEditingItem] = useState<CMVProduto | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('todas');
  const [periodoInicio, setPeriodoInicio] = useState(() => {
    const date = new Date();
    date.setDate(date.getDate() - 30);
    return date.toISOString().split('T')[0];
  });
  const [periodoFim, setPeriodoFim] = useState(() => {
    return new Date().toISOString().split('T')[0];
  });
  const [formData, setFormData] = useState({
    produto_id: '',
    custo_unitario: ''
  });

  useEffect(() => {
    if (restaurante?.id) {
      loadCMVData();
    }
  }, [restaurante?.id, periodoInicio, periodoFim]);

  const loadCMVData = async () => {
    if (!restaurante?.id) return;

    setLoading(true);
    try {
      const { data, error } = await supabase.rpc('get_cmv_report', {
        p_restaurante_id: restaurante.id,
        p_periodo_inicio: periodoInicio,
        p_periodo_fim: periodoFim
      });

      if (error) throw error;
      setCmvProdutos(data || []);
    } catch (error) {
      console.error("Error loading CMV data:", error);
      toast.error("Erro ao carregar dados de CMV");
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!restaurante?.id) {
      toast.error('Restaurante não encontrado');
      return;
    }

    if (!formData.produto_id || !formData.custo_unitario) {
      toast.error('Preencha todos os campos');
      return;
    }

    const custoUnitario = parseFloat(formData.custo_unitario);
    if (isNaN(custoUnitario) || custoUnitario < 0) {
      toast.error('Custo unitário inválido');
      return;
    }

    try {
      setLoading(true);

      // Calcular CMV usando a função do banco
      const { data: cmvData, error: cmvError } = await supabase.rpc('calcular_cmv_produto', {
        p_restaurante_id: restaurante.id,
        p_produto_id: formData.produto_id,
        p_custo_unitario: custoUnitario,
        p_periodo_inicio: periodoInicio,
        p_periodo_fim: periodoFim
      });

      if (cmvError) throw cmvError;

      const cmvResult = cmvData[0];

      // Salvar ou atualizar registro de CMV
      const cmvRecord = {
        restaurante_id: restaurante.id,
        produto_id: formData.produto_id,
        custo_unitario: custoUnitario,
        periodo_inicio: periodoInicio,
        periodo_fim: periodoFim,
        quantidade_vendida: cmvResult.quantidade_vendida,
        receita_total: cmvResult.receita_total,
        custo_total: cmvResult.custo_total,
        margem_lucro: cmvResult.margem_lucro,
        percentual_cmv: cmvResult.percentual_cmv,
        ativo: true
      };

      if (editingItem) {
        const { error } = await supabase
          .from('cmv_produtos')
          .update(cmvRecord)
          .eq('id', editingItem.id);

        if (error) throw error;
        toast.success('CMV atualizado com sucesso!');
      } else {
        const { error } = await supabase
          .from('cmv_produtos')
          .upsert(cmvRecord, {
            onConflict: 'restaurante_id,produto_id,periodo_inicio,periodo_fim'
          });

        if (error) throw error;
        toast.success('CMV adicionado com sucesso!');
      }

      await loadCMVData();
      resetForm();
      setShowModal(false);
    } catch (error) {
      console.error('Error saving CMV:', error);
      toast.error('Erro ao salvar CMV');
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = (item: CMVProduto) => {
    setEditingItem(item);
    setFormData({
      produto_id: item.produto_id,
      custo_unitario: item.custo_unitario.toString()
    });
    setShowModal(true);
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Tem certeza que deseja excluir este registro de CMV?')) return;

    try {
      const { error } = await supabase
        .from('cmv_produtos')
        .delete()
        .eq('id', id);

      if (error) throw error;
      
      await loadCMVData();
      toast.success('Registro excluído com sucesso!');
    } catch (error) {
      console.error('Error deleting CMV:', error);
      toast.error('Erro ao excluir registro');
    }
  };

  const resetForm = () => {
    setFormData({
      produto_id: '',
      custo_unitario: ''
    });
    setEditingItem(null);
  };

  const exportarDados = (formato: "excel" | "pdf") => {
    toast.success(`Relatório CMV exportado em ${formato.toUpperCase()}`);
  };

  // Filtrar produtos
  const filteredCMV = cmvProdutos.filter(item => {
    const matchSearch = item.produto_nome.toLowerCase().includes(searchTerm.toLowerCase());
    const matchCategory = categoryFilter === 'todas' || item.categoria === categoryFilter;
    return matchSearch && matchCategory;
  });

  // Calcular totais
  const totalCMV = filteredCMV.reduce((acc, item) => acc + item.custo_total, 0);
  const totalReceita = filteredCMV.reduce((acc, item) => acc + item.receita_total, 0);
  const lucroBruto = totalReceita - totalCMV;
  const percentualCMVGeral = totalReceita > 0 ? (totalCMV / totalReceita) * 100 : 0;
  const margemLucroBruta = totalReceita > 0 ? (lucroBruto / totalReceita) * 100 : 0;

  // Dados para gráficos
  const chartData = filteredCMV.map(item => ({
    nome: item.produto_nome,
    custo: item.custo_total,
    receita: item.receita_total,
    margem: item.margem_lucro
  }));

  const pieData = filteredCMV.slice(0, 5).map(item => ({
    name: item.produto_nome,
    value: item.custo_total,
    percentage: totalCMV > 0 ? (item.custo_total / totalCMV) * 100 : 0
  }));

  const COLORS = ['#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6'];

  // Obter categorias únicas
  const categorias = Array.from(new Set(produtos.map(p => p.categoria)));

  // Produtos disponíveis para seleção (que ainda não têm CMV no período)
  const produtosDisponiveis = produtos.filter(produto => 
    !cmvProdutos.some(cmv => 
      cmv.produto_id === produto.id && 
      cmv.periodo_inicio === periodoInicio && 
      cmv.periodo_fim === periodoFim
    )
  );

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-blue-50/30 to-indigo-50/30 dark:from-gray-900 dark:via-gray-800 dark:to-gray-700">
      <div className="p-6 max-w-7xl mx-auto">
        {/* Header Moderno */}
        <div className="mb-8">
          <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center">
            <div className="mb-6 lg:mb-0">
              <div className="flex items-center mb-4">
                <div className="relative">
                  <div className="p-4 bg-gradient-to-br from-purple-500 via-purple-600 to-indigo-600 rounded-3xl shadow-2xl mr-6 transform rotate-3 hover:rotate-0 transition-transform duration-300">
                    <Calculator size={32} className="text-white" />
                  </div>
                  <div className="absolute -top-2 -right-2 w-6 h-6 bg-gradient-to-r from-yellow-400 to-orange-500 rounded-full flex items-center justify-center shadow-lg">
                    <Sparkles className="w-3 h-3 text-white" />
                  </div>
                </div>
                <div>
                  <h1 className="text-4xl font-bold bg-gradient-to-r from-gray-900 via-purple-800 to-indigo-900 dark:from-white dark:via-purple-200 dark:to-indigo-200 bg-clip-text text-transparent">
                    Custo da Mercadoria Vendida
                  </h1>
                  <p className="text-xl text-gray-600 dark:text-gray-400 mt-2">
                    Análise detalhada de custos e margens de lucro
                  </p>
                </div>
              </div>
            </div>
            
            <div className="flex flex-wrap gap-3">
              <Button
                variant="ghost"
                icon={<RefreshCw size={18} />}
                onClick={loadCMVData}
                isLoading={loading}
                className="bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm shadow-lg hover:shadow-xl transition-all duration-300 border border-white/20 dark:border-gray-700/50"
              >
                Atualizar
              </Button>
              <Button
                variant="ghost"
                icon={<FileSpreadsheet size={18} />}
                onClick={() => exportarDados("excel")}
                className="bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm shadow-lg hover:shadow-xl transition-all duration-300 border border-white/20 dark:border-gray-700/50"
              >
                Excel
              </Button>
              <Button
                variant="ghost"
                icon={<Download size={18} />}
                onClick={() => exportarDados("pdf")}
                className="bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm shadow-lg hover:shadow-xl transition-all duration-300 border border-white/20 dark:border-gray-700/50"
              >
                PDF
              </Button>
              <Button
                onClick={() => {
                  resetForm();
                  setShowModal(true);
                }}
                className="bg-gradient-to-r from-purple-600 via-purple-700 to-indigo-700 hover:from-purple-700 hover:via-purple-800 hover:to-indigo-800 text-white px-8 py-3 rounded-2xl flex items-center gap-3 transition-all duration-300 shadow-xl hover:shadow-2xl transform hover:scale-105 active:scale-95"
              >
                <Plus className="w-5 h-5" />
                <span className="font-semibold">Adicionar Produto</span>
              </Button>
            </div>
          </div>
        </div>

        {/* Filtros de Período */}
        <div className="bg-white/90 dark:bg-gray-800/90 backdrop-blur-sm rounded-3xl shadow-xl border border-white/20 dark:border-gray-700/50 p-6 mb-8">
          <div className="flex items-center mb-4">
            <Calendar size={20} className="text-purple-600 dark:text-purple-400 mr-3" />
            <h3 className="text-lg font-bold text-gray-900 dark:text-white">Período de Análise</h3>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Data Início
              </label>
              <input
                type="date"
                value={periodoInicio}
                onChange={(e) => setPeriodoInicio(e.target.value)}
                className="w-full px-4 py-3 bg-gray-50/50 dark:bg-gray-700/50 border border-gray-200/50 dark:border-gray-600/50 rounded-2xl focus:ring-2 focus:ring-purple-500 dark:focus:ring-purple-400 focus:border-purple-500 dark:focus:border-purple-400 transition-all duration-200 text-gray-900 dark:text-white"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Data Fim
              </label>
              <input
                type="date"
                value={periodoFim}
                onChange={(e) => setPeriodoFim(e.target.value)}
                className="w-full px-4 py-3 bg-gray-50/50 dark:bg-gray-700/50 border border-gray-200/50 dark:border-gray-600/50 rounded-2xl focus:ring-2 focus:ring-purple-500 dark:focus:ring-purple-400 focus:border-purple-500 dark:focus:border-purple-400 transition-all duration-200 text-gray-900 dark:text-white"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Buscar Produto
              </label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                <input
                  type="text"
                  placeholder="Nome do produto..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-10 pr-4 py-3 bg-gray-50/50 dark:bg-gray-700/50 border border-gray-200/50 dark:border-gray-600/50 rounded-2xl focus:ring-2 focus:ring-purple-500 dark:focus:ring-purple-400 focus:border-purple-500 dark:focus:border-purple-400 transition-all duration-200 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400"
                />
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Categoria
              </label>
              <select
                value={categoryFilter}
                onChange={(e) => setCategoryFilter(e.target.value)}
                className="w-full px-4 py-3 bg-gray-50/50 dark:bg-gray-700/50 border border-gray-200/50 dark:border-gray-600/50 rounded-2xl focus:ring-2 focus:ring-purple-500 dark:focus:ring-purple-400 focus:border-purple-500 dark:focus:border-purple-400 transition-all duration-200 text-gray-900 dark:text-white"
              >
                <option value="todas">Todas as categorias</option>
                {categorias.map(categoria => (
                  <option key={categoria} value={categoria}>{categoria}</option>
                ))}
              </select>
            </div>
          </div>
        </div>

        {loading ? (
          <div className="flex items-center justify-center min-h-screen bg-gray-50 dark:bg-gray-900">
            <div className="text-center">
              <div className="relative">
                <div className="w-20 h-20 border-4 border-purple-200 dark:border-purple-800 border-t-purple-600 dark:border-t-purple-400 rounded-full animate-spin mx-auto mb-4"></div>
                <div className="absolute inset-0 flex items-center justify-center">
                  <Calculator className="w-8 h-8 text-purple-600 dark:text-purple-400" />
                </div>
              </div>
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
                Calculando CMV
              </h3>
              <p className="text-gray-600 dark:text-gray-400">
                Analisando custos e margens de lucro...
              </p>
            </div>
          </div>
        ) : (
          <>
            {/* Cards de Métricas */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
              <div className="bg-gradient-to-br from-blue-500 to-blue-600 rounded-3xl shadow-xl p-6 text-white transform hover:scale-105 transition-all duration-300">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-blue-100 text-sm font-medium">CMV Total</p>
                    <p className="text-3xl font-bold mt-1">
                      {formatarDinheiro(totalCMV)}
                    </p>
                    <p className="text-blue-100 text-sm mt-1">
                      {percentualCMVGeral.toFixed(2)}% da receita
                    </p>
                  </div>
                  <div className="p-4 bg-white/20 backdrop-blur-sm rounded-2xl">
                    <Calculator size={28} />
                  </div>
                </div>
              </div>

              <div className="bg-gradient-to-br from-green-500 to-green-600 rounded-3xl shadow-xl p-6 text-white transform hover:scale-105 transition-all duration-300">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-green-100 text-sm font-medium">Receita Total</p>
                    <p className="text-3xl font-bold mt-1">
                      {formatarDinheiro(totalReceita)}
                    </p>
                    <p className="text-green-100 text-sm mt-1">
                      Faturamento bruto
                    </p>
                  </div>
                  <div className="p-4 bg-white/20 backdrop-blur-sm rounded-2xl">
                    <TrendingUp size={28} />
                  </div>
                </div>
              </div>

              <div className="bg-gradient-to-br from-purple-500 to-purple-600 rounded-3xl shadow-xl p-6 text-white transform hover:scale-105 transition-all duration-300">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-purple-100 text-sm font-medium">Lucro Bruto</p>
                    <p className="text-3xl font-bold mt-1">
                      {formatarDinheiro(lucroBruto)}
                    </p>
                    <p className="text-purple-100 text-sm mt-1">
                      Margem: {margemLucroBruta.toFixed(2)}%
                    </p>
                  </div>
                  <div className="p-4 bg-white/20 backdrop-blur-sm rounded-2xl">
                    <Target size={28} />
                  </div>
                </div>
              </div>

              <div className="bg-gradient-to-br from-orange-500 to-orange-600 rounded-3xl shadow-xl p-6 text-white transform hover:scale-105 transition-all duration-300">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-orange-100 text-sm font-medium">Produtos Analisados</p>
                    <p className="text-3xl font-bold mt-1">{filteredCMV.length}</p>
                    <p className="text-orange-100 text-sm mt-1">Com CMV calculado</p>
                  </div>
                  <div className="p-4 bg-white/20 backdrop-blur-sm rounded-2xl">
                    <Package size={28} />
                  </div>
                </div>
              </div>
            </div>

            {/* Gráficos */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
              {/* Gráfico de Barras - Custo vs Receita */}
              <div className="bg-white/90 dark:bg-gray-800/90 backdrop-blur-sm rounded-3xl shadow-xl border border-white/20 dark:border-gray-700/50 p-6">
                <div className="flex items-center justify-between mb-6">
                  <h2 className="text-xl font-bold text-gray-900 dark:text-white">
                    Análise Custo vs Receita
                  </h2>
                  <div className="p-2 bg-blue-100 dark:bg-blue-900/50 rounded-xl">
                    <BarChart3 size={20} className="text-blue-600 dark:text-blue-400" />
                  </div>
                </div>
                <div className="h-80">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={chartData.slice(0, 8)}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" />
                      <XAxis 
                        dataKey="nome" 
                        stroke="#6B7280" 
                        fontSize={12}
                        angle={-45}
                        textAnchor="end"
                        height={80}
                      />
                      <YAxis stroke="#6B7280" fontSize={12} />
                      <Tooltip
                        formatter={(value: any, name: string) => [
                          formatarDinheiro(value),
                          name === "custo" ? "Custo Total" : "Receita Total"
                        ]}
                        labelStyle={{ color: "#374151" }}
                        contentStyle={{
                          backgroundColor: "#F9FAFB",
                          border: "1px solid #E5E7EB",
                          borderRadius: "12px"
                        }}
                      />
                      <Legend />
                      <Bar dataKey="custo" name="Custo Total" fill="#EF4444" radius={[4, 4, 0, 0]} />
                      <Bar dataKey="receita" name="Receita Total" fill="#10B981" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>

              {/* Gráfico de Pizza - Distribuição de Custos */}
              <div className="bg-white/90 dark:bg-gray-800/90 backdrop-blur-sm rounded-3xl shadow-xl border border-white/20 dark:border-gray-700/50 p-6">
                <div className="flex items-center justify-between mb-6">
                  <h2 className="text-xl font-bold text-gray-900 dark:text-white">
                    Distribuição de Custos
                  </h2>
                  <div className="p-2 bg-purple-100 dark:bg-purple-900/50 rounded-xl">
                    <PieChart size={20} className="text-purple-600 dark:text-purple-400" />
                  </div>
                </div>
                <div className="h-80">
                  <ResponsiveContainer width="100%" height="100%">
                    <RechartsPieChart>
                      <Pie
                        data={pieData}
                        cx="50%"
                        cy="50%"
                        outerRadius={100}
                        fill="#8884d8"
                        dataKey="value"
                        label={({ name, percentage }) => `${name}: ${percentage.toFixed(1)}%`}
                      >
                        {pieData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip
                        formatter={(value: any) => [formatarDinheiro(value), "Custo"]}
                        contentStyle={{
                          backgroundColor: "#F9FAFB",
                          border: "1px solid #E5E7EB",
                          borderRadius: "12px"
                        }}
                      />
                    </RechartsPieChart>
                  </ResponsiveContainer>
                </div>
              </div>
            </div>

            {/* Lista de Produtos */}
            <div className="bg-white/90 dark:bg-gray-800/90 backdrop-blur-sm rounded-3xl shadow-xl border border-white/20 dark:border-gray-700/50 overflow-hidden">
              <div className="p-6 border-b border-gray-200/50 dark:border-gray-700/50">
                <div className="flex justify-between items-center">
                  <h2 className="text-xl font-bold text-gray-900 dark:text-white">Produtos Analisados</h2>
                  <div className="text-sm text-gray-500 dark:text-gray-400">
                    Período: {new Date(periodoInicio).toLocaleDateString('pt-BR')} - {new Date(periodoFim).toLocaleDateString('pt-BR')}
                  </div>
                </div>
              </div>

              {filteredCMV.length === 0 ? (
                <div className="text-center py-16">
                  <div className="relative mb-8">
                    <div className="w-32 h-32 bg-gradient-to-br from-gray-100 to-gray-200 dark:from-gray-700 dark:to-gray-600 rounded-full mx-auto flex items-center justify-center shadow-2xl">
                      <Calculator className="w-16 h-16 text-gray-400 dark:text-gray-500" />
                    </div>
                    <div className="absolute -top-2 -right-2 w-8 h-8 bg-gradient-to-r from-purple-500 to-indigo-600 rounded-full flex items-center justify-center shadow-lg transform translate-x-16">
                      <Sparkles className="w-4 h-4 text-white" />
                    </div>
                  </div>
                  <h3 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">
                    Nenhum produto com CMV calculado
                  </h3>
                  <p className="text-lg text-gray-600 dark:text-gray-400 mb-8 max-w-md mx-auto">
                    Adicione produtos com seus custos unitários para começar a analisar a margem de lucro
                  </p>
                  <Button
                    onClick={() => {
                      resetForm();
                      setShowModal(true);
                    }}
                    className="bg-gradient-to-r from-purple-600 via-purple-700 to-indigo-700 hover:from-purple-700 hover:via-purple-800 hover:to-indigo-800 text-white px-8 py-4 rounded-2xl font-semibold shadow-xl hover:shadow-2xl transform hover:scale-105 transition-all duration-300"
                    icon={<Plus size={20} />}
                  >
                    Adicionar Primeiro Produto
                  </Button>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-gray-200/50 dark:divide-gray-700/50">
                    <thead className="bg-gradient-to-r from-gray-50 to-gray-100 dark:from-gray-700 dark:to-gray-600">
                      <tr>
                        <th className="px-6 py-4 text-left text-xs font-bold text-gray-700 dark:text-gray-300 uppercase tracking-wider">
                          Produto
                        </th>
                        <th className="px-6 py-4 text-left text-xs font-bold text-gray-700 dark:text-gray-300 uppercase tracking-wider">
                          Custo Unit.
                        </th>
                        <th className="px-6 py-4 text-left text-xs font-bold text-gray-700 dark:text-gray-300 uppercase tracking-wider">
                          Qtd. Vendida
                        </th>
                        <th className="px-6 py-4 text-left text-xs font-bold text-gray-700 dark:text-gray-300 uppercase tracking-wider">
                          CMV Total
                        </th>
                        <th className="px-6 py-4 text-left text-xs font-bold text-gray-700 dark:text-gray-300 uppercase tracking-wider">
                          Receita Total
                        </th>
                        <th className="px-6 py-4 text-left text-xs font-bold text-gray-700 dark:text-gray-300 uppercase tracking-wider">
                          Margem
                        </th>
                        <th className="px-6 py-4 text-left text-xs font-bold text-gray-700 dark:text-gray-300 uppercase tracking-wider">
                          Ações
                        </th>
                      </tr>
                    </thead>
                    <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200/50 dark:divide-gray-700/50">
                      {filteredCMV.map((item) => (
                        <tr key={item.id} className="hover:bg-gray-50/50 dark:hover:bg-gray-700/50 transition-colors">
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div>
                              <div className="text-sm font-bold text-gray-900 dark:text-white">
                                {item.produto_nome}
                              </div>
                              <div className="text-xs text-gray-500 dark:text-gray-400">
                                {item.categoria}
                              </div>
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="text-sm font-medium text-gray-900 dark:text-white">
                              {formatarDinheiro(item.custo_unitario)}
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="text-sm font-medium text-gray-900 dark:text-white">
                              {item.quantidade_vendida}
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="text-sm font-bold text-red-600 dark:text-red-400">
                              {formatarDinheiro(item.custo_total)}
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="text-sm font-bold text-green-600 dark:text-green-400">
                              {formatarDinheiro(item.receita_total)}
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <span
                              className={`px-3 py-2 inline-flex text-xs leading-5 font-bold rounded-full ${
                                item.margem_lucro >= 40
                                  ? "bg-green-100 text-green-800 dark:bg-green-900/50 dark:text-green-200"
                                  : item.margem_lucro >= 30
                                  ? "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/50 dark:text-yellow-200"
                                  : "bg-red-100 text-red-800 dark:bg-red-900/50 dark:text-red-200"
                              }`}
                            >
                              {item.margem_lucro.toFixed(2)}%
                            </span>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                            <div className="flex space-x-2">
                              <Button
                                variant="ghost"
                                size="sm"
                                icon={<Edit size={16} />}
                                onClick={() => handleEdit(item)}
                                className="text-blue-600 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300"
                              >
                                Editar
                              </Button>
                              <Button
                                variant="ghost"
                                size="sm"
                                icon={<Trash2 size={16} />}
                                onClick={() => handleDelete(item.id)}
                                className="text-red-600 hover:text-red-700 dark:text-red-400 dark:hover:text-red-300"
                              >
                                Excluir
                              </Button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </>
        )}

        {/* Modal de Adicionar/Editar CMV */}
        {showModal && (
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-50">
            <div className="bg-white/95 dark:bg-gray-800/95 backdrop-blur-sm rounded-3xl max-w-2xl w-full max-h-[90vh] overflow-y-auto shadow-2xl border border-white/20 dark:border-gray-700/50">
              {/* Header do Modal */}
              <div className="relative overflow-hidden">
                <div className="bg-gradient-to-r from-purple-600 via-purple-700 to-indigo-700 p-8">
                  <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full -mr-16 -mt-16"></div>
                  <div className="relative flex justify-between items-center">
                    <div className="flex items-center">
                      <div className="p-3 bg-white/20 backdrop-blur-sm rounded-2xl mr-4">
                        <Calculator size={24} className="text-white" />
                      </div>
                      <div className="text-white">
                        <h2 className="text-2xl font-bold">
                          {editingItem ? 'Editar CMV' : 'Adicionar Produto ao CMV'}
                        </h2>
                        <p className="text-purple-100">
                          {editingItem ? 'Atualize o custo do produto' : 'Selecione um produto e defina seu custo'}
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
                <div className="grid grid-cols-1 gap-6">
                  <div>
                    <label className="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-3">
                      Produto
                    </label>
                    <select
                      value={formData.produto_id}
                      onChange={(e) => setFormData({ ...formData, produto_id: e.target.value })}
                      className="w-full px-4 py-4 bg-gray-50/50 dark:bg-gray-700/50 border border-gray-200/50 dark:border-gray-600/50 rounded-2xl focus:ring-2 focus:ring-purple-500 dark:focus:ring-purple-400 focus:border-purple-500 dark:focus:border-purple-400 transition-all duration-200 text-gray-900 dark:text-white"
                      required
                      disabled={!!editingItem}
                    >
                      <option value="">Selecione um produto</option>
                      {editingItem ? (
                        <option value={editingItem.produto_id}>
                          {editingItem.produto_nome} - {editingItem.categoria}
                        </option>
                      ) : (
                        produtosDisponiveis.map(produto => (
                          <option key={produto.id} value={produto.id}>
                            {produto.nome} - {produto.categoria} - {formatarDinheiro(produto.preco)}
                          </option>
                        ))
                      )}
                    </select>
                    {!editingItem && produtosDisponiveis.length === 0 && (
                      <p className="text-sm text-amber-600 dark:text-amber-400 mt-2">
                        Todos os produtos já têm CMV calculado para este período
                      </p>
                    )}
                  </div>

                  <div>
                    <label className="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-3">
                      Custo Unitário
                    </label>
                    <div className="relative">
                      <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                        <DollarSign className="w-5 h-5 text-gray-400 dark:text-gray-500" />
                      </div>
                      <input
                        type="number"
                        step="0.01"
                        min="0"
                        value={formData.custo_unitario}
                        onChange={(e) => setFormData({ ...formData, custo_unitario: e.target.value })}
                        className="w-full pl-12 pr-4 py-4 bg-gray-50/50 dark:bg-gray-700/50 border border-gray-200/50 dark:border-gray-600/50 rounded-2xl focus:ring-2 focus:ring-purple-500 dark:focus:ring-purple-400 focus:border-purple-500 dark:focus:border-purple-400 transition-all duration-200 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400"
                        placeholder="0,00"
                        required
                      />
                    </div>
                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-2">
                      Custo real de produção/compra do produto (sem margem de lucro)
                    </p>
                  </div>

                  {/* Preview do Cálculo */}
                  {formData.produto_id && formData.custo_unitario && (
                    <div className="bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20 rounded-2xl p-6 border border-blue-200/50 dark:border-blue-700/50">
                      <div className="flex items-center mb-4">
                        <Zap className="w-5 h-5 text-blue-600 dark:text-blue-400 mr-2" />
                        <h4 className="font-bold text-blue-800 dark:text-blue-200">
                          Preview do Cálculo
                        </h4>
                      </div>
                      <div className="grid grid-cols-2 gap-4 text-sm">
                        <div>
                          <p className="text-blue-700 dark:text-blue-300">Produto selecionado:</p>
                          <p className="font-medium text-blue-900 dark:text-blue-100">
                            {produtos.find(p => p.id === formData.produto_id)?.nome}
                          </p>
                        </div>
                        <div>
                          <p className="text-blue-700 dark:text-blue-300">Custo informado:</p>
                          <p className="font-medium text-blue-900 dark:text-blue-100">
                            {formatarDinheiro(parseFloat(formData.custo_unitario) || 0)}
                          </p>
                        </div>
                      </div>
                      <p className="text-xs text-blue-600 dark:text-blue-400 mt-3">
                        O CMV será calculado automaticamente com base nas vendas do período selecionado
                      </p>
                    </div>
                  )}
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
                    className="flex-1 bg-gradient-to-r from-purple-600 via-purple-700 to-indigo-700 hover:from-purple-700 hover:via-purple-800 hover:to-indigo-800 text-white rounded-2xl py-4 font-semibold shadow-xl hover:shadow-2xl transition-all duration-200 transform hover:scale-105"
                    isLoading={loading}
                  >
                    {editingItem ? 'Atualizar' : 'Calcular'} CMV
                  </Button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default CMV;