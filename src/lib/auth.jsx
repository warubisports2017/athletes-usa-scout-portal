import { createContext, useContext, useEffect, useState, useRef } from 'react'
import { supabase, getScoutProfile } from './supabase'

const AuthContext = createContext({})

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null)
  const [scout, setScout] = useState(null)
  const [loading, setLoading] = useState(true)
  const profileFetchedRef = useRef(false)

  useEffect(() => {
    // Safety timeout - if auth doesn't resolve in 5s, stop loading
    const timeout = setTimeout(() => {
      setLoading(false)
    }, 5000)

    // Get initial session
    supabase.auth.getSession()
      .then(({ data: { session } }) => {
        setUser(session?.user ?? null)
        if (session?.user) {
          loadScoutProfile(session.user.email)
        } else {
          setLoading(false)
        }
      })
      .catch((err) => {
        console.error('Failed to get session:', err)
        setUser(null)
        setScout(null)
        setLoading(false)
      })

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        setUser(session?.user ?? null)
        if (session?.user) {
          // Skip if getSession() already loaded the profile
          if (!profileFetchedRef.current) {
            await loadScoutProfile(session.user.email)
          }
        } else {
          profileFetchedRef.current = false
          setScout(null)
          setLoading(false)
        }
      }
    )

    return () => {
      clearTimeout(timeout)
      subscription.unsubscribe()
    }
  }, [])

  async function loadScoutProfile(email) {
    profileFetchedRef.current = true
    try {
      const profile = await getScoutProfile(email)
      setScout(profile)
    } catch (error) {
      console.error('Failed to load scout profile:', error)
    } finally {
      setLoading(false)
    }
  }

  async function signIn(email, password) {
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password
    })
    if (error) throw error
    return data
  }

  async function signOut() {
    const { error } = await supabase.auth.signOut()
    if (error) throw error
  }

  async function resetPassword(email) {
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/reset-password`
    })
    if (error) throw error
  }

  const value = {
    user,
    scout,
    loading,
    signIn,
    signOut,
    resetPassword
  }

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider')
  }
  return context
}
