import React, { useState, useEffect } from 'react';
import { Building2, Save } from 'lucide-react';
import Button from '../../components/ui/Button';
import { useAuth } from '../../contexts/AuthContext';
import { supabase } from '../../services/supabase';
import toast from 'react-hot-toast';

interface CompanyData {
  name: string;
  cnpj: string;
}

const CompanyProfile: React.FC = () => {
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [companyData, setCompanyData] = useState<CompanyData>({
    name: '',
    cnpj: ''
  });

  useEffect(() => {
    if (user) {
      loadCompanyData();
    }
  }, [user]);

  const loadCompanyData = async () => {
    try {
      if (!user) return;

      const { data, error } = await supabase
        .from('company_profiles')
        .select('*')
        .eq('user_id', user.id)
        .maybeSingle();

      if (error) throw error;

      if (data) {
        setCompanyData({
          name: data.name,
          cnpj: data.cnpj
        });
      } else {
        setCompanyData({
          name: '',
          cnpj: ''
        });
      }
    } catch (error) {
      console.error('Error loading company data:', error);
      toast.error('Erro ao carregar dados da empresa');
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      if (!user) throw new Error('User not authenticated');

      const { error } = await supabase
        .from('company_profiles')
        .upsert({
          user_id: user.id,
          name: companyData.name,
          cnpj: companyData.cnpj
        });

      if (error) throw error;

      toast.success('Dados da empresa atualizados com sucesso!');
    } catch (error) {
      console.error('Error updating company data:', error);
      toast.error('Erro ao atualizar dados da empresa');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto">
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm overflow-hidden">
        <div className="p-6">
          <div className="flex items-center mb-6">
            <div className="p-2 bg-blue-100 dark:bg-blue-900 text-blue-600 dark:text-blue-400 rounded-lg mr-4">
              <Building2 size={24} />
            </div>
            <div>
              <h2 className="text-lg font-medium text-gray-900 dark:text-white">
                Dados da Empresa
              </h2>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                Atualize as informações da sua empresa
              </p>
            </div>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <label 
                htmlFor="name"
                className="block text-sm font-medium text-gray-700 dark:text-gray-300"
              >
                Nome da Empresa
              </label>
              <input
                type="text"
                id="name"
                value={companyData.name}
                onChange={(e) => setCompanyData({ ...companyData, name: e.target.value })}
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white sm:text-sm"
                required
              />
            </div>

            <div>
              <label 
                htmlFor="cnpj"
                className="block text-sm font-medium text-gray-700 dark:text-gray-300"
              >
                CNPJ
              </label>
              <input
                type="text"
                id="cnpj"
                value={companyData.cnpj}
                onChange={(e) => setCompanyData({ ...companyData, cnpj: e.target.value })}
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white sm:text-sm"
                placeholder="00.000.000/0000-00"
                required
              />
            </div>

            <div className="flex justify-end">
              <Button
                type="submit"
                variant="primary"
                icon={<Save size={16} />}
                isLoading={loading}
              >
                Salvar Alterações
              </Button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

export default CompanyProfile;