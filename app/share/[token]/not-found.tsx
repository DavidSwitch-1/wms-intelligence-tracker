import Link from 'next/link'
import { Inter } from 'next/font/google'

// Rendered when /share/<token> hits notFound() — i.e. token unknown / expired.

const inter = Inter({
  subsets: ['latin'],
  display: 'swap',
  weight: ['400', '500', '600', '700', '800'],
})

const C = {
  cream: '#FAF9F5',
  paper: '#FFFFFF',
  navy: '#0B1C37',
  yellow: '#FECC01',
  teal: '#0E7C7B',
  ink: '#0B1C37',
  inkMute: '#5C6376',
  inkSoft: '#8A8F9E',
  border: '#E8E5DD',
}

export default function ShareNotFound() {
  return (
    <div
      className={inter.className}
      style={{
        minHeight: '100vh',
        background: C.cream,
        color: C.ink,
        display: 'flex',
        flexDirection: 'column',
        fontFamily: 'var(--font-inter), -apple-system, BlinkMacSystemFont, "Segoe UI", system-ui, sans-serif',
      }}
    >
      <header
        style={{
          background: C.navy,
          color: '#fff',
          borderBottom: `3px solid ${C.yellow}`,
        }}
      >
        <div
          style={{
            maxWidth: 880,
            margin: '0 auto',
            padding: '14px 24px',
            display: 'flex',
            alignItems: 'baseline',
            gap: 8,
          }}
        >
          <span style={{ fontWeight: 800, fontSize: 18, letterSpacing: '-0.01em', color: '#fff' }}>
            swi
            <span style={{ color: C.yellow }}>·</span>
            tch
          </span>
          <span
            style={{
              fontSize: 11,
              fontWeight: 600,
              letterSpacing: '0.08em',
              textTransform: 'uppercase',
              color: 'rgba(255,255,255,0.7)',
            }}
          >
            WMS Intelligence
          </span>
        </div>
      </header>

      <main
        style={{
          flex: 1,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '40px 24px',
        }}
      >
        <div
          style={{
            background: C.paper,
            border: `1px solid ${C.border}`,
            borderRadius: 12,
            padding: '36px 32px',
            maxWidth: 480,
            width: '100%',
            textAlign: 'center',
            boxShadow: '0 1px 2px rgba(11,28,55,0.04)',
          }}
        >
          <div
            style={{
              fontSize: 11,
              fontWeight: 700,
              letterSpacing: '0.14em',
              textTransform: 'uppercase',
              color: C.teal,
              marginBottom: 10,
            }}
          >
            404
          </div>
          <h1
            style={{
              margin: 0,
              fontSize: 24,
              fontWeight: 800,
              color: C.navy,
              letterSpacing: '-0.01em',
            }}
          >
            Brief not found
          </h1>
          <p
            style={{
              marginTop: 12,
              fontSize: 14,
              lineHeight: 1.6,
              color: C.inkMute,
            }}
          >
            This share link is no longer valid. It may have been revoked,
            expired, or never existed. Ask the sender for a fresh link.
          </p>
          <div style={{ marginTop: 22 }}>
            <Link
              href="https://swi-tch.com"
              style={{
                display: 'inline-block',
                padding: '10px 18px',
                borderRadius: 8,
                background: C.navy,
                color: '#fff',
                textDecoration: 'none',
                fontSize: 13,
                fontWeight: 600,
              }}
            >
              swi-tch.com
            </Link>
          </div>
        </div>
      </main>

      <footer
        style={{
          padding: '16px 24px 28px 24px',
          fontSize: 11,
          color: C.inkSoft,
          textAlign: 'center',
        }}
      >
        WMS recruitment intelligence — swi-tch
      </footer>
    </div>
  )
}
