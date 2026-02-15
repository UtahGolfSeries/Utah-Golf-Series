'use client'

import Link from 'next/link'
import { useAuth } from "../context/AuthContext"

export default function Header() {
  const { user, logout } = useAuth()

  // Helper variables to make the JSX cleaner
  const isAdmin = user?.role === 'admin'
  const isPlayer = user && user.role !== 'admin'

  return (
    <nav style={styles.nav}>
      <div style={styles.logo}>
        <Link href="/" style={{ color: 'white', textDecoration: 'none' }}>UTAH GOLF SERIES</Link>
      </div>
      
      <div style={styles.links}>
        <Link href="/" style={styles.link}>Home</Link>
        <Link href="/standings" style={styles.link}>Standings</Link>
        <Link href="/account" style={styles.link}>My Account</Link>        
        
        {user ? (
          <>
            {/* ADMIN ONLY LINKS */}
            {isAdmin && (
  <>
    <Link href="/admin/leagues" style={styles.adminLink}>Leagues</Link>
    <Link href="/admin/members" style={styles.adminLink}>Members</Link>
  </>
)}

            {/* PLAYER ONLY LINK - Hidden for Admins */}
            {isPlayer && (
              <Link href="/enter-score" style={styles.link}>Enter Score</Link>
            )}
            
            <button onClick={logout} style={styles.logoutBtn}>Logout</button>
          </>
        ) : (
          <>
            <Link href="/login" style={styles.link}>Login</Link>
            <Link href="/signup" style={styles.signUpBtn}>Sign Up</Link>
          </>
        )}
      </div>
    </nav>
  )
}

const styles = {
  nav: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '1rem 2rem',
    backgroundColor: '#1a1a1a',
    color: 'white',
  },
  logo: { fontWeight: 'bold' as const, fontSize: '1.2rem' },
  links: { display: 'flex', alignItems: 'center', gap: '20px' },
  link: { color: 'white', textDecoration: 'none', fontSize: '14px' },
  
  adminLink: {
    color: '#4caf50', 
    textDecoration: 'none',
    fontSize: '14px',
    fontWeight: 'bold' as const,
    border: '1px solid #4caf50',
    padding: '5px 10px',
    borderRadius: '4px'
  },

  logoutBtn: { 
    background: 'none', border: '1px solid white', color: 'white', 
    padding: '5px 10px', cursor: 'pointer', borderRadius: '4px',
    fontSize: '14px'
  },
  signUpBtn: {
    backgroundColor: '#2e7d32', color: 'white', padding: '8px 16px',
    borderRadius: '4px', textDecoration: 'none', fontSize: '14px'
  }
}