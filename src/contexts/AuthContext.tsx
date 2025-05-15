import React, { createContext, useContext, useState, useEffect } from 'react';
import { createClient, SupabaseClient, User } from '@supabase/supabase-js';
import toast from 'react-hot-toast';
import { useNavigate } from 'react-router-dom';

interface AuthState {
  user: User | null;
  userRole: 'admin' | 'kitchen' | 'waiter' | null;
  loading: boolean;
  displayName: string | null;
}

interface AuthContextData extends AuthState {
  signUp: (data: SignUpData) => Promise<void>;
  signIn: (email: string, password: string) => Promise<void>;
  signOut: () => Promise<void>;
  updateProfile: (data: UpdateProfileData) => Promise<void>;
}

interface SignUpData {
  email: string;
  password: string;
  role: 'admin' | 'kitchen' | 'waiter';
  name: string;
}

interface UpdateProfileData {
  name?: string;
  role?: 'admin' | 'kitchen' | 'waiter';
}

const AuthContext = createContext<AuthContextData>({} as AuthContextData);

const supabase: SupabaseClient = createClient(
  import.meta.env.VITE_SUPABASE_URL,
  import.meta.env.VITE_SUPABASE_ANON_KEY
);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [state, setState] = useState<AuthState>({
    user: null,
    userRole: null,
    loading: true,
    displayName: null,
  });
  
  const navigate = useNavigate();

  useEffect(() => {
    // Check active sessions and subscribe to auth changes
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session?.user) {
        loadUserData(session.user);
      }
      setState(prev => ({ ...prev, loading: false }));
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session?.user) {
        loadUserData(session.user);
      } else {
        setState({ user: null, userRole: null, loading: false, displayName: null });
      }
    });

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  const loadUserData = async (user: User) => {
    try {
      // Load user role and profile data
      const [{ data: roleData, error: roleError }, { data: profileData, error: profileError }] = await Promise.all([
        supabase
          .from('user_roles')
          .select('role')
          .eq('user_id', user.id)
          .single(),
        supabase
          .from('profiles')
          .select('name')
          .eq('id', user.id)
          .single()
      ]);

      if (roleError) throw roleError;
      if (profileError && profileError.code !== 'PGRST116') throw profileError;

      setState({
        user,
        userRole: roleData?.role || null,
        loading: false,
        displayName: profileData?.name || user.user_metadata?.name || null,
      });

      // Redirect based on user role
      if (roleData?.role) {
        switch (roleData.role) {
          case 'admin':
            navigate('/');
            break;
          case 'kitchen':
            navigate('/comandas');
            break;
          case 'waiter':
            navigate('/mesas');
            break;
        }
      }
    } catch (error) {
      console.error('Error loading user data:', error);
      toast.error('Erro ao carregar dados do usuário');
    }
  };

  const signUp = async ({ email, password, role, name }: SignUpData) => {
    try {
      const { data: { user }, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: { name },
        },
      });

      if (error) throw error;
      if (!user) throw new Error('Erro ao criar usuário');

      // Create user profile
      const { error: profileError } = await supabase
        .from('profiles')
        .insert({ id: user.id, name });

      if (profileError) throw profileError;

      // Create user role record
      const { error: roleError } = await supabase
        .from('user_roles')
        .insert({ user_id: user.id, role });

      if (roleError) throw roleError;

      toast.success('Conta criada com sucesso! Verifique seu e-mail.');
      navigate('/auth/verify-email');
    } catch (error) {
      console.error('Error signing up:', error);
      toast.error('Erro ao criar conta');
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
      toast.error('E-mail ou senha incorretos');
      throw error;
    }
  };

  const signOut = async () => {
    try {
      const { error } = await supabase.auth.signOut();
      if (error) throw error;
      setState({ user: null, userRole: null, loading: false, displayName: null });
      toast.success('Logout realizado com sucesso!');
      navigate('/login');
    } catch (error) {
      console.error('Error signing out:', error);
      toast.error('Erro ao fazer logout');
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

      toast.success('Perfil atualizado com sucesso!');
      await loadUserData(state.user);
    } catch (error) {
      console.error('Error updating profile:', error);
      toast.error('Erro ao atualizar perfil');
      throw error;
    }
  };

  return (
    <AuthContext.Provider
      value={{
        ...state,
        signUp,
        signIn,
        signOut,
        updateProfile,
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