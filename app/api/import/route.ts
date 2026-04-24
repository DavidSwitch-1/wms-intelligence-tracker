import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

// Bulk import companies. Each company gets an "Unknown" WMS entry so the
// sweep route will auto-research it on the next pass.
//
// Body: { companies: [{ name, industry?, country?, region?, notes? }] }
// Also accepts: { names: ["Name1", "Name2", ...] } for the simplest paste-list.

export async function POST(req: NextRequest) {
  const body = await req.json()

  let rows: Array<{ name: string; industry?: string; country?: string; region?: string; notes?: string }> = []

  if (Array.isArray(body?.companies)) {
    rows = body.companies
      .filter((c: any) => c && typeof c.name === 'string' && c.name.trim())
      .map((c: any) => ({
        name: c.name.trim(),
        industry: c.industry?.trim() || null,
        country: c.country?.trim() || null,
        region: c.region?.trim() || null,
        notes: c.notes?.trim() || null,
      }))
  } else if (Array.isArray(body?.names)) {
    rows = body.names
      .filter((n: any) => typeof n === 'string' && n.trim())
      .map((n: string) => ({ name: n.trim() }))
  }

  if (rows.length === 0) {
    return NextResponse.json({ error: 'No valid companies provided' }, { status: 400 })
  }

  // Fetch existing names for dedup (case-insensitive)
  const { data: existing } = await supabase
    .from('companies')
    .select('name')

  const existingLower = new Set((existing || []).map((c: any) => c.name.toLowerCase()))

  const toInsert = rows.filter(r => !existingLower.has(r.name.toLowerCase()))
  const skipped = rows.length - toInsert.length

  if (toInsert.length === 0) {
    return NextResponse.json({ added: 0, skipped, companies: [] })
  }

  const { data: inserted, error: insertErr } = await supabase
    .from('companies')
    .insert(toInsert)
    .select()

  if (insertErr) {
    return NextResponse.json({ error: insertErr.message }, { status: 500 })
  }

  // Create an Unknown wms_entry for each so sweep picks them up
  const wmsRows = (inserted || []).map((co: any) => ({
    company_id: co.id,
    wms_system: 'Unknown',
    vendor: 'Unknown',
    version: 'Unknown',
    status: 'Needs Verification',
    notes: 'Auto-created from bulk import, awaiting research',
  }))

  if (wmsRows.length > 0) {
    await supabase.from('wms_entries').insert(wmsRows)
  }

  return NextResponse.json({
    added: inserted?.length || 0,
    skipped,
    companies: inserted?.map((c: any) => ({ id: c.id, name: c.name })) || [],
  })
}
