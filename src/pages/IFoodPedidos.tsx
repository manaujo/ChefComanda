import React, { useState } from 'react';
import { ShoppingBag, RefreshCcw, Clock, Check, X } from 'lucide-react';
import Button from '../components/ui/Button';
import { formatarDinheiro } from '../utils/formatters';

interface IFoodPedido {
  id: string;
  status: 'novo' | 'aceito' | 'preparando' | 'pronto' | 'entregue' | 'cancelado';
  horario: string;
  cliente: string;
  endereco: string;
  itens: Array<{
    id: number;
    nome: string;
    quantidade: number;
    preco: number;
    observacao?: string;
  }>;
  total: number;
}

const mockPedidos: IFoodPedido[] = [
  {
    id: 'IF123456',
    status: 'novo',
    horario: '2025-03-10T15:30:00',
    cliente: 'João Silva',
    endereco: 'Rua das Flores, 123 - Jardim Primavera',
    itens: [
      { id: 1, nome: 'X-Burger', quantidade: 2, preco: 25.90 },
      { id: 2, nome: 'Batata Frita', quantidade: 1, preco: 15.90 },
      { id: 3, nome: 'Refrigerante 350ml', quantidade: 2, preco: 6.90 }
    ],
    total: 81.50
  },
  {
    id: 'IF123457',
    status: 'preparando',
    horario: '2025-03-10T15:15:00',
    cliente: 'Maria Oliveira',
    endereco: 'Av. Principal, 456 - Centro',
    itens: [
      { id: 4, nome: 'Pizza Grande Margherita', quantidade: 1, preco: 49.90 },
      { id: 5, nome: 'Cerveja 600ml', quantidade: 2, preco: 12.90 }
    ],
    total: 75.70
  }
];

const IFoodPedidos: React.FC = () => {
  const [pedidos, setPedidos] = useState<IFoodPedido[]>(mockPedidos);
  const [filtroStatus, setFiltroStatus] = useState<string>('todos');

  const pedidosFiltrados = filtroStatus === 'todos'
    ? pedidos
    : pedidos.filter(pedido => pedido.status === filtroStatus);

  const statusClasses = {
    novo: 'bg-yellow-100 text-yellow-800',
    aceito: 'bg-blue-100 text-blue-800',
    preparando: 'bg-orange-100 text-orange-800',
    pronto: 'bg-green-100 text-green-800',
    entregue: 'bg-gray-100 text-gray-800',
    cancelado: 'bg-red-100 text-red-800'
  };

  const atualizarStatusPedido = (pedidoId: string, novoStatus: IFoodPedido['status']) => {
    setPedidos(pedidos.map(pedido => 
      pedido.id === pedidoId ? { ...pedido, status: novoStatus } : pedido
    ));
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Pedidos iFood</h1>
          <p className="text-gray-500 mt-1">
            Gerenciamento de pedidos do iFood
          </p>
        </div>
        <div className="mt-4 md:mt-0">
          <Button
            variant="primary"
            icon={<RefreshCcw size={18} />}
          >
            Atualizar Pedidos
          </Button>
        </div>
      </div>

      {/* Filtros */}
      <div className="bg-white rounded-lg shadow-sm p-4">
        <div className="flex flex-wrap gap-2">
          <Button
            variant={filtroStatus === 'todos' ? 'primary' : 'ghost'}
            size="sm"
            onClick={() => setFiltroStatus('todos')}
          >
            Todos
          </Button>
          <Button
            variant={filtroStatus === 'novo' ? 'warning' : 'ghost'}
            size="sm"
            onClick={() => setFiltroStatus('novo')}
          >
            Novos
          </Button>
          <Button
            variant={filtroStatus === 'preparando' ? 'primary' : 'ghost'}
            size="sm"
            onClick={() => setFiltroStatus('preparando')}
          >
            Preparando
          </Button>
          <Button
            variant={filtroStatus === 'pronto' ? 'success' : 'ghost'}
            size="sm"
            onClick={() => setFiltroStatus('pronto')}
          >
            Prontos
          </Button>
          <Button
            variant={filtroStatus === 'entregue' ? 'ghost' : 'ghost'}
            size="sm"
            onClick={() => setFiltroStatus('entregue')}
          >
            Entregues
          </Button>
        </div>
      </div>

      {/* Lista de Pedidos */}
      <div className="space-y-4">
        {pedidosFiltrados.map((pedido) => (
          <div key={pedido.id} className="bg-white rounded-lg shadow-sm overflow-hidden">
            <div className="p-6">
              <div className="flex justify-between items-start">
                <div>
                  <div className="flex items-center">
                    <ShoppingBag size={20} className="text-orange-500 mr-2" />
                    <h3 className="text-lg font-medium">Pedido #{pedido.id}</h3>
                    <span className={`ml-3 px-2 py-1 text-xs font-medium rounded-full ${statusClasses[pedido.status]}`}>
                      {pedido.status.charAt(0).toUpperCase() + pedido.status.slice(1)}
                    </span>
                  </div>
                  <div className="mt-2 text-sm text-gray-500">
                    <p className="font-medium">{pedido.cliente}</p>
                    <p>{pedido.endereco}</p>
                    <div className="flex items-center mt-1">
                      <Clock size={14} className="mr-1" />
                      <span>{new Date(pedido.horario).toLocaleTimeString('pt-BR')}</span>
                    </div>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-sm text-gray-500">Total do Pedido</p>
                  <p className="text-lg font-medium">{formatarDinheiro(pedido.total)}</p>
                </div>
              </div>

              {/* Itens do Pedido */}
              <div className="mt-6">
                <h4 className="text-sm font-medium text-gray-900 mb-3">Itens do Pedido</h4>
                <div className="space-y-3">
                  {pedido.itens.map((item) => (
                    <div key={item.id} className="flex justify-between items-center">
                      <div>
                        <p className="text-sm font-medium">{item.quantidade}x {item.nome}</p>
                        {item.observacao && (
                          <p className="text-xs text-gray-500">{item.observacao}</p>
                        )}
                      </div>
                      <p className="text-sm font-medium">{formatarDinheiro(item.preco * item.quantidade)}</p>
                    </div>
                  ))}
                </div>
              </div>

              {/* Ações */}
              <div className="mt-6 flex justify-end space-x-3">
                {pedido.status === 'novo' && (
                  <>
                    <Button
                      variant="ghost"
                      size="sm"
                      icon={<X size={16} />}
                      className="text-red-600 hover:text-red-700"
                      onClick={() => atualizarStatusPedido(pedido.id, 'cancelado')}
                    >
                      Recusar
                    </Button>
                    <Button
                      variant="primary"
                      size="sm"
                      icon={<Check size={16} />}
                      onClick={() => atualizarStatusPedido(pedido.id, 'aceito')}
                    >
                      Aceitar
                    </Button>
                  </>
                )}
                
                {pedido.status === 'aceito' && (
                  <Button
                    variant="primary"
                    size="sm"
                    onClick={() => atualizarStatusPedido(pedido.id, 'preparando')}
                  >
                    Iniciar Preparo
                  </Button>
                )}
                
                {pedido.status === 'preparando' && (
                  <Button
                    variant="success"
                    size="sm"
                    onClick={() => atualizarStatusPedido(pedido.id, 'pronto')}
                  >
                    Marcar como Pronto
                  </Button>
                )}
                
                {pedido.status === 'pronto' && (
                  <Button
                    variant="success"
                    size="sm"
                    onClick={() => atualizarStatusPedido(pedido.id, 'entregue')}
                  >
                    Confirmar Entrega
                  </Button>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default IFoodPedidos;