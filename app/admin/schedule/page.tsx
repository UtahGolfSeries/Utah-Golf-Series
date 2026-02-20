'use client'
import React, { useState, useEffect } from 'react'
import { supabase } from '@/app/context/AuthContext'
import PageHeader from '@/app/components/pageHeader'

const GAME_FORMATS = ["Individual Stroke Play", "Chicago", "2-Man Best Ball", "Stableford", "Match Play", "Scramble"];
const TEES = ["White", "Blue", "Black", "Red"];
const NINES = ["Front 9", "Back 9", "Full 18"];

export default function AdminSchedule() {
  const [schedule, setSchedule] = useState<any[]>([])
  const [courses, setCourses] = useState<any[]>([])
  const [editingId, setEditingId] = useState<number | null>(null)
  const [editData, setEditData] = useState<any>(null)
  const [loading, setLoading] = useState(true)

  const [isAdding, setIsAdding] = useState(false)
  const [newWeekData, setNewWeekData] = useState({
    week_number: 1,
    week_date: '',
    game_name: 'Chicago',
    course_nine: 'Front 9',
    course_id: '',
    num_flights: 1,
    flights_config: { "Flight A": "White" } as any
  })

  useEffect(() => {
    fetchInitialData()
  }, [])

  const fetchInitialData = async () => {
    const { data: sched } = await supabase.from('schedule').select('*, courses(name)').order('week_number', { ascending: true })
    const { data: crs } = await supabase.from('courses').select('id, name').order('name')
    if (sched) {
      setSchedule(sched)
      setNewWeekData(prev => ({ ...prev, week_number: sched.length + 1 }))
    }
    if (crs) setCourses(crs)
    setLoading(false)
  }

  const deleteWeek = async (id: number) => {
  const confirmDelete = window.confirm("Are you sure you want to delete this week? This cannot be undone and may affect historical scores.");
  
  if (confirmDelete) {
    const { error } = await supabase
      .from('schedule')
      .delete()
      .eq('id', id);

    if (!error) {
      setEditingId(null);
      fetchInitialData();
    } else {
      alert("Error deleting week: " + error.message);
    }
  }
};

  // Handle Flight Logic for the NEW week form
  const handleNewWeekFlightChange = (num: number) => {
    const newConfig: any = {}
    for (let i = 0; i < num; i++) {
      const label = `Flight ${String.fromCharCode(65 + i)}`
      newConfig[label] = "White"
    }
    setNewWeekData({ ...newWeekData, num_flights: num, flights_config: newConfig })
  }

  const handleAddWeek = async () => {
    if (!newWeekData.course_id || !newWeekData.week_date) {
        alert("Please select a date and a course first!");
        return;
    }

    const { error } = await supabase.from('schedule').insert([newWeekData])
    if (!error) {
      setIsAdding(false)
      fetchInitialData()
    } else {
      console.error(error)
      alert("Error: " + error.message)
    }
  }

  const startEdit = (week: any) => {
    setEditingId(week.id)
    setEditData({
      ...week,
      num_flights: week.num_flights || 1,
      flights_config: week.flights_config || { "Flight A": "White" }
    })
  }

  const saveEdit = async () => {
    const { error } = await supabase
      .from('schedule')
      .update({
        game_name: editData.game_name,
        course_nine: editData.course_nine,
        week_date: editData.week_date,
        course_id: editData.course_id,
        num_flights: editData.num_flights,
        flights_config: editData.flights_config
      })
      .eq('id', editingId)

    if (!error) {
      setEditingId(null)
      fetchInitialData()
    }
  }

  if (loading) return <div style={styles.loader}>Loading Schedule Tools...</div>

  return (
    <div style={styles.container}>
      <PageHeader title="Manage Schedule" subtitle="SET SEASON GAMES & FLIGHT PARAMETERS" />

      <div style={styles.list}>
        {schedule.map((wk) => (
          <div key={wk.id} style={styles.card}>
            <div style={styles.weekNum}>WK {wk.week_number}</div>
            
            {editingId === wk.id ? (
              <div style={styles.editContainer}>
                <div style={styles.editGrid}>
                  <div style={styles.inputGroup}>
                    <label style={styles.label}>Date</label>
                    <input type="date" style={styles.input} value={editData.week_date || ""} onChange={e => setEditData({...editData, week_date: e.target.value})} />
                  </div>
                  <div style={styles.inputGroup}>
                    <label style={styles.label}>Course</label>
                    <select style={styles.select} value={editData.course_id || ""} onChange={e => setEditData({...editData, course_id: e.target.value})}>
                      <option value="">Select Course...</option>
                      {courses.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                    </select>
                  </div>
                  <div style={styles.inputGroup}>
                    <label style={styles.label}>Format</label>
                    <select style={styles.select} value={editData.game_name} onChange={e => setEditData({...editData, game_name: e.target.value})}>
                      {GAME_FORMATS.map(g => <option key={g} value={g}>{g}</option>)}
                    </select>
                  </div>
                  <div style={styles.inputGroup}>
                    <label style={styles.label}>Section</label>
                    <select style={styles.select} value={editData.course_nine} onChange={e => setEditData({...editData, course_nine: e.target.value})}>
                      {NINES.map(n => <option key={n} value={n}>{n}</option>)}
                    </select>
                  </div>
                  <div style={styles.inputGroup}>
                    <label style={styles.label}>Num Flights</label>
                    <select style={styles.select} value={editData.num_flights} onChange={e => {
                        const num = parseInt(e.target.value);
                        const newConfig: any = {};
                        for (let i = 0; i < num; i++) {
                            const label = `Flight ${String.fromCharCode(65 + i)}`;
                            newConfig[label] = editData.flights_config[label] || "White";
                        }
                        setEditData({...editData, num_flights: num, flights_config: newConfig});
                    }}>
                      {[1, 2, 3, 4].map(n => <option key={n} value={n}>{n}</option>)}
                    </select>
                  </div>
                </div>
                <div style={styles.actions}>
                  <button onClick={() => deleteWeek(wk.id)} style={styles.deleteBtn}>Delete Week</button>
                  <button onClick={saveEdit} style={styles.saveBtn}>Save Changes</button>
                  <button onClick={() => setEditingId(null)} style={styles.cancelBtn}>Cancel</button>
                </div>
              </div>
            ) : (
              <div style={styles.displayRow}>
                <div style={styles.info}>
                  <div style={styles.dateLabel}>
                    {wk.week_date ? new Date(wk.week_date + 'T00:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) : 'No Date'} 
                    <span style={{color: '#999'}}> • {wk.courses?.name || 'No Course Selected'}</span>
                  </div>
                  <div style={styles.gameTitle}>{wk.game_name}</div>
                  <div style={styles.details}>{wk.course_nine} • {wk.num_flights || 1} Flight(s)</div>
                </div>
                <button onClick={() => startEdit(wk)} style={styles.editBtn}>Edit</button>
              </div>
            )}
          </div>
        ))}

        {/* ADD NEW WEEK FORM */}
        {!isAdding ? (
          <div style={styles.footerAction}>
            <button onClick={() => setIsAdding(true)} style={styles.bigAddBtn}>
              + ADD WEEK {schedule.length + 1} TO SCHEDULE
            </button>
          </div>
        ) : (
          <div style={{...styles.card, border: '2px solid #2e7d32'}}>
             <div style={styles.editContainer}>
                <h3 style={styles.gameTitle}>NEW WEEK {newWeekData.week_number}</h3>
                <div style={styles.editGrid}>
                    <div style={styles.inputGroup}>
                        <label style={styles.label}>Date</label>
                        <input type="date" style={styles.input} value={newWeekData.week_date} onChange={e => setNewWeekData({...newWeekData, week_date: e.target.value})} />
                    </div>
                    <div style={styles.inputGroup}>
                        <label style={styles.label}>Course</label>
                        <select style={styles.select} value={newWeekData.course_id} onChange={e => setNewWeekData({...newWeekData, course_id: e.target.value})}>
                            <option value="">Select Course...</option>
                            {courses.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                        </select>
                    </div>
                    <div style={styles.inputGroup}>
                        <label style={styles.label}>Format</label>
                        <select style={styles.select} value={newWeekData.game_name} onChange={e => setNewWeekData({...newWeekData, game_name: e.target.value})}>
                            {GAME_FORMATS.map(g => <option key={g} value={g}>{g}</option>)}
                        </select>
                    </div>
                    <div style={styles.inputGroup}>
                        <label style={styles.label}>Section</label>
                        <select style={styles.select} value={newWeekData.course_nine} onChange={e => setNewWeekData({...newWeekData, course_nine: e.target.value})}>
                            {NINES.map(n => <option key={n} value={n}>{n}</option>)}
                        </select>
                    </div>
                    <div style={styles.inputGroup}>
                        <label style={styles.label}>Flights</label>
                        <select style={styles.select} value={newWeekData.num_flights} onChange={e => handleNewWeekFlightChange(parseInt(e.target.value))}>
                            {[1, 2, 3, 4].map(n => <option key={n} value={n}>{n}</option>)}
                        </select>
                    </div>
                </div>

                {/* TEE CONFIG FOR NEW WEEK */}
                <div style={styles.flightTeeBox}>
                  <label style={styles.label}>Flight Tee Assignments</label>
                  <div style={styles.teeGrid}>
                    {Object.keys(newWeekData.flights_config).map((f) => (
                      <div key={f} style={styles.teeRow}>
                        <span style={{fontSize: '11px'}}>{f}:</span>
                        <select 
                          style={styles.smallSelect} 
                          value={newWeekData.flights_config[f]} 
                          onChange={e => {
                            const updated = {...newWeekData.flights_config, [f]: e.target.value};
                            setNewWeekData({...newWeekData, flights_config: updated});
                          }}
                        >
                          {TEES.map(t => <option key={t} value={t}>{t}</option>)}
                        </select>
                      </div>
                    ))}
                  </div>
                </div>

                <div style={styles.actions}>
                    <button onClick={handleAddWeek} style={styles.saveBtn}>Create Week</button>
                    <button onClick={() => setIsAdding(false)} style={styles.cancelBtn}>Cancel</button>
                </div>
             </div>
          </div>
        )}
      </div>
    </div>
  )
}

// STYLES (Make sure flightTeeBox and teeGrid are defined as below)
const styles = {
  container: { padding: '20px', maxWidth: '1000px', margin: '0 auto', fontFamily: 'sans-serif' },
  loader: { textAlign: 'center' as const, padding: '50px', color: '#000' },
  list: { display: 'flex', flexDirection: 'column' as const, gap: '15px' },
  card: { background: '#fff', border: '1px solid #ddd', borderRadius: '12px', padding: '20px', display: 'flex', alignItems: 'flex-start', gap: '25px', boxShadow: '0 2px 8px rgba(0,0,0,0.05)' },
  weekNum: { background: '#000', color: '#494949', padding: '6px 12px', borderRadius: '6px', fontSize: '11px', fontWeight: 'bold' as const, minWidth: '45px', textAlign: 'center' as const, marginTop: '5px' },
  displayRow: { display: 'flex', flex: 1, justifyContent: 'space-between', alignItems: 'center' },
  info: { flex: 1 },
  dateLabel: { fontSize: '12px', fontWeight: 'bold' as const, color: '#2e7d32', textTransform: 'uppercase' as const, marginBottom: '2px' },
  gameTitle: { fontWeight: '900' as const, fontSize: '18px', color: '#2e7d32' },
  details: { fontSize: '13px', color: '#444', fontWeight: 'bold' as const },
  editBtn: { background: '#f5f5f5', border: '1px solid #ddd', color: '#000', padding: '8px 20px', borderRadius: '6px', cursor: 'pointer', fontSize: '12px', fontWeight: 'bold' as const },
  editContainer: { flex: 1, display: 'flex', flexDirection: 'column' as const, gap: '20px' },
  editGrid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: '15px', width: '100%' },
  inputGroup: { display: 'flex', flexDirection: 'column' as const, gap: '5px' },
  label: { fontSize: '10px', fontWeight: 'bold' as const, color: '#202020', textTransform: 'uppercase' as const },
  select: { padding: '10px', borderRadius: '6px', border: '1px solid #000', fontSize: '13px', color: '#000', backgroundColor: '#fff', width: '100%' },
  input: { padding: '10px', borderRadius: '6px', border: '1px solid #000', fontSize: '13px', color: '#000', backgroundColor: '#fff', width: '100%' },
  flightTeeBox: { background: '#f9f9f9', padding: '15px', borderRadius: '8px', border: '1px solid #dad6d6', color: '#444' },
  teeGrid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(120px, 1fr))', gap: '10px', marginTop: '10px' },
  teeRow: { display: 'flex', alignItems: 'center', gap: '8px' },
  smallSelect: { padding: '5px', borderRadius: '4px', border: '1px solid #000', fontSize: '12px' },
  actions: { display: 'flex', gap: '10px', borderTop: '1px solid #eee', paddingTop: '15px', justifyContent: 'flex-end' },
  saveBtn: { background: '#2e7d32', color: '#fff', border: 'none', padding: '10px 20px', borderRadius: '6px', cursor: 'pointer', fontWeight: 'bold' as const, fontSize: '13px' },
  cancelBtn: { background: '#fff', border: '1px solid #000', color: '#000', padding: '10px 20px', borderRadius: '6px', cursor: 'pointer', fontWeight: 'bold' as const, fontSize: '13px' },
  footerAction: { textAlign: 'center' as const, marginTop: '30px' },
  bigAddBtn: { background: '#000', color: '#fff', border: 'none', padding: '18px 40px', borderRadius: '8px', cursor: 'pointer', fontWeight: '900' as const, fontSize: '14px' },
  deleteBtn: { 
  background: 'none', 
  border: '1px solid #dc3545', 
  color: '#dc3545', 
  padding: '10px 20px', 
  borderRadius: '6px', 
  cursor: 'pointer', 
  fontWeight: 'bold' as const, 
  fontSize: '13px',
},
}