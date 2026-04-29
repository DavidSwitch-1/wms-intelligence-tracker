'use client'
import React, { useEffect, useRef, useCallback, ReactNode, CSSProperties } from 'react'
import { X } from 'lucide-react'
import { DS, focusRing, transition, useViewport } from '@/lib/design'

/* ============================================================
 * Brand palette — kept as a const here so primitives don't depend
 * on app/page.tsx `const C`. Must mirror that palette exactly.
 * ============================================================ */
export const PALETTE = {
  cream: '#FAF9F5',
  paper: '#FFFFFF',
  navy: '#0B1C37',
  navyMute: '#1F3056',
  yellow: '#FECC01',
  yellowDeep: '#E0B400',
  teal: '#0E7C7B',
  ink: '#0B1C37',
  inkMute: '#5C6376',
  inkSoft: '#8A8F9E',
  border: '#E8E5DD',
  borderSoft: '#F0EEE6',
  danger: '#B23A48',
  dangerSoft: '#F8E1E4',
  success: '#0E7C7B',
  warn: '#B7791F',
}

/* ============================================================
 * Button
 * ============================================================ */
export type ButtonVariant = 'primary' | 'secondary' | 'tertiary' | 'ghost' | 'danger' | 'plain'
export type ButtonSize = 'sm' | 'md' | 'lg'

interface ButtonProps extends Omit<React.ButtonHTMLAttributes<HTMLButtonElement>, 'size'> {
  variant?: ButtonVariant
  size?: ButtonSize
  leftIcon?: ReactNode
  rightIcon?: ReactNode
  kbd?: string
  loading?: boolean
  fullWidth?: boolean
  children?: ReactNode
}

export function Button({
  variant = 'secondary',
  size = 'md',
  leftIcon,
  rightIcon,
  kbd,
  loading,
  fullWidth,
  disabled,
  style,
  children,
  ...rest
}: ButtonProps) {
  const { isMobile } = useViewport()
  const sizes = {
    sm: { px: 10, py: 6, fz: DS.type.xs, gap: 6, h: 28 },
    md: { px: 14, py: 8, fz: DS.type.sm, gap: 8, h: 36 },
    lg: { px: 18, py: 12, fz: DS.type.base, gap: 10, h: 44 },
  } as const
  const s = sizes[size]

  const variants: Record<ButtonVariant, CSSProperties> = {
    primary: { background: PALETTE.yellow, color: PALETTE.navy, border: '1px solid ' + PALETTE.yellow },
    secondary: { background: PALETTE.paper, color: PALETTE.navy, border: '1px solid ' + PALETTE.border },
    tertiary: { background: 'transparent', color: PALETTE.navy, border: '1px solid transparent' },
    ghost: { background: 'transparent', color: PALETTE.navy, border: '1px solid transparent' },
    danger: { background: PALETTE.dangerSoft, color: PALETTE.danger, border: '1px solid ' + PALETTE.danger },
    plain: {},
  }
  const isIconOnly = !children && !!(leftIcon || rightIcon)
  const minTouch = isMobile ? 44 : s.h
  const composed: CSSProperties = variant === 'plain'
    ? { ...style }
    : {
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: s.gap,
    padding: isIconOnly ? 0 : (s.py + 'px ' + s.px + 'px'),
    width: isIconOnly ? minTouch : (fullWidth ? '100%' : undefined),
    minHeight: minTouch,
    minWidth: isIconOnly ? minTouch : undefined,
    fontSize: s.fz,
    fontWeight: variant === 'primary' ? DS.type.weight.bold : DS.type.weight.semi,
    fontFamily: 'inherit',
    letterSpacing: 0,
    borderRadius: DS.radius.md,
    cursor: (disabled || loading) ? 'not-allowed' : 'pointer',
    opacity: disabled ? 0.5 : 1,
    transition: transition('background, color, border-color, transform, box-shadow, opacity'),
    whiteSpace: 'nowrap',
    ...variants[variant],
    ...style,
  }
  return (
    <button
      {...rest}
      disabled={disabled || loading}
      style={composed}
      onFocus={(e) => { Object.assign(e.currentTarget.style, focusRing); rest.onFocus?.(e) }}
      onBlur={(e) => { e.currentTarget.style.outline = 'none'; e.currentTarget.style.boxShadow = 'none'; rest.onBlur?.(e) }}
      onMouseEnter={(e) => {
        if (disabled || loading) return
        if (variant === 'plain') { rest.onMouseEnter?.(e); return }
        const el = e.currentTarget
        if (variant === 'primary') el.style.background = PALETTE.yellowDeep
        else if (variant === 'secondary') el.style.background = PALETTE.cream
        else if (variant === 'tertiary' || variant === 'ghost') el.style.background = PALETTE.cream
        else if (variant === 'danger') el.style.background = '#F0CDD3'
        rest.onMouseEnter?.(e)
      }}
      onMouseLeave={(e) => {
        if (variant === 'plain') { rest.onMouseLeave?.(e); return }
        const el = e.currentTarget
        el.style.background = (variants[variant].background as string) || 'transparent'
        rest.onMouseLeave?.(e)
      }}
    >
      {loading ? <Spinner size={Math.round(s.fz)} /> : leftIcon}
      {children}
      {rightIcon && !loading ? rightIcon : null}
      {kbd && !isMobile ? (
        <span
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
            minWidth: 18,
            height: 18,
            marginLeft: 4,
            padding: '0 4px',
            fontSize: 10,
            fontWeight: 600,
            lineHeight: 1,
            color: PALETTE.inkMute,
            background: PALETTE.cream,
            border: '1px solid ' + PALETTE.border,
            borderRadius: 4,
            fontFamily: 'inherit',
            textTransform: 'uppercase',
          }}
        >
          {kbd}
        </span>
      ) : null}
    </button>
  )
}

