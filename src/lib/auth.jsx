import { createContext, useContext, useEffect, useState, useRef } from 'react'
import { supabase, supabaseUrl, getScoutProfile } from './supabase'

const AuthContext = createContext({})

// Read cached Supabase session synchronously from localStorage
// This lets us skip the auth spinner for returning users
function getCachedUser() {
  try {
    const ref = supabaseUrl?.split('//')[1]?.split('.')[0]
    if (!ref) return null
    const raw = localStorage.getItem(`sb-${ref}-auth-token`)
    if (!raw) return null
    return JSON.parse(raw)?.user ?? null
  } catch {
    return null
  }
}

export function AuthProvider({ children }) {
  const cachedUser = getCachedUser()
  const [user, setUser] = useState(cachedUser)
  const [scout, setScout] = useState(null)
  // Skip loading spinner if we have a cached session
  const [loading, setLoading] = useState(!cachedUser)
  const profileFetchedRef = useRef(false)

  useEffect(() => {
    let subscription = null

    const initAuth = async () => {
      // Timeout to prevent infinite loading if auth/network hangs
      const authTimeout = setTimeout(() => {
        console.warn('Auth initialization timeout - forcing load')
        setLoading(false)
      }, 5000)

      try {
        const { data: { session }, error } = await supabase.auth.getSession()

        if (error) {
          console.error('Error getting session:', error)
          setUser(null)
          setLoading(false)
          return
        }

        setUser(session?.user ?? null)
        if (session?.user && !profileFetchedRef.current) {
          profileFetchedRef.current = true
          loadScoutProfile(session.user.email)
        }
        // Set loading false right after getSession — don't wait for profile fetch
        setLoading(false)
      } catch (error) {
        console.error('Auth initialization error:', error)
        setUser(null)
        setLoading(false)
      } finally {
        clearTimeout(authTimeout)
      }
    }

    // Start profile fetch immediately from cached user (don't wait for getSession)
    if (cachedUser && !profileFetchedRef.current) {
      profileFetchedRef.current = true
      loadScoutProfile(cachedUser.email)
    }

    initAuth()

    // Listen for auth changes
    try {
      const { data } = supabase.auth.onAuthStateChange(
        (event, session) => {
          if (event === 'INITIAL_SESSION') return
          setUser(session?.user ?? null)
          if (session?.user) {
            loadScoutProfile(session.user.email)
          } else {
            profileFetchedRef.current = false
            setScout(null)
          }
        }
      )
      subscription = data?.subscription
    } catch (error) {
      console.error('Error setting up auth listener:', error)
    }

    return () => {
      if (subscription) subscription.unsubscribe()
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

  async function refreshScout() {
    if (user?.email) {
      await loadScoutProfile(user.email)
    }
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
    resetPassword,
    refreshScout
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
