import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

// POST /api/share/brief
// Authenticated by middleware (wms-auth cookie). Generates an unguessable
// share token, persists the (company_id, brief_content) pair, and returns
// { token, url } that the recruiter can DM to a hiring manager.
//
// The token IS the credential for viewing; never log or echo it elsewhere.

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

// Generate an unguessable URL-safe token (base64url, no padding).
// Uses crypto.randomUUID() to seed 16 random bytes — 128 bits of entropy
// is plenty for an opaque link token.
function makeShareToken(): string {
  const uuid = crypto.randomUUID().replace(/-/g, '')
  const bytes = new Uint8Array(16)
  for (let i = 0; i < 16; i++) bytes[i] = parseInt(uuid.substr(i * 2, 2), 16)
  let bin = ''
  for (let i = 0; i < bytes.length; i++) bin += String.fromCharCode(bytes[i])
  return btoa(bin).replace(/\+/g, '-').replace(/\//g, '_').replace(/=/g, '')
}

function getOrigin(req: NextRequest): string {
  // Prefer forwarded headers (Vercel sets them); fall back to nextUrl.origin.
  const proto = req.headers.get('x-forwarded-proto') || 'https'
  const host = req.headers.get('x-forwarded-host') || req.headers.get('host')
  if (host) return `${proto}://${host}`
  return req.nextUrl.origin
}

export async function POST(req: NextRequest) {
  let body: any
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  const company_id = typeof body?.company_id === 'string' ? body.company_id.trim() : ''
  const brief_content = typeof body?.brief_content === 'string' ? body.brief_content : ''

  if (!company_id) {
    return NextResponse.json({ error: 'company_id required' }, { status: 400 })
  }
  if (!brief_content || brief_content.length < 10) {
    return NextResponse.json({ error: 'brief_content required' }, { status: 400 })
  }

  const { data: company, error: companyErr } = await supabase
    .from('companies')
    .select('id, name')
    .eq('id', company_id)
    .single()

  if (companyErr || !company) {
    return NextResponse.json({ error: 'Company not found' }, { status: 404 })
  }

  // Retry on the (extremely unlikely) collision.
  let token = ''
  let inserted: any = null
  let lastErr: any = null
  for (let attempt = 0; attempt < 5; attempt++) {
    const candidate = makeShareToken()
    const { data, error } = await supabase
      .from('shared_briefs')
      .insert({
        share_token: candidate,
        company_id: company.id,
        company_name: company.name,
        brief_content,
        created_by: 'david',
      })
      .select('share_token, id, created_at')
      .single()
    if (!error) {
      token = candidate
      inserted = data
      break
    }
    lastErr = error
    // 23505 = unique_violation; otherwise bail.
    if (error.code !== '23505') break
  }

  if (!token || !inserted) {
    return NextResponse.json(
      { error: 'Could not create share link', details: lastErr?.message || 'unknown' },
      { status: 500 }
    )
  }

  const origin = getOrigin(req)
  const url = `${origin}/share/${token}`

  return NextResponse.json({ token, url })
}
