import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

// Research a single company for both WMS identity AND recent news/upgrades
async function researchOne(company: any) {
  const isUnknown = company.wms_entries?.some((w: any) => w.wms_system === 'Unknown')
  const knownWMS = company.wms_entries?.filter((w: any) => w.wms_system !== 'Unknown')
    .map((w: any) => w.wms_system).join(', ')

  const prompt = isUnknown
    ? `What WMS (Warehouse Management System) does ${company.name} use? They are a ${company.industry || ''} company in ${company.country || ''}. Search for press releases, case studies, job postings mentioning their WMS.`
    : `Search for recent news about ${company.name}'s warehouse or supply chain technology. They currently use ${knownWMS}. Look for: WMS upgrades, new warehouse openings, system migrations, technology partnerships, or distribution centre announcements in the last 12 months.`

  const systemPrompt = isUnknown
    ? `You are a WMS intelligence researcher. Find what WMS a company uses. Background: Red Prairie = Blue Yonder Dispatcher, JDA Discrete = Blue Yonder WMS, Manhattan PKMS/WMOS/WMi are legacy. Respond ONLY with JSON:
{"found":true/false,"wms_system":"name or null","vendor":"vendor or null","version":"version or null","confidence":"High/Medium/Low","summary":"one sentence finding","source":"URL or source description","news_title":"short headline or null","news_summary":"brief news summary or null"}`
    : `You are a supply chain intelligence researcher. Find recent news about a company's warehouse or WMS activity. Respond ONLY with JSON:
{"found":true/false,"news_title":"short punchy headline or null","news_summary":"2-3 sentence summary of what you found or null","source":"URL or source description","impact":"High/Medium/Low/Info","wms_change":true/false,"wms_system":"new system if changing, else null","confidence":"High/Medium/Low"}`

  try {
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': process.env.ANTHROPIC_API_KEY!,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: 'claude-sonnet-4-6',
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
  for (const company of scored) {
    const result = await researchOne(company)

    // Stamp freshness on every pass so UI can show last-researched
    await supabase
      .from('companies')
      .update({ last_researched_at: new Date().toISOString() })
      .eq('id', company.id)

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
        await supabase.from('news_updates').insert({
          company_id: company.id,
          title: newsTitle,
          summary: newsSummary,
          source: result.source || null,
          impact_level: result.impact || (result.confidence === 'High' ? 'High' : 'Info'),
          published_at: new Date().toISOString()
        })
        results.push({ company: company.name, title: newsTitle })
      }
    }

    // Small delay between requests
    await new Promise(r => setTimeout(r, 500))
  }

  return NextResponse.json({ processed: scored.length, findings: results.length, results })
}
