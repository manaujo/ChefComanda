import React, { createContext, useContext, useState, useEffect } from 'react';
import { useAuth } from './AuthContext';
import { DatabaseService } from '../services/database';
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
  itensComanda: ItemComanda[];
  loading: boolean;
  
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
  atualizarStatusItem: (itemId: string, status: ItemComanda['status']) => Promise<void>;
  removerItemComanda: (itemId: string) => Promise<void>;
  finalizarComanda: (comandaId: string, formaPagamento: string) => Promise<void>;
  
  // Payment actions
  finalizarPagamento: (mesaId: string, formaPagamento: string) => Promise<void>;
  
  // Data refresh
  refreshData: () => Promise<void>;
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
  const [itensComanda, setItensComanda] = useState<ItemComanda[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (user && !isEmployee) {
      loadRestauranteData();
    } else if (isEmployee && employeeData) {
      loadEmployeeRestauranteData();
    }
  }, [user, isEmployee, employeeData]);

  const loadRestauranteData = async () => {
    if (!user) return;
    
    setLoading(true);
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
      
      // Load all restaurant data
      await Promise.all([
        loadMesas(restauranteData.id),
        loadProdutos(restauranteData.id),
        loadComandas(restauranteData.id)
      ]);

      // Setup real-time subscriptions
      setupRealtimeSubscriptions(restauranteData.id);
    } catch (error) {
      console.error('Error loading restaurant data:', error);
      toast.error('Erro ao carregar dados do restaurante');
    } finally {
      setLoading(false);
    }
  };

  const loadEmployeeRestauranteData = async () => {
    if (!employeeData?.company_id) return;
    
    setLoading(true);
    try {
      // Get restaurant data from company
      const { data: restauranteData, error } = await DatabaseService.supabase
        .from('restaurantes')
        .select('*')
        .eq('user_id', employeeData.company_id)
        .single();

      if (error) throw error;
      
      setRestaurante(restauranteData);
      
      // Load restaurant data based on employee role
      await Promise.all([
        loadMesas(restauranteData.id),
        loadProdutos(restauranteData.id),
        loadComandas(restauranteData.id)
      ]);

      // Setup real-time subscriptions
      setupRealtimeSubscriptions(restauranteData.id);
    } catch (error) {
      console.error('Error loading employee restaurant data:', error);
      toast.error('Erro ao carregar dados do restaurante');
    } finally {
      setLoading(false);
    }
  };

  const setupRealtimeSubscriptions = (restauranteId: string) => {
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
          setItensComanda(prev => [...prev, payload.new]);
        } else if (payload.eventType === 'UPDATE') {
          setItensComanda(prev => prev.map(item => 
            item.id === payload.new.id ? payload.new : item
          ));
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
      
      // Extract items from comandas
      const allItems: ItemComanda[] = [];
      data?.forEach(comanda => {
        if (comanda.itens) {
          allItems.push(...comanda.itens);
        }
      });
      setItensComanda(allItems);
    } catch (error) {
      console.error('Error loading comandas:', error);
    }
  };

  const refreshData = async () => {
    if (restaurante) {
      await Promise.all([
        loadMesas(restaurante.id),
        loadProdutos(restaurante.id),
        loadComandas(restaurante.id)
      ]);
    }
  };

  // Mesa actions
  const adicionarMesa = async (dados: { numero: number; capacidade: number; garcom?: string }) => {
    if (!restaurante) return;
    
    try {
      await DatabaseService.createMesa({
        restaurante_id: restaurante.id,
        numero: dados.numero,
        capacidade: dados.capacidade,
        garcom: dados.garcom || null
      });
      
      toast.success('Mesa adicionada com sucesso!');
    } catch (error) {
      console.error('Error adding mesa:', error);
      toast.error('Erro ao adicionar mesa');
    }
  };

  const ocuparMesa = async (mesaId: string) => {
    try {
      await DatabaseService.updateMesa(mesaId, {
        status: 'ocupada',
        horario_abertura: new Date().toISOString()
      });
      
      toast.success('Mesa ocupada com sucesso!');
    } catch (error) {
      console.error('Error occupying mesa:', error);
      toast.error('Erro ao ocupar mesa');
    }
  };

  const liberarMesa = async (mesaId: string) => {
    try {
      await DatabaseService.updateMesa(mesaId, {
        status: 'livre',
        horario_abertura: null,
        garcom: null,
        valor_total: 0
      });
      
      toast.success('Mesa liberada com sucesso!');
    } catch (error) {
      console.error('Error freeing mesa:', error);
      toast.error('Erro ao liberar mesa');
    }
  };

  const excluirMesa = async (mesaId: string) => {
    try {
      await DatabaseService.deleteMesa(mesaId);
      toast.success('Mesa excluída com sucesso!');
    } catch (error) {
      console.error('Error deleting mesa:', error);
      toast.error('Erro ao excluir mesa');
    }
  };

  // Produto actions
  const adicionarProduto = async (produto: Omit<Tables['produtos']['Insert'], 'restaurante_id'>) => {
    if (!restaurante) return;
    
    try {
      await DatabaseService.createProduto({
        ...produto,
        restaurante_id: restaurante.id
      });
      
      toast.success('Produto adicionado com sucesso!');
    } catch (error) {
      console.error('Error adding produto:', error);
      toast.error('Erro ao adicionar produto');
    }
  };

  const atualizarProduto = async (id: string, updates: Partial<Tables['produtos']['Update']>) => {
    try {
      await DatabaseService.updateProduto(id, updates);
      toast.success('Produto atualizado com sucesso!');
    } catch (error) {
      console.error('Error updating produto:', error);
      toast.error('Erro ao atualizar produto');
    }
  };

  const excluirProduto = async (id: string) => {
    try {
      await DatabaseService.deleteProduto(id);
      toast.success('Produto excluído com sucesso!');
    } catch (error) {
      console.error('Error deleting produto:', error);
      toast.error('Erro ao excluir produto');
    }
  };

  // Comanda actions
  const criarComanda = async (mesaId: string): Promise<string> => {
    try {
      const comanda = await DatabaseService.createComanda({
        mesa_id: mesaId
      });
      
      return comanda.id;
    } catch (error) {
      console.error('Error creating comanda:', error);
      toast.error('Erro ao criar comanda');
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

      await DatabaseService.createItemComanda({
        comanda_id: dados.comandaId,
        produto_id: dados.produtoId,
        quantidade: dados.quantidade,
        preco_unitario: produto.preco,
        observacao: dados.observacao || null
      });
      
      toast.success('Item adicionado à comanda!');
    } catch (error) {
      console.error('Error adding item to comanda:', error);
      toast.error('Erro ao adicionar item à comanda');
    }
  };

  const atualizarStatusItem = async (itemId: string, status: ItemComanda['status']) => {
    try {
      await DatabaseService.updateItemComanda(itemId, { status });
      toast.success(`Status atualizado para ${status}!`);
    } catch (error) {
      console.error('Error updating item status:', error);
      toast.error('Erro ao atualizar status do item');
    }
  };

  const removerItemComanda = async (itemId: string) => {
    try {
      await DatabaseService.deleteItemComanda(itemId);
      toast.success('Item removido da comanda!');
    } catch (error) {
      console.error('Error removing item from comanda:', error);
      toast.error('Erro ao remover item da comanda');
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
      toast.error('Erro ao finalizar comanda');
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
      toast.error('Erro ao finalizar pagamento');
    }
  };

  return (
    <RestauranteContext.Provider value={{
      restaurante,
      mesas,
      produtos,
      comandas,
      itensComanda,
      loading,
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
      refreshData
    }}>
      {children}
    </RestauranteContext.Provider>
  );
};