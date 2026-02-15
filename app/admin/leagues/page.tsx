'use client'
import React, { useState, useEffect } from 'react'
import { useAuth } from '../../context/AuthContext'
import { createClient } from '@supabase/supabase-js'
import { useRouter } from 'next/navigation'

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!)

export default function TournamentOps() {
  const { user, loading: authLoading } = useAuth()
  const router = useRouter()
  const [course, setCourse] = useState<any>(null);
  
  const [members, setMembers] = useState<any[]>([])
  const [currentWeek, setCurrentWeek] = useState<number>(1)
  const [viewingWeek, setViewingWeek] = useState<number>(0)
  const [expandedPlayerId, setExpandedPlayerId] = useState<string | null>(null);
  
  const [viewState, setViewState] = useState<'checking' | 'authorized' | 'denied'>('checking')
  const [dataLoading, setDataLoading] = useState(false)
  const [isGlobalUpdating, setIsGlobalUpdating] = useState(false)
  const [searchTerm, setSearchTerm] = useState("");
  
  const [showModal, setShowModal] = useState(false)
  const [roundSettings, setRoundSettings] = useState({
    holes: 18,
    tee: 'White',
    side: 'All' 
  })

  useEffect(() => {
    if (!authLoading) {
      if (user?.role === 'admin') setViewState('authorized')
      else {
        setViewState('denied')
        router.replace('/')
      }
    }
  }, [user, authLoading, router])

  const loadTournamentData = async () => {
    setDataLoading(true)
    try {
      // Fetch Course Data for Handicap Calculations
      const { data: courseData } = await supabase.from('courses').select('*').limit(1).single()
      if (courseData) setCourse(courseData)

      const { data: settings } = await supabase.from('league_settings').select('current_week').eq('id', 1).single()
      
      if (settings) {
        setCurrentWeek(settings.current_week)
        if (viewingWeek === 0) {
          setViewingWeek(settings.current_week)
          return; 
        }
      }

      const { data: memberData, error: fetchError } = await supabase
        .from('member')
        .select(`
          id, 
          display_name, 
          handicap_index,
          flight,
          is_checked_in,
          has_submitted_current_round,
          scorecards (id, score, net_score, week_number, holes_played, tee_played, side_played, hole_scores, created_at)
        `)
        .neq('role', 'admin')
        .order('display_name', { ascending: true });

      if (fetchError) throw fetchError;

      if (memberData) {
        const processed = memberData.map(m => {
          const matchingScores = m.scorecards?.filter((s: any) => s.week_number === viewingWeek) || [];
          const weekScore = matchingScores.sort((a: any, b: any) => 
            new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
          )[0] || null;

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

  const toggleCheckIn = async (memberId: string, currentStatus: boolean) => {
    const { error } = await supabase
      .from('member')
      .update({ is_checked_in: !currentStatus })
      .eq('id', memberId)

    if (!error) {
      setMembers(members.map(m => m.id === memberId ? { ...m, is_checked_in: !currentStatus } : m))
    }
  }

  const handleResetScorecard = async (memberId: string) => {
    if (!window.confirm("This will DELETE their current score for this week. Continue?")) return
    try {
      const { error: deleteError } = await supabase
        .from('scorecards')
        .delete()
        .match({ member_id: memberId, week_number: viewingWeek })

      if (deleteError) throw deleteError

      const { error: memberError } = await supabase
        .from('member')
        .update({ has_submitted_current_round: false })
        .eq('id', memberId)

      if (memberError) throw memberError

      setMembers(prevMembers => 
        prevMembers.map(m => 
          m.id === memberId 
            ? { ...m, has_submitted_current_round: false, weekScore: null } 
            : m
        )
      );

      if (expandedPlayerId === memberId) setExpandedPlayerId(null);
      alert("Scorecard reset successfully.")
    } catch (err: any) {
      console.error("Reset error:", err.message)
      alert("Failed to reset scorecard.")
    }
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
      await supabase.from('member').update({ has_submitted_current_round: false, is_checked_in: false }).neq('role', 'admin')
      setCurrentWeek(nextWeek)
      setViewingWeek(nextWeek)
      setShowModal(false)
      loadTournamentData()
    } catch (err) { alert("Error starting round") } finally { setIsGlobalUpdating(false) }
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
        
        <div style={{ display: 'flex', alignItems: 'flex-end', gap: '15px' }}>
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start' }}>
            <label style={{ fontSize: '10px', color: '#666', marginBottom: '2px', textTransform: 'uppercase' }}>Jump to Week:</label>
            <select value={viewingWeek} onChange={(e) => setViewingWeek(Number(e.target.value))} style={styles.weekSelect}>
              {Array.from({ length: currentWeek }, (_, i) => i + 1).map(w => (
                <option key={w} value={w} style={{ color: '#000' }}>Week {w}</option>
              ))}
            </select>
          </div>
          <button onClick={() => setShowModal(true)} disabled={isGlobalUpdating} style={styles.newRoundBtn}>
            Start Week {currentWeek + 1}
          </button>
        </div>
      </div>

      {/* SEARCH BAR */}
      <div style={{ marginBottom: '20px' }}>
        <input
          type="text"
          placeholder="Search for a player..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          style={styles.searchInput}
        />
      </div>

      {/* MEMBER TABLES BY FLIGHT */}
      {['A', 'B', 'C', 'D'].map((flightLabel) => {
        const flightMembers = members.filter(m => 
          m.flight === flightLabel && 
          m.display_name.toLowerCase().includes(searchTerm.toLowerCase())
        );
        
        if (flightMembers.length === 0) return null;

        return (
          <div key={flightLabel} style={styles.flightSection}>
            <div style={styles.flightHeader}>
              <h2 style={{ margin: 0, fontSize: '18px' }}>Flight {flightLabel}</h2>
              <span style={styles.playerCount}>{flightMembers.length} Players</span>
            </div>
            
            <div style={styles.tableWrapper}>
              <table style={styles.table}>
                <thead>
                  <tr>
                    <th style={{ ...styles.th, width: '15%' }}>Actions</th>
                    <th style={{ ...styles.th, width: '25%' }}>Player</th>
                    <th style={{ ...styles.th, width: '15%' }}>Check-In</th>
                    <th style={{ ...styles.th, width: '15%' }}>Scoring</th>
                    <th style={{ ...styles.th, width: '20%' }}>Round Details</th>
                    <th style={{ ...styles.th, width: '10%' }}>Net</th>
                  </tr>
                </thead>
                <tbody>
                  {flightMembers.map((m) => (
                    <React.Fragment key={m.id}>
                      <tr style={styles.tr}>
                        <td style={styles.td}>
                          {viewingWeek === currentWeek && m.has_submitted_current_round && (
                            <button onClick={() => handleResetScorecard(m.id)} style={styles.resetBtn}>Reset Score</button>
                          )}
                        </td>
                        <td style={styles.td}>
                          <div style={{ display: 'flex', flexDirection: 'column' }}>
                            <strong style={{ color: '#000', fontSize: '15px' }}>{m.display_name}</strong>
                            <div style={{ display: 'flex', gap: '10px', marginTop: '2px' }}>
                              <span style={{ fontSize: '11px', color: '#000', fontWeight: 'bold' }}>HCP: {m.handicap_index}</span>
                            </div>
                          </div>
                        </td>
                        <td style={styles.td}>
                          {m.has_submitted_current_round ? (
                            <span style={styles.badgeFinished}>Submitted</span>
                          ) : viewingWeek === currentWeek ? (
                            <button onClick={() => toggleCheckIn(m.id, m.is_checked_in)} style={m.is_checked_in ? styles.checkedBtn : styles.uncheckedBtn}>
                              {m.is_checked_in ? '✅ Checked In' : 'Check In'}
                            </button>
                          ) : (
                            <span style={{ color: '#888', fontSize: '12px' }}>{m.is_checked_in ? 'Was In' : 'No'}</span>
                          )}
                        </td>
                        <td style={styles.td}>
                          <span style={m.has_submitted_current_round ? styles.badgeDone : styles.badgePending}>
                            {m.has_submitted_current_round ? 'Finished' : (m.is_checked_in ? 'On Course' : 'Waiting')}
                          </span>
                        </td>
                        <td style={styles.td}>
                          {m.weekScore ? (
                            <div style={{ fontSize: '11px', lineHeight: '1.4' }}>
                              <span style={{ color: m.weekScore.tee_played?.toLowerCase() === 'white' ? '#555' : m.weekScore.tee_played?.toLowerCase(), fontWeight: 'bold', textTransform: 'capitalize' }}>
                                {m.weekScore.tee_played} Tees
                              </span>
                              <div style={{ color: '#666' }}>
                                {m.weekScore.holes_played === 18 ? '18 Holes' : `${m.weekScore.side_played === 'All' ? 'Front' : m.weekScore.side_played} Nine`}
                              </div>
                            </div>
                          ) : <span style={{ color: '#ccc', fontSize: '11px' }}>--</span>}
                        </td>
                        <td style={styles.td}>
                          <button onClick={() => setExpandedPlayerId(expandedPlayerId === m.id ? null : m.id)} style={styles.netScoreBtn}>
                            {m.weekScore?.net_score || '--'} <span style={{fontSize:'10px'}}>{expandedPlayerId === m.id ? '▲' : '▼'}</span>
                          </button>
                        </td>
                      </tr>
                      {expandedPlayerId === m.id && m.weekScore?.hole_scores && course && (
                        <tr>
                          <td colSpan={6} style={styles.expandedRow}>
                            <div style={styles.scorecardGrid}>
                              <p style={{ margin: '0 0 10px 0', fontSize: '12px', fontWeight: 'bold', color: '#495057' }}>
                                Net Hole-by-Hole Detail (• = stroke received):
                              </p>
                              <div style={styles.miniScorecard}>
                                {m.weekScore.hole_scores.map((gross: number, idx: number) => {
                                  const holeNum = idx + 1;
                                  const isBack9 = m.weekScore.side_played === 'Back';
                                  const isNineHoles = m.weekScore.holes_played === 9;
                                  const isVisible = m.weekScore.holes_played === 18 || (isBack9 ? holeNum > 9 : holeNum <= 9);
                                  
                                  if (!isVisible || gross === 0) return null;

                                  const holeHandicap = course.handicap_values[idx];
                                  const effectiveHandicap = isNineHoles ? Math.floor(m.handicap_index / 2) : m.handicap_index;
                                  let pops = 0;

                                  if (isNineHoles) {
                                    const sideRank = Math.ceil(holeHandicap / 2);
                                    if (effectiveHandicap >= sideRank) pops++;
                                    if (effectiveHandicap >= sideRank + 9) pops++;
                                  } else {
                                    if (effectiveHandicap >= holeHandicap) pops++;
                                    if (effectiveHandicap >= holeHandicap + 18) pops++;
                                  }

                                  const netHoleScore = gross - pops;

                                  return (
                                    <div key={idx} style={styles.holeBox}>
                                      <div style={{fontSize: '9px', color: '#666'}}>H{holeNum}</div>
                                      <div style={{fontWeight: 'bold', color: '#000'}}>
                                        {netHoleScore}
                                        {pops > 0 && <span style={{ color: '#2e7d32', marginLeft: '2px' }}>{Array(pops).fill('•').join('')}</span>}
                                      </div>
                                    </div>
                                  );
                                })}
                              </div>
                            </div>
                          </td>
                        </tr>
                      )}
                    </React.Fragment>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        );
      })}

      {/* CONFIGURATION MODAL */}
      {showModal && (
        <div style={styles.modalOverlay}>
          <div style={styles.modalContent}>
            <h2 style={styles.modalTitle}>Configure Week {currentWeek + 1}</h2>
            <div style={styles.field}>
              <label style={styles.label}>Holes</label>
              <select style={styles.select} value={roundSettings.holes} onChange={(e) => setRoundSettings({...roundSettings, holes: Number(e.target.value), side: Number(e.target.value) === 18 ? 'All' : 'Front'})}>
                <option value="18">18 Holes</option>
                <option value="9">9 Holes</option>
              </select>
            </div>
            {roundSettings.holes === 9 && (
              <div style={styles.field}>
                <label style={styles.label}>Side</label>
                <select style={styles.select} value={roundSettings.side} onChange={(e) => setRoundSettings({...roundSettings, side: e.target.value})}>
                  <option value="Front">Front 9</option>
                  <option value="Back">Back 9</option>
                </select>
              </div>
            )}
            <div style={styles.field}>
              <label style={styles.label}>Tees</label>
              <select style={styles.select} value={roundSettings.tee} onChange={(e) => setRoundSettings({...roundSettings, tee: e.target.value})}>
                <option value="White">White</option>
                <option value="Blue">Blue</option>
                <option value="Black">Black</option>
                <option value="Red">Red</option>
              </select>
            </div>
            <div style={styles.modalActions}>
              <button onClick={() => setShowModal(false)} style={styles.cancelBtn}>Cancel</button>
              <button onClick={confirmStartNewRound} style={styles.confirmBtn} disabled={isGlobalUpdating}>Start Round</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

const styles: { [key: string]: React.CSSProperties } = {
  container: { padding: '20px', maxWidth: '950px', margin: '0 auto', fontFamily: 'sans-serif' },
  loader: { padding: '100px 20px', textAlign: 'center' },
  header: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' },
  searchInput: { width: '100%', padding: '12px 15px', borderRadius: '8px', border: '1px solid #bbb', fontSize: '16px', color: '#000', backgroundColor: '#fff', boxShadow: '0 2px 4px rgba(0,0,0,0.05)', outlineColor: '#2e7d32' },
  newRoundBtn: { background: '#1a1a1a', color: 'white', padding: '10px 15px', border: 'none', borderRadius: '6px', cursor: 'pointer', fontSize: '13px', height: '37px' },
  flightSection: { marginBottom: '40px' },
  flightHeader: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px', padding: '0 5px' },
  playerCount: { fontSize: '12px', color: '#000', background: '#f0f0f0', padding: '2px 8px', borderRadius: '12px', fontWeight: 'bold' },
  tableWrapper: { background: '#fff', borderRadius: '8px', boxShadow: '0 2px 8px rgba(0,0,0,0.1)', overflow: 'hidden' },
  table: { width: '100%', borderCollapse: 'collapse', tableLayout: 'fixed' },
  th: { padding: '12px', background: '#f8f9fa', borderBottom: '1px solid #eee', color: '#000', fontSize: '11px', textTransform: 'uppercase', textAlign: 'left', fontWeight: 'bold' },
  td: { padding: '12px', borderBottom: '1px solid #eee', fontSize: '14px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' },
  tr: { borderBottom: '1px solid #eee' },
  uncheckedBtn: { padding: '6px 12px', background: '#fff', border: '1px solid #ddd', borderRadius: '4px', cursor: 'pointer', fontSize: '12px', color: '#000', width: '100px', textAlign: 'center' },
  checkedBtn: { padding: '6px 12px', background: '#d4edda', border: '1px solid #c3e6cb', color: '#155724', borderRadius: '4px', cursor: 'pointer', fontSize: '12px', fontWeight: 'bold', width: '100px', textAlign: 'center' },
  badgeDone: { background: '#d1ecf1', color: '#0c5460', padding: '3px 8px', borderRadius: '4px', fontSize: '11px' },
  badgePending: { color: '#000', fontSize: '11px', fontWeight: 'bold' },
  resetBtn: { padding: '6px 10px', background: '#fff', border: '1px solid #dc3545', color: '#dc3545', borderRadius: '4px', cursor: 'pointer', fontSize: '11px', fontWeight: 'bold' },
  badgeFinished: { display: 'inline-block', padding: '6px 12px', background: '#e9ecef', color: '#000', borderRadius: '4px', fontSize: '12px', fontWeight: 'bold', border: '1px solid #ccc' },
  weekSelect: { padding: '8px 12px', borderRadius: '6px', border: '1px solid #ddd', backgroundColor: '#fff', color: '#000', fontSize: '13px', cursor: 'pointer', outline: 'none', height: '37px' },
  netScoreBtn: { background: 'none', border: 'none', color: '#2e7d32', fontWeight: 'bold', cursor: 'pointer', textDecoration: 'underline', fontSize: '14px', textAlign: 'left', padding: '0' },
  expandedRow: { backgroundColor: '#f1f8e9', padding: '15px', borderBottom: '1px solid #c8e6c9' },
  scorecardGrid: { padding: '5px 10px' },
  miniScorecard: { display: 'flex', gap: '8px', overflowX: 'auto', paddingBottom: '5px' },
  holeBox: { background: '#fff', border: '1px solid #bbb', padding: '4px 6px', borderRadius: '4px', textAlign: 'center' as const, minWidth: '40px', boxShadow: '0 1px 3px rgba(0,0,0,0.05)'},
  modalOverlay: { position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.7)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 },
  modalContent: { background: 'white', padding: '30px', borderRadius: '12px', width: '100%', maxWidth: '400px', color: '#000' },
  modalTitle: { marginTop: 0, fontSize: '24px' },
  field: { marginBottom: '20px', display: 'flex', flexDirection: 'column', gap: '8px' },
  label: { fontSize: '14px', fontWeight: 'bold' },
  select: { padding: '10px', borderRadius: '6px', border: '1px solid #ddd', fontSize: '16px', backgroundColor: '#fff', color: '#000' },
  modalActions: { display: 'flex', gap: '10px', marginTop: '20px' },
  cancelBtn: { flex: 1, padding: '12px', background: '#eee', border: 'none', borderRadius: '6px', cursor: 'pointer', color: '#000' },
  confirmBtn: { flex: 2, padding: '12px', background: '#2e7d32', color: 'white', border: 'none', borderRadius: '6px', cursor: 'pointer', fontWeight: 'bold' }
};