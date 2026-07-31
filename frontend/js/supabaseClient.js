console.log("supabaseClient.js loaded");

const SUPABASE_URL = "https://uwhfjhhafozgobzamvfd.supabase.co";
const SUPABASE_KEY = "sb_publishable_dMzMLsrAcQ3Ui5AiBZO1fw_Hve6ZDnV";

console.log("window.supabase =", window.supabase);

const client = window.supabase.createClient(
  SUPABASE_URL,
  SUPABASE_KEY
);

console.log("client =", client);

window.supabaseClient = client;




