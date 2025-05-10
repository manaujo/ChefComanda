import React, { useState } from 'react';
import { 
  BarChart, PieChart, TrendingUp, Download, Calendar,
  FileSpreadsheet, Filter, ChevronDown, Users, ShoppingBag
} from 'lucide-react';
import Button from '../components/ui/Button';
import { formatarDinheiro } from '../utils/formatters';

interface VendaDiaria {
  data: string;
  total: number;
  quantidade: number;
}

interface VendaProduto {
  nome: string;
  quantidade: number;
  total: number;
  percentual: number;
}

interface VendaGarcom {
  nome: string;
  vendas: number;
  total: number;
  mesas: number;
  percentual: number;
}

const mockVendasDiarias: VendaDiaria[] = [
  { data: '2025-03-04', total: 2150.90, quantidade: 45 },
  { data: '2025-03-05', total: 1890.50, quantidade: 38 },
  { data: '2025-03-06', total: 2450.75, quantidade: 52 },
  { data: '2025-03-07', total: 3100.25, quantidade: 65 },
  { data: '2025-03-08', total: 3580.90, quantidade: 72 },
  { data: '2025-03-09', total: 2890.30, quantidade: 58 },
  { data: '2025-03-10', total: 2490.00, quantidade: 48 }
];

const mockVendasProdutos: VendaProduto[] = [
  { nome: 'Filé Mignon ao Molho Madeira', quantidade: 28, total: 1957.20, percentual: 18.5 },
  { nome: 'Espaguete à Carbonara', quantidade: 22, total: 1009.80, percentual: 12.8 },
  { nome: 'Risoto de Camarão', quantidade: 18, total: 1359.00, percentual: 10.5 },
  { nome: 'Caipirinha de Limão', quantidade: 45, total: 832.50, percentual: 8.2 },
  { nome: 'Cerveja Artesanal IPA', quantidade: 35, total: 906.50, percentual: 7.5 }
];

const mockVendasGarcons: VendaGarcom[] = [
  { nome: 'Carlos Silva', vendas: 85, total: 4250.90, mesas: 22, percentual: 35 },
  { nome: 'Ana Santos', vendas: 72, total: 3680.50, mesas: 18, percentual: 30 },
  { nome: 'Pedro Oliveira', vendas: 68, total: 3450.75, mesas: 16, percentual: 25 }
];

