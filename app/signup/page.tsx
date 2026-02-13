'use client'

import { useState } from "react"
import { useAuth } from "../context/AuthContext"
import { useRouter } from "next/navigation"

export default function SignupPage() {
  const { signUp } = useAuth()
  const router = useRouter()

  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [name, setName] = useState("")
  const [phone, setPhone] = useState("") // New state
  const [error, setError] = useState("")

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault()
    try {
      // Pass the name and phone to your updated signUp function
      await signUp(email, password, name, phone)
      alert("Check your email to confirm!")
      router.push("/login")
    } catch (err: any) {
      setError(err.message)
    }
  }

  return (
    <div style={{ padding: '40px', maxWidth: '400px', margin: '0 auto' }}>
      <h1>Join the Series</h1>
      {error && <p style={{ color: 'red' }}>{error}</p>}

      <form onSubmit={handleSignup}>
        <label>Full Name*</label>
        <input type="text" required value={name} onChange={(e) => setName(e.target.value)} style={styles.input} />

        <label>Email Address*</label>
        <input type="email" required value={email} onChange={(e) => setEmail(e.target.value)} style={styles.input} />

        <label>Phone Number (Optional)</label>
        <input type="tel" value={phone} onChange={(e) => setPhone(e.target.value)} style={styles.input} />

        <label>Password*</label>
        <input type="password" required value={password} onChange={(e) => setPassword(e.target.value)} style={styles.input} />

        <button type="submit" style={styles.button}>Create Account</button>
      </form>
    </div>
  )
}

const styles = {
  input: { width: '100%', padding: '10px', marginBottom: '15px', display: 'block' },
  button: { width: '100%', padding: '12px', background: '#2e7d32', color: 'white', border: 'none', cursor: 'pointer' }
}