function Spinner({ size = 12 }: { size?: number }) {
  return (
    <span
      aria-hidden
      style={{
        width: size,
        height: size,
        borderRadius: '50%',
        border: '2px solid rgba(11,28,55,0.2)',
        borderTopColor: PALETTE.navy,
        display: 'inline-block',
        animation: 'wmsspin 0.7s linear infinite',
      }}
    />
  )
}

/* ============================================================
 * Pill — used everywhere (vendor, signal, freshness, 3PL).
 * ============================================================ */
export type PillVariant = 'neutral' | 'info' | 'warning' | 'success' | 'danger' | 'brand' | 'custom'

interface PillProps {
  variant?: PillVariant
  size?: 'sm' | 'md'
  bg?: string
  fg?: string
  borderColor?: string
  leftIcon?: ReactNode
  children: ReactNode
  style?: CSSProperties
  title?: string
  onClick?: () => void
}

export function Pill({
  variant = 'neutral',
  size = 'md',
  bg,
  fg,
  borderColor,
  leftIcon,
  children,
  style,
  title,
  onClick,
}: PillProps) {
  const palette: Record<PillVariant, { bg: string; fg: string; bd: string }> = {
    neutral: { bg: PALETTE.cream, fg: PALETTE.inkMute, bd: PALETTE.border },
    info:    { bg: '#EAF1F1', fg: PALETTE.teal, bd: '#CFE0DF' },
    warning: { bg: '#FEF6DB', fg: '#9C6B0F', bd: '#F4DDA0' },
    success: { bg: '#E2F1EE', fg: PALETTE.success, bd: '#BFE1DA' },
    danger:  { bg: PALETTE.dangerSoft, fg: PALETTE.danger, bd: '#ECC4CB' },
    brand:   { bg: '#FFF4C2', fg: PALETTE.navy, bd: '#F5DD7B' },
    custom:  { bg: bg || PALETTE.cream, fg: fg || PALETTE.inkMute, bd: borderColor || PALETTE.border },
  }
  const p = variant === 'custom'
    ? { bg: bg || palette.custom.bg, fg: fg || palette.custom.fg, bd: borderColor || palette.custom.bd }
    : palette[variant]
  const sizes = {
    sm: { fz: 10, py: 2, px: 6, gap: 4 },
    md: { fz: 11, py: 3, px: 8, gap: 5 },
  } as const
  const s = sizes[size]
  return (
    <span
      title={title}
      onClick={onClick}
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: s.gap,
        padding: s.py + 'px ' + s.px + 'px',
        fontSize: s.fz,
        fontWeight: 600,
        letterSpacing: 0.2,
        textTransform: 'uppercase',
        color: p.fg,
        background: p.bg,
        border: '1px solid ' + p.bd,
        borderRadius: DS.radius.pill,
        whiteSpace: 'nowrap',
        cursor: onClick ? 'pointer' : 'default',
        transition: transition('background, color, border-color'),
        ...style,
      }}
    >
      {leftIcon}
      {children}
    </span>
  )
}

