type UserRole = 'admin' | 'cashier' | 'kitchen' | 'waiter';

type ThemeMode = 'light' | 'dark';

type Mesa = {
  id: number;
  numero: number;
  capacidade: number;
  status: 'livre' | 'ocupada' | 'aguardando';
  horarioAbertura?: string;
  garcom?: string;
  valorTotal: number;
};

type Produto = {
  id: number;
  nome: string;
  descricao: string;
  preco: number;
  categoria: string;
  disponivel: boolean;
  estoque: number;
  estoqueMinimo: number;
};

type ProdutoPopular = {
  id: number;
  nome: string;
  preco: number;
  categoria: string;
  vendidos: number;
  percentual: number;
};

type Pedido = {
  id: number;
  mesaId: number;
  status: 'pendente' | 'preparando' | 'pronto' | 'entregue' | 'cancelado';
  horario: string;
  itens: {
    id: number;
    produtoId: number;
    nome: string;
    quantidade: number;
  }[];
};

type ItemComanda = {
  id: number;
  mesaId: number;
  produtoId: number;
  nome: string;
  categoria: string;
  quantidade: number;
  preco: number;
  observacao?: string;
  status: 'pendente' | 'preparando' | 'pronto' | 'entregue' | 'cancelado';
  horario: string;
};

type AlertaEstoque = {
  id: number;
  produto: string;
  quantidade: number;
  estoqueMinimo: number;
  data: string;
};

type Venda = {
  id: number;
  data: string;
  valor: number;
  formaPagamento: 'dinheiro' | 'cartao' | 'pix';
  status: 'concluida' | 'cancelada';
  itens: {
    produtoId: number;
    quantidade: number;
    precoUnitario: number;
  }[];
};

type CaixaMovimentacao = {
  id: number;
  tipo: 'entrada' | 'saida';
  valor: number;
  descricao: string;
  formaPagamento?: string;
  data: string;
};