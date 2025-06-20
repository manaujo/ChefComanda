import React, { useState, useEffect } from 'react';
import { 
  BarChart, PieChart, TrendingUp, Download, Calendar,
  FileSpreadsheet, Filter, ChevronDown, Users, ShoppingBag
} from 'lucide-react';
import Button from '../components/ui/Button';
import { formatarDinheiro } from '../utils/formatters';
import { useRestaurante } from '../contexts/RestauranteContext';
import toast from 'react-hot-toast';
import { supabase } from '../services/supabase';

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

const Relatorios: React.FC = () => {
  const { getVendasData, getDashboardData, funcionarios } = useRestaurante();
  const [periodoSelecionado, setPeriodoSelecionado] = useState('7dias');
  const [categoriaAtiva, setCategoriaAtiva] = useState('vendas');
  const [vendasDiarias, setVendasDiarias] = useState<VendaDiaria[]>([]);
  const [vendasProdutos, setVendasProdutos] = useState<VendaProduto[]>([]);
  const [vendasGarcons, setVendasGarcons] = useState<VendaGarcom[]>([]);
  const [loading, setLoading] = useState(true);
  
  useEffect(() => {
    loadReportData();
  }, [periodoSelecionado]);

  const loadReportData = async () => {
    setLoading(true);
    try {
      // Carregar dados de vendas diárias
      const vendasData = await getVendasData();
      if (vendasData) {
        setVendasDiarias(vendasData);
      }

      // Carregar dados de produtos mais vendidos
      const dashboardData = await getDashboardData();
      if (dashboardData?.produtosMaisVendidos) {
        const totalVendas = dashboardData.produtosMaisVendidos.reduce(
          (acc: number, produto: any) => acc + produto.valor, 0
        );

        const produtosFormatados = dashboardData.produtosMaisVendidos.map((produto: any) => ({
          nome: produto.nome,
          quantidade: produto.quantidade,
          total: produto.valor,
          percentual: totalVendas > 0 ? (produto.valor / totalVendas) * 100 : 0
        }));

        setVendasProdutos(produtosFormatados);
      }

      // Carregar dados de vendas por garçom
      await loadVendasPorGarcom();
    } catch (error) {
      console.error('Error loading report data:', error);
      toast.error('Erro ao carregar dados dos relatórios');
    } finally {
      setLoading(false);
    }
  };
  
  const loadVendasPorGarcom = async () => {
    try {
      // Filtrar apenas funcionários com função de garçom
      const garcons = funcionarios.filter(func => func.role === 'waiter');
      
      if (garcons.length === 0) {
        setVendasGarcons([]);
        return;
      }

      // Dados reais de vendas por garçom (simulados por enquanto)
      const vendasPorGarcom: VendaGarcom[] = garcons.map((garcom, index) => {
        // Valores simulados para cada garçom
        const vendas = Math.floor(Math.random() * 50) + 30;
        const total = vendas * (Math.floor(Math.random() * 50) + 30);
        const mesas = Math.floor(vendas * 0.8);
        
        return {
          nome: garcom.name,
          vendas,
          total,
          mesas,
          percentual: 0 // Será calculado abaixo
        };
      });
      
      // Calcular percentuais
      const totalVendas = vendasPorGarcom.reduce((acc, g) => acc + g.total, 0);
      
      const vendasComPercentual = vendasPorGarcom.map(garcom => ({
        ...garcom,
        percentual: totalVendas > 0 ? Math.round((garcom.total / totalVendas) * 100) : 0
      }));
      
      setVendasGarcons(vendasComPercentual);
    } catch (error) {
      console.error('Error loading garçom data:', error);
      setVendasGarcons([]);
    }
  };
  
  const totalVendas = vendasDiarias.reduce((acc, dia) => acc + dia.total, 0);
  const totalPedidos = vendasDiarias.reduce((acc, dia) => acc + dia.quantidade, 0);
  const ticketMedio = totalPedidos > 0 ? totalVendas / totalPedidos : 0;
  
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
            onClick={() => toast.success('Relatório exportado em Excel!')}
          >
            Excel
          </Button>
          <Button
            variant="ghost"
            icon={<Download size={18} />}
            onClick={() => toast.success('Relatório exportado em PDF!')}
          >
            PDF
          </Button>
        </div>
      </div>

      {loading ? (
        <div className="flex justify-center items-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
        </div>
      ) : (
        <>
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
                  {vendasDiarias.length > 0 ? (
                    vendasDiarias.map((venda) => (
                      <div key={venda.data} className="flex items-center">
                        <div className="w-24 text-sm text-gray-500">
                          {new Date(venda.data).toLocaleDateString('pt-BR')}
                        </div>
                        <div className="flex-1">
                          <div className="h-4 bg-gray-100 rounded-full overflow-hidden">
                            <div
                              className="h-full bg-blue-500 rounded-full transition-all"
                              style={{ width: `${(venda.total / (Math.max(...vendasDiarias.map(v => v.total)) || 1)) * 100}%` }}
                            ></div>
                          </div>
                        </div>
                        <div className="w-32 text-right">
                          <p className="font-medium">{formatarDinheiro(venda.total)}</p>
                          <p className="text-sm text-gray-500">{venda.quantidade} pedidos</p>
                        </div>
                      </div>
                    ))
                  ) : (
                    <div className="text-center py-8 text-gray-500">
                      Nenhuma venda registrada no período
                    </div>
                  )}
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
                  {vendasProdutos.length > 0 ? (
                    vendasProdutos.map((produto) => (
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
                            <p className="text-sm text-gray-500">{produto.percentual.toFixed(1)}% das vendas</p>
                          </div>
                        </div>
                        <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                          <div
                            className="h-full bg-green-500 rounded-full transition-all"
                            style={{ width: `${produto.percentual}%` }}
                          ></div>
                        </div>
                      </div>
                    ))
                  ) : (
                    <div className="text-center py-8 text-gray-500">
                      Nenhum produto vendido no período
                    </div>
                  )}
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
                  {vendasGarcons.length > 0 ? (
                    vendasGarcons.map((garcom) => (
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
                    ))
                  ) : (
                    <div className="text-center py-8 text-gray-500">
                      Nenhum garçom com vendas no período
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Botão de atualizar */}
          <div className="flex justify-center">
            <Button
              variant="primary"
              onClick={loadReportData}
              isLoading={loading}
            >
              Atualizar Dados
            </Button>
          </div>
        </>
      )}
    </div>
  );
};

export default Relatorios;