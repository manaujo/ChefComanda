import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { User, Lock, Eye, EyeOff } from 'lucide-react';
import Button from '../components/ui/Button';
import { useAuth } from '../contexts/AuthContext';

const Login: React.FC = () => {
  const [identifier, setIdentifier] = useState('');
  const [senha, setSenha] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  
  const { signIn } = useAuth();
  const navigate = useNavigate();

  const validateIdentifier = (value: string) => {
    // Validar CPF (000.000.000-00) ou email
    const cpfRegex = /^\d{3}\.\d{3}\.\d{3}-\d{2}$/;
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return cpfRegex.test(value) || emailRegex.test(value);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    
    if (!identifier || !senha) {
      setError('Preencha todos os campos');
      return;
    }

    if (!validateIdentifier(identifier)) {
      setError('Digite um e-mail ou CPF válido');
      return;
    }
    
    try {
      setLoading(true);
      await signIn(identifier, senha);
    } catch (err) {
      console.error(err);
      if (err instanceof Error && err.message.includes('Failed to fetch')) {
        setError('Erro de conexão. Verifique sua internet e tente novamente.');
      } else {
        setError('E-mail/CPF ou senha incorretos');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <form className="space-y-6" onSubmit={handleSubmit}>
        {error && (
          <div className="bg-red-50 dark:bg-red-900/50 border-l-4 border-red-500 p-4 rounded">
            <p className="text-sm text-red-700 dark:text-red-200">{error}</p>
          </div>
        )}
        
        <div>
          <label htmlFor="identifier" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
            E-mail ou CPF
          </label>
          <div className="mt-1 relative">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <User size={16} className="text-gray-400 dark:text-gray-600" />
            </div>
            <input
              id="identifier"
              type="text"
              value={identifier}
              onChange={(e) => setIdentifier(e.target.value)}
              className="pl-10 block w-full rounded-lg border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 focus:border-blue-500 dark:focus:border-blue-400 transition-colors dark:text-white"
              placeholder="email ou cpf"
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
              value={senha}
              onChange={(e) => setSenha(e.target.value)}
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

        <div className="flex items-center justify-between">
          <div className="flex items-center">
            <input
              id="lembrar"
              type="checkbox"
              className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded transition-colors dark:border-gray-600 dark:bg-gray-700"
            />
            <label htmlFor="lembrar" className="ml-2 block text-sm text-gray-700 dark:text-gray-300">
              Lembrar-me
            </label>
          </div>

          <div className="text-sm">
            <Link to="/auth/forgot-password" className="font-medium text-blue-600 hover:text-blue-500 dark:text-blue-400 dark:hover:text-blue-300 transition-colors">
              Esqueceu sua senha?
            </Link>
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
          Entrar
        </Button>

        <div className="text-center">
          <p className="text-sm text-gray-600 dark:text-gray-400">
            Não tem uma conta?{' '}
            <Link to="/signup" className="font-medium text-blue-600 hover:text-blue-500 dark:text-blue-400 dark:hover:text-blue-300 transition-colors">
              Registre-se
            </Link>
          </p>
        </div>
      </form>
    </div>
  );
};

export default Login;