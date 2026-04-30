import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { VENDORS } from '@/lib/learn/vendors'
import { SECTORS } from '@/lib/learn/sectors'

// Learn tab "Ask Anything" route. Cookie-gated by middleware.
// POST { question: string } -> { answer: string, cached: boolean }
//
// Behaviour:
// 1. Normalize the question (lowercase, trim, collapse whitespace).
// 2. Look it up in learn_qa_cache. If hit, bump view_count + last_viewed_at and return.
// 3. Otherwise call Claude Haiku (no web search), persist the result, return it.

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL as string,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY as string
)

function normalize(q: string): string {
  return q.toLowerCase().trim().replace(/\s+/g, ' ')
}

const VENDOR_LIST = VENDORS.map(v => v.name).join(', ')
const SECTOR_LIST = SECTORS.map(s => s.name).join(', ')

const SYSTEM_PROMPT =
  'You are a knowledgeable WMS-market reference assistant for swi-tch, a recruitment consultancy. ' +
  'Answer questions about warehouse management systems, supply chain technology, and sector dynamics, ' +
  'using factual information that is publicly available. Be specific, concise (200-400 words), use ' +
  'markdown formatting (bold, lists, headings). Decline politely if asked to compare candidates by name ' +
  'or pass judgment on individuals; redirect to facts about the systems and skills involved. ' +
  'The available vendors in this app\'s data: ' + VENDOR_LIST + '. ' +
  'The available sectors: ' + SECTOR_LIST + '.'

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}))
    const raw = typeof body?.question === 'string' ? body.question : ''
    if (!raw.trim()) {
      return NextResponse.json({ error: 'question required' }, { status: 400 })
    }
    if (raw.length > 2000) {
      return NextResponse.json({ error: 'question too long' }, { status: 400 })
    }

    const norm = normalize(raw)

    // Cache lookup
    const { data: hit } = await supabase
      .from('learn_qa_cache')
      .select('id, answer, view_count')
      .eq('question_normalized', norm)
      .maybeSingle()

    if (hit?.answer) {
      // Bump usage; not awaited critically.
      await supabase
        .from('learn_qa_cache')
        .update({
          view_count: (hit.view_count ?? 0) + 1,
          last_viewed_at: new Date().toISOString(),
        })
        .eq('id', hit.id)
      return NextResponse.json({ answer: hit.answer, cached: true })
    }

    // Generate via Haiku
    const apiKey = process.env.ANTHROPIC_API_KEY
    if (!apiKey) {
      return NextResponse.json({ error: 'ANTHROPIC_API_KEY missing' }, { status: 500 })
    }

    const upstream = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: 'claude-haiku-4-5-20251001',
        max_tokens: 1500,
        system: SYSTEM_PROMPT,
        messages: [{ role: 'user', content: raw }],
      }),
    })

    if (!upstream.ok) {
      const text = await upstream.text().catch(() => '')
      return NextResponse.json(
        { error: 'upstream', status: upstream.status, detail: text.slice(0, 500) },
        { status: 502 }
      )
    }

    const data: any = await upstream.json()
    const answer: string = (data?.content || [])
      .filter((b: any) => b?.type === 'text')
      .map((b: any) => b.text)
      .join('\n')
      .trim()

    if (!answer) {
      return NextResponse.json({ error: 'empty answer' }, { status: 502 })
    }

    // Persist (best-effort; ignore conflicts from concurrent writes)
    await supabase
      .from('learn_qa_cache')
      .insert({
        question_normalized: norm,
        question_original: raw,
        answer,
      })

    return NextResponse.json({ answer, cached: false })
  } catch (err: any) {
    return NextResponse.json({ error: 'route_error', detail: String(err?.message || err) }, { status: 500 })
  }
}
