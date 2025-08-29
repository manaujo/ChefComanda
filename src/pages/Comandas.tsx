import React, { useState, useEffect } from "react";
import {
  ClipboardList,
  Clock,
  ChefHat,
  Check,
  X,
  AlertTriangle,
  Filter,
  Search,
  RefreshCw,
  Eye,
  User,
  MapPin,
  Phone,
  Coffee,
  Truck,
  Zap,
  Package,
  Sparkles,
  Bell,
  Activity,
  Timer,
  Target,
  TrendingUp,
  BarChart3,
  Users,
  Calendar
} from "lucide-react";
import Button from "../components/ui/Button";
import { formatarDinheiro, formatarTempo } from "../utils/formatters";
import { useRestaurante } from "../contexts/RestauranteContext";
import { useAuth } from "../contexts/AuthContext";
import { usePermissions } from "../hooks/useEmployeeAuth";
import { supabase } from "../services/supabase";
import toast from "react-hot-toast";

interface ComandaItem {
  id: string;
  mesa_id?: string;
  mesa_numero?: number;
  comanda_id?: string;
  pedido_id?: string;
  pedido_numero?: number;
  produto_id: string;
  produto_nome: string;
  categoria: string;
  quantidade: number;
  preco_unitario: number;
  observacao?: string;
  status: "pendente" | "preparando" | "pronto" | "entregue" | "cancelado";
  created_at: string;
  tipo_origem: "mesa" | "pedido_avulso";
  cliente_nome?: string;
  tipo_pedido?: "balcao" | "delivery" | "rapido";
}

interface EstatatisticasCozinha {
  total_itens: number;
  itens_pendentes: number;
  itens_preparando: number;
  itens_prontos: number;
  tempo_medio_preparo: number;
  eficiencia: number;
}

