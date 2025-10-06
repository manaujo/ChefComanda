import React, { useState, useEffect } from "react";
import {
  X,
  CreditCard,
  QrCode,
  Wallet,
  Percent,
  Music,
  Receipt
} from "lucide-react";
import Button from "../ui/Button";
import { useRestaurante } from "../../contexts/RestauranteContext";
import { formatarDinheiro } from "../../utils/formatters";
import toast from "react-hot-toast";
import { supabase } from "../../services/supabase";
import { useAuth } from "../../contexts/AuthContext";
import ThermalPrinterService from "../../services/ThermalPrinterService";

interface PagamentoModalProps {
  isOpen: boolean;
  onClose: () => void;
  mesa: Mesa;
}

const PagamentoModal: React.FC<PagamentoModalProps> = ({
  isOpen,
  onClose,
  mesa
}) => {
  const [formaPagamento, setFormaPagamento] = useState<
    "pix" | "dinheiro" | "cartao" | null
  >(null);
  const [loading, setLoading] = useState(false);
  const [taxaServico, setTaxaServico] = useState(false);
  const [couvertArtistico, setCouvertArtistico] = useState(false);
  const [desconto, setDesconto] = useState({
    tipo: "percentual" as "percentual" | "valor",
    valor: 0
  });
  const [itensComanda, setItensComanda] = useState<ComandaItemData[]>([]);

  const {
    finalizarPagamento,
    itensComanda: allItensComanda,
    refreshData
  } = useRestaurante();
  const { user } = useAuth();

  useEffect(() => {
    if (isOpen && mesa) {
      // Filtrar itens da comanda para esta mesa
      // Filtrar apenas itens ativos (não entregues ou cancelados)
      const itensMesa = allItensComanda.filter(
        (item) =>
          item.mesa_id === mesa.id &&
          item.status !== "entregue" &&
          item.status !== "cancelado"
      );
      setItensComanda(itensMesa);
    }
  }, [isOpen, mesa, allItensComanda]);

  // Calcular valor total dos itens
  const valorTotalItens = itensComanda.reduce((total, item) => {
    return total + item.preco_unitario * item.quantidade;
  }, 0);

  const valorTaxaServico = taxaServico ? valorTotalItens * 0.1 : 0;
  const valorCouvert = couvertArtistico ? 15 * (mesa.capacidade || 1) : 0;

  const calcularDesconto = () => {
    if (desconto.tipo === "percentual") {
      return (
        (valorTotalItens + valorTaxaServico + valorCouvert) *
        (desconto.valor / 100)
      );
    }
    return desconto.valor;
  };

  const valorDesconto = calcularDesconto();
  const valorTotal =
    valorTotalItens + valorTaxaServico + valorCouvert - valorDesconto;

  const handlePagamento = async () => {
    if (!formaPagamento) {
      toast.error("Selecione uma forma de pagamento");
      return;
    }

    setLoading(true);
    try {
      // A função finalizarPagamento já registra a movimentação automaticamente
      await finalizarPagamento(mesa.id, formaPagamento);
      
      // Impressão automática da notinha de pagamento
      try {
        await ThermalPrinterService.printPaymentReceipt(
          'ChefComanda', // Nome do restaurante - você pode pegar do contexto
          mesa.numero,
          itensComanda.map(item => ({
            nome: item.nome,
            quantidade: item.quantidade,
            preco: item.preco_unitario,
            observacao: item.observacao
          })),
          valorTotal,
          formaPagamento
        );
        console.log('✅ Notinha de pagamento enviada para impressão');
      } catch (printError) {
        console.warn('⚠️ Erro na impressão automática:', printError);
        // Não falhar o pagamento por causa da impressão
      }
      
      await refreshData(); // Refresh data to update UI
      onClose();
    } catch (error) {
      // Error is already handled in finalizarPagamento
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      <div className="flex items-end sm:items-center justify-center min-h-screen p-0 sm:p-4">
        <div className="fixed inset-0 transition-opacity" aria-hidden="true" onClick={onClose}>
          <div className="absolute inset-0 bg-gray-500 dark:bg-gray-900 opacity-75"></div>
        </div>

        <div className="inline-block align-bottom bg-white dark:bg-gray-800 rounded-t-2xl sm:rounded-lg text-left overflow-hidden shadow-xl transform transition-all w-full sm:my-8 sm:align-middle sm:max-w-lg max-h-[95vh] flex flex-col">
          <div className="flex justify-between items-center bg-gray-100 dark:bg-gray-700 px-4 sm:px-6 py-3 border-b border-gray-200 dark:border-gray-600">
            <h2 className="text-base sm:text-lg font-medium text-gray-900 dark:text-white">
              Pagamento - Mesa {mesa.numero}
            </h2>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-500 dark:text-gray-300 dark:hover:text-gray-200 p-1"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          <div className="px-4 sm:px-6 py-4 overflow-y-auto flex-1">
            {/* Itens da comanda */}
            <div className="mb-4">
              <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Itens consumidos
              </h3>
              <div className="max-h-32 sm:max-h-40 overflow-y-auto border border-gray-300 dark:border-gray-600 rounded-md p-2 bg-gray-50 dark:bg-gray-700/50">
                {itensComanda.length > 0 ? (
                  <div className="space-y-2">
                    {itensComanda.map((item) => (
                      <div
                        key={item.id}
                        className="flex justify-between text-xs sm:text-sm text-gray-900 dark:text-gray-100"
                      >
                        <span>
                          {item.quantidade}x {item.nome}
                        </span>
                        <span className="font-medium">
                          {formatarDinheiro(
                            item.preco_unitario * item.quantidade
                          )}
                        </span>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-xs sm:text-sm text-gray-500 dark:text-gray-400 text-center py-2">
                    Nenhum item na comanda
                  </p>
                )}
              </div>
            </div>

            {/* Subtotal */}
            <div className="mb-4 sm:mb-6">
              <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Consumo
              </h3>
              <p className="text-xl sm:text-2xl font-bold text-gray-900 dark:text-white">
                {formatarDinheiro(valorTotalItens)}
              </p>
            </div>

            {/* Adicionais */}
            <div className="space-y-3 sm:space-y-4 mb-4 sm:mb-6">
              <div className="flex items-center justify-between">
                <div className="flex items-center">
                  <input
                    type="checkbox"
                    id="taxaServico"
                    checked={taxaServico}
                    onChange={(e) => setTaxaServico(e.target.checked)}
                    className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                  />
                  <label
                    htmlFor="taxaServico"
                    className="ml-2 text-xs sm:text-sm text-gray-700 dark:text-gray-300"
                  >
                    Taxa de Serviço (10%)
                  </label>
                </div>
                <span className="text-xs sm:text-sm font-medium text-gray-900 dark:text-white">
                  {formatarDinheiro(valorTaxaServico)}
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
                  <label
                    htmlFor="couvert"
                    className="ml-2 text-xs sm:text-sm text-gray-700 dark:text-gray-300"
                  >
                    Couvert Artístico (R$ 15,00 p/ pessoa)
                  </label>
                </div>
                <span className="text-xs sm:text-sm font-medium text-gray-900 dark:text-white">
                  {formatarDinheiro(valorCouvert)}
                </span>
              </div>

              <div className="border-t border-gray-200 dark:border-gray-600 pt-3 sm:pt-4">
                <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Desconto
                </h4>
                <div className="flex space-x-4 mb-2">
                  <label className="flex items-center">
                    <input
                      type="radio"
                      checked={desconto.tipo === "percentual"}
                      onChange={() =>
                        setDesconto({ ...desconto, tipo: "percentual" })
                      }
                      className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300"
                    />
                    <span className="ml-2 text-xs sm:text-sm text-gray-700 dark:text-gray-300">
                      Percentual (%)
                    </span>
                  </label>
                  <label className="flex items-center">
                    <input
                      type="radio"
                      checked={desconto.tipo === "valor"}
                      onChange={() =>
                        setDesconto({ ...desconto, tipo: "valor" })
                      }
                      className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300"
                    />
                    <span className="ml-2 text-xs sm:text-sm text-gray-700 dark:text-gray-300">
                      Valor (R$)
                    </span>
                  </label>
                </div>
                <div className="flex items-center">
                  <input
                    type="number"
                    value={desconto.valor}
                    onChange={(e) =>
                      setDesconto({
                        ...desconto,
                        valor: parseFloat(e.target.value) || 0
                      })
                    }
                    min="0"
                    step={desconto.tipo === "percentual" ? "1" : "0.01"}
                    className="block w-full rounded-md border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white shadow-sm focus:ring-blue-500 focus:border-blue-500 text-sm p-2"
                    placeholder={
                      desconto.tipo === "percentual" ? "0%" : "R$ 0,00"
                    }
                  />
                </div>
                {valorDesconto > 0 && (
                  <p className="text-xs sm:text-sm text-gray-500 dark:text-gray-400 mt-1">
                    Desconto aplicado: {formatarDinheiro(valorDesconto)}
                  </p>
                )}
              </div>
            </div>

            {/* Total */}
            <div className="border-t border-gray-200 dark:border-gray-600 pt-4 mb-4 sm:mb-6">
              <div className="flex justify-between items-center">
                <span className="text-base sm:text-lg font-medium text-gray-900 dark:text-white">Total</span>
                <span className="text-xl sm:text-2xl font-bold text-gray-900 dark:text-white">
                  {formatarDinheiro(valorTotal)}
                </span>
              </div>
            </div>

            {/* Formas de Pagamento */}
            <div className="space-y-3">
              <button
                onClick={() => setFormaPagamento("pix")}
                className={`w-full p-3 sm:p-4 rounded-lg border-2 transition-colors ${
                  formaPagamento === "pix"
                    ? "border-blue-500 bg-blue-50 dark:bg-blue-900/20 dark:border-blue-400"
                    : "border-gray-200 dark:border-gray-600 hover:border-blue-200 dark:hover:border-blue-400"
                }`}
              >
                <div className="flex items-center">
                  <QrCode className="w-5 h-5 sm:w-6 sm:h-6 text-blue-500 dark:text-blue-400" />
                  <span className="ml-3 font-medium text-sm sm:text-base text-gray-900 dark:text-white">PIX</span>
                </div>
              </button>

              <button
                onClick={() => setFormaPagamento("cartao")}
                className={`w-full p-3 sm:p-4 rounded-lg border-2 transition-colors ${
                  formaPagamento === "cartao"
                    ? "border-blue-500 bg-blue-50 dark:bg-blue-900/20 dark:border-blue-400"
                    : "border-gray-200 dark:border-gray-600 hover:border-blue-200 dark:hover:border-blue-400"
                }`}
              >
                <div className="flex items-center">
                  <CreditCard className="w-5 h-5 sm:w-6 sm:h-6 text-blue-500 dark:text-blue-400" />
                  <span className="ml-3 font-medium text-sm sm:text-base text-gray-900 dark:text-white">Cartão</span>
                </div>
              </button>

              <button
                onClick={() => setFormaPagamento("dinheiro")}
                className={`w-full p-3 sm:p-4 rounded-lg border-2 transition-colors ${
                  formaPagamento === "dinheiro"
                    ? "border-blue-500 bg-blue-50 dark:bg-blue-900/20 dark:border-blue-400"
                    : "border-gray-200 dark:border-gray-600 hover:border-blue-200 dark:hover:border-blue-400"
                }`}
              >
                <div className="flex items-center">
                  <Wallet className="w-5 h-5 sm:w-6 sm:h-6 text-blue-500 dark:text-blue-400" />
                  <span className="ml-3 font-medium text-sm sm:text-base text-gray-900 dark:text-white">Dinheiro</span>
                </div>
              </button>
            </div>
          </div>

          <div className="bg-gray-50 dark:bg-gray-700 px-4 sm:px-6 py-3 flex flex-col-reverse sm:flex-row justify-end gap-2 sm:gap-3 border-t border-gray-200 dark:border-gray-600">
            <Button
              variant="ghost"
              onClick={onClose}
              fullWidth
              className="sm:w-auto"
            >
              Cancelar
            </Button>
            <Button
              variant="primary"
              onClick={handlePagamento}
              isLoading={loading}
              disabled={!formaPagamento}
              icon={<Receipt className="w-4 h-4" />}
              fullWidth
              className="sm:w-auto"
            >
              Finalizar Pagamento
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PagamentoModal;
