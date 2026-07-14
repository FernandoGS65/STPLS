import { SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY } from '../src/lib/config.js';

console.log('From config.js:');
console.log('  SUPABASE_URL:', SUPABASE_URL ? `${SUPABASE_URL.substring(0, 20)}... (length ${SUPABASE_URL.length})` : 'EMPTY');
console.log('  SUPABASE_SERVICE_ROLE_KEY:', SUPABASE_SERVICE_ROLE_KEY ? `${SUPABASE_SERVICE_ROLE_KEY.substring(0, 10)}... (length ${SUPABASE_SERVICE_ROLE_KEY.length})` : 'EMPTY');

console.log('From process.env:');
console.log('  SUPABASE_URL:', process.env.SUPABASE_URL ? `${process.env.SUPABASE_URL.substring(0, 20)}... (length ${process.env.SUPABASE_URL.length})` : 'EMPTY');
console.log('  SUPABASE_SERVICE_ROLE_KEY:', process.env.SUPABASE_SERVICE_ROLE_KEY ? `${process.env.SUPABASE_SERVICE_ROLE_KEY.substring(0, 10)}... (length ${process.env.SUPABASE_SERVICE_ROLE_KEY.length})` : 'EMPTY');
