import React, { useState, useEffect } from 'react';
import { 
  Coffee, CreditCard, DollarSign, QrCode, Receipt, 
  Plus, Minus, Trash2, X, Check, Clock, User, 
  AlertTriangle, Calculator, Percent, Music, 
  ShoppingCart, Edit, Printer
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

const PDV: React.FC = () => {
  const { 
    mesas, 
    itensComanda, 
    comandas, 
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
        
        // Verificar se existe comanda aberta para esta mesa
        const temComandaAberta = comandas.some(comanda => 
          comanda.mesa_id === mesa.id && comanda.status === 'aberta'
        );
        
        return temComandaAberta;
      })
      .map(mesa => {
        // Buscar comanda aberta desta mesa
        const comandaAberta = comandas.find(comanda => 
          comanda.mesa_id === mesa.id && comanda.status === 'aberta'
        );
        
        // Filtrar apenas itens da comanda aberta que não foram entregues/cancelados
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
      
      // Gerar cupom fiscal antes de finalizar
      const cupom = gerarCupomFiscal(mesaSelecionada);
      setCupomFiscal(cupom);

      // Finalizar pagamento da comanda
      await finalizarPagamento(mesaSelecionada.mesa_id, formaPagamento);

      // Registrar movimentação no caixa
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

      await refreshData();
      
      toast.success(`Pagamento da Mesa ${mesaSelecionada.mesa_numero} finalizado!`);
      
      // Mostrar cupom fiscal
      setShowCupomModal(true);
      
      // Reset form
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

  const calcularTroco = () => {
    if (!mesaSelecionada || formaPagamento !== 'dinheiro' || !valorRecebido) return 0;
    const recebido = parseFloat(valorRecebido);
    const total = calcularTotalFinal(mesaSelecionada);
    return Math.max(0, recebido - total);
  };

  const imprimirCupom = () => {
    if (cupomFiscal) {
      // Simular impressão
      console.log('Imprimindo cupom fiscal:', cupomFiscal);
      toast.success('Cupom fiscal enviado para impressão!');
    }
  };

  const comandasAtivas = mesasComComandas();

  return (
    <div className="min-h-screen bg-gray-100 dark:bg-gray-900">
      {/* Status do Caixa */}
      <div className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 p-4">
        {caixaAtual ? (
          <div className="bg-green-50 border-l-4 border-green-500 p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-6">
                <div className="flex items-center">
                  <User className="h-5 w-5 text-green-500 mr-2" />
                  <div>
                    <p className="text-sm font-medium text-green-800">
                      PDV Operacional - {caixaAtual.operador_nome}
                    </p>
                    <p className="text-xs text-green-700">
                      Saldo: {formatarDinheiro(caixaAtual.valor_sistema)}
                    </p>
                  </div>
                </div>
              </div>
              <div className="text-sm text-green-700">
                Caixa aberto às {new Date(caixaAtual.data_abertura).toLocaleTimeString('pt-BR')}
              </div>
            </div>
          </div>
        ) : (
          <div className="bg-red-50 border-l-4 border-red-500 p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center">
                <AlertTriangle className="h-5 w-5 text-red-500 mr-2" />
                <div>
                  <h3 className="text-sm font-medium text-red-800">PDV Fechado</h3>
                  <p className="text-sm text-red-700">
                    O caixa precisa ser aberto para realizar vendas.
                  </p>
                </div>
              </div>
              <Button
                variant="primary"
                onClick={() => window.location.href = '/dashboard/caixa'}
              >
                Ir para Caixa
              </Button>
            </div>
          </div>
        )}
      </div>

      {/* Header */}
      <div className="bg-white dark:bg-gray-800 shadow-sm p-6">
        <div className="max-w-7xl mx-auto">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
                Ponto de Venda - Mesas
              </h1>
              <p className="text-gray-600 dark:text-gray-400 mt-1">
                Selecione uma mesa para finalizar o pagamento
              </p>
            </div>
            <div className="flex items-center space-x-4">
              <div className="text-right">
                <p className="text-sm text-gray-500 dark:text-gray-400">Comandas Ativas</p>
                <p className="text-2xl font-bold text-blue-600 dark:text-blue-400">
                  {comandasAtivas.length}
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Grid de Mesas */}
      <div className="max-w-7xl mx-auto p-6">
        {comandasAtivas.length === 0 ? (
          <div className="text-center py-16">
            <Coffee size={64} className="mx-auto text-gray-400 dark:text-gray-600 mb-4" />
            <h3 className="text-xl font-medium text-gray-900 dark:text-white mb-2">
              Nenhuma comanda ativa
            </h3>
            <p className="text-gray-500 dark:text-gray-400">
              Não há mesas com comandas abertas para finalizar pagamento
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {comandasAtivas.map((comanda) => (
              <div
                key={comanda.mesa_id}
                className="bg-white dark:bg-gray-800 rounded-xl shadow-lg border border-gray-200 dark:border-gray-700 overflow-hidden hover:shadow-xl transition-all duration-300 cursor-pointer"
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
                <div className="bg-gradient-to-r from-blue-500 to-blue-600 p-4 text-white">
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="text-xl font-bold">Mesa {comanda.mesa_numero}</h3>
                      <p className="text-blue-100 text-sm">
                        {comanda.mesa_capacidade} pessoas
                      </p>
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

                {/* Informações da Mesa */}
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
                    <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300">
                      Itens do Pedido:
                    </h4>
                    <div className="max-h-32 overflow-y-auto space-y-1">
                      {comanda.itens.map((item) => (
                        <div key={item.id} className="flex justify-between text-sm bg-gray-50 dark:bg-gray-700 p-2 rounded">
                          <span className="text-gray-700 dark:text-gray-300">
                            {item.quantidade}x {item.nome}
                          </span>
                          <span className="font-medium text-gray-900 dark:text-white">
                            {formatarDinheiro(item.preco_unitario * item.quantidade)}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Status dos Itens */}
                  <div className="flex flex-wrap gap-1 mb-4">
                    {comanda.itens.map((item) => (
                      <span
                        key={item.id}
                        className={`text-xs px-2 py-1 rounded-full ${
                          item.status === 'pendente' ? 'bg-yellow-100 text-yellow-800' :
                          item.status === 'preparando' ? 'bg-blue-100 text-blue-800' :
                          item.status === 'pronto' ? 'bg-green-100 text-green-800' :
                          'bg-gray-100 text-gray-800'
                        }`}
                      >
                        {item.status}
                      </span>
                    ))}
                  </div>

                  <Button
                    variant="primary"
                    fullWidth
                    icon={<CreditCard size={18} />}
                    disabled={!caixaAtual}
                  >
                    Finalizar Pagamento
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Modal de Pagamento */}
      {showPagamentoModal && mesaSelecionada && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-black bg-opacity-50">
          <div className="flex items-center justify-center min-h-screen p-4">
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
              <div className="flex justify-between items-center p-6 border-b border-gray-200 dark:border-gray-700">
                <h3 className="text-lg font-medium text-gray-900 dark:text-white">
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
                  className="text-gray-400 hover:text-gray-500"
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
                      setShowAdicionarItemModal(true);
                    }}
                    icon={<Plus size={18} />}
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
                  >
                    Confirmar Pagamento
                  </Button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal do Cupom Fiscal */}
      {showCupomModal && cupomFiscal && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-black bg-opacity-50">
          <div className="flex items-center justify-center min-h-screen p-4">
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl w-full max-w-md">
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