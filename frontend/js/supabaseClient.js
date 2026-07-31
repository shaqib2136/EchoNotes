// Ensure supabase client is only initialized once globally
if (!window.supabaseClientInstance) {
  // TODO: Replace these placeholders with your actual Supabase URL and Anon Key from your Supabase Dashboard (Settings -> API)
  const SUPABASE_URL = "https://uwhfjhhafozgobzamvfd.supabase.co";
  const SUPABASE_ANON_KEY = "sb_publishable_dMzMLsrAcQ3Ui5AiBZO1fw_Hve6ZDnV";

  window.supabaseClientInstance = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
}

const supabase = window.supabaseClientInstance;