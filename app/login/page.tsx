'use client'

import { useState, useEffect } from "react"
import { useAuth } from "../context/AuthContext"
import { useRouter } from "next/navigation" // Import the Next.js router

export default function LoginPage() {
  const { login, user } = useAuth()
  const router = useRouter()
  
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [error, setError] = useState("")
  const [loading, setLoading] = useState(false)

  // REDIRECT LOGIC: If 'user' becomes truthy, go to account
  useEffect(() => {
    if (user) {
      router.push("/account")
    }
  }, [user, router])

  const handleSubmit = async () => {
    setLoading(true)
    setError("")
    try {
      await login(email, password)
      // The useEffect above will handle the redirect once the user state updates
    } catch (err: any) {
      setError(err.message)
      setLoading(false)
    }
  }

  return (
    <div style={{ padding: '40px', maxWidth: '400px', margin: '0 auto' }}>
      <h1>Member Login</h1>
      {error && <p style={{ color: 'red' }}>{error}</p>}
      
      <input 
        type="email" 
        placeholder="Email" 
        value={email} 
        onChange={(e) => setEmail(e.target.value)} 
        style={{ width: '100%', marginBottom: '10px', padding: '8px' }}
      />
      
      <input 
        type="password" 
        placeholder="Password" 
        value={password} 
        onChange={(e) => setPassword(e.target.value)} 
        style={{ width: '100%', marginBottom: '10px', padding: '8px' }}
      />

      <button onClick={handleSubmit} disabled={loading}>
        {loading ? "Verifying..." : "Login"}
      </button>
    </div>
  )
}