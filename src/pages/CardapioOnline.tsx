import React, { useState, useEffect } from 'react';
import { QrCode, Download, Link as LinkIcon } from 'lucide-react';
import QRCode from 'qrcode';
import Button from '../components/ui/Button';
import toast from 'react-hot-toast';
import { useRestaurante } from '../contexts/RestauranteContext';

const CardapioOnline: React.FC = () => {
  const [qrCodeUrl, setQrCodeUrl] = useState<string>('');
  const [cardapioUrl, setCardapioUrl] = useState<string>('');
  const [loading, setLoading] = useState(false);
  const { restaurante } = useRestaurante();

  useEffect(() => {
    if (restaurante?.id) {
      generateQRCode();
    }
  }, [restaurante?.id]);

  const generateQRCode = async () => {
    if (!restaurante?.id) {
      toast.error('ID do restaurante não encontrado');
      return;
    }

    try {
      const url = `${window.location.origin}/cardapio/${restaurante.id}`;
      setCardapioUrl(url);
      const qrCode = await QRCode.toDataURL(url);
      setQrCodeUrl(qrCode);
    } catch (error) {
      console.error('Error generating QR code:', error);
      toast.error('Erro ao gerar QR Code');
    }
  };

  const handleDownloadQR = () => {
    const link = document.createElement('a');
    link.href = qrCodeUrl;
    link.download = 'cardapio-qrcode.png';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    toast.success('QR Code baixado com sucesso!');
  };

  const handleCopyLink = () => {
    navigator.clipboard.writeText(cardapioUrl);
    toast.success('Link copiado para a área de transferência!');
  };

  return (
    <div className="w-full px-4 min-h-screen bg-gray-50 dark:bg-gray-900 transition-colors duration-300 py-8">
      <div className="bg-white/90 dark:bg-gray-800/90 backdrop-blur-sm rounded-3xl shadow-xl border border-white/20 dark:border-gray-700/50 overflow-hidden">
        <div className="p-6">
          <div className="flex items-center mb-6">
            <div className="p-3 bg-blue-100 dark:bg-blue-900/50 text-blue-600 dark:text-blue-400 rounded-2xl mr-4 shadow-md">
              <QrCode size={24} />
            </div>
            <div>
              <h2 className="text-xl font-bold text-gray-900 dark:text-white">QR Code para Cardápio Online</h2>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                Compartilhe seu cardápio digital com seus clientes
              </p>
            </div>
          </div>

          <div className="flex flex-col md:flex-row items-center gap-8">
            {qrCodeUrl && (
              <div className="w-64 h-64 p-4 bg-white dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-3xl shadow-xl">
                <img
                  src={qrCodeUrl}
                  alt="QR Code do Cardápio"
                  className="w-full h-full"
                />
              </div>
            )}

            <div className="flex-1 space-y-6">
              <div>
                <h3 className="text-sm font-bold text-gray-700 dark:text-gray-300 mb-3">
                  Link do Cardápio
                </h3>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={cardapioUrl}
                    readOnly
                    className="flex-1 bg-gray-50 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 text-gray-900 dark:text-white text-sm rounded-2xl focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 focus:border-blue-500 dark:focus:border-blue-400 block w-full p-3 transition-all duration-200"
                  />
                  <Button
                    variant="primary"
                    onClick={handleCopyLink}
                    icon={<LinkIcon size={18} />}
                    className="rounded-2xl"
                  >
                    Copiar
                  </Button>
                </div>
              </div>

              <div>
                <h3 className="text-sm font-bold text-gray-700 dark:text-gray-300 mb-3">
                  Instruções
                </h3>
                <ul className="space-y-2 text-sm text-gray-600 dark:text-gray-400">
                  <li>1. Baixe o QR Code em alta qualidade</li>
                  <li>2. Imprima e coloque nas mesas do seu estabelecimento</li>
                  <li>3. Os clientes podem escanear e fazer pedidos diretamente</li>
                </ul>
              </div>

              <Button
                variant="primary"
                onClick={handleDownloadQR}
                icon={<Download size={18} />}
                fullWidth
                className="rounded-2xl py-4 font-semibold"
              >
                Baixar QR Code
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CardapioOnline;