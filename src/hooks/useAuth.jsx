import { useState, useEffect, useContext, createContext } from 'react'
import { auth } from '../services/supabase'
// import { useClickstream } from './useClickstream'

const AuthContext = createContext({})

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)
  const [session, setSession] = useState(null)
  // const { trackLogin, trackLogout, trackRegistration } = useClickstream()

  useEffect(() => {
    // Get initial session
    auth.getCurrentUser().then(({ user, error }) => {
      if (user && !error) {
        setUser(user)
        setSession(user)
      }
      setLoading(false)
    })

    // Listen for auth changes
    const { data: { subscription } } = auth.onAuthStateChange(async (event, session) => {
      setSession(session)
      setUser(session?.user ?? null)
      setLoading(false)

      // Track auth events - disabled for now
      // if (event === 'SIGNED_IN') {
      //   trackLogin()
      // } else if (event === 'SIGNED_OUT') {
      //   trackLogout()
      // }
    })

    return () => subscription.unsubscribe()
  }, []) // Remove trackLogin, trackLogout from dependencies

  const signUp = async (email, password, userData = {}) => {
    try {
      console.log('🚀 useAuth signUp called with:', { email, userData })
      setLoading(true)
      
      const { data, error } = await auth.signUp(email, password, userData)
      
      console.log('🚀 useAuth signUp response:', { data, error })
      
      if (!error && data.user) {
        // Track registration but don't let it fail the signup process - disabled for now
        // try {
        //   trackRegistration()
        // } catch (trackingError) {
        //   console.warn('Registration tracking failed (non-critical):', trackingError)
        // }
        console.log('✅ User registered successfully:', data.user.email)
      }
      
      return { data, error }
    } catch (error) {
      console.error('❌ useAuth signUp error:', error)
      return { data: null, error }
    } finally {
      setLoading(false)
    }
  }

  const signIn = async (email, password) => {
    try {
      setLoading(true)
      const { data, error } = await auth.signIn(email, password)
      return { data, error }
    } catch (error) {
      return { data: null, error }
    } finally {
      setLoading(false)
    }
  }

  const signOut = async () => {
    try {
      setLoading(true)
      const { error } = await auth.signOut()
      return { error }
    } catch (error) {
      return { error }
    } finally {
      setLoading(false)
    }
  }

  const value = {
    user,
    session,
    loading,
    signUp,
    signIn,
    signOut,
    isAuthenticated: !!user
  }

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  )
}

export const useAuth = () => {
  const context = useContext(AuthContext)
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}