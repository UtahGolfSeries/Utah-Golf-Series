'use client'
import { useState, useEffect } from 'react'
import { useAuth } from '../../context/AuthContext'
import { createClient } from '@supabase/supabase-js'
import { useRouter } from 'next/navigation'

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!)

export default function MemberDirectory() {
  const { user, loading: authLoading } = useAuth()
  const router = useRouter()
  const [members, setMembers] = useState<any[]>([])
  const [viewState, setViewState] = useState<'checking' | 'authorized' | 'denied'>('checking')
  const [dataLoading, setDataLoading] = useState(false)

  // 1. Handle Authorization
  useEffect(() => {
    if (!authLoading) {
      if (user?.role === 'admin') {
        setViewState('authorized')
      } else {
        setViewState('denied')
        router.replace('/')
      }
    }
  }, [user, authLoading, router])

  // 2. Handle Data Fetching with a "Safety Delay"
  useEffect(() => {
    if (viewState !== 'authorized') return

    const loadData = async () => {
      setDataLoading(true)
      // Small 100ms delay to let Turbopack settle its "Abort" signals
      await new Promise(resolve => setTimeout(resolve, 100))
      
      try {
        const { data, error } = await supabase
          .from('member')
          .select('*')
          .order('display_name', { ascending: true })

        if (!error && data) {
          setMembers(data)
        }
      } catch (err) {
        console.error("Data fetch aborted or failed", err)
      } finally {
        setDataLoading(false)
      }
    }

    loadData()
  }, [viewState])

  if (viewState === 'checking' || authLoading) {
    return <div style={styles.loader}>Checking Admin Permissions...</div>
  }

  if (dataLoading && members.length === 0) {
    return <div style={styles.loader}>Loading Members...</div>
  }

  return (
    <div style={styles.container}>
      <div style={styles.header}>
        <h1>League Members ({members.length})</h1>
      </div>
      <div style={styles.tableWrapper}>
        <table style={styles.table}>
          <thead>
            <tr>
              <th style={styles.th}>Name</th>
              <th style={styles.th}>Handicap</th>
              <th style={styles.th}>Phone</th>
              <th style={styles.th}>Status</th>
            </tr>
          </thead>
          <tbody>
            {members.map((m) => (
              <tr key={m.id} style={styles.tr}>
                <td style={styles.td}><strong>{m.display_name}</strong></td>
                <td style={styles.td}>{m.handicap_index}</td>
                <td style={styles.td}>{m.phone_number || 'N/A'}</td>
                <td style={styles.td}>
                   {m.has_submitted_current_round ? 
                    <span style={styles.badgeDone}>Submitted</span> : 
                    <span style={styles.badgePending}>Pending</span>
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
  loader: { padding: '100px 20px', textAlign: 'center' as const, fontSize: '18px', color: '#666' },
  header: { marginBottom: '20px', borderBottom: '2px solid #eee', paddingBottom: '10px' },
  tableWrapper: { overflowX: 'auto' as const, background: '#fff', borderRadius: '8px', boxShadow: '0 2px 8px rgba(0,0,0,0.1)' },
  table: { width: '100%', borderCollapse: 'collapse' as const, textAlign: 'left' as const },
  th: { padding: '12px', background: '#f8f9fa', borderBottom: '1px solid #eee', color: '#666', fontSize: '11px', textTransform: 'uppercase' as const },
  td: { padding: '12px', borderBottom: '1px solid #eee', fontSize: '14px' },
  tr: { borderBottom: '1px solid #eee' },
  badgeDone: { background: '#d4edda', color: '#155724', padding: '4px 8px', borderRadius: '4px', fontSize: '11px', fontWeight: 'bold' as const },
  badgePending: { background: '#fff3cd', color: '#856404', padding: '4px 8px', borderRadius: '4px', fontSize: '11px', fontWeight: 'bold' as const },
}