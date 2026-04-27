import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

// Pre-pitch brief: a one-page sales hook tailored to a WMS recruiter.
// Pulls a single company + last 10 news_updates from Supabase and asks
// Claude to compose a tight markdown brief. NO web search — DB context only.

export async function POST(req: NextRequest, { params }: { params: { companyId: string } }) {
  return handle(params.companyId)
}

export async function GET(_req: NextRequest, { params }: { params: { companyId: string } }) {
  return handle(params.companyId)
}

async function handle(companyId: string) {
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

  const { data: newsRows } = await supabase
    .from('news_updates')
    .select('*')
    .eq('company_id', companyId)
    .order('published_at', { ascending: false, nullsFirst: false })
    .limit(10)

  const news = newsRows || []

  // Build a compact, structured context block for Claude
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

  const system = `You are a writing assistant for a UK supply chain recruitment consultancy that places WMS (Warehouse Management System) talent — implementation consultants, solution architects, project managers, and developers across vendors like Manhattan, Blue Yonder, Korber, SAP EWM, Infor, Microlistics, Reply, Mantis, Softeon, Synapse, etc.

Your job: produce a tight one-page pre-pitch brief the recruiter will read seconds before contacting the target company. Tone: crisp, professional, peer-to-peer. No fluff. No "I hope this finds you well". No emojis. No filler. UK English.

Output strictly in markdown with these exact section headers and order:

**Snapshot** — one line: who they are, size cue, sector.
**Current WMS stack** — one or two lines: vendor / product / version / install date if known. Say "Unknown" plainly if it is.
**Recent signals** — bullet list pulled from the news provided, each with a date in (YYYY-MM-DD). 3–5 bullets max. If there's nothing useful, say "No recent public signals."
**Why now** — 1–2 sentences: the recruiter's hook, what's changing for them.
**Talking points** — exactly 3 short bullets, recruiter-angle: who they might need to hire, bench strength to mention, vendor expertise that matters.
**Opening line** — one sentence the recruiter can drop into a LinkedIn DM or cold email. Direct, specific, references something concrete from the brief. Under 30 words.

Total output ~250 words. Do not invent facts that aren't in the context. If something is unknown, say so.`

  const userPrompt = `Write the pre-pitch brief for the following company. Use only the context below — do not speculate beyond it.

${ctx}`

  const response = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': process.env.ANTHROPIC_API_KEY || '',
      'anthropic-version': '2023-06-01',
    },
    body: JSON.stringify({
      model: 'claude-sonnet-4-6',
      max_tokens: 1500,
      system,
      messages: [{ role: 'user', content: userPrompt }],
    }),
  })

  const data = await response.json()

  let brief = ''
  if (Array.isArray(data.content)) {
    for (const block of data.content) {
      if (block.type === 'text') brief += block.text
    }
  }

  if (!brief) {
    if (data.error) {
      return NextResponse.json({ error: data.error.message || 'AI error' }, { status: 500 })
    }
    return NextResponse.json({ error: 'No brief produced (stop_reason: ' + (data.stop_reason || 'unknown') + ')' }, { status: 500 })
  }

  return NextResponse.json({ brief })
}
