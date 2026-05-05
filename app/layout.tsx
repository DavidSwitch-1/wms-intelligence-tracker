import type { Metadata } from 'next'
import { Inter, Source_Serif_4 } from 'next/font/google'
import 'leaflet/dist/leaflet.css'
import 'leaflet.markercluster/dist/MarkerCluster.css'
import 'leaflet.markercluster/dist/MarkerCluster.Default.css'
import { SHIMMER_CSS } from '@/lib/design'

const inter = Inter({
  subsets: ['latin'],
  variable: '--font-inter',
  display: 'swap',
})

const serif = Source_Serif_4({
  subsets: ['latin'],
  variable: '--font-serif',
  weight: ['400','500','600','700'],
  display: 'swap',
})

export const metadata: Metadata = {
  title: 'swi·tch — WMS intelligence',
  description: 'WMS intelligence for supply chain consultants',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${inter.variable} ${serif.variable}`}>
      <head>
        <style dangerouslySetInnerHTML={{ __html: SHIMMER_CSS }} />
      </head>
      <body style={{
        margin: 0,
        padding: 0,
        fontFamily: 'var(--font-inter), -apple-system, BlinkMacSystemFont, "Segoe UI", system-ui, sans-serif',
        WebkitFontSmoothing: 'antialiased',
        MozOsxFontSmoothing: 'grayscale',
      }}>{children}</body>
    </html>
  )
}
