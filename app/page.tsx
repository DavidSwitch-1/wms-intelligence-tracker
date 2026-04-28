'use client'
import { useState, useEffect, useRef, useCallback } from 'react'
import { createClient } from '@supabase/supabase-js'
import { LayoutDashboard, Database as DatabaseIcon, Sparkles, Newspaper, Plus, RefreshCw, Search, Building2, Briefcase, Hammer, Repeat, Handshake, TrendingUp, UserCog, Zap, ArrowRight, Bot, FileText, Copy, X, Linkedin, MessageCircle, MessageSquare, CheckCircle2, AlertCircle, Users , Map as MapIcon, Truck } from 'lucide-react'

import dynamic from 'next/dynamic'

const MapView = dynamic(() => import('@/components/MapView'), { ssr: false })
import { renderMarkdown } from '@/lib/markdown'

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
        const meta = [c.industry, c.country].filter(Boolean).join(' · ')
        out.push(`• ${c.name}${meta ? ' — ' + meta : ''}`)
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
      return fmt(unknowns, 'Unknown WMS') || 'All ' + companies.length + ' companies have a known WMS — research is up to date.'
    }
    const matches = findByWms(t)
    if (matches.length > 0) return fmt(matches, t)
    return 'No companies in our database currently match **' + t + '** (we track ' + companies.length + ' companies). Ask the AI to web-search for fresh candidates instead, e.g. "search the web for companies using ' + t + '".'
  }
  // 'which companies are unknown' / 'show unknowns'
  if (/(?:which|what|list|show|how\s+many).{0,40}\b(?:unknown|no\s+wms|missing\s+wms)\b/i.test(msg)) {
    const unknowns = companies.filter((c: any) => (c.wms_entries || []).some((w: any) => w.wms_system === 'Unknown'))
    if (/how\s+many/i.test(msg)) return '**' + unknowns.length + '** of our ' + companies.length + ' companies have an Unknown WMS and are queued for research.'
    return fmt(unknowns, 'Unknown WMS') || 'All companies have a known WMS — research is up to date.'
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
      return '• ' + bits.join(' · ') + (w.status ? ' (' + w.status + ')' : '')
    }).join('\n')
    const newsLines = (co.news_updates || []).slice(0, 3).map((n: any) => '• ' + n.title + (n.published_at ? ' (' + new Date(n.published_at).toLocaleDateString('en-GB') + ')' : '')).join('\n')
    const meta = [co.industry, co.country, co.region].filter(Boolean).join(' · ')
    return '**' + co.name + '**' + (meta ? ' — ' + meta : '') + '\n\n**WMS**\n' + (wmsLines || '• No WMS data') + (newsLines ? '\n\n**Recent intel**\n' + newsLines : '')
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
    { role: 'assistant', content: "Hi! I'm your WMS Intelligence Assistant. Ask me anything — e.g. \"Who uses Blue Yonder Dispatcher?\", \"What WMS does DHL use?\", or \"Which companies are Unknown?\"." }
  ])
  const [input, setInput]     = useState('')
  const [loading, setLoading] = useState(false)
  const [tab, setTab] = useState<'dashboard'|'map'|'db'|'chat'|'add'|'news'>('dashboard')

  function gotoTab(next: 'dashboard'|'map'|'db'|'chat'|'add'|'news') {
    setTab(next)
    if (typeof window !== 'undefined') {
      const targetHash = '#/' + next
      if (window.location.hash !== targetHash) window.location.hash = targetHash
    }
  }

  useEffect(() => {
    if (typeof window === 'undefined') return
    const validTabs = ['dashboard','map','db','chat','add','news']
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
  const [newCompany3PL, setNewCompany3PL] = useState('')
  const [newCompanyIs3PL, setNewCompanyIs3PL] = useState(false)
  const [newsRecencyFilter, setNewsRecencyFilter] = useState<'12m'|'all'>('12m')
  const [selected, setSelected] = useState<any>(null)
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
  const [savedViews, setSavedViews] = useState<{id:string, name:string, filters:{industry?:string, country?:string, wms?:string, signal?:string, query?:string, filter3pl?:string}}[]>([])
  const [shortcutsOpen, setShortcutsOpen] = useState(false)
  const [highlightedIndex, setHighlightedIndex] = useState(0)
  const keySeqRef = useRef<{val:string, ts:number}>({val:'', ts:0})
  const [briefCached, setBriefCached] = useState(false)
  const [briefCachedAt, setBriefCachedAt] = useState<string|null>(null)
  // InMail drafter state — mirrors the brief modal pattern.
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
        if (showBrief) { setShowBrief(false); return }
        if (showInmail) { setShowInmail(false); return }
        if (linkedinModalOpen) { setLinkedinModalOpen(false); return }
        if (lookalikeOpen) { setLookalikeOpen(false); return }
        if (shortcutsOpen) { setShortcutsOpen(false); return }
        if (selected) { setSelected(null); return }
        if (inField && ae) { ae.blur(); return }
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
      if (buf.val === 'g+') { gotoTab('add'); setSelected(null); buf.val = ''; return }
    }
    document.addEventListener('keydown', onKey)
    return () => { document.removeEventListener('keydown', onKey); if (helpTimer) clearTimeout(helpTimer) }
  }, [showBrief, showInmail, linkedinModalOpen, lookalikeOpen, shortcutsOpen, selected])

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
      if (!silent) setResearchResults(prev => ({ ...prev, [company.id]: 'Research failed — try again' }))
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
  })

  const stats = [
    { label:'Total Companies', value:companies.length, color:C.blue, bg:C.blueLight, border:C.blueBorder, filter:'All' },
    { label:'Manhattan', value:companies.filter(c=>c.wms_entries?.some((w:any)=>w.vendor?.includes('Manhattan'))).length, color:C.purple, bg:C.purpleLight, border:C.purpleBorder, filter:'Manhattan Associates' },
    { label:'Blue Yonder', value:companies.filter(c=>c.wms_entries?.some((w:any)=>w.vendor?.includes('Blue Yonder'))).length, color:C.green, bg:C.greenLight, border:C.greenBorder, filter:'Blue Yonder' },
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
    if (v?.includes('Manhattan')) return C.purple
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
    return { bg: C.surfaceMuted, fg: C.textMuted, border: C.border, label: label + ' · stale' }
  }

  function vendorBg(v: string) {
    if (v?.includes('Manhattan')) return C.purpleLight
    if (v?.includes('Blue Yonder')) return C.blueLight
    if (v?.includes('SAP')) return C.amberLight
    if (v?.includes('Oracle')) return C.tealLight
    return C.grayLight
  }
  function vendorBorder(v: string) {
    if (v?.includes('Manhattan')) return C.purpleBorder
    if (v?.includes('Blue Yonder')) return C.blueBorder
    if (v?.includes('SAP')) return C.amberBorder
    if (v?.includes('Oracle')) return C.tealBorder
    return C.grayBorder
  }

  const unknownCount = companies.filter(c => c.wms_entries?.some((w:any) => w.wms_system === 'Unknown')).length
  const researchingCount = Object.values(researching).filter(Boolean).length

  return (
    <div style={{ minHeight:'100vh', background:C.bg, color:C.text, fontFamily:'inherit' }}>

      {/* ── Header ── */}
      <div style={{ background:C.surface, borderBottom:`1px solid ${C.border}`, padding:'0 28px', display:'flex', alignItems:'center', justifyContent:'space-between', height:56, position:'sticky', top:0, zIndex:50, boxShadow:'0 1px 4px rgba(0,0,0,0.06)' }}>
        <div style={{ display:'flex', alignItems:'center', gap:12 }}>
          <div style={{ width:32, height:32, borderRadius:8, background:'linear-gradient(135deg,#2563eb,#7c3aed)', display:'flex', alignItems:'center', justifyContent:'center', fontSize:16 }}></div>
          <div>
            <div style={{ fontWeight:700, fontSize:14, color:C.text }}>WMS Intelligence</div>
            <div style={{ color:C.textMuted, fontSize:11 }}>
              {companies.length} companies
              {researchingCount > 0 && <span style={{ color:C.blue, marginLeft:6 }}>· Researching {researchingCount}...</span>}
            </div>
          </div>
        </div>
        <nav style={{ display:'flex', gap:2 }}>
          {([
            ['dashboard','Dashboard', LayoutDashboard],
            ['map','Map',MapIcon],
            ['db','Database', DatabaseIcon],
            ['chat','AI Assistant', Bot],
            ['news',`News${allNews.length > 0 ? ` (${allNews.length})` : ''}`, Newspaper],
            ['add','Add Entry', Plus],
          ] as [typeof tab, string, any][]).map(([t, label, Icon]) => (
            <button key={t} onClick={() => { gotoTab(t); setSelected(null) }}
              style={{ padding:'7px 16px', borderRadius:8, fontSize:13, cursor:'pointer', border:'none',
                background: tab===t ? C.blueLight : 'transparent',
                color: tab===t ? C.blue : C.textSub,
                fontWeight: tab===t ? 600 : 400 }}>
              <span style={{ display:'inline-flex', alignItems:'center', gap:6 }}><Icon size={14} />{label}</span>
            </button>
          ))}
        </nav>
        <div style={{ display:'flex', alignItems:'center', gap:8 }}>
          <span style={{ fontSize:11, color:C.textMuted }}>Updated {mounted && lastRefresh ? lastRefresh.toLocaleTimeString('en-GB', { hour:'2-digit', minute:'2-digit' }) : '—'}</span>
          <button onClick={load} disabled={refreshing} style={{ fontSize:12, color:C.blue, background:C.blueLight, border:`1px solid ${C.blueBorder}`, borderRadius:6, padding:'4px 10px', cursor:refreshing?'default':'pointer', fontWeight:500, opacity:refreshing?0.6:1 }}>
            {refreshing ? '↻ ...' : '↻ Refresh'}
          </button>
        </div>
      </div>

      <div style={{ maxWidth:1200, margin:'0 auto', padding:'24px 28px' }}>

        {/* ── DATABASE TAB ── */}
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
            { label: 'Manhattan', value: totalManhattan, accent: C.purple },
            { label: 'Blue Yonder', value: totalBlueYonder, accent: C.green },
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
                    <div onClick={() => setCronExpanded(v => !v)}
                      style={{ display:'flex', alignItems:'center', gap:14, padding:'10px 14px', background:C.surface, border:`1px solid ${C.border}`, borderRadius:10, cursor:'pointer', fontSize:12 }}>
                      <span style={{ display:'inline-flex', alignItems:'center', gap:6, color:dotColor, fontWeight:600 }}>
                        <span style={{ width:8, height:8, borderRadius:'50%', background:dotColor }} />
                        <StatusIcon size={14} />
                      </span>
                      <span style={{ color:C.textSub }}>Last sweep: <strong style={{ color:C.text }}>{lastIso ? timeAgo(lastIso) : 'never'}</strong></span>
                      <span style={{ color:C.textSub }}>Signals 24h: <strong style={{ color:C.text }}>{cronHealth.signals_24h ?? 0}</strong></span>
                      <RefreshCw size={12} style={{ color:C.textMuted, marginLeft:'auto' }} />
                    </div>
                    {cronExpanded && (
                      <div style={{ marginTop:6, background:C.surfaceAlt, border:`1px solid ${C.border}`, borderRadius:10, padding:'10px 14px', fontSize:11, color:C.textSub, lineHeight:1.7 }}>
                        <div>last_sweep_at: <strong style={{color:C.text}}>{cronHealth.last_sweep_at || 'never'}</strong></div>
                        <div>signals_24h: <strong style={{color:C.text}}>{cronHealth.signals_24h ?? 0}</strong></div>
                        <div>sweeps_24h: <strong style={{color:C.text}}>{cronHealth.sweeps_24h ?? 0}</strong></div>
                        <div>runs_total: <strong style={{color:C.text}}>{cronHealth.runs_total ?? 0}</strong></div>
                        <div>last_results: <strong style={{color:C.text}}>{cronHealth.last_results ?? 0}</strong></div>
                        <div>status: <strong style={{color:C.text}}>{cronHealth.status || 'unknown'}</strong></div>
                      </div>
                    )}
                  </div>
                )
              })()}
              <div style={{ display:'grid', gridTemplateColumns:'repeat(5, 1fr)', gap:10, marginBottom:24 }}>
                {stats.map(s => (
                  <div key={s.label} style={{ background:C.surface, border:`1px solid ${C.border}`, borderRadius:10, padding:'14px 16px', boxShadow:'0 1px 2px rgba(11,28,55,0.04)' }}>
                    <div style={{ fontSize:11, color:C.textMuted, fontWeight:600, textTransform:'uppercase', letterSpacing:'0.06em' }}>{s.label}</div>
                    <div style={{ fontSize:26, fontWeight:700, color:s.accent, marginTop:4, lineHeight:1 }}>{s.value}</div>
                  </div>
                ))}
              </div>
              <div style={{ display:'flex', alignItems:'center', gap:8, marginBottom:6, marginTop:8 }}>
                <Zap size={16} color={C.yellow} />
                <h3 style={{ margin:0, fontSize:14, fontWeight:700, color:C.text, letterSpacing:'-0.01em' }}>Hot Leads This Week</h3>
                <div style={{ height:1, flex:1, background:C.border, marginLeft:6 }} />
                <span style={{ fontSize:11, color:C.textMuted, fontWeight:500 }}>{hotLeads.length} signal{hotLeads.length === 1 ? '' : 's'}</span>
              </div>
              <div style={{ fontSize:12, color:C.textSub, marginBottom:14 }}>Companies with hiring or expansion activity in the last 30 days</div>
              {hotLeads.length === 0 ? (
                <div style={{ padding:'24px 16px', textAlign:'center', color:C.textMuted, background:C.surface, border:`1px dashed ${C.border}`, borderRadius:10, marginBottom:24, fontSize:13 }}>
                  No hot signals yet — the nightly cron at 2am UTC will surface new ones.
                </div>
              ) : (
                <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill, minmax(320px, 1fr))', gap:10, marginBottom:24 }}>
                  {hotLeads.slice(0, 12).map((n: any) => (
                    <div key={n.id} onClick={() => { setSelected(n._company); gotoTab('db') }} style={{ background:C.surface, border:`1px solid ${C.border}`, borderRadius:10, padding:'14px 16px', cursor:'pointer', boxShadow:'0 1px 2px rgba(11,28,55,0.04)' }}>
                      <div style={{ display:'flex', alignItems:'center', gap:6, marginBottom:6 }}>
                        {signalBadge(n.signal_type)}
                        <span style={{ fontSize:11, color:C.textMuted, marginLeft:'auto' }}>{timeAgo(n.published_at || n.created_at)}</span>
                      </div>
                      <div style={{ fontSize:13, fontWeight:700, color:C.text, marginBottom:4 }}>{n._company.name}</div>
                      <div style={{ fontSize:12, color:C.textSub, lineHeight:1.4 }}>{n.title}</div>
                    </div>
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
                  <div style={{ fontSize:12, color:C.textSub, marginBottom:14 }}>Companies the AI thinks have moved WMS — review and one-click apply</div>
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
                        <button onClick={(e) => { e.stopPropagation(); applyChange(n.id) }} disabled={newsBusy[n.id]} style={{ background:C.yellowBorder, color:C.text, border:'none', borderRadius:8, padding:'7px 14px', fontSize:12, fontWeight:700, cursor: newsBusy[n.id] ? 'default' : 'pointer', opacity: newsBusy[n.id] ? 0.5 : 1 }}>Apply change</button>
                        <button onClick={(e) => { e.stopPropagation(); setNewsStatus(n.id, 'dismissed') }} disabled={newsBusy[n.id]} style={{ background:'transparent', color:C.textSub, border:`1px solid ${C.border}`, borderRadius:8, padding:'7px 12px', fontSize:12, fontWeight:500, cursor:'pointer' }}>Dismiss</button>
                      </div>
                    ))}
                  </div>
                </>
              )}
              <div style={{ display:'flex', alignItems:'center', gap:8, marginBottom:6 }}>
                <Newspaper size={16} color={C.blue} />
                <h3 style={{ margin:0, fontSize:14, fontWeight:700, color:C.text, letterSpacing:'-0.01em' }}>Latest Intelligence</h3>
                <div style={{ height:1, flex:1, background:C.border, marginLeft:6 }} />
                <button onClick={() => gotoTab('news')} style={{ background:'transparent', border:'none', fontSize:11, color:C.blue, fontWeight:600, cursor:'pointer' }}>View all →</button>
              </div>
              <div style={{ display:'flex', flexDirection:'column', gap:6 }}>
                {sortedNews.slice(0, 5).map((n: any) => (
                  <div key={n.id} onClick={() => { setSelected(n._company); gotoTab('db') }} style={{ background:C.surface, border:`1px solid ${C.border}`, borderRadius:8, padding:'10px 14px', cursor:'pointer', display:'flex', alignItems:'center', gap:10 }}>
                    <div style={{ flex:1, minWidth:0 }}>
                      <div style={{ fontSize:13, fontWeight:600, color:C.text, marginBottom:2 }}>{n.title}</div>
                      <div style={{ fontSize:11, color:C.textMuted }}><span style={{ color:C.blue, fontWeight:500 }}>{n._company.name}</span> · {timeAgo(n.published_at || n.created_at)}</div>
                    </div>
                    <button onClick={(e) => { e.stopPropagation(); generateLinkedInPosts(n) }} disabled={linkedinLoading} title="Draft LinkedIn post"
                      style={{ background:'transparent', border:`1px solid ${C.border}`, borderRadius:6, padding:4, cursor:'pointer', display:'inline-flex', alignItems:'center', color:C.blue, marginRight:6 }}>
                      <Linkedin size={12} />
                    </button>
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
                  <option value="Körber">Körber</option>
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
                  <div style={{ pointerEvents:'auto', maxWidth:480, padding:24, background:C.surface, border:`1px solid ${C.border}`, borderRadius:12, textAlign:'center', boxShadow:'0 8px 30px rgba(11,28,55,0.12)' }}>
                    <div style={{ fontSize:14, fontWeight:600, color:C.text, marginBottom:8 }}>No companies geocoded yet</div>
                    <div style={{ fontSize:12, color:C.textSub, marginBottom:12, lineHeight:1.5 }}>Run this command to populate locations. The Nominatim service is rate-limited so you&apos;ll need to run it 4 times to cover all 187 companies.</div>
                    <code style={{ display:'block', padding:12, background:C.bg, border:`1px solid ${C.border}`, borderRadius:6, fontSize:11, fontFamily:'ui-monospace, "SF Mono", Consolas, monospace', color:C.text, marginBottom:12, wordBreak:'break-all' }}>
                      {`curl -H "Authorization: Bearer $CRON_SECRET" -X POST `}{typeof window !== 'undefined' ? window.location.origin : ''}{`/api/geocode`}
                    </code>
                    <button onClick={() => { try { navigator.clipboard.writeText(`curl -H "Authorization: Bearer $CRON_SECRET" -X POST ${window.location.origin}/api/geocode`) } catch(_) {} }} style={{ padding:'6px 12px', background:C.yellowLight, border:`1px solid ${C.yellowBorder}`, borderRadius:6, fontSize:11, color:C.text, cursor:'pointer' }}>Copy command</button>
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
            <div style={{ display:'grid', gridTemplateColumns:'repeat(4,1fr)', gap:12, marginBottom:20 }}>
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
                    {active && s.filter !== 'news' && s.filter !== 'All' && <div style={{ fontSize:10, color:s.color, marginTop:2, opacity:0.7 }}>● Active filter</div>}
                  {active && s.filter === 'All' && <div style={{ fontSize:10, color:s.color, marginTop:2, opacity:0.7 }}>● Showing all</div>}
                  </div>
                )
              })}
            </div>

            {/* Saved views strip */}
            <div style={{ display:'flex', flexWrap:'wrap', alignItems:'center', gap:6, marginBottom:12 }}>
              {savedViews.map(v => (
                <span key={v.id} style={{ display:'inline-flex', alignItems:'center', gap:4, padding:'4px 4px 4px 10px', borderRadius:99, background:C.surfaceAlt, border:`1px solid ${C.border}`, fontSize:12, color:C.textSub }}>
                  <span onClick={() => { setFilterVendor(v.filters.wms || 'All'); setSearch(v.filters.query || ''); setSelected(null); gotoTab('db') }} style={{ cursor:'pointer', fontWeight:600 }}>{v.name}</span>
                  <button onClick={() => { if(confirm('Delete saved view "' + v.name + '"?')) setSavedViews(prev => prev.filter(p => p.id !== v.id)) }}
                    style={{ display:'flex', alignItems:'center', justifyContent:'center', width:18, height:18, padding:0, border:'none', background:'transparent', color:C.textMuted, cursor:'pointer', borderRadius:99 }}>
                    <X size={11} />
                  </button>
                </span>
              ))}
              <button onClick={() => { if (filterVendor === 'All' && !search) { alert('Set a filter or search first, then save the view.'); return } const name = (prompt('Name this view:') || '').trim(); if (!name) return; const id = String(Date.now()); setSavedViews(prev => [...prev, { id, name, filters: { wms: filterVendor !== 'All' ? filterVendor : undefined, query: search || undefined } }]) }}
                style={{ display:'inline-flex', alignItems:'center', gap:4, padding:'4px 10px', borderRadius:99, background:'transparent', border:`1px dashed ${C.borderHov}`, fontSize:12, color:C.textSub, cursor:'pointer', fontWeight:600 }}>
                <Plus size={11} /> Save current view
              </button>
              {savedViews.length === 0 && (<span style={{ fontSize:11, color:C.textMuted, marginLeft:4 }}>Save filter combos here for one-click recall.</span>)}
            </div>

            {/* Search + filter */}
            <div style={{ display:'flex', gap:10, marginBottom: filterVendor !== 'All' || search ? 10 : 16 }}>
              <div style={{ flex:1, position:'relative' }}>
                <span style={{ position:'absolute', left:13, top:'50%', transform:'translateY(-50%)', color:C.textMuted }}></span>
                <input value={search} onChange={e => setSearch(e.target.value)}
                  placeholder="Search companies or WMS systems..."
                  style={{ width:'100%', background:C.surface, border:`1px solid ${C.border}`, borderRadius:10, padding:'10px 14px 10px 38px', color:C.text, fontSize:14, outline:'none', boxSizing:'border-box', boxShadow:'0 1px 3px rgba(0,0,0,0.04)' }} />
              </div>
              <select value={filterVendor} onChange={e => setFilterVendor(e.target.value)}
                style={{ background:C.surface, border:`1px solid ${C.border}`, borderRadius:10, padding:'10px 16px', color:C.text, fontSize:14, outline:'none', cursor:'pointer', boxShadow:'0 1px 3px rgba(0,0,0,0.04)' }}>
                {['All','Blue Yonder','Manhattan Associates','SAP','Oracle','Unknown','In-House'].map(v =>
                  <option key={v} value={v}>{v}</option>)}
              </select>
              <button onClick={()=>setFilter3pl(filter3pl === 'has' ? '' : 'has')} style={{ padding:'4px 10px', borderRadius: 999, fontSize: 12, fontWeight: 500, background: filter3pl === 'has' ? C.yellowLight : C.surfaceAlt, color: filter3pl === 'has' ? C.text : C.textSub, border:`1px solid ${filter3pl === 'has' ? C.yellowBorder : C.border}`, cursor:'pointer' }}>Has 3PL</button>
              <button onClick={()=>setFilter3pl(filter3pl === 'is' ? '' : 'is')} style={{ padding:'4px 10px', borderRadius: 999, fontSize: 12, fontWeight: 500, background: filter3pl === 'is' ? C.yellowLight : C.surfaceAlt, color: filter3pl === 'is' ? C.text : C.textSub, border:`1px solid ${filter3pl === 'is' ? C.yellowBorder : C.border}`, cursor:'pointer' }}>Is 3PL</button>
              {(filterVendor !== 'All' || search) && (
                <button onClick={() => { setFilterVendor('All'); setSearch('') }}
                  style={{ padding:'10px 14px', borderRadius:10, border:`1px solid ${C.border}`, background:C.surface, color:C.textSub, fontSize:13, cursor:'pointer' }}>
                  Clear</button>
              )}
            </div>

            {(filterVendor !== 'All' || search) && (
              <div style={{ background:C.blueLight, border:`1px solid ${C.blueBorder}`, borderRadius:8, padding:'8px 16px', marginBottom:14, fontSize:13, color:C.blue, display:'flex', justifyContent:'space-between' }}>
                <span>{filterVendor !== 'All' ? `Vendor: ${filterVendor}` : `Search: "${search}"`} — {filtered.length} companies</span>
                <button onClick={() => { setFilterVendor('All'); setSearch('') }} style={{ background:'none', border:'none', color:C.blue, cursor:'pointer', fontSize:13, fontWeight:600 }}>Clear</button>
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
                <button onClick={() => { setFilterVendor('Unknown'); setSearch('') }}
                  style={{ background:C.amber, color:'#fff', border:'none', borderRadius:6, padding:'5px 12px', fontSize:12, fontWeight:600, cursor:'pointer' }}>
                  View unknowns
                </button>
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
                      <div>
                        <div style={{ fontWeight:600, fontSize:15, color:C.text }}>{c.name}</div>
                        <div style={{ color:C.textMuted, fontSize:12, marginTop:1 }}>{[c.industry, c.country].filter(Boolean).join(' · ')}</div>
                      </div>
                      <div style={{ display:'flex', gap:6, alignItems:'center' }}>
                        {c.news_updates?.length > 0 && <span style={{ background:C.redLight, color:C.red, border:`1px solid ${C.redBorder}`, borderRadius:20, padding:'2px 9px', fontSize:11, fontWeight:500 }}>{c.news_updates.length}</span>}
                        {isResearching && <span style={{ background:C.blueLight, color:C.blue, border:`1px solid ${C.blueBorder}`, borderRadius:20, padding:'2px 9px', fontSize:11 }}>Researching</span>}
                        <span style={{ color:C.textMuted, fontSize:13 }}>›</span>
                      </div>
                    </div>
                    <div style={{ display:'flex', flexWrap:'wrap', gap:6 }}>
                      {c.wms_entries?.map((w: any) => (
                        <span key={w.id} style={{ background:vendorBg(w.vendor), color:vendorColor(w.vendor), border:`1px solid ${vendorBorder(w.vendor)}`, borderRadius:6, padding:'3px 10px', fontSize:12, fontWeight:500 }}>
                          {w.wms_system === 'Unknown' ? 'Unknown' : w.wms_system}
                          {w.version && w.version !== w.wms_system && <span style={{ opacity:0.65, fontSize:11 }}> · {w.version.length > 30 ? w.version.substring(0,30)+'…' : w.version}</span>}
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

        {/* ── COMPANY DETAIL PANEL ── */}
        {tab === 'db' && selected && (
          <div>
            <button onClick={() => setSelected(null)}
              style={{ display:'flex', alignItems:'center', gap:6, background:'none', border:'none', color:C.blue, cursor:'pointer', fontSize:14, fontWeight:500, marginBottom:20, padding:0 }}>
              ← Back to database
            </button>
            <div style={{ background:C.surface, border:`1px solid ${C.border}`, borderRadius:16, padding:28, boxShadow:'0 2px 8px rgba(0,0,0,0.06)' }}>
              <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', marginBottom:24, paddingBottom:20, borderBottom:`1px solid ${C.border}` }}>
                <div>
                  <h2 style={{ margin:0, fontSize:22, fontWeight:700, color:C.text }}>{selected.name}{selected.is_3pl && (
                    <span style={{ marginLeft: 8, padding:'2px 8px', borderRadius: 999, background: C.yellowLight, border:`1px solid ${C.yellowBorder}`, color: C.text, fontSize: 11, fontWeight: 600 }}>3PL Provider</span>
                  )}</h2>
                  <p style={{ margin:'4px 0 0', color:C.textSub, fontSize:14 }}>{[selected.industry, selected.country, selected.region].filter(Boolean).join(' · ')}</p>
                  {selected.third_party_logistics && (
                    <div style={{ display:'flex', alignItems:'center', gap: 8, fontSize: 13, color: C.textSub, marginTop: 6 }}>
                      <Truck size={14} />
                      <span>3PL: <strong style={{ color: C.text }}>{selected.third_party_logistics}</strong></span>
                    </div>
                  )}
                </div>
                <div style={{ display:'flex', gap:8 }}>
                  <button onClick={(e) => { e.stopPropagation(); researchCompany(selected) }}
                    disabled={researching[selected.id]}
                    style={{ padding:'8px 16px', borderRadius:8, background:researching[selected.id] ? C.grayLight : C.surfaceAlt, color: researching[selected.id] ? C.textMuted : C.textSub, border:`1px solid ${C.border}`, fontSize:13, fontWeight:500, cursor: researching[selected.id] ? 'default' : 'pointer', opacity: researching[selected.id] ? 0.6 : 1 }}>
                    {researching[selected.id] ? 'Researching...' : selected.wms_entries?.some((w:any) => w.wms_system === 'Unknown') ? 'Research WMS' : 'Check for news'}
                  </button>
                  <button onClick={() => { setInput(`Tell me everything about ${selected.name}'s WMS setup, any recent news, and whether our records are current.`); gotoTab('chat') }}
                    style={{ padding:'8px 18px', borderRadius:8, background:C.blue, color:'#fff', border:'none', fontSize:13, fontWeight:600, cursor:'pointer' }}>Ask AI
                  </button>
                  <button onClick={() => generateBrief(selected)}
                    disabled={briefLoading}
                    style={{ display:'flex', alignItems:'center', gap:6, padding:'8px 18px', borderRadius:8, background:'#FECC01', color:'#0B1C37', border:'1px solid #E0B500', fontSize:13, fontWeight:700, cursor: briefLoading ? 'wait' : 'pointer', opacity: briefLoading ? 0.7 : 1 }}>
                    <FileText size={14} strokeWidth={2.5} />
                    {briefLoading && briefCompany?.id === selected.id ? 'Generating…' : 'Generate brief'}
                  </button>
                  <button onClick={() => fetchLookalike(selected)}
                    disabled={lookalikeLoading}
                    style={{ display:'flex', alignItems:'center', gap:6, padding:'8px 18px', borderRadius:8, background:C.yellowLight, color:C.yellow, border:`1px solid ${C.yellowBorder}`, fontSize:13, fontWeight:600, cursor:'pointer' }}>
                    <Users size={14} />
                    {lookalikeLoading && lookalikeSource?.id === selected.id ? 'Searching…' : 'Find similar'}
                  </button>
                  <button onClick={() => generateInmail(selected)}
                    disabled={inmailLoading}
                    style={{ display:'flex', alignItems:'center', gap:6, padding:'8px 18px', borderRadius:8, background:'#FECC01', color:'#0B1C37', border:'1px solid #E0B500', fontSize:13, fontWeight:700, cursor: inmailLoading ? 'wait' : 'pointer', opacity: inmailLoading ? 0.7 : 1 }}>
                    <MessageSquare size={14} strokeWidth={2.5} />
                    {inmailLoading && inmailCompany?.id === selected.id ? 'Drafting…' : 'Draft InMail'}
                  </button>
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
                        <div style={{ fontSize:12, color:C.textSub, marginTop:3 }}>{[w.vendor, w.version, w.site_name].filter(Boolean).join(' · ')}</div>
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
                        {n.source && <span style={{ marginLeft:8 }}>· <a href={n.source.startsWith('http') ? n.source : '#'} target="_blank" rel="noopener" style={{ color:C.blue, textDecoration:'none' }}>Source ↗</a></span>}
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {/* Timeline — vertical chronological feed of all news_updates */}
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
                                <div style={{ fontSize:12, marginTop:6 }}><a href={n.source.startsWith('http') ? n.source : '#'} target="_blank" rel="noopener" style={{ color:C.blue, textDecoration:'none' }} onClick={e => e.stopPropagation()}>Source ↗</a></div>
                              )}
                            </div>
                          </div>
                        )
                      })}
                    </div>
                    {tl.length > 25 && (
                      <button onClick={() => setTimelineExpanded(v => !v)} style={{ marginTop:8, background:'transparent', color:C.blue, border:`1px solid ${C.border}`, borderRadius:6, padding:'4px 12px', fontSize:12, cursor:'pointer', fontWeight:500 }}>
                        {timelineExpanded ? 'Show first 25' : `Show all (${tl.length})`}
                      </button>
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

        {/* ── NEWS TAB ── */}
        {tab === 'news' && (
          <div>
            <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:20 }}>
              <div>
                <h2 style={{ margin:0, fontSize:20, fontWeight:700, color:C.text }}>Intelligence Feed</h2>
                <p style={{ margin:'4px 0 0', fontSize:13, color:C.textSub }}>All news, research findings, and WMS updates — newest first. Auto-refreshes every 5 minutes.</p>
              </div>
              <div style={{ display:'flex', gap:8, alignItems:'center' }}>
                <label style={{ fontSize:12, color:C.textSub, display:'flex', alignItems:'center', gap:6, cursor:'pointer', marginRight:8 }}><input type="checkbox" checked={showDismissed} onChange={e => setShowDismissed(e.target.checked)} style={{ margin:0 }} />Show dismissed</label>
                <span style={{ fontSize:12, color:C.textMuted }}>Last updated: {mounted && lastRefresh ? lastRefresh.toLocaleTimeString('en-GB', { hour:'2-digit', minute:'2-digit' }) : '—'}</span>
                <button onClick={load} disabled={refreshing}
                  style={{ background:C.blueLight, color:C.blue, border:`1px solid ${C.blueBorder}`, borderRadius:8, padding:'7px 14px', fontSize:13, fontWeight:600, cursor:refreshing?'default':'pointer', opacity:refreshing?0.6:1, display:'flex', alignItems:'center', gap:6 }}>
                  <span style={{ display:'inline-block', animation:refreshing?'spin 0.8s linear infinite':'none' }}>↻</span>
                  {refreshing ? 'Refreshing...' : 'Refresh now'}
                </button>
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
                  <button onClick={()=>setNewsRecencyFilter('12m')} style={{ padding:'4px 10px', borderRadius:999, fontSize:12, fontWeight:500, background: newsRecencyFilter==='12m' ? C.yellowLight : C.surfaceAlt, color: newsRecencyFilter==='12m' ? C.text : C.textSub, border:`1px solid ${newsRecencyFilter==='12m' ? C.yellowBorder : C.border}`, cursor:'pointer' }}>Last 12 months</button>
                  <button onClick={()=>setNewsRecencyFilter('all')} style={{ padding:'4px 10px', borderRadius:999, fontSize:12, fontWeight:500, background: newsRecencyFilter==='all' ? C.yellowLight : C.surfaceAlt, color: newsRecencyFilter==='all' ? C.text : C.textSub, border:`1px solid ${newsRecencyFilter==='all' ? C.yellowBorder : C.border}`, cursor:'pointer' }}>All time</button>
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
                          <span style={{ fontSize:12, color:C.textSub }}>{(company?.wms_entries?.[0]?.wms_system) || 'Unknown'} → <span style={{ color:C.amber, fontWeight:600 }}>{n.proposed_wms_system}</span></span>
                          <button onClick={(e) => { e.stopPropagation(); applyChange(n.id) }} disabled={newsBusy[n.id]} style={{ marginLeft:'auto', background:C.amber, color:'#fff', border:'none', borderRadius:6, padding:'4px 12px', fontSize:11, fontWeight:600, cursor: newsBusy[n.id] ? 'default' : 'pointer', opacity: newsBusy[n.id] ? 0.5 : 1 }}>Apply change</button>
                        </div>
                      )}
                      <div style={{ fontWeight:600, fontSize:14, color:C.text, marginBottom:4 }}>{n.title}</div>
                      {n.summary && <div style={{ fontSize:13, color:C.textSub, marginBottom:6 }}>{n.summary}</div>}
                      <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center' }}>
                        <span style={{ fontSize:12, color:C.blue, fontWeight:500 }}>{n.companyName}</span>
                        {company?.last_researched_at && <span style={{ fontSize:11, color:C.textMuted, marginLeft:6 }}>· last researched {timeAgo(company.last_researched_at)}</span>}
                        <button onClick={(e) => { e.stopPropagation(); setNewsStatus(n.id, n.status === 'verified' ? 'pending' : 'verified') }} disabled={newsBusy[n.id]} style={{ background: n.status === 'verified' ? C.greenLight : 'transparent', color: n.status === 'verified' ? C.green : C.textSub, border: `1px solid ${n.status === 'verified' ? C.greenBorder : C.border}`, borderRadius:6, padding:'2px 9px', fontSize:11, cursor: newsBusy[n.id] ? 'default' : 'pointer', fontWeight:500, marginRight:6, opacity: newsBusy[n.id] ? 0.5 : 1 }}>{n.status === 'verified' ? 'Verified' : 'Verify'}</button><button onClick={(e) => { e.stopPropagation(); setNewsStatus(n.id, n.status === 'dismissed' ? 'pending' : 'dismissed') }} disabled={newsBusy[n.id]} style={{ background: n.status === 'dismissed' ? C.redLight : 'transparent', color: n.status === 'dismissed' ? C.red : C.textSub, border: `1px solid ${n.status === 'dismissed' ? C.redBorder : C.border}`, borderRadius:6, padding:'2px 9px', fontSize:11, cursor: newsBusy[n.id] ? 'default' : 'pointer', fontWeight:500, marginRight:6, opacity: newsBusy[n.id] ? 0.5 : 1 }}>{n.status === 'dismissed' ? 'Dismissed' : 'Dismiss'}</button><button onClick={(e) => { e.stopPropagation(); generateLinkedInPosts(n) }} disabled={linkedinLoading}
                          style={{ background:'transparent', color:C.blue, border:`1px solid ${C.border}`, borderRadius:6, padding:'2px 9px', fontSize:11, cursor:'pointer', fontWeight:500, marginRight:6, display:'inline-flex', alignItems:'center', gap:4 }}>
                          <Linkedin size={11} />Draft LinkedIn post
                        </button>
                        {n.source && <a href={n.source.startsWith('http') ? n.source : '#'} target="_blank" rel="noopener" onClick={e => e.stopPropagation()} style={{ fontSize:11, color:C.blue, textDecoration:'none' }}>Source ↗</a>}
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        )}

        {/* ── CHAT TAB ── */}
        {tab === 'chat' && (
          <div style={{ background:C.surface, border:`1px solid ${C.border}`, borderRadius:16, display:'flex', flexDirection:'column', height:'calc(100vh - 130px)', boxShadow:'0 2px 8px rgba(0,0,0,0.06)' }}>
            <div style={{ padding:'12px 20px', borderBottom:`1px solid ${C.border}`, display:'flex', alignItems:'center', gap:8 }}>
              <div style={{ width:8, height:8, borderRadius:'50%', background:C.green }}></div>
              <span style={{ color:C.textSub, fontSize:13 }}>Claude connected · {companies.length} companies · web search enabled</span>
            </div>
            <div style={{ flex:1, overflowY:'auto', padding:20, display:'flex', flexDirection:'column', gap:14 }}>
              {messages.map((m, i) => (
                <div key={i} style={{ display:'flex', justifyContent:m.role==='user'?'flex-end':'flex-start', gap:10 }}>
                  {m.role==='assistant' && <div style={{ width:30, height:30, borderRadius:8, background:'linear-gradient(135deg,#2563eb,#7c3aed)', display:'flex', alignItems:'center', justifyContent:'center', fontSize:14, flexShrink:0, marginTop:2 }}></div>}
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
                  <div style={{ width:30, height:30, borderRadius:8, background:'linear-gradient(135deg,#2563eb,#7c3aed)', display:'flex', alignItems:'center', justifyContent:'center', fontSize:14 }}></div>
                  <div style={{ background:C.surfaceAlt, border:`1px solid ${C.border}`, borderRadius:14, padding:'12px 16px', display:'flex', gap:6, alignItems:'center' }}>
                    {[0,1,2].map(i => <div key={i} style={{ width:7, height:7, borderRadius:'50%', background:C.blue, animation:`blink 1.2s ${i*0.2}s infinite` }}></div>)}
                  </div>
                </div>
              )}
              <div ref={chatEnd}/>
            </div>
            <div style={{ padding:'14px 16px', borderTop:`1px solid ${C.border}` }}>
              <div style={{ display:'flex', gap:10, marginBottom:10 }}>
                <input value={input} onChange={e=>setInput(e.target.value)}
                  onKeyDown={e=>e.key==='Enter'&&!e.shiftKey&&send()}
                  placeholder="Ask about any company, WMS system, or trend..."
                  style={{ flex:1, background:C.surfaceAlt, border:`1px solid ${C.border}`, borderRadius:10, padding:'10px 14px', color:C.text, fontSize:14, outline:'none' }} />
                <button onClick={send} disabled={loading||!input.trim()}
                  style={{ padding:'10px 20px', borderRadius:10, background:C.blue, color:'#fff', border:'none', fontSize:14, fontWeight:600, cursor:'pointer', opacity:loading||!input.trim()?0.4:1 }}>
                  Send
                </button>
              </div>
              <div style={{ display:'flex', gap:6, flexWrap:'wrap' }}>
                {['Who uses Blue Yonder Dispatcher?','What WMS does DHL use?','Which companies are Unknown?','Who uses Manhattan?','Compare Blue Yonder vs Manhattan'].map(q=>(
                  <button key={q} onClick={()=>setInput(q)}
                    style={{ fontSize:11, color:C.blue, background:C.blueLight, border:`1px solid ${C.blueBorder}`, borderRadius:6, padding:'4px 10px', cursor:'pointer', fontWeight:500 }}>
                    {q}
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* ── ADD TAB ── */}
        {tab === 'add' && (
          <div style={{ maxWidth:680 }}>
            <div style={{ background:C.surface, border:`1px solid ${C.border}`, borderRadius:16, padding:28, boxShadow:'0 2px 8px rgba(0,0,0,0.06)' }}>
              <h2 style={{ margin:'0 0 6px', fontSize:18, fontWeight:700, color:C.text }}>Add Company & WMS Entry</h2>
              <p style={{ margin:'0 0 24px', fontSize:13, color:C.textSub }}>Add a new company and their WMS system to the intelligence database.</p>
              <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:14, marginBottom:14 }}>
                {([['Company Name *','name','e.g. ASOS'],['Industry','industry','e.g. Fashion Retail'],['Country','country','e.g. United Kingdom'],['Region','region','e.g. EMEA']] as [string,string,string][]).map(([label,field,ph])=>(
                  <div key={field}>
                    <label style={{ fontSize:12, fontWeight:600, color:C.textSub, display:'block', marginBottom:6 }}>{label}</label>
                    <input value={(form as any)[field]} onChange={e=>setForm({...form,[field]:e.target.value})} placeholder={ph}
                      style={{ width:'100%', background:C.surfaceAlt, border:`1px solid ${C.border}`, borderRadius:8, padding:'9px 12px', color:C.text, fontSize:13, outline:'none', boxSizing:'border-box' }} />
                  </div>
                ))}
              </div>
              <div style={{ height:1, background:C.border, margin:'4px 0 18px' }}/>
              <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:14, marginBottom:14 }}>
                {([['WMS System *','wms_system','e.g. Blue Yonder Dispatcher'],['Vendor','vendor','e.g. Blue Yonder'],['Version','version','e.g. Blue Yonder Dispatcher'],['Site / Hub','site_name','e.g. UK DC']] as [string,string,string][]).map(([label,field,ph])=>(
                  <div key={field}>
                    <label style={{ fontSize:12, fontWeight:600, color:C.textSub, display:'block', marginBottom:6 }}>{label}</label>
                    <input value={(form as any)[field]} onChange={e=>setForm({...form,[field]:e.target.value})} placeholder={ph}
                      style={{ width:'100%', background:C.surfaceAlt, border:`1px solid ${C.border}`, borderRadius:8, padding:'9px 12px', color:C.text, fontSize:13, outline:'none', boxSizing:'border-box' }} />
                  </div>
                ))}
              </div>
              <div style={{ marginTop: 12 }}>
                <label style={{ display:'block', fontSize: 12, color: C.textSub, marginBottom: 4 }}>Third-party logistics provider (optional)</label>
                <input type="text" value={newCompany3PL || ''} onChange={e=>setNewCompany3PL(e.target.value)} placeholder="e.g. Unipart, Gist, Clipper" style={{ width:'100%', padding:'8px 10px', borderRadius: 8, border:`1px solid ${C.border}`, fontSize: 14 }} />
              </div>
              <div style={{ marginTop: 8, marginBottom: 16, display:'flex', alignItems:'center', gap: 8 }}>
                <input id="is3pl" type="checkbox" checked={newCompanyIs3PL || false} onChange={e=>setNewCompanyIs3PL(e.target.checked)} />
                <label htmlFor="is3pl" style={{ fontSize: 13, color: C.textSub }}>This company is itself a 3PL provider</label>
              </div>
              <div style={{ marginBottom:20 }}>
                <label style={{ fontSize:12, fontWeight:600, color:C.textSub, display:'block', marginBottom:6 }}>Notes / Intel</label>
                <textarea value={form.notes} onChange={e=>setForm({...form,notes:e.target.value})} rows={3}
                  placeholder="Any intelligence, news signals, or context..."
                  style={{ width:'100%', background:C.surfaceAlt, border:`1px solid ${C.border}`, borderRadius:8, padding:'9px 12px', color:C.text, fontSize:13, outline:'none', resize:'none', boxSizing:'border-box' }} />
              </div>
              <button onClick={addEntry} disabled={saving||!form.name||!form.wms_system}
                style={{ width:'100%', padding:'12px', borderRadius:10, background:C.blue, color:'#fff', border:'none', fontSize:14, fontWeight:600, cursor:'pointer', opacity:saving||!form.name||!form.wms_system?0.5:1 }}>
                {saving?'Saving...':'Add to Database'}
              </button>
              {saved && <div style={{ marginTop:12, background:C.greenLight, color:C.green, border:`1px solid ${C.greenBorder}`, borderRadius:8, padding:'10px', textAlign:'center', fontSize:13, fontWeight:500 }}>Added successfully!</div>}
            </div>
            <div style={{ background:C.surface, border:`1px solid ${C.border}`, borderRadius:16, padding:28, boxShadow:'0 2px 8px rgba(0,0,0,0.06)', marginTop:14 }}>
              <h2 style={{ margin:'0 0 6px', fontSize:18, fontWeight:700, color:C.text }}>Bulk Add Companies</h2>
              <p style={{ margin:'0 0 18px', fontSize:13, color:C.textSub }}>Paste a list of company names — one per line. Each is added with WMS = Unknown and queued for auto-research.</p>
              <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:14, marginBottom:14 }}>
                <div>
                  <label style={{ fontSize:12, fontWeight:600, color:C.textSub, display:'block', marginBottom:6 }}>Industry (applies to all)</label>
                  <input value={bulkIndustry} onChange={e => setBulkIndustry(e.target.value)} placeholder="e.g. 3PL" style={{ width:'100%', background:C.surfaceAlt, border:`1px solid ${C.border}`, borderRadius:8, padding:'9px 12px', color:C.text, fontSize:13, outline:'none', boxSizing:'border-box' }} />
                </div>
                <div>
                  <label style={{ fontSize:12, fontWeight:600, color:C.textSub, display:'block', marginBottom:6 }}>Country (applies to all)</label>
                  <input value={bulkCountry} onChange={e => setBulkCountry(e.target.value)} placeholder="e.g. United Kingdom" style={{ width:'100%', background:C.surfaceAlt, border:`1px solid ${C.border}`, borderRadius:8, padding:'9px 12px', color:C.text, fontSize:13, outline:'none', boxSizing:'border-box' }} />
                </div>
              </div>
              <textarea value={bulkText} onChange={e => setBulkText(e.target.value)} rows={6} placeholder={'Tesco\nOcado\nDPD UK\nKuehne+Nagel'} style={{ width:'100%', background:C.surfaceAlt, border:`1px solid ${C.border}`, borderRadius:8, padding:'9px 12px', color:C.text, fontSize:13, outline:'none', resize:'vertical', boxSizing:'border-box', fontFamily:'inherit', marginBottom:14 }} />
              <button onClick={bulkImport} disabled={bulkBusy || !bulkText.trim()} style={{ width:'100%', padding:'12px', borderRadius:10, background:C.purple, color:'#fff', border:'none', fontSize:14, fontWeight:600, cursor: bulkBusy || !bulkText.trim() ? 'default' : 'pointer', opacity: bulkBusy || !bulkText.trim() ? 0.5 : 1 }}>{bulkBusy ? 'Importing...' : `Import ${bulkText.split('\n').map(s => s.trim()).filter(Boolean).length} companies`}</button>
              {bulkResult && (
                <div style={{ marginTop:12, background: bulkResult.error ? C.redLight : C.greenLight, color: bulkResult.error ? C.red : C.green, border: `1px solid ${bulkResult.error ? C.redBorder : C.greenBorder}`, borderRadius:8, padding:'10px', textAlign:'center', fontSize:13, fontWeight:500 }}>
                  {bulkResult.error ? `${bulkResult.error}` : `${bulkResult.added ?? 0} added · ${bulkResult.skipped ?? 0} skipped (duplicates)`}
                </div>
              )}
            </div>
            <div style={{ background:C.surface, border:`1px solid ${C.border}`, borderRadius:16, padding:28, boxShadow:'0 2px 8px rgba(0,0,0,0.06)', marginTop:14 }}>
              <h2 style={{ margin:'0 0 6px', fontSize:18, fontWeight:700, color:C.text }}>Discover New Companies</h2>
              <p style={{ margin:'0 0 18px', fontSize:13, color:C.textSub }}>Tell Claude what kind of company you're prospecting and it'll search the web for fresh, unduplicated targets — with hiring-signal flags.</p>
              <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:14, marginBottom:14 }}>
                <div>
                  <label style={{ fontSize:12, fontWeight:600, color:C.textSub, display:'block', marginBottom:6 }}>Industry / vertical</label>
                  <input value={suggestIndustry} onChange={e => setSuggestIndustry(e.target.value)} placeholder="3PL, Retail, Supermarket, Pharma, …" style={{ width:'100%', background:C.surfaceAlt, border:`1px solid ${C.border}`, borderRadius:8, padding:'9px 12px', color:C.text, fontSize:13, outline:'none', boxSizing:'border-box' }} />
                </div>
                <div>
                  <label style={{ fontSize:12, fontWeight:600, color:C.textSub, display:'block', marginBottom:6 }}>Country</label>
                  <input value={suggestCountry} onChange={e => setSuggestCountry(e.target.value)} placeholder="e.g. United Kingdom" style={{ width:'100%', background:C.surfaceAlt, border:`1px solid ${C.border}`, borderRadius:8, padding:'9px 12px', color:C.text, fontSize:13, outline:'none', boxSizing:'border-box' }} />
                </div>
              </div>
              <button onClick={getSuggestions} disabled={suggestBusy || !suggestIndustry.trim()} style={{ width:'100%', padding:'12px', borderRadius:10, background:C.purple, color:'#fff', border:'none', fontSize:14, fontWeight:600, cursor: suggestBusy || !suggestIndustry.trim() ? 'default' : 'pointer', opacity: suggestBusy || !suggestIndustry.trim() ? 0.5 : 1 }}>{suggestBusy ? 'Searching the web...' : 'Get Claude\'s suggestions'}</button>
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
                          <div style={{ fontSize:12, color:C.textMuted, marginBottom:4 }}>{[s.industry, s.country].filter(Boolean).join(' · ')}</div>
                          {s.rationale && <div style={{ fontSize:12, color:C.textSub }}>{s.rationale}</div>}
                        </div>
                        <button onClick={() => addSuggestion(s)} disabled={addingSuggestion[s.name]} style={{ background:C.blue, color:'#fff', border:'none', borderRadius:8, padding:'7px 14px', fontSize:12, fontWeight:600, cursor: addingSuggestion[s.name] ? 'default' : 'pointer', opacity: addingSuggestion[s.name] ? 0.5 : 1, flexShrink:0 }}>{addingSuggestion[s.name] ? 'Adding...' : '+ Add'}</button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
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
      `}</style>
      
      {/* ── PRE-PITCH BRIEF MODAL ── */}
      {showBrief && (
        <div onClick={() => !briefLoading && setShowBrief(false)}
          style={{ position:'fixed', inset:0, background:'rgba(11,28,55,0.55)', display:'flex', alignItems:'center', justifyContent:'center', zIndex:1000, padding:20 }}>
          <div onClick={(e) => e.stopPropagation()}
            style={{ background:C.surface, borderRadius:16, maxWidth:720, width:'100%', maxHeight:'85vh', display:'flex', flexDirection:'column', boxShadow:'0 20px 50px rgba(0,0,0,0.25)', border:`1px solid ${C.border}` }}>
            <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', padding:'18px 22px', borderBottom:`1px solid ${C.border}`, background:'#0B1C37', color:'#fff', borderRadius:'16px 16px 0 0' }}>
              <div style={{ display:'flex', alignItems:'center', gap:10 }}>
                <Sparkles size={18} color="#FECC01" />
                <div>
                  <div style={{ fontWeight:700, fontSize:15 }}>Pre-pitch brief</div>
                  <div style={{ fontSize:12, color:'#7CC8C4', marginTop:2 }}>{briefCompany?.name || ''}</div>
                  {briefCached && briefCachedAt && (
                    <div style={{ marginTop:6, display:'flex', alignItems:'center', gap:8, fontSize:11 }}>
                      <span style={{ display:'inline-flex', alignItems:'center', gap:4, padding:'2px 8px', borderRadius:99, background:'rgba(255,255,255,0.15)', color:'#fff' }}>Cached · {timeAgo(briefCachedAt) || 'just now'}</span>
                      <button onClick={() => briefCompany && generateBrief(briefCompany, true)} style={{ background:'transparent', border:'none', color:'#FECC01', fontSize:11, fontWeight:600, cursor:'pointer', padding:0, textDecoration:'underline' }}>Regenerate</button>
                    </div>
                  )}
                </div>
              </div>
              <button onClick={() => setShowBrief(false)} disabled={briefLoading}
                style={{ background:'transparent', border:'none', color:'#fff', cursor: briefLoading ? 'wait' : 'pointer', padding:6, borderRadius:6, display:'flex', alignItems:'center' }}>
                <X size={18} />
              </button>
            </div>
            <div style={{ padding:'22px 26px', overflow:'auto', flex:1, fontSize:14, lineHeight:1.6, color:C.text }}>
              {briefLoading && (
                <div style={{ display:'flex', alignItems:'center', gap:10, color:C.textSub, padding:'30px 0' }}>
                  <RefreshCw size={16} className="spin" />
                  Generating brief… this takes ~10–20 seconds.
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
                <div style={{ fontSize:12, color:C.textMuted }}>DB context only · no web search</div>
                {briefCached && briefCompany && !briefLoading && briefText && (
                  <div style={{ display:'flex', alignItems:'center', gap:8, fontSize:11, color:C.textSub }}>
                    <span style={{ padding:'2px 8px', borderRadius:999, background:C.surface, border:`1px solid ${C.border}` }}>Cached · {timeAgo(briefCachedAt) || 'just now'}</span>
                    <button onClick={() => generateBrief(briefCompany, true)} style={{ background:'none', border:'none', color:C.blue, fontSize:11, cursor:'pointer', textDecoration:'underline', padding:0 }}>Regenerate</button>
                  </div>
                )}
              </div>
              <button onClick={copyBrief} disabled={!briefText || briefLoading}
                style={{ display:'flex', alignItems:'center', gap:6, padding:'8px 16px', borderRadius:8, background: briefCopied ? '#7CC8C4' : '#0B1C37', color: briefCopied ? '#0B1C37' : '#fff', border:'none', fontSize:13, fontWeight:600, cursor: (!briefText || briefLoading) ? 'not-allowed' : 'pointer', opacity: (!briefText || briefLoading) ? 0.5 : 1 }}>
                <Copy size={14} />
                {briefCopied ? 'Copied' : 'Copy'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── INMAIL MODAL ── */}
      {showInmail && (
        <div onClick={() => !inmailLoading && setShowInmail(false)}
          style={{ position:'fixed', inset:0, background:'rgba(11,28,55,0.55)', display:'flex', alignItems:'center', justifyContent:'center', zIndex:1000, padding:20 }}>
          <div onClick={(e) => e.stopPropagation()}
            style={{ background:C.surface, borderRadius:16, maxWidth:640, width:'100%', maxHeight:'85vh', display:'flex', flexDirection:'column', boxShadow:'0 20px 50px rgba(0,0,0,0.25)', border:`1px solid ${C.border}` }}>
            <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', padding:'18px 22px', borderBottom:`1px solid ${C.border}`, background:'#0B1C37', color:'#fff', borderRadius:'16px 16px 0 0' }}>
              <div style={{ display:'flex', alignItems:'center', gap:10 }}>
                <MessageSquare size={18} color="#FECC01" />
                <div>
                  <div style={{ fontWeight:700, fontSize:15 }}>Quick InMail</div>
                  <div style={{ fontSize:12, color:'#7CC8C4', marginTop:2 }}>{inmailCompany?.name || ''}</div>
                  {inmailCached && inmailCachedAt && (
                    <div style={{ marginTop:6, display:'flex', alignItems:'center', gap:8, fontSize:11 }}>
                      <span style={{ display:'inline-flex', alignItems:'center', gap:4, padding:'2px 8px', borderRadius:99, background:'rgba(255,255,255,0.15)', color:'#fff' }}>Cached · {timeAgo(inmailCachedAt) || 'just now'}</span>
                      <button onClick={() => inmailCompany && generateInmail(inmailCompany, true)} style={{ background:'transparent', border:'none', color:'#FECC01', fontSize:11, fontWeight:600, cursor:'pointer', padding:0, textDecoration:'underline' }}>Regenerate</button>
                    </div>
                  )}
                </div>
              </div>
              <button onClick={() => setShowInmail(false)} disabled={inmailLoading}
                style={{ background:'transparent', border:'none', color:'#fff', cursor: inmailLoading ? 'wait' : 'pointer', padding:6, borderRadius:6, display:'flex', alignItems:'center' }}>
                <X size={18} />
              </button>
            </div>
            <div style={{ padding:'22px 26px', overflow:'auto', flex:1, fontSize:14, lineHeight:1.65, color:C.text, background:C.bg }}>
              {inmailLoading && (
                <div style={{ display:'flex', alignItems:'center', gap:10, color:C.textSub, padding:'30px 0' }}>
                  <RefreshCw size={16} className="spin" />
                  Drafting InMail… this takes ~5–10 seconds.
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
                <div style={{ fontSize:12, color:C.textMuted }}>DB context only · no web search · ~100–130 words</div>
                {inmailCached && inmailCompany && !inmailLoading && inmailText && (
                  <div style={{ display:'flex', alignItems:'center', gap:8, fontSize:11, color:C.textSub }}>
                    <span style={{ padding:'2px 8px', borderRadius:999, background:C.surface, border:`1px solid ${C.border}` }}>Cached · {timeAgo(inmailCachedAt) || 'just now'}</span>
                    <button onClick={() => generateInmail(inmailCompany, true)} style={{ background:'none', border:'none', color:C.blue, fontSize:11, cursor:'pointer', textDecoration:'underline', padding:0 }}>Regenerate</button>
                  </div>
                )}
              </div>
              <button onClick={copyInmail} disabled={!inmailText || inmailLoading}
                style={{ display:'flex', alignItems:'center', gap:6, padding:'8px 16px', borderRadius:8, background: inmailCopied ? '#7CC8C4' : '#0B1C37', color: inmailCopied ? '#0B1C37' : '#fff', border:'none', fontSize:13, fontWeight:600, cursor: (!inmailText || inmailLoading) ? 'not-allowed' : 'pointer', opacity: (!inmailText || inmailLoading) ? 0.5 : 1 }}>
                <Copy size={14} />
                {inmailCopied ? 'Copied' : 'Copy'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── LOOKALIKE COMPANIES MODAL ── */}
      {lookalikeOpen && (
        <div onClick={() => !lookalikeLoading && setLookalikeOpen(false)}
          style={{ position:'fixed', inset:0, background:'rgba(11,28,55,0.55)', display:'flex', alignItems:'center', justifyContent:'center', zIndex:99, padding:20 }}>
          <div onClick={(e) => e.stopPropagation()}
            style={{ background:C.surface, border:`1px solid ${C.border}`, borderRadius:16, width:'min(640px, 100%)', maxHeight:'80vh', display:'flex', flexDirection:'column', overflow:'hidden', boxShadow:'0 20px 50px rgba(11,28,55,0.18)' }}>
            <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', padding:'16px 22px', borderBottom:`1px solid ${C.border}` }}>
              <div style={{ display:'flex', alignItems:'center', gap:10 }}>
                <Users size={18} color={C.yellow} />
                <div style={{ fontSize:15, fontWeight:700, color:C.text }}>Companies similar to {lookalikeSource?.name || ''}</div>
              </div>
              <button onClick={() => setLookalikeOpen(false)} style={{ border:'none', background:'transparent', color:C.textMuted, cursor:'pointer', display:'flex', alignItems:'center' }}>
                <X size={18} />
              </button>
            </div>
            <div style={{ padding:'14px 22px', overflowY:'auto', flex:1 }}>
              {lookalikeLoading && (<div className="spin" style={{ color:C.textSub, fontSize:13, padding:'30px 0', textAlign:'center' }}>Searching…</div>)}
              {!lookalikeLoading && lookalikeError && (<div style={{ color:C.red, fontSize:13, padding:'12px 0' }}>{lookalikeError}</div>)}
              {!lookalikeLoading && !lookalikeError && lookalikeData.length === 0 && (<div style={{ color:C.textSub, fontSize:13, padding:'30px 0', textAlign:'center' }}>No close lookalikes found yet — try expanding industries via the bulk import.</div>)}
              {!lookalikeLoading && lookalikeData.length > 0 && lookalikeData.slice(0,10).map((row: any) => {
                const lk = companies.find((c: any) => c.id === row.id) || row
                const wmsLine = (lk.wms_entries || []).map((w: any) => w.wms_system).filter(Boolean).join(' / ') || row.wms || 'Unknown'
                const meta = [lk.industry || row.industry, lk.country || row.country, wmsLine].filter(Boolean).join(' · ')
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
              <button onClick={() => setLookalikeOpen(false)}
                style={{ padding:'8px 16px', borderRadius:8, background:'transparent', color:C.textSub, border:`1px solid ${C.border}`, fontSize:13, fontWeight:600, cursor:'pointer' }}>
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── LINKEDIN POST DRAFTS MODAL ── */}
      {linkedinModalOpen && (
        <div onClick={() => !linkedinLoading && setLinkedinModalOpen(false)}
          style={{ position:'fixed', inset:0, background:'rgba(11,28,55,0.55)', display:'flex', alignItems:'center', justifyContent:'center', zIndex:1000, padding:20 }}>
          <div onClick={(e) => e.stopPropagation()}
            style={{ background:C.surface, borderRadius:16, maxWidth:780, width:'100%', maxHeight:'88vh', display:'flex', flexDirection:'column', boxShadow:'0 20px 50px rgba(0,0,0,0.25)', border:`1px solid ${C.border}` }}>
            <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', padding:'18px 22px', borderBottom:`1px solid ${C.border}`, background:'#0B1C37', color:'#fff', borderRadius:'16px 16px 0 0' }}>
              <div style={{ display:'flex', alignItems:'center', gap:10 }}>
                <Linkedin size={18} color="#FECC01" />
                <div>
                  <div style={{ fontWeight:700, fontSize:15 }}>LinkedIn post drafts</div>
                  <div style={{ fontSize:12, color:'#7CC8C4', marginTop:2 }}>{linkedinNewsTitle}</div>
                  {linkedinCached && linkedinCachedAt && (
                    <div style={{ marginTop:6, display:'flex', alignItems:'center', gap:8, fontSize:11 }}>
                      <span style={{ display:'inline-flex', alignItems:'center', gap:4, padding:'2px 8px', borderRadius:99, background:'rgba(255,255,255,0.15)', color:'#fff' }}>Cached · {timeAgo(linkedinCachedAt) || 'just now'}</span>
                      <button onClick={() => linkedinNewsId && generateLinkedInPosts({id:linkedinNewsId, title:linkedinNewsTitle}, true)} style={{ background:'transparent', border:'none', color:'#FECC01', fontSize:11, fontWeight:600, cursor:'pointer', padding:0, textDecoration:'underline' }}>Regenerate</button>
                    </div>
                  )}
                </div>
              </div>
              <button onClick={() => setLinkedinModalOpen(false)} disabled={linkedinLoading}
                style={{ background:'transparent', border:'none', color:'#fff', cursor: linkedinLoading ? 'wait' : 'pointer', padding:6, borderRadius:6, display:'flex', alignItems:'center' }}>
                <X size={18} />
              </button>
            </div>
            <div style={{ padding:'22px 26px', overflow:'auto', flex:1, fontSize:14, lineHeight:1.6, color:C.text, display:'flex', flexDirection:'column', gap:18 }}>
              {linkedinLoading && (
                <div style={{ display:'flex', alignItems:'center', gap:10, color:C.textSub, padding:'30px 0' }}>
                  <RefreshCw size={16} className="spin" />
                  Drafting three posts… this takes ~10–20 seconds.
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
                        <span style={{ fontSize:11, color:'#7CC8C4' }}>· {captions[v]}</span>
                      </div>
                      <button onClick={() => copyLinkedInVariant(v)}
                        style={{ display:'flex', alignItems:'center', gap:6, padding:'4px 10px', borderRadius:6, background: copiedVariant === v ? '#7CC8C4' : '#FECC01', color:'#0B1C37', border:'none', fontSize:11, fontWeight:700, cursor:'pointer' }}>
                        <Copy size={12} />
                        {copiedVariant === v ? 'Copied!' : 'Copy'}
                      </button>
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
                <div style={{ fontSize:12, color:C.textMuted }}>DB context only · no web search</div>
                {linkedinCached && linkedinNewsId && !linkedinLoading && (
                  <div style={{ display:'flex', alignItems:'center', gap:8, fontSize:11, color:C.textSub }}>
                    <span style={{ padding:'2px 8px', borderRadius:999, background:C.surface, border:`1px solid ${C.border}` }}>Cached · {timeAgo(linkedinCachedAt) || 'just now'}</span>
                    <button onClick={() => generateLinkedInPosts({ id: linkedinNewsId, title: linkedinNewsTitle }, true)} style={{ background:'none', border:'none', color:C.blue, fontSize:11, cursor:'pointer', textDecoration:'underline', padding:0 }}>Regenerate</button>
                  </div>
                )}
              </div>
              <button onClick={() => setLinkedinModalOpen(false)}
                style={{ padding:'8px 16px', borderRadius:8, background:'transparent', color:C.textSub, border:`1px solid ${C.border}`, fontSize:13, fontWeight:600, cursor:'pointer' }}>
                Close
              </button>
            </div>
          </div>
        </div>
      )}

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
            <button onClick={() => setShortcutsOpen(false)} style={{ border:'none', background:'transparent', color:C.textMuted, cursor:'pointer', padding:0, display:'flex' }}><X size={14} /></button>
          </div>
          <div style={{ display:'grid', gridTemplateColumns:'auto 1fr', gap:'5px 14px' }}>
            {[['?','Toggle this help'],['g d','Dashboard'],['g m','Map'],['g b','Database'],['g a','AI Assistant'],['g n','News'],['g +','Add Entry'],['j / k','Navigate items'],['Enter','Open highlighted'],['b','Generate brief'],['l','Draft LinkedIn post'],['/','Focus search'],['Esc','Close modal']].map(([k,v]) => (
              <div key={k} style={{ display:'contents' }}>
                <kbd style={{ display:'inline-block', fontFamily:'ui-monospace, "SF Mono", Consolas, monospace', fontSize:11, background:C.surfaceAlt, border:`1px solid ${C.border}`, borderRadius:4, padding:'1px 6px', color:C.text, minWidth:18, textAlign:'center', justifySelf:'start' }}>{k}</kbd>
                <span style={{ alignSelf:'center' }}>{v}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
