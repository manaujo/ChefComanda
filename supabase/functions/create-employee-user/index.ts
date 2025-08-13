import { createClient } from 'npm:@supabase/supabase-js@2';

interface CreateEmployeeRequest {
  companyId: string;
  name: string;
  email: string;
  password: string;
  role: 'waiter' | 'cashier' | 'stock' | 'kitchen';
  cpf: string;
}

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

Deno.serve(async (req: Request) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { 
      status: 200,
      headers: corsHeaders 
    });
  }

  if (req.method !== 'POST') {
    return new Response(
      JSON.stringify({ error: 'Method not allowed' }),
      { 
        status: 405, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }

  try {
    // Create Supabase client with service role key
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // Parse request body
    const requestData: CreateEmployeeRequest = await req.json();
    const { companyId, name, email, password, role, cpf } = requestData;

    // Validate required fields
    if (!companyId || !name || !email || !password || !role || !cpf) {
      return new Response(
        JSON.stringify({ error: 'Missing required fields' }),
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    // 1. Create user in auth.users using Admin API
    const { data: authUser, error: authError } = await supabaseAdmin.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: {
        name,
        role,
        is_employee: true
      }
    });

    if (authError) {
      console.error('Error creating auth user:', authError);
      return new Response(
        JSON.stringify({ error: `Erro ao criar usuário: ${authError.message}` }),
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    if (!authUser.user) {
      return new Response(
        JSON.stringify({ error: 'Usuário não foi criado' }),
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    // 2. Create record in employees table
    const { data: employee, error: employeeError } = await supabaseAdmin
      .from('employees')
      .insert({
        company_id: companyId,
        name,
        cpf,
        role,
        auth_user_id: authUser.user.id,
        active: true
      })
      .select()
      .single();

    if (employeeError) {
      // If employee creation fails, clean up auth user
      try {
        await supabaseAdmin.auth.admin.deleteUser(authUser.user.id);
      } catch (deleteError) {
        console.error('Error cleaning up auth user:', deleteError);
      }
      
      return new Response(
        JSON.stringify({ error: `Erro ao criar funcionário: ${employeeError.message}` }),
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    // 3. Create employee profile
    const { error: profileError } = await supabaseAdmin
      .from('profiles')
      .insert({
        id: authUser.user.id,
        name,
        cpf
      });

    if (profileError) {
      console.error('Error creating employee profile:', profileError);
      // Don't fail because of profile, just log the error
    }

    // 4. Create employee role
    const { error: roleError } = await supabaseAdmin
      .from('user_roles')
      .insert({
        user_id: authUser.user.id,
        role
      });

    if (roleError) {
      console.error('Error creating employee role:', roleError);
      // Don't fail because of role, just log the error
    }

    // Return success response
    return new Response(
      JSON.stringify({
        success: true,
        employee: {
          ...employee,
          has_auth: true
        }
      }),
      { 
        status: 200, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );

  } catch (error) {
    console.error('Error in create-employee-user function:', error);
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }
});