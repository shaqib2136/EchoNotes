// Supabase configuration - You will replace these placeholders during the final deployment step!
const SUPABASE_URL = 'YOUR_SUPABASE_URL';
const SUPABASE_ANON_KEY = 'YOUR_SUPABASE_ANON_KEY';

// Initialize the Supabase client using the global object provided by the CDN in the HTML
const supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);