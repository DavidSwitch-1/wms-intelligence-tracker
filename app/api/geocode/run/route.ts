import { NextRequest, NextResponse } from 'next/server'
import { POST as geocodePost } from '../route'

// Session-authenticated geocode trigger.
//
// The middleware (../../../middleware.ts) already redirects requests
// without the wms-auth=ok cookie to /login, so by the time control
// reaches this handler, cookie-based session auth has already passed.
//
// We then dispatch through the existing /api/geocode POST handler by
// synthesising a request that carries the Bearer header it expects
// internally — that handler stays untouched. This keeps the cron-only
// /api/geocode endpoint behaviour identical for the daily Vercel cron,
// while giving the in-app "Geocode now" button a session-gated path.

export const dynamic = 'force-dynamic'
export const maxDuration = 60

export async function POST(req: NextRequest) {
  const secret = process.env.CRON_SECRET
  if (!secret) {
    return NextResponse.json(
      { error: 'CRON_SECRET not configured on server' },
      { status: 500 }
    )
  }

  // Synthesise an inner request carrying the Bearer header expected by
  // the existing /api/geocode handler. The original 'req' (with its
  // session cookie) has already cleared middleware, so we don't lose
  // any auth guarantees by dispatching with this inner request.
  const inner = new NextRequest(req.nextUrl, {
    method: 'POST',
    headers: { authorization: `Bearer ${secret}` },
  })

  return geocodePost(inner)
}
