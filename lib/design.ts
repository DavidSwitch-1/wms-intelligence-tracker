'use client'
import { useEffect, useState, useCallback } from 'react'
import type React from 'react'

/**
 * swi-tch design system tokens.
 * The palette below is the single source of truth — `const C` in app/page.tsx
 * mirrors a subset for legacy ergonomics, but new code should reference DS.palette.
 *
 * Design language:
 *   - Cream stage, navy ink, restrained colour.
 *   - Yellow (#FECC01) is reserved for primary CTA, active filter, and the
 *     signature "swi-tch underline" flourish. Never decorative.
 *   - Teal (#0E7C7B) for verified / informational.
 *   - Coral (#E04E4E) for destructive only.
 *   - Vendor pills are 8% tints of the brand colour with a 1px border at
 *     full saturation and neutral navy text.
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
    lift: '0 6px 18px rgba(11,28,55,0.10)',
    focus: '0 0 0 3px rgba(254,204,1,0.4)',
  },
  motion: {
    fast: 'cubic-bezier(0.4, 0, 0.2, 1) 120ms',
    base: 'cubic-bezier(0.4, 0, 0.2, 1) 200ms',
    slow: 'cubic-bezier(0.4, 0, 0.2, 1) 320ms',
    spring: 'cubic-bezier(0.34, 1.56, 0.64, 1) 240ms',
  },
  bp: { mobile: 640, tablet: 1024, desktop: 1280 },
}

/**
 * Typography system. Apply via spread:
 *   <h1 style={{ ...T.hero, color: P.ink }}>Companies</h1>
 *
 * Sizes are deliberate. Hero is the page title, section is the small caps
 * "EMAILS"-style header, body covers prose, caption is for muted meta.
 */
export const T = {
  hero: {
    fontSize: 32,
    fontWeight: 800,
    letterSpacing: '-0.02em',
    lineHeight: 1.1,
  } as React.CSSProperties,
  display: {
    fontSize: 28,
    fontWeight: 800,
    letterSpacing: '-0.015em',
    lineHeight: 1.15,
  } as React.CSSProperties,
  subheading: {
    fontSize: 18,
    fontWeight: 600,
    letterSpacing: '-0.005em',
    lineHeight: 1.3,
  } as React.CSSProperties,
  section: {
    fontSize: 11,
    fontWeight: 700,
    letterSpacing: '0.08em',
    textTransform: 'uppercase' as const,
    lineHeight: 1.2,
  } as React.CSSProperties,
  body: {
    fontSize: 13,
    fontWeight: 400,
    lineHeight: 1.5,
  } as React.CSSProperties,
  bodyStrong: {
    fontSize: 13,
    fontWeight: 600,
    lineHeight: 1.5,
  } as React.CSSProperties,
  caption: {
    fontSize: 11,
    fontWeight: 500,
    lineHeight: 1.4,
  } as React.CSSProperties,
  captionStrong: {
    fontSize: 11,
    fontWeight: 600,
    letterSpacing: '0.04em',
    lineHeight: 1.4,
  } as React.CSSProperties,
  kpi: {
    fontSize: 40,
    fontWeight: 800,
    letterSpacing: '-0.02em',
    lineHeight: 1,
  } as React.CSSProperties,
  prose: {
    fontSize: 15,
    fontWeight: 400,
    lineHeight: 1.7,
    letterSpacing: '0',
  } as React.CSSProperties,
  mono: {
    fontFamily: 'ui-monospace, SFMono-Regular, Menlo, Consolas, monospace',
    fontSize: 12,
  } as React.CSSProperties,
}

/**
 * Refined palette. Role-restricted colour: yellow for CTA + signature, teal for
 * verified, coral for destructive. Vendor brand colours come with subtle tint
 * + crisp border + navy text — never used as a saturated full-fill pill.
 */
export const P = {
  // Surfaces
  cream: '#FAF9F5',
  surface: '#FFFFFF',
  surfaceAlt: '#F5F4EE',
  surfaceMuted: '#F0EEE6',
  hairline: '#E8E5DD',
  hairlineHov: '#D4D0C5',

  // Ink
  ink: '#0B1C37',
  inkSub: '#475569',
  inkMuted: '#94A3B8',
  inkSoft: '#64748B',

  // Signature accents (sparingly)
  yellow: '#FECC01',
  yellowSoft: '#FFF5C2',
  yellowDeep: '#B8860B',

  // Verified / info
  teal: '#0E7C7B',
  tealTint: 'rgba(14,124,123,0.08)',
  tealBorder: 'rgba(14,124,123,0.55)',

  // Destructive
  coral: '#E04E4E',
  coralTint: 'rgba(224,78,78,0.08)',
  coralBorder: 'rgba(224,78,78,0.45)',

  // Vendor brand-marks (used only for tint + border, never full-fill)
  vendor: {
    manhattan: '#C4392B',
    blueYonder: '#0E7C7B',
    korber: '#D14679',
    sap: '#1481B8',
    oracle: '#7A6EE8',
    other: '#6B7280',
    unknown: '#94A3B8',
  },
} as const

/**
 * vendorTint(brand) → CSS for a refined vendor pill.
 * 8% tint background, 1px border in brand hue, neutral navy text.
 */
