import React, { createContext, useContext, useState } from 'react';
import { dadosMesas, dadosProdutos, dadosProdutosPopulares, dadosPedidos, dadosItensComanda, dadosAlertasEstoque } from '../data/mockData';
import toast from 'react-hot-toast';

interface RestauranteContextData {
  mesas: Mesa[];
  produtos: Produto[];
  categorias: string[];
  produtosPopulares: ProdutoPopular[];
  pedidos: Pedido[];
  itensComanda: ItemComanda[];
  alertasEstoque: AlertaEstoque[];
  
  adicionarMesa: (dados: { numero: number; capacidade: number }) => void;
  ocuparMesa: (mesaId: number) => void;
  liberarMesa: (mesaId: number) => void;
  solicitarPagamento: (mesaId: number) => void;
  excluirMesa: (mesaId: number) => void;
  finalizarPagamento: (mesaId: number, formaPagamento: string) => Promise<void>;
  
  adicionarItemComanda: (dados: { mesaId: number; produtoId: number; nome: string; categoria: string; quantidade: number; preco: number; observacao?: string }) => void;
  removerItemComanda: (itemId: number) => void;
  atualizarStatusItem: (itemId: number, novoStatus: 'preparando' | 'pronto') => void;
  imprimirComanda: (mesaId: number) => void;
}

const RestauranteContext = createContext<RestauranteContextData>({} as RestauranteContextData);

export const useRestaurante = () => useContext(RestauranteContext);

export const RestauranteProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [mesas, setMesas] = useState<Mesa[]>(dadosMesas);
  const [produtos, setProdutos] = useState<Produto[]>(dadosProdutos);
  const [produtosPopulares] = useState<ProdutoPopular[]>(dadosProdutosPopulares);
  const [pedidos] = useState<Pedido[]>(dadosPedidos);
  const [itensComanda, setItensComanda] = useState<ItemComanda[]>(dadosItensComanda);
  const [alertasEstoque] = useState<AlertaEstoque[]>(dadosAlertasEstoque);
  
  const categorias = Array.from(new Set(produtos.map(produto => produto.categoria)));
  
  const adicionarMesa = ({ numero, capacidade }: { numero: number; capacidade: number }) => {
    if (mesas.some(mesa => mesa.numero === numero)) {
      toast.error(`Mesa ${numero} já existe!`);
      return;
    }
    
    const novaMesa: Mesa = {
      id: Math.max(0, ...mesas.map(m => m.id)) + 1,
      numero,
      capacidade,
      status: 'livre',
      valorTotal: 0,
    };
    
    setMesas([...mesas, novaMesa]);
    toast.success(`Mesa ${numero} adicionada com sucesso!`);
  };
  
  const ocuparMesa = (mesaId: number) => {
    setMesas(mesas.map(mesa => 
      mesa.id === mesaId
        ? { 
            ...mesa, 
            status: 'ocupada',
            horarioAbertura: new Date().toISOString(),
            garcom: 'Carlos Garçom'
          }
        : mesa
    ));
    
    toast.success(`Mesa ocupada com sucesso!`);
  };
  
  const liberarMesa = (mesaId: number) => {
    setMesas(mesas.map(mesa => 
      mesa.id === mesaId
        ? { 
            ...mesa, 
            status: 'livre',
            horarioAbertura: undefined,
            garcom: undefined,
            valorTotal: 0
          }
        : mesa
    ));
    
    setItensComanda(itensComanda.filter(item => item.mesaId !== mesaId));
    
    toast.success(`Mesa liberada com sucesso!`);
  };
  
  const solicitarPagamento = (mesaId: number) => {
    setMesas(mesas.map(mesa => 
      mesa.id === mesaId
        ? { ...mesa, status: 'aguardando' }
        : mesa
    ));
    
    toast.success(`Pagamento solicitado para a mesa!`);
  };
  
  const adicionarItemComanda = async ({ 
    mesaId, 
    produtoId, 
    nome, 
    categoria, 
    quantidade, 
    preco, 
    observacao = '' 
  }: { 
    mesaId: number; 
    produtoId: number; 
    nome: string; 
    categoria: string; 
    quantidade: number; 
    preco: number; 
    observacao?: string 
  }) => {
    try {
      const novoItem: ItemComanda = {
        id: Math.max(0, ...itensComanda.map(i => i.id)) + 1,
        mesaId,
        produtoId,
        nome,
        categoria,
        quantidade,
        preco,
        observacao,
        status: 'pendente',
        horario: new Date().toISOString(),
      };
      
      const produto = produtos.find(p => p.id === produtoId);
      if (produto) {
        if (produto.estoque < quantidade) {
          toast.error(`Estoque insuficiente para ${produto.nome}`);
          return;
        }
        
        const produtosAtualizados = produtos.map(p => 
          p.id === produtoId 
            ? { ...p, estoque: p.estoque - quantidade }
            : p
        );
        setProdutos(produtosAtualizados);
      }
      
      setItensComanda([...itensComanda, novoItem]);
      
      const valorItemTotal = quantidade * preco;
      setMesas(mesas.map(mesa => 
        mesa.id === mesaId
          ? { ...mesa, valorTotal: (mesa.valorTotal || 0) + valorItemTotal }
          : mesa
      ));
      
      toast.success(`Item adicionado à comanda!`);
    } catch (error) {
      console.error('Erro ao adicionar item:', error);
      toast.error('Erro ao adicionar item à comanda');
    }
  };
  
  const removerItemComanda = (itemId: number) => {
    const item = itensComanda.find(i => i.id === itemId);
    
    if (!item) return;
    
    const valorItemTotal = item.quantidade * item.preco;
    setMesas(mesas.map(mesa => 
      mesa.id === item.mesaId
        ? { ...mesa, valorTotal: Math.max(0, (mesa.valorTotal || 0) - valorItemTotal) }
        : mesa
    ));
    
    setItensComanda(itensComanda.filter(i => i.id !== itemId));
    
    toast.success(`Item removido da comanda!`);
  };

  const atualizarStatusItem = (itemId: number, novoStatus: 'preparando' | 'pronto') => {
    setItensComanda(itensComanda.map(item =>
      item.id === itemId
        ? { ...item, status: novoStatus }
        : item
    ));

    toast.success(`Status do item atualizado para ${novoStatus}!`);
  };
  
  const imprimirComanda = (mesaId: number) => {
    toast.success(`Comanda enviada para impressão!`);
  };

  const excluirMesa = (mesaId: number) => {
    setMesas(mesas.filter(mesa => mesa.id !== mesaId));
    setItensComanda(itensComanda.filter(item => item.mesaId !== mesaId));
  };

  const finalizarPagamento = async (mesaId: number, formaPagamento: string) => {
    const mesa = mesas.find(m => m.id === mesaId);
    if (!mesa) return;

    await new Promise(resolve => setTimeout(resolve, 1000));

    setMesas(mesas.map(m => 
      m.id === mesaId ? { ...m, status: 'aguardando' } : m
    ));

    console.log(`Adicionando ${mesa.valorTotal} ao caixa (${formaPagamento})`);
  };
  
  return (
    <RestauranteContext.Provider value={{
      mesas,
      produtos,
      categorias,
      produtosPopulares,
      pedidos,
      itensComanda,
      alertasEstoque,
      
      adicionarMesa,
      ocuparMesa,
      liberarMesa,
      solicitarPagamento,
      excluirMesa,
      finalizarPagamento,
      
      adicionarItemComanda,
      removerItemComanda,
      atualizarStatusItem,
      imprimirComanda,
    }}>
      {children}
    </RestauranteContext.Provider>
  );
};