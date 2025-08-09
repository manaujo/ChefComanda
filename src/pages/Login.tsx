import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { User, Lock, Eye, EyeOff, Mail, ChefHat } from 'lucide-react';
import Button from '../components/ui/Button';
import { useAuth } from '../contexts/AuthContext';

const Login: React.FC = () => {
  const [email, setEmail] = useState('');
  const [senha, setSenha] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  
  const { signIn } = useAuth();
  const navigate = useNavigate();

  const validateEmail = (email: string) => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    
    if (!email || !senha) {
      setError('Preencha todos os campos');
      return;
    }

    if (!validateEmail(email)) {
      setError('Digite um e-mail válido');
      return;
    }
    
    try {
      setLoading(true);
      
      await signIn(email, senha);
    } catch (err) {
      console.error('Error signing in:', err);
      if (err instanceof Error) {
        // Handle specific error messages with more user-friendly descriptions
        if (err.message.includes('Failed to fetch')) {
          setError('Erro de conexão. Verifique sua internet e tente novamente.');
        } else if (err.message.includes('Invalid login credentials')) {
          setError('E-mail ou senha incorretos');
        } else if (err.message.includes('Erro de configuração do banco de dados')) {
          setError('Erro de configuração do sistema. Contate o suporte técnico.');
        } else if (err.message.includes('Erro interno do servidor')) {
          setError('Erro interno do servidor. Tente novamente em alguns minutos ou contate o suporte.');
        } else if (err.message.includes('E-mail não confirmado')) {
          setError('E-mail não confirmado. Verifique sua caixa de entrada e clique no link de confirmação.');
        } else if (err.message.includes('Muitas tentativas')) {
          setError('Muitas tentativas de login. Aguarde alguns minutos antes de tentar novamente.');
        } else {
          setError(err.message);
        }
      } else {
        setError('E-mail ou senha incorretos');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-8">
      {/* Logo Section */}
      <div className="text-center">
        <div className="flex justify-center mb-6">
          <div className="relative">
            <div className="w-20 h-20 bg-gradient-to-br from-red-600 via-red-700 to-red-800 rounded-2xl shadow-2xl flex items-center justify-center transform rotate-3 hover:rotate-0 transition-transform duration-300">
              <ChefHat className="w-10 h-10 text-white" />
            </div>
            <div className="absolute -top-1 -right-1 w-6 h-6 bg-yellow-400 rounded-full flex items-center justify-center">
              <span className="text-xs font-bold text-red-800">✨</span>
            </div>
          </div>
        </div>
        <h1 className="text-3xl font-bold bg-gradient-to-r from-red-600 via-red-700 to-red-800 bg-clip-text text-transparent mb-2">
          ChefComanda
        </h1>
        <p className="text-gray-600 dark:text-gray-400 text-lg">
          Bem-vindo de volta! Faça login para continuar.
        </p>
      </div>

      <form className="space-y-6" onSubmit={handleSubmit}>
        {error && (
          <div className="bg-red-50 dark:bg-red-900/50 border border-red-200 dark:border-red-800 p-4 rounded-xl shadow-sm">
            <p className="text-sm text-red-700 dark:text-red-200">{error}</p>
            {(error.includes('Erro interno do servidor') || error.includes('Erro de configuração')) && (
              <div className="mt-2 text-xs text-red-600 dark:text-red-300">
                <p>Este erro indica um problema no sistema. Possíveis causas:</p>
                <ul className="list-disc list-inside mt-1 space-y-1">
                  <li>Problemas com triggers ou políticas de segurança no banco de dados</li>
                  <li>Conflitos de dados ou restrições de integridade</li>
                  <li>Sobrecarga temporária do servidor</li>
                  <li>Configuração incorreta das permissões de usuário</li>
                </ul>
                <p className="mt-2">Se o problema persistir, contate o suporte técnico com o código do erro.</p>
              </div>
            )}
          </div>
        )}
        
        <div>
          <label htmlFor="email" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
            E-mail
          </label>
          <div className="mt-2 relative">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <Mail size={18} className="text-gray-400 dark:text-gray-600" />
            </div>
            <input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="pl-11 block w-full rounded-xl border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 focus:ring-2 focus:ring-red-500 dark:focus:ring-red-400 focus:border-red-500 dark:focus:border-red-400 transition-all duration-200 dark:text-white py-3 px-4 text-base shadow-sm hover:shadow-md"
              placeholder="seu@email.com"
            />
          </div>
        </div>

        <div>
          <label htmlFor="senha" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
            Senha
          </label>
          <div className="mt-2 relative">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <Lock size={18} className="text-gray-400 dark:text-gray-600" />
            </div>
            <input
              id="senha"
              type={showPassword ? 'text' : 'password'}
              value={senha}
              onChange={(e) => setSenha(e.target.value)}
              className="pl-11 pr-12 block w-full rounded-xl border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 focus:ring-2 focus:ring-red-500 dark:focus:ring-red-400 focus:border-red-500 dark:focus:border-red-400 transition-all duration-200 dark:text-white py-3 px-4 text-base shadow-sm hover:shadow-md"
              placeholder="••••••••"
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute inset-y-0 right-0 pr-4 flex items-center hover:bg-gray-50 dark:hover:bg-gray-700 rounded-r-xl transition-colors"
            >
              {showPassword ? (
                <EyeOff size={18} className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors" />
              ) : (
                <Eye size={18} className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors" />
              )}
            </button>
          </div>
        </div>

        <div className="flex items-center justify-between">
          <div className="flex items-center">
            <input
              id="lembrar"
              type="checkbox"
              className="h-4 w-4 text-red-600 focus:ring-red-500 border-gray-300 rounded transition-colors dark:border-gray-600 dark:bg-gray-700 shadow-sm"
            />
            <label htmlFor="lembrar" className="ml-2 block text-sm text-gray-700 dark:text-gray-300">
              Lembrar-me
            </label>
          </div>

          <div className="text-sm">
            <Link to="/auth/forgot-password" className="font-medium text-red-600 hover:text-red-500 dark:text-red-400 dark:hover:text-red-300 transition-colors hover:underline">
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
          className="bg-gradient-to-r from-red-600 via-red-700 to-red-800 hover:from-red-700 hover:via-red-800 hover:to-red-900 transition-all duration-300 transform hover:scale-[1.02] active:scale-[0.98] shadow-lg hover:shadow-xl py-4 text-lg font-semibold rounded-xl"
        >
          Entrar
        </Button>

        <div className="text-center">
          <p className="text-sm text-gray-600 dark:text-gray-400">
            Não tem uma conta?{' '}
            <Link to="/signup" className="font-medium text-red-600 hover:text-red-500 dark:text-red-400 dark:hover:text-red-300 transition-colors hover:underline">
              Registre-se
            </Link>
          </p>
        </div>
        
        {/* Decorative Elements */}
        <div className="flex justify-center space-x-2 pt-4">
          <div className="w-2 h-2 bg-red-300 rounded-full animate-pulse"></div>
          <div className="w-2 h-2 bg-red-400 rounded-full animate-pulse" style={{ animationDelay: '0.2s' }}></div>
          <div className="w-2 h-2 bg-red-500 rounded-full animate-pulse" style={{ animationDelay: '0.4s' }}></div>
        </div>
      </form>
    </div>
  );
};

export default Login;