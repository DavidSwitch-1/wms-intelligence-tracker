'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import { MapContainer, TileLayer, useMap } from 'react-leaflet'
import L from 'leaflet'
import 'leaflet.markercluster'

// Vendor palette — must match `const C` colours used in page.tsx
// for the Database tab badges.
const VENDOR_COLOURS: Record<string, string> = {
  'Manhattan': '#2563eb',     // blue-600
  'Blue Yonder': '#7c3aed',   // violet-600
  'Körber': '#059669',        // emerald-600
  'SAP': '#0891b2',           // cyan-600
  'Other': '#d97706',         // amber-600
  'Unknown': '#6b7280',       // gray-500
}

function vendorFamily(vendor: string | null | undefined): keyof typeof VENDOR_COLOURS {
  if (!vendor) return 'Unknown'
  const v = vendor.toLowerCase()
  if (v.includes('manhattan')) return 'Manhattan'
  if (v.includes('blue yonder') || v.includes('jda') || v.includes('red prairie') || v.includes('redprairie')) return 'Blue Yonder'
  if (v.includes('körber') || v.includes('korber') || v.includes('hardis') || v.includes('mecalux easywms')) return 'Körber'
  if (v.includes('sap') || v.includes('ewm')) return 'SAP'
  if (v === 'unknown') return 'Unknown'
  return 'Other'
}

function pinSvgUrl(colour: string): string {
  const svg = `<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 36' width='24' height='36'>
    <path d='M12 0C5.4 0 0 5.4 0 12c0 9 12 24 12 24s12-15 12-24c0-6.6-5.4-12-12-12z' fill='${colour}' stroke='white' stroke-width='1.5'/>
    <circle cx='12' cy='12' r='4.5' fill='white'/>
  </svg>`
  return 'data:image/svg+xml;charset=UTF-8,' + encodeURIComponent(svg)
}

function makeIcon(colour: string): L.Icon {
  return L.icon({
    iconUrl: pinSvgUrl(colour),
    iconSize: [24, 36],
    iconAnchor: [12, 36],
    popupAnchor: [0, -32],
    className: 'wms-marker',
  })
}

const ICON_CACHE: Record<string, L.Icon> = {}
function iconFor(family: keyof typeof VENDOR_COLOURS): L.Icon {
  if (!ICON_CACHE[family]) ICON_CACHE[family] = makeIcon(VENDOR_COLOURS[family])
  return ICON_CACHE[family]
}

export interface MapCompany {
  id: string
  name: string
  country?: string | null
  hq_city?: string | null
  latitude?: number | null
  longitude?: number | null
  is_3pl?: boolean | null
  third_party_logistics?: string | null
  signal_status?: 'Hot' | 'Warm' | 'Cool' | string | null
  vendor?: string | null
}

interface ClusterLayerProps {
  companies: MapCompany[]
  onSelect: (companyId: string) => void
}

