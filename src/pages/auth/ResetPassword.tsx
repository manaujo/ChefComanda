import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Lock, Eye, EyeOff, CheckCircle, XCircle, ChefHat } from 'lucide-react';
import Button from '../../components/ui/Button';
import { useAuth } from '../../contexts/AuthContext';
import toast from 'react-hot-toast';

const ResetPassword: React.FC = () => {
  const [formData, setFormData] = useState({
    senha: '',
    confirmaSenha: '',
  });
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [passwordValidation, setPasswordValidation] = useState({
    length: false,
    hasNumber: false,
    hasLetter: false,
    match: false,
  });

  const { resetPassword } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    const hasNumber = /\d/.test(formData.senha);
    const hasLetter = /[a-zA-Z]/.test(formData.senha);
    const length = formData.senha.length >= 6;
    const match = formData.senha === formData.confirmaSenha && formData.confirmaSenha.length > 0;

    setPasswordValidation({
      length,
      hasNumber,
      hasLetter,
      match,
    });
  }, [formData.senha, formData.confirmaSenha]);

  const validatePassword = (password: string) => {
    const hasNumber = /\d/.test(password);
    const hasLetter = /[a-zA-Z]/.test(password);
    return password.length >= 6 && hasNumber && hasLetter;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

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
      await resetPassword(formData.senha);
      toast.success('Senha redefinida com sucesso!');
      navigate('/login');
    } catch (err) {
      console.error(err);
      if (err instanceof Error) {
        setError(err.message);
      } else {
        setError('Erro ao redefinir senha');
      }
    } finally {
      setLoading(false);
    }
  };

  const ValidationItem = ({ valid, text }: { valid: boolean; text: string }) => (
    <div className="flex items-center space-x-2">
      {valid ? (
        <CheckCircle size={16} className="text-green-500" />
      ) : (
        <XCircle size={16} className="text-gray-300 dark:text-gray-600" />
      )}
      <span className={`text-sm ${valid ? 'text-green-600 dark:text-green-400' : 'text-gray-500 dark:text-gray-400'}`}>
        {text}
      </span>
    </div>
  );

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
              <span className="text-xs font-bold text-red-800">🔒</span>
            </div>
          </div>
        </div>
        <h1 className="text-3xl font-bold bg-gradient-to-r from-red-600 via-red-700 to-red-800 bg-clip-text text-transparent mb-2">
          Redefinir Senha
        </h1>
        <p className="text-gray-600 dark:text-gray-400 text-base">
          Crie uma nova senha segura para sua conta
        </p>
      </div>

      <form className="space-y-6" onSubmit={handleSubmit}>
        {error && (
          <div className="bg-red-50 dark:bg-red-900/50 border border-red-200 dark:border-red-800 p-4 rounded-xl shadow-sm">
            <p className="text-sm text-red-700 dark:text-red-200">{error}</p>
          </div>
        )}

        <div>
          <label htmlFor="senha" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            Nova Senha
          </label>
          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <Lock size={18} className="text-gray-400 dark:text-gray-600" />
            </div>
            <input
              id="senha"
              type={showPassword ? 'text' : 'password'}
              value={formData.senha}
              onChange={(e) => setFormData({ ...formData, senha: e.target.value })}
              className="pl-11 pr-12 block w-full rounded-xl border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 focus:ring-2 focus:ring-red-500 dark:focus:ring-red-400 focus:border-red-500 dark:focus:border-red-400 transition-all duration-200 dark:text-white py-3 px-4 text-base shadow-sm hover:shadow-md"
              placeholder="Mínimo 6 caracteres"
              autoComplete="new-password"
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

        <div>
          <label htmlFor="confirmaSenha" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            Confirme sua Nova Senha
          </label>
          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <Lock size={18} className="text-gray-400 dark:text-gray-600" />
            </div>
            <input
              id="confirmaSenha"
              type={showConfirmPassword ? 'text' : 'password'}
              value={formData.confirmaSenha}
              onChange={(e) => setFormData({ ...formData, confirmaSenha: e.target.value })}
              className="pl-11 pr-12 block w-full rounded-xl border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 focus:ring-2 focus:ring-red-500 dark:focus:ring-red-400 focus:border-red-500 dark:focus:border-red-400 transition-all duration-200 dark:text-white py-3 px-4 text-base shadow-sm hover:shadow-md"
              placeholder="Digite sua nova senha novamente"
              autoComplete="new-password"
            />
            <button
              type="button"
              onClick={() => setShowConfirmPassword(!showConfirmPassword)}
              className="absolute inset-y-0 right-0 pr-4 flex items-center hover:bg-gray-50 dark:hover:bg-gray-700 rounded-r-xl transition-colors"
            >
              {showConfirmPassword ? (
                <EyeOff size={18} className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors" />
              ) : (
                <Eye size={18} className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors" />
              )}
            </button>
          </div>
        </div>

        {/* Password Validation */}
        {formData.senha && (
          <div className="bg-gray-50 dark:bg-gray-800/50 border border-gray-200 dark:border-gray-700 p-4 rounded-xl space-y-2">
            <p className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Requisitos da senha:</p>
            <ValidationItem valid={passwordValidation.length} text="Mínimo de 6 caracteres" />
            <ValidationItem valid={passwordValidation.hasLetter} text="Pelo menos uma letra" />
            <ValidationItem valid={passwordValidation.hasNumber} text="Pelo menos um número" />
            {formData.confirmaSenha && (
              <ValidationItem valid={passwordValidation.match} text="As senhas conferem" />
            )}
          </div>
        )}

        <Button
          type="submit"
          variant="primary"
          fullWidth
          size="lg"
          isLoading={loading}
          disabled={!passwordValidation.length || !passwordValidation.hasLetter || !passwordValidation.hasNumber || !passwordValidation.match}
          className="bg-gradient-to-r from-red-600 via-red-700 to-red-800 hover:from-red-700 hover:via-red-800 hover:to-red-900 transition-all duration-300 transform hover:scale-[1.02] active:scale-[0.98] shadow-lg hover:shadow-xl py-4 text-lg font-semibold rounded-xl disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none"
        >
          Redefinir Senha
        </Button>

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

export default ResetPassword;
