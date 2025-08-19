import { supabase } from './supabase';
import { Database } from '../types/database';

type Tables = Database['public']['Tables'];

export class DatabaseService {
  static supabase = supabase;

  // Mesas
  static async getMesas(restauranteId: string) {
    const { data, error } = await supabase
      .from('mesas')
      .select('*')
      .eq('restaurante_id', restauranteId)
      .order('numero');

    if (error) throw error;
    return data;
  }

  static async createMesa(mesa: Omit<Tables['mesas']['Insert'], 'id' | 'created_at' | 'updated_at'>) {
    const { data, error } = await supabase
      .from('mesas')
      .insert(mesa)
      .select()
      .single();

    if (error) throw error;
    return data;
  }

  static async updateMesa(id: string, updates: Partial<Tables['mesas']['Update']>) {
    const { data, error } = await supabase
      .from('mesas')
      .update({ ...updates, updated_at: new Date().toISOString() })
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;
    return data;
  }

  static async deleteMesa(id: string) {
    const { error } = await supabase
      .from('mesas')
      .delete()
      .eq('id', id);

    if (error) throw error;
  }

  // Produtos
  static async getProdutos(restauranteId: string) {
    const { data, error } = await supabase
      .from('produtos')
      .select('*')
      .eq('restaurante_id', restauranteId)
      .order('nome');

    if (error) throw error;
    return data;
  }

  static async createProduto(produto: Omit<Tables['produtos']['Insert'], 'id' | 'created_at' | 'updated_at'>) {
    const { data, error } = await supabase
      .from('produtos')
      .insert(produto)
      .select()
      .single();

    if (error) throw error;
    return data;
  }

  static async updateProduto(id: string, updates: Partial<Tables['produtos']['Update']>) {
    const { data, error } = await supabase
      .from('produtos')
      .update({ ...updates, updated_at: new Date().toISOString() })
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;
    return data;
  }

  static async deleteProduto(id: string) {
    const { error } = await supabase
      .from('produtos')
      .delete()
      .eq('id', id);

    if (error) throw error;
  }

  // Comandas
  static async getComandas(restauranteId: string) {
    const { data, error } = await supabase
      .from('comandas')
      .select(`
        *,
        mesa:mesas!inner(*),
        itens:itens_comanda(
          *,
          produto:produtos(*)
        )
      `)
      .eq('mesa.restaurante_id', restauranteId)
      .eq('status', 'aberta')
      .order('created_at', { ascending: false });

    if (error) throw error;
    return data;
  }

  static async createComanda(comanda: Omit<Tables['comandas']['Insert'], 'id' | 'created_at' | 'updated_at'>) {
    const { data, error } = await supabase
      .from('comandas')
      .insert(comanda)
      .select()
      .single();

    if (error) throw error;
    return data;
  }

  static async updateComanda(id: string, updates: Partial<Tables['comandas']['Update']>) {
    const { data, error } = await supabase
      .from('comandas')
      .update({ ...updates, updated_at: new Date().toISOString() })
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;
    return data;
  }

  // Itens de Comanda
  static async getItensComanda(comandaId: string) {
    const { data, error } = await supabase
      .from('itens_comanda')
      .select(`
        *,
        produto:produtos(*)
      `)
      .eq('comanda_id', comandaId)
      .order('created_at');

    if (error) throw error;
    return data;
  }

  static async createItemComanda(item: Omit<Tables['itens_comanda']['Insert'], 'id' | 'created_at' | 'updated_at'>) {
    const { data, error } = await supabase
      .from('itens_comanda')
      .insert(item)
      .select()
      .single();

    if (error) throw error;
    return data;
  }

  static async updateItemComanda(id: string, updates: Partial<Tables['itens_comanda']['Update']>) {
    const { data, error } = await supabase
      .from('itens_comanda')
      .update({ ...updates, updated_at: new Date().toISOString() })
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;
    return data;
  }

  static async deleteItemComanda(id: string) {
    const { error } = await supabase
      .from('itens_comanda')
      .delete()
      .eq('id', id);

    if (error) throw error;
  }

  // Caixa
  static async getCaixaAtual(restauranteId: string) {
    const { data, error } = await supabase
      .from('caixas_operadores')
      .select('*')
      .eq('restaurante_id', restauranteId)
      .eq('status', 'aberto')
      .maybeSingle();

    if (error) throw error;
    return data;
  }

  static async createCaixa(caixa: Omit<Tables['caixas_operadores']['Insert'], 'id' | 'created_at' | 'updated_at'>) {
    const { data, error } = await supabase
      .from('caixas_operadores')
      .insert(caixa)
      .select()
      .single();

    if (error) throw error;
    return data;
  }

  static async updateCaixa(id: string, updates: Partial<Tables['caixas_operadores']['Update']>) {
    const { data, error } = await supabase
      .from('caixas_operadores')
      .update({ ...updates, updated_at: new Date().toISOString() })
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;
    return data;
  }

  // Movimentações de Caixa
  static async getMovimentacoesCaixa(caixaId: string) {
    const { data, error } = await supabase
      .from('movimentacoes_caixa')
      .select('*')
      .or(`caixa_id.eq.${caixaId},caixa_operador_id.eq.${caixaId}`)
      .order('created_at');

    if (error) throw error;
    return data || [];
  }

  static async createMovimentacaoCaixa(movimentacao: Omit<Tables['movimentacoes_caixa']['Insert'], 'id' | 'created_at'>) {
    const { data, error } = await supabase
      .from('movimentacoes_caixa')
      .insert(movimentacao)
      .select()
      .single();

    if (error) throw error;
    return data;
  }

  // Vendas
  static async createVenda(venda: Omit<Tables['vendas']['Insert'], 'id' | 'created_at'>) {
    const { data, error } = await supabase
      .from('vendas')
      .insert(venda)
      .select()
      .single();

    if (error) throw error;
    return data;
  }

  static async getVendas(restauranteId: string, startDate?: string, endDate?: string) {
    let query = supabase
      .from('vendas')
      .select('*')
      .eq('restaurante_id', restauranteId)
      .order('created_at', { ascending: false });

    if (startDate) {
      query = query.gte('created_at', startDate);
    }

    if (endDate) {
      query = query.lte('created_at', endDate);
    }

    const { data, error } = await query;

    if (error) throw error;
    return data;
  }

  // Audit Logs
  static async createAuditLog(log: Omit<Tables['audit_logs']['Insert'], 'id' | 'created_at'>) {
    const { error } = await supabase
      .from('audit_logs')
      .insert(log);

    if (error) throw error;
  }

  // Restaurante
  static async getRestaurante(userId: string) {
    const { data, error } = await supabase
      .from('restaurantes')
      .select('*')
      .eq('user_id', userId)
      .maybeSingle();

    if (error) throw error;
    return data;
  }

  static async createRestaurante(restaurante: Omit<Tables['restaurantes']['Insert'], 'id' | 'created_at' | 'updated_at'>) {
    const { data, error } = await supabase
      .from('restaurantes')
      .insert(restaurante)
      .select()
      .single();

    if (error) throw error;
    return data;
  }

  static async updateRestaurante(id: string, updates: Partial<Tables['restaurantes']['Update']>) {
    const { data, error } = await supabase
      .from('restaurantes')
      .update({ ...updates, updated_at: new Date().toISOString() })
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;
    return data;
  }
}
