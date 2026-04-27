import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { Resend } from 'resend'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

// Weekly digest cron — Monday 07:00 UTC via vercel.json schedule.
// Auth: same Bearer ${CRON_SECRET} pattern as the existing sweep cron.
// If RESEND_API_KEY or DIGEST_RECIPIENTS is missing, log + return 200
// with { skipped: true, reason } so Vercel doesn't retry-storm.

const APP_URL = process.env.VERCEL_URL
  ? `https://${process.env.VERCEL_URL}`
  : (process.env.APP_URL || 'https://wms-intelligence-tracker.vercel.app')

export async function GET(req: NextRequest) {
  const authHeader = req.headers.get('authorization')
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const now = new Date()
  const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)
  const weekRange = `${fmtDate(weekAgo)} – ${fmtDate(now)}`

  let topHot: any[] = []
  let topWmsChanges: any[] = []
  let topLookalikes: any[] = []

  try {
    const cutoff = weekAgo.toISOString()

    const { data: hot } = await supabase
      .from('news_updates')
      .select('id, title, summary, signal_type, impact_level, created_at, published_at, company_id, companies(name)')
      .gte('created_at', cutoff)
      .order('created_at', { ascending: false })
      .limit(80)

    topHot = (hot || [])
      .filter((n: any) => n.impact_level === 'High' || n.impact_level === 'Medium')
      .slice(0, 5)

    topWmsChanges = (hot || [])
      .filter((n: any) => n.proposed_wms_system || (n.signal_type === 'wms_migration'))
      .slice(0, 3)

    // Lookalike opportunities: companies with at least one fresh hot signal
    // AND last_researched_at older than 21 days. We surface them for manual
    // follow-up rather than hammering the API.
    const stale = new Date(now.getTime() - 21 * 24 * 60 * 60 * 1000).toISOString()
    const { data: stalish } = await supabase
      .from('companies')
      .select('id, name, industry, country, last_researched_at, news_updates(impact_level, created_at)')
      .lt('last_researched_at', stale)
      .limit(60)

    const candidates = (stalish || []).map((c: any) => {
      const recent = (c.news_updates || []).filter((n: any) => n.created_at >= cutoff && (n.impact_level === 'High' || n.impact_level === 'Medium')).length
      return { ...c, recent }
    }).filter((c: any) => c.recent > 0).sort((a: any, b: any) => b.recent - a.recent)

    topLookalikes = candidates.slice(0, 3)
  } catch (e) {
    console.error('[digest] data fetch failed', e)
  }

  if (topHot.length === 0 && topWmsChanges.length === 0 && topLookalikes.length === 0) {
    console.log('[digest] no content to send for', weekRange)
    return NextResponse.json({ skipped: true, reason: 'no content', weekRange })
  }

  const html = renderEmail({ weekRange, topHot, topWmsChanges, topLookalikes })

  const apiKey = process.env.RESEND_API_KEY
  const recipientsRaw = process.env.DIGEST_RECIPIENTS || ''
  const recipients = recipientsRaw.split(',').map(s => s.trim()).filter(Boolean)

  if (!apiKey) {
    console.log('[digest] RESEND_API_KEY missing — skipping send')
    return NextResponse.json({ skipped: true, reason: 'missing RESEND_API_KEY', weekRange, preview: { topHot: topHot.length, topWmsChanges: topWmsChanges.length, topLookalikes: topLookalikes.length } })
  }
  if (recipients.length === 0) {
    console.log('[digest] DIGEST_RECIPIENTS empty — skipping send')
    return NextResponse.json({ skipped: true, reason: 'missing DIGEST_RECIPIENTS', weekRange })
  }

  const fromAddress = process.env.DIGEST_FROM || 'WMS Intelligence <onboarding@resend.dev>'

  try {
    const resend = new Resend(apiKey)
    const subject = `WMS Intelligence Digest · ${weekRange}`
    const { data, error } = await resend.emails.send({
      from: fromAddress,
      to: recipients,
      subject,
      html,
    })
    if (error) {
      console.error('[digest] resend error', error)
      return NextResponse.json({ skipped: true, reason: `resend error: ${error.message || 'unknown'}`, weekRange })
    }
    return NextResponse.json({ ok: true, weekRange, sent_to: recipients.length, message_id: data?.id || null })
  } catch (e: any) {
    console.error('[digest] send threw', e)
    return NextResponse.json({ skipped: true, reason: `send threw: ${e?.message || 'unknown'}`, weekRange })
  }
}

function fmtDate(d: Date): string {
  return d.toISOString().slice(0, 10)
}

