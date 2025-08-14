import React, { useState } from 'react';
import { 
  ShoppingBag, RefreshCcw, Clock, Check, X, Search,
  ChefHat, Truck, AlertTriangle, Filter
} from 'lucide-react';
import Button from '../components/ui/Button';
import { formatarDinheiro } from '../utils/formatters';
import { useAuth } from '../contexts/AuthContext';
import { usePermissions } from '../hooks/useEmployeeAuth';
import toast from 'react-hot-toast';

interface DeliveryPedido {
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
  tempoEstimado?: number;
  avaliacao?: number;
  plataforma: 'ifood' | 'whatsapp' | 'telefone';
}

const mockPedidos: DeliveryPedido[] = [
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
    total: 81.50,
    tempoEstimado: 30,
    plataforma: 'ifood'
  },
  {
    id: 'WP123457',
    status: 'preparando',
    horario: '2025-03-10T15:15:00',
    cliente: 'Maria Oliveira',
    endereco: 'Av. Principal, 456 - Centro',
    itens: [
      { id: 4, nome: 'Pizza Grande Margherita', quantidade: 1, preco: 49.90 },
      { id: 5, nome: 'Cerveja 600ml', quantidade: 2, preco: 12.90 }
    ],
    total: 75.70,
    tempoEstimado: 45,
    plataforma: 'whatsapp'
  }
];

const DeliveryPedidos: React.FC = () => {
  const { userRole, isEmployee } = useAuth();
  const { hasPermission } = usePermissions();
  const [pedidos, setPedidos] = useState<DeliveryPedido[]>(mockPedidos);
  const [filtroStatus, setFiltroStatus] = useState<string>('todos');
  const [busca, setBusca] = useState('');
  const [loading, setLoading] = useState(false);

  // Verificar se o usuário tem permissão para acessar pedidos iFood
  const temPermissao = hasPermission('caixa') || (userRole === 'admin' && !isEmployee);

  if (!temPermissao) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <AlertTriangle size={48} className="mx-auto text-red-500 mb-4" />
          <h2 className="text-xl font-bold text-gray-900 mb-2">Acesso Restrito</h2>
          <p className="text-gray-600">
            Apenas funcionários do caixa têm acesso aos pedidos de delivery.
          </p>
        </div>
      </div>
    );
  }
  const atualizarPedidos = async () => {
    setLoading(true);
    try {
      // Simulação de atualização
      await new Promise(resolve => setTimeout(resolve, 1000));
      toast.success('Pedidos atualizados!');
    } catch (error) {
      toast.error('Erro ao atualizar pedidos');
    } finally {
      setLoading(false);
    }
  };

  const atualizarStatusPedido = (pedidoId: string, novoStatus: DeliveryPedido['status']) => {
    setPedidos(pedidos.map(pedido => 
      pedido.id === pedidoId ? { ...pedido, status: novoStatus } : pedido
    ));
    toast.success(`Pedido ${pedidoId} ${novoStatus}`);
  };

  const pedidosFiltrados = pedidos.filter(pedido => {
    const matchStatus = filtroStatus === 'todos' || pedido.status === filtroStatus;
    const matchBusca = pedido.cliente.toLowerCase().includes(busca.toLowerCase()) ||
                      pedido.id.toLowerCase().includes(busca.toLowerCase());
    return matchStatus && matchBusca;
  });

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'novo': return <AlertTriangle className="text-yellow-500" />;
      case 'aceito': return <Check className="text-blue-500" />;
      case 'preparando': return <ChefHat className="text-orange-500" />;
      case 'pronto': return <Check className="text-green-500" />;
      case 'entregue': return <Truck className="text-gray-500" />;
      case 'cancelado': return <X className="text-red-500" />;
      default: return null;
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Pedidos Delivery</h1>
          <p className="text-gray-500 mt-1">
            Gerenciamento de pedidos de delivery
          </p>
        </div>
        <div className="mt-4 md:mt-0">
          <Button
            variant="primary"
            icon={<RefreshCcw size={18} />}
            onClick={atualizarPedidos}
            isLoading={loading}
          >
            Atualizar
          </Button>
        </div>
      </div>

      {/* Filtros */}
      <div className="bg-white rounded-lg shadow-sm p-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="relative">
            <Search className="absolute left-3 top-2.5 text-gray-400" size={20} />
            <input
              type="text"
              placeholder="Buscar por cliente ou número do pedido..."
              value={busca}
              onChange={(e) => setBusca(e.target.value)}
              className="pl-10 w-full rounded-lg border border-gray-300 py-2 px-4 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>

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
          </div>
        </div>
      </div>

      {/* Lista de Pedidos */}
      <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
        {pedidosFiltrados.map((pedido) => (
          <div
            key={pedido.id}
            className={`card border-l-4 ${
              pedido.status === 'novo' ? 'border-l-yellow-500' :
              pedido.status === 'aceito' ? 'border-l-blue-500' :
              pedido.status === 'preparando' ? 'border-l-orange-500' :
              pedido.status === 'pronto' ? 'border-l-green-500' :
              pedido.status === 'entregue' ? 'border-l-gray-500' :
              'border-l-red-500'
            }`}
          >
            <div className="p-6">
              <div className="flex justify-between items-start mb-4">
                <div>
                  <div className="flex items-center">
                    {getStatusIcon(pedido.status)}
                    <h3 className="text-lg font-medium ml-2">Pedido #{pedido.id}</h3>
                  </div>
                  <div className="flex items-center mt-1 text-sm text-gray-500">
                    <Clock size={14} className="mr-1" />
                    <span>{new Date(pedido.horario).toLocaleTimeString('pt-BR')}</span>
                    {pedido.tempoEstimado && (
                      <span className="ml-2">({pedido.tempoEstimado} min)</span>
                    )}
                  </div>
                </div>
                <span className={`px-3 py-1 rounded-full text-sm font-medium ${
                  `status-${pedido.status}`
                }`}>
                  {pedido.status.charAt(0).toUpperCase() + pedido.status.slice(1)}
                </span>
              </div>

              <div className="mb-4">
                <h4 className="font-medium">{pedido.cliente}</h4>
                <p className="text-sm text-gray-500">{pedido.endereco}</p>
              </div>

              <div className="space-y-2 mb-4">
                {pedido.itens.map((item) => (
                  <div key={item.id} className="flex justify-between text-sm">
                    <span>{item.quantidade}x {item.nome}</span>
                    <span className="text-gray-600">{formatarDinheiro(item.preco * item.quantidade)}</span>
                  </div>
                ))}
                <div className="pt-2 border-t border-gray-200 flex justify-between font-medium">
                  <span>Total</span>
                  <span>{formatarDinheiro(pedido.total)}</span>
                </div>
              </div>

              <div className="flex justify-end space-x-2">
                {pedido.status === 'novo' && (
                  <>
                    <Button
                      variant="ghost"
                      size="sm"
                      icon={<X size={16} />}
                      className="text-red-600"
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
                    icon={<ChefHat size={16} />}
                    onClick={() => atualizarStatusPedido(pedido.id, 'preparando')}
                  >
                    Iniciar Preparo
                  </Button>
                )}
                
                {pedido.status === 'preparando' && (
                  <Button
                    variant="success"
                    size="sm"
                    icon={<Check size={16} />}
                    onClick={() => atualizarStatusPedido(pedido.id, 'pronto')}
                  >
                    Pronto para Entrega
                  </Button>
                )}
                
                {pedido.status === 'pronto' && (
                  <Button
                    variant="success"
                    size="sm"
                    icon={<Truck size={16} />}
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

export default DeliveryPedidos;