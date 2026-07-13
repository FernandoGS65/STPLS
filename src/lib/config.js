import 'dotenv/config';

export const SUPABASE_URL = process.env.SUPABASE_URL || '';
export const SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY || '';
export const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || '';

export const DEFAULT_SEASON = process.env.DEFAULT_SEASON || '2026-27';
export const DEFAULT_COMPETITION = process.env.DEFAULT_COMPETITION || 'liga';

export function validateConfig() {
    const missing = [];
    if (!SUPABASE_URL) missing.push('SUPABASE_URL');
    if (!SUPABASE_SERVICE_ROLE_KEY) missing.push('SUPABASE_SERVICE_ROLE_KEY');
    if (missing.length > 0) {
        throw new Error(`Missing environment variables: ${missing.join(', ')}. Copy .env.example to .env and fill in your Supabase credentials.`);
    }
}
