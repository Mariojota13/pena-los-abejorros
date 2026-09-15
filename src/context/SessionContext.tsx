import { createContext, useContext, useEffect, useState, type ReactNode } from 'react'
import type { Session } from '@supabase/supabase-js'
import { supabase } from '../lib/supabase'
import type { Profile } from '../types'

interface SessionContextValue {
  loading: boolean
  hasSession: boolean
  profile: Profile | null
  login: (email: string, password: string) => Promise<{ error: string | null }>
  updateProfile: (changes: {
    name: string
    nickname: string
    birthday: string
    memberSinceYear: string
    avatarPath: string | null
  }) => Promise<void>
  changePassword: (newPassword: string) => Promise<{ error: string | null }>
  signOut: () => void
}

const SessionContext = createContext<SessionContextValue | null>(null)

export function SessionProvider({ children }: { children: ReactNode }) {
  const [loading, setLoading] = useState(true)
  const [hasSession, setHasSession] = useState(false)
  const [profile, setProfile] = useState<Profile | null>(null)

  useEffect(() => {
    void init()

    const { data: subscription } = supabase.auth.onAuthStateChange((event) => {
      if (event === 'SIGNED_OUT') {
        setHasSession(false)
        setProfile(null)
      }
    })

    return () => subscription.subscription.unsubscribe()
  }, [])

  async function init() {
    const { data } = await supabase.auth.getSession()
    if (data.session) {
      setHasSession(true)
      await loadOrClaimProfile(data.session)
    }
    setLoading(false)
  }

  async function loadOrClaimProfile(session: Session) {
    const uid = session.user.id
    const email = session.user.email

    const { data: existing } = await supabase
      .from('profiles')
      .select('*')
      .eq('auth_user_id', uid)
      .maybeSingle()

    if (existing) {
      setProfile(existing as Profile)
      return
    }

    if (email) {
      const { data: claimed } = await supabase
        .from('profiles')
        .update({ auth_user_id: uid })
        .is('auth_user_id', null)
        .ilike('email', email)
        .select()
        .maybeSingle()

      setProfile((claimed as Profile) ?? null)
      return
    }

    setProfile(null)
  }

  async function login(email: string, password: string) {
    const { data, error } = await supabase.auth.signInWithPassword({ email, password })
    if (error || !data.session) {
      return { error: 'Email o contraseña incorrectos.' }
    }
    setHasSession(true)
    await loadOrClaimProfile(data.session)
    return { error: null }
  }

  async function updateProfile(changes: {
    name: string
    nickname: string
    birthday: string
    memberSinceYear: string
    avatarPath: string | null
  }) {
    if (!profile) return
    const year = changes.memberSinceYear.trim() ? Number(changes.memberSinceYear) : null
    const { data, error } = await supabase
      .from('profiles')
      .update({
        name: changes.name,
        nickname: changes.nickname.trim() || null,
        birthday: changes.birthday || null,
        member_since_year: year,
        avatar_path: changes.avatarPath,
      })
      .eq('id', profile.id)
      .select()
      .single()

    if (error) throw error
    setProfile(data as Profile)
  }

  async function changePassword(newPassword: string) {
    const { error } = await supabase.auth.updateUser({ password: newPassword })
    return { error: error ? 'No se pudo cambiar la contraseña.' : null }
  }

  function signOut() {
    void supabase.auth.signOut()
    setHasSession(false)
    setProfile(null)
  }

  return (
    <SessionContext.Provider
      value={{
        loading,
        hasSession,
        profile,
        login,
        updateProfile,
        changePassword,
        signOut,
      }}
    >
      {children}
    </SessionContext.Provider>
  )
}

export function useSession() {
  const ctx = useContext(SessionContext)
  if (!ctx) throw new Error('useSession debe usarse dentro de SessionProvider')
  return ctx
}
