import React, { useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Lock } from 'lucide-react';
import Button from '../../components/ui/Button';
import { useAuth } from '../../contexts/AuthContext';

const ResetPassword: React.FC = () => {
  const [searchParams] = useSearchParams();
  const code = searchParams.get('code') || '';
  
  const [formData, setFormData] = useState({
    senha: '',
    confirmaSenha: '',
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  
  const { resetPassword } = useAuth();
  const navigate = useNavigate();

  const validatePassword = (password: string) => {
    const hasNumber = /\d/.test(password);
    const hasLetter = /[a-zA-Z]/.test(password);
    return password.length >= 6 && hasNumber && hasLetter;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    
    if (!code) {
      setError('Código de recuperação inválido');
      return;
    }
    
    if (!validatePassword(formData.senha)) {
      setError('A senha deve ter no mínimo 6 caracteres, com números e letras');
      return;
    }
    
    if (formData.senha !== formData.confirmaSenha) {
      setError('As senhas não conferem');
      return;
    }
    
    try {
      setLoading(true);
      await resetPassword(code, formData.senha);
      navigate('/login');
    } catch (err) {
      console.error(err);
      setError('Erro ao redefinir senha');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      <form className="space-y-6" onSubmit={handleSubmit}>
        {error && (
          <div className="bg-red-50 border-l-4 border-red-500 p-4">
            <p className="text-sm text-red-700">{error}</p>
          </div>
        )}

        <div>
          <label htmlFor="senha" className="block text-sm font-medium text-gray-700">
            Nova Senha
          </label>
          <div className="mt-1 relative rounded-md shadow-sm">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <Lock size={16} className="text-gray-400" />
            </div>
            <input
              id="senha"
              type="password"
              value={formData.senha}
              onChange={(e) => setFormData({ ...formData, senha: e.target.value })}
              className="focus:ring-blue-500 focus:border-blue-500 block w-full pl-10 sm:text-sm border-gray-300 rounded-md"
              placeholder="Mínimo 6 caracteres"
            />
          </div>
        </div>

        <div>
          <label htmlFor="confirmaSenha" className="block text-sm font-medium text-gray-700">
            Confirme sua Nova Senha
          </label>
          <div className="mt-1 relative rounded-md shadow-sm">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <Lock size={16} className="text-gray-400" />
            </div>
            <input
              id="confirmaSenha"
              type="password"
              value={formData.confirmaSenha}
              onChange={(e) => setFormData({ ...formData, confirmaSenha: e.target.value })}
              className="focus:ring-blue-500 focus:border-blue-500 block w-full pl-10 sm:text-sm border-gray-300 rounded-md"
              placeholder="Digite sua nova senha novamente"
            />
          </div>
        </div>

        <div>
          <Button
            type="submit"
            variant="primary"
            fullWidth
            size="lg"
            isLoading={loading}
          >
            Redefinir Senha
          </Button>
        </div>
      </form>
    </div>
  );
};

export default ResetPassword;