/* ============================================================
 * Card
 * ============================================================ */
export function Card({
  variant = 'default',
  children,
  style,
  padding,
  onClick,
}: {
  variant?: 'default' | 'inset' | 'elevated'
  padding?: number
  children: ReactNode
  style?: CSSProperties
  onClick?: () => void
}) {
  const map: Record<string, CSSProperties> = {
    default: { background: PALETTE.paper, border: DS.border.hair, boxShadow: DS.shadow.sm },
    inset:   { background: PALETTE.cream, border: DS.border.soft },
    elevated:{ background: PALETTE.paper, border: DS.border.hair, boxShadow: DS.shadow.md },
  }
  return (
    <div
      onClick={onClick}
      style={{
        borderRadius: DS.radius.lg,
        padding: padding ?? DS.space[5],
        transition: transition('box-shadow, border-color, background'),
        cursor: onClick ? 'pointer' : 'default',
        ...map[variant],
        ...style,
      }}
    >
      {children}
    </div>
  )
}

/* ============================================================
 * Modal — sheet on mobile, centered on desktop.
 * ============================================================ */
export function Modal({
  isOpen,
  onClose,
  title,
  size = 'md',
  children,
  footer,
  hideClose,
}: {
  isOpen: boolean
  onClose: () => void
  title?: ReactNode
  size?: 'sm' | 'md' | 'lg' | 'sheet'
  children: ReactNode
  footer?: ReactNode
  hideClose?: boolean
}) {
  const { isMobile } = useViewport()
  const dialogRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!isOpen) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', onKey)
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      window.removeEventListener('keydown', onKey)
      document.body.style.overflow = prev
    }
  }, [isOpen, onClose])

  if (!isOpen) return null

  const sheetMode = isMobile || size === 'sheet'
  const widths: Record<string, number | string> = {
    sm: 420, md: 560, lg: 800, sheet: '100%',
  }
  const overlay: CSSProperties = {
    position: 'fixed',
    inset: 0,
    background: 'rgba(11,28,55,0.5)',
    backdropFilter: 'blur(2px)',
    zIndex: 5000,
    display: 'flex',
    alignItems: sheetMode ? 'flex-end' : 'center',
    justifyContent: 'center',
    padding: sheetMode ? 0 : 24,
    animation: 'wmsfade 200ms cubic-bezier(0.4,0,0.2,1)',
  }
  const dialogStyle: CSSProperties = sheetMode
    ? {
        width: '100%',
        maxHeight: '92vh',
        background: PALETTE.paper,
        borderTopLeftRadius: 16,
        borderTopRightRadius: 16,
        display: 'flex',
        flexDirection: 'column',
        animation: 'wmsslide 240ms cubic-bezier(0.4,0,0.2,1)',
        paddingBottom: 'env(safe-area-inset-bottom)',
      }
    : {
        width: '100%',
        maxWidth: widths[size] as number,
        maxHeight: '88vh',
        background: PALETTE.paper,
        borderRadius: 12,
        boxShadow: DS.shadow.lg,
        display: 'flex',
        flexDirection: 'column',
        animation: 'wmsslide 200ms cubic-bezier(0.4,0,0.2,1)',
      }
  return (
    <div
      style={overlay}
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onClose()
      }}
    >
      <div ref={dialogRef} style={dialogStyle}>
        {sheetMode && (
          <div style={{ display: 'flex', justifyContent: 'center', paddingTop: 8 }}>
            <div style={{ width: 36, height: 4, background: PALETTE.border, borderRadius: 999 }} />
          </div>
        )}
        {(title || !hideClose) && (
          <div style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '14px 18px 12px',
            borderBottom: DS.border.hair,
            gap: 12,
          }}>
            <div style={{ fontSize: DS.type.lg, fontWeight: DS.type.weight.bold, color: PALETTE.navy }}>
              {title}
            </div>
            {!hideClose && (
              <button
                aria-label="Close"
                onClick={onClose}
                style={{
                  width: 32, height: 32,
                  display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                  background: 'transparent',
                  border: 'none',
                  borderRadius: 6,
                  cursor: 'pointer',
                  color: PALETTE.inkMute,
                  transition: transition('background, color'),
                }}
                onMouseEnter={(e) => { e.currentTarget.style.background = PALETTE.cream; e.currentTarget.style.color = PALETTE.navy }}
                onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = PALETTE.inkMute }}
              >
                <X size={18} />
              </button>
            )}
          </div>
        )}
        <div style={{ flex: 1, overflow: 'auto', padding: 18 }}>{children}</div>
        {footer && (
          <div style={{
            padding: '12px 18px',
            borderTop: DS.border.hair,
            background: PALETTE.cream,
            display: 'flex',
            gap: 8,
            justifyContent: 'flex-end',
          }}>{footer}</div>
        )}
      </div>
    </div>
  )
}

