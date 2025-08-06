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
  const { user } = useAuth();
  const [restaurante, setRestaurante] = useState<Restaurante | null>(null);
  const [mesas, setMesas] = useState<Mesa[]>([]);
  const [produtos, setProdutos] = useState<Produto[]>([]);
  const [comandas, setComandas] = useState<Comanda[]>([]);
  const [itensComanda, setItensComanda] = useState<ComandaItemData[]>([]);
  const [funcionarios, setFuncionarios] = useState<Funcionario[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (user) {
      refreshData();
    }
  }, [user]);

  const refreshData = async () => {
    if (!user) return;
    
    try {
      setLoading(true);
      setError(null);
      
      // Load restaurant
      const restauranteData = await DatabaseService.getRestaurante(user.id);
      if (restauranteData) {
        setRestaurante(restauranteData);
        
        // Load all related data
        const [mesasData, produtosData, comandasData] = await Promise.all([
          DatabaseService.getMesas(restauranteData.id),
          DatabaseService.getProdutos(restauranteData.id),
          DatabaseService.getComandas(restauranteData.id)
        ]);
        
        setMesas(mesasData || []);
        setProdutos(produtosData || []);
        setComandas(comandasData || []);
        
        // Load itens comanda with product details
        await loadItensComanda(restauranteData.id);
        
        // Load funcionarios
        await loadFuncionarios();
      }
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
              restaurante_id
            )
          ),
          produto:produtos!inner(nome, categoria, preco)
        `)
        .eq('comanda.mesa.restaurante_id', restauranteId);

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

      const { data: companyData } = await supabase
        .from('company_profiles')
        .select('id')
        .eq('user_id', user.id)
        .maybeSingle();

      if (companyData) {
        const funcionariosData = await CRUDService.getEmployeesByCompany(companyData.id);
        setFuncionarios(funcionariosData || []);
      }
    } catch (error) {
      console.error('Error loading funcionarios:', error);
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
      const mesaAtualizada = await DatabaseService.updateMesa(mesaId, {
        status: 'ocupada',
        horario_abertura: new Date().toISOString()
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
      // Get comanda for this mesa
      const comanda = comandas.find(c => c.mesa_id === mesaId && c.status === 'aberta');
      if (!comanda) throw new Error('Comanda não encontrada');
      
      // Close comanda
      await DatabaseService.updateComanda(comanda.id, { status: 'fechada' });
      
      // Create venda record
      if (restaurante) {
        await DatabaseService.createVenda({
          restaurante_id: restaurante.id,
          mesa_id: mesaId,
          comanda_id: comanda.id,
          valor_total: comanda.valor_total,
          forma_pagamento: formaPagamento,
          status: 'concluida',
          usuario_id: user?.id || ''
        });
      }
      
      // Update mesa status to aguardando
      await DatabaseService.updateMesa(mesaId, { status: 'aguardando' });
      
      // Refresh data
      await refreshData();
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
      const produtoAtualizado = await DatabaseService.updateProduto(id, produtoData);
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

  // Dashboard and reports
  const getDashboardData = async () => {
    if (!restaurante) return null;
    
    try {
      return await ReportsService.getDashboardData(restaurante.id);
    } catch (error) {
      console.error('Error getting dashboard data:', error);
      return null;
    }
  };

  const getVendasData = async () => {
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