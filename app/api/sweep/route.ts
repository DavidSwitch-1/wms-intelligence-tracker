import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

const SEVEN_DAYS_MS = 7 * 24 * 60 * 60 * 1000
const HAIKU_MODEL = 'claude-haiku-4-5-20251001'
const SONNET_MODEL = 'claude-sonnet-4-6'

function isFresh(at: string | null | undefined): boolean {
  if (!at) return false
  const ts = new Date(at).getTime()
  if (Number.isNaN(ts)) return false
  return Date.now() - ts < SEVEN_DAYS_MS
}

function isStale(publishedAt: string | null | undefined): boolean {
  if (!publishedAt) return false;
  const d = new Date(publishedAt);
  if (isNaN(d.getTime())) return false;
  const cutoff = new Date();
  cutoff.setMonth(cutoff.getMonth() - 18);
  return d < cutoff;
}


// Research a single company for both WMS identity AND recent news/upgrades
async function researchOne(company: any) {
  const isUnknown = company.wms_entries?.some((w: any) => w.wms_system === 'Unknown')
  const knownWMS = company.wms_entries?.filter((w: any) => w.wms_system !== 'Unknown')
    .map((w: any) => w.wms_system).join(', ')

  const prompt = isUnknown
    ? `What WMS (Warehouse Management System) does ${company.name} use? They are a ${company.industry || ''} company in ${company.country || ''}. Search for press releases, case studies, and job postings mentioning their WMS. Also flag any hiring activity (WMS implementation/admin/supervisor job posts), new DC openings, or M&A.\n\nIMPORTANT — recency rule: Only return news, signals, or events that have been published within the last 12 months. Do NOT include articles, hiring posts, or announcements older than 12 months even if they are relevant. For each news item you return, include a \`published_at\` field as an ISO 8601 date string (e.g. "2025-09-14") representing when the article was originally published. If you cannot determine the published date, set \`published_at\` to null rather than guessing.`
    : `Search for recent news about ${company.name}'s warehouse or supply chain technology. They currently use ${knownWMS}. Look for: WMS upgrades, new warehouse openings, system migrations, technology partnerships, distribution centre announcements, executive hires in ops/IT/supply chain, or active WMS-related job postings in the last 12 months. These are all strong signals for a recruitment firm.\n\nIMPORTANT — recency rule: Only return news, signals, or events that have been published within the last 12 months. Do NOT include articles, hiring posts, or announcements older than 12 months even if they are relevant. For each news item you return, include a \`published_at\` field as an ISO 8601 date string (e.g. "2025-09-14") representing when the article was originally published. If you cannot determine the published date, set \`published_at\` to null rather than guessing.`

  const systemPrompt = isUnknown
    ? `You are a WMS intelligence researcher. Find what WMS a company uses. Background: Red Prairie = Blue Yonder Dispatcher, JDA Discrete = Blue Yonder WMS, Manhattan PKMS/WMOS/WMi are legacy. Also note any 3PL provider (e.g. Unipart, GXO, DHL Supply Chain, Wincanton, Gist, Clipper, Yusen, Kuehne+Nagel, XPO, Bleckmann, Geodis) the company outsources warehousing to, and flag if the company itself IS a 3PL operator (runs warehouses for other brands as primary business). Respond ONLY with JSON:
{"found":true/false,"wms_system":"name or null","vendor":"vendor or null","version":"version or null","confidence":"High/Medium/Low","summary":"one sentence finding","source":"URL or source description","news_title":"short headline or null","news_summary":"brief news summary or null","signal_type":"dc_opening|wms_migration|hiring|ma|growth|exec_hire|none","third_party_logistics":"3PL provider name (e.g. Unipart) or null","is_3pl":true/false,"published_at": string | null}`
    : `You are a supply chain intelligence researcher. Find recent news about a company's warehouse or WMS activity. Also note any 3PL provider (e.g. Unipart, GXO, DHL Supply Chain, Wincanton, Gist, Clipper, Yusen, Kuehne+Nagel, XPO, Bleckmann, Geodis) the company outsources warehousing to, and flag if the company itself IS a 3PL operator. Respond ONLY with JSON:
{"found":true/false,"news_title":"short punchy headline or null","news_summary":"2-3 sentence summary of what you found or null","source":"URL or source description","impact":"High/Medium/Low/Info","wms_change":true/false,"wms_system":"new system if changing, else null","vendor":"new vendor if changing, else null","version":"new version if changing, else null","confidence":"High/Medium/Low","signal_type":"dc_opening|wms_migration|hiring|ma|growth|exec_hire|none","third_party_logistics":"3PL provider name (e.g. Unipart) or null","is_3pl":true/false,"published_at": string | null}`

  try {
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': process.env.ANTHROPIC_API_KEY!,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: SONNET_MODEL,
        max_tokens: 600,
        tools: [{ type: 'web_search_20250305', name: 'web_search', max_uses: 2 }],
        system: systemPrompt,
        messages: [{ role: 'user', content: prompt }]
      })
    })

    const data = await response.json()
    let text = ''
    if (Array.isArray(data.content)) {
      for (const block of data.content) {
        if (block.type === 'text') text += block.text
      }
    }

    const match = text.match(/\{[\s\S]*\}/)
    if (!match) return null
    return JSON.parse(match[0])
  } catch {
    return null
  }
}

