import React from 'react';
import { Link } from 'react-router-dom';
import { Mail } from 'lucide-react';
import Button from '../../components/ui/Button';

const VerifyEmail: React.FC = () => {
  return (
    <div className="text-center">
      <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-blue-100">
        <Mail className="h-6 w-6 text-blue-600" />
      </div>
      <h2 className="mt-4 text-lg font-medium text-gray-900">
        Verifique seu e-mail
      </h2>
      <p className="mt-2 text-sm text-gray-500">
        Enviamos um link de confirmação para o seu e-mail.
        <br />
        Clique no link para ativar sua conta.
      </p>
      <div className="mt-6">
        <Link to="/login">
          <Button variant="primary">
            Voltar para o Login
          </Button>
        </Link>
      </div>
    </div>
  );
};

export default VerifyEmail;