import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

// LinkedIn post drafts: three distinct opinionated posts about a single news item.
// Pulls one news_updates row plus its company (with wms_entries) from Supabase
// and asks Claude (Haiku — cheap, strong on short copy) for three variants.
// NO web search — DB context only.
//
// Caching: drafts are persisted on news_updates.cached_linkedin_posts /
// cached_linkedin_at with a 7-day TTL. Pass ?refresh=1 to force regeneration.

const SEVEN_DAYS_MS = 7 * 24 * 60 * 60 * 1000
const HAIKU_MODEL = 'claude-haiku-4-5-20251001'
const SONNET_FALLBACK = 'claude-sonnet-4-6'

function isFresh(at: string | null | undefined): boolean {
  if (!at) return false
  const ts = new Date(at).getTime()
  if (Number.isNaN(ts)) return false
  return Date.now() - ts < SEVEN_DAYS_MS
}

export async function POST(req: NextRequest, { params }: { params: { newsId: string } }) {
  const url = new URL(req.url)
  const refresh = url.searchParams.get('refresh') === '1'
  return handle(params.newsId, { refresh })
}

export async function GET(req: NextRequest, { params }: { params: { newsId: string } }) {
  const url = new URL(req.url)
  const refresh = url.searchParams.get('refresh') === '1'
  return handle(params.newsId, { refresh })
}

async function handle(newsId: string, opts: { refresh: boolean }) {
  if (!newsId) {
    return NextResponse.json({ error: 'newsId required' }, { status: 400 })
  }

  const { data: news, error: newsErr } = await supabase
    .from('news_updates')
    .select('*')
    .eq('id', newsId)
    .single()

  if (newsErr || !news) {
    return NextResponse.json({ error: 'News item not found' }, { status: 404 })
  }

  // Smart context guard — refuse to draft thin posts.
  if (!news.summary && !news.proposed_wms_system) {
    return NextResponse.json({
      error: 'This news item is too thin to draft posts from — add a summary or proposed WMS first.',
    }, { status: 400 })
  }

  // Cache hit — return immediately unless refresh was requested.
  if (!opts.refresh && news.cached_linkedin_posts && isFresh(news.cached_linkedin_at)) {
    const cached = news.cached_linkedin_posts as any
    if (cached && cached.insightful && cached.conversational && cached.contrarian) {
      return NextResponse.json({
        posts: {
          insightful: String(cached.insightful),
          conversational: String(cached.conversational),
          contrarian: String(cached.contrarian),
        },
        cached: true,
        cached_at: news.cached_linkedin_at,
      })
    }
  }

  const { data: company } = await supabase
    .from('companies')
    .select('*, wms_entries(*)')
    .eq('id', news.company_id)
    .single()

  const wmsEntries = (company?.wms_entries || []) as any[]
  const wmsLines = wmsEntries.length
    ? wmsEntries.map((w: any) => {
        const parts = [w.wms_system, w.wms_vendor, w.wms_version].filter(Boolean).join(' / ')
        return `- ${parts || 'Unknown'}`
      }).join('\n')
    : '- Unknown / no WMS recorded'

  const date = news.published_at
    ? String(news.published_at).slice(0, 10)
    : (news.created_at ? String(news.created_at).slice(0, 10) : 'undated')

  const ctx = `Company: ${company?.name || 'Unknown'}
Industry: ${company?.industry || 'Unknown'}
Country: ${company?.country || 'Unknown'}
Current WMS:
${wmsLines}

News item (${date}):
Title: ${news.title || ''}
Signal type: ${news.signal_type || 'general'}
Impact: ${news.impact_level || 'Info'}
Summary: ${news.summary || '(none)'}
Proposed WMS change: ${news.proposed_wms_system || '(none)'}
Source: ${news.source || '(none)'}`

  const system = `You are writing LinkedIn posts for a WMS / supply-chain recruitment consultant at swi-tch. Generate THREE distinct posts about the news item below: (1) **Insightful** — a sharp industry observation, ~120 words, takes a confident position, no fluff. (2) **Conversational** — a story-led / question-led opener that invites comments, ~100 words, ends with a genuine question. (3) **Contrarian** — challenges a prevailing assumption in WMS / supply chain, ~120 words, polite but pointed. Each post must (a) reference the actual signal in the news, (b) demonstrate domain expertise, (c) avoid corporate jargon and emoji spam, (d) end with no more than one tasteful hashtag set (3–5 relevant tags).

CRITICAL OUTPUT FORMAT — read carefully:
Reply with ONLY a single JSON object and nothing else. No markdown fences. No commentary. No preamble like "Sure, here are three posts:" or "Here is the JSON:". No trailing notes. The very first character of your reply must be \`{\` and the very last character must be \`}\`. The object must contain exactly these three string keys: "insightful", "conversational", "contrarian". Each value is the full post body as a single string (newlines inside the string are fine).`

  const userPrompt = `Draft three LinkedIn posts for the following news item. Use only the context below — do not speculate beyond it.

${ctx}`

  // Try Haiku first; fall back to Sonnet if Haiku's JSON refuses to parse,
  // or if Haiku returns an object that's missing one of the three keys.
  let posts: any = null
  try {
    posts = await tryGenerate(HAIKU_MODEL, system, userPrompt)
    if (!posts) {
      posts = await tryGenerate(SONNET_FALLBACK, system, userPrompt)
    }
  } catch (err: any) {
    return NextResponse.json({ error: err?.message ?? 'Anthropic API error' }, { status: 502 })
  }

  if (!posts) {
    return NextResponse.json({ error: 'Could not parse AI response into three posts' }, { status: 500 })
  }

  const result = {
    insightful: String(posts.insightful),
    conversational: String(posts.conversational),
    contrarian: String(posts.contrarian),
  }

  const cachedAt = new Date().toISOString()
  try {
    await supabase
      .from('news_updates')
      .update({ cached_linkedin_posts: result, cached_linkedin_at: cachedAt })
      .eq('id', newsId)
  } catch {
    // swallow — caller still gets the posts
  }

  return NextResponse.json({ posts: result, cached: false, cached_at: cachedAt })
}

