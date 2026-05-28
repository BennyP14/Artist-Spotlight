import type { Metadata, Viewport } from 'next'
import { DM_Sans } from 'next/font/google'
import './globals.css'

const dmSans = DM_Sans({ subsets: ['latin'], weight: ['300', '400', '500', '600', '700'] })

export const metadata: Metadata = {
  title: 'Artist Spotlight',
  description: 'Deep-dive listening sessions through an artist\'s entire discography',
  manifest: '/manifest.json',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'black-translucent',
    title: 'Spotlight',
  },
}

export const viewport: Viewport = {
  themeColor: '#f97316',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className="dark">
      <head>
        <link rel="apple-touch-icon" href="/icon-192.png" />
      </head>
      <body className={`${dmSans.className} bg-[#0c0a08] text-white min-h-screen`}>
        <nav className="border-b border-white/5 px-4 py-3 flex items-center gap-4">
          <a href="/" className="flex items-center gap-2 group">
            <div className="w-7 h-7 rounded-md bg-gradient-to-br from-orange-500 to-orange-600 flex items-center justify-center flex-shrink-0 shadow-[0_0_14px_rgba(249,115,22,0.4)]">
              <svg className="w-4 h-4 text-white" fill="currentColor" viewBox="0 0 20 20">
                <path d="M18 3a1 1 0 00-1.196-.98l-10 2A1 1 0 006 5v9.114A4.369 4.369 0 005 14c-1.657 0-3 .895-3 2s1.343 2 3 2 3-.895 3-2V7.82l8-1.6v5.894A4.37 4.37 0 0015 12c-1.657 0-3 .895-3 2s1.343 2 3 2 3-.895 3-2V3z" />
              </svg>
            </div>
            <span className="font-semibold text-sm tracking-wide group-hover:text-orange-400 transition-colors">
              Artist Spotlight
            </span>
          </a>
          <a href="/rankings" className="text-xs text-zinc-600 hover:text-zinc-300 transition-colors uppercase tracking-widest font-medium">
            Rankings
          </a>
          <div className="ml-auto">
            <a
              href="/spotlight/new"
              className="text-xs bg-orange-500 hover:bg-orange-400 text-white font-semibold px-3 py-1.5 rounded-md transition-colors tracking-wide shadow-[0_4px_14px_rgba(249,115,22,0.25)]"
            >
              + New
            </a>
          </div>
        </nav>
        <main className="max-w-5xl mx-auto px-4 py-6">{children}</main>
      </body>
    </html>
  )
}
