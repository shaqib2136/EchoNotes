console.log("supabaseClient.js loaded");

const SUPABASE_URL = "https://uwhfjhhafozgobzamvfd.supabase.co";
const SUPABASE_PUBLISHABLE_KEY = "sb_publishable_dMzMLsrAcQ3Ui5AiBZO1fw_Hve6ZDnV";

// Create ONE client and expose it globally
window.supabaseClient = window.supabase.createClient(
  SUPABASE_URL,
  SUPABASE_PUBLISHABLE_KEY
);


