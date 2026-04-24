import { NextRequest, NextResponse } from 'next/server'

// Password-protect the app. Correct password sets a long-lived cookie
// that the middleware checks on every request.
//
// The password is compared server-side. The cookie is httpOnly so it
// can't be read from JS.

const PASSWORD = process.env.APP_PASSWORD || 'WAREHOUSE'
const COOKIE_NAME = 'wms-auth'
const ONE_YEAR = 60 * 60 * 24 * 365

export async function POST(req: NextRequest) {
  const { password } = await req.json().catch(() => ({ password: '' }))

  if (typeof password !== 'string' || password !== PASSWORD) {
    return NextResponse.json({ ok: false }, { status: 401 })
  }

  const res = NextResponse.json({ ok: true })
  res.cookies.set({
    name: COOKIE_NAME,
    value: 'ok',
    httpOnly: true,
    secure: true,
    sameSite: 'lax',
    path: '/',
    maxAge: ONE_YEAR,
  })
  return res
}

export async function DELETE(req: NextRequest) {
  const res = NextResponse.json({ ok: true })
  res.cookies.set({ name: COOKIE_NAME, value: '', path: '/', maxAge: 0 })
  return res
}

