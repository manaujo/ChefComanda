import React, { useState } from 'react';
import { Search, PlayCircle, BookOpen, Lightbulb, ChevronRight, ExternalLink } from 'lucide-react';
import Button from '../components/ui/Button';

interface Tutorial {
  id: string;
  title: string;
  description: string;
  videoUrl?: string;
  content: string;
  category: string;
}

interface QuickTip {
  id: string;
  title: string;
  description: string;
  icon: React.ReactNode;
}

const tutorials: Tutorial[] = [
  {
    id: '1',
    title: 'Começando com o ChefComanda',
    description: 'Aprenda os primeiros passos para utilizar o sistema',
    videoUrl: 'https://www.youtube.com/embed/dQw4w9WgXcQ',
    content: `
      <h2>Primeiros Passos</h2>
      <p>Bem-vindo ao ChefComanda! Este guia irá ajudá-lo a começar a usar nosso sistema.</p>
      
      <h3>1. Configuração Inicial</h3>
      <ul>
        <li>Faça login com suas credenciais</li>
        <li>Complete seu perfil empresarial</li>
        <li>Configure as mesas do seu estabelecimento</li>
      </ul>
      
      <h3>2. Cadastro de Produtos</h3>
      <ul>
        <li>Acesse o menu "Produtos"</li>
        <li>Clique em "Novo Produto"</li>
        <li>Preencha as informações necessárias</li>
      </ul>
    `,
    category: 'Introdução'
  },
  {
    id: '2',
    title: 'Gerenciando Comandas',
    description: 'Como criar e gerenciar comandas eficientemente',
    videoUrl: 'https://www.youtube.com/embed/dQw4w9WgXcQ',
    content: `
      <h2>Gestão de Comandas</h2>
      <p>Aprenda a gerenciar comandas de forma eficiente.</p>
      
      <h3>1. Criar Nova Comanda</h3>
      <ul>
        <li>Selecione uma mesa disponível</li>
        <li>Clique em "Nova Comanda"</li>
        <li>Adicione os itens do pedido</li>
      </ul>
      
      <h3>2. Acompanhamento</h3>
      <ul>
        <li>Monitore o status dos pedidos</li>
        <li>Atualize itens conforme necessário</li>
        <li>Finalize o pagamento</li>
      </ul>
    `,
    category: 'Operação'
  }
];

const quickTips: QuickTip[] = [
  {
    id: '1',
    title: 'Atalhos do Teclado',
    description: 'F2 - Nova comanda\nF3 - Buscar produto\nF4 - Finalizar pedido',
    icon: <Lightbulb className="w-6 h-6 text-yellow-500" />
  },
  {
    id: '2',
    title: 'Boas Práticas',
    description: 'Sempre confira os itens antes de enviar para a cozinha\nMantenha o cadastro de produtos atualizado',
    icon: <BookOpen className="w-6 h-6 text-blue-500" />
  }
];

