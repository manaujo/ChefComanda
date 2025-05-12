import React from 'react';
import { ChefHat as Chef } from 'lucide-react';

const AuthLayout: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-900 dark:to-gray-800 flex flex-col justify-center py-12 sm:px-6 lg:px-8">
      <div className="sm:mx-auto sm:w-full sm:max-w-md">
        <div className="flex flex-col items-center">
          {/* Modern Chef Illustration */}
          <div className="w-32 h-32 mb-6 relative">
            <div className="absolute inset-0 bg-blue-500 rounded-full opacity-10 animate-pulse"></div>
            <Chef className="w-full h-full text-blue-600 p-6" />
          </div>
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
            Chef Comanda
          </h2>
          <p className="mt-2 text-center text-sm text-gray-600 dark:text-gray-400">
            Seu negócio no ritmo da tecnologia
          </p>
        </div>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
        <div className="bg-white dark:bg-gray-800 py-8 px-4 shadow-xl rounded-lg sm:px-10">
          {children}
        </div>
      </div>
      
      <div className="mt-6 text-center text-xs text-gray-500 dark:text-gray-400">
        &copy; {new Date().getFullYear()} ChefComanda. Todos os direitos reservados.
      </div>
    </div>
  );
};

export default AuthLayout;