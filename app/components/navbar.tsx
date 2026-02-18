'use client'
import React from 'react'
import Link from 'next/link'
import { useAuth } from '../context/AuthContext'
import { usePathname } from 'next/navigation'

export default function Navbar() {
  const { user, logout } = useAuth()
  const pathname = usePathname()

  // Helper to highlight active links
  const isActive = (path: string) => pathname === path

  return (
    <nav style={styles.nav}>
      <div style={styles.container}>
        {/* LOGO SECTION */}
        <Link href="/" style={styles.logo}>
          <span style={styles.logoIcon}>⛳️</span>
          <span style={styles.logoText}>THE LEAGUE</span>
        </Link>

        {/* NAVIGATION LINKS */}
        <div style={styles.navLinks}>
          <Link href="/" style={isActive('/') ? styles.activeLink : styles.link}>Home</Link>
          
          {user && (
            <>
              <Link href="/leagues" style={isActive('/leagues') ? styles.activeLink : styles.link}>Tournaments</Link>
              
              {user.role === 'admin' ? (
                <Link href="/members" style={isActive('/members') ? styles.activeLink : styles.link}>Roster</Link>
              ) : (
                <Link href="/account" style={isActive('/account') ? styles.activeLink : styles.link}>My Wallet</Link>
              )}
            </>
          )}
        </div>

        {/* AUTH BUTTONS */}
        <div style={styles.authZone}>
          {user ? (
            <div style={styles.userSection}>
              <div style={styles.userInfo}>
                <span style={styles.userName}>{user.display_name}</span>
                {user.role !== 'admin' && (
                  <span style={styles.userRole}>HCP: {user.handicap_index || '0.0'}</span>
                )}
              </div>
              <button onClick={logout} style={styles.logoutBtn}>Logout</button>
            </div>
          ) : (
            <div style={{ display: 'flex', gap: '10px' }}>
              <Link href="/login" style={styles.loginLink}>Sign In</Link>
              <Link href="/signup" style={styles.signupBtn}>Join League</Link>
            </div>
          )}
        </div>
      </div>
    </nav>
  )
}

const styles = {
  nav: {
    height: '70px',
    background: '#1a1a1a', // Dark theme to match the flight headers
    display: 'flex',
    alignItems: 'center',
    borderBottom: '3px solid #2e7d32', // Brand green accent
    position: 'sticky' as const,
    top: 0,
    zIndex: 1000,
    padding: '0 20px',
  },
  container: {
    maxWidth: '1200px',
    width: '100%',
    margin: '0 auto',
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  logo: {
    display: 'flex',
    alignItems: 'center',
    textDecoration: 'none',
    gap: '10px',
  },
  logoIcon: { fontSize: '24px' },
  logoText: {
    color: '#fff',
    fontWeight: '900' as const,
    fontSize: '18px',
    letterSpacing: '1px',
  },
  navLinks: {
    display: 'flex',
    gap: '25px',
    marginLeft: '40px',
  },
  link: {
    color: '#bbb',
    textDecoration: 'none',
    fontSize: '14px',
    fontWeight: 'bold' as const,
    transition: 'color 0.2s',
  },
  activeLink: {
    color: '#fff',
    textDecoration: 'none',
    fontSize: '14px',
    fontWeight: 'bold' as const,
    borderBottom: '2px solid #2e7d32',
    paddingBottom: '5px',
  },
  authZone: { display: 'flex', alignItems: 'center' },
  userSection: { display: 'flex', alignItems: 'center', gap: '20px' },
  userInfo: { display: 'flex', flexDirection: 'column' as const, alignItems: 'flex-end' },
  userName: { color: '#fff', fontSize: '14px', fontWeight: 'bold' as const },
  userRole: { color: '#2e7d32', fontSize: '11px', fontWeight: 'bold' as const },
  logoutBtn: {
    background: 'transparent',
    border: '1px solid #444',
    color: '#fff',
    padding: '6px 12px',
    borderRadius: '6px',
    cursor: 'pointer',
    fontSize: '12px',
  },
  loginLink: { color: '#fff', textDecoration: 'none', fontSize: '14px', fontWeight: 'bold' as const, alignSelf: 'center' as const, marginRight: '15px' },
  signupBtn: {
    background: '#2e7d32',
    color: '#fff',
    padding: '10px 18px',
    borderRadius: '8px',
    textDecoration: 'none',
    fontWeight: 'bold' as const,
    fontSize: '14px',
  }
}