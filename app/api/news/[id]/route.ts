import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

const ALLOWED = new Set(['pending', 'verified', 'dismissed'])

export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const { status } = await req.json()

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