const Comandas: React.FC = () => {
  const { user, userRole, isEmployee } = useAuth();
  const { hasPermission } = usePermissions();
  const { restaurante, mesas, itensComanda, refreshData } = useRestaurante();

  const [allItens, setAllItens] = useState<ComandaItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("ativos");
  const [tipoFilter, setTipoFilter] = useState("todos");
  const [estatisticas, setEstatisticas] = useState<EstatatisticasCozinha>({
    total_itens: 0,
    itens_pendentes: 0,
    itens_preparando: 0,
    itens_prontos: 0,
    tempo_medio_preparo: 0,
    eficiencia: 0
  });
  const [lastUpdate, setLastUpdate] = useState<Date>(new Date());

  // Verificar permissões
  const temPermissao =
    hasPermission("comandas") || (userRole === "admin" && !isEmployee);

  useEffect(() => {
    if (restaurante?.id && temPermissao) {
      loadAllItens();
    }
  }, [restaurante?.id, temPermissao]);

  // Realtime subscription com melhor performance
  useEffect(() => {
    if (!restaurante?.id) return;

    const channel = supabase
      .channel("comandas_realtime_v2")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "itens_comanda"
        },
        (payload) => {
          console.log("Realtime update - itens_comanda:", payload);
          loadAllItens();
          setLastUpdate(new Date());

          // Mostrar notificação para novos itens
          if (payload.eventType === "INSERT") {
            toast.success("Novo item adicionado à cozinha!", {
              icon: "🍽️",
              duration: 3000
            });
          }
        }
      )
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "itens_pedido"
        },
        (payload) => {
          console.log("Realtime update - itens_pedido:", payload);
          loadAllItens();
          setLastUpdate(new Date());

          // Mostrar notificação para novos pedidos
          if (payload.eventType === "INSERT") {
            toast.success("Novo pedido avulso na cozinha!", {
              icon: "🚀",
              duration: 3000
            });
          }
        }
      )
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "pedidos",
          filter: `restaurante_id=eq.${restaurante.id}`
        },
        (payload) => {
          console.log("Realtime update - pedidos:", payload);
          loadAllItens();
          setLastUpdate(new Date());
        }
      )
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "comandas"
        },
        (payload) => {
          console.log("Realtime update - comandas:", payload);
          loadAllItens();
          setLastUpdate(new Date());
        }
      )
      .subscribe((status) => {
        if (status === "SUBSCRIBED") {
          console.log("✅ Realtime subscription ativa para comandas");
        } else if (status === "CHANNEL_ERROR") {
          console.error("❌ Erro na subscription realtime");
        }
      });

    return () => {
      console.log("🔌 Desconectando realtime subscription");
      supabase.removeChannel(channel);
    };
  }, [restaurante?.id]);

  const loadAllItens = async () => {
    try {
      setLoading(true);

      if (!restaurante?.id) return;

      // Carregar itens de comandas (mesas)
      const { data: itensComandaData, error: comandaError } = await supabase
        .from("itens_comanda")
        .select(
          `
          *,
          comanda:comandas!inner(
            mesa_id,
            mesa:mesas!inner(
              numero,
              restaurante_id
            )
          ),
          produto:produtos!inner(nome, categoria)
        `
        )
        .eq("comanda.mesa.restaurante_id", restaurante.id)
        .neq("status", "entregue")
        .neq("status", "cancelado")
        .order("created_at", { ascending: false });

      if (comandaError) throw comandaError;

      // Carregar itens de pedidos rápidos
      const { data: itensPedidoData, error: pedidoError } = await supabase
        .from("itens_pedido")
        .select(
          `
          *,
          pedido:pedidos!inner(
            numero,
            cliente_nome,
            tipo,
            restaurante_id
          ),
          produto:produtos!inner(nome, categoria)
        `
        )
        .eq("pedido.restaurante_id", restaurante.id)
        .neq("status", "entregue")
        .neq("status", "cancelado")
        .order("created_at", { ascending: false });

      if (pedidoError) throw pedidoError;

      // Combinar e formatar todos os itens
      const itensFormatados: ComandaItem[] = [
        // Itens de comandas (mesas)
        ...(itensComandaData || []).map((item: any) => ({
          id: item.id,
          mesa_id: item.comanda.mesa_id,
          mesa_numero: item.comanda.mesa.numero,
          comanda_id: item.comanda_id,
          produto_id: item.produto_id,
          produto_nome: item.produto.nome,
          categoria: item.produto.categoria,
          quantidade: item.quantidade,
          preco_unitario: item.preco_unitario,
          observacao: item.observacao,
          status: item.status,
          created_at: item.created_at,
          tipo_origem: "mesa" as const
        })),
        // Itens de pedidos avulsos
        ...(itensPedidoData || []).map((item: any) => ({
          id: item.id,
          pedido_id: item.pedido_id,
          pedido_numero: item.pedido.numero,
          produto_id: item.produto_id,
          produto_nome: item.produto.nome,
          categoria: item.produto.categoria,
          quantidade: item.quantidade,
          preco_unitario: item.preco_unitario,
          observacao: item.observacao,
          status: item.status,
          created_at: item.created_at,
          tipo_origem: "pedido_avulso" as const,
          cliente_nome: item.pedido.cliente_nome,
          tipo_pedido: item.pedido.tipo
        }))
      ];

      // Ordenar por data de criação (mais recentes primeiro)
      itensFormatados.sort(
        (a, b) =>
          new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
      );

      setAllItens(itensFormatados);

      // Calcular estatísticas
      calcularEstatisticas(itensFormatados);
    } catch (error) {
      console.error("Error loading comandas:", error);
      toast.error("Erro ao carregar comandas");
    } finally {
      setLoading(false);
    }
  };

  const calcularEstatisticas = (itens: ComandaItem[]) => {
    const total = itens.length;
    const pendentes = itens.filter((i) => i.status === "pendente").length;
    const preparando = itens.filter((i) => i.status === "preparando").length;
    const prontos = itens.filter((i) => i.status === "pronto").length;

    // Calcular tempo médio de preparo (simulado baseado na categoria)
    const tempoMedio =
      itens.reduce((acc, item) => {
        let tempoEstimado = 15; // padrão
        if (
          item.categoria.includes("Principal") ||
          item.categoria.includes("Prato")
        ) {
          tempoEstimado = 25;
        } else if (item.categoria.includes("Bebida")) {
          tempoEstimado = 5;
        } else if (item.categoria.includes("Sobremesa")) {
          tempoEstimado = 12;
        }
        return acc + tempoEstimado;
      }, 0) / (total || 1);

    // Calcular eficiência (itens prontos vs total)
    const eficiencia =
      total > 0 ? Math.round(((prontos + preparando) / total) * 100) : 100;

    setEstatisticas({
      total_itens: total,
      itens_pendentes: pendentes,
      itens_preparando: preparando,
      itens_prontos: prontos,
      tempo_medio_preparo: Math.round(tempoMedio),
      eficiencia
    });
  };

  const atualizarStatusItem = async (
    itemId: string,
    novoStatus: "preparando" | "pronto",
    tipoOrigem: "mesa" | "pedido_avulso"
  ) => {
    try {
      const tabela = tipoOrigem === "mesa" ? "itens_comanda" : "itens_pedido";

      const { error } = await supabase
        .from(tabela)
        .update({ status: novoStatus })
        .eq("id", itemId);

      if (error) throw error;

      // Atualizar estado local imediatamente para melhor UX
      setAllItens((prev) =>
        prev.map((item) =>
          item.id === itemId ? { ...item, status: novoStatus } : item
        )
      );

      toast.success(
        `Item marcado como ${
          novoStatus === "preparando" ? "em preparo" : "pronto"
        }!`,
        {
          icon: novoStatus === "preparando" ? "👨‍🍳" : "✅"
        }
      );
    } catch (error) {
      console.error("Error updating item status:", error);
      toast.error("Erro ao atualizar status do item");
    }
  };

  const getTipoOrigemIcon = (item: ComandaItem) => {
    if (item.tipo_origem === "mesa") {
      return <Coffee className="w-4 h-4" />;
    } else {
      switch (item.tipo_pedido) {
        case "balcao":
          return <Coffee className="w-4 h-4" />;
        case "delivery":
          return <Truck className="w-4 h-4" />;
        case "rapido":
          return <Zap className="w-4 h-4" />;
        default:
          return <Package className="w-4 h-4" />;
      }
    }
  };

  const getTipoOrigemColor = (item: ComandaItem) => {
    if (item.tipo_origem === "mesa") {
      return "bg-blue-100 text-blue-800 dark:bg-blue-900/50 dark:text-blue-200";
    } else {
      switch (item.tipo_pedido) {
        case "balcao":
          return "bg-blue-100 text-blue-800 dark:bg-blue-900/50 dark:text-blue-200";
        case "delivery":
          return "bg-green-100 text-green-800 dark:bg-green-900/50 dark:text-green-200";
        case "rapido":
          return "bg-purple-100 text-purple-800 dark:bg-purple-900/50 dark:text-purple-200";
        default:
          return "bg-gray-100 text-gray-800 dark:bg-gray-900/50 dark:text-gray-200";
      }
    }
  };

  const getTipoOrigemText = (item: ComandaItem) => {
    if (item.tipo_origem === "mesa") {
      return `Mesa ${item.mesa_numero}`;
    } else {
      const tipoTexto =
        item.tipo_pedido === "balcao"
          ? "Balcão"
          : item.tipo_pedido === "delivery"
          ? "Delivery"
          : item.tipo_pedido === "rapido"
          ? "Rápido"
          : "Pedido";
      return `${tipoTexto} #${item.pedido_numero}`;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "pendente":
        return "from-yellow-500 to-amber-600";
      case "preparando":
        return "from-blue-500 to-indigo-600";
      case "pronto":
        return "from-green-500 to-emerald-600";
      default:
        return "from-gray-500 to-gray-600";
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "pendente":
        return <Clock className="w-5 h-5" />;
      case "preparando":
        return <ChefHat className="w-5 h-5" />;
      case "pronto":
        return <Check className="w-5 h-5" />;
      default:
        return <Package className="w-5 h-5" />;
    }
  };

  const filteredItens = allItens.filter((item) => {
    const matchSearch =
      item.produto_nome.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (item.cliente_nome &&
        item.cliente_nome.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (item.mesa_numero && item.mesa_numero.toString().includes(searchTerm)) ||
      (item.pedido_numero &&
        item.pedido_numero.toString().includes(searchTerm));

    let matchStatus = true;
    if (statusFilter === "pendentes") {
      matchStatus = item.status === "pendente";
    } else if (statusFilter === "preparando") {
      matchStatus = item.status === "preparando";
    } else if (statusFilter === "prontos") {
      matchStatus = item.status === "pronto";
    } else if (statusFilter === "ativos") {
      matchStatus = ["pendente", "preparando", "pronto"].includes(item.status);
    }

    let matchTipo = true;
    if (tipoFilter === "mesas") {
      matchTipo = item.tipo_origem === "mesa";
    } else if (tipoFilter === "pedidos") {
      matchTipo = item.tipo_origem === "pedido_avulso";
    }

    return matchSearch && matchStatus && matchTipo;
  });

  // Verificar permissões
  if (!temPermissao) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-50 dark:bg-gray-900">
        <div className="text-center">
          <AlertTriangle size={48} className="mx-auto text-red-500 mb-4" />
          <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-2">
            Acesso Restrito
          </h2>
          <p className="text-gray-600 dark:text-gray-400">
            Você não tem permissão para acessar as comandas.
          </p>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-50 dark:bg-gray-900">
        <div className="text-center">
          <div className="relative">
            <div className="w-20 h-20 border-4 border-orange-200 dark:border-orange-800 border-t-orange-600 dark:border-t-orange-400 rounded-full animate-spin mx-auto mb-4"></div>
            <div className="absolute inset-0 flex items-center justify-center">
              <ChefHat className="w-8 h-8 text-orange-600 dark:text-orange-400" />
            </div>
          </div>
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
            Carregando Comandas
          </h3>
          <p className="text-gray-600 dark:text-gray-400">
            Aguarde enquanto carregamos os pedidos da cozinha...
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-orange-50/30 to-red-50/30 dark:from-gray-900 dark:via-gray-800 dark:to-gray-700">
      <div className="p-6 max-w-7xl mx-auto">
        {/* Header Moderno */}
        <div className="mb-8">
          <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center">
            <div className="mb-6 lg:mb-0">
              <div className="flex items-center mb-4">
                <div className="relative">
                  <div className="p-4 bg-gradient-to-br from-orange-500 via-orange-600 to-red-600 rounded-3xl shadow-2xl mr-6 transform rotate-3 hover:rotate-0 transition-transform duration-300">
                    <ChefHat size={32} className="text-white" />
                  </div>
                  <div className="absolute -top-2 -right-2 w-6 h-6 bg-gradient-to-r from-yellow-400 to-orange-500 rounded-full flex items-center justify-center shadow-lg animate-pulse">
                    <Sparkles className="w-3 h-3 text-white" />
                  </div>
                </div>
                <div>
                  <h1 className="text-4xl font-bold bg-gradient-to-r from-gray-900 via-orange-800 to-red-900 dark:from-white dark:via-orange-200 dark:to-red-200 bg-clip-text text-transparent">
                    Comandas da Cozinha
                  </h1>
                  <p className="text-xl text-gray-600 dark:text-gray-400 mt-2">
                    Controle de preparo em tempo real
                  </p>
                  <div className="flex items-center mt-3 text-sm text-gray-500 dark:text-gray-400">
                    <Activity className="w-4 h-4 mr-2 text-green-500 animate-pulse" />
                    <span>
                      Última atualização:{" "}
                      {lastUpdate.toLocaleTimeString("pt-BR")}
                    </span>
                  </div>
                </div>
              </div>
            </div>

            <div className="flex flex-wrap gap-3">
              <Button
                variant="ghost"
                icon={<RefreshCw size={18} />}
                onClick={loadAllItens}
                isLoading={loading}
                className="bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm shadow-lg hover:shadow-xl transition-all duration-300 border border-white/20 dark:border-gray-700/50"
              >
                Atualizar
              </Button>
            </div>
          </div>
        </div>

        {/* Dashboard de Estatísticas da Cozinha */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 xl:grid-cols-6 gap-6 mb-8">
          <div className="bg-gradient-to-br from-blue-500 to-blue-600 rounded-3xl shadow-xl p-6 text-white transform hover:scale-105 transition-all duration-300">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-blue-100 text-sm font-medium">Total Itens</p>
                <p className="text-3xl font-bold mt-1">
                  {estatisticas.total_itens}
                </p>
                <p className="text-blue-100 text-xs mt-1">Na cozinha</p>
              </div>
              <div className="p-3 bg-white/20 backdrop-blur-sm rounded-2xl">
                <ClipboardList size={24} />
              </div>
            </div>
          </div>

          <div className="bg-gradient-to-br from-yellow-500 to-amber-600 rounded-3xl shadow-xl p-6 text-white transform hover:scale-105 transition-all duration-300">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-yellow-100 text-sm font-medium">Pendentes</p>
                <p className="text-3xl font-bold mt-1">
                  {estatisticas.itens_pendentes}
                </p>
                <p className="text-yellow-100 text-xs mt-1">Aguardando</p>
              </div>
              <div className="p-3 bg-white/20 backdrop-blur-sm rounded-2xl">
                <Clock size={24} />
              </div>
            </div>
          </div>

          <div className="bg-gradient-to-br from-blue-600 to-indigo-700 rounded-3xl shadow-xl p-6 text-white transform hover:scale-105 transition-all duration-300">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-blue-100 text-sm font-medium">Preparando</p>
                <p className="text-3xl font-bold mt-1">
                  {estatisticas.itens_preparando}
                </p>
                <p className="text-blue-100 text-xs mt-1">Em produção</p>
              </div>
              <div className="p-3 bg-white/20 backdrop-blur-sm rounded-2xl">
                <ChefHat size={24} />
              </div>
            </div>
          </div>

          <div className="bg-gradient-to-br from-green-500 to-emerald-600 rounded-3xl shadow-xl p-6 text-white transform hover:scale-105 transition-all duration-300">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-green-100 text-sm font-medium">Prontos</p>
                <p className="text-3xl font-bold mt-1">
                  {estatisticas.itens_prontos}
                </p>
                <p className="text-green-100 text-xs mt-1">Para entrega</p>
              </div>
              <div className="p-3 bg-white/20 backdrop-blur-sm rounded-2xl">
                <Check size={24} />
              </div>
            </div>
          </div>

          <div className="bg-gradient-to-br from-purple-500 to-purple-600 rounded-3xl shadow-xl p-6 text-white transform hover:scale-105 transition-all duration-300">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-purple-100 text-sm font-medium">
                  Tempo Médio
                </p>
                <p className="text-3xl font-bold mt-1">
                  {estatisticas.tempo_medio_preparo}
                </p>
                <p className="text-purple-100 text-xs mt-1">minutos</p>
              </div>
              <div className="p-3 bg-white/20 backdrop-blur-sm rounded-2xl">
                <Timer size={24} />
              </div>
            </div>
          </div>

          <div className="bg-gradient-to-br from-indigo-500 to-indigo-600 rounded-3xl shadow-xl p-6 text-white transform hover:scale-105 transition-all duration-300">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-indigo-100 text-sm font-medium">
                  Eficiência
                </p>
                <p className="text-3xl font-bold mt-1">
                  {estatisticas.eficiencia}%
                </p>
                <p className="text-indigo-100 text-xs mt-1">Performance</p>
              </div>
              <div className="p-3 bg-white/20 backdrop-blur-sm rounded-2xl">
                <Target size={24} />
              </div>
            </div>
          </div>
        </div>

        {/* Filtros Modernos */}
        <div className="bg-white/90 dark:bg-gray-800/90 backdrop-blur-sm rounded-3xl shadow-xl border border-white/20 dark:border-gray-700/50 p-6 mb-8">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
              <input
                type="text"
                placeholder="Buscar produto, mesa ou cliente..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-4 bg-gray-50/50 dark:bg-gray-700/50 border border-gray-200/50 dark:border-gray-600/50 rounded-2xl focus:ring-2 focus:ring-orange-500 dark:focus:ring-orange-400 focus:border-orange-500 dark:focus:border-orange-400 transition-all duration-200 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400"
              />
            </div>

            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="px-4 py-4 bg-gray-50/50 dark:bg-gray-700/50 border border-gray-200/50 dark:border-gray-600/50 rounded-2xl focus:ring-2 focus:ring-orange-500 dark:focus:ring-orange-400 focus:border-orange-500 dark:focus:border-orange-400 transition-all duration-200 text-gray-900 dark:text-white"
            >
              <option value="ativos">Todos Ativos</option>
              <option value="pendentes">Pendentes</option>
              <option value="preparando">Preparando</option>
              <option value="prontos">Prontos</option>
            </select>

            <select
              value={tipoFilter}
              onChange={(e) => setTipoFilter(e.target.value)}
              className="px-4 py-4 bg-gray-50/50 dark:bg-gray-700/50 border border-gray-200/50 dark:border-gray-600/50 rounded-2xl focus:ring-2 focus:ring-orange-500 dark:focus:ring-orange-400 focus:border-orange-500 dark:focus:border-orange-400 transition-all duration-200 text-gray-900 dark:text-white"
            >
              <option value="todos">Todos os tipos</option>
              <option value="mesas">Mesas</option>
              <option value="pedidos">Pedidos Avulsos</option>
            </select>

            <div className="flex items-center justify-center bg-gradient-to-r from-gray-50 to-gray-100 dark:from-gray-700 dark:to-gray-600 rounded-2xl px-4 py-4">
              <span className="text-lg font-bold text-gray-700 dark:text-gray-300">
                {filteredItens.length}{" "}
                {filteredItens.length === 1 ? "item" : "itens"}
              </span>
            </div>
          </div>
        </div>

        {/* Lista de Itens Modernizada */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {filteredItens.map((item) => (
            <div
              key={item.id}
              className="group bg-white/90 dark:bg-gray-800/90 backdrop-blur-sm rounded-3xl shadow-xl border border-white/20 dark:border-gray-700/50 overflow-hidden hover:shadow-2xl transition-all duration-300 hover:transform hover:scale-105 animate-in slide-in-from-bottom-4 duration-500"
            >
              {/* Header do Card com Status */}
              <div className="relative overflow-hidden">
                <div
                  className={`p-6 bg-gradient-to-r ${getStatusColor(
                    item.status
                  )}`}
                >
                  <div className="absolute top-0 right-0 w-24 h-24 bg-white/10 rounded-full -mr-12 -mt-12"></div>
                  <div className="relative flex justify-between items-start">
                    <div className="flex items-center">
                      <div className="p-3 bg-white/20 backdrop-blur-sm rounded-2xl mr-4">
                        {getTipoOrigemIcon(item)}
                      </div>
                      <div className="text-white">
                        <h3 className="text-lg font-bold">
                          {getTipoOrigemText(item)}
                        </h3>
                        {item.cliente_nome && (
                          <p className="text-sm opacity-90">
                            {item.cliente_nome}
                          </p>
                        )}
                        <div className="flex items-center mt-2">
                          <span
                            className={`px-3 py-1 rounded-full text-xs font-bold bg-white/20 text-white backdrop-blur-sm`}
                          >
                            {item.tipo_origem === "mesa"
                              ? "Mesa"
                              : item.tipo_pedido === "balcao"
                              ? "Balcão"
                              : item.tipo_pedido === "delivery"
                              ? "Delivery"
                              : "Rápido"}
                          </span>
                        </div>
                      </div>
                    </div>
                    <div className="text-right text-white">
                      <div className="flex items-center mb-2">
                        {getStatusIcon(item.status)}
                        <span className="ml-2 text-sm font-bold">
                          {item.status === "pendente"
                            ? "Pendente"
                            : item.status === "preparando"
                            ? "Preparando"
                            : "Pronto"}
                        </span>
                      </div>
                      <p className="text-xs opacity-80">
                        {formatarTempo(item.created_at)}
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Conteúdo do Card */}
              <div className="p-6">
                {/* Produto */}
                <div className="mb-6">
                  <h4 className="text-xl font-bold text-gray-900 dark:text-white mb-2 group-hover:text-orange-600 dark:group-hover:text-orange-400 transition-colors">
                    {item.quantidade}x {item.produto_nome}
                  </h4>
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-sm bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 px-3 py-2 rounded-full font-medium">
                      {item.categoria}
                    </span>
                    <span className="font-bold text-lg text-gray-900 dark:text-white">
                      {formatarDinheiro(item.preco_unitario * item.quantidade)}
                    </span>
                  </div>
                  {item.observacao && (
                    <div className="bg-gradient-to-r from-amber-50 to-yellow-50 dark:from-amber-900/20 dark:to-yellow-900/20 p-4 rounded-2xl border border-amber-200/50 dark:border-amber-700/50">
                      <div className="flex items-start">
                        <Bell className="w-4 h-4 text-amber-600 dark:text-amber-400 mt-0.5 mr-2 flex-shrink-0" />
                        <p className="text-sm text-amber-800 dark:text-amber-200 font-medium italic">
                          "{item.observacao}"
                        </p>
                      </div>
                    </div>
                  )}
                </div>

                {/* Ações */}
                <div className="space-y-3">
                  {item.status === "pendente" && (
                    <Button
                      onClick={() =>
                        atualizarStatusItem(
                          item.id,
                          "preparando",
                          item.tipo_origem
                        )
                      }
                      variant="primary"
                      fullWidth
                      className="bg-gradient-to-r from-blue-500 to-indigo-600 hover:from-blue-600 hover:to-indigo-700 text-white rounded-2xl py-4 font-semibold shadow-lg hover:shadow-xl transition-all duration-200 transform hover:scale-105"
                      icon={<ChefHat size={18} />}
                    >
                      Iniciar Preparo
                    </Button>
                  )}

                  {item.status === "preparando" && (
                    <Button
                      onClick={() =>
                        atualizarStatusItem(item.id, "pronto", item.tipo_origem)
                      }
                      variant="success"
                      fullWidth
                      className="bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700 text-white rounded-2xl py-4 font-semibold shadow-lg hover:shadow-xl transition-all duration-200 transform hover:scale-105"
                      icon={<Check size={18} />}
                    >
                      Marcar como Pronto
                    </Button>
                  )}

                  {item.status === "pronto" && (
                    <div className="text-center">
                      <div className="inline-flex items-center px-6 py-4 bg-gradient-to-r from-green-100 to-emerald-100 dark:from-green-900/30 dark:to-emerald-900/30 text-green-800 dark:text-green-200 rounded-2xl font-bold text-lg shadow-lg animate-pulse">
                        <Check size={20} className="mr-3" />
                        <span>Aguardando Entrega</span>
                      </div>
                    </div>
                  )}
                </div>

                {/* Tempo de Preparo */}
                <div className="mt-4 pt-4 border-t border-gray-200/50 dark:border-gray-700/50">
                  <div className="flex items-center justify-between text-sm">
                    <div className="flex items-center text-gray-500 dark:text-gray-400">
                      <Clock className="w-4 h-4 mr-2" />
                      <span>Tempo decorrido</span>
                    </div>
                    <span className="font-bold text-gray-900 dark:text-white">
                      {formatarTempo(item.created_at)}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>

        {filteredItens.length === 0 && (
          <div className="text-center py-16">
            <div className="relative mb-8">
              <div className="w-32 h-32 bg-gradient-to-br from-gray-100 to-gray-200 dark:from-gray-700 dark:to-gray-600 rounded-full mx-auto flex items-center justify-center shadow-2xl">
                <ChefHat className="w-16 h-16 text-gray-400 dark:text-gray-500" />
              </div>
              <div className="absolute -top-2 -right-2 w-8 h-8 bg-gradient-to-r from-orange-500 to-red-600 rounded-full flex items-center justify-center shadow-lg transform translate-x-16">
                <Sparkles className="w-4 h-4 text-white" />
              </div>
            </div>
            <h3 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">
              {searchTerm || statusFilter !== "ativos" || tipoFilter !== "todos"
                ? "Nenhum item encontrado"
                : "Cozinha em dia!"}
            </h3>
            <p className="text-lg text-gray-600 dark:text-gray-400 mb-8 max-w-md mx-auto">
              {searchTerm || statusFilter !== "ativos" || tipoFilter !== "todos"
                ? "Tente ajustar os filtros de busca para encontrar o que procura"
                : "Não há pedidos pendentes na cozinha no momento. Quando houver novos pedidos, eles aparecerão aqui automaticamente."}
            </p>

            {/* Indicador de Status em Tempo Real */}
            <div className="inline-flex items-center px-6 py-3 bg-gradient-to-r from-green-100 to-emerald-100 dark:from-green-900/30 dark:to-emerald-900/30 rounded-2xl shadow-lg">
              <div className="w-3 h-3 bg-green-500 rounded-full animate-pulse mr-3"></div>
              <span className="text-green-800 dark:text-green-200 font-semibold">
                Sistema em tempo real ativo
              </span>
            </div>
          </div>
        )}

        {/* Indicador de Conexão em Tempo Real */}
        <div className="fixed bottom-6 right-6 z-40">
          <div className="bg-white/95 dark:bg-gray-800/95 backdrop-blur-sm rounded-2xl shadow-xl border border-white/20 dark:border-gray-700/50 px-4 py-3">
            <div className="flex items-center space-x-3">
              <div className="w-3 h-3 bg-green-500 rounded-full animate-pulse"></div>
              <span className="text-sm font-semibold text-gray-700 dark:text-gray-300">
                Tempo Real Ativo
              </span>
              <Activity className="w-4 h-4 text-green-500" />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Comandas;
