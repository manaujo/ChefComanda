import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { User, Lock, Phone, Building } from 'lucide-react';
import Button from '../../components/ui/Button';
import { useAuth } from '../../contexts/AuthContext';

const SignUp: React.FC = () => {
  const [formData, setFormData] = useState({
    nome: '',
    email: '',
    senha: '',
    confirmaSenha: '',
    role: 'waiter' as 'admin' | 'kitchen' | 'waiter',
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  
  const { signUp } = useAuth();
  const navigate = useNavigate();

  const validatePassword = (password: string) => {
    const hasNumber = /\d/.test(password);
    const hasLetter = /[a-zA-Z]/.test(password);
    return password.length >= 6 && hasNumber && hasLetter;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    
    if (!formData.nome || !formData.email || !formData.senha || !formData.confirmaSenha) {
      setError('Preencha todos os campos');
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
      await signUp({
        email: formData.email,
        password: formData.senha,
        name: formData.nome,
        role: formData.role,
      });
      navigate('/auth/verify-email');
    } catch (err) {
      console.error(err);
      setError('Erro ao criar conta. Tente novamente.');
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
          <label htmlFor="nome" className="block text-sm font-medium text-gray-700">
            Nome Completo
          </label>
          <div className="mt-1 relative rounded-md shadow-sm">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <User size={16} className="text-gray-400" />
            </div>
            <input
              id="nome"
              type="text"
              value={formData.nome}
              onChange={(e) => setFormData({ ...formData, nome: e.target.value })}
              className="focus:ring-blue-500 focus:border-blue-500 block w-full pl-10 sm:text-sm border-gray-300 rounded-md"
              placeholder="Seu nome completo"
            />
          </div>
        </div>

        <div>
          <label htmlFor="email" className="block text-sm font-medium text-gray-700">
            E-mail
          </label>
          <div className="mt-1 relative rounded-md shadow-sm">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <User size={16} className="text-gray-400" />
            </div>
            <input
              id="email"
              type="email"
              value={formData.email}
              onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              className="focus:ring-blue-500 focus:border-blue-500 block w-full pl-10 sm:text-sm border-gray-300 rounded-md"
              placeholder="seu@email.com"
            />
          </div>
        </div>

        <div>
          <label htmlFor="role" className="block text-sm font-medium text-gray-700">
            Tipo de Conta
          </label>
          <div className="mt-1">
            <select
              id="role"
              value={formData.role}
              onChange={(e) => setFormData({ ...formData, role: e.target.value as 'admin' | 'kitchen' | 'waiter' })}
              className="focus:ring-blue-500 focus:border-blue-500 block w-full sm:text-sm border-gray-300 rounded-md"
            >
              <option value="admin">Administrador</option>
              <option value="kitchen">Cozinha</option>
              <option value="waiter">Garçom</option>
            </select>
          </div>
        </div>

        <div>
          <label htmlFor="senha" className="block text-sm font-medium text-gray-700">
            Senha
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
            Confirme sua Senha
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
              placeholder="Digite sua senha novamente"
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
            Criar Conta
          </Button>
        </div>

        <div className="text-sm text-center">
          <p className="text-gray-600">
            Já tem uma conta?{' '}
            <Link to="/login" className="font-medium text-blue-600 hover:text-blue-500">
              Faça login
            </Link>
          </p>
        </div>
      </form>
    </div>
  );
};

export default SignUp;