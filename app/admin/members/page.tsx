'use client'
import { useState, useEffect } from 'react'
import { useAuth } from '../../context/AuthContext'
import { createClient } from '@supabase/supabase-js'
import { useRouter } from 'next/navigation'

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!)

export default function RosterManagement() {
  const { user, loading: authLoading } = useAuth()
  const router = useRouter()
  const [members, setMembers] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [updatingId, setUpdatingId] = useState<string | null>(null)

  // 1. Protection
  useEffect(() => {
    if (!authLoading && user?.role !== 'admin') {
      router.replace('/')
    }
  }, [user, authLoading])

  // 2. Fetch Roster
  const fetchRoster = async () => {
  setLoading(true)
  const { data } = await supabase
    .from('member')
    .select('*')
    .neq('role', 'admin') // <--- ADD THIS LINE
    .order('display_name', { ascending: true })
  
  if (data) setMembers(data)
  setLoading(false)
}

  useEffect(() => {
    fetchRoster()
  }, [])

  // 3. Update Function
  const handleUpdate = async (id: string, updates: any) => {
    setUpdatingId(id)
    const { error } = await supabase
      .from('member')
      .update(updates)
      .eq('id', id)

    if (error) alert("Update failed: " + error.message)
    setUpdatingId(null)
  }

  if (loading || authLoading) return <div style={styles.loader}>Loading Roster...</div>

  return (
    <div style={styles.container}>
      <div style={styles.header}>
        <h1>Roster Management</h1>
        <p>Adjust handicaps and assign flights. Changes save automatically.</p>
      </div>

      <div style={styles.tableWrapper}>
        <table style={styles.table}>
          <thead>
            <tr>
              <th style={styles.th}>Name</th>
              <th style={styles.th}>Handicap Index</th>
              <th style={styles.th}>Flight</th>
              <th style={styles.th}>Status</th>
            </tr>
          </thead>
          <tbody>
            {members.map((m) => (
              <tr key={m.id} style={styles.tr}>
                <td style={styles.td}>
                  <strong style={{ color: '#1a1a1a' }}>{m.display_name}</strong>
                </td>
                
                <td style={styles.td}>
                  <input 
                    type="number" 
                    step="0.1"
                    defaultValue={m.handicap_index}
                    onBlur={(e) => handleUpdate(m.id, { handicap_index: parseFloat(e.target.value) })}
                    style={styles.inlineInput}
                  />
                </td>

                <td style={styles.td}>
                  <select 
                    defaultValue={m.flight || 'A'} 
                    onChange={(e) => handleUpdate(m.id, { flight: e.target.value })}
                    style={styles.inlineSelect}
                  >
                    <option value="A">Flight A</option>
                    <option value="B">Flight B</option>
                    <option value="C">Flight C</option>
                    <option value="D">Flight D</option>
                  </select>
                </td>

                <td style={styles.td}>
                  {updatingId === m.id ? 
                    <span style={{color: '#666', fontSize: '12px'}}>Saving...</span> : 
                    <span style={{color: '#2e7d32', fontSize: '12px'}}>Saved</span>
                  }
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}

const styles = {
  container: { padding: '20px', maxWidth: '800px', margin: '0 auto', fontFamily: 'sans-serif' as const },
  loader: { padding: '100px 20px', textAlign: 'center' as const },
  header: { marginBottom: '20px', borderBottom: '2px solid #eee', paddingBottom: '15px' },
  tableWrapper: { background: '#fff', borderRadius: '8px', boxShadow: '0 2px 8px rgba(0,0,0,0.1)' },
  table: { width: '100%', borderCollapse: 'collapse' as const },
  th: { padding: '12px', background: '#f8f9fa', borderBottom: '1px solid #eee', color: '#666', fontSize: '11px', textTransform: 'uppercase' as const, textAlign: 'left' as const },
  td: { padding: '12px', borderBottom: '1px solid #eee', fontSize: '14px' },
  tr: { borderBottom: '1px solid #eee' },
  inlineInput: { 
    width: '80px', 
    padding: '6px', 
    borderRadius: '4px', 
    border: '1px solid #ddd',
    fontSize: '14px'
  },
  inlineSelect: { 
    padding: '6px', 
    borderRadius: '4px', 
    border: '1px solid #ddd',
    fontSize: '14px',
    backgroundColor: '#fff'
  }
}