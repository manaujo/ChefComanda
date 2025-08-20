import { supabase } from "./supabase";
import CRUDService from "./CRUDService";

export interface VendaReport {
  data: string;
  total_vendas: number;
  quantidade_pedidos: number;
  ticket_medio: number;
}

export interface ProdutoReport {
  nome: string;
  categoria: string;
  quantidade: number;
  valor: number;
  percentual: number;
}

export interface EstoqueReport {
  id: string;
  nome: string;
  quantidade_atual: number;
  quantidade_minima: number;
  unidade_medida: string;
  status: "critico" | "baixo" | "ok";
  data_validade?: string;
}

export interface GarcomReport {
  nome: string;
  vendas: number;
  total: number;
  mesas: number;
  percentual: number;
}

class ReportsService {
  private static instance: ReportsService;

  private constructor() {}

  static getInstance(): ReportsService {
    if (!ReportsService.instance) {
      ReportsService.instance = new ReportsService();
    }
    return ReportsService.instance;
  }

  // Relatório de vendas por período
  async getVendasReport(
    restauranteId: string,
    startDate: string,
    endDate: string
  ): Promise<VendaReport[]> {
    try {
      // Ajustar datas para timezone do Brasil
      const adjustedStartDate = new Date(startDate);
      const adjustedEndDate = new Date(endDate);
      
      // Garantir que estamos usando o timezone correto
      const startDateBR = new Date(adjustedStartDate.getTime() - (adjustedStartDate.getTimezoneOffset() * 60000));
      const endDateBR = new Date(adjustedEndDate.getTime() - (adjustedEndDate.getTimezoneOffset() * 60000));
      
      // Get sales data directly from vendas table with proper date filtering
      const { data: vendas, error } = await supabase
        .from("vendas")
        .select("*")
        .eq("restaurante_id", restauranteId)
        .eq("status", "concluida")
        .gte("created_at", startDateBR.toISOString())
        .lt("created_at", endDateBR.toISOString())
        .order("created_at", { ascending: false });

      if (error) throw error;

      // Group by date and calculate metrics
      const salesByDate = new Map<string, { total: number; count: number }>();

      (vendas || []).forEach((venda) => {
        // Usar timezone do Brasil para agrupar por data
        const vendaDate = new Date(venda.created_at);
        const date = new Date(vendaDate.getTime() - (vendaDate.getTimezoneOffset() * 60000))
          .toISOString().split("T")[0];
        const existing = salesByDate.get(date) || { total: 0, count: 0 };
        existing.total += Number(venda.valor_total);
        existing.count += 1;
        salesByDate.set(date, existing);
      });

      // Fill in missing dates with zero values
      const today = new Date(new Date().getTime() - (new Date().getTimezoneOffset() * 60000));
      for (let i = 0; i < 7; i++) {
        const date = new Date(today);
        date.setDate(date.getDate() - i);
        const dateStr = date.toISOString().split("T")[0];
        
        if (!salesByDate.has(dateStr)) {
          salesByDate.set(dateStr, { total: 0, count: 0 });
        }
      }
      
      // Convert to report format
      const report: VendaReport[] = Array.from(salesByDate.entries()).map(
        ([date, data]) => ({
          data: date,
          total_vendas: data.total,
          quantidade_pedidos: data.count,
          ticket_medio: data.count > 0 ? data.total / data.count : 0
        })
      );

      return report.sort(
        (a, b) => new Date(b.data).getTime() - new Date(a.data).getTime()
      ).slice(0, 7); // Limit to last 7 days
    } catch (error) {
      console.error("Error getting sales report:", error);
      return [];
    }
  }

  // Relatório de produtos mais vendidos
  async getProdutosMaisVendidos(
    restauranteId: string,
    days: number = 30
  ): Promise<ProdutoReport[]> {
    try {
      const produtos = await CRUDService.getProdutosMaisVendidos(
        restauranteId,
        10,
        days
      );
      const totalVendas = produtos.reduce((acc, p) => acc + p.valor, 0);

      return produtos.map((produto) => ({
        ...produto,
        percentual: totalVendas > 0 ? (produto.valor / totalVendas) * 100 : 0
      }));
    } catch (error) {
      console.error("Error getting produtos mais vendidos:", error);
      return [];
    }
  }

  // Relatório de estoque
  async getEstoqueReport(restauranteId: string): Promise<EstoqueReport[]> {
    try {
      const { data, error } = await supabase.rpc("get_stock_alerts", {
        p_restaurante_id: restauranteId
      });

      if (error) throw error;
      return data || [];
    } catch (error) {
      console.error("Error getting stock report:", error);
      return [];
    }
  }