function escape(s: any): string {
  return String(s == null ? '' : s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}

function renderEmail({ weekRange, topHot, topWmsChanges, topLookalikes }: { weekRange: string, topHot: any[], topWmsChanges: any[], topLookalikes: any[] }): string {
  const cream = '#FAF6EE'
  const navy = '#0E1A33'
  const yellow = '#F2C94C'
  const teal = '#2DA89A'
  const muted = '#5A6478'
  const border = '#E6DECB'
  const fontStack = "'Inter', 'Helvetica Neue', Helvetica, Arial, sans-serif"

  const renderHotRow = (n: any) => `
    <tr>
      <td style="padding:14px 16px;border-bottom:1px solid ${border};vertical-align:top;">
        <div style="font-weight:600;color:${navy};font-size:15px;line-height:1.35;">${escape(n.companies?.name || 'Unknown company')}</div>
        <div style="color:${muted};font-size:12px;margin-top:2px;">${escape(n.signal_type || 'signal')} · ${escape(n.impact_level || '')} · ${escape((n.published_at || n.created_at || '').slice(0, 10))}</div>
        <div style="color:${navy};font-size:14px;margin-top:6px;line-height:1.5;">${escape(n.title || '')}</div>
        ${n.summary ? `<div style="color:${muted};font-size:13px;margin-top:6px;line-height:1.5;">${escape(String(n.summary).slice(0, 320))}</div>` : ''}
      </td>
    </tr>`

  const renderWmsRow = (n: any) => `
    <tr>
      <td style="padding:14px 16px;border-bottom:1px solid ${border};vertical-align:top;">
        <div style="font-weight:600;color:${navy};font-size:15px;">${escape(n.companies?.name || 'Unknown company')}</div>
        <div style="color:${teal};font-size:13px;margin-top:2px;">→ ${escape(n.proposed_wms_system || n.signal_type || 'WMS change')}</div>
        ${n.summary ? `<div style="color:${muted};font-size:13px;margin-top:6px;line-height:1.5;">${escape(String(n.summary).slice(0, 280))}</div>` : ''}
      </td>
    </tr>`

  const renderLookalike = (c: any) => `
    <tr>
      <td style="padding:14px 16px;border-bottom:1px solid ${border};vertical-align:top;">
        <div style="font-weight:600;color:${navy};font-size:15px;">${escape(c.name)}</div>
        <div style="color:${muted};font-size:12px;margin-top:2px;">${escape([c.industry, c.country].filter(Boolean).join(' · '))} · ${c.recent} hot signals · last researched ${escape(String(c.last_researched_at || '').slice(0, 10) || 'never')}</div>
      </td>
    </tr>`

  const section = (title: string, rows: string, emptyMsg: string) => `
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background:#ffffff;border:1px solid ${border};border-radius:8px;margin-bottom:18px;">
      <tr>
        <td style="padding:14px 16px;background:${navy};color:${cream};border-radius:8px 8px 0 0;">
          <div style="font-family:${fontStack};font-size:15px;font-weight:600;letter-spacing:0.2px;">${title}</div>
        </td>
      </tr>
      ${rows || `<tr><td style="padding:18px 16px;color:${muted};font-family:${fontStack};font-size:13px;">${emptyMsg}</td></tr>`}
    </table>`

  return `<!doctype html>
<html><body style="margin:0;padding:0;background:${cream};">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background:${cream};">
  <tr>
    <td align="center" style="padding:24px 12px;">
      <table role="presentation" width="640" cellpadding="0" cellspacing="0" border="0" style="max-width:640px;width:100%;font-family:${fontStack};color:${navy};">
        <tr>
          <td style="padding:0 0 16px 0;">
            <div style="font-size:11px;letter-spacing:1.4px;text-transform:uppercase;color:${muted};">swi-tch · WMS Intelligence</div>
            <div style="font-size:24px;font-weight:700;color:${navy};margin-top:6px;">Weekly Digest</div>
            <div style="font-size:13px;color:${muted};margin-top:4px;">${escape(weekRange)}</div>
            <div style="height:3px;background:${yellow};width:64px;margin-top:12px;border-radius:2px;"></div>
          </td>
        </tr>
        <tr><td>
          ${section('Top hot signals (last 7 days)', topHot.map(renderHotRow).join(''), 'No High/Medium signals this week.')}
          ${section('New WMS changes detected', topWmsChanges.map(renderWmsRow).join(''), 'No new WMS migrations spotted.')}
          ${section('Lookalike opportunities (stale + active)', topLookalikes.map(renderLookalike).join(''), 'No stale companies with active signals.')}
          <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
            <tr>
              <td align="center" style="padding:8px 0 16px 0;">
                <a href="${escape(APP_URL)}" style="display:inline-block;padding:10px 18px;background:${teal};color:${cream};text-decoration:none;border-radius:6px;font-size:13px;font-weight:600;">Open dashboard</a>
              </td>
            </tr>
          </table>
          <div style="font-size:11px;color:${muted};text-align:center;padding:8px 0 0 0;">Sent automatically every Monday morning. Reply to opt out.</div>
        </td></tr>
      </table>
    </td>
  </tr>
</table>
</body></html>`
}
