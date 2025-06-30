import React, { createContext, useContext, useState, useEffect } from 'react';
import { createClient, SupabaseClient, User } from '@supabase/supabase-js';
import { DatabaseService } from '../services/database';
import StripeService from '../services/StripeService';
import toast from 'react-hot-toast';
import { useNavigate } from 'react-router-dom';

interface AuthState {
  user: User | null;
  userRole: 'admin' | 'kitchen' | 'waiter' | 'cashier' | 'stock' | null;
  loading: boolean;
  displayName: string | null;
  isEmployee: boolean;
  employeeData: any | null;
  currentPlan: string | null;
}

interface AuthContextData extends AuthState {
  signUp: (data: SignUpData) => Promise<void>;
  signIn: (email: string, password: string) => Promise<void>;
  signInEmployee: (cpf: string, password: string) => Promise<void>;
  signOut: () => Promise<void>;
  updateProfile: (data: UpdateProfileData) => Promise<void>;
  refreshSubscription: () => Promise<void>;
}

interface SignUpData {
  email: string;
  password: string;
  role: 'admin' | 'kitchen' | 'waiter' | 'cashier' | 'stock';
  name: string;
  cpf: string;
}

interface UpdateProfileData {
  name?: string;
  role?: 'admin' | 'kitchen' | 'waiter' | 'cashier' | 'stock';
}

const AuthContext = createContext<AuthContextData>({} as AuthContextData);

