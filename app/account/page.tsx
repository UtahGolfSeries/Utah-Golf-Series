'use client'
import { useAuth } from '../context/AuthContext'
import { useRouter } from 'next/navigation'
import { useEffect, useState, useCallback } from 'react'
import { createClient } from '@supabase/supabase-js'
import PageHeader from '../components/pageHeader'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

export default function AccountPage() {
  const { user, loading, logout } = useAuth()
  const router = useRouter()

  const [isEditing, setIsEditing] = useState(false)
  const [updating, setUpdating] = useState(false)
  const [displayName, setDisplayName] = useState('')
  const [phoneNumber, setPhoneNumber] = useState('')
  const [earnings, setEarnings] = useState(0)
  
  // New state for the Welcome Popup
  const [showWelcome, setShowWelcome] = useState(false)

  const fetchMemberData = useCallback(async () => {
    if (!user?.id) return
    try {
      const { data: memberProfile } = await supabase
        .from('member')
        .select('id')
        .eq('auth_user_id', user.id)
        .single()

      if (memberProfile) {
        const [scoresRes, transRes] = await Promise.all([
          supabase.from('scorecards').select('winnings').eq('member_id', memberProfile.id),
          supabase.from('clubhouse_transactions').select('amount').eq('member_id', memberProfile.id)
        ])
        const totalWinnings = scoresRes.data?.reduce((sum, s) => sum + (Number(s.winnings) || 0), 0) || 0
        const totalSpent = transRes.data?.reduce((sum, t) => sum + (Number(t.amount) || 0), 0) || 0
        setEarnings(totalWinnings + totalSpent)
      }
    } catch (err) { console.error(err) }
  }, [user?.id])

  useEffect(() => {
    if (user) {
      setDisplayName(user.display_name || '')
      setPhoneNumber(user.phone_number || '')
      fetchMemberData()

      // --- FIRST TIME LOGIN CHECK ---
      const hasSeenWelcome = localStorage.getItem(`welcome_shown_${user.id}`)
      if (!hasSeenWelcome) {
        setShowWelcome(true)
        localStorage.setItem(`welcome_shown_${user.id}`, 'true')
      }
    }
  }, [user, fetchMemberData])

  useEffect(() => {
    if (!loading && !user) router.push('/')
  }, [user, loading, router])

  const handleUpdate = async () => {
    if (!user?.id) return
    setUpdating(true)
    try {
      const { error } = await supabase
        .from('member')
        .update({ display_name: displayName, phone_number: phoneNumber })
        .eq('auth_user_id', user.id)
      if (error) throw error
      setIsEditing(false)
      window.location.reload() 
    } catch (error: any) {
      alert("Error: " + error.message)
    } finally { setUpdating(false) }
  }

  if (loading) return <div style={styles.loader}>Loading Profile...</div>

  return (
    <div style={styles.container}>
      {/* WELCOME POPUP OVERLAY */}
      {showWelcome && (
        <div style={styles.overlay}>
          <div style={styles.modal}>
            <h2 style={{ color: '#2e7d32', marginTop: 0 }}>⛳️ Welcome Aboard!</h2>
            <p style={{ color: '#444', lineHeight: '1.5' }}>
              Your account is now verified. You can track your handicap, manage your clubhouse credit, and enter tournament scores directly from this portal.
            </p>
            <button 
              onClick={() => setShowWelcome(false)} 
              style={{ ...styles.saveBtn, width: '100%', marginTop: '10px' }}
            >
              Let's Go!
            </button>
          </div>
        </div>
      )}

      <PageHeader 
        title="My Profile" 
        subtitle={user?.role === 'admin' ? "ADMINISTRATOR ACCOUNT" : "MEMBER ACCOUNT SETTINGS"}
      />

      <div style={styles.card}>
        {user?.role !== 'admin' && (
          <div style={styles.earningsBox}>
            <div style={{ flex: 1 }}>
              <label style={{ ...styles.label, color: '#2e7d32' }}>Clubhouse Credit</label>
              <p style={styles.earningsValue}>${Number(earnings || 0).toFixed(2)}</p>
            </div>
            <div style={{ textAlign: 'right' }}>
               <span style={{ fontSize: '10px', color: '#2e7d32', fontWeight: 'bold' }}>SEASON TOTAL</span>
            </div>
          </div>
        )}

        <div style={styles.infoGroup}>
          <label style={styles.label}>Display Name</label>
          {isEditing ? (
            <input 
              style={styles.input}
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              autoFocus
            />
          ) : (
            <p style={styles.value}>{user?.display_name || 'Not Set'}</p>
          )}
        </div>

        <div style={styles.infoGroup}>
          <label style={styles.label}>Phone Number</label>
          {isEditing ? (
            <input 
              style={styles.input}
              value={phoneNumber}
              onChange={(e) => setPhoneNumber(e.target.value)}
              type="tel"
            />
          ) : (
            <p style={styles.value}>{user?.phone_number || 'Not Set'}</p>
          )}
        </div>

        <div style={styles.infoGroup}>
          <label style={styles.label}>Email Address</label>
          <p style={styles.value}>{user?.email}</p>
        </div>

        {user?.role !== 'admin' && (
          <>
            <div style={styles.handicapBox}>
              <div style={{ flex: 1 }}>
                <label style={{ ...styles.label, color: '#2e7d32' }}>Official Handicap Index</label>
                <p style={styles.handicapValue}>{user?.handicap_index ?? '0.0'}</p>
              </div>
            </div>
            <p style={styles.disclaimer}>*Handicap is managed by the Admin.</p>
          </>
        )}

        <div style={styles.buttonRow}>
          {isEditing ? (
            <>
              <button onClick={() => setIsEditing(false)} style={styles.cancelBtn}>Cancel</button>
              <button onClick={handleUpdate} disabled={updating} style={styles.saveBtn}>
                {updating ? 'Saving...' : 'Save'}
              </button>
            </>
          ) : (
            <>
              <button onClick={() => setIsEditing(true)} style={styles.editBtn}>Edit Info</button>
              <button onClick={logout} style={styles.logoutBtn}>Sign Out</button>
            </>
          )}
        </div>
      </div>
    </div>
  )
}

