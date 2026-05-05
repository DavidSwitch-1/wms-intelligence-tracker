import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { headers } from 'next/headers'
import { Inter, Source_Serif_4 } from 'next/font/google'
import { renderMarkdown } from '@/lib/markdown'

// Public share page for a brief.
// No login. The /share/[token] route is gated by token only.

const C = {
  cream: '#FAF9F5',
  paper: '#FFFFFF',
  navy: '#0B1C37',
  navyMute: '#1F3056',
  yellow: '#FECC01',
  yellowSoft: '#FFF5C2',
  teal: '#0E7C7B',
  ink: '#0B1C37',
  inkMute: '#5C6376',
  inkSoft: '#8A8F9E',
  border: '#E8E5DD',
  borderSoft: '#F0EEE6',
  ruler: 'rgba(254,204,1,0.55)',
}

const inter = Inter({
  subsets: ['latin'],
  variable: '--font-inter',
  display: 'swap',
})
const serif = Source_Serif_4({
  subsets: ['latin'],
  variable: '--font-serif',
  weight: ['400','500','600','700'],
  display: 'swap',
})

type SharedBrief = {
  company_name: string
  brief_content: string
  created_at: string
}

async function siteOrigin(): Promise<string> {
  const h = await headers()
  const proto = h.get('x-forwarded-proto') || 'https'
  const host = h.get('host')
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
  const ms = Date.now() - new Date(iso).getTime()
  const m = Math.floor(ms / 60000)
  if (m < 1) return 'just now'
  if (m < 60) return `${m}m ago`
  const h = Math.floor(m / 60)
  if (h < 24) return `${h}h ago`
  const d = Math.floor(h / 24)
  if (d < 7) return `${d}d ago`
  return new Date(iso).toLocaleDateString()
}

export async function generateMetadata(
  { params }: { params: Promise<{ token: string }> }
): Promise<Metadata> {
  const { token } = await params
  const brief = await fetchBrief(token)
  if (!brief) return { title: 'Brief not found · swi·tch' }
  const origin = await siteOrigin()
  const title = `${brief.company_name} — WMS intelligence brief`
  const description = `A focused WMS intelligence brief on ${brief.company_name}, prepared by swi·tch.`
  const url = `${origin}/share/${token}`
  return {
    title,
    description,
    openGraph: { title, description, url, siteName: 'swi·tch', type: 'article' },
    twitter: { card: 'summary_large_image', title, description },
  }
}

