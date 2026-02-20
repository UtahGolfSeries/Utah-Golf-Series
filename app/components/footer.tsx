'use client'
import { useAuth } from '../context/AuthContext'
import { usePathname } from 'next/navigation'

export default function Footer() {
  const { courseName } = useAuth()
  const pathname = usePathname()
  const year = new Date().getFullYear()

  // Logic to determine if we are on the Home Page
  const isHome = pathname === '/'

  // Dynamic Styles based on the page
  const footerBg = isHome ? '#ffffff' : '#0000005f'
  const textColor = isHome ? '#999' : '#888'
  const brandColor = isHome ? '#2e7d32' : '#ffffff'
  const borderColor = isHome ? '#eee' : '#333'

  return (
    <footer style={{ ...styles.footer, backgroundColor: footerBg, borderTop: `1px solid ${borderColor}` }}>
      <div style={styles.content}>
        <div style={styles.topSection}>
          <div style={styles.brand}>
            <span style={{ ...styles.courseText, color: brandColor }}>{courseName}</span>
          </div>
        </div>
        
        <div style={{ ...styles.divider, backgroundColor: isHome ? '#f5f5f5' : '#333' }} />
        
        <div style={styles.bottomSection}>
          <p style={{ ...styles.copyright, color: textColor }}>
            © {year} {courseName}. All rights reserved.
          </p>
          <div style={styles.links}>
            <span style={{ ...styles.tag, color: isHome ? '#bbb' : '#555' }}>Member Portal v1.0</span>
          </div>
        </div>
      </div>
    </footer>
  )
}

const styles = {
  footer: {
    width: '100%',
    padding: '40px 20px',
    marginTop: 'auto',
    transition: 'background-color 0.3s ease', // Smooth transition when switching pages
  },
  content: {
    maxWidth: '800px',
    margin: '0 auto',
    textAlign: 'center' as const,
  },
  topSection: {
    marginBottom: '20px',
  },
  brand: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '8px',
  },
  logo: { fontSize: '20px' },
  courseText: {
    fontWeight: 'bold' as const,
    letterSpacing: '1px',
    fontSize: '14px',
    textTransform: 'uppercase' as const,
  },
  divider: {
    height: '1px',
    margin: '20px 0',
  },
  bottomSection: {
    display: 'flex',
    flexDirection: 'column' as const,
    alignItems: 'center',
    gap: '10px',
  },
  copyright: {
    fontSize: '12px',
    margin: 0,
  },
  links: {
    display: 'flex',
    gap: '15px',
  },
  tag: {
    fontSize: '10px',
    fontWeight: 'bold' as const,
    textTransform: 'uppercase' as const,
  }
}