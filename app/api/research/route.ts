import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

export async function POST(req: NextRequest) {
  const { companyId, companyName, industry, country, mode } = await req.json()
  // mode: 'unknown' = find WMS, 'news' = find upgrade/change news for known companies

  try {
    const isUnknown = mode === 'unknown'

    const prompt = isUnknown
      ? `What Warehouse Management System (WMS) does ${companyName} use? They are a ${industry} company in ${country}. Search for press releases, case studies, job postings, or news mentioning their WMS system.`
      : `Find any recent news about ${companyName}'s warehouse or logistics technology. Search for: WMS upgrades, new warehouse openings, supply chain technology changes, distribution centre news, new logistics contracts. They are a ${industry} company in ${country}.`

    const systemPrompt = isUnknown
      ? `You are a WMS intelligence researcher. Find what WMS a company uses. Background: Red Prairie = Blue Yonder Dispatcher, JDA Discrete = Blue Yonder WMS, Manhattan PKMS/WMOS/WMi are legacy on-premise. Respond ONLY with JSON (no markdown):
{"found":true/false,"wms_system":"name or null","vendor":"vendor or null","version":"version or null","confidence":"High/Medium/Low","summary":"one sentence max","source":"URL or source"}`
      : `You are a supply chain intelligence researcher. Find recent news about a company's warehouse/logistics operations. Look for: WMS upgrades or replacements, new warehouse openings, DC expansions, logistics technology news, new 3PL partnerships, supply chain transformation projects. Only report genuinely interesting/recent findings from the last 2 years. Respond ONLY with JSON (no markdown):
{"found":true/false,"title":"news headline or null","summary":"2 sentence summary or null","impact":"High/Medium/Low/Info","source":"URL or source","confidence":"High/Medium/Low"}`

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
        tools: [{ type: 'web_search_20250305', name: 'web_search', max_uses: 3 }],
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

    let result: any = null
    try {
      const m = text.match(/\{[\s\S]*\}/)
      if (m) result = JSON.parse(m[0])
    } catch { /* */ }

    if (!result?.found) {
      // Still mark as researched so we don't keep retrying
      await supabase.from('companies').update({ last_researched_at: new Date().toISOString() }).eq('id', companyId)
      return NextResponse.json({ updated: false })
    }

    if (isUnknown && result.wms_system) {
      // Update the unknown WMS entry
      await supabase.from('wms_entries').update({
        wms_system: result.wms_system,
        vendor: result.vendor || 'Unknown',
        version: result.version || result.wms_system,
        status: result.confidence === 'High' ? 'Active' : 'Needs Verification',
        notes: `Auto-researched ${new Date().toLocaleDateString('en-GB')}: ${result.summary} [Source: ${result.source}] [Confidence: ${result.confidence}]`
      }).eq('company_id', companyId).eq('wms_system', 'Unknown')

      // Add news item
      await supabase.from('news_updates').insert({
        company_id: companyId,
        title: `WMS identified: ${result.wms_system}`,
        summary: result.summary,
        source: result.source,
        impact_level: 'Info',
        published_at: new Date().toISOString()
      })
    } else if (!isUnknown && result.title) {
      // Check we haven't already logged this exact headline
      const { data: existing } = await supabase
        .from('news_updates')
        .select('id')
        .eq('company_id', companyId)
        .eq('title', result.title)
        .limit(1)

      if (!existing || existing.length === 0) {
        await supabase.from('news_updates').insert({
          company_id: companyId,
          title: result.title,
          summary: result.summary,
          source: result.source,
          impact_level: result.impact || 'Info',
          published_at: new Date().toISOString()
        })
      }
    }

    // Mark as researched
    await supabase.from('companies').update({ last_researched_at: new Date().toISOString() }).eq('id', companyId)

    return NextResponse.json({ updated: true, result })
  } catch (err) {
    return NextResponse.json({ updated: false, error: String(err) }, { status: 500 })
  }
}
