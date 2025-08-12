import { supabase } from './supabase';
import CaixaService from './CaixaService';
import { Database } from '../types/database';

type Venda = Database['public']['Tables']['vendas']['Row'];

export interface VendaPDV {
  itens: Array<{
    produto_id: string;
    nome: string;
    quantidade: number;
    preco_unitario: number;
    observacao?: string;
  }>;
  valor_total: number;
  forma_pagamento: string;
  desconto?: number;
  taxa_servico?: number;
  cliente?: {
    nome?: string;
    telefone?: string;
    mesa?: number;
  };
}

export interface HistoricoPDV {
  id: string;
  operador_nome: string;
  data_abertura: string;
  data_fechamento?: string;
  valor_inicial: number;
  valor_final?: number;
  valor_sistema: number;
  total_vendas: number;
  quantidade_vendas: number;
  diferenca: number;
  tempo_operacao?: number;
  vendas: Venda[];
}

class PDVService {
  private static instance: PDVService;

  private constructor() {}

  static getInstance(): PDVService {
    if (!PDVService.instance) {
      PDVService.instance = new PDVService();
    }
    return PDVService.instance;
  }

  // Registrar venda no PDV
  async registrarVenda(
    restauranteId: string,
    caixaId: string,
    vendaData: VendaPDV
  ): Promise<Venda> {
    try {
      // Criar registro de venda
      const { data: venda, error: vendaError } = await supabase
        .from('vendas')
        .insert({
          restaurante_id: restauranteId,
          valor_total: vendaData.valor_total,
          forma_pagamento: vendaData.forma_pagamento,
          status: 'concluida',
          usuario_id: (await supabase.auth.getUser()).data.user?.id || ''
        })
        .select()
        .single();

      if (vendaError) throw vendaError;

      // Registrar movimentação no caixa
      await CaixaService.adicionarMovimentacao({
        caixaId,
        tipo: 'entrada',
        valor: vendaData.valor_total,
        motivo: 'Venda PDV',
        observacao: `Venda #${venda.id} - ${vendaData.forma_pagamento}`,
        formaPagamento: vendaData.forma_pagamento,
        usuarioId: (await supabase.auth.getUser()).data.user?.id || ''
      });

      return venda;
    } catch (error) {
      console.error('Error registering PDV sale:', error);
      throw error;
    }
  }

  // Obter histórico de PDV por operador
  async getHistoricoPDVOperador(
    restauranteId: string,
    operadorId: string,
    startDate?: string,
    endDate?: string
  ): Promise<HistoricoPDV[]> {
    try {
      const { data: caixas, error } = await supabase
        .from('caixas_operadores')
        .select(`
          *,
          vendas:vendas!inner(*)
        `)
        .eq('restaurante_id', restauranteId)
        .eq('operador_id', operadorId)
        .gte('data_abertura', startDate || '1900-01-01')
        .lte('data_abertura', endDate || '2100-01-01')
        .order('data_abertura', { ascending: false });

      if (error) throw error;

      const historico: HistoricoPDV[] = (caixas || []).map(caixa => {
        const vendas = caixa.vendas || [];
        const totalVendas = vendas.reduce((acc: number, v: any) => acc + Number(v.valor_total), 0);
        const quantidadeVendas = vendas.length;
        const diferenca = caixa.valor_final ? Number(caixa.valor_final) - Number(caixa.valor_sistema) : 0;
        
        let tempoOperacao;
        if (caixa.data_fechamento) {
          const inicio = new Date(caixa.data_abertura);
          const fim = new Date(caixa.data_fechamento);
          tempoOperacao = (fim.getTime() - inicio.getTime()) / (1000 * 60 * 60); // em horas
        }

        return {
          id: caixa.id,
          operador_nome: caixa.operador_nome,
          data_abertura: caixa.data_abertura,
          data_fechamento: caixa.data_fechamento,
          valor_inicial: Number(caixa.valor_inicial),
          valor_final: caixa.valor_final ? Number(caixa.valor_final) : undefined,
          valor_sistema: Number(caixa.valor_sistema),
          total_vendas: totalVendas,
          quantidade_vendas: quantidadeVendas,
          diferenca,
          tempo_operacao: tempoOperacao,
          vendas
        };
      });

      return historico;
    } catch (error) {
      console.error('Error getting PDV history:', error);
      return [];
    }
  }

  // Obter estatísticas do operador
  async getEstatisticasOperador(
    restauranteId: string,
    operadorId: string,
    periodo: number = 30
  ) {
    try {
      const endDate = new Date().toISOString();
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - periodo);

      const historico = await this.getHistoricoPDVOperador(
        restauranteId,
        operadorId,
        startDate.toISOString(),
        endDate
      );

      const estatisticas = {
        total_sessoes: historico.length,
        sessoes_fechadas: historico.filter(h => h.data_fechamento).length,
        total_vendas: historico.reduce((acc, h) => acc + h.total_vendas, 0),
        quantidade_vendas: historico.reduce((acc, h) => acc + h.quantidade_vendas, 0),
        total_diferencas: historico.reduce((acc, h) => acc + Math.abs(h.diferenca), 0),
        media_tempo_sessao: 0,
        ticket_medio: 0
      };

      // Calcular médias
      const sessoesComTempo = historico.filter(h => h.tempo_operacao);
      if (sessoesComTempo.length > 0) {
        estatisticas.media_tempo_sessao = sessoesComTempo.reduce((acc, h) => acc + (h.tempo_operacao || 0), 0) / sessoesComTempo.length;
      }

      if (estatisticas.quantidade_vendas > 0) {
        estatisticas.ticket_medio = estatisticas.total_vendas / estatisticas.quantidade_vendas;
      }

      return estatisticas;
    } catch (error) {
      console.error('Error getting operator statistics:', error);
      return null;
    }
  }

  // Obter vendas do período atual do PDV
  async getVendasPeriodoAtual(caixaId: string): Promise<Venda[]> {
    try {
      // Buscar vendas que foram registradas durante o período do caixa
      const { data: caixa } = await supabase
        .from('caixas_operadores')
        .select('data_abertura, data_fechamento, restaurante_id')
        .eq('id', caixaId)
        .single();

      if (!caixa) return [];

      let query = supabase
        .from('vendas')
        .select('*')
        .eq('restaurante_id', caixa.restaurante_id)
        .gte('created_at', caixa.data_abertura);

      if (caixa.data_fechamento) {
        query = query.lte('created_at', caixa.data_fechamento);
      }

      const { data: vendas, error } = await query.order('created_at', { ascending: false });

      if (error) throw error;
      return vendas || [];
    } catch (error) {
      console.error('Error getting current period sales:', error);
      return [];
    }
  }
}

export default PDVService.getInstance();