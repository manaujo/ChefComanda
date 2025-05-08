import React from 'react';
import { Coffee } from 'lucide-react';

const AuthLayout: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  return (
    <div className="min-h-screen bg-gray-100 flex flex-col justify-center py-12 sm:px-6 lg:px-8">
      <div className="sm:mx-auto sm:w-full sm:max-w-md">
        <div className="flex justify-center">
          <Coffee size={48} className="text-blue-600" />
        </div>
        <h2 className="mt-6 text-center text-3xl font-extrabold text-gray-900">
          ChefComanda
        </h2>
        <p className="mt-2 text-center text-sm text-gray-600">
          Sistema de Controle de Comandas para Restaurantes
        </p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
        <div className="bg-white py-8 px-4 shadow sm:rounded-lg sm:px-10">
          {children}
        </div>
      </div>
      
      <div className="mt-6 text-center text-xs text-gray-500">
        &copy; {new Date().getFullYear()} ChefComanda. Todos os direitos reservados.
      </div>
    </div>
  );
};

export default AuthLayout;