const styles = {
  // Existing Styles...
  container: { padding: '20px', maxWidth: '400px', margin: '0 auto', fontFamily: 'sans-serif' as const },
  loader: { padding: '100px 20px', textAlign: 'center' as const },
  card: { background: '#fff', padding: '25px', borderRadius: '12px', boxShadow: '0 4px 12px rgba(0,0,0,0.1)', border: '1px solid #eee' },
  earningsBox: { display: 'flex', alignItems: 'center', background: '#e8f5e9', padding: '15px', borderRadius: '8px', border: '1px solid #2e7d32', marginBottom: '20px' },
  earningsValue: { fontSize: '28px', fontWeight: 'bold' as const, color: '#2e7d32', margin: 0 },
  infoGroup: { marginBottom: '20px' },
  label: { fontSize: '11px', fontWeight: 'bold' as const, color: '#888', textTransform: 'uppercase' as const, letterSpacing: '0.5px' },
  value: { fontSize: '16px', color: '#000', marginTop: '5px', fontWeight: 'bold' as const },
  input: { width: '100%', padding: '10px', fontSize: '16px', borderRadius: '4px', border: '2px solid #2e7d32', marginTop: '5px', boxSizing: 'border-box' as const, color: '#000', backgroundColor: '#fff', fontWeight: 'bold' as const, outline: 'none' },
  handicapBox: { display: 'flex', alignItems: 'center', background: '#f0f7f0', padding: '15px', borderRadius: '8px', border: '1px solid #c8e6c9', marginTop: '10px' },
  handicapValue: { fontSize: '28px', fontWeight: 'bold' as const, color: '#1b5e20', margin: 0 },
  disclaimer: { fontSize: '11px', color: '#999', fontStyle: 'italic' as const, marginTop: '8px', textAlign: 'center' as const },
  buttonRow: { display: 'flex', gap: '10px', marginTop: '25px' },
  editBtn: { flex: 1, padding: '12px', background: '#f5f5f5', color: '#333', border: '1px solid #ddd', borderRadius: '6px', fontWeight: 'bold' as const, cursor: 'pointer' },
  logoutBtn: { flex: 1, padding: '12px', background: '#f8d7da', color: '#721c24', border: '1px solid #f5c6cb', borderRadius: '6px', fontWeight: 'bold' as const, cursor: 'pointer' },
  saveBtn: { flex: 2, padding: '12px', background: '#2e7d32', color: 'white', border: 'none', borderRadius: '6px', fontWeight: 'bold' as const, cursor: 'pointer' },
  cancelBtn: { flex: 1, padding: '12px', background: '#eee', color: '#666', border: 'none', borderRadius: '6px', fontWeight: 'bold' as const, cursor: 'pointer' },

  // --- NEW POPUP STYLES ---
  overlay: {
    position: 'fixed' as const,
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.7)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 1000,
    padding: '20px'
  },
  modal: {
    background: 'white',
    padding: '30px',
    borderRadius: '16px',
    maxWidth: '350px',
    textAlign: 'center' as const,
    boxShadow: '0 10px 25px rgba(0,0,0,0.2)'
  }
}