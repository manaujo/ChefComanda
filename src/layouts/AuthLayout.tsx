import React from "react";
import { ChefHat } from "lucide-react";

const AuthLayout: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  return (
    <div className="min-h-screen bg-gradient-to-br from-red-50 via-orange-50 to-yellow-50 dark:from-gray-900 dark:via-gray-800 dark:to-gray-700 flex flex-col justify-center py-12 sm:px-6 lg:px-8 relative overflow-hidden transition-colors duration-300">
      {/* Background Decorations */}
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute -top-40 -right-40 w-80 h-80 bg-gradient-to-br from-red-200/30 to-orange-200/30 dark:from-red-800/20 dark:to-orange-800/20 rounded-full blur-3xl transition-colors duration-300"></div>
        <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-gradient-to-br from-yellow-200/30 to-red-200/30 dark:from-yellow-800/20 dark:to-red-800/20 rounded-full blur-3xl transition-colors duration-300"></div>
        <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-gradient-to-br from-orange-100/20 to-red-100/20 dark:from-orange-800/10 dark:to-red-800/10 rounded-full blur-3xl transition-colors duration-300"></div>
      </div>

      <div className="sm:mx-auto sm:w-full sm:max-w-md">
        {/* Logo will be handled by Login component */}
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
        <div className="bg-white/95 dark:bg-gray-800/95 backdrop-blur-sm py-10 px-6 shadow-2xl rounded-3xl sm:px-12 border border-white/20 dark:border-gray-700/50 relative transition-colors duration-300">
          {/* Subtle inner glow */}
          <div className="absolute inset-0 bg-gradient-to-br from-white/50 to-transparent dark:from-gray-700/30 dark:to-transparent rounded-3xl pointer-events-none transition-colors duration-300"></div>
          <div className="relative z-10">{children}</div>
        </div>
      </div>

      <div className="mt-8 text-center text-xs text-gray-500 dark:text-gray-400 relative z-10">
        &copy; {new Date().getFullYear()} ChefComanda. Todos os direitos
        reservados.
      </div>
    </div>
  );
};

export default AuthLayout;
