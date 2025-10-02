import React, { useState } from 'react';
import { 
  Headphones, Mail, MessageCircle, Instagram, Phone, 
  Send, User, FileText, Clock, CheckCircle, ExternalLink
} from 'lucide-react';
import Button from '../components/ui/Button';
import toast from 'react-hot-toast';

interface TicketData {
  nome: string;
  email: string;
  assunto: string;
  mensagem: string;
  prioridade: 'baixa' | 'media' | 'alta';
}

const Suporte: React.FC = () => {
  const [activeTab, setActiveTab] = useState('contato');
  const [ticketData, setTicketData] = useState<TicketData>({
    nome: '',
    email: '',
    assunto: '',
    mensagem: '',
    prioridade: 'media'
  });
  const [loading, setLoading] = useState(false);

  const handleSubmitTicket = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      // Simular envio do ticket
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      toast.success('Ticket de suporte enviado com sucesso! Entraremos em contato em breve.');
      
      // Reset form
      setTicketData({
        nome: '',
        email: '',
        assunto: '',
        mensagem: '',
        prioridade: 'media'
      });
    } catch (error) {
      toast.error('Erro ao enviar ticket de suporte');
    } finally {
      setLoading(false);
    }
  };

  const openWhatsApp = () => {
    const message = encodeURIComponent('Olá! Gostaria de falar com um vendedor sobre o ChefComanda.');
    window.open(`https://wa.me/5562982760471?text=${message}`, '_blank');
  };

  const openInstagram = () => {
    window.open('https://www.instagram.com/chef_comanda_/', '_blank');
  };

  const sendEmail = () => {
    window.open('mailto:chefcomandaoficial@gmail.com?subject=Suporte ChefComanda', '_blank');
  };

  return (
    <div className="w-full px-4 sm:px-6 lg:px-8 py-8 min-h-screen bg-gray-50 dark:bg-gray-900 transition-colors duration-300">
      <div className="text-center mb-8">
        <div className="flex justify-center mb-4">
          <div className="p-4 bg-gradient-to-br from-blue-500 to-blue-600 rounded-3xl shadow-2xl">
            <Headphones className="w-8 h-8 text-white" />
          </div>
        </div>
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
          Central de Suporte
        </h1>
        <p className="text-xl text-gray-600 dark:text-gray-400">
          Estamos aqui para ajudar você a aproveitar ao máximo o ChefComanda
        </p>
      </div>

      {/* Navigation Tabs */}
      <div className="bg-white/90 dark:bg-gray-800/90 backdrop-blur-sm rounded-2xl shadow-lg border border-white/20 dark:border-gray-700/50 mb-8">
        <div className="border-b border-gray-200/50 dark:border-gray-700/50">
          <nav className="flex space-x-8 px-6">
            <button
              onClick={() => setActiveTab('contato')}
              className={`py-4 px-1 border-b-2 font-medium text-sm transition-colors ${
                activeTab === 'contato'
                  ? 'border-blue-500 text-blue-600 dark:text-blue-400 font-bold'
                  : 'border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300 font-semibold'
              }`}
            >
              Fale Conosco
            </button>
            <button
              onClick={() => setActiveTab('faq')}
              className={`py-4 px-1 border-b-2 font-medium text-sm transition-colors ${
                activeTab === 'faq'
                  ? 'border-blue-500 text-blue-600 dark:text-blue-400 font-bold'
                  : 'border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300 font-semibold'
              }`}
            >
              FAQ
            </button>
          </nav>
        </div>

        <div className="p-6">
          {/* Fale Conosco */}
          {activeTab === 'contato' && (
            <div className="space-y-8">
              <div className="text-center mb-8">
                <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">
                  Entre em Contato Conosco
                </h2>
                <p className="text-gray-600 dark:text-gray-400">
                  Escolha a melhor forma de entrar em contato com nossa equipe
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {/* WhatsApp - Vendas */}
                <div className="bg-gradient-to-br from-green-50 to-green-100 dark:from-green-900/20 dark:to-green-800/20 rounded-xl p-6 border border-green-200 dark:border-green-800">
                  <div className="flex items-center mb-4">
                    <div className="p-3 bg-green-500 rounded-full">
                      <MessageCircle className="w-6 h-6 text-white" />
                    </div>
                    <div className="ml-4">
                      <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                        Fale com Vendedor
                      </h3>
                      <p className="text-sm text-green-700 dark:text-green-300">
                        WhatsApp
                      </p>
                    </div>
                  </div>
                  <p className="text-gray-600 dark:text-gray-400 mb-4">
                    Entre em contato com um de nossos vendedores para tirar dúvidas sobre planos e funcionalidades.
                  </p>
                  <div className="mb-4">
                    <p className="text-sm font-medium text-gray-700 dark:text-gray-300">
                      (62) 98276-0471
                    </p>
                  </div>
                  <Button
                    variant="success"
                    fullWidth
                    onClick={openWhatsApp}
                    icon={<MessageCircle size={18} />}
                  >
                    Abrir WhatsApp
                  </Button>
                </div>

                {/* Email - Suporte */}
                <div className="bg-gradient-to-br from-blue-50 to-blue-100 dark:from-blue-900/20 dark:to-blue-800/20 rounded-xl p-6 border border-blue-200 dark:border-blue-800">
                  <div className="flex items-center mb-4">
                    <div className="p-3 bg-blue-500 rounded-full">
                      <Mail className="w-6 h-6 text-white" />
                    </div>
                    <div className="ml-4">
                      <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                        Suporte Técnico
                      </h3>
                      <p className="text-sm text-blue-700 dark:text-blue-300">
                        E-mail
                      </p>
                    </div>
                  </div>
                  <p className="text-gray-600 dark:text-gray-400 mb-4">
                    Envie suas dúvidas técnicas e problemas para nossa equipe especializada.
                  </p>
                  <div className="mb-4">
                    <p className="text-sm font-medium text-gray-700 dark:text-gray-300">
                      chefcomandaoficial@gmail.com
                    </p>
                  </div>
                  <Button
                    variant="primary"
                    fullWidth
                    onClick={sendEmail}
                    icon={<Mail size={18} />}
                  >
                    Enviar E-mail
                  </Button>
                </div>

                {/* Instagram - Redes Sociais */}
                <div className="bg-gradient-to-br from-purple-50 to-pink-100 dark:from-purple-900/20 dark:to-pink-800/20 rounded-xl p-6 border border-purple-200 dark:border-purple-800">
                  <div className="flex items-center mb-4">
                    <div className="p-3 bg-gradient-to-r from-purple-500 to-pink-500 rounded-full">
                      <Instagram className="w-6 h-6 text-white" />
                    </div>
                    <div className="ml-4">
                      <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                        Redes Sociais
                      </h3>
                      <p className="text-sm text-purple-700 dark:text-purple-300">
                        Instagram
                      </p>
                    </div>
                  </div>
                  <p className="text-gray-600 dark:text-gray-400 mb-4">
                    Siga-nos no Instagram para dicas, novidades e atualizações do sistema.
                  </p>
                  <div className="mb-4">
                    <p className="text-sm font-medium text-gray-700 dark:text-gray-300">
                      @chef_comanda_
                    </p>
                  </div>
                  <Button
                    variant="secondary"
                    fullWidth
                    onClick={openInstagram}
                    icon={<Instagram size={18} />}
                  >
                    Seguir no Instagram
                  </Button>
                </div>
              </div>

              {/* Horário de Atendimento */}
              <div className="bg-gradient-to-r from-gray-50 to-gray-100 dark:from-gray-800 dark:to-gray-700 rounded-xl p-6">
                <div className="flex items-center justify-center mb-4">
                  <Clock className="w-6 h-6 text-gray-600 dark:text-gray-400 mr-2" />
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                    Horário de Atendimento
                  </h3>
                </div>
                <div className="text-center">
                  <p className="text-gray-600 dark:text-gray-400 mb-2">
                    <strong>Segunda a Sexta:</strong> 8h às 18h
                  </p>
                  <p className="text-gray-600 dark:text-gray-400 mb-2">
                    <strong>Sábado:</strong> 8h às 14h
                  </p>
                  <p className="text-gray-600 dark:text-gray-400">
                    <strong>Domingo:</strong> Fechado
                  </p>
                  <div className="mt-4 inline-flex items-center px-3 py-1 rounded-full text-sm bg-green-100 dark:bg-green-900 text-green-800 dark:text-green-200">
                    <CheckCircle size={16} className="mr-1" />
                    Suporte por WhatsApp 24/7
                  </div>
                </div>
              </div>
            </div>
          )}


          {/* FAQ */}
          {activeTab === 'faq' && (
            <div className="max-w-4xl mx-auto">
              <div className="text-center mb-8">
                <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">
                  Perguntas Frequentes
                </h2>
                <p className="text-gray-600 dark:text-gray-400">
                  Encontre respostas rápidas para as dúvidas mais comuns
                </p>
              </div>

              <div className="space-y-4">
                <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-6">
                  <h3 className="font-semibold text-gray-900 dark:text-white mb-2">
                    Como faço para adicionar uma nova mesa?
                  </h3>
                  <p className="text-gray-600 dark:text-gray-400">
                    Acesse o menu "Mesas" e clique em "Nova Mesa". Preencha o número da mesa e a capacidade de pessoas.
                  </p>
                </div>

                <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-6">
                  <h3 className="font-semibold text-gray-900 dark:text-white mb-2">
                    Como criar uma comanda para uma mesa?
                  </h3>
                  <p className="text-gray-600 dark:text-gray-400">
                    Clique na mesa desejada e selecione "Ocupar Mesa". Em seguida, você pode adicionar itens à comanda.
                  </p>
                </div>

                <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-6">
                  <h3 className="font-semibold text-gray-900 dark:text-white mb-2">
                    Como finalizar o pagamento de uma mesa?
                  </h3>
                  <p className="text-gray-600 dark:text-gray-400">
                    Na mesa ocupada, clique em "Pagamento", escolha a forma de pagamento e confirme. A mesa será automaticamente liberada.
                  </p>
                </div>

                <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-6">
                  <h3 className="font-semibold text-gray-900 dark:text-white mb-2">
                    Como cadastrar novos produtos no cardápio?
                  </h3>
                  <p className="text-gray-600 dark:text-gray-400">
                    Vá em "Produtos", clique em "Novo Produto" e preencha as informações como nome, preço, categoria e descrição.
                  </p>
                </div>

                <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-6">
                  <h3 className="font-semibold text-gray-900 dark:text-white mb-2">
                    Como gerar o QR Code do cardápio online?
                  </h3>
                  <p className="text-gray-600 dark:text-gray-400">
                    Acesse "Cardápio Online" no menu principal. Lá você encontrará o QR Code pronto para download e impressão.
                  </p>
                </div>

                <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-6">
                  <h3 className="font-semibold text-gray-900 dark:text-white mb-2">
                    Como controlar o estoque de insumos?
                  </h3>
                  <p className="text-gray-600 dark:text-gray-400">
                    No menu "Estoque", você pode cadastrar insumos, definir quantidades mínimas e receber alertas automáticos quando o estoque estiver baixo.
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Informações Adicionais */}
      <div className="bg-gradient-to-r from-blue-600 to-blue-700 rounded-xl p-8 text-white text-center">
        <h2 className="text-2xl font-bold mb-4">
          Precisa de Ajuda Imediata?
        </h2>
        <p className="text-blue-100 mb-6 text-lg">
          Nossa equipe está sempre pronta para ajudar você a ter sucesso com o ChefComanda
        </p>
        <div className="flex flex-col sm:flex-row gap-4 justify-center">
          <Button
            variant="ghost"
            onClick={openWhatsApp}
            className="bg-white/20 hover:bg-white/30 text-white border-white/30"
            icon={<MessageCircle size={18} />}
          >
            WhatsApp: (62) 98276-0471
          </Button>
          <Button
            variant="ghost"
            onClick={sendEmail}
            className="bg-white/20 hover:bg-white/30 text-white border-white/30"
            icon={<Mail size={18} />}
          >
            chefcomandaoficial@gmail.com
          </Button>
        </div>
      </div>
    </div>
  );
};

export default Suporte;