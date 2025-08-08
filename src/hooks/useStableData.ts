import { useRef, useEffect } from 'react';

/**
 * Hook para manter dados estáveis entre re-renderizações
 * Evita recarregamentos desnecessários de dados
 */
export const useStableData = <T>(
  data: T,
  isEqual?: (a: T, b: T) => boolean
): T => {
  const stableRef = useRef<T>(data);
  
  useEffect(() => {
    const hasChanged = isEqual 
      ? !isEqual(stableRef.current, data)
      : stableRef.current !== data;
      
    if (hasChanged) {
      stableRef.current = data;
    }
  }, [data, isEqual]);
  
  return stableRef.current;
};

/**
 * Hook para prevenir execução de efeitos desnecessários
 */
export const useStableEffect = (
  effect: () => void | (() => void),
  deps: any[],
  isEqual?: (a: any[], b: any[]) => boolean
) => {
  const depsRef = useRef<any[]>(deps);
  const cleanupRef = useRef<(() => void) | void>();
  
  useEffect(() => {
    const hasChanged = isEqual
      ? !isEqual(depsRef.current, deps)
      : JSON.stringify(depsRef.current) !== JSON.stringify(deps);
    
    if (hasChanged) {
      // Cleanup previous effect
      if (cleanupRef.current) {
        cleanupRef.current();
      }
      
      // Run new effect
      cleanupRef.current = effect();
      depsRef.current = deps;
    }
    
    return () => {
      if (cleanupRef.current) {
        cleanupRef.current();
      }
    };
  }, deps);
};