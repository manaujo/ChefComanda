import React, { createContext, useContext, useState, useEffect } from "react";
import { createClient, SupabaseClient, User } from "@supabase/supabase-js";
import { DatabaseService } from "../services/database";
import StripeService from "../services/StripeService";
import toast from "react-hot-toast";
import { useNavigate, useLocation } from "react-router-dom";

interface AuthState {
  user: User | null;
  userRole: "admin" | "kitchen" | "waiter" | "cashier" | "stock" | null;
  loading: boolean;
  displayName: string | null;
  isEmployee: boolean;
  employeeData: any | null;
  currentPlan: string | null;
}

interface AuthContextData extends AuthState {
  signUp: (data: SignUpData) => Promise<void>;
  signIn: (email: string, password: string) => Promise<void>;
  signOut: () => Promise<void>;
  updateProfile: (data: UpdateProfileData) => Promise<void>;
  refreshSubscription: () => Promise<void>;
}

interface SignUpData {
  email: string;
  password: string;
  role: "admin" | "kitchen" | "waiter" | "cashier" | "stock";
  name: string;
  cpf: string;
}

interface UpdateProfileData {
  name?: string;
  role?: "admin" | "kitchen" | "waiter" | "cashier" | "stock";
}

const AuthContext = createContext<AuthContextData>({} as AuthContextData);

