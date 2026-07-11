// Single shared Supabase client for the whole app.
// URL + publishable (anon) key come from .env (VITE_ vars are bundled at build
// time and are safe to expose — access is meant to be governed by RLS).
import { createClient } from '@supabase/supabase-js'

const url = import.meta.env.VITE_SUPABASE_URL
const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

// True only when both env vars are present. Checked in main.jsx so a
// misconfigured deploy shows a clear message instead of a blank white page.
export const supabaseConfigured = Boolean(url && anonKey)

if (!supabaseConfigured) {
  console.error('Missing VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY — set them in your .env or Vercel project settings.')
}

// Use a valid placeholder URL when unconfigured so createClient never throws at
// import time (which would white-screen the app before we can show a message).
export const supabase = createClient(
  url || 'https://placeholder.supabase.co',
  anonKey || 'placeholder-anon-key',
  {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
      storageKey: 'autoparts-auth',
    },
  },
)
