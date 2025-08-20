import React, { useState, useEffect } from 'react';
import { 
  Coffee, CreditCard, DollarSign, QrCode, Receipt, 
  Plus, Minus, Trash2, X, Check, Clock, User, 
  AlertTriangle, Calculator, Percent, Music, 
  ShoppingCart, Edit, Printer, Search, Package,
  Utensils, Grid3X3, Zap, Star, TrendingUp
} from 'lucide-react';
import Button from '../components/ui/Button';
import { useRestaurante } from '../contexts/RestauranteContext';
import { useAuth } from '../contexts/AuthContext';
import { formatarDinheiro } from '../utils/formatters';
import { Database } from '../types/database';
import { supabase } from '../services/supabase';
import toast from 'react-hot-toast';

type Mesa = Database['public']['Tables']['mesas']['Row'];

interface ComandaMesa {
  mesa_id: string;
  mesa_numero: number;
  mesa_capacidade: number;
  garcom?: string;
  horario_abertura?: string;
  itens: ComandaItemData[];
  valor_total: number;
}

interface ItemCupom {
  nome: string;
  quantidade: number;
  preco_unitario: number;
  total: number;
  observacao?: string;
}

interface CupomFiscal {
  numero: string;
  data: string;
  hora: string;
  mesa?: number;
  garcom?: string;
  itens: ItemCupom[];
  subtotal: number;
  taxa_servico: number;
  couvert_artistico: number;
  desconto: number;
  total: number;
  forma_pagamento: string;
  operador: string;
}

interface VendaAvulsa {
  id: string;
  produto_id: string;
  nome: string;
  preco: number;
  categoria: string;
  quantidade: number;
  observacao?: string;
}

