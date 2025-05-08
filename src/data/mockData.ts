// Tipos
interface Mesa {
  id: number;
  numero: number;
  capacidade: number;
  status: 'livre' | 'ocupada' | 'aguardando';
  horarioAbertura?: string;
  garcom?: string;
  valorTotal: number;
}

interface Produto {
  id: number;
  nome: string;
  descricao: string;
  preco: number;
  categoria: string;
  disponivel: boolean;
  estoque: number;
  estoqueMinimo: number;
}

interface ProdutoPopular {
  id: number;
  nome: string;
  preco: number;
  categoria: string;
  vendidos: number;
  percentual: number;
}

interface Pedido {
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
}

interface ItemComanda {
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
}

interface AlertaEstoque {
  id: number;
  produto: string;
  quantidade: number;
  estoqueMinimo: number;
  data: string;
}

// Dados simulados
export const dadosMesas: Mesa[] = [
  { id: 1, numero: 1, capacidade: 4, status: 'livre', valorTotal: 0 },
  { id: 2, numero: 2, capacidade: 2, status: 'ocupada', horarioAbertura: '2025-03-10T14:30:00', garcom: 'Carlos Garçom', valorTotal: 98.50 },
  { id: 3, numero: 3, capacidade: 6, status: 'ocupada', horarioAbertura: '2025-03-10T15:15:00', garcom: 'Carlos Garçom', valorTotal: 157.80 },
  { id: 4, numero: 4, capacidade: 4, status: 'aguardando', horarioAbertura: '2025-03-10T13:45:00', garcom: 'Carlos Garçom', valorTotal: 210.75 },
  { id: 5, numero: 5, capacidade: 2, status: 'livre', valorTotal: 0 },
  { id: 6, numero: 6, capacidade: 8, status: 'ocupada', horarioAbertura: '2025-03-10T15:30:00', garcom: 'Carlos Garçom', valorTotal: 65.90 },
  { id: 7, numero: 7, capacidade: 4, status: 'livre', valorTotal: 0 },
  { id: 8, numero: 8, capacidade: 4, status: 'livre', valorTotal: 0 },
  { id: 9, numero: 9, capacidade: 2, status: 'ocupada', horarioAbertura: '2025-03-10T16:00:00', garcom: 'Carlos Garçom', valorTotal: 45.50 },
  { id: 10, numero: 10, capacidade: 6, status: 'livre', valorTotal: 0 },
];

export const dadosProdutos: Produto[] = [
  { id: 1, nome: 'Filé Mignon ao Molho Madeira', descricao: 'Filé mignon grelhado com molho madeira, acompanha arroz e batatas', preco: 69.90, categoria: 'Cozinha', disponivel: true, estoque: 20, estoqueMinimo: 5 },
  { id: 2, nome: 'Risoto de Camarão', descricao: 'Risoto cremoso com camarões salteados e ervas finas', preco: 75.50, categoria: 'Cozinha', disponivel: true, estoque: 15, estoqueMinimo: 3 },
  { id: 3, nome: 'Espaguete à Carbonara', descricao: 'Espaguete com molho cremoso, bacon crocante e ovo', preco: 45.90, categoria: 'Cozinha', disponivel: true, estoque: 30, estoqueMinimo: 8 },
  { id: 4, nome: 'Caesar Salad', descricao: 'Alface americana, croutons, queijo parmesão e molho caesar', preco: 35.90, categoria: 'Cozinha', disponivel: true, estoque: 25, estoqueMinimo: 5 },
  { id: 5, nome: 'Caipirinha de Limão', descricao: 'Cachaça, limão, açúcar e gelo', preco: 18.50, categoria: 'Bar', disponivel: true, estoque: 50, estoqueMinimo: 10 },
  { id: 6, nome: 'Mojito', descricao: 'Rum, hortelã, limão, açúcar e água com gás', preco: 22.90, categoria: 'Bar', disponivel: true, estoque: 40, estoqueMinimo: 8 },
  { id: 7, nome: 'Cerveja Artesanal IPA', descricao: 'Cerveja artesanal do tipo India Pale Ale', preco: 25.90, categoria: 'Bar', disponivel: true, estoque: 35, estoqueMinimo: 12 },
  { id: 8, nome: 'Suco de Laranja Natural', descricao: 'Suco de laranja natural sem adição de açúcar', preco: 12.50, categoria: 'Bar', disponivel: true, estoque: 60, estoqueMinimo: 15 },
  { id: 9, nome: 'Tiramisù', descricao: 'Sobremesa italiana com café, queijo mascarpone e cacau em pó', preco: 28.90, categoria: 'Sobremesa', disponivel: true, estoque: 18, estoqueMinimo: 4 },
  { id: 10, nome: 'Pudim de Leite', descricao: 'Pudim tradicional de leite condensado com calda de caramelo', preco: 15.90, categoria: 'Sobremesa', disponivel: true, estoque: 22, estoqueMinimo: 5 },
  { id: 11, nome: 'Petit Gateau', descricao: 'Bolo de chocolate quente com interior derretido, acompanha sorvete de creme', preco: 32.50, categoria: 'Sobremesa', disponivel: true, estoque: 20, estoqueMinimo: 5 },
  { id: 12, nome: 'Água Mineral', descricao: 'Água mineral sem gás', preco: 6.50, categoria: 'Bar', disponivel: true, estoque: 2, estoqueMinimo: 20 },
];

