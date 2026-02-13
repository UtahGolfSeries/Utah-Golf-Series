'use client'
import { useEffect, useState } from 'react'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!)

export default function RoundSummary({ params }: { params: { id: string } }) {
  const [round, setRound] = useState<any>(null)

  useEffect(() => {
    const fetchRound = async () => {
      const { data } = await supabase
        .from('scores')
        .select('*, courses(name)')
        .eq('id', params.id)
        .single()
      setRound(data)
    }
    fetchRound()
  }, [params.id])

  if (!round) return <p>Loading summary...</p>

  return (
    <div style={{ padding: '20px', maxWidth: '500px', margin: '0 auto', textAlign: 'center' }}>
      <h1>Round Complete!</h1>
      <div style={{ background: '#f0f4f0', padding: '20px', borderRadius: '15px', marginTop: '20px' }}>
        <h2>{round.courses.name}</h2>
        <p style={{ fontSize: '24px' }}>Gross: <strong>{round.total_gross}</strong></p>
        <p style={{ fontSize: '32px', color: '#2e7d32' }}>Net: <strong>{round.total_net}</strong></p>
      </div>
      <p style={{ marginTop: '20px', color: '#666' }}>Your score has been locked and submitted to the leaderboard.</p>
    </div>
  )
}