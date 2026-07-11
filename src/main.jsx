import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.jsx'
import { AppProvider } from './context/AppContext.jsx'
import { AuthProvider } from './context/AuthContext.jsx'
import { ToastProvider } from './context/ToastContext.jsx'
import { supabaseConfigured } from './lib/supabase.js'
import './index.css'

// Clear message instead of a blank page when the deploy is missing its
// Supabase environment variables (the usual first-time Vercel mistake).
function ConfigError() {
  return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24, fontFamily: 'Inter, system-ui, sans-serif', background: '#0a0a0a', color: '#e5e7eb' }}>
      <div style={{ maxWidth: 460 }}>
        <h1 style={{ fontSize: 20, fontWeight: 800, marginBottom: 8 }}>Configuration needed</h1>
        <p style={{ fontSize: 14, lineHeight: 1.6, color: '#9ca3af' }}>
          The app can’t reach its database because these environment variables are not set:
        </p>
        <pre style={{ background: '#111827', padding: 12, borderRadius: 8, fontSize: 13, margin: '12px 0' }}>
VITE_SUPABASE_URL{'\n'}VITE_SUPABASE_ANON_KEY</pre>
        <p style={{ fontSize: 13, lineHeight: 1.6, color: '#9ca3af' }}>
          On Vercel: Project → Settings → Environment Variables → add both, then redeploy.
          Locally: copy <code>.env.example</code> to <code>.env</code> and fill them in.
        </p>
      </div>
    </div>
  )
}

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    {supabaseConfigured ? (
      <ToastProvider>
        <AuthProvider>
          <AppProvider>
            <App />
          </AppProvider>
        </AuthProvider>
      </ToastProvider>
    ) : (
      <ConfigError />
    )}
  </React.StrictMode>,
)
