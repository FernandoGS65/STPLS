// Initialize Supabase client for the browser
(function() {
    if (typeof supabase === 'undefined' || !window.STPLS_SUPABASE_URL) {
        window.STPLS_SUPABASE = null;
        return;
    }
    window.STPLS_SUPABASE = supabase.createClient(
        window.STPLS_SUPABASE_URL,
        window.STPLS_SUPABASE_ANON_KEY,
        {
            auth: { autoRefreshToken: true, persistSession: true }
        }
    );
})();
