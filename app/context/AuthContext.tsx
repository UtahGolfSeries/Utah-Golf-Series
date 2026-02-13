'use client'

import { createContext, useContext, useState, useEffect } from "react"
import { createClient } from '@supabase/supabase-js'
import { useRouter } from 'next/navigation' // Added for redirection

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

const AuthContext = createContext<any>(null)

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const router = useRouter() // Initialize the router

  useEffect(() => {
    const fetchSession = async () => {
      const { data: { session } } = await supabase.auth.getSession()
      
      if (session?.user) {
        // Fetch ALL necessary profile data
        const { data: profile } = await supabase
          .from('member')
          .select('display_name, phone_number, handicap_index, has_submitted_current_round')
          .eq('auth_user_id', session.user.id)
          .single()

        setUser({ ...session.user, ...profile })
      } else {
        setUser(null)
      }
      setLoading(false)
    }

    fetchSession()

    const { data: listener } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (session?.user) {
        const { data: profile } = await supabase
          .from('member')
          .select('display_name, phone_number, handicap_index, has_submitted_current_round')
          .eq('auth_user_id', session.user.id)
          .single()
        setUser({ ...session.user, ...profile })
      } else {
        setUser(null)
        // Automatically send home if the session is lost or they log out
        router.push('/')
      }
    })

    return () => listener.subscription.unsubscribe()
  }, [router])

  async function login(email: string, password: string) {
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    })
    if (error) throw error
    return data
  }

  async function signUp(email: string, password: string, displayName: string, phone: string) {
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          display_name: displayName,
          phone_number: phone,
        },
      },
    })
    if (error) throw error
    return data
  }

async function logout() {
    try {
      // 1. Tell Supabase to end the session
      await supabase.auth.signOut()
      
      // 2. Clear local state
      setUser(null)
      
      // 3. Force a hard redirect to home
      // This is more reliable for logouts than router.push
      window.location.href = '/' 
    } catch (error: any) {
      console.error("Logout error:", error.message)
      // Fallback redirect if something goes wrong
      window.location.href = '/'
    }
  }

  return (
    <AuthContext.Provider value={{ user, login, logout, loading, signUp }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  return useContext(AuthContext)
}