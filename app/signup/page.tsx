'use client'
import { useState } from 'react'
import { useAuth } from '../context/AuthContext'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import PageHeader from '../components/pageHeader'

export default function Signup() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [displayName, setDisplayName] = useState('')
  const [phoneNumber, setPhoneNumber] = useState('')
  const [ghinNumber, setGhinNumber] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  
  // NEW: State for the modal and resend status
  const [showModal, setShowModal] = useState(false)
  const [resent, setResent] = useState(false)
  
  const { signup, resendVerification } = useAuth()
  const router = useRouter()

  const formatPhoneNumber = (value: string) => {
    const digits = value.replace(/\D/g, '');
    const limited = digits.slice(0, 10);
    if (limited.length <= 3) return limited;
    if (limited.length <= 6) return `${limited.slice(0, 3)}-${limited.slice(3)}`;
    return `${limited.slice(0, 3)}-${limited.slice(3, 6)}-${limited.slice(6, 10)}`;
  }

  const handlePhoneChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const formatted = formatPhoneNumber(e.target.value);
    setPhoneNumber(formatted);
  }

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      await signup(email, password, displayName, phoneNumber, ghinNumber)
      // Switch from router.push to showing the modal
      setShowModal(true)
    } catch (err: any) {
      setError(err.message || 'Failed to create account')
    } finally {
      setLoading(false)
    }
  }

  const handleResend = async () => {
    try {
      await resendVerification(email)
      setResent(true)
      setTimeout(() => setResent(false), 3000)
    } catch (err: any) {
      setError("Error resending: " + err.message)
    }
  }

  return (
    <div style={styles.container}>
      <PageHeader title="Membership" subtitle="Welcome, We're Glad You're Here" />

      <div style={styles.card}>
        <form onSubmit={handleSignup}>
          <div style={styles.inputGroup}>
            <label style={styles.label}>Full Name</label>
            <input
              type="text" placeholder="e.g. John Smith"
              value={displayName} onChange={(e) => setDisplayName(e.target.value)}
              style={styles.input} required
            />
          </div>

          <div style={styles.inputGroup}>
            <label style={styles.label}>Email Address</label>
            <input
              type="email" placeholder="golf@example.com"
              value={email} onChange={(e) => setEmail(e.target.value)}
              style={styles.input} required
            />
          </div>

          <div style={styles.row}>
            <div style={{ ...styles.inputGroup, flex: 1 }}>
              <label style={styles.label}>Phone <span style={styles.optional}>(Optional)</span></label>
              <input
                type="tel"
                placeholder="555-555-5555"
                value={phoneNumber}
                onChange={handlePhoneChange}
                style={styles.input}
                maxLength={12}
              />
            </div>
            <div style={{ ...styles.inputGroup, flex: 1 }}>
              <label style={styles.label}>GHIN # <span style={styles.optional}>(Optional)</span></label>
              <input
                type="text" placeholder="1234567"
                value={ghinNumber} onChange={(e) => setGhinNumber(e.target.value)}
                style={styles.input}
              />
            </div>
          </div>

          <div style={styles.inputGroup}>
            <label style={styles.label}>Password</label>
            <input
              type="password" placeholder="Minimum 6 characters"
              value={password} onChange={(e) => setPassword(e.target.value)}
              style={styles.input} required
            />
          </div>

          {error && <p style={styles.errorText}>{error}</p>}

          <button type="submit" disabled={loading} style={styles.signupBtn}>
            {loading ? 'Creating Account...' : 'Create Player Profile'}
          </button>
        </form>

        <div style={styles.footer}>
          <p style={styles.footerText}>
            Already have an account?{' '}
            <Link href="/login" style={styles.link}>Sign In</Link>
          </p>
        </div>
      </div>

      {/* VERIFICATION MODAL */}
      {showModal && (
        <div style={styles.modalOverlay}>
          <div style={styles.modalContent}>
            <div style={{ fontSize: '40px', marginBottom: '15px' }}>✉️</div>
            <h2 style={{ margin: '0 0 10px 0', fontWeight: '900', color: '#000' }}>Confirm Your Email</h2>
            <p style={{ color: '#666', fontSize: '14px', lineHeight: '1.5', marginBottom: '25px' }}>
              We've sent a verification link to <strong>{email}</strong>. 
              Please click the link in your inbox to finish setting up your profile.
            </p>
            
            <button onClick={handleResend} style={styles.resendBtn}>
              {resent ? '✅ Email Sent!' : 'Resend Verification Email'}
            </button>
            
            <div style={{ marginTop: '20px' }}>
              <Link href="/login" style={styles.link}>Back to Login</Link>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

const styles = {
  container: { padding: '20px', maxWidth: '450px', margin: '0 auto', fontFamily: 'sans-serif' as const },
  card: { background: '#fff', padding: '30px', borderRadius: '16px', boxShadow: '0 10px 25px rgba(0,0,0,0.05)', border: '1px solid #f0f0f0' },
  row: { display: 'flex', gap: '15px' },
  inputGroup: { marginBottom: '20px' },
  label: { fontSize: '10px', fontWeight: 'bold' as const, color: '#aaa', textTransform: 'uppercase' as const, letterSpacing: '1px', display: 'block', marginBottom: '8px' },
  optional: { color: '#bbb', fontWeight: 'normal' as const, textTransform: 'none' as const },
  input: { width: '100%', padding: '12px', fontSize: '15px', borderRadius: '8px', border: '1px solid #ddd', boxSizing: 'border-box' as const, color: '#000', outlineColor: '#2e7d32', backgroundColor: '#fdfdfd' },
  signupBtn: { width: '100%', padding: '14px', background: '#2e7d32', color: 'white', border: 'none', borderRadius: '8px', fontWeight: 'bold' as const, fontSize: '16px', cursor: 'pointer' as const, marginTop: '10px' },
  errorText: { color: '#d32f2f', fontSize: '13px', textAlign: 'center' as const, marginBottom: '15px' },
  footer: { marginTop: '25px', textAlign: 'center' as const },
  footerText: { fontSize: '14px', color: '#666' },
  link: { color: '#2e7d32', fontWeight: 'bold' as const, textDecoration: 'none' },
  
  // Modal Specific Styles
  modalOverlay: { position: 'fixed' as const, top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.8)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 1000, padding: '20px' },
  modalContent: { backgroundColor: '#fff', padding: '40px', borderRadius: '16px', maxWidth: '400px', width: '100%', textAlign: 'center' as const, boxShadow: '0 20px 25px rgba(0,0,0,0.2)' },
  resendBtn: { width: '100%', backgroundColor: '#000', color: '#fff', padding: '12px', borderRadius: '8px', border: 'none', fontWeight: 'bold' as const, cursor: 'pointer' as const }
}