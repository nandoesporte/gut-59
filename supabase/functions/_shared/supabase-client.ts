
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.38.4';

export const supabaseClient = () => {
  const supabaseUrl = Deno.env.get('SUPABASE_URL') || '';
  const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || '';

  if (!supabaseUrl || !supabaseServiceKey) {
    throw new Error('Supabase URL or service key is missing');
  }

  return createClient(supabaseUrl, supabaseServiceKey);
};