const Relatorios: React.FC = () => {
  const [periodoSelecionado, setPeriodoSelecionado] = useState('7dias');
  const [categoriaAtiva, setCategoriaAtiva] = useState('vendas');
  
  const totalVendas = mockVendasDiarias.reduce((acc, dia) => acc + dia.total, 0);
  const ticketMedio = totalVendas / mockVendasDiarias.reduce((acc, dia) => acc + dia.quantidade, 0);
  const totalPedidos = mockVendasDiarias.reduce((acc, dia) => acc + dia.quantidade, 0);
  
  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Relatórios</h1>
          <p className="text-gray-500 mt-1">
            Análise de vendas e desempenho
          </p>
        </div>
        <div className="mt-4 md:mt-0 flex space-x-3">
          <div className="relative">
            <select
              value={periodoSelecionado}
              onChange={(e) => setPeriodoSelecionado(e.target.value)}
              className="appearance-none bg-white border border-gray-300 rounded-md py-2 pl-3 pr-10 focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="hoje">Hoje</option>
              <option value="7dias">Últimos 7 dias</option>
              <option value="30dias">Últimos 30 dias</option>
              <option value="mes">Este mês</option>
            </select>
            <ChevronDown className="absolute right-3 top-3 text-gray-400" size={16} />
          </div>
          
          <Button
            variant="ghost"
            icon={<FileSpreadsheet size={18} />}
          >
            Excel
          </Button>
          <Button
            variant="ghost"
            icon={<Download size={18} />}
          >
            PDF
          </Button>
        </div>
      </div>

      {/* Cards de Métricas */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white rounded-lg shadow-sm p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500">Vendas no Período</p>
              <p className="text-2xl font-bold mt-1">{formatarDinheiro(totalVendas)}</p>
              <p className="text-sm text-green-500 mt-1">+12% vs período anterior</p>
            </div>
            <div className="p-3 bg-blue-100 rounded-full">
              <TrendingUp size={24} className="text-blue-600" />
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-sm p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500">Ticket Médio</p>
              <p className="text-2xl font-bold mt-1">{formatarDinheiro(ticketMedio)}</p>
              <p className="text-sm text-green-500 mt-1">+5% vs período anterior</p>
            </div>
            <div className="p-3 bg-green-100 rounded-full">
              <BarChart size={24} className="text-green-600" />
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-sm p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500">Total de Pedidos</p>
              <p className="text-2xl font-bold mt-1">{totalPedidos}</p>
              <p className="text-sm text-green-500 mt-1">+8% vs período anterior</p>
            </div>
            <div className="p-3 bg-purple-100 rounded-full">
              <ShoppingBag size={24} className="text-purple-600" />
            </div>
          </div>
        </div>
      </div>

      {/* Navegação por Categoria */}
      <div className="bg-white rounded-lg shadow-sm p-4">
        <div className="flex space-x-4">
          <Button
            variant={categoriaAtiva === 'vendas' ? 'primary' : 'ghost'}
            onClick={() => setCategoriaAtiva('vendas')}
            icon={<BarChart size={18} />}
          >
            Vendas
          </Button>
          <Button
            variant={categoriaAtiva === 'produtos' ? 'primary' : 'ghost'}
            onClick={() => setCategoriaAtiva('produtos')}
            icon={<ShoppingBag size={18} />}
          >
            Produtos
          </Button>
          <Button
            variant={categoriaAtiva === 'garcons' ? 'primary' : 'ghost'}
            onClick={() => setCategoriaAtiva('garcons')}
            icon={<Users size={18} />}
          >
            Garçons
          </Button>
        </div>
      </div>

      {/* Conteúdo da Categoria */}
      {categoriaAtiva === 'vendas' && (
        <div className="space-y-6">
          {/* Gráfico de Vendas Diárias */}
          <div className="bg-white rounded-lg shadow-sm p-6">
            <h2 className="text-lg font-medium mb-6">Vendas Diárias</h2>
            <div className="space-y-4">
              {mockVendasDiarias.map((venda) => (
                <div key={venda.data} className="flex items-center">
                  <div className="w-24 text-sm text-gray-500">
                    {new Date(venda.data).toLocaleDateString('pt-BR')}
                  </div>
                  <div className="flex-1">
                    <div className="h-4 bg-gray-100 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-blue-500 rounded-full transition-all"
                        style={{ width: `${(venda.total / 4000) * 100}%` }}
                      ></div>
                    </div>
                  </div>
                  <div className="w-32 text-right">
                    <p className="font-medium">{formatarDinheiro(venda.total)}</p>
                    <p className="text-sm text-gray-500">{venda.quantidade} pedidos</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {categoriaAtiva === 'produtos' && (
        <div className="space-y-6">
          {/* Produtos Mais Vendidos */}
          <div className="bg-white rounded-lg shadow-sm p-6">
            <h2 className="text-lg font-medium mb-6">Produtos Mais Vendidos</h2>
            <div className="space-y-6">
              {mockVendasProdutos.map((produto) => (
                <div key={produto.nome} className="space-y-2">
                  <div className="flex justify-between items-center">
                    <div>
                      <h3 className="font-medium">{produto.nome}</h3>
                      <p className="text-sm text-gray-500">
                        {produto.quantidade} unidades vendidas
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="font-medium">{formatarDinheiro(produto.total)}</p>
                      <p className="text-sm text-gray-500">{produto.percentual}% das vendas</p>
                    </div>
                  </div>
                  <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-green-500 rounded-full transition-all"
                      style={{ width: `${produto.percentual}%` }}
                    ></div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {categoriaAtiva === 'garcons' && (
        <div className="space-y-6">
          {/* Desempenho dos Garçons */}
          <div className="bg-white rounded-lg shadow-sm p-6">
            <h2 className="text-lg font-medium mb-6">Desempenho dos Garçons</h2>
            <div className="space-y-6">
              {mockVendasGarcons.map((garcom) => (
                <div key={garcom.nome} className="space-y-2">
                  <div className="flex justify-between items-center">
                    <div>
                      <h3 className="font-medium">{garcom.nome}</h3>
                      <p className="text-sm text-gray-500">
                        {garcom.vendas} vendas • {garcom.mesas} mesas
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="font-medium">{formatarDinheiro(garcom.total)}</p>
                      <p className="text-sm text-gray-500">{garcom.percentual}% do faturamento</p>
                    </div>
                  </div>
                  <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-blue-500 rounded-full transition-all"
                      style={{ width: `${garcom.percentual}%` }}
                    ></div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Relatorios;