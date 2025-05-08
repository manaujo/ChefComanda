import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { User, Lock } from 'lucide-react';
import Button from '../components/ui/Button';
import { useAuth } from '../contexts/AuthContext';

const Login: React.FC = () => {
  const [email, setEmail] = useState('');
  const [senha, setSenha] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  
  const { signIn } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    
    if (!email || !senha) {
      setError('Preencha todos os campos');
      return;
    }
    
    try {
      setLoading(true);
      await signIn(email, senha);
      // Redirect será feito pelo AuthContext após verificar o tipo de usuário
    } catch (err) {
      console.error(err);
      setError('E-mail ou senha incorretos');
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
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="focus:ring-blue-500 focus:border-blue-500 block w-full pl-10 sm:text-sm border-gray-300 rounded-md"
              placeholder="seu@email.com"
            />
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
              value={senha}
              onChange={(e) => setSenha(e.target.value)}
              className="focus:ring-blue-500 focus:border-blue-500 block w-full pl-10 sm:text-sm border-gray-300 rounded-md"
              placeholder="********"
            />
          </div>
        </div>

        <div className="flex items-center justify-between">
          <div className="flex items-center">
            <input
              id="lembrar"
              type="checkbox"
              className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
            />
            <label htmlFor="lembrar" className="ml-2 block text-sm text-gray-900">
              Lembrar-me
            </label>
          </div>

          <div className="text-sm">
            <Link to="/auth/forgot-password" className="font-medium text-blue-600 hover:text-blue-500">
              Esqueceu sua senha?
            </Link>
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
            Entrar
          </Button>
        </div>

        <div className="text-center text-sm">
          <p className="text-gray-600">
            Não tem uma conta?{' '}
            <Link to="/signup" className="font-medium text-blue-600 hover:text-blue-500">
              Registre-se
            </Link>
          </p>
        </div>
      </form>
    </div>
  );
};

export default Login;