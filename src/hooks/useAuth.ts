import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../services/supabase';

/**
 * Hook para garantir que dados sejam carregados apenas para o usuário logado
 */
export const useUserData = () => {
  const { user } = useAuth();
  
  const getUserRestaurant = async () => {
    if (!user) return null;
    
    const { data, error } = await supabase
      .from('restaurantes')
      .select('*')
      .eq('user_id', user.id)
      .single();
    
    if (error) throw error;
    return data;
  };
  
  const getUserCompany = async () => {
    if (!user) return null;
    
    const { data, error } = await supabase
      .from('company_profiles')
      .select('*')
      .eq('user_id', user.id)
      .single();
    
    if (error) throw error;
    return data;
  };
  
  return {
    user,
    getUserRestaurant,
    getUserCompany
  };
};