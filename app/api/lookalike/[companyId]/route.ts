import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

// Lookalike companies — heuristic only, no Claude call.
// Ranking, in order of preference:
//   tier 1: same industry + same country + same WMS family
//   tier 2: same industry + same country
//   tier 3: same industry + same WMS family
//   tier 4: same industry only
// Source company is always excluded. Up to 10 returned.

export async function GET(_req: NextRequest, { params }: { params: { companyId: string } }) {
  const { companyId } = params
  if (!companyId) {
    return NextResponse.json({ error: 'companyId required' }, { status: 400 })
  }

  const { data: source, error: sourceErr } = await supabase
    .from('companies')
    .select('id, name, industry, country, wms_entries(wms_system)')
    .eq('id', companyId)
    .single()

  if (sourceErr || !source) {
    return NextResponse.json({ error: 'Company not found' }, { status: 404 })
  }

  const sourceIndustry = source.industry || null
  const sourceCountry = source.country || null
  const sourceWMSFamily = wmsFamilyFromEntries((source as any).wms_entries)

  if (!sourceIndustry) {
    // Without an industry to anchor on, we can't really do lookalike.
    return NextResponse.json({ companies: [] })
  }

  const { data: candidates } = await supabase
    .from('companies')
    .select('id, name, industry, country, wms_entries(wms_system)')
    .eq('industry', sourceIndustry)
    .neq('id', companyId)

  if (!candidates || candidates.length === 0) {
    return NextResponse.json({ companies: [] })
  }

  // Score candidates and rank.
  const scored = candidates.map((c: any) => {
    const cFamily = wmsFamilyFromEntries(c.wms_entries)
    const sameCountry = sourceCountry && c.country && c.country === sourceCountry
    const sameWMS = !!(sourceWMSFamily && cFamily && sourceWMSFamily === cFamily)
    let tier = 4
    if (sameCountry && sameWMS) tier = 1
    else if (sameCountry) tier = 2
    else if (sameWMS) tier = 3
    return { c, tier, cFamily }
  })

  scored.sort((a, b) => a.tier - b.tier)
  const ranked = scored.slice(0, 10)

  // Enrich each with last news date + 30d hot-signal count.
  const ids = ranked.map(r => r.c.id)
  const cutoff30d = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString()

  const [{ data: lastNews }, { data: hotNews }] = await Promise.all([
    supabase
      .from('news_updates')
      .select('company_id, created_at, published_at')
      .in('company_id', ids)
      .order('created_at', { ascending: false }),
    supabase
      .from('news_updates')
      .select('company_id, impact_level, created_at')
      .in('company_id', ids)
      .gte('created_at', cutoff30d),
  ])

  const lastByCompany = new Map<string, string | null>()
  for (const row of (lastNews || [])) {
    const cid = row.company_id as string
    if (!lastByCompany.has(cid)) {
      const d = (row.published_at as string) || (row.created_at as string) || null
      lastByCompany.set(cid, d)
    }
  }

  const hotByCompany = new Map<string, number>()
  for (const row of (hotNews || [])) {
    const cid = row.company_id as string
    if (row.impact_level === 'High' || row.impact_level === 'Medium') {
      hotByCompany.set(cid, (hotByCompany.get(cid) || 0) + 1)
    }
  }

  const out = ranked.map(({ c, tier, cFamily }) => ({
    id: c.id,
    name: c.name,
    industry: c.industry || null,
    country: c.country || null,
    wms_system: cFamily,
    last_news_at: lastByCompany.get(c.id) || null,
    hot_signal_count_30d: hotByCompany.get(c.id) || 0,
    match_tier: tier,
  }))

  return NextResponse.json({ companies: out })
}

function wmsFamilyFromEntries(entries: any): string | null {
  if (!Array.isArray(entries) || entries.length === 0) return null
  const known = entries.find((e: any) => e && e.wms_system && e.wms_system !== 'Unknown')
  if (!known) return null
  return canonicaliseFamily(String(known.wms_system))
}

function canonicaliseFamily(s: string): string {
  const x = s.toLowerCase()
  if (x.includes('blue yonder') || x.includes('jda') || x.includes('redprairie') || x.includes('red prairie')) return 'Blue Yonder'
  if (x.includes('manhattan')) return 'Manhattan'
  if (x.includes('sap')) return 'SAP'
  if (x.includes('oracle')) return 'Oracle'
  if (x.includes('körber') || x.includes('korber') || x.includes('high jump') || x.includes('highjump')) return 'Körber'
  if (x.includes('softeon')) return 'Softeon'
  if (x.includes('infor')) return 'Infor'
  if (x.includes('mecalux')) return 'Mecalux'
  if (x.includes('tecsys')) return 'Tecsys'
  return s.trim()
}
