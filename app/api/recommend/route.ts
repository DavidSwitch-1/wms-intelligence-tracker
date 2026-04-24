import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

// Ask Claude (with web search) to suggest companies worth adding
// to the tracker for a given industry vertical, excluding companies
// already in the database.

export async function POST(req: NextRequest) {
  const { industry = '3PL', country = 'United Kingdom', count = 10, notes = '' } = await req.json()

  const { data: existing } = await supabase
    .from('companies')
    .select('name')

  const existingNames = (existing || []).map((c: any) => c.name).sort()

  const userPrompt = `We run a WMS (Warehouse Management System) intelligence tracker for a supply chain recruitment consultancy. We're looking for ${count} companies in the "${industry}" sector, based in or with major operations in ${country}, that we should add to our database as potential recruitment clients.

We already track these companies - do NOT return any of these:
${existingNames.join(', ')}

${notes ? 'Extra context: ' + notes + '\n\n' : ''}Criteria for good suggestions:
- Meaningful warehouse footprint (operates distribution centres or fulfilment sites)
- Likely to run or be evaluating a real WMS (Manhattan, Blue Yonder, SAP EWM, Oracle, Infor, Korber, Manhattan Active, etc.)
- Hiring likelihood signals (recent DC openings, growth, M&A, technology refresh) are a bonus

Respond ONLY with a JSON array of up to ${count} objects:
[
  {
    "name": "Company legal/trading name",
    "industry": "${industry}",
    "country": "${country}",
    "rationale": "one sentence on why this is a good target",
    "signal": "growth|dc_opening|wms_migration|ma|exec_hire|hiring|none"
  }
]

No commentary outside the JSON array.`

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
        max_tokens: 2000,
        tools: [{ type: 'web_search_20250305', name: 'web_search', max_uses: 3 }],
        system: 'You are a supply chain intelligence researcher. You find companies with meaningful warehouse operations that a WMS recruitment firm should track. Respond only with valid JSON as instructed.',
        messages: [{ role: 'user', content: userPrompt }]
      })
    })

    const data = await response.json()
    let text = ''
    if (Array.isArray(data.content)) {
      for (const block of data.content) {
        if (block.type === 'text') text += block.text
      }
    }

    const match = text.match(/\[[\s\S]*\]/)
    if (!match) {
      return NextResponse.json({ suggestions: [], raw: text.substring(0, 500) })
    }

    let suggestions
    try {
      suggestions = JSON.parse(match[0])
    } catch (e) {
      return NextResponse.json({ suggestions: [], raw: text.substring(0, 500) })
    }

    const lowerExisting = new Set(existingNames.map((n: string) => n.toLowerCase()))
    suggestions = (suggestions || []).filter((s: any) => s?.name && !lowerExisting.has(String(s.name).toLowerCase()))

    return NextResponse.json({ suggestions, count: suggestions.length })
  } catch (err: any) {
    return NextResponse.json({ error: err?.message || 'Recommendation failed' }, { status: 500 })
  }
}
