
import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.7";

const supabaseUrl = Deno.env.get('SUPABASE_URL') || '';
const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || '';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Max-Age': '86400'
};

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }
  
  try {
    // Extract the token from the request headers
    const authHeader = req.headers.get('Authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      throw new Error('Invalid authorization header');
    }
    
    const token = authHeader.replace('Bearer ', '');
    
    // Create a Supabase client with the service role key
    const supabase = createClient(supabaseUrl, supabaseKey);
    
    // Verify the token and get user information
    const { data, error } = await supabase.auth.getUser(token);
    
    if (error) {
      throw error;
    }
    
    if (!data.user) {
      throw new Error('User not found');
    }
    
    // Check if the user has required permissions (optional)
    const { data: userRoles } = await supabase
      .from('user_roles')
      .select('role')
      .eq('user_id', data.user.id);
    
    const roles = userRoles ? userRoles.map(r => r.role) : [];
    
    return new Response(
      JSON.stringify({
        status: 'authenticated',
        user: {
          id: data.user.id,
          email: data.user.email,
          roles
        }
      }),
      { 
        headers: { 
          ...corsHeaders, 
          'Content-Type': 'application/json' 
        } 
      }
    );
  } catch (error) {
    console.error('Auth check error:', error);
    
    return new Response(
      JSON.stringify({ 
        status: 'error', 
        message: error.message || 'Authentication failed',
        details: typeof error === 'object' ? Object.getOwnPropertyNames(error).reduce((obj, key) => {
          obj[key] = error[key];
          return obj;
        }, {}) : error
      }),
      { 
        status: 401,
        headers: { 
          ...corsHeaders, 
          'Content-Type': 'application/json' 
        } 
      }
    );
  }
});
