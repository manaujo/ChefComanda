import { supabase } from './supabase';
import { Database } from '../types/database';

type Tables = Database['public']['Tables'];

export class CRUDService {
  // Generic CRUD operations
  static async create<T extends keyof Tables>(
    table: T,
    data: Tables[T]['Insert']
  ): Promise<Tables[T]['Row']> {
    const { data: result, error } = await supabase
      .from(table)
      .insert(data)
      .select()
      .single();

    if (error) throw error;
    return result;
  }

  static async read<T extends keyof Tables>(
    table: T,
    filters?: Partial<Tables[T]['Row']>
  ): Promise<Tables[T]['Row'][]> {
    let query = supabase.from(table).select('*');

    if (filters) {
      Object.entries(filters).forEach(([key, value]) => {
        if (value !== undefined) {
          query = query.eq(key, value);
        }
      });
    }

    const { data, error } = await query;
    if (error) throw error;
    return data || [];
  }

  static async update<T extends keyof Tables>(
    table: T,
    id: string,
    data: Tables[T]['Update']
  ): Promise<Tables[T]['Row']> {
    const { data: result, error } = await supabase
      .from(table)
      .update({ ...data, updated_at: new Date().toISOString() })
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;
    return result;
  }

  static async delete<T extends keyof Tables>(
    table: T,
    id: string
  ): Promise<void> {
    const { error } = await supabase
      .from(table)
      .delete()
      .eq('id', id);

    if (error) throw error;
  }

  // Specific business logic methods

  // Mesas
  static async getMesasByRestaurante(restauranteId: string) {
    const { data, error } = await supabase
      .from('mesas')
      .select('*')
      .eq('restaurante_id', restauranteId)
      .order('numero');

    if (error) throw error;
    return data || [];
  }

  static async updateMesaStatus(
    mesaId: string, 
    status: 'livre' | 'ocupada' | 'aguardando',
    additionalData?: Partial<Tables['mesas']['Update']>
  ) {
    return this.update('mesas', mesaId, { 
      status, 
      ...additionalData 
    });
  }

  // Produtos
  static async getProdutosByRestaurante(restauranteId: string) {
    const { data, error } = await supabase
      .from('produtos')
      .select('*')
      .eq('restaurante_id', restauranteId)
      .order('nome');

    if (error) throw error;
    return data || [];
  }

  static async getProdutosByCategoria(restauranteId: string, categoria: string) {
    const { data, error } = await supabase
      .from('produtos')
      .select('*')
      .eq('restaurante_id', restauranteId)
      .eq('categoria', categoria)
      .eq('disponivel', true);

    if (error) throw error;
    return data || [];
  }

  // Comandas
  static async getComandasByMesa(mesaId: string) {
    const { data, error } = await supabase
      .from('comandas')
      .select(`
        *,
        itens:itens_comanda(
          *,
          produto:produtos(*)
        )
      `)
      .eq('mesa_id', mesaId)
      .order('created_at', { ascending: false });

    if (error) throw error;
    return data || [];
  }

  static async getComandaAberta(mesaId: string) {
    const { data, error } = await supabase
      .from('comandas')
      .select('*')
      .eq('mesa_id', mesaId)
      .eq('status', 'aberta')
      .maybeSingle();

    if (error) throw error;
    return data;
  }

  // Itens Comanda
  static async getItensByComanda(comandaId: string) {
    const { data, error } = await supabase
      .from('itens_comanda')
      .select(`
        *,
        produto:produtos(*)
      `)
      .eq('comanda_id', comandaId)
      .order('created_at');

    if (error) throw error;
    return data || [];
  }

  static async updateItemStatus(
    itemId: string, 
    status: 'pendente' | 'preparando' | 'pronto' | 'entregue' | 'cancelado'
  ) {
    return this.update('itens_comanda', itemId, { status });
  }

  // Vendas
  static async getVendasByPeriodo(
    restauranteId: string,
    startDate: string,
    endDate: string
  ) {
    const { data, error } = await supabase
      .from('vendas')
      .select('*')
      .eq('restaurante_id', restauranteId)
      .gte('created_at', startDate)
      .lte('created_at', endDate)
      .eq('status', 'concluida')
      .order('created_at', { ascending: false });

    if (error) throw error;
    return data || [];
  }

  static async getVendasDashboard(restauranteId: string) {
    const hoje = new Date().toISOString().split('T')[0];
    const inicioMes = new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString();
    
    const [vendasHoje, vendasMes] = await Promise.all([
      this.getVendasByPeriodo(restauranteId, hoje, hoje),
      this.getVendasByPeriodo(restauranteId, inicioMes, new Date().toISOString())
    ]);

    return {
      vendasHoje: vendasHoje.reduce((acc, v) => acc + Number(v.valor_total), 0),
      vendasMes: vendasMes.reduce((acc, v) => acc + Number(v.valor_total), 0),
      pedidosHoje: vendasHoje.length,
      pedidosMes: vendasMes.length
    };
  }

  // Estoque
  static async getEstoqueBaixo(restauranteId: string) {
    const { data, error } = await supabase
      .from('insumos')
      .select('*')
      .eq('restaurante_id', restauranteId)
      .eq('ativo', true)
      .order('quantidade');

    if (error) throw error;
    
    return (data || []).filter(insumo => 
      Number(insumo.quantidade) <= Number(insumo.quantidade_minima)
    );
  }

