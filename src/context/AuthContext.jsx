// -----------------------------------------------------------------------------
// Authentication + company management, backed by Supabase Auth + RLS.
//
// Companies and the platform admin are real Supabase Auth users (passwords are
// hashed by Supabase, never stored by us). To keep the username-based UX, each
// account uses a synthetic email `<username>@autoparts.local`.
//
// The database enforces isolation via RLS, so nothing here can leak another
// company's data. Admin-only provisioning (create / edit / block / delete) runs
// through SECURITY DEFINER RPC functions that verify the caller is an admin —
// the service key is never shipped to the browser.
// -----------------------------------------------------------------------------
import { createContext, useContext, useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import { useToast } from './ToastContext'

const AuthContext = createContext(null)

const DOMAIN = '@autoparts.local'
const emailFor = (username) => `${String(username).trim().toLowerCase()}${DOMAIN}`

// Map raw RPC error codes to friendly messages.
const RPC_ERRORS = {
  username_taken: 'That username already exists.',
  missing_fields: 'Username and password are required.',
  not_authorized: 'You are not allowed to do that.',
}
const friendly = (error) => RPC_ERRORS[error?.message] || 'Something went wrong. Please try again.'

export function AuthProvider({ children }) {
  const [currentUser, setCurrentUser] = useState(null)
  const [authLoading, setAuthLoading] = useState(true)
  const [users, setUsers] = useState([])
  const [viewingCompany, setViewingCompanyState] = useState(null)
  const setViewingCompany = (company) =>
    setViewingCompanyState(company ? { id: company.id, name: company.name } : null)
  const toast = useToast()

  // Turn a Supabase session user into our currentUser via its profile row.
  const loadProfile = async (uid) => {
    const { data } = await supabase.from('profiles').select('*').eq('id', uid).maybeSingle()
    if (data) {
      setCurrentUser({
        id: data.id,
        username: data.username,
        name: data.name,
        role: data.role,
        companyId: data.companyId || null,
      })
    } else {
      setCurrentUser(null)
    }
  }

  // Restore an existing session on load, and react to sign-in / sign-out.
  useEffect(() => {
    let active = true
    ;(async () => {
      const {
        data: { session },
      } = await supabase.auth.getSession()
      if (!active) return
      if (session?.user) await loadProfile(session.user.id)
      setAuthLoading(false)
    })()

    const { data: sub } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session?.user) {
        loadProfile(session.user.id)
      } else {
        setCurrentUser(null)
        setViewingCompanyState(null)
      }
    })
    return () => {
      active = false
      sub.subscription.unsubscribe()
    }
  }, [])

  // Admin: load every company profile for the Companies page.
  const refreshUsers = async () => {
    const { data } = await supabase.from('profiles').select('*').order('username')
    if (data) setUsers(data)
  }
  useEffect(() => {
    if (currentUser?.role === 'admin') refreshUsers()
    else setUsers([])
  }, [currentUser])

  // --- Session ---------------------------------------------------------------
  const login = async (username, password) => {
    const { error } = await supabase.auth.signInWithPassword({
      email: emailFor(username),
      password,
    })
    if (error) {
      const blocked = /ban|block/i.test(error.message)
      return {
        ok: false,
        error: blocked
          ? 'This account is blocked. Please contact the admin.'
          : 'Invalid username or password.',
      }
    }
    return { ok: true } // onAuthStateChange loads the profile
  }

  const logout = () => supabase.auth.signOut()

  // --- Company management (admin, via RPC) ------------------------------------
  const addUser = async ({ username, password, name }) => {
    const { error } = await supabase.rpc('admin_create_company', {
      p_username: username,
      p_password: password,
      p_name: name,
    })
    if (error) return { ok: false, error: friendly(error) }
    await refreshUsers()
    toast(`Company "${name || username}" created`, 'success')
    return { ok: true }
  }

  const updateUser = async ({ id, username, name, password }) => {
    const { error } = await supabase.rpc('admin_update_company', {
      p_id: id,
      p_username: username,
      p_name: name,
      p_password: password || '',
    })
    if (error) return { ok: false, error: friendly(error) }
    await refreshUsers()
    if (currentUser?.id === id) {
      setCurrentUser((cu) => ({
        ...cu,
        username: String(username).trim().toLowerCase(),
        name: name?.trim() || cu.name,
      }))
    }
    toast('Changes saved', 'success')
    return { ok: true }
  }

  const toggleBlock = async (id) => {
    const u = users.find((x) => x.id === id)
    if (!u) return
    const block = u.status !== 'blocked'
    const { error } = await supabase.rpc('admin_set_blocked', { p_id: id, p_blocked: block })
    if (error) return toast('Could not update the company', 'error')
    await refreshUsers()
    toast(block ? `"${u.name}" blocked` : `"${u.name}" unblocked`, 'success')
  }

  const deleteUser = async (id) => {
    const u = users.find((x) => x.id === id)
    const { error } = await supabase.rpc('admin_delete_company', { p_id: id })
    if (error) return toast('Could not delete the company', 'error')
    await refreshUsers()
    toast(`Company "${u?.name || ''}" deleted`, 'success')
  }

  const isAdmin = currentUser?.role === 'admin'

  const value = {
    users,
    currentUser,
    isAdmin,
    authLoading,
    viewingCompany,
    setViewingCompany,
    login,
    logout,
    addUser,
    updateUser,
    toggleBlock,
    deleteUser,
  }
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used inside <AuthProvider>')
  return ctx
}
