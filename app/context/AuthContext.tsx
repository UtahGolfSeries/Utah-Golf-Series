'use client'

import { createContext, useContext, useState, useEffect } from "react"
import { createClient } from '@supabase/supabase-js'
import { useRouter } from 'next/navigation'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

const AuthContext = createContext<any>(null)

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const router = useRouter()

  useEffect(() => {
    const fetchSession = async () => {
      const { data: { session } } = await supabase.auth.getSession()
      
      if (session?.user) {
        const { data: profile } = await supabase
          .from('member')
          .select('display_name, phone_number, ghin_number, handicap_index, has_submitted_current_round, role')
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
          .select('display_name, phone_number, ghin_number, handicap_index, has_submitted_current_round, role')
          .eq('auth_user_id', session.user.id)
          .single()
          
        setUser({ ...session.user, ...profile })
      } else {
        setUser(null)
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

  // UPDATED: Added GHIN and renamed to "signup" to match your Page call
  async function signup(email: string, password: string, displayName: string, phone: string = '', ghin: string = '') {
    const { data, error: authError } = await supabase.auth.signUp({
      email,
      password,
    })

    if (authError) throw authError
    if (!data.user) throw new Error("Sign up failed")

    const { error: profileError } = await supabase
      .from('member')
      .upsert(
        {
          auth_user_id: data.user.id,
          display_name: displayName,
          email: email, // Good practice to store email in the member table too
          phone_number: phone,
          ghin_number: ghin,
          handicap_index: 0,
          role: 'player', 
          has_submitted_current_round: false
        },
        { onConflict: 'auth_user_id' }
      )

    if (profileError) {
      console.error("Error creating member profile:", profileError.message)
      throw profileError
    }

    return data
  }

  async function logout() {
    try {
      await supabase.auth.signOut()
      setUser(null)
      window.location.href = '/' 
    } catch (error: any) {
      console.error("Logout error:", error.message)
      window.location.href = '/'
    }
  }

  return (
    <AuthContext.Provider value={{ user, login, logout, loading, signup }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  return useContext(AuthContext)
}