// Walk the string and return the first balanced {...} substring.
// Handles strings (incl. escaped quotes) so braces inside string literals
// don't fool the depth counter. Returns null if no balanced object is found.
function extractFirstBalancedObject(s: string): string | null {
  const start = s.indexOf('{')
  if (start === -1) return null
  let depth = 0
  let inStr = false
  let strCh = ''
  let escape = false
  for (let i = start; i < s.length; i++) {
    const ch = s[i]
    if (inStr) {
      if (escape) { escape = false; continue }
      if (ch === '\\') { escape = true; continue }
      if (ch === strCh) { inStr = false }
      continue
    }
    if (ch === '"' || ch === "'") { inStr = true; strCh = ch; continue }
    if (ch === '{') depth++
    else if (ch === '}') {
      depth--
      if (depth === 0) return s.slice(start, i + 1)
    }
  }
  return null
}

function hasAllThreeKeys(obj: any): boolean {
  if (!obj || typeof obj !== 'object') return false
  return (
    typeof obj.insightful === 'string' && obj.insightful.length > 0 &&
    typeof obj.conversational === 'string' && obj.conversational.length > 0 &&
    typeof obj.contrarian === 'string' && obj.contrarian.length > 0
  )
}

async function tryGenerate(model: string, system: string, userPrompt: string): Promise<any | null> {
  try {
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': process.env.ANTHROPIC_API_KEY || '',
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model,
        max_tokens: 2000,
        system,
        messages: [{ role: 'user', content: userPrompt }],
      }),
    })

    const data = await response.json()

    if (!response.ok || data?.error) {
      throw Object.assign(new Error(data?.error?.message ?? 'Anthropic API error'), { __anthropicApi: true })
    }

    let raw = ''
    if (Array.isArray(data.content)) {
      for (const block of data.content) {
        if (block.type === 'text') raw += block.text
      }
    }

    if (!raw) return null

    // (a) Strip markdown fences (```json ... ``` or ``` ... ```) if present.
    let cleaned = raw.trim()
    cleaned = cleaned.replace(/^```(?:json|JSON)?\s*\n?/i, '').replace(/\n?\s*```\s*$/i, '').trim()

    let parsed: any = null

    // First attempt: parse the whole cleaned body.
    try {
      parsed = JSON.parse(cleaned)
    } catch {
      // (b) Bracket-counting walker — find the first balanced {...} inside the
      // body. This is robust to leading preamble like "Sure, here are three..."
      // and to JSON containing braces inside string literals.
      const obj = extractFirstBalancedObject(cleaned)
      if (obj) {
        try { parsed = JSON.parse(obj) } catch { parsed = null }
      }
    }

    // (c) Validate that all three required keys are present and non-empty.
    // If anything is missing, return null so the caller can fall back to Sonnet.
    if (!hasAllThreeKeys(parsed)) return null
    return parsed
  } catch (e: any) {
    if (e?.__anthropicApi) throw e
    return null
  }
}
