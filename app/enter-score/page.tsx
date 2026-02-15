'use client'
import { useState, useEffect } from 'react'
import { useAuth } from '../context/AuthContext'
import { createClient } from '@supabase/supabase-js'
import { useRouter } from 'next/navigation'

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!)

export default function EnterScore() {
  const { user, loading: authLoading } = useAuth()
  const router = useRouter()
  
  const [course, setCourse] = useState<any>(null)
  const [grossScores, setGrossScores] = useState<number[]>(new Array(18).fill(0))
  const [currentHandicap, setCurrentHandicap] = useState<number>(0)
  const [golferName, setGolferName] = useState<string>('')
  const [leagueSettings, setLeagueSettings] = useState<any>(null)
  
  const [loading, setLoading] = useState(true)
  const [isAllowed, setIsAllowed] = useState(true)
  const [statusMessage, setStatusMessage] = useState('')

  useEffect(() => {
    if (!authLoading && !user) {
      window.location.href = '/'
    }
  }, [user, authLoading])
  
  useEffect(() => {
    const checkAccessAndFetchData = async () => {
      if (!user) return;
      try {
        const { data: settingsData } = await supabase
          .from('league_settings')
          .select('*')
          .eq('id', 1)
          .single()
        
        if (settingsData) setLeagueSettings(settingsData)

        const { data: courseData } = await supabase.from('courses').select('*').limit(1).single()
        const { data: userData } = await supabase
          .from('member')
          .select('id, handicap_index, display_name, has_submitted_current_round, is_checked_in') 
          .eq('auth_user_id', user.id)
          .single();

        if (courseData) setCourse(courseData)

        if (userData) {
          setCurrentHandicap(userData.handicap_index ?? 0)
          setGolferName(userData.display_name ?? 'Anonymous Golfer')
          
          if (!courseData?.is_open) {
            setIsAllowed(false)
            setStatusMessage("Scoring is currently closed by the course.")
          } else if (!userData.is_checked_in) {
            setIsAllowed(false)
            setStatusMessage("Please check in at the front desk to unlock your scorecard.")
          } else if (userData.has_submitted_current_round) {
            setIsAllowed(false)
            setStatusMessage(`You have already submitted a score for Week ${settingsData?.current_week || ''}.`)
          }
        }
      } catch (err) {
        console.error("Initialization error:", err)
      } finally {
        setLoading(false)
      }
    }
    checkAccessAndFetchData()
  }, [user])

  const handleScoreChange = (index: number, val: string) => {
    const newScores = [...grossScores]
    newScores[index] = parseInt(val) || 0
    setGrossScores(newScores)
  }

  // --- DYNAMIC LOGIC HELPERS ---
  const isNineHoles = leagueSettings?.holes_to_play === 9
  const effectiveHandicap = isNineHoles ? Math.floor(currentHandicap / 2) : currentHandicap
  
  // FAIL-SAFE: If side is 'All' but it's 9 holes, we default to showing Front 9
  const showFront9 = leagueSettings?.holes_to_play === 18 || 
                     leagueSettings?.side_to_play === 'Front' || 
                     (isNineHoles && leagueSettings?.side_to_play === 'All')

  const showBack9 = leagueSettings?.holes_to_play === 18 || 
                    leagueSettings?.side_to_play === 'Back'

  const getActiveIndices = () => {
    let indices: number[] = []
    if (leagueSettings?.holes_to_play === 18) {
      indices = [0,1,2,3,4,5,6,7,8,9,10,11,12,13,14,15,16,17]
    } else if (leagueSettings?.side_to_play === 'Back') {
      indices = [9,10,11,12,13,14,15,16,17]
    } else {
      // Handles 'Front' and the bugged 'All' for 9-hole rounds
      indices = [0,1,2,3,4,5,6,7,8]
    }
    return indices
  }
  const activeIndices = getActiveIndices()

  const outTotal = grossScores.slice(0, 9).reduce((a, b) => a + b, 0)
  const inTotal = grossScores.slice(9, 18).reduce((a, b) => a + b, 0)
  const totalGross = activeIndices.reduce((sum, idx) => sum + grossScores[idx], 0)

  const netScores = grossScores.map((gross, i) => {
    if (!course || gross === 0 || !activeIndices.includes(i)) return 0
    const holeHandicap = course.handicap_values[i]
    let pops = 0
    if (isNineHoles) {
      const sideRank = Math.ceil(holeHandicap / 2) 
      if (effectiveHandicap >= sideRank) pops++
      if (effectiveHandicap >= sideRank + 9) pops++
    } else {
      if (effectiveHandicap >= holeHandicap) pops++
      if (effectiveHandicap >= holeHandicap + 18) pops++
    }
    return gross - pops
  })

  const totalNet = activeIndices.reduce((sum, idx) => sum + netScores[idx], 0)

  const submitScore = async () => {
    if (!course || !user || !leagueSettings) return

    // Strict validation for only active/visible holes
    const missingHole = activeIndices.find(idx => {
        const s = grossScores[idx]
        return s === 0 || isNaN(s) || s === null
    });

    if (missingHole !== undefined) {
      alert(`Missing Score: Please enter a score for Hole ${missingHole + 1}.`);
      return;
    }

    try {
      const { data: profile, error: profileError } = await supabase
        .from('member')
        .select('id')
        .eq('auth_user_id', user.id)
        .single()

      if (profileError || !profile) {
        throw new Error("Could not find your member profile. Please contact the admin.")
      }

      const { error: scoreError } = await supabase.from('scorecards').insert({
    member_id: profile.id,
    week_number: leagueSettings.current_week,
    score: totalGross,
    net_score: totalNet,
    hole_scores: grossScores, // Save the whole array!
    holes_played: leagueSettings.holes_to_play,
    tee_played: leagueSettings.tee_color,
    side_played: leagueSettings.side_to_play
})
      
      if (scoreError) throw scoreError

      await supabase.from('member').update({ has_submitted_current_round: true }).eq('auth_user_id', user.id)
      alert(`Week ${leagueSettings.current_week} score submitted!`)
      router.push(`/account`) 
    } catch (err: any) { alert(err.message) }
  }

  if (loading || authLoading) return <div style={{padding: '20px'}}>Loading Tournament Data...</div>

  if (!isAllowed) return (
    <div style={styles.container}>
      <div style={{...styles.summary, textAlign: 'center' as const, marginTop: '50px'}}>
        <h2>Scorecard Locked</h2>
        <p>{statusMessage}</p>
        <button onClick={() => window.location.href = '/'} style={{...styles.btn, marginTop: '20px'}}>Return Home</button>
      </div>
    </div>
  )

  return (
    <div style={styles.container}>
      <h1 style={{textAlign: 'center', marginBottom: '5px'}}>{course?.name}</h1>
      <p style={{textAlign: 'center', color: '#2e7d32', fontWeight: 'bold', marginBottom: '10px'}}>
        WEEK {leagueSettings?.current_week} TOURNAMENT
      </p>
      <p style={{textAlign: 'center', color: '#666', fontSize: '12px', marginBottom: '20px', textTransform: 'uppercase'}}>
        {leagueSettings?.holes_to_play} Holes ({leagueSettings?.side_to_play === 'All' && isNineHoles ? 'Front' : leagueSettings?.side_to_play}) • {leagueSettings?.tee_color} Tees
      </p>
      
      {showFront9 && (
        <>
          <h3 style={{marginBottom: '10px'}}>Front 9 (Out: {outTotal})</h3>
          <div style={styles.scoreRow}>
            {course?.par_values.slice(0, 9).map((par: number, i: number) => (
              <div key={i} style={styles.holeBox}>
                <div style={styles.label}>H{i+1}</div>
                <div style={styles.parLabel}>P{par}</div>
                <div style={styles.popDots}>
                  {(() => {
                    const sideRank = isNineHoles ? Math.ceil(course.handicap_values[i] / 2) : course.handicap_values[i]
                    const dots = []
                    if (effectiveHandicap >= sideRank) dots.push('•')
                    if (effectiveHandicap >= sideRank + (isNineHoles ? 9 : 18)) dots.push('•')
                    return dots.join('')
                  })()}
                </div>
                <input 
                  type="number" 
                  inputMode="numeric"
                  style={styles.input} 
                  onChange={(e) => handleScoreChange(i, e.target.value)}
                />
              </div>
            ))}
          </div>
        </>
      )}

      {showBack9 && (
        <>
          <h3 style={{marginBottom: '10px'}}>Back 9 (In: {inTotal})</h3>
          <div style={styles.scoreRow}>
            {course?.par_values.slice(9, 18).map((par: number, i: number) => (
              <div key={i+9} style={styles.holeBox}>
                <div style={styles.label}>H{i+10}</div>
                <div style={styles.parLabel}>P{par}</div>
                <div style={styles.popDots}>
                  {(() => {
                    const sideRank = isNineHoles ? Math.ceil(course.handicap_values[i+9] / 2) : course.handicap_values[i+9]
                    const dots = []
                    if (effectiveHandicap >= sideRank) dots.push('•')
                    if (effectiveHandicap >= sideRank + (isNineHoles ? 9 : 18)) dots.push('•')
                    return dots.join('')
                  })()}
                </div>
                <input 
                  type="number" 
                  inputMode="numeric"
                  style={styles.input} 
                  onChange={(e) => handleScoreChange(i+9, e.target.value)}
                />
              </div>
            ))}
          </div>
        </>
      )}

      <div style={styles.summary}>
        <div style={styles.summaryRow}>
            <strong>Golfer:</strong>
            <span>{golferName}</span>
        </div>
        <div style={styles.summaryRow}>
            <span>Season Index:</span>
            <span>{currentHandicap}</span>
        </div>
        <div style={{...styles.summaryRow, color: '#2e7d32', fontWeight: 'bold'}}>
            <span>Round Handicap ({isNineHoles ? '9' : '18'} Holes):</span>
            <span>{effectiveHandicap}</span>
        </div>
        <div style={{...styles.summaryRow, marginTop: '10px', fontSize: '16px', borderTop: '1px solid #ddd', paddingTop: '10px'}}>
            <strong>Total Gross:</strong>
            <strong>{totalGross}</strong>
        </div>
        <div style={{...styles.summaryRow, fontSize: '18px', color: '#2e7d32'}}>
            <strong>Total Net:</strong>
            <strong>{totalNet}</strong>
        </div>
      </div>

      <button onClick={submitScore} style={styles.btn}>Submit Week {leagueSettings?.current_week} Score</button>
    </div>
  )
}

