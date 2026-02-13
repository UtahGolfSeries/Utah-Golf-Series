'use client'

import Link from 'next/link'
// The "../" means "go up one level" out of the components folder
import { useAuth } from "../context/AuthContext"

export default function Header() {
  const { user, logout } = useAuth()

  return (
    <nav style={styles.nav}>
      <div style={styles.logo}>
        <Link href="/">UTAH GOLF SERIES</Link>
      </div>
      
      <div style={styles.links}>
        <Link href="/" style={styles.link}>Home</Link>
        <Link href="/standings" style={styles.link}>Standings</Link>
        
        {user ? (
          // IF LOGGED IN: Show Account, Enter Score, and Logout
          <>
            <Link href="/account" style={styles.link}>My Account</Link>
            <Link href="/enter-score" style={styles.link}>Enter Score</Link>            
            <button onClick={logout} style={styles.logoutBtn}>Logout</button>
          </>
        ) : (
          // IF LOGGED OUT: Show Login and Sign Up
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
  logo: { fontWeight: 'bold', fontSize: '1.2rem' },
  links: { display: 'flex', alignItems: 'center', gap: '20px' },
  link: { color: 'white', textDecoration: 'none', fontSize: '14px' },
  logoutBtn: { 
    background: 'none', border: '1px solid white', color: 'white', 
    padding: '5px 10px', cursor: 'pointer', borderRadius: '4px' 
  },
  signUpBtn: {
    backgroundColor: '#2e7d32', color: 'white', padding: '8px 16px',
    borderRadius: '4px', textDecoration: 'none'
  }
}