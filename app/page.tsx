'use client'
import { useState, useEffect, useRef } from 'react'
import { supabase } from '@/lib/supabase'

type Company = {
  id: string; name: string; industry: string; country: string; region: string; notes: string;
  wms_entries: WmsEntry[]; news_updates: NewsUpdate[];
}
type WmsEntry = {
  id: string; wms_system: string; vendor: string; version: string; status: string; site_name: string; notes: string;
}
type NewsUpdate = {
  id: string; title: string; summary: string; impact_level: string; published_at: string;
}
type Message = { role: 'user' | 'assistant'; content: string }

const WMS_COLORS: Record<string, string> = {
  'Manhattan Associates': 'badge-manhattan',
  'Blue Yonder': 'badge-blueyonder',
}

function wmsBadge(vendor: string) {
  return WMS_COLORS[vendor] || 'badge-other'
}

export default function Home() {
  const [companies, setCompanies] = useState<Company[]>([])
  const [search, setSearch] = useState('')
  const [filterVendor, setFilterVendor] = useState('All')
  const [messages, setMessages] = useState<Message[]>([
    { role: 'assistant', content: "Hi! I'm your WMS Intelligence Assistant. Ask me anything about the companies and WMS systems in your database — e.g. *\"Who uses Manhattan Active?\"*, *\"What's happening with M&S?\"*, or *\"Compare Blue Yonder users\"*." }
  ])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const [activeTab, setActiveTab] = useState<'database' | 'chat' | 'add'>('database')
  const [addForm, setAddForm] = useState({ name: '', industry: '', country: '', region: '', wms_system: '', vendor: '', version: '', site_name: '', notes: '' })
  const [addLoading, setAddLoading] = useState(false)
  const [addSuccess, setAddSuccess] = useState(false)
  const chatEndRef = useRef<HTMLDivElement>(null)

  useEffect(() => { loadCompanies() }, [])
  useEffect(() => { chatEndRef.current?.scrollIntoView({ behavior: 'smooth' }) }, [messages])

  async function loadCompanies() {
    const { data } = await supabase
      .from('companies')
      .select('*, wms_entries(*), news_updates(*)')
      .order('name')
    if (data) setCompanies(data as Company[])
  }

  const filtered = companies.filter(c => {
    const matchSearch = c.name.toLowerCase().includes(search.toLowerCase()) ||
      c.wms_entries?.some(w => w.wms_system.toLowerCase().includes(search.toLowerCase()) || w.vendor.toLowerCase().includes(search.toLowerCase()))
    const matchVendor = filterVendor === 'All' || c.wms_entries?.some(w => w.vendor === filterVendor)
    return matchSearch && matchVendor
  })

  async function sendMessage() {
    if (!input.trim() || loading) return
    const userMsg = input.trim()
    setInput('')
    setMessages(prev => [...prev, { role: 'user', content: userMsg }])
    setLoading(true)

    try {
      // Build context from DB
      const ctx = companies.map(c => {
        const wms = c.wms_entries?.map(w => `${w.wms_system} (${w.vendor}, v${w.version})${w.site_name ? ` at ${w.site_name}` : ''}`).join(', ')
        const news = c.news_updates?.map(n => `[${n.impact_level}] ${n.title}: ${n.summary}`).join(' | ')
        return `${c.name} (${c.industry}, ${c.country}): WMS=${wms || 'Unknown'}${news ? ` | News: ${news}` : ''}${c.notes ? ` | Notes: ${c.notes}` : ''}`
      }).join('\n')

      const systemPrompt = `You are a WMS (Warehouse Management System) intelligence expert assistant for a logistics/supply chain consultancy team. You have access to a live database of companies and their WMS systems.

CURRENT DATABASE:
${ctx}

Answer questions about this data concisely and helpfully. When relevant, mention specific companies, WMS versions, vendors, and news. Format your answers clearly. If asked about companies not in the database, say so and suggest they add the data.`

      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ messages: [...messages, { role: 'user', content: userMsg }], system: systemPrompt })
      })
      const data = await response.json()
      setMessages(prev => [...prev, { role: 'assistant', content: data.content }])
    } catch {
      setMessages(prev => [...prev, { role: 'assistant', content: 'Sorry, something went wrong. Please try again.' }])
    }
    setLoading(false)
  }

  async function addCompany() {
    if (!addForm.name || !addForm.wms_system) return
    setAddLoading(true)
    const { data: company } = await supabase
      .from('companies')
      .insert({ name: addForm.name, industry: addForm.industry, country: addForm.country, region: addForm.region, notes: addForm.notes })
      .select().single()
    if (company) {
      await supabase.from('wms_entries').insert({
        company_id: company.id, wms_system: addForm.wms_system, vendor: addForm.vendor,
        version: addForm.version, site_name: addForm.site_name, status: 'Active'
      })
    }
    setAddLoading(false)
    setAddSuccess(true)
    setAddForm({ name: '', industry: '', country: '', region: '', wms_system: '', vendor: '', version: '', site_name: '', notes: '' })
    loadCompanies()
    setTimeout(() => setAddSuccess(false), 3000)
  }

  const vendors = ['All', ...Array.from(new Set(companies.flatMap(c => c.wms_entries?.map(w => w.vendor) || [])))]

  return (
    <div className="min-h-screen" style={{ background: 'linear-gradient(135deg, #0a0e1a 0%, #0d1424 50%, #0a0e1a 100%)' }}>
      {/* Header */}
      <header className="border-b border-white/8 px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg flex items-center justify-center text-sm" style={{ background: 'linear-gradient(135deg, #3b82f6, #8b5cf6)' }}>
            📦
          </div>
          <div>
            <h1 className="text-white font-semibold text-sm tracking-wide">WMS Intelligence</h1>
            <p className="text-white/40 text-xs">{companies.length} companies tracked</p>
          </div>
        </div>
        <div className="flex gap-1">
          {(['database', 'chat', 'add'] as const).map(tab => (
            <button key={tab} onClick={() => setActiveTab(tab)}
              className={`px-4 py-1.5 rounded-lg text-xs font-medium capitalize transition-all ${activeTab === tab ? 'bg-blue-500/20 text-blue-400 border border-blue-500/30' : 'text-white/50 hover:text-white/80'}`}>
              {tab === 'database' ? '🗃 Database' : tab === 'chat' ? '🤖 AI Assistant' : '➕ Add Entry'}
            </button>
          ))}
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-6 py-6">

        {/* DATABASE TAB */}
        {activeTab === 'database' && (
          <div>
            {/* Search & Filter */}
            <div className="flex gap-3 mb-6">
              <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search companies or WMS systems..."
                className="flex-1 glass rounded-xl px-4 py-3 text-sm text-white placeholder-white/30 outline-none focus:border-blue-500/50 transition-all"
                style={{ background: 'rgba(255,255,255,0.04)' }} />
              <select value={filterVendor} onChange={e => setFilterVendor(e.target.value)}
                className="glass rounded-xl px-4 py-3 text-sm text-white/80 outline-none"
                style={{ background: 'rgba(255,255,255,0.06)' }}>
                {vendors.map(v => <option key={v} value={v} style={{ background: '#1a2035' }}>{v}</option>)}
              </select>
            </div>

            {/* Stats row */}
            <div className="grid grid-cols-4 gap-3 mb-6">
              {[
                { label: 'Total Companies', value: companies.length, color: '#60a5fa' },
                { label: 'Manhattan Active', value: companies.filter(c => c.wms_entries?.some(w => w.vendor === 'Manhattan Associates')).length, color: '#a78bfa' },
                { label: 'Blue Yonder', value: companies.filter(c => c.wms_entries?.some(w => w.vendor === 'Blue Yonder')).length, color: '#34d399' },
                { label: 'Active News', value: companies.reduce((n, c) => n + (c.news_updates?.length || 0), 0), color: '#f87171' },
              ].map(s => (
                <div key={s.label} className="glass rounded-xl p-4">
                  <div className="text-2xl font-bold" style={{ color: s.color }}>{s.value}</div>
                  <div className="text-white/40 text-xs mt-1">{s.label}</div>
                </div>
              ))}
            </div>

            {/* Company cards */}
            <div className="grid gap-3">
              {filtered.map(company => (
                <div key={company.id} className="glass rounded-xl p-5 hover:border-white/15 transition-all">
                  <div className="flex items-start justify-between mb-3">
                    <div>
                      <h3 className="text-white font-semibold">{company.name}</h3>
                      <p className="text-white/40 text-xs mt-0.5">{company.industry} · {company.country}{company.region ? ` · ${company.region}` : ''}</p>
                    </div>
                    {company.news_updates?.length > 0 && (
                      <span className="badge-high text-xs px-2 py-0.5 rounded-full">📰 {company.news_updates.length} update{company.news_updates.length > 1 ? 's' : ''}</span>
                    )}
                  </div>
                  {/* WMS entries */}
                  <div className="flex flex-wrap gap-2 mb-3">
                    {company.wms_entries?.map(w => (
                      <div key={w.id} className={`${wmsBadge(w.vendor)} text-xs px-3 py-1.5 rounded-lg`}>
                        <span className="font-medium">{w.wms_system}</span>
                        {w.version && <span className="opacity-70"> · {w.version}</span>}
                        {w.site_name && <span className="opacity-70"> · {w.site_name}</span>}
                      </div>
                    ))}
                  </div>
                  {/* News */}
                  {company.news_updates?.map(n => (
                    <div key={n.id} className="mt-2 rounded-lg px-3 py-2 text-xs" style={{ background: 'rgba(239,68,68,0.07)', borderLeft: '2px solid rgba(239,68,68,0.4)' }}>
                      <span className="text-red-400 font-medium">{n.title}</span>
                      {n.summary && <span className="text-white/50 ml-2">— {n.summary}</span>}
                    </div>
                  ))}
                  {company.notes && <p className="text-white/30 text-xs mt-2 italic">{company.notes}</p>}
                </div>
              ))}
              {filtered.length === 0 && (
                <div className="text-center py-16 text-white/30">
                  <div className="text-4xl mb-3">🔍</div>
                  <p>No companies match your search</p>
                </div>
              )}
            </div>
          </div>
        )}

        {/* CHAT TAB */}
        {activeTab === 'chat' && (
          <div className="flex flex-col" style={{ height: 'calc(100vh - 160px)' }}>
            <div className="glass rounded-xl flex flex-col h-full overflow-hidden">
              <div className="px-5 py-3 border-b border-white/8 flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-green-400 animate-pulse"></div>
                <span className="text-white/60 text-sm">Claude is connected · {companies.length} companies in context</span>
              </div>
              {/* Messages */}
              <div className="flex-1 overflow-y-auto p-5 space-y-4 chat-scroll">
                {messages.map((m, i) => (
                  <div key={i} className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                    {m.role === 'assistant' && (
                      <div className="w-7 h-7 rounded-lg flex items-center justify-center text-xs mr-2 flex-shrink-0 mt-0.5"
                        style={{ background: 'linear-gradient(135deg, #3b82f6, #8b5cf6)' }}>🤖</div>
                    )}
                    <div className={`max-w-2xl rounded-2xl px-4 py-3 text-sm leading-relaxed ${
                      m.role === 'user'
                        ? 'text-white' : 'text-white/85'
                    }`} style={{
                      background: m.role === 'user' ? 'linear-gradient(135deg, #3b82f6, #2563eb)' : 'rgba(255,255,255,0.06)',
                      whiteSpace: 'pre-wrap'
                    }}>
                      {m.content}
                    </div>
                  </div>
                ))}
                {loading && (
                  <div className="flex justify-start">
                    <div className="w-7 h-7 rounded-lg flex items-center justify-center text-xs mr-2"
                      style={{ background: 'linear-gradient(135deg, #3b82f6, #8b5cf6)' }}>🤖</div>
                    <div className="glass rounded-2xl px-4 py-3 flex gap-1.5 items-center">
                      <div className="typing-dot w-2 h-2 rounded-full bg-blue-400"></div>
                      <div className="typing-dot w-2 h-2 rounded-full bg-blue-400"></div>
                      <div className="typing-dot w-2 h-2 rounded-full bg-blue-400"></div>
                    </div>
                  </div>
                )}
                <div ref={chatEndRef} />
              </div>
              {/* Input */}
              <div className="p-4 border-t border-white/8">
                <div className="flex gap-3">
                  <input value={input} onChange={e => setInput(e.target.value)}
                    onKeyDown={e => e.key === 'Enter' && !e.shiftKey && sendMessage()}
                    placeholder="Ask about any WMS system, company, or trend..."
                    className="flex-1 rounded-xl px-4 py-3 text-sm text-white placeholder-white/30 outline-none"
                    style={{ background: 'rgba(255,255,255,0.07)', border: '1px solid rgba(255,255,255,0.1)' }} />
                  <button onClick={sendMessage} disabled={loading || !input.trim()}
                    className="px-5 rounded-xl text-sm font-medium transition-all disabled:opacity-30"
                    style={{ background: 'linear-gradient(135deg, #3b82f6, #2563eb)', color: 'white' }}>
                    Send
                  </button>
                </div>
                <div className="flex gap-2 mt-2 flex-wrap">
                  {['Who uses Manhattan Active?', 'What\'s happening with M&S?', 'List all Blue Yonder customers', 'Compare WMS vendors'].map(q => (
                    <button key={q} onClick={() => { setInput(q) }}
                      className="text-xs text-white/40 hover:text-white/70 px-2 py-1 rounded-lg border border-white/8 hover:border-white/20 transition-all">
                      {q}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ADD ENTRY TAB */}
        {activeTab === 'add' && (
          <div className="max-w-2xl">
            <div className="glass rounded-xl p-6">
              <h2 className="text-white font-semibold mb-5">Add New Company & WMS Entry</h2>
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-white/50 text-xs mb-1.5 block">Company Name *</label>
                    <input value={addForm.name} onChange={e => setAddForm({...addForm, name: e.target.value})}
                      className="w-full glass rounded-lg px-3 py-2.5 text-sm text-white outline-none"
                      placeholder="e.g. ASOS" />
                  </div>
                  <div>
                    <label className="text-white/50 text-xs mb-1.5 block">Industry</label>
                    <input value={addForm.industry} onChange={e => setAddForm({...addForm, industry: e.target.value})}
                      className="w-full glass rounded-lg px-3 py-2.5 text-sm text-white outline-none"
                      placeholder="e.g. Fashion Retail" />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-white/50 text-xs mb-1.5 block">Country</label>
                    <input value={addForm.country} onChange={e => setAddForm({...addForm, country: e.target.value})}
                      className="w-full glass rounded-lg px-3 py-2.5 text-sm text-white outline-none"
                      placeholder="e.g. United Kingdom" />
                  </div>
                  <div>
                    <label className="text-white/50 text-xs mb-1.5 block">Region</label>
                    <input value={addForm.region} onChange={e => setAddForm({...addForm, region: e.target.value})}
                      className="w-full glass rounded-lg px-3 py-2.5 text-sm text-white outline-none"
                      placeholder="e.g. EMEA" />
                  </div>
                </div>
                <hr className="border-white/8" />
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-white/50 text-xs mb-1.5 block">WMS System *</label>
                    <input value={addForm.wms_system} onChange={e => setAddForm({...addForm, wms_system: e.target.value})}
                      className="w-full glass rounded-lg px-3 py-2.5 text-sm text-white outline-none"
                      placeholder="e.g. Manhattan Active WM" />
                  </div>
                  <div>
                    <label className="text-white/50 text-xs mb-1.5 block">Vendor</label>
                    <input value={addForm.vendor} onChange={e => setAddForm({...addForm, vendor: e.target.value})}
                      className="w-full glass rounded-lg px-3 py-2.5 text-sm text-white outline-none"
                      placeholder="e.g. Manhattan Associates" />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-white/50 text-xs mb-1.5 block">Version</label>
                    <input value={addForm.version} onChange={e => setAddForm({...addForm, version: e.target.value})}
                      className="w-full glass rounded-lg px-3 py-2.5 text-sm text-white outline-none"
                      placeholder="e.g. Active (Cloud)" />
                  </div>
                  <div>
                    <label className="text-white/50 text-xs mb-1.5 block">Site / Hub</label>
                    <input value={addForm.site_name} onChange={e => setAddForm({...addForm, site_name: e.target.value})}
                      className="w-full glass rounded-lg px-3 py-2.5 text-sm text-white outline-none"
                      placeholder="e.g. UK DC, Germany Hub" />
                  </div>
                </div>
                <div>
                  <label className="text-white/50 text-xs mb-1.5 block">Notes / Intel</label>
                  <textarea value={addForm.notes} onChange={e => setAddForm({...addForm, notes: e.target.value})} rows={3}
                    className="w-full glass rounded-lg px-3 py-2.5 text-sm text-white outline-none resize-none"
                    placeholder="Any additional intel, news, or context..." />
                </div>
                <button onClick={addCompany} disabled={addLoading || !addForm.name || !addForm.wms_system}
                  className="w-full py-3 rounded-xl text-sm font-medium transition-all disabled:opacity-30"
                  style={{ background: 'linear-gradient(135deg, #3b82f6, #2563eb)', color: 'white' }}>
                  {addLoading ? 'Saving...' : 'Add to Database'}
                </button>
                {addSuccess && (
                  <div className="badge-info text-center py-2 rounded-lg text-sm">✓ Added successfully!</div>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
