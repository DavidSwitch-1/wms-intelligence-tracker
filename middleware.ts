import { NextRequest, NextResponse } from 'next/server'

// Password gate. Any request without the 'wms-auth' cookie gets redirected
// to /login, except for these paths:
// - /login itself
// - /api/login (so the login form can set the cookie)
// - /api/cron (uses its own Bearer auth for Vercel cron)
// - Next static assets

const COOKIE_NAME = 'wms-auth'

const PUBLIC_PATHS = [
  '/login',
  '/api/login',
  '/api/cron',
]

function isPublic(pathname: string): boolean {
  if (PUBLIC_PATHS.some(p => pathname === p || pathname.startsWith(p + '/'))) return true
  if (pathname.startsWith('/_next/')) return true
  if (pathname === '/favicon.ico' || pathname === '/robots.txt') return true
  return false
}

export function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl
  if (isPublic(pathname)) return NextResponse.next()

  const token = req.cookies.get(COOKIE_NAME)?.value
  if (token === 'ok') return NextResponse.next()

  const url = req.nextUrl.clone()
  url.pathname = '/login'
  url.searchParams.set('next', pathname)
  return NextResponse.redirect(url)
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
}
