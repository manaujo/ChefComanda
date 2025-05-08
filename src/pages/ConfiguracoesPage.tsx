import React, { useState } from 'react';
import { Building, Printer, CreditCard, Bell, User, Settings, ShieldCheck } from 'lucide-react';
import Button from '../components/ui/Button';
import { useAuth } from '../contexts/AuthContext';
import { formatarDinheiro } from '../utils/formatters';

const ConfiguracoesPage: React.FC = () => {
  const { user, restaurante, plano } = useAuth();
  const [activeTab, setActiveTab] = useState('perfil');

  const tabs = [
    { id: 'perfil', label: 'Perfil' },
    { id: 'assinatura', label: 'Assinatura' },
    { id: 'faturamento', label: 'Faturamento' },
    { id: 'configuracoes', label: 'Configurações' }
  ];

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Configurações</h1>
          <p className="text-gray-500 mt-1">
            Ajustes e preferências do sistema
          </p>
        </div>
      </div>

      {/* Tabs */}
      <div className="border-b border-gray-200">
        <nav className="-mb-px flex space-x-8">
          {tabs.map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`
                whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm
                ${activeTab === tab.id
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'}
              `}
            >
              {tab.label}
            </button>
          ))}
        </nav>
      </div>

      {/* Perfil */}
      {activeTab === 'perfil' && (
        <div className="bg-white rounded-lg shadow-sm overflow-hidden">
          <div className="p-6">
            <div className="flex items-center mb-6">
              <div className="p-2 bg-blue-100 text-blue-700 rounded-lg mr-4">
                <Building size={24} />
              </div>
              <h2 className="text-lg font-medium">Dados do Estabelecimento</h2>
            </div>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Nome do Restaurante
                </label>
                <input 
                  type="text" 
                  className="w-full border border-gray-300 rounded-md p-2 focus:ring-blue-500 focus:border-blue-500"
                  defaultValue={restaurante?.nome}
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Telefone
                </label>
                <input 
                  type="text" 
                  className="w-full border border-gray-300 rounded-md p-2 focus:ring-blue-500 focus:border-blue-500"
                  defaultValue={restaurante?.telefone}
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  E-mail
                </label>
                <input 
                  type="email" 
                  className="w-full border border-gray-300 rounded-md p-2 focus:ring-blue-500 focus:border-blue-500"
                  defaultValue={user?.email}
                  disabled
                />
              </div>
            </div>
          </div>
          <div className="bg-gray-50 px-6 py-3 flex justify-end">
            <Button variant="primary">
              Salvar Alterações
            </Button>
          </div>
        </div>
      )}

      {/* Assinatura */}
      {activeTab === 'assinatura' && (
        <div className="space-y-6">
          <div className="bg-white rounded-lg shadow-sm overflow-hidden">
            <div className="p-6">
              <div className="flex items-center mb-6">
                <div className="p-2 bg-green-100 text-green-700 rounded-lg mr-4">
                  <CreditCard size={24} />
                </div>
                <div>
                  <h2 className="text-lg font-medium">Plano Atual</h2>
                  <p className="text-sm text-gray-500">
                    {plano?.nome || 'Nenhum plano ativo'}
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {/* Plano Básico */}
                <div className="border rounded-lg p-6">
                  <h3 className="text-lg font-medium">Básico</h3>
                  <p className="text-2xl font-bold mt-2">R$ 99,90<span className="text-sm font-normal">/mês</span></p>
                  <ul className="mt-4 space-y-2">
                    <li className="flex items-center text-sm">
                      <span className="mr-2">✓</span>
                      Até 5 mesas
                    </li>
                    <li className="flex items-center text-sm">
                      <span className="mr-2">✓</span>
                      Controle de comandas
                    </li>
                    <li className="flex items-center text-sm text-gray-400">
                      <span className="mr-2">×</span>
                      Relatórios avançados
                    </li>
                  </ul>
                  <Button
                    variant="primary"
                    fullWidth
                    className="mt-6"
                    disabled={plano?.nome === 'Básico'}
                  >
                    {plano?.nome === 'Básico' ? 'Plano Atual' : 'Escolher Plano'}
                  </Button>
                </div>

                {/* Plano Pro */}
                <div className="border rounded-lg p-6 bg-blue-50 border-blue-200">
                  <div className="flex justify-between items-start">
                    <div>
                      <h3 className="text-lg font-medium">Pro</h3>
                      <p className="text-2xl font-bold mt-2">R$ 199,90<span className="text-sm font-normal">/mês</span></p>
                    </div>
                    <span className="bg-blue-100 text-blue-800 text-xs font-medium px-2.5 py-0.5 rounded">Popular</span>
                  </div>
                  <ul className="mt-4 space-y-2">
                    <li className="flex items-center text-sm">
                      <span className="mr-2">✓</span>
                      Até 15 mesas
                    </li>
                    <li className="flex items-center text-sm">
                      <span className="mr-2">✓</span>
                      Controle de estoque
                    </li>
                    <li className="flex items-center text-sm">
                      <span className="mr-2">✓</span>
                      Impressão na cozinha
                    </li>
                  </ul>
                  <Button
                    variant="primary"
                    fullWidth
                    className="mt-6"
                    disabled={plano?.nome === 'Pro'}
                  >
                    {plano?.nome === 'Pro' ? 'Plano Atual' : 'Escolher Plano'}
                  </Button>
                </div>

                {/* Plano Premium */}
                <div className="border rounded-lg p-6">
                  <h3 className="text-lg font-medium">Premium</h3>
                  <p className="text-2xl font-bold mt-2">R$ 299,90<span className="text-sm font-normal">/mês</span></p>
                  <ul className="mt-4 space-y-2">
                    <li className="flex items-center text-sm">
                      <span className="mr-2">✓</span>
                      Mesas ilimitadas
                    </li>
                    <li className="flex items-center text-sm">
                      <span className="mr-2">✓</span>
                      Todas as funcionalidades
                    </li>
                    <li className="flex items-center text-sm">
                      <span className="mr-2">✓</span>
                      Suporte prioritário
                    </li>
                  </ul>
                  <Button
                    variant="primary"
                    fullWidth
                    className="mt-6"
                    disabled={plano?.nome === 'Premium'}
                  >
                    {plano?.nome === 'Premium' ? 'Plano Atual' : 'Escolher Plano'}
                  </Button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Faturamento */}
      {activeTab === 'faturamento' && (
        <div className="space-y-6">
          <div className="bg-white rounded-lg shadow-sm overflow-hidden">
            <div className="p-6">
              <div className="flex items-center mb-6">
                <div className="p-2 bg-purple-100 text-purple-700 rounded-lg mr-4">
                  <CreditCard size={24} />
                </div>
                <div>
                  <h2 className="text-lg font-medium">Histórico de Pagamentos</h2>
                  <p className="text-sm text-gray-500">
                    Últimas faturas e pagamentos
                  </p>
                </div>
              </div>

              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead>
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Data
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Plano
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Valor
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Status
                      </th>
                      <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Ações
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    <tr>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        10/03/2025
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        Pro
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        R$ 199,90
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-green-100 text-green-800">
                          Pago
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                        <Button variant="ghost" size="sm">
                          Ver recibo
                        </Button>
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow-sm overflow-hidden">
            <div className="p-6">
              <div className="flex items-center mb-6">
                <div className="p-2 bg-blue-100 text-blue-700 rounded-lg mr-4">
                  <CreditCard size={24} />
                </div>
                <div>
                  <h2 className="text-lg font-medium">Forma de Pagamento</h2>
                  <p className="text-sm text-gray-500">
                    Gerencie suas formas de pagamento
                  </p>
                </div>
              </div>

              <div className="space-y-4">
                <div className="flex items-center p-4 border rounded-lg">
                  <input
                    type="radio"
                    name="payment"
                    id="credit-card"
                    className="h-4 w-4 text-blue-600"
                    defaultChecked
                  />
                  <label htmlFor="credit-card" className="ml-3">
                    <span className="block text-sm font-medium text-gray-900">
                      Cartão de Crédito
                    </span>
                    <span className="block text-sm text-gray-500">
                      **** **** **** 1234
                    </span>
                  </label>
                </div>

                <div className="flex items-center p-4 border rounded-lg">
                  <input
                    type="radio"
                    name="payment"
                    id="pix"
                    className="h-4 w-4 text-blue-600"
                  />
                  <label htmlFor="pix" className="ml-3">
                    <span className="block text-sm font-medium text-gray-900">
                      Pix
                    </span>
                    <span className="block text-sm text-gray-500">
                      Pagamento instantâneo
                    </span>
                  </label>
                </div>
              </div>

              <div className="mt-6">
                <Button variant="primary">
                  Adicionar Nova Forma de Pagamento
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Configurações */}
      {activeTab === 'configuracoes' && (
        <div className="space-y-6">
          <div className="bg-white rounded-lg shadow-sm overflow-hidden">
            <div className="p-6">
              <div className="flex items-center mb-6">
                <div className="p-2 bg-gray-100 text-gray-700 rounded-lg mr-4">
                  <Settings size={24} />
                </div>
                <h2 className="text-lg font-medium">Configurações do Sistema</h2>
              </div>
              
              <div className="space-y-4">
                <div className="flex items-center justify-between py-2">
                  <div>
                    <h3 className="font-medium">Notificações por E-mail</h3>
                    <p className="text-sm text-gray-500">Receber alertas importantes por e-mail</p>
                  </div>
                  <div>
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input type="checkbox" value="" className="sr-only peer" defaultChecked />
                      <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                    </label>
                  </div>
                </div>

                <div className="flex items-center justify-between py-2">
                  <div>
                    <h3 className="font-medium">Tema Escuro</h3>
                    <p className="text-sm text-gray-500">Ativar modo escuro na interface</p>
                  </div>
                  <div>
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input type="checkbox" value="" className="sr-only peer" />
                      <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                    </label>
                  </div>
                </div>

                <div className="flex items-center justify-between py-2">
                  <div>
                    <h3 className="font-medium">Som de Notificações</h3>
                    <p className="text-sm text-gray-500">Tocar som ao receber novos pedidos</p>
                  </div>
                  <div>
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input type="checkbox" value="" className="sr-only peer" defaultChecked />
                      <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                    </label>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow-sm overflow-hidden">
            <div className="p-6">
              <div className="flex items-center mb-6">
                <div className="p-2 bg-red-100 text-red-700 rounded-lg mr-4">
                  <ShieldCheck size={24} />
                </div>
                <h2 className="text-lg font-medium">Segurança</h2>
              </div>
              
              <div className="space-y-4">
                <div>
                  <Button variant="ghost" className="text-red-600 hover:text-red-700">
                    Alterar Senha
                  </Button>
                </div>
                
                <div>
                  <Button variant="ghost" className="text-red-600 hover:text-red-700">
                    Excluir Conta
                  </Button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ConfiguracoesPage;