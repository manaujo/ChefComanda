// Add to existing mockData.ts
export const cardapioItems = [
  {
    id: 1,
    nome: "Picanha Grelhada",
    descricao: "Suculenta picanha grelhada na brasa, acompanhada de arroz, farofa especial, vinagrete e pão de alho. Serve 2 pessoas.",
    preco: 159.90,
    categoria: "Menu Principal",
    imagem: "https://images.pexels.com/photos/1251198/pexels-photo-1251198.jpeg",
    disponivel: true
  },
  {
    id: 2,
    nome: "Frango à Parmegiana",
    descricao: "Peito de frango empanado coberto com molho de tomate caseiro, queijo muçarela gratinado e manjericão fresco. Acompanha arroz e fritas.",
    preco: 89.90,
    categoria: "Menu Principal",
    imagem: "https://images.pexels.com/photos/2338407/pexels-photo-2338407.jpeg",
    disponivel: true
  },
  {
    id: 3,
    nome: "Mini Hambúrguer com Batata",
    descricao: "Dois deliciosos mini hambúrgueres de carne bovina, queijo cheddar, alface e tomate. Acompanha porção de batatas fritas crocantes.",
    preco: 45.90,
    categoria: "Menu Kids",
    imagem: "https://images.pexels.com/photos/2271107/pexels-photo-2271107.jpeg",
    disponivel: true
  },
  {
    id: 4,
    nome: "Macarrãozinho",
    descricao: "Espaguete ao molho de tomate suave, finalizado com queijo parmesão ralado. Perfeito para as crianças.",
    preco: 35.90,
    categoria: "Menu Kids",
    imagem: "https://images.pexels.com/photos/1527603/pexels-photo-1527603.jpeg",
    disponivel: true
  },
  {
    id: 5,
    nome: "Bruschettas Italianas",
    descricao: "Mix de bruschettas com tomate e manjericão, cogumelos salteados e presunto de parma. 6 unidades.",
    preco: 42.90,
    categoria: "Entradas",
    imagem: "https://images.pexels.com/photos/2228566/pexels-photo-2228566.jpeg",
    disponivel: true
  },
  {
    id: 6,
    nome: "Coxinha de Frango",
    descricao: "Coxinha cremosa de frango com catupiry, massa crocante por fora e recheio suculento. 6 unidades.",
    preco: 32.90,
    categoria: "Entradas",
    imagem: "https://images.pexels.com/photos/6941026/pexels-photo-6941026.jpeg",
    disponivel: true
  },
  {
    id: 7,
    nome: "Refrigerante Lata",
    descricao: "Coca-Cola, Guaraná Antarctica, Fanta ou Sprite. Lata 350ml gelada.",
    preco: 7.90,
    categoria: "Bebidas",
    imagem: "https://images.pexels.com/photos/2983100/pexels-photo-2983100.jpeg",
    disponivel: true
  },
  {
    id: 8,
    nome: "Suco Natural",
    descricao: "Sucos naturais: Laranja, Abacaxi, Limão ou Maracujá. Copo 400ml.",
    preco: 12.90,
    categoria: "Bebidas",
    imagem: "https://images.pexels.com/photos/1337825/pexels-photo-1337825.jpeg",
    disponivel: true
  },
  {
    id: 9,
    nome: "Brownie com Sorvete",
    descricao: "Brownie caseiro quentinho com sorvete de creme, calda de chocolate e chantilly.",
    preco: 28.90,
    categoria: "Sobremesas",
    imagem: "https://images.pexels.com/photos/3026804/pexels-photo-3026804.jpeg",
    disponivel: true
  },
  {
    id: 10,
    nome: "Pudim de Leite Condensado",
    descricao: "Clássico pudim de leite condensado com calda de caramelo. Receita tradicional da casa.",
    preco: 22.90,
    categoria: "Sobremesas",
    imagem: "https://images.pexels.com/photos/4051583/pexels-photo-4051583.jpeg",
    disponivel: true
  }
];