export default async function SharedBriefPage(
  { params }: { params: Promise<{ token: string }> }
) {
  const { token } = await params
  const brief = await fetchBrief(token)
  if (!brief) notFound()

  return (
    <div
      className={`${inter.variable} ${serif.variable}`}
      style={{
        minHeight: '100vh',
        background: C.cream,
        fontFamily: 'var(--font-inter), -apple-system, BlinkMacSystemFont, "Segoe UI", system-ui, sans-serif',
        WebkitFontSmoothing: 'antialiased',
        MozOsxFontSmoothing: 'grayscale',
      }}
    >
      {/* Top mark */}
      <header
        style={{
          padding: '40px 24px 0',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: 6,
        }}
      >
        <div
          style={{
            fontSize: 22,
            fontWeight: 700,
            letterSpacing: '-0.01em',
            color: C.navy,
          }}
        >
          swi
          <span style={{ color: C.yellow }}>·</span>
          tch
        </div>
        <div
          style={{
            fontSize: 10,
            fontWeight: 600,
            letterSpacing: '0.18em',
            color: C.inkSoft,
            textTransform: 'uppercase',
          }}
        >
          WMS · INTELLIGENCE
        </div>
      </header>

      {/* Hero — company name with signature yellow underline */}
      <section
        style={{
          maxWidth: 880,
          margin: '32px auto 0',
          padding: '0 24px',
          textAlign: 'center',
        }}
      >
        <h1
          style={{
            margin: 0,
            fontSize: 'clamp(28px, 4vw, 36px)',
            fontWeight: 800,
            letterSpacing: '-0.02em',
            color: C.navy,
            lineHeight: 1.15,
          }}
        >
          {brief.company_name}
        </h1>
        <div
          aria-hidden
          style={{
            margin: '14px auto 0',
            width: 64,
            height: 4,
            borderRadius: 2,
            background: C.yellow,
          }}
        />
        <div
          style={{
            marginTop: 18,
            fontSize: 11,
            fontWeight: 600,
            letterSpacing: '0.16em',
            color: C.inkSoft,
            textTransform: 'uppercase',
          }}
        >
          Brief · prepared {timeAgo(brief.created_at)}
        </div>
      </section>

      {/* Body */}
      <main
        className="share-main"
        style={{
          maxWidth: 760,
          margin: '0 auto',
          padding: '40px 24px 24px 24px',
        }}
      >
        <article
          className="share-prose"
          style={{
            marginTop: 24,
            background: C.paper,
            border: `1px solid ${C.border}`,
            borderRadius: 14,
            padding: 'clamp(24px, 4vw, 44px)',
            fontFamily: 'var(--font-serif), Charter, "Source Serif 4", "Iowan Old Style", Georgia, serif',
            fontSize: 16,
            lineHeight: 1.75,
            color: C.ink,
            boxShadow: '0 1px 2px rgba(11,28,55,0.04), 0 12px 32px rgba(11,28,55,0.06)',
          }}
        >
          <style
            dangerouslySetInnerHTML={{
              __html: `
              .share-prose h1, .share-prose h2, .share-prose h3 {
                font-family: var(--font-inter), system-ui, sans-serif;
                color: ${C.navy};
                letter-spacing: -0.01em;
              }
              .share-prose h2 {
                font-size: 11px;
                font-weight: 700;
                letter-spacing: 0.12em;
                text-transform: uppercase;
                color: ${C.inkMute};
                margin: 28px 0 8px;
                padding-bottom: 6px;
                border-bottom: 1px solid ${C.borderSoft};
              }
              .share-prose h3 {
                font-size: 17px;
                font-weight: 700;
                margin: 22px 0 8px;
              }
              .share-prose p { margin: 0 0 14px; }
              .share-prose ul, .share-prose ol { padding-left: 22px; margin: 0 0 14px; }
              .share-prose li { margin-bottom: 6px; }
              .share-prose strong { color: ${C.navy}; font-weight: 600; }
              .share-prose a { color: ${C.teal}; text-decoration: none; border-bottom: 1px solid rgba(14,124,123,0.3); }
              .share-prose a:hover { border-bottom-color: ${C.teal}; }
              .share-prose blockquote {
                margin: 14px 0;
                padding: 8px 14px;
                border-left: 3px solid ${C.yellow};
                background: ${C.yellowSoft};
                border-radius: 0 8px 8px 0;
                color: ${C.ink};
              }
              .share-prose code {
                background: ${C.borderSoft};
                padding: 1px 5px;
                border-radius: 4px;
                font-family: ui-monospace, SFMono-Regular, Menlo, Consolas, monospace;
                font-size: 0.92em;
                color: ${C.navy};
              }
              `,
            }}
          />
          <div dangerouslySetInnerHTML={{ __html: renderMarkdown(brief.brief_content) }} />
        </article>
      </main>

      {/* Footer */}
      <footer
        style={{
          maxWidth: 760,
          margin: '0 auto',
          padding: '8px 24px 56px',
        }}
      >
        <div
          aria-hidden
          style={{
            height: 1,
            background: `linear-gradient(90deg, transparent 0%, ${C.ruler} 50%, transparent 100%)`,
            margin: '0 0 24px',
          }}
        />
        <div
          style={{
            fontSize: 10,
            fontWeight: 600,
            letterSpacing: '0.18em',
            textTransform: 'uppercase',
            color: C.inkSoft,
            textAlign: 'center',
            display: 'flex',
            flexDirection: 'column',
            gap: 6,
          }}
        >
          <div>
            Generated by{' '}
            <a
              href="https://swi-tch.com"
              style={{ color: C.navy, textDecoration: 'none' }}
            >
              swi
              <span style={{ color: C.yellow }}>·</span>
              tch.com
            </a>{' '}
            — WMS recruitment intelligence
          </div>
          <div style={{ color: C.inkSoft, letterSpacing: '0.14em' }}>
            Confidential · for the recipient only
          </div>
        </div>
      </footer>
    </div>
  )
}
