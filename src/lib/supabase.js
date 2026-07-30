
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.PUBLIC_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.PUBLIC_SUPABASE_ANON_KEY;
const supabaseServiceKey = import.meta.env.SUPABASE_SERVICE_ROLE_KEY;

// Client for public operations (using Anon Key)
// Hanya digunakan untuk operasi publik seperti upload file, read data yang diizinkan oleh RLS
export const supabase = createClient(supabaseUrl, supabaseAnonKey);

// Admin Client for secure operations (using Service Role Key)
// PENTING: Hanya gunakan di server-side API routes. Service role BYPASS semua RLS.
// JANGAN pernah expose key ini ke client-side.
export const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey || supabaseAnonKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});
