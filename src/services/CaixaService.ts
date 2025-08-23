import { supabase } from './supabase';
import { Database } from '../types/database';
import { useAuth } from '../contexts/AuthContext';

type CaixaOperador = Database['public']['Tables']['caixas_operadores']['Row'];
type MovimentacaoCaixa = Database['public']['Tables']['movimentacoes_caixa']['Row'];

export interface CaixaOperadorReport {
  operador_id: string;
  operador_nome: string;
  operador_tipo: 'funcionario' | 'usuario';
  total_caixas: number;
  total_entradas: number;
  total_saidas: number;
  total_diferencas: number;
  media_tempo_operacao: number;
}

export interface CaixaDetalhado extends CaixaOperador {
  movimentacoes: MovimentacaoCaixa[];
  entradas_total: number;
  saidas_total: number;
  saldo_calculado: number;
  diferenca: number;
  tempo_operacao_horas?: number;
}

class CaixaService {
  private static instance: CaixaService;

  private constructor() {}

  static getInstance(): CaixaService {
    if (!CaixaService.instance) {
      CaixaService.instance = new CaixaService();
    }
    return CaixaService.instance;
  }

  // Obter caixa aberto atual
  async getCaixaAberto(restauranteId: string, operadorId?: string): Promise<CaixaOperador | null> {
    try {
      let query = supabase
        .from('caixas_operadores')
        .select('*')
        .eq('restaurante_id', restauranteId)
        .eq('status', 'aberto');

      // Se operadorId for fornecido, filtrar por operador específico
      if (operadorId) {
        query = query.eq('operador_id', operadorId);
      }

      const { data, error } = await query.maybeSingle();

      if (error) throw error;
      return data;
    } catch (error) {
      console.error('Error getting open cash register:', error);
      return null;
    }
  }

  // Obter todos os caixas abertos de um restaurante
  async getTodosCaixasAbertos(restauranteId: string): Promise<CaixaOperador[]> {
    try {
      const { data, error } = await supabase
        .from('caixas_operadores')
        .select('*')
        .eq('restaurante_id', restauranteId)
        .eq('status', 'aberto')
        .order('data_abertura', { ascending: false });

      if (error) throw error;
      return data || [];
    } catch (error) {
      console.error('Error getting all open cash registers:', error);
      return [];
    }
  }

  // Verificar se operador tem caixa aberto
  async getOperadorCaixaAberto(operadorId: string): Promise<CaixaOperador | null> {
    try {
      const { data, error } = await supabase
        .from('caixas_operadores')
        .select('*')
        .eq('operador_id', operadorId)
        .eq('status', 'aberto')
        .maybeSingle();

      if (error) throw error;
      return data;
    } catch (error) {
      console.error('Error getting operator cash register:', error);
      return null;
    }
  }

  // Verificar se operador tem caixa aberto
  async getOperadorCaixaAberto(operadorId: string): Promise<CaixaOperador | null> {
    try {
      const { data, error } = await supabase
        .from('caixas_operadores')
        .select('*')
        .eq('operador_id', operadorId)
        .eq('status', 'aberto')
        .maybeSingle();

      if (error) throw error;
      return data;
    } catch (error) {
      console.error('Error getting operator cash register:', error);
      return null;
    }
  }

  // Abrir novo caixa
  async abrirCaixa(data: {
    restauranteId: string;
    operadorId: string;
    operadorNome: string;
    operadorTipo: 'funcionario' | 'usuario';
    valorInicial: number;
  }): Promise<CaixaOperador> {
    try {
      // Verificar se o operador já tem um caixa aberto
      const caixaExistente = await this.getOperadorCaixaAberto(data.operadorId);
      if (caixaExistente) {
        throw new Error('Este operador já possui um caixa aberto');
      }

      const { data: caixa, error } = await supabase
        .from('caixas_operadores')
        .insert({
          restaurante_id: data.restauranteId,
          operador_id: data.operadorId,
          operador_nome: data.operadorNome,
          operador_tipo: data.operadorTipo,
          valor_inicial: data.valorInicial,
          valor_sistema: data.valorInicial
        })
        .select()
        .single();

      if (error) throw error;
      return caixa;
    } catch (error) {
      console.error('Error opening cash register:', error);
      throw error;
    }
  }

  // Fechar caixa
  async fecharCaixa(caixaId: string, valorFinal: number, observacao?: string): Promise<void> {
    try {
      const { error } = await supabase
        .from('caixas_operadores')
        .update({
          valor_final: valorFinal,
          status: 'fechado',
          data_fechamento: new Date().toISOString(),
          observacao,
          updated_at: new Date().toISOString()
        })
        .eq('id', caixaId);

      if (error) throw error;
    } catch (error) {
      console.error('Error closing cash register:', error);
      throw error;
    }
  }