  // Relatório de desempenho de garçons
  async getGarcomReport(
    restauranteId: string,
    startDate: string,
    endDate: string
  ): Promise<GarcomReport[]> {
    try {
      // Get company profile for this restaurant's user
      const { data: restaurante, error: restError } = await supabase
        .from("restaurantes")
        .select("user_id")
        .eq("id", restauranteId)
        .single();

      if (restError) throw restError;

      const { data: companyProfile, error: compError } = await supabase
        .from("company_profiles")
        .select("id")
        .eq("user_id", restaurante.user_id)
        .single();

      if (compError) throw compError;

      // Get employees with waiter role for this company
      const { data: employees, error: empError } = await supabase
        .from("employees")
        .select("id, name")
        .eq("role", "waiter")
        .eq("active", true)
        .eq("company_id", companyProfile.id);

      if (empError) throw empError;

      // Get sales data for each waiter
      const garcomStats = await Promise.all(
        (employees || []).map(async (employee) => {
          const { data: vendas, error: vendasError } = await supabase
            .from("vendas")
            .select("valor_total, mesa_id")
            .eq("restaurante_id", restauranteId)
            .gte("created_at", startDate)
            .lte("created_at", endDate)
            .eq("status", "concluida");

          if (vendasError) {
            console.error("Error getting sales for employee:", vendasError);
            return {
              nome: employee.name,
              vendas: 0,
              total: 0,
              mesas: 0,
              percentual: 0
            };
          }

          const totalVendas = (vendas || []).reduce(
            (acc, v) => acc + Number(v.valor_total),
            0
          );
          const mesasAtendidas = new Set((vendas || []).map((v) => v.mesa_id))
            .size;

          return {
            nome: employee.name,
            vendas: vendas?.length || 0,
            total: totalVendas,
            mesas: mesasAtendidas,
            percentual: 0 // Will be calculated below
          };
        })
      );

      // Calculate percentages
      const totalGeral = garcomStats.reduce((acc, g) => acc + g.total, 0);

      return garcomStats
        .map((garcom) => ({
          ...garcom,
          percentual:
            totalGeral > 0 ? Math.round((garcom.total / totalGeral) * 100) : 0
        }))
        .sort((a, b) => b.total - a.total);
    } catch (error) {
      console.error("Error getting garcom report:", error);
      return [];
    }
  }

  // Dashboard data
  async getDashboardData(restauranteId: string) {
    try {
      // Calculate dashboard metrics directly
      const hoje = new Date().toISOString().split("T")[0];
      const inicioMes = new Date(
        new Date().getFullYear(),
        new Date().getMonth(),
        1
      ).toISOString();
      const agora = new Date().toISOString();

      // Vendas de hoje
      const { data: vendasHoje, error: vendasHojeError } = await supabase
        .from("vendas")
        .select("valor_total")
        .eq("restaurante_id", restauranteId)
        .eq("status", "concluida")
        .gte("created_at", hoje)
        .lte("created_at", agora);

      if (vendasHojeError) throw vendasHojeError;

      // Vendas do mês
      const { data: vendasMes, error: vendasMesError } = await supabase
        .from("vendas")
        .select("valor_total")
        .eq("restaurante_id", restauranteId)
        .eq("status", "concluida")
        .gte("created_at", inicioMes)
        .lte("created_at", agora);

      if (vendasMesError) throw vendasMesError;

      // Mesas ocupadas
      const { data: mesasOcupadas, error: mesasError } = await supabase
        .from("mesas")
        .select("id")
        .eq("restaurante_id", restauranteId)
        .eq("status", "ocupada");

      if (mesasError) throw mesasError;

      // Comandas abertas
      const { data: comandasAbertas, error: comandasError } = await supabase
        .from("comandas")
        .select("id, mesa_id!inner(restaurante_id)")
        .eq("mesa_id.restaurante_id", restauranteId)
        .eq("status", "aberta");

      if (comandasError) throw comandasError;

      const totalVendasHoje = (vendasHoje || []).reduce(
        (acc, v) => acc + Number(v.valor_total),
        0
      );
      const totalVendasMes = (vendasMes || []).reduce(
        (acc, v) => acc + Number(v.valor_total),
        0
      );
      const pedidosHoje = vendasHoje?.length || 0;
      const pedidosMes = vendasMes?.length || 0;
      const ticketMedio = pedidosHoje > 0 ? totalVendasHoje / pedidosHoje : 0;

      const dashboardData = {
        vendas_hoje: totalVendasHoje,
        vendas_mes: totalVendasMes,
        pedidos_hoje: pedidosHoje,
        pedidos_mes: pedidosMes,
        mesas_ocupadas: mesasOcupadas?.length || 0,
        comandas_abertas: comandasAbertas?.length || 0,
        ticket_medio: ticketMedio
      };

      // Get additional data
      const [produtosMaisVendidos, alertasEstoque] = await Promise.all([
        this.getProdutosMaisVendidos(restauranteId, 7),
        this.getEstoqueReport(restauranteId)
      ]);

      return {
        ...dashboardData,
        produtosMaisVendidos,
        alertasEstoque
      };
    } catch (error) {
      console.error("Error getting dashboard data:", error);
      return null;
    }
  }

  // Export functions
  async exportToExcel(data: any[], filename: string) {
    // Simulate Excel export
    console.log("Exporting to Excel:", filename, data);
    return Promise.resolve();
  }

  async exportToPDF(data: any[], filename: string) {
    // Simulate PDF export
    console.log("Exporting to PDF:", filename, data);
    return Promise.resolve();
  }
}

export default ReportsService.getInstance();
