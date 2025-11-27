import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'Venn - Connect with Your Community',
  description: 'Find people who share your interests and values',
  icons: {
    icon: '/Venn-Logo.png',
    shortcut: '/Venn-Logo.png',
    apple: '/Venn-Logo.png',
  },
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  )
}
