// -----------------------------------------------------------------------------
// Authentication + user management, backed by the Supabase `users` table.
// Handles login/logout and lets an admin block / unblock / add / remove users.
// The active session pointer is kept in localStorage; the accounts themselves
// live in Supabase so blocking a user is enforced for everyone, everywhere.
// NOTE: passwords are stored in plain text — demo build, no Supabase Auth.
// -----------------------------------------------------------------------------
import { createContext, useContext, useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import { useToast } from './ToastContext'

const AuthContext = createContext(null)

function loadCurrentUser() {
  try {
    const raw = localStorage.getItem('currentUser')
    if (raw) return JSON.parse(raw)
  } catch {
    /* ignore */
  }
  return null
}

export function AuthProvider({ children }) {
  const [users, setUsers] = useState([])
  const [currentUser, setCurrentUser] = useState(loadCurrentUser)
  // Company the admin is currently managing (viewing/editing its data). {id, name} | null.
  const [viewingCompany, setViewingCompanyState] = useState(null)
  const setViewingCompany = (company) =>
    setViewingCompanyState(company ? { id: company.id, name: company.name } : null)
  const toast = useToast()

  // Load the company accounts (admin only — used by the Companies page).
  const refreshUsers = async () => {
    const { data, error } = await supabase.from('users').select('*').order('id')
    if (!error && data) setUsers(data)
  }

  useEffect(() => {
    if (currentUser?.role === 'admin') refreshUsers()
    else setUsers([])
  }, [currentUser])

  // Persist the session pointer.
  useEffect(() => {
    if (currentUser) localStorage.setItem('currentUser', JSON.stringify(currentUser))
    else localStorage.removeItem('currentUser')
  }, [currentUser])

  // If the admin blocks/removes a company that is currently viewing, kick it out.
  useEffect(() => {
    if (!currentUser || currentUser.role === 'admin' || users.length === 0) return
    const rec = users.find((u) => u.id === currentUser.id)
    if (rec && rec.status === 'blocked') setCurrentUser(null)
  }, [users, currentUser])

  // --- Session ---------------------------------------------------------------
  const login = async (username, password) => {
    const uname = String(username).trim()
    const { data, error } = await supabase
      .from('users')
      .select('*')
      .ilike('username', uname)
      .limit(1)
    if (error) return { ok: false, error: 'Could not reach the server. Try again.' }
    const u = data?.[0]
    if (!u || u.password !== password) return { ok: false, error: 'Invalid username or password.' }
    if (u.status === 'blocked') return { ok: false, error: 'This account is blocked. Please contact the admin.' }
    setCurrentUser({
      id: u.id,
      username: u.username,
      name: u.name,
      role: u.role,
      companyId: u.companyId || null,
    })
    return { ok: true }
  }

  const logout = () => {
    setCurrentUser(null)
    setViewingCompanyState(null)
  }

  // --- Company management (admin) ---------------------------------------------
  // Each account created here is its own company: companyId equals its own id,
  // so all of that company's data is isolated from every other company.
  const addUser = async ({ username, password, name }) => {
    const uname = String(username).trim()
    if (!uname || !password) return { ok: false, error: 'Username and password are required.' }

    const { data: existing } = await supabase
      .from('users')
      .select('id')
      .ilike('username', uname)
      .limit(1)
    if (existing?.length) return { ok: false, error: 'That username already exists.' }

    const id = `U-${Date.now()}`
    const row = {
      id,
      username: uname,
      password,
      name: name?.trim() || uname,
      role: 'user',
      status: 'active',
      companyId: id,
    }
    const { error } = await supabase.from('users').insert(row)
    if (error) return { ok: false, error: 'Could not create the company.' }
    setUsers((list) => [...list, row])
    toast(`Company "${row.name}" created`, 'success')
    return { ok: true }
  }

  // Edit a company's details / reset its password. A blank password keeps the
  // current one. Also used by the admin to change its own password.
  const updateUser = async ({ id, name, username, password }) => {
    const uname = String(username).trim()
    if (!uname) return { ok: false, error: 'Username is required.' }

    const { data: existing } = await supabase
      .from('users')
      .select('id')
      .ilike('username', uname)
      .neq('id', id)
      .limit(1)
    if (existing?.length) return { ok: false, error: 'That username already exists.' }

    const patch = { username: uname, name: name?.trim() || uname }
    if (password) patch.password = password

    const { error } = await supabase.from('users').update(patch).eq('id', id)
    if (error) return { ok: false, error: 'Could not save changes.' }

    setUsers((list) => list.map((u) => (u.id === id ? { ...u, ...patch } : u)))
    // Keep the live session label in sync if the admin edited itself.
    setCurrentUser((cu) => (cu && cu.id === id ? { ...cu, username: uname, name: patch.name } : cu))
    toast('Changes saved', 'success')
    return { ok: true }
  }

  const toggleBlock = async (id) => {
    const u = users.find((x) => x.id === id)
    if (!u) return
    const status = u.status === 'blocked' ? 'active' : 'blocked'
    const { error } = await supabase.from('users').update({ status }).eq('id', id)
    if (error) return toast('Could not update the company', 'error')
    setUsers((list) => list.map((x) => (x.id === id ? { ...x, status } : x)))
    toast(status === 'blocked' ? `"${u.name}" blocked` : `"${u.name}" unblocked`, 'success')
  }

  const deleteUser = async (id) => {
    const u = users.find((x) => x.id === id)
    const { error } = await supabase.from('users').delete().eq('id', id)
    if (error) return toast('Could not delete the company', 'error')
    setUsers((list) => list.filter((x) => x.id !== id))
    toast(`Company "${u?.name || ''}" deleted`, 'success')
  }

  const isAdmin = currentUser?.role === 'admin'

  const value = {
    users,
    currentUser,
    isAdmin,
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
