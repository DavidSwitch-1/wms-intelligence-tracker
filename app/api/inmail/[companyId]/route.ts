import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

// LinkedIn InMail drafter — one personalised cold message a recruiter at swi-tch
// can send to a hiring manager at the target company. Pulls the company plus its
// last 10 news_updates from Supabase and asks Claude (Haiku — cheap, strong on
// short copy) for a single 100–130 word message. NO web search — DB context only.
//
// Caching: messages are persisted on companies.cached_inmail / cached_inmail_at
// with a 7-day TTL. Pass ?refresh=1 to force regeneration.

const SEVEN_DAYS_MS = 7 * 24 * 60 * 60 * 1000
const HAIKU_MODEL = 'claude-haiku-4-5-20251001'

function isFresh(at: string | null | undefined): boolean {
  if (!at) return false
  const ts = new Date(at).getTime()
  if (Number.isNaN(ts)) return false
  return Date.now() - ts < SEVEN_DAYS_MS
}

export async function POST(req: NextRequest, { params }: { params: { companyId: string } }) {
  const url = new URL(req.url)
  const refresh = url.searchParams.get('refresh') === '1'
  return generate(params.companyId, { refresh })
}

export async function GET(req: NextRequest, { params }: { params: { companyId: string } }) {
  const url = new URL(req.url)
  const refresh = url.searchParams.get('refresh') === '1'
  // GET never auto-generates. ?refresh=1 on GET still only reads cache —
  // generation must go through POST so paid calls are explicit. This mirrors
  // /api/brief.
  if (refresh) {
    return generate(params.companyId, { refresh: true })
  }
  return readCache(params.companyId)
}

async function readCache(companyId: string) {
  if (!companyId) {
    return NextResponse.json({ error: 'companyId required' }, { status: 400 })
  }
  const { data, error } = await supabase
    .from('companies')
    .select('cached_inmail, cached_inmail_at')
    .eq('id', companyId)
    .single()

  if (error || !data) {
    return NextResponse.json({ error: 'Company not found' }, { status: 404 })
  }
  if (data.cached_inmail && isFresh(data.cached_inmail_at)) {
    return NextResponse.json({
      message: data.cached_inmail,
      cached: true,
      cached_at: data.cached_inmail_at,
    })
  }
  return NextResponse.json({ message: null, cached: false })
}

async function generate(companyId: string, opts: { refresh: boolean }) {
  if (!companyId) {
    return NextResponse.json({ error: 'companyId required' }, { status: 400 })
  }

  const { data: company, error: companyErr } = await supabase
    .from('companies')
    .select('*, wms_entries(*)')
    .eq('id', companyId)
    .single()

  if (companyErr || !company) {
    return NextResponse.json({ error: 'Company not found' }, { status: 404 })
  }

  // Cache hit — return immediately unless refresh was requested.
  if (!opts.refresh && company.cached_inmail && isFresh(company.cached_inmail_at)) {
    return NextResponse.json({
      message: company.cached_inmail,
      cached: true,
      cached_at: company.cached_inmail_at,
    })
  }

  const { data: newsRows } = await supabase
    .from('news_updates')
    .select('*')
    .eq('company_id', companyId)
    .order('published_at', { ascending: false, nullsFirst: false })
    .limit(10)

  const news = newsRows || []

  // Build a compact, structured context block for Claude. Same shape as the
  // brief route so the prompts can evolve in parallel.
  const wmsEntries = (company.wms_entries || []) as any[]
  const wmsLines = wmsEntries.length
    ? wmsEntries.map((w: any) => {
        const parts = [w.wms_system, w.wms_vendor, w.wms_version].filter(Boolean).join(' / ')
        const since = w.install_date ? ` (since ${w.install_date})` : ''
        return `- ${parts || 'Unknown'}${since}`
      }).join('\n')
    : '- Unknown / no WMS recorded'

  const newsLines = news.length
    ? news.map((n: any) => {
        const date = n.published_at ? String(n.published_at).slice(0, 10) : (n.created_at ? String(n.created_at).slice(0, 10) : 'undated')
        const sig = n.signal_type ? ` [${n.signal_type}]` : ''
        const summary = n.summary ? ` — ${String(n.summary).slice(0, 280)}` : ''
        return `- ${date}${sig} ${n.title || 'Untitled'}${summary}`
      }).join('\n')
    : '- No recent news on file'

  const ctx = `COMPANY
Name: ${company.name}
Industry: ${company.industry || 'Unknown'}
Country: ${company.country || 'Unknown'}
Region: ${company.region || ''}

CURRENT WMS STACK
${wmsLines}

LAST RESEARCHED: ${company.last_researched_at || 'never'}

RECENT NEWS / SIGNALS (most recent first, up to 10)
${newsLines}`

  const system = `You are writing a LinkedIn InMail for a WMS / supply-chain recruiter at swi-tch reaching out to a hiring manager at the company below. Write ONE message of 100-130 words. Reference (a) something specific from their recent signals (hiring activity, WMS change, expansion), (b) a relevant insight about their current WMS stack, and (c) a soft CTA to chat for 15 min about their hiring plans. Conversational tone, not corporate. No emoji. No "I hope this finds you well". Sign off as just "David". Reply with ONLY the message text — no subject line, no preamble, no markdown.`

  const userPrompt = `Draft the InMail for the following company. Use only the context below — do not speculate beyond it.

${ctx}`

  const response = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': process.env.ANTHROPIC_API_KEY || '',
      'anthropic-version': '2023-06-01',
    },
    body: JSON.stringify({
      model: HAIKU_MODEL,
      max_tokens: 600,
      system,
      messages: [{ role: 'user', content: userPrompt }],
    }),
  })

  const data = await response.json()

  let message = ''
  if (Array.isArray(data.content)) {
    for (const block of data.content) {
      if (block.type === 'text') message += block.text
    }
  }

  message = message.trim()

  if (!message) {
    if (data.error) {
      return NextResponse.json({ error: data.error.message || 'AI error' }, { status: 500 })
    }
    return NextResponse.json({ error: 'No message produced (stop_reason: ' + (data.stop_reason || 'unknown') + ')' }, { status: 500 })
  }

  // Persist the freshly-generated message — best effort, don't fail the request
  // if the cache write hits a transient error.
  const cachedAt = new Date().toISOString()
  try {
    await supabase
      .from('companies')
      .update({ cached_inmail: message, cached_inmail_at: cachedAt })
      .eq('id', companyId)
  } catch {
    // swallow — the user still gets the generated message
  }

  return NextResponse.json({ message, cached: false, cached_at: cachedAt })
}
