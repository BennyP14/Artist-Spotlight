import type { Metadata, Viewport } from 'next'
import { Geist } from 'next/font/google'
import './globals.css'

const geist = Geist({ subsets: ['latin'] })

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
  themeColor: '#f59e0b',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className="dark">
      <head>
        <link rel="apple-touch-icon" href="/icon-192.png" />
      </head>
      <body className={`${geist.className} bg-[#050505] text-white min-h-screen`}>
        <nav className="border-b border-zinc-800/60 px-4 py-3 flex items-center gap-4">
          <a href="/" className="flex items-center gap-2 group">
            <div className="w-7 h-7 rounded-md bg-amber-500 flex items-center justify-center flex-shrink-0">
              <svg className="w-4 h-4 text-black" fill="currentColor" viewBox="0 0 20 20">
                <path d="M18 3a1 1 0 00-1.196-.98l-10 2A1 1 0 006 5v9.114A4.369 4.369 0 005 14c-1.657 0-3 .895-3 2s1.343 2 3 2 3-.895 3-2V7.82l8-1.6v5.894A4.37 4.37 0 0015 12c-1.657 0-3 .895-3 2s1.343 2 3 2 3-.895 3-2V3z" />
              </svg>
            </div>
            <span className="font-semibold text-sm tracking-tight group-hover:text-amber-400 transition-colors">
              Artist Spotlight
            </span>
          </a>
          <a href="/rankings" className="text-sm text-zinc-500 hover:text-white transition-colors">
            Rankings
          </a>
          <div className="ml-auto">
            <a
              href="/spotlight/new"
              className="text-xs bg-amber-500 hover:bg-amber-400 text-black font-semibold px-3 py-1.5 rounded-md transition-colors"
            >
              New Spotlight
            </a>
          </div>
        </nav>
        <main className="max-w-5xl mx-auto px-4 py-6">{children}</main>
      </body>
    </html>
  )
}
