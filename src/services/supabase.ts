import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Missing Supabase environment variables');
}

// Debug logging to verify environment variables
console.log('Supabase URL:', supabaseUrl);
console.log('Supabase Anon Key (first 10 chars):', supabaseAnonKey ? supabaseAnonKey.substring(0, 10) + '...' : 'N/A');

// Create Supabase client with retry configuration and better error handling
export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: true
  },
  global: {
    headers: {
      'X-Client-Info': 'restaurant-management-system'
    },
    fetch: (url, options = {}) => {
      console.log('Supabase fetch request to:', url);
      return fetch(url, {
        ...options,
        // Add timeout to prevent hanging requests
        signal: AbortSignal.timeout(10000) // 10 second timeout
      }).catch(error => {
        console.error('Supabase fetch error:', error);
        throw error;
      });
    }
  },
  // Add retry configuration for network issues
  realtime: {
    params: {
      eventsPerSecond: 10
    }
  }
});

// Add connection health check with better error handling
export const checkSupabaseConnection = async (): Promise<boolean> => {
  try {
    console.log('Checking Supabase connection...');
    
    // Try a simple query to test connection
    const { data, error } = await supabase
      .from('profiles')
      .select('id')
      .limit(1);
    
    if (error) {
      console.error('Supabase connection check failed with error:', error);
      return false;
    }
    
    console.log('Supabase connection check successful');
    return true;
  } catch (error) {
    console.error('Supabase connection check failed with exception:', error);
    return false;
  }
};

// Export connection status with detailed error reporting
export const getConnectionStatus = async (): Promise<'connected' | 'disconnected' | 'error'> => {
  try {
    const isConnected = await checkSupabaseConnection();
    return isConnected ? 'connected' : 'disconnected';
  } catch (error) {
    console.error('Error getting connection status:', error);
    return 'error';
  }
};

// Add a function to validate environment variables
export const validateSupabaseConfig = (): { isValid: boolean; errors: string[] } => {
  const errors: string[] = [];
  
  if (!supabaseUrl) {
    errors.push('VITE_SUPABASE_URL is missing');
  } else if (!supabaseUrl.startsWith('https://')) {
    errors.push('VITE_SUPABASE_URL should start with https://');
  } else if (!supabaseUrl.includes('.supabase.co')) {
    errors.push('VITE_SUPABASE_URL should contain .supabase.co');
  }
  
  if (!supabaseAnonKey) {
    errors.push('VITE_SUPABASE_ANON_KEY is missing');
  } else if (supabaseAnonKey.length < 100) {
    errors.push('VITE_SUPABASE_ANON_KEY appears to be too short');
  }
  
  return {
    isValid: errors.length === 0,
    errors
  };
};

// Log validation results on module load
const validation = validateSupabaseConfig();
if (!validation.isValid) {
  console.error('Supabase configuration validation failed:', validation.errors);
} else {
  console.log('Supabase configuration validation passed');
}