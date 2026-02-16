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

  const [manualEntryPlayer, setManualEntryPlayer] = useState<any>(null);
  const [manualScores, setManualScores] = useState<number[]>(new Array(18).fill(0));
  const [isSubmittingManual, setIsSubmittingManual] = useState(false);

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
    setDataLoading(true);
    try {
      const { data: courseData } = await supabase.from('courses').select('*').limit(1).single();
      if (courseData) setCourse(courseData);

      const { data: settings } = await supabase.from('league_settings').select('*').eq('id', 1).single();
      if (settings) {
        setCurrentWeek(settings.current_week);
        setRoundSettings({
          holes: settings.holes_to_play,
          side: settings.side_to_play,
          tee: settings.tee_color
        });
        if (viewingWeek === 0) {
          setViewingWeek(settings.current_week);
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
          scorecards!member_id (
           id, score, net_score, week_number, holes_played, 
            tee_played, side_played, hole_scores, created_at, is_verified
           )
        `)
        .neq('role', 'admin')
        .order('display_name', { ascending: true });

      if (fetchError) throw new Error(fetchError.message);

      const { data: pairingData } = await supabase
        .from('weekly_pairings')
        .select('*')
        .eq('week_number', viewingWeek);

      if (memberData) {
        const processed = memberData.map(m => {
          const weekScore = m.scorecards
            ?.filter((s: any) => s.week_number === viewingWeek)
            .sort((a: any, b: any) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())[0] || null;

          const pairing = pairingData?.find(p => String(p.player_1_id) === String(m.id) || String(p.player_2_id) === String(m.id));
          const partner_id = pairing ? (String(pairing.player_1_id) === String(m.id) ? pairing.player_2_id : pairing.player_1_id) : null;

          let detailedStatus = 'Wait'; 
          if (m.is_checked_in) detailedStatus = 'Active';
          
          if (weekScore) {
            if (weekScore.is_verified === true) {
              detailedStatus = 'Finished';
            } else {
              const partnerData = memberData.find(p => String(p.id) === String(partner_id));
              const partnerHasScore = partnerData?.scorecards?.some((s: any) => s.week_number === viewingWeek);
              
              if (partnerHasScore) {
                detailedStatus = 'Verify'; 
              } else {
                detailedStatus = 'Pending'; 
              }
            }
          }

          return { ...m, weekScore, partner_id, detailedStatus };
        });
        
        setMembers(processed);
      }
    } catch (err: any) {
      console.error("Tournament Data Load Failure:", err.message);
    } finally {
      setDataLoading(false);
    }
  };

  useEffect(() => {
    if (viewState !== 'authorized') return;
    const channel = supabase
      .channel('admin_live_updates')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'scorecards' }, () => loadTournamentData())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'member' }, () => loadTournamentData())
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [viewState, viewingWeek]);

  useEffect(() => {
    if (viewState === 'authorized') loadTournamentData()
  }, [viewingWeek, viewState])

  const handlePairing = async (player1Id: any, player2Id: any) => {
    try {
      await supabase.from('weekly_pairings').delete().match({ week_number: viewingWeek }).or(`player_1_id.eq.${player1Id},player_2_id.eq.${player1Id}`);
      if (player2Id) {
        await supabase.from('weekly_pairings').insert({ week_number: viewingWeek, player_1_id: player1Id, player_2_id: player2Id });
      }
      loadTournamentData();
    } catch (err) { console.error("Pairing error:", err); }
  };

  const toggleCheckIn = async (memberId: string, currentStatus: boolean) => {
    const { error } = await supabase.from('member').update({ is_checked_in: !currentStatus }).eq('id', memberId)
    if (!error) loadTournamentData();
  }

  const handleResetScorecard = async (memberId: string) => {
    if (!window.confirm("Delete score for this week?")) return
    try {
      await supabase.from('scorecards').delete().match({ member_id: memberId, week_number: viewingWeek })
      await supabase.from('member').update({ has_submitted_current_round: false }).eq('id', memberId)
      loadTournamentData();
    } catch (err: any) { console.error("Reset error:", err.message) }
  }

  const submitManualScore = async () => {
    setIsSubmittingManual(true);
    const relevantScores = manualScores.filter((s, idx) => roundSettings.holes === 18 || (roundSettings.side === 'Back' ? idx >= 9 : idx < 9));
    if (relevantScores.some(s => s === 0)) {
        alert("Enter all scores");
        setIsSubmittingManual(false);
        return;
    }

    const totalGross = relevantScores.reduce((a, b) => a + b, 0);
    const { error } = await supabase.from('scorecards').insert({
        member_id: manualEntryPlayer.id, week_number: viewingWeek, hole_scores: manualScores,
        score: totalGross, holes_played: roundSettings.holes, tee_played: roundSettings.tee, side_played: roundSettings.side, is_verified: true 
    });

    if (!error) {
        await supabase.from('member').update({ has_submitted_current_round: true }).eq('id', manualEntryPlayer.id);
        setManualEntryPlayer(null); loadTournamentData();
    }
    setIsSubmittingManual(false);
  }

  const confirmStartNewRound = async () => {
    setIsGlobalUpdating(true)
    try {
      const nextWeek = currentWeek + 1
      const { error: settingsError } = await supabase.from('league_settings').update({ 
        current_week: nextWeek, 
        holes_to_play: roundSettings.holes, 
        tee_color: roundSettings.tee, 
        side_to_play: roundSettings.side 
      }).eq('id', 1)
      
      if (settingsError) throw settingsError;

      const { error: memberError } = await supabase.from('member').update({ 
        has_submitted_current_round: false, 
        is_checked_in: false 
      }).neq('role', 'admin')

      if (memberError) throw memberError;

      setCurrentWeek(nextWeek); 
      setViewingWeek(nextWeek); 
      setShowModal(false); 
      loadTournamentData();
      alert("New round started successfully!");
    } catch (err: any) { 
        console.error("New Round Error:", err);
        alert("Error starting round: " + err.message); 
    } finally { 
        setIsGlobalUpdating(false);
    }
  }

  if (viewState === 'checking' || authLoading) return <div style={styles.loader}>Verifying Admin...</div>

  return (
    <div style={styles.container}>
      <style dangerouslySetInnerHTML={{__html: `input::-webkit-outer-spin-button, input::-webkit-inner-spin-button { -webkit-appearance: none; margin: 0; } input[type=number] { -moz-appearance: textfield; }`}} />

      <div style={styles.header}>
        <div>
          <h1 style={{ color: '#000', margin: 0 }}>Tournament Ops</h1>
          <p style={{ color: viewingWeek === currentWeek ? '#2e7d32' : '#d32f2f', fontWeight: 'bold' }}>
            VIEWING: WEEK {viewingWeek} {viewingWeek !== currentWeek && "(READ-ONLY ARCHIVE)"}
          </p>
        </div>
        <div style={{ display: 'flex', alignItems: 'flex-end', gap: '15px' }}>
          <select value={viewingWeek} onChange={(e) => setViewingWeek(Number(e.target.value))} style={styles.weekSelect}>
            {Array.from({ length: currentWeek }, (_, i) => i + 1).map(w => (
              <option key={w} value={w}>Week {w}</option>
            ))}
          </select>
          <button onClick={() => setShowModal(true)} disabled={isGlobalUpdating} style={styles.newRoundBtn}>Start Week {currentWeek + 1}</button>
        </div>
      </div>

      <input type="text" placeholder="Search for a player..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} style={styles.searchInput} />

      {['A', 'B', 'C', 'D'].map((flightLabel) => {
        const flightMembers = members.filter(m => m.flight === flightLabel && m.display_name.toLowerCase().includes(searchTerm.toLowerCase()));
        if (flightMembers.length === 0) return null;

        return (
          <div key={flightLabel} style={styles.flightSection}>
            <div style={styles.flightHeader}>
              <h2 style={{ margin: 0, fontSize: '18px' }}>Flight {flightLabel}</h2>
            </div>
            <div style={styles.tableWrapper}>
              <table style={styles.table}>
                <thead>
                  <tr>
                    <th style={{ ...styles.th, width: '12%' }}>Actions</th>
                    <th style={{ ...styles.th, width: '20%' }}>Player</th>
                    <th style={{ ...styles.th, width: '18%' }}>Partner</th>
                    <th style={{ ...styles.th, width: '12%' }}>Check-In</th>
                    <th style={{ ...styles.th, width: '13%' }}>Scoring</th>
                    <th style={{ ...styles.th, width: '15%' }}>Round</th>
                    <th style={{ ...styles.th, width: '10%' }}>Net</th>
                  </tr>
                </thead>
                <tbody>
                  {flightMembers.map((m) => (
                    <React.Fragment key={m.id}>
                      <tr style={styles.tr}>
                        <td style={styles.td}>
                          <div style={{ display: 'flex', flexDirection: 'column', gap: '5px' }}>
                            {viewingWeek === currentWeek && m.has_submitted_current_round && <button onClick={() => handleResetScorecard(m.id)} style={styles.resetBtn}>Reset</button>}
                            {viewingWeek === currentWeek && !m.has_submitted_current_round && <button onClick={() => {setManualEntryPlayer(m); setManualScores(new Array(18).fill(0))}} style={styles.manualEntryBtn}>Paper</button>}
                          </div>
                        </td>
                        <td style={styles.td}>
                          <div style={{ display: 'flex', flexDirection: 'column' }}>
                            <strong style={{ color: '#000', fontSize: '14px' }}>{m.display_name}</strong>
                            <span style={{ fontSize: '11px', color: '#000', fontWeight: 'bold' }}>HCP: {m.handicap_index}</span>
                          </div>
                        </td>
                        <td style={styles.td}>
                          <select value={m.partner_id || ""} onChange={(e) => handlePairing(m.id, e.target.value || null)} style={styles.pairingSelect} disabled={viewingWeek !== currentWeek}>
                            <option value="">-- No Partner --</option>
                            {members.filter(p => p.id !== m.id).map(p => (<option key={p.id} value={p.id}>{p.display_name}</option>))}
                          </select>
                        </td>
                        <td style={styles.td}>
                          {m.has_submitted_current_round ? <span style={styles.badgeFinished}>Done</span> : viewingWeek === currentWeek ? <button onClick={() => toggleCheckIn(m.id, m.is_checked_in)} style={m.is_checked_in ? styles.checkedBtn : styles.uncheckedBtn}>{m.is_checked_in ? '✅ In' : 'Check In'}</button> : <span style={{ color: '#000', fontSize: '12px' }}>{m.is_checked_in ? 'In' : 'No'}</span>}
                        </td>
                        <td style={styles.td}>
                          <span style={ m.detailedStatus === 'Finished' ? styles.badgeDone : m.detailedStatus === 'Pending' ? styles.badgePendingState : m.detailedStatus === 'Verify' ? styles.badgeVerify : styles.badgeActive }>{m.detailedStatus}</span>
                        </td>
                        <td style={styles.td}>
                          {m.weekScore ? <div style={{ fontSize: '11px', lineHeight: '1.2' }}><span style={{ color: '#000', fontWeight: 'bold' }}>{m.weekScore.tee_played}</span><div style={{ color: '#666' }}>{m.weekScore.holes_played === 18 ? '18H' : `${m.weekScore.side_played} 9`}</div></div> : '--'}
                        </td>
                        <td style={styles.td}>
                          <button onClick={() => setExpandedPlayerId(expandedPlayerId === m.id ? null : m.id)} style={styles.netScoreBtn}>{m.weekScore?.net_score || '--'} <span style={{fontSize:'10px'}}>{expandedPlayerId === m.id ? '▲' : '▼'}</span></button>
                        </td>
                      </tr>
                      {expandedPlayerId === m.id && m.weekScore?.hole_scores && course && (
                        <tr>
                          <td colSpan={7} style={styles.expandedRow}>
                            <div style={styles.scorecardGrid}>
                              <p style={{ margin: '0 0 10px 0', fontSize: '12px', fontWeight: 'bold', color: '#495057' }}>Net Hole Detail (• = pop):</p>
                              <div style={styles.miniScorecard}>
                                {m.weekScore.hole_scores.map((gross: number, idx: number) => {
                                  const holeNum = idx + 1;
                                  if ((m.weekScore.holes_played === 9 && m.weekScore.side_played === 'Back' && holeNum <= 9) || (m.weekScore.holes_played === 9 && m.weekScore.side_played === 'Front' && holeNum > 9) || gross === 0) return null;
                                  const hcpVal = course.handicap_values[idx];
                                  const effHcp = m.weekScore.holes_played === 9 ? Math.floor(m.handicap_index/2) : m.handicap_index;
                                  let p = 0;
                                  if(m.weekScore.holes_played === 9) { if(effHcp >= Math.ceil(hcpVal/2)) p++; if(effHcp >= Math.ceil(hcpVal/2)+9) p++; }
                                  else { if(effHcp >= hcpVal) p++; if(effHcp >= hcpVal+18) p++; }
                                  return (
                                    <div key={idx} style={styles.holeBox}><div style={{fontSize: '9px', color: '#666'}}>H{holeNum}</div><div style={{fontWeight: 'bold', color: '#000'}}>{gross - p}{p > 0 && '•'}</div></div>
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

      {/* MISSING MANUAL ENTRY MODAL */}
      {manualEntryPlayer && (
        <div style={styles.modalOverlay}>
          <div style={{...styles.modalContent, maxWidth: '650px'}}>
            <h2 style={styles.modalTitle}>Paper Card Entry</h2>
            <p style={{marginBottom: '15px', color: '#444'}}>Entering Gross for <strong>{manualEntryPlayer.display_name}</strong></p>
            <div style={styles.manualScoreGrid}>
              {(roundSettings.holes === 18 || roundSettings.side === 'Front') && (
                <div style={{marginBottom: '20px'}}>
                  <p style={{fontSize: '11px', fontWeight: 'bold', margin: '0 0 5px 0', textTransform: 'uppercase', color: '#2e7d32'}}>Front Nine</p>
                  <div style={{display: 'flex', gap: '8px', justifyContent: 'center'}}>
                    {new Array(9).fill(0).map((_, i) => (
                      <div key={i}>
                        <div style={{fontSize: '10px', textAlign: 'center', color: '#666'}}>H{i + 1}</div>
                        <input type="number" style={styles.manualInput} value={manualScores[i] || ''} onChange={(e) => { const s = [...manualScores]; s[i] = parseInt(e.target.value) || 0; setManualScores(s); }} />
                      </div>
                    ))}
                  </div>
                </div>
              )}
              {(roundSettings.holes === 18 || roundSettings.side === 'Back') && (
                <div>
                  <p style={{fontSize: '11px', fontWeight: 'bold', margin: '0 0 5px 0', textTransform: 'uppercase', color: '#2e7d32'}}>Back Nine</p>
                  <div style={{display: 'flex', gap: '8px', justifyContent: 'center'}}>
                    {new Array(9).fill(0).map((_, i) => (
                      <div key={i+9}>
                        <div style={{fontSize: '10px', textAlign: 'center', color: '#666'}}>H{i + 10}</div>
                        <input type="number" style={styles.manualInput} value={manualScores[i+9] || ''} onChange={(e) => { const s = [...manualScores]; s[i+9] = parseInt(e.target.value) || 0; setManualScores(s); }} />
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
            <div style={styles.modalActions}>
              <button onClick={() => setManualEntryPlayer(null)} style={styles.cancelBtn}>Cancel</button>
              <button onClick={submitManualScore} style={styles.confirmBtn} disabled={isSubmittingManual}>{isSubmittingManual ? 'Saving...' : 'Submit Score'}</button>
            </div>
          </div>
        </div>
      )}

      {/* MISSING CONFIG MODAL (Start Week Button) */}
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
                    <button onClick={confirmStartNewRound} style={styles.confirmBtn} disabled={isGlobalUpdating}>
                        {isGlobalUpdating ? 'Updating...' : 'Start Round'}
                    </button>
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
  searchInput: { width: '100%', padding: '12px 15px', borderRadius: '8px', border: '1px solid #bbb', fontSize: '16px', color: '#000', backgroundColor: '#fff', boxShadow: '0 2px 4px rgba(0,0,0,0.05)', outlineColor: '#2e7d32', marginBottom: '20px' },
  newRoundBtn: { background: '#1a1a1a', color: 'white', padding: '10px 15px', border: 'none', borderRadius: '6px', cursor: 'pointer', fontSize: '13px', height: '37px' },
  flightSection: { marginBottom: '40px' },
  flightHeader: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px', padding: '0 5px' },
  playerCount: { fontSize: '12px', color: '#000', background: '#f0f0f0', padding: '2px 8px', borderRadius: '12px', fontWeight: 'bold' },
  tableWrapper: { background: '#fff', borderRadius: '8px', boxShadow: '0 2px 8px rgba(0,0,0,0.1)', overflow: 'hidden' },
  table: { width: '100%', borderCollapse: 'collapse', tableLayout: 'fixed' },
  th: { padding: '12px', background: '#f8f9fa', borderBottom: '1px solid #eee', color: '#000', fontSize: '11px', textTransform: 'uppercase', textAlign: 'left', fontWeight: 'bold' },
  td: { padding: '12px', borderBottom: '1px solid #eee', fontSize: '13px', whiteSpace: 'nowrap' },
  tr: { borderBottom: '1px solid #eee' },
  uncheckedBtn: { padding: '6px 12px', background: '#fff', border: '1px solid #ddd', borderRadius: '4px', cursor: 'pointer', fontSize: '12px', color: '#000', width: '80px', textAlign: 'center' },
  checkedBtn: { padding: '6px 12px', background: '#d4edda', border: '1px solid #c3e6cb', color: '#155724', borderRadius: '4px', cursor: 'pointer', fontSize: '12px', fontWeight: 'bold', width: '80px', textAlign: 'center' },
  badgeDone: { background: '#d1ecf1', color: '#0c5460', padding: '3px 8px', borderRadius: '4px', fontSize: '11px', fontWeight: 'bold' },
  badgePendingState: { background: '#fff3e0', color: '#ef6c00', padding: '3px 8px', borderRadius: '4px', fontSize: '11px', fontWeight: 'bold', border: '1px solid #ffe0b2' },
  badgeVerify: { background: '#e1f5fe', color: '#0288d1', padding: '3px 8px', borderRadius: '4px', fontSize: '11px', fontWeight: 'bold', border: '1px solid #b3e5fc' },
  badgeActive: { color: '#2e7d32', fontSize: '11px', fontWeight: 'bold' },
  resetBtn: { padding: '6px 10px', background: '#fff', border: '1px solid #dc3545', color: '#dc3545', borderRadius: '4px', cursor: 'pointer', fontSize: '11px', fontWeight: 'bold' },
  manualEntryBtn: { padding: '6px 10px', background: '#e8f5e9', border: '1px solid #2e7d32', color: '#2e7d32', borderRadius: '4px', cursor: 'pointer', fontSize: '11px', fontWeight: 'bold' },
  badgeFinished: { padding: '6px 12px', background: '#e9ecef', color: '#000', borderRadius: '4px', fontSize: '12px', fontWeight: 'bold', border: '1px solid #ccc' },
  weekSelect: { padding: '8px 12px', borderRadius: '6px', border: '1px solid #ddd', backgroundColor: '#fff', color: '#000', fontSize: '13px', height: '37px' },
  netScoreBtn: { background: 'none', border: 'none', color: '#2e7d32', fontWeight: 'bold', cursor: 'pointer', textDecoration: 'underline', fontSize: '14px' },
  expandedRow: { backgroundColor: '#f1f8e9', padding: '15px' },
  scorecardGrid: { marginTop: '10px' },
  miniScorecard: { display: 'flex', gap: '8px', overflowX: 'auto', paddingBottom: '5px' },
  holeBox: { background: '#fff', border: '1px solid #bbb', padding: '4px 6px', borderRadius: '4px', textAlign: 'center', minWidth: '40px' },
  pairingSelect: { width: '100%', padding: '6px', borderRadius: '4px', border: '1px solid #bbb', fontSize: '11px', backgroundColor: '#fff', color: '#000', cursor: 'pointer' },
  // RE-ADDED MISSING MODAL STYLES
  modalOverlay: { position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.7)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 },
  modalContent: { background: 'white', padding: '30px', borderRadius: '12px', width: 'auto', maxWidth: '90%', color: '#000' },
  modalTitle: { marginTop: 0, fontSize: '24px', marginBottom: '15px' },
  manualScoreGrid: { background: '#f8f9fa', padding: '20px', borderRadius: '8px', marginBottom: '20px' },
  manualInput: { width: '45px', padding: '10px 0', textAlign: 'center', border: '1px solid #bbb', borderRadius: '4px', fontSize: '16px', fontWeight: 'bold', backgroundColor: '#fff', color: '#000' },
  modalActions: { display: 'flex', gap: '10px', marginTop: '20px' },
  cancelBtn: { flex: 1, padding: '12px', background: '#eee', border: 'none', borderRadius: '6px', cursor: 'pointer', color: '#000' },
  confirmBtn: { flex: 2, padding: '12px', background: '#2e7d32', color: 'white', border: 'none', borderRadius: '6px', cursor: 'pointer', fontWeight: 'bold' },
  field: { marginBottom: '15px' },
  label: { fontSize: '12px', fontWeight: 'bold', marginBottom: '5px', display: 'block' },
  select: { width: '100%', padding: '10px', borderRadius: '4px', border: '1px solid #bbb', backgroundColor: '#fff', color: '#000' }
};