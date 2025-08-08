import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';

/**
 * Hook para prevenir recarregamentos desnecessários da página
 * Salva o estado da rota atual no sessionStorage
 */
export const usePreventReload = () => {
  const location = useLocation();

  useEffect(() => {
    // Salvar a rota atual no sessionStorage
    sessionStorage.setItem('currentRoute', location.pathname);
  }, [location.pathname]);

  useEffect(() => {
    // Verificar se há uma rota salva ao carregar a página
    const savedRoute = sessionStorage.getItem('currentRoute');
    
    if (savedRoute && savedRoute !== location.pathname) {
      // Se a rota salva é diferente da atual, significa que houve um reload
      console.log('Page was reloaded, restoring route:', savedRoute);
    }
  }, []);

  return {
    currentRoute: location.pathname,
    savedRoute: sessionStorage.getItem('currentRoute')
  };
};