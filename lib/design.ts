'use client'
import { useEffect, useState, useCallback } from 'react'

/**
 * swi-tch design system tokens.
 * Brand palette stays in app/page.tsx const C.
 * This file owns layout/typography/motion tokens consumed across the app.
 */
export const DS = {
  type: {
    xs: 11, sm: 12, base: 13, md: 14, lg: 16, xl: 20, xxl: 28, hero: 36,
    weight: { reg: 400, med: 500, semi: 600, bold: 700, black: 800 },
    leading: { tight: 1.15, body: 1.5, loose: 1.7 },
  },
  space: { 0: 0, 1: 4, 2: 8, 3: 12, 4: 16, 5: 20, 6: 24, 7: 32, 8: 40, 9: 56, 10: 72 } as const,
  radius: { sm: 4, md: 6, lg: 8, xl: 12, pill: 999 },
  border: {
    hair: '1px solid #E8E5DD',
    soft: '1px solid #F0EEE6',
    strong: '1px solid #D4D0C5',
  },
  shadow: {
    sm: '0 1px 2px rgba(11,28,55,0.04)',
    md: '0 4px 12px rgba(11,28,55,0.08)',
    lg: '0 12px 32px rgba(11,28,55,0.12)',
    focus: '0 0 0 3px rgba(254,204,1,0.4)',
  },
  motion: {
    fast: 'cubic-bezier(0.4, 0, 0.2, 1) 120ms',
    base: 'cubic-bezier(0.4, 0, 0.2, 1) 200ms',
    slow: 'cubic-bezier(0.4, 0, 0.2, 1) 320ms',
  },
  bp: { mobile: 640, tablet: 1024, desktop: 1280 },
}

/**
 * useViewport — single source of truth for responsive layout.
 * Throttled to ~60fps using rAF.
 */
export function useViewport() {
  const [width, setWidth] = useState<number>(() =>
    typeof window === 'undefined' ? 1280 : window.innerWidth
  )

  useEffect(() => {
    if (typeof window === 'undefined') return
    let raf = 0
    const onResize = () => {
      if (raf) return
      raf = requestAnimationFrame(() => {
        setWidth(window.innerWidth)
        raf = 0
      })
    }
    window.addEventListener('resize', onResize, { passive: true })
    setWidth(window.innerWidth)
    return () => {
      window.removeEventListener('resize', onResize)
      if (raf) cancelAnimationFrame(raf)
    }
  }, [])

  const isMobile = width < DS.bp.mobile
  const isTablet = width >= DS.bp.mobile && width < DS.bp.tablet
  const isDesktop = width >= DS.bp.tablet
  return { width, isMobile, isTablet, isDesktop }
}

/**
 * cssVar — emit a CSS custom property string (helps avoid inline-style typos).
 */
export const cssVar = (name: string, value: string | number) => ({ [`--${name}`]: value } as React.CSSProperties)

/**
 * focusRing — consistent yellow focus ring used by interactive primitives.
 */
export const focusRing: React.CSSProperties = {
  outline: 'none',
  boxShadow: DS.shadow.focus,
}

/**
 * transition helper — apply DS.motion.base to a comma-separated list of properties.
 */
export const transition = (
  props: string,
  speed: keyof typeof DS.motion = 'base'
) => props
  .split(',')
  .map((p) => `${p.trim()} ${DS.motion[speed]}`)
  .join(', ')

/**
 * hairline — convenience: 1px DS.border.hair as bottom or top.
 */
export const hairline = {
  bottom: { borderBottom: DS.border.hair } as React.CSSProperties,
  top: { borderTop: DS.border.hair } as React.CSSProperties,
}

/**
 * clamp — utility for fluid type/spacing if ever needed.
 */
export function clamp(min: number, val: number, max: number) {
  return Math.max(min, Math.min(val, max))
}

/**
 * useThrottledCallback — small throttle helper used in places where
 * a resize/scroll listener is involved beyond useViewport.
 */
export function useThrottledCallback<T extends (...args: any[]) => void>(fn: T, ms = 16) {
  const [busy, setBusy] = useState(false)
  return useCallback(
    (...args: Parameters<T>) => {
      if (busy) return
      setBusy(true)
      fn(...args)
      window.setTimeout(() => setBusy(false), ms)
    },
    [fn, ms, busy]
  ) as T
}