export const dadosProdutosPopulares: ProdutoPopular[] = [
  { id: 1, nome: 'Filé Mignon ao Molho Madeira', preco: 69.90, categoria: 'Cozinha', vendidos: 28, percentual: 85 },
  { id: 3, nome: 'Espaguete à Carbonara', preco: 45.90, categoria: 'Cozinha', vendidos: 22, percentual: 78 },
  { id: 5, nome: 'Caipirinha de Limão', preco: 18.50, categoria: 'Bar', vendidos: 45, percentual: 92 },
  { id: 9, nome: 'Tiramisù', preco: 28.90, categoria: 'Sobremesa', vendidos: 18, percentual: 65 },
];

export const dadosPedidos: Pedido[] = [
  { 
    id: 1, 
    mesaId: 2, 
    status: 'pendente', 
    horario: '2025-03-10T15:05:00', 
    itens: [
      { id: 1, produtoId: 3, nome: 'Espaguete à Carbonara', quantidade: 2 },
      { id: 2, produtoId: 5, nome: 'Caipirinha de Limão', quantidade: 2 },
    ] 
  },
  { 
    id: 2, 
    mesaId: 3, 
    status: 'preparando', 
    horario: '2025-03-10T15:20:00', 
    itens: [
      { id: 3, produtoId: 1, nome: 'Filé Mignon ao Molho Madeira', quantidade: 1 },
      { id: 4, produtoId: 8, nome: 'Suco de Laranja Natural', quantidade: 1 },
    ] 
  },
  { 
    id: 3, 
    mesaId: 6, 
    status: 'pendente', 
    horario: '2025-03-10T15:35:00', 
    itens: [
      { id: 5, produtoId: 2, nome: 'Risoto de Camarão', quantidade: 1 },
    ] 
  },
];

export const dadosItensComanda: ItemComanda[] = [
  { 
    id: 1, 
    mesaId: 2, 
    produtoId: 3, 
    nome: 'Espaguete à Carbonara', 
    categoria: 'Cozinha',
    quantidade: 2, 
    preco: 45.90, 
    status: 'pendente', 
    horario: '2025-03-10T15:05:00' 
  },
  { 
    id: 2, 
    mesaId: 2, 
    produtoId: 5, 
    nome: 'Caipirinha de Limão', 
    categoria: 'Bar',
    quantidade: 1, 
    preco: 18.50, 
    observacao: 'Pouco açúcar',
    status: 'entregue', 
    horario: '2025-03-10T15:00:00' 
  },
  { 
    id: 3, 
    mesaId: 3, 
    produtoId: 1, 
    nome: 'Filé Mignon ao Molho Madeira', 
    categoria: 'Cozinha',
    quantidade: 1, 
    preco: 69.90, 
    observacao: 'Ao ponto',
    status: 'preparando', 
    horario: '2025-03-10T15:20:00' 
  },
  { 
    id: 4, 
    mesaId: 3, 
    produtoId: 8, 
    nome: 'Suco de Laranja Natural', 
    categoria: 'Bar',
    quantidade: 1, 
    preco: 12.50, 
    status: 'entregue', 
    horario: '2025-03-10T15:22:00' 
  },
  { 
    id: 5, 
    mesaId: 6, 
    produtoId: 2, 
    nome: 'Risoto de Camarão', 
    categoria: 'Cozinha',
    quantidade: 1, 
    preco: 75.50, 
    status: 'pendente', 
    horario: '2025-03-10T15:35:00' 
  },
];

export const dadosAlertasEstoque: AlertaEstoque[] = [
  { id: 1, produto: 'Água Mineral', quantidade: 2, estoqueMinimo: 20, data: '2025-03-10T15:00:00' },
  { id: 2, produto: 'Camarão', quantidade: 1, estoqueMinimo: 3, data: '2025-03-10T14:30:00' },
];