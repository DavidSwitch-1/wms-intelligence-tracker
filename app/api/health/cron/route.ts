import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

// Cron health snapshot. No auth required (read-only stats), no Claude call.
// Used to verify the nightly sweep is still firing and ingesting.

export async function GET(_req: NextRequest) {
  const now = Date.now()
  const dayAgo = new Date(now - 24 * 60 * 60 * 1000).toISOString()
  const weekAgo = new Date(now - 7 * 24 * 60 * 60 * 1000).toISOString()

  // last_sweep_at: max(news_updates.created_at) is the closest proxy without a
  // dedicated sweep_runs table.
  const { data: lastNews } = await supabase
    .from('news_updates')
    .select('created_at')
    .order('created_at', { ascending: false })
    .limit(1)
  const lastSweepAt = lastNews && lastNews.length > 0 ? lastNews[0].created_at : null

  const [{ count: news24h }, { count: news7d }, { count: companiesTotal }, { count: companiesUnknownWMS }, { count: researched24h }] = await Promise.all([
    supabase.from('news_updates').select('id', { count: 'exact', head: true }).gte('created_at', dayAgo),
    supabase.from('news_updates').select('id', { count: 'exact', head: true }).gte('created_at', weekAgo),
    supabase.from('companies').select('id', { count: 'exact', head: true }),
    supabase.from('wms_entries').select('id', { count: 'exact', head: true }).eq('wms_system', 'Unknown'),
    supabase.from('companies').select('id', { count: 'exact', head: true }).gte('last_researched_at', dayAgo),
  ])

  return NextResponse.json({
    last_sweep_at: lastSweepAt,
    news_24h: news24h || 0,
    news_7d: news7d || 0,
    companies_total: companiesTotal || 0,
    companies_with_unknown_wms: companiesUnknownWMS || 0,
    companies_researched_24h: researched24h || 0,
    checked_at: new Date().toISOString(),
  })
}
