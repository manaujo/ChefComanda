import React from 'react';
import { Link } from 'react-router-dom';
import { 
  ChefHat, Coffee, BarChart3, ShoppingCart, Users, 
  Clock, Star, CheckCircle, ArrowRight, Menu, X,
  Utensils, CreditCard, Package, Globe, FileText,
  TrendingUp, Shield, Headphones, Calendar, Award, Gift, Zap, Check, Calculator,
  QrCode, ClipboardList, MessageCircle, Smartphone
} from 'lucide-react';
import Button from '../components/ui/Button';
import { stripeProducts, formatPrice, getMonthlyEquivalent } from '../stripe-config';

const LandingPage: React.FC = () => {
  const [mobileMenuOpen, setMobileMenuOpen] = React.useState(false);

  const features = [
    {
      icon: <Coffee className="w-8 h-8" />,
      title: "Controle de Mesas e Comandas",
      description: "Gerencie mesas, comandas e pedidos em tempo real com interface intuitiva e controle completo de ocupação"
    },
    {
      icon: <CreditCard className="w-8 h-8" />,
      title: "PDV Integrado",
      description: "Sistema de ponto de venda completo com PIX, cartão, dinheiro e controle de caixa por operador"
    },
    {
      icon: <Package className="w-8 h-8" />,
      title: "Estoque com Controle de CMV",
      description: "Controle completo de estoque, alertas automáticos e análise detalhada de CMV para maximizar lucros"
    },
    {
      icon: <Globe className="w-8 h-8" />,
      title: "Editor de Cardápio Online",
      description: "Editor profissional de cardápio digital com upload de imagens e organização por categorias"
    },
    {
      icon: <Utensils className="w-8 h-8" />,
      title: "Cardápio Público para Clientes",
      description: "Cardápio online acessível via QR Code nas mesas com pedidos diretos via WhatsApp"
    },
    {
      icon: <ShoppingCart className="w-8 h-8" />,
      title: "Sistema de Pedidos Rápidos",
      description: "Gerencie pedidos de balcão, delivery e take-away com controle completo de status"
    },
    {
      icon: <BarChart3 className="w-8 h-8" />,
      title: "Relatórios em Tempo Real",
      description: "Dashboards executivos, relatórios de vendas, performance de funcionários e análise de rentabilidade"
    },
    {
      icon: <Users className="w-8 h-8" />,
      title: "Login por Tipo de Funcionário",
      description: "Sistema completo de funcionários com permissões específicas: garçom, caixa, estoque e cozinha"
    },
    {
      icon: <FileText className="w-8 h-8" />,
      title: "Central de Ajuda Integrada",
      description: "Tutoriais completos, suporte técnico especializado 24/7 via WhatsApp e documentação detalhada"
    },
    {
      icon: <Calculator className="w-8 h-8" />,
      title: "Análise Financeira Avançada",
      description: "Controle de custos, margem de lucro, ticket médio e análise de rentabilidade por produto"
    },
    {
      icon: <Clock className="w-8 h-8" />,
      title: "Gestão de Tempo Real",
      description: "Sincronização instantânea entre todos os dispositivos e funcionários do estabelecimento"
    },
    {
      icon: <Shield className="w-8 h-8" />,
      title: "Segurança e Backup",
      description: "Dados seguros na nuvem com backup automático e acesso controlado por usuário"
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
        <div className="w-full max-w-screen-2xl mx-auto px-4 sm:px-6 lg:px-8">
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
        
        <div className="relative z-10 w-full max-w-screen-2xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <div className="max-w-6xl mx-auto">
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
        <div className="w-full max-w-screen-2xl mx-auto px-4 sm:px-6 lg:px-8">
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
        <div className="w-full max-w-screen-2xl mx-auto px-4 sm:px-6 lg:px-8">
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
      <section id="planos" className="py-24 bg-gradient-to-br from-red-50 via-orange-50 to-yellow-50">
        <div className="w-full max-w-screen-2xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-5xl font-bold text-gray-900 mb-6">
              Planos ChefComanda
            </h2>
            <p className="text-2xl text-gray-600 mb-8">
              Escolha o plano ideal para transformar seu negócio
            </p>
            <div className="inline-flex items-center px-8 py-4 bg-gradient-to-r from-green-100 to-emerald-100 text-green-800 rounded-2xl text-lg font-bold shadow-lg">
              <Shield className="w-6 h-6 mr-3" />
              Todos os planos incluem 100% das funcionalidades
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 max-w-6xl mx-auto">
            {stripeProducts.map((product, index) => (
              <div 
                key={product.id}
                className={`bg-white rounded-3xl shadow-2xl overflow-hidden border hover:shadow-3xl transition-all duration-300 relative transform hover:scale-105 ${
                  product.popular 
                    ? 'border-2 border-yellow-400 ring-4 ring-yellow-100 scale-110' 
                    : 'border border-gray-200'
                }`}
              >
                {product.popular && (
                  <div className="absolute -top-4 left-1/2 transform -translate-x-1/2 bg-gradient-to-r from-yellow-400 to-orange-500 text-white px-8 py-3 rounded-2xl font-bold text-sm shadow-xl z-10">
                    <div className="flex items-center">
                      <Star className="w-5 h-5 mr-2" />
                      MAIS ESCOLHIDO
                    </div>
                  </div>
                )}
                
                <div className={`px-8 py-8 ${
                  product.id === 'teste' ? 'bg-gradient-to-r from-green-600 to-green-700' :
                  product.id === 'mensal' ? 'bg-gradient-to-r from-blue-600 to-blue-700' :
                  product.id === 'trimestral' ? 'bg-gradient-to-r from-purple-600 to-purple-700' :
                  product.id === 'anual' ? 'bg-gradient-to-r from-orange-500 to-orange-600' :
                  'bg-gradient-to-r from-green-500 to-green-600'
                }`}>
                  <div className="text-center">
                    <div className="p-4 bg-white/20 rounded-2xl w-fit mx-auto mb-6">
                      {product.id === 'teste' ? <Gift className="w-6 h-6 text-white" /> :
                       product.id === 'mensal' ? <Calendar className="w-6 h-6 text-white" /> :
                       product.id === 'trimestral' ? <Star className="w-6 h-6 text-white" /> :
                       product.id === 'anual' ? <Award className="w-6 h-6 text-white" /> :
                       <Zap className="w-6 h-6 text-white" />}
                    </div>
                    <h3 className="text-2xl font-bold text-white mb-3">{product.name}</h3>
                    <p className={`mt-2 text-sm ${
                      product.id === 'teste' ? 'text-green-100' :
                      product.id === 'mensal' ? 'text-blue-100' :
                      product.id === 'trimestral' ? 'text-purple-100' :
                      product.id === 'anual' ? 'text-orange-100' :
                      'text-green-100'
                    }`}>
                      {product.description}
                    </p>
                  </div>
                </div>
                
                <div className="p-8">
                  <div className="text-center mb-6">
                    <div className="text-4xl font-bold text-gray-900 mb-3">
                      {formatPrice(product.price)}
                      <span className="text-sm font-normal text-gray-500">
                        /{product.interval === 'year' ? 'ano' : 
                          product.name.includes('Trimestral') ? 'trimestre' : 'mês'}
                      </span>
                    </div>
                    {(product.interval === 'year' || product.name.includes('Trimestral')) && (
                      <p className="text-gray-600 text-sm mb-3">
                        Equivalente a {formatPrice(getMonthlyEquivalent(product))}/mês
                      </p>
                    )}
                    {product.discount && (
                        <div className="inline-block bg-green-100 text-green-800 px-4 py-2 rounded-full text-sm font-bold shadow-md">
                          <TrendingUp className="w-3 h-3 inline mr-1" />
                          Economia de {formatPrice(product.discount.savings)}
                        </div>
                      )}
                  </div>
                  
                  <div className="mb-8">
                    <h4 className="text-lg font-bold text-gray-900 mb-4 text-center">
                      ✨ Tudo Incluído
                    </h4>
                    <ul className="space-y-3">
                      {product.features.slice(0, 6).map((feature, featureIndex) => (
                        <li key={featureIndex} className="flex items-center text-sm">
                          <div className="p-1 bg-green-100 rounded-full mr-3 flex-shrink-0">
                            <Check className="w-3 h-3 text-green-600" />
                          </div>
                          <span className="text-gray-700 leading-relaxed">{feature}</span>
                        </li>
                      ))}
                    </ul>
                  </div>

                  {/* Funcionalidades Principais */}
                  <div className="mb-8 bg-gray-50 rounded-2xl p-6">
                    <h5 className="font-bold text-gray-900 mb-4 text-center">
                      🚀 Principais Funcionalidades
                    </h5>
                    <div className="grid grid-cols-2 gap-3 text-xs">
                      <div className="flex items-center">
                        <Coffee className="w-3 h-3 text-blue-600 mr-2" />
                        <span>Controle de Mesas</span>
                      </div>
                      <div className="flex items-center">
                        <ClipboardList className="w-3 h-3 text-orange-600 mr-2" />
                        <span>Comandas Digitais</span>
                      </div>
                      <div className="flex items-center">
                        <CreditCard className="w-3 h-3 text-green-600 mr-2" />
                        <span>PDV Completo</span>
                      </div>
                      <div className="flex items-center">
                        <Package className="w-3 h-3 text-purple-600 mr-2" />
                        <span>Controle Estoque</span>
                      </div>
                      <div className="flex items-center">
                        <QrCode className="w-3 h-3 text-indigo-600 mr-2" />
                        <span>QR Code Mesas</span>
                      </div>
                      <div className="flex items-center">
                        <BarChart3 className="w-3 h-3 text-red-600 mr-2" />
                        <span>Relatórios</span>
                      </div>
                      <div className="flex items-center">
                        <Users className="w-3 h-3 text-yellow-600 mr-2" />
                        <span>Funcionários</span>
                      </div>
                      <div className="flex items-center">
                        <Calculator className="w-3 h-3 text-pink-600 mr-2" />
                        <span>Análise CMV</span>
                      </div>
                    </div>
                  </div>

                  {/* Destaque do Cardápio WhatsApp */}
                  {index === 1 && (
                    <div className="mb-6 bg-gradient-to-r from-green-50 to-emerald-50 border border-green-200 rounded-2xl p-4">
                      <div className="flex items-center mb-2">
                        <svg className="w-5 h-5 text-green-600 mr-2" fill="currentColor" viewBox="0 0 24 24">
                          <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893A11.821 11.821 0 0020.885 3.488"/>
                        </svg>
                        <span className="font-bold text-green-800">Cardápio com WhatsApp</span>
                      </div>
                      <p className="text-sm text-green-700">
                        Clientes escaneiam QR Code e fazem pedidos direto pelo WhatsApp!
                      </p>
                    </div>
                  )}

                  <Link to="/signup">
                    <Button 
                      variant="primary" 
                      fullWidth 
                      size="lg"
                      className={`${
                        product.id === 'mensal' ? 'bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800' :
                        product.id === 'trimestral' ? 'bg-gradient-to-r from-purple-600 to-purple-700 hover:from-purple-700 hover:to-purple-800' :
                        product.id === 'anual' ? 'bg-gradient-to-r from-orange-500 to-orange-600 hover:from-orange-600 hover:to-orange-700' :
                        'bg-gradient-to-r from-green-600 to-green-700 hover:from-green-700 hover:to-green-800'
                      } font-bold py-4 text-lg shadow-xl hover:shadow-2xl transform hover:scale-105 transition-all duration-300`}
                      icon={<ArrowRight size={20} />}
                    >
                      Começar Agora
                    </Button>
                  </Link>

                  <p className="text-center text-xs text-gray-500 mt-4">
                    ✅ Ativação imediata após pagamento
                  </p>
                </div>
              </div>
            ))}
          </div>

          {/* Funcionalidades Detalhadas */}
          <div className="mt-20">
            <div className="text-center mb-12">
              <h3 className="text-3xl font-bold text-gray-900 mb-4">
                Sistema Mais Completo do Mercado
              </h3>
              <p className="text-xl text-gray-600">
                Todas as ferramentas que você precisa em um só lugar
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
              {/* Gestão Operacional */}
              <div className="bg-white rounded-2xl shadow-xl p-8 border border-gray-100">
                <div className="text-center mb-6">
                  <div className="w-16 h-16 bg-gradient-to-br from-blue-500 to-blue-600 rounded-2xl mx-auto flex items-center justify-center mb-4">
                    <Coffee className="w-8 h-8 text-white" />
                  </div>
                  <h4 className="text-xl font-bold text-gray-900">Gestão Operacional</h4>
                </div>
                <ul className="space-y-3 text-sm text-gray-600">
                  <li className="flex items-center">
                    <Check className="w-4 h-4 text-green-600 mr-3" />
                    Controle de mesas em tempo real
                  </li>
                  <li className="flex items-center">
                    <Check className="w-4 h-4 text-green-600 mr-3" />
                    Comandas digitais inteligentes
                  </li>
                  <li className="flex items-center">
                    <Check className="w-4 h-4 text-green-600 mr-3" />
                    Status visual das mesas
                  </li>
                  <li className="flex items-center">
                    <Check className="w-4 h-4 text-green-600 mr-3" />
                    Gestão de garçons
                  </li>
                  <li className="flex items-center">
                    <Check className="w-4 h-4 text-green-600 mr-3" />
                    Histórico completo de atendimento
                  </li>
                </ul>
              </div>

              {/* Sistema Financeiro */}
              <div className="bg-white rounded-2xl shadow-xl p-8 border border-gray-100">
                <div className="text-center mb-6">
                  <div className="w-16 h-16 bg-gradient-to-br from-green-500 to-green-600 rounded-2xl mx-auto flex items-center justify-center mb-4">
                    <CreditCard className="w-8 h-8 text-white" />
                  </div>
                  <h4 className="text-xl font-bold text-gray-900">Sistema Financeiro</h4>
                </div>
                <ul className="space-y-3 text-sm text-gray-600">
                  <li className="flex items-center">
                    <Check className="w-4 h-4 text-green-600 mr-3" />
                    PDV completo integrado
                  </li>
                  <li className="flex items-center">
                    <Check className="w-4 h-4 text-green-600 mr-3" />
                    PIX, cartão e dinheiro
                  </li>
                  <li className="flex items-center">
                    <Check className="w-4 h-4 text-green-600 mr-3" />
                    Controle de caixa por operador
                  </li>
                  <li className="flex items-center">
                    <Check className="w-4 h-4 text-green-600 mr-3" />
                    Relatórios financeiros detalhados
                  </li>
                  <li className="flex items-center">
                    <Check className="w-4 h-4 text-green-600 mr-3" />
                    Análise de rentabilidade
                  </li>
                </ul>
              </div>

              {/* Cardápio Digital */}
              <div className="bg-white rounded-2xl shadow-xl p-8 border border-gray-100">
                <div className="text-center mb-6">
                  <div className="w-16 h-16 bg-gradient-to-br from-purple-500 to-purple-600 rounded-2xl mx-auto flex items-center justify-center mb-4">
                    <QrCode className="w-8 h-8 text-white" />
                  </div>
                  <h4 className="text-xl font-bold text-gray-900">Cardápio Digital</h4>
                </div>
                <ul className="space-y-3 text-sm text-gray-600">
                  <li className="flex items-center">
                    <Check className="w-4 h-4 text-green-600 mr-3" />
                    QR Code personalizado
                  </li>
                  <li className="flex items-center">
                    <Check className="w-4 h-4 text-green-600 mr-3" />
                    Editor profissional
                  </li>
                  <li className="flex items-center">
                    <Check className="w-4 h-4 text-green-600 mr-3" />
                    <span><strong>Pedidos via WhatsApp</strong></span>
                  </li>
                  <li className="flex items-center">
                    <Check className="w-4 h-4 text-green-600 mr-3" />
                    Upload de imagens
                  </li>
                  <li className="flex items-center">
                    <Check className="w-4 h-4 text-green-600 mr-3" />
                    Atualização em tempo real
                  </li>
                </ul>
              </div>

              {/* Estoque e CMV */}
              <div className="bg-white rounded-2xl shadow-xl p-8 border border-gray-100">
                <div className="text-center mb-6">
                  <div className="w-16 h-16 bg-gradient-to-br from-orange-500 to-orange-600 rounded-2xl mx-auto flex items-center justify-center mb-4">
                    <Package className="w-8 h-8 text-white" />
                  </div>
                  <h4 className="text-xl font-bold text-gray-900">Estoque e CMV</h4>
                </div>
                <ul className="space-y-3 text-sm text-gray-600">
                  <li className="flex items-center">
                    <Check className="w-4 h-4 text-green-600 mr-3" />
                    Controle completo de insumos
                  </li>
                  <li className="flex items-center">
                    <Check className="w-4 h-4 text-green-600 mr-3" />
                    Alertas de estoque baixo
                  </li>
                  <li className="flex items-center">
                    <Check className="w-4 h-4 text-green-600 mr-3" />
                    Cálculo automático de CMV
                  </li>
                  <li className="flex items-center">
                    <Check className="w-4 h-4 text-green-600 mr-3" />
                    Análise de margem de lucro
                  </li>
                  <li className="flex items-center">
                    <Check className="w-4 h-4 text-green-600 mr-3" />
                    Relatórios de rentabilidade
                  </li>
                </ul>
              </div>

              {/* Relatórios e Analytics */}
              <div className="bg-white rounded-2xl shadow-xl p-8 border border-gray-100">
                <div className="text-center mb-6">
                  <div className="w-16 h-16 bg-gradient-to-br from-red-500 to-red-600 rounded-2xl mx-auto flex items-center justify-center mb-4">
                    <BarChart3 className="w-8 h-8 text-white" />
                  </div>
                  <h4 className="text-xl font-bold text-gray-900">Relatórios Avançados</h4>
                </div>
                <ul className="space-y-3 text-sm text-gray-600">
                  <li className="flex items-center">
                    <Check className="w-4 h-4 text-green-600 mr-3" />
                    Dashboard executivo
                  </li>
                  <li className="flex items-center">
                    <Check className="w-4 h-4 text-green-600 mr-3" />
                    Vendas por período
                  </li>
                  <li className="flex items-center">
                    <Check className="w-4 h-4 text-green-600 mr-3" />
                    Performance de funcionários
                  </li>
                  <li className="flex items-center">
                    <Check className="w-4 h-4 text-green-600 mr-3" />
                    Produtos mais vendidos
                  </li>
                  <li className="flex items-center">
                    <Check className="w-4 h-4 text-green-600 mr-3" />
                    Métricas de eficiência
                  </li>
                </ul>
              </div>

              {/* Funcionários e Permissões */}
              <div className="bg-white rounded-2xl shadow-xl p-8 border border-gray-100">
                <div className="text-center mb-6">
                  <div className="w-16 h-16 bg-gradient-to-br from-indigo-500 to-indigo-600 rounded-2xl mx-auto flex items-center justify-center mb-4">
                    <Users className="w-8 h-8 text-white" />
                  </div>
                  <h4 className="text-xl font-bold text-gray-900">Gestão de Equipe</h4>
                </div>
                <ul className="space-y-3 text-sm text-gray-600">
                  <li className="flex items-center">
                    <Check className="w-4 h-4 text-green-600 mr-3" />
                    Login por tipo de funcionário
                  </li>
                  <li className="flex items-center">
                    <Check className="w-4 h-4 text-green-600 mr-3" />
                    Garçom, Caixa, Estoque, Cozinha
                  </li>
                  <li className="flex items-center">
                    <Check className="w-4 h-4 text-green-600 mr-3" />
                    Permissões específicas
                  </li>
                  <li className="flex items-center">
                    <Check className="w-4 h-4 text-green-600 mr-3" />
                    Relatórios individuais
                  </li>
                  <li className="flex items-center">
                    <Check className="w-4 h-4 text-green-600 mr-3" />
                    Auditoria completa
                  </li>
                </ul>
              </div>
            </div>

            {/* Destaque do WhatsApp */}
            <div className="mt-16 bg-gradient-to-r from-green-500 via-green-600 to-emerald-600 rounded-3xl p-8 text-center shadow-2xl">
              <div className="flex justify-center mb-6">
                <div className="p-4 bg-white/20 backdrop-blur-sm rounded-2xl">
                  <svg className="w-12 h-12 text-white" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893A11.821 11.821 0 0020.885 3.488"/>
                  </svg>
                </div>
              </div>
              <h3 className="text-3xl font-bold text-white mb-4">
                🍽️ Cardápio Digital com Pedidos via WhatsApp
              </h3>
              <p className="text-xl text-green-100 mb-8 max-w-3xl mx-auto">
                Seus clientes escaneiam o QR Code na mesa, visualizam o cardápio completo e fazem pedidos 
                diretamente pelo WhatsApp. Sem aplicativo, sem complicação!
              </p>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="bg-white/20 backdrop-blur-sm rounded-2xl p-6">
                  <QrCode className="w-8 h-8 text-white mx-auto mb-3" />
                  <h4 className="font-bold text-white mb-2">1. Cliente Escaneia</h4>
                  <p className="text-green-100 text-sm">QR Code na mesa abre o cardápio digital</p>
                </div>
                <div className="bg-white/20 backdrop-blur-sm rounded-2xl p-6">
                  <Utensils className="w-8 h-8 text-white mx-auto mb-3" />
                  <h4 className="font-bold text-white mb-2">2. Escolhe Produtos</h4>
                  <p className="text-green-100 text-sm">Navega pelo cardápio e adiciona ao carrinho</p>
                </div>
                <div className="bg-white/20 backdrop-blur-sm rounded-2xl p-6">
                  <svg className="w-8 h-8 text-white mx-auto mb-3" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893A11.821 11.821 0 0020.885 3.488"/>
                  </svg>
                  <h4 className="font-bold text-white mb-2">3. Pede via WhatsApp</h4>
                  <p className="text-green-100 text-sm">Finaliza pedido direto no seu WhatsApp</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 bg-gradient-to-r from-red-600 via-red-700 to-red-800">
        <div className="w-full max-w-screen-2xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-4xl font-bold text-white mb-6">
            Pronto para revolucionar seu restaurante?
          </h2>
          <p className="text-xl text-red-100 mb-8 max-w-2xl mx-auto">
            Junte-se a centenas de estabelecimentos que já transformaram sua gestão com o ChefComanda
          </p>
          <div className="flex justify-center">
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
        </div>
      </section>

      {/* WhatsApp Contact Section */}
      <section className="py-20 bg-gradient-to-br from-green-50 via-green-100 to-emerald-50">
        <div className="w-full max-w-screen-2xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="max-w-6xl mx-auto text-center">
            <div className="mb-8">
              <div className="inline-flex items-center justify-center w-20 h-20 bg-gradient-to-br from-green-500 to-green-600 rounded-full mb-6 shadow-lg">
                <svg className="w-10 h-10 text-white" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893A11.821 11.821 0 0020.885 3.488"/>
                </svg>
              </div>
              <h2 className="text-4xl font-bold text-gray-900 mb-4">
                Ainda tem dúvidas?
              </h2>
              <p className="text-xl text-gray-600 mb-8 max-w-2xl mx-auto">
                Fale diretamente com um de nossos vendedores especializados. 
                Estamos prontos para esclarecer todas as suas dúvidas sobre o ChefComanda.
              </p>
            </div>

            <div className="bg-white rounded-2xl shadow-xl p-8 border border-green-200">
              <div className="flex flex-col md:flex-row items-center justify-between gap-8">
                <div className="flex-1 text-left">
                  <div className="flex items-center mb-4">
                    <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center mr-4">
                      <svg className="w-6 h-6 text-green-600" fill="currentColor" viewBox="0 0 24 24">
                        <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893A11.821 11.821 0 0020.885 3.488"/>
                      </svg>
                    </div>
                    <div>
                      <h3 className="text-2xl font-bold text-gray-900">Atendimento Especializado</h3>
                     
                    </div>
                  </div>
                  
                  <div className="space-y-3 text-gray-600">
                    <div className="flex items-center">
                      <CheckCircle className="w-5 h-5 text-green-500 mr-3" />
                      <span>Resposta imediata via WhatsApp</span>
                    </div>
                    <div className="flex items-center">
                      <CheckCircle className="w-5 h-5 text-green-500 mr-3" />
                      <span>Demonstração personalizada do sistema</span>
                    </div>
                    <div className="flex items-center">
                      <CheckCircle className="w-5 h-5 text-green-500 mr-3" />
                      <span>Consultoria gratuita para seu negócio</span>
                    </div>
                    <div className="flex items-center">
                      <CheckCircle className="w-5 h-5 text-green-500 mr-3" />
                      <span>Suporte na implementação</span>
                    </div>
                  </div>
                </div>

                <div className="flex-shrink-0">
                  <a
                    href="https://wa.me/5562982760471?text=Olá! Gostaria de saber mais sobre o ChefComanda e como ele pode ajudar meu restaurante."
                    target="_blank"
                    rel="noopener noreferrer"
                    className="group relative inline-flex items-center justify-center px-8 py-4 text-lg font-semibold text-white bg-gradient-to-r from-green-500 to-green-600 rounded-2xl shadow-lg hover:from-green-600 hover:to-green-700 transform hover:scale-105 transition-all duration-300 focus:outline-none focus:ring-4 focus:ring-green-300"
                  >
                    <div className="absolute inset-0 bg-gradient-to-r from-green-400 to-green-500 rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
                    <div className="relative flex items-center space-x-3">
                      <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24">
                        <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893A11.821 11.821 0 0020.885 3.488"/>
                      </svg>
                      <span>Falar com Vendedor</span>
                      <div className="w-2 h-2 bg-white rounded-full animate-pulse"></div>
                    </div>
                    
                    {/* Ripple effect */}
                    <div className="absolute inset-0 rounded-2xl">
                      <div className="absolute inset-0 rounded-2xl bg-white opacity-0 group-hover:opacity-20 group-hover:animate-ping"></div>
                    </div>
                  </a>
                  
                  <p className="text-sm text-gray-500 mt-3 text-center">
                    Clique para iniciar uma conversa
                  </p>
                </div>
              </div>
            </div>

            <div className="mt-8 grid grid-cols-1 md:grid-cols-3 gap-6 text-center">
              <div className="bg-white/70 backdrop-blur-sm rounded-xl p-6 border border-green-200">
                <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Clock className="w-6 h-6 text-green-600" />
                </div>
                <h4 className="font-semibold text-gray-900 mb-2">Atendimento Rápido</h4>
                <p className="text-gray-600 text-sm">Resposta em até 5 minutos durante horário comercial</p>
              </div>
              
              <div className="bg-white/70 backdrop-blur-sm rounded-xl p-6 border border-green-200">
                <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Users className="w-6 h-6 text-green-600" />
                </div>
                <h4 className="font-semibold text-gray-900 mb-2">Equipe Especializada</h4>
                <p className="text-gray-600 text-sm">Vendedores com experiência em gestão de restaurantes</p>
              </div>
              
              <div className="bg-white/70 backdrop-blur-sm rounded-xl p-6 border border-green-200">
                <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Star className="w-6 h-6 text-green-600" />
                </div>
                <h4 className="font-semibold text-gray-900 mb-2">Sem Compromisso</h4>
                <p className="text-gray-600 text-sm">Tire suas dúvidas sem nenhuma obrigação de compra</p>
              </div>
            </div>
          </div>
        </div>
      </section>
      {/* Footer */}
      <footer id="contato" className="bg-gray-900 text-white py-16">
        <div className="w-full max-w-screen-2xl mx-auto px-4 sm:px-6 lg:px-8">
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
                    href="https://www.instagram.com/chefcomanda/"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-purple-400 hover:text-purple-300 transition-colors"
                  >
                    @chefcomanda
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