import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

// Geocode pending companies via OpenStreetMap Nominatim.
//
// Auth: Bearer ${process.env.CRON_SECRET} Ã¢ÂÂ same pattern as /api/cron.
//
// Behaviour: pulls up to 50 companies that have either no latitude
// or were last geocoded > 6 months ago, then queries Nominatim with
// 1.1s spacing (Nominatim's published rate limit is 1 req/sec). On
// success writes latitude/longitude/hq_city/geocoded_at. Errors per
// company are swallowed so one bad row doesn't kill the whole batch.
//
// Initial backfill of ~187 rows takes ~4 calls (50 per call). Either
// curl this route ~4 times manually, or let the daily cron drain it.

export const dynamic = 'force-dynamic'
export const maxDuration = 60

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

const SIX_MONTHS_MS = 6 * 30 * 24 * 60 * 60 * 1000
const NOMINATIM_USER_AGENT = 'wms-intelligence-tracker/1.0 (david@swi-tch.com)'
const SPACING_MS = 1100
const BATCH_SIZE = 8

function isStale(at: string | null | undefined): boolean {
  if (!at) return true
  const ts = new Date(at).getTime()
  if (Number.isNaN(ts)) return true
  return Date.now() - ts > SIX_MONTHS_MS
}

function sleep(ms: number) {
  return new Promise(resolve => setTimeout(resolve, ms))
}

async function geocodeOne(name: string, country: string | null, hqCity: string | null): Promise<{
  lat: number; lng: number; city: string | null; matched_query: string
} | null> {
  const queries: string[] = [
    hqCity && country ? `${name}, ${hqCity}, ${country}` : null,
    country ? `${name}, ${country}` : null,
    name,
  ].filter(Boolean) as string[]

  for (let qi = 0; qi < queries.length; qi++) {
    if (qi > 0) await sleep(SPACING_MS)
    const q = queries[qi]
    const url = `https://nominatim.openstreetmap.org/search?format=json&limit=1&addressdetails=1&q=${encodeURIComponent(q)}`
    const res = await fetch(url, {
      headers: {
        'User-Agent': NOMINATIM_USER_AGENT,
      },
    })
    if (!res.ok) continue
    const arr = await res.json()
    if (!Array.isArray(arr) || arr.length === 0) continue
    const hit = arr[0]
    const lat = parseFloat(hit.lat)
    const lng = parseFloat(hit.lon)
    if (Number.isNaN(lat) || Number.isNaN(lng)) continue
    const addr = hit.address || {}
    const city = addr.city || addr.town || addr.village || addr.hamlet || addr.municipality || addr.county || null
    return { lat, lng, city, matched_query: q }
  }
  return null
}

export async function POST(req: NextRequest) {
  return run(req)
}

export async function GET(req: NextRequest) {
  return run(req)
}

async function run(req: NextRequest) {
  // Auth Ã¢ÂÂ Bearer CRON_SECRET, same pattern as /api/cron.
  const auth = req.headers.get('authorization') || ''
  const expected = `Bearer ${process.env.CRON_SECRET || ''}`
  if (!process.env.CRON_SECRET || auth !== expected) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 })
  }

  // Pull candidates: latitude is null OR geocoded_at older than 6 months.
  const sixMonthsAgo = new Date(Date.now() - SIX_MONTHS_MS).toISOString()
  const { data: candidates, error } = await supabase
    .from('companies')
    .select('id, name, country, hq_city, latitude, geocoded_at')
    .or(`latitude.is.null,geocoded_at.lt.${sixMonthsAgo}`)
    .order('geocoded_at', { ascending: true, nullsFirst: true })
    .limit(BATCH_SIZE)

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  const targets = (candidates || []).filter(c => !c.latitude || isStale(c.geocoded_at))

  let geocoded = 0
  let failed = 0
  const failures: Array<{ id: string; name: string; reason: string }> = []

  for (let i = 0; i < targets.length; i++) {
    const c = targets[i] as any
    if (i > 0) await sleep(SPACING_MS)
    try {
      const hit = await geocodeOne(c.name, c.country, c.hq_city ?? null)
      if (hit) {
        console.log(`[geocode] hit: ${c.name} -> ${hit.matched_query}`)
      } else {
        console.log(`[geocode] miss: ${c.name} (final attempted: ${c.name})`)
      }
      if (!hit) {
        failed++
        failures.push({ id: c.id, name: c.name, reason: 'no result' })
        // Stamp geocoded_at anyway so we don't retry until 6 months pass.
        await supabase
          .from('companies')
          .update({ geocoded_at: new Date().toISOString() })
          .eq('id', c.id)
        continue
      }
      await supabase
        .from('companies')
        .update({
          latitude: hit.lat,
          longitude: hit.lng,
          hq_city: hit.city,
          geocoded_at: new Date().toISOString(),
        })
        .eq('id', c.id)
      geocoded++
    } catch (err: any) {
      failed++
      failures.push({ id: c.id, name: c.name, reason: String(err?.message || err) })
    }
  }

  return NextResponse.json({
    processed: targets.length,
    geocoded,
    failed,
    remaining_estimate: Math.max(0, (candidates?.length || 0) - targets.length),
    failures: failures.slice(0, 20),
  })
}
