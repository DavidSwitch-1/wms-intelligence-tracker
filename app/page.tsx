'use client'
import { useState, useEffect, useRef, useCallback } from 'react'
import { createClient } from '@supabase/supabase-js'
import { LayoutDashboard, Database as DatabaseIcon, Sparkles, Newspaper, Plus, RefreshCw, Search, Building2, Briefcase, Hammer, Repeat, Handshake, TrendingUp, UserCog, Zap, ArrowRight, Bot, FileText, Copy, X, Linkedin, MessageCircle, MessageSquare, CheckCircle2, AlertCircle, Users , Map as MapIcon, Truck, Pencil, Star, Share2, BookOpen } from 'lucide-react'

import dynamic from 'next/dynamic'

const MapView = dynamic(() => import('@/components/MapView'), { ssr: false })
import { renderMarkdown } from '@/lib/markdown'
import { useViewport, DS } from '@/lib/design'
import { Button, Pill, Card, Modal, Input as DSInput, Textarea as DSTextarea, Skeleton, EmptyState, VendorPill, PrimitivesGlobalStyles, PALETTE } from '@/components/ui/primitives'
import { VENDORS } from '@/lib/learn/vendors'
import { SECTORS } from '@/lib/learn/sectors'
import { GLOSSARY } from '@/lib/learn/glossary'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL as string,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY as string
)

