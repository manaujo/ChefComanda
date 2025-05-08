import React, { useState } from 'react';
import { CreditCard, DollarSign, Receipt, ArrowUpCircle, ArrowDownCircle } from 'lucide-react';
import Button from '../components/ui/Button';
import { formatarDinheiro } from '../utils/formatters';

interface MovimentacaoCaixa {
  id: number;
  tipo: 'entrada' | 'saida';
  valor: number;
  descricao: string;
  formaPagamento?: string;
  horario: string;
}

const CaixaRegistradora: React.FC = () => {
  const [caixaAberto, setCaixaAberto] = useState(false);
  const [valorInicial, setValorInicial] = useState<string>('');
  const [saldoAtual, setSaldoAtual] = useState(0);
  const [movimentacoes, setMovimentacoes] = useState<MovimentacaoCaixa[]>([]);

  const abrirCaixa = () => {
    const valor = parseFloat(valorInicial);
    if (isNaN(valor) || valor < 0) {
      alert('Digite um valor válido');
      return;
    }

    setCaixaAberto(true);
    setSaldoAtual(valor);
    setMovimentacoes([{
      id: 1,
      tipo: 'entrada',
      valor,
      descricao: 'Abertura de caixa',
      horario: new Date().toISOString()
    }]);
  };

  const fecharCaixa = () => {
    // Aqui você pode adicionar a lógica para gerar relatório de fechamento
    setCaixaAberto(false);
    setValorInicial('');
    setSaldoAtual(0);
    setMovimentacoes([]);
  };

  const totaisPorFormaPagamento = {
    'Dinheiro': 450.00,
    'Cartão de Crédito': 1250.90,
    'Cartão de Débito': 890.50,
    'Pix': 650.00
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Caixa Registradora</h1>
          <p className="text-gray-500 mt-1">
            Controle de entradas e saídas
          </p>
        </div>
        <div className="mt-4 md:mt-0">
          {caixaAberto ? (
            <Button
              variant="warning"
              onClick={fecharCaixa}
              icon={<ArrowDownCircle size={18} />}
            >
              Fechar Caixa
            </Button>
          ) : (
            <Button
              variant="primary"
              onClick={() => document.getElementById('modal-abrir-caixa')?.click()}
              icon={<ArrowUpCircle size={18} />}
            >
              Abrir Caixa
            </Button>
          )}
        </div>
      </div>

      {!caixaAberto ? (
        // Modal de Abertura de Caixa
        <div className="bg-white rounded-lg shadow-sm p-6">
          <h2 className="text-lg font-medium mb-4">Abertura de Caixa</h2>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700">
                Valor Inicial em Caixa
              </label>
              <div className="mt-1 relative rounded-md shadow-sm">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <DollarSign size={18} className="text-gray-400" />
                </div>
                <input
                  type="number"
                  value={valorInicial}
                  onChange={(e) => setValorInicial(e.target.value)}
                  className="focus:ring-blue-500 focus:border-blue-500 block w-full pl-10 pr-12 sm:text-sm border-gray-300 rounded-md"
                  placeholder="0,00"
                  step="0.01"
                />
              </div>
            </div>
            <Button
              variant="primary"
              onClick={abrirCaixa}
              fullWidth
            >
              Abrir Caixa
            </Button>
          </div>
        </div>
      ) : (
        // Visão do Caixa Aberto
        <div className="space-y-6">
          {/* Cards de Resumo */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="bg-white rounded-lg shadow p-6">
              <div className="flex items-center">
                <div className="p-3 bg-green-100 rounded-full">
                  <DollarSign size={24} className="text-green-600" />
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-500">Saldo em Caixa</p>
                  <p className="text-2xl font-semibold">{formatarDinheiro(saldoAtual)}</p>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-lg shadow p-6">
              <div className="flex items-center">
                <div className="p-3 bg-blue-100 rounded-full">
                  <Receipt size={24} className="text-blue-600" />
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-500">Total de Vendas</p>
                  <p className="text-2xl font-semibold">{formatarDinheiro(3241.40)}</p>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-lg shadow p-6">
              <div className="flex items-center">
                <div className="p-3 bg-purple-100 rounded-full">
                  <CreditCard size={24} className="text-purple-600" />
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-500">Vendas no Cartão</p>
                  <p className="text-2xl font-semibold">{formatarDinheiro(2141.40)}</p>
                </div>
              </div>
            </div>
          </div>

          {/* Totais por Forma de Pagamento */}
          <div className="bg-white rounded-lg shadow overflow-hidden">
            <div className="p-6">
              <h2 className="text-lg font-medium mb-4">Totais por Forma de Pagamento</h2>
              <div className="space-y-4">
                {Object.entries(totaisPorFormaPagamento).map(([forma, valor]) => (
                  <div key={forma} className="flex items-center justify-between">
                    <span className="text-sm font-medium text-gray-900">{forma}</span>
                    <span className="text-sm text-gray-500">{formatarDinheiro(valor)}</span>
                  </div>
                ))}
                <div className="pt-4 border-t border-gray-200">
                  <div className="flex items-center justify-between font-medium">
                    <span className="text-base">Total</span>
                    <span className="text-base">{formatarDinheiro(
                      Object.values(totaisPorFormaPagamento).reduce((a, b) => a + b, 0)
                    )}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Movimentações do Dia */}
          <div className="bg-white rounded-lg shadow overflow-hidden">
            <div className="p-6">
              <h2 className="text-lg font-medium mb-4">Movimentações do Dia</h2>
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Horário
                      </th>
                      <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Descrição
                      </th>
                      <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Forma de Pagamento
                      </th>
                      <th scope="col" className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Valor
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {movimentacoes.map((mov) => (
                      <tr key={mov.id}>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {new Date(mov.horario).toLocaleTimeString('pt-BR')}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {mov.descricao}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {mov.formaPagamento || '-'}
                        </td>
                        <td className={`px-6 py-4 whitespace-nowrap text-sm text-right ${
                          mov.tipo === 'entrada' ? 'text-green-600' : 'text-red-600'
                        }`}>
                          {mov.tipo === 'entrada' ? '+' : '-'} {formatarDinheiro(mov.valor)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default CaixaRegistradora;