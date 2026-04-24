'use client'
import { useState } from 'react'

export default function Login() {
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!password || loading) return
    setLoading(true)
    setError('')
    try {
      const res = await fetch('/api/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password })
      })
      if (res.ok) {
        // redirect to return path if present, else home
        const params = new URLSearchParams(window.location.search)
        const next = params.get('next') || '/'
        window.location.href = next
      } else {
        setError('Incorrect password')
      }
    } catch {
      setError('Something went wrong. Try again.')
    }
    setLoading(false)
  }

  return (
    <div style={{
      minHeight: '100vh',
      background: '#f0f2f5',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      fontFamily: '-apple-system,BlinkMacSystemFont,"Segoe UI",system-ui,sans-serif',
      padding: '24px'
    }}>
      <form onSubmit={onSubmit} style={{
        background: '#ffffff',
        border: '1px solid #e2e6ea',
        borderRadius: 16,
        padding: 32,
        maxWidth: 380,
        width: '100%',
        boxShadow: '0 2px 12px rgba(0,0,0,0.06)'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 20 }}>
          <div style={{
            width: 40, height: 40, borderRadius: 10,
            background: 'linear-gradient(135deg,#2563eb,#7c3aed)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 20
          }}>📦</div>
          <div>
            <div style={{ fontWeight: 700, fontSize: 16, color: '#1a1f2e' }}>WMS Intelligence</div>
            <div style={{ fontSize: 12, color: '#6b7280' }}>Authorised access only</div>
          </div>
        </div>

        <label style={{ fontSize: 12, fontWeight: 600, color: '#6b7280', display: 'block', marginBottom: 6 }}>
          Password
        </label>
        <input
          type="password"
          value={password}
          onChange={e => setPassword(e.target.value)}
          autoFocus
          style={{
            width: '100%',
            background: '#f7f8fa',
            border: '1px solid #e2e6ea',
            borderRadius: 10,
            padding: '10px 14px',
            color: '#1a1f2e',
            fontSize: 14,
            outline: 'none',
            boxSizing: 'border-box',
            marginBottom: 14
          }}
        />

        {error && (
          <div style={{
            background: '#fef2f2', color: '#dc2626',
            border: '1px solid #fecaca', borderRadius: 8,
            padding: '8px 12px', fontSize: 13, marginBottom: 12
          }}>
            {error}
          </div>
        )}

        <button
          type="submit"
          disabled={!password || loading}
          style={{
            width: '100%',
            padding: '11px',
            borderRadius: 10,
            background: '#2563eb',
            color: '#fff',
            border: 'none',
            fontSize: 14,
            fontWeight: 600,
            cursor: (!password || loading) ? 'default' : 'pointer',
            opacity: (!password || loading) ? 0.55 : 1
          }}
        >
          {loading ? 'Checking...' : 'Unlock'}
        </button>
      </form>
    </div>
  )
}