  // Adicionar movimentação
  async adicionarMovimentacao(data: {
    caixaId: string;
    tipo: 'entrada' | 'saida';
    valor: number;
    motivo: string;
    observacao?: string;
    formaPagamento?: string;
    usuarioId: string;
  }): Promise<void> {
    try {
      const { error } = await supabase
        .from('movimentacoes_caixa')
        .insert({
          caixa_operador_id: data.caixaId,
          tipo: data.tipo,
          valor: data.valor,
          motivo: data.motivo,
          observacao: data.observacao,
          forma_pagamento: data.formaPagamento,
          usuario_id: data.usuarioId
        });

      if (error) throw error;

      // Atualizar valor do sistema
      await this.atualizarValorSistema(data.caixaId);
    } catch (error) {
      console.error('Error adding cash movement:', error);
      throw error;
    }
  }

  // Atualizar valor do sistema baseado nas movimentações
  private async atualizarValorSistema(caixaId: string): Promise<void> {
    try {
      // Obter caixa atual
      const { data: caixa, error: caixaError } = await supabase
        .from('caixas_operadores')
        .select('valor_inicial')
        .eq('id', caixaId)
        .single();

      if (caixaError) throw caixaError;

      // Calcular total de movimentações
      const { data: movimentacoes, error: movError } = await supabase
        .from('movimentacoes_caixa')
        .select('tipo, valor')
        .eq('caixa_operador_id', caixaId);

      if (movError) throw movError;

      const totais = (movimentacoes || []).reduce(
        (acc, mov) => {
          if (mov.tipo === 'entrada') {
            acc.entradas += Number(mov.valor);
          } else {
            acc.saidas += Number(mov.valor);
          }
          return acc;
        },
        { entradas: 0, saidas: 0 }
      );

      const valorSistema = Number(caixa.valor_inicial) + totais.entradas - totais.saidas;

      // Atualizar valor do sistema
      const { error: updateError } = await supabase
        .from('caixas_operadores')
        .update({ valor_sistema: valorSistema })
        .eq('id', caixaId);

      if (updateError) throw updateError;
    } catch (error) {
      console.error('Error updating system value:', error);
      throw error;
    }
  }

  // Obter movimentações do caixa
  async getMovimentacoesCaixa(caixaId: string): Promise<MovimentacaoCaixa[]> {
    try {
      // Use explicit query to avoid ambiguous column references
      const { data, error } = await supabase
        .from('movimentacoes_caixa')
        .select(`
          id,
          caixa_id,
          caixa_operador_id,
          tipo,
          valor,
          motivo,
          observacao,
          forma_pagamento,
          usuario_id,
          created_at
        `)
        .eq('caixa_operador_id', caixaId)
        .order('created_at', { ascending: true });

      if (error) throw error;
      return data || [];
    } catch (error) {
      console.error('Error getting cash movements:', error);
      return [];
    }
  }

  // Obter caixas por período
  async getCaixasPorPeriodo(
    restauranteId: string,
    startDate: string,
    endDate: string
  ): Promise<CaixaDetalhado[]> {
    try {
      // Use explicit select to avoid ambiguous column references
      const { data: caixas, error } = await supabase
        .from('caixas_operadores')
        .select(`
          id,
          restaurante_id,
          operador_id,
          operador_nome,
          operador_tipo,
          valor_inicial,
          valor_final,
          valor_sistema,
          status,
          data_abertura,
          data_fechamento,
          observacao,
          created_at,
          updated_at
        `)
        .eq('restaurante_id', restauranteId)
        .gte('data_abertura', startDate)
        .lte('data_abertura', endDate)
        .order('data_abertura', { ascending: false });

      if (error) throw error;

      // Processar dados
      const caixasDetalhados: CaixaDetalhado[] = await Promise.all(
        (caixas || []).map(async (caixa) => {
          // Buscar movimentações separadamente para evitar problemas de join
          const { data: movimentacoes } = await supabase
            .from('movimentacoes_caixa')
            .select('*')
            .eq('caixa_operador_id', caixa.id)
            .order('created_at');
          
          const movs = movimentacoes || [];
          const entradas_total = movs
            .filter((m: any) => m.tipo === 'entrada')
            .reduce((acc: number, m: any) => acc + Number(m.valor), 0);
          const saidas_total = movs
            .filter((m: any) => m.tipo === 'saida')
            .reduce((acc: number, m: any) => acc + Number(m.valor), 0);
        
          const saldo_calculado = Number(caixa.valor_inicial) + entradas_total - saidas_total;
          const diferenca = caixa.valor_final ? Number(caixa.valor_final) - saldo_calculado : 0;
        
          let tempo_operacao_horas;
          if (caixa.data_fechamento) {
            const inicio = new Date(caixa.data_abertura);
            const fim = new Date(caixa.data_fechamento);
            tempo_operacao_horas = (fim.getTime() - inicio.getTime()) / (1000 * 60 * 60);
          }

          return {
            ...caixa,
            movimentacoes: movs,
            entradas_total,
            saidas_total,
            saldo_calculado,
            diferenca,
            tempo_operacao_horas
          };
        })
      );

      return caixasDetalhados;
    } catch (error) {
      console.error('Error getting cash registers by period:', error);
      return [];
    }
  }