export const dadosAlertasEstoque = [
  {
    id: 1,
    produto: "Picanha",
    quantidadeAtual: 5,
    quantidadeMinima: 10,
    unidade: "kg",
    status: "crítico",
    ultimaAtualizacao: "2025-05-14T10:30:00Z"
  },
  {
    id: 2,
    produto: "Arroz",
    quantidadeAtual: 15,
    quantidadeMinima: 20,
    unidade: "kg",
    status: "baixo",
    ultimaAtualizacao: "2025-05-14T09:15:00Z"
  },
  {
    id: 3,
    produto: "Coca-Cola Lata",
    quantidadeAtual: 24,
    quantidadeMinima: 50,
    unidade: "unidades",
    status: "baixo",
    ultimaAtualizacao: "2025-05-14T11:45:00Z"
  },
  {
    id: 4,
    produto: "Queijo Muçarela",
    quantidadeAtual: 2,
    quantidadeMinima: 5,
    unidade: "kg",
    status: "crítico",
    ultimaAtualizacao: "2025-05-14T08:20:00Z"
  },
  {
    id: 5,
    produto: "Óleo de Cozinha",
    quantidadeAtual: 8,
    quantidadeMinima: 10,
    unidade: "litros",
    status: "baixo",
    ultimaAtualizacao: "2025-05-14T12:00:00Z"
  }
];

export const dadosItensComanda = [
  {
    id: 1,
    mesaId: 1,
    produtoId: 1,
    nome: "Picanha Grelhada",
    categoria: "Menu Principal",
    quantidade: 1,
    preco: 159.90,
    observacao: "Ao ponto",
    status: "pendente",
    horario: "2025-05-14T10:30:00Z"
  },
  {
    id: 2,
    mesaId: 1,
    produtoId: 7,
    nome: "Refrigerante Lata",
    categoria: "Bebidas",
    quantidade: 2,
    preco: 7.90,
    observacao: "Coca-Cola bem gelada",
    status: "pronto",
    horario: "2025-05-14T10:32:00Z"
  },
  {
    id: 3,
    mesaId: 2,
    produtoId: 2,
    nome: "Frango à Parmegiana",
    categoria: "Menu Principal",
    quantidade: 1,
    preco: 89.90,
    observacao: "",
    status: "preparando",
    horario: "2025-05-14T10:45:00Z"
  }
];

// Add other required mock data exports that are used in RestauranteContext
export const dadosMesas = [
  {
    id: 1,
    numero: 1,
    capacidade: 4,
    status: 'ocupada',
    valorTotal: 175.70,
    horarioAbertura: "2025-05-14T10:15:00Z",
    garcom: "Carlos Garçom"
  },
  {
    id: 2,
    numero: 2,
    capacidade: 2,
    status: 'ocupada',
    valorTotal: 89.90,
    horarioAbertura: "2025-05-14T10:40:00Z",
    garcom: "Carlos Garçom"
  },
  {
    id: 3,
    numero: 3,
    capacidade: 6,
    status: 'livre',
    valorTotal: 0
  }
];

export const dadosProdutos = [
  {
    id: 1,
    nome: "Picanha Grelhada",
    preco: 159.90,
    categoria: "Menu Principal",
    estoque: 15
  },
  {
    id: 2,
    nome: "Frango à Parmegiana",
    preco: 89.90,
    categoria: "Menu Principal",
    estoque: 20
  },
  {
    id: 7,
    nome: "Refrigerante Lata",
    preco: 7.90,
    categoria: "Bebidas",
    estoque: 50
  }
];

export const dadosProdutosPopulares = [
  {
    id: 1,
    nome: "Picanha Grelhada",
    quantidade: 150,
    valor: 23985.00
  },
  {
    id: 2,
    nome: "Frango à Parmegiana",
    quantidade: 120,
    valor: 10788.00
  }
];

export const dadosPedidos = [
  {
    id: 1,
    mesa: 1,
    status: "em preparo",
    horario: "2025-05-14T10:30:00Z",
    items: [
      {
        id: 1,
        nome: "Picanha Grelhada",
        quantidade: 1,
        preco: 159.90
      }
    ]
  },
  {
    id: 2,
    mesa: 2,
    status: "em preparo",
    horario: "2025-05-14T10:45:00Z",
    items: [
      {
        id: 2,
        nome: "Frango à Parmegiana",
        quantidade: 1,
        preco: 89.90
      }
    ]
  }
];