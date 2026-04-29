import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

// Per-company management endpoint, used by the Dashboard "Recently discovered"
// strip and by the company detail panel's Edit feature.
//
// PATCH  /api/companies/<id>   body: editable fields (see EDITABLE_TEXT and
//                              EDITABLE_BOOL below). Unknown fields are
//                              ignored. Updating name/country/hq_city resets
//                              latitude/longitude/geocoded_at so the next
//                              geocode pass re-resolves the row.
// DELETE /api/companies/<id>   permanently removes the row
//
// Auth is handled globally by middleware.ts (wms-auth cookie); we don't repeat
// the check here.

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

const ALLOWED_STATUS = new Set(['pending', 'verified', 'dismissed'])

// String fields on the companies row that accept a string or null. Empty
// strings are coerced to null on update.
const EDITABLE_TEXT = [
  'industry',
  'country',
  'hq_city',
  'third_party_logistics',
  'notes',
] as const

// Fields whose change should invalidate cached geocoding so the next pass
// re-resolves the row.
const GEOCODE_INVALIDATING = new Set(['name', 'country', 'hq_city'])

function coerceNullableString(v: any): { ok: true; value: string | null } | { ok: false } {
  if (v === null) return { ok: true, value: null }
  if (typeof v === 'string') {
    const t = v.trim()
    return { ok: true, value: t === '' ? null : t }
  }
  return { ok: false }
}

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const id = params?.id
  if (!id) return NextResponse.json({ error: 'missing id' }, { status: 400 })

  let body: any = {}
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'invalid json' }, { status: 400 })
  }

  const update: Record<string, any> = {}

  // Existing discovery_status branch.
  if (typeof body.discovery_status === 'string') {
    if (!ALLOWED_STATUS.has(body.discovery_status)) {
      return NextResponse.json({ error: 'invalid discovery_status' }, { status: 400 })
    }
    update.discovery_status = body.discovery_status
  }

  // name: trimmed non-empty string when supplied.
  if (Object.prototype.hasOwnProperty.call(body, 'name')) {
    if (typeof body.name !== 'string') {
      return NextResponse.json({ error: 'name must be a string' }, { status: 400 })
    }
    const trimmed = body.name.trim()
    if (!trimmed) {
      return NextResponse.json({ error: 'name cannot be empty' }, { status: 400 })
    }
    update.name = trimmed
  }

  // Nullable text fields.
  for (const key of EDITABLE_TEXT) {
    if (Object.prototype.hasOwnProperty.call(body, key)) {
      const r = coerceNullableString(body[key])
      if (!r.ok) {
        return NextResponse.json({ error: `${key} must be a string or null` }, { status: 400 })
      }
      update[key] = r.value
    }
  }

  // is_3pl: boolean
  if (Object.prototype.hasOwnProperty.call(body, 'is_3pl')) {
    if (typeof body.is_3pl !== 'boolean') {
      return NextResponse.json({ error: 'is_3pl must be a boolean' }, { status: 400 })
    }
    update.is_3pl = body.is_3pl
  }

  // wms_system / wms_version live on the related wms_entries table; collect
  // them separately and apply to the most recent entry after the company
  // update has succeeded.
  const wmsUpdate: Record<string, any> = {}
  if (Object.prototype.hasOwnProperty.call(body, 'wms_system')) {
    const r = coerceNullableString(body.wms_system)
    if (!r.ok) return NextResponse.json({ error: 'wms_system must be a string or null' }, { status: 400 })
    wmsUpdate.wms_system = r.value
  }
  if (Object.prototype.hasOwnProperty.call(body, 'wms_version')) {
    const r = coerceNullableString(body.wms_version)
    if (!r.ok) return NextResponse.json({ error: 'wms_version must be a string or null' }, { status: 400 })
    wmsUpdate.version = r.value
  }

  if (Object.keys(update).length === 0 && Object.keys(wmsUpdate).length === 0) {
    return NextResponse.json({ error: 'no updatable fields supplied' }, { status: 400 })
  }

  // If a geocoding-relevant field changed, null out cached coordinates so the
  // next geocode pass re-resolves the row.
  const touchesGeocode = Object.keys(update).some(k => GEOCODE_INVALIDATING.has(k))
  if (touchesGeocode) {
    update.latitude = null
    update.longitude = null
    update.geocoded_at = null
  }

  let companyData: any = null
  if (Object.keys(update).length > 0) {
    const { data, error } = await supabase
      .from('companies')
      .update(update)
      .eq('id', id)
      .select()
      .maybeSingle()

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }
    if (!data) {
      return NextResponse.json({ error: 'not found' }, { status: 404 })
    }
    companyData = data
  }

  // Apply wms_entries update to the most recent entry, if any. If no entry
  // exists yet for this company we silently skip — the page provides its own
  // "Add WMS entry" path for that case.
  if (Object.keys(wmsUpdate).length > 0) {
    const { data: latest } = await supabase
      .from('wms_entries')
      .select('id')
      .eq('company_id', id)
      .order('updated_at', { ascending: false })
      .limit(1)
      .maybeSingle()
    if (latest && latest.id) {
      const { error: wmsErr } = await supabase
        .from('wms_entries')
        .update(wmsUpdate)
        .eq('id', latest.id)
      if (wmsErr) {
        return NextResponse.json({ error: wmsErr.message }, { status: 500 })
      }
    }
  }

  if (!companyData) {
    const { data } = await supabase.from('companies').select().eq('id', id).maybeSingle()
    companyData = data
  }

  return NextResponse.json({ ok: true, company: companyData })
}

export async function DELETE(_req: NextRequest, { params }: { params: { id: string } }) {
  const id = params?.id
  if (!id) return NextResponse.json({ error: 'missing id' }, { status: 400 })

  const { error } = await supabase.from('companies').delete().eq('id', id)
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
  return NextResponse.json({ ok: true })
}
