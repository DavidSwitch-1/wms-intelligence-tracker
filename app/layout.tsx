import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'WMS Intelligence Tracker',
  description: 'AI-powered WMS system intelligence database',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  )
}
