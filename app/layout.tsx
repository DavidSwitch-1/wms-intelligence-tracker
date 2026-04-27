import type { Metadata } from 'next'
import { Inter } from 'next/font/google'

const inter = Inter({
  subsets: ['latin'],
  display: 'swap',
  variable: '--font-inter',
  weight: ['400', '500', '600', '700', '800']
})

export const metadata: Metadata = {
  title: 'WMS Intelligence — swi-tch',
  description: 'WMS intelligence and recruitment signals for supply chain consultants',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={inter.variable}>
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