const PDV: React.FC = () => {
  const { 
    mesas, 
    itensComanda, 
    comandas, 
    produtos,
    finalizarPagamento, 
    refreshData, 
    restaurante,
    adicionarItemComanda,
    criarComanda
  } = useRestaurante();
  const { user, isEmployee, employeeData, displayName } = useAuth();
  
  const [mesaSelecionada, setMesaSelecionada] = useState<ComandaMesa | null>(null);
  const [showPagamentoModal, setShowPagamentoModal] = useState(false);
  const [showAdicionarItemModal, setShowAdicionarItemModal] = useState(false);
  const [showVendaAvulsaModal, setShowVendaAvulsaModal] = useState(false);
  const [formaPagamento, setFormaPagamento] = useState<'dinheiro' | 'cartao' | 'pix' | null>(null);
  const [valorRecebido, setValorRecebido] = useState<string>('');
  const [taxaServico, setTaxaServico] = useState(false);
  const [couvertArtistico, setCouvertArtistico] = useState(false);
  const [valorCouvert, setValorCouvert] = useState(15);
  const [desconto, setDesconto] = useState({
    tipo: 'percentual' as 'percentual' | 'valor',
    valor: 0
  });
  const [loading, setLoading] = useState(false);
  const [caixaAtual, setCaixaAtual] = useState<any>(null);
  const [cupomFiscal, setCupomFiscal] = useState<CupomFiscal | null>(null);
  const [showCupomModal, setShowCupomModal] = useState(false);
  
  // Estados para venda avulsa
  const [vendaAvulsa, setVendaAvulsa] = useState<VendaAvulsa[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [categoriaFiltro, setCategoriaFiltro] = useState('todas');
  const [produtoSelecionado, setProdutoSelecionado] = useState<any>(null);
  const [quantidadeProduto, setQuantidadeProduto] = useState(1);
  const [observacaoProduto, setObservacaoProduto] = useState('');

  useEffect(() => {
    refreshData();
    loadCaixaAtual();
  }, []);

  const loadCaixaAtual = async () => {
    try {
      const savedCaixa = localStorage.getItem('caixaAtual');
      if (savedCaixa) {
        setCaixaAtual(JSON.parse(savedCaixa));
      }
    } catch (error) {
      console.error('Error loading current cash register:', error);
    }
  };

  // Filtrar apenas mesas ocupadas com comandas abertas
  const mesasComComandas = (): ComandaMesa[] => {
    return mesas
      .filter(mesa => {
        if (mesa.status !== 'ocupada' || mesa.restaurante_id !== restaurante?.id) {
          return false;
        }
        
        const temComandaAberta = comandas.some(comanda => 
          comanda.mesa_id === mesa.id && comanda.status === 'aberta'
        );
        
        return temComandaAberta;
      })
      .map(mesa => {
        const comandaAberta = comandas.find(comanda => 
          comanda.mesa_id === mesa.id && comanda.status === 'aberta'
        );
        
        const itensDaMesa = itensComanda.filter(item => 
          item.mesa_id === mesa.id && 
          item.comanda_id === comandaAberta?.id &&
          item.status !== 'entregue' && 
          item.status !== 'cancelado'
        );
        
        const valorTotal = itensDaMesa.reduce((total, item) => {
          return total + (item.preco_unitario * item.quantidade);
        }, 0);

        return {
          mesa_id: mesa.id,
          mesa_numero: mesa.numero,
          mesa_capacidade: mesa.capacidade,
          garcom: mesa.garcom,
          horario_abertura: mesa.horario_abertura,
          itens: itensDaMesa,
          valor_total: valorTotal
        };
      })
      .filter(comanda => comanda.itens.length > 0);
  };

  const calcularTaxaServico = (valorBase: number) => {
    return taxaServico ? valorBase * 0.1 : 0;
  };

  const calcularCouvert = (capacidade: number) => {
    return couvertArtistico ? valorCouvert * capacidade : 0;
  };

  const calcularDesconto = (valorBase: number) => {
    if (desconto.tipo === 'percentual') {
      return valorBase * (desconto.valor / 100);
    }
    return desconto.valor;
  };

  const calcularTotalFinal = (comanda: ComandaMesa) => {
    const subtotal = comanda.valor_total;
    const taxa = calcularTaxaServico(subtotal);
    const couvert = calcularCouvert(comanda.mesa_capacidade);
    const descontoValor = calcularDesconto(subtotal + taxa + couvert);
    return subtotal + taxa + couvert - descontoValor;
  };

  const calcularTotalVendaAvulsa = () => {
    const subtotal = vendaAvulsa.reduce((total, item) => total + (item.preco * item.quantidade), 0);
    const taxa = calcularTaxaServico(subtotal);
    const descontoValor = calcularDesconto(subtotal + taxa);
    return subtotal + taxa - descontoValor;
  };

  const gerarCupomFiscal = (comanda: ComandaMesa): CupomFiscal => {
    const agora = new Date();
    const numeroComanda = `${comanda.mesa_numero.toString().padStart(3, '0')}-${agora.getTime().toString().slice(-6)}`;
    
    const itens: ItemCupom[] = comanda.itens.map(item => ({
      nome: item.nome,
      quantidade: item.quantidade,
      preco_unitario: item.preco_unitario,
      total: item.preco_unitario * item.quantidade,
      observacao: item.observacao
    }));

    const subtotal = comanda.valor_total;
    const taxa = calcularTaxaServico(subtotal);
    const couvert = calcularCouvert(comanda.mesa_capacidade);
    const descontoValor = calcularDesconto(subtotal + taxa + couvert);
    const total = calcularTotalFinal(comanda);

    return {
      numero: numeroComanda,
      data: agora.toLocaleDateString('pt-BR'),
      hora: agora.toLocaleTimeString('pt-BR'),
      mesa: comanda.mesa_numero,
      garcom: comanda.garcom,
      itens,
      subtotal,
      taxa_servico: taxa,
      couvert_artistico: couvert,
      desconto: descontoValor,
      total,
      forma_pagamento: formaPagamento || '',
      operador: displayName || user?.user_metadata?.name || 'Operador'
    };
  };

  const finalizarPagamentoMesa = async () => {
    if (!mesaSelecionada || !formaPagamento) {
      toast.error('Selecione uma forma de pagamento');
      return;
    }

    if (!caixaAtual) {
      toast.error('Caixa precisa estar aberto para finalizar pagamentos');
      return;
    }

    if (formaPagamento === 'dinheiro') {
      const recebido = parseFloat(valorRecebido);
      const total = calcularTotalFinal(mesaSelecionada);
      if (isNaN(recebido) || recebido < total) {
        toast.error('Valor recebido insuficiente');
        return;
      }
    }

    setLoading(true);
    try {
      const valorFinal = calcularTotalFinal(mesaSelecionada);
      
      const cupom = gerarCupomFiscal(mesaSelecionada);
      setCupomFiscal(cupom);

      await finalizarPagamento(mesaSelecionada.mesa_id, formaPagamento);

      const { error: movError } = await supabase
        .from('movimentacoes_caixa')
        .insert({
          caixa_operador_id: caixaAtual.id,
          tipo: 'entrada',
          valor: valorFinal,
          motivo: `Pagamento Mesa ${mesaSelecionada.mesa_numero}`,
          observacao: `${formaPagamento.toUpperCase()} - ${mesaSelecionada.itens.length} ${mesaSelecionada.itens.length === 1 ? 'item' : 'itens'}${taxaServico ? ' + Taxa 10%' : ''}${couvertArtistico ? ` + Couvert R$${valorCouvert}` : ''}${desconto.valor > 0 ? ` - Desconto ${desconto.tipo === 'percentual' ? desconto.valor + '%' : formatarDinheiro(desconto.valor)}` : ''}`,
          forma_pagamento: formaPagamento,
          usuario_id: user?.id || ''
        });

      if (movError) {
        console.error('Error registering cash movement:', movError);
        toast.error('Erro ao registrar movimentação no caixa');
      }

      const { data: caixaData } = await supabase
        .from('caixas_operadores')
        .select('valor_inicial')
        .eq('id', caixaAtual.id)
        .single();

      if (caixaData) {
        const { data: movimentacoes } = await supabase
          .from('movimentacoes_caixa')
          .select('tipo, valor')
          .eq('caixa_operador_id', caixaAtual.id);

        const totais = (movimentacoes || []).reduce(
          (acc, mov) => {
            if (mov.tipo === 'entrada') {
              acc.entradas += Number(mov.valor);
            } else {
              acc.saidas += Number(mov.valor);
            }
            return acc;
          },
          { entradas: 0, saidas: 0 }
        );

        const novoValorSistema = Number(caixaData.valor_inicial) + totais.entradas - totais.saidas;

        await supabase
          .from('caixas_operadores')
          .update({ valor_sistema: novoValorSistema })
          .eq('id', caixaAtual.id);

        setCaixaAtual(prev => prev ? { ...prev, valor_sistema: novoValorSistema } : null);
      }

      await refreshData();
      
      toast.success(`Pagamento da Mesa ${mesaSelecionada.mesa_numero} finalizado!`);
      
      setShowCupomModal(true);
      
      setMesaSelecionada(null);
      setShowPagamentoModal(false);
      setFormaPagamento(null);
      setValorRecebido('');
      setTaxaServico(false);
      setCouvertArtistico(false);
      setDesconto({ tipo: 'percentual', valor: 0 });
      
    } catch (error) {
      console.error('Error finalizing payment:', error);
      toast.error('Erro ao finalizar pagamento');
    } finally {
      setLoading(false);
    }
  };

  const finalizarVendaAvulsa = async () => {
    if (!formaPagamento) {
      toast.error('Selecione uma forma de pagamento');
      return;
    }

    if (!caixaAtual) {
      toast.error('Caixa precisa estar aberto para finalizar vendas');
      return;
    }

    if (vendaAvulsa.length === 0) {
      toast.error('Adicione produtos à venda');
      return;
    }

    setLoading(true);
    try {
      const valorTotal = calcularTotalVendaAvulsa();
      
      // Registrar venda
      const { error: vendaError } = await supabase
        .from('vendas')
        .insert({
          restaurante_id: restaurante?.id,
          valor_total: valorTotal,
          forma_pagamento: formaPagamento,
          status: 'concluida',
          usuario_id: user?.id || ''
        });

      if (vendaError) {
        console.error('Error registering sale:', vendaError);
        throw new Error('Erro ao registrar venda');
      }

      // Registrar movimentação no caixa
      const { error: movError } = await supabase
        .from('movimentacoes_caixa')
        .insert({
          caixa_operador_id: caixaAtual.id,
          tipo: 'entrada',
          valor: valorTotal,
          motivo: 'Venda Avulsa',
          observacao: `${formaPagamento.toUpperCase()} - ${vendaAvulsa.length} ${vendaAvulsa.length === 1 ? 'item' : 'itens'}${taxaServico ? ' + Taxa 10%' : ''}${desconto.valor > 0 ? ` - Desconto ${desconto.tipo === 'percentual' ? desconto.valor + '%' : formatarDinheiro(desconto.valor)}` : ''}`,
          forma_pagamento: formaPagamento,
          usuario_id: user?.id || ''
        });

      if (movError) {
        console.error('Error registering cash movement:', movError);
        toast.error('Erro ao registrar movimentação no caixa');
      }

      // Atualizar valor do sistema no caixa
      const { data: caixaData } = await supabase
        .from('caixas_operadores')
        .select('valor_inicial')
        .eq('id', caixaAtual.id)
        .single();

      if (caixaData) {
        const { data: movimentacoes } = await supabase
          .from('movimentacoes_caixa')
          .select('tipo, valor')
          .eq('caixa_operador_id', caixaAtual.id);

        const totais = (movimentacoes || []).reduce(
          (acc, mov) => {
            if (mov.tipo === 'entrada') {
              acc.entradas += Number(mov.valor);
            } else {
              acc.saidas += Number(mov.valor);
            }
            return acc;
          },
          { entradas: 0, saidas: 0 }
        );

        const novoValorSistema = Number(caixaData.valor_inicial) + totais.entradas - totais.saidas;

        await supabase
          .from('caixas_operadores')
          .update({ valor_sistema: novoValorSistema })
          .eq('id', caixaAtual.id);

        setCaixaAtual(prev => prev ? { ...prev, valor_sistema: novoValorSistema } : null);
      }

      toast.success('Venda avulsa finalizada com sucesso!');
      
      // Limpar venda avulsa
      setVendaAvulsa([]);
      setShowVendaAvulsaModal(false);
      setFormaPagamento(null);
      setValorRecebido('');
      setTaxaServico(false);
      setDesconto({ tipo: 'percentual', valor: 0 });
      
    } catch (error) {
      console.error('Error finalizing sale:', error);
      toast.error('Erro ao finalizar venda avulsa');
    } finally {
      setLoading(false);
    }
  };

  const adicionarProdutoVendaAvulsa = () => {
    if (!produtoSelecionado) return;

    const novoItem: VendaAvulsa = {
      id: Date.now().toString(),
      produto_id: produtoSelecionado.id,
      nome: produtoSelecionado.nome,
      preco: produtoSelecionado.preco,
      categoria: produtoSelecionado.categoria,
      quantidade: quantidadeProduto,
      observacao: observacaoProduto || undefined
    };

    setVendaAvulsa(prev => [...prev, novoItem]);
    setProdutoSelecionado(null);
    setQuantidadeProduto(1);
    setObservacaoProduto('');
    toast.success(`${produtoSelecionado.nome} adicionado à venda!`);
  };

  const removerProdutoVendaAvulsa = (id: string) => {
    setVendaAvulsa(prev => prev.filter(item => item.id !== id));
  };

  const alterarQuantidadeVendaAvulsa = (id: string, novaQuantidade: number) => {
    if (novaQuantidade <= 0) {
      removerProdutoVendaAvulsa(id);
      return;
    }
    setVendaAvulsa(prev => prev.map(item => 
      item.id === id ? { ...item, quantidade: novaQuantidade } : item
    ));
  };

  const calcularTroco = () => {
    if (!mesaSelecionada || formaPagamento !== 'dinheiro' || !valorRecebido) return 0;
    const recebido = parseFloat(valorRecebido);
    const total = calcularTotalFinal(mesaSelecionada);
    return Math.max(0, recebido - total);
  };

  const imprimirCupom = () => {
    if (cupomFiscal) {
      console.log('Imprimindo cupom fiscal:', cupomFiscal);
      toast.success('Cupom fiscal enviado para impressão!');
    }
  };

  const abrirModalAdicionarItem = async (mesaId: string) => {
    try {
      // Verificar se existe comanda aberta para esta mesa
      let comandaAberta = comandas.find(c => c.mesa_id === mesaId && c.status === 'aberta');
      
      if (!comandaAberta) {
        // Criar nova comanda se não existir
        await criarComanda(mesaId);
        await refreshData();
      }
      
      setMesaSelecionada(mesasComComandas().find(m => m.mesa_id === mesaId) || null);
      setShowAdicionarItemModal(true);
    } catch (error) {
      console.error('Error opening add item modal:', error);
      toast.error('Erro ao abrir modal de adicionar item');
    }
  };

  const adicionarItemNaComanda = async () => {
    if (!produtoSelecionado || !mesaSelecionada) return;

    try {
      setLoading(true);
      
      // Buscar comanda aberta da mesa
      const comandaAberta = comandas.find(c => 
        c.mesa_id === mesaSelecionada.mesa_id && c.status === 'aberta'
      );

      if (!comandaAberta) {
        throw new Error('Comanda não encontrada');
      }

      await adicionarItemComanda({
        comandaId: comandaAberta.id,
        produtoId: produtoSelecionado.id,
        quantidade: quantidadeProduto,
        observacao: observacaoProduto || undefined
      });

      await refreshData();
      
      setProdutoSelecionado(null);
      setQuantidadeProduto(1);
      setObservacaoProduto('');
      setShowAdicionarItemModal(false);
      
      toast.success('Item adicionado à comanda!');
    } catch (error) {
      console.error('Error adding item to comanda:', error);
      toast.error('Erro ao adicionar item à comanda');
    } finally {
      setLoading(false);
    }
  };

  const comandasAtivas = mesasComComandas();
  const categorias = Array.from(new Set(produtos.map(p => p.categoria)));
  const produtosFiltrados = produtos.filter(produto => {
    const matchSearch = produto.nome.toLowerCase().includes(searchTerm.toLowerCase());
    const matchCategory = categoriaFiltro === 'todas' || produto.categoria === categoriaFiltro;
    return matchSearch && matchCategory && produto.disponivel;
  });

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-blue-50 to-indigo-50 dark:from-gray-900 dark:via-gray-800 dark:to-gray-700">
      {/* Status do Caixa */}
      <div className="bg-white/90 dark:bg-gray-800/90 backdrop-blur-sm border-b border-gray-200/50 dark:border-gray-700/50 p-4 shadow-lg">
        {caixaAtual ? (
          <div className="bg-gradient-to-r from-green-50 to-emerald-50 dark:from-green-900/20 dark:to-emerald-900/20 border-l-4 border-green-500 p-4 rounded-xl">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-6">
                <div className="flex items-center">
                  <div className="p-3 bg-green-100 dark:bg-green-900/30 rounded-xl mr-4">
                    <User className="h-6 w-6 text-green-600 dark:text-green-400" />
                  </div>
                  <div>
                    <p className="text-lg font-bold text-green-800 dark:text-green-200">
                      PDV Operacional - {caixaAtual.operador_nome}
                    </p>
                    <div className="flex items-center space-x-4 text-sm text-green-700 dark:text-green-300">
                      <span>Saldo: {formatarDinheiro(caixaAtual.valor_sistema)}</span>
                      <span>•</span>
                      <span>Aberto às {new Date(caixaAtual.data_abertura).toLocaleTimeString('pt-BR')}</span>
                    </div>
                  </div>
                </div>
              </div>
              <div className="flex items-center space-x-2">
                <div className="w-3 h-3 bg-green-400 rounded-full animate-pulse"></div>
                <span className="text-sm font-medium text-green-700 dark:text-green-300">Online</span>
              </div>
            </div>
          </div>
        ) : (
          <div className="bg-gradient-to-r from-red-50 to-rose-50 dark:from-red-900/20 dark:to-rose-900/20 border-l-4 border-red-500 p-4 rounded-xl">
            <div className="flex items-center justify-between">
              <div className="flex items-center">
                <div className="p-3 bg-red-100 dark:bg-red-900/30 rounded-xl mr-4">
                  <AlertTriangle className="h-6 w-6 text-red-600 dark:text-red-400" />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-red-800 dark:text-red-200">PDV Fechado</h3>
                  <p className="text-sm text-red-700 dark:text-red-300">
                    O caixa precisa ser aberto para realizar vendas.
                  </p>
                </div>
              </div>
              <Button
                variant="primary"
                onClick={() => window.location.href = '/dashboard/caixa'}
                className="bg-gradient-to-r from-red-500 to-red-600 hover:from-red-600 hover:to-red-700"
              >
                Ir para Caixa
              </Button>
            </div>
          </div>
        )}
      </div>

      {/* Header Principal */}
      <div className="bg-white/90 dark:bg-gray-800/90 backdrop-blur-sm shadow-lg border-b border-gray-200/50 dark:border-gray-700/50 p-6">
        <div className="max-w-7xl mx-auto">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <div className="p-4 bg-gradient-to-br from-blue-500 to-blue-600 rounded-2xl shadow-lg">
                <CreditCard size={32} className="text-white" />
              </div>
              <div>
                <h1 className="text-4xl font-bold bg-gradient-to-r from-gray-900 to-gray-700 dark:from-white dark:to-gray-300 bg-clip-text text-transparent">
                  Ponto de Venda
                </h1>
                <p className="text-lg text-gray-600 dark:text-gray-400 mt-1">
                  Sistema integrado de vendas e comandas
                </p>
              </div>
            </div>
            <div className="flex items-center space-x-6">
              <div className="text-center p-4 bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20 rounded-2xl border border-blue-200/50 dark:border-blue-700/50">
                <p className="text-sm font-medium text-blue-600 dark:text-blue-400">Comandas Ativas</p>
                <p className="text-3xl font-bold text-blue-800 dark:text-blue-200">
                  {comandasAtivas.length}
                </p>
              </div>
              <div className="text-center p-4 bg-gradient-to-br from-green-50 to-emerald-50 dark:from-green-900/20 dark:to-emerald-900/20 rounded-2xl border border-green-200/50 dark:border-green-700/50">
                <p className="text-sm font-medium text-green-600 dark:text-green-400">Produtos</p>
                <p className="text-3xl font-bold text-green-800 dark:text-green-200">
                  {produtos.filter(p => p.disponivel).length}
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Layout Principal */}
      <div className="max-w-7xl mx-auto p-6">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Coluna Esquerda - Mesas */}
          <div className="lg:col-span-2 space-y-6">
            <div className="bg-white/90 dark:bg-gray-800/90 backdrop-blur-sm rounded-3xl shadow-xl border border-white/20 dark:border-gray-700/50 overflow-hidden">
              <div className="bg-gradient-to-r from-blue-500 to-blue-600 p-6">
                <div className="flex items-center justify-between text-white">
                  <div className="flex items-center">
                    <div className="p-3 bg-white/20 backdrop-blur-sm rounded-2xl mr-4">
                      <Coffee size={24} />
                    </div>
                    <div>
                      <h2 className="text-2xl font-bold">Comandas das Mesas</h2>
                      <p className="text-blue-100">Finalize pagamentos das mesas ocupadas</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="w-3 h-3 bg-blue-300 rounded-full animate-pulse"></div>
                  </div>
                </div>
              </div>

              <div className="p-6">
                {comandasAtivas.length === 0 ? (
                  <div className="text-center py-16">
                    <div className="inline-flex items-center justify-center w-20 h-20 bg-gray-100 dark:bg-gray-700 rounded-2xl mb-6">
                      <Coffee size={40} className="text-gray-400 dark:text-gray-600" />
                    </div>
                    <h3 className="text-xl font-medium text-gray-900 dark:text-white mb-2">
                      Nenhuma comanda ativa
                    </h3>
                    <p className="text-gray-500 dark:text-gray-400">
                      Não há mesas com comandas abertas para finalizar pagamento
                    </p>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
                    {comandasAtivas.map((comanda) => (
                      <div
                        key={comanda.mesa_id}
                        className="bg-gradient-to-br from-white to-gray-50 dark:from-gray-800 dark:to-gray-700 rounded-2xl shadow-lg border border-gray-200/50 dark:border-gray-600/50 overflow-hidden hover:shadow-xl transition-all duration-300 cursor-pointer group"
                        onClick={() => {
                          if (!caixaAtual) {
                            toast.error('Caixa precisa estar aberto para finalizar pagamentos');
                            return;
                          }
                          setMesaSelecionada(comanda);
                          setShowPagamentoModal(true);
                        }}
                      >
                        {/* Header da Mesa */}
                        <div className="bg-gradient-to-r from-blue-500 to-blue-600 p-4 text-white relative overflow-hidden">
                          <div className="absolute top-0 right-0 w-20 h-20 bg-white/10 rounded-full -mr-10 -mt-10"></div>
                          <div className="relative flex items-center justify-between">
                            <div>
                              <h3 className="text-xl font-bold">Mesa {comanda.mesa_numero}</h3>
                              <div className="flex items-center space-x-2 mt-1">
                                <User size={14} className="text-blue-200" />
                                <span className="text-blue-100 text-sm">
                                  {comanda.mesa_capacidade} pessoas
                                </span>
                              </div>
                            </div>
                            <div className="text-right">
                              <p className="text-2xl font-bold">
                                {formatarDinheiro(comanda.valor_total)}
                              </p>
                              <p className="text-blue-100 text-sm">
                                {comanda.itens.length} {comanda.itens.length === 1 ? 'item' : 'itens'}
                              </p>
                            </div>
                          </div>
                        </div>

                        {/* Conteúdo da Mesa */}
                        <div className="p-4">
                          <div className="space-y-2 mb-4">
                            {comanda.garcom && (
                              <div className="flex items-center text-sm text-gray-600 dark:text-gray-400">
                                <User size={14} className="mr-2" />
                                <span>Garçom: {comanda.garcom}</span>
                              </div>
                            )}
                            {comanda.horario_abertura && (
                              <div className="flex items-center text-sm text-gray-600 dark:text-gray-400">
                                <Clock size={14} className="mr-2" />
                                <span>
                                  Aberta há {Math.floor((Date.now() - new Date(comanda.horario_abertura).getTime()) / (1000 * 60))} min
                                </span>
                              </div>
                            )}
                          </div>

                          {/* Itens da Comanda */}
                          <div className="space-y-2 mb-4">
                            <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300 flex items-center">
                              <Utensils size={14} className="mr-2" />
                              Itens do Pedido:
                            </h4>
                            <div className="max-h-32 overflow-y-auto space-y-1">
                              {comanda.itens.slice(0, 3).map((item) => (
                                <div key={item.id} className="flex justify-between text-sm bg-gray-50 dark:bg-gray-700 p-2 rounded-lg">
                                  <span className="text-gray-700 dark:text-gray-300">
                                    {item.quantidade}x {item.nome}
                                  </span>
                                  <span className="font-medium text-gray-900 dark:text-white">
                                    {formatarDinheiro(item.preco_unitario * item.quantidade)}
                                  </span>
                                </div>
                              ))}
                              {comanda.itens.length > 3 && (
                                <div className="text-xs text-gray-500 dark:text-gray-400 text-center py-1">
                                  +{comanda.itens.length - 3} itens adicionais
                                </div>
                              )}
                            </div>
                          </div>

                          {/* Status dos Itens */}
                          <div className="flex flex-wrap gap-1 mb-4">
                            {comanda.itens.slice(0, 4).map((item) => (
                              <span
                                key={item.id}
                                className={`text-xs px-2 py-1 rounded-full font-medium ${
                                  item.status === 'pendente' ? 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/50 dark:text-yellow-200' :
                                  item.status === 'preparando' ? 'bg-blue-100 text-blue-800 dark:bg-blue-900/50 dark:text-blue-200' :
                                  item.status === 'pronto' ? 'bg-green-100 text-green-800 dark:bg-green-900/50 dark:text-green-200' :
                                  'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-200'
                                }`}
                              >
                                {item.status}
                              </span>
                            ))}
                          </div>

                          <div className="flex space-x-2">
                            <Button
                              variant="secondary"
                              size="sm"
                              icon={<Plus size={16} />}
                              onClick={(e) => {
                                e.stopPropagation();
                                abrirModalAdicionarItem(comanda.mesa_id);
                              }}
                              className="flex-1 bg-gradient-to-r from-orange-500 to-orange-600 hover:from-orange-600 hover:to-orange-700 text-white"
                            >
                              Adicionar
                            </Button>
                            <Button
                              variant="primary"
                              size="sm"
                              icon={<CreditCard size={16} />}
                              disabled={!caixaAtual}
                              className="flex-1 bg-gradient-to-r from-green-500 to-green-600 hover:from-green-600 hover:to-green-700"
                            >
                              Pagamento
                            </Button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Coluna Direita - Venda Avulsa */}
          <div className="space-y-6">
            <div className="bg-white/90 dark:bg-gray-800/90 backdrop-blur-sm rounded-3xl shadow-xl border border-white/20 dark:border-gray-700/50 overflow-hidden">
              <div className="bg-gradient-to-r from-purple-500 to-purple-600 p-6">
                <div className="flex items-center justify-between text-white">
                  <div className="flex items-center">
                    <div className="p-3 bg-white/20 backdrop-blur-sm rounded-2xl mr-4">
                      <ShoppingCart size={24} />
                    </div>
                    <div>
                      <h2 className="text-2xl font-bold">Venda Avulsa</h2>
                      <p className="text-purple-100">Vendas diretas sem mesa</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="w-3 h-3 bg-purple-300 rounded-full animate-pulse"></div>
                  </div>
                </div>
              </div>

              <div className="p-6">
                {/* Carrinho de Venda Avulsa */}
                <div className="mb-6">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Carrinho</h3>
                    <Button
                      variant="primary"
                      size="sm"
                      icon={<Plus size={16} />}
                      onClick={() => setShowVendaAvulsaModal(true)}
                      className="bg-gradient-to-r from-purple-500 to-purple-600 hover:from-purple-600 hover:to-purple-700"
                    >
                      Adicionar Produto
                    </Button>
                  </div>

                  {vendaAvulsa.length === 0 ? (
                    <div className="text-center py-8 bg-gray-50 dark:bg-gray-700 rounded-2xl">
                      <div className="inline-flex items-center justify-center w-16 h-16 bg-gray-100 dark:bg-gray-600 rounded-2xl mb-4">
                        <ShoppingCart size={32} className="text-gray-400 dark:text-gray-500" />
                      </div>
                      <p className="text-gray-500 dark:text-gray-400 text-sm">
                        Carrinho vazio
                      </p>
                      <p className="text-gray-400 dark:text-gray-500 text-xs mt-1">
                        Adicione produtos para iniciar uma venda
                      </p>
                    </div>
                  ) : (
                    <div className="space-y-3 max-h-64 overflow-y-auto">
                      {vendaAvulsa.map((item) => (
                        <div key={item.id} className="bg-gray-50 dark:bg-gray-700 rounded-xl p-3">
                          <div className="flex items-center justify-between mb-2">
                            <div className="flex-1">
                              <h4 className="font-medium text-gray-900 dark:text-white text-sm">
                                {item.nome}
                              </h4>
                              <p className="text-xs text-gray-500 dark:text-gray-400">
                                {formatarDinheiro(item.preco)} cada
                              </p>
                              {item.observacao && (
                                <p className="text-xs text-gray-600 dark:text-gray-400 italic mt-1">
                                  "{item.observacao}"
                                </p>
                              )}
                            </div>
                            <button
                              onClick={() => removerProdutoVendaAvulsa(item.id)}
                              className="text-red-500 hover:text-red-700 p-1 rounded-full hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
                            >
                              <X size={16} />
                            </button>
                          </div>

                          <div className="flex items-center justify-between">
                            <div className="flex items-center space-x-2">
                              <button
                                onClick={() => alterarQuantidadeVendaAvulsa(item.id, item.quantidade - 1)}
                                className="w-7 h-7 rounded-full bg-gray-200 dark:bg-gray-600 flex items-center justify-center hover:bg-gray-300 dark:hover:bg-gray-500 transition-colors"
                              >
                                <Minus size={12} />
                              </button>
                              <span className="w-8 text-center font-medium text-sm">
                                {item.quantidade}
                              </span>
                              <button
                                onClick={() => alterarQuantidadeVendaAvulsa(item.id, item.quantidade + 1)}
                                className="w-7 h-7 rounded-full bg-gray-200 dark:bg-gray-600 flex items-center justify-center hover:bg-gray-300 dark:hover:bg-gray-500 transition-colors"
                              >
                                <Plus size={12} />
                              </button>
                            </div>

                            <span className="font-bold text-gray-900 dark:text-white">
                              {formatarDinheiro(item.preco * item.quantidade)}
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Total da Venda Avulsa */}
                {vendaAvulsa.length > 0 && (
                  <div className="border-t border-gray-200 dark:border-gray-700 pt-4">
                    <div className="bg-gradient-to-r from-purple-50 to-indigo-50 dark:from-purple-900/20 dark:to-indigo-900/20 rounded-2xl p-4 mb-4">
                      <div className="flex justify-between items-center">
                        <span className="text-lg font-semibold text-purple-800 dark:text-purple-200">
                          Total
                        </span>
                        <span className="text-2xl font-bold text-purple-900 dark:text-purple-100">
                          {formatarDinheiro(vendaAvulsa.reduce((total, item) => total + (item.preco * item.quantidade), 0))}
                        </span>
                      </div>
                    </div>

                    <Button
                      variant="primary"
                      fullWidth
                      size="lg"
                      icon={<CreditCard size={20} />}
                      onClick={() => setShowVendaAvulsaModal(true)}
                      disabled={!caixaAtual}
                      className="bg-gradient-to-r from-purple-500 to-purple-600 hover:from-purple-600 hover:to-purple-700 py-4 text-lg font-semibold"
                    >
                      Finalizar Venda Avulsa
                    </Button>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Modal de Pagamento das Mesas */}
      {showPagamentoModal && mesaSelecionada && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-black/60 backdrop-blur-sm">
          <div className="flex items-center justify-center min-h-screen p-4">
            <div className="bg-white dark:bg-gray-800 rounded-3xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
              <div className="flex justify-between items-center p-6 border-b border-gray-200 dark:border-gray-700">
                <h3 className="text-xl font-bold text-gray-900 dark:text-white">
                  Finalizar Pagamento - Mesa {mesaSelecionada.mesa_numero}
                </h3>
                <button
                  onClick={() => {
                    setShowPagamentoModal(false);
                    setMesaSelecionada(null);
                    setFormaPagamento(null);
                    setValorRecebido('');
                    setTaxaServico(false);
                    setCouvertArtistico(false);
                    setDesconto({ tipo: 'percentual', valor: 0 });
                  }}
                  className="text-gray-400 hover:text-gray-500 p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-xl transition-colors"
                >
                  <X size={24} />
                </button>
              </div>

              <div className="p-6">
                {/* Resumo dos Itens */}
                <div className="mb-6">
                  <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
                    Itens Consumidos
                  </h4>
                  <div className="max-h-40 overflow-y-auto border rounded-lg p-3 bg-gray-50 dark:bg-gray-700">
                    {mesaSelecionada.itens.map((item) => (
                      <div key={item.id} className="flex justify-between text-sm py-1">
                        <span className="text-gray-700 dark:text-gray-300">
                          {item.quantidade}x {item.nome}
                          {item.observacao && (
                            <span className="text-xs text-gray-500 block">
                              {item.observacao}
                            </span>
                          )}
                        </span>
                        <span className="font-medium text-gray-900 dark:text-white">
                          {formatarDinheiro(item.preco_unitario * item.quantidade)}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Adicionais */}
                <div className="space-y-4 mb-6">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center">
                      <input
                        type="checkbox"
                        id="taxaServico"
                        checked={taxaServico}
                        onChange={(e) => setTaxaServico(e.target.checked)}
                        className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                      />
                      <label htmlFor="taxaServico" className="ml-2 text-sm text-gray-700 dark:text-gray-300">
                        Taxa de Serviço (10%)
                      </label>
                    </div>
                    <span className="text-sm font-medium text-gray-900 dark:text-white">
                      {formatarDinheiro(calcularTaxaServico(mesaSelecionada.valor_total))}
                    </span>
                  </div>

                  <div className="flex items-center justify-between">
                    <div className="flex items-center">
                      <input
                        type="checkbox"
                        id="couvert"
                        checked={couvertArtistico}
                        onChange={(e) => setCouvertArtistico(e.target.checked)}
                        className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                      />
                      <label htmlFor="couvert" className="ml-2 text-sm text-gray-700 dark:text-gray-300">
                        Couvert Artístico
                      </label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <span className="text-xs text-gray-500 dark:text-gray-400">R$</span>
                      <input
                        type="number"
                        value={valorCouvert}
                        onChange={(e) => setValorCouvert(parseFloat(e.target.value) || 15)}
                        min="0"
                        step="0.01"
                        className="w-16 text-sm border border-gray-300 dark:border-gray-600 rounded py-1 px-2 dark:bg-gray-700 dark:text-white"
                      />
                      <span className="text-xs text-gray-500 dark:text-gray-400">
                        x {mesaSelecionada.mesa_capacidade} = {formatarDinheiro(calcularCouvert(mesaSelecionada.mesa_capacidade))}
                      </span>
                    </div>
                  </div>

                  {/* Desconto */}
                  <div className="border-t pt-4">
                    <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Desconto</h4>
                    <div className="flex space-x-2 mb-2">
                      <label className="flex items-center">
                        <input
                          type="radio"
                          checked={desconto.tipo === 'percentual'}
                          onChange={() => setDesconto({ ...desconto, tipo: 'percentual' })}
                          className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300"
                        />
                        <span className="ml-2 text-sm text-gray-700 dark:text-gray-300">Percentual (%)</span>
                      </label>
                      <label className="flex items-center">
                        <input
                          type="radio"
                          checked={desconto.tipo === 'valor'}
                          onChange={() => setDesconto({ ...desconto, tipo: 'valor' })}
                          className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300"
                        />
                        <span className="ml-2 text-sm text-gray-700 dark:text-gray-300">Valor (R$)</span>
                      </label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <input
                        type="number"
                        value={desconto.valor}
                        onChange={(e) => setDesconto({ ...desconto, valor: parseFloat(e.target.value) || 0 })}
                        min="0"
                        step={desconto.tipo === 'percentual' ? '1' : '0.01'}
                        className="flex-1 border border-gray-300 dark:border-gray-600 rounded-md py-2 px-3 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white"
                        placeholder={desconto.tipo === 'percentual' ? "0%" : "R$ 0,00"}
                      />
                      {desconto.valor > 0 && (
                        <span className="text-sm text-green-600 dark:text-green-400">
                          -{formatarDinheiro(calcularDesconto(mesaSelecionada.valor_total + calcularTaxaServico(mesaSelecionada.valor_total) + calcularCouvert(mesaSelecionada.mesa_capacidade)))}
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                {/* Resumo do Pagamento */}
                <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-4 mb-6">
                  <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
                    Resumo do Pagamento
                  </h4>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-gray-600 dark:text-gray-400">Subtotal:</span>
                      <span className="text-gray-900 dark:text-white">{formatarDinheiro(mesaSelecionada.valor_total)}</span>
                    </div>
                    {taxaServico && (
                      <div className="flex justify-between">
                        <span className="text-gray-600 dark:text-gray-400">Taxa de Serviço (10%):</span>
                        <span className="text-gray-900 dark:text-white">{formatarDinheiro(calcularTaxaServico(mesaSelecionada.valor_total))}</span>
                      </div>
                    )}
                    {couvertArtistico && (
                      <div className="flex justify-between">
                        <span className="text-gray-600 dark:text-gray-400">Couvert Artístico:</span>
                        <span className="text-gray-900 dark:text-white">{formatarDinheiro(calcularCouvert(mesaSelecionada.mesa_capacidade))}</span>
                      </div>
                    )}
                    {desconto.valor > 0 && (
                      <div className="flex justify-between">
                        <span className="text-gray-600 dark:text-gray-400">Desconto:</span>
                        <span className="text-green-600 dark:text-green-400">
                          -{formatarDinheiro(calcularDesconto(mesaSelecionada.valor_total + calcularTaxaServico(mesaSelecionada.valor_total) + calcularCouvert(mesaSelecionada.mesa_capacidade)))}
                        </span>
                      </div>
                    )}
                    <div className="flex justify-between text-lg font-bold pt-2 border-t border-gray-200 dark:border-gray-600">
                      <span className="text-gray-900 dark:text-white">Total:</span>
                      <span className="text-gray-900 dark:text-white">{formatarDinheiro(calcularTotalFinal(mesaSelecionada))}</span>
                    </div>
                  </div>
                </div>

                {/* Formas de Pagamento */}
                <div className="space-y-3 mb-6">
                  <button
                    onClick={() => setFormaPagamento('pix')}
                    className={`w-full p-3 rounded-lg border-2 transition-colors ${
                      formaPagamento === 'pix'
                        ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20'
                        : 'border-gray-200 dark:border-gray-600 hover:border-blue-200'
                    }`}
                  >
                    <div className="flex items-center">
                      <QrCode size={20} className="text-blue-500" />
                      <span className="ml-3 font-medium text-gray-900 dark:text-white">PIX</span>
                    </div>
                  </button>

                  <button
                    onClick={() => setFormaPagamento('cartao')}
                    className={`w-full p-3 rounded-lg border-2 transition-colors ${
                      formaPagamento === 'cartao'
                        ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20'
                        : 'border-gray-200 dark:border-gray-600 hover:border-blue-200'
                    }`}
                  >
                    <div className="flex items-center">
                      <CreditCard size={20} className="text-blue-500" />
                      <span className="ml-3 font-medium text-gray-900 dark:text-white">Cartão</span>
                    </div>
                  </button>

                  <button
                    onClick={() => setFormaPagamento('dinheiro')}
                    className={`w-full p-3 rounded-lg border-2 transition-colors ${
                      formaPagamento === 'dinheiro'
                        ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20'
                        : 'border-gray-200 dark:border-gray-600 hover:border-blue-200'
                    }`}
                  >
                    <div className="flex items-center">
                      <DollarSign size={20} className="text-blue-500" />
                      <span className="ml-3 font-medium text-gray-900 dark:text-white">Dinheiro</span>
                    </div>
                  </button>
                </div>

                {/* Valor Recebido (apenas para dinheiro) */}
                {formaPagamento === 'dinheiro' && (
                  <div className="mb-6">
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Valor Recebido
                    </label>
                    <div className="relative">
                      <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                        <span className="text-gray-500 dark:text-gray-400 sm:text-sm">R$</span>
                      </div>
                      <input
                        type="number"
                        step="0.01"
                        min="0"
                        value={valorRecebido}
                        onChange={(e) => setValorRecebido(e.target.value)}
                        className="pl-8 block w-full rounded-md border-gray-300 dark:border-gray-600 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white"
                        placeholder="0,00"
                      />
                    </div>
                    {valorRecebido && (
                      <div className="mt-2 text-sm">
                        <p className="text-gray-600 dark:text-gray-400">
                          Troco: <span className="font-medium text-green-600 dark:text-green-400">
                            {formatarDinheiro(calcularTroco())}
                          </span>
                        </p>
                      </div>
                    )}
                  </div>
                )}

                {/* Botões de Ação */}
                <div className="space-y-3">
                  <Button
                    variant="secondary"
                    fullWidth
                    onClick={() => {
                      setShowPagamentoModal(false);
                      abrirModalAdicionarItem(mesaSelecionada.mesa_id);
                    }}
                    icon={<Plus size={18} />}
                    className="bg-gradient-to-r from-orange-500 to-orange-600 hover:from-orange-600 hover:to-orange-700 text-white"
                  >
                    Adicionar Mais Itens
                  </Button>

                  <Button
                    variant="primary"
                    fullWidth
                    size="lg"
                    onClick={finalizarPagamentoMesa}
                    isLoading={loading}
                    disabled={!formaPagamento}
                    icon={<Receipt size={20} />}
                    className="bg-gradient-to-r from-green-500 to-green-600 hover:from-green-600 hover:to-green-700 py-4"
                  >
                    Confirmar Pagamento
                  </Button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal de Adicionar Item à Comanda */}
      {showAdicionarItemModal && mesaSelecionada && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-black/60 backdrop-blur-sm">
          <div className="flex items-center justify-center min-h-screen p-4">
            <div className="bg-white dark:bg-gray-800 rounded-3xl shadow-2xl w-full max-w-4xl max-h-[90vh] overflow-hidden">
              <div className="flex justify-between items-center p-6 border-b border-gray-200 dark:border-gray-700">
                <h3 className="text-xl font-bold text-gray-900 dark:text-white">
                  Adicionar Item - Mesa {mesaSelecionada.mesa_numero}
                </h3>
                <button
                  onClick={() => {
                    setShowAdicionarItemModal(false);
                    setProdutoSelecionado(null);
                    setQuantidadeProduto(1);
                    setObservacaoProduto('');
                  }}
                  className="text-gray-400 hover:text-gray-500 p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-xl transition-colors"
                >
                  <X size={24} />
                </button>
              </div>

              <div className="p-6">
                {produtoSelecionado ? (
                  // Formulário de detalhes do produto
                  <div className="space-y-6">
                    <div className="bg-blue-50 dark:bg-blue-900/20 p-4 rounded-2xl">
                      <div className="flex items-center justify-between">
                        <div>
                          <h3 className="text-lg font-bold text-blue-900 dark:text-blue-100">{produtoSelecionado.nome}</h3>
                          <p className="text-sm text-blue-700 dark:text-blue-300">{produtoSelecionado.categoria}</p>
                          <p className="text-sm text-blue-600 dark:text-blue-400 mt-1">{produtoSelecionado.descricao}</p>
                        </div>
                        <div className="text-right">
                          <p className="text-2xl font-bold text-blue-900 dark:text-blue-100">
                            {formatarDinheiro(produtoSelecionado.preco)}
                          </p>
                        </div>
                      </div>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                        Quantidade
                      </label>
                      <div className="flex items-center space-x-4">
                        <button
                          type="button"
                          onClick={() => setQuantidadeProduto(Math.max(1, quantidadeProduto - 1))}
                          className="w-10 h-10 rounded-full bg-gray-200 dark:bg-gray-600 flex items-center justify-center hover:bg-gray-300 dark:hover:bg-gray-500 transition-colors"
                        >
                          <Minus size={16} />
                        </button>
                        <input
                          type="number"
                          value={quantidadeProduto}
                          onChange={(e) => setQuantidadeProduto(Math.max(1, parseInt(e.target.value) || 1))}
                          className="w-20 text-center border border-gray-300 dark:border-gray-600 rounded-lg py-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white"
                          min="1"
                        />
                        <button
                          type="button"
                          onClick={() => setQuantidadeProduto(quantidadeProduto + 1)}
                          className="w-10 h-10 rounded-full bg-gray-200 dark:bg-gray-600 flex items-center justify-center hover:bg-gray-300 dark:hover:bg-gray-500 transition-colors"
                        >
                          <Plus size={16} />
                        </button>
                        <div className="ml-4 text-lg font-bold text-gray-900 dark:text-white">
                          Total: {formatarDinheiro(produtoSelecionado.preco * quantidadeProduto)}
                        </div>
                      </div>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                        Observações
                      </label>
                      <textarea
                        value={observacaoProduto}
                        onChange={(e) => setObservacaoProduto(e.target.value)}
                        className="w-full border border-gray-300 dark:border-gray-600 rounded-lg py-3 px-4 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white"
                        rows={3}
                        placeholder="Ex: Sem cebola, molho à parte, bem passado..."
                      />
                    </div>

                    <div className="flex space-x-3">
                      <Button
                        variant="ghost"
                        onClick={() => setProdutoSelecionado(null)}
                        className="flex-1"
                      >
                        Voltar
                      </Button>
                      <Button
                        variant="primary"
                        onClick={adicionarItemNaComanda}
                        isLoading={loading}
                        className="flex-1 bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700"
                        icon={<Plus size={18} />}
                      >
                        Adicionar à Comanda
                      </Button>
                    </div>
                  </div>
                ) : (
                  // Lista de produtos
                  <div className="space-y-6">
                    {/* Filtros */}
                    <div className="flex flex-col md:flex-row gap-4">
                      <div className="relative flex-1">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
                        <input
                          type="text"
                          placeholder="Buscar produtos..."
                          value={searchTerm}
                          onChange={(e) => setSearchTerm(e.target.value)}
                          className="pl-10 w-full rounded-lg border border-gray-300 dark:border-gray-600 py-3 px-4 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white"
                        />
                      </div>
                      <select
                        value={categoriaFiltro}
                        onChange={(e) => setCategoriaFiltro(e.target.value)}
                        className="border border-gray-300 dark:border-gray-600 rounded-lg py-3 px-4 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white"
                      >
                        <option value="todas">Todas as categorias</option>
                        {categorias.map(categoria => (
                          <option key={categoria} value={categoria}>{categoria}</option>
                        ))}
                      </select>
                    </div>

                    {/* Grid de Produtos */}
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 max-h-96 overflow-y-auto">
                      {produtosFiltrados.map((produto) => (
                        <div
                          key={produto.id}
                          onClick={() => setProdutoSelecionado(produto)}
                          className="bg-white dark:bg-gray-700 rounded-xl p-4 border border-gray-200 dark:border-gray-600 hover:shadow-lg hover:border-blue-300 dark:hover:border-blue-500 transition-all duration-200 cursor-pointer group"
                        >
                          <div className="flex items-start justify-between mb-3">
                            <div className="flex-1">
                              <h3 className="font-semibold text-gray-900 dark:text-white group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
                                {produto.nome}
                              </h3>
                              <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                                {produto.categoria}
                              </p>
                            </div>
                            <div className="text-right">
                              <p className="text-lg font-bold text-green-600 dark:text-green-400">
                                {formatarDinheiro(produto.preco)}
                              </p>
                            </div>
                          </div>
                          
                          {produto.descricao && (
                            <p className="text-xs text-gray-600 dark:text-gray-400 line-clamp-2 mb-3">
                              {produto.descricao}
                            </p>
                          )}

                          <div className="flex items-center justify-between">
                            <span className="text-xs bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-200 px-2 py-1 rounded-full font-medium">
                              Disponível
                            </span>
                            <div className="opacity-0 group-hover:opacity-100 transition-opacity">
                              <Plus size={16} className="text-blue-500" />
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>

                    {produtosFiltrados.length === 0 && (
                      <div className="text-center py-8">
                        <Package size={48} className="mx-auto text-gray-400 dark:text-gray-600 mb-4" />
                        <p className="text-gray-500 dark:text-gray-400">
                          Nenhum produto encontrado
                        </p>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal de Venda Avulsa */}
      {showVendaAvulsaModal && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-black/60 backdrop-blur-sm">
          <div className="flex items-center justify-center min-h-screen p-4">
            <div className="bg-white dark:bg-gray-800 rounded-3xl shadow-2xl w-full max-w-4xl max-h-[90vh] overflow-hidden">
              <div className="flex justify-between items-center p-6 border-b border-gray-200 dark:border-gray-700">
                <h3 className="text-xl font-bold text-gray-900 dark:text-white">
                  {vendaAvulsa.length > 0 ? 'Finalizar Venda Avulsa' : 'Selecionar Produtos'}
                </h3>
                <button
                  onClick={() => {
                    setShowVendaAvulsaModal(false);
                    setProdutoSelecionado(null);
                    setQuantidadeProduto(1);
                    setObservacaoProduto('');
                    if (vendaAvulsa.length === 0) {
                      setFormaPagamento(null);
                      setTaxaServico(false);
                      setDesconto({ tipo: 'percentual', valor: 0 });
                    }
                  }}
                  className="text-gray-400 hover:text-gray-500 p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-xl transition-colors"
                >
                  <X size={24} />
                </button>
              </div>

              <div className="p-6">
                {vendaAvulsa.length > 0 && !produtoSelecionado ? (
                  // Finalizar venda avulsa
                  <div className="space-y-6">
                    {/* Resumo da Venda */}
                    <div className="bg-purple-50 dark:bg-purple-900/20 rounded-2xl p-4">
                      <h4 className="text-lg font-bold text-purple-900 dark:text-purple-100 mb-3">
                        Resumo da Venda
                      </h4>
                      <div className="space-y-2">
                        {vendaAvulsa.map((item) => (
                          <div key={item.id} className="flex justify-between text-sm">
                            <span className="text-purple-800 dark:text-purple-200">
                              {item.quantidade}x {item.nome}
                            </span>
                            <span className="font-medium text-purple-900 dark:text-purple-100">
                              {formatarDinheiro(item.preco * item.quantidade)}
                            </span>
                          </div>
                        ))}
                        <div className="border-t border-purple-200 dark:border-purple-700 pt-2 mt-2">
                          <div className="flex justify-between text-lg font-bold">
                            <span className="text-purple-900 dark:text-purple-100">Total:</span>
                            <span className="text-purple-900 dark:text-purple-100">
                              {formatarDinheiro(vendaAvulsa.reduce((total, item) => total + (item.preco * item.quantidade), 0))}
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Adicionais para Venda Avulsa */}
                    <div className="space-y-4">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center">
                          <input
                            type="checkbox"
                            id="taxaServicoAvulsa"
                            checked={taxaServico}
                            onChange={(e) => setTaxaServico(e.target.checked)}
                            className="h-4 w-4 text-purple-600 focus:ring-purple-500 border-gray-300 rounded"
                          />
                          <label htmlFor="taxaServicoAvulsa" className="ml-2 text-sm text-gray-700 dark:text-gray-300">
                            Taxa de Serviço (10%)
                          </label>
                        </div>
                        <span className="text-sm font-medium text-gray-900 dark:text-white">
                          {formatarDinheiro(calcularTaxaServico(vendaAvulsa.reduce((total, item) => total + (item.preco * item.quantidade), 0)))}
                        </span>
                      </div>

                      {/* Desconto para Venda Avulsa */}
                      <div className="border-t pt-4">
                        <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Desconto</h4>
                        <div className="flex space-x-2 mb-2">
                          <label className="flex items-center">
                            <input
                              type="radio"
                              checked={desconto.tipo === 'percentual'}
                              onChange={() => setDesconto({ ...desconto, tipo: 'percentual' })}
                              className="h-4 w-4 text-purple-600 focus:ring-purple-500 border-gray-300"
                            />
                            <span className="ml-2 text-sm text-gray-700 dark:text-gray-300">Percentual (%)</span>
                          </label>
                          <label className="flex items-center">
                            <input
                              type="radio"
                              checked={desconto.tipo === 'valor'}
                              onChange={() => setDesconto({ ...desconto, tipo: 'valor' })}
                              className="h-4 w-4 text-purple-600 focus:ring-purple-500 border-gray-300"
                            />
                            <span className="ml-2 text-sm text-gray-700 dark:text-gray-300">Valor (R$)</span>
                          </label>
                        </div>
                        <input
                          type="number"
                          value={desconto.valor}
                          onChange={(e) => setDesconto({ ...desconto, valor: parseFloat(e.target.value) || 0 })}
                          min="0"
                          step={desconto.tipo === 'percentual' ? '1' : '0.01'}
                          className="w-full border border-gray-300 dark:border-gray-600 rounded-lg py-2 px-3 focus:ring-purple-500 focus:border-purple-500 dark:bg-gray-700 dark:text-white"
                          placeholder={desconto.tipo === 'percentual' ? "0%" : "R$ 0,00"}
                        />
                      </div>
                    </div>

                    {/* Total Final */}
                    <div className="bg-gradient-to-r from-purple-50 to-indigo-50 dark:from-purple-900/20 dark:to-indigo-900/20 rounded-2xl p-4">
                      <div className="flex justify-between items-center">
                        <span className="text-xl font-bold text-purple-900 dark:text-purple-100">
                          Total Final:
                        </span>
                        <span className="text-3xl font-bold text-purple-900 dark:text-purple-100">
                          {formatarDinheiro(calcularTotalVendaAvulsa())}
                        </span>
                      </div>
                    </div>

                    {/* Formas de Pagamento */}
                    <div className="space-y-3">
                      <button
                        onClick={() => setFormaPagamento('pix')}
                        className={`w-full p-3 rounded-lg border-2 transition-colors ${
                          formaPagamento === 'pix'
                            ? 'border-purple-500 bg-purple-50 dark:bg-purple-900/20'
                            : 'border-gray-200 dark:border-gray-600 hover:border-purple-200'
                        }`}
                      >
                        <div className="flex items-center">
                          <QrCode size={20} className="text-purple-500" />
                          <span className="ml-3 font-medium text-gray-900 dark:text-white">PIX</span>
                        </div>
                      </button>

                      <button
                        onClick={() => setFormaPagamento('cartao')}
                        className={`w-full p-3 rounded-lg border-2 transition-colors ${
                          formaPagamento === 'cartao'
                            ? 'border-purple-500 bg-purple-50 dark:bg-purple-900/20'
                            : 'border-gray-200 dark:border-gray-600 hover:border-purple-200'
                        }`}
                      >
                        <div className="flex items-center">
                          <CreditCard size={20} className="text-purple-500" />
                          <span className="ml-3 font-medium text-gray-900 dark:text-white">Cartão</span>
                        </div>
                      </button>

                      <button
                        onClick={() => setFormaPagamento('dinheiro')}
                        className={`w-full p-3 rounded-lg border-2 transition-colors ${
                          formaPagamento === 'dinheiro'
                            ? 'border-purple-500 bg-purple-50 dark:bg-purple-900/20'
                            : 'border-gray-200 dark:border-gray-600 hover:border-purple-200'
                        }`}
                      >
                        <div className="flex items-center">
                          <DollarSign size={20} className="text-purple-500" />
                          <span className="ml-3 font-medium text-gray-900 dark:text-white">Dinheiro</span>
                        </div>
                      </button>
                    </div>

                    <div className="flex space-x-3">
                      <Button
                        variant="secondary"
                        onClick={() => setProdutoSelecionado({})}
                        className="flex-1 bg-gradient-to-r from-orange-500 to-orange-600 hover:from-orange-600 hover:to-orange-700 text-white"
                        icon={<Plus size={18} />}
                      >
                        Adicionar Mais Produtos
                      </Button>
                      <Button
                        variant="primary"
                        onClick={finalizarVendaAvulsa}
                        isLoading={loading}
                        disabled={!formaPagamento}
                        className="flex-1 bg-gradient-to-r from-purple-500 to-purple-600 hover:from-purple-600 hover:to-purple-700"
                        icon={<Receipt size={18} />}
                      >
                        Finalizar Venda
                      </Button>
                    </div>
                  </div>
                ) : (
                  // Seleção de produtos (mesmo código da modal de adicionar item)
                  <div className="space-y-6">
                    {/* Filtros */}
                    <div className="flex flex-col md:flex-row gap-4">
                      <div className="relative flex-1">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
                        <input
                          type="text"
                          placeholder="Buscar produtos..."
                          value={searchTerm}
                          onChange={(e) => setSearchTerm(e.target.value)}
                          className="pl-10 w-full rounded-lg border border-gray-300 dark:border-gray-600 py-3 px-4 focus:ring-purple-500 focus:border-purple-500 dark:bg-gray-700 dark:text-white"
                        />
                      </div>
                      <select
                        value={categoriaFiltro}
                        onChange={(e) => setCategoriaFiltro(e.target.value)}
                        className="border border-gray-300 dark:border-gray-600 rounded-lg py-3 px-4 focus:ring-purple-500 focus:border-purple-500 dark:bg-gray-700 dark:text-white"
                      >
                        <option value="todas">Todas as categorias</option>
                        {categorias.map(categoria => (
                          <option key={categoria} value={categoria}>{categoria}</option>
                        ))}
                      </select>
                    </div>

                    {/* Grid de Produtos */}
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 max-h-96 overflow-y-auto">
                      {produtosFiltrados.map((produto) => (
                        <div
                          key={produto.id}
                          onClick={() => setProdutoSelecionado(produto)}
                          className="bg-white dark:bg-gray-700 rounded-xl p-4 border border-gray-200 dark:border-gray-600 hover:shadow-lg hover:border-purple-300 dark:hover:border-purple-500 transition-all duration-200 cursor-pointer group"
                        >
                          <div className="flex items-start justify-between mb-3">
                            <div className="flex-1">
                              <h3 className="font-semibold text-gray-900 dark:text-white group-hover:text-purple-600 dark:group-hover:text-purple-400 transition-colors">
                                {produto.nome}
                              </h3>
                              <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                                {produto.categoria}
                              </p>
                            </div>
                            <div className="text-right">
                              <p className="text-lg font-bold text-green-600 dark:text-green-400">
                                {formatarDinheiro(produto.preco)}
                              </p>
                            </div>
                          </div>
                          
                          {produto.descricao && (
                            <p className="text-xs text-gray-600 dark:text-gray-400 line-clamp-2 mb-3">
                              {produto.descricao}
                            </p>
                          )}

                          <div className="flex items-center justify-between">
                            <span className="text-xs bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-200 px-2 py-1 rounded-full font-medium">
                              Disponível
                            </span>
                            <div className="opacity-0 group-hover:opacity-100 transition-opacity">
                              <Plus size={16} className="text-purple-500" />
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>

                    {produtosFiltrados.length === 0 && (
                      <div className="text-center py-8">
                        <Package size={48} className="mx-auto text-gray-400 dark:text-gray-600 mb-4" />
                        <p className="text-gray-500 dark:text-gray-400">
                          Nenhum produto encontrado
                        </p>
                      </div>
                    )}
                  </div>
                )}

                {/* Formulário de Produto Selecionado para Venda Avulsa */}
                {produtoSelecionado && vendaAvulsa.length === 0 && (
                  <div className="space-y-6">
                    <div className="bg-purple-50 dark:bg-purple-900/20 p-4 rounded-2xl">
                      <div className="flex items-center justify-between">
                        <div>
                          <h3 className="text-lg font-bold text-purple-900 dark:text-purple-100">{produtoSelecionado.nome}</h3>
                          <p className="text-sm text-purple-700 dark:text-purple-300">{produtoSelecionado.categoria}</p>
                          <p className="text-sm text-purple-600 dark:text-purple-400 mt-1">{produtoSelecionado.descricao}</p>
                        </div>
                        <div className="text-right">
                          <p className="text-2xl font-bold text-purple-900 dark:text-purple-100">
                            {formatarDinheiro(produtoSelecionado.preco)}
                          </p>
                        </div>
                      </div>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                        Quantidade
                      </label>
                      <div className="flex items-center space-x-4">
                        <button
                          type="button"
                          onClick={() => setQuantidadeProduto(Math.max(1, quantidadeProduto - 1))}
                          className="w-10 h-10 rounded-full bg-gray-200 dark:bg-gray-600 flex items-center justify-center hover:bg-gray-300 dark:hover:bg-gray-500 transition-colors"
                        >
                          <Minus size={16} />
                        </button>
                        <input
                          type="number"
                          value={quantidadeProduto}
                          onChange={(e) => setQuantidadeProduto(Math.max(1, parseInt(e.target.value) || 1))}
                          className="w-20 text-center border border-gray-300 dark:border-gray-600 rounded-lg py-2 focus:ring-purple-500 focus:border-purple-500 dark:bg-gray-700 dark:text-white"
                          min="1"
                        />
                        <button
                          type="button"
                          onClick={() => setQuantidadeProduto(quantidadeProduto + 1)}
                          className="w-10 h-10 rounded-full bg-gray-200 dark:bg-gray-600 flex items-center justify-center hover:bg-gray-300 dark:hover:bg-gray-500 transition-colors"
                        >
                          <Plus size={16} />
                        </button>
                        <div className="ml-4 text-lg font-bold text-gray-900 dark:text-white">
                          Total: {formatarDinheiro(produtoSelecionado.preco * quantidadeProduto)}
                        </div>
                      </div>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                        Observações
                      </label>
                      <textarea
                        value={observacaoProduto}
                        onChange={(e) => setObservacaoProduto(e.target.value)}
                        className="w-full border border-gray-300 dark:border-gray-600 rounded-lg py-3 px-4 focus:ring-purple-500 focus:border-purple-500 dark:bg-gray-700 dark:text-white"
                        rows={3}
                        placeholder="Observações sobre o produto..."
                      />
                    </div>

                    <div className="flex space-x-3">
                      <Button
                        variant="ghost"
                        onClick={() => setProdutoSelecionado(null)}
                        className="flex-1"
                      >
                        Voltar
                      </Button>
                      <Button
                        variant="primary"
                        onClick={adicionarProdutoVendaAvulsa}
                        className="flex-1 bg-gradient-to-r from-purple-500 to-purple-600 hover:from-purple-600 hover:to-purple-700"
                        icon={<Plus size={18} />}
                      >
                        Adicionar ao Carrinho
                      </Button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal do Cupom Fiscal */}
      {showCupomModal && cupomFiscal && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-black/60 backdrop-blur-sm">
          <div className="flex items-center justify-center min-h-screen p-4">
            <div className="bg-white dark:bg-gray-800 rounded-3xl shadow-2xl w-full max-w-md">
              <div className="flex justify-between items-center p-4 border-b border-gray-200 dark:border-gray-700">
                <h3 className="text-lg font-medium text-gray-900 dark:text-white">
                  Cupom Fiscal
                </h3>
                <button
                  onClick={() => setShowCupomModal(false)}
                  className="text-gray-400 hover:text-gray-500"
                >
                  <X size={20} />
                </button>
              </div>

              <div className="p-4">
                {/* Cupom Fiscal */}
                <div className="bg-white border-2 border-dashed border-gray-300 p-4 font-mono text-sm">
                  <div className="text-center mb-4">
                    <h4 className="font-bold">{restaurante?.nome || 'RESTAURANTE'}</h4>
                    <p className="text-xs">CUPOM FISCAL NÃO FISCAL</p>
                    <p className="text-xs">Comanda: {cupomFiscal.numero}</p>
                  </div>

                  <div className="border-t border-dashed border-gray-300 pt-2 mb-2">
                    <div className="flex justify-between text-xs">
                      <span>Data: {cupomFiscal.data}</span>
                      <span>Hora: {cupomFiscal.hora}</span>
                    </div>
                    {cupomFiscal.mesa && (
                      <p className="text-xs">Mesa: {cupomFiscal.mesa}</p>
                    )}
                    {cupomFiscal.garcom && (
                      <p className="text-xs">Garçom: {cupomFiscal.garcom}</p>
                    )}
                    <p className="text-xs">Operador: {cupomFiscal.operador}</p>
                  </div>

                  <div className="border-t border-dashed border-gray-300 pt-2 mb-2">
                    <div className="space-y-1">
                      {cupomFiscal.itens.map((item, index) => (
                        <div key={index}>
                          <div className="flex justify-between">
                            <span className="text-xs">
                              {item.quantidade}x {item.nome}
                            </span>
                            <span className="text-xs">
                              {formatarDinheiro(item.total)}
                            </span>
                          </div>
                          <div className="flex justify-between text-xs text-gray-600">
                            <span>  {formatarDinheiro(item.preco_unitario)} un</span>
                          </div>
                          {item.observacao && (
                            <div className="text-xs text-gray-600 ml-2">
                              Obs: {item.observacao}
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="border-t border-dashed border-gray-300 pt-2 mb-2">
                    <div className="space-y-1 text-xs">
                      <div className="flex justify-between">
                        <span>SUBTOTAL:</span>
                        <span>{formatarDinheiro(cupomFiscal.subtotal)}</span>
                      </div>
                      {cupomFiscal.taxa_servico > 0 && (
                        <div className="flex justify-between">
                          <span>TAXA SERVIÇO (10%):</span>
                          <span>{formatarDinheiro(cupomFiscal.taxa_servico)}</span>
                        </div>
                      )}
                      {cupomFiscal.couvert_artistico > 0 && (
                        <div className="flex justify-between">
                          <span>COUVERT ARTÍSTICO:</span>
                          <span>{formatarDinheiro(cupomFiscal.couvert_artistico)}</span>
                        </div>
                      )}
                      {cupomFiscal.desconto > 0 && (
                        <div className="flex justify-between">
                          <span>DESCONTO:</span>
                          <span>-{formatarDinheiro(cupomFiscal.desconto)}</span>
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="border-t border-dashed border-gray-300 pt-2 mb-2">
                    <div className="flex justify-between font-bold">
                      <span>TOTAL:</span>
                      <span>{formatarDinheiro(cupomFiscal.total)}</span>
                    </div>
                    <div className="flex justify-between text-xs">
                      <span>FORMA PAGTO:</span>
                      <span>{cupomFiscal.forma_pagamento.toUpperCase()}</span>
                    </div>
                  </div>

                  <div className="text-center text-xs mt-4">
                    <p>OBRIGADO PELA PREFERÊNCIA!</p>
                    <p>VOLTE SEMPRE!</p>
                  </div>
                </div>

                <div className="flex space-x-3 mt-4">
                  <Button
                    variant="ghost"
                    onClick={() => setShowCupomModal(false)}
                    className="flex-1"
                  >
                    Fechar
                  </Button>
                  <Button
                    variant="primary"
                    onClick={imprimirCupom}
                    icon={<Printer size={16} />}
                    className="flex-1"
                  >
                    Imprimir
                  </Button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default PDV;