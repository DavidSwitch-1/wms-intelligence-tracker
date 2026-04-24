import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

export async function POST(req: NextRequest) {
  const { companyId, companyName, industry, country } = await req.json()

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
        max_tokens: 800,
        tools: [{ type: 'web_search_20250305', name: 'web_search', max_uses: 2 }],
        system: `You are a WMS intelligence researcher. Find what Warehouse Management System a given company uses by searching the web. Look for press releases, case studies, job postings, and news. Background: Red Prairie = Blue Yonder Dispatcher, JDA Discrete = Blue Yonder WMS, Manhattan PKMS/WMOS/WMi are legacy on-premise systems. Respond ONLY with a JSON object, no markdown:
{"found":true/false,"wms_system":"name or null","vendor":"vendor or null","version":"version or null","confidence":"High/Medium/Low","summary":"one sentence","source":"URL or source description"}`,
        messages: [{
          role: 'user',
          content: `What WMS does ${companyName} use? They are a ${industry} company in ${country}. Search for their warehouse management system.`
        }]
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

    if (!result?.found || !result.wms_system) {
      return NextResponse.json({ updated: false })
    }

    // Update the unknown WMS entry
    await supabase
      .from('wms_entries')
      .update({
        wms_system: result.wms_system,
        vendor: result.vendor || 'Unknown',
        version: result.version || result.wms_system,
        status: result.confidence === 'High' ? 'Active' : 'Needs Verification',
        notes: `Auto-researched ${new Date().toLocaleDateString('en-GB')}: ${result.summary} [Source: ${result.source}] [Confidence: ${result.confidence}]`
      })
      .eq('company_id', companyId)
      .eq('wms_system', 'Unknown')

    // Log as a news update
    await supabase.from('news_updates').insert({
      company_id: companyId,
      title: `WMS identified: ${result.wms_system}`,
      summary: `${result.summary} (${result.confidence} confidence)`,
      source: result.source,
      impact_level: 'Info',
      published_at: new Date().toISOString()
    })

    return NextResponse.json({ updated: true, result })
  } catch (err) {
    return NextResponse.json({ updated: false, error: String(err) }, { status: 500 })
  }
}
