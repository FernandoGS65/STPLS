import { createClient } from '@supabase/supabase-js';
import { SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, SUPABASE_ANON_KEY } from './config.js';

// Admin client for scripts (bypasses RLS)
export const supabaseAdmin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
    auth: { autoRefreshToken: false, persistSession: false }
});

// Public client for frontend-style operations (only if anon key is available)
export const supabasePublic = SUPABASE_ANON_KEY
    ? createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
          auth: { autoRefreshToken: true, persistSession: false }
      })
    : null;

export async function testConnection() {
    const { data, error } = await supabaseAdmin.from('seasons').select('count').single();
    if (error) throw error;
    return data;
}
