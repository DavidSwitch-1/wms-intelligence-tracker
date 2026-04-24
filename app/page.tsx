'use client'
import { useState, useEffect, useRef } from 'react'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL as string,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY as string
)

// ── Colour tokens ────────────────────────────────────────────
const C = {
  bg:        '#f0f2f5',
  surface:   '#ffffff',
  surfaceAlt:'#f7f8fa',
  border:    '#e2e6ea',
  borderHov: '#c8cdd4',
  text:      '#1a1f2e',
  textSub:   '#6b7280',
  textMuted: '#9ca3af',
  blue:      '#2563eb',
  blueLight: '#eff6ff',
  blueBorder:'#bfdbfe',
  purple:    '#7c3aed',
  purpleLight:'#f5f3ff',
  purpleBorder:'#ddd6fe',
  green:     '#059669',
  greenLight:'#ecfdf5',
  greenBorder:'#a7f3d0',
  red:       '#dc2626',
  redLight:  '#fef2f2',
  redBorder: '#fecaca',
  amber:     '#d97706',
  amberLight:'#fffbeb',
  amberBorder:'#fde68a',
  gray:      '#6b7280',
  grayLight: '#f9fafb',
  grayBorder:'#e5e7eb',
}

export default function Home() {
  const [companies, setCompanies]   = useState<any[]>([])
  const [search, setSearch]         = useState('')
  const [filterVendor, setFilterVendor] = useState('All')
  const [messages, setMessages]     = useState<any[]>([
    { role: 'assistant', content: "Hi! I'm your WMS Intelligence Assistant. Ask me anything — e.g. \"Who uses Blue Yonder Dispatcher?\", \"What WMS does DHL use?\", or \"Which companies are Unknown?\"." }
  ])
  const [input, setInput]   = useState('')
  const [loading, setLoading] = useState(false)
  const [tab, setTab]       = useState<'db'|'chat'|'add'>('db')
  const [selected, setSelected] = useState<any>(null)
  const [form, setForm]     = useState({ name:'', industry:'', country:'', region:'', wms_system:'', vendor:'', version:'', site_name:'', notes:'' })
  const [saving, setSaving] = useState(false)
  const [saved, setSaved]   = useState(false)
  const chatEnd = useRef<HTMLDivElement>(null)

  useEffect(() => { load() }, [])
  useEffect(() => { chatEnd.current?.scrollIntoView({ behavior: 'smooth' }) }, [messages])

  async function load() {
    const { data } = await supabase.from('companies').select('*, wms_entries(*), news_updates(*)').order('name')
    if (data) setCompanies(data)
  }

  const filtered = companies.filter(c => {
    const q = search.toLowerCase()
    const matchSearch = !q || c.name.toLowerCase().includes(q) ||
      c.wms_entries?.some((w: any) => w.wms_system?.toLowerCase().includes(q) || w.vendor?.toLowerCase().includes(q))
    const matchVendor = filterVendor === 'All' ||
      (filterVendor === 'Unknown' ? c.wms_entries?.some((w: any) => w.vendor === 'Unknown' || w.status === 'Needs Verification')
      : c.wms_entries?.some((w: any) => w.vendor === filterVendor || w.vendor?.includes(filterVendor)))
    return matchSearch && matchVendor
  })

  const totalNews = companies.reduce((n: number, c: any) => n + (c.news_updates?.length||0), 0)

  const stats = [
    { label: 'Total Companies', value: companies.length,
      color: C.blue, bg: C.blueLight, border: C.blueBorder, filter: 'All' },
    { label: 'Manhattan', value: companies.filter((c: any) => c.wms_entries?.some((w: any) => w.vendor?.includes('Manhattan'))).length,
      color: C.purple, bg: C.purpleLight, border: C.purpleBorder, filter: 'Manhattan Associates' },
    { label: 'Blue Yonder', value: companies.filter((c: any) => c.wms_entries?.some((w: any) => w.vendor?.includes('Blue Yonder'))).length,
      color: C.green, bg: C.greenLight, border: C.greenBorder, filter: 'Blue Yonder' },
    { label: 'Active News', value: totalNews,
      color: C.red, bg: C.redLight, border: C.redBorder, filter: 'news' },
  ]

  function handleStatClick(s: typeof stats[0]) {
    if (s.filter === 'news') {
      // Filter to companies that have news
      setSearch('')
      setFilterVendor('All')
      setSelected(null)
      // Show news-only filter by setting a special flag via search workaround
      setSearch('__news__')
      return
    }
    setSearch('')
    setFilterVendor(prev => prev === s.filter ? 'All' : s.filter)
    setSelected(null)
  }

  const newsFiltered = search === '__news__'
    ? companies.filter((c: any) => c.news_updates?.length > 0)
    : filtered

  async function send() {
    if (!input.trim() || loading) return
    const msg = input.trim()
    setInput('')
    setMessages(prev => [...prev, { role: 'user', content: msg }])
    setLoading(true)
    try {
      const ctx = companies.map((c: any) => {
        const wms = c.wms_entries?.map((w: any) => `${w.wms_system} (${w.vendor}${w.version ? ', '+w.version : ''})${w.site_name ? ' at '+w.site_name : ''}`).join(', ')
        const news = c.news_updates?.map((n: any) => n.title).join(' | ')
        return `${c.name} (${c.industry||''}, ${c.country||''}): WMS=${wms||'Unknown'}${news ? ' | News: '+news : ''}${c.notes ? ' | '+c.notes : ''}`
      }).join('\n')
      const res = await fetch('/api/chat', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          system: `You are a WMS (Warehouse Management System) Intelligence expert for a supply chain consultancy. You have a live internal database AND web search capability.\n\nINTERNAL DATABASE:\n${ctx}\n\nSYSTEM KNOWLEDGE:\n- Red Prairie was acquired by JDA, then by Blue Yonder. Red Prairie systems are now Blue Yonder products.\n- Red Prairie Dispatcher = Blue Yonder Dispatcher. Red Prairie Discrete = Blue Yonder WMS (cloud).\n- Manhattan Associates legacy versions (PKMS, WMOS, WMi, Platform) are older on-premise products.\n- Companies marked Unknown/Needs Verification need intelligence — use web search to find their WMS.\n\nBEHAVIOUR:\n1. Check the internal database first and state what we know\n2. Use web search to verify, update or find new information\n3. If a company is Unknown, search for their WMS proactively\n4. Flag conflicts: if web search differs from database say so clearly\n5. Give comprehensive answers: what we have on record + any public confirmation\n6. Be concise and practical — this is a business intelligence tool for consultants`,
          messages: [...messages, { role: 'user', content: msg }]
        })
      })
      const d = await res.json()
      setMessages(prev => [...prev, { role: 'assistant', content: d.content }])
    } catch { setMessages(prev => [...prev, { role: 'assistant', content: 'Sorry, something went wrong.' }]) }
    setLoading(false)
  }

  async function addEntry() {
    if (!form.name || !form.wms_system) return
    setSaving(true)
    const { data: co } = await supabase.from('companies').insert({ name: form.name, industry: form.industry, country: form.country, region: form.region, notes: form.notes }).select().single()
    if (co) await supabase.from('wms_entries').insert({ company_id: co.id, wms_system: form.wms_system, vendor: form.vendor, version: form.version, site_name: form.site_name, status: 'Active' })
    setSaving(false); setSaved(true)
    setForm({ name:'', industry:'', country:'', region:'', wms_system:'', vendor:'', version:'', site_name:'', notes:'' })
    load(); setTimeout(() => setSaved(false), 3000)
  }

  function vendorColor(v: string) {
    if (v?.includes('Manhattan')) return C.purple
    if (v?.includes('Blue Yonder')) return C.blue
    if (v?.includes('SAP')) return C.amber
    if (v === 'Unknown') return C.gray
    return C.gray
  }
  function vendorBg(v: string) {
    if (v?.includes('Manhattan')) return C.purpleLight
    if (v?.includes('Blue Yonder')) return C.blueLight
    if (v?.includes('SAP')) return C.amberLight
    return C.grayLight
  }
  function vendorBorder(v: string) {
    if (v?.includes('Manhattan')) return C.purpleBorder
    if (v?.includes('Blue Yonder')) return C.blueBorder
    if (v?.includes('SAP')) return C.amberBorder
    return C.grayBorder
  }

  const displayList = search === '__news__' ? newsFiltered : filtered

  return (
    <div style={{ minHeight: '100vh', background: C.bg, color: C.text, fontFamily: '-apple-system,BlinkMacSystemFont,"Segoe UI",system-ui,sans-serif' }}>

      {/* ── Header ── */}
      <div style={{ background: C.surface, borderBottom: `1px solid ${C.border}`, padding: '0 28px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', height: 56, position: 'sticky', top: 0, zIndex: 50 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <div style={{ width: 32, height: 32, borderRadius: 8, background: 'linear-gradient(135deg,#2563eb,#7c3aed)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 16 }}>📦</div>
          <div>
            <div style={{ fontWeight: 700, fontSize: 14, color: C.text }}>WMS Intelligence</div>
            <div style={{ color: C.textMuted, fontSize: 11 }}>{companies.length} companies tracked</div>
          </div>
        </div>
        <nav style={{ display: 'flex', gap: 2 }}>
          {(['db','chat','add'] as const).map(t => (
            <button key={t} onClick={() => { setTab(t); setSelected(null) }}
              style={{ padding: '7px 16px', borderRadius: 8, fontSize: 13, fontWeight: 500, cursor: 'pointer', border: 'none',
                background: tab===t ? C.blueLight : 'transparent',
                color: tab===t ? C.blue : C.textSub,
                fontWeight: tab===t ? 600 : 400 }}>
              {t==='db'?'🗃 Database':t==='chat'?'🤖 AI Assistant':'➕ Add Entry'}
            </button>
          ))}
        </nav>
      </div>

      <div style={{ maxWidth: 1200, margin: '0 auto', padding: '24px 28px' }}>

        {/* ── DATABASE TAB ── */}
        {tab === 'db' && !selected && (
          <div>
            {/* Search + filter row */}
            <div style={{ display: 'flex', gap: 10, marginBottom: 20 }}>
              <div style={{ flex: 1, position: 'relative' }}>
                <span style={{ position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)', color: C.textMuted, fontSize: 15 }}>🔍</span>
                <input value={search === '__news__' ? '' : search}
                  onChange={e => setSearch(e.target.value)}
                  placeholder="Search companies or WMS systems..."
                  style={{ width: '100%', background: C.surface, border: `1px solid ${C.border}`, borderRadius: 10, padding: '10px 14px 10px 40px', color: C.text, fontSize: 14, outline: 'none', boxSizing: 'border-box', boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }} />
              </div>
              <select value={filterVendor} onChange={e => setFilterVendor(e.target.value)}
                style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: 10, padding: '10px 16px', color: C.text, fontSize: 14, outline: 'none', cursor: 'pointer', boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
                {['All','Blue Yonder','Manhattan Associates','SAP','Unknown'].map(v =>
                  <option key={v} value={v}>{v}</option>)}
              </select>
              {(filterVendor !== 'All' || search) && (
                <button onClick={() => { setFilterVendor('All'); setSearch('') }}
                  style={{ padding: '10px 16px', borderRadius: 10, border: `1px solid ${C.border}`, background: C.surface, color: C.textSub, fontSize: 13, cursor: 'pointer' }}>
                  Clear ✕
                </button>
              )}
            </div>

            {/* Stat cards — clickable */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 12, marginBottom: 24 }}>
              {stats.map(s => {
                const active = (s.filter === 'All' && filterVendor === 'All' && !search) ||
                  (s.filter === 'news' && search === '__news__') ||
                  (s.filter !== 'All' && s.filter !== 'news' && filterVendor === s.filter)
                return (
                  <div key={s.label} onClick={() => handleStatClick(s)}
                    style={{ background: active ? s.bg : C.surface, border: `1px solid ${active ? s.border : C.border}`,
                      borderRadius: 12, padding: '16px 20px', cursor: 'pointer', transition: 'all 0.15s',
                      boxShadow: active ? `0 0 0 2px ${s.border}` : '0 1px 3px rgba(0,0,0,0.06)' }}>
                    <div style={{ fontSize: 28, fontWeight: 700, color: s.color, lineHeight: 1 }}>{s.value}</div>
                    <div style={{ fontSize: 12, color: active ? s.color : C.textSub, marginTop: 6, fontWeight: active ? 600 : 400 }}>{s.label}</div>
                    {active && <div style={{ fontSize: 10, color: s.color, marginTop: 2, opacity: 0.7 }}>● Active filter</div>}
                  </div>
                )
              })}
            </div>

            {/* Active filter banner */}
            {(filterVendor !== 'All' || search === '__news__') && (
              <div style={{ background: C.blueLight, border: `1px solid ${C.blueBorder}`, borderRadius: 8, padding: '8px 16px', marginBottom: 16, fontSize: 13, color: C.blue, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <span>
                  {search === '__news__' ? `📰 Showing ${displayList.length} companies with active news`
                    : `Filtered: ${filterVendor} — ${displayList.length} companies`}
                </span>
                <button onClick={() => { setFilterVendor('All'); setSearch('') }}
                  style={{ background: 'none', border: 'none', color: C.blue, cursor: 'pointer', fontSize: 13, fontWeight: 600 }}>
                  Clear filter ✕
                </button>
              </div>
            )}

            {/* Company cards */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {displayList.map((c: any) => (
                <div key={c.id} onClick={() => setSelected(c)}
                  style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: 12, padding: '16px 20px',
                    cursor: 'pointer', transition: 'all 0.15s', boxShadow: '0 1px 3px rgba(0,0,0,0.04)' }}
                  onMouseEnter={e => { (e.currentTarget as HTMLDivElement).style.borderColor = C.blue; (e.currentTarget as HTMLDivElement).style.boxShadow = '0 2px 8px rgba(37,99,235,0.1)' }}
                  onMouseLeave={e => { (e.currentTarget as HTMLDivElement).style.borderColor = C.border; (e.currentTarget as HTMLDivElement).style.boxShadow = '0 1px 3px rgba(0,0,0,0.04)' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 10 }}>
                    <div>
                      <div style={{ fontWeight: 600, fontSize: 15, color: C.text }}>{c.name}</div>
                      <div style={{ color: C.textMuted, fontSize: 12, marginTop: 2 }}>{[c.industry, c.country, c.region].filter(Boolean).join(' · ')}</div>
                    </div>
                    <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                      {c.news_updates?.length > 0 &&
                        <span style={{ background: C.redLight, color: C.red, border: `1px solid ${C.redBorder}`, borderRadius: 20, padding: '2px 10px', fontSize: 11, fontWeight: 500 }}>
                          📰 {c.news_updates.length} update{c.news_updates.length>1?'s':''}
                        </span>}
                      <span style={{ color: C.textMuted, fontSize: 12 }}>→</span>
                    </div>
                  </div>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                    {c.wms_entries?.map((w: any) => (
                      <span key={w.id} style={{ background: vendorBg(w.vendor), color: vendorColor(w.vendor), border: `1px solid ${vendorBorder(w.vendor)}`, borderRadius: 6, padding: '4px 10px', fontSize: 12, fontWeight: 500 }}>
                        {w.wms_system}{w.version && w.version !== w.wms_system ? ` · ${w.version}` : ''}
                      </span>
                    ))}
                    {c.wms_entries?.some((w: any) => w.status === 'Needs Verification') &&
                      <span style={{ background: C.amberLight, color: C.amber, border: `1px solid ${C.amberBorder}`, borderRadius: 6, padding: '4px 10px', fontSize: 11 }}>⚠ Needs verification</span>}
                  </div>
                </div>
              ))}
              {displayList.length === 0 &&
                <div style={{ textAlign: 'center', padding: 60, color: C.textMuted, background: C.surface, borderRadius: 12, border: `1px solid ${C.border}` }}>
                  🔍 No companies match your search
                </div>}
            </div>
          </div>
        )}

        {/* ── COMPANY DETAIL PANEL ── */}
        {tab === 'db' && selected && (
          <div>
            <button onClick={() => setSelected(null)}
              style={{ display: 'flex', alignItems: 'center', gap: 6, background: 'none', border: 'none', color: C.blue, cursor: 'pointer', fontSize: 14, fontWeight: 500, marginBottom: 20, padding: 0 }}>
              ← Back to database
            </button>
            <div style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: 16, padding: 28, boxShadow: '0 2px 8px rgba(0,0,0,0.06)' }}>
              {/* Header */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 24, paddingBottom: 20, borderBottom: `1px solid ${C.border}` }}>
                <div>
                  <h2 style={{ margin: 0, fontSize: 22, fontWeight: 700, color: C.text }}>{selected.name}</h2>
                  <p style={{ margin: '4px 0 0', color: C.textSub, fontSize: 14 }}>{[selected.industry, selected.country, selected.region].filter(Boolean).join(' · ')}</p>
                </div>
                <button onClick={() => { setInput(`Tell me everything about ${selected.name}'s WMS setup, any recent news, and whether our records look current.`); setTab('chat') }}
                  style={{ padding: '8px 18px', borderRadius: 8, background: C.blue, color: '#fff', border: 'none', fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>
                  🤖 Ask AI about this company
                </button>
              </div>

              {/* WMS Systems */}
              <div style={{ marginBottom: 24 }}>
                <div style={{ fontSize: 12, fontWeight: 600, color: C.textSub, textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 12 }}>WMS Systems</div>
                {selected.wms_entries?.map((w: any) => (
                  <div key={w.id} style={{ background: vendorBg(w.vendor), border: `1px solid ${vendorBorder(w.vendor)}`, borderRadius: 10, padding: '14px 16px', marginBottom: 10 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <div>
                        <div style={{ fontWeight: 600, fontSize: 15, color: vendorColor(w.vendor) }}>{w.wms_system}</div>
                        <div style={{ fontSize: 12, color: C.textSub, marginTop: 3 }}>
                          {[w.vendor, w.version, w.site_name].filter(Boolean).join(' · ')}
                        </div>
                      </div>
                      <span style={{ fontSize: 11, padding: '3px 10px', borderRadius: 20, background: w.status === 'Active' ? C.greenLight : C.amberLight, color: w.status === 'Active' ? C.green : C.amber, border: `1px solid ${w.status === 'Active' ? C.greenBorder : C.amberBorder}`, fontWeight: 500 }}>
                        {w.status}
                      </span>
                    </div>
                    {w.notes && <div style={{ marginTop: 8, fontSize: 12, color: C.textSub, paddingTop: 8, borderTop: `1px solid ${vendorBorder(w.vendor)}` }}>{w.notes}</div>}
                  </div>
                ))}
              </div>

              {/* News */}
              {selected.news_updates?.length > 0 && (
                <div style={{ marginBottom: 24 }}>
                  <div style={{ fontSize: 12, fontWeight: 600, color: C.textSub, textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 12 }}>Latest Intelligence</div>
                  {selected.news_updates.map((n: any) => (
                    <div key={n.id} style={{ background: C.redLight, border: `1px solid ${C.redBorder}`, borderRadius: 10, padding: '12px 16px', marginBottom: 8 }}>
                      <div style={{ fontWeight: 600, fontSize: 14, color: C.red }}>{n.title}</div>
                      {n.summary && <div style={{ marginTop: 4, fontSize: 13, color: C.textSub }}>{n.summary}</div>}
                      <div style={{ marginTop: 6, fontSize: 11, color: C.textMuted }}>{new Date(n.published_at || n.created_at).toLocaleDateString('en-GB', { day:'numeric', month:'short', year:'numeric' })}</div>
                    </div>
                  ))}
                </div>
              )}

              {/* Notes */}
              {selected.notes && (
                <div>
                  <div style={{ fontSize: 12, fontWeight: 600, color: C.textSub, textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 8 }}>Notes</div>
                  <div style={{ background: C.surfaceAlt, border: `1px solid ${C.border}`, borderRadius: 10, padding: '12px 16px', fontSize: 13, color: C.textSub, fontStyle: 'italic' }}>{selected.notes}</div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* ── CHAT TAB ── */}
        {tab === 'chat' && (
          <div style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: 16, display: 'flex', flexDirection: 'column', height: 'calc(100vh - 130px)', boxShadow: '0 2px 8px rgba(0,0,0,0.06)' }}>
            <div style={{ padding: '12px 20px', borderBottom: `1px solid ${C.border}`, display: 'flex', alignItems: 'center', gap: 8 }}>
              <div style={{ width: 8, height: 8, borderRadius: '50%', background: C.green }}></div>
              <span style={{ color: C.textSub, fontSize: 13 }}>Claude connected · {companies.length} companies in context · web search enabled</span>
            </div>
            <div style={{ flex: 1, overflowY: 'auto', padding: 20, display: 'flex', flexDirection: 'column', gap: 14 }}>
              {messages.map((m, i) => (
                <div key={i} style={{ display: 'flex', justifyContent: m.role==='user'?'flex-end':'flex-start', gap: 10 }}>
                  {m.role==='assistant' && (
                    <div style={{ width: 30, height: 30, borderRadius: 8, background: 'linear-gradient(135deg,#2563eb,#7c3aed)', display:'flex', alignItems:'center', justifyContent:'center', fontSize:14, flexShrink:0, marginTop:2 }}>🤖</div>
                  )}
                  <div style={{ maxWidth: '72%', borderRadius: 14, padding: '10px 16px', fontSize: 14, lineHeight: 1.6, whiteSpace: 'pre-wrap',
                    background: m.role==='user' ? 'linear-gradient(135deg,#2563eb,#1d4ed8)' : C.surfaceAlt,
                    color: m.role==='user' ? '#fff' : C.text,
                    border: m.role==='user' ? 'none' : `1px solid ${C.border}` }}>
                    {m.content}
                  </div>
                </div>
              ))}
              {loading && (
                <div style={{ display:'flex', gap:10 }}>
                  <div style={{ width:30,height:30,borderRadius:8,background:'linear-gradient(135deg,#2563eb,#7c3aed)',display:'flex',alignItems:'center',justifyContent:'center',fontSize:14 }}>🤖</div>
                  <div style={{ background:C.surfaceAlt,border:`1px solid ${C.border}`,borderRadius:14,padding:'12px 16px',display:'flex',gap:6,alignItems:'center' }}>
                    {[0,1,2].map(i => <div key={i} style={{ width:7,height:7,borderRadius:'50%',background:C.blue,animation:`blink 1.2s ${i*0.2}s infinite` }}></div>)}
                  </div>
                </div>
              )}
              <div ref={chatEnd}/>
            </div>
            <div style={{ padding: '14px 16px', borderTop: `1px solid ${C.border}` }}>
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
                {['Who uses Blue Yonder Dispatcher?','What WMS does DHL use?','Which companies are Unknown?','Who uses Manhattan WMS?','Compare Blue Yonder vs Manhattan customers'].map(q=>(
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
          <div style={{ maxWidth: 680 }}>
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
                {([['WMS System *','wms_system','e.g. Blue Yonder Dispatcher'],['Vendor','vendor','e.g. Blue Yonder'],['Version','version','e.g. Blue Yonder Dispatcher'],['Site / Hub','site_name','e.g. UK DC, Germany Hub']] as [string,string,string][]).map(([label,field,ph])=>(
                  <div key={field}>
                    <label style={{ fontSize:12, fontWeight:600, color:C.textSub, display:'block', marginBottom:6 }}>{label}</label>
                    <input value={(form as any)[field]} onChange={e=>setForm({...form,[field]:e.target.value})} placeholder={ph}
                      style={{ width:'100%', background:C.surfaceAlt, border:`1px solid ${C.border}`, borderRadius:8, padding:'9px 12px', color:C.text, fontSize:13, outline:'none', boxSizing:'border-box' }} />
                  </div>
                ))}
              </div>
              <div style={{ marginBottom:20 }}>
                <label style={{ fontSize:12, fontWeight:600, color:C.textSub, display:'block', marginBottom:6 }}>Notes / Intel</label>
                <textarea value={form.notes} onChange={e=>setForm({...form,notes:e.target.value})} rows={3}
                  placeholder="Any additional intelligence, news signals, or context..."
                  style={{ width:'100%', background:C.surfaceAlt, border:`1px solid ${C.border}`, borderRadius:8, padding:'9px 12px', color:C.text, fontSize:13, outline:'none', resize:'none', boxSizing:'border-box' }} />
              </div>
              <button onClick={addEntry} disabled={saving||!form.name||!form.wms_system}
                style={{ width:'100%', padding:'12px', borderRadius:10, background:C.blue, color:'#fff', border:'none', fontSize:14, fontWeight:600, cursor:'pointer', opacity:saving||!form.name||!form.wms_system?0.5:1 }}>
                {saving?'Saving...':'Add to Database'}
              </button>
              {saved && <div style={{ marginTop:12, background:C.greenLight, color:C.green, border:`1px solid ${C.greenBorder}`, borderRadius:8, padding:'10px 0', textAlign:'center', fontSize:13, fontWeight:500 }}>✓ Added successfully!</div>}
            </div>
          </div>
        )}
      </div>

      <style>{`
        @keyframes blink{0%,100%{opacity:1}50%{opacity:0.15}}
        * { box-sizing: border-box; }
        button:hover { opacity: 0.85; }
        input::placeholder { color: #9ca3af; }
        textarea::placeholder { color: #9ca3af; }
      `}</style>
    </div>
  )
}
