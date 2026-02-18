'use client'
import React, { useState, useEffect } from 'react'
import { createClient } from '@supabase/supabase-js'
import PageHeader from '../../components/pageHeader'

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!)

export default function AdminSchedule() {
  const [schedule, setSchedule] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => { 
    fetchSchedule() 
  }, [])

  const fetchSchedule = async () => {
    const { data, error } = await supabase
      .from('schedule')
      .select('*')
      .order('week_number', { ascending: true })
    
    if (error) {
      console.error("Error fetching schedule:", error.message)
    } else if (data) {
      setSchedule(data)
    }
    setLoading(false)
  }

  const updateWeek = async (id: number, field: string, value: any) => {
    const { error } = await supabase
      .from('schedule')
      .update({ [field]: value })
      .eq('id', id)
    
    if (!error) fetchSchedule()
  }

  const addWeek = async () => {
    const nextWeekNum = schedule.length > 0 ? schedule[schedule.length - 1].week_number + 1 : 1
    const { error } = await supabase.from('schedule').insert([
      { 
        week_number: nextWeekNum, 
        week_date: new Date().toISOString().split('T')[0], // Default to today
        game_name: 'Individual Stroke Play', 
        course_nine: 'Front 9', 
        tee_color: 'White',
      }
    ])
    if (!error) fetchSchedule()
  }

  const removeWeek = async (id: number, weekNum: number) => {
    if (!window.confirm(`Are you sure you want to remove Week ${weekNum}? This cannot be undone.`)) return
    
    const { error } = await supabase.from('schedule').delete().eq('id', id)
    if (!error) fetchSchedule()
  }

  if (loading) return <div style={{padding: '50px', textAlign: 'center'}}>Loading Season Editor...</div>

  return (
    <div style={styles.container}>
      <PageHeader title="Season Setup" subtitle="MANAGE WEEKLY ROTATION AND GAMES" />
      
      <div style={styles.card}>
        <table style={styles.table}>
          <thead>
            <tr>
              <th style={{...styles.th, width: '80px'}}>Week</th>
              <th style={{...styles.th, width: '150px'}}>Date</th>
              <th style={styles.th}>Game / Format</th>
              <th style={styles.th}>Nine Holes</th>
              <th style={styles.th}>Tees</th>
              <th style={{...styles.th, width: '50px'}}></th>
            </tr>
          </thead>
          <tbody>
            {schedule.map((wk) => (
              <tr key={wk.id} style={styles.tr}>
                {/* Darkened Week Numbers */}
                <td style={styles.td}><strong style={{color: '#000'}}>#{wk.week_number}</strong></td>
                {/* Added Calendar Date Element */}
                <td style={styles.td}>
                  <input 
                    type="date"
                    style={styles.dateInput}
                    value={wk.week_date || ''}
                    onChange={(e) => updateWeek(wk.id, 'week_date', e.target.value)}
                  />
                </td>
                <td style={styles.td}>
                  <input 
                    style={styles.input} 
                    value={wk.game_name} 
                    onBlur={(e) => updateWeek(wk.id, 'game_name', e.target.value)}
                    onChange={(e) => {
                      const newSched = [...schedule];
                      const target = newSched.find(s => s.id === wk.id);
                      if (target) target.game_name = e.target.value;
                      setSchedule(newSched);
                    }}
                  />
                </td>
                <td style={styles.td}>
                  <select style={styles.select} value={wk.course_nine} onChange={(e) => updateWeek(wk.id, 'course_nine', e.target.value)}>
                    <option value="Front 9">Front 9</option>
                    <option value="Back 9">Back 9</option>
                    <option value="Full 18">Full 18</option>
                  </select>
                </td>
                <td style={styles.td}>
                  <select style={styles.select} value={wk.tee_color} onChange={(e) => updateWeek(wk.id, 'tee_color', e.target.value)}>
                    <option value="White">White</option>
                    <option value="Blue">Blue</option>
                    <option value="Black">Black</option>
                    <option value="Red">Red</option>
                  </select>
                </td>
                <td style={styles.td}>
                  <button 
                    onClick={() => removeWeek(wk.id, wk.week_number)} 
                    style={styles.deleteBtn}
                  >
                    ✕
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        <div style={styles.footer}>
          <button onClick={addWeek} style={styles.addBtn}>
            + Add Another Week
          </button>
        </div>
      </div>
    </div>
  )
}

const styles = {
  container: { padding: '20px', maxWidth: '1000px', margin: '0 auto' },
  card: { background: 'white', borderRadius: '12px', boxShadow: '0 4px 12px rgba(0,0,0,0.1)', overflow: 'hidden' },
  table: { width: '100%', borderCollapse: 'collapse' as const },
  th: { padding: '15px', background: '#f8f9fa', color: '#888', fontSize: '10px', textTransform: 'uppercase' as const, textAlign: 'left' as const, fontWeight: 'bold' as const },
  td: { padding: '12px 15px', borderBottom: '1px solid #eee' },
  tr: { verticalAlign: 'middle' as const },
  input: { padding: '8px', border: '1px solid #ddd', borderRadius: '4px', width: '90%', color: '#000', fontSize: '13px' },
  select: { padding: '8px', border: '1px solid #ddd', borderRadius: '4px', width: '100%', color: '#000', fontSize: '13px', backgroundColor: '#fff' },
  deleteBtn: { background: 'none', border: 'none', color: '#ff4444', fontSize: '18px', cursor: 'pointer', opacity: 0.6 },
  footer: { padding: '20px', textAlign: 'center' as const, backgroundColor: '#fdfdfd' },
  dateInput: { 
    padding: '6px', 
    border: '1px solid #ddd', 
    borderRadius: '4px', 
    fontSize: '13px', 
    fontFamily: 'sans-serif',
    color: '#000',
    width: '100%'
  },
  addBtn: { background: '#2e7d32', color: 'white', border: 'none', padding: '10px 20px', borderRadius: '6px', cursor: 'pointer', fontWeight: 'bold' as const, fontSize: '14px' }
}