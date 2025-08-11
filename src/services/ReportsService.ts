import { supabase } from './supabase';
import CRUDService from './CRUDService';

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
  status: 'critico' | 'baixo' | 'ok';
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
      const { data, error } = await supabase.rpc('get_sales_report', {
        p_restaurante_id: restauranteId,
        p_start_date: startDate,
        p_end_date: endDate
      });

      if (error) throw error;
      return data || [];
    } catch (error) {
      console.error('Error getting sales report:', error);
      return [];
    }
  }

  // Relatório de produtos mais vendidos
  async getProdutosMaisVendidos(
    restauranteId: string,
    days: number = 30
  ): Promise<ProdutoReport[]> {
    try {
      const produtos = await CRUDService.getProdutosMaisVendidos(restauranteId, 10, days);
      const totalVendas = produtos.reduce((acc, p) => acc + p.valor, 0);

      return produtos.map(produto => ({
        ...produto,
        percentual: totalVendas > 0 ? (produto.valor / totalVendas) * 100 : 0
      }));
    } catch (error) {
      console.error('Error getting produtos mais vendidos:', error);
      return [];
    }
  }

  // Relatório de estoque
  async getEstoqueReport(restauranteId: string): Promise<EstoqueReport[]> {
    try {
      const { data, error } = await supabase.rpc('get_stock_alerts', {
        p_restaurante_id: restauranteId
      });

      if (error) throw error;
      return data || [];
    } catch (error) {
      console.error('Error getting stock report:', error);
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
        .from('restaurantes')
        .select('user_id')
        .eq('id', restauranteId)
        .single();

      if (restError) throw restError;

      const { data: companyProfile, error: compError } = await supabase
        .from('company_profiles')
        .select('id')
        .eq('user_id', restaurante.user_id)
        .single();

      if (compError) throw compError;

      // Get employees with waiter role for this company
      const { data: employees, error: empError } = await supabase
        .from('employees')
        .select('id, name')
        .eq('role', 'waiter')
        .eq('active', true)
        .eq('company_id', companyProfile.id);

      if (empError) throw empError;

      // Get sales data for each waiter
      const garcomStats = await Promise.all(
        (employees || []).map(async (employee) => {
          const { data: vendas, error: vendasError } = await supabase
            .from('vendas')
            .select('valor_total, mesa_id')
            .eq('restaurante_id', restauranteId)
            .gte('created_at', startDate)
            .lte('created_at', endDate)
            .eq('status', 'concluida');

          if (vendasError) {
            console.error('Error getting sales for employee:', vendasError);
            return {
              nome: employee.name,
              vendas: 0,
              total: 0,
              mesas: 0,
              percentual: 0
            };
          }

          const totalVendas = (vendas || []).reduce((acc, v) => acc + Number(v.valor_total), 0);
          const mesasAtendidas = new Set((vendas || []).map(v => v.mesa_id)).size;

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
      
      return garcomStats.map(garcom => ({
        ...garcom,
        percentual: totalGeral > 0 ? Math.round((garcom.total / totalGeral) * 100) : 0
      })).sort((a, b) => b.total - a.total);
    } catch (error) {
      console.error('Error getting garcom report:', error);
      return [];
    }
  }

  // Dashboard data
  async getDashboardData(restauranteId: string) {
    try {
      const { data, error } = await supabase.rpc('get_dashboard_data', {
        p_restaurante_id: restauranteId
      });

      if (error) throw error;

      // Get additional data
      const [produtosMaisVendidos, alertasEstoque] = await Promise.all([
        this.getProdutosMaisVendidos(restauranteId, 7),
        this.getEstoqueReport(restauranteId)
      ]);

      return {
        ...data,
        produtosMaisVendidos,
        alertasEstoque
      };
    } catch (error) {
      console.error('Error getting dashboard data:', error);
      return null;
    }
  }

  // Export functions
  async exportToExcel(data: any[], filename: string) {
    // Simulate Excel export
    console.log('Exporting to Excel:', filename, data);
    return Promise.resolve();
  }

  async exportToPDF(data: any[], filename: string) {
    // Simulate PDF export
    console.log('Exporting to PDF:', filename, data);
    return Promise.resolve();
  }
}

export default ReportsService.getInstance();