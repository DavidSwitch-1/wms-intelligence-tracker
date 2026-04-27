import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

// LinkedIn post drafts: three distinct opinionated posts about a single news item.
// Pulls one news_updates row plus its company (with wms_entries) from Supabase
// and asks Claude for an insightful, conversational, and contrarian variant.
// NO web search — DB context only.

export async function POST(req: NextRequest, { params }: { params: { newsId: string } }) {
  return handle(params.newsId)
}

export async function GET(_req: NextRequest, { params }: { params: { newsId: string } }) {
  return handle(params.newsId)
}

async function handle(newsId: string) {
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

  const system = `You are writing LinkedIn posts for a WMS / supply-chain recruitment consultant at swi-tch. Generate THREE distinct posts about the news item below: (1) **Insightful** — a sharp industry observation, ~120 words, takes a confident position, no fluff. (2) **Conversational** — a story-led / question-led opener that invites comments, ~100 words, ends with a genuine question. (3) **Contrarian** — challenges a prevailing assumption in WMS / supply chain, ~120 words, polite but pointed. Each post must (a) reference the actual signal in the news, (b) demonstrate domain expertise, (c) avoid corporate jargon and emoji spam, (d) end with no more than one tasteful hashtag set (3–5 relevant tags). Format your reply as JSON: \`{"insightful":"...","conversational":"...","contrarian":"..."}\` — nothing else, no markdown fences.`

  const userPrompt = `Draft three LinkedIn posts for the following news item. Use only the context below — do not speculate beyond it.

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
      max_tokens: 2000,
      system,
      messages: [{ role: 'user', content: userPrompt }],
    }),
  })

  const data = await response.json()

  let raw = ''
  if (Array.isArray(data.content)) {
    for (const block of data.content) {
      if (block.type === 'text') raw += block.text
    }
  }

  if (!raw) {
    if (data.error) {
      return NextResponse.json({ error: data.error.message || 'AI error' }, { status: 500 })
    }
    return NextResponse.json({ error: 'Empty response from AI' }, { status: 500 })
  }

  // Strip markdown fences if Claude wrapped the JSON despite instructions.
  let cleaned = raw.trim()
  cleaned = cleaned.replace(/^```(?:json)?\s*/i, '').replace(/\s*```\s*$/, '').trim()

  // Robust JSON parse — fall back to extracting the first {...} block.
  let posts: any = null
  try {
    posts = JSON.parse(cleaned)
  } catch {
    const match = cleaned.match(/\{[\s\S]*\}/)
    if (match) {
      try { posts = JSON.parse(match[0]) } catch {}
    }
  }

  if (!posts || typeof posts !== 'object' || !posts.insightful || !posts.conversational || !posts.contrarian) {
    return NextResponse.json({ error: 'Could not parse AI response into three posts' }, { status: 500 })
  }

  return NextResponse.json({
    posts: {
      insightful: String(posts.insightful),
      conversational: String(posts.conversational),
      contrarian: String(posts.contrarian),
    },
  })
}