const supabase: SupabaseClient = createClient(
  import.meta.env.VITE_SUPABASE_URL,
  import.meta.env.VITE_SUPABASE_ANON_KEY,
  {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: true
    }
  }
);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [state, setState] = useState<AuthState>({
    user: null,
    userRole: null,
    loading: true,
    displayName: null,
    isEmployee: false,
    employeeData: null,
    currentPlan: null,
  });
  
  const navigate = useNavigate();
  const [initialLoadComplete, setInitialLoadComplete] = useState(false);
  const [initialRedirectDone, setInitialRedirectDone] = useState(false);

  useEffect(() => {
    // Check active sessions and subscribe to auth changes
    const initializeAuth = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        
        if (session?.user) {
          await loadUserData(session.user);
        } else {
          // Check for employee session
          await checkEmployeeSession();
        }
      } catch (error) {
        console.error('Error during auth initialization:', error);
        setState(prev => ({ ...prev, loading: false }));
      } finally {
        setInitialLoadComplete(true);
      }
    };

    initializeAuth();

    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (_event, session) => {
      if (session?.user) {
        await loadUserData(session.user);
      } else {
        setState({ 
          user: null, 
          userRole: null, 
          loading: false, 
          displayName: null,
          isEmployee: false,
          employeeData: null,
          currentPlan: null,
        });
      }
    });

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  // Effect to handle initial redirect after data is loaded
  useEffect(() => {
    if (initialLoadComplete && !initialRedirectDone && !state.loading) {
      if (state.user || state.isEmployee) {
        redirectByRole(state.userRole || 'admin');
        setInitialRedirectDone(true);
      }
    }
  }, [initialLoadComplete, initialRedirectDone, state.loading, state.user, state.isEmployee, state.userRole]);

  const checkEmployeeSession = async () => {
    try {
      const employeeToken = localStorage.getItem('employee_token');
      if (employeeToken) {
        const { data, error } = await supabase
          .from('employee_sessions')
          .select(`
            employee_id,
            expires_at,
            employees!inner(
              id,
              name,
              role,
              company_id,
              company_profiles!inner(name)
            )
          `)
          .eq('token', employeeToken)
          .gt('expires_at', new Date().toISOString())
          .single();

        if (error) throw error;

        if (data) {
          setState({
            user: null,
            userRole: data.employees.role as any,
            loading: false,
            displayName: data.employees.name,
            isEmployee: true,
            employeeData: data.employees,
            currentPlan: null,
          });
          return;
        }
      }
    } catch (error) {
      console.error('Error checking employee session:', error);
      localStorage.removeItem('employee_token');
    }
    
    setState(prev => ({ ...prev, loading: false }));
  };

  const loadUserData = async (user: User) => {
    try {
      // Load user role and profile data
      const [{ data: roleData, error: roleError }, { data: profileData, error: profileError }] = await Promise.all([
        supabase
          .from('user_roles')
          .select('role')
          .eq('user_id', user.id)
          .maybeSingle(),
        supabase
          .from('profiles')
          .select('name')
          .eq('id', user.id)
          .maybeSingle()
      ]);

      if (roleError && roleError.code !== 'PGRST116') throw roleError;
      if (profileError && profileError.code !== 'PGRST116') throw profileError;

      // Load subscription data
      let currentPlan = null;
      try {
        const subscription = await StripeService.getUserSubscription();
        if (subscription?.price_id) {
          const { getProductByPriceId } = await import('../stripe-config');
          const product = getProductByPriceId(subscription.price_id);
          currentPlan = product?.name || null;
        }
      } catch (error) {
        console.error('Error loading subscription:', error);
      }

      setState({
        user,
        userRole: roleData?.role || 'admin',
        loading: false,
        displayName: profileData?.name || user.user_metadata?.name || null,
        isEmployee: false,
        employeeData: null,
        currentPlan,
      });
    } catch (error) {
      console.error('Error loading user data:', error);
      // Only show toast for non-network errors
      if (!(error instanceof Error && error.message.includes('Failed to fetch'))) {
        toast.error('Erro ao carregar dados do usuário');
      }
      setState(prev => ({ ...prev, loading: false }));
    }
  };

  const redirectByRole = (role: string) => {
    // Only redirect if this is the initial login, not when returning to the tab
    if (!initialLoadComplete) return;
    
    switch (role) {
      case 'admin':
        navigate('/');
        break;
      case 'kitchen':
        navigate('/comandas');
        break;
      case 'waiter':
        navigate('/mesas');
        break;
      case 'cashier':
        navigate('/caixa');
        break;
      case 'stock':
        navigate('/estoque');
        break;
      default:
        navigate('/');
    }
  };

  const refreshSubscription = async () => {
    if (!state.user) return;
    
    try {
      const subscription = await StripeService.getUserSubscription();
      let currentPlan = null;
      
      if (subscription?.price_id) {
        const { getProductByPriceId } = await import('../stripe-config');
        const product = getProductByPriceId(subscription.price_id);
        currentPlan = product?.name || null;
      }
      
      setState(prev => ({ ...prev, currentPlan }));
    } catch (error) {
      console.error('Error refreshing subscription:', error);
    }
  };

  const signUp = async ({ email, password, role, name, cpf }: SignUpData) => {
    try {
      // Check if CPF already exists in profiles table
      const { data: existingProfile, error: checkError } = await supabase
        .from('profiles')
        .select('id')
        .eq('cpf', cpf)
        .maybeSingle();

      if (checkError && checkError.code !== 'PGRST116') {
        throw checkError;
      }

      if (existingProfile) {
        throw new Error('CPF já cadastrado. Por favor, utilize outro CPF ou faça login.');
      }

      // Sign up the user with metadata
      const { data: { user }, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: { 
            name, 
            cpf 
          },
        },
      });

      if (error) throw error;
      if (!user) throw new Error('Erro ao criar usuário');

      // Wait a moment for the trigger to complete
      await new Promise(resolve => setTimeout(resolve, 1000));

      // Create or update user profile (upsert to handle trigger conflicts)
      const { error: profileError } = await supabase
        .from('profiles')
        .upsert({ 
          id: user.id, 
          name,
          cpf: cpf
        }, {
          onConflict: 'id'
        });

      if (profileError) {
        console.error('Profile creation error:', profileError);
        // Don't throw here as the user was created successfully
        // The profile might have been created by the trigger
      }

      // Create user role record (upsert to handle potential conflicts)
      const { error: roleError } = await supabase
        .from('user_roles')
        .upsert({ 
          user_id: user.id, 
          role 
        }, {
          onConflict: 'user_id'
        });

      if (roleError) {
        console.error('Role creation error:', roleError);
        // Don't throw here as the user was created successfully
      }

      // Create audit log (optional, don't fail signup if this fails)
      try {
        await DatabaseService.createAuditLog({
          user_id: user.id,
          action_type: 'create',
          entity_type: 'user',
          entity_id: user.id,
          details: { name, role, cpf }
        });
      } catch (auditError) {
        console.error('Audit log creation error:', auditError);
        // Don't fail signup for audit log errors
      }

      toast.success('Conta criada com sucesso! Verifique seu e-mail.');
      navigate('/auth/verify-email');
    } catch (error) {
      console.error('Error signing up:', error);
      if (error instanceof Error) {
        if (error.message.includes('Failed to fetch')) {
          toast.error('Erro de conexão. Verifique sua internet e tente novamente.');
        } else if (error.message.includes('CPF já cadastrado')) {
          toast.error(error.message);
        } else if (error.message.includes('User already registered')) {
          toast.error('E-mail já cadastrado. Por favor, utilize outro e-mail ou faça login.');
        } else if (error.message.includes('Database error saving new user')) {
          toast.error('Erro interno do servidor. Tente novamente em alguns minutos.');
        } else {
          toast.error('Erro ao criar conta');
        }
      } else {
        toast.error('Erro ao criar conta');
      }
      throw error;
    }
  };

  const signIn = async (email: string, password: string) => {
    try {
      const { error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) throw error;
      
      toast.success('Login realizado com sucesso!');
    } catch (error) {
      console.error('Error signing in:', error);
      if (error instanceof Error && error.message.includes('Failed to fetch')) {
        toast.error('Erro de conexão. Verifique sua internet e tente novamente.');
      } else if (error instanceof Error && error.message.includes('Invalid login credentials')) {
        toast.error('E-mail ou senha incorretos');
      } else {
        toast.error('Erro ao fazer login');
      }
    }
  };

  const signInEmployee = async (cpf: string, password: string) => {
    try {
      const { data, error } = await supabase.rpc('authenticate_employee', {
        p_cpf: cpf,
        p_password: password
      });

      if (error) throw error;
      if (!data || data.length === 0) {
        throw new Error('CPF ou senha incorretos');
      }

      const employee = data[0];

      // Create session token
      const token = crypto.randomUUID();
      const expiresAt = new Date();
      expiresAt.setHours(expiresAt.getHours() + 8); // 8 hours session

      const { error: sessionError } = await supabase
        .from('employee_sessions')
        .insert({
          employee_id: employee.employee_id,
          token,
          expires_at: expiresAt.toISOString()
        });

      if (sessionError) throw sessionError;

      // Store token in localStorage
      localStorage.setItem('employee_token', token);

      // Update last login
      await supabase
        .from('employee_auth')
        .update({ last_login: new Date().toISOString() })
        .eq('employee_id', employee.employee_id);

      // Set state
      setState({
        user: null,
        userRole: employee.role,
        loading: false,
        displayName: employee.name,
        isEmployee: true,
        employeeData: employee,
        currentPlan: null,
      });

      toast.success('Login realizado com sucesso!');
      redirectByRole(employee.role);
    } catch (error) {
      console.error('Error signing in employee:', error);
      toast.error(error instanceof Error ? error.message : 'Erro ao fazer login');
    }
  };

  const signOut = async () => {
    try {
      if (state.isEmployee) {
        // Remove employee session
        const token = localStorage.getItem('employee_token');
        if (token) {
          try {
            await supabase
              .from('employee_sessions')
              .delete()
              .eq('token', token);
          } catch (error) {
            console.error('Error removing employee session:', error);
            // Continue with logout even if session removal fails
          }
          localStorage.removeItem('employee_token');
        }
      } else if (state.user) {
        // Only attempt to sign out if there's an active Supabase user session
        try {
          const { error } = await supabase.auth.signOut();
          if (error) {
            // Handle specific session-related errors gracefully
            const sessionErrors = [
              'Auth session missing',
              'session_not_found',
              'Session from session_id claim in JWT does not exist',
              'Invalid session'
            ];
            
            const isSessionError = sessionErrors.some(errMsg => 
              error.message.includes(errMsg) || 
              (error as any).code === 'session_not_found'
            );
            
            if (isSessionError) {
              console.log('Session already expired or invalid, proceeding with local logout');
            } else {
              throw error;
            }
          }
        } catch (error) {
          // If it's a session-related error or network error, proceed with local logout
          if (error instanceof Error) {
            const sessionErrors = [
              'Auth session missing',
              'session_not_found',
              'Session from session_id claim in JWT does not exist',
              'Invalid session',
              'Failed to fetch'
            ];
            
            const isSessionOrNetworkError = sessionErrors.some(errMsg => 
              error.message.includes(errMsg)
            ) || (error as any).code === 'session_not_found';
            
            if (isSessionOrNetworkError) {
              console.log('Session or network error during logout, proceeding with local logout:', error.message);
            } else {
              throw error;
            }
          } else {
            throw error;
          }
        }
      }
      
      setState({ 
        user: null, 
        userRole: null, 
        loading: false, 
        displayName: null,
        isEmployee: false,
        employeeData: null,
        currentPlan: null,
      });
      toast.success('Logout realizado com sucesso!');
      navigate('/login');
    } catch (error) {
      console.error('Error signing out:', error);
      if (error instanceof Error && error.message.includes('Failed to fetch')) {
        toast.error('Erro de conexão. Verifique sua internet e tente novamente.');
      } else {
        toast.error('Erro ao fazer logout');
      }
      throw error;
    }
  };

  const updateProfile = async (data: UpdateProfileData) => {
    try {
      if (!state.user) {
        throw new Error('Usuário não autenticado');
      }

      // Update auth user metadata
      if (data.name) {
        const { error: userError } = await supabase.auth.updateUser({
          data: { name: data.name },
        });

        if (userError) throw userError;

        // Update profile name
        const { error: profileError } = await supabase
          .from('profiles')
          .upsert({ id: state.user.id, name: data.name });

        if (profileError) throw profileError;
      }

      // Update user role if provided
      if (data.role) {
        const { error: roleError } = await supabase
          .from('user_roles')
          .update({ role: data.role })
          .eq('user_id', state.user.id);

        if (roleError) throw roleError;
      }

      // Create audit log
      await DatabaseService.createAuditLog({
        user_id: state.user.id,
        action_type: 'update',
        entity_type: 'user',
        entity_id: state.user.id,
        details: data
      });

      toast.success('Perfil atualizado com sucesso!');
      await loadUserData(state.user);
    } catch (error) {
      console.error('Error updating profile:', error);
      if (error instanceof Error && error.message.includes('Failed to fetch')) {
        toast.error('Erro de conexão. Verifique sua internet e tente novamente.');
      } else {
        toast.error('Erro ao atualizar perfil');
      }
      throw error;
    }
  };

  return (
    <AuthContext.Provider
      value={{
        ...state,
        signUp,
        signIn,
        signInEmployee,
        signOut,
        updateProfile,
        refreshSubscription,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};