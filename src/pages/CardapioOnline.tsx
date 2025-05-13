import React, { useState, useEffect } from 'react';
import { QrCode, Download, Link as LinkIcon } from 'lucide-react';
import QRCode from 'qrcode';
import Button from '../components/ui/Button';
import toast from 'react-hot-toast';

const CardapioOnline: React.FC = () => {
  const [qrCodeUrl, setQrCodeUrl] = useState<string>('');
  const [cardapioUrl, setCardapioUrl] = useState<string>('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    generateQRCode();
  }, []);

  const generateQRCode = async () => {
    try {
      const url = `${window.location.origin}/cardapio/1`; // Replace with actual restaurant ID
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
    <div className="max-w-4xl mx-auto px-4">
      <div className="bg-white rounded-lg shadow-sm overflow-hidden">
        <div className="p-6">
          <div className="flex items-center mb-6">
            <div className="p-2 bg-blue-100 text-blue-600 rounded-lg mr-4">
              <QrCode size={24} />
            </div>
            <div>
              <h2 className="text-lg font-medium">QR Code para Cardápio Online</h2>
              <p className="text-sm text-gray-500">
                Compartilhe seu cardápio digital com seus clientes
              </p>
            </div>
          </div>

          <div className="flex flex-col md:flex-row items-center gap-8">
            {qrCodeUrl && (
              <div className="w-64 h-64 p-4 bg-white border border-gray-200 rounded-lg shadow-sm">
                <img
                  src={qrCodeUrl}
                  alt="QR Code do Cardápio"
                  className="w-full h-full"
                />
              </div>
            )}

            <div className="flex-1 space-y-6">
              <div>
                <h3 className="text-sm font-medium text-gray-700 mb-2">
                  Link do Cardápio
                </h3>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={cardapioUrl}
                    readOnly
                    className="flex-1 bg-gray-50 border border-gray-300 text-gray-900 text-sm rounded-lg focus:ring-blue-500 focus:border-blue-500 block w-full p-2.5"
                  />
                  <Button
                    variant="primary"
                    onClick={handleCopyLink}
                    icon={<LinkIcon size={18} />}
                  >
                    Copiar
                  </Button>
                </div>
              </div>

              <div>
                <h3 className="text-sm font-medium text-gray-700 mb-2">
                  Instruções
                </h3>
                <ul className="space-y-2 text-sm text-gray-600">
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