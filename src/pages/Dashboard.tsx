import React, { useState } from 'react';
import { 
  BarChart4, TrendingUp, Users, ShoppingCart, AlertTriangle,
  Sun, Moon, CreditCard, Clock, Coffee, ChevronRight,
  FileText, ShoppingBag, PieChart, Plus
} from 'lucide-react';
import { useRestaurante } from '../contexts/RestauranteContext';
import { useAuth } from '../contexts/AuthContext';
import { useTheme } from '../contexts/ThemeContext';

// Components
import MesaPreview from '../components/mesa/MesaPreview';
import NotificacaoItem from '../components/NotificacaoItem';
import ProdutoPopular from '../components/ProdutoPopular';
import Button from '../components/ui/Button';

const Dashboard: React.FC = () => {
  const { mesas, pedidos, produtosPopulares, alertasEstoque } = useRestaurante();
  const { user } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const [periodoSelecionado, setPeriodoSelecionado] = useState('7dias');
  
  const mesasOcupadas = mesas.filter(mesa => mesa.status === 'ocupada');
  const mesasAguardandoPagamento = mesas.filter(mesa => mesa.status === 'aguardando');
  const pedidosPendentes = pedidos.filter(pedido => pedido.status === 'pendente');
  
  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Bom dia';
    if (hour < 18) return 'Boa tarde';
    return 'Boa noite';
  };

  const metricasCards = [
    {
      titulo: 'Vendas hoje',
      valor: 'R$ 2.490,00',
      comparacao: '+12% vs ontem',
      icon: <BarChart4 size={24} className="text-blue-500" />,
      bgClass: 'bg-blue-50 dark:bg-blue-900/20',
      textClass: 'text-blue-600 dark:text-blue-400',
    },
    {
      titulo: 'Comandas abertas',
      valor: mesasOcupadas.length.toString(),
      comparacao: 'Total de mesas: ' + mesas.length,
      icon: <FileText size={24} className="text-green-500" />,
      bgClass: 'bg-green-50 dark:bg-green-900/20',
      textClass: 'text-green-600 dark:text-green-400',
    },
    {
      titulo: 'Clientes hoje',
      valor: '48',
      comparacao: '+8% vs média',
      icon: <Users size={24} className="text-purple-500" />,
      bgClass: 'bg-purple-50 dark:bg-purple-900/20',
      textClass: 'text-purple-600 dark:text-purple-400',
    },
    {
      titulo: 'Pedidos iFood',
      valor: '16',
      comparacao: '+25% vs ontem',
      icon: <ShoppingCart size={24} className="text-orange-500" />,
      bgClass: 'bg-orange-50 dark:bg-orange-900/20',
      textClass: 'text-orange-600 dark:text-orange-400',
    },
  ];

  const quickActions = [
    { icon: <Plus size={24} />, label: 'Nova Comanda', path: '/comandas' },
    { icon: <ShoppingBag size={24} />, label: 'Cardápio', path: '/cardapio' },
    { icon: <CreditCard size={24} />, label: 'PDV', path: '/pdv' },
    { icon: <PieChart size={24} />, label: 'Relatórios', path: '/relatorios' },
  ];

  return (
    <div className="space-y-6">
      {/* Header com saudação */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-6">
        <div className="flex items-center justify-between">
          <div>
            <div className="flex items-center space-x-2">
              {theme === 'dark' ? (
                <Moon className="text-gray-400" size={24} />
              ) : (
                <Sun className="text-yellow-500" size={24} />
              )}
              <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
                {getGreeting()}, {user?.email}
              </h1>
            </div>
            <p className="mt-1 text-gray-500 dark:text-gray-400">
              Aqui está o resumo do seu restaurante hoje
            </p>
          </div>
          <button
            onClick={toggleTheme}
            className="p-2 rounded-lg bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
          >
            {theme === 'dark' ? <Sun size={20} /> : <Moon size={20} />}
          </button>
        </div>
      </div>

      {/* Cards de métricas */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {metricasCards.map((card, index) => (
          <div
            key={index}
            className={`${card.bgClass} rounded-lg p-6 transition-all hover:shadow-md`}
          >
            <div className="flex items-center justify-between">
              <div className={`p-3 rounded-full ${card.bgClass}`}>
                {card.icon}
              </div>
              <span className="text-xs font-medium text-gray-500 dark:text-gray-400">
                vs anterior
              </span>
            </div>
            <h3 className="mt-4 text-2xl font-bold text-gray-900 dark:text-white">
              {card.valor}
            </h3>
            <div className="flex items-center mt-2">
              <span className="text-sm font-medium text-gray-500 dark:text-gray-400">
                {card.titulo}
              </span>
              <span className="ml-2 text-xs font-medium text-green-600 dark:text-green-400">
                {card.comparacao}
              </span>
            </div>
          </div>
        ))}
      </div>

      {/* Ações Rápidas */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {quickActions.map((action, index) => (
          <button
            key={index}
            className="flex flex-col items-center justify-center p-6 bg-white dark:bg-gray-800 rounded-lg shadow-sm hover:shadow-md transition-all"
          >
            <div className="p-3 rounded-full bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400">
              {action.icon}
            </div>
            <span className="mt-2 text-sm font-medium text-gray-700 dark:text-gray-300">
              {action.label}
            </span>
          </button>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Últimas Comandas */}
        <div className="lg:col-span-2 bg-white dark:bg-gray-800 rounded-lg shadow-sm">
          <div className="p-6 border-b border-gray-200 dark:border-gray-700">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-medium text-gray-900 dark:text-white">
                Últimas Comandas
              </h2>
              <Button variant="ghost" size="sm">
                Ver todas
              </Button>
            </div>
          </div>
          <div className="p-6">
            <div className="space-y-4">
              {pedidosPendentes.slice(0, 5).map((pedido) => (
                <div
                  key={pedido.id}
                  className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-700/50 rounded-lg"
                >
                  <div className="flex items-center space-x-4">
                    <div className="p-2 bg-blue-100 dark:bg-blue-900/50 rounded-full">
                      <Coffee size={20} className="text-blue-600 dark:text-blue-400" />
                    </div>
                    <div>
                      <h3 className="text-sm font-medium text-gray-900 dark:text-white">
                        Mesa {pedido.mesaId}
                      </h3>
                      <p className="text-xs text-gray-500 dark:text-gray-400">
                        {pedido.itens.length} itens
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center space-x-4">
                    <div className="text-right">
                      <p className="text-sm font-medium text-gray-900 dark:text-white">
                        R$ {pedido.itens.reduce((acc, item) => acc + (item.quantidade * 25), 0).toFixed(2)}
                      </p>
                      <p className="text-xs text-gray-500 dark:text-gray-400">
                        <Clock size={12} className="inline mr-1" />
                        {new Date(pedido.horario).toLocaleTimeString()}
                      </p>
                    </div>
                    <ChevronRight size={20} className="text-gray-400" />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Alertas e Notificações */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm">
          <div className="p-6 border-b border-gray-200 dark:border-gray-700">
            <h2 className="text-lg font-medium text-gray-900 dark:text-white">
              Alertas e Notificações
            </h2>
          </div>
          <div className="p-6">
            <div className="space-y-4">
              {alertasEstoque.map((alerta) => (
                <div
                  key={alerta.id}
                  className="p-4 bg-red-50 dark:bg-red-900/20 rounded-lg"
                >
                  <div className="flex items-center space-x-3">
                    <AlertTriangle className="text-red-500" size={20} />
                    <div>
                      <h3 className="text-sm font-medium text-red-800 dark:text-red-400">
                        Estoque Baixo: {alerta.produto}
                      </h3>
                      <p className="text-xs text-red-600 dark:text-red-300">
                        Quantidade atual: {alerta.quantidade} unidades
                      </p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;