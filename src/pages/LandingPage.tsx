import React from 'react';
import { Link } from 'react-router-dom';
import { 
  ChefHat, Coffee, BarChart3, ShoppingCart, Users, 
  Clock, Star, CheckCircle, ArrowRight, Menu, X,
  Utensils, CreditCard, Package, Globe, FileText,
  TrendingUp, Shield, Headphones
} from 'lucide-react';
import Button from '../components/ui/Button';

const LandingPage: React.FC = () => {
  const [mobileMenuOpen, setMobileMenuOpen] = React.useState(false);

  const features = [
    {
      icon: <Coffee className="w-8 h-8" />,
      title: "Controle de Mesas e Comandas",
      description: "Gerencie mesas, comandas e pedidos em tempo real com interface intuitiva"
    },
    {
      icon: <CreditCard className="w-8 h-8" />,
      title: "PDV Integrado",
      description: "Sistema de ponto de venda completo com múltiplas formas de pagamento"
    },
    {
      icon: <Package className="w-8 h-8" />,
      title: "Estoque com Controle de CMV",
      description: "Controle completo de estoque e análise de custo da mercadoria vendida"
    },
    {
      icon: <Globe className="w-8 h-8" />,
      title: "Editor de Cardápio Online",
      description: "Crie e edite seu cardápio digital com QR Code para os clientes"
    },
    {
      icon: <Utensils className="w-8 h-8" />,
      title: "Cardápio Público para Clientes",
      description: "Cardápio online acessível via QR Code nas mesas"
    },
    {
      icon: <ShoppingCart className="w-8 h-8" />,
      title: "Pedidos iFood Integrados",
      description: "Gerencie pedidos de delivery diretamente no sistema"
    },
    {
      icon: <BarChart3 className="w-8 h-8" />,
      title: "Relatórios em Tempo Real",
      description: "Dashboards e relatórios detalhados de vendas e performance"
    },
    {
      icon: <Users className="w-8 h-8" />,
      title: "Login por Tipo de Funcionário",
      description: "Acesso personalizado para garçom, caixa, estoque e cozinha"
    },
    {
      icon: <FileText className="w-8 h-8" />,
      title: "Central de Ajuda Integrada",
      description: "Tutoriais e suporte técnico disponível 24/7"
    }
  ];

  const metrics = [
    {
      number: "500+",
      label: "Restaurantes ativos",
      icon: <Utensils className="w-6 h-6" />
    },
    {
      number: "98%",
      label: "Satisfação dos clientes",
      icon: <Star className="w-6 h-6" />
    },
    {
      number: "24/7",
      label: "Suporte especializado",
      icon: <Headphones className="w-6 h-6" />
    }
  ];

  const scrollToSection = (sectionId: string) => {
    const element = document.getElementById(sectionId);
    if (element) {
      element.scrollIntoView({ behavior: 'smooth' });
    }
    setMobileMenuOpen(false);
  };

  return (
    <div className="min-h-screen bg-white">
      {/* Header */}
      <header className="fixed top-0 left-0 right-0 z-50 bg-white/95 backdrop-blur-sm shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center space-x-3">
              <div className="p-2 bg-gradient-to-br from-red-600 to-red-700 rounded-lg">
                <ChefHat className="w-6 h-6 text-white" />
              </div>
              <span className="text-xl font-bold text-gray-900">ChefComanda</span>
            </div>

            {/* Desktop Navigation */}
            <nav className="hidden md:flex items-center space-x-8">
              <button
                onClick={() => scrollToSection('funcionalidades')}
                className="text-gray-700 hover:text-red-600 transition-colors"
              >
                Funcionalidades
              </button>
              <button
                onClick={() => scrollToSection('planos')}
                className="text-gray-700 hover:text-red-600 transition-colors"
              >
                Planos
              </button>
              <button
                onClick={() => scrollToSection('contato')}
                className="text-gray-700 hover:text-red-600 transition-colors"
              >
                Contato
              </button>
            </nav>

            <div className="hidden md:flex items-center space-x-4">
              <Link to="/login">
                <Button variant="ghost" className="text-gray-700 hover:text-red-600">
                  Entrar
                </Button>
              </Link>
              <Link to="/signup">
                <Button variant="primary">
                  Criar Conta
                </Button>
              </Link>
            </div>

            {/* Mobile menu button */}
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="md:hidden p-2 text-gray-700"
            >
              {mobileMenuOpen ? <X size={24} /> : <Menu size={24} />}
            </button>
          </div>

          {/* Mobile Navigation */}
          {mobileMenuOpen && (
            <div className="md:hidden bg-white border-t border-gray-200 py-4">
              <div className="flex flex-col space-y-4">
                <button
                  onClick={() => scrollToSection('funcionalidades')}
                  className="text-left text-gray-700 hover:text-red-600 transition-colors"
                >
                  Funcionalidades
                </button>
                <button
                  onClick={() => scrollToSection('planos')}
                  className="text-left text-gray-700 hover:text-red-600 transition-colors"
                >
                  Planos
                </button>
                <button
                  onClick={() => scrollToSection('contato')}
                  className="text-left text-gray-700 hover:text-red-600 transition-colors"
                >
                  Contato
                </button>
                <div className="flex flex-col space-y-2 pt-4 border-t border-gray-200">
                  <Link to="/login">
                    <Button variant="ghost" fullWidth>
                      Entrar
                    </Button>
                  </Link>
                  <Link to="/signup">
                    <Button variant="primary" fullWidth>
                      Criar Conta
                    </Button>
                  </Link>
                </div>
              </div>
            </div>
          )}
        </div>
      </header>

      {/* Hero Section */}
      <section className="relative min-h-screen flex items-center justify-center overflow-hidden">
        <div 
          className="absolute inset-0 bg-cover bg-center bg-no-repeat"
          style={{
            backgroundImage: 'url(https://images.pexels.com/photos/958545/pexels-photo-958545.jpeg)',
          }}
        >
          <div className="absolute inset-0 bg-gradient-to-r from-red-900/80 via-red-800/70 to-orange-600/60"></div>
        </div>
        
        <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <div className="max-w-4xl mx-auto">
            <h1 className="text-5xl md:text-7xl font-bold text-white mb-6 leading-tight">
              Chef<span className="text-yellow-400">Comanda</span>
            </h1>
            <h2 className="text-2xl md:text-3xl font-semibold text-orange-100 mb-6">
              Sistema Profissional de Gerenciamento
            </h2>
            <p className="text-xl md:text-2xl text-orange-50 mb-12 leading-relaxed">
              Para restaurantes, bares e lanchonetes. Controle completo de comandas, 
              estoque, vendas e relatórios em tempo real.
            </p>
            
            <div className="flex flex-col sm:flex-row gap-6 justify-center">
              <Link to="/signup">
                <Button 
                  variant="primary" 
                  size="lg"
                  className="bg-gradient-to-r from-yellow-500 to-orange-500 hover:from-yellow-600 hover:to-orange-600 text-white font-semibold px-8 py-4 text-lg shadow-xl transform hover:scale-105 transition-all duration-200"
                  icon={<ArrowRight size={24} />}
                >
                  Começar Agora
                </Button>
              </Link>
              <Link to="/login">
                <Button 
                  variant="ghost" 
                  size="lg"
                  className="bg-white/20 backdrop-blur-sm text-white border-2 border-white/30 hover:bg-white/30 font-semibold px-8 py-4 text-lg"
                >
                  Já Tenho Conta
                </Button>
              </Link>
            </div>
          </div>
        </div>

        {/* Scroll indicator */}
        <div className="absolute bottom-8 left-1/2 transform -translate-x-1/2 animate-bounce">
          <div className="w-6 h-10 border-2 border-white/50 rounded-full flex justify-center">
            <div className="w-1 h-3 bg-white/70 rounded-full mt-2 animate-pulse"></div>
          </div>
        </div>
      </section>

      {/* Metrics Section */}
      <section className="py-16 bg-gradient-to-r from-red-50 to-orange-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {metrics.map((metric, index) => (
              <div key={index} className="text-center">
                <div className="inline-flex items-center justify-center w-16 h-16 bg-gradient-to-br from-red-600 to-red-700 rounded-full mb-4">
                  <div className="text-white">
                    {metric.icon}
                  </div>
                </div>
                <div className="text-4xl font-bold text-red-700 mb-2">{metric.number}</div>
                <div className="text-gray-600 font-medium">{metric.label}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section id="funcionalidades" className="py-20 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-bold text-gray-900 mb-4">
              Funcionalidades do ChefComanda
            </h2>
            <p className="text-xl text-gray-600 max-w-3xl mx-auto">
              Tudo que você precisa para gerenciar seu estabelecimento de forma profissional e eficiente
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {features.map((feature, index) => (
              <div 
                key={index} 
                className="bg-white p-6 rounded-xl shadow-lg border border-gray-100 hover:shadow-xl transition-all duration-300 hover:transform hover:scale-105"
              >
                <div className="inline-flex items-center justify-center w-12 h-12 bg-gradient-to-br from-red-600 to-red-700 rounded-lg mb-4">
                  <div className="text-white">
                    {feature.icon}
                  </div>
                </div>
                <h3 className="text-xl font-semibold text-gray-900 mb-3">
                  {feature.title}
                </h3>
                <p className="text-gray-600 leading-relaxed">
                  {feature.description}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Plans Section */}
      <section id="planos" className="py-20 bg-gradient-to-br from-red-50 via-orange-50 to-yellow-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-bold text-gray-900 mb-4">
              Planos ChefComanda
            </h2>
            <p className="text-xl text-gray-600">
              Escolha o plano ideal para o seu negócio
            </p>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 max-w-4xl mx-auto">
            {/* Monthly Plan */}
            <div className="bg-white rounded-2xl shadow-xl overflow-hidden border border-gray-200 hover:shadow-2xl transition-all duration-300">
              <div className="bg-gradient-to-r from-red-600 to-red-700 px-8 py-6">
                <h3 className="text-2xl font-bold text-white">Plano Mensal</h3>
                <p className="text-red-100 mt-2">Flexibilidade total</p>
              </div>
              <div className="p-8">
                <div className="text-center mb-8">
                  <div className="text-5xl font-bold text-gray-900 mb-2">
                    R$ 120
                    <span className="text-lg font-normal text-gray-500">/mês</span>
                  </div>
                  <p className="text-gray-600">Faturamento mensal</p>
                </div>
                
                <ul className="space-y-4 mb-8">
                  <li className="flex items-center">
                    <CheckCircle className="w-5 h-5 text-green-500 mr-3" />
                    <span className="text-gray-700">Todas as funcionalidades</span>
                  </li>
                  <li className="flex items-center">
                    <CheckCircle className="w-5 h-5 text-green-500 mr-3" />
                    <span className="text-gray-700">Suporte técnico incluído</span>
                  </li>
                  <li className="flex items-center">
                    <CheckCircle className="w-5 h-5 text-green-500 mr-3" />
                    <span className="text-gray-700">Atualizações automáticas</span>
                  </li>
                  <li className="flex items-center">
                    <CheckCircle className="w-5 h-5 text-green-500 mr-3" />
                    <span className="text-gray-700">Backup automático</span>
                  </li>
                </ul>

                <Link to="/signup">
                  <Button 
                    variant="primary" 
                    fullWidth 
                    size="lg"
                    className="bg-gradient-to-r from-red-600 to-red-700 hover:from-red-700 hover:to-red-800"
                  >
                    Começar Agora
                  </Button>
                </Link>
              </div>
            </div>

            {/* Annual Plan */}
            <div className="bg-white rounded-2xl shadow-xl overflow-hidden border-2 border-yellow-400 hover:shadow-2xl transition-all duration-300 relative">
              <div className="absolute top-0 right-0 bg-yellow-400 text-yellow-900 px-4 py-2 rounded-bl-lg font-semibold text-sm">
                10% OFF
              </div>
              <div className="bg-gradient-to-r from-yellow-500 to-orange-500 px-8 py-6">
                <h3 className="text-2xl font-bold text-white">Plano Anual</h3>
                <p className="text-yellow-100 mt-2">Melhor custo-benefício</p>
              </div>
              <div className="p-8">
                <div className="text-center mb-8">
                  <div className="text-5xl font-bold text-gray-900 mb-2">
                    R$ 1.296
                    <span className="text-lg font-normal text-gray-500">/ano</span>
                  </div>
                  <p className="text-gray-600">Equivalente a R$ 108/mês</p>
                  <div className="inline-block bg-green-100 text-green-800 px-3 py-1 rounded-full text-sm font-medium mt-2">
                    Economia de R$ 144/ano
                  </div>
                </div>
                
                <ul className="space-y-4 mb-8">
                  <li className="flex items-center">
                    <CheckCircle className="w-5 h-5 text-green-500 mr-3" />
                    <span className="text-gray-700">Todas as funcionalidades</span>
                  </li>
                  <li className="flex items-center">
                    <CheckCircle className="w-5 h-5 text-green-500 mr-3" />
                    <span className="text-gray-700">Suporte prioritário</span>
                  </li>
                  <li className="flex items-center">
                    <CheckCircle className="w-5 h-5 text-green-500 mr-3" />
                    <span className="text-gray-700">Relatórios avançados</span>
                  </li>
                  <li className="flex items-center">
                    <CheckCircle className="w-5 h-5 text-green-500 mr-3" />
                    <span className="text-gray-700">Consultoria gratuita</span>
                  </li>
                </ul>

                <Link to="/signup">
                  <Button 
                    variant="primary" 
                    fullWidth 
                    size="lg"
                    className="bg-gradient-to-r from-yellow-500 to-orange-500 hover:from-yellow-600 hover:to-orange-600"
                  >
                    Começar Agora
                  </Button>
                </Link>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 bg-gradient-to-r from-red-600 via-red-700 to-red-800">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-4xl font-bold text-white mb-6">
            Pronto para revolucionar seu restaurante?
          </h2>
          <p className="text-xl text-red-100 mb-8 max-w-2xl mx-auto">
            Junte-se a centenas de estabelecimentos que já transformaram sua gestão com o ChefComanda
          </p>
          <Link to="/signup">
            <Button 
              variant="primary" 
              size="lg"
              className="bg-gradient-to-r from-yellow-500 to-orange-500 hover:from-yellow-600 hover:to-orange-600 text-white font-semibold px-12 py-4 text-xl shadow-xl transform hover:scale-105 transition-all duration-200"
              icon={<ArrowRight size={24} />}
            >
              Começar Gratuitamente
            </Button>
          </Link>
        </div>
      </section>

      {/* Footer */}
      <footer id="contato" className="bg-gray-900 text-white py-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
            <div className="md:col-span-2">
              <div className="flex items-center space-x-3 mb-6">
                <div className="p-2 bg-gradient-to-br from-red-600 to-red-700 rounded-lg">
                  <ChefHat className="w-6 h-6 text-white" />
                </div>
                <span className="text-xl font-bold">ChefComanda</span>
              </div>
              <p className="text-gray-400 mb-6 max-w-md">
                O sistema mais completo para gestão de restaurantes, bares e lanchonetes. 
                Simplifique suas operações e aumente seus lucros.
              </p>
              <div className="flex items-center space-x-2 text-gray-400">
                <Shield className="w-5 h-5" />
                <span>Dados seguros e protegidos</span>
              </div>
            </div>

            <div>
              <h3 className="text-lg font-semibold mb-4">Links Úteis</h3>
              <ul className="space-y-3">
                <li>
                  <button
                    onClick={() => scrollToSection('funcionalidades')}
                    className="text-gray-400 hover:text-white transition-colors"
                  >
                    Funcionalidades
                  </button>
                </li>
                <li>
                  <button
                    onClick={() => scrollToSection('planos')}
                    className="text-gray-400 hover:text-white transition-colors"
                  >
                    Planos
                  </button>
                </li>
                <li>
                  <a href="#" className="text-gray-400 hover:text-white transition-colors">
                    Termos de Uso
                  </a>
                </li>
                <li>
                  <a href="#" className="text-gray-400 hover:text-white transition-colors">
                    Política de Privacidade
                  </a>
                </li>
              </ul>
            </div>

            <div>
              <h3 className="text-lg font-semibold mb-4">Contato</h3>
              <ul className="space-y-3">
                <li className="text-gray-400">
                  <strong className="text-white">Email:</strong><br />
                  chefcomandaoficial@gmail.com
                </li>
                <li className="text-gray-400">
                  <strong className="text-white">Telefone:</strong><br />
                  (62) 98276-0471
                </li>
                <li className="text-gray-400">
                  <strong className="text-white">Instagram:</strong><br />
                  <a 
                    href="https://www.instagram.com/chef_comanda_/" 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="text-purple-400 hover:text-purple-300 transition-colors"
                  >
                    @chef_comanda_
                  </a>
                </li>
                <li className="text-gray-400">
                  <strong className="text-white">Horário:</strong><br />
                  Segunda a Sexta, 8h às 18h<br />
                  <span className="text-green-400">WhatsApp 24/7</span>
                </li>
              </ul>
            </div>
          </div>

          <div className="border-t border-gray-800 mt-12 pt-8 text-center">
            <p className="text-gray-400">
              © 2025 ChefComanda - Todos os direitos reservados
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default LandingPage;