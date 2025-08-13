export interface Database {
  public: {
    Tables: {
      restaurantes: {
        Row: {
          id: string;
          user_id: string;
          nome: string;
          telefone: string;
          endereco: any | null;
          configuracoes: any | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          nome: string;
          telefone: string;
          endereco?: any | null;
          configuracoes?: any | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          nome?: string;
          telefone?: string;
          endereco?: any | null;
          configuracoes?: any | null;
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
      caixas_operadores: {
        Row: {
          id: string;
          restaurante_id: string;
          operador_id: string;
          operador_nome: string;
          operador_tipo: 'funcionario' | 'usuario';
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
          operador_id: string;
          operador_nome: string;
          operador_tipo: 'funcionario' | 'usuario';
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
          operador_id?: string;
          operador_nome?: string;
          operador_tipo?: 'funcionario' | 'usuario';
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
          caixa_id?: string;
          caixa_operador_id?: string;
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
          caixa_id?: string;
          caixa_operador_id?: string;
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
          caixa_operador_id?: string;
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
          cpf: string | null;
          avatar_url: string | null;
          notifications_enabled: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id: string;
          name?: string | null;
          cpf?: string | null;
          avatar_url?: string | null;
          notifications_enabled?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          name?: string | null;
          cpf?: string | null;
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
      pdv_sessions: {
        Row: {
          id: string;
          caixa_operador_id: string;
          operador_id: string;
          operador_nome: string;
          total_vendas: number;
          quantidade_vendas: number;
          data_inicio: string;
          data_fim: string | null;
          status: 'ativo' | 'finalizado';
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          caixa_operador_id: string;
          operador_id: string;
          operador_nome: string;
          total_vendas?: number;
          quantidade_vendas?: number;
          data_inicio?: string;
          data_fim?: string | null;
          status?: 'ativo' | 'finalizado';
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          caixa_operador_id?: string;
          operador_id?: string;
          operador_nome?: string;
          total_vendas?: number;
          quantidade_vendas?: number;
          data_inicio?: string;
          data_fim?: string | null;
          status?: 'ativo' | 'finalizado';
          created_at?: string;
          updated_at?: string;
        };
      };
    };
    insumos: {
      Row: {
        id: string;
        restaurante_id: string;
        nome: string;
        descricao: string | null;
        unidade_medida: string;
        quantidade: number;
        quantidade_minima: number;
        data_validade: string | null;
        preco_unitario: number | null;
        ativo: boolean;
        created_at: string;
        updated_at: string;
      };
      Insert: {
        id?: string;
        restaurante_id: string;
        nome: string;
        descricao?: string | null;
        unidade_medida: string;
        quantidade?: number;
        quantidade_minima?: number;
        data_validade?: string | null;
        preco_unitario?: number | null;
        ativo?: boolean;
        created_at?: string;
        updated_at?: string;
      };
      Update: {
        id?: string;
        restaurante_id?: string;
        nome?: string;
        descricao?: string | null;
        unidade_medida?: string;
        quantidade?: number;
        quantidade_minima?: number;
        data_validade?: string | null;
        preco_unitario?: number | null;
        ativo?: boolean;
        created_at?: string;
        updated_at?: string;
      };
    };
    categorias: {
      Row: {
        id: string;
        restaurante_id: string;
        nome: string;
        descricao: string | null;
        ativa: boolean;
        created_at: string;
        updated_at: string;
      };
      Insert: {
        id?: string;
        restaurante_id: string;
        nome: string;
        descricao?: string | null;
        ativa?: boolean;
        created_at?: string;
        updated_at?: string;
      };
      Update: {
        id?: string;
        restaurante_id?: string;
        nome?: string;
        descricao?: string | null;
        ativa?: boolean;
        created_at?: string;
        updated_at?: string;
      };
    };
    cardapio_online: {
      Row: {
        id: string;
        restaurante_id: string;
        nome: string;
        descricao: string | null;
        preco: number;
        categoria: string;
        imagem_url: string | null;
        ordem: number;
        ativo: boolean;
        disponivel_online: boolean;
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
        imagem_url?: string | null;
        ordem?: number;
        ativo?: boolean;
        disponivel_online?: boolean;
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
        imagem_url?: string | null;
        ordem?: number;
        ativo?: boolean;
        disponivel_online?: boolean;
        created_at?: string;
        updated_at?: string;
      };
    };
    company_profiles: {
      Row: {
        id: string;
        user_id: string;
        name: string;
        cnpj: string | null;
        address: any | null;
        contact: any | null;
        created_at: string;
        updated_at: string;
      };
      Insert: {
        id?: string;
        user_id: string;
        name: string;
        cnpj?: string | null;
        address?: any | null;
        contact?: any | null;
        created_at?: string;
        updated_at?: string;
      };
      Update: {
        id?: string;
        user_id?: string;
        name?: string;
        cnpj?: string | null;
        address?: any | null;
        contact?: any | null;
        created_at?: string;
        updated_at?: string;
      };
    };
    employees: {
      Row: {
        id: string;
        company_id: string;
        name: string;
        cpf: string;
        role: string;
        active: boolean;
        auth_user_id: string | null;
        restaurant_id: string | null;
        created_at: string;
        updated_at: string;
      };
      Insert: {
        id?: string;
        company_id: string;
        name: string;
        cpf: string;
        role: string;
        active?: boolean;
        auth_user_id?: string | null;
        restaurant_id?: string | null;
        created_at?: string;
        updated_at?: string;
      };
      Update: {
        id?: string;
        company_id?: string;
        name?: string;
        cpf?: string;
        role?: string;
        active?: boolean;
        auth_user_id?: string | null;
        restaurant_id?: string | null;
        created_at?: string;
        updated_at?: string;
      };
    };
    employee_auth: {
      Row: {
        id: string;
        employee_id: string;
        cpf: string;
        password_hash: string;
        last_login: string | null;
        created_at: string;
      };
      Insert: {
        id?: string;
        employee_id: string;
        cpf: string;
        password_hash: string;
        last_login?: string | null;
        created_at?: string;
      };
      Update: {
        id?: string;
        employee_id?: string;
        cpf?: string;
        password_hash?: string;
        last_login?: string | null;
        created_at?: string;
      };
    };
    employee_sessions: {
      Row: {
        id: string;
        employee_id: string;
        token: string;
        expires_at: string;
        created_at: string;
      };
      Insert: {
        id?: string;
        employee_id: string;
        token: string;
        expires_at: string;
        created_at?: string;
      };
      Update: {
        id?: string;
        employee_id?: string;
        token?: string;
        expires_at?: string;
        created_at?: string;
      };
    };
    notifications: {
      Row: {
        id: string;
        user_id: string;
        title: string;
        message: string;
        type: string;
        read: boolean;
        data: any | null;
        created_at: string;
      };
      Insert: {
        id?: string;
        user_id: string;
        title: string;
        message: string;
        type: string;
        read?: boolean;
        data?: any | null;
        created_at?: string;
      };
      Update: {
        id?: string;
        user_id?: string;
        title?: string;
        message?: string;
        type?: string;
        read?: boolean;
        data?: any | null;
        created_at?: string;
      };
    };
    stripe_customers: {
      Row: {
        id: string;
        user_id: string;
        customer_id: string;
        created_at: string;
        deleted_at: string | null;
      };
      Insert: {
        id?: string;
        user_id: string;
        customer_id: string;
        created_at?: string;
        deleted_at?: string | null;
      };
      Update: {
        id?: string;
        user_id?: string;
        customer_id?: string;
        created_at?: string;
        deleted_at?: string | null;
      };
    };
    stripe_subscriptions: {
      Row: {
        id: string;
        customer_id: string;
        subscription_id: string | null;
        price_id: string | null;
        status: string;
        current_period_start: number | null;
        current_period_end: number | null;
        cancel_at_period_end: boolean;
        payment_method_brand: string | null;
        payment_method_last4: string | null;
        created_at: string;
        updated_at: string;
      };
      Insert: {
        id?: string;
        customer_id: string;
        subscription_id?: string | null;
        price_id?: string | null;
        status?: string;
        current_period_start?: number | null;
        current_period_end?: number | null;
        cancel_at_period_end?: boolean;
        payment_method_brand?: string | null;
        payment_method_last4?: string | null;
        created_at?: string;
        updated_at?: string;
      };
      Update: {
        id?: string;
        customer_id?: string;
        subscription_id?: string | null;
        price_id?: string | null;
        status?: string;
        current_period_start?: number | null;
        current_period_end?: number | null;
        cancel_at_period_end?: boolean;
        payment_method_brand?: string | null;
        payment_method_last4?: string | null;
        created_at?: string;
        updated_at?: string;
      };
    };
    stripe_orders: {
      Row: {
        id: string;
        checkout_session_id: string;
        payment_intent_id: string | null;
        customer_id: string;
        amount_subtotal: number | null;
        amount_total: number | null;
        currency: string | null;
        payment_status: string | null;
        status: string;
        order_date: string;
        created_at: string;
      };
      Insert: {
        id?: string;
        checkout_session_id: string;
        payment_intent_id?: string | null;
        customer_id: string;
        amount_subtotal?: number | null;
        amount_total?: number | null;
        currency?: string | null;
        payment_status?: string | null;
        status?: string;
        order_date?: string;
        created_at?: string;
      };
      Update: {
        id?: string;
        checkout_session_id?: string;
        payment_intent_id?: string | null;
        customer_id?: string;
        amount_subtotal?: number | null;
        amount_total?: number | null;
        currency?: string | null;
        payment_status?: string | null;
        status?: string;
        order_date?: string;
        created_at?: string;
      };
    };
  };
}