// ---- Pre-generation helpers (cache writes for brief + LinkedIn drafts) ----

async function generateBriefFor(companyId: string): Promise<boolean> {
  try {
    const { data: company } = await supabase
      .from('companies')
      .select('*, wms_entries(*)')
      .eq('id', companyId)
      .single()
    if (!company) return false

    if (company.cached_brief && isFresh(company.cached_brief_at)) return false

    const { data: newsRows } = await supabase
      .from('news_updates')
      .select('*')
      .eq('company_id', companyId)
      .order('published_at', { ascending: false, nullsFirst: false })
      .limit(10)
    const news = newsRows || []

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

    const system = `You are a writing assistant for a UK supply chain recruitment consultancy that places WMS (Warehouse Management System) talent.

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
        model: SONNET_MODEL,
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
    if (!brief) return false

    await supabase
      .from('companies')
      .update({ cached_brief: brief, cached_brief_at: new Date().toISOString() })
      .eq('id', companyId)
    return true
  } catch {
    return false
  }
}

async function generateLinkedInFor(newsId: string): Promise<boolean> {
  try {
    const { data: news } = await supabase
      .from('news_updates')
      .select('*')
      .eq('id', newsId)
      .single()
    if (!news) return false
    if (!news.summary && !news.proposed_wms_system) return false
    if (news.cached_linkedin_posts && isFresh(news.cached_linkedin_at)) return false

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

    const tryModel = async (model: string) => {
      const r = await fetch('https://api.anthropic.com/v1/messages', {
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
      const d = await r.json()
      let raw = ''
      if (Array.isArray(d.content)) {
        for (const b of d.content) {
          if (b.type === 'text') raw += b.text
        }
      }
      if (!raw) return null
      let cleaned = raw.trim().replace(/^```(?:json)?\s*/i, '').replace(/\s*```\s*$/, '').trim()
      let parsed: any = null
      try { parsed = JSON.parse(cleaned) } catch {
        const m = cleaned.match(/\{[\s\S]*\}/)
        if (m) { try { parsed = JSON.parse(m[0]) } catch {} }
      }
      if (!parsed || !parsed.insightful || !parsed.conversational || !parsed.contrarian) return null
      return parsed
    }

    let posts = await tryModel(HAIKU_MODEL)
    if (!posts) posts = await tryModel(SONNET_MODEL)
    if (!posts) return false

    await supabase
      .from('news_updates')
      .update({
        cached_linkedin_posts: {
          insightful: String(posts.insightful),
          conversational: String(posts.conversational),
          contrarian: String(posts.contrarian),
        },
        cached_linkedin_at: new Date().toISOString(),
      })
      .eq('id', newsId)
    return true
  } catch {
    return false
  }
}

// ---- Main sweep ----

export async function POST(req: NextRequest) {
  const { count = 20, mode = 'visit', targetId = null } = await req.json()

  const { data: companies } = await supabase
    .from('companies')
    .select('*, wms_entries(*), news_updates(id, created_at, title)')
    .order('name')

  if (!companies) return NextResponse.json({ processed: 0 })

  let scored
  if (targetId) {
    // Manual single-company research
    scored = companies.filter(c => c.id === targetId)
  } else {
    // Score companies: unknowns first, then no news, then random shuffle
    scored = companies
      .map(c => ({
        ...c,
        score: (c.wms_entries?.some((w: any) => w.wms_system === 'Unknown') ? 1000 : 0) +
        (c.wms_entries?.some((w: any) => w.status === 'Needs Verification') ? 600 : 0) +
               (c.news_updates?.length === 0 ? 500 : 0) +
               Math.random() * 10
      }))
      .sort((a, b) => b.score - a.score)
      .slice(0, count)
  }

  const results = []
  const insertedNewsIds: string[] = []

  for (const company of scored) {
    const result = await researchOne(company)

    // Stamp freshness on every pass so UI can show last-researched
    await supabase
      .from('companies')
      .update({ last_researched_at: new Date().toISOString() })
      .eq('id', company.id)

    // Apply any 3PL info the AI returned (best-effort, both fields optional).
    if (result && (result.third_party_logistics || result.is_3pl === true)) {
      const tplUpdate: any = {}
      if (result.third_party_logistics) tplUpdate.third_party_logistics = String(result.third_party_logistics)
      if (result.is_3pl === true) tplUpdate.is_3pl = true
      try { await supabase.from('companies').update(tplUpdate).eq('id', company.id) } catch { /* swallow */ }
    }

    if (!result || !result.found) continue

    const isUnknown = company.wms_entries?.some((w: any) => w.wms_system === 'Unknown')

    // Update WMS if unknown and found
    if (isUnknown && result.wms_system) {
      await supabase
        .from('wms_entries')
        .update({
          wms_system: result.wms_system,
          vendor: result.vendor || 'Unknown',
          version: result.version || result.wms_system,
          status: result.confidence === 'High' ? 'Active' : 'Needs Verification',
          notes: `Auto-researched ${new Date().toLocaleDateString('en-GB')}: ${result.summary} [Source: ${result.source}] [Confidence: ${result.confidence}]`
        })
        .eq('company_id', company.id)
        .eq('wms_system', 'Unknown')
    }

    // Save news if we found something meaningful
    const newsTitle = result.news_title || (isUnknown && result.wms_system ? `WMS identified: ${result.wms_system}` : null)
    const newsSummary = result.news_summary || result.summary

    if (newsTitle && newsSummary) {
      // Don't duplicate — check if we already have this headline
      const { data: existing } = await supabase
        .from('news_updates')
        .select('id')
        .eq('company_id', company.id)
        .eq('title', newsTitle)
        .limit(1)

      if (!existing || existing.length === 0) {
        if (isStale(item.published_at)) { console.warn('Dropping stale news', { company, headline: item.headline, published_at: item.published_at }); continue; }
        const { data: insertedRows } = await supabase.from('news_updates').insert({
          company_id: company.id,
          title: newsTitle,
          summary: newsSummary,
          source: result.source || null,
          impact_level: result.impact || (result.confidence === 'High' ? 'High' : 'Info'),
          signal_type: result.signal_type && result.signal_type !== 'none' ? result.signal_type : null,
          proposed_wms_system: !isUnknown && result.wms_change && result.wms_system ? result.wms_system : null,
          proposed_vendor: !isUnknown && result.wms_change && result.vendor ? result.vendor : null,
          proposed_version: !isUnknown && result.wms_change && result.version ? result.version : null,
          published_at: item.published_at ?? null
        }).select('id')
        if (insertedRows && insertedRows.length > 0 && insertedRows[0].id) {
          insertedNewsIds.push(insertedRows[0].id as string)
        }
        results.push({ company: company.name, title: newsTitle })
      }
    }

    // Small delay between requests
    await new Promise(r => setTimeout(r, 500))
  }

  // ---- Pre-generation (briefs + LinkedIn drafts) ----
  // Wrapped per-item so a single failure doesn't kill the sweep.

  let briefsGenerated = 0
  let linkedinGenerated = 0

  try {
    // Top 20 companies by hot-signal count in the last 14 days that don't
    // have a fresh cached_brief.
    const cutoff = new Date(Date.now() - 14 * 24 * 60 * 60 * 1000).toISOString()
    const { data: hotSignals } = await supabase
      .from('news_updates')
      .select('company_id, impact_level, created_at')
      .gte('created_at', cutoff)
    const hotCounts = new Map<string, number>()
    for (const s of (hotSignals || [])) {
      const w = s.impact_level === 'High' ? 3 : s.impact_level === 'Medium' ? 2 : 1
      hotCounts.set(s.company_id as string, (hotCounts.get(s.company_id as string) || 0) + w)
    }
    const topIds = Array.from(hotCounts.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 20)
      .map(([id]) => id)

    if (topIds.length > 0) {
      const { data: cacheRows } = await supabase
        .from('companies')
        .select('id, cached_brief, cached_brief_at')
        .in('id', topIds)
      const stale = (cacheRows || [])
        .filter(c => !c.cached_brief || !isFresh(c.cached_brief_at as any))
        .map(c => c.id as string)

      for (const id of stale) {
        try {
          const ok = await generateBriefFor(id)
          if (ok) briefsGenerated += 1
          await new Promise(r => setTimeout(r, 400))
        } catch (e) {
          console.error('[sweep] brief pregen failed', id, e)
        }
      }
    }
  } catch (e) {
    console.error('[sweep] brief pregen block failed', e)
  }

  for (const newsId of insertedNewsIds) {
    try {
      const ok = await generateLinkedInFor(newsId)
      if (ok) linkedinGenerated += 1
      await new Promise(r => setTimeout(r, 300))
    } catch (e) {
      console.error('[sweep] linkedin pregen failed', newsId, e)
    }
  }

  console.log(`[sweep] processed=${scored.length} findings=${results.length} briefs=${briefsGenerated} linkedin=${linkedinGenerated}`)

  return NextResponse.json({
    processed: scored.length,
    findings: results.length,
    results,
    pregen: { briefs: briefsGenerated, linkedin: linkedinGenerated, news_ids: insertedNewsIds },
  })
}
