import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'WMS Intelligence Tracker',
  description: 'AI-powered WMS system intelligence database',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body style={{ margin: 0, padding: 0 }}>{children}</body>
    </html>
  )
}
