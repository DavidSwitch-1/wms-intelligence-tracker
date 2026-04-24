import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

// Vercel cron calls this with GET, protected by CRON_SECRET
export async function GET(req: NextRequest) {
  const authHeader = req.headers.get('authorization')
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    // Get all companies, prioritising those not researched recently
    const { data: companies } = await supabase
      .from('companies')
      .select('id, name, industry, country, wms_entries(wms_system)')
      .order('last_researched_at', { ascending: true, nullsFirst: true })
      .limit(50) // Process 50 per daily run (spread load)

    if (!companies || companies.length === 0) {
      return NextResponse.json({ message: 'No companies to research' })
    }

    let processed = 0
    let updated = 0
    const results: string[] = []

    for (const company of companies) {
      const isUnknown = (company.wms_entries as any[])?.some(w => w.wms_system === 'Unknown')
      const mode = isUnknown ? 'unknown' : 'news'

      // Stagger with a small delay to avoid rate limits
      await new Promise(resolve => setTimeout(resolve, 500))

      try {
        const res = await fetch(`${process.env.NEXT_PUBLIC_APP_URL || 'https://wms-intelligence-tracker.vercel.app'}/api/research`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            companyId: company.id,
            companyName: company.name,
            industry: company.industry || '',
            country: company.country || '',
            mode
          })
        })
        const d = await res.json()
        if (d.updated) {
          updated++
          results.push(`✓ ${company.name}: ${d.result?.title || d.result?.wms_system || 'updated'}`)
        }
        processed++
      } catch (e) {
        results.push(`✗ ${company.name}: error`)
      }
    }

    return NextResponse.json({
      message: `Cron complete: processed ${processed}, updated ${updated}`,
      results: results.slice(0, 20)
    })
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 })
  }
}
