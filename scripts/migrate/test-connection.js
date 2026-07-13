import { supabaseAdmin } from '../../src/lib/supabase.js';
import { validateConfig } from '../../src/lib/config.js';

async function main() {
    try {
        validateConfig();
        console.log('Testing Supabase connection...');
        const { data, error } = await supabaseAdmin.from('seasons').select('*').limit(1);
        if (error) {
            if (error.message.includes('does not exist')) {
                console.log('Connection OK, but tables do not exist yet. Run schema.sql first.');
                process.exit(0);
            }
            throw error;
        }
        console.log('Connection OK. Sample data:', data);
    } catch (err) {
        console.error('Connection failed:', err.message);
        process.exit(1);
    }
}

main();