  // Obter relatório incluindo usuários administradores
  async getRelatorioCompleto(
    restauranteId: string,
    startDate?: string,
    endDate?: string
  ): Promise<CaixaOperadorReport[]> {
    try {
      // Buscar todos os caixas do período
      const caixas = await this.getCaixasPorPeriodo(
        restauranteId,
        startDate || '1900-01-01',
        endDate || '2100-01-01'
      );

      // Agrupar por operador
      const operadoresMap = new Map();

      caixas.forEach(caixa => {
        const operadorId = caixa.operador_id;
        
        if (!operadoresMap.has(operadorId)) {
          operadoresMap.set(operadorId, {
            operador_id: operadorId,
            operador_nome: caixa.operador_nome,
            operador_tipo: caixa.operador_tipo,
            total_caixas: 0,
            total_entradas: 0,
            total_saidas: 0,
            total_diferencas: 0,
            media_tempo_operacao: 0
          });
        }

        const operador = operadoresMap.get(operadorId);
        operador.total_caixas++;
        operador.total_entradas += caixa.entradas_total;
        operador.total_saidas += caixa.saidas_total;
        operador.total_diferencas += Math.abs(caixa.diferenca);
        
        if (caixa.tempo_operacao_horas) {
          operador.media_tempo_operacao += caixa.tempo_operacao_horas;
        }
      });

      // Calcular médias
      const resultado = Array.from(operadoresMap.values()).map(operador => ({
        ...operador,
        media_tempo_operacao: operador.total_caixas > 0 
          ? operador.media_tempo_operacao / operador.total_caixas 
          : 0
      }));

      return resultado.sort((a, b) => b.total_entradas - a.total_entradas);
    } catch (error) {
      console.error('Error getting complete report:', error);
      return [];
    }
  }

  // Obter relatório por operador
  async getRelatorioOperadores(
    restauranteId: string,
    startDate?: string,
    endDate?: string
  ): Promise<CaixaOperadorReport[]> {
    try {
      const { data, error } = await supabase.rpc('get_caixa_operador_report', {
        p_restaurante_id: restauranteId,
        p_start_date: startDate || null,
        p_end_date: endDate || null
      });

      if (error) throw error;
      return data || [];
    } catch (error) {
      console.error('Error getting operator report:', error);
      return [];
    }
  }

  // Obter estatísticas do operador
  async getEstatisticasOperador(
    restauranteId: string,
    operadorId: string,
    startDate?: string,
    endDate?: string
  ) {
    try {
      const { data: caixas, error } = await supabase
        .from('caixas_operadores')
        .select(`
          *,
          movimentacoes:movimentacoes_caixa(*)
        `)
        .eq('restaurante_id', restauranteId)
        .eq('operador_id', operadorId)
        .gte('data_abertura', startDate || '1900-01-01')
        .lte('data_abertura', endDate || '2100-01-01')
        .order('data_abertura', { ascending: false });

      if (error) throw error;

      const estatisticas = {
        total_caixas: caixas?.length || 0,
        caixas_fechados: caixas?.filter(c => c.status === 'fechado').length || 0,
        total_entradas: 0,
        total_saidas: 0,
        total_diferencas: 0,
        media_tempo_operacao: 0,
        maior_diferenca: 0,
        menor_diferenca: 0
      };

      if (caixas && caixas.length > 0) {
        let tempoTotal = 0;
        let caixasComTempo = 0;
        let diferencas: number[] = [];

        caixas.forEach(caixa => {
          const movimentacoes = caixa.movimentacoes || [];
          const entradas = movimentacoes
            .filter((m: any) => m.tipo === 'entrada')
            .reduce((acc: number, m: any) => acc + Number(m.valor), 0);
          const saidas = movimentacoes
            .filter((m: any) => m.tipo === 'saida')
            .reduce((acc: number, m: any) => acc + Number(m.valor), 0);
          
          estatisticas.total_entradas += entradas;
          estatisticas.total_saidas += saidas;

          if (caixa.valor_final) {
            const saldoCalculado = Number(caixa.valor_inicial) + entradas - saidas;
            const diferenca = Number(caixa.valor_final) - saldoCalculado;
            estatisticas.total_diferencas += diferenca;
            diferencas.push(diferenca);
          }

          if (caixa.data_fechamento) {
            const tempo = (new Date(caixa.data_fechamento).getTime() - new Date(caixa.data_abertura).getTime()) / (1000 * 60 * 60);
            tempoTotal += tempo;
            caixasComTempo++;
          }
        });

        if (caixasComTempo > 0) {
          estatisticas.media_tempo_operacao = tempoTotal / caixasComTempo;
        }

        if (diferencas.length > 0) {
          estatisticas.maior_diferenca = Math.max(...diferencas);
          estatisticas.menor_diferenca = Math.min(...diferencas);
        }
      }

      return estatisticas;
    } catch (error) {
      console.error('Error getting operator statistics:', error);
      return null;
    }
  }
}

export default CaixaService.getInstance();