'use client'
import React, { useState, useEffect } from 'react'
import { supabase } from '@/app/context/AuthContext'
import PageHeader from '@/app/components/pageHeader'

export default function AdminCourses() {
  const [courses, setCourses] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [expandedId, setExpandedId] = useState<string | null>(null)
  
  const [formData, setFormData] = useState({
    name: '',
    address: '',
    phone_number: '',
    website_url: '',
    holes: Array(18).fill(null).map((_, i) => ({ hole: i + 1, par: 4, yardage: 0, handicap: 1 }))
  })

  useEffect(() => {
    fetchCourses()
  }, [])

  const fetchCourses = async () => {
    const { data } = await supabase.from('courses').select('*').order('name', { ascending: true })
    if (data) setCourses(data)
    setLoading(false)
  }

  const toggleExpand = (id: string) => {
    setExpandedId(expandedId === id ? null : id)
  }

  const handleHoleChange = (index: number, field: string, value: number) => {
    const newHoles = [...formData.holes]
    newHoles[index] = { ...newHoles[index], [field]: value }
    setFormData({ ...formData, holes: newHoles })
  }

  const saveNewCourse = async () => {
    // Basic validation
    if (!formData.name) return alert("Course Name is required")

    const { error } = await supabase.from('courses').insert([formData])
    if (!error) {
      setIsModalOpen(false)
      setFormData({
        name: '', address: '', phone_number: '', website_url: '',
        holes: Array(18).fill(null).map((_, i) => ({ hole: i + 1, par: 4, yardage: 0, handicap: 1 }))
      })
      fetchCourses()
    } else {
      alert(error.message)
    }
  }

  if (loading) return <div style={styles.loader}>Loading Library...</div>

  return (
    <div style={styles.container}>
      <PageHeader title="Course Library" subtitle="MANAGE VENUES & SCORECARDS" />

      <div style={styles.list}>
        {courses.map((course) => (
          <div key={course.id} style={styles.cardWrapper}>
            <div style={styles.card} onClick={() => toggleExpand(course.id)}>
              <div style={styles.weekNum}>{course.holes?.length || 18} HOLES</div>
              
              <div style={styles.displayRow}>
                <div style={styles.info}>
                  <div style={styles.dateLabel}>{course.address || 'NO ADDRESS SET'}</div>
                  <div style={styles.gameTitle}>{course.name}</div>
                  <div style={styles.details}>{course.phone_number || 'No Phone Set'}</div>
                </div>
                <div style={styles.chevron}>{expandedId === course.id ? '▲' : '▼'}</div>
              </div>
            </div>

            {/* EXPANDABLE SECTION */}
            {expandedId === course.id && (
              <div style={styles.expandedContent}>
                <div style={styles.contactBar}>
                  {course.website_url && <a href={course.website_url} target="_blank" rel="noreferrer" style={styles.linkBtn}>Visit Website</a>}
                  {course.phone_number && <span style={styles.phoneLabel}>TEL: {course.phone_number}</span>}
                </div>

                <div style={styles.tableWrapper}>
                  <table style={styles.table}>
                    <thead>
                      <tr>
                        <th style={styles.th}>HOLE</th>
                        <th style={styles.th}>PAR</th>
                        <th style={styles.th}>YDS</th>
                        <th style={styles.th}>HCP</th>
                      </tr>
                    </thead>
                    <tbody>
                      {course.holes.map((h: any, idx: number) => (
                        <tr key={idx} style={idx % 2 === 0 ? styles.trEven : {}}>
                          <td style={styles.td}><strong>{h.hole}</strong></td>
                          <td style={styles.td}>{h.par}</td>
                          <td style={styles.td}>{h.yardage}</td>
                          <td style={styles.td}>{h.handicap}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>
        ))}

        <div style={styles.footerAction}>
          <button onClick={() => setIsModalOpen(true)} style={styles.bigAddBtn}>
            + ADD NEW COURSE TO LIBRARY
          </button>
        </div>
      </div>

      {/* MODAL */}
      {isModalOpen && (
        <div style={styles.modalOverlay}>
          <div style={styles.modalContent}>
            <div style={styles.modalHeader}>
              <h2 style={styles.gameTitle}>ADD NEW COURSE</h2>
              <button onClick={() => setIsModalOpen(false)} style={styles.cancelBtn}>✕</button>
            </div>
            <div style={styles.modalBody}>
              <div style={styles.editGrid}>
                <div style={styles.inputGroup}><label style={styles.label}>COURSE NAME</label>
                  <input style={styles.input} value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} />
                </div>
                <div style={styles.inputGroup}><label style={styles.label}>ADDRESS</label>
                  <input style={styles.input} value={formData.address} onChange={e => setFormData({...formData, address: e.target.value})} />
                </div>
                <div style={styles.inputGroup}><label style={styles.label}>PHONE</label>
                  <input style={styles.input} value={formData.phone_number} onChange={e => setFormData({...formData, phone_number: e.target.value})} />
                </div>
                <div style={styles.inputGroup}><label style={styles.label}>URL</label>
                  <input style={styles.input} value={formData.website_url} onChange={e => setFormData({...formData, website_url: e.target.value})} />
                </div>
              </div>

              {/* UPDATED HOLE INPUT GRID */}
              <h3 style={{...styles.label, marginTop: '25px'}}>Hole-by-Hole Data</h3>
              <div style={styles.holeGrid}>
                {formData.holes.map((hole, i) => (
                  <div key={i} style={styles.holeRow}>
                    {/* UPDATED: Fixed width span so double digits don't push inputs */}
                    <span style={styles.holeLabel}>#{i+1}</span>
                    
                    {/* UPDATED: Inputs now flex to fill space evenly */}
                    <input type="number" placeholder="Par" style={styles.flexInput} onChange={e => handleHoleChange(i, 'par', parseInt(e.target.value))} />
                    <input type="number" placeholder="Yds" style={styles.flexInput} onChange={e => handleHoleChange(i, 'yardage', parseInt(e.target.value))} />
                    <input type="number" placeholder="Hcp" style={styles.flexInput} onChange={e => handleHoleChange(i, 'handicap', parseInt(e.target.value))} />
                  </div>
                ))}
              </div>
            </div>
            <div style={styles.actions}>
              <button onClick={saveNewCourse} style={styles.saveBtn}>Create Course</button>
              <button onClick={() => setIsModalOpen(false)} style={styles.cancelBtn}>Cancel</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

const styles = {
  container: { padding: '20px', maxWidth: '1000px', margin: '0 auto', fontFamily: 'sans-serif' },
  loader: { textAlign: 'center' as const, padding: '50px', color: '#000' },
  list: { display: 'flex', flexDirection: 'column' as const, gap: '15px' },
  cardWrapper: { background: '#fff', border: '1px solid #ddd', borderRadius: '12px', overflow: 'hidden', boxShadow: '0 2px 8px rgba(0,0,0,0.05)' },
  card: { padding: '20px', display: 'flex', alignItems: 'flex-start', gap: '25px', cursor: 'pointer', transition: 'background 0.2s' },
  weekNum: { background: '#000', color: '#fff', padding: '6px 12px', borderRadius: '6px', fontSize: '11px', fontWeight: 'bold' as const, minWidth: '60px', textAlign: 'center' as const, marginTop: '5px' },
  displayRow: { display: 'flex', flex: 1, justifyContent: 'space-between', alignItems: 'center' },
  info: { flex: 1 },
  dateLabel: { fontSize: '12px', fontWeight: 'bold' as const, color: '#2e7d32', textTransform: 'uppercase' as const, marginBottom: '2px' },
  gameTitle: { fontWeight: '900' as const, fontSize: '18px', color: '#000' },
  details: { fontSize: '13px', color: '#666', fontWeight: 'bold' as const, marginTop: '5px' },
  chevron: { color: '#999', fontSize: '12px' },
  
  // EXPANDED STYLES
  expandedContent: { padding: '0 20px 20px 20px', borderTop: '1px solid #eee', background: '#fafafa' },
  contactBar: { display: 'flex', justifyContent: 'flex-start', gap: '20px', alignItems: 'center', padding: '15px 0' },
  linkBtn: { background: '#2e7d32', color: '#fff', textDecoration: 'none', padding: '6px 15px', borderRadius: '6px', fontSize: '12px', fontWeight: 'bold' as const },
  phoneLabel: { fontSize: '12px', fontWeight: 'bold' as const, color: '#444' },
  tableWrapper: { maxHeight: '300px', overflowY: 'auto' as const, borderRadius: '8px', border: '1px solid #eee', background: '#fff' },
  table: { width: '100%', borderCollapse: 'collapse' as const, fontSize: '13px' },
  th: { background: '#000', color: '#fff', textAlign: 'center' as const, padding: '10px', fontSize: '10px', textTransform: 'uppercase' as const, position: 'sticky' as const, top: 0 },
  td: { padding: '8px 10px', borderBottom: '1px solid #eee', color: '#333', textAlign: 'center' as const },
  trEven: { background: '#f9f9f9' },

  // FORM & MODAL STYLES
  footerAction: { textAlign: 'center' as const, marginTop: '30px' },
  bigAddBtn: { background: '#2e7d32', color: '#fff', border: 'none', padding: '18px 40px', borderRadius: '8px', cursor: 'pointer', fontWeight: '900' as const, fontSize: '14px' },
  modalOverlay: { position: 'fixed' as const, top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.8)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 2000, padding: '20px' },
  modalContent: { backgroundColor: '#fff', borderRadius: '12px', width: '100%', maxWidth: '850px', maxHeight: '90vh', display: 'flex', flexDirection: 'column' as const, padding: '30px' },
  modalHeader: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' },
  modalBody: { overflowY: 'auto' as const, flex: 1, paddingRight: '5px' },
  editGrid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '15px' },
  inputGroup: { display: 'flex', flexDirection: 'column' as const, gap: '5px' },
  label: { fontSize: '10px', fontWeight: 'bold' as const, color: '#666', textTransform: 'uppercase' as const },
  input: { padding: '12px', borderRadius: '6px', border: '1px solid #000', fontSize: '14px' },
  actions: { display: 'flex', gap: '10px', borderTop: '1px solid #eee', paddingTop: '20px', justifyContent: 'flex-end', marginTop: '10px' },
  saveBtn: { background: '#2e7d32', color: '#fff', border: 'none', padding: '12px 25px', borderRadius: '6px', cursor: 'pointer', fontWeight: 'bold' as const },
  cancelBtn: { background: '#fff', border: '1px solid #000', color: '#000', padding: '12px 25px', borderRadius: '6px', cursor: 'pointer', fontWeight: 'bold' as const },

  // UPDATED HOLE INPUT STYLES
  // Increased minmax width so rows don't get squashed
  holeGrid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(170px, 1fr))', gap: '10px', marginTop: '15px' },
  // Increased padding and defined gap
  holeRow: { display: 'flex', alignItems: 'center', gap: '8px', background: '#f9f9f9', padding: '10px', borderRadius: '6px', border: '1px solid #eee' },
  // Fixed width for label to accommodate 2 digits
  holeLabel: { fontWeight: 'bold' as const, width: '32px', textAlign: 'center' as const, flexShrink: 0 },
  // Inputs flex to fill space evenly, no fixed width
  flexInput: { flex: 1, padding: '8px', borderRadius: '4px', border: '1px solid #ccc', textAlign: 'center' as const, fontSize: '13px', minWidth: '35px' },
}