'use client'
import { useState, useEffect, useRef } from 'react'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL as string,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY as string
)

export default function Home() {
  const [companies, setCompanies] = useState<any[]>([])
  const [search, setSearch] = useState('')
  const [filterVendor, setFilterVendor] = useState('All')
  const [messages, setMessages] = useState<any[]>([
    { role: 'assistant', content: "Hi! I'm your WMS Intelligence Assistant. Ask me anything — e.g. \"Who uses Manhattan Active?\", \"What's happening with M&S?\", or \"List all Blue Yonder customers\"." }
  ])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const [tab, setTab] = useState<'db'|'chat'|'add'>('db')
  const [form, setForm] = useState({ name:'', industry:'', country:'', region:'', wms_system:'', vendor:'', version:'', site_name:'', notes:'' })
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const chatEnd = useRef<HTMLDivElement>(null)

  useEffect(() => { load() }, [])
  useEffect(() => { chatEnd.current?.scrollIntoView({ behavior: 'smooth' }) }, [messages])

  async function load() {
    const { data } = await supabase.from('companies').select('*, wms_entries(*), news_updates(*)').order('name')
    if (data) setCompanies(data)
  }

  const filtered = companies.filter(c => {
    const q = search.toLowerCase()
    const matchSearch = !q || c.name.toLowerCase().includes(q) || c.wms_entries?.some((w: any) => w.wms_system?.toLowerCase().includes(q) || w.vendor?.toLowerCase().includes(q))
    const matchVendor = filterVendor === 'All' || c.wms_entries?.some((w: any) => w.vendor === filterVendor)
    return matchSearch && matchVendor
  })

  const vendors = ['All', ...Array.from(new Set(companies.flatMap((c: any) => c.wms_entries?.map((w: any) => w.vendor).filter(Boolean) || [])))] as string[]

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
          system: `You are a WMS Intelligence expert for a supply chain consultancy. You have this live database:\n\n${ctx}\n\nAnswer questions concisely and helpfully about companies, WMS systems, versions, vendors and news.`,
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

  const vendorColor = (v: string) => v?.includes('Manhattan') ? '#a78bfa' : v?.includes('Blue Yonder') ? '#60a5fa' : '#9ca3af'
  const vendorBg = (v: string) => v?.includes('Manhattan') ? 'rgba(139,92,246,0.12)' : v?.includes('Blue Yonder') ? 'rgba(59,130,246,0.12)' : 'rgba(107,114,128,0.12)'

  return (
    <div style={{ minHeight: '100vh', background: 'linear-gradient(135deg,#0a0e1a,#0d1424)', color: '#e2e8f0', fontFamily: 'system-ui,sans-serif' }}>
      {/* Header */}
      <div style={{ borderBottom: '1px solid rgba(255,255,255,0.08)', padding: '12px 24px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <div style={{ width: 32, height: 32, borderRadius: 8, background: 'linear-gradient(135deg,#3b82f6,#8b5cf6)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 16 }}>📦</div>
          <div>
            <div style={{ fontWeight: 600, fontSize: 14 }}>WMS Intelligence</div>
            <div style={{ color: 'rgba(255,255,255,0.4)', fontSize: 11 }}>{companies.length} companies tracked</div>
          </div>
        </div>
        <div style={{ display: 'flex', gap: 4 }}>
          {(['db','chat','add'] as const).map(t => (
            <button key={t} onClick={() => setTab(t)} style={{ padding: '6px 14px', borderRadius: 8, fontSize: 12, fontWeight: 500, cursor: 'pointer', border: tab===t ? '1px solid rgba(59,130,246,0.4)' : '1px solid transparent', background: tab===t ? 'rgba(59,130,246,0.15)' : 'transparent', color: tab===t ? '#60a5fa' : 'rgba(255,255,255,0.5)' }}>
              {t==='db'?'🗃 Database':t==='chat'?'🤖 AI Assistant':'➕ Add Entry'}
            </button>
          ))}
        </div>
      </div>

      <div style={{ maxWidth: 1100, margin: '0 auto', padding: 24 }}>

        {/* DATABASE */}
        {tab === 'db' && (
          <div>
            <div style={{ display: 'flex', gap: 12, marginBottom: 20 }}>
              <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search companies or WMS systems..." style={{ flex: 1, background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 12, padding: '10px 16px', color: '#e2e8f0', fontSize: 14, outline: 'none' }} />
              <select value={filterVendor} onChange={e => setFilterVendor(e.target.value)} style={{ background: 'rgba(255,255,255,0.07)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 12, padding: '10px 16px', color: '#e2e8f0', fontSize: 14, outline: 'none' }}>
                {vendors.map(v => <option key={v} value={v} style={{ background: '#1a2035' }}>{v}</option>)}
              </select>
            </div>
            {/* Stats */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 12, marginBottom: 20 }}>
              {[
                { label: 'Total Companies', value: companies.length, color: '#60a5fa' },
                { label: 'Manhattan Active', value: companies.filter((c: any) => c.wms_entries?.some((w: any) => w.vendor?.includes('Manhattan'))).length, color: '#a78bfa' },
                { label: 'Blue Yonder', value: companies.filter((c: any) => c.wms_entries?.some((w: any) => w.vendor?.includes('Blue Yonder'))).length, color: '#34d399' },
                { label: 'Active News', value: companies.reduce((n: number, c: any) => n + (c.news_updates?.length||0), 0), color: '#f87171' },
              ].map(s => (
                <div key={s.label} style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 12, padding: 16 }}>
                  <div style={{ fontSize: 24, fontWeight: 700, color: s.color }}>{s.value}</div>
                  <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.4)', marginTop: 4 }}>{s.label}</div>
                </div>
              ))}
            </div>
            {/* Cards */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {filtered.map((c: any) => (
                <div key={c.id} style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 14, padding: 20 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 10 }}>
                    <div>
                      <div style={{ fontWeight: 600, fontSize: 15 }}>{c.name}</div>
                      <div style={{ color: 'rgba(255,255,255,0.4)', fontSize: 12, marginTop: 2 }}>{[c.industry, c.country, c.region].filter(Boolean).join(' · ')}</div>
                    </div>
                    {c.news_updates?.length > 0 && <span style={{ background: 'rgba(239,68,68,0.15)', color: '#f87171', border: '1px solid rgba(239,68,68,0.3)', borderRadius: 20, padding: '3px 10px', fontSize: 11 }}>📰 {c.news_updates.length} update{c.news_updates.length>1?'s':''}</span>}
                  </div>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginBottom: 8 }}>
                    {c.wms_entries?.map((w: any) => (
                      <div key={w.id} style={{ background: vendorBg(w.vendor), color: vendorColor(w.vendor), border: `1px solid ${vendorColor(w.vendor)}40`, borderRadius: 8, padding: '6px 12px', fontSize: 12 }}>
                        <strong>{w.wms_system}</strong>{w.version && <span style={{ opacity: 0.7 }}> · {w.version}</span>}{w.site_name && <span style={{ opacity: 0.7 }}> · {w.site_name}</span>}
                      </div>
                    ))}
                  </div>
                  {c.news_updates?.map((n: any) => (
                    <div key={n.id} style={{ background: 'rgba(239,68,68,0.07)', borderLeft: '2px solid rgba(239,68,68,0.5)', borderRadius: '0 6px 6px 0', padding: '6px 10px', fontSize: 12, marginTop: 6 }}>
                      <span style={{ color: '#f87171', fontWeight: 500 }}>{n.title}</span>
                      {n.summary && <span style={{ color: 'rgba(255,255,255,0.45)', marginLeft: 6 }}>— {n.summary}</span>}
                    </div>
                  ))}
                  {c.notes && <div style={{ color: 'rgba(255,255,255,0.3)', fontSize: 11, marginTop: 8, fontStyle: 'italic' }}>{c.notes}</div>}
                </div>
              ))}
              {filtered.length === 0 && <div style={{ textAlign: 'center', padding: 60, color: 'rgba(255,255,255,0.3)' }}>🔍 No companies match your search</div>}
            </div>
          </div>
        )}

        {/* CHAT */}
        {tab === 'chat' && (
          <div style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 16, display: 'flex', flexDirection: 'column', height: 'calc(100vh - 160px)' }}>
            <div style={{ padding: '12px 20px', borderBottom: '1px solid rgba(255,255,255,0.08)', display: 'flex', alignItems: 'center', gap: 8 }}>
              <div style={{ width: 8, height: 8, borderRadius: '50%', background: '#34d399' }}></div>
              <span style={{ color: 'rgba(255,255,255,0.5)', fontSize: 13 }}>Claude connected · {companies.length} companies in context</span>
            </div>
            <div style={{ flex: 1, overflowY: 'auto', padding: 20, display: 'flex', flexDirection: 'column', gap: 16 }}>
              {messages.map((m, i) => (
                <div key={i} style={{ display: 'flex', justifyContent: m.role==='user'?'flex-end':'flex-start', gap: 10 }}>
                  {m.role==='assistant' && <div style={{ width: 28, height: 28, borderRadius: 8, background: 'linear-gradient(135deg,#3b82f6,#8b5cf6)', display:'flex',alignItems:'center',justifyContent:'center',fontSize:13,flexShrink:0 }}>🤖</div>}
                  <div style={{ maxWidth: '70%', borderRadius: 16, padding: '10px 16px', fontSize: 14, lineHeight: 1.6, whiteSpace: 'pre-wrap', background: m.role==='user' ? 'linear-gradient(135deg,#3b82f6,#2563eb)' : 'rgba(255,255,255,0.07)', color: m.role==='user' ? '#fff' : 'rgba(255,255,255,0.85)' }}>
                    {m.content}
                  </div>
                </div>
              ))}
              {loading && (
                <div style={{ display:'flex', gap:10 }}>
                  <div style={{ width:28,height:28,borderRadius:8,background:'linear-gradient(135deg,#3b82f6,#8b5cf6)',display:'flex',alignItems:'center',justifyContent:'center',fontSize:13 }}>🤖</div>
                  <div style={{ background:'rgba(255,255,255,0.07)',borderRadius:16,padding:'12px 16px',display:'flex',gap:6,alignItems:'center' }}>
                    {[0,1,2].map(i => <div key={i} style={{ width:8,height:8,borderRadius:'50%',background:'#60a5fa',animation:`blink 1.2s ${i*0.2}s infinite` }}></div>)}
                  </div>
                </div>
              )}
              <div ref={chatEnd}/>
            </div>
            <div style={{ padding: 16, borderTop: '1px solid rgba(255,255,255,0.08)' }}>
              <div style={{ display:'flex',gap:10,marginBottom:8 }}>
                <input value={input} onChange={e=>setInput(e.target.value)} onKeyDown={e=>e.key==='Enter'&&!e.shiftKey&&send()} placeholder="Ask about any WMS system, company, or trend..." style={{ flex:1,background:'rgba(255,255,255,0.07)',border:'1px solid rgba(255,255,255,0.12)',borderRadius:12,padding:'10px 16px',color:'#e2e8f0',fontSize:14,outline:'none' }} />
                <button onClick={send} disabled={loading||!input.trim()} style={{ padding:'10px 20px',borderRadius:12,background:'linear-gradient(135deg,#3b82f6,#2563eb)',color:'#fff',border:'none',fontSize:14,cursor:'pointer',opacity:loading||!input.trim()?0.4:1 }}>Send</button>
              </div>
              <div style={{ display:'flex',gap:6,flexWrap:'wrap' }}>
                {['Who uses Manhattan Active?',"What's happening with M&S?",'List all Blue Yonder customers','Compare WMS vendors'].map(q=>(
                  <button key={q} onClick={()=>setInput(q)} style={{ fontSize:11,color:'rgba(255,255,255,0.4)',background:'transparent',border:'1px solid rgba(255,255,255,0.1)',borderRadius:8,padding:'4px 10px',cursor:'pointer' }}>{q}</button>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* ADD */}
        {tab === 'add' && (
          <div style={{ maxWidth: 640 }}>
            <div style={{ background:'rgba(255,255,255,0.04)',border:'1px solid rgba(255,255,255,0.08)',borderRadius:16,padding:24 }}>
              <div style={{ fontWeight:600,fontSize:16,marginBottom:20 }}>Add New Company & WMS Entry</div>
              <div style={{ display:'grid',gridTemplateColumns:'1fr 1fr',gap:12,marginBottom:12 }}>
                {[['Company Name *','name','e.g. ASOS'],['Industry','industry','e.g. Fashion Retail'],['Country','country','e.g. United Kingdom'],['Region','region','e.g. EMEA']].map(([label,field,ph])=>(
                  <div key={field}>
                    <div style={{ fontSize:11,color:'rgba(255,255,255,0.5)',marginBottom:6 }}>{label}</div>
                    <input value={(form as any)[field]} onChange={e=>setForm({...form,[field]:e.target.value})} placeholder={ph} style={{ width:'100%',background:'rgba(255,255,255,0.06)',border:'1px solid rgba(255,255,255,0.1)',borderRadius:10,padding:'10px 12px',color:'#e2e8f0',fontSize:13,outline:'none',boxSizing:'border-box' }} />
                  </div>
                ))}
              </div>
              <div style={{ borderTop:'1px solid rgba(255,255,255,0.08)',margin:'12px 0' }}/>
              <div style={{ display:'grid',gridTemplateColumns:'1fr 1fr',gap:12,marginBottom:12 }}>
                {[['WMS System *','wms_system','e.g. Manhattan Active WM'],['Vendor','vendor','e.g. Manhattan Associates'],['Version','version','e.g. Active (Cloud)'],['Site / Hub','site_name','e.g. Germany Hub']].map(([label,field,ph])=>(
                  <div key={field}>
                    <div style={{ fontSize:11,color:'rgba(255,255,255,0.5)',marginBottom:6 }}>{label}</div>
                    <input value={(form as any)[field]} onChange={e=>setForm({...form,[field]:e.target.value})} placeholder={ph} style={{ width:'100%',background:'rgba(255,255,255,0.06)',border:'1px solid rgba(255,255,255,0.1)',borderRadius:10,padding:'10px 12px',color:'#e2e8f0',fontSize:13,outline:'none',boxSizing:'border-box' }} />
                  </div>
                ))}
              </div>
              <div style={{ marginBottom:16 }}>
                <div style={{ fontSize:11,color:'rgba(255,255,255,0.5)',marginBottom:6 }}>Notes / Intel</div>
                <textarea value={form.notes} onChange={e=>setForm({...form,notes:e.target.value})} rows={3} placeholder="Any additional intel, news, or context..." style={{ width:'100%',background:'rgba(255,255,255,0.06)',border:'1px solid rgba(255,255,255,0.1)',borderRadius:10,padding:'10px 12px',color:'#e2e8f0',fontSize:13,outline:'none',resize:'none',boxSizing:'border-box' }} />
              </div>
              <button onClick={addEntry} disabled={saving||!form.name||!form.wms_system} style={{ width:'100%',padding:'12px',borderRadius:12,background:'linear-gradient(135deg,#3b82f6,#2563eb)',color:'#fff',border:'none',fontSize:14,fontWeight:500,cursor:'pointer',opacity:saving||!form.name||!form.wms_system?0.4:1 }}>
                {saving?'Saving...':'Add to Database'}
              </button>
              {saved && <div style={{ marginTop:10,background:'rgba(16,185,129,0.15)',color:'#34d399',border:'1px solid rgba(16,185,129,0.3)',borderRadius:10,padding:'8px 0',textAlign:'center',fontSize:13 }}>✓ Added successfully!</div>}
            </div>
          </div>
        )}
      </div>
      <style>{`@keyframes blink{0%,100%{opacity:1}50%{opacity:0.2}}`}</style>
    </div>
  )
}