const supabase: SupabaseClient = createClient(
  import.meta.env.VITE_SUPABASE_URL,
  import.meta.env.VITE_SUPABASE_ANON_KEY
);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({
  children
}) => {
  const [state, setState] = useState<AuthState>({
    user: null,
    userRole: null,
    loading: true,
    displayName: null,
    isEmployee: false,
    employeeData: null,
    currentPlan: null
  });

  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    // Check active sessions and subscribe to auth changes
    supabase.auth.getSession()
      .then(({ data: { session } }) => {
        if (session?.user) {
          loadUserData(session.user);
        } else {
          // Check for employee session
          checkEmployeeSession();
        }
      })
      .catch(async (error) => {
        console.error("Error getting session:", error);
        // Clear any invalid tokens
        try {
          await supabase.auth.signOut();
        } catch (signOutError) {
          console.error("Error signing out:", signOutError);
        }
        setState({
          user: null,
          userRole: null,
          loading: false,
          displayName: null,
          isEmployee: false,
          employeeData: null,
          currentPlan: null
        });
      });

    const {
      data: { subscription }
    } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session?.user) {
        loadUserData(session.user);
      } else {
        setState({
          user: null,
          userRole: null,
          loading: false,
          displayName: null,
          isEmployee: false,
          employeeData: null,
          currentPlan: null
        });
      }
    });

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  const checkEmployeeSession = async () => {
    try {
      const employeeToken = localStorage.getItem("employee_token");
      if (employeeToken) {
        const { data, error } = await supabase
          .from("employee_sessions")
          .select(
            `
            employee_id,
            expires_at,
            employees!inner(
              id,
              name,
              role,
              company_id,
              company_profiles!inner(name)
            )
          `
          )
          .eq("token", employeeToken)
          .gt("expires_at", new Date().toISOString())
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
            currentPlan: null
          });
          return;
        }
      }
    } catch (error) {
      console.error("Error checking employee session:", error);
      localStorage.removeItem("employee_token");
    }

    setState((prev) => ({ ...prev, loading: false }));
  };

  const loadUserData = async (user: User) => {
    try {
      console.log("Loading user data for:", user.id);

      // Ensure user has a restaurant - create one if it doesn't exist
      let { data: restaurante, error: restauranteError } = await supabase
        .from("restaurantes")
        .select("*")
        .eq("user_id", user.id)
        .maybeSingle();

      if (restauranteError && restauranteError.code !== "PGRST116") {
        console.error("Error checking restaurant:", restauranteError);
      }

      // Create restaurant if it doesn't exist
      if (!restaurante) {
        console.log("Creating restaurant for new user:", user.id);
        const { data: newRestaurante, error: createError } = await supabase
          .from("restaurantes")
          .insert({
            user_id: user.id,
            nome: `Restaurante de ${user.user_metadata?.name || 'Usuário'}`,
            telefone: "",
            configuracoes: {}
          })
          .select()
          .single();

        if (createError) {
          console.error("Error creating restaurant:", createError);
        } else {
          restaurante = newRestaurante;
          console.log("Restaurant created successfully:", restaurante.id);
        }
      }

      // Load user role and profile data with better error handling
      const [roleResult, profileResult] = await Promise.allSettled([
        supabase
          .from("user_roles")
          .select("role")
          .eq("user_id", user.id)
          .maybeSingle(),
        supabase.from("profiles").select("name").eq("id", user.id).maybeSingle()
      ]);

      let roleData = null;
      let profileData = null;

      if (roleResult.status === "fulfilled") {
        if (
          roleResult.value.error &&
          roleResult.value.error.code !== "PGRST116"
        ) {
          console.error("Role loading error:", roleResult.value.error);
        } else {
          roleData = roleResult.value.data;
        }
      } else {
        console.error("Role loading failed:", roleResult.reason);
      }

      if (profileResult.status === "fulfilled") {
        if (
          profileResult.value.error &&
          profileResult.value.error.code !== "PGRST116"
        ) {
          console.error("Profile loading error:", profileResult.value.error);
        } else {
          profileData = profileResult.value.data;
        }
      } else {
        console.error("Profile loading failed:", profileResult.reason);
      }

      // Load subscription data with error handling
      let currentPlan = null;
      try {
        const subscription = await StripeService.getUserSubscription();
        if (subscription?.price_id) {
          const { getProductByPriceId } = await import("../stripe-config");
          const product = getProductByPriceId(subscription.price_id);
          currentPlan = product?.name || null;
        }
      } catch (error) {
        console.error("Error loading subscription:", error);
      }

      const userRole = roleData?.role || "admin";

      setState({
        user,
        userRole,
        loading: false,
        displayName: profileData?.name || user.user_metadata?.name || null,
        isEmployee: false,
        employeeData: null,
        currentPlan
      });

      console.log("User data loaded successfully, role:", userRole);

      // Redirect based on user role
      if (shouldRedirect()) {
        redirectByRole(userRole);
      }
    } catch (error) {
      console.error("Error loading user data:", error);
      // Only show toast for non-network errors
      if (
        !(error instanceof Error && error.message.includes("Failed to fetch"))
      ) {
        toast.error("Erro ao carregar dados do usuário");
      }
      setState((prev) => ({ ...prev, loading: false }));
    }
  };

  const shouldRedirect = () => {
    // Don't redirect if user is already on a dashboard page
    const currentPath = location.pathname;
    const isAuthPage = ["/login", "/signup", "/auth/", "/landing"].some(
      (path) => currentPath.startsWith(path)
    );

    // Only redirect if on auth pages or landing
    return isAuthPage;
  };

  const redirectByRole = (role: string) => {
    const currentPath = location.pathname;

    console.log("Redirecting user with role:", role, "from path:", currentPath);

    switch (role) {
      case "admin":
        navigate("/dashboard");
        break;
      case "kitchen":
        navigate("/dashboard/comandas");
        break;
      case "waiter":
        navigate("/dashboard/mesas");
        break;
      case "cashier":
        navigate("/dashboard/caixa");
        break;
      case "stock":
        navigate("/dashboard/estoque");
        break;
      default:
        navigate("/dashboard");
    }
  };

  const refreshSubscription = async () => {
    if (!state.user) return;

    try {
      const subscription = await StripeService.getUserSubscription();
      let currentPlan = null;

      if (subscription?.price_id) {
        const { getProductByPriceId } = await import("../stripe-config");
        const product = getProductByPriceId(subscription.price_id);
        currentPlan = product?.name || null;
      }

      setState((prev) => ({ ...prev, currentPlan }));
    } catch (error) {
      console.error("Error refreshing subscription:", error);
    }
  };

  const signUp = async ({ email, password, role, name, cpf }: SignUpData) => {
    try {
      console.log("Starting signup process for:", email);

      // Check if CPF already exists in profiles table
      const { data: existingProfile, error: checkError } = await supabase
        .from("profiles")
        .select("id")
        .eq("cpf", cpf)
        .maybeSingle();

      if (checkError && checkError.code !== "PGRST116") {
        console.error("CPF check error:", checkError);
        throw checkError;
      }

      if (existingProfile) {
        throw new Error(
          "CPF já cadastrado. Por favor, utilize outro CPF ou faça login."
        );
      }

      // Sign up the user with metadata
      const {
        data: { user },
        error
      } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            name,
            cpf
          }
        }
      });

      if (error) {
        console.error("Supabase signup error:", error);
        throw error;
      }
      if (!user) throw new Error("Erro ao criar usuário");

      console.log("User created successfully:", user.id);

      // Wait a moment for the trigger to complete
      await new Promise((resolve) => setTimeout(resolve, 1000));

      // Create or update user profile (upsert to handle trigger conflicts)
      const { error: profileError } = await supabase.from("profiles").upsert(
        {
          id: user.id,
          name,
          cpf: cpf
        },
        {
          onConflict: "id"
        }
      );

      if (profileError) {
        console.error("Profile creation error:", profileError);
        // Don't throw here as the user was created successfully
        // The profile might have been created by the trigger
      }

      // Create user role record (upsert to handle potential conflicts)
      const { error: roleError } = await supabase.from("user_roles").upsert(
        {
          user_id: user.id,
          role
        },
        {
          onConflict: "user_id"
        }
      );

      if (roleError) {
        console.error("Role creation error:", roleError);
        // Don't throw here as the user was created successfully
      }

      // Create audit log (optional, don't fail signup if this fails)
      try {
        await DatabaseService.createAuditLog({
          user_id: user.id,
          action_type: "create",
          entity_type: "user",
          entity_id: user.id,
          details: { name, role, cpf }
        });
      } catch (auditError) {
        console.error("Audit log creation error:", auditError);
        // Don't fail signup for audit log errors
      }

      toast.success("Conta criada com sucesso! Verifique seu e-mail.");
      navigate("/auth/verify-email");
    } catch (error) {
      console.error("Error signing up:", error);
      if (error instanceof Error) {
        if (error.message.includes("Failed to fetch")) {
          toast.error(
            "Erro de conexão. Verifique sua internet e tente novamente."
          );
        } else if (error.message.includes("CPF já cadastrado")) {
          toast.error(error.message);
        } else if (error.message.includes("User already registered")) {
          toast.error(
            "E-mail já cadastrado. Por favor, utilize outro e-mail ou faça login."
          );
        } else if (error.message.includes("Database error saving new user")) {
          toast.error(
            "Erro interno do servidor. Tente novamente em alguns minutos."
          );
        } else {
          toast.error("Erro ao criar conta");
        }
      } else {
        toast.error("Erro ao criar conta");
      }
      throw error;
    }
  };

  const signIn = async (email: string, password: string) => {
    try {
      console.log("Starting signin process for:", email);

      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password
      });

      if (error) {
        console.error("Supabase signin error:", error);

        // Handle specific error cases with more detailed error mapping
        if (error.message.includes("Invalid login credentials")) {
          throw new Error("E-mail ou senha incorretos");
        } else if (error.message.includes("Failed to fetch")) {
          throw new Error(
            "Erro de conexão. Verifique sua internet e tente novamente."
          );
        } else if (error.message.includes("Database error granting user")) {
          throw new Error(
            "Erro de configuração do banco de dados. Contate o suporte técnico."
          );
        } else if (error.message.includes("Database error")) {
          throw new Error(
            "Erro interno do servidor. Tente novamente em alguns minutos ou contate o suporte."
          );
        } else if (error.message.includes("Email not confirmed")) {
          throw new Error(
            "E-mail não confirmado. Verifique sua caixa de entrada."
          );
        } else if (error.message.includes("Too many requests")) {
          throw new Error(
            "Muitas tentativas de login. Aguarde alguns minutos antes de tentar novamente."
          );
        } else {
          // For any other auth errors, provide a generic but helpful message
          throw new Error(
            "Erro de autenticação. Verifique suas credenciais e tente novamente."
          );
        }
      }

      console.log("Signin successful for user:", data.user?.id);

      // Force immediate data loading and redirect after successful login
      if (data.user) {
        await loadUserData(data.user);
      }

      toast.success("Login realizado com sucesso!");
    } catch (error) {
      console.error("Error signing in:", error);
      throw error;
    }
  };

  const signOut = async () => {
    try {
      if (state.isEmployee) {
        // Remove employee session
        const token = localStorage.getItem("employee_token");
        if (token) {
          try {
            await supabase
              .from("employee_sessions")
              .delete()
              .eq("token", token);
          } catch (error) {
            console.error("Error removing employee session:", error);
            // Continue with logout even if session removal fails
          }
          localStorage.removeItem("employee_token");
        }
      } else if (state.user) {
        // Only attempt to sign out if there's an active Supabase user session
        try {
          const { error } = await supabase.auth.signOut();
          if (error) {
            // Handle specific session-related errors gracefully
            const sessionErrors = [
              "Auth session missing",
              "session_not_found",
              "Session from session_id claim in JWT does not exist",
              "Invalid session"
            ];

            const isSessionError = sessionErrors.some(
              (errMsg) =>
                error.message.includes(errMsg) ||
                (error as any).code === "session_not_found"
            );

            if (isSessionError) {
              console.log(
                "Session already expired or invalid, proceeding with local logout"
              );
            } else {
              throw error;
            }
          }
        } catch (error) {
          // If it's a session-related error or network error, proceed with local logout
          if (error instanceof Error) {
            const sessionErrors = [
              "Auth session missing",
              "session_not_found",
              "Session from session_id claim in JWT does not exist",
              "Invalid session",
              "Failed to fetch"
            ];

            const isSessionOrNetworkError =
              sessionErrors.some((errMsg) => error.message.includes(errMsg)) ||
              (error as any).code === "session_not_found";

            if (isSessionOrNetworkError) {
              console.log(
                "Session or network error during logout, proceeding with local logout:",
                error.message
              );
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
        currentPlan: null
      });
      toast.success("Logout realizado com sucesso!");
      navigate("/landing");
    } catch (error) {
      console.error("Error signing out:", error);
      if (error instanceof Error && error.message.includes("Failed to fetch")) {
        toast.error(
          "Erro de conexão. Verifique sua internet e tente novamente."
        );
      } else {
        toast.error("Erro ao fazer logout");
      }
      throw error;
    }
  };

  const updateProfile = async (data: UpdateProfileData) => {
    try {
      if (!state.user) {
        throw new Error("Usuário não autenticado");
      }

      // Update auth user metadata
      if (data.name) {
        const { error: userError } = await supabase.auth.updateUser({
          data: { name: data.name }
        });

        if (userError) throw userError;

        // Update profile name
        const { error: profileError } = await supabase
          .from("profiles")
          .upsert({ id: state.user.id, name: data.name });

        if (profileError) throw profileError;
      }

      // Update user role if provided
      if (data.role) {
        const { error: roleError } = await supabase
          .from("user_roles")
          .update({ role: data.role })
          .eq("user_id", state.user.id);

        if (roleError) throw roleError;
      }

      // Create audit log
      await DatabaseService.createAuditLog({
        user_id: state.user.id,
        action_type: "update",
        entity_type: "user",
        entity_id: state.user.id,
        details: data
      });

      toast.success("Perfil atualizado com sucesso!");
      await loadUserData(state.user);
    } catch (error) {
      console.error("Error updating profile:", error);
      if (error instanceof Error && error.message.includes("Failed to fetch")) {
        toast.error(
          "Erro de conexão. Verifique sua internet e tente novamente."
        );
      } else {
        toast.error("Erro ao atualizar perfil");
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
        signOut,
        updateProfile,
        refreshSubscription
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
};