const HelpCenter: React.FC = () => {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [selectedTutorial, setSelectedTutorial] = useState<Tutorial | null>(null);

  const categories = ['all', ...new Set(tutorials.map(t => t.category))];

  const filteredTutorials = tutorials.filter(tutorial => {
    const matchSearch = tutorial.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
                       tutorial.description.toLowerCase().includes(searchTerm.toLowerCase());
    const matchCategory = selectedCategory === 'all' || tutorial.category === selectedCategory;
    return matchSearch && matchCategory;
  });

  return (
    <div className="w-full px-4 sm:px-6 lg:px-8 py-8">
      <div className="flex justify-between items-start mb-8">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Central de Ajuda</h1>
          <p className="mt-1 text-sm text-gray-500">
            Encontre tutoriais e dicas para usar o ChefComanda
          </p>
        </div>
      </div>

      {/* Search and Filters */}
      <div className="bg-white rounded-lg shadow-sm p-4 mb-8">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
            <input
              type="text"
              placeholder="Buscar tutoriais..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10 w-full rounded-lg border border-gray-300 py-2 px-4 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>

          <div>
            <select
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
              className="w-full border border-gray-300 rounded-md py-2 pl-3 pr-10 focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="all">Todas as categorias</option>
              {categories.filter(c => c !== 'all').map(category => (
                <option key={category} value={category}>
                  {category}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Main Content */}
        <div className="lg:col-span-2 space-y-6">
          {selectedTutorial ? (
            <div className="bg-white rounded-lg shadow-sm overflow-hidden">
              <div className="p-6">
                <div className="flex justify-between items-start mb-6">
                  <div>
                    <h2 className="text-xl font-bold text-gray-900">
                      {selectedTutorial.title}
                    </h2>
                    <p className="mt-1 text-sm text-gray-500">
                      {selectedTutorial.description}
                    </p>
                  </div>
                  <Button
                    variant="ghost"
                    onClick={() => setSelectedTutorial(null)}
                  >
                    Voltar
                  </Button>
                </div>

                {selectedTutorial.videoUrl && (
                  <div className="relative pb-[56.25%] mb-6">
                    <iframe
                      src={selectedTutorial.videoUrl}
                      className="absolute top-0 left-0 w-full h-full rounded-lg"
                      allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                      allowFullScreen
                    />
                  </div>
                )}

                <div
                  className="prose max-w-none"
                  dangerouslySetInnerHTML={{ __html: selectedTutorial.content }}
                />
              </div>
            </div>
          ) : (
            <div className="space-y-6">
              {filteredTutorials.map((tutorial) => (
                <div
                  key={tutorial.id}
                  className="bg-white rounded-lg shadow-sm overflow-hidden hover:shadow-md transition-shadow cursor-pointer"
                  onClick={() => setSelectedTutorial(tutorial)}
                >
                  <div className="p-6">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <h3 className="text-lg font-medium text-gray-900">
                          {tutorial.title}
                        </h3>
                        <p className="mt-1 text-sm text-gray-500">
                          {tutorial.description}
                        </p>
                        <div className="mt-2">
                          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                            {tutorial.category}
                          </span>
                        </div>
                      </div>
                      <ChevronRight className="flex-shrink-0 h-5 w-5 text-gray-400" />
                    </div>
                  </div>
                </div>
              ))}

              {filteredTutorials.length === 0 && (
                <div className="text-center py-12">
                  <p className="text-gray-500">
                    Nenhum tutorial encontrado para sua busca
                  </p>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Quick Tips Sidebar */}
        <div className="space-y-6">
          <div className="bg-white rounded-lg shadow-sm overflow-hidden">
            <div className="p-6">
              <h2 className="text-lg font-medium text-gray-900 mb-4">
                Dicas Rápidas
              </h2>
              <div className="space-y-4">
                {quickTips.map((tip) => (
                  <div
                    key={tip.id}
                    className="p-4 bg-gray-50 rounded-lg"
                  >
                    <div className="flex items-start">
                      <div className="flex-shrink-0">
                        {tip.icon}
                      </div>
                      <div className="ml-4">
                        <h3 className="text-sm font-medium text-gray-900">
                          {tip.title}
                        </h3>
                        <p className="mt-1 text-sm text-gray-500 whitespace-pre-line">
                          {tip.description}
                        </p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow-sm overflow-hidden">
            <div className="p-6">
              <h2 className="text-lg font-medium text-gray-900 mb-4">
                Recursos Adicionais
              </h2>
              <div className="space-y-4">
                <a
                  href="mailto:chefcomandaoficial@gmail.com"
                  className="flex items-center text-sm text-blue-600 hover:text-blue-500"
                >
                  <ExternalLink size={16} className="mr-2" />
                  Suporte por E-mail
                </a>
                <a
                  href="https://www.instagram.com/chefcomanda/"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center text-sm text-blue-600 hover:text-blue-500"
                >
                  <ExternalLink size={16} className="mr-2" />
                  Instagram @chefcomanda
                </a>
                <a
                  href="https://wa.me/5562982760471"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center text-sm text-blue-600 hover:text-blue-500"
                >
                  <ExternalLink size={16} className="mr-2" />
                  WhatsApp: (62) 98276-0471
                </a>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default HelpCenter;