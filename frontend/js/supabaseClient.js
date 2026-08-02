import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm';

// TODO: Replace these with your actual Supabase project URL and anon public key
// You can find these in your Supabase Dashboard -> Project Settings -> API
export const SUPABASE_URL = 'https://uwhfjhhafozgobzamvfd.supabase.co';
export const SUPABASE_ANON_KEY = 'sb_publishable_dMzMLsrAcQ3Ui5AiBZO1fw_Hve6ZDnV';

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
