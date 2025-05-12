import React, { useState, useEffect } from 'react';
import { QrCode, Upload, Download, Eye, EyeOff, Trash2, AlertTriangle } from 'lucide-react';
import QRCode from 'qrcode';
import { Document, Page, pdfjs } from 'react-pdf';
import Button from '../components/ui/Button';
import { useRestaurante } from '../contexts/RestauranteContext';
import { formatarDinheiro } from '../utils/formatters';
import toast from 'react-hot-toast';

pdfjs.GlobalWorkerOptions.workerSrc = `//unpkg.com/pdfjs-dist@${pdfjs.version}/build/pdf.worker.min.js`;

interface CardapioConfig {
  isPublic: boolean;
  usePdf: boolean;
  pdfUrl?: string;
}

const CardapioOnline: React.FC = () => {
  const { produtos, categorias } = useRestaurante();
  const [config, setConfig] = useState<CardapioConfig>({
    isPublic: true,
    usePdf: false
  });
  const [qrCodeUrl, setQrCodeUrl] = useState<string>('');
  const [pdfFile, setPdfFile] = useState<File | null>(null);
  const [numPages, setNumPages] = useState<number>(0);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    generateQRCode();
  }, []);

  const generateQRCode = async () => {
    try {
      const url = `${window.location.origin}/cardapio/1`; // Replace with actual restaurant ID
      const qrCode = await QRCode.toDataURL(url);
      setQrCodeUrl(qrCode);
    } catch (error) {
      console.error('Error generating QR code:', error);
      toast.error('Erro ao gerar QR Code');
    }
  };

  const handlePdfUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files?.length) return;

    const file = e.target.files[0];
    if (file.size > 5 * 1024 * 1024) { // 5MB limit
      toast.error('O arquivo PDF deve ter no máximo 5MB');
      return;
    }

    setLoading(true);
    try {
      // Here you would normally upload to Supabase storage
      setPdfFile(file);
      setConfig(prev => ({ ...prev, usePdf: true }));
      toast.success('PDF carregado com sucesso!');
    } catch (error) {
      console.error('Error uploading PDF:', error);
      toast.error('Erro ao fazer upload do PDF');
    } finally {
      setLoading(false);
    }
  };

  const handleDownloadQR = () => {
    const link = document.createElement('a');
    link.href = qrCodeUrl;
    link.download = 'cardapio-qrcode.png';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const onDocumentLoadSuccess = ({ numPages }: { numPages: number }) => {
    setNumPages(numPages);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Cardápio Online</h1>
          <p className="text-gray-500 mt-1">
            Gerencie seu cardápio digital e QR Code
          </p>
        </div>
        <div className="mt-4 md:mt-0 flex space-x-3">
          <Button
            variant="ghost"
            icon={<Download size={18} />}
            onClick={handleDownloadQR}
          >
            Baixar QR Code
          </Button>
          <Button
            variant={config.isPublic ? 'primary' : 'warning'}
            icon={config.isPublic ? <Eye size={18} /> : <EyeOff size={18} />}
            onClick={() => setConfig(prev => ({ ...prev, isPublic: !prev.isPublic }))}
          >
            {config.isPublic ? 'Cardápio Público' : 'Cardápio Privado'}
          </Button>
        </div>
      </div>

      {/* QR Code Preview */}
      <div className="bg-white rounded-lg shadow-sm p-6">
        <div className="flex items-center mb-6">
          <div className="p-2 bg-blue-100 text-blue-600 rounded-lg mr-4">
            <QrCode size={24} />
          </div>
          <div>
            <h2 className="text-lg font-medium">QR Code do Cardápio</h2>
            <p className="text-sm text-gray-500">
              Escaneie para acessar o cardápio online
            </p>
          </div>
        </div>

        <div className="flex flex-col md:flex-row items-center gap-6">
          {qrCodeUrl && (
            <img
              src={qrCodeUrl}
              alt="QR Code"
              className="w-48 h-48 border border-gray-200 rounded-lg"
            />
          )}
          <div className="flex-1 space-y-4">
            <p className="text-sm text-gray-600">
              Este QR Code direciona seus clientes para seu cardápio online.
              Você pode imprimir e colocar nas mesas do seu estabelecimento.
            </p>
            <div className="flex items-center space-x-2 text-sm text-gray-500">
              <AlertTriangle size={16} className="text-yellow-500" />
              <span>
                Certifique-se de que o cardápio esteja público antes de
                disponibilizar o QR Code.
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* PDF Upload */}
      <div className="bg-white rounded-lg shadow-sm p-6">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center">
            <div className="p-2 bg-blue-100 text-blue-600 rounded-lg mr-4">
              <Upload size={24} />
            </div>
            <div>
              <h2 className="text-lg font-medium">Cardápio em PDF</h2>
              <p className="text-sm text-gray-500">
                Faça upload do seu cardápio em PDF
              </p>
            </div>
          </div>
          <div className="flex items-center space-x-3">
            <Button
              variant={config.usePdf ? 'primary' : 'ghost'}
              onClick={() => setConfig(prev => ({ ...prev, usePdf: !prev.usePdf }))}
            >
              {config.usePdf ? 'Usar PDF' : 'Usar Cardápio Dinâmico'}
            </Button>
            {pdfFile && (
              <Button
                variant="ghost"
                icon={<Trash2 size={18} />}
                onClick={() => setPdfFile(null)}
                className="text-red-600"
              >
                Remover PDF
              </Button>
            )}
          </div>
        </div>

        {!pdfFile ? (
          <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center">
            <input
              type="file"
              id="pdf-upload"
              accept=".pdf"
              className="hidden"
              onChange={handlePdfUpload}
            />
            <label
              htmlFor="pdf-upload"
              className="cursor-pointer flex flex-col items-center"
            >
              <Upload size={48} className="text-gray-400 mb-4" />
              <p className="text-sm text-gray-600 mb-2">
                Clique para fazer upload do seu cardápio em PDF
              </p>
              <p className="text-xs text-gray-500">
                PDF até 5MB
              </p>
            </label>
          </div>
        ) : (
          <div className="border rounded-lg overflow-hidden">
            <Document
              file={URL.createObjectURL(pdfFile)}
              onLoadSuccess={onDocumentLoadSuccess}
              className="mx-auto"
            >
              <Page pageNumber={1} width={600} />
            </Document>
            {numPages > 1 && (
              <div className="text-center text-sm text-gray-500 py-2 bg-gray-50">
                +{numPages - 1} página{numPages - 1 > 1 ? 's' : ''}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Dynamic Menu Preview */}
      {!config.usePdf && (
        <div className="bg-white rounded-lg shadow-sm p-6">
          <div className="flex items-center mb-6">
            <div className="p-2 bg-blue-100 text-blue-600 rounded-lg mr-4">
              <Eye size={24} />
            </div>
            <div>
              <h2 className="text-lg font-medium">Visualização do Cardápio</h2>
              <p className="text-sm text-gray-500">
                Prévia do cardápio dinâmico
              </p>
            </div>
          </div>

          <div className="space-y-8">
            {categorias.map((categoria) => {
              const produtosDaCategoria = produtos.filter(
                p => p.categoria === categoria && p.disponivel
              );

              if (produtosDaCategoria.length === 0) return null;

              return (
                <div key={categoria}>
                  <h3 className="text-xl font-medium mb-4">{categoria}</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {produtosDaCategoria.map((produto) => (
                      <div
                        key={produto.id}
                        className="flex justify-between p-4 border rounded-lg"
                      >
                        <div>
                          <h4 className="font-medium">{produto.nome}</h4>
                          <p className="text-sm text-gray-500 mt-1">
                            {produto.descricao}
                          </p>
                        </div>
                        <div className="text-right">
                          <p className="font-medium text-blue-600">
                            {formatarDinheiro(produto.preco)}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};

export default CardapioOnline;