function ClusterLayer({ companies, onSelect }: ClusterLayerProps) {
  const map = useMap()
  const layerRef = useRef<any>(null)

  useEffect(() => {
    // @ts-ignore - markerClusterGroup attached at runtime by leaflet.markercluster
    const cluster: any = (L as any).markerClusterGroup({
      showCoverageOnHover: false,
      spiderfyOnMaxZoom: true,
      maxClusterRadius: 50,
    })
    layerRef.current = cluster

    for (const c of companies) {
      if (c.latitude == null || c.longitude == null) continue
      const fam = vendorFamily(c.vendor)
      const marker = L.marker([c.latitude, c.longitude], { icon: iconFor(fam) })
      const tplLine = c.third_party_logistics
        ? `<div style="font-size:11px;color:#666;margin-top:2px">3PL: ${escapeHtml(c.third_party_logistics)}</div>`
        : ''
      const is3plLine = c.is_3pl
        ? '<div style="font-size:11px;color:#b45309;margin-top:2px">3PL Provider</div>'
        : ''
      const cityLine = c.hq_city
        ? `<div style="font-size:11px;color:#666">${escapeHtml(c.hq_city)}${c.country ? ', ' + escapeHtml(c.country) : ''}</div>`
        : c.country
          ? `<div style="font-size:11px;color:#666">${escapeHtml(c.country)}</div>`
          : ''
      const popup = `
        <div style="min-width:180px">
          <div style="font-weight:600">${escapeHtml(c.name)}</div>
          ${cityLine}
          <div style="font-size:11px;color:#666;margin-top:4px">WMS: ${escapeHtml(fam)}</div>
          ${tplLine}
          ${is3plLine}
          <button data-cid="${c.id}" class="wms-popup-open" style="margin-top:8px;padding:4px 8px;border:1px solid #ddd;border-radius:4px;background:#fff;cursor:pointer;font-size:11px">Open in Database</button>
        </div>
      `
      marker.bindPopup(popup)
      marker.on('popupopen', (e: any) => {
        const node: HTMLElement = e.popup.getElement()
        const btn = node?.querySelector('.wms-popup-open') as HTMLButtonElement | null
        if (btn) {
          btn.onclick = () => onSelect(c.id)
        }
      })
      cluster.addLayer(marker)
    }
    map.addLayer(cluster)

    const withCoords = companies.filter(c => c.latitude != null && c.longitude != null)
    if (withCoords.length > 0) {
      const bounds = L.latLngBounds(withCoords.map(c => [c.latitude!, c.longitude!] as [number, number]))
      try {
        map.fitBounds(bounds, { padding: [40, 40], maxZoom: 7 })
      } catch { /* single point or invalid bounds — ignore */ }
    }

    return () => {
      try { map.removeLayer(cluster) } catch { /* noop */ }
    }
  }, [companies, map, onSelect])

  return null
}

function escapeHtml(s: string): string {
  return String(s).replace(/[&<>"']/g, ch => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;',
  } as any)[ch])
}

interface MapViewProps {
  companies: MapCompany[]
  totalCount: number
  onSelect: (companyId: string) => void
}

export default function MapView({ companies, totalCount, onSelect }: MapViewProps) {
  const [mounted, setMounted] = useState(false)
  useEffect(() => { setMounted(true) }, [])

  const withCoords = useMemo(
    () => companies.filter(c => c.latitude != null && c.longitude != null),
    [companies]
  )

  const center: [number, number] = [51.5, -1.5]

  if (!mounted) return null

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
      <div style={{ height: 'calc(100vh - 280px)', minHeight: 480, borderRadius: 8, overflow: 'hidden', border: '1px solid #e5e7eb' }}>
        <MapContainer
          center={center}
          zoom={4}
          style={{ height: '100%', width: '100%' }}
          scrollWheelZoom
        >
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />
          <ClusterLayer companies={withCoords} onSelect={onSelect} />
        </MapContainer>
      </div>
      <div style={{ display: 'flex', gap: 16, alignItems: 'center', flexWrap: 'wrap' }}>
        <div style={{ fontSize: 12, color: '#6b7280' }}>
          Showing {withCoords.length} of {totalCount} companies. Companies without a known location are hidden.
        </div>
        <div style={{ display: 'flex', gap: 12, alignItems: 'center', flexWrap: 'wrap' }}>
          {(['Manhattan', 'Blue Yonder', 'Körber', 'SAP', 'Other', 'Unknown'] as const).map(fam => (
            <span key={fam} style={{ display: 'inline-flex', alignItems: 'center', gap: 4, fontSize: 11, color: '#374151' }}>
              <span style={{ display: 'inline-block', width: 10, height: 10, borderRadius: '50%', background: VENDOR_COLOURS[fam] }} />
              {fam}
            </span>
          ))}
        </div>
      </div>
    </div>
  )
}

export { vendorFamily, VENDOR_COLOURS }