export function vendorTint(brand: string | null | undefined): {
  bg: string; border: string; fg: string; brand: string;
} {
  const v = (brand || '').toLowerCase()
  let mark: string = P.vendor.unknown
  if (v.includes('manhattan')) mark = P.vendor.manhattan
  else if (v.includes('blue yonder') || v.includes('blueyonder')) mark = P.vendor.blueYonder
  else if (v.includes('körber') || v.includes('korber')) mark = P.vendor.korber
  else if (v.includes('sap')) mark = P.vendor.sap
  else if (v.includes('oracle')) mark = P.vendor.oracle
  else if (brand) mark = P.vendor.other
  return {
    bg: hexToTint(mark, 0.08),
    border: hexToTint(mark, 0.55),
    fg: P.ink,
    brand: mark,
  }
}

/** Convert a #RRGGBB to rgba(r,g,b,a) */
export function hexToTint(hex: string, alpha = 0.08): string {
  const m = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex)
  if (!m) return `rgba(11,28,55,${alpha})`
  const r = parseInt(m[1], 16), g = parseInt(m[2], 16), b = parseInt(m[3], 16)
  return `rgba(${r},${g},${b},${alpha})`
}

/**
 * Signature flourish — the swi-tch yellow underline. Used on:
 *   - Active tab indicator (2px under the label)
 *   - Page heading rule (4px segment, 64px wide, sits below the heading)
 *   - Primary CTA hover state (animated 2px underline grows in)
 */
export const SIG = {
  underline: {
    height: 2,
    color: P.yellow,
  },
  headingRule: {
    width: 64,
    height: 4,
    radius: 2,
    color: P.yellow,
    marginTop: 12,
  },
  activeTab: {
    height: 2,
    radius: 1,
    color: P.yellow,
  },
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
export const cssVar = (name: string, fallback?: string) =>
  fallback ? `var(--${name}, ${fallback})` : `var(--${name})`

/**
 * hairline — convenience: 1px DS.border.hair as bottom or top.
 */
export const hairline = {
  bottom: { borderBottom: DS.border.hair } as React.CSSProperties,
  top: { borderTop: DS.border.hair } as React.CSSProperties,
}

/**
 * clamp — utility for fluid type/spacing. Returns a CSS clamp() string.
 */
export const clamp = (min: number, pref: string, max: number) =>
  `clamp(${min}px, ${pref}, ${max}px)`

/**
 * focusRing — consistent focus visuals.
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
 * useThrottledCallback — basic rAF throttle for callbacks where a full
 * scroll listener is involved beyond useViewport.
 */
export function useThrottledCallback<T extends (...args: any[]) => void>(fn: T, ms = 16) {
  const [busy, setBusy] = useState(false)
  return useCallback(
    (...args: Parameters<T>) => {
      if (busy) return
      setBusy(true)
      fn(...args)
      setTimeout(() => setBusy(false), ms)
    },
    [fn, ms, busy]
  ) as T
}

/**
 * shimmer — keyframes + class names for the skeleton shimmer wave.
 * Inject the keyframes once in app/layout.tsx via a <style> tag.
 */
export const SHIMMER_CSS = `
@keyframes swi-shimmer {
  0% { background-position: -200% 0; }
  100% { background-position: 200% 0; }
}
.swi-shimmer {
  background: linear-gradient(
    90deg,
    rgba(240,238,230,0.6) 0%,
    rgba(255,255,255,0.95) 50%,
    rgba(240,238,230,0.6) 100%
  );
  background-size: 200% 100%;
  animation: swi-shimmer 1.6s ease-in-out infinite;
}
@keyframes swi-modal-in {
  from { opacity: 0; transform: scale(0.96); }
  to   { opacity: 1; transform: scale(1); }
}
.swi-modal-in { animation: swi-modal-in 200ms cubic-bezier(0.4, 0, 0.2, 1); }

@keyframes swi-slide-in {
  from { opacity: 0; transform: translateX(12px); }
  to   { opacity: 1; transform: translateX(0); }
}
.swi-slide-in { animation: swi-slide-in 240ms cubic-bezier(0.4, 0, 0.2, 1); }

@keyframes swi-toast-in {
  from { opacity: 0; transform: translateY(8px); }
  to   { opacity: 1; transform: translateY(0); }
}
.swi-toast-in { animation: swi-toast-in 200ms cubic-bezier(0.4, 0, 0.2, 1); }

.swi-press:active { transform: scale(0.985); }
.swi-lift { transition: transform 160ms cubic-bezier(0.4, 0, 0.2, 1), box-shadow 160ms cubic-bezier(0.4, 0, 0.2, 1); }
.swi-lift:hover { transform: translateY(-1px); }

.swi-cta { transition: transform 120ms cubic-bezier(0.4, 0, 0.2, 1), box-shadow 120ms cubic-bezier(0.4, 0, 0.2, 1); position: relative; }
.swi-cta:hover { transform: scale(1.02); }
.swi-cta:active { transform: scale(0.985); }

.swi-underline-h { position: relative; }
.swi-underline-h::after {
  content: ''; position: absolute; left: 0; bottom: -10px;
  width: 64px; height: 4px; border-radius: 2px; background: #FECC01;
}
`
