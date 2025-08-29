import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { supabase } from '../services/supabase';
import { DatabaseService } from '../services/database';
import CRUDService from '../services/CRUDService';
import ReportsService from '../services/ReportsService';
import { Database } from '../types/database';
import toast from 'react-hot-toast';
import { useAuth } from './AuthContext';

type Mesa = Database['public']['Tables']['mesas']['Row'];
type Produto = Database['public']['Tables']['produtos']['Row'];
type Comanda = Database['public']['Tables']['comandas']['Row'];
type ItemComanda = Database['public']['Tables']['itens_comanda']['Row'];
type Categoria = Database['public']['Tables']['categorias']['Row'];

interface ComandaItemData {
  id: string;
  mesa_id: string;
  comanda_id: string;
  produto_id: string;
  quantidade: number;
  preco_unitario: number;
  observacao?: string;
  status: 'pendente' | 'preparando' | 'pronto' | 'entregue' | 'cancelado';
  created_at: string;
  nome: string;
  categoria: string;
  preco: number;
}

interface Funcionario {
  id: string;
  name: string;
  role: string;
  active: boolean;
}

interface Restaurante {
  id: string;
  user_id: string;
  nome: string;
  telefone: string;
  created_at: string;
  updated_at: string;
}

interface RestauranteContextType {
  restaurante: Restaurante | null;
  mesas: Mesa[];
  produtos: Produto[];
  categorias: Categoria[];
  comandas: Comanda[];
  itensComanda: ComandaItemData[];
  funcionarios: Funcionario[];
  loading: boolean;
  error: string | null;
  
  // Mesa functions
  adicionarMesa: (mesa: { numero: number; capacidade: number; garcom?: string }) => Promise<void>;
  ocuparMesa: (mesaId: string) => Promise<void>;
  liberarMesa: (mesaId: string) => Promise<void>;
  excluirMesa: (mesaId: string) => Promise<void>;
  
  // Comanda functions
  criarComanda: (mesaId: string) => Promise<string>;
  adicionarItemComanda: (item: { comandaId: string; produtoId: string; quantidade: number; observacao?: string }) => Promise<void>;
  removerItemComanda: (itemId: string) => Promise<void>;
  atualizarStatusItem: (itemId: string, status: 'preparando' | 'pronto') => Promise<void>;
  finalizarPagamento: (mesaId: string, formaPagamento: string) => Promise<void>;
  
  // Produto functions
  adicionarProduto: (produto: any) => Promise<void>;
  atualizarProduto: (id: string, produto: any) => Promise<void>;
  excluirProduto: (id: string) => Promise<void>;
  atualizarRestaurante: (dados: any) => Promise<void>;
  
  // Data functions
  refreshData: () => Promise<void>;
  getDashboardData: () => Promise<any>;
  getVendasData: () => Promise<any[]>;
}

const RestauranteContext = createContext<RestauranteContextType | undefined>(undefined);

interface RestauranteProviderProps {
  children: ReactNode;
}