const styles = {
  container: { padding: '20px', maxWidth: '500px', margin: '0 auto', fontFamily: 'sans-serif' as const },
  scoreRow: { display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: '10px', marginBottom: '20px' },
  holeBox: { display: 'flex', flexDirection: 'column' as const, alignItems: 'center', border: '1px solid #ddd', padding: '5px', borderRadius: '4px' },
  label: { fontSize: '10px', fontWeight: 'bold' as const },
  parLabel: { fontSize: '11px', color: '#444', fontWeight: 'bold' as const },
  popDots: { fontSize: '14px', color: '#2e7d32', height: '14px', lineHeight: '14px' },
  input: { 
    width: '100%', 
    border: 'none', 
    borderBottom: '2px solid #2e7d32', 
    textAlign: 'center' as const, 
    fontSize: '18px', 
    padding: '5px 0',
    outline: 'none'
  },
  summary: { background: '#f9f9f9', padding: '15px', borderRadius: '8px', color: '#222', margin: '20px 0' },
  summaryRow: { display: 'flex', justifyContent: 'space-between', marginBottom: '5px', fontSize: '14px' },
  btn: { width: '100%', padding: '15px', background: '#2e7d32', color: 'white', border: 'none', borderRadius: '8px', fontSize: '16px', fontWeight: 'bold' as const, cursor: 'pointer' }
}