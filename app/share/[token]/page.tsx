import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { headers } from 'next/headers'
import { Inter } from 'next/font/google'
import { renderMarkdown } from '@/lib/markdown'

// Public share page for a brief.
// No login. The /share/[token] URL itself is the credential.

const inter = Inter({
  subsets: ['latin'],
  display: 'swap',
  weight: ['400', '500', '600', '700', '800'],
})

// swi-tch palette (see app/page.tsx + lib/design.ts).
const C = {
  cream: '#FAF9F5',
  paper: '#FFFFFF',
  navy: '#0B1C37',
  navyMute: '#1F3056',
  yellow: '#FECC01',
  teal: '#0E7C7B',
  ink: '#0B1C37',
  inkMute: '#5C6376',
  inkSoft: '#8A8F9E',
  border: '#E8E5DD',
  borderSoft: '#F0EEE6',
}

type SharedBrief = {
  company_name: string
  brief_content: string
  created_at: string
  view_count: number
}

async function siteOrigin(): Promise<string> {
  const h = await headers()
  const proto = h.get('x-forwarded-proto') || 'https'
  const host = h.get('x-forwarded-host') || h.get('host')
  if (host) return `${proto}://${host}`
  if (process.env.VERCEL_URL) return `https://${process.env.VERCEL_URL}`
  return 'http://localhost:3000'
}

async function fetchBrief(token: string): Promise<SharedBrief | null> {
  try {
    const origin = await siteOrigin()
    const r = await fetch(`${origin}/api/share/brief/${encodeURIComponent(token)}`, {
      cache: 'no-store',
    })
    if (!r.ok) return null
    return (await r.json()) as SharedBrief
  } catch {
    return null
  }
}

function timeAgo(iso: string): string {
  const ts = new Date(iso).getTime()
  if (Number.isNaN(ts)) return ''
  const diff = Math.max(0, Date.now() - ts)
  const m = Math.floor(diff / 60000)
  if (m < 1) return 'just now'
  if (m < 60) return `${m}m ago`
  const h = Math.floor(m / 60)
  if (h < 24) return `${h}h ago`
  const d = Math.floor(h / 24)
  if (d < 7) return `${d}d ago`
  return new Date(iso).toLocaleDateString()
}

export async function generateMetadata(
  { params }: { params: { token: string } }
): Promise<Metadata> {
  const brief = await fetchBrief(params.token)
  if (!brief) {
    return {
      title: 'Brief not found — swi-tch',
      description: 'This shared brief is no longer available.',
    }
  }
  const origin = await siteOrigin()
  const title = `${brief.company_name} — recruitment brief`
  const description = `A WMS recruitment brief on ${brief.company_name}, prepared by swi-tch.`
  const url = `${origin}/share/${params.token}`
  return {
    title,
    description,
    openGraph: {
      title,
      description,
      url,
      siteName: 'swi-tch',
      type: 'article',
    },
    twitter: {
      card: 'summary_large_image',
      title,
      description,
    },
    robots: { index: false, follow: false },
  }
}

export default async function SharedBriefPage(
  { params }: { params: { token: string } }
) {
  const brief = await fetchBrief(params.token)
  if (!brief) notFound()

  const html = renderMarkdown(brief.brief_content)
  const ago = timeAgo(brief.created_at)

  return (
    <div
      className={inter.className}
      style={{
        minHeight: '100vh',
        background: C.cream,
        color: C.ink,
        fontFamily: 'var(--font-inter), -apple-system, BlinkMacSystemFont, "Segoe UI", system-ui, sans-serif',
        WebkitFontSmoothing: 'antialiased',
      }}
    >
      {/* Header strip */}
      <header
        style={{
          background: C.navy,
          color: '#fff',
          borderBottom: `3px solid ${C.yellow}`,
        }}
      >
        <div
          className="share-header-inner"
          style={{
            maxWidth: 880,
            margin: '0 auto',
            padding: '14px 24px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: 12,
            flexWrap: 'wrap',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'baseline', gap: 8 }}>
            <span
              style={{
                fontWeight: 800,
                fontSize: 18,
                letterSpacing: '-0.01em',
                color: '#fff',
              }}
            >
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
          <div
            style={{
              fontSize: 11,
              color: 'rgba(255,255,255,0.7)',
              textAlign: 'right',
            }}
          >
            Brief shared by{' '}
            <span style={{ color: '#fff', fontWeight: 600 }}>david@swi-tch.com</span>
            {ago ? <span> · {ago}</span> : null}
          </div>
        </div>
      </header>

      {/* Main content */}
      <main
        className="share-main"
        style={{
          maxWidth: 880,
          margin: '0 auto',
          padding: '40px 24px 24px 24px',
        }}
      >
        <div
          style={{
            fontSize: 11,
            fontWeight: 700,
            letterSpacing: '0.14em',
            textTransform: 'uppercase',
            color: C.teal,
            marginBottom: 8,
          }}
        >
          Recruitment Brief
        </div>
        <h1
          style={{
            margin: 0,
            fontSize: 36,
            lineHeight: 1.15,
            letterSpacing: '-0.02em',
            color: C.navy,
            fontWeight: 800,
          }}
        >
          {brief.company_name}
        </h1>
        <div
          style={{
            marginTop: 6,
            fontSize: 12,
            color: C.inkSoft,
          }}
        >
          {brief.view_count} view{brief.view_count === 1 ? '' : 's'}
        </div>

        <div
          style={{
            marginTop: 24,
            background: C.paper,
            border: `1px solid ${C.border}`,
            borderRadius: 12,
            padding: '28px 32px',
            fontSize: 15,
            lineHeight: 1.65,
            color: C.ink,
            boxShadow: '0 1px 2px rgba(11,28,55,0.04)',
          }}
          className="share-brief-body"
          dangerouslySetInnerHTML={{ __html: html }}
        />

        <div
          style={{
            marginTop: 28,
            paddingTop: 18,
            borderTop: `1px solid ${C.border}`,
            fontSize: 12,
            color: C.inkMute,
            display: 'flex',
            justifyContent: 'space-between',
            gap: 12,
            flexWrap: 'wrap',
          }}
        >
          <div>
            Generated by{' '}
            <a
              href="https://swi-tch.com"
              target="_blank"
              rel="noopener noreferrer"
              style={{ color: C.teal, fontWeight: 600, textDecoration: 'none' }}
            >
              swi-tch.com
            </a>{' '}
            — WMS recruitment intelligence
          </div>
          <div style={{ color: C.inkSoft }}>
            Confidential · for the recipient only
          </div>
        </div>
      </main>

      <footer
        style={{
          maxWidth: 880,
          margin: '0 auto',
          padding: '16px 24px 40px 24px',
          fontSize: 11,
          color: C.inkSoft,
          textAlign: 'center',
        }}
      >
        This brief is confidential and intended for the recipient only.
      </footer>

      {/* Mobile tightening */}
      <style>{`
        @media (max-width: 640px) {
          .share-header-inner { padding: 12px 16px !important; }
          .share-main { padding: 24px 16px 16px 16px !important; }
          .share-main h1 { font-size: 26px !important; line-height: 1.2 !important; }
          .share-brief-body { padding: 18px 18px !important; font-size: 14px !important; }
        }
        .share-brief-body h1, .share-brief-body h2, .share-brief-body h3 {
          color: ${C.navy};
        }
        .share-brief-body a { color: ${C.teal} !important; }
      `}</style>
    </div>
  )
}
