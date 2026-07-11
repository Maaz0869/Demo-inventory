// Single shared Supabase client for the whole app.
// URL + publishable (anon) key come from .env (VITE_ vars are bundled at build
// time and are safe to expose — access is meant to be governed by RLS).
import { createClient } from '@supabase/supabase-js'

const url = import.meta.env.VITE_SUPABASE_URL
const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

if (!url || !anonKey) {
  // Fail loudly in dev if the env vars are missing.
  console.error('Missing VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY in .env')
}

export const supabase = createClient(url, anonKey, {
  auth: { persistSession: false },
})
