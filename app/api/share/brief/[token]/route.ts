import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

// GET /api/share/brief/[token]
// Public endpoint — NO auth. The opaque token IS the credential.
// Returns { company_name, brief_content, created_at, view_count }
// or 404 if the token is unknown / expired.
// Side effect: increments view_count and stamps last_viewed_at.

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

export async function GET(
  _req: NextRequest,
  { params }: { params: { token: string } }
) {
  const token = (params?.token || '').trim()
  if (!token || token.length < 8 || token.length > 64) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 })
  }

  const { data: brief, error } = await supabase
    .from('shared_briefs')
    .select('share_token, company_name, brief_content, created_at, view_count, expires_at')
    .eq('share_token', token)
    .maybeSingle()

  if (error || !brief) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 })
  }

  if (brief.expires_at && new Date(brief.expires_at).getTime() < Date.now()) {
    return NextResponse.json({ error: 'Expired' }, { status: 404 })
  }

  // Best-effort view-count bump. Don't block the response on this.
  const nextCount = (brief.view_count || 0) + 1
  await supabase
    .from('shared_briefs')
    .update({ view_count: nextCount, last_viewed_at: new Date().toISOString() })
    .eq('share_token', token)

  return NextResponse.json(
    {
      company_name: brief.company_name,
      brief_content: brief.brief_content,
      created_at: brief.created_at,
      view_count: nextCount,
    },
    {
      // Don't let CDNs cache the response — view_count needs to update on every fetch.
      headers: { 'Cache-Control': 'no-store, max-age=0' },
    }
  )
}
