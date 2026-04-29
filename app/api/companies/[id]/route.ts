import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

// Per-company management endpoint, used by the Dashboard "Recently discovered"
// strip to verify or dismiss auto-discovered candidates.
//
// PATCH  /api/companies/<id>   body: { discovery_status?: 'pending' | 'verified' | 'dismissed' }
// DELETE /api/companies/<id>   permanently removes the row
//
// Auth is handled globally by middleware.ts (wms-auth cookie); we don't repeat
// the check here.

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

const ALLOWED_STATUS = new Set(['pending', 'verified', 'dismissed'])

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
  if (typeof body.discovery_status === 'string') {
    if (!ALLOWED_STATUS.has(body.discovery_status)) {
      return NextResponse.json({ error: 'invalid discovery_status' }, { status: 400 })
    }
    update.discovery_status = body.discovery_status
  }

  if (Object.keys(update).length === 0) {
    return NextResponse.json({ error: 'no updatable fields supplied' }, { status: 400 })
  }

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
  return NextResponse.json({ ok: true, company: data })
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
