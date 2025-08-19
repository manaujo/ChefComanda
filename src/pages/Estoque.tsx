import React, { useState, useEffect } from "react";
import {
  Plus,
  Search,
  Filter,
  Edit2,
  Trash2,
  Upload,
  Download,
  FileSpreadsheet,
  AlertTriangle,
  MoreVertical,
  X,
  Package,
  TrendingUp,
  TrendingDown,
  Calendar,
  Eye,
  Activity,
  ArrowUpDown,
  Zap,
  Shield,
  Target,
  Clock
} from "lucide-react";
import Button from "../components/ui/Button";
import MovimentacaoModal from "../components/estoque/MovimentacaoModal";
import HistoricoMovimentacoes from "../components/estoque/HistoricoMovimentacoes";
import { useRestaurante } from "../contexts/RestauranteContext";
import { useAuth } from "../contexts/AuthContext";
import { formatarDinheiro } from "../utils/formatters";
import { supabase } from "../services/supabase";
import toast from "react-hot-toast";

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

const Estoque: React.FC = () => {
  const { user } = useAuth();
  const [insumos, setInsumos] = useState<Insumo[]>([]);
  const [loading, setLoading] = useState(false);
  const [busca, setBusca] = useState("");
  const [filtroStatus, setFiltroStatus] = useState<
    "todos" | "ativos" | "vencidos" | "proximos" | "baixo"
  >("todos");
  const [visualizacao, setVisualizacao] = useState<"cards" | "tabela">("cards");
  const [showModal, setShowModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [showMovimentacaoModal, setShowMovimentacaoModal] = useState(false);
  const [showHistoricoModal, setShowHistoricoModal] = useState(false);
  const [selectedInsumo, setSelectedInsumo] = useState<Insumo | null>(null);
  const [formData, setFormData] = useState({
    nome: "",
    descricao: "",
    unidade_medida: "un",
    quantidade: 0,
    quantidade_minima: 0,
    data_validade: "",
    preco_unitario: 0
  });

  useEffect(() => {
    loadInsumos();
  }, []);

  const loadInsumos = async () => {
    try {
      setLoading(true);

      // Get or create user's restaurant
      let { data: restaurante, error: restauranteError } = await supabase
        .from("restaurantes")
        .select("*")
        .eq("user_id", user?.id)
        .maybeSingle();

      if (restauranteError && restauranteError.code !== "PGRST116") {
        console.error("Error getting restaurant:", restauranteError);
        throw new Error("Restaurante não encontrado");
      }

      // Create restaurant if it doesn't exist
      if (!restaurante) {
        console.log("Creating restaurant for user:", user?.id);
        const { data: newRestaurante, error: createError } = await supabase
          .from("restaurantes")
          .insert({
            user_id: user?.id,
            nome: `Restaurante de ${user?.user_metadata?.name || "Usuário"}`,
            telefone: ""
          })
          .select()
          .single();

        if (createError) {
          console.error("Error creating restaurant:", createError);
          throw new Error("Erro ao criar restaurante");
        }

        restaurante = newRestaurante;
      }

      const { data, error } = await supabase
        .from("insumos")
        .select("*")
        .eq("restaurante_id", restaurante.id)
        .order("nome");

      if (error) throw error;
      setInsumos(data || []);
    } catch (error) {
      console.error("Error loading insumos:", error);
      toast.error("Erro ao carregar insumos");
    } finally {
      setLoading(false);
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
      // Get or create user's restaurant
      let { data: restaurante, error: restauranteError } = await supabase
        .from("restaurantes")
        .select("*")
        .eq("user_id", user?.id)
        .maybeSingle();

      if (restauranteError && restauranteError.code !== "PGRST116") {
        console.error("Error getting restaurant:", restauranteError);
        throw new Error("Restaurante não encontrado");
      }

      if (!restaurante) {
        throw new Error("Restaurante não encontrado");
      }

      // Call the stored procedure to register the movement
      const { error } = await supabase.rpc('registrar_movimentacao_estoque', {
        p_insumo_id: insumoId,
        p_tipo: tipo,
        p_quantidade: quantidade,
        p_motivo: motivo,
        p_observacao: observacao,
        p_usuario_id: user?.id
      });

      if (error) throw error;

      toast.success(`${tipo === 'entrada' ? 'Entrada' : 'Saída'} registrada com sucesso!`);
      
      // Reload data
      await loadInsumos();
    } catch (error) {
      console.error('Error registering movement:', error);
      toast.error(error instanceof Error ? error.message : 'Erro ao registrar movimentação');
      throw error;
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      if (!formData.nome || !formData.unidade_medida) {
        throw new Error("Preencha os campos obrigatórios");
      }

      // Get or create user's restaurant
      let { data: restaurante, error: restauranteError } = await supabase
        .from("restaurantes")
        .select("*")
        .eq("user_id", user?.id)
        .maybeSingle();

      if (restauranteError && restauranteError.code !== "PGRST116") {
        console.error("Error getting restaurant:", restauranteError);
        throw new Error("Restaurante não encontrado");
      }

      // Create restaurant if it doesn't exist
      if (!restaurante) {
        const { data: newRestaurante, error: createError } = await supabase
          .from("restaurantes")
          .insert({
            user_id: user?.id,
            nome: `Restaurante de ${user?.user_metadata?.name || "Usuário"}`,
            telefone: ""
          })
          .select()
          .single();

        if (createError) {
          console.error("Error creating restaurant:", createError);
          throw new Error("Erro ao criar restaurante");
        }

        restaurante = newRestaurante;
      }

      if (selectedInsumo) {
        // Update existing insumo
        const { data, error } = await supabase
          .from("insumos")
          .update({
            nome: formData.nome,
            descricao: formData.descricao,
            unidade_medida: formData.unidade_medida,
            quantidade: formData.quantidade,
            quantidade_minima: formData.quantidade_minima,
            data_validade: formData.data_validade || null,
            preco_unitario: formData.preco_unitario || null,
            updated_at: new Date().toISOString()
          })
          .eq("id", selectedInsumo.id)
          .select()
          .single();

        if (error) throw error;

        // Update local state
        setInsumos((prev) =>
          prev.map((insumo) =>
            insumo.id === selectedInsumo.id ? data : insumo
          )
        );
        toast.success("Insumo atualizado com sucesso!");
      } else {
        // Create new insumo
        const { data, error } = await supabase
          .from("insumos")
          .insert({
            ...formData,
            restaurante_id: restaurante.id
          })
          .select()
          .single();

        if (error) throw error;

        // Update local state
        setInsumos((prev) => [...prev, data]);
        toast.success("Insumo cadastrado com sucesso!");
      }

      setShowModal(false);
      resetForm();
    } catch (error) {
      console.error("Error saving insumo:", error);
      toast.error(
        error instanceof Error ? error.message : "Erro ao salvar insumo"
      );
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setFormData({
      nome: "",
      descricao: "",
      unidade_medida: "un",
      quantidade: 0,
      quantidade_minima: 0,
      data_validade: "",
      preco_unitario: 0
    });
    setSelectedInsumo(null);
  };

  const handleEdit = (insumo: Insumo) => {
    setSelectedInsumo(insumo);
    setFormData({
      nome: insumo.nome,
      descricao: insumo.descricao || "",
      unidade_medida: insumo.unidade_medida,
      quantidade: insumo.quantidade,
      quantidade_minima: insumo.quantidade_minima,
      data_validade: insumo.data_validade || "",
      preco_unitario: insumo.preco_unitario || 0
    });
    setShowModal(true);
  };

  const handleDelete = async () => {
    if (!selectedInsumo) return;

    setLoading(true);
    try {
      const { error } = await supabase
        .from("insumos")
        .update({ ativo: false })
        .eq("id", selectedInsumo.id);

      if (error) throw error;

      // Update local state
      setInsumos((prev) =>
        prev.map((insumo) =>
          insumo.id === selectedInsumo.id ? { ...insumo, ativo: false } : insumo
        )
      );

      toast.success("Insumo desativado com sucesso!");
      setShowDeleteModal(false);
      setSelectedInsumo(null);
    } catch (error) {
      console.error("Error deactivating insumo:", error);
      toast.error("Erro ao desativar insumo");
    } finally {
      setLoading(false);
    }
  };

  const isVencido = (data_validade?: string) => {
    if (!data_validade) return false;
    return new Date(data_validade) < new Date();
  };

  const isProximoVencer = (data_validade?: string) => {
    if (!data_validade) return false;
    const hoje = new Date();
    const validade = new Date(data_validade);
    const diasRestantes = Math.ceil(
      (validade.getTime() - hoje.getTime()) / (1000 * 60 * 60 * 24)
    );
    return diasRestantes <= 7 && diasRestantes > 0;
  };

  const getStatusColor = (insumo: Insumo) => {
    if (isVencido(insumo.data_validade)) return "border-red-500 bg-red-50 dark:bg-red-900/20";
    if (isProximoVencer(insumo.data_validade)) return "border-yellow-500 bg-yellow-50 dark:bg-yellow-900/20";
    if (insumo.quantidade <= insumo.quantidade_minima) return "border-orange-500 bg-orange-50 dark:bg-orange-900/20";
    return "border-green-500 bg-green-50 dark:bg-green-900/20";
  };

  const getStatusIcon = (insumo: Insumo) => {
    if (isVencido(insumo.data_validade)) return <AlertTriangle className="text-red-500" size={20} />;
    if (isProximoVencer(insumo.data_validade)) return <Clock className="text-yellow-500" size={20} />;
    if (insumo.quantidade <= insumo.quantidade_minima) return <TrendingDown className="text-orange-500" size={20} />;
    return <Shield className="text-green-500" size={20} />;
  };

  const insumosFiltrados = insumos.filter((insumo) => {
    const matchBusca =
      insumo.nome.toLowerCase().includes(busca.toLowerCase()) ||
      insumo.descricao?.toLowerCase().includes(busca.toLowerCase());

    const matchStatus =
      filtroStatus === "todos" ||
      (filtroStatus === "ativos" && insumo.ativo) ||
      (filtroStatus === "vencidos" && isVencido(insumo.data_validade)) ||
      (filtroStatus === "proximos" && isProximoVencer(insumo.data_validade)) ||
      (filtroStatus === "baixo" && insumo.quantidade <= insumo.quantidade_minima);

    return matchBusca && matchStatus;
  });

  // Estatísticas
  const estatisticas = {
    total: insumos.filter(i => i.ativo).length,
    baixo: insumos.filter(i => i.ativo && i.quantidade <= i.quantidade_minima).length,
    vencidos: insumos.filter(i => i.ativo && isVencido(i.data_validade)).length,
    proximos: insumos.filter(i => i.ativo && isProximoVencer(i.data_validade)).length
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-blue-50 to-indigo-50 dark:from-gray-900 dark:via-gray-800 dark:to-gray-700">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header Moderno */}
        <div className="mb-8">
          <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center">
            <div className="mb-6 lg:mb-0">
              <div className="flex items-center mb-4">
                <div className="p-3 bg-gradient-to-br from-blue-500 to-blue-600 rounded-2xl shadow-lg mr-4">
                  <Package size={32} className="text-white" />
                </div>
                <div>
                  <h1 className="text-4xl font-bold bg-gradient-to-r from-gray-900 to-gray-700 dark:from-white dark:to-gray-300 bg-clip-text text-transparent">
                    Controle de Estoque
                  </h1>
                  <p className="text-lg text-gray-600 dark:text-gray-400 mt-1">
                    Gestão inteligente de insumos e matéria-prima
                  </p>
                </div>
              </div>
            </div>
            
            <div className="flex flex-wrap gap-3">
              <Button
                variant="ghost"
                icon={<Eye size={18} />}
                onClick={() => setShowHistoricoModal(true)}
                className="bg-white/80 backdrop-blur-sm shadow-lg hover:shadow-xl transition-all duration-300"
              >
                Histórico
              </Button>
              <Button
                variant="ghost"
                icon={<FileSpreadsheet size={18} />}
                onClick={() => toast.success("Relatório exportado em Excel!")}
                className="bg-white/80 backdrop-blur-sm shadow-lg hover:shadow-xl transition-all duration-300"
              >
                Excel
              </Button>
              <Button
                variant="ghost"
                icon={<Download size={18} />}
                onClick={() => toast.success("Relatório exportado em PDF!")}
                className="bg-white/80 backdrop-blur-sm shadow-lg hover:shadow-xl transition-all duration-300"
              >
                PDF
              </Button>
              <Button
                variant="primary"
                icon={<Plus size={18} />}
                onClick={() => {
                  resetForm();
                  setShowModal(true);
                }}
                className="bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 shadow-lg hover:shadow-xl transition-all duration-300"
              >
                Novo Insumo
              </Button>
            </div>
          </div>
        </div>

        {/* Cards de Estatísticas */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <div className="bg-white/90 dark:bg-gray-800/90 backdrop-blur-sm rounded-2xl shadow-xl border border-white/20 dark:border-gray-700/50 p-6 hover:shadow-2xl transition-all duration-300">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Total de Insumos</p>
                <p className="text-3xl font-bold text-gray-900 dark:text-white mt-1">
                  {estatisticas.total}
                </p>
                <div className="flex items-center mt-2">
                  <Target size={16} className="text-blue-500 mr-1" />
                  <span className="text-sm text-blue-600 dark:text-blue-400">Ativos</span>
                </div>
              </div>
              <div className="p-3 bg-gradient-to-br from-blue-100 to-blue-200 dark:from-blue-900 dark:to-blue-800 rounded-2xl">
                <Package size={28} className="text-blue-600 dark:text-blue-400" />
              </div>
            </div>
          </div>

          <div className="bg-white/90 dark:bg-gray-800/90 backdrop-blur-sm rounded-2xl shadow-xl border border-white/20 dark:border-gray-700/50 p-6 hover:shadow-2xl transition-all duration-300">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Estoque Baixo</p>
                <p className="text-3xl font-bold text-orange-600 dark:text-orange-400 mt-1">
                  {estatisticas.baixo}
                </p>
                <div className="flex items-center mt-2">
                  <TrendingDown size={16} className="text-orange-500 mr-1" />
                  <span className="text-sm text-orange-600 dark:text-orange-400">Atenção</span>
                </div>
              </div>
              <div className="p-3 bg-gradient-to-br from-orange-100 to-orange-200 dark:from-orange-900 dark:to-orange-800 rounded-2xl">
                <AlertTriangle size={28} className="text-orange-600 dark:text-orange-400" />
              </div>
            </div>
          </div>

          <div className="bg-white/90 dark:bg-gray-800/90 backdrop-blur-sm rounded-2xl shadow-xl border border-white/20 dark:border-gray-700/50 p-6 hover:shadow-2xl transition-all duration-300">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Vencidos</p>
                <p className="text-3xl font-bold text-red-600 dark:text-red-400 mt-1">
                  {estatisticas.vencidos}
                </p>
                <div className="flex items-center mt-2">
                  <X size={16} className="text-red-500 mr-1" />
                  <span className="text-sm text-red-600 dark:text-red-400">Crítico</span>
                </div>
              </div>
              <div className="p-3 bg-gradient-to-br from-red-100 to-red-200 dark:from-red-900 dark:to-red-800 rounded-2xl">
                <Clock size={28} className="text-red-600 dark:text-red-400" />
              </div>
            </div>
          </div>

          <div className="bg-white/90 dark:bg-gray-800/90 backdrop-blur-sm rounded-2xl shadow-xl border border-white/20 dark:border-gray-700/50 p-6 hover:shadow-2xl transition-all duration-300">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Próx. Vencimento</p>
                <p className="text-3xl font-bold text-yellow-600 dark:text-yellow-400 mt-1">
                  {estatisticas.proximos}
                </p>
                <div className="flex items-center mt-2">
                  <Calendar size={16} className="text-yellow-500 mr-1" />
                  <span className="text-sm text-yellow-600 dark:text-yellow-400">7 dias</span>
                </div>
              </div>
              <div className="p-3 bg-gradient-to-br from-yellow-100 to-yellow-200 dark:from-yellow-900 dark:to-yellow-800 rounded-2xl">
                <Calendar size={28} className="text-yellow-600 dark:text-yellow-400" />
              </div>
            </div>
          </div>
        </div>

        {/* Filtros Modernos */}
        <div className="bg-white/90 dark:bg-gray-800/90 backdrop-blur-sm rounded-3xl shadow-xl border border-white/20 dark:border-gray-700/50 p-6 mb-8">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2">
              <div className="relative">
                <Search
                  className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 dark:text-gray-500"
                  size={20}
                />
                <input
                  type="text"
                  placeholder="Buscar insumos por nome ou descrição..."
                  value={busca}
                  onChange={(e) => setBusca(e.target.value)}
                  className="pl-12 w-full rounded-2xl border-gray-300 dark:border-gray-600 py-4 px-4 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white text-lg shadow-sm"
                />
              </div>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Filtrar por Status
                </label>
                <div className="flex flex-wrap gap-2">
                  <Button
                    variant={filtroStatus === 'todos' ? 'primary' : 'ghost'}
                    size="sm"
                    onClick={() => setFiltroStatus('todos')}
                  >
                    Todos ({estatisticas.total})
                  </Button>
                  <Button
                    variant={filtroStatus === 'baixo' ? 'warning' : 'ghost'}
                    size="sm"
                    onClick={() => setFiltroStatus('baixo')}
                  >
                    Baixo ({estatisticas.baixo})
                  </Button>
                  <Button
                    variant={filtroStatus === 'vencidos' ? 'danger' : 'ghost'}
                    size="sm"
                    onClick={() => setFiltroStatus('vencidos')}
                  >
                    Vencidos ({estatisticas.vencidos})
                  </Button>
                  <Button
                    variant={filtroStatus === 'proximos' ? 'warning' : 'ghost'}
                    size="sm"
                    onClick={() => setFiltroStatus('proximos')}
                  >
                    Próx. Venc. ({estatisticas.proximos})
                  </Button>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Visualização
                </label>
                <div className="flex rounded-xl shadow-sm overflow-hidden">
                  <button
                    onClick={() => setVisualizacao("cards")}
                    className={`flex-1 px-4 py-2 text-sm font-medium transition-all duration-200 ${
                      visualizacao === "cards"
                        ? "bg-blue-500 text-white shadow-lg"
                        : "bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-600"
                    }`}
                  >
                    Cards
                  </button>
                  <button
                    onClick={() => setVisualizacao("tabela")}
                    className={`flex-1 px-4 py-2 text-sm font-medium transition-all duration-200 ${
                      visualizacao === "tabela"
                        ? "bg-blue-500 text-white shadow-lg"
                        : "bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-600"
                    }`}
                  >
                    Tabela
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Lista de Insumos */}
        {visualizacao === "cards" ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {insumosFiltrados.map((insumo) => (
              <div
                key={insumo.id}
                className={`bg-white/90 dark:bg-gray-800/90 backdrop-blur-sm rounded-3xl shadow-xl overflow-hidden border-l-4 ${getStatusColor(insumo)} hover:shadow-2xl transition-all duration-300 transform hover:scale-105`}
              >
                <div className="p-6">
                  <div className="flex justify-between items-start mb-4">
                    <div className="flex-1">
                      <div className="flex items-center mb-2">
                        {getStatusIcon(insumo)}
                        <h3 className="font-bold text-gray-900 dark:text-white ml-2 text-lg">
                          {insumo.nome}
                        </h3>
                      </div>
                      <p className="text-sm text-gray-600 dark:text-gray-400 mb-3">
                        {insumo.descricao || 'Sem descrição'}
                      </p>
                    </div>
                    <div className="relative">
                      <button
                        onClick={() => setSelectedInsumo(insumo)}
                        className="p-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-xl transition-colors"
                      >
                        <MoreVertical size={18} />
                      </button>
                    </div>
                  </div>

                  {/* Quantidade */}
                  <div className="mb-4">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm font-medium text-gray-600 dark:text-gray-400">Quantidade</span>
                      <span className={`text-lg font-bold ${
                        insumo.quantidade <= insumo.quantidade_minima
                          ? "text-red-600 dark:text-red-400"
                          : "text-gray-900 dark:text-white"
                      }`}>
                        {insumo.quantidade} {insumo.unidade_medida}
                      </span>
                    </div>
                    
                    {/* Barra de Progresso */}
                    <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2 mb-2">
                      <div
                        className={`h-2 rounded-full transition-all duration-500 ${
                          insumo.quantidade <= insumo.quantidade_minima
                            ? 'bg-gradient-to-r from-red-500 to-red-600'
                            : 'bg-gradient-to-r from-green-500 to-green-600'
                        }`}
                        style={{
                          width: `${Math.min(100, (insumo.quantidade / (insumo.quantidade_minima * 2)) * 100)}%`
                        }}
                      ></div>
                    </div>
                    
                    <div className="flex justify-between text-xs text-gray-500 dark:text-gray-400">
                      <span>Mín: {insumo.quantidade_minima}</span>
                      <span>
                        {insumo.quantidade <= insumo.quantidade_minima ? 'Estoque baixo' : 'OK'}
                      </span>
                    </div>
                  </div>

                  {/* Informações Adicionais */}
                  <div className="space-y-2 mb-4">
                    {insumo.data_validade && (
                      <div className="flex justify-between items-center">
                        <span className="text-sm text-gray-500 dark:text-gray-400">Validade</span>
                        <span className={`text-sm font-medium ${
                          isVencido(insumo.data_validade)
                            ? "text-red-600 dark:text-red-400"
                            : isProximoVencer(insumo.data_validade)
                            ? "text-yellow-600 dark:text-yellow-400"
                            : "text-gray-900 dark:text-white"
                        }`}>
                          {new Date(insumo.data_validade).toLocaleDateString('pt-BR')}
                        </span>
                      </div>
                    )}

                    {insumo.preco_unitario && (
                      <div className="flex justify-between items-center">
                        <span className="text-sm text-gray-500 dark:text-gray-400">Preço Unit.</span>
                        <span className="text-sm font-medium text-gray-900 dark:text-white">
                          {formatarDinheiro(insumo.preco_unitario)}
                        </span>
                      </div>
                    )}
                  </div>

                  {/* Botões de Ação */}
                  <div className="flex space-x-2">
                    <Button
                      variant="success"
                      size="sm"
                      icon={<TrendingUp size={14} />}
                      onClick={() => {
                        setSelectedInsumo(insumo);
                        setShowMovimentacaoModal(true);
                      }}
                      className="flex-1 bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700"
                    >
                      Movimentar
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      icon={<Edit2 size={14} />}
                      onClick={() => handleEdit(insumo)}
                      className="bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600"
                    >
                      Editar
                    </Button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="bg-white/90 dark:bg-gray-800/90 backdrop-blur-sm rounded-3xl shadow-xl border border-white/20 dark:border-gray-700/50 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="min-w-full">
                <thead className="bg-gradient-to-r from-gray-50 to-gray-100 dark:from-gray-700 dark:to-gray-600">
                  <tr>
                    <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 dark:text-gray-300 uppercase tracking-wider">
                      Produto
                    </th>
                    <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 dark:text-gray-300 uppercase tracking-wider">
                      Quantidade
                    </th>
                    <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 dark:text-gray-300 uppercase tracking-wider">
                      Validade
                    </th>
                    <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 dark:text-gray-300 uppercase tracking-wider">
                      Status
                    </th>
                    <th className="px-6 py-4 text-right text-xs font-semibold text-gray-600 dark:text-gray-300 uppercase tracking-wider">
                      Ações
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                  {insumosFiltrados.map((insumo) => (
                    <tr key={insumo.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors">
                      <td className="px-6 py-4">
                        <div className="flex items-center">
                          <div className="p-2 bg-blue-100 dark:bg-blue-900 rounded-xl mr-3">
                            <Package size={16} className="text-blue-600 dark:text-blue-400" />
                          </div>
                          <div>
                            <div className="text-sm font-bold text-gray-900 dark:text-white">
                              {insumo.nome}
                            </div>
                            <div className="text-sm text-gray-500 dark:text-gray-400">
                              {insumo.descricao || 'Sem descrição'}
                            </div>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center space-x-2">
                          <div className={`text-sm font-bold ${
                            insumo.quantidade <= insumo.quantidade_minima
                              ? "text-red-600 dark:text-red-400"
                              : "text-gray-900 dark:text-white"
                          }`}>
                            {insumo.quantidade} {insumo.unidade_medida}
                          </div>
                          {insumo.quantidade <= insumo.quantidade_minima && (
                            <span className="text-xs bg-red-100 dark:bg-red-900 text-red-800 dark:text-red-200 px-2 py-1 rounded-full font-medium">
                              Baixo
                            </span>
                          )}
                        </div>
                        <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                          Mín: {insumo.quantidade_minima} {insumo.unidade_medida}
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        {insumo.data_validade && (
                          <div className={`text-sm font-medium ${
                            isVencido(insumo.data_validade)
                              ? "text-red-600 dark:text-red-400"
                              : isProximoVencer(insumo.data_validade)
                              ? "text-yellow-600 dark:text-yellow-400"
                              : "text-gray-900 dark:text-white"
                          }`}>
                            {new Date(insumo.data_validade).toLocaleDateString('pt-BR')}
                          </div>
                        )}
                      </td>
                      <td className="px-6 py-4">
                        <span className={`px-3 py-1 inline-flex text-xs leading-5 font-semibold rounded-full ${
                          isVencido(insumo.data_validade)
                            ? "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200"
                            : isProximoVencer(insumo.data_validade)
                            ? "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200"
                            : insumo.quantidade <= insumo.quantidade_minima
                            ? "bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200"
                            : "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200"
                        }`}>
                          {isVencido(insumo.data_validade)
                            ? "Vencido"
                            : isProximoVencer(insumo.data_validade)
                            ? "Próx. Vencimento"
                            : insumo.quantidade <= insumo.quantidade_minima
                            ? "Estoque Baixo"
                            : "OK"}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-right">
                        <div className="flex justify-end space-x-2">
                          <Button
                            variant="success"
                            size="sm"
                            icon={<ArrowUpDown size={14} />}
                            onClick={() => {
                              setSelectedInsumo(insumo);
                              setShowMovimentacaoModal(true);
                            }}
                            className="bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700"
                          >
                            Movimentar
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            icon={<Edit2 size={14} />}
                            onClick={() => handleEdit(insumo)}
                            className="hover:bg-gray-100 dark:hover:bg-gray-700"
                          >
                            Editar
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20"
                            icon={<Trash2 size={14} />}
                            onClick={() => {
                              setSelectedInsumo(insumo);
                              setShowDeleteModal(true);
                            }}
                          >
                            Excluir
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>

              {insumosFiltrados.length === 0 && (
                <div className="text-center py-12">
                  <div className="inline-flex items-center justify-center w-16 h-16 bg-gray-100 dark:bg-gray-700 rounded-2xl mb-4">
                    <Package size={32} className="text-gray-400 dark:text-gray-500" />
                  </div>
                  <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
                    Nenhum insumo encontrado
                  </h3>
                  <p className="text-gray-500 dark:text-gray-400">
                    Ajuste os filtros ou adicione novos insumos
                  </p>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Modal de Novo/Editar Insumo */}
        {showModal && (
          <div className="fixed inset-0 z-50 overflow-y-auto bg-black/60 backdrop-blur-sm">
            <div className="flex items-center justify-center min-h-screen p-4">
              <div className="bg-white dark:bg-gray-800 rounded-3xl shadow-2xl w-full max-w-lg transform transition-all duration-300 scale-100">
                <div className="relative overflow-hidden">
                  <div className="bg-gradient-to-r from-blue-500 to-indigo-600 px-8 py-6">
                    <div className="flex justify-between items-center">
                      <div className="flex items-center">
                        <div className="p-3 bg-white/20 backdrop-blur-sm rounded-2xl mr-4">
                          <Package size={24} className="text-white" />
                        </div>
                        <div className="text-white">
                          <h3 className="text-xl font-bold">
                            {selectedInsumo ? "Editar Insumo" : "Novo Insumo"}
                          </h3>
                          <p className="text-blue-100">
                            {selectedInsumo ? "Atualizar informações" : "Cadastrar novo insumo"}
                          </p>
                        </div>
                      </div>
                      <button
                        onClick={() => {
                          setShowModal(false);
                          setSelectedInsumo(null);
                          resetForm();
                        }}
                        className="p-2 text-white/70 hover:text-white hover:bg-white/20 rounded-xl transition-colors"
                      >
                        <X size={20} />
                      </button>
                    </div>
                  </div>

                  <form onSubmit={handleSubmit} className="p-8">
                    <div className="space-y-6">
                      <div>
                        <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
                          Nome do Insumo *
                        </label>
                        <input
                          type="text"
                          value={formData.nome}
                          onChange={(e) =>
                            setFormData({ ...formData, nome: e.target.value })
                          }
                          className="w-full rounded-2xl border-gray-300 dark:border-gray-600 shadow-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white py-4 px-4"
                          placeholder="Ex: Farinha de Trigo"
                          required
                        />
                      </div>

                      <div>
                        <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
                          Descrição
                        </label>
                        <textarea
                          value={formData.descricao}
                          onChange={(e) =>
                            setFormData({
                              ...formData,
                              descricao: e.target.value
                            })
                          }
                          rows={3}
                          className="w-full rounded-2xl border-gray-300 dark:border-gray-600 shadow-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white p-4"
                          placeholder="Descrição detalhada do insumo..."
                        />
                      </div>

                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
                            Unidade de Medida *
                          </label>
                          <select
                            value={formData.unidade_medida}
                            onChange={(e) =>
                              setFormData({
                                ...formData,
                                unidade_medida: e.target.value
                              })
                            }
                            className="w-full rounded-2xl border-gray-300 dark:border-gray-600 shadow-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white py-4 px-4"
                          >
                            <option value="un">Unidade</option>
                            <option value="kg">Quilograma</option>
                            <option value="g">Grama</option>
                            <option value="l">Litro</option>
                            <option value="ml">Mililitro</option>
                            <option value="cx">Caixa</option>
                            <option value="pct">Pacote</option>
                          </select>
                        </div>

                        <div>
                          <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
                            Quantidade Atual *
                          </label>
                          <input
                            type="number"
                            step="0.001"
                            min="0"
                            value={formData.quantidade}
                            onChange={(e) =>
                              setFormData({
                                ...formData,
                                quantidade: parseFloat(e.target.value) || 0
                              })
                            }
                            className="w-full rounded-2xl border-gray-300 dark:border-gray-600 shadow-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white py-4 px-4"
                            placeholder="0.000"
                            required
                          />
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
                            Quantidade Mínima *
                          </label>
                          <input
                            type="number"
                            step="0.001"
                            min="0"
                            value={formData.quantidade_minima}
                            onChange={(e) =>
                              setFormData({
                                ...formData,
                                quantidade_minima: parseFloat(e.target.value) || 0
                              })
                            }
                            className="w-full rounded-2xl border-gray-300 dark:border-gray-600 shadow-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white py-4 px-4"
                            placeholder="0.000"
                            required
                          />
                        </div>

                        <div>
                          <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
                            Preço Unitário
                          </label>
                          <div className="relative">
                            <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                              <span className="text-gray-500 dark:text-gray-400 sm:text-sm">R$</span>
                            </div>
                            <input
                              type="number"
                              step="0.01"
                              min="0"
                              value={formData.preco_unitario}
                              onChange={(e) =>
                                setFormData({
                                  ...formData,
                                  preco_unitario: parseFloat(e.target.value) || 0
                                })
                              }
                              className="pl-12 w-full rounded-2xl border-gray-300 dark:border-gray-600 shadow-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white py-4 px-4"
                              placeholder="0,00"
                            />
                          </div>
                        </div>
                      </div>

                      <div>
                        <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
                          Data de Validade
                        </label>
                        <input
                          type="date"
                          value={formData.data_validade}
                          onChange={(e) =>
                            setFormData({
                              ...formData,
                              data_validade: e.target.value
                            })
                          }
                          className="w-full rounded-2xl border-gray-300 dark:border-gray-600 shadow-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white py-4 px-4"
                        />
                      </div>
                    </div>

                    <div className="flex space-x-3 mt-8">
                      <Button
                        type="button"
                        variant="ghost"
                        onClick={() => {
                          setShowModal(false);
                          setSelectedInsumo(null);
                          resetForm();
                        }}
                        className="flex-1 py-3"
                      >
                        Cancelar
                      </Button>
                      <Button
                        type="submit"
                        variant="primary"
                        isLoading={loading}
                        className="flex-1 bg-gradient-to-r from-blue-500 to-indigo-600 hover:from-blue-600 hover:to-indigo-700 py-3"
                        icon={<Zap size={18} />}
                      >
                        {selectedInsumo ? "Atualizar" : "Cadastrar"}
                      </Button>
                    </div>
                  </form>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Modal de Confirmação de Exclusão */}
        {showDeleteModal && (
          <div className="fixed inset-0 z-50 overflow-y-auto bg-black/60 backdrop-blur-sm">
            <div className="flex items-center justify-center min-h-screen p-4">
              <div className="bg-white dark:bg-gray-800 rounded-3xl shadow-2xl w-full max-w-md transform transition-all duration-300 scale-100">
                <div className="relative overflow-hidden">
                  <div className="bg-gradient-to-r from-red-500 to-rose-600 px-8 py-6">
                    <div className="flex justify-between items-center">
                      <div className="flex items-center">
                        <div className="p-3 bg-white/20 backdrop-blur-sm rounded-2xl mr-4">
                          <AlertTriangle size={24} className="text-white" />
                        </div>
                        <div className="text-white">
                          <h3 className="text-xl font-bold">Desativar Insumo</h3>
                          <p className="text-red-100">Esta ação pode ser revertida</p>
                        </div>
                      </div>
                      <button
                        onClick={() => {
                          setShowDeleteModal(false);
                          setSelectedInsumo(null);
                        }}
                        className="p-2 text-white/70 hover:text-white hover:bg-white/20 rounded-xl transition-colors"
                      >
                        <X size={20} />
                      </button>
                    </div>
                  </div>

                  <div className="p-8">
                    <div className="text-center mb-6">
                      <p className="text-gray-600 dark:text-gray-400">
                        Tem certeza que deseja desativar o insumo <strong>{selectedInsumo?.nome}</strong>?
                      </p>
                      <p className="text-sm text-gray-500 dark:text-gray-400 mt-2">
                        O insumo será marcado como inativo mas não será excluído permanentemente.
                      </p>
                    </div>

                    <div className="flex space-x-3">
                      <Button
                        variant="ghost"
                        onClick={() => {
                          setShowDeleteModal(false);
                          setSelectedInsumo(null);
                        }}
                        className="flex-1 py-3"
                      >
                        Cancelar
                      </Button>
                      <Button
                        variant="danger"
                        onClick={handleDelete}
                        isLoading={loading}
                        className="flex-1 bg-gradient-to-r from-red-500 to-rose-600 hover:from-red-600 hover:to-rose-700 py-3"
                        icon={<Trash2 size={18} />}
                      >
                        Desativar
                      </Button>
                    </div>
                  </div>
                </div>
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
        {showHistoricoModal && (
          <div className="fixed inset-0 z-50 overflow-y-auto bg-black/60 backdrop-blur-sm">
            <div className="flex items-center justify-center min-h-screen p-4">
              <div className="w-full max-w-4xl max-h-[90vh] overflow-hidden">
                <div className="relative">
                  <button
                    onClick={() => setShowHistoricoModal(false)}
                    className="absolute top-4 right-4 z-10 p-2 bg-white/20 backdrop-blur-sm text-white hover:bg-white/30 rounded-xl transition-colors"
                  >
                    <X size={20} />
                  </button>
                  <HistoricoMovimentacoes />
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default Estoque;