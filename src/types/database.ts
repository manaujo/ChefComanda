export interface Database {
  public: {
    Tables: {
      restaurantes: {
        Row: {
          id: string;
          user_id: string;
          nome: string;
          telefone: string;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          nome: string;
          telefone: string;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          nome?: string;
          telefone?: string;
          created_at?: string;
          updated_at?: string;
        };
      };
      mesas: {
        Row: {
          id: string;
          restaurante_id: string;
          numero: number;
          capacidade: number;
          status: 'livre' | 'ocupada' | 'aguardando';
          horario_abertura: string | null;
          garcom: string | null;
          valor_total: number;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          restaurante_id: string;
          numero: number;
          capacidade?: number;
          status?: 'livre' | 'ocupada' | 'aguardando';
          horario_abertura?: string | null;
          garcom?: string | null;
          valor_total?: number;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          restaurante_id?: string;
          numero?: number;
          capacidade?: number;
          status?: 'livre' | 'ocupada' | 'aguardando';
          horario_abertura?: string | null;
          garcom?: string | null;
          valor_total?: number;
          created_at?: string;
          updated_at?: string;
        };
      };
      produtos: {
        Row: {
          id: string;
          restaurante_id: string;
          nome: string;
          descricao: string | null;
          preco: number;
          categoria: string;
          disponivel: boolean;
          estoque: number;
          estoque_minimo: number;
          imagem_url: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          restaurante_id: string;
          nome: string;
          descricao?: string | null;
          preco: number;
          categoria: string;
          disponivel?: boolean;
          estoque?: number;
          estoque_minimo?: number;
          imagem_url?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          restaurante_id?: string;
          nome?: string;
          descricao?: string | null;
          preco?: number;
          categoria?: string;
          disponivel?: boolean;
          estoque?: number;
          estoque_minimo?: number;
          imagem_url?: string | null;
          created_at?: string;
          updated_at?: string;
        };
      };
      comandas: {
        Row: {
          id: string;
          mesa_id: string;
          status: 'aberta' | 'fechada' | 'cancelada';
          valor_total: number;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          mesa_id: string;
          status?: 'aberta' | 'fechada' | 'cancelada';
          valor_total?: number;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          mesa_id?: string;
          status?: 'aberta' | 'fechada' | 'cancelada';
          valor_total?: number;
          created_at?: string;
          updated_at?: string;
        };
      };
      itens_comanda: {
        Row: {
          id: string;
          comanda_id: string;
          produto_id: string;
          quantidade: number;
          preco_unitario: number;
          observacao: string | null;
          status: 'pendente' | 'preparando' | 'pronto' | 'entregue' | 'cancelado';
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          comanda_id: string;
          produto_id: string;
          quantidade?: number;
          preco_unitario: number;
          observacao?: string | null;
          status?: 'pendente' | 'preparando' | 'pronto' | 'entregue' | 'cancelado';
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          comanda_id?: string;
          produto_id?: string;
          quantidade?: number;
          preco_unitario?: number;
          observacao?: string | null;
          status?: 'pendente' | 'preparando' | 'pronto' | 'entregue' | 'cancelado';
          created_at?: string;
          updated_at?: string;
        };
      };
      caixas: {
        Row: {
          id: string;
          restaurante_id: string;
          usuario_id: string;
          valor_inicial: number;
          valor_final: number | null;
          valor_sistema: number;
          status: 'aberto' | 'fechado';
          data_abertura: string;
          data_fechamento: string | null;
          observacao: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          restaurante_id: string;
          usuario_id: string;
          valor_inicial?: number;
          valor_final?: number | null;
          valor_sistema?: number;
          status?: 'aberto' | 'fechado';
          data_abertura?: string;
          data_fechamento?: string | null;
          observacao?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          restaurante_id?: string;
          usuario_id?: string;
          valor_inicial?: number;
          valor_final?: number | null;
          valor_sistema?: number;
          status?: 'aberto' | 'fechado';
          data_abertura?: string;
          data_fechamento?: string | null;
          observacao?: string | null;
          created_at?: string;
          updated_at?: string;
        };
      };
      movimentacoes_caixa: {
        Row: {
          id: string;
          caixa_id: string;
          tipo: 'entrada' | 'saida';
          valor: number;
          motivo: string;
          observacao: string | null;
          forma_pagamento: string | null;
          usuario_id: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          caixa_id: string;
          tipo: 'entrada' | 'saida';
          valor: number;
          motivo: string;
          observacao?: string | null;
          forma_pagamento?: string | null;
          usuario_id: string;
          created_at?: string;
        };
        Update: {
          id?: string;
          caixa_id?: string;
          tipo?: 'entrada' | 'saida';
          valor?: number;
          motivo?: string;
          observacao?: string | null;
          forma_pagamento?: string | null;
          usuario_id?: string;
          created_at?: string;
        };
      };
      vendas: {
        Row: {
          id: string;
          restaurante_id: string;
          mesa_id: string | null;
          comanda_id: string | null;
          valor_total: number;
          forma_pagamento: string;
          status: 'concluida' | 'cancelada';
          usuario_id: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          restaurante_id: string;
          mesa_id?: string | null;
          comanda_id?: string | null;
          valor_total: number;
          forma_pagamento: string;
          status?: 'concluida' | 'cancelada';
          usuario_id: string;
          created_at?: string;
        };
        Update: {
          id?: string;
          restaurante_id?: string;
          mesa_id?: string | null;
          comanda_id?: string | null;
          valor_total?: number;
          forma_pagamento?: string;
          status?: 'concluida' | 'cancelada';
          usuario_id?: string;
          created_at?: string;
        };
      };
      audit_logs: {
        Row: {
          id: string;
          user_id: string;
          action_type: string;
          entity_type: string;
          entity_id: string | null;
          details: any | null;
          ip_address: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          action_type: string;
          entity_type: string;
          entity_id?: string | null;
          details?: any | null;
          ip_address?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          action_type?: string;
          entity_type?: string;
          entity_id?: string | null;
          details?: any | null;
          ip_address?: string | null;
          created_at?: string;
        };
      };
      profiles: {
        Row: {
          id: string;
          name: string | null;
          avatar_url: string | null;
          notifications_enabled: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id: string;
          name?: string | null;
          avatar_url?: string | null;
          notifications_enabled?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          name?: string | null;
          avatar_url?: string | null;
          notifications_enabled?: boolean;
          created_at?: string;
          updated_at?: string;
        };
      };
      user_roles: {
        Row: {
          id: string;
          user_id: string;
          role: 'admin' | 'kitchen' | 'waiter' | 'cashier' | 'stock';
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          role: 'admin' | 'kitchen' | 'waiter' | 'cashier' | 'stock';
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          role?: 'admin' | 'kitchen' | 'waiter' | 'cashier' | 'stock';
          created_at?: string;
          updated_at?: string;
        };
      };
    };
  };
}