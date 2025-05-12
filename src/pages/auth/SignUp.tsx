import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { User, Lock, Eye, EyeOff, Mail } from 'lucide-react';
import Button from '../../components/ui/Button';
import { useAuth } from '../../contexts/AuthContext';

const SignUp: React.FC = () => {
  const [formData, setFormData] = useState({
    nome: '',
    email: '',
    cpf: '',
    senha: '',
    confirmaSenha: ''
  });
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  
  const { signUp } = useAuth();
  const navigate = useNavigate();

  const validateCPF = (cpf: string) => {
    const cpfRegex = /^\d{3}\.\d{3}\.\d{3}-\d{2}$/;
    return cpfRegex.test(cpf);
  };

  const validateEmail = (email: string) => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  };

  const validatePassword = (password: string) => {
    return password.length >= 6;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    
    if (!formData.nome || !formData.email || !formData.cpf || !formData.senha || !formData.confirmaSenha) {
      setError('Preencha todos os campos');
      return;
    }
    
    if (!validateEmail(formData.email)) {
      setError('Digite um e-mail válido');
      return;
    }

    if (!validateCPF(formData.cpf)) {
      setError('Digite um CPF válido (000.000.000-00)');
      return;
    }
    
    if (!validatePassword(formData.senha)) {
      setError('A senha deve ter no mínimo 6 caracteres');
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
        role: 'admin'
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
          <div className="bg-red-50 dark:bg-red-900/50 border-l-4 border-red-500 p-4 rounded">
            <p className="text-sm text-red-700 dark:text-red-200">{error}</p>
          </div>
        )}
        
        <div>
          <label htmlFor="nome" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
            Nome Completo
          </label>
          <div className="mt-1 relative">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <User size={16} className="text-gray-400 dark:text-gray-600" />
            </div>
            <input
              id="nome"
              type="text"
              value={formData.nome}
              onChange={(e) => setFormData({ ...formData, nome: e.target.value })}
              className="pl-10 block w-full rounded-lg border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 focus:border-blue-500 dark:focus:border-blue-400 transition-colors dark:text-white"
              placeholder="Seu nome completo"
            />
          </div>
        </div>

        <div>
          <label htmlFor="email" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
            E-mail
          </label>
          <div className="mt-1 relative">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <Mail size={16} className="text-gray-400 dark:text-gray-600" />
            </div>
            <input
              id="email"
              type="email"
              value={formData.email}
              onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              className="pl-10 block w-full rounded-lg border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 focus:border-blue-500 dark:focus:border-blue-400 transition-colors dark:text-white"
              placeholder="email"
            />
          </div>
        </div>

        <div>
          <label htmlFor="cpf" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
            CPF
          </label>
          <div className="mt-1 relative">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <User size={16} className="text-gray-400 dark:text-gray-600" />
            </div>
            <input
              id="cpf"
              type="text"
              value={formData.cpf}
              onChange={(e) => setFormData({ ...formData, cpf: e.target.value })}
              className="pl-10 block w-full rounded-lg border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 focus:border-blue-500 dark:focus:border-blue-400 transition-colors dark:text-white"
              placeholder="000.000.000-00"
            />
          </div>
        </div>

        <div>
          <label htmlFor="senha" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
            Senha
          </label>
          <div className="mt-1 relative">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <Lock size={16} className="text-gray-400 dark:text-gray-600" />
            </div>
            <input
              id="senha"
              type={showPassword ? 'text' : 'password'}
              value={formData.senha}
              onChange={(e) => setFormData({ ...formData, senha: e.target.value })}
              className="pl-10 pr-10 block w-full rounded-lg border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 focus:border-blue-500 dark:focus:border-blue-400 transition-colors dark:text-white"
              placeholder="••••••••"
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute inset-y-0 right-0 pr-3 flex items-center"
            >
              {showPassword ? (
                <EyeOff size={16} className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors" />
              ) : (
                <Eye size={16} className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors" />
              )}
            </button>
          </div>
        </div>

        <div>
          <label htmlFor="confirmaSenha" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
            Confirme sua Senha
          </label>
          <div className="mt-1 relative">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <Lock size={16} className="text-gray-400 dark:text-gray-600" />
            </div>
            <input
              id="confirmaSenha"
              type={showConfirmPassword ? 'text' : 'password'}
              value={formData.confirmaSenha}
              onChange={(e) => setFormData({ ...formData, confirmaSenha: e.target.value })}
              className="pl-10 pr-10 block w-full rounded-lg border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 focus:border-blue-500 dark:focus:border-blue-400 transition-colors dark:text-white"
              placeholder="••••••••"
            />
            <button
              type="button"
              onClick={() => setShowConfirmPassword(!showConfirmPassword)}
              className="absolute inset-y-0 right-0 pr-3 flex items-center"
            >
              {showConfirmPassword ? (
                <EyeOff size={16} className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors" />
              ) : (
                <Eye size={16} className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors" />
              )}
            </button>
          </div>
        </div>

        <Button
          type="submit"
          variant="primary"
          fullWidth
          size="lg"
          isLoading={loading}
          className="bg-gradient-to-r from-blue-600 to-blue-500 hover:from-blue-700 hover:to-blue-600 transition-all duration-200 transform hover:scale-[1.02] active:scale-[0.98]"
        >
          Criar Conta
        </Button>

        <div className="text-center">
          <p className="text-sm text-gray-600 dark:text-gray-400">
            Já tem uma conta?{' '}
            <Link to="/login" className="font-medium text-blue-600 hover:text-blue-500 dark:text-blue-400 dark:hover:text-blue-300 transition-colors">
              Faça login
            </Link>
          </p>
        </div>
      </form>
    </div>
  );
};

export default SignUp;