function localAnswer(message: string, companies: any[]): string | null {
  if (!message) return null
  const msg = String(message).trim()
  function fmt(list: any[], title: string) {
    if (!list || list.length === 0) return null
    const byWms = new Map<string, any[]>()
    for (const c of list) {
      const wms = (c.wms_entries || []).map((w: any) => w.wms_system).filter(Boolean).join(' / ') || 'Unknown'
      if (!byWms.has(wms)) byWms.set(wms, [])
      byWms.get(wms)!.push(c)
    }
    const out: string[] = []
    out.push(`**${list.length} ${list.length === 1 ? 'company' : 'companies'}** matching **${title}** in our database:`)
    out.push('')
    const groups = Array.from(byWms.entries()).sort((a, b) => b[1].length - a[1].length)
    for (const [wms, group] of groups) {
      out.push(`**${wms}** (${group.length})`)
      for (const c of group) {
        const meta = [c.industry, c.country].filter(Boolean).join(' ÃÂÃÂÃÂÃÂ· ')
        out.push(`ÃÂÃÂ¢ÃÂÃÂÃÂÃÂ¢ ${c.name}${meta ? ' ÃÂÃÂ¢ÃÂÃÂÃÂÃÂ ' + meta : ''}`)
      }
      out.push('')
    }
    return out.join('\n').trim()
  }
  function findByWms(t: string) {
    const tl = t.toLowerCase()
    return companies.filter((c: any) => (c.wms_entries || []).some((w: any) =>
      (w.wms_system || '').toLowerCase().includes(tl) ||
      (w.vendor || '').toLowerCase().includes(tl) ||
      (w.version || '').toLowerCase().includes(tl)
    ))
  }
  function clean(s: string) { return s.replace(/[\"']/g, '').replace(/\?+$/, '').replace(/\.\s*$/, '').trim() }
  // 'who uses X' / 'which companies use X' / 'list X users'
  let m: RegExpMatchArray | null = null
  let target: string | null = null
  if ((m = msg.match(/who(?:'s| is)?\s+(?:uses|is\s+(?:using|on)|are\s+(?:using|on)|using)\s+(.+?)\??$/i))) target = m[1]
  else if ((m = msg.match(/(?:which|what)\s+companies?\s+(?:use|are\s+(?:using|on)|run|operate|have)\s+(.+?)\??$/i))) target = m[1]
  else if ((m = msg.match(/(?:list|show|get|give\s+me)\s+(?:all\s+)?(?:the\s+)?(?:companies?\s+)?(?:on|using|with|that\s+use)\s+(.+?)\??$/i))) target = m[1]
  else if ((m = msg.match(/^(?:users?|customers?)\s+of\s+(.+?)\??$/i))) target = m[1]
  if (target) {
    const t = clean(target)
    const tl = t.toLowerCase()
    if (tl === 'unknown' || tl === 'unknown wms' || tl === 'an unknown wms') {
      const unknowns = companies.filter((c: any) => (c.wms_entries || []).some((w: any) => w.wms_system === 'Unknown'))
      return fmt(unknowns, 'Unknown WMS') || 'All ' + companies.length + ' companies have a known WMS ÃÂÃÂ¢ÃÂÃÂÃÂÃÂ research is up to date.'
    }
    const matches = findByWms(t)
    if (matches.length > 0) return fmt(matches, t)
    return 'No companies in our database currently match **' + t + '** (we track ' + companies.length + ' companies). Ask the AI to web-search for fresh candidates instead, e.g. "search the web for companies using ' + t + '".'
  }
  // 'which companies are unknown' / 'show unknowns'
  if (/(?:which|what|list|show|how\s+many).{0,40}\b(?:unknown|no\s+wms|missing\s+wms)\b/i.test(msg)) {
    const unknowns = companies.filter((c: any) => (c.wms_entries || []).some((w: any) => w.wms_system === 'Unknown'))
    if (/how\s+many/i.test(msg)) return '**' + unknowns.length + '** of our ' + companies.length + ' companies have an Unknown WMS and are queued for research.'
    return fmt(unknowns, 'Unknown WMS') || 'All companies have a known WMS ÃÂÃÂ¢ÃÂÃÂÃÂÃÂ research is up to date.'
  }
  // 'how many on X' / 'count of X users'
  if ((m = msg.match(/how\s+many\s+(?:companies\s+)?(?:are\s+)?(?:on|using|use|with|run)\s+(.+?)\??$/i))) {
    const t = clean(m[1])
    const matches = findByWms(t)
    return '**' + matches.length + '** ' + (matches.length === 1 ? 'company uses' : 'companies use') + ' **' + t + '** in our database (of ' + companies.length + ' tracked).'
  }
  // 'tell me about <company>' / 'what does <company> use'
  if ((m = msg.match(/(?:tell\s+me\s+about|info\s+on|profile\s+(?:of|for)|about)\s+(.+?)\??$/i)) ||
      (m = msg.match(/^(?:what|which)\s+wms\s+does\s+(.+?)\s+(?:use|run|operate)\??$/i))) {
    const t = clean(m[1])
    const tl = t.toLowerCase()
    const co = companies.find((c: any) => (c.name || '').toLowerCase() === tl) ||
               companies.find((c: any) => (c.name || '').toLowerCase().includes(tl))
    if (!co) return null
    const wmsLines = (co.wms_entries || []).map((w: any) => {
      const bits = [w.wms_system, w.vendor, w.version, w.site_name].filter(Boolean)
      return 'ÃÂÃÂ¢ÃÂÃÂÃÂÃÂ¢ ' + bits.join(' ÃÂÃÂÃÂÃÂ· ') + (w.status ? ' (' + w.status + ')' : '')
    }).join('\n')
    const newsLines = (co.news_updates || []).slice(0, 3).map((n: any) => 'ÃÂÃÂ¢ÃÂÃÂÃÂÃÂ¢ ' + n.title + (n.published_at ? ' (' + new Date(n.published_at).toLocaleDateString('en-GB') + ')' : '')).join('\n')
    const meta = [co.industry, co.country, co.region].filter(Boolean).join(' ÃÂÃÂÃÂÃÂ· ')
    return '**' + co.name + '**' + (meta ? ' ÃÂÃÂ¢ÃÂÃÂÃÂÃÂ ' + meta : '') + '\n\n**WMS**\n' + (wmsLines || 'ÃÂÃÂ¢ÃÂÃÂÃÂÃÂ¢ No WMS data') + (newsLines ? '\n\n**Recent intel**\n' + newsLines : '')
  }
  return null
}

function timeAgo(iso: string | null | undefined): string | null {
  if (!iso) return null
  const diff = Date.now() - new Date(iso).getTime()
  if (diff < 0) return 'just now'
  const mins = Math.floor(diff / 60000)
  if (mins < 1) return 'just now'
  if (mins < 60) return mins + 'm ago'
  const hours = Math.floor(mins / 60)
  if (hours < 24) return hours + 'h ago'
  const days = Math.floor(hours / 24)
  if (days < 30) return days + 'd ago'
  const months = Math.floor(days / 30)
  if (months < 12) return months + 'mo ago'
  return Math.floor(months / 12) + 'y ago'
}

function signalBadge(t: string | null | undefined) {
  if (!t || t === 'none') return null
  const map: Record<string, { label: string; bg: string; fg: string; bd: string }> = {
    hiring:        { label: 'Hiring',     bg: '#f5f3ff', fg: '#7c3aed', bd: '#ddd6fe' },
    exec_hire:     { label: 'Exec hire',  bg: '#f5f3ff', fg: '#7c3aed', bd: '#ddd6fe' },
    dc_opening:    { label: 'New DC',     bg: '#ecfeff', fg: '#0891b2', bd: '#a5f3fc' },
    wms_migration: { label: 'WMS change', bg: '#eff6ff', fg: '#2563eb', bd: '#bfdbfe' },
    ma:            { label: 'M&A',        bg: '#fffbeb', fg: '#d97706', bd: '#fde68a' },
    growth:        { label: 'Growth',     bg: '#ecfdf5', fg: '#059669', bd: '#a7f3d0' },
  }
  const m = map[t]
  if (!m) return null
  return (
    <span style={{ background: m.bg, color: m.fg, border: `1px solid ${m.bd}`, borderRadius: 20, padding: '2px 9px', fontSize: 11, fontWeight: 600 }}>
      {m.label}
    </span>
  )
}

const C = {
  bg: '#FAF9F5',
  surface: '#FFFFFF',
  surfaceAlt: '#F5F4EE',
  surfaceMuted: '#F0EEE6',
  text: '#0B1C37',
  textSub: '#475569',
  textMuted: '#94A3B8',
  border: '#E8E5DD',
  borderHov: '#D4D0C5',
  blue: '#0E7C7B',
  blueLight: '#EFF8F8',
  blueBorder: '#7CC8C4',
  yellow: '#B8860B',
  yellowLight: '#FFF9E0',
  yellowBorder: '#FECC01',
  purple: '#7c3aed',
  purpleLight: '#f5f3ff',
  purpleBorder: '#ddd6fe',
  green: '#059669',
  greenLight: '#ecfdf5',
  greenBorder: '#a7f3d0',
  red: '#dc2626',
  redLight: '#fef2f2',
  redBorder: '#fecaca',
  amber: '#B8860B',
  amberLight: '#FFF9E0',
  amberBorder: '#FECC01',
  gray: '#475569',
  grayLight: '#F8FAFC',
  grayBorder: '#E2E8F0',
  teal: '#0891b2',
  tealLight: '#ecfeff',
  tealBorder: '#a5f3fc',
}

export default function Home() {
  const [companies, setCompanies]     = useState<any[]>([])
  const [search, setSearch]           = useState('')
  const [filterVendor, setFilterVendor] = useState('All')
  const [messages, setMessages]       = useState<any[]>([
    { role: 'assistant', content: "Hi! I'm your WMS Intelligence Assistant. Ask me anything ÃÂÃÂ¢ÃÂÃÂÃÂÃÂ e.g. \"Who uses Blue Yonder Dispatcher?\", \"What WMS does DHL use?\", or \"Which companies are Unknown?\"." }
  ])
  const [input, setInput]     = useState('')
  const [loading, setLoading] = useState(false)
  const [geocoding, setGeocoding] = useState(false)
  const [geocodeResult, setGeocodeResult] = useState<{ processed: number; geocoded: number; failed: number } | null>(null)
  const [tab, setTab] = useState<'dashboard'|'map'|'db'|'chat'|'add'|'news'|'learn'>('dashboard')
  const [learnView, setLearnView] = useState<'vendors'|'sectors'|'glossary'|'ask'>('vendors')
  const [learnVendorSlug, setLearnVendorSlug] = useState<string|null>(null)
  const [learnSectorSlug, setLearnSectorSlug] = useState<string|null>(null)
  const [learnGlossarySearch, setLearnGlossarySearch] = useState('')
  const [learnAskInput, setLearnAskInput] = useState('')
  const [learnAskAnswer, setLearnAskAnswer] = useState<string|null>(null)
  const [learnAskLoading, setLearnAskLoading] = useState(false)
  const [learnAskCached, setLearnAskCached] = useState(false)
  const [learnAskError, setLearnAskError] = useState<string|null>(null)
  async function submitLearnAsk(qIn: string) {
    const q = qIn.trim()
    if (!q || learnAskLoading) return
    setLearnAskLoading(true); setLearnAskError(null); setLearnAskAnswer(null)
    try {
      const r = await fetch('/api/learn/ask', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ question: q }) })
      const j = await r.json()
      if (!r.ok) throw new Error(j?.error || ('HTTP ' + r.status))
      setLearnAskAnswer(j.answer); setLearnAskCached(!!j.cached)
    } catch (err: any) {
      setLearnAskError(err?.message || 'Request failed')
    } finally {
      setLearnAskLoading(false)
    }
  }
  const { isMobile, isTablet, isDesktop, width: __vpWidth__ } = useViewport()

  function gotoTab(next: 'dashboard'|'map'|'db'|'chat'|'add'|'news'|'learn') {
    setTab(next)
    if (typeof window !== 'undefined') {
      const targetHash = '#/' + next
      if (window.location.hash !== targetHash) window.location.hash = targetHash
    }
  }

  useEffect(() => {
    if (typeof window === 'undefined') return
    const validTabs = ['dashboard','map','db','chat','add','news','learn']
    const sync = () => {
      const h = window.location.hash.replace(/^#\/?/, '')
      const slug = h.split('/')[0]
      if (validTabs.includes(slug)) setTab(slug as any)
    }
    sync()
    window.addEventListener('hashchange', sync)
    return () => window.removeEventListener('hashchange', sync)
  }, [])
  const [mapWmsFilter, setMapWmsFilter] = useState('')
  const [mapCountryFilter, setMapCountryFilter] = useState('')
  const [map3plFilter, setMap3plFilter] = useState('')
  const [filter3pl, setFilter3pl] = useState('')
  const [filterStarred, setFilterStarred] = useState(false)
  const [newCompany3PL, setNewCompany3PL] = useState('')
  const [newCompanyIs3PL, setNewCompanyIs3PL] = useState(false)
  const [newsRecencyFilter, setNewsRecencyFilter] = useState<'12m'|'all'>('12m')
  const [selected, setSelected] = useState<any>(null)
  const [editOpen, setEditOpen] = useState(false)
  const [editForm, setEditForm] = useState<Record<string, any>>({})
  const [editOriginal, setEditOriginal] = useState<Record<string, any>>({})
  const [editSaving, setEditSaving] = useState(false)
  const [editError, setEditError] = useState<string | null>(null)
  const [editSuccess, setEditSuccess] = useState<string | null>(null)
  const [form, setForm]       = useState({ name:'', industry:'', country:'', region:'', wms_system:'', vendor:'', version:'', site_name:'', notes:'' })
  const [saving, setSaving]   = useState(false)
  const [saved, setSaved]     = useState(false)
  const [researching, setResearching] = useState<Record<string,boolean>>({})
  const [researchResults, setResearchResults] = useState<Record<string,string>>({})
  const [lastRefresh, setLastRefresh] = useState<Date | null>(null)
  const [mounted, setMounted] = useState(false)
  const [refreshing, setRefreshing] = useState(false)
  const [showDismissed, setShowDismissed] = useState(false)
  const [newsBusy, setNewsBusy] = useState<Record<string, boolean>>({})
  const [bulkText, setBulkText] = useState('')
  const [bulkIndustry, setBulkIndustry] = useState('')
  const [bulkCountry, setBulkCountry] = useState('')
  const [bulkBusy, setBulkBusy] = useState(false)
  const [bulkResult, setBulkResult] = useState<{ added?: number; skipped?: number; error?: string } | null>(null)
  const [suggestIndustry, setSuggestIndustry] = useState('3PL')
  const [suggestCountry, setSuggestCountry] = useState('United Kingdom')
  const [suggestBusy, setSuggestBusy] = useState(false)
  const [suggestions, setSuggestions] = useState<any[]>([])
  const [suggestError, setSuggestError] = useState('')
  const [addingSuggestion, setAddingSuggestion] = useState<Record<string, boolean>>({})
  const [showBrief, setShowBrief] = useState(false)
  const [briefCompany, setBriefCompany] = useState<any>(null)
  const [briefLoading, setBriefLoading] = useState(false)
  const [briefText, setBriefText] = useState('')
  const [briefError, setBriefError] = useState('')
  const [briefCopied, setBriefCopied] = useState(false)
  const [sharingBrief, setSharingBrief] = useState(false)
  const [shareUrl, setShareUrl] = useState<string | null>(null)
  const [shareCopied, setShareCopied] = useState(false)
  useEffect(() => {
    if (!showBrief) {
      setShareUrl(null)
      setShareCopied(false)
    }
  }, [showBrief])
  const [linkedinModalOpen, setLinkedinModalOpen] = useState(false)
  const [linkedinNewsId, setLinkedinNewsId] = useState<string | null>(null)
  const [linkedinNewsTitle, setLinkedinNewsTitle] = useState('')
  const [linkedinPosts, setLinkedinPosts] = useState<{insightful?:string; conversational?:string; contrarian?:string}>({})
  const [linkedinLoading, setLinkedinLoading] = useState(false)
  const [linkedinError, setLinkedinError] = useState('')
  const [copiedVariant, setCopiedVariant] = useState<string>('')
  const chatEnd = useRef<HTMLDivElement>(null)
  const refreshTimer = useRef<any>(null)
  const [cronHealth, setCronHealth] = useState<{last_sweep_at?:string|null, signals_24h?:number, sweeps_24h?:number, runs_total?:number, last_results?:number, status?:string}|null>(null)
  const [cronExpanded, setCronExpanded] = useState(false)
  const [lookalikeOpen, setLookalikeOpen] = useState(false)
  const [lookalikeLoading, setLookalikeLoading] = useState(false)
  const [lookalikeData, setLookalikeData] = useState<any[]>([])
  const [lookalikeError, setLookalikeError] = useState('')
  const [lookalikeSource, setLookalikeSource] = useState<any>(null)
  const [savedViews, setSavedViews] = useState<{id:string, name:string, filters:{industry?:string, country?:string, wms?:string, signal?:string, query?:string, filter3pl?:string, starredOnly?:boolean}}[]>([])
  const [shortcutsOpen, setShortcutsOpen] = useState(false)
  const [paletteOpen, setPaletteOpen] = useState(false)
  const [paletteQuery, setPaletteQuery] = useState('')
  const [paletteIndex, setPaletteIndex] = useState(0)
  const [highlightedIndex, setHighlightedIndex] = useState(0)
  const keySeqRef = useRef<{val:string, ts:number}>({val:'', ts:0})
  const [briefCached, setBriefCached] = useState(false)
  const [briefCachedAt, setBriefCachedAt] = useState<string|null>(null)
  // InMail drafter state ÃÂÃÂ¢ÃÂÃÂÃÂÃÂ mirrors the brief modal pattern.
  const [showInmail, setShowInmail] = useState(false)
  const [inmailCompany, setInmailCompany] = useState<any>(null)
  const [inmailLoading, setInmailLoading] = useState(false)
  const [inmailText, setInmailText] = useState('')
  const [inmailError, setInmailError] = useState('')
  const [inmailCopied, setInmailCopied] = useState(false)
  const [inmailCached, setInmailCached] = useState(false)
  const [inmailCachedAt, setInmailCachedAt] = useState<string|null>(null)
  // Timeline panel: per-company chronological feed of news_updates.
  const [timelineExpanded, setTimelineExpanded] = useState(false)
  const [expandedTimelineEntries, setExpandedTimelineEntries] = useState<Record<string, boolean>>({})
  const [linkedinCached, setLinkedinCached] = useState(false)
  const [linkedinCachedAt, setLinkedinCachedAt] = useState<string|null>(null)

  // SSR/hydration safety: never render Date.now() / new Date() during SSR.
  // Flip mounted=true on the client so cron-health and 'updated' chips only render
  // after hydration, avoiding React #418/#423/#425.
  useEffect(() => {
    setMounted(true)
    setLastRefresh(new Date())
  }, [])

  const load = useCallback(async () => {
    setRefreshing(true)
    const { data } = await supabase
      .from('companies')
      .select('*, wms_entries(*), news_updates(*)')
      .order('name')
    if (data) {
      setCompanies(data)
      setLastRefresh(new Date())
    }
    setRefreshing(false)
  }, [])

  // Star toggle: PATCH /api/companies/<id> with { starred: bool } and refresh
  // the local list so the row + detail panel re-render with the new state.
  const toggleStar = useCallback(async (id: string, next: boolean) => {
    try {
      const r = await fetch(`/api/companies/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ starred: next })
      })
      if (!r.ok) {
        console.error('star toggle failed', r.status)
        return
      }
      await load()
    } catch (e) { console.error('star toggle failed', e) }
  }, [load])

  async function runGeocode() {
    setGeocoding(true)
    setGeocodeResult(null)
    try {
      let totalProcessed = 0, totalGeocoded = 0, totalFailed = 0
      // Run up to 30 batches (each handles 8 companies, so 240 capacity covers any growth)
      for (let i = 0; i < 30; i++) {
        const r = await fetch('/api/geocode/run', { method: 'POST' })
        if (!r.ok) {
          const errText = await r.text()
          throw new Error(`API error: ${r.status} ${errText}`)
        }
        const d = await r.json()
        totalProcessed += d.processed || 0
        totalGeocoded += d.geocoded || 0
        totalFailed += d.failed || 0
        if (!d.processed || d.processed < 8) break
        await load()
        await new Promise(resolve => setTimeout(resolve, 1500))
      }
      setGeocodeResult({ processed: totalProcessed, geocoded: totalGeocoded, failed: totalFailed })
      // Reload company list so map markers populate
      await load()
    } catch (e: any) {
      setGeocodeResult({ processed: 0, geocoded: 0, failed: 0 })
      alert(`Geocoding failed: ${e.message}. Try again in a minute.`)
    } finally {
      setGeocoding(false)
    }
  }


  useEffect(() => {
    load()
    // Auto-refresh every 5 minutes
    refreshTimer.current = setInterval(load, 5 * 60 * 1000)
    return () => clearInterval(refreshTimer.current)
  }, [load])

  useEffect(() => {
    chatEnd.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  // Saved views: load from localStorage on mount
  useEffect(() => {
    try {
      const raw = localStorage.getItem('wms.savedViews')
      if (raw) setSavedViews(JSON.parse(raw))
    } catch {}
  }, [])

  // Saved views: persist to localStorage on change
  useEffect(() => {
    try { localStorage.setItem('wms.savedViews', JSON.stringify(savedViews)) } catch {}
  }, [savedViews])

  // Global keyboard shortcuts
  useEffect(() => {
    let helpTimer: any = null
    const onKey = (e: KeyboardEvent) => {
      const ae = document.activeElement as HTMLElement | null
      const inField = !!ae && (ae.tagName === 'INPUT' || ae.tagName === 'TEXTAREA' || ae.isContentEditable)
      if (e.key === 'Escape') {
        if (paletteOpen) { setPaletteOpen(false); return }
        if (showBrief) { setShowBrief(false); return }
        if (showInmail) { setShowInmail(false); return }
        if (linkedinModalOpen) { setLinkedinModalOpen(false); return }
        if (lookalikeOpen) { setLookalikeOpen(false); return }
        if (shortcutsOpen) { setShortcutsOpen(false); return }
        if (selected) { setSelected(null); return }
        if (inField && ae) { ae.blur(); return }
        return
      }
      // Cmd/Ctrl+K toggles command palette (works even when palette input is focused)
      if ((e.metaKey || e.ctrlKey) && (e.key === 'k' || e.key === 'K')) {
        e.preventDefault()
        if (paletteOpen) { setPaletteOpen(false); return }
        if (inField) return
        setPaletteQuery('')
        setPaletteIndex(0)
        setPaletteOpen(true)
        return
      }
      if (inField) return
      if (e.metaKey || e.ctrlKey || e.altKey) return
      if (e.key === '/') {
        const el = document.querySelector('input[placeholder*="Search"], input[placeholder*="search"]') as HTMLInputElement | null
        if (el) { el.focus(); try { el.select() } catch{}; e.preventDefault() }
        return
      }
      if (e.key === '?') {
        setShortcutsOpen(v => !v)
        if (helpTimer) clearTimeout(helpTimer)
        helpTimer = setTimeout(() => setShortcutsOpen(false), 5000)
        e.preventDefault()
        return
      }
      if (e.key === 'b' && selected) { generateBrief(selected); return }
      if (e.key === 'j') { setHighlightedIndex(i => i + 1); return }
      if (e.key === 'k') { setHighlightedIndex(i => Math.max(0, i - 1)); return }
      const now = Date.now()
      const buf = keySeqRef.current
      if (now - buf.ts > 1500) buf.val = ''
      buf.ts = now
      buf.val += e.key
      if (buf.val === 'gd') { gotoTab('dashboard'); setSelected(null); buf.val = ''; return }
      if (buf.val === 'gm') { gotoTab('map'); setSelected(null); buf.val = ''; return }
      if (buf.val === 'gb') { gotoTab('db'); setSelected(null); buf.val = ''; return }
      if (buf.val === 'ga') { gotoTab('chat'); setSelected(null); buf.val = ''; return }
      if (buf.val === 'gn') { gotoTab('news'); setSelected(null); buf.val = ''; return }
      if (buf.val === 'gl') { gotoTab('learn'); setSelected(null); buf.val = ''; return }
      if (buf.val === 'g+') { gotoTab('add'); setSelected(null); buf.val = ''; return }
    }
    document.addEventListener('keydown', onKey)
    return () => { document.removeEventListener('keydown', onKey); if (helpTimer) clearTimeout(helpTimer) }
  }, [showBrief, showInmail, linkedinModalOpen, lookalikeOpen, shortcutsOpen, selected, paletteOpen])

  // Reset keyboard highlight when switching tabs
  useEffect(() => { setHighlightedIndex(0) }, [tab])
  // Smooth-scroll the keyboard-highlighted row into view on index change
  useEffect(() => {
    if (tab !== 'db' && tab !== 'news') return
    const el = document.querySelector(`[data-kb-row="${highlightedIndex}"]`) as HTMLElement | null
    if (el) el.scrollIntoView({ block: 'center', behavior: 'smooth' })
  }, [highlightedIndex, tab])

  // Cron health: fetch on mount + every 60s
  useEffect(() => {
    let mounted = true
    const fetchHealth = () => {
      fetch('/api/health/cron').then(r => r.json()).then(d => { if (mounted) setCronHealth(d) }).catch(() => {})
    }
    fetchHealth()
    const t = setInterval(fetchHealth, 60 * 1000)
    return () => { mounted = false; clearInterval(t) }
  }, [])

  // On-visit sweep: calls /api/sweep which researches 10 companies
  // prioritising unknowns first, then companies not recently checked
  const sweepDone = useRef(false)
  useEffect(() => {
    if (companies.length === 0 || sweepDone.current) return
    sweepDone.current = true
    fetch('/api/sweep', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ count: 20, mode: 'visit' })
    }).then(r => r.json()).then(d => {
      if (d.findings > 0) setTimeout(load, 1500)
    }).catch(() => {})
  }, [companies.length > 0 ? companies[0]?.id : null])

  // Manual research button on company detail panel
  async function researchCompany(company: any, silent = false) {
    if (researching[company.id]) return
    setResearching(prev => ({ ...prev, [company.id]: true }))
    if (!silent) setResearchResults(prev => ({ ...prev, [company.id]: 'Searching...' }))
    try {
      const res = await fetch('/api/sweep', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ count: 1, mode: 'manual', targetId: company.id })
      })
      const d = await res.json()
      if (!silent) {
        setResearchResults(prev => ({
          ...prev,
          [company.id]: d.findings > 0 ? `Found: ${d.results?.[0]?.title || 'new intelligence added'}` : 'Nothing new found publicly'
        }))
      }
      if (d.findings > 0) load()
    } catch {
      if (!silent) setResearchResults(prev => ({ ...prev, [company.id]: 'Research failed ÃÂÃÂ¢ÃÂÃÂÃÂÃÂ try again' }))
    }
    setResearching(prev => ({ ...prev, [company.id]: false }))
  }

  async function generateBrief(company: any, refresh: boolean = false) {
    if (!company || briefLoading) return
    setBriefCompany(company)
    setShowBrief(true)
    setBriefLoading(true)
    setBriefText('')
    setBriefError('')
    setBriefCopied(false)
    setBriefCached(false); setBriefCachedAt(null)
    try {
      const res = await fetch('/api/brief/' + company.id + (refresh ? '?refresh=1' : ''), { method: 'POST', headers: { 'Content-Type': 'application/json' } })
      const data = await res.json()
      if (data.error) setBriefError(data.error)
      else { setBriefText(data.brief || ''); setBriefCached(!!data.cached); setBriefCachedAt(data.cached_at || null) }
    } catch {
      setBriefError('Request failed')
    }
    setBriefLoading(false)
  }

  async function fetchLookalike(company: any) {
    if (!company || lookalikeLoading) return
    setLookalikeSource(company)
    setLookalikeOpen(true)
    setLookalikeLoading(true)
    setLookalikeData([])
    setLookalikeError('')
    try {
      const res = await fetch('/api/lookalike/' + company.id)
      const data = await res.json()
      if (data.error) setLookalikeError(data.error)
      else setLookalikeData(data.results || data.companies || data.lookalikes || [])
    } catch { setLookalikeError('Request failed') }
    setLookalikeLoading(false)
  }

  async function copyBrief() {
    try {
      await navigator.clipboard.writeText(briefText)
      setBriefCopied(true)
      setTimeout(() => setBriefCopied(false), 2000)
    } catch {}
  }
  async function shareBrief() {
    if (!briefCompany || !briefText) return
    setSharingBrief(true)
    try {
      const r = await fetch('/api/share/brief', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ company_id: briefCompany.id, brief_content: briefText }),
      })
      if (!r.ok) throw new Error(await r.text())
      const { url } = await r.json()
      try { await navigator.clipboard.writeText(url) } catch {}
      setShareUrl(url)
      setShareCopied(true)
      setTimeout(() => setShareCopied(false), 4000)
    } catch (e: any) {
      alert(`Could not create share link: ${e?.message || 'unknown error'}`)
    } finally {
      setSharingBrief(false)
    }
  }
  async function generateInmail(company: any, refresh: boolean = false) {
    if (!company || inmailLoading) return
    setInmailCompany(company)
    setShowInmail(true)
    setInmailLoading(true)
    setInmailText('')
    setInmailError('')
    setInmailCopied(false)
    setInmailCached(false); setInmailCachedAt(null)
    try {
      const res = await fetch('/api/inmail/' + company.id + (refresh ? '?refresh=1' : ''), { method: 'POST', headers: { 'Content-Type': 'application/json' } })
      const data = await res.json()
      if (data.error) setInmailError(data.error)
      else { setInmailText(data.message || ''); setInmailCached(!!data.cached); setInmailCachedAt(data.cached_at || null) }
    } catch {
      setInmailError('Request failed')
    }
    setInmailLoading(false)
  }

  async function copyInmail() {
    try {
      await navigator.clipboard.writeText(inmailText)
      setInmailCopied(true)
      setTimeout(() => setInmailCopied(false), 2000)
    } catch {}
  }

    async function generateLinkedInPosts(news: any, refresh: boolean = false) {
    if (!news || linkedinLoading) return
    setLinkedinNewsId(news.id)
    setLinkedinNewsTitle(news.title || '')
    setLinkedinModalOpen(true)
    setLinkedinLoading(true)
    setLinkedinPosts({})
    setLinkedinError('')
    setCopiedVariant('')
    setLinkedinCached(false); setLinkedinCachedAt(null)
    try {
      const res = await fetch('/api/linkedin/' + news.id + (refresh ? '?refresh=1' : ''), { method: 'POST', headers: { 'Content-Type': 'application/json' } })
      const data = await res.json()
      if (data.error) setLinkedinError(data.error)
      else { setLinkedinPosts(data.posts || {}); setLinkedinCached(!!data.cached); setLinkedinCachedAt(data.cached_at || null) }
    } catch {
      setLinkedinError('Request failed')
    }
    setLinkedinLoading(false)
  }

  async function copyLinkedInVariant(variant: 'insightful'|'conversational'|'contrarian') {
    try {
      const text = (linkedinPosts as any)[variant] || ''
      if (!text) return
      await navigator.clipboard.writeText(text)
      setCopiedVariant(variant)
      setTimeout(() => setCopiedVariant(''), 2000)
    } catch {}
  }

  async function getSuggestions() {
    if (suggestBusy) return
    setSuggestBusy(true)
    setSuggestError('')
    setSuggestions([])
    try {
      const res = await fetch('/api/recommend', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ industry: suggestIndustry, country: suggestCountry, count: 10 }) })
      const data = await res.json()
      if (data.error) setSuggestError(data.error)
      else setSuggestions(data.suggestions || [])
    } catch { setSuggestError('Request failed') }
    setSuggestBusy(false)
  }

  async function addSuggestion(s: any) {
    if (addingSuggestion[s.name]) return
    setAddingSuggestion(prev => ({ ...prev, [s.name]: true }))
    try {
      await fetch('/api/import', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ companies: [{ name: s.name, industry: s.industry, country: s.country }] }) })
      setSuggestions(prev => prev.filter(x => x.name !== s.name))
      load()
    } catch {}
    setAddingSuggestion(prev => ({ ...prev, [s.name]: false }))
  }

  async function bulkImport() {
    if (bulkBusy) return
    const names = bulkText.split('\n').map(s => s.trim()).filter(Boolean)
    if (names.length === 0) return
    setBulkBusy(true)
    setBulkResult(null)
    try {
      const res = await fetch('/api/import', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ companies: names.map(n => ({ name: n, industry: bulkIndustry || undefined, country: bulkCountry || undefined })) })
      })
      const data = await res.json()
      setBulkResult(data)
      if (data.added > 0) { setBulkText(''); load() }
    } catch {
      setBulkResult({ error: 'Import failed' })
    }
    setBulkBusy(false)
  }

  async function applyChange(newsId: string) {
    if (newsBusy[newsId]) return
    if (!confirm('Apply this proposed WMS change to the company profile? This will overwrite the current WMS entry.')) return
    setNewsBusy(prev => ({ ...prev, [newsId]: true }))
    try {
      await fetch(`/api/news/${newsId}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ apply: true }) })
      await load()
    } catch {}
    setNewsBusy(prev => ({ ...prev, [newsId]: false }))
  }

  async function setNewsStatus(newsId: string, status: 'pending' | 'verified' | 'dismissed') {
    if (newsBusy[newsId]) return
    setNewsBusy(prev => ({ ...prev, [newsId]: true }))
    try {
      await fetch(`/api/news/${newsId}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ status }) })
      await load()
    } catch {}
    setNewsBusy(prev => ({ ...prev, [newsId]: false }))
  }

  // All news across all companies, sorted newest first
  const allNews = companies
    .flatMap(c => (c.news_updates || []).map((n: any) => ({ ...n, companyName: c.name, companyId: c.id })))
    .filter(n => showDismissed || n.status !== 'dismissed')
    .sort((a, b) => new Date(b.published_at || b.created_at).getTime() - new Date(a.published_at || a.created_at).getTime())

  const filtered = companies.filter(c => {
    const q = search.toLowerCase()
    const matchSearch = !q || c.name.toLowerCase().includes(q) ||
      c.wms_entries?.some((w: any) => w.wms_system?.toLowerCase().includes(q) || w.vendor?.toLowerCase().includes(q))
    let matchVendor = true
    if (filterVendor === 'Unknown') {
      matchVendor = c.wms_entries?.some((w: any) => w.wms_system === 'Unknown' || w.status === 'Needs Verification')
    } else if (filterVendor === 'In-House') {
      matchVendor = c.wms_entries?.some((w: any) => w.vendor === 'In-House')
    } else if (filterVendor !== 'All') {
      matchVendor = c.wms_entries?.some((w: any) => w.vendor?.includes(filterVendor))
    }
    return matchSearch && matchVendor
  }).filter((c: any) => {
    if (filter3pl === 'has' && !c.third_party_logistics) return false
    if (filter3pl === 'is' && !c.is_3pl) return false
    return true
  }).filter((c: any) => filterStarred ? !!c.starred : true)

  const stats = [
    { label:'Total Companies', value:companies.length, color:C.blue, bg:C.blueLight, border:C.blueBorder, filter:'All' },
    { label:'Manhattan', value:companies.filter(c=>c.wms_entries?.some((w:any)=>w.vendor?.includes('Manhattan'))).length, color:C.red, bg:C.redLight, border:C.redBorder, filter:'Manhattan Associates' },
    { label:'Blue Yonder', value:companies.filter(c=>c.wms_entries?.some((w:any)=>w.vendor?.includes('Blue Yonder'))).length, color:C.blue, bg:C.blueLight, border:C.blueBorder, filter:'Blue Yonder' },
    { label:'News & Updates', value:allNews.length, color:C.red, bg:C.redLight, border:C.redBorder, filter:'news' },
  ]

  function handleStatClick(s: typeof stats[0]) {
    setSelected(null)
    if (s.filter === 'news') { gotoTab('news'); return }
    if (s.filter === 'All') { setFilterVendor('All'); setSearch(''); gotoTab('db'); return }
    setFilterVendor(prev => prev === s.filter ? 'All' : s.filter)
    gotoTab('db')
  }

  async function send() {
    if (!input.trim() || loading) return
    const msg = input.trim()
    setInput('')
    setMessages(prev => [...prev, { role: 'user', content: msg }])
    // Fast path: try answering from the local database before calling Claude
    const local = localAnswer(msg, companies)
    if (local) {
      setMessages(prev => [...prev, { role: 'assistant', content: local }])
      return
    }
    setLoading(true)
    try {
      const compactCompanies = companies.map((c: any) => {
        const wms = (c.wms_entries || []).map((w: any) => w.wms_system).filter(Boolean).join('/') || 'Unknown'
        return `${c.name} | ${c.industry || '?'} | ${c.country || '?'} | ${wms}`
      }).join('\n')
      const recentNews = companies
        .flatMap((c: any) => (c.news_updates || []).map((n: any) => ({ ...n, _co: c.name })))
        .sort((a: any, b: any) => new Date(b.published_at || b.created_at).getTime() - new Date(a.published_at || a.created_at).getTime())
        .slice(0, 10)
        .map((n: any) => `${n._co}: ${n.title}`)
        .join('\n')
      const ctx = `COMPANIES (${companies.length}):\n${compactCompanies}\n\nRECENT NEWS (top 10):\n${recentNews}`
      const res = await fetch('/api/chat', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          system: `You are a WMS Intelligence expert for a supply chain consultancy. You have a live internal database AND web search.\n\nDATABASE:\n${ctx}\n\nKNOWLEDGE:\n- Red Prairie = Blue Yonder Dispatcher. Red Prairie Discrete = Blue Yonder WMS.\n- Manhattan PKMS/WMOS/WMi are legacy on-premise. Manhattan Active WM is current cloud.\n- Unknown companies are being auto-researched in background.\n\nBEHAVIOUR: Check DB first, use web search to verify/update, flag conflicts, give comprehensive answers.`,
          messages: [...messages, { role: 'user', content: msg }]
        })
      })
      const d = await res.json()
      setMessages(prev => [...prev, { role: 'assistant', content: d.content }])
    } catch {
      setMessages(prev => [...prev, { role: 'assistant', content: 'Sorry, something went wrong.' }])
    }
    setLoading(false)
  }

  async function addEntry() {
    if (!form.name || !form.wms_system) return
    setSaving(true)
    const { data: co } = await supabase.from('companies')
      .insert({ name:form.name, industry:form.industry, country:form.country, region:form.region, notes:form.notes, third_party_logistics: newCompany3PL || null, is_3pl: newCompanyIs3PL })
      .select().single()
    if (co) await supabase.from('wms_entries').insert({
      company_id:co.id, wms_system:form.wms_system, vendor:form.vendor,
      version:form.version, site_name:form.site_name, status:'Active'
    })
    setSaving(false); setSaved(true)
    setForm({ name:'', industry:'', country:'', region:'', wms_system:'', vendor:'', version:'', site_name:'', notes:'' })
    setNewCompany3PL('')
    setNewCompanyIs3PL(false)
    load(); setTimeout(() => setSaved(false), 3000)
  }

  function vendorColor(v: string) {
    if (v?.includes('Manhattan')) return C.red
    if (v?.includes('Blue Yonder')) return C.blue
    if (v?.includes('SAP')) return C.amber
    if (v?.includes('Oracle')) return C.teal
    return C.gray
  }
  function newsDateColor(iso: string | null): { bg: string; fg: string; border: string; label: string } {
    if (!iso) return { bg: C.surfaceMuted, fg: C.textMuted, border: C.border, label: 'no date' }
    const d = new Date(iso)
    if (isNaN(d.getTime())) return { bg: C.surfaceMuted, fg: C.textMuted, border: C.border, label: 'no date' }
    const days = (Date.now() - d.getTime()) / 86400000
    const label = d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })
    if (days < 90) return { bg: '#E6F4EA', fg: '#1B5E20', border: '#A5D6A7', label }
    if (days < 365) return { bg: C.surfaceAlt, fg: C.textSub, border: C.border, label }
    return { bg: C.surfaceMuted, fg: C.textMuted, border: C.border, label: label + ' ÃÂÃÂÃÂÃÂ· stale' }
  }

  function vendorBg(v: string) {
    if (v?.includes('Manhattan')) return C.redLight
    if (v?.includes('Blue Yonder')) return C.blueLight
    if (v?.includes('SAP')) return C.amberLight
    if (v?.includes('Oracle')) return C.tealLight
    return C.grayLight
  }
  function vendorBorder(v: string) {
    if (v?.includes('Manhattan')) return C.redBorder
    if (v?.includes('Blue Yonder')) return C.blueBorder
    if (v?.includes('SAP')) return C.amberBorder
    if (v?.includes('Oracle')) return C.tealBorder
    return C.grayBorder
  }

  const unknownCount = companies.filter(c => c.wms_entries?.some((w:any) => w.wms_system === 'Unknown')).length
  const researchingCount = Object.values(researching).filter(Boolean).length

  return (
    <div style={{ minHeight:'100vh', background:C.bg, color:C.text, fontFamily:'inherit', paddingBottom: isMobile ? 76 : 0, transition:'padding 200ms cubic-bezier(0.4,0,0.2,1)' }}>

      {/* ÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂ Header ÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂ */}
      <div style={{ background:C.surface, borderBottom:`1px solid ${C.border}`, padding: isMobile ? '0 14px' : '0 28px', display:'flex', alignItems:'center', justifyContent:'space-between', height: isMobile ? 52 : 56, position:'sticky', top:0, zIndex:50, boxShadow:'0 1px 4px rgba(0,0,0,0.06)' }}>
        <div style={{ display:'flex', alignItems:'center', gap:12 }}>
          <div style={{ width:32, height:32, borderRadius:8, background:'#0B1C37', display:'flex', alignItems:'center', justifyContent:'center', fontSize:13, fontWeight:800, letterSpacing:0.5, color:'#FECC01', boxShadow:'inset 0 -2px 0 rgba(254,204,1,0.25)' }}>s.</div>
          <div>
            <div style={{ fontWeight:700, fontSize:14, color:C.text }}>WMS Intelligence</div>
            <div style={{ color:C.textMuted, fontSize:11 }}>
              {companies.length} companies
              {researchingCount > 0 && <span style={{ color:C.blue, marginLeft:6 }}>ÃÂÃÂÃÂÃÂ· Researching {researchingCount}...</span>}
            </div>
          </div>
        </div>
        <nav style={{ display: isMobile ? 'none' : 'flex', gap:2 }}>
          {([
            ['dashboard','Dashboard', LayoutDashboard],
            ['map','Map',MapIcon],
            ['db','Database', DatabaseIcon],
            ['chat','AI Assistant', Bot],
            ['learn','Learn', BookOpen],
            ['news',`News${allNews.length > 0 ? ` (${allNews.length})` : ''}`, Newspaper],
            ['add','Add Entry', Plus],
          ] as [typeof tab, string, any][]).map(([t, label, Icon]) => (
            <Button variant="plain" key={t} onClick={() => { gotoTab(t); setSelected(null) }}
              style={{ padding:'7px 16px', borderRadius:8, fontSize:13, cursor:'pointer', border:'none',
                background: tab===t ? C.blueLight : 'transparent',
                color: tab===t ? C.blue : C.textSub,
                fontWeight: tab===t ? 600 : 400 }}>
              <span style={{ display:'inline-flex', alignItems:'center', gap:6 }}><Icon size={14} />{label}</span>
            </Button>
          ))}
        </nav>
        <div style={{ display:'flex', alignItems:'center', gap:8 }}>
          <span style={{ fontSize:11, color:C.textMuted }}>Updated {mounted && lastRefresh ? lastRefresh.toLocaleTimeString('en-GB', { hour:'2-digit', minute:'2-digit' }) : 'ÃÂÃÂ¢ÃÂÃÂÃÂÃÂ'}</span>
          <Button variant="plain" onClick={load} disabled={refreshing} style={{ fontSize:12, color:C.blue, background:C.blueLight, border:`1px solid ${C.blueBorder}`, borderRadius:6, padding:'4px 10px', cursor:refreshing?'default':'pointer', fontWeight:500, opacity:refreshing?0.6:1 }}>
            {refreshing ? <><RefreshCw size={14} className="spin"/> ...</> : <><RefreshCw size={14}/> Refresh</>}
          </Button>
        </div>
      </div>

      <div style={{ maxWidth:1200, margin:'0 auto', padding:'24px 28px' }}>

        {/* ÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂ DATABASE TAB ÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂ */}
        {tab === 'dashboard' && !selected && (() => {
          const now = Date.now()
          const day7 = 7 * 24 * 60 * 60 * 1000
          const day30 = 30 * 24 * 60 * 60 * 1000
          const allNewsItems = companies.flatMap((c: any) => (c.news_updates || []).map((n: any) => ({ ...n, _company: c })))
          const hotLeads = allNewsItems
            .filter((n: any) => {
              if (!n.signal_type || n.signal_type === 'none') return false
              const t = new Date(n.published_at || n.created_at).getTime()
              return now - t < day30 && n.status !== 'dismissed'
            })
            .sort((a: any, b: any) => new Date(b.published_at || b.created_at).getTime() - new Date(a.published_at || a.created_at).getTime())
          const pendingChanges = allNewsItems
            .filter((n: any) => n.proposed_wms_system && n.status !== 'verified' && n.status !== 'dismissed')
            .sort((a: any, b: any) => new Date(b.published_at || b.created_at).getTime() - new Date(a.published_at || a.created_at).getTime())
          const recentNews = allNewsItems.filter((n: any) => now - new Date(n.published_at || n.created_at).getTime() < day7).length
          const totalManhattan = companies.filter((c: any) => c.wms_entries?.some((w: any) => (w.vendor || '').includes('Manhattan'))).length
          const totalBlueYonder = companies.filter((c: any) => c.wms_entries?.some((w: any) => (w.vendor || '').includes('Blue Yonder'))).length
          const totalUnknown = companies.filter((c: any) => c.wms_entries?.some((w: any) => w.wms_system === 'Unknown')).length
          const stats = [
            { label: 'Tracked', value: companies.length, accent: C.text },
            { label: 'Manhattan', value: totalManhattan, accent: C.red },
            { label: 'Blue Yonder', value: totalBlueYonder, accent: C.blue },
            { label: 'Unknown', value: totalUnknown, accent: C.yellowBorder },
            { label: 'News last 7d', value: recentNews, accent: C.blue }
          ]
          const sortedNews = [...allNewsItems].sort((a: any, b: any) => new Date(b.published_at || b.created_at).getTime() - new Date(a.published_at || a.created_at).getTime())
          return (
            <div>
              {mounted && cronHealth && (() => {
                const lastIso = cronHealth.last_sweep_at
                const ageHrs = lastIso ? (Date.now() - new Date(lastIso).getTime()) / 3600000 : 999
                const dotColor = ageHrs < 6 ? C.green : ageHrs < 24 ? C.amber : C.red
                const StatusIcon = ageHrs < 24 ? CheckCircle2 : AlertCircle
                return (
                  <div style={{ position:'relative', marginBottom:14 }}>
                    <Card onClick={() => setCronExpanded(v => !v)}
                      style={{ display:'flex', alignItems:'center', gap:14, padding:'10px 14px', background:C.surface, border:`1px solid ${C.border}`, borderRadius:10, cursor:'pointer', fontSize:12 }}>
                      <span style={{ display:'inline-flex', alignItems:'center', gap:6, color:dotColor, fontWeight:600 }}>
                        <span style={{ width:8, height:8, borderRadius:'50%', background:dotColor }} />
                        <StatusIcon size={14} />
                      </span>
                      <span style={{ color:C.textSub }}>Last sweep: <strong style={{ color:C.text }}>{lastIso ? timeAgo(lastIso) : 'never'}</strong></span>
                      <span style={{ color:C.textSub }}>Signals 24h: <strong style={{ color:C.text }}>{cronHealth.signals_24h ?? 0}</strong></span>
                      <RefreshCw size={12} style={{ color:C.textMuted, marginLeft:'auto' }} />
                    </Card>
                    {cronExpanded && (
                      <Card style={{ marginTop:6, background:C.surfaceAlt, border:`1px solid ${C.border}`, borderRadius:10, padding:'10px 14px', fontSize:11, color:C.textSub, lineHeight:1.7 }}>
                        <div>last_sweep_at: <strong style={{color:C.text}}>{cronHealth.last_sweep_at || 'never'}</strong></div>
                        <div>signals_24h: <strong style={{color:C.text}}>{cronHealth.signals_24h ?? 0}</strong></div>
                        <div>sweeps_24h: <strong style={{color:C.text}}>{cronHealth.sweeps_24h ?? 0}</strong></div>
                        <div>runs_total: <strong style={{color:C.text}}>{cronHealth.runs_total ?? 0}</strong></div>
                        <div>last_results: <strong style={{color:C.text}}>{cronHealth.last_results ?? 0}</strong></div>
                        <div>status: <strong style={{color:C.text}}>{cronHealth.status || 'unknown'}</strong></div>
                      </Card>
                    )}
                  </div>
                )
              })()}
              <div style={{ display:'grid', gridTemplateColumns: isMobile ? 'repeat(2, 1fr)' : 'repeat(5, 1fr)', gap: isMobile ? 8 : 10, marginBottom:24 }}>
                {stats.map(s => (
                  <Card key={s.label} style={{ background:C.surface, border:`1px solid ${C.border}`, borderRadius:10, padding:'14px 16px', boxShadow:'0 1px 2px rgba(11,28,55,0.04)' }}>
                    <div style={{ fontSize:11, color:C.textMuted, fontWeight:600, textTransform:'uppercase', letterSpacing:'0.06em' }}>{s.label}</div>
                    <div style={{ fontSize:26, fontWeight:700, color:s.accent, marginTop:4, lineHeight:1 }}>{s.value}</div>
                  </Card>
                ))}
              </div>
              {(() => {
                const watching = (companies || []).filter((c: any) => !!c.starred)
                const sevenDaysAgo = Date.now() - 7 * 24 * 60 * 60 * 1000
                const newestNewsTs = (c: any) => {
                  const ts = (c.news_updates || [])
                    .map((n: any) => n.published_at || n.created_at)
                    .filter(Boolean)
                    .map((t: string) => new Date(t).getTime())
                  return ts.length ? Math.max(...ts) : 0
                }
                const sortedWatching = [...watching].sort((a: any, b: any) => {
                  const aFresh = newestNewsTs(a)
                  const bFresh = newestNewsTs(b)
                  const aRecent = aFresh > sevenDaysAgo ? aFresh : 0
                  const bRecent = bFresh > sevenDaysAgo ? bFresh : 0
                  if (aRecent !== bRecent) return bRecent - aRecent
                  const aStar = a.starred_at ? new Date(a.starred_at).getTime() : 0
                  const bStar = b.starred_at ? new Date(b.starred_at).getTime() : 0
                  return bStar - aStar
                })
                return (
                  <>
                    <div style={{ display:'flex', alignItems:'center', gap:8, marginBottom:6, marginTop:8 }}>
                      <Star size={16} color={C.yellowBorder} fill={C.yellowBorder} />
                      <h3 style={{ margin:0, fontSize:14, fontWeight:700, color:C.text, letterSpacing:'-0.01em' }}>Watching</h3>
                      <div style={{ height:1, flex:1, background:C.border, marginLeft:6 }} />
                      <span style={{ fontSize:11, color:C.textMuted, fontWeight:500 }}>{sortedWatching.length} {sortedWatching.length === 1 ? 'company' : 'companies'} pinned</span>
                    </div>
                    <div style={{ fontSize:12, color:C.textSub, marginBottom:14 }}>Companies you are actively pitching this week. Click the star on any company to watch it here.</div>
                    {sortedWatching.length === 0 ? (
                      <Card variant='inset' padding={14} style={{ marginBottom:14 }}>
                        <div style={{ fontSize:13, color:C.textSub, display:'flex', alignItems:'center', gap:8 }}>
                          <Star size={14} color={C.textMuted} />
                          <span>No companies starred yet. Click the star on any company to watch it here.</span>
                        </div>
                      </Card>
                    ) : (
                      <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill, minmax(240px, 1fr))', gap:10, marginBottom:14 }}>
                        {sortedWatching.map((w: any) => {
                          const fresh = newestNewsTs(w)
                          const freshIso = fresh ? new Date(fresh).toISOString() : null
                          const wmsLatest = (w.wms_entries && w.wms_entries[0] && w.wms_entries[0].wms_system) || null
                          return (
                            <Card key={w.id} variant='default' padding={12} onClick={() => { setSelected(w); gotoTab('db') }} style={{ cursor:'pointer' }}>
                              <div style={{ display:'flex', alignItems:'flex-start', justifyContent:'space-between', gap:8, marginBottom:4 }}>
                                <div style={{ fontWeight:700, fontSize:13, color:C.text, lineHeight:1.25 }}>{w.name}</div>
                                <Star size={13} fill={'#FECC01'} stroke={'#FECC01'} />
                              </div>
                              <div style={{ fontSize:11, color:C.textMuted, marginBottom:6 }}>{[w.industry, w.country, wmsLatest].filter(Boolean).join(' · ')}</div>
                              {freshIso && (
                                <div style={{ fontSize:11, color: fresh > sevenDaysAgo ? C.blue : C.textMuted, fontWeight: fresh > sevenDaysAgo ? 600 : 500 }}>
                                  Last news: {timeAgo(freshIso)}
                                </div>
                              )}
                            </Card>
                          )
                        })}
                      </div>
                    )}
                  </>
                )
              })()}
              {(() => {
                const recentDiscoveries = (companies || [])
                  .filter((c: any) => c.auto_discovered && c.discovery_status === 'pending')
                  .sort((a: any, b: any) => {
                    const ta = a.discovered_at ? new Date(a.discovered_at).getTime() : 0
                    const tb = b.discovered_at ? new Date(b.discovered_at).getTime() : 0
                    return tb - ta
                  })
                  .slice(0, 8)

                const weekAgo = Date.now() - 7 * 24 * 60 * 60 * 1000
                const weekDiscoveries = (companies || []).filter((c: any) =>
                  c.auto_discovered && c.discovered_at && new Date(c.discovered_at).getTime() > weekAgo
                )
                const weekCompanies = weekDiscoveries.filter((c: any) => !c.is_3pl).length
                const weekThreePLs = weekDiscoveries.filter((c: any) => c.is_3pl).length

                async function verifyDiscovery(id: string) {
                  try {
                    await fetch('/api/companies/' + id, {
                      method: 'PATCH',
                      headers: { 'Content-Type': 'application/json' },
                      body: JSON.stringify({ discovery_status: 'verified' }),
                    })
                    await load()
                  } catch (e) { console.error('verify failed', e) }
                }
                async function dismissDiscovery(id: string) {
                  try {
                    await fetch('/api/companies/' + id, { method: 'DELETE' })
                    await load()
                  } catch (e) { console.error('dismiss failed', e) }
                }

                return (
                  <>
                    <div style={{ display:'flex', alignItems:'center', gap:8, marginBottom:6, marginTop:8 }}>
                      <Sparkles size={16} color={C.amber} />
                      <h3 style={{ margin:0, fontSize:14, fontWeight:700, color:C.text, letterSpacing:'-0.01em' }}>Recently discovered</h3>
                      <div style={{ height:1, flex:1, background:C.border, marginLeft:6 }} />
                      <span style={{ fontSize:11, color:C.textMuted, fontWeight:500 }}>+{weekCompanies} {weekCompanies === 1 ? 'company' : 'companies'}, +{weekThreePLs} 3PLs this week</span>
                    </div>
                    <div style={{ fontSize:12, color:C.textSub, marginBottom:14 }}>Auto-discovered by the nightly sweep · verify or dismiss to keep the dataset clean.</div>
                    {recentDiscoveries.length === 0 ? (
                      <Card variant='inset' padding={14} style={{ marginBottom:14 }}>
                        <div style={{ fontSize:13, color:C.textSub }}>No new discoveries this week. The next sweep runs nightly at 02:00 UTC.</div>
                      </Card>
                    ) : (
                      <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill, minmax(240px, 1fr))', gap:10, marginBottom:14 }}>
                        {recentDiscoveries.map((d: any) => (
                          <Card key={d.id} variant='default' padding={12}>
                            <div style={{ fontSize:14, fontWeight:500, color:C.text }}>{d.name}</div>
                            <div style={{ display:'flex', alignItems:'center', gap:6, flexWrap:'wrap', fontSize:11, color:C.textSub, marginTop:4 }}>
                              {d.industry && <span>{d.industry}</span>}
                              {d.industry && d.country && <span>ÃÂÃÂÃÂÃÂ·</span>}
                              {d.country && <span>{d.country}</span>}
                              {d.is_3pl && <Pill variant='brand' size='sm'>3PL Provider</Pill>}
                            </div>
                            {d.discovered_at && (
                              <div style={{ fontSize:11, color:C.textMuted, marginTop:6 }}>Auto-discovered {timeAgo(d.discovered_at) || 'recently'}</div>
                            )}
                            <div style={{ display:'flex', gap:6, marginTop:10 }}>
                              <Button variant='primary' size='sm' onClick={() => verifyDiscovery(d.id)}>Verify</Button>
                              <Button variant='tertiary' size='sm' onClick={() => dismissDiscovery(d.id)}>Dismiss</Button>
                            </div>
                          </Card>
                        ))}
                      </div>
                    )}
                  </>
                )
              })()}
              <div style={{ display:'flex', alignItems:'center', gap:8, marginBottom:6, marginTop:8 }}>
                <Zap size={16} color={C.yellow} />
                <h3 style={{ margin:0, fontSize:14, fontWeight:700, color:C.text, letterSpacing:'-0.01em' }}>Hot Leads This Week</h3>
                <div style={{ height:1, flex:1, background:C.border, marginLeft:6 }} />
                <span style={{ fontSize:11, color:C.textMuted, fontWeight:500 }}>{hotLeads.length} signal{hotLeads.length === 1 ? '' : 's'}</span>
              </div>
              <div style={{ fontSize:12, color:C.textSub, marginBottom:14 }}>Companies with hiring or expansion activity in the last 30 days</div>
              {hotLeads.length === 0 ? (
                <Card style={{ padding:'24px 16px', textAlign:'center', color:C.textMuted, background:C.surface, border:`1px dashed ${C.border}`, borderRadius:10, marginBottom:24, fontSize:13 }}>
                  No hot signals yet ÃÂÃÂ¢ÃÂÃÂÃÂÃÂ the nightly cron at 2am UTC will surface new ones.
                </Card>
              ) : (
                <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill, minmax(320px, 1fr))', gap:10, marginBottom:24 }}>
                  {hotLeads.slice(0, 12).map((n: any) => (
                    <Card key={n.id} onClick={() => { setSelected(n._company); gotoTab('db') }} style={{ background:C.surface, border:`1px solid ${C.border}`, borderRadius:10, padding:'14px 16px', cursor:'pointer', boxShadow:'0 1px 2px rgba(11,28,55,0.04)' }}>
                      <div style={{ display:'flex', alignItems:'center', gap:6, marginBottom:6 }}>
                        {signalBadge(n.signal_type)}
                        <span style={{ fontSize:11, color:C.textMuted, marginLeft:'auto' }}>{timeAgo(n.published_at || n.created_at)}</span>
                      </div>
                      <div style={{ fontSize:13, fontWeight:700, color:C.text, marginBottom:4 }}>{n._company.name}</div>
                      <div style={{ fontSize:12, color:C.textSub, lineHeight:1.4 }}>{n.title}</div>
                    </Card>
                  ))}
                </div>
              )}
              {pendingChanges.length > 0 && (
                <>
                  <div style={{ display:'flex', alignItems:'center', gap:8, marginBottom:6 }}>
                    <Repeat size={16} color={C.yellow} />
                    <h3 style={{ margin:0, fontSize:14, fontWeight:700, color:C.text, letterSpacing:'-0.01em' }}>Pending WMS Changes</h3>
                    <div style={{ height:1, flex:1, background:C.border, marginLeft:6 }} />
                    <span style={{ fontSize:11, color:C.textMuted, fontWeight:500 }}>{pendingChanges.length} pending</span>
                  </div>
                  <div style={{ fontSize:12, color:C.textSub, marginBottom:14 }}>Companies the AI thinks have moved WMS ÃÂÃÂ¢ÃÂÃÂÃÂÃÂ review and one-click apply</div>
                  <div style={{ display:'flex', flexDirection:'column', gap:8, marginBottom:24 }}>
                    {pendingChanges.slice(0, 6).map((n: any) => (
                      <div key={n.id} style={{ background:C.yellowLight, border:`1px solid ${C.yellowBorder}`, borderRadius:10, padding:'12px 14px', display:'flex', alignItems:'center', gap:12, flexWrap:'wrap' }}>
                        <div style={{ flex:1, minWidth:200 }}>
                          <div style={{ fontWeight:700, fontSize:13, color:C.text }}>{n._company.name}</div>
                          <div style={{ fontSize:12, color:C.textSub, display:'flex', alignItems:'center', gap:6 }}>
                            <span>{(n._company.wms_entries?.[0]?.wms_system) || 'Unknown'}</span>
                            <ArrowRight size={12} />
                            <span style={{ color:C.yellow, fontWeight:600 }}>{n.proposed_wms_system}</span>
                          </div>
                        </div>
                        <Button variant="plain" onClick={(e) => { e.stopPropagation(); applyChange(n.id) }} disabled={newsBusy[n.id]} style={{ background:C.yellowBorder, color:C.text, border:'none', borderRadius:8, padding:'7px 14px', fontSize:12, fontWeight:700, cursor: newsBusy[n.id] ? 'default' : 'pointer', opacity: newsBusy[n.id] ? 0.5 : 1 }}>Apply change</Button>
                        <Button variant="ghost" onClick={(e) => { e.stopPropagation(); setNewsStatus(n.id, 'dismissed') }} disabled={newsBusy[n.id]} style={{ background:'transparent', color:C.textSub, border:`1px solid ${C.border}`, borderRadius:8, padding:'7px 12px', fontSize:12, fontWeight:500, cursor:'pointer' }}>Dismiss</Button>
                      </div>
                    ))}
                  </div>
                </>
              )}
              <div style={{ display:'flex', alignItems:'center', gap:8, marginBottom:6 }}>
                <Newspaper size={16} color={C.blue} />
                <h3 style={{ margin:0, fontSize:14, fontWeight:700, color:C.text, letterSpacing:'-0.01em' }}>Latest Intelligence</h3>
                <div style={{ height:1, flex:1, background:C.border, marginLeft:6 }} />
                <Button variant="ghost" onClick={() => gotoTab('news')} style={{ background:'transparent', border:'none', fontSize:11, color:C.blue, fontWeight:600, cursor:'pointer' }}>View all ÃÂÃÂ¢ÃÂÃÂÃÂÃÂ</Button>
              </div>
              <div style={{ display:'flex', flexDirection:'column', gap:6 }}>
                {sortedNews.slice(0, 5).map((n: any) => (
                  <div key={n.id} onClick={() => { setSelected(n._company); gotoTab('db') }} style={{ background:C.surface, border:`1px solid ${C.border}`, borderRadius:8, padding:'10px 14px', cursor:'pointer', display:'flex', alignItems:'center', gap:10 }}>
                    <div style={{ flex:1, minWidth:0 }}>
                      <div style={{ fontSize:13, fontWeight:600, color:C.text, marginBottom:2 }}>{n.title}</div>
                      <div style={{ fontSize:11, color:C.textMuted }}><span style={{ color:C.blue, fontWeight:500 }}>{n._company.name}</span> ÃÂÃÂÃÂÃÂ· {timeAgo(n.published_at || n.created_at)}</div>
                    </div>
                    <Button variant="ghost" onClick={(e) => { e.stopPropagation(); generateLinkedInPosts(n) }} disabled={linkedinLoading} title="Draft LinkedIn post"
                      style={{ background:'transparent', border:`1px solid ${C.border}`, borderRadius:6, padding:4, cursor:'pointer', display:'inline-flex', alignItems:'center', color:C.blue, marginRight:6 }}>
                      <Linkedin size={12} />
                    </Button>
                    {signalBadge(n.signal_type)}
                  </div>
                ))}
              </div>
            </div>
          )
        })()}
        {tab === 'map' && (
          <div style={{ padding: 24 }}>
            <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom: 16 }}>
              <div>
                <h2 style={{ margin: 0, fontSize: 22, fontWeight: 700, color: C.text }}>Map view</h2>
                <p style={{ margin: '4px 0 0', fontSize: 12, color: C.textMuted }}>
                  Showing {companies.filter((c: any) => c.latitude && c.longitude).length} of {companies.length} companies. Companies without a known location are hidden until the next geocode pass.
                </p>
              </div>
              <div style={{ display:'flex', gap: 8 }}>
                <select value={mapWmsFilter} onChange={e=>setMapWmsFilter(e.target.value)} style={{ padding:'6px 10px', borderRadius:8, border:`1px solid ${C.border}`, fontSize:12 }}>
                  <option value="">All WMS</option>
                  <option value="Manhattan">Manhattan</option>
                  <option value="Blue Yonder">Blue Yonder</option>
                  <option value="KÃÂÃÂÃÂÃÂ¶rber">KÃÂÃÂÃÂÃÂ¶rber</option>
                  <option value="SAP">SAP</option>
                  <option value="Other">Other</option>
                  <option value="Unknown">Unknown</option>
                </select>
                <select value={mapCountryFilter} onChange={e=>setMapCountryFilter(e.target.value)} style={{ padding:'6px 10px', borderRadius:8, border:`1px solid ${C.border}`, fontSize:12 }}>
                  <option value="">All countries</option>
                  {Array.from(new Set(companies.map((c: any)=>c.country).filter(Boolean))).sort().map((co: any) => <option key={co as string} value={co as string}>{co as string}</option>)}
                </select>
                <select value={map3plFilter} onChange={e=>setMap3plFilter(e.target.value)} style={{ padding:'6px 10px', borderRadius:8, border:`1px solid ${C.border}`, fontSize:12 }}>
                  <option value="">All companies</option>
                  <option value="has">Has 3PL</option>
                  <option value="is">Is 3PL provider</option>
                </select>
              </div>
            </div>
            <div style={{ position:'relative', height: 'calc(100vh - 220px)', minHeight: 500, borderRadius: 12, overflow: 'hidden', border: `1px solid ${C.border}` }}>
              {companies.length > 0 && companies.filter((c: any) => c.latitude && c.longitude).length === 0 && (
                <div style={{ position:'absolute', inset:0, display:'flex', alignItems:'center', justifyContent:'center', pointerEvents:'none', zIndex:500 }}>
                  <div style={{ pointerEvents:'auto', maxWidth:480, padding:24, background:C.surface, border:`1px solid ${C.border}`, borderRadius:12, textAlign:'center' }}>
                    <div style={{ fontSize:14, fontWeight:600, color:C.text, marginBottom:8 }}>No companies geocoded yet</div>
                    <div style={{ fontSize:12, color:C.textSub, marginBottom:16, lineHeight:1.5 }}>
                      Click below to populate locations for your {companies.length} companies. This uses the free OpenStreetMap geocoding service and takes about a minute.
                    </div>
                    <Button variant="primary" onClick={runGeocode} disabled={geocoding}>
                      {geocoding ? 'GeocodingÃÂ¢ÃÂÃÂ¦' : 'Geocode now'}
                    </Button>
                    {geocodeResult && (
                      <div style={{ marginTop:12, fontSize:12, color:C.textSub }}>
                        {geocodeResult.geocoded} of {geocodeResult.processed} companies geocoded
                        {geocodeResult.failed > 0 ? ` ÃÂÃÂ· ${geocodeResult.failed} failed` : ''}
                      </div>
                    )}
                  </div>
                </div>
              )}
              <MapView
                companies={companies.filter((c: any) => {
                  if (!c.latitude || !c.longitude) return false
                  if (mapWmsFilter && c.wms_system !== mapWmsFilter && !(mapWmsFilter === 'Unknown' && (!c.wms_system || c.wms_system === 'Unknown'))) return false
                  if (mapCountryFilter && c.country !== mapCountryFilter) return false
                  if (map3plFilter === 'has' && !c.third_party_logistics) return false
                  if (map3plFilter === 'is' && !c.is_3pl) return false
                  return true
                })}
                totalCount={companies.length}
                onSelect={(companyId: string) => { const co = companies.find((x: any) => x.id === companyId); if (co) { setSelected(co); gotoTab('db') } }}
              />
            </div>
          </div>
        )}

        {tab === 'db' && !selected && (
          <div>
            {/* Stat cards */}
            <div style={{ display:'grid', gridTemplateColumns: isMobile ? 'repeat(2,1fr)' : 'repeat(4,1fr)', gap:12, marginBottom:20 }}>
              {stats.map(s => {
                const active =
                (s.filter === 'news' && tab === 'news') ||
                (s.filter === 'All' && tab === 'db' && filterVendor === 'All' && !search) ||
                (s.filter !== 'All' && s.filter !== 'news' && filterVendor === s.filter && tab === 'db')
                return (
                  <div key={s.label} onClick={() => handleStatClick(s)}
                    style={{ background: active ? s.bg : C.surface, border:`1px solid ${active ? s.border : C.border}`,
                      borderRadius:12, padding:'16px 20px', cursor:'pointer', transition:'all 0.15s',
                      boxShadow: active ? `0 0 0 2px ${s.border}` : '0 1px 3px rgba(0,0,0,0.06)' }}>
                    <div style={{ fontSize:28, fontWeight:700, color:s.color, lineHeight:1 }}>{s.value}</div>
                    <div style={{ fontSize:12, color: active ? s.color : C.textSub, marginTop:6, fontWeight: active ? 600 : 400 }}>{s.label}</div>
                    {active && s.filter !== 'news' && s.filter !== 'All' && <div style={{ fontSize:10, color:s.color, marginTop:2, opacity:0.7 }}>ÃÂÃÂ¢ÃÂÃÂÃÂÃÂ Active filter</div>}
                  {active && s.filter === 'All' && <div style={{ fontSize:10, color:s.color, marginTop:2, opacity:0.7 }}>ÃÂÃÂ¢ÃÂÃÂÃÂÃÂ Showing all</div>}
                  </div>
                )
              })}
            </div>

            {/* Saved views strip */}
            <div style={{ display:'flex', flexWrap: isMobile ? 'nowrap' : 'wrap', overflowX: isMobile ? 'auto' : 'visible', WebkitOverflowScrolling: 'touch', alignItems:'center', gap:6, marginBottom:12, paddingBottom: isMobile ? 4 : 0 }}>
              {savedViews.map(v => (
                <span key={v.id} style={{ display:'inline-flex', alignItems:'center', gap:4, padding:'4px 4px 4px 10px', borderRadius:99, background:C.surfaceAlt, border:`1px solid ${C.border}`, fontSize:12, color:C.textSub }}>
                  <span onClick={() => { setFilterVendor(v.filters.wms || 'All'); setSearch(v.filters.query || ''); setFilterStarred(!!v.filters.starredOnly); setSelected(null); gotoTab('db') }} style={{ cursor:'pointer', fontWeight:600 }}>{v.name}</span>
                  <Button variant="ghost" onClick={() => { if(confirm('Delete saved view "' + v.name + '"?')) setSavedViews(prev => prev.filter(p => p.id !== v.id)) }}
                    style={{ display:'flex', alignItems:'center', justifyContent:'center', width:18, height:18, padding:0, border:'none', background:'transparent', color:C.textMuted, cursor:'pointer', borderRadius:99 }}>
                    <X size={11} />
                  </Button>
                </span>
              ))}
              <Button variant="ghost" onClick={() => { if (filterVendor === 'All' && !search && !filterStarred) { alert('Set a filter or search first, then save the view.'); return } const name = (prompt('Name this view:') || '').trim(); if (!name) return; const id = String(Date.now()); setSavedViews(prev => [...prev, { id, name, filters: { wms: filterVendor !== 'All' ? filterVendor : undefined, query: search || undefined, starredOnly: filterStarred || undefined } }]) }}
                style={{ display:'inline-flex', alignItems:'center', gap:4, padding:'4px 10px', borderRadius:99, background:'transparent', border:`1px dashed ${C.borderHov}`, fontSize:12, color:C.textSub, cursor:'pointer', fontWeight:600 }}>
                <Plus size={11} /> Save current view
              </Button>
              {savedViews.length === 0 && (<span style={{ fontSize:11, color:C.textMuted, marginLeft:4 }}>Save filter combos here for one-click recall.</span>)}
            </div>

            {/* Search + filter */}
            <div style={{ display:'flex', gap:10, marginBottom: filterVendor !== 'All' || search ? 10 : 16 }}>
              <div style={{ flex:1, position:'relative' }}>
                <span style={{ position:'absolute', left:13, top:'50%', transform:'translateY(-50%)', color:C.textMuted }}></span>
                <DSInput plain value={search} onChange={e => setSearch(e.target.value)}
                  placeholder="Search companies or WMS systems..."
                  style={{ width:'100%', background:C.surface, border:`1px solid ${C.border}`, borderRadius:10, padding:'10px 14px 10px 38px', color:C.text, fontSize:14, outline:'none', boxSizing:'border-box', boxShadow:'0 1px 3px rgba(0,0,0,0.04)' }} />
              </div>
              <select value={filterVendor} onChange={e => setFilterVendor(e.target.value)}
                style={{ background:C.surface, border:`1px solid ${C.border}`, borderRadius:10, padding:'10px 16px', color:C.text, fontSize:14, outline:'none', cursor:'pointer', boxShadow:'0 1px 3px rgba(0,0,0,0.04)' }}>
                {['All','Blue Yonder','Manhattan Associates','SAP','Oracle','Unknown','In-House'].map(v =>
                  <option key={v} value={v}>{v}</option>)}
              </select>
              <Button variant="plain" onClick={()=>setFilter3pl(filter3pl === 'has' ? '' : 'has')} style={{ padding:'4px 10px', borderRadius: 999, fontSize: 12, fontWeight: 500, background: filter3pl === 'has' ? C.yellowLight : C.surfaceAlt, color: filter3pl === 'has' ? C.text : C.textSub, border:`1px solid ${filter3pl === 'has' ? C.yellowBorder : C.border}`, cursor:'pointer' }}>Has 3PL</Button>
              <Button variant="plain" onClick={()=>setFilter3pl(filter3pl === 'is' ? '' : 'is')} style={{ padding:'4px 10px', borderRadius: 999, fontSize: 12, fontWeight: 500, background: filter3pl === 'is' ? C.yellowLight : C.surfaceAlt, color: filter3pl === 'is' ? C.text : C.textSub, border:`1px solid ${filter3pl === 'is' ? C.yellowBorder : C.border}`, cursor:'pointer' }}>Is 3PL</Button>
              <Button variant="plain" onClick={() => setFilterStarred(s => !s)} style={{ display:'inline-flex', alignItems:'center', gap:4, padding:'4px 10px', borderRadius: 999, fontSize: 12, fontWeight: 500, background: filterStarred ? C.yellowLight : C.surfaceAlt, color: filterStarred ? C.text : C.textSub, border:`1px solid ${filterStarred ? C.yellowBorder : C.border}`, cursor:'pointer' }}><Star size={11} fill={filterStarred ? '#FECC01' : 'none'} stroke={filterStarred ? '#FECC01' : C.textSub} /> Starred only</Button>
              {(filterVendor !== 'All' || search) && (
                <Button variant="plain" onClick={() => { setFilterVendor('All'); setSearch('') }}
                  style={{ padding:'10px 14px', borderRadius:10, border:`1px solid ${C.border}`, background:C.surface, color:C.textSub, fontSize:13, cursor:'pointer' }}>
                  Clear</Button>
              )}
            </div>

            {(filterVendor !== 'All' || search) && (
              <div style={{ background:C.blueLight, border:`1px solid ${C.blueBorder}`, borderRadius:8, padding:'8px 16px', marginBottom:14, fontSize:13, color:C.blue, display:'flex', justifyContent:'space-between' }}>
                <span>{filterVendor !== 'All' ? `Vendor: ${filterVendor}` : `Search: "${search}"`} ÃÂÃÂ¢ÃÂÃÂÃÂÃÂ {filtered.length} companies</span>
                <Button variant="plain" onClick={() => { setFilterVendor('All'); setSearch('') }} style={{ background:'none', border:'none', color:C.blue, cursor:'pointer', fontSize:13, fontWeight:600 }}>Clear</Button>
              </div>
            )}

            {/* Unknown research banner */}
            {unknownCount > 0 && (
              <div style={{ background:C.amberLight, border:`1px solid ${C.amberBorder}`, borderRadius:10, padding:'12px 16px', marginBottom:14, display:'flex', alignItems:'center', justifyContent:'space-between' }}>
                <div>
                  <span style={{ fontWeight:600, color:C.amber, fontSize:13 }}>{unknownCount} companies with unknown WMS</span>
                  <span style={{ color:C.textSub, fontSize:12, marginLeft:8 }}>
                    {researchingCount > 0 ? `Auto-researching ${researchingCount} in background...` : 'Auto-research runs on load for up to 20 at a time'}
                  </span>
                </div>
                <Button variant="plain" onClick={() => { setFilterVendor('Unknown'); setSearch('') }}
                  style={{ background:C.amber, color:'#fff', border:'none', borderRadius:6, padding:'5px 12px', fontSize:12, fontWeight:600, cursor:'pointer' }}>
                  View unknowns
                </Button>
              </div>
            )}

            {/* Cards */}
            <div style={{ display:'flex', flexDirection:'column', gap:8 }}>
              {filtered.map((c: any, i: number) => {
                const isUnknown = c.wms_entries?.every((w: any) => w.wms_system === 'Unknown')
                const isResearching = researching[c.id]
                const researchResult = researchResults[c.id]
                return (
                  <div key={c.id} data-kb-row={i} onClick={() => setSelected(c)}
                    style={{ background: tab==='db' && i===highlightedIndex ? '#FFF8DA' : C.surface, border:`1px solid ${C.border}`, borderRadius:12, padding:'14px 20px', cursor:'pointer', transition:'all 0.12s', boxShadow:'0 1px 3px rgba(0,0,0,0.04)', outline: tab==='db' && i===highlightedIndex ? '2px solid #FECC01' : 'none', outlineOffset: tab==='db' && i===highlightedIndex ? '-2px' : 0 }}
                    onMouseEnter={e => { const el = e.currentTarget as HTMLDivElement; el.style.borderColor=C.blue; el.style.boxShadow='0 2px 8px rgba(37,99,235,0.1)' }}
                    onMouseLeave={e => { const el = e.currentTarget as HTMLDivElement; el.style.borderColor=C.border; el.style.boxShadow='0 1px 3px rgba(0,0,0,0.04)' }}>
                    <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', marginBottom:8 }}>
                      <div style={{ display:'flex', alignItems:'flex-start', gap:10, minWidth:0 }}>
                        <button
                          onClick={(e) => { e.stopPropagation(); toggleStar(c.id, !c.starred) }}
                          aria-label={c.starred ? 'Unstar' : 'Star'}
                          title={c.starred ? 'Unstar' : 'Star'}
                          style={{ marginTop:3, background:'none', border:'none', padding:0, cursor:'pointer', display:'inline-flex', alignItems:'center', justifyContent:'center', lineHeight:0 }}
                        >
                          <Star size={15} fill={c.starred ? '#FECC01' : 'none'} stroke={c.starred ? '#FECC01' : '#94A3B8'} />
                        </button>
                        <div style={{ minWidth:0 }}>
                        <div style={{ fontWeight:600, fontSize:15, color:C.text }}>{c.name}</div>
                        <div style={{ color:C.textMuted, fontSize:12, marginTop:1 }}>{[c.industry, c.country].filter(Boolean).join(' ÃÂÃÂÃÂÃÂ· ')}</div>
                        </div>
                      </div>
                      <div style={{ display:'flex', gap:6, alignItems:'center' }}>
                        {c.news_updates?.length > 0 && <span style={{ background:C.redLight, color:C.red, border:`1px solid ${C.redBorder}`, borderRadius:20, padding:'2px 9px', fontSize:11, fontWeight:500 }}>{c.news_updates.length}</span>}
                        {isResearching && <span style={{ background:C.blueLight, color:C.blue, border:`1px solid ${C.blueBorder}`, borderRadius:20, padding:'2px 9px', fontSize:11 }}>Researching</span>}
                        <span style={{ color:C.textMuted, fontSize:13 }}>ÃÂÃÂ¢ÃÂÃÂÃÂÃÂº</span>
                      </div>
                    </div>
                    <div style={{ display:'flex', flexWrap:'wrap', gap:6 }}>
                      {c.wms_entries?.map((w: any) => (
                        <span key={w.id} style={{ background:vendorBg(w.vendor), color:vendorColor(w.vendor), border:`1px solid ${vendorBorder(w.vendor)}`, borderRadius:6, padding:'3px 10px', fontSize:12, fontWeight:500 }}>
                          {w.wms_system === 'Unknown' ? 'Unknown' : w.wms_system}
                          {w.version && w.version !== w.wms_system && <span style={{ opacity:0.65, fontSize:11 }}> ÃÂÃÂÃÂÃÂ· {w.version.length > 30 ? w.version.substring(0,30)+'ÃÂÃÂ¢ÃÂÃÂÃÂÃÂ¦' : w.version}</span>}
                        </span>
                      ))}
                      {c.is_3pl && (
                        <span style={{ marginLeft: 6, padding:'1px 6px', borderRadius: 4, background: C.yellowLight, color: C.text, fontSize: 10, fontWeight: 600, border:`1px solid ${C.yellowBorder}` }}>
                          3PL
                        </span>
                      )}
                    </div>
                    {researchResult && (
                      <div style={{ marginTop:8, fontSize:12, color:C.blue, background:C.blueLight, borderRadius:6, padding:'4px 10px' }}>{researchResult}
                      </div>
                    )}
                  </div>
                )
              })}
              {filtered.length === 0 && (
                <div style={{ textAlign:'center', padding:60, color:C.textMuted, background:C.surface, borderRadius:12, border:`1px solid ${C.border}` }}>No companies match your search
                </div>
              )}
            </div>
          </div>
        )}

        {/* ÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂ COMPANY DETAIL PANEL ÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂ */}
        {tab === 'db' && selected && (
          <div>
            <Button variant="plain" onClick={() => setSelected(null)}
              style={{ display:'flex', alignItems:'center', gap:6, background:'none', border:'none', color:C.blue, cursor:'pointer', fontSize:14, fontWeight:500, marginBottom:20, padding:0 }}>
              ÃÂÃÂ¢ÃÂÃÂÃÂÃÂ Back to database
            </Button>
            <div style={{ background:C.surface, border:`1px solid ${C.border}`, borderRadius:16, padding:28, boxShadow:'0 2px 8px rgba(0,0,0,0.06)' }}>
              <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', marginBottom:24, paddingBottom:20, borderBottom:`1px solid ${C.border}` }}>
                <div>
                  <h2 style={{ margin:0, fontSize:22, fontWeight:700, color:C.text }}>{selected.name}{selected.is_3pl && (
                    <Pill variant="custom" style={{ marginLeft: 8, padding:'2px 8px', borderRadius: 999, background: C.yellowLight, border:`1px solid ${C.yellowBorder}`, color: C.text, fontSize: 11, fontWeight: 600 }}>3PL Provider</Pill>
                  )}</h2>
                  <p style={{ margin:'4px 0 0', color:C.textSub, fontSize:14 }}>{[selected.industry, selected.country, selected.region].filter(Boolean).join(' ÃÂÃÂÃÂÃÂ· ')}</p>
                  {selected.third_party_logistics && (
                    <div style={{ display:'flex', alignItems:'center', gap: 8, fontSize: 13, color: C.textSub, marginTop: 6 }}>
                      <Truck size={14} />
                      <span>3PL: <strong style={{ color: C.text }}>{selected.third_party_logistics}</strong></span>
                    </div>
                  )}
                </div>
                <div style={{ display:'flex', gap:8 }}>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => selected && toggleStar(selected.id, !selected.starred)}
                    aria-label={selected?.starred ? 'Unstar company' : 'Star company'}
                    title={selected?.starred ? 'Unstar — remove from Watching list' : 'Star — add to Watching list'}
                  >
                    <Star size={16} fill={selected?.starred ? '#FECC01' : 'none'} stroke={selected?.starred ? '#FECC01' : '#475569'} />
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    leftIcon={<Pencil size={14} />}
                    onClick={() => {
                      const wmsLatest = (selected && selected.wms_entries && selected.wms_entries[0]) || null
                      const seed: Record<string, any> = {
                        name: selected?.name || '',
                        industry: selected?.industry || '',
                        country: selected?.country || '',
                        hq_city: selected?.hq_city || '',
                        wms_system: (wmsLatest && wmsLatest.wms_system) || '',
                        wms_version: (wmsLatest && wmsLatest.version) || '',
                        third_party_logistics: selected?.third_party_logistics || '',
                        is_3pl: !!selected?.is_3pl,
                        notes: selected?.notes || '',
                      }
                      setEditForm({ ...seed })
                      setEditOriginal({ ...seed })
                      setEditError(null)
                      setEditSuccess(null)
                      setEditOpen(true)
                    }}
                  >Edit</Button>
                  <Button variant="plain" onClick={(e) => { e.stopPropagation(); researchCompany(selected) }}
                    disabled={researching[selected.id]}
                    className="btn-hover"
                    style={{ display:'inline-flex', alignItems:'center', gap:6, padding:'8px 16px', borderRadius:8, background:researching[selected.id] ? C.grayLight : C.surfaceAlt, color: researching[selected.id] ? C.textMuted : C.textSub, border:`1px solid ${C.border}`, fontSize:13, fontWeight:600, height:36, cursor: researching[selected.id] ? 'default' : 'pointer', opacity: researching[selected.id] ? 0.6 : 1 }}>
                    {researching[selected.id] ? 'Researching...' : selected.wms_entries?.some((w:any) => w.wms_system === 'Unknown') ? 'Research WMS' : 'Check for news'}
                  </Button>
                  <Button variant="plain" onClick={() => { setInput(`Tell me everything about ${selected.name}'s WMS setup, any recent news, and whether our records are current.`); gotoTab('chat') }}
                    className="btn-hover"
                    style={{ padding:'8px 18px', borderRadius:8, background:C.blue, color:'#fff', border:`1px solid ${C.blue}`, fontSize:13, fontWeight:700, cursor:'pointer', display:'inline-flex', alignItems:'center', gap:6, height:36 }}>Ask AI
                  </Button>
                  <Button variant="primary" onClick={() => generateBrief(selected)}
                    disabled={briefLoading}
                    className="btn-hover"
                    style={{ display:'flex', alignItems:'center', gap:8, padding:'8px 18px', borderRadius:8, background:'#FECC01', color:'#0B1C37', border:'1px solid #E0B400', fontSize:13, fontWeight:700, cursor: briefLoading ? 'wait' : 'pointer', height:36, opacity: briefLoading ? 0.7 : 1 }}>
                    <FileText size={14} strokeWidth={2.5} />
                    {briefLoading && briefCompany?.id === selected.id ? 'GeneratingÃÂÃÂ¢ÃÂÃÂÃÂÃÂ¦' : 'Generate brief'}
                  </Button>
                  <Button variant="plain" onClick={() => fetchLookalike(selected)}
                    disabled={lookalikeLoading}
                    className="btn-hover"
                    style={{ display:'flex', alignItems:'center', gap:8, padding:'8px 18px', borderRadius:8, background:C.yellowLight, color:'#0B1C37', border:'1px solid #E0B400', fontSize:13, fontWeight:600, cursor:'pointer', height:36 }}>
                    <Users size={14} />
                    {lookalikeLoading && lookalikeSource?.id === selected.id ? 'SearchingÃÂÃÂ¢ÃÂÃÂÃÂÃÂ¦' : 'Find similar'}
                  </Button>
                  <Button variant="primary" onClick={() => generateInmail(selected)}
                    disabled={inmailLoading}
                    className="btn-hover"
                    style={{ display:'flex', alignItems:'center', gap:8, padding:'8px 18px', borderRadius:8, background:'#FECC01', color:'#0B1C37', border:'1px solid #E0B400', fontSize:13, fontWeight:700, cursor: inmailLoading ? 'wait' : 'pointer', height:36, opacity: inmailLoading ? 0.7 : 1 }}>
                    <MessageSquare size={14} strokeWidth={2.5} />
                    {inmailLoading && inmailCompany?.id === selected.id ? 'DraftingÃÂÃÂ¢ÃÂÃÂÃÂÃÂ¦' : 'Draft InMail'}
                  </Button>
                </div>
              </div>

              {/* Research result */}
              {researchResults[selected.id] && (
                <div style={{ background:C.blueLight, border:`1px solid ${C.blueBorder}`, borderRadius:10, padding:'10px 16px', marginBottom:20, fontSize:13, color:C.blue, fontWeight:500 }}>Research: {researchResults[selected.id]}
                </div>
              )}

              {/* WMS Systems */}
              <div style={{ marginBottom:24 }}>
                <div style={{ fontSize:11, fontWeight:700, color:C.textSub, textTransform:'uppercase', letterSpacing:'0.06em', marginBottom:12 }}>WMS Systems</div>
                {selected.wms_entries?.map((w: any) => (
                  <div key={w.id} style={{ background:vendorBg(w.vendor), border:`1px solid ${vendorBorder(w.vendor)}`, borderRadius:10, padding:'14px 18px', marginBottom:10 }}>
                    <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center' }}>
                      <div>
                        <div style={{ fontWeight:700, fontSize:15, color:vendorColor(w.vendor) }}>{w.wms_system}</div>
                        <div style={{ fontSize:12, color:C.textSub, marginTop:3 }}>{[w.vendor, w.version, w.site_name].filter(Boolean).join(' ÃÂÃÂÃÂÃÂ· ')}</div>
                      </div>
                      <span style={{ fontSize:11, padding:'3px 10px', borderRadius:20, background: w.status==='Active' ? C.greenLight : C.amberLight, color: w.status==='Active' ? C.green : C.amber, border:`1px solid ${w.status==='Active' ? C.greenBorder : C.amberBorder}`, fontWeight:500 }}>
                        {w.status}
                      </span>
                    </div>
                    {w.notes && <div style={{ marginTop:10, fontSize:12, color:C.textSub, paddingTop:10, borderTop:`1px solid ${vendorBorder(w.vendor)}` }}>{w.notes}</div>}
                  </div>
                ))}
              </div>

              {/* News */}
              {selected.news_updates?.length > 0 && (
                <div style={{ marginBottom:24 }}>
                  <div style={{ fontSize:11, fontWeight:700, color:C.textSub, textTransform:'uppercase', letterSpacing:'0.06em', marginBottom:12 }}>Latest Intelligence</div>
                  {selected.news_updates.sort((a:any,b:any) => new Date(b.published_at||b.created_at).getTime()-new Date(a.published_at||a.created_at).getTime()).map((n: any) => (
                    <div key={n.id} style={{ background:C.redLight, border:`1px solid ${C.redBorder}`, borderRadius:10, padding:'12px 16px', marginBottom:8 }}>
                      <div style={{ fontWeight:600, fontSize:14, color:C.red }}>{n.title}</div>
                      {n.summary && <div style={{ marginTop:4, fontSize:13, color:C.textSub }}>{n.summary}</div>}
                      <div style={{ marginTop:6, fontSize:11, color:C.textMuted }}>
                        {(() => { const dc = newsDateColor(n.published_at || n.created_at); return (<span style={{ padding:'2px 8px', borderRadius:6, background:dc.bg, color:dc.fg, border:`1px solid ${dc.border}`, fontSize:11, fontWeight:500 }}>{dc.label}</span>) })()}
                        {n.source && <span style={{ marginLeft:8 }}>ÃÂÃÂÃÂÃÂ· <a href={n.source.startsWith('http') ? n.source : '#'} target="_blank" rel="noopener" style={{ color:C.blue, textDecoration:'none' }}>Source ÃÂÃÂ¢ÃÂÃÂÃÂÃÂ</a></span>}
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {/* Timeline ÃÂÃÂ¢ÃÂÃÂÃÂÃÂ vertical chronological feed of all news_updates */}
              {(() => {
                const tl = (selected.news_updates || [])
                  .slice()
                  .sort((a:any,b:any) => new Date(b.published_at||b.created_at).getTime() - new Date(a.published_at||a.created_at).getTime())
                if (tl.length === 0) return null
                const cap = timelineExpanded ? tl.length : Math.min(25, tl.length)
                const shown = tl.slice(0, cap)
                return (
                  <div style={{ marginBottom:24 }}>
                    <div style={{ fontSize:11, fontWeight:700, color:C.textSub, textTransform:'uppercase', letterSpacing:'0.06em', marginBottom:12 }}>Timeline</div>
                    <div style={{ position:'relative', paddingLeft:18 }}>
                      <div style={{ position:'absolute', left:5, top:6, bottom:6, width:2, background:C.border }} />
                      {shown.map((n: any) => {
                        const isOpen = !!expandedTimelineEntries[n.id]
                        const dRaw = n.published_at || n.created_at
                        const dateStr = dRaw ? new Date(dRaw).toLocaleDateString('en-GB', { day:'numeric', month:'short', year:'numeric' }) : 'undated'
                        const lvlBg = n.impact_level === 'High' ? C.redLight : n.impact_level === 'Info' ? C.greenLight : C.amberLight
                        const lvlFg = n.impact_level === 'High' ? C.red    : n.impact_level === 'Info' ? C.green     : C.amber
                        const lvlBd = n.impact_level === 'High' ? C.redBorder : n.impact_level === 'Info' ? C.greenBorder : C.amberBorder
                        return (
                          <div key={n.id} style={{ position:'relative', paddingBottom:14, paddingLeft:14 }}>
                            <div style={{ position:'absolute', left:-4, top:6, width:12, height:12, borderRadius:'50%', background:lvlFg, border:`2px solid ${C.surface}`, boxShadow:`0 0 0 1px ${lvlBd}` }} />
                            <div style={{ display:'flex', alignItems:'center', gap:8, marginBottom:4, flexWrap:'wrap' }}>
                              <span style={{ fontSize:11, padding:'2px 8px', borderRadius:20, background:C.surfaceAlt, border:`1px solid ${C.border}`, color:C.textSub, fontWeight:500 }}>{dateStr}</span>
                              <span style={{ fontSize:11, padding:'2px 8px', borderRadius:20, background:lvlBg, color:lvlFg, border:`1px solid ${lvlBd}`, fontWeight:600 }}>{n.impact_level || 'Info'}</span>
                              {signalBadge(n.signal_type)}
                            </div>
                            <div onClick={() => setExpandedTimelineEntries(p => ({ ...p, [n.id]: !p[n.id] }))} style={{ cursor:'pointer' }}>
                              <div style={{ fontWeight:600, fontSize:14, color:C.text, marginBottom:3 }}>{n.title || 'Untitled'}</div>
                              {n.summary && (
                                <div style={{ fontSize:13, color:C.textSub, lineHeight:1.5, display:'-webkit-box', WebkitLineClamp: isOpen ? ('unset' as any) : 2, WebkitBoxOrient:'vertical', overflow: isOpen ? 'visible' : 'hidden' }}>{n.summary}</div>
                              )}
                              {isOpen && n.proposed_wms_system && (
                                <div style={{ fontSize:12, marginTop:6, color:C.amber }}>Proposed change: {n.proposed_wms_system}</div>
                              )}
                              {isOpen && n.source && (
                                <div style={{ fontSize:12, marginTop:6 }}><a href={n.source.startsWith('http') ? n.source : '#'} target="_blank" rel="noopener" style={{ color:C.blue, textDecoration:'none' }} onClick={e => e.stopPropagation()}>Source ÃÂÃÂ¢ÃÂÃÂÃÂÃÂ</a></div>
                              )}
                            </div>
                          </div>
                        )
                      })}
                    </div>
                    {tl.length > 25 && (
                      <Button variant="ghost" onClick={() => setTimelineExpanded(v => !v)} style={{ marginTop:8, background:'transparent', color:C.blue, border:`1px solid ${C.border}`, borderRadius:6, padding:'4px 12px', fontSize:12, cursor:'pointer', fontWeight:500 }}>
                        {timelineExpanded ? 'Show first 25' : `Show all (${tl.length})`}
                      </Button>
                    )}
                  </div>
                )
              })()}

              {selected.notes && (
                <div>
                  <div style={{ fontSize:11, fontWeight:700, color:C.textSub, textTransform:'uppercase', letterSpacing:'0.06em', marginBottom:8 }}>Notes</div>
                  <div style={{ background:C.surfaceAlt, border:`1px solid ${C.border}`, borderRadius:10, padding:'12px 16px', fontSize:13, color:C.textSub }}>{selected.notes}</div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* ÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂ NEWS TAB ÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂ */}
        {tab === 'news' && (
          <div>
            <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:20 }}>
              <div>
                <h2 style={{ margin:0, fontSize:20, fontWeight:700, color:C.text }}>Intelligence Feed</h2>
                <p style={{ margin:'4px 0 0', fontSize:13, color:C.textSub }}>All news, research findings, and WMS updates ÃÂÃÂ¢ÃÂÃÂÃÂÃÂ newest first. Auto-refreshes every 5 minutes.</p>
              </div>
              <div style={{ display:'flex', gap:8, alignItems:'center' }}>
                <label style={{ fontSize:12, color:C.textSub, display:'flex', alignItems:'center', gap:6, cursor:'pointer', marginRight:8 }}><DSInput plain type="checkbox" checked={showDismissed} onChange={e => setShowDismissed(e.target.checked)} style={{ margin:0 }} />Show dismissed</label>
                <span style={{ fontSize:12, color:C.textMuted }}>Last updated: {mounted && lastRefresh ? lastRefresh.toLocaleTimeString('en-GB', { hour:'2-digit', minute:'2-digit' }) : 'ÃÂÃÂ¢ÃÂÃÂÃÂÃÂ'}</span>
                <Button variant="plain" onClick={load} disabled={refreshing}
                  style={{ background:C.blueLight, color:C.blue, border:`1px solid ${C.blueBorder}`, borderRadius:8, padding:'7px 14px', fontSize:13, fontWeight:600, cursor:refreshing?'default':'pointer', opacity:refreshing?0.6:1, display:'flex', alignItems:'center', gap:6 }}>
                  <span style={{ display:'inline-block', animation:refreshing?'spin 0.8s linear infinite':'none' }}>ÃÂÃÂ¢ÃÂÃÂÃÂÃÂ»</span>
                  {refreshing ? 'Refreshing...' : 'Refresh now'}
                </Button>
              </div>
            </div>

            {allNews.length === 0 ? (
              <div style={{ textAlign:'center', padding:60, color:C.textMuted, background:C.surface, borderRadius:12, border:`1px solid ${C.border}` }}>
                <div style={{ fontSize:32, marginBottom:12 }}></div>
                <div style={{ fontWeight:600, marginBottom:6 }}>No news yet</div>
                <div style={{ fontSize:13 }}>News and research findings will appear here automatically as the AI discovers new information.</div>
              </div>
            ) : (
              <div style={{ display:'flex', flexDirection:'column', gap:10 }}>
                <div style={{ display:'flex', gap: 6, marginBottom: 12 }}>
                  <Button variant="plain" onClick={()=>setNewsRecencyFilter('12m')} style={{ padding:'4px 10px', borderRadius:999, fontSize:12, fontWeight:500, background: newsRecencyFilter==='12m' ? C.yellowLight : C.surfaceAlt, color: newsRecencyFilter==='12m' ? C.text : C.textSub, border:`1px solid ${newsRecencyFilter==='12m' ? C.yellowBorder : C.border}`, cursor:'pointer' }}>Last 12 months</Button>
                  <Button variant="plain" onClick={()=>setNewsRecencyFilter('all')} style={{ padding:'4px 10px', borderRadius:999, fontSize:12, fontWeight:500, background: newsRecencyFilter==='all' ? C.yellowLight : C.surfaceAlt, color: newsRecencyFilter==='all' ? C.text : C.textSub, border:`1px solid ${newsRecencyFilter==='all' ? C.yellowBorder : C.border}`, cursor:'pointer' }}>All time</Button>
                </div>
                {allNews.filter((n: any) => { if (n.archived) return false; if (newsRecencyFilter === '12m') { const d = new Date(n.published_at || n.created_at); if (!isNaN(d.getTime()) && (Date.now() - d.getTime()) > 365 * 86400000) return false } return true }).map((n: any, i: number) => {
                  const company = companies.find(c => c.id === n.companyId)
                  const isRecent = new Date(n.published_at||n.created_at).getTime() > Date.now() - 24*60*60*1000
                  return (
                    <div key={n.id || i} data-kb-row={i}
                      style={{ background: tab==='news' && i===highlightedIndex ? '#FFF8DA' : C.surface, border:`1px solid ${isRecent ? C.blueBorder : C.border}`, borderRadius:12, padding:'16px 20px', boxShadow:'0 1px 3px rgba(0,0,0,0.04)', cursor:'pointer', outline: tab==='news' && i===highlightedIndex ? '2px solid #FECC01' : 'none', outlineOffset: tab==='news' && i===highlightedIndex ? '-2px' : 0 }}
                      onClick={() => { setSelected(company); gotoTab('db') }}>
                      <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', marginBottom:8 }}>
                        <div style={{ display:'flex', gap:10, alignItems:'center' }}>
                          {isRecent && <span style={{ background:C.blueLight, color:C.blue, border:`1px solid ${C.blueBorder}`, borderRadius:20, padding:'2px 8px', fontSize:10, fontWeight:700 }}>NEW</span>}
                          <span style={{ background: n.impact_level === 'High' ? C.redLight : n.impact_level === 'Info' ? C.greenLight : C.amberLight,
                            color: n.impact_level === 'High' ? C.red : n.impact_level === 'Info' ? C.green : C.amber,
                            border: `1px solid ${n.impact_level === 'High' ? C.redBorder : n.impact_level === 'Info' ? C.greenBorder : C.amberBorder}`,
                            borderRadius:20, padding:'2px 8px', fontSize:11, fontWeight:500 }}>
                            {n.impact_level || 'Info'}
                          </span>
                          {signalBadge(n.signal_type)}
                        </div>
                        <span style={{ fontSize:11, color:C.textMuted }}>
                          {(() => { const dc = newsDateColor(n.published_at || n.created_at); return (<span style={{ padding:'2px 8px', borderRadius:6, background:dc.bg, color:dc.fg, border:`1px solid ${dc.border}`, fontSize:11, fontWeight:500 }}>{dc.label}</span>) })()}
                        </span>
                      </div>
                      {n.proposed_wms_system && n.status !== 'verified' && (
                        <div style={{ display:'flex', alignItems:'center', gap:10, padding:'8px 12px', marginBottom:8, background:C.amberLight, border:`1px solid ${C.amberBorder}`, borderRadius:8, flexWrap:'wrap' }}>
                          <span style={{ fontSize:12, color:C.amber, fontWeight:600 }}>Proposed change:</span>
                          <span style={{ fontSize:12, color:C.textSub }}>{(company?.wms_entries?.[0]?.wms_system) || 'Unknown'} ÃÂÃÂ¢ÃÂÃÂÃÂÃÂ <span style={{ color:C.amber, fontWeight:600 }}>{n.proposed_wms_system}</span></span>
                          <Button variant="plain" onClick={(e) => { e.stopPropagation(); applyChange(n.id) }} disabled={newsBusy[n.id]} style={{ marginLeft:'auto', background:C.amber, color:'#fff', border:'none', borderRadius:6, padding:'4px 12px', fontSize:11, fontWeight:600, cursor: newsBusy[n.id] ? 'default' : 'pointer', opacity: newsBusy[n.id] ? 0.5 : 1 }}>Apply change</Button>
                        </div>
                      )}
                      <div style={{ fontWeight:600, fontSize:14, color:C.text, marginBottom:4 }}>{n.title}</div>
                      {n.summary && <div style={{ fontSize:13, color:C.textSub, marginBottom:6 }}>{n.summary}</div>}
                      <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center' }}>
                        <span style={{ fontSize:12, color:C.blue, fontWeight:500 }}>{n.companyName}</span>
                        {company?.last_researched_at && <span style={{ fontSize:11, color:C.textMuted, marginLeft:6 }}>ÃÂÃÂÃÂÃÂ· last researched {timeAgo(company.last_researched_at)}</span>}
                        <Button variant="plain" onClick={(e) => { e.stopPropagation(); setNewsStatus(n.id, n.status === 'verified' ? 'pending' : 'verified') }} disabled={newsBusy[n.id]} style={{ background: n.status === 'verified' ? C.greenLight : 'transparent', color: n.status === 'verified' ? C.green : C.textSub, border: `1px solid ${n.status === 'verified' ? C.greenBorder : C.border}`, borderRadius:6, padding:'2px 9px', fontSize:11, cursor: newsBusy[n.id] ? 'default' : 'pointer', fontWeight:500, marginRight:6, opacity: newsBusy[n.id] ? 0.5 : 1 }}>{n.status === 'verified' ? 'Verified' : 'Verify'}</Button><Button variant="plain" onClick={(e) => { e.stopPropagation(); setNewsStatus(n.id, n.status === 'dismissed' ? 'pending' : 'dismissed') }} disabled={newsBusy[n.id]} style={{ background: n.status === 'dismissed' ? C.redLight : 'transparent', color: n.status === 'dismissed' ? C.red : C.textSub, border: `1px solid ${n.status === 'dismissed' ? C.redBorder : C.border}`, borderRadius:6, padding:'2px 9px', fontSize:11, cursor: newsBusy[n.id] ? 'default' : 'pointer', fontWeight:500, marginRight:6, opacity: newsBusy[n.id] ? 0.5 : 1 }}>{n.status === 'dismissed' ? 'Dismissed' : 'Dismiss'}</Button><Button variant="ghost" onClick={(e) => { e.stopPropagation(); generateLinkedInPosts(n) }} disabled={linkedinLoading}
                          style={{ background:'transparent', color:C.blue, border:`1px solid ${C.border}`, borderRadius:6, padding:'2px 9px', fontSize:11, cursor:'pointer', fontWeight:500, marginRight:6, display:'inline-flex', alignItems:'center', gap:4 }}>
                          <Linkedin size={11} />Draft LinkedIn post
                        </Button>
                        {n.source && <a href={n.source.startsWith('http') ? n.source : '#'} target="_blank" rel="noopener" onClick={e => e.stopPropagation()} style={{ fontSize:11, color:C.blue, textDecoration:'none' }}>Source ÃÂÃÂ¢ÃÂÃÂÃÂÃÂ</a>}
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        )}

        {/* ÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂ CHAT TAB ÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂ */}
        {tab === 'chat' && (
          <div style={{ background:C.surface, border:`1px solid ${C.border}`, borderRadius:16, display:'flex', flexDirection:'column', height:'calc(100vh - 130px)', boxShadow:'0 2px 8px rgba(0,0,0,0.06)' }}>
            <div style={{ padding:'12px 20px', borderBottom:`1px solid ${C.border}`, display:'flex', alignItems:'center', gap:8 }}>
              <div style={{ width:8, height:8, borderRadius:'50%', background:C.green }}></div>
              <span style={{ color:C.textSub, fontSize:13 }}>Claude connected ÃÂÃÂÃÂÃÂ· {companies.length} companies ÃÂÃÂÃÂÃÂ· web search enabled</span>
            </div>
            <div style={{ flex:1, overflowY:'auto', padding:20, display:'flex', flexDirection:'column', gap:14 }}>
              {messages.map((m, i) => (
                <div key={i} style={{ display:'flex', justifyContent:m.role==='user'?'flex-end':'flex-start', gap:10 }}>
                  {m.role==='assistant' && <div style={{ width:30, height:30, borderRadius:8, background:'#0B1C37', boxShadow:'inset 0 -2px 0 rgba(254,204,1,0.25)', display:'flex', alignItems:'center', justifyContent:'center', fontSize:14, flexShrink:0, marginTop:2 }}></div>}
                  {m.role === 'user' ? (
                    <div style={{ maxWidth:'72%', borderRadius:14, padding:'10px 16px', fontSize:14, lineHeight:1.65, whiteSpace:'pre-wrap', background:'linear-gradient(135deg,#2563eb,#1d4ed8)', color:'#fff', border:'none' }}>
                      {m.content}
                    </div>
                  ) : (
                    <div style={{ maxWidth:'72%', borderRadius:14, padding:'10px 16px', fontSize:14, lineHeight:1.65, background:C.surfaceAlt, color:C.text, border:`1px solid ${C.border}` }}
                      dangerouslySetInnerHTML={{ __html: renderMarkdown(m.content) }} />
                  )}
                </div>
              ))}
              {loading && (
                <div style={{ display:'flex', gap:10 }}>
                  <div style={{ width:30, height:30, borderRadius:8, background:'#0B1C37', boxShadow:'inset 0 -2px 0 rgba(254,204,1,0.25)', display:'flex', alignItems:'center', justifyContent:'center', fontSize:14 }}></div>
                  <div style={{ background:C.surfaceAlt, border:`1px solid ${C.border}`, borderRadius:14, padding:'12px 16px', display:'flex', gap:6, alignItems:'center' }}>
                    {[0,1,2].map(i => <div key={i} style={{ width:7, height:7, borderRadius:'50%', background:C.blue, animation:`blink 1.2s ${i*0.2}s infinite` }}></div>)}
                  </div>
                </div>
              )}
              <div ref={chatEnd}/>
            </div>
            <div style={{ padding:'14px 16px', borderTop:`1px solid ${C.border}` }}>
              <div style={{ display:'flex', gap:10, marginBottom:10 }}>
                <DSInput plain value={input} onChange={e=>setInput(e.target.value)}
                  onKeyDown={e=>e.key==='Enter'&&!e.shiftKey&&send()}
                  placeholder="Ask about any company, WMS system, or trend..."
                  style={{ flex:1, background:C.surfaceAlt, border:`1px solid ${C.border}`, borderRadius:10, padding:'10px 14px', color:C.text, fontSize:14, outline:'none' }} />
                <Button variant="plain" onClick={send} disabled={loading||!input.trim()}
                  style={{ padding:'10px 20px', borderRadius:10, background:C.blue, color:'#fff', border:'none', fontSize:14, fontWeight:600, cursor:'pointer', opacity:loading||!input.trim()?0.4:1 }}>
                  Send
                </Button>
              </div>
              <div style={{ display:'flex', gap:6, flexWrap:'wrap' }}>
                {['Who uses Blue Yonder Dispatcher?','What WMS does DHL use?','Which companies are Unknown?','Who uses Manhattan?','Compare Blue Yonder vs Manhattan'].map(q=>(
                  <Button variant="plain" key={q} onClick={()=>setInput(q)}
                    style={{ fontSize:11, color:C.blue, background:C.blueLight, border:`1px solid ${C.blueBorder}`, borderRadius:6, padding:'4px 10px', cursor:'pointer', fontWeight:500 }}>
                    {q}
                  </Button>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* ÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂ ADD TAB ÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂ */}
        {tab === 'add' && (
          <div style={{ maxWidth:680 }}>
            <div style={{ background:C.surface, border:`1px solid ${C.border}`, borderRadius:16, padding:28, boxShadow:'0 2px 8px rgba(0,0,0,0.06)' }}>
              <h2 style={{ margin:'0 0 6px', fontSize:18, fontWeight:700, color:C.text }}>Add Company & WMS Entry</h2>
              <p style={{ margin:'0 0 24px', fontSize:13, color:C.textSub }}>Add a new company and their WMS system to the intelligence database.</p>
              <div style={{ display:'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr', gap:14, marginBottom:14 }}>
                {([['Company Name *','name','e.g. ASOS'],['Industry','industry','e.g. Fashion Retail'],['Country','country','e.g. United Kingdom'],['Region','region','e.g. EMEA']] as [string,string,string][]).map(([label,field,ph])=>(
                  <div key={field}>
                    <label style={{ fontSize:12, fontWeight:600, color:C.textSub, display:'block', marginBottom:6 }}>{label}</label>
                    <DSInput plain value={(form as any)[field]} onChange={e=>setForm({...form,[field]:e.target.value})} placeholder={ph}
                      style={{ width:'100%', background:C.surfaceAlt, border:`1px solid ${C.border}`, borderRadius:8, padding:'9px 12px', color:C.text, fontSize:13, outline:'none', boxSizing:'border-box' }} />
                  </div>
                ))}
              </div>
              <div style={{ height:1, background:C.border, margin:'4px 0 18px' }}/>
              <div style={{ display:'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr', gap:14, marginBottom:14 }}>
                {([['WMS System *','wms_system','e.g. Blue Yonder Dispatcher'],['Vendor','vendor','e.g. Blue Yonder'],['Version','version','e.g. Blue Yonder Dispatcher'],['Site / Hub','site_name','e.g. UK DC']] as [string,string,string][]).map(([label,field,ph])=>(
                  <div key={field}>
                    <label style={{ fontSize:12, fontWeight:600, color:C.textSub, display:'block', marginBottom:6 }}>{label}</label>
                    <DSInput plain value={(form as any)[field]} onChange={e=>setForm({...form,[field]:e.target.value})} placeholder={ph}
                      style={{ width:'100%', background:C.surfaceAlt, border:`1px solid ${C.border}`, borderRadius:8, padding:'9px 12px', color:C.text, fontSize:13, outline:'none', boxSizing:'border-box' }} />
                  </div>
                ))}
              </div>
              <div style={{ marginTop: 12 }}>
                <label style={{ display:'block', fontSize: 12, color: C.textSub, marginBottom: 4 }}>Third-party logistics provider (optional)</label>
                <DSInput plain type="text" value={newCompany3PL || ''} onChange={e=>setNewCompany3PL(e.target.value)} placeholder="e.g. Unipart, Gist, Clipper" style={{ width:'100%', padding:'8px 10px', borderRadius: 8, border:`1px solid ${C.border}`, fontSize: 14 }} />
              </div>
              <div style={{ marginTop: 8, marginBottom: 16, display:'flex', alignItems:'center', gap: 8 }}>
                <DSInput plain id="is3pl" type="checkbox" checked={newCompanyIs3PL || false} onChange={e=>setNewCompanyIs3PL(e.target.checked)} />
                <label htmlFor="is3pl" style={{ fontSize: 13, color: C.textSub }}>This company is itself a 3PL provider</label>
              </div>
              <div style={{ marginBottom:20 }}>
                <label style={{ fontSize:12, fontWeight:600, color:C.textSub, display:'block', marginBottom:6 }}>Notes / Intel</label>
                <DSTextarea plain value={form.notes} onChange={e=>setForm({...form,notes:e.target.value})} rows={3}
                  placeholder="Any intelligence, news signals, or context..."
                  style={{ width:'100%', background:C.surfaceAlt, border:`1px solid ${C.border}`, borderRadius:8, padding:'9px 12px', color:C.text, fontSize:13, outline:'none', resize:'none', boxSizing:'border-box' }} />
              </div>
              <Button variant="plain" onClick={addEntry} disabled={saving||!form.name||!form.wms_system}
                style={{ width:'100%', padding:'12px', borderRadius:10, background:C.blue, color:'#fff', border:'none', fontSize:14, fontWeight:600, cursor:'pointer', opacity:saving||!form.name||!form.wms_system?0.5:1 }}>
                {saving?'Saving...':'Add to Database'}
              </Button>
              {saved && <div style={{ marginTop:12, background:C.greenLight, color:C.green, border:`1px solid ${C.greenBorder}`, borderRadius:8, padding:'10px', textAlign:'center', fontSize:13, fontWeight:500 }}>Added successfully!</div>}
            </div>
            <div style={{ background:C.surface, border:`1px solid ${C.border}`, borderRadius:16, padding:28, boxShadow:'0 2px 8px rgba(0,0,0,0.06)', marginTop:14 }}>
              <h2 style={{ margin:'0 0 6px', fontSize:18, fontWeight:700, color:C.text }}>Bulk Add Companies</h2>
              <p style={{ margin:'0 0 18px', fontSize:13, color:C.textSub }}>Paste a list of company names ÃÂÃÂ¢ÃÂÃÂÃÂÃÂ one per line. Each is added with WMS = Unknown and queued for auto-research.</p>
              <div style={{ display:'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr', gap:14, marginBottom:14 }}>
                <div>
                  <label style={{ fontSize:12, fontWeight:600, color:C.textSub, display:'block', marginBottom:6 }}>Industry (applies to all)</label>
                  <DSInput plain value={bulkIndustry} onChange={e => setBulkIndustry(e.target.value)} placeholder="e.g. 3PL" style={{ width:'100%', background:C.surfaceAlt, border:`1px solid ${C.border}`, borderRadius:8, padding:'9px 12px', color:C.text, fontSize:13, outline:'none', boxSizing:'border-box' }} />
                </div>
                <div>
                  <label style={{ fontSize:12, fontWeight:600, color:C.textSub, display:'block', marginBottom:6 }}>Country (applies to all)</label>
                  <DSInput plain value={bulkCountry} onChange={e => setBulkCountry(e.target.value)} placeholder="e.g. United Kingdom" style={{ width:'100%', background:C.surfaceAlt, border:`1px solid ${C.border}`, borderRadius:8, padding:'9px 12px', color:C.text, fontSize:13, outline:'none', boxSizing:'border-box' }} />
                </div>
              </div>
              <DSTextarea plain value={bulkText} onChange={e => setBulkText(e.target.value)} rows={6} placeholder={'Tesco\nOcado\nDPD UK\nKuehne+Nagel'} style={{ width:'100%', background:C.surfaceAlt, border:`1px solid ${C.border}`, borderRadius:8, padding:'9px 12px', color:C.text, fontSize:13, outline:'none', resize:'vertical', boxSizing:'border-box', fontFamily:'inherit', marginBottom:14 }} />
              <Button variant="plain" onClick={bulkImport} disabled={bulkBusy || !bulkText.trim()} style={{ width:'100%', padding:'12px', borderRadius:10, background:C.purple, color:'#fff', border:'none', fontSize:14, fontWeight:600, cursor: bulkBusy || !bulkText.trim() ? 'default' : 'pointer', opacity: bulkBusy || !bulkText.trim() ? 0.5 : 1 }}>{bulkBusy ? 'Importing...' : `Import ${bulkText.split('\n').map(s => s.trim()).filter(Boolean).length} companies`}</Button>
              {bulkResult && (
                <div style={{ marginTop:12, background: bulkResult.error ? C.redLight : C.greenLight, color: bulkResult.error ? C.red : C.green, border: `1px solid ${bulkResult.error ? C.redBorder : C.greenBorder}`, borderRadius:8, padding:'10px', textAlign:'center', fontSize:13, fontWeight:500 }}>
                  {bulkResult.error ? `${bulkResult.error}` : `${bulkResult.added ?? 0} added ÃÂÃÂÃÂÃÂ· ${bulkResult.skipped ?? 0} skipped (duplicates)`}
                </div>
              )}
            </div>
            <div style={{ background:C.surface, border:`1px solid ${C.border}`, borderRadius:16, padding:28, boxShadow:'0 2px 8px rgba(0,0,0,0.06)', marginTop:14 }}>
              <h2 style={{ margin:'0 0 6px', fontSize:18, fontWeight:700, color:C.text }}>Discover New Companies</h2>
              <p style={{ margin:'0 0 18px', fontSize:13, color:C.textSub }}>Tell Claude what kind of company you're prospecting and it'll search the web for fresh, unduplicated targets ÃÂÃÂ¢ÃÂÃÂÃÂÃÂ with hiring-signal flags.</p>
              <div style={{ display:'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr', gap:14, marginBottom:14 }}>
                <div>
                  <label style={{ fontSize:12, fontWeight:600, color:C.textSub, display:'block', marginBottom:6 }}>Industry / vertical</label>
                  <DSInput plain value={suggestIndustry} onChange={e => setSuggestIndustry(e.target.value)} placeholder="3PL, Retail, Supermarket, Pharma, ÃÂÃÂ¢ÃÂÃÂÃÂÃÂ¦" style={{ width:'100%', background:C.surfaceAlt, border:`1px solid ${C.border}`, borderRadius:8, padding:'9px 12px', color:C.text, fontSize:13, outline:'none', boxSizing:'border-box' }} />
                </div>
                <div>
                  <label style={{ fontSize:12, fontWeight:600, color:C.textSub, display:'block', marginBottom:6 }}>Country</label>
                  <DSInput plain value={suggestCountry} onChange={e => setSuggestCountry(e.target.value)} placeholder="e.g. United Kingdom" style={{ width:'100%', background:C.surfaceAlt, border:`1px solid ${C.border}`, borderRadius:8, padding:'9px 12px', color:C.text, fontSize:13, outline:'none', boxSizing:'border-box' }} />
                </div>
              </div>
              <Button variant="plain" onClick={getSuggestions} disabled={suggestBusy || !suggestIndustry.trim()} style={{ width:'100%', padding:'12px', borderRadius:10, background:C.purple, color:'#fff', border:'none', fontSize:14, fontWeight:600, cursor: suggestBusy || !suggestIndustry.trim() ? 'default' : 'pointer', opacity: suggestBusy || !suggestIndustry.trim() ? 0.5 : 1 }}>{suggestBusy ? 'Searching the web...' : 'Get Claude\'s suggestions'}</Button>
              {suggestError && <div style={{ marginTop:12, background:C.redLight, color:C.red, border:`1px solid ${C.redBorder}`, borderRadius:8, padding:'10px', textAlign:'center', fontSize:13 }}>{suggestError}</div>}
              {suggestions.length > 0 && (
                <div style={{ marginTop:18, display:'flex', flexDirection:'column', gap:10 }}>
                  {suggestions.map((s: any) => (
                    <div key={s.name} style={{ background:C.surfaceAlt, border:`1px solid ${C.border}`, borderRadius:10, padding:'12px 14px' }}>
                      <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', gap:10 }}>
                        <div style={{ flex:1, minWidth:0 }}>
                          <div style={{ display:'flex', gap:8, alignItems:'center', marginBottom:4, flexWrap:'wrap' }}>
                            <span style={{ fontWeight:600, fontSize:14, color:C.text }}>{s.name}</span>
                            {signalBadge(s.signal)}
                          </div>
                          <div style={{ fontSize:12, color:C.textMuted, marginBottom:4 }}>{[s.industry, s.country].filter(Boolean).join(' ÃÂÃÂÃÂÃÂ· ')}</div>
                          {s.rationale && <div style={{ fontSize:12, color:C.textSub }}>{s.rationale}</div>}
                        </div>
                        <Button variant="plain" onClick={() => addSuggestion(s)} disabled={addingSuggestion[s.name]} style={{ background:C.blue, color:'#fff', border:'none', borderRadius:8, padding:'7px 14px', fontSize:12, fontWeight:600, cursor: addingSuggestion[s.name] ? 'default' : 'pointer', opacity: addingSuggestion[s.name] ? 0.5 : 1, flexShrink:0 }}>{addingSuggestion[s.name] ? 'Adding...' : '+ Add'}</Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {/* LEARN TAB */}
        {tab === 'learn' && (
          <div style={{ maxWidth: 1200 }}>
            <div style={{ marginBottom: 22 }}>
              <h1 style={{ margin: '0 0 4px', fontSize: 26, fontWeight: 700, color: C.text, letterSpacing: -0.4 }}>Learn</h1>
              <p style={{ margin: 0, fontSize: 14, color: C.textSub }}>WMS market reference for swi-tch consultants</p>
            </div>
            <div role='tablist' style={{ display: 'flex', gap: 6, marginBottom: 20, borderBottom: '1px solid ' + C.border, paddingBottom: 10, flexWrap: 'wrap' }}>
              {([['vendors','Vendors'],['sectors','Sectors'],['glossary','Glossary'],['ask','Ask anything']] as const).map(([k, label]) => {
                const active = learnView === k
                return (
                  <Button key={k} variant='plain' onClick={() => setLearnView(k)}
                    style={{ padding: '7px 14px', borderRadius: 8, fontSize: 13, cursor: 'pointer', border: 'none', background: active ? C.blueLight : 'transparent', color: active ? C.blue : C.textSub, fontWeight: active ? 600 : 400 }}>{label}</Button>
                )
              })}
            </div>

            {learnView === 'vendors' && (
              <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : 'repeat(3, 1fr)', gap: 16 }}>
                {VENDORS.map(v => {
                  const palette = [C.blue, C.purple, C.green, C.amber, C.red, C.teal]
                  const idx = Math.abs([...v.slug].reduce((a, ch) => a + ch.charCodeAt(0), 0)) % palette.length
                  const accent = palette[idx]
                  return (
                    <button key={v.slug} onClick={() => setLearnVendorSlug(v.slug)} className='btn-hover'
                      style={{ textAlign: 'left', cursor: 'pointer', background: C.surface, border: '1px solid ' + C.border, borderRadius: 12, padding: 18, display: 'flex', flexDirection: 'column', gap: 8 }}>
                      <div style={{ fontSize: 16, fontWeight: 700, color: accent, letterSpacing: -0.2 }}>{v.name}</div>
                      <div style={{ fontSize: 12, color: C.textSub, lineHeight: 1.5 }}>{v.oneLiner}</div>
                      <div style={{ fontSize: 11, color: C.textMuted, marginTop: 4 }}>Founded {v.founded} · HQ {v.hq.split(',')[0]}</div>
                    </button>
                  )
                })}
              </div>
            )}

            {learnView === 'sectors' && (
              <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : 'repeat(3, 1fr)', gap: 16 }}>
                {SECTORS.map(sec => {
                  const palette = [C.blue, C.purple, C.green, C.amber, C.red, C.teal]
                  const idx = Math.abs([...sec.slug].reduce((a, ch) => a + ch.charCodeAt(0), 0)) % palette.length
                  const accent = palette[idx]
                  return (
                    <button key={sec.slug} onClick={() => setLearnSectorSlug(sec.slug)} className='btn-hover'
                      style={{ textAlign: 'left', cursor: 'pointer', background: C.surface, border: '1px solid ' + C.border, borderRadius: 12, padding: 18, display: 'flex', flexDirection: 'column', gap: 8 }}>
                      <div style={{ fontSize: 16, fontWeight: 700, color: accent, letterSpacing: -0.2 }}>{sec.name}</div>
                      <div style={{ fontSize: 12, color: C.textSub, lineHeight: 1.5 }}>{sec.oneLiner}</div>
                      <div style={{ fontSize: 11, color: C.textMuted, marginTop: 4 }}>{sec.exampleCompanies.slice(0, 3).join(' · ')}</div>
                    </button>
                  )
                })}
              </div>
            )}

            {learnView === 'glossary' && (() => {
              const qq = learnGlossarySearch.trim().toLowerCase()
              const filtered = qq ? GLOSSARY.filter(t => t.term.toLowerCase().includes(qq) || (t.expansion || '').toLowerCase().includes(qq) || t.short.toLowerCase().includes(qq) || (t.long || '').toLowerCase().includes(qq)) : GLOSSARY
              const sorted = [...filtered].sort((a, b) => a.term.localeCompare(b.term))
              const groups: Record<string, typeof GLOSSARY> = {}
              sorted.forEach(t => { const k = t.term[0].toUpperCase(); if (!groups[k]) groups[k] = []; groups[k].push(t) })
              const letters = Object.keys(groups).sort()
              return (
                <div>
                  <div style={{ marginBottom: 16, maxWidth: 480 }}>
                    <DSInput placeholder='Filter glossary...' value={learnGlossarySearch} onChange={(e: any) => setLearnGlossarySearch(e.target.value)} leftIcon={<Search size={14} />} />
                  </div>
                  {letters.length === 0 && (
                    <div style={{ padding: 30, textAlign: 'center', color: C.textMuted, fontSize: 13 }}>No terms match.</div>
                  )}
                  {letters.map(letter => (
                    <div key={letter} style={{ marginBottom: 18 }}>
                      <div style={{ position: 'sticky', top: 0, background: C.bg, padding: '6px 0', fontSize: 14, fontWeight: 700, color: C.blue, borderBottom: '1px solid ' + C.border, marginBottom: 8, zIndex: 2 }}>{letter}</div>
                      {groups[letter].map(t => (
                        <div key={t.term} style={{ padding: '10px 0', borderBottom: '1px solid ' + C.border }}>
                          <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'baseline', gap: 8 }}>
                            <span style={{ fontSize: 14, fontWeight: 600, color: C.text }}>{t.term}</span>
                            {t.expansion && <span style={{ fontSize: 12, color: C.textSub, fontStyle: 'italic' }}>{t.expansion}</span>}
                            <span style={{ fontSize: 10, padding: '1px 6px', borderRadius: 4, background: C.surfaceAlt, color: C.textMuted, textTransform: 'uppercase', letterSpacing: 0.4 }}>{t.category}</span>
                          </div>
                          <div style={{ fontSize: 13, color: C.textSub, marginTop: 4, lineHeight: 1.5 }}>{t.short}</div>
                          {t.long && <div style={{ fontSize: 12, color: C.textMuted, marginTop: 4, lineHeight: 1.55 }}>{t.long}</div>}
                          {t.related && t.related.length > 0 && (
                            <div style={{ marginTop: 6, fontSize: 11, color: C.textMuted }}>Related: {t.related.join(', ')}</div>
                          )}
                        </div>
                      ))}
                    </div>
                  ))}
                </div>
              )
            })()}

            {learnView === 'ask' && (
              <div style={{ maxWidth: 760 }}>
                <p style={{ margin: '0 0 14px', fontSize: 13, color: C.textSub }}>Ask any factual question about the WMS market. Answers come from Claude, drawing on widely-published vendor and sector information.</p>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 12 }}>
                  {[
                    "What's the difference between Manhattan SCALE and Manhattan Active?",
                    "Which 3PLs use Blue Yonder?",
                    "What does a SAP EWM consultant typically do?",
                    "How is grocery WMS different from general retail?",
                  ].map(qq => (
                    <Button key={qq} variant='plain' onClick={() => setLearnAskInput(qq)}
                      style={{ padding: '6px 12px', borderRadius: 99, fontSize: 12, background: C.surfaceAlt, color: C.textSub, border: '1px solid ' + C.border, cursor: 'pointer' }}>{qq}</Button>
                  ))}
                </div>
                <div style={{ display: 'flex', gap: 8, alignItems: 'flex-start' }}>
                  <div style={{ flex: 1 }}>
                    <DSInput placeholder='Ask anything about the WMS market...' value={learnAskInput} onChange={(e: any) => setLearnAskInput(e.target.value)} onKeyDown={(e: any) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); submitLearnAsk(learnAskInput) } }} />
                  </div>
                  <Button variant='primary' disabled={!learnAskInput.trim() || learnAskLoading} onClick={() => submitLearnAsk(learnAskInput)}>{learnAskLoading ? 'Thinking...' : 'Ask'}</Button>
                </div>
                {learnAskError && (
                  <div style={{ marginTop: 14, padding: 12, borderRadius: 8, background: C.redLight, border: '1px solid ' + C.redBorder, color: C.red, fontSize: 13 }}>{learnAskError}</div>
                )}
                {learnAskAnswer && (
                  <div style={{ marginTop: 18, padding: 18, background: C.surface, border: '1px solid ' + C.border, borderRadius: 12 }}>
                    {learnAskCached && (<div style={{ fontSize: 11, color: C.textMuted, marginBottom: 8 }}>From cache</div>)}
                    <div style={{ fontSize: 13, color: C.text }} dangerouslySetInnerHTML={{ __html: renderMarkdown(learnAskAnswer) }} />
                  </div>
                )}
              </div>
            )}

            <Modal isOpen={!!learnVendorSlug} onClose={() => setLearnVendorSlug(null)} size='lg' title={(VENDORS.find(x => x.slug === learnVendorSlug) || { name: '' }).name}>
              {(() => {
                const v = VENDORS.find(x => x.slug === learnVendorSlug)
                if (!v) return null
                const palette = [C.blue, C.purple, C.green, C.amber, C.red, C.teal]
                const idx = Math.abs([...v.slug].reduce((a, ch) => a + ch.charCodeAt(0), 0)) % palette.length
                const accent = palette[idx]
                return (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 18, fontSize: 13, color: C.text, lineHeight: 1.6 }}>
                    <div style={{ fontSize: 13, color: C.textSub, fontStyle: 'italic' }}>{v.oneLiner}</div>
                    <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : 'auto 1fr', gap: '4px 16px', fontSize: 12 }}>
                      <span style={{ color: C.textMuted }}>Founded</span><span>{v.founded}</span>
                      <span style={{ color: C.textMuted }}>HQ</span><span>{v.hq}</span>
                      <span style={{ color: C.textMuted }}>Ownership</span><span>{v.ownership}</span>
                      <span style={{ color: C.textMuted }}>Customer size</span><span>{v.typicalCustomerSize}</span>
                    </div>
                    <div>
                      <div style={{ fontSize: 11, fontWeight: 600, textTransform: 'uppercase', color: accent, letterSpacing: 0.5, marginBottom: 6 }}>History</div>
                      <div style={{ fontSize: 13, color: C.text, lineHeight: 1.65 }}>{v.history}</div>
                    </div>
                    <div>
                      <div style={{ fontSize: 11, fontWeight: 600, textTransform: 'uppercase', color: accent, letterSpacing: 0.5, marginBottom: 6 }}>Flagship products</div>
                      <ul style={{ margin: 0, paddingLeft: 18 }}>
                        {v.flagshipProducts.map(p => (
                          <li key={p.name} style={{ marginBottom: 6 }}><span style={{ fontWeight: 600 }}>{p.name}</span> — <span style={{ color: C.textSub }}>{p.description}</span></li>
                        ))}
                      </ul>
                    </div>
                    <div>
                      <div style={{ fontSize: 11, fontWeight: 600, textTransform: 'uppercase', color: accent, letterSpacing: 0.5, marginBottom: 6 }}>Industries</div>
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>{v.industries.map(i => (<span key={i} style={{ fontSize: 12, padding: '3px 9px', borderRadius: 99, background: C.surfaceAlt, color: C.textSub }}>{i}</span>))}</div>
                    </div>
                    <div>
                      <div style={{ fontSize: 11, fontWeight: 600, textTransform: 'uppercase', color: accent, letterSpacing: 0.5, marginBottom: 6 }}>Known customers (publicised)</div>
                      <div style={{ fontSize: 13, color: C.textSub }}>{v.knownCustomers.join(' · ')}</div>
                    </div>
                    <div>
                      <div style={{ fontSize: 11, fontWeight: 600, textTransform: 'uppercase', color: accent, letterSpacing: 0.5, marginBottom: 6 }}>Topics to explore with candidates</div>
                      <ul style={{ margin: 0, paddingLeft: 18 }}>
                        {v.topicsToExplore.map(t => (<li key={t} style={{ marginBottom: 4 }}>{t}</li>))}
                      </ul>
                    </div>
                    <div>
                      <div style={{ fontSize: 11, fontWeight: 600, textTransform: 'uppercase', color: accent, letterSpacing: 0.5, marginBottom: 6 }}>Further reading</div>
                      <ul style={{ margin: 0, paddingLeft: 18, color: C.textSub }}>
                        {v.furtherReading.map(t => (<li key={t} style={{ marginBottom: 4 }}>{t}</li>))}
                      </ul>
                    </div>
                  </div>
                )
              })()}
            </Modal>

            <Modal isOpen={!!learnSectorSlug} onClose={() => setLearnSectorSlug(null)} size='lg' title={(SECTORS.find(x => x.slug === learnSectorSlug) || { name: '' }).name}>
              {(() => {
                const sec = SECTORS.find(x => x.slug === learnSectorSlug)
                if (!sec) return null
                const palette = [C.blue, C.purple, C.green, C.amber, C.red, C.teal]
                const idx = Math.abs([...sec.slug].reduce((a, ch) => a + ch.charCodeAt(0), 0)) % palette.length
                const accent = palette[idx]
                return (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 18, fontSize: 13, color: C.text, lineHeight: 1.6 }}>
                    <div style={{ fontSize: 13, color: C.textSub, fontStyle: 'italic' }}>{sec.oneLiner}</div>
                    <div>
                      <div style={{ fontSize: 11, fontWeight: 600, textTransform: 'uppercase', color: accent, letterSpacing: 0.5, marginBottom: 6 }}>What makes it special</div>
                      <div style={{ fontSize: 13, color: C.text, lineHeight: 1.65 }}>{sec.whatMakesItSpecial}</div>
                    </div>
                    <div>
                      <div style={{ fontSize: 11, fontWeight: 600, textTransform: 'uppercase', color: accent, letterSpacing: 0.5, marginBottom: 6 }}>Common WMS choices</div>
                      <ul style={{ margin: 0, paddingLeft: 18 }}>
                        {sec.commonWmsChoices.map(c2 => (<li key={c2} style={{ marginBottom: 4 }}>{c2}</li>))}
                      </ul>
                    </div>
                    <div>
                      <div style={{ fontSize: 11, fontWeight: 600, textTransform: 'uppercase', color: accent, letterSpacing: 0.5, marginBottom: 6 }}>Key metrics</div>
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>{sec.keyMetrics.map(m => (<span key={m} style={{ fontSize: 12, padding: '3px 9px', borderRadius: 99, background: C.surfaceAlt, color: C.textSub }}>{m}</span>))}</div>
                    </div>
                    <div>
                      <div style={{ fontSize: 11, fontWeight: 600, textTransform: 'uppercase', color: accent, letterSpacing: 0.5, marginBottom: 6 }}>Topics to explore</div>
                      <ul style={{ margin: 0, paddingLeft: 18 }}>
                        {sec.topicsToExplore.map(t => (<li key={t} style={{ marginBottom: 4 }}>{t}</li>))}
                      </ul>
                    </div>
                    <div>
                      <div style={{ fontSize: 11, fontWeight: 600, textTransform: 'uppercase', color: accent, letterSpacing: 0.5, marginBottom: 6 }}>Example companies</div>
                      <div style={{ fontSize: 13, color: C.textSub }}>{sec.exampleCompanies.join(' · ')}</div>
                    </div>
                  </div>
                )
              })()}
            </Modal>
          </div>
        )}
      </div>

      <style>{`
        @keyframes blink{0%,100%{opacity:1}50%{opacity:0.15}}
        @keyframes spin{from{transform:rotate(0deg)}to{transform:rotate(360deg)}}
        *{box-sizing:border-box}
        input::placeholder{color:#9ca3af}
        textarea::placeholder{color:#9ca3af}
        a:hover{opacity:0.8}
        .spin{animation:spin 1s linear infinite}
        .btn-hover{transition:filter 120ms cubic-bezier(0.4,0,0.2,1), background-color 120ms cubic-bezier(0.4,0,0.2,1), border-color 120ms cubic-bezier(0.4,0,0.2,1), transform 120ms cubic-bezier(0.4,0,0.2,1)}
        .btn-hover:hover:not(:disabled){filter:brightness(0.96)}
        .btn-hover:active:not(:disabled){transform:translateY(1px)}
        .btn-ghost{transition:background-color 120ms cubic-bezier(0.4,0,0.2,1)}
        .btn-ghost:hover:not(:disabled){background:rgba(11,28,55,0.05) !important}
        button:focus-visible,a:focus-visible,input:focus-visible,textarea:focus-visible,select:focus-visible{outline:2px solid #FECC01;outline-offset:2px;border-radius:6px}
        .row-hover{transition:background-color 120ms cubic-bezier(0.4,0,0.2,1)}
        .row-hover:hover{background:rgba(11,28,55,0.03)}
        .h-scroll{overflow-x:auto;-webkit-overflow-scrolling:touch;scrollbar-width:thin}
        .h-scroll::-webkit-scrollbar{height:6px}
        .h-scroll::-webkit-scrollbar-thumb{background:rgba(11,28,55,0.18);border-radius:99px}
        .no-scrollbar{scrollbar-width:none}
        .no-scrollbar::-webkit-scrollbar{display:none}
      `}</style>
      
      {/* ÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂ PRE-PITCH BRIEF MODAL ÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂ */}
      <Modal isOpen={editOpen} onClose={() => setEditOpen(false)} title="Edit company" size="md">
        {selected && (
          <div style={{ display:'flex', flexDirection:'column', gap:12 }}>
            <DSInput label="Name" value={editForm.name || ''} onChange={(e: any) => setEditForm((f) => ({ ...f, name: e.target.value }))} />
            <DSInput label="Industry" value={editForm.industry || ''} onChange={(e: any) => setEditForm((f) => ({ ...f, industry: e.target.value }))} />
            <DSInput label="Country" value={editForm.country || ''} onChange={(e: any) => setEditForm((f) => ({ ...f, country: e.target.value }))} />
            <DSInput label="HQ city" hint="City helps the map view geocode this company. Leave blank to use country-only." value={editForm.hq_city || ''} onChange={(e: any) => setEditForm((f) => ({ ...f, hq_city: e.target.value }))} />
            <DSInput label="WMS system" value={editForm.wms_system || ''} onChange={(e: any) => setEditForm((f) => ({ ...f, wms_system: e.target.value }))} />
            <DSInput label="WMS version" value={editForm.wms_version || ''} onChange={(e: any) => setEditForm((f) => ({ ...f, wms_version: e.target.value }))} />
            <DSInput label="Third-party logistics provider" value={editForm.third_party_logistics || ''} onChange={(e: any) => setEditForm((f) => ({ ...f, third_party_logistics: e.target.value }))} />
            <label style={{ display:'flex', alignItems:'center', gap:8, fontSize:13, color: PALETTE.navy, cursor:'pointer', userSelect:'none' }}>
              <input type="checkbox" checked={!!editForm.is_3pl} onChange={(e) => setEditForm((f) => ({ ...f, is_3pl: e.target.checked }))} />
              This company is itself a 3PL provider
            </label>
            <DSTextarea label="Notes" value={editForm.notes || ''} onChange={(e: any) => setEditForm((f) => ({ ...f, notes: e.target.value }))} rows={3} />
            {editError && (
              <div style={{ fontSize:12, color: PALETTE.danger, marginTop:4 }}>{editError}</div>
            )}
            {editSuccess && (
              <div style={{ fontSize:12, color: PALETTE.navy, background: PALETTE.cream, border: '1px solid ' + PALETTE.border, padding:'6px 10px', borderRadius:8, marginTop:4 }}>{editSuccess}</div>
            )}
            <div style={{ display:'flex', justifyContent:'flex-end', gap:8, marginTop:8 }}>
              <Button variant="tertiary" onClick={() => setEditOpen(false)} disabled={editSaving}>Cancel</Button>
              <Button
                variant="primary"
                loading={editSaving}
                disabled={editSaving || (function() {
                  const keys = Object.keys(editForm)
                  for (const k of keys) {
                    if ((editForm as any)[k] !== (editOriginal as any)[k]) return false
                  }
                  return true
                })()}
                onClick={async () => {
                  if (!selected) return
                  setEditSaving(true)
                  setEditError(null)
                  setEditSuccess(null)
                  try {
                    const payload: Record<string, any> = {}
                    const keys = ['name','industry','country','hq_city','wms_system','wms_version','third_party_logistics','is_3pl','notes']
                    for (const k of keys) {
                      if ((editForm as any)[k] !== (editOriginal as any)[k]) {
                        payload[k] = (editForm as any)[k]
                      }
                    }
                    const r = await fetch('/api/companies/' + selected.id, {
                      method: 'PATCH',
                      headers: { 'Content-Type': 'application/json' },
                      body: JSON.stringify(payload),
                    })
                    if (!r.ok) {
                      const j = await r.json().catch(() => ({}))
                      throw new Error(j.error || ('HTTP ' + r.status))
                    }
                    setEditSuccess('Saved \u00b7 re-geocoding on next refresh')
                    await load()
                    setTimeout(() => { setEditOpen(false); setEditSuccess(null) }, 900)
                  } catch (e: any) {
                    setEditError(e?.message || 'Save failed')
                  } finally {
                    setEditSaving(false)
                  }
                }}
              >Save</Button>
            </div>
          </div>
        )}
      </Modal>

      <Modal isOpen={showBrief} onClose={() => !briefLoading && setShowBrief(false)} bare>
          <div onClick={(e) => e.stopPropagation()}
            style={{ background:C.surface, borderRadius: isMobile ? '14px 14px 0 0' : 16, maxWidth: isMobile ? '100%' : 720, width:'100%', maxHeight: isMobile ? '92vh' : '85vh', display:'flex', flexDirection:'column', boxShadow:'0 20px 50px rgba(0,0,0,0.25)', border:`1px solid ${C.border}` }}>
            <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', padding:'18px 22px', borderBottom:`1px solid ${C.border}`, background:'#0B1C37', color:'#fff', borderRadius:'16px 16px 0 0' }}>
              <div style={{ display:'flex', alignItems:'center', gap:10 }}>
                <Sparkles size={18} color="#FECC01" />
                <div>
                  <div style={{ fontWeight:700, fontSize:15 }}>Pre-pitch brief</div>
                  <div style={{ fontSize:12, color:'#7CC8C4', marginTop:2 }}>{briefCompany?.name || ''}</div>
                  {briefCached && briefCachedAt && (
                    <div style={{ marginTop:6, display:'flex', alignItems:'center', gap:8, fontSize:11 }}>
                      <span style={{ display:'inline-flex', alignItems:'center', gap:4, padding:'2px 8px', borderRadius:99, background:'rgba(255,255,255,0.15)', color:'#fff' }}>Cached ÃÂÃÂÃÂÃÂ· {timeAgo(briefCachedAt) || 'just now'}</span>
                      <Button variant="ghost" onClick={() => briefCompany && generateBrief(briefCompany, true)} style={{ background:'transparent', border:'none', color:'#FECC01', fontSize:11, fontWeight:600, cursor:'pointer', padding:0, textDecoration:'underline' }}>Regenerate</Button>
                    </div>
                  )}
                </div>
              </div>
              <Button variant="ghost" onClick={() => setShowBrief(false)} disabled={briefLoading}
                style={{ background:'transparent', border:'none', color:'#fff', cursor: briefLoading ? 'wait' : 'pointer', padding:6, borderRadius:6, display:'flex', alignItems:'center' }}>
                <X size={18} />
              </Button>
            </div>
            <div style={{ padding:'22px 26px', overflow:'auto', flex:1, fontSize:14, lineHeight:1.6, color:C.text }}>
              {briefLoading && (
                <div style={{ display:'flex', alignItems:'center', gap:10, color:C.textSub, padding:'30px 0' }}>
                  <RefreshCw size={16} className="spin" />
                  Generating briefÃÂÃÂ¢ÃÂÃÂÃÂÃÂ¦ this takes ~10ÃÂÃÂ¢ÃÂÃÂÃÂÃÂ20 seconds.
                </div>
              )}
              {!briefLoading && briefError && (
                <div style={{ background:'#fef2f2', border:'1px solid #fecaca', color:'#dc2626', padding:'12px 14px', borderRadius:8, fontSize:13 }}>
                  {briefError}
                </div>
              )}
              {!briefLoading && !briefError && briefText && (
                <div style={{ fontFamily:'inherit' }}
                  dangerouslySetInnerHTML={{ __html: renderMarkdown(briefText) }} />
              )}
            </div>
            <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', padding:'14px 22px', borderTop:`1px solid ${C.border}`, background:C.surfaceAlt, borderRadius:'0 0 16px 16px' }}>
              <div style={{ display:'flex', alignItems:'center', gap:12, flexWrap:'wrap' }}>
                <div style={{ fontSize:12, color:C.textMuted }}>DB context only ÃÂÃÂÃÂÃÂ· no web search</div>
                {briefCached && briefCompany && !briefLoading && briefText && (
                  <div style={{ display:'flex', alignItems:'center', gap:8, fontSize:11, color:C.textSub }}>
                    <Pill variant="custom" style={{ padding:'2px 8px', borderRadius:999, background:C.surface, border:`1px solid ${C.border}` }}>Cached ÃÂÃÂÃÂÃÂ· {timeAgo(briefCachedAt) || 'just now'}</Pill>
                    <Button variant="plain" onClick={() => generateBrief(briefCompany, true)} style={{ background:'none', border:'none', color:C.blue, fontSize:11, cursor:'pointer', textDecoration:'underline', padding:0 }}>Regenerate</Button>
                  </div>
                )}
              </div>
              <div style={{ display:'flex', flexDirection:'column', alignItems:'flex-end', gap:6 }}>
                {shareUrl && shareCopied && (
                  <div style={{ fontSize:11, color:C.textSub, display:'flex', alignItems:'center', gap:6, maxWidth:'100%' }}>
                    <span style={{ color:'#0E7C7B', fontWeight:600 }}>Link copied:</span>
                    <a href={shareUrl} target="_blank" rel="noopener noreferrer"
                      style={{ color:'#0E7C7B', textDecoration:'underline', fontFamily:'ui-monospace,SFMono-Regular,Consolas,monospace', fontSize:11, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap', maxWidth:280 }}>
                      {shareUrl}
                    </a>
                    <span style={{ color:C.textSub }}>· Opens in new tab</span>
                  </div>
                )}
                <div style={{ display:'flex', alignItems:'center', gap:8 }}>
                  <Button variant="secondary" size="sm" leftIcon={<Share2 size={14} />}
                    onClick={shareBrief}
                    disabled={!briefText || briefLoading || sharingBrief}
                    loading={sharingBrief}>
                    {shareCopied ? 'Link copied' : 'Share link'}
                  </Button>
                  <Button variant="plain" onClick={copyBrief} disabled={!briefText || briefLoading}
                    style={{ display:'flex', alignItems:'center', gap:6, padding:'8px 16px', borderRadius:8, background: briefCopied ? '#7CC8C4' : '#0B1C37', color: briefCopied ? '#0B1C37' : '#fff', border:'none', fontSize:13, fontWeight:600, cursor: (!briefText || briefLoading) ? 'not-allowed' : 'pointer', opacity: (!briefText || briefLoading) ? 0.5 : 1 }}>
                    <Copy size={14} />
                    {briefCopied ? 'Copied' : 'Copy'}
                  </Button>
                </div>
              </div>
            </div>
          </div>
        </Modal>

      {/* ÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂ INMAIL MODAL ÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂ */}
      <Modal isOpen={showInmail} onClose={() => !inmailLoading && setShowInmail(false)} bare>
          <div onClick={(e) => e.stopPropagation()}
            style={{ background:C.surface, borderRadius: isMobile ? '14px 14px 0 0' : 16, maxWidth: isMobile ? '100%' : 640, width:'100%', maxHeight: isMobile ? '92vh' : '85vh', display:'flex', flexDirection:'column', boxShadow:'0 20px 50px rgba(0,0,0,0.25)', border:`1px solid ${C.border}` }}>
            <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', padding:'18px 22px', borderBottom:`1px solid ${C.border}`, background:'#0B1C37', color:'#fff', borderRadius:'16px 16px 0 0' }}>
              <div style={{ display:'flex', alignItems:'center', gap:10 }}>
                <MessageSquare size={18} color="#FECC01" />
                <div>
                  <div style={{ fontWeight:700, fontSize:15 }}>Quick InMail</div>
                  <div style={{ fontSize:12, color:'#7CC8C4', marginTop:2 }}>{inmailCompany?.name || ''}</div>
                  {inmailCached && inmailCachedAt && (
                    <div style={{ marginTop:6, display:'flex', alignItems:'center', gap:8, fontSize:11 }}>
                      <span style={{ display:'inline-flex', alignItems:'center', gap:4, padding:'2px 8px', borderRadius:99, background:'rgba(255,255,255,0.15)', color:'#fff' }}>Cached ÃÂÃÂÃÂÃÂ· {timeAgo(inmailCachedAt) || 'just now'}</span>
                      <Button variant="ghost" onClick={() => inmailCompany && generateInmail(inmailCompany, true)} style={{ background:'transparent', border:'none', color:'#FECC01', fontSize:11, fontWeight:600, cursor:'pointer', padding:0, textDecoration:'underline' }}>Regenerate</Button>
                    </div>
                  )}
                </div>
              </div>
              <Button variant="ghost" onClick={() => setShowInmail(false)} disabled={inmailLoading}
                style={{ background:'transparent', border:'none', color:'#fff', cursor: inmailLoading ? 'wait' : 'pointer', padding:6, borderRadius:6, display:'flex', alignItems:'center' }}>
                <X size={18} />
              </Button>
            </div>
            <div style={{ padding:'22px 26px', overflow:'auto', flex:1, fontSize:14, lineHeight:1.65, color:C.text, background:C.bg }}>
              {inmailLoading && (
                <div style={{ display:'flex', alignItems:'center', gap:10, color:C.textSub, padding:'30px 0' }}>
                  <RefreshCw size={16} className="spin" />
                  Drafting InMailÃÂÃÂ¢ÃÂÃÂÃÂÃÂ¦ this takes ~5ÃÂÃÂ¢ÃÂÃÂÃÂÃÂ10 seconds.
                </div>
              )}
              {!inmailLoading && inmailError && (
                <div style={{ background:'#fef2f2', border:'1px solid #fecaca', color:'#dc2626', padding:'12px 14px', borderRadius:8, fontSize:13 }}>
                  {inmailError}
                </div>
              )}
              {!inmailLoading && !inmailError && inmailText && (
                <div style={{ whiteSpace:'pre-wrap', fontFamily:'ui-monospace, SFMono-Regular, Menlo, Consolas, monospace', fontSize:13.5, lineHeight:1.7, color:C.text, background:C.surface, border:`1px solid ${C.border}`, borderRadius:10, padding:'16px 18px' }}>{inmailText}</div>
              )}
            </div>
            <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', padding:'14px 22px', borderTop:`1px solid ${C.border}`, background:C.surfaceAlt, borderRadius:'0 0 16px 16px' }}>
              <div style={{ display:'flex', alignItems:'center', gap:12, flexWrap:'wrap' }}>
                <div style={{ fontSize:12, color:C.textMuted }}>DB context only ÃÂÃÂÃÂÃÂ· no web search ÃÂÃÂÃÂÃÂ· ~100ÃÂÃÂ¢ÃÂÃÂÃÂÃÂ130 words</div>
                {inmailCached && inmailCompany && !inmailLoading && inmailText && (
                  <div style={{ display:'flex', alignItems:'center', gap:8, fontSize:11, color:C.textSub }}>
                    <Pill variant="custom" style={{ padding:'2px 8px', borderRadius:999, background:C.surface, border:`1px solid ${C.border}` }}>Cached ÃÂÃÂÃÂÃÂ· {timeAgo(inmailCachedAt) || 'just now'}</Pill>
                    <Button variant="plain" onClick={() => generateInmail(inmailCompany, true)} style={{ background:'none', border:'none', color:C.blue, fontSize:11, cursor:'pointer', textDecoration:'underline', padding:0 }}>Regenerate</Button>
                  </div>
                )}
              </div>
              <Button variant="plain" onClick={copyInmail} disabled={!inmailText || inmailLoading}
                style={{ display:'flex', alignItems:'center', gap:6, padding:'8px 16px', borderRadius:8, background: inmailCopied ? '#7CC8C4' : '#0B1C37', color: inmailCopied ? '#0B1C37' : '#fff', border:'none', fontSize:13, fontWeight:600, cursor: (!inmailText || inmailLoading) ? 'not-allowed' : 'pointer', opacity: (!inmailText || inmailLoading) ? 0.5 : 1 }}>
                <Copy size={14} />
                {inmailCopied ? 'Copied' : 'Copy'}
              </Button>
            </div>
          </div>
        </Modal>

      {/* ÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂ LOOKALIKE COMPANIES MODAL ÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂ */}
      <Modal isOpen={lookalikeOpen} onClose={() => !lookalikeLoading && setLookalikeOpen(false)} bare>
          <div onClick={(e) => e.stopPropagation()}
            style={{ background:C.surface, border:`1px solid ${C.border}`, borderRadius: isMobile ? '14px 14px 0 0' : 16, width:'min(640px, 100%)', maxHeight: isMobile ? '92vh' : '80vh', display:'flex', flexDirection:'column', overflow:'hidden', boxShadow:'0 20px 50px rgba(11,28,55,0.18)' }}>
            <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', padding:'18px 22px', borderBottom:`1px solid ${C.border}`, background:'#0B1C37', color:'#FFFFFF' }}>
              <div style={{ display:'flex', alignItems:'center', gap:10 }}>
                <Users size={18} color="#FECC01" />
                <div style={{ fontSize:15, fontWeight:700, color:'#FFFFFF' }}>Companies similar to {lookalikeSource?.name || ''}</div>
              </div>
              <Button variant="ghost" onClick={() => setLookalikeOpen(false)} aria-label="Close"
                style={{ background:'transparent', border:'none', color:'#fff', cursor:'pointer', padding:6, borderRadius:6, display:'flex', alignItems:'center' }}>
                <X size={18} />
              </Button>
            </div>
            <div style={{ padding:'14px 22px', overflowY:'auto', flex:1 }}>
              {lookalikeLoading && (<div className="spin" style={{ color:C.textSub, fontSize:13, padding:'30px 0', textAlign:'center' }}>SearchingÃÂÃÂ¢ÃÂÃÂÃÂÃÂ¦</div>)}
              {!lookalikeLoading && lookalikeError && (<div style={{ color:C.red, fontSize:13, padding:'12px 0' }}>{lookalikeError}</div>)}
              {!lookalikeLoading && !lookalikeError && lookalikeData.length === 0 && (<div style={{ color:C.textSub, fontSize:13, padding:'30px 0', textAlign:'center' }}>No close lookalikes found yet ÃÂÃÂ¢ÃÂÃÂÃÂÃÂ try expanding industries via the bulk import.</div>)}
              {!lookalikeLoading && lookalikeData.length > 0 && lookalikeData.slice(0,10).map((row: any) => {
                const lk = companies.find((c: any) => c.id === row.id) || row
                const wmsLine = (lk.wms_entries || []).map((w: any) => w.wms_system).filter(Boolean).join(' / ') || row.wms || 'Unknown'
                const meta = [lk.industry || row.industry, lk.country || row.country, wmsLine].filter(Boolean).join(' ÃÂÃÂÃÂÃÂ· ')
                const newsArr = (lk.news_updates || []).slice().sort((a: any, b: any) => new Date(b.published_at||0).getTime() - new Date(a.published_at||0).getTime())
                const lastNews = newsArr[0]?.published_at
                const since30 = Date.now() - 30*24*60*60*1000
                const hot30 = (lk.news_updates || []).filter((n: any) => n.signal_type && n.signal_type !== 'none' && new Date(n.published_at||0).getTime() > since30).length
                return (
                  <div key={row.id} onClick={() => { setSelected(lk); setLookalikeOpen(false) }}
                    style={{ display:'flex', alignItems:'center', gap:10, padding:'10px 12px', borderRadius:10, cursor:'pointer', borderBottom:`1px solid ${C.border}` }}>
                    <div style={{ flex:1, minWidth:0 }}>
                      <div style={{ fontSize:13, fontWeight:700, color:C.text }}>{lk.name || row.name}</div>
                      <div style={{ fontSize:11, color:C.textSub, marginTop:2 }}>{meta}</div>
                    </div>
                    {lastNews && (<div style={{ fontSize:10, color:C.textMuted }}>{timeAgo(lastNews)}</div>)}
                    {hot30 > 0 && (<span style={{ fontSize:10, fontWeight:700, padding:'3px 8px', borderRadius:99, background:C.yellowLight, color:C.yellow, border:`1px solid ${C.yellowBorder}` }}>{hot30} hot</span>)}
                  </div>
                )
              })}
            </div>
            <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', padding:'14px 22px', borderTop:`1px solid ${C.border}`, background:C.surfaceAlt, borderRadius:'0 0 16px 16px' }}>
              <div style={{ fontSize:12, color:C.textMuted }}>Top {lookalikeData.length} matches</div>
              <Button variant="ghost" onClick={() => setLookalikeOpen(false)}
                style={{ padding:'8px 16px', borderRadius:8, background:'transparent', color:C.textSub, border:`1px solid ${C.border}`, fontSize:13, fontWeight:600, cursor:'pointer' }}>
                Close
              </Button>
            </div>
          </div>
        </Modal>

      {/* ÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂ LINKEDIN POST DRAFTS MODAL ÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂ */}
      <Modal isOpen={linkedinModalOpen} onClose={() => !linkedinLoading && setLinkedinModalOpen(false)} bare>
          <div onClick={(e) => e.stopPropagation()}
            style={{ background:C.surface, borderRadius: isMobile ? '14px 14px 0 0' : 16, maxWidth: isMobile ? '100%' : 780, width:'100%', maxHeight: isMobile ? '94vh' : '88vh', display:'flex', flexDirection:'column', boxShadow:'0 20px 50px rgba(0,0,0,0.25)', border:`1px solid ${C.border}` }}>
            <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', padding:'18px 22px', borderBottom:`1px solid ${C.border}`, background:'#0B1C37', color:'#fff', borderRadius:'16px 16px 0 0' }}>
              <div style={{ display:'flex', alignItems:'center', gap:10 }}>
                <Linkedin size={18} color="#FECC01" />
                <div>
                  <div style={{ fontWeight:700, fontSize:15 }}>LinkedIn post drafts</div>
                  <div style={{ fontSize:12, color:'#7CC8C4', marginTop:2 }}>{linkedinNewsTitle}</div>
                  {linkedinCached && linkedinCachedAt && (
                    <div style={{ marginTop:6, display:'flex', alignItems:'center', gap:8, fontSize:11 }}>
                      <span style={{ display:'inline-flex', alignItems:'center', gap:4, padding:'2px 8px', borderRadius:99, background:'rgba(255,255,255,0.15)', color:'#fff' }}>Cached ÃÂÃÂÃÂÃÂ· {timeAgo(linkedinCachedAt) || 'just now'}</span>
                      <Button variant="ghost" onClick={() => linkedinNewsId && generateLinkedInPosts({id:linkedinNewsId, title:linkedinNewsTitle}, true)} style={{ background:'transparent', border:'none', color:'#FECC01', fontSize:11, fontWeight:600, cursor:'pointer', padding:0, textDecoration:'underline' }}>Regenerate</Button>
                    </div>
                  )}
                </div>
              </div>
              <Button variant="ghost" onClick={() => setLinkedinModalOpen(false)} disabled={linkedinLoading}
                style={{ background:'transparent', border:'none', color:'#fff', cursor: linkedinLoading ? 'wait' : 'pointer', padding:6, borderRadius:6, display:'flex', alignItems:'center' }}>
                <X size={18} />
              </Button>
            </div>
            <div style={{ padding:'22px 26px', overflow:'auto', flex:1, fontSize:14, lineHeight:1.6, color:C.text, display:'flex', flexDirection:'column', gap:18 }}>
              {linkedinLoading && (
                <div style={{ display:'flex', alignItems:'center', gap:10, color:C.textSub, padding:'30px 0' }}>
                  <RefreshCw size={16} className="spin" />
                  Drafting three postsÃÂÃÂ¢ÃÂÃÂÃÂÃÂ¦ this takes ~10ÃÂÃÂ¢ÃÂÃÂÃÂÃÂ20 seconds.
                </div>
              )}
              {linkedinError && (
                <div style={{ background:'#fef2f2', border:'1px solid #fecaca', color:'#dc2626', padding:'12px 14px', borderRadius:8, fontSize:13 }}>
                  {linkedinError}
                </div>
              )}
              {!linkedinLoading && !linkedinError && (['insightful','conversational','contrarian'] as const).map(v => {
                const text = (linkedinPosts as any)[v] || ''
                if (!text) return null
                const labels: Record<string,string> = { insightful:'INSIGHTFUL', conversational:'CONVERSATIONAL', contrarian:'CONTRARIAN' }
                const captions: Record<string,string> = { insightful:'Sharp industry observation', conversational:'Story-led, invites comments', contrarian:'Challenges a prevailing assumption' }
                return (
                  <div key={v} style={{ background:C.surfaceAlt, border:`1px solid ${C.border}`, borderRadius:12, overflow:'hidden' }}>
                    <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', padding:'10px 14px', background:'#0B1C37', color:'#fff' }}>
                      <div style={{ display:'flex', alignItems:'center', gap:8 }}>
                        <span style={{ fontSize:11, fontWeight:700, letterSpacing:'0.06em', color:'#FECC01' }}>{labels[v]}</span>
                        <span style={{ fontSize:11, color:'#7CC8C4' }}>ÃÂÃÂÃÂÃÂ· {captions[v]}</span>
                      </div>
                      <Button variant="plain" onClick={() => copyLinkedInVariant(v)}
                        style={{ display:'flex', alignItems:'center', gap:6, padding:'4px 10px', borderRadius:6, background: copiedVariant === v ? '#7CC8C4' : '#FECC01', color:'#0B1C37', border:'none', fontSize:11, fontWeight:700, cursor:'pointer' }}>
                        <Copy size={12} />
                        {copiedVariant === v ? 'Copied!' : 'Copy'}
                      </Button>
                    </div>
                    <div style={{ padding:'14px 16px', whiteSpace:'pre-wrap', fontFamily:'inherit', fontSize:13, lineHeight:1.7, color:C.text }}>
                      {text}
                    </div>
                  </div>
                )
              })}
            </div>
            <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', padding:'14px 22px', borderTop:`1px solid ${C.border}`, background:C.surfaceAlt, borderRadius:'0 0 16px 16px' }}>
              <div style={{ display:'flex', alignItems:'center', gap:12, flexWrap:'wrap' }}>
                <div style={{ fontSize:12, color:C.textMuted }}>DB context only ÃÂÃÂÃÂÃÂ· no web search</div>
                {linkedinCached && linkedinNewsId && !linkedinLoading && (
                  <div style={{ display:'flex', alignItems:'center', gap:8, fontSize:11, color:C.textSub }}>
                    <Pill variant="custom" style={{ padding:'2px 8px', borderRadius:999, background:C.surface, border:`1px solid ${C.border}` }}>Cached ÃÂÃÂÃÂÃÂ· {timeAgo(linkedinCachedAt) || 'just now'}</Pill>
                    <Button variant="plain" onClick={() => generateLinkedInPosts({ id: linkedinNewsId, title: linkedinNewsTitle }, true)} style={{ background:'none', border:'none', color:C.blue, fontSize:11, cursor:'pointer', textDecoration:'underline', padding:0 }}>Regenerate</Button>
                  </div>
                )}
              </div>
              <Button variant="ghost" onClick={() => setLinkedinModalOpen(false)}
                style={{ padding:'8px 16px', borderRadius:8, background:'transparent', color:C.textSub, border:`1px solid ${C.border}`, fontSize:13, fontWeight:600, cursor:'pointer' }}>
                Close
              </Button>
            </div>
          </div>
        </Modal>

      {/* COMMAND PALETTE — Superhuman-style ⌘K search */}
      {paletteOpen && (() => {
        const q = paletteQuery.trim().toLowerCase()
        const score = (txt: any, weight: number) => {
          if (!txt || !q) return 0
          const t = String(txt).toLowerCase()
          if (!t.includes(q)) return 0
          return t.startsWith(q) ? weight * 2 : weight
        }
        const rows: any[] = []
        if (q) {
          for (const c of companies) {
            const isPL = !!c.is_3pl
            const wmsTxt = (c.wms_entries || []).map((w: any) => (w.wms_system || '') + ' ' + (w.vendor || '')).join(' ')
            const total = score(c.name, 10) + score(wmsTxt, 4) + score(c.country, 3) + score(c.industry, 3) + score(c.third_party_logistics, 3)
            if (total > 0) {
              rows.push({
                type: isPL ? '3pl' : 'company',
                score: total,
                recency: new Date(c.updated_at || c.created_at || 0).getTime(),
                data: c,
              })
            }
          }
          for (const n of allNews as any[]) {
            const total = score(n.headline, 10) + score(n.summary, 3)
            if (total > 0) {
              rows.push({
                type: 'news',
                score: total,
                recency: new Date(n.published_at || n.created_at || 0).getTime(),
                data: n,
              })
            }
          }
        }
        const grouped: { [k: string]: any[] } = { company: [], news: [], '3pl': [] }
        for (const r of rows) grouped[r.type].push(r)
        for (const k of Object.keys(grouped)) {
          grouped[k].sort((a: any, b: any) => b.score - a.score || b.recency - a.recency)
          grouped[k] = grouped[k].slice(0, 5)
        }
        const display: any[] = [...grouped.company, ...grouped.news, ...grouped['3pl']].slice(0, 12)
        const activeIdx = display.length === 0 ? 0 : Math.max(0, Math.min(paletteIndex, display.length - 1))
        const openRow = (r: any) => {
          if (r.type === 'company' || r.type === '3pl') {
            setSelected(r.data)
            gotoTab('db')
          } else if (r.type === 'news') {
            gotoTab('news')
          }
          setPaletteOpen(false)
        }
        const onInputKey = (e: any) => {
          if (e.key === 'Escape') { e.preventDefault(); setPaletteOpen(false); return }
          if (e.key === 'ArrowDown') { e.preventDefault(); if (display.length > 0) setPaletteIndex((i: number) => (i + 1) % display.length); return }
          if (e.key === 'ArrowUp') { e.preventDefault(); if (display.length > 0) setPaletteIndex((i: number) => (i - 1 + display.length) % display.length); return }
          if (e.key === 'Enter') { e.preventDefault(); if (display[activeIdx]) openRow(display[activeIdx]); return }
          if ((e.metaKey || e.ctrlKey) && (e.key === 'k' || e.key === 'K')) { e.preventDefault(); setPaletteOpen(false); return }
        }
        let renderedIdx = -1
        const sectionTitle = (s: string) => (
          <div key={'sec-' + s} style={{ fontSize:11, fontWeight:700, color:C.textMuted, textTransform:'uppercase', letterSpacing:0.6, padding:'10px 16px 4px' }}>{s}</div>
        )
        const renderRow = (r: any) => {
          renderedIdx += 1
          const idx = renderedIdx
          const isActive = idx === activeIdx
          const rowBase: any = {
            display:'flex', alignItems:'center', gap:10, padding:'10px 16px', cursor:'pointer',
            background: isActive ? C.yellowLight : 'transparent',
            borderLeft: isActive ? ('3px solid ' + C.yellowBorder) : '3px solid transparent',
          }
          if (r.type === 'company') {
            const c = r.data
            const wms = (c.wms_entries || [])[0]
            const wmsName = (wms && (wms.wms_system || wms.vendor)) || ''
            return (
              <div key={'co-' + c.id + '-' + idx}
                onMouseEnter={() => setPaletteIndex(idx)}
                onClick={() => openRow(r)} style={rowBase}>
                <Building2 size={16} style={{ color:C.blue, flexShrink:0 }} />
                <div style={{ flex:1, minWidth:0 }}>
                  <div style={{ fontSize:13, fontWeight:600, color:C.text, whiteSpace:'nowrap', overflow:'hidden', textOverflow:'ellipsis' }}>{c.name}</div>
                  <div style={{ fontSize:11, color:C.textMuted, marginTop:2, whiteSpace:'nowrap', overflow:'hidden', textOverflow:'ellipsis' }}>
                    {[c.industry, c.country, wmsName].filter(Boolean).join(' · ')}
                  </div>
                </div>
                {wms && wms.vendor ? <VendorPill vendor={wms.vendor} /> : null}
              </div>
            )
          }
          if (r.type === '3pl') {
            const c = r.data
            return (
              <div key={'pl-' + c.id + '-' + idx}
                onMouseEnter={() => setPaletteIndex(idx)}
                onClick={() => openRow(r)} style={rowBase}>
                <Truck size={16} style={{ color:C.yellow, flexShrink:0 }} />
                <div style={{ flex:1, minWidth:0 }}>
                  <div style={{ fontSize:13, fontWeight:600, color:C.text, display:'flex', alignItems:'center', gap:6 }}>
                    <span style={{ overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{c.name}</span>
                    <span style={{ background:C.yellowLight, color:C.yellow, border:'1px solid ' + C.yellowBorder, fontSize:10, padding:'1px 6px', borderRadius:99, fontWeight:600, flexShrink:0 }}>3PL Provider</span>
                  </div>
                  <div style={{ fontSize:11, color:C.textMuted, marginTop:2, whiteSpace:'nowrap', overflow:'hidden', textOverflow:'ellipsis' }}>
                    {[c.country].filter(Boolean).join(' · ')}
                  </div>
                </div>
              </div>
            )
          }
          const n = r.data
          const sigStatus = n.signal_status || n.status
          let sigStyle: any = { background:C.surfaceAlt, color:C.textMuted, border:'1px solid ' + C.border }
          const ss = String(sigStatus || '').toLowerCase()
          if (ss === 'hot' || ss === 'high') sigStyle = { background:C.redLight, color:C.red, border:'1px solid ' + C.redBorder }
          else if (ss === 'warm' || ss === 'medium') sigStyle = { background:C.yellowLight, color:C.yellow, border:'1px solid ' + C.yellowBorder }
          else if (ss === 'cool' || ss === 'low') sigStyle = { background:C.blueLight, color:C.blue, border:'1px solid ' + C.blueBorder }
          return (
            <div key={'nw-' + (n.id || idx) + '-' + idx}
              onMouseEnter={() => setPaletteIndex(idx)}
              onClick={() => openRow(r)} style={rowBase}>
              <Newspaper size={16} style={{ color:C.red, flexShrink:0 }} />
              <div style={{ flex:1, minWidth:0 }}>
                <div style={{ fontSize:13, fontWeight:600, color:C.text, whiteSpace:'nowrap', overflow:'hidden', textOverflow:'ellipsis' }}>{n.headline}</div>
                <div style={{ fontSize:11, color:C.textMuted, marginTop:2, whiteSpace:'nowrap', overflow:'hidden', textOverflow:'ellipsis' }}>
                  {[n.companyName, timeAgo(n.published_at || n.created_at)].filter(Boolean).join(' · ')}
                </div>
              </div>
              {sigStatus ? (
                <span style={{ ...sigStyle, fontSize:10, padding:'1px 6px', borderRadius:99, fontWeight:600, flexShrink:0, textTransform:'capitalize' }}>{sigStatus}</span>
              ) : null}
            </div>
          )
        }
        return (
          <div onMouseDown={(e) => { if (e.target === e.currentTarget) setPaletteOpen(false) }}
            style={{
              position:'fixed', inset:0, background:'rgba(11,28,55,0.5)', backdropFilter:'blur(2px)',
              zIndex:6000, display:'flex', alignItems:'flex-start', justifyContent:'center',
              paddingTop: isMobile ? 0 : '12vh',
              animation:'wmsfade 160ms cubic-bezier(0.4,0,0.2,1)',
            }}>
            <div role="dialog" aria-label="Command palette"
              style={{
                width: isMobile ? '100%' : 560,
                maxWidth: '100%',
                background: C.surface,
                borderRadius: isMobile ? 0 : 12,
                boxShadow: '0 18px 50px rgba(11,28,55,0.22)',
                border: '1px solid ' + C.border,
                maxHeight: isMobile ? '100vh' : '70vh',
                display:'flex', flexDirection:'column', overflow:'hidden',
              }}>
              <div style={{ display:'flex', alignItems:'center', gap:10, padding:'14px 16px', borderBottom:'1px solid ' + C.border }}>
                <Search size={16} style={{ color:C.textMuted, flexShrink:0 }} />
                <input
                  autoFocus
                  value={paletteQuery}
                  onChange={(e) => { setPaletteQuery(e.target.value); setPaletteIndex(0) }}
                  onKeyDown={onInputKey}
                  placeholder="Search companies, news, 3PLs…"
                  style={{ flex:1, border:'none', outline:'none', background:'transparent', fontSize:16, color:C.text, fontFamily:'inherit' }} />
              </div>
              <div style={{ overflowY:'auto', flex:1, padding:'4px 0' }}>
                {!q && (
                  <div style={{ padding:'40px 16px', textAlign:'center', color:C.textMuted, fontSize:13 }}>Type to search</div>
                )}
                {q && display.length === 0 && (
                  <div style={{ padding:'40px 16px', textAlign:'center', color:C.textMuted, fontSize:13 }}>No matches for &quot;{paletteQuery}&quot;</div>
                )}
                {q && grouped.company.length > 0 && <>{sectionTitle('Companies')}{grouped.company.map((r) => renderRow(r))}</>}
                {q && grouped.news.length > 0 && <>{sectionTitle('News')}{grouped.news.map((r) => renderRow(r))}</>}
                {q && grouped['3pl'].length > 0 && <>{sectionTitle('3PLs')}{grouped['3pl'].map((r) => renderRow(r))}</>}
              </div>
              {!isMobile && (
                <div style={{ display:'flex', alignItems:'center', gap:14, padding:'8px 16px', borderTop:'1px solid ' + C.border, background:C.surfaceAlt, fontSize:11, color:C.textMuted }}>
                  <span style={{ display:'inline-flex', alignItems:'center', gap:4 }}>
                    <kbd style={{ fontFamily:'ui-monospace, SFMono-Regular, Menlo, monospace', fontSize:10, background:C.surface, border:'1px solid ' + C.border, borderRadius:4, padding:'1px 5px' }}>↑↓</kbd> navigate
                  </span>
                  <span style={{ display:'inline-flex', alignItems:'center', gap:4 }}>
                    <kbd style={{ fontFamily:'ui-monospace, SFMono-Regular, Menlo, monospace', fontSize:10, background:C.surface, border:'1px solid ' + C.border, borderRadius:4, padding:'1px 5px' }}>↵</kbd> open
                  </span>
                  <span style={{ display:'inline-flex', alignItems:'center', gap:4 }}>
                    <kbd style={{ fontFamily:'ui-monospace, SFMono-Regular, Menlo, monospace', fontSize:10, background:C.surface, border:'1px solid ' + C.border, borderRadius:4, padding:'1px 5px' }}>Esc</kbd> close
                  </span>
                </div>
              )}
            </div>
          </div>
        )
      })()}

      {/* SHORTCUTS INDICATOR + HELP PANEL */}
      <div onClick={() => setShortcutsOpen(v => !v)}
        style={{ position:'fixed', right:14, bottom:14, padding:'6px 12px', borderRadius:99, background:C.surfaceAlt, border:`1px solid ${C.border}`, fontSize:11, color:C.textSub, cursor:'pointer', display:'flex', alignItems:'center', gap:6, zIndex:50 }}>
        <span style={{ fontFamily:'ui-monospace, SFMono-Regular, Menlo, monospace', fontSize:10, background:C.surface, border:`1px solid ${C.border}`, borderRadius:4, padding:'1px 5px', color:C.text }}>?</span>
        Shortcuts
      </div>
      {shortcutsOpen && (
        <div style={{ position:'fixed', right:14, bottom:54, padding:'14px 18px', borderRadius:12, background:C.surface, border:`1px solid ${C.border}`, fontSize:12, color:C.textSub, boxShadow:'0 8px 30px rgba(11,28,55,0.12)', zIndex:51, minWidth:260 }}>
          <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:10 }}>
            <div style={{ fontSize:13, fontWeight:700, color:C.text }}>Keyboard shortcuts</div>
            <Button variant="ghost" onClick={() => setShortcutsOpen(false)} style={{ border:'none', background:'transparent', color:C.textMuted, cursor:'pointer', padding:0, display:'flex' }}><X size={14} /></Button>
          </div>
          <div style={{ display:'grid', gridTemplateColumns:'auto 1fr', gap:'5px 14px' }}>
            {[['?','Toggle this help'],['g d','Dashboard'],['g m','Map'],['g b','Database'],['g a','AI Assistant'],['g n','News'],['g l','Learn'],['g +','Add Entry'],['j / k','Navigate items'],['Enter','Open highlighted'],['b','Generate brief'],['l','Draft LinkedIn post'],['/','Focus search'],['Esc','Close modal']].map(([k,v]) => (
              <div key={k} style={{ display:'contents' }}>
                <kbd style={{ display:'inline-block', fontFamily:'ui-monospace, "SF Mono", Consolas, monospace', fontSize:11, background:C.surfaceAlt, border:`1px solid ${C.border}`, borderRadius:4, padding:'1px 6px', color:C.text, minWidth:18, textAlign:'center', justifySelf:'start' }}>{k}</kbd>
                <span style={{ alignSelf:'center' }}>{v}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂ Mobile-only bottom tab bar ÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂ */}
      {isMobile && (
        <nav role="tablist" aria-label="Main navigation" style={{
          position: 'fixed',
          left: 0, right: 0, bottom: 0,
          height: 60,
          background: 'rgba(255,255,255,0.96)',
          backdropFilter: 'blur(12px) saturate(180%)',
          WebkitBackdropFilter: 'blur(12px) saturate(180%)',
          borderTop: '1px solid '+PALETTE.border,
          display: 'grid',
          gridTemplateColumns: 'repeat(5, 1fr)',
          paddingBottom: 'env(safe-area-inset-bottom)',
          zIndex: 5500,
        }}>
          {([
            ['dashboard','Home', LayoutDashboard],
            ['map','Map', MapIcon],
            ['db','Data', DatabaseIcon],
            ['news','News', Newspaper],
            ['add','Add', Plus],
          ] as ['dashboard'|'map'|'db'|'chat'|'add'|'news', string, any][]).map(([t, label, Icon]) => {
            const active = tab === t;
            return (
              <Button variant="ghost"
                key={t}
                role="tab"
                aria-selected={active}
                onClick={() => setTab(t)}
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: 3,
                  padding: 0,
                  background: 'transparent',
                  border: 'none',
                  cursor: 'pointer',
                  color: active ? PALETTE.navy : PALETTE.inkSoft,
                  minHeight: 44,
                  position: 'relative',
                  transition: 'color 120ms cubic-bezier(0.4,0,0.2,1)',
                }}
              >
                {active && (
                  <span style={{
                    position: 'absolute',
                    top: 0, left: '50%',
                    transform: 'translateX(-50%)',
                    width: 32, height: 3,
                    background: PALETTE.yellow,
                    borderRadius: '0 0 3px 3px',
                  }} />
                )}
                <Icon size={20} strokeWidth={active ? 2.4 : 2} />
                <span style={{ fontSize: 10, fontWeight: active ? 700 : 600, letterSpacing: 0.2 }}>{label}</span>
              </Button>
            );
          })}
        </nav>
      )}

      <PrimitivesGlobalStyles />
    </div>
  )
}
