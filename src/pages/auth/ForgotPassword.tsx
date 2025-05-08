import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { User } from 'lucide-react';
import Button from '../../components/ui/Button';
import { useAuth } from '../../contexts/AuthContext';

const ForgotPassword: React.FC = () => {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  
  const { forgotPassword } = useAuth();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess(false);
    
    if (!email) {
      setError('Digite seu e-mail');
      return;
    }
    
    try {
      setLoading(true);
      await forgotPassword(email);
      setSuccess(true);
    } catch (err) {
      console.error(err);
      setError('Erro ao enviar e-mail de recuperação');
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
        
        {success && (
          <div className="bg-green-50 border-l-4 border-green-500 p-4">
            <p className="text-sm text-green-700">
              E-mail de recuperação enviado! Verifique sua caixa de entrada.
            </p>
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
          <Button
            type="submit"
            variant="primary"
            fullWidth
            size="lg"
            isLoading={loading}
          >
            Recuperar Senha
          </Button>
        </div>

        <div className="text-sm text-center">
          <Link to="/login" className="font-medium text-blue-600 hover:text-blue-500">
            Voltar para o login
          </Link>
        </div>
      </form>
    </div>
  );
};

export default ForgotPassword;