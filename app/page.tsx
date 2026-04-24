'use client'
import { useState, useEffect, useRef, useCallback } from 'react'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL as string,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY as string
)

const C = {
  bg:'#f0f2f5', surface:'#ffffff', surfaceAlt:'#f7f8fa',
  border:'#e2e6ea', borderHov:'#c8cdd4',
  text:'#1a1f2e', textSub:'#6b7280', textMuted:'#9ca3af',
  blue:'#2563eb', blueLight:'#eff6ff', blueBorder:'#bfdbfe',
  purple:'#7c3aed', purpleLight:'#f5f3ff', purpleBorder:'#ddd6fe',
  green:'#059669', greenLight:'#ecfdf5', greenBorder:'#a7f3d0',
  red:'#dc2626', redLight:'#fef2f2', redBorder:'#fecaca',
  amber:'#d97706', amberLight:'#fffbeb', amberBorder:'#fde68a',
  gray:'#6b7280', grayLight:'#f9fafb', grayBorder:'#e5e7eb',
  teal:'#0891b2', tealLight:'#ecfeff', tealBorder:'#a5f3fc',
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
  const [tab, setTab]         = useState<'db'|'chat'|'add'|'news'>('db')
  const [selected, setSelected] = useState<any>(null)
  const [form, setForm]       = useState({ name:'', industry:'', country:'', region:'', wms_system:'', vendor:'', version:'', site_name:'', notes:'' })
  const [saving, setSaving]   = useState(false)
  const [saved, setSaved]     = useState(false)
  const [researching, setResearching] = useState<Record<string,boolean>>({})
  const [researchResults, setResearchResults] = useState<Record<string,string>>({})
  const [lastRefresh, setLastRefresh] = useState<Date>(new Date())
  const chatEnd = useRef<HTMLDivElement>(null)
  const refreshTimer = useRef<any>(null)

  const load = useCallback(async () => {
    const { data } = await supabase
      .from('companies')
      .select('*, wms_entries(*), news_updates(*)')
      .order('name')
    if (data) {
      setCompanies(data)
      setLastRefresh(new Date())
    }
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

  // Background research: find WMS for up to 3 unknown companies on load
  useEffect(() => {
    if (companies.length === 0) return
    const unknowns = companies.filter(c =>
      c.wms_entries?.some((w: any) => w.wms_system === 'Unknown') &&
      !c.wms_entries?.some((w: any) => w.notes?.includes('Auto-researched'))
    ).slice(0, 3)

    unknowns.forEach((c, i) => {
      // Stagger requests to avoid rate limiting
      setTimeout(() => researchCompany(c, true), i * 4000)
    })
  }, [companies.length > 0 ? companies[0]?.id : null])

  async function researchCompany(company: any, silent = false) {
    if (researching[company.id]) return
    setResearching(prev => ({ ...prev, [company.id]: true }))
    if (!silent) setResearchResults(prev => ({ ...prev, [company.id]: 'Searching...' }))

    try {
      const res = await fetch('/api/research', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          companyId: company.id,
          companyName: company.name,
          industry: company.industry || '',
          country: company.country || ''
        })
      })
      const d = await res.json()
      if (d.updated && d.result) {
        if (!silent) {
          setResearchResults(prev => ({ ...prev, [company.id]: `Found: ${d.result.wms_system} (${d.result.confidence} confidence)` }))
        }
        // Reload to show updated data
        load()
      } else {
        if (!silent) setResearchResults(prev => ({ ...prev, [company.id]: 'No WMS information found publicly' }))
      }
    } catch {
      if (!silent) setResearchResults(prev => ({ ...prev, [company.id]: 'Research failed — try again' }))
    }
    setResearching(prev => ({ ...prev, [company.id]: false }))
  }

  // All news across all companies, sorted newest first
  const allNews = companies
    .flatMap(c => (c.news_updates || []).map((n: any) => ({ ...n, companyName: c.name, companyId: c.id })))
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
  })

  const stats = [
    { label:'Total Companies', value:companies.length, color:C.blue, bg:C.blueLight, border:C.blueBorder, filter:'All' },
    { label:'Manhattan', value:companies.filter(c=>c.wms_entries?.some((w:any)=>w.vendor?.includes('Manhattan'))).length, color:C.purple, bg:C.purpleLight, border:C.purpleBorder, filter:'Manhattan Associates' },
    { label:'Blue Yonder', value:companies.filter(c=>c.wms_entries?.some((w:any)=>w.vendor?.includes('Blue Yonder'))).length, color:C.green, bg:C.greenLight, border:C.greenBorder, filter:'Blue Yonder' },
    { label:'News & Updates', value:allNews.length, color:C.red, bg:C.redLight, border:C.redBorder, filter:'news' },
  ]

  function handleStatClick(s: typeof stats[0]) {
    setSelected(null)
    if (s.filter === 'news') { setTab('news'); return }
    if (s.filter === 'All') { setFilterVendor('All'); setSearch(''); setTab('db'); return }
    setFilterVendor(prev => prev === s.filter ? 'All' : s.filter)
    setTab('db')
  }

  async function send() {
    if (!input.trim() || loading) return
    const msg = input.trim()
    setInput('')
    setMessages(prev => [...prev, { role: 'user', content: msg }])
    setLoading(true)
    try {
      const ctx = companies.map(c => {
        const wms = c.wms_entries?.map((w: any) => `${w.wms_system} (${w.vendor}${w.version ? ', '+w.version : ''})${w.notes ? ' - '+w.notes.substring(0,100) : ''}`).join(', ')
        const news = c.news_updates?.map((n: any) => `${n.title}: ${n.summary || ''}`).join(' | ')
        return `${c.name} (${c.industry||''}, ${c.country||''}): WMS=${wms||'Unknown'}${news ? ' | News: '+news : ''}`
      }).join('\n')
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
      .insert({ name:form.name, industry:form.industry, country:form.country, region:form.region, notes:form.notes })
      .select().single()
    if (co) await supabase.from('wms_entries').insert({
      company_id:co.id, wms_system:form.wms_system, vendor:form.vendor,
      version:form.version, site_name:form.site_name, status:'Active'
    })
    setSaving(false); setSaved(true)
    setForm({ name:'', industry:'', country:'', region:'', wms_system:'', vendor:'', version:'', site_name:'', notes:'' })
    load(); setTimeout(() => setSaved(false), 3000)
  }

  function vendorColor(v: string) {
    if (v?.includes('Manhattan')) return C.purple
    if (v?.includes('Blue Yonder')) return C.blue
    if (v?.includes('SAP')) return C.amber
    if (v?.includes('Oracle')) return C.teal
    return C.gray
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
    <div style={{ minHeight:'100vh', background:C.bg, color:C.text, fontFamily:'-apple-system,BlinkMacSystemFont,"Segoe UI",system-ui,sans-serif' }}>

      {/* ── Header ── */}
      <div style={{ background:C.surface, borderBottom:`1px solid ${C.border}`, padding:'0 28px', display:'flex', alignItems:'center', justifyContent:'space-between', height:56, position:'sticky', top:0, zIndex:50, boxShadow:'0 1px 4px rgba(0,0,0,0.06)' }}>
        <div style={{ display:'flex', alignItems:'center', gap:12 }}>
          <div style={{ width:32, height:32, borderRadius:8, background:'linear-gradient(135deg,#2563eb,#7c3aed)', display:'flex', alignItems:'center', justifyContent:'center', fontSize:16 }}>📦</div>
          <div>
            <div style={{ fontWeight:700, fontSize:14, color:C.text }}>WMS Intelligence</div>
            <div style={{ color:C.textMuted, fontSize:11 }}>
              {companies.length} companies
              {researchingCount > 0 && <span style={{ color:C.blue, marginLeft:6 }}>· 🔍 Researching {researchingCount}...</span>}
            </div>
          </div>
        </div>
        <nav style={{ display:'flex', gap:2 }}>
          {([
            ['db','🗃 Database'],
            ['chat','🤖 AI Assistant'],
            ['news',`📰 News${allNews.length > 0 ? ` (${allNews.length})` : ''}`],
            ['add','➕ Add Entry'],
          ] as [typeof tab, string][]).map(([t, label]) => (
            <button key={t} onClick={() => { setTab(t); setSelected(null) }}
              style={{ padding:'7px 16px', borderRadius:8, fontSize:13, cursor:'pointer', border:'none',
                background: tab===t ? C.blueLight : 'transparent',
                color: tab===t ? C.blue : C.textSub,
                fontWeight: tab===t ? 600 : 400 }}>
              {label}
            </button>
          ))}
        </nav>
        <div style={{ display:'flex', alignItems:'center', gap:8 }}>
          <span style={{ fontSize:11, color:C.textMuted }}>Updated {lastRefresh.toLocaleTimeString('en-GB', { hour:'2-digit', minute:'2-digit' })}</span>
          <button onClick={load} style={{ fontSize:12, color:C.blue, background:C.blueLight, border:`1px solid ${C.blueBorder}`, borderRadius:6, padding:'4px 10px', cursor:'pointer', fontWeight:500 }}>↻ Refresh</button>
        </div>
      </div>

      <div style={{ maxWidth:1200, margin:'0 auto', padding:'24px 28px' }}>

        {/* ── DATABASE TAB ── */}
        {tab === 'db' && !selected && (
          <div>
            {/* Stat cards */}
            <div style={{ display:'grid', gridTemplateColumns:'repeat(4,1fr)', gap:12, marginBottom:20 }}>
              {stats.map(s => {
                const active = (s.filter === 'news' && tab === 'news') ||
                  (s.filter !== 'All' && s.filter !== 'news' && filterVendor === s.filter && tab === 'db')
                return (
                  <div key={s.label} onClick={() => handleStatClick(s)}
                    style={{ background: active ? s.bg : C.surface, border:`1px solid ${active ? s.border : C.border}`,
                      borderRadius:12, padding:'16px 20px', cursor:'pointer', transition:'all 0.15s',
                      boxShadow: active ? `0 0 0 2px ${s.border}` : '0 1px 3px rgba(0,0,0,0.06)' }}>
                    <div style={{ fontSize:28, fontWeight:700, color:s.color, lineHeight:1 }}>{s.value}</div>
                    <div style={{ fontSize:12, color: active ? s.color : C.textSub, marginTop:6, fontWeight: active ? 600 : 400 }}>{s.label}</div>
                    {active && s.filter !== 'news' && <div style={{ fontSize:10, color:s.color, marginTop:2, opacity:0.7 }}>● Active filter</div>}
                  </div>
                )
              })}
            </div>

            {/* Search + filter */}
            <div style={{ display:'flex', gap:10, marginBottom: filterVendor !== 'All' || search ? 10 : 16 }}>
              <div style={{ flex:1, position:'relative' }}>
                <span style={{ position:'absolute', left:13, top:'50%', transform:'translateY(-50%)', color:C.textMuted }}>🔍</span>
                <input value={search} onChange={e => setSearch(e.target.value)}
                  placeholder="Search companies or WMS systems..."
                  style={{ width:'100%', background:C.surface, border:`1px solid ${C.border}`, borderRadius:10, padding:'10px 14px 10px 38px', color:C.text, fontSize:14, outline:'none', boxSizing:'border-box', boxShadow:'0 1px 3px rgba(0,0,0,0.04)' }} />
              </div>
              <select value={filterVendor} onChange={e => setFilterVendor(e.target.value)}
                style={{ background:C.surface, border:`1px solid ${C.border}`, borderRadius:10, padding:'10px 16px', color:C.text, fontSize:14, outline:'none', cursor:'pointer', boxShadow:'0 1px 3px rgba(0,0,0,0.04)' }}>
                {['All','Blue Yonder','Manhattan Associates','SAP','Oracle','Unknown','In-House'].map(v =>
                  <option key={v} value={v}>{v}</option>)}
              </select>
              {(filterVendor !== 'All' || search) && (
                <button onClick={() => { setFilterVendor('All'); setSearch('') }}
                  style={{ padding:'10px 14px', borderRadius:10, border:`1px solid ${C.border}`, background:C.surface, color:C.textSub, fontSize:13, cursor:'pointer' }}>
                  Clear ✕
                </button>
              )}
            </div>

            {(filterVendor !== 'All' || search) && (
              <div style={{ background:C.blueLight, border:`1px solid ${C.blueBorder}`, borderRadius:8, padding:'8px 16px', marginBottom:14, fontSize:13, color:C.blue, display:'flex', justifyContent:'space-between' }}>
                <span>{filterVendor !== 'All' ? `Vendor: ${filterVendor}` : `Search: "${search}"`} — {filtered.length} companies</span>
                <button onClick={() => { setFilterVendor('All'); setSearch('') }} style={{ background:'none', border:'none', color:C.blue, cursor:'pointer', fontSize:13, fontWeight:600 }}>Clear ✕</button>
              </div>
            )}

            {/* Unknown research banner */}
            {unknownCount > 0 && (
              <div style={{ background:C.amberLight, border:`1px solid ${C.amberBorder}`, borderRadius:10, padding:'12px 16px', marginBottom:14, display:'flex', alignItems:'center', justifyContent:'space-between' }}>
                <div>
                  <span style={{ fontWeight:600, color:C.amber, fontSize:13 }}>🔍 {unknownCount} companies with unknown WMS</span>
                  <span style={{ color:C.textSub, fontSize:12, marginLeft:8 }}>
                    {researchingCount > 0 ? `Auto-researching ${researchingCount} in background...` : 'Auto-research runs on load for up to 3 at a time'}
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
              {filtered.map((c: any) => {
                const isUnknown = c.wms_entries?.every((w: any) => w.wms_system === 'Unknown')
                const isResearching = researching[c.id]
                const researchResult = researchResults[c.id]
                return (
                  <div key={c.id} onClick={() => setSelected(c)}
                    style={{ background:C.surface, border:`1px solid ${C.border}`, borderRadius:12, padding:'14px 20px', cursor:'pointer', transition:'all 0.12s', boxShadow:'0 1px 3px rgba(0,0,0,0.04)' }}
                    onMouseEnter={e => { const el = e.currentTarget as HTMLDivElement; el.style.borderColor=C.blue; el.style.boxShadow='0 2px 8px rgba(37,99,235,0.1)' }}
                    onMouseLeave={e => { const el = e.currentTarget as HTMLDivElement; el.style.borderColor=C.border; el.style.boxShadow='0 1px 3px rgba(0,0,0,0.04)' }}>
                    <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', marginBottom:8 }}>
                      <div>
                        <div style={{ fontWeight:600, fontSize:15, color:C.text }}>{c.name}</div>
                        <div style={{ color:C.textMuted, fontSize:12, marginTop:1 }}>{[c.industry, c.country].filter(Boolean).join(' · ')}</div>
                      </div>
                      <div style={{ display:'flex', gap:6, alignItems:'center' }}>
                        {c.news_updates?.length > 0 && <span style={{ background:C.redLight, color:C.red, border:`1px solid ${C.redBorder}`, borderRadius:20, padding:'2px 9px', fontSize:11, fontWeight:500 }}>📰 {c.news_updates.length}</span>}
                        {isResearching && <span style={{ background:C.blueLight, color:C.blue, border:`1px solid ${C.blueBorder}`, borderRadius:20, padding:'2px 9px', fontSize:11 }}>🔍 Researching</span>}
                        <span style={{ color:C.textMuted, fontSize:13 }}>›</span>
                      </div>
                    </div>
                    <div style={{ display:'flex', flexWrap:'wrap', gap:6 }}>
                      {c.wms_entries?.map((w: any) => (
                        <span key={w.id} style={{ background:vendorBg(w.vendor), color:vendorColor(w.vendor), border:`1px solid ${vendorBorder(w.vendor)}`, borderRadius:6, padding:'3px 10px', fontSize:12, fontWeight:500 }}>
                          {w.wms_system === 'Unknown' ? '❓ Unknown' : w.wms_system}
                          {w.version && w.version !== w.wms_system && <span style={{ opacity:0.65, fontSize:11 }}> · {w.version.length > 30 ? w.version.substring(0,30)+'…' : w.version}</span>}
                        </span>
                      ))}
                    </div>
                    {researchResult && (
                      <div style={{ marginTop:8, fontSize:12, color:C.blue, background:C.blueLight, borderRadius:6, padding:'4px 10px' }}>
                        🔍 {researchResult}
                      </div>
                    )}
                  </div>
                )
              })}
              {filtered.length === 0 && (
                <div style={{ textAlign:'center', padding:60, color:C.textMuted, background:C.surface, borderRadius:12, border:`1px solid ${C.border}` }}>
                  🔍 No companies match your search
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
                  <h2 style={{ margin:0, fontSize:22, fontWeight:700, color:C.text }}>{selected.name}</h2>
                  <p style={{ margin:'4px 0 0', color:C.textSub, fontSize:14 }}>{[selected.industry, selected.country, selected.region].filter(Boolean).join(' · ')}</p>
                </div>
                <div style={{ display:'flex', gap:8 }}>
                  {selected.wms_entries?.some((w:any) => w.wms_system === 'Unknown') && (
                    <button onClick={(e) => { e.stopPropagation(); researchCompany(selected) }}
                      disabled={researching[selected.id]}
                      style={{ padding:'8px 16px', borderRadius:8, background:researching[selected.id] ? C.amberLight : C.amber, color: researching[selected.id] ? C.amber : '#fff', border:`1px solid ${C.amberBorder}`, fontSize:13, fontWeight:600, cursor:'pointer', opacity: researching[selected.id] ? 0.7 : 1 }}>
                      {researching[selected.id] ? '🔍 Researching...' : '🔍 Research WMS'}
                    </button>
                  )}
                  <button onClick={() => { setInput(`Tell me everything about ${selected.name}'s WMS setup, any recent news, and whether our records are current.`); setTab('chat') }}
                    style={{ padding:'8px 18px', borderRadius:8, background:C.blue, color:'#fff', border:'none', fontSize:13, fontWeight:600, cursor:'pointer' }}>
                    🤖 Ask AI
                  </button>
                </div>
              </div>

              {/* Research result */}
              {researchResults[selected.id] && (
                <div style={{ background:C.blueLight, border:`1px solid ${C.blueBorder}`, borderRadius:10, padding:'10px 16px', marginBottom:20, fontSize:13, color:C.blue, fontWeight:500 }}>
                  🔍 Research: {researchResults[selected.id]}
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
                        {new Date(n.published_at||n.created_at).toLocaleDateString('en-GB', { day:'numeric', month:'short', year:'numeric' })}
                        {n.source && <span style={{ marginLeft:8 }}>· <a href={n.source.startsWith('http') ? n.source : '#'} target="_blank" rel="noopener" style={{ color:C.blue, textDecoration:'none' }}>Source ↗</a></span>}
                      </div>
                    </div>
                  ))}
                </div>
              )}

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
                <span style={{ fontSize:12, color:C.textMuted }}>Last updated: {lastRefresh.toLocaleTimeString('en-GB', { hour:'2-digit', minute:'2-digit' })}</span>
                <button onClick={load} style={{ background:C.blueLight, color:C.blue, border:`1px solid ${C.blueBorder}`, borderRadius:8, padding:'7px 14px', fontSize:13, fontWeight:600, cursor:'pointer' }}>↻ Refresh now</button>
              </div>
            </div>

            {allNews.length === 0 ? (
              <div style={{ textAlign:'center', padding:60, color:C.textMuted, background:C.surface, borderRadius:12, border:`1px solid ${C.border}` }}>
                <div style={{ fontSize:32, marginBottom:12 }}>📰</div>
                <div style={{ fontWeight:600, marginBottom:6 }}>No news yet</div>
                <div style={{ fontSize:13 }}>News and research findings will appear here automatically as the AI discovers new information.</div>
              </div>
            ) : (
              <div style={{ display:'flex', flexDirection:'column', gap:10 }}>
                {allNews.map((n: any, i: number) => {
                  const company = companies.find(c => c.id === n.companyId)
                  const isRecent = new Date(n.published_at||n.created_at).getTime() > Date.now() - 24*60*60*1000
                  return (
                    <div key={n.id || i}
                      style={{ background:C.surface, border:`1px solid ${isRecent ? C.blueBorder : C.border}`, borderRadius:12, padding:'16px 20px', boxShadow:'0 1px 3px rgba(0,0,0,0.04)', cursor:'pointer' }}
                      onClick={() => { setSelected(company); setTab('db') }}>
                      <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', marginBottom:8 }}>
                        <div style={{ display:'flex', gap:10, alignItems:'center' }}>
                          {isRecent && <span style={{ background:C.blueLight, color:C.blue, border:`1px solid ${C.blueBorder}`, borderRadius:20, padding:'2px 8px', fontSize:10, fontWeight:700 }}>NEW</span>}
                          <span style={{ background: n.impact_level === 'High' ? C.redLight : n.impact_level === 'Info' ? C.greenLight : C.amberLight,
                            color: n.impact_level === 'High' ? C.red : n.impact_level === 'Info' ? C.green : C.amber,
                            border: `1px solid ${n.impact_level === 'High' ? C.redBorder : n.impact_level === 'Info' ? C.greenBorder : C.amberBorder}`,
                            borderRadius:20, padding:'2px 8px', fontSize:11, fontWeight:500 }}>
                            {n.impact_level || 'Info'}
                          </span>
                        </div>
                        <span style={{ fontSize:11, color:C.textMuted }}>
                          {new Date(n.published_at||n.created_at).toLocaleDateString('en-GB', { day:'numeric', month:'short', year:'numeric' })}
                        </span>
                      </div>
                      <div style={{ fontWeight:600, fontSize:14, color:C.text, marginBottom:4 }}>{n.title}</div>
                      {n.summary && <div style={{ fontSize:13, color:C.textSub, marginBottom:6 }}>{n.summary}</div>}
                      <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center' }}>
                        <span style={{ fontSize:12, color:C.blue, fontWeight:500 }}>{n.companyName}</span>
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
                  {m.role==='assistant' && <div style={{ width:30, height:30, borderRadius:8, background:'linear-gradient(135deg,#2563eb,#7c3aed)', display:'flex', alignItems:'center', justifyContent:'center', fontSize:14, flexShrink:0, marginTop:2 }}>🤖</div>}
                  <div style={{ maxWidth:'72%', borderRadius:14, padding:'10px 16px', fontSize:14, lineHeight:1.65, whiteSpace:'pre-wrap',
                    background: m.role==='user' ? 'linear-gradient(135deg,#2563eb,#1d4ed8)' : C.surfaceAlt,
                    color: m.role==='user' ? '#fff' : C.text,
                    border: m.role==='user' ? 'none' : `1px solid ${C.border}` }}>
                    {m.content}
                  </div>
                </div>
              ))}
              {loading && (
                <div style={{ display:'flex', gap:10 }}>
                  <div style={{ width:30, height:30, borderRadius:8, background:'linear-gradient(135deg,#2563eb,#7c3aed)', display:'flex', alignItems:'center', justifyContent:'center', fontSize:14 }}>🤖</div>
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
              {saved && <div style={{ marginTop:12, background:C.greenLight, color:C.green, border:`1px solid ${C.greenBorder}`, borderRadius:8, padding:'10px', textAlign:'center', fontSize:13, fontWeight:500 }}>✓ Added successfully!</div>}
            </div>
          </div>
        )}
      </div>

      <style>{`
        @keyframes blink{0%,100%{opacity:1}50%{opacity:0.15}}
        *{box-sizing:border-box}
        input::placeholder{color:#9ca3af}
        textarea::placeholder{color:#9ca3af}
        a:hover{opacity:0.8}
      `}</style>
    </div>
  )
}
