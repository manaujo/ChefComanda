type UserRole = 'admin' | 'cashier' | 'kitchen' | 'waiter' | 'stock';

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

type ComandaItemData = {
  id: string;
  mesa_id: string;
  comanda_id: string;
  produto_id: string;
  quantidade: number;
  preco_unitario: number;
  observacao?: string;
  status: 'pendente' | 'preparando' | 'pronto' | 'entregue' | 'cancelado';
  created_at: string;
  // Flattened product details
  nome: string;
  categoria: string;
  preco: number;
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
  id: string;
  caixaId: string;
  tipo: 'entrada' | 'saida';
  valor: number;
  formaPagamento?: string;
  motivo: string;
  observacao?: string;
  usuarioId: string;
  createdAt: string;
};

type Caixa = {
  id: string;
  restauranteId: string;
  usuarioId: string;
  valorInicial: number;
  valorFinal?: number;
  valorSistema?: number;
  diferenca?: number;
  status: 'aberto' | 'fechado';
  dataAbertura: string;
  dataFechamento?: string;
  observacao?: string;
  createdAt: string;
  updatedAt: string;
};