/* ============================================================
 * Input
 * ============================================================ */
interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string
  hint?: string
  error?: string
  leftIcon?: ReactNode
  rightIcon?: ReactNode
}
export function Input({
  label, hint, error, leftIcon, rightIcon, style, ...rest
}: InputProps) {
  const hasError = !!error
  return (
    <label style={{ display: 'block' }}>
      {label && (
        <span style={{
          display: 'block',
          fontSize: 11,
          fontWeight: 600,
          letterSpacing: 0.4,
          textTransform: 'uppercase',
          color: PALETTE.inkMute,
          marginBottom: 6,
        }}>{label}</span>
      )}
      <span style={{
        position: 'relative',
        display: 'flex',
        alignItems: 'center',
        background: PALETTE.paper,
        border: '1px solid ' + (hasError ? PALETTE.danger : PALETTE.border),
        borderRadius: 8,
        transition: transition('border-color, background, box-shadow'),
      }}>
        {leftIcon && (
          <span style={{ paddingLeft: 12, color: PALETTE.inkSoft, display: 'inline-flex' }}>{leftIcon}</span>
        )}
        <input
          {...rest}
          style={{
            flex: 1,
            padding: '10px 12px',
            background: 'transparent',
            border: 'none',
            outline: 'none',
            color: PALETTE.navy,
            fontSize: 13,
            fontFamily: 'inherit',
            ...style,
          }}
          onFocus={(e) => {
            const wrap = e.currentTarget.parentElement as HTMLElement
            if (wrap) {
              wrap.style.background = PALETTE.cream
              wrap.style.boxShadow = DS.shadow.focus
              wrap.style.borderColor = PALETTE.yellow
            }
            rest.onFocus?.(e)
          }}
          onBlur={(e) => {
            const wrap = e.currentTarget.parentElement as HTMLElement
            if (wrap) {
              wrap.style.background = PALETTE.paper
              wrap.style.boxShadow = 'none'
              wrap.style.borderColor = hasError ? PALETTE.danger : PALETTE.border
            }
            rest.onBlur?.(e)
          }}
        />
        {rightIcon && (
          <span style={{ paddingRight: 12, color: PALETTE.inkSoft, display: 'inline-flex' }}>{rightIcon}</span>
        )}
      </span>
      {(hint || error) && (
        <span style={{
          display: 'block',
          marginTop: 4,
          fontSize: 11,
          color: hasError ? PALETTE.danger : PALETTE.inkSoft,
        }}>
          {error || hint}
        </span>
      )}
    </label>
  )
}

/* ============================================================
 * Skeleton
 * ============================================================ */
