import React, { useState } from 'react';
import { BarChart, PieChart, TrendingUp, Download, Calendar } from 'lucide-react';
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
}

const mockVendasDiarias: VendaDiaria[] = [
  { data: '2025-03-04', total: 2150.90, quantidade: 45 },
  { data: '2025-03-05', total: 1890.50, quantidade: 38 },
  { data: '2025-03-06', total: 2450.75, quantidade: 52 },
  { data: '2025-03-07', total: 3100.25, quantidade: 65 },
  { data: '2025-03-08', total: 3580.90, quantidade: 72 },
  { data: '2025-03-09', total: 2890.30, quantidade: 58 },
  { data: '2025-03-10', total: 2490.00, quantidade: 48 },
];

const mockVendasProdutos: VendaProduto[] = [
  { nome: 'Filé Mignon ao Molho Madeira', quantidade: 28, total: 1957.20, percentual: 18.5 },
  { nome: 'Espaguete à Carbonara', quantidade: 22, total: 1009.80, percentual: 12.8 },
  { nome: 'Risoto de Camarão', quantidade: 18, total: 1359.00, percentual: 10.5 },
  { nome: 'Caipirinha de Limão', quantidade: 45, total: 832.50, percentual: 8.2 },
  { nome: 'Cerveja Artesanal IPA', quantidade: 35, total: 906.50, percentual: 7.5 },
];

const mockVendasGarcons: VendaGarcom[] = [
  { nome: 'Carlos Silva', vendas: 85, total: 4250.90, mesas: 22 },
  { nome: 'Ana Santos', vendas: 72, total: 3680.50, mesas: 18 },
  { nome: 'Pedro Oliveira', vendas: 68, total: 3450.75, mesas: 16 },
];

const Relatorios: React.FC = () => {
  const [periodoSelecionado, setPeriodoSelecionado] = useState('7dias');
  
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
          <select
            value={periodoSelecionado}
            onChange={(e) => setPeriodoSelecionado(e.target.value)}
            className="border border-gray-300 rounded-md py-2 pl-3 pr-10 focus:ring-blue-500 focus:border-blue-500"
          >
            <option value="hoje">Hoje</option>
            <option value="7dias">Últimos 7 dias</option>
            <option value="30dias">Últimos 30 dias</option>
            <option value="mes">Este mês</option>
          </select>
          <Button
            variant="primary"
            icon={<Download size={18} />}
          >
            Exportar
          </Button>
        </div>
      </div>

      {/* Cards de Métricas */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500">Vendas no Período</p>
              <p className="text-2xl font-bold mt-1">{formatarDinheiro(18552.60)}</p>
              <p className="text-sm text-green-500 mt-1">+12% vs período anterior</p>
            </div>
            <div className="p-3 bg-blue-100 rounded-full">
              <TrendingUp size={24} className="text-blue-600" />
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500">Ticket Médio</p>
              <p className="text-2xl font-bold mt-1">{formatarDinheiro(87.50)}</p>
              <p className="text-sm text-green-500 mt-1">+5% vs período anterior</p>
            </div>
            <div className="p-3 bg-green-100 rounded-full">
              <BarChart size={24} className="text-green-600" />
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500">Total de Pedidos</p>
              <p className="text-2xl font-bold mt-1">378</p>
              <p className="text-sm text-green-500 mt-1">+8% vs período anterior</p>
            </div>
            <div className="p-3 bg-purple-100 rounded-full">
              <PieChart size={24} className="text-purple-600" />
            </div>
          </div>
        </div>
      </div>

      {/* Gráfico de Vendas Diárias */}
      <div className="bg-white rounded-lg shadow p-6">
        <h2 className="text-lg font-medium mb-4">Vendas Diárias</h2>
        <div className="space-y-4">
          {mockVendasDiarias.map((venda) => (
            <div key={venda.data} className="flex items-center">
              <div className="w-24 text-sm text-gray-500">
                {new Date(venda.data).toLocaleDateString('pt-BR')}
              </div>
              <div className="flex-1">
                <div className="h-4 bg-gray-100 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-blue-500 rounded-full"
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

      {/* Produtos Mais Vendidos */}
      <div className="bg-white rounded-lg shadow p-6">
        <h2 className="text-lg font-medium mb-4">Produtos Mais Vendidos</h2>
        <div className="overflow-x-auto">
          <table className="min-w-full">
            <thead>
              <tr className="text-left text-sm text-gray-500">
                <th className="pb-3">Produto</th>
                <th className="pb-3">Quantidade</th>
                <th className="pb-3">Total</th>
                <th className="pb-3">% das Vendas</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {mockVendasProdutos.map((produto) => (
                <tr key={produto.nome}>
                  <td className="py-3">
                    <p className="font-medium">{produto.nome}</p>
                  </td>
                  <td className="py-3">{produto.quantidade}</td>
                  <td className="py-3">{formatarDinheiro(produto.total)}</td>
                  <td className="py-3">
                    <div className="flex items-center">
                      <span className="mr-2">{produto.percentual}%</span>
                      <div className="w-24 h-2 bg-gray-100 rounded-full">
                        <div
                          className="h-full bg-green-500 rounded-full"
                          style={{ width: `${produto.percentual}%` }}
                        ></div>
                      </div>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Desempenho dos Garçons */}
      <div className="bg-white rounded-lg shadow p-6">
        <h2 className="text-lg font-medium mb-4">Desempenho dos Garçons</h2>
        <div className="overflow-x-auto">
          <table className="min-w-full">
            <thead>
              <tr className="text-left text-sm text-gray-500">
                <th className="pb-3">Garçom</th>
                <th className="pb-3">Vendas</th>
                <th className="pb-3">Total</th>
                <th className="pb-3">Mesas Atendidas</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {mockVendasGarcons.map((garcom) => (
                <tr key={garcom.nome}>
                  <td className="py-3">
                    <p className="font-medium">{garcom.nome}</p>
                  </td>
                  <td className="py-3">{garcom.vendas}</td>
                  <td className="py-3">{formatarDinheiro(garcom.total)}</td>
                  <td className="py-3">{garcom.mesas}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default Relatorios;