export const RestauranteProvider: React.FC<RestauranteProviderProps> = ({ children }) => {
  const { user, isEmployee, restaurantId: authRestaurantId } = useAuth();
  const [restaurante, setRestaurante] = useState<Restaurante | null>(null);
  const [mesas, setMesas] = useState<Mesa[]>([]);
  const [produtos, setProdutos] = useState<Produto[]>([]);
  const [categorias, setCategorias] = useState<Categoria[]>([]);
  const [comandas, setComandas] = useState<Comanda[]>([]);
  const [itensComanda, setItensComanda] = useState<ComandaItemData[]>([]);
  const [funcionarios, setFuncionarios] = useState<Funcionario[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [dataLoaded, setDataLoaded] = useState(false);

  useEffect(() => {
    if (user && !dataLoaded) {
      refreshData();
    }
  }, [user, dataLoaded]);

  const refreshData = async () => {
    if (!user) return;
    
    try {
      setLoading(true);
      setError(null);
      
      let restauranteData: Restaurante | null = null;
      
      if (isEmployee && authRestaurantId) {
        // Se é funcionário, usar o restaurante do contexto de auth
        const { data, error } = await supabase
          .from('restaurantes')
          .select('*')
          .eq('id', authRestaurantId)
          .single();
        
        if (error) throw error;
        restauranteData = data;
      } else {
        // Load or create restaurant for owner
        restauranteData = await DatabaseService.getRestaurante(user.id);
        
        if (!restauranteData) {
          // Create restaurant if it doesn't exist
          console.log("Creating restaurant for user:", user.id);
          restauranteData = await DatabaseService.createRestaurante({
            user_id: user.id,
            nome: `Restaurante de ${user.user_metadata?.name || 'Usuário'}`,
            telefone: ""
          });
          console.log("Restaurant created:", restauranteData.id);
        }
      }
      
      setRestaurante(restauranteData);
      
      // Load all related data
      const [mesasData, produtosData, categoriasData, comandasData] = await Promise.all([
        DatabaseService.getMesas(restauranteData.id),
        DatabaseService.getProdutos(restauranteData.id),
        CRUDService.getCategoriasByRestaurante(restauranteData.id),
        DatabaseService.getComandas(restauranteData.id)
      ]);
      
      setMesas(mesasData || []);
      setProdutos(produtosData || []);
      setCategorias(categoriasData || []);
      setComandas(comandasData || []);
      
      // Load itens comanda with product details
      await loadItensComanda(restauranteData.id);
      
      // Load funcionarios
      await loadFuncionarios();
      
      setDataLoaded(true);
    } catch (err) {
      console.error('Error refreshing data:', err);
      setError(err instanceof Error ? err.message : 'Erro ao carregar dados');
    } finally {
      setLoading(false);
    }
  };

  const loadItensComanda = async (restauranteId: string) => {
    try {
      const { data, error } = await supabase
        .from('itens_comanda')
        .select(`
          *,
          comanda:comandas!inner(
            mesa_id,
            mesa:mesas!inner(
              restaurante_id,
              numero
            )
          ),
          produto:produtos!inner(nome, categoria, preco)
        `)
        .eq('comanda.mesa.restaurante_id', restauranteId)
        .order('created_at', { ascending: false });

      if (error) throw error;

      const formattedItens: ComandaItemData[] = (data || []).map((item: any) => ({
        id: item.id,
        mesa_id: item.comanda.mesa_id,
        comanda_id: item.comanda_id,
        produto_id: item.produto_id,
        quantidade: item.quantidade,
        preco_unitario: item.preco_unitario,
        observacao: item.observacao,
        status: item.status,
        created_at: item.created_at,
        nome: item.produto.nome,
        categoria: item.produto.categoria,
        preco: item.produto.preco
      }));

      setItensComanda(formattedItens);
    } catch (error) {
      console.error('Error loading itens comanda:', error);
    }
  };

  const loadFuncionarios = async () => {
    try {
      if (!user) return;

      let companyData = null;
      
      if (isEmployee && authRestaurantId) {
        // Se é funcionário, buscar empresa através do restaurante
        const { data: restauranteData } = await supabase
          .from('restaurantes')
          .select('user_id')
          .eq('id', authRestaurantId)
          .single();
        
        if (restauranteData) {
          const { data: company } = await supabase
            .from('company_profiles')
            .select('id')
            .eq('user_id', restauranteData.user_id)
            .maybeSingle();
          companyData = company;
        }
      } else {
        // Se é proprietário, buscar empresa diretamente
        const { data: company } = await supabase
          .from('company_profiles')
          .select('id')
          .eq('user_id', user.id)
          .maybeSingle();
        companyData = company;
      }

      if (companyData) {
        const { data: funcionariosData, error } = await supabase
          .from('employees')
          .select(`
            *,
            employee_auth!left(id)
          `)
          .eq('company_id', companyData.id)
          .order('name');

        if (error) throw error;
        
        const formattedFuncionarios = (funcionariosData || []).map(emp => ({
          ...emp,
          has_auth: !!emp.employee_auth?.id
        }));
        
        setFuncionarios(formattedFuncionarios || []);
      }
    } catch (error) {
      console.error('Error loading funcionarios:', error);
      setFuncionarios([]);
    }
  };

  // Mesa functions
  const adicionarMesa = async (mesaData: { numero: number; capacidade: number; garcom?: string }) => {
    if (!restaurante) throw new Error('Restaurante não encontrado');
    
    try {
      const novaMesa = await DatabaseService.createMesa({
        restaurante_id: restaurante.id,
        numero: mesaData.numero,
        capacidade: mesaData.capacidade,
        garcom: mesaData.garcom || null,
        status: 'livre',
        valor_total: 0
      });
      
      setMesas(prev => [...prev, novaMesa]);
      toast.success('Mesa adicionada com sucesso!');
    } catch (error) {
      console.error('Error adding mesa:', error);
      toast.error('Erro ao adicionar mesa');
      throw error;
    }
  };

  const ocuparMesa = async (mesaId: string) => {
    try {
      // Determinar garçom baseado no usuário logado
      let garcomNome = '';
      if (user?.user_metadata?.name) {
        garcomNome = user.user_metadata.name;
      }
      
      const mesaAtualizada = await DatabaseService.updateMesa(mesaId, {
        status: 'ocupada',
        horario_abertura: new Date().toISOString(),
        garcom: garcomNome || null
      });
      
      setMesas(prev => prev.map(mesa => 
        mesa.id === mesaId ? mesaAtualizada : mesa
      ));
      
      toast.success('Mesa ocupada com sucesso!');
    } catch (error) {
      console.error('Error occupying mesa:', error);
      toast.error('Erro ao ocupar mesa');
      throw error;
    }
  };

  const liberarMesa = async (mesaId: string) => {
    try {
      const mesaAtualizada = await DatabaseService.updateMesa(mesaId, {
        status: 'livre',
        horario_abertura: null,
        garcom: null,
        valor_total: 0
      });
      
      setMesas(prev => prev.map(mesa => 
        mesa.id === mesaId ? mesaAtualizada : mesa
      ));
      
      toast.success('Mesa liberada com sucesso!');
    } catch (error) {
      console.error('Error freeing mesa:', error);
      toast.error('Erro ao liberar mesa');
      throw error;
    }
  };

  const excluirMesa = async (mesaId: string) => {
    try {
      await DatabaseService.deleteMesa(mesaId);
      setMesas(prev => prev.filter(mesa => mesa.id !== mesaId));
      toast.success('Mesa excluída com sucesso!');
    } catch (error) {
      console.error('Error deleting mesa:', error);
      toast.error('Erro ao excluir mesa');
      throw error;
    }
  };

  // Comanda functions
  const criarComanda = async (mesaId: string): Promise<string> => {
    try {
      const novaComanda = await DatabaseService.createComanda({
        mesa_id: mesaId,
        status: 'aberta',
        valor_total: 0
      });
      
      setComandas(prev => [...prev, novaComanda]);
      
      // Update mesa status to ocupada
      await ocuparMesa(mesaId);
      
      return novaComanda.id;
    } catch (error) {
      console.error('Error creating comanda:', error);
      toast.error('Erro ao criar comanda');
      throw error;
    }
  };

  const adicionarItemComanda = async (item: { 
    comandaId: string; 
    produtoId: string; 
    quantidade: number; 
    observacao?: string 
  }) => {
    try {
      // Get product price
      const produto = produtos.find(p => p.id === item.produtoId);
      if (!produto) throw new Error('Produto não encontrado');
      
      await DatabaseService.createItemComanda({
        comanda_id: item.comandaId,
        produto_id: item.produtoId,
        quantidade: item.quantidade,
        preco_unitario: produto.preco,
        observacao: item.observacao || null,
        status: 'pendente'
      });
      
      // Refresh data to update UI
      await refreshData();
    } catch (error) {
      console.error('Error adding item to comanda:', error);
      toast.error('Erro ao adicionar item à comanda');
      throw error;
    }
  };

  const removerItemComanda = async (itemId: string) => {
    try {
      await DatabaseService.deleteItemComanda(itemId);
      setItensComanda(prev => prev.filter(item => item.id !== itemId));
    } catch (error) {
      console.error('Error removing item from comanda:', error);
      toast.error('Erro ao remover item da comanda');
      throw error;
    }
  };

  const atualizarStatusItem = async (itemId: string, status: 'preparando' | 'pronto') => {
    try {
      await DatabaseService.updateItemComanda(itemId, { status });
      setItensComanda(prev => prev.map(item => 
        item.id === itemId ? { ...item, status } : item
      ));
      toast.success(`Item marcado como ${status}!`);
    } catch (error) {
      console.error('Error updating item status:', error);
      toast.error('Erro ao atualizar status do item');
      throw error;
    }
  };

  const finalizarPagamento = async (mesaId: string, formaPagamento: string) => {
    try {
      // Use the stored function to finalize payment
      const { error } = await supabase.rpc('finalizar_pagamento_mesa', {
        p_mesa_id: mesaId,
        p_forma_pagamento: formaPagamento,
        p_usuario_id: user?.id
      });

      if (error) throw error;
      
      // Refresh data
      await refreshData();
      
      toast.success('Pagamento finalizado e mesa liberada!');
    } catch (error) {
      console.error('Error finalizing payment:', error);
      toast.error('Erro ao finalizar pagamento');
      throw error;
    }
  };

  // Produto functions
  const adicionarProduto = async (produtoData: any) => {
    if (!restaurante) throw new Error('Restaurante não encontrado');
    
    try {
      const novoProduto = await DatabaseService.createProduto({
        restaurante_id: restaurante.id,
        estoque: 0,
        estoque_minimo: 5,
        ...produtoData
      });
      
      setProdutos(prev => [...prev, novoProduto]);
      toast.success('Produto adicionado com sucesso!');
    } catch (error) {
      console.error('Error adding produto:', error);
      toast.error('Erro ao adicionar produto');
      throw error;
    }
  };

  const atualizarProduto = async (id: string, produtoData: any) => {
    try {
      // Preserve existing stock values when updating
      const produtoExistente = produtos.find(p => p.id === id);
      const produtoAtualizado = await DatabaseService.updateProduto(id, {
        ...produtoData,
        estoque: produtoExistente?.estoque || 0,
        estoque_minimo: produtoExistente?.estoque_minimo || 5
      });
      setProdutos(prev => prev.map(produto => 
        produto.id === id ? produtoAtualizado : produto
      ));
      toast.success('Produto atualizado com sucesso!');
    } catch (error) {
      console.error('Error updating produto:', error);
      toast.error('Erro ao atualizar produto');
      throw error;
    }
  };

  const excluirProduto = async (id: string) => {
    try {
      await DatabaseService.deleteProduto(id);
      setProdutos(prev => prev.filter(produto => produto.id !== id));
      toast.success('Produto excluído com sucesso!');
    } catch (error) {
      console.error('Error deleting produto:', error);
      toast.error('Erro ao excluir produto');
      throw error;
    }
  };

  const atualizarRestaurante = async (dados: any) => {
    if (!restaurante) throw new Error('Restaurante não encontrado');
    
    try {
      const restauranteAtualizado = await DatabaseService.updateRestaurante(restaurante.id, dados);
      setRestaurante(restauranteAtualizado);
      toast.success('Restaurante atualizado com sucesso!');
    } catch (error) {
      console.error('Error updating restaurant:', error);
      toast.error('Erro ao atualizar restaurante');
      throw error;
    }
  };


  const getVendasData = async () => {
    if (!restaurante) return [];
    
    try {
      const endDate = new Date().toISOString();
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - 7);
      
      // Buscar vendas diretamente da tabela vendas para garantir dados corretos
      const { data: vendas, error } = await supabase
        .from('vendas')
        .select('*')
        .eq('restaurante_id', restaurante.id)
        .eq('status', 'concluida')
        .gte('created_at', startDate.toISOString())
        .lte('created_at', endDate)
        .order('created_at', { ascending: false });

      if (error) throw error;

      // Agrupar vendas por data
      const vendasPorData = new Map();
      
      (vendas || []).forEach(venda => {
        const data = new Date(venda.created_at).toISOString().split('T')[0];
        if (!vendasPorData.has(data)) {
          vendasPorData.set(data, {
            data,
            total_vendas: 0,
            quantidade_pedidos: 0
          });
        }
        
        const dadosData = vendasPorData.get(data);
        dadosData.total_vendas += Number(venda.valor_total);
        dadosData.quantidade_pedidos += 1;
      });

      // Preencher dias sem vendas com zeros
      for (let i = 0; i < 7; i++) {
        const data = new Date();
        data.setDate(data.getDate() - i);
        const dataStr = data.toISOString().split('T')[0];
        
        if (!vendasPorData.has(dataStr)) {
          vendasPorData.set(dataStr, {
            data: dataStr,
            total_vendas: 0,
            quantidade_pedidos: 0
          });
        }
      }

      return Array.from(vendasPorData.values())
        .sort((a, b) => new Date(b.data).getTime() - new Date(a.data).getTime());
    } catch (error) {
      console.error('Error getting vendas data:', error);
      return [];
    }
  };

  const getDashboardData = async () => {
    if (!restaurante) return null;
    
    try {
      // Calcular dados do dashboard baseados em dados reais
      const hoje = new Date().toISOString().split('T')[0];
      const inicioMes = new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString();
      const agora = new Date().toISOString();

      // Vendas de hoje
      const { data: vendasHoje, error: vendasHojeError } = await supabase
        .from('vendas')
        .select('valor_total')
        .eq('restaurante_id', restaurante.id)
        .eq('status', 'concluida')
        .gte('created_at', hoje + 'T00:00:00.000Z')
        .lte('created_at', agora);

      if (vendasHojeError) throw vendasHojeError;

      // Vendas do mês
      const { data: vendasMes, error: vendasMesError } = await supabase
        .from('vendas')
        .select('valor_total')
        .eq('restaurante_id', restaurante.id)
        .eq('status', 'concluida')
        .gte('created_at', inicioMes)
        .lte('created_at', agora);

      if (vendasMesError) throw vendasMesError;

      const totalVendasHoje = (vendasHoje || []).reduce((acc, v) => acc + Number(v.valor_total), 0);
      const totalVendasMes = (vendasMes || []).reduce((acc, v) => acc + Number(v.valor_total), 0);
      const pedidosHoje = vendasHoje?.length || 0;
      const pedidosMes = vendasMes?.length || 0;
      const ticketMedio = pedidosHoje > 0 ? totalVendasHoje / pedidosHoje : 0;
      
      // Métricas em tempo real do estado atual
      const mesasOcupadas = mesas.filter(m => m.status === 'ocupada').length;
      const comandasAbertas = comandas.filter(c => c.status === 'aberta').length;
      
      return {
        vendas_hoje: totalVendasHoje,
        vendas_mes: totalVendasMes,
        pedidos_hoje: pedidosHoje,
        pedidos_mes: pedidosMes,
        mesas_ocupadas: mesasOcupadas,
        comandas_abertas: comandasAbertas,
        ticket_medio: ticketMedio
      };
    } catch (error) {
      console.error('Error getting dashboard data:', error);
      return null;
    }
  };

  const getVendasDataOld = async () => {
    if (!restaurante) return [];
    
    try {
      const endDate = new Date().toISOString();
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - 7);
      
      return await ReportsService.getVendasReport(
        restaurante.id,
        startDate.toISOString(),
        endDate
      );
    } catch (error) {
      console.error('Error getting vendas data:', error);
      return [];
    }
  };

  const value: RestauranteContextType = {
    restaurante,
    mesas,
    produtos,
    categorias,
    comandas,
    itensComanda,
    funcionarios,
    loading,
    error,
    
    // Mesa functions
    adicionarMesa,
    ocuparMesa,
    liberarMesa,
    excluirMesa,
    
    // Comanda functions
    criarComanda,
    adicionarItemComanda,
    removerItemComanda,
    atualizarStatusItem,
    finalizarPagamento,
    
    // Produto functions
    adicionarProduto,
    atualizarProduto,
    excluirProduto,
    atualizarRestaurante,
    
    // Data functions
    refreshData,
    getDashboardData,
    getVendasData
  };

  return (
    <RestauranteContext.Provider value={value}>
      {children}
    </RestauranteContext.Provider>
  );
};

export const useRestaurante = (): RestauranteContextType => {
  const context = useContext(RestauranteContext);
  if (context === undefined) {
    throw new Error('useRestaurante deve ser usado dentro de um RestauranteProvider');
  }
  return context;
};

export default RestauranteContext;