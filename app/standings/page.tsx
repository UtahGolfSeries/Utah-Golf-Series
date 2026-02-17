'use client'
import { useState, useEffect } from 'react'
import { createClient } from '@supabase/supabase-js'
import { useAuth } from '../context/AuthContext'
import PageHeader from '../components/pageHeader'

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!)

export default function Standings() {
  const { user } = useAuth()
  
  // State for logic
  const [viewMode, setViewMode] = useState<'weekly' | 'season'>('weekly')
  const [standings, setStandings] = useState<any[]>([])
  const [currentWeek, setCurrentWeek] = useState<number>(1)
  const [viewingWeek, setViewingWeek] = useState<number>(0)
  const [loading, setLoading] = useState(true)

  // 1. Initial Load: Get current week
  useEffect(() => {
    const getInitialSettings = async () => {
      const { data: settings } = await supabase.from('league_settings').select('current_week').eq('id', 1).single()
      if (settings) {
        setCurrentWeek(settings.current_week)
        setViewingWeek(settings.current_week)
      }
    }
    getInitialSettings()
  }, [])

  // 2. Data Fetching Logic
  useEffect(() => {
    if (viewingWeek === 0) return

    const fetchData = async () => {
      setLoading(true)
      try {
        if (viewMode === 'weekly') {
          // WEEKLY VIEW FETCH
          const { data: scores } = await supabase
            .from('scorecards')
            .select(`score, net_score, is_verified, member!member_id (display_name, flight)`)
            .eq('week_number', viewingWeek)
            .eq('is_verified', true)
            .order('net_score', { ascending: true })
          if (scores) setStandings(scores)
        } else {
          // SEASON VIEW FETCH
          // We fetch all verified scores for the whole season
          const { data: allScores } = await supabase
            .from('scorecards')
            .select(`week_number, net_score, member_id, member!member_id (display_name, flight)`)
            .eq('is_verified', true)
            .order('week_number', { ascending: true })

          if (allScores) {
            // Group and rank members by week and flight
            const processedSeason = processSeasonData(allScores)
            setStandings(processedSeason)
          }
        }
      } catch (err) {
        console.error("Fetch error:", err)
      } finally {
        setLoading(false)
      }
    }

    fetchData()
  }, [viewMode, viewingWeek])

  // Helper to calculate rank/place per week/flight
  const processSeasonData = (data: any[]) => {
    const results: any = {} // { memberId: { name, flight, weeks: { 1: rank, 2: rank } } }

    // First, find unique weeks
    const weeksInSeason = Array.from(new Set(data.map(d => d.week_number)))

    weeksInSeason.forEach(wNum => {
      const flights = ['A', 'B', 'C', 'D']
      flights.forEach(f => {
        // Filter scores for this specific week and flight
        const flightScores = data
          .filter(d => d.week_number === wNum && d.member?.flight === f)
          .sort((a, b) => a.net_score - b.net_score)

        // Assign Rank (Place)
        flightScores.forEach((score, index) => {
          if (!results[score.member_id]) {
            results[score.member_id] = { 
              name: score.member.display_name, 
              flight: score.member.flight, 
              weeks: {} 
            }
          }
          results[score.member_id].weeks[wNum] = index + 1 // "1st", "2nd", etc.
        } )
      })
    })

    return Object.values(results)
  }

  const flights = ['A', 'B', 'C', 'D']

  return (
    <div style={styles.container}>
      <PageHeader 
        title={viewMode === 'weekly' ? `Week ${viewingWeek} Standings` : "Season Standings"}
        subtitle={viewMode === 'weekly' ? "WEEKLY PERFORMANCE" : "OVERALL SEASON FINISHES"}
        rightElement={
          <div style={styles.headerControls}>
             {/* TOGGLE BUTTONS */}
             <div style={styles.toggleGroup}>
                <button 
                  onClick={() => setViewMode('weekly')} 
                  style={viewMode === 'weekly' ? styles.activeToggle : styles.inactiveToggle}
                >Weekly</button>
                <button 
                  onClick={() => setViewMode('season')} 
                  style={viewMode === 'season' ? styles.activeToggle : styles.inactiveToggle}
                >Season</button>
             </div>

            {viewMode === 'weekly' && (
              <>
                <label style={styles.selectorLabel}>Jump to Week:</label>
                <select 
                  value={viewingWeek} 
                  onChange={(e) => setViewingWeek(Number(e.target.value))}
                  style={styles.weekSelect}
                >
                  {Array.from({ length: currentWeek }, (_, i) => i + 1).map(w => (
                    <option key={w} value={w}>Week {w}</option>
                  ))}
                </select>
              </>
            )}
          </div>
        }
      />

      {loading ? (
        <div style={{padding: '40px', textAlign: 'center', color: '#666'}}>Updating standings...</div>
      ) : (
        <>
          {flights.map(flightLabel => {
            const flightScores = standings.filter(s => 
               (viewMode === 'weekly' ? s.member?.flight : s.flight) === flightLabel
            )
            if (flightScores.length === 0) return null

            return (
              <div key={flightLabel} style={styles.section}>
                <div style={styles.flightHeader}>Flight {flightLabel}</div>
                <div style={styles.tableWrapper}>
                  <table style={styles.table}>
                    <thead>
                      <tr style={styles.thRow}>
                        {viewMode === 'weekly' ? (
                          <>
                            <th style={{...styles.th, width: '15%'}}>Pos</th>
                            <th style={{...styles.th, width: '55%'}}>Player</th>
                            <th style={{...styles.th, width: '15%'}}>Gross</th>
                            <th style={{...styles.th, width: '15%'}}>Net</th>
                          </>
                        ) : (
                          <>
                            <th style={{...styles.th, width: '40%'}}>Player</th>
                            {Array.from({ length: currentWeek }, (_, i) => i + 1).map(w => (
                              <th key={w} style={{...styles.th, textAlign: 'center'}}>W{w}</th>
                            ))}
                          </>
                        )}
                      </tr>
                    </thead>
                    <tbody>
                      {flightScores.map((entry, index) => (
                        <tr key={index} style={styles.tr}>
                          {viewMode === 'weekly' ? (
                            <>
                              <td style={styles.td}>{index + 1}</td>
                              <td style={{...styles.td, fontWeight: 'bold', color: '#000'}}>{entry.member?.display_name}</td>
                              <td style={styles.td}>{entry.score}</td>
                              <td style={{...styles.td, color: '#2e7d32', fontWeight: 'bold'}}>{entry.net_score}</td>
                            </>
                          ) : (
                            <>
                              <td style={{...styles.td, fontWeight: 'bold', color: '#000'}}>{entry.name}</td>
                              {Array.from({ length: currentWeek }, (_, i) => i + 1).map(w => (
                                <td key={w} style={{...styles.td, textAlign: 'center'}}>
                                  {entry.weeks[w] ? (
                                    <span style={entry.weeks[w] === 1 ? styles.firstPlace : styles.otherPlace}>
                                      {entry.weeks[w]}
                                    </span>
                                  ) : '-'}
                                </td>
                              ))}
                            </>
                          )}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )
          })}
        </>
      )}
    </div>
  )
}

const styles = {
  container: { padding: '20px', maxWidth: '850px', margin: '0 auto', fontFamily: 'sans-serif' as const },
  headerControls: { display: 'flex', flexDirection: 'column' as const, alignItems: 'flex-end', gap: '8px' },
  toggleGroup: { display: 'flex', background: '#333', borderRadius: '6px', padding: '2px', marginBottom: '5px' },
  activeToggle: { background: '#2e7d32', color: '#fff', border: 'none', borderRadius: '4px', padding: '4px 10px', fontSize: '11px', fontWeight: 'bold' as const, cursor: 'pointer' },
  inactiveToggle: { background: 'transparent', color: '#bbb', border: 'none', borderRadius: '4px', padding: '4px 10px', fontSize: '11px', cursor: 'pointer' },
  
  selectorLabel: { fontSize: '9px', color: '#999', textTransform: 'uppercase' as const, marginBottom: '2px' },
  weekSelect: { 
    padding: '6px 10px', borderRadius: '6px', border: '1px solid #444', backgroundColor: '#333', 
    fontSize: '13px', fontWeight: 'bold' as const, color: '#fff', outline: 'none'
  },
  section: { marginBottom: '30px' },
  flightHeader: { background: '#1a1a1a', color: '#fff', padding: '10px 15px', borderRadius: '8px 8px 0 0', fontWeight: 'bold' as const, fontSize: '15px' },
  tableWrapper: { background: '#fff', border: '1px solid #ddd', borderTop: 'none', borderRadius: '0 0 8px 8px', overflow: 'hidden' },
  table: { width: '100%', borderCollapse: 'collapse' as const },
  thRow: { background: '#f8f9fa', borderBottom: '1px solid #eee' },
  th: { padding: '12px', fontSize: '10px', color: '#888', textAlign: 'left' as const, textTransform: 'uppercase' as const, fontWeight: 'bold' as const },
  td: { padding: '12px', borderBottom: '1px solid #eee', fontSize: '13px', color: '#444' },
  tr: { background: '#fff' },

  // Placement Styling
  firstPlace: { background: '#fff3e0', color: '#ef6c00', padding: '2px 6px', borderRadius: '4px', fontWeight: 'bold' as const, border: '1px solid #ffe0b2' },
  otherPlace: { fontWeight: 'bold' as const, color: '#000' }
}