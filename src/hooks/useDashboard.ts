import { useState, useEffect } from 'react';
import { useRestaurante } from '../contexts/RestauranteContext';
import ReportsService from '../services/ReportsService';
import CRUDService from '../services/CRUDService';

export interface DashboardData {
  vendas_hoje: number;
  vendas_mes: number;
  pedidos_hoje: number;
  mesas_ocupadas: number;
  comandas_abertas: number;
  ticket_medio: number;
  produtosMaisVendidos: any[];
  alertasEstoque: any[];
  vendasPorDia: any[];
}

export const useDashboard = () => {
  const { restaurante } = useRestaurante();
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadDashboardData = async () => {
    if (!restaurante) return;

    setLoading(true);
    setError(null);

    try {
      const dashboardData = await ReportsService.getDashboardData(restaurante.id);
      
      if (dashboardData) {
        // Get sales by day for the last 7 days
        const endDate = new Date().toISOString();
        const startDate = new Date();
        startDate.setDate(startDate.getDate() - 7);
        
        const vendasPorDia = await ReportsService.getVendasReport(
          restaurante.id,
          startDate.toISOString(),
          endDate
        );

        setData({
          ...dashboardData,
          vendasPorDia
        });
      }
    } catch (err) {
      console.error('Error loading dashboard data:', err);
      setError('Erro ao carregar dados do dashboard');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadDashboardData();
  }, [restaurante]);

  return {
    data,
    loading,
    error,
    refresh: loadDashboardData
  };
};

// Hook para relatórios de vendas
export const useVendasReport = (periodo: string = '7dias') => {
  const { restaurante } = useRestaurante();
  const [data, setData] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  const loadVendasReport = async () => {
    if (!restaurante) return;

    setLoading(true);
    try {
      const endDate = new Date().toISOString();
      const startDate = new Date();
      
      switch (periodo) {
        case 'hoje':
          startDate.setHours(0, 0, 0, 0);
          break;
        case '7dias':
          startDate.setDate(startDate.getDate() - 7);
          break;
        case '30dias':
          startDate.setDate(startDate.getDate() - 30);
          break;
        case 'mes':
          startDate.setDate(1);
          startDate.setHours(0, 0, 0, 0);
          break;
      }

      const vendas = await ReportsService.getVendasReport(
        restaurante.id,
        startDate.toISOString(),
        endDate
      );

      setData(vendas);
    } catch (error) {
      console.error('Error loading vendas report:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadVendasReport();
  }, [restaurante, periodo]);

  return {
    data,
    loading,
    refresh: loadVendasReport
  };
};

// Hook para produtos mais vendidos
export const useProdutosMaisVendidos = (days: number = 30) => {
  const { restaurante } = useRestaurante();
  const [data, setData] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  const loadProdutos = async () => {
    if (!restaurante) return;

    setLoading(true);
    try {
      const produtos = await ReportsService.getProdutosMaisVendidos(restaurante.id, days);
      setData(produtos);
    } catch (error) {
      console.error('Error loading produtos mais vendidos:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadProdutos();
  }, [restaurante, days]);

  return {
    data,
    loading,
    refresh: loadProdutos
  };
};