  // Produtos mais vendidos
  static async getProdutosMaisVendidos(
    restauranteId: string,
    limit: number = 10,
    days: number = 30
  ) {
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    const { data, error } = await supabase
      .from('itens_comanda')
      .select(`
        produto_id,
        quantidade,
        preco_unitario,
        produto:produtos!inner(nome, categoria, preco),
        comanda:comandas!inner(
          mesa:mesas!inner(
            restaurante_id
          )
        )
      `)
      .eq('comanda.mesa.restaurante_id', restauranteId)
      .gte('created_at', startDate.toISOString())
      .limit(1000); // Limit to prevent large queries

    if (error) throw error;

    // Filter by restaurant and aggregate
    const produtoStats = new Map();
    
    (data || []).forEach((item: any) => {
      const produtoId = item.produto_id;
      const produto = item.produto;
      
      if (!produtoStats.has(produtoId)) {
        produtoStats.set(produtoId, {
          id: produtoId,
          nome: produto.nome,
          categoria: produto.categoria,
          quantidade: 0,
          valor: 0
        });
      }
      
      const stats = produtoStats.get(produtoId);
      stats.quantidade += item.quantidade;
      stats.valor += item.quantidade * Number(item.preco_unitario);
    });

    return Array.from(produtoStats.values())
      .sort((a, b) => b.quantidade - a.quantidade)
      .slice(0, limit);
  }

  // Caixa
  static async getCaixaAberto(restauranteId: string) {
    const { data, error } = await supabase
      .from('caixas')
      .select('*')
      .eq('restaurante_id', restauranteId)
      .eq('status', 'aberto')
      .maybeSingle();

    if (error) throw error;
    return data;
  }

  static async getMovimentacoesCaixa(caixaId: string) {
    return this.read('movimentacoes_caixa', { caixa_id: caixaId });
  }

  // Funcionários
  static async getEmployeesByCompany(companyId: string) {
    const { data, error } = await supabase
      .from('employees')
      .select(`
        *,
        employee_auth!left(id)
      `)
      .eq('company_id', companyId)
      .order('name');

    if (error) throw error;
    
    return (data || []).map(emp => ({
      ...emp,
      has_auth: !!emp.employee_auth?.id
    }));
  }

  // Notificações
  static async getNotificationsByUser(userId: string, limit: number = 50) {
    const { data, error } = await supabase
      .from('notifications')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(limit);

    if (error) throw error;
    return data || [];
  }

  static async markNotificationAsRead(notificationId: string) {
    return this.update('notifications', notificationId, { read: true });
  }

  // Cardápio Online
  static async getCardapioOnline(restauranteId: string) {
    const { data, error } = await supabase
      .from('cardapio_online')
      .select('*')
      .eq('restaurante_id', restauranteId)
      .order('ordem');

    if (error) throw error;
    return data || [];
  }

  static async getCardapioPublico(restauranteId: string) {
    const { data, error } = await supabase
      .from('cardapio_online')
      .select('*')
      .eq('restaurante_id', restauranteId)
      .eq('ativo', true)
      .eq('disponivel_online', true)
      .order('ordem');

    if (error) throw error;
    return data || [];
  }

  // Categorias
  static async getCategoriasByRestaurante(restauranteId: string) {
    const { data, error } = await supabase
      .from('categorias')
      .select('*')
      .eq('restaurante_id', restauranteId)
      .order('nome');

    if (error) throw error;
    return data || [];
  }

  // Relatórios
  static async getRelatorioVendas(
    restauranteId: string,
    startDate: string,
    endDate: string
  ) {
    const { data, error } = await supabase.rpc('get_sales_report', {
      p_restaurante_id: restauranteId,
      p_start_date: startDate,
      p_end_date: endDate
    });

    if (error) throw error;
    return data || [];
  }

  static async getAlertasEstoque(restauranteId: string) {
    const { data, error } = await supabase.rpc('get_stock_alerts', {
      p_restaurante_id: restauranteId
    });

    if (error) throw error;
    return data || [];
  }

  // Audit Logs
  static async getAuditLogs(
    userId: string,
    filters?: {
      actionType?: string;
      startDate?: string;
      endDate?: string;
      entityType?: string;
    },
    page: number = 1,
    limit: number = 50
  ) {
    let query = supabase
      .from('audit_logs')
      .select('*', { count: 'exact' });

    // Apply filters
    if (filters?.actionType && filters.actionType !== 'all') {
      query = query.eq('action_type', filters.actionType);
    }
    
    if (filters?.startDate) {
      query = query.gte('created_at', filters.startDate);
    }
    
    if (filters?.endDate) {
      query = query.lte('created_at', filters.endDate);
    }

    if (filters?.entityType) {
      query = query.eq('entity_type', filters.entityType);
    }

    // Add pagination
    const from = (page - 1) * limit;
    const to = from + limit - 1;
    
    const { data, count, error } = await query
      .order('created_at', { ascending: false })
      .range(from, to);

    if (error) throw error;

    return {
      data: data || [],
      count: count || 0,
      totalPages: Math.ceil((count || 0) / limit)
    };
  }
}

export default CRUDService;