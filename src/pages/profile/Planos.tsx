import React, { useState } from 'react';

const planosMensais = [
  {
    nome: 'Starter',
    preco: 'R$ 40,00/mês',
    descricao: [
      'Sistema de PDV completo',
      'Controle de estoque',
      'Dashboard e relatórios',
      'Exportação de dados (PDF e Excel)',
      'Relatórios avançados de vendas',
      'Suporte padrão',
      'Cancelamento a qualquer momento',
      'Teste grátis de 7 dias'
    ],
    destaque: false,
    botao: 'Assine agora'
  },
  {
    nome: 'Básico',
    preco: 'R$ 60,90/mês',
    descricao: [
      'Acesso completo às comandas e mesas',
      'Gerenciamento para garçons e cozinha',
      'Controle de estoque',
      'Acesso ao dashboard',
      'Relatórios avançados de vendass',
      'Exportação de dados (PDF e Excel)',
      'Suporte padrão',
      'Cancelamento a qualquer momento',
      'Teste grátis de 7 dias'
    ],
    destaque: false,
    botao: 'Assine Agora'
  },
  {
    nome: 'Profissional',
    preco: 'R$ 85,90/mês',
    descricao: [
      'Todas as funcionalidades do plano Básico',
      'Sistema de PDV completo',
      'Integração com iFood',
      'Controle de estoque avançado',
      'Relatórios detalhados',
      'Exportação de dados (PDF e Excel)',
      'Relatórios avançados de vendas',
      'Suporte prioritário',
      'Cancelamento a qualquer momento',
      'Teste grátis de 7 dias'
    ],
    destaque: true,
    botao: 'Assine Agora'
  },
];

const planosAnuais = [
  {
    nome: 'Starter Anual',
    preco: 'R$ 430,80/ano ou 12x de R$ 35,90',
    economia: 'Economize R$ 49,20 ao ano',
    descricao: [
      'Sistema de PDV completo',
      'Controle de estoque',
      'Dashboard e relatórios',
      'Exportação de dados (PDF e Excel)',
      'Relatórios avançados de vendas',
      'Suporte padrão',
      'Teste grátis de 7 dias'
    ],
    destaque: false,
    botao: 'Assinar Plano Anual'
  },
  {
    nome: 'Básico Anual',
    preco: 'R$ 599,88/ano ou 12x de R$ 49,99',
    economia: 'Economize R$ 130,92 ao ano',
    descricao: [
      'Acesso completo às comandas e mesas',
      'Gerenciamento para garçons e cozinha',
      'Controle de estoque',
      'Acesso ao dashboard',
      'Relatórios avançados de vendass',
      'Exportação de dados (PDF e Excel)',
      'Suporte padrão',
      'Teste grátis de 7 dias'
    ],
    destaque: false,
    botao: 'Assinar Plano Anual'
  },
  {
    nome: 'Profissional Anual',
    preco: 'R$ 790,80/ano ou 12x de R$ 65,90',
    economia: 'Economize R$ 240 ao ano',
    descricao: [
      'Todas as funcionalidades do plano Básico',
      'Sistema de PDV completo',
      'Integração com ifood',
      'Controle de estoque avançado',
      'Relatórios detalhados',
      'Exportação de dados (PDF e Excel)',
      'Relatórios avançados de vendas',
      'Suporte prioritário',
      'Teste grátis de 7 dias'
    ],
    destaque: true,
    botao: 'Assinar Plano Anual'
  },
];

const Planos: React.FC = () => {
  const [tab, setTab] = useState<'mensal' | 'anual'>('mensal');

  const planos = tab === 'mensal' ? planosMensais : planosAnuais;

  return (
    <div className="max-w-6xl mx-auto py-10 px-4">
      <h1 className="text-3xl font-bold mb-6">Planos e Assinaturas</h1>
      <div className="flex space-x-4 mb-8">
        <button
          className={`px-4 py-2 rounded ${tab === 'mensal' ? 'bg-blue-600 text-white' : 'bg-gray-200 dark:bg-gray-700 text-gray-800 dark:text-gray-100'}`}
          onClick={() => setTab('mensal')}
        >
          Mensal
        </button>
        <button
          className={`px-4 py-2 rounded ${tab === 'anual' ? 'bg-blue-600 text-white' : 'bg-gray-200 dark:bg-gray-700 text-gray-800 dark:text-gray-100'}`}
          onClick={() => setTab('anual')}
        >
          Anual
        </button>
      </div>

      <div className="grid md:grid-cols-3 gap-6">
        {planos.map((plano, idx) => (
          <div key={idx} className={`border rounded-lg p-6 shadow-sm ${plano.destaque ? 'border-blue-600' : 'border-gray-300'}`}>
            {plano.destaque && (
              <div className="text-sm text-blue-600 font-semibold mb-2">Melhor escolha</div>
            )}
            <h2 className="text-xl font-bold mb-2">{plano.nome}</h2>
            <p className="text-lg font-semibold text-blue-600 mb-1">{plano.preco}</p>
            {'economia' in plano && (
              <p className="text-sm text-green-600 mb-2">{plano.economia}</p>
            )}
            <ul className="text-sm text-gray-700 dark:text-gray-300 mb-4 space-y-1">
              {plano.descricao.map((item, i) => (
                <li key={i}>• {item}</li>
              ))}
            </ul>
            <button className="mt-auto w-full bg-blue-600 text-white py-2 px-4 rounded hover:bg-blue-700 transition">
              {plano.botao}
            </button>
          </div>
        ))}
      </div>
    </div>
  );
};

export default Planos;
