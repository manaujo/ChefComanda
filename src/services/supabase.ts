import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Missing Supabase environment variables');
}

// Create Supabase client with retry configuration
export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: true
  },
  global: {
    headers: {
      'X-Client-Info': 'restaurant-management-system'
    }
  },
  // Add retry configuration for network issues
  realtime: {
    params: {
      eventsPerSecond: 10
    }
  }
});

// Add connection health check
export const checkSupabaseConnection = async (): Promise<boolean> => {
  try {
    const { data, error } = await supabase
      .from('profiles')
      .select('id')
      .limit(1);
    
    return !error;
  } catch (error) {
    console.error('Supabase connection check failed:', error);
    return false;
  }
};

// Export connection status
export const getConnectionStatus = async (): Promise<'connected' | 'disconnected' | 'error'> => {
  try {
    const isConnected = await checkSupabaseConnection();
    return isConnected ? 'connected' : 'disconnected';
  } catch (error) {
    return 'error';
  }
};