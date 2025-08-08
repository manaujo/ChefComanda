import { useEffect, useState } from 'react';

/**
 * Hook para detectar quando a página fica visível/invisível
 * Útil para pausar operações quando o usuário troca de aba
 */
export const usePageVisibility = () => {
  const [isVisible, setIsVisible] = useState(!document.hidden);

  useEffect(() => {
    const handleVisibilityChange = () => {
      setIsVisible(!document.hidden);
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, []);

  return isVisible;
};

/**
 * Hook para detectar quando a janela ganha/perde foco
 */
export const useWindowFocus = () => {
  const [isFocused, setIsFocused] = useState(document.hasFocus());

  useEffect(() => {
    const handleFocus = () => setIsFocused(true);
    const handleBlur = () => setIsFocused(false);

    window.addEventListener('focus', handleFocus);
    window.addEventListener('blur', handleBlur);

    return () => {
      window.removeEventListener('focus', handleFocus);
      window.removeEventListener('blur', handleBlur);
    };
  }, []);

  return isFocused;
};

/**
 * Hook combinado para detectar se a página está ativa
 */
export const usePageActive = () => {
  const isVisible = usePageVisibility();
  const isFocused = useWindowFocus();

  return isVisible && isFocused;
};