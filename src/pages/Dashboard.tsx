import React from 'react';
import { BarChart4, TrendingUp, Users, ShoppingCart, AlertTriangle } from 'lucide-react';
import { useRestaurante } from '../contexts/RestauranteContext';

// Componentes
import MesaPreview from '../components/mesa/MesaPreview';
import NotificacaoItem from '../components/NotificacaoItem';
import ProdutoPopular from '../components/ProdutoPopular';
import Button from '../components/ui/Button';

const Dashboard: React.FC = () => {
  const { mesas, pedidos, produtosPopulares, alertasEstoque } = useRestaurante();
  
  const mesasOcupadas = mesas.filter(mesa => mesa.status === 'ocupada');
  const mesasAguardandoPagamento = mesas.filter(mesa => mesa.status === 'aguardando');
  const pedidosPendentes = pedidos.filter(pedido => pedido.status === 'pendente');
  
  const metricasCards = [
    {
      titulo: 'Vendas hoje',
      valor: 'R$ 2.490,00',
      comparacao: '+12% vs ontem',
      icon: <BarChart4 size={24} className="text-blue-500" />,
      classe: 'bg-blue-50 text-blue-500',
    },
    {
      titulo: 'Ticket médio',
      valor: 'R$ 87,50',
      comparacao: '+5% vs semana passada',
      icon: <TrendingUp size={24} className="text-green-500" />,
      classe: 'bg-green-50 text-green-500',
    },
    {
      titulo: 'Clientes hoje',
      valor: '48',
      comparacao: '+8% vs média',
      icon: <Users size={24} className="text-purple-500" />,
      classe: 'bg-purple-50 text-purple-500',
    },
    {
      titulo: 'Pedidos iFood',
      valor: '16',
      comparacao: '+25% vs ontem',
      icon: <ShoppingCart size={24} className="text-orange-500" />,
      classe: 'bg-orange-50 text-orange-500',
    },
  ];

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
          <p className="text-gray-500 mt-1">
            Visão geral do restaurante
          </p>
        </div>
        <div className="mt-4 md:mt-0 flex space-x-3">
          <Button variant="primary">
            Relatório do dia
          </Button>
        </div>
      </div>

      {/* Cards de métricas */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {metricasCards.map((card, index) => (
          <div key={index} className="bg-white rounded-lg shadow p-4">
            <div className="flex justify-between">
              <div>
                <h3 className="text-sm font-medium text-gray-500">{card.titulo}</h3>
                <p className="text-2xl font-bold mt-1">{card.valor}</p>
                <p className="text-sm text-green-500 mt-1">{card.comparacao}</p>
              </div>
              <div className={`rounded-full p-3 ${card.classe}`}>
                {card.icon}
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Conteúdo Principal - Mesas e Notificações */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Mesas ativas */}
        <div className="lg:col-span-2 bg-white rounded-lg shadow overflow-hidden">
          <div className="px-4 py-5 sm:px-6 border-b border-gray-200">
            <h3 className="text-lg font-medium text-gray-900">Mesas Ativas</h3>
            <p className="mt-1 text-sm text-gray-500">
              {mesasOcupadas.length} ocupadas, {mesasAguardandoPagamento.length} aguardando pagamento
            </p>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4 p-5">
            {mesas.slice(0, 8).map((mesa) => (
              <MesaPreview key={mesa.id} mesa={mesa} />
            ))}
          </div>
          <div className="bg-gray-50 px-4 py-3 sm:px-6 flex justify-center">
            <Button variant="ghost">
              Ver todas as mesas
            </Button>
          </div>
        </div>

        {/* Notificações e Alertas */}
        <div className="bg-white rounded-lg shadow overflow-hidden">
          <div className="px-4 py-5 sm:px-6 border-b border-gray-200">
            <h3 className="text-lg font-medium text-gray-900">Notificações e Alertas</h3>
            <p className="mt-1 text-sm text-gray-500">
              {pedidosPendentes.length} pedidos pendentes, {alertasEstoque.length} alertas de estoque
            </p>
          </div>
          <div className="divide-y divide-gray-200 max-h-[350px] overflow-y-auto">
            {pedidosPendentes.slice(0, 3).map((pedido) => (
              <NotificacaoItem 
                key={pedido.id}
                titulo={`Pedido #${pedido.id}`}
                descricao={`Mesa ${pedido.mesaId} - ${pedido.itens.length} itens`}
                tempo="Agora"
                tipo="pedido"
              />
            ))}
            
            {alertasEstoque.map((alerta) => (
              <NotificacaoItem 
                key={alerta.id}
                titulo={alerta.produto}
                descricao={`Estoque baixo - ${alerta.quantidade} unidades`}
                tempo="3h atrás"
                tipo="alerta"
                icone={<AlertTriangle size={16} />}
              />
            ))}
          </div>
          <div className="bg-gray-50 px-4 py-3 sm:px-6 flex justify-center">
            <Button variant="ghost">
              Ver todas as notificações
            </Button>
          </div>
        </div>
      </div>
      
      {/* Produtos Populares */}
      <div className="bg-white rounded-lg shadow overflow-hidden">
        <div className="px-4 py-5 sm:px-6 border-b border-gray-200">
          <h3 className="text-lg font-medium text-gray-900">Produtos Mais Vendidos</h3>
          <p className="mt-1 text-sm text-gray-500">Hoje</p>
        </div>
        <div className="p-5">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {produtosPopulares.slice(0, 4).map((produto) => (
              <ProdutoPopular key={produto.id} produto={produto} />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;