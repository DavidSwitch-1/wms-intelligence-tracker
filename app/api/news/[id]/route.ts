import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

const ALLOWED = new Set(['pending', 'verified', 'dismissed'])

// PATCH /api/news/[id]
//
// Body shapes:
//   { status: 'pending' | 'verified' | 'dismissed' }     -> just update status
//   { apply: true }                                       -> update wms_entries
//                                                            with the proposed_*
//                                                            values, then mark
//                                                            the news 'verified'
export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const body = await req.json().catch(() => ({}))

  if (body.apply === true) {
    const { data: news, error: fetchErr } = await supabase
      .from('news_updates')
      .select('id, company_id, proposed_wms_system, proposed_vendor, proposed_version')
      .eq('id', params.id)
      .single()
    if (fetchErr || !news) {
      return NextResponse.json({ error: fetchErr?.message || 'News not found' }, { status: 404 })
    }
    if (!news.proposed_wms_system) {
      return NextResponse.json({ error: 'No proposed change on this news item' }, { status: 400 })
    }

    const { data: entries } = await supabase
      .from('wms_entries')
      .select('id')
      .eq('company_id', news.company_id)
      .order('id')
      .limit(1)

    if (entries && entries.length > 0) {
      await supabase
        .from('wms_entries')
        .update({
          wms_system: news.proposed_wms_system,
          vendor: news.proposed_vendor || undefined,
          version: news.proposed_version || news.proposed_wms_system,
          status: 'Active',
          notes: `Auto-applied from news ${params.id} on ${new Date().toLocaleDateString('en-GB')}`,
        })
        .eq('id', entries[0].id)
    } else {
      await supabase.from('wms_entries').insert({
        company_id: news.company_id,
        wms_system: news.proposed_wms_system,
        vendor: news.proposed_vendor || 'Unknown',
        version: news.proposed_version || news.proposed_wms_system,
        status: 'Active',
        notes: `Auto-applied from news ${params.id} on ${new Date().toLocaleDateString('en-GB')}`,
      })
    }

    await supabase
      .from('news_updates')
      .update({ status: 'verified' })
      .eq('id', params.id)

    return NextResponse.json({ ok: true, applied: true })
  }

  const { status } = body
  if (!ALLOWED.has(status)) {
    return NextResponse.json(
      { error: 'status must be pending, verified, or dismissed' },
      { status: 400 }
    )
  }

  const { data, error } = await supabase
    .from('news_updates')
    .update({ status })
    .eq('id', params.id)
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true, news: data })
}
