'use client'
import { useState, useEffect } from 'react'
import { useAuth } from '../../context/AuthContext'
import { createClient } from '@supabase/supabase-js'
import { useRouter } from 'next/navigation'

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!)

export default function TournamentOps() {
  const { user, loading: authLoading } = useAuth()
  const router = useRouter()
  
  // Data State
  const [members, setMembers] = useState<any[]>([])
  const [currentWeek, setCurrentWeek] = useState<number>(1)
  const [viewingWeek, setViewingWeek] = useState<number>(0)
  
  // UI State
  const [viewState, setViewState] = useState<'checking' | 'authorized' | 'denied'>('checking')
  const [dataLoading, setDataLoading] = useState(false)
  const [isGlobalUpdating, setIsGlobalUpdating] = useState(false)
  
  // Modal State - UPDATED: Default side to 'Front' to avoid 'All' leak
  const [showModal, setShowModal] = useState(false)
  const [roundSettings, setRoundSettings] = useState({
    holes: 18,
    tee: 'White',
    side: 'All' 
  })

  // 1. Authorization Guard
  useEffect(() => {
    if (!authLoading) {
      if (user?.role === 'admin') setViewState('authorized')
      else {
        setViewState('denied')
        router.replace('/')
      }
    }
  }, [user, authLoading, router])

  // 2. Load Data Function
  const loadTournamentData = async () => {
  setDataLoading(true)
  try {
    const { data: settings } = await supabase.from('league_settings').select('current_week').eq('id', 1).single()
    
    if (settings) {
      setCurrentWeek(settings.current_week)
      
      // FIX: If we just opened the page (viewingWeek is 0), 
      // set it to the current week from the database.
      if (viewingWeek === 0) {
        setViewingWeek(settings.current_week)
        return; // Exit and let the useEffect trigger the reload with the correct week
      }
    }

      const { data: memberData } = await supabase
        .from('member')
        .select(`
          id, 
          display_name, 
          handicap_index,
          flight,
          is_checked_in,
          has_submitted_current_round,
          scorecards (score, net_score, week_number, holes_played, tee_played, side_played)
        `)
        .neq('role', 'admin')
        .order('display_name', { ascending: true })

      if (memberData) {
        const processed = memberData.map(m => {
          const weekScore = m.scorecards?.find((s: any) => s.week_number === viewingWeek)
          return { ...m, weekScore }
        })
        setMembers(processed)
      }
    } catch (err) {
      console.error("Fetch error:", err)
    } finally {
      setDataLoading(false)
    }
  }

  useEffect(() => {
    if (viewState === 'authorized') loadTournamentData()
  }, [viewingWeek, viewState])

  // 3. Actions: Check-In
  const toggleCheckIn = async (memberId: string, currentStatus: boolean) => {
    const { error } = await supabase
      .from('member')
      .update({ is_checked_in: !currentStatus })
      .eq('id', memberId)

    if (!error) {
      setMembers(members.map(m => m.id === memberId ? { ...m, is_checked_in: !currentStatus } : m))
    }
  }

  // 4. Actions: Reset Individual Scorecard
  const handleResetScorecard = async (memberId: string) => {
    if (!window.confirm("This will DELETE their current score for this week. Continue?")) return

    try {
      await supabase.from('scorecards').delete().match({ member_id: memberId, week_number: currentWeek })
      await supabase.from('member').update({ has_submitted_current_round: false }).eq('id', memberId)

      setMembers(members.map(m => 
        m.id === memberId ? { ...m, has_submitted_current_round: false, weekScore: null } : m
      ))
      alert("Scorecard reset.")
    } catch (err) {
      alert("Failed to reset scorecard.")
    }
  }

  // 5. Actions: Global New Round
  const handleStartNewRoundTrigger = () => {
    setShowModal(true)
  }

  const confirmStartNewRound = async () => {
    setIsGlobalUpdating(true)
    try {
      const nextWeek = currentWeek + 1

      await supabase.from('league_settings').update({ 
        current_week: nextWeek,
        holes_to_play: roundSettings.holes,
        tee_color: roundSettings.tee,
        side_to_play: roundSettings.side
      }).eq('id', 1)

      await supabase.from('member').update({ 
        has_submitted_current_round: false,
        is_checked_in: false 
      }).neq('role', 'admin')
      
      setCurrentWeek(nextWeek)
      setViewingWeek(nextWeek)
      setShowModal(false)
      loadTournamentData()
      alert(`Week ${nextWeek} is live!`)
    } catch (err) {
      alert("Error starting round")
    } finally {
      setIsGlobalUpdating(false)
    }
  }

  if (viewState === 'checking' || authLoading) return <div style={styles.loader}>Verifying Admin...</div>

  return (
    <div style={styles.container}>
      {/* HEADER */}
      <div style={styles.header}>
        <div>
          <h1 style={{ color: '#000', margin: 0 }}>Tournament Ops</h1>
          <p style={{ color: viewingWeek === currentWeek ? '#2e7d32' : '#d32f2f', fontWeight: 'bold' }}>
            VIEWING: WEEK {viewingWeek} {viewingWeek !== currentWeek && "(READ-ONLY ARCHIVE)"}
          </p>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end' }}>
            <label style={{ fontSize: '10px', color: '#666', marginBottom: '2px' }}>Jump to Week:</label>
            <select 
              value={viewingWeek} 
              onChange={(e) => setViewingWeek(Number(e.target.value))}
              style={styles.weekSelect}
            >
              {Array.from({ length: currentWeek }, (_, i) => i + 1).map(w => (
                <option key={w} value={w}>Week {w}</option>
              ))}
            </select>
          </div>

          <button onClick={handleStartNewRoundTrigger} disabled={isGlobalUpdating} style={styles.newRoundBtn}>
            Start Week {currentWeek + 1}
          </button>
        </div>
      </div>

      {/* MEMBER TABLE */}
      <div style={styles.tableWrapper}>
        <table style={styles.table}>
          <thead>
            <tr>
              <th style={styles.th}>Actions</th>
              <th style={styles.th}>Player</th>
              <th style={styles.th}>Check-In</th>
              <th style={styles.th}>Scoring</th>
              <th style={styles.th}>Round Details</th>
              <th style={styles.th}>Net Score</th>
            </tr>
          </thead>
          <tbody>
            {members.map((m) => (
              <tr key={m.id} style={styles.tr}>
                <td style={styles.td}>
                  {viewingWeek === currentWeek && m.has_submitted_current_round && (
                    <button onClick={() => handleResetScorecard(m.id)} style={styles.resetBtn}>
                      Reset Score
                    </button>
                  )}
                </td>

                <td style={styles.td}>
                  <div style={{fontSize: '10px', color: '#888'}}>Flight {m.flight}</div>
                  <strong style={{ color: '#1a1a1a' }}>{m.display_name}</strong>
                </td>

                <td style={styles.td}>
                  {m.has_submitted_current_round ? (
                    <span style={styles.badgeFinished}>Submitted</span>
                  ) : viewingWeek === currentWeek ? (
                    m.is_checked_in ? (
                      <button onClick={() => toggleCheckIn(m.id, m.is_checked_in)} style={styles.checkedBtn}>
                        ✅ Checked In
                      </button>
                    ) : (
                      <button onClick={() => toggleCheckIn(m.id, m.is_checked_in)} style={styles.uncheckedBtn}>
                        Check In
                      </button>
                    )
                  ) : (
                    <span style={{ color: '#888', fontSize: '12px' }}>
                      {m.is_checked_in ? 'Was Checked In' : 'No Check-In'}
                    </span>
                  )}
                </td>

                <td style={styles.td}>
                  {m.has_submitted_current_round ? 
                    <span style={styles.badgeDone}>Finished</span> : 
                    <span style={styles.badgePending}>{m.is_checked_in ? 'On Course' : 'Waiting'}</span>
                  }
                </td>

                <td style={styles.td}>
                  {m.weekScore ? (
                    <div style={{ fontSize: '11px', lineHeight: '1.4' }}>
                      <span style={{ 
                        color: m.weekScore.tee_played?.toLowerCase() === 'white' ? '#555' : m.weekScore.tee_played?.toLowerCase(),
                        fontWeight: 'bold',
                        textTransform: 'capitalize'
                      }}>
                        {m.weekScore.tee_played || 'White'} Tees
                      </span>
                      <div style={{ color: '#666' }}>
                        {/* FIX: Handle 'All' bug by defaulting to 'Front' for 9 hole display */}
                        {m.weekScore.holes_played === 18 
                          ? '18 Holes' 
                          : `${m.weekScore.side_played === 'All' ? 'Front' : (m.weekScore.side_played || '9')} Nine`
                        }
                      </div>
                    </div>
                  ) : (
                    <span style={{ color: '#ccc', fontSize: '11px' }}>--</span>
                  )}
                </td>
                
                <td style={{ ...styles.td, color: '#2e7d32', fontWeight: 'bold' }}>
                  {m.weekScore?.net_score || '--'}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* CONFIGURATION MODAL */}
      {showModal && (
        <div style={styles.modalOverlay}>
          <div style={styles.modalContent}>
            <h2 style={styles.modalTitle}>Configure Week {currentWeek + 1}</h2>
            <p style={styles.modalSubtitle}>Set the rules for this round.</p>
            
            <div style={styles.field}>
              <label style={styles.label}>Holes to Play</label>
              <select 
                style={styles.select}
                value={roundSettings.holes}
                onChange={(e) => {
                    const val = Number(e.target.value);
                    setRoundSettings({
                        ...roundSettings, 
                        holes: val,
                        // AUTOMATIC FIX: If switching to 9, move side away from 'All'
                        side: val === 18 ? 'All' : 'Front' 
                    })
                }}
              >
                <option value="18">18 Holes</option>
                <option value="9">9 Holes</option>
              </select>
            </div>

            {roundSettings.holes === 9 && (
              <div style={styles.field}>
                <label style={styles.label}>Which Side?</label>
                <select 
                  style={styles.select}
                  value={roundSettings.side}
                  onChange={(e) => setRoundSettings({...roundSettings, side: e.target.value})}
                >
                  <option value="Front">Front 9</option>
                  <option value="Back">Back 9</option>
                </select>
              </div>
            )}

            <div style={styles.field}>
              <label style={styles.label}>Tee Color</label>
              <select 
                style={styles.select}
                value={roundSettings.tee}
                onChange={(e) => setRoundSettings({...roundSettings, tee: e.target.value})}
              >
                <option value="White">White</option>
                <option value="Blue">Blue</option>
                <option value="Black">Black</option>
                <option value="Red">Red</option>
              </select>
            </div>

            <div style={styles.modalActions}>
              <button onClick={() => setShowModal(false)} style={styles.cancelBtn}>Cancel</button>
              <button onClick={confirmStartNewRound} style={styles.confirmBtn} disabled={isGlobalUpdating}>
                {isGlobalUpdating ? 'Saving...' : 'Start Round'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

const styles: { [key: string]: React.CSSProperties } = {
  container: { padding: '20px', maxWidth: '950px', margin: '0 auto', fontFamily: 'sans-serif' as const },
  loader: { padding: '100px 20px', textAlign: 'center' as const },
  header: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' },
  newRoundBtn: { background: '#1a1a1a', color: 'white', padding: '10px 15px', border: 'none', borderRadius: '6px', cursor: 'pointer', fontSize: '13px' },
  tableWrapper: { background: '#fff', borderRadius: '8px', boxShadow: '0 2px 8px rgba(0,0,0,0.1)', overflow: 'hidden' },
  table: { width: '100%', borderCollapse: 'collapse' as const },
  th: { padding: '12px', background: '#f8f9fa', borderBottom: '1px solid #eee', color: '#666', fontSize: '11px', textTransform: 'uppercase' as const, textAlign: 'left' as const },
  td: { padding: '12px', borderBottom: '1px solid #eee', fontSize: '14px' },
  tr: { borderBottom: '1px solid #eee' },
  uncheckedBtn: { padding: '6px 12px', background: '#fff', border: '1px solid #ddd', borderRadius: '4px', cursor: 'pointer', fontSize: '12px', color: '#000' },
  checkedBtn: { padding: '6px 12px', background: '#d4edda', border: '1px solid #c3e6cb', color: '#155724', borderRadius: '4px', cursor: 'pointer', fontSize: '12px', fontWeight: 'bold' as const },
  badgeDone: { background: '#d1ecf1', color: '#0c5460', padding: '3px 8px', borderRadius: '4px', fontSize: '11px' },
  badgePending: { color: '#888', fontSize: '11px' },
  resetBtn: { padding: '6px 10px', background: '#fff', border: '1px solid #dc3545', color: '#dc3545', borderRadius: '4px', cursor: 'pointer', fontSize: '11px', fontWeight: 'bold' as const },
  badgeFinished: { display: 'inline-block', padding: '6px 12px', background: '#e9ecef', color: '#495057', borderRadius: '4px', fontSize: '12px', fontWeight: 'bold' as const, border: '1px solid #ced4da' },
  weekSelect: {
  padding: '8px 12px',
  borderRadius: '6px',
  border: '1px solid #ddd',
  backgroundColor: '#fff', // Ensures the background is white
  color: '#000',           // Explicitly sets the text color to black
  fontSize: '13px',
  cursor: 'pointer',
  outline: 'none',
  appearance: 'none',      // Optional: helps with consistent styling on mobile
},
  modalOverlay: { position: 'fixed' as const, top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.7)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 },
  modalContent: { background: 'white', padding: '30px', borderRadius: '12px', width: '100%', maxWidth: '400px', boxShadow: '0 4px 20px rgba(0,0,0,0.3)', color: '#000' },
  modalTitle: { marginTop: 0, color: '#000', fontSize: '24px' },
  modalSubtitle: { color: '#000', fontSize: '14px', marginBottom: '20px' },
  field: { marginBottom: '20px', display: 'flex', flexDirection: 'column' as const, gap: '8px' },
  label: { fontSize: '14px', fontWeight: 'bold' as const, color: '#000' },
  select: { padding: '10px', borderRadius: '6px', border: '1px solid #ddd', fontSize: '16px', color: '#000', backgroundColor: '#fff' },
  modalActions: { display: 'flex', gap: '10px', marginTop: '20px' },
  cancelBtn: { flex: 1, padding: '12px', background: '#eee', border: 'none', borderRadius: '6px', cursor: 'pointer', color: '#000' },
  confirmBtn: { flex: 2, padding: '12px', background: '#2e7d32', color: 'white', border: 'none', borderRadius: '6px', cursor: 'pointer', fontWeight: 'bold' as const },
}