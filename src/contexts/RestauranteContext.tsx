import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';

interface Mesa {
  id: string;
  numero: number;
  capacidade: number;
  status: 'livre' | 'ocupada' | 'reservada';
  comandaId?: string;
}

interface Produto {
  id: string;
  nome: string;
  preco: number;
  categoria: string;
  disponivel: boolean;
}

interface Comanda {
  id: string;
  mesaId: string;
  status: 'aberta' | 'fechada';
  total: number;
  createdAt: string;
}

interface ItemComanda {
  id: string;
  comandaId: string;
  produtoId: string;
  quantidade: number;
  preco: number;
}

interface Funcionario {
  id: string;
  nome: string;
  email: string;
  cargo: string;
  ativo: boolean;
}

interface Restaurante {
  id: string;
  nome: string;
  endereco: string;
  telefone: string;
  email: string;
  cnpj: string;
  configuracoes: {
    horarioFuncionamento: {
      abertura: string;
      fechamento: string;
    };
    taxaServico: number;
    aceitaReservas: boolean;
  };
}

interface RestauranteContextType {
  restaurante: Restaurante | null;
  mesas: Mesa[];
  produtos: Produto[];
  comandas: Comanda[];
  itensComanda: ItemComanda[];
  funcionarios: Funcionario[];
  loading: boolean;
  error: string | null;
  updateRestaurante: (dados: Partial<Restaurante>) => Promise<void>;
  carregarRestaurante: () => Promise<void>;
  refreshData: () => Promise<void>;
}

const RestauranteContext = createContext<RestauranteContextType | undefined>(undefined);

interface RestauranteProviderProps {
  children: ReactNode;
}

export const RestauranteProvider: React.FC<RestauranteProviderProps> = ({ children }) => {
  const [restaurante, setRestaurante] = useState<Restaurante | null>(null);
  const [mesas, setMesas] = useState<Mesa[]>([]);
  const [produtos, setProdutos] = useState<Produto[]>([]);
  const [comandas, setComandas] = useState<Comanda[]>([]);
  const [itensComanda, setItensComanda] = useState<ItemComanda[]>([]);
  const [funcionarios, setFuncionarios] = useState<Funcionario[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const carregarRestaurante = async () => {
    try {
      setLoading(true);
      setError(null);
      
      // Simulated data - replace with actual API call
      const dadosRestaurante: Restaurante = {
        id: '1',
        nome: 'Restaurante Exemplo',
        endereco: 'Rua das Flores, 123',
        telefone: '(11) 99999-9999',
        email: 'contato@restaurante.com',
        cnpj: '12.345.678/0001-90',
        configuracoes: {
          horarioFuncionamento: {
            abertura: '08:00',
            fechamento: '22:00'
          },
          taxaServico: 10,
          aceitaReservas: true
        }
      };
      
      setRestaurante(dadosRestaurante);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao carregar dados do restaurante');
    } finally {
      setLoading(false);
    }
  };

  const refreshData = async () => {
    try {
      setLoading(true);
      setError(null);
      
      // Simulated data - replace with actual CRUDService and ReportsService calls
      const mesasData: Mesa[] = [
        { id: '1', numero: 1, capacidade: 4, status: 'livre' },
        { id: '2', numero: 2, capacidade: 2, status: 'ocupada', comandaId: '1' },
        { id: '3', numero: 3, capacidade: 6, status: 'reservada' },
      ];

      const produtosData: Produto[] = [
        { id: '1', nome: 'Pizza Margherita', preco: 35.90, categoria: 'Pizza', disponivel: true },
        { id: '2', nome: 'Hambúrguer Clássico', preco: 28.50, categoria: 'Hambúrguer', disponivel: true },
        { id: '3', nome: 'Refrigerante', preco: 8.00, categoria: 'Bebida', disponivel: true },
      ];

      const comandasData: Comanda[] = [
        { id: '1', mesaId: '2', status: 'aberta', total: 44.40, createdAt: new Date().toISOString() },
      ];

      const itensComandaData: ItemComanda[] = [
        { id: '1', comandaId: '1', produtoId: '1', quantidade: 1, preco: 35.90 },
        { id: '2', comandaId: '1', produtoId: '3', quantidade: 1, preco: 8.00 },
      ];

      const funcionariosData: Funcionario[] = [
        { id: '1', nome: 'João Silva', email: 'joao@restaurante.com', cargo: 'Garçom', ativo: true },
        { id: '2', nome: 'Maria Santos', email: 'maria@restaurante.com', cargo: 'Cozinheira', ativo: true },
      ];

      setMesas(mesasData);
      setProdutos(produtosData);
      setComandas(comandasData);
      setItensComanda(itensComandaData);
      setFuncionarios(funcionariosData);
      
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao carregar dados');
    } finally {
      setLoading(false);
    }
  };

  const updateRestaurante = async (dados: Partial<Restaurante>) => {
    try {
      setLoading(true);
      setError(null);
      
      if (!restaurante) {
        throw new Error('Nenhum restaurante carregado');
      }
      
      // Simulated update - replace with actual API call
      const restauranteAtualizado = { ...restaurante, ...dados };
      setRestaurante(restauranteAtualizado);
      
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao atualizar restaurante');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const initializeData = async () => {
      await carregarRestaurante();
      await refreshData();
    };
    
    initializeData();
  }, []);

  const value: RestauranteContextType = {
    restaurante,
    mesas,
    produtos,
    comandas,
    itensComanda,
    funcionarios,
    loading,
    error,
    updateRestaurante,
    carregarRestaurante,
    refreshData
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