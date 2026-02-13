'use client'
import { useAuth } from '../context/AuthContext'
import { useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!)

export default function AccountPage() {
  const { user, loading, logout } = useAuth()
  const router = useRouter()

  // State for toggling modes
  const [isEditing, setIsEditing] = useState(false)
  const [updating, setUpdating] = useState(false)

  // Local state for the inputs
  const [displayName, setDisplayName] = useState('')
  const [phoneNumber, setPhoneNumber] = useState('')

  useEffect(() => {
    if (user) {
      setDisplayName(user.display_name || '')
      setPhoneNumber(user.phone_number || '')
    }
  }, [user])

  useEffect(() => {
    if (!loading && !user) {
      router.push('/')
    }
  }, [user, loading, router])

  const handleUpdate = async () => {
    setUpdating(true)
    const { error } = await supabase
      .from('member')
      .update({ 
        display_name: displayName, 
        phone_number: phoneNumber 
      })
      .eq('auth_user_id', user.id)

    if (error) {
      alert("Error: " + error.message)
    } else {
      setIsEditing(false)
      window.location.reload()
    }
    setUpdating(false)
  }

  if (loading) return <div style={styles.container}>Loading Profile...</div>

  return (
    <div style={styles.container}>
      <h1 style={{ textAlign: 'center' }}>My Profile</h1>

      <div style={styles.card}>
        
        {/* DISPLAY NAME */}
        <div style={styles.infoGroup}>
          <label style={styles.label}>Display Name</label>
          {isEditing ? (
            <input 
              style={styles.input}
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
            />
          ) : (
            <p style={styles.value}>{user?.display_name || 'Not Set'}</p>
          )}
        </div>

        {/* PHONE NUMBER */}
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

        {/* READ ONLY EMAIL */}
        <div style={styles.infoGroup}>
          <label style={styles.label}>Email Address</label>
          <p style={styles.value}>{user?.email}</p>
        </div>

        {/* HANDICAP SECTION */}
        <div style={styles.handicapBox}>
          <div style={{ flex: 1 }}>
            <label style={{ ...styles.label, color: '#2e7d32' }}>Official Handicap Index</label>
            <p style={styles.handicapValue}>{user?.handicap_index ?? '0.0'}</p>
          </div>
        </div>
        <p style={styles.disclaimer}>*Handicap is managed by the Admin.</p>

        {/* BUTTON ROW */}
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
  container: { padding: '20px', maxWidth: '400px', margin: '0 auto', fontFamily: 'sans-serif' as const },
  card: { 
    background: '#fff', 
    padding: '25px', 
    borderRadius: '12px', 
    boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
    border: '1px solid #eee' 
  },
  infoGroup: { marginBottom: '20px' },
  label: { fontSize: '11px', fontWeight: 'bold' as const, color: '#888', textTransform: 'uppercase' as const, letterSpacing: '0.5px' },
  value: { fontSize: '16px', color: '#333', marginTop: '5px', fontWeight: '500' as const },
  input: {
    width: '100%',
    padding: '10px',
    fontSize: '16px',
    borderRadius: '4px',
    border: '2px solid #2e7d32', // Slightly thicker border for better visibility
    marginTop: '5px',
    boxSizing: 'border-box' as const,
    color: '#000000',           // <--- Pure black text for maximum readability
    backgroundColor: '#ffffff', // Ensure background is pure white
    fontWeight: '500' as const, // Makes the text a tiny bit thicker
    outline: 'none'             // Removes the default browser glow
  },
  handicapBox: { 
    display: 'flex', 
    alignItems: 'center', 
    background: '#f0f7f0', 
    padding: '15px', 
    borderRadius: '8px', 
    border: '1px solid #c8e6c9',
    marginTop: '10px'
  },
  handicapValue: { fontSize: '28px', fontWeight: 'bold' as const, color: '#1b5e20', margin: 0 },
  disclaimer: { fontSize: '11px', color: '#999', fontStyle: 'italic' as const, marginTop: '8px', textAlign: 'center' as const },
  
  buttonRow: { display: 'flex', gap: '10px', marginTop: '25px' },
  editBtn: { flex: 1, padding: '12px', background: '#f5f5f5', color: '#333', border: '1px solid #ddd', borderRadius: '6px', fontWeight: 'bold' as const, cursor: 'pointer' },
  logoutBtn: { flex: 1, padding: '12px', background: '#f8d7da', color: '#721c24', border: '1px solid #f5c6cb', borderRadius: '6px', fontWeight: 'bold' as const, cursor: 'pointer' },
  saveBtn: { flex: 2, padding: '12px', background: '#2e7d32', color: 'white', border: 'none', borderRadius: '6px', fontWeight: 'bold' as const, cursor: 'pointer' },
  cancelBtn: { flex: 1, padding: '12px', background: '#eee', color: '#666', border: 'none', borderRadius: '6px', fontWeight: 'bold' as const, cursor: 'pointer' }
}