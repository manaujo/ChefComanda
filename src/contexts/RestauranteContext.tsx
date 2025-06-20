import React, { createContext, useContext, useState, useEffect } from 'react';
import { useAuth } from './AuthContext';
import { DatabaseService } from '../services/database';
import { supabase } from '../services/supabase';
import RealtimeService from '../services/RealtimeService';
import NotificationService from '../services/NotificationService';
import { Database } from '../types/database';
import toast from 'react-hot-toast';

type Tables = Database['public']['Tables'];
type Mesa = Tables['mesas']['Row'];
type Produto = Tables['produtos']['Row'];
type Comanda = Tables['comandas']['Row'];
type ItemComanda = Tables['itens_comanda']['Row'];

interface RestauranteContextData {
  restaurante: Tables['restaurantes']['Row'] | null;
  mesas: Mesa[];
  produtos: Produto[];
  comandas: Comanda[];
  itensComanda: ComandaItemData[];
  funcionarios: any[];
  loading: boolean;
  connectionStatus: 'connected' | 'disconnected' | 'error';
  
  // Mesa actions
  adicionarMesa: (dados: { numero: number; capacidade: number; garcom?: string }) => Promise<void>;
  ocuparMesa: (mesaId: string) => Promise<void>;
  liberarMesa: (mesaId: string) => Promise<void>;
  excluirMesa: (mesaId: string) => Promise<void>;
  
  // Produto actions
  adicionarProduto: (produto: Omit<Tables['produtos']['Insert'], 'restaurante_id'>) => Promise<void>;
  atualizarProduto: (id: string, updates: Partial<Tables['produtos']['Update']>) => Promise<void>;
  excluirProduto: (id: string) => Promise<void>;
  
  // Comanda actions
  criarComanda: (mesaId: string) => Promise<string>;
  adicionarItemComanda: (dados: {
    comandaId: string;
    produtoId: string;
    quantidade: number;
    observacao?: string;
  }) => Promise<void>;
  atualizarStatusItem: (itemId: string, status: ComandaItemData['status']) => Promise<void>;
  removerItemComanda: (itemId: string) => Promise<void>;
  finalizarComanda: (comandaId: string, formaPagamento: string) => Promise<void>;
  
  // Payment actions
  finalizarPagamento: (mesaId: string, formaPagamento: string) => Promise<void>;
  
  // Data refresh
  refreshData: () => Promise<void>;
  
  // Dashboard data
  getDashboardData: () => Promise<any>;
  getVendasData: () => Promise<any>;
}

const RestauranteContext = createContext<RestauranteContextData>({} as RestauranteContextData);

export const useRestaurante = () => {
  const context = useContext(RestauranteContext);
  if (!context) {
    throw new Error('useRestaurante must be used within a RestauranteProvider');
  }
  return context;
};

export const RestauranteProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user, isEmployee, employeeData } = useAuth();
  const [restaurante, setRestaurante] = useState<Tables['restaurantes']['Row'] | null>(null);
  const [mesas, setMesas] = useState<Mesa[]>([]);
  const [produtos, setProdutos] = useState<Produto[]>([]);
  const [comandas, setComandasState] = useState<Comanda[]>([]);
  const [itensComanda, setItensComanda] = useState<ComandaItemData[]>([]);
  const [funcionarios, setFuncionarios] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [connectionStatus, setConnectionStatus] = useState<'connected' | 'disconnected' | 'error'>('disconnected');

  useEffect(() => {
    if (user && !isEmployee) {
      loadRestauranteData();
    } else if (isEmployee && employeeData) {
      loadEmployeeRestauranteData();
    }
  }, [user, isEmployee, employeeData]);

  const checkConnection = async () => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('id')
        .limit(1);
      
      if (error) throw error;
      setConnectionStatus('connected');
      return true;
    } catch (error) {
      console.error('Connection check failed:', error);
      if (error instanceof Error && error.message.includes('Failed to fetch')) {
        setConnectionStatus('disconnected');
      } else {
        setConnectionStatus('error');
      }
      return false;
    }
  };

  const loadRestauranteData = async () => {
    if (!user) return;
    
    setLoading(true);
    
    // Check connection first
    const isConnected = await checkConnection();
    if (!isConnected) {
      setLoading(false);
      return;
    }

    try {
      // Load or create restaurant
      let restauranteData = await DatabaseService.getRestaurante(user.id);
      
      if (!restauranteData) {
        // Create default restaurant if none exists
        restauranteData = await DatabaseService.createRestaurante({
          user_id: user.id,
          nome: 'Meu Restaurante',
          telefone: '(00) 00000-0000'
        });
      }
      
      setRestaurante(restauranteData);
      
      // Load all restaurant data with error handling
      await Promise.allSettled([
        loadMesas(restauranteData.id),
        loadProdutos(restauranteData.id),
        loadComandas(restauranteData.id),
        loadFuncionarios()
      ]);

      // Setup real-time subscriptions only if connected
      if (connectionStatus === 'connected') {
        setupRealtimeSubscriptions(restauranteData.id);
      }
    } catch (error) {
      console.error('Error loading restaurant data:', error);
      if (error instanceof Error && error.message.includes('Failed to fetch')) {
        setConnectionStatus('disconnected');
        toast.error('Erro de conexão. Verifique sua internet e tente novamente.');
      } else {
        setConnectionStatus('error');
        toast.error('Erro ao carregar dados do restaurante');
      }
    } finally {
      setLoading(false);
    }
  };

  const loadEmployeeRestauranteData = async () => {
    if (!employeeData?.company_id) return;
    
    setLoading(true);
    
    // Check connection first
    const isConnected = await checkConnection();
    if (!isConnected) {
      setLoading(false);
      return;
    }

    try {
      // Get restaurant data from company
      const { data: restauranteData, error } = await supabase
        .from('restaurantes')
        .select('*')
        .eq('user_id', employeeData.company_id)
        .single();

      if (error) throw error;
      
      setRestaurante(restauranteData);
      
      // Load restaurant data based on employee role with error handling
      await Promise.allSettled([
        loadMesas(restauranteData.id),
        loadProdutos(restauranteData.id),
        loadComandas(restauranteData.id),
        loadFuncionarios()
      ]);

      // Setup real-time subscriptions only if connected
      if (connectionStatus === 'connected') {
        setupRealtimeSubscriptions(restauranteData.id);
      }
    } catch (error) {
      console.error('Error loading employee restaurant data:', error);
      if (error instanceof Error && error.message.includes('Failed to fetch')) {
        setConnectionStatus('disconnected');
        toast.error('Erro de conexão. Verifique sua internet e tente novamente.');
      } else {
        setConnectionStatus('error');
        toast.error('Erro ao carregar dados do restaurante');
      }
    } finally {
      setLoading(false);
    }
  };

  const loadFuncionarios = async () => {
    try {
      if (!user) return;

      const { data: companyData } = await supabase
        .from('company_profiles')
        .select('id')
        .eq('user_id', user.id)
        .maybeSingle();

      if (companyData) {
        const { data: employeesData } = await supabase
          .from('employees')
          .select('*')
          .eq('company_id', companyData.id)
          .eq('active', true)
          .order('name');

        setFuncionarios(employeesData || []);
      }
    } catch (error) {
      console.error('Error loading funcionarios:', error);
    }
  };

  const setupRealtimeSubscriptions = (restauranteId: string) => {
    try {
      // Subscribe to table changes
      RealtimeService.subscribeToTableChanges(restauranteId, (payload) => {
        if (payload.eventType === 'INSERT') {
          setMesas(prev => [...prev, payload.new]);
        } else if (payload.eventType === 'UPDATE') {
          setMesas(prev => prev.map(mesa => 
            mesa.id === payload.new.id ? payload.new : mesa
          ));
        } else if (payload.eventType === 'DELETE') {
          setMesas(prev => prev.filter(mesa => mesa.id !== payload.old.id));
        }
      });

      // Subscribe to product changes
      const productChannel = supabase
        .channel('produtos_changes')
        .on('postgres_changes', {
          event: '*',
          schema: 'public',
          table: 'produtos',
          filter: `restaurante_id=eq.${restauranteId}`
        }, (payload) => {
          if (payload.eventType === 'INSERT') {
            setProdutos(prev => [...prev, payload.new]);
          } else if (payload.eventType === 'UPDATE') {
            setProdutos(prev => prev.map(produto => 
              produto.id === payload.new.id ? payload.new : produto
            ));
          } else if (payload.eventType === 'DELETE') {
            setProdutos(prev => prev.filter(produto => produto.id !== payload.old.id));
          }
        })
        .subscribe();

      // Subscribe to order changes
      RealtimeService.subscribeToOrderChanges(restauranteId, (payload) => {
        if (payload.table === 'comandas') {
          if (payload.eventType === 'INSERT') {
            setComandasState(prev => [...prev, payload.new]);
            // Send notification for new orders
            if (payload.new.status === 'aberta') {
              NotificationService.sendNewOrderNotification(
                restauranteId,
                payload.new.mesa_numero || 0,
                []
              );
            }
          } else if (payload.eventType === 'UPDATE') {
            setComandasState(prev => prev.map(comanda => 
              comanda.id === payload.new.id ? payload.new : comanda
            ));
          }
        } else if (payload.table === 'itens_comanda') {
          if (payload.eventType === 'INSERT') {
            // Transform the new item to ComandaItemData format
            const transformedItem = transformItemComandaToComandaItemData(payload.new);
            if (transformedItem) {
              setItensComanda(prev => [...prev, transformedItem]);
            }
          } else if (payload.eventType === 'UPDATE') {
            const transformedItem = transformItemComandaToComandaItemData(payload.new);
            if (transformedItem) {
              setItensComanda(prev => prev.map(item => 
                item.id === transformedItem.id ? transformedItem : item
              ));
            }
          } else if (payload.eventType === 'DELETE') {
            setItensComanda(prev => prev.filter(item => item.id !== payload.old.id));
          }
        }
      });

      // Subscribe to inventory changes
      RealtimeService.subscribeToInventoryChanges(restauranteId, (payload) => {
        // Handle inventory updates and low stock alerts
        console.log('Inventory change:', payload);
      });
    } catch (error) {
      console.error('Error setting up realtime subscriptions:', error);
    }
  };

  const transformItemComandaToComandaItemData = (item: ItemComanda): ComandaItemData | null => {
    // Find the comanda to get mesa_id
    const comanda = comandas.find(c => c.id === item.comanda_id);
    if (!comanda) return null;

    // Find the produto to get product details
    const produto = produtos.find(p => p.id === item.produto_id);
    if (!produto) return null;

    return {
      id: item.id,
      mesa_id: comanda.mesa_id,
      comanda_id: item.comanda_id,
      produto_id: item.produto_id,
      quantidade: item.quantidade,
      preco_unitario: item.preco_unitario,
      observacao: item.observacao || undefined,
      status: item.status,
      created_at: item.created_at || new Date().toISOString(),
      nome: produto.nome,
      categoria: produto.categoria,
      preco: produto.preco
    };
  };

  const loadMesas = async (restauranteId: string) => {
    try {
      const data = await DatabaseService.getMesas(restauranteId);
      setMesas(data || []);
    } catch (error) {
      console.error('Error loading mesas:', error);
    }
  };

  const loadProdutos = async (restauranteId: string) => {
    try {
      const data = await DatabaseService.getProdutos(restauranteId);
      setProdutos(data || []);
    } catch (error) {
      console.error('Error loading produtos:', error);
    }
  };

  const loadComandas = async (restauranteId: string) => {
    try {
      const data = await DatabaseService.getComandas(restauranteId);
      setComandasState(data || []);
      
      // Transform items to ComandaItemData format
      const allItems: ComandaItemData[] = [];
      data?.forEach(comanda => {
        if (comanda.itens) {
          comanda.itens.forEach(item => {
            const produto = produtos.find(p => p.id === item.produto_id);
            if (produto) {
              allItems.push({
                id: item.id,
                mesa_id: comanda.mesa_id,
                comanda_id: item.comanda_id,
                produto_id: item.produto_id,
                quantidade: item.quantidade,
                preco_unitario: item.preco_unitario,
                observacao: item.observacao || undefined,
                status: item.status,
                created_at: item.created_at || new Date().toISOString(),
                nome: produto.nome,
                categoria: produto.categoria,
                preco: produto.preco
              });
            }
          });
        }
      });
      setItensComanda(allItems);
    } catch (error) {
      console.error('Error loading comandas:', error);
    }
  };

  const refreshData = async () => {
    if (restaurante) {
      // Check connection before refreshing
      const isConnected = await checkConnection();
      if (!isConnected) {
        toast.error('Sem conexão com o servidor');
        return;
      }

      await Promise.allSettled([
        loadMesas(restaurante.id),
        loadProdutos(restaurante.id),
        loadComandas(restaurante.id),
        loadFuncionarios()
      ]);
    }
  };

  // Mesa actions
  const adicionarMesa = async (dados: { numero: number; capacidade: number; garcom?: string }) => {
    if (!restaurante) return;
    
    try {
      const newMesa = await DatabaseService.createMesa({
        restaurante_id: restaurante.id,
        numero: dados.numero,
        capacidade: dados.capacidade,
        garcom: dados.garcom || null
      });
      
      // Update local state immediately for better UX
      setMesas(prev => [...prev, newMesa]);
      toast.success('Mesa adicionada com sucesso!');
    } catch (error) {
      console.error('Error adding mesa:', error);
      if (error instanceof Error && error.message.includes('Failed to fetch')) {
        toast.error('Erro de conexão. Verifique sua internet e tente novamente.');
      } else {
        toast.error('Erro ao adicionar mesa');
      }
    }
  };

  const ocuparMesa = async (mesaId: string) => {
    try {
      const updatedMesa = await DatabaseService.updateMesa(mesaId, {
        status: 'ocupada',
        horario_abertura: new Date().toISOString()
      });
      
      // Update local state immediately
      setMesas(prev => prev.map(mesa => 
        mesa.id === mesaId ? updatedMesa : mesa
      ));
      
      toast.success('Mesa ocupada com sucesso!');
    } catch (error) {
      console.error('Error occupying mesa:', error);
      if (error instanceof Error && error.message.includes('Failed to fetch')) {
        toast.error('Erro de conexão. Verifique sua internet e tente novamente.');
      } else {
        toast.error('Erro ao ocupar mesa');
      }
    }
  };

  const liberarMesa = async (mesaId: string) => {
    try {
      const updatedMesa = await DatabaseService.updateMesa(mesaId, {
        status: 'livre',
        horario_abertura: null,
        garcom: null,
        valor_total: 0
      });
      
      // Update local state immediately
      setMesas(prev => prev.map(mesa => 
        mesa.id === mesaId ? updatedMesa : mesa
      ));
      
      toast.success('Mesa liberada com sucesso!');
    } catch (error) {
      console.error('Error freeing mesa:', error);
      if (error instanceof Error && error.message.includes('Failed to fetch')) {
        toast.error('Erro de conexão. Verifique sua internet e tente novamente.');
      } else {
        toast.error('Erro ao liberar mesa');
      }
    }
  };

  const excluirMesa = async (mesaId: string) => {
    try {
      await DatabaseService.deleteMesa(mesaId);
      
      // Update local state immediately
      setMesas(prev => prev.filter(mesa => mesa.id !== mesaId));
      toast.success('Mesa excluída com sucesso!');
    } catch (error) {
      console.error('Error deleting mesa:', error);
      if (error instanceof Error && error.message.includes('Failed to fetch')) {
        toast.error('Erro de conexão. Verifique sua internet e tente novamente.');
      } else {
        toast.error('Erro ao excluir mesa');
      }
    }
  };

  // Produto actions
  const adicionarProduto = async (produto: Omit<Tables['produtos']['Insert'], 'restaurante_id'>) => {
    if (!restaurante) return;
    
    try {
      const newProduto = await DatabaseService.createProduto({
        ...produto,
        restaurante_id: restaurante.id
      });
      
      // Update local state immediately
      setProdutos(prev => [...prev, newProduto]);
      toast.success('Produto adicionado com sucesso!');
    } catch (error) {
      console.error('Error adding produto:', error);
      if (error instanceof Error && error.message.includes('Failed to fetch')) {
        toast.error('Erro de conexão. Verifique sua internet e tente novamente.');
      } else {
        toast.error('Erro ao adicionar produto');
      }
    }
  };

  const atualizarProduto = async (id: string, updates: Partial<Tables['produtos']['Update']>) => {
    try {
      const updatedProduto = await DatabaseService.updateProduto(id, updates);
      
      // Update local state immediately
      setProdutos(prev => prev.map(produto => 
        produto.id === id ? updatedProduto : produto
      ));
      toast.success('Produto atualizado com sucesso!');
    } catch (error) {
      console.error('Error updating produto:', error);
      if (error instanceof Error && error.message.includes('Failed to fetch')) {
        toast.error('Erro de conexão. Verifique sua internet e tente novamente.');
      } else {
        toast.error('Erro ao atualizar produto');
      }
    }
  };

  const excluirProduto = async (id: string) => {
    try {
      await DatabaseService.deleteProduto(id);
      
      // Update local state immediately
      setProdutos(prev => prev.filter(produto => produto.id !== id));
      toast.success('Produto excluído com sucesso!');
    } catch (error) {
      console.error('Error deleting produto:', error);
      if (error instanceof Error && error.message.includes('Failed to fetch')) {
        toast.error('Erro de conexão. Verifique sua internet e tente novamente.');
      } else {
        toast.error('Erro ao excluir produto');
      }
    }
  };

  // Comanda actions
  const criarComanda = async (mesaId: string): Promise<string> => {
    try {
      const comanda = await DatabaseService.createComanda({
        mesa_id: mesaId
      });
      
      // Update local state immediately
      setComandasState(prev => [...prev, comanda]);
      return comanda.id;
    } catch (error) {
      console.error('Error creating comanda:', error);
      if (error instanceof Error && error.message.includes('Failed to fetch')) {
        toast.error('Erro de conexão. Verifique sua internet e tente novamente.');
      } else {
        toast.error('Erro ao criar comanda');
      }
      throw error;
    }
  };

  const adicionarItemComanda = async (dados: {
    comandaId: string;
    produtoId: string;
    quantidade: number;
    observacao?: string;
  }) => {
    try {
      const produto = produtos.find(p => p.id === dados.produtoId);
      if (!produto) {
        throw new Error('Produto não encontrado');
      }

      const newItem = await DatabaseService.createItemComanda({
        comanda_id: dados.comandaId,
        produto_id: dados.produtoId,
        quantidade: dados.quantidade,
        preco_unitario: produto.preco,
        observacao: dados.observacao || null
      });

      // Find the comanda to get mesa_id
      const comanda = comandas.find(c => c.id === dados.comandaId);
      if (comanda) {
        const transformedItem: ComandaItemData = {
          id: newItem.id,
          mesa_id: comanda.mesa_id,
          comanda_id: newItem.comanda_id,
          produto_id: newItem.produto_id,
          quantidade: newItem.quantidade,
          preco_unitario: newItem.preco_unitario,
          observacao: newItem.observacao || undefined,
          status: newItem.status,
          created_at: newItem.created_at || new Date().toISOString(),
          nome: produto.nome,
          categoria: produto.categoria,
          preco: produto.preco
        };

        // Update local state immediately
        setItensComanda(prev => [...prev, transformedItem]);
      }
      
      toast.success('Item adicionado à comanda!');
    } catch (error) {
      console.error('Error adding item to comanda:', error);
      if (error instanceof Error && error.message.includes('Failed to fetch')) {
        toast.error('Erro de conexão. Verifique sua internet e tente novamente.');
      } else {
        toast.error('Erro ao adicionar item à comanda');
      }
    }
  };

  const atualizarStatusItem = async (itemId: string, status: ComandaItemData['status']) => {
    try {
      await DatabaseService.updateItemComanda(itemId, { status });
      
      // Update local state immediately
      setItensComanda(prev => prev.map(item => 
        item.id === itemId ? { ...item, status } : item
      ));
      toast.success(`Status atualizado para ${status}!`);
    } catch (error) {
      console.error('Error updating item status:', error);
      if (error instanceof Error && error.message.includes('Failed to fetch')) {
        toast.error('Erro de conexão. Verifique sua internet e tente novamente.');
      } else {
        toast.error('Erro ao atualizar status do item');
      }
    }
  };

  const removerItemComanda = async (itemId: string) => {
    try {
      await DatabaseService.deleteItemComanda(itemId);
      
      // Update local state immediately
      setItensComanda(prev => prev.filter(item => item.id !== itemId));
      toast.success('Item removido da comanda!');
    } catch (error) {
      console.error('Error removing item from comanda:', error);
      if (error instanceof Error && error.message.includes('Failed to fetch')) {
        toast.error('Erro de conexão. Verifique sua internet e tente novamente.');
      } else {
        toast.error('Erro ao remover item da comanda');
      }
    }
  };

  const finalizarComanda = async (comandaId: string, formaPagamento: string) => {
    if (!restaurante || !user) return;
    
    try {
      const comanda = comandas.find(c => c.id === comandaId);
      if (!comanda) {
        throw new Error('Comanda não encontrada');
      }

      // Update comanda status
      await DatabaseService.updateComanda(comandaId, {
        status: 'fechada'
      });

      // Create sale record
      await DatabaseService.createVenda({
        restaurante_id: restaurante.id,
        comanda_id: comandaId,
        mesa_id: comanda.mesa_id,
        valor_total: comanda.valor_total,
        forma_pagamento: formaPagamento,
        usuario_id: user.id
      });

      // Update mesa status
      await DatabaseService.updateMesa(comanda.mesa_id, {
        status: 'aguardando'
      });

      toast.success('Comanda finalizada com sucesso!');
    } catch (error) {
      console.error('Error finalizing comanda:', error);
      if (error instanceof Error && error.message.includes('Failed to fetch')) {
        toast.error('Erro de conexão. Verifique sua internet e tente novamente.');
      } else {
        toast.error('Erro ao finalizar comanda');
      }
    }
  };

  const finalizarPagamento = async (mesaId: string, formaPagamento: string) => {
    try {
      // Update mesa status to free
      await DatabaseService.updateMesa(mesaId, {
        status: 'livre',
        horario_abertura: null,
        garcom: null,
        valor_total: 0
      });

      // Send payment notification
      if (user) {
        const mesa = mesas.find(m => m.id === mesaId);
        if (mesa) {
          await NotificationService.sendPaymentNotification(
            user.id,
            mesa.valor_total,
            formaPagamento
          );
        }
      }

      toast.success('Pagamento finalizado com sucesso!');
    } catch (error) {
      console.error('Error finalizing payment:', error);
      if (error instanceof Error && error.message.includes('Failed to fetch')) {
        toast.error('Erro de conexão. Verifique sua internet e tente novamente.');
      } else {
        toast.error('Erro ao finalizar pagamento');
      }
    }
  };

  // Dashboard data
  const getDashboardData = async () => {
    if (!restaurante) return null;

    try {
      const hoje = new Date();
      const inicioMes = new Date(hoje.getFullYear(), hoje.getMonth(), 1);
      const fimMes = new Date(hoje.getFullYear(), hoje.getMonth() + 1, 0);

      // Get sales data
      const vendasHoje = await DatabaseService.getVendas(
        restaurante.id,
        hoje.toISOString().split('T')[0],
        hoje.toISOString().split('T')[0]
      );

      const vendasMes = await DatabaseService.getVendas(
        restaurante.id,
        inicioMes.toISOString(),
        fimMes.toISOString()
      );

      const totalVendasHoje = vendasHoje?.reduce((acc, venda) => acc + venda.valor_total, 0) || 0;
      const totalVendasMes = vendasMes?.reduce((acc, venda) => acc + venda.valor_total, 0) || 0;
      const totalPedidosHoje = vendasHoje?.length || 0;
      const ticketMedio = totalPedidosHoje > 0 ? totalVendasHoje / totalPedidosHoje : 0;

      return {
        vendasHoje: totalVendasHoje,
        vendasMes: totalVendasMes,
        pedidosHoje: totalPedidosHoje,
        ticketMedio,
        mesasOcupadas: mesas.filter(m => m.status === 'ocupada').length,
        comandasAbertas: comandas.filter(c => c.status === 'aberta').length,
        produtosMaisVendidos: await getProdutosMaisVendidos(),
        alertasEstoque: await getAlertasEstoque()
      };
    } catch (error) {
      console.error('Error getting dashboard data:', error);
      return null;
    }
  };

  const getProdutosMaisVendidos = async () => {
    if (!restaurante) return [];

    try {
      const { data, error } = await supabase
        .from('itens_comanda')
        .select(`
          produto_id,
          quantidade,
          produtos!inner(nome, categoria, preco)
        `)
        .gte('created_at', new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString());

      if (error) throw error;

      const produtoStats = data.reduce((acc: any, item: any) => {
        const produtoId = item.produto_id;
        if (!acc[produtoId]) {
          acc[produtoId] = {
            nome: item.produtos.nome,
            categoria: item.produtos.categoria,
            preco: item.produtos.preco,
            quantidade: 0,
            valor: 0
          };
        }
        acc[produtoId].quantidade += item.quantidade;
        acc[produtoId].valor += item.quantidade * item.produtos.preco;
        return acc;
      }, {});

      return Object.values(produtoStats)
        .sort((a: any, b: any) => b.quantidade - a.quantidade)
        .slice(0, 5);
    } catch (error) {
      console.error('Error getting produtos mais vendidos:', error);
      return [];
    }
  };

  const getAlertasEstoque = async () => {
    if (!restaurante) return [];

    try {
      const { data, error } = await supabase
        .from('insumos')
        .select('*')
        .eq('restaurante_id', restaurante.id)
        .filter('quantidade', 'lte', 'quantidade_minima')
        .eq('ativo', true);

      if (error) throw error;

      return data.map(insumo => ({
        id: insumo.id,
        produto: insumo.nome,
        quantidadeAtual: insumo.quantidade,
        quantidadeMinima: insumo.quantidade_minima,
        unidade: insumo.unidade_medida,
        status: insumo.quantidade === 0 ? 'crítico' : 'baixo',
        ultimaAtualizacao: insumo.updated_at
      }));
    } catch (error) {
      console.error('Error getting alertas estoque:', error);
      return [];
    }
  };

  const getVendasData = async () => {
    if (!restaurante) return null;

    try {
      const ultimosSete = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
      const vendas = await DatabaseService.getVendas(
        restaurante.id,
        ultimosSete.toISOString()
      );

      const vendasPorDia = vendas?.reduce((acc: any, venda) => {
        const data = venda.created_at.split('T')[0];
        if (!acc[data]) {
          acc[data] = { total: 0, quantidade: 0 };
        }
        acc[data].total += venda.valor_total;
        acc[data].quantidade += 1;
        return acc;
      }, {}) || {};

      return Object.entries(vendasPorDia).map(([data, stats]: [string, any]) => ({
        data,
        total: stats.total,
        quantidade: stats.quantidade
      }));
    } catch (error) {
      console.error('Error getting vendas data:', error);
      return [];
    }
  };

  return (
    <RestauranteContext.Provider value={{
      restaurante,
      mesas,
      produtos,
      comandas,
      itensComanda,
      funcionarios,
      loading,
      connectionStatus,
      adicionarMesa,
      ocuparMesa,
      liberarMesa,
      excluirMesa,
      adicionarProduto,
      atualizarProduto,
      excluirProduto,
      criarComanda,
      adicionarItemComanda,
      atualizarStatusItem,
      removerItemComanda,
      finalizarComanda,
      finalizarPagamento,
      refreshData,
      getDashboardData,
      getVendasData
    }}>
      {children}
    </RestauranteContext.Provider>
  );
};