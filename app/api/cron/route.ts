import { NextRequest, NextResponse } from 'next/server'

// Vercel cron job — runs daily at 2am
// Calls the sweep endpoint with a larger batch
export async function GET(req: NextRequest) {
  // Verify this is called by Vercel cron (not public)
  const authHeader = req.headers.get('authorization')
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const baseUrl = process.env.VERCEL_URL
    ? `https://${process.env.VERCEL_URL}`
    : 'https://wms-intelligence-tracker.vercel.app'

  // Run a full sweep of 100 companies overnight
  const res = await fetch(`${baseUrl}/api/sweep`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ count: 100, mode: 'cron' })
  })

  const data = await res.json()
  return NextResponse.json({ ok: true, ...data })
}