export function Skeleton({
  variant = 'line',
  width,
  height,
  style,
}: {
  variant?: 'text' | 'card' | 'avatar' | 'line'
  width?: number | string
  height?: number | string
  style?: CSSProperties
}) {
  const variants: Record<string, CSSProperties> = {
    text: { width: width ?? '60%', height: height ?? 14, borderRadius: 4 },
    line: { width: width ?? '100%', height: height ?? 12, borderRadius: 4 },
    card: { width: width ?? '100%', height: height ?? 120, borderRadius: 8 },
    avatar: { width: width ?? 32, height: height ?? 32, borderRadius: '50%' },
  }
  return (
    <span
      aria-hidden
      style={{
        display: 'inline-block',
        background: 'linear-gradient(90deg,#F5F2EA 0%,#ECE7DA 50%,#F5F2EA 100%)',
        backgroundSize: '200% 100%',
        animation: 'wmsshimmer 1.6s ease-in-out infinite',
        ...variants[variant],
        ...style,
      }}
    />
  )
}

/* ============================================================
 * EmptyState
 * ============================================================ */
export function EmptyState({
  icon,
  title,
  body,
  action,
}: {
  icon?: ReactNode
  title: string
  body?: string
  action?: ReactNode
}) {
  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      textAlign: 'center',
      padding: 32,
      gap: 12,
    }}>
      {icon && (
        <div style={{
          width: 56, height: 56,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          background: PALETTE.cream,
          border: DS.border.hair,
          borderRadius: 999,
          color: PALETTE.inkMute,
        }}>{icon}</div>
      )}
      <div style={{ fontSize: 16, fontWeight: 700, color: PALETTE.navy }}>{title}</div>
      {body && (
        <div style={{ fontSize: 13, color: PALETTE.inkMute, maxWidth: 380, lineHeight: 1.5 }}>{body}</div>
      )}
      {action && <div style={{ marginTop: 4 }}>{action}</div>}
    </div>
  )
}

/* ============================================================
 * Global keyframes — injected once via a small <style> emitter.
 * Mounted near the top of the page to make all primitives animate.
 * ============================================================ */
export function PrimitivesGlobalStyles() {
  return (
    <style>{`
      @keyframes wmsspin { to { transform: rotate(360deg); } }
      @keyframes wmsshimmer { 0% { background-position: -200% 0; } 100% { background-position: 200% 0; } }
      @keyframes wmsfade { from { opacity: 0; } to { opacity: 1; } }
      @keyframes wmsslide { from { opacity: 0; transform: translateY(12px); } to { opacity: 1; transform: translateY(0); } }
      @keyframes wmssheet { from { transform: translateY(100%); } to { transform: translateY(0); } }
      @keyframes wmstabfade { from { opacity: 0; } to { opacity: 1; } }
    `}</style>
  )
}

/* ============================================================
 * Vendor pill helper — preserves recruiter mental models.
 * ============================================================ */
export function VendorPill({ vendor }: { vendor?: string | null }) {
  const v = (vendor || 'unknown').toLowerCase()
  const styles: Record<string, { bg: string; fg: string; bd: string; label: string }> = {
    manhattan:    { bg: '#FCE0E2', fg: '#A8252F', bd: '#F2B7BC', label: 'Manhattan' },
    blue_yonder:  { bg: '#DDF1E3', fg: '#1F6B3A', bd: '#B8DEC4', label: 'Blue Yonder' },
    'blue yonder':{ bg: '#DDF1E3', fg: '#1F6B3A', bd: '#B8DEC4', label: 'Blue Yonder' },
    korber:       { bg: '#E2E7F2', fg: '#1F3066', bd: '#C2CCE0', label: 'Körber' },
    'körber':     { bg: '#E2E7F2', fg: '#1F3066', bd: '#C2CCE0', label: 'Körber' },
    sap:          { bg: '#E0EEF8', fg: '#0A57A0', bd: '#BAD7EE', label: 'SAP' },
    other:        { bg: '#F0EEE6', fg: '#5C6376', bd: '#E0DBC9', label: 'Other' },
    unknown:      { bg: '#F0EEE6', fg: '#8A8F9E', bd: '#E0DBC9', label: 'Unknown' },
  }
  const s = styles[v] || styles.unknown
  return (
    <Pill variant="custom" bg={s.bg} fg={s.fg} borderColor={s.bd}>{s.label}</Pill>
  )
}
