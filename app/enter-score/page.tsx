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
  
  // State for locking/access logic
  const [loading, setLoading] = useState(true)
  const [isAllowed, setIsAllowed] = useState(true)
  const [statusMessage, setStatusMessage] = useState('')

  // 1. THE LOGOUT GUARD: Force redirect if user logs out while on this page
  useEffect(() => {
    if (!authLoading && !user) {
      window.location.href = '/'
    }
  }, [user, authLoading])
  
  // 2. DATA FETCH & ACCESS CONTROL
  useEffect(() => {
    const checkAccessAndFetchData = async () => {
      if (!user) return;
      
      try {
        // Fetch Course and check if it's "Open"
        const { data: courseData } = await supabase.from('courses').select('*').limit(1).single()
        
        // Fetch User Profile for name, handicap, and submission status
        const { data: userData } = await supabase
          .from('member')
          .select('handicap_index, display_name, has_submitted_current_round') 
          .eq('auth_user_id', user.id)
          .single();

        if (courseData) setCourse(courseData)

        if (userData) {
          setCurrentHandicap(userData.handicap_index ?? 0)
          setGolferName(userData.display_name ?? 'Anonymous Golfer')
          
          // THE GATEKEEPER LOGIC
          if (!courseData?.is_open) {
            setIsAllowed(false)
            setStatusMessage("Scoring is currently closed by the course.")
          } else if (userData.has_submitted_current_round) {
            setIsAllowed(false)
            setStatusMessage("You have already submitted a score for this round.")
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

  // --- MATH ENGINE ---
  const outTotal = grossScores.slice(0, 9).reduce((a, b) => a + b, 0)
  const inTotal = grossScores.slice(9, 18).reduce((a, b) => a + b, 0)
  const totalGross = outTotal + inTotal

  const netScores = grossScores.map((gross, i) => {
    if (!course || gross === 0) return 0
    const holeHandicap = course.handicap_values[i]
    let pops = 0
    if (currentHandicap >= holeHandicap) pops++
    if (currentHandicap >= holeHandicap + 18) pops++
    return gross - pops
  })

  const totalNet = netScores.reduce((a, b) => a + b, 0)

  // --- SUBMIT LOGIC ---
  const submitScore = async () => {
    if (!course || !user) return

    // Validation: Ensure card is full
    const missingHoleIndex = grossScores.findIndex(score => score === 0 || isNaN(score));
    if (missingHoleIndex !== -1) {
      alert(`Missing Score: Please enter a score for Hole ${missingHoleIndex + 1}.`);
      return;
    }

    // 1. Insert Score
    const { data: scoreData, error: scoreError } = await supabase.from('scores').insert({
      member_id: user.id,
      course_id: course.id,
      golfer_name: golferName,
      gross_scores: grossScores,
      net_scores: netScores,
      total_gross: totalGross,
      total_net: totalNet
    }).select().single()
    
    if (scoreError) {
      alert(scoreError.message)
      return
    }

    // 2. Lock the user's account for this round
    await supabase.from('member')
      .update({ has_submitted_current_round: true })
      .eq('auth_user_id', user.id)

    // 3. Navigate to summary
    router.push(`/round-summary/${scoreData.id}`)
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
      <h1 style={{textAlign: 'center'}}>{course?.name}</h1>
      <p style={{textAlign: 'center', color: '#666', fontSize: '14px'}}>Logged in as: <strong>{golferName}</strong></p>
      
      <h3>Front 9 (Out: {outTotal})</h3>
      <div style={styles.scoreRow}>
        {course?.par_values.slice(0, 9).map((par: number, i: number) => (
          <div key={i} style={styles.holeBox}>
            <div style={styles.label}>H{i+1}</div>
            <div style={styles.parLabel}>P{par}</div>
            <div style={styles.hcpLabel}>HCP {course.handicap_values[i]}</div>
            <input 
              type="number" 
              inputMode="numeric"
              style={styles.input} 
              onChange={(e) => handleScoreChange(i, e.target.value)}
            />
          </div>
        ))}
      </div>

      <h3>Back 9 (In: {inTotal})</h3>
      <div style={styles.scoreRow}>
        {course?.par_values.slice(9, 18).map((par: number, i: number) => (
          <div key={i+9} style={styles.holeBox}>
            <div style={styles.label}>H{i+10}</div>
            <div style={styles.parLabel}>P{par}</div>
            <div style={styles.hcpLabel}>HCP {course.handicap_values[i+9]}</div>
            <input 
              type="number" 
              inputMode="numeric"
              style={styles.input} 
              onChange={(e) => handleScoreChange(i+9, e.target.value)}
            />
          </div>
        ))}
      </div>

      <div style={styles.summary}>
        <p><strong>Total Gross:</strong> {totalGross}</p>  
        <p style={{ color: '#2e7d32' }}><strong>Total Net:</strong> {totalNet}</p>  
        <p style={{ fontSize: '14px', borderTop: '1px solid #ddd', paddingTop: '10px', marginTop: '10px' }}>
            Handicap: <strong>{currentHandicap}</strong>
        </p>
      </div>

      <button onClick={submitScore} style={styles.btn}>Submit Round</button>
    </div>
  )
}

const styles = {
  container: { padding: '20px', maxWidth: '500px', margin: '0 auto', fontFamily: 'sans-serif' as const },
  scoreRow: { display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: '10px', marginBottom: '20px' },
  holeBox: { display: 'flex', flexDirection: 'column' as const, alignItems: 'center', border: '1px solid #ddd', padding: '5px', borderRadius: '4px' },
  label: { fontSize: '10px', fontWeight: 'bold' as const },
  parLabel: { fontSize: '11px', color: '#444', fontWeight: 'bold' as const },
  hcpLabel: { fontSize: '9px', color: '#888', fontStyle: 'italic' as const },
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
  btn: { width: '100%', padding: '15px', background: '#2e7d32', color: 'white', border: 'none', borderRadius: '8px', fontSize: '16px', fontWeight: 'bold' as const, cursor: 'pointer' }
}