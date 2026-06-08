'use client'

import { useEffect, useState, useMemo } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { getSpotlights } from '@/lib/supabase'
import { useAuth } from '@/context/auth'
import type { Spotlight } from '@/types'

type SortOption = 'recent' | 'az' | 'progress' | 'active'

function SpotlightCard({ spotlight }: { spotlight: Spotlight & { spotlight_albums?: { status: string }[] } }) {
  const albums = spotlight.spotlight_albums ?? []
  const total = albums.length
  const complete = albums.filter((a) => a.status === 'complete').length
  const listening = albums.filter((a) => a.status === 'listening').length

  return (
    <Link href={`/spotlight/${spotlight.id}`}>
      <div className="group relative bg-[#110e0b] border border-white/5 rounded-2xl overflow-hidden hover:border-orange-500/20 transition-all hover:shadow-xl hover:shadow-orange-900/10">
        {spotlight.artist_image_url && (
          <div className="relative h-36 overflow-hidden">
            <Image src={spotlight.artist_image_url} alt={spotlight.artist_name} fill className="object-cover group-hover:scale-105 transition-transform duration-500" />
            <div className="absolute inset-0 bg-gradient-to-t from-[#110e0b] via-[#110e0b]/40 to-transparent" />
            {listening > 0 && (
              <div className="absolute top-2 right-2 text-xs bg-amber-400/20 border border-amber-400/30 text-amber-400 px-2 py-0.5 rounded-full font-medium backdrop-blur-sm">
                Now playing
              </div>
            )}
          </div>
        )}
        <div className="p-4">
          <h3 className="font-semibold text-base text-white tracking-tight">{spotlight.artist_name}</h3>
          <p className="text-xs text-zinc-400 mt-0.5 uppercase tracking-widest">{spotlight.artist_genres?.[0] ?? ''}</p>
          <div className="mt-2.5 flex items-center gap-3 text-xs">
            <span className="text-zinc-400">{total} albums</span>
            {complete > 0 && <span className="text-orange-400 font-medium">{complete} done</span>}
          </div>
          {total > 0 && (
            <div className="mt-2.5 h-px bg-white/5 rounded-full overflow-hidden">
              <div className="h-full bg-gradient-to-r from-orange-500 to-orange-400 rounded-full transition-all" style={{ width: `${(complete / total) * 100}%` }} />
            </div>
          )}
        </div>
      </div>
    </Link>
  )
}

// ─── Landing page for signed-out visitors ────────────────────────────────────
function LandingPage() {
  const steps = [
    { icon: '🎵', title: 'Pick an artist', desc: 'Search any artist — their full discography loads automatically in chronological order.' },
    { icon: '🎧', title: 'Listen through', desc: 'Work album by album. Mark your progress as you go. Add notes and track ratings.' },
    { icon: '🏆', title: 'Build your ranking', desc: 'Drag albums into your definitive order. Write a verdict. Share with friends and compare.' },
  ]

  return (
    <div className="max-w-2xl mx-auto animate-fade-in">
      {/* Hero */}
      <div className="text-center pt-8 pb-12">
        <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-orange-500 to-orange-600 flex items-center justify-center mx-auto mb-6 shadow-[0_0_40px_rgba(249,115,22,0.3)]">
          <svg className="w-8 h-8 text-white" fill="currentColor" viewBox="0 0 20 20">
            <path d="M18 3a1 1 0 00-1.196-.98l-10 2A1 1 0 006 5v9.114A4.369 4.369 0 005 14c-1.657 0-3 .895-3 2s1.343 2 3 2 3-.895 3-2V7.82l8-1.6v5.894A4.37 4.37 0 0015 12c-1.657 0-3 .895-3 2s1.343 2 3 2 3-.895 3-2V3z" />
          </svg>
        </div>
        <h1 className="text-3xl font-bold tracking-tight mb-3">Artist Spotlight</h1>
        <p className="text-zinc-300 text-base max-w-md mx-auto leading-relaxed">
          Deep-dive into an artist&apos;s entire discography, track by track — then build your definitive album ranking.
        </p>
        <div className="flex items-center justify-center gap-3 mt-7">
          <Link href="/auth/signin" className="bg-orange-500 hover:bg-orange-400 text-white font-semibold px-6 py-3 rounded-xl transition-colors shadow-[0_4px_20px_rgba(249,115,22,0.3)] tracking-wide">
            Get started free
          </Link>
          <Link href="/auth/signin" className="bg-white/5 hover:bg-white/10 border border-white/8 text-zinc-300 font-medium px-6 py-3 rounded-xl transition-colors">
            Sign in
          </Link>
        </div>
        <p className="text-zinc-500 text-xs mt-3 uppercase tracking-widest">No subscription · No password needed</p>
      </div>

      {/* How it works */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-12">
        {steps.map((step, i) => (
          <div key={i} className="bg-[#110e0b] border border-white/5 rounded-2xl p-5">
            <div className="text-2xl mb-3">{step.icon}</div>
            <h3 className="font-semibold text-white text-sm mb-1.5">{step.title}</h3>
            <p className="text-zinc-300 text-xs leading-relaxed">{step.desc}</p>
          </div>
        ))}
      </div>

      {/* Social proof features */}
      <div className="bg-[#110e0b] border border-white/5 rounded-2xl p-6">
        <p className="text-xs text-zinc-400 uppercase tracking-widest mb-4">Also includes</p>
        <div className="grid grid-cols-2 gap-3">
          {[
            ['🔥', 'React to friends\' rankings'],
            ['⚡', 'Auto-rank by your track ratings'],
            ['🆚', 'Compare rankings side-by-side'],
            ['📊', 'Activity feed from friends'],
          ].map(([emoji, label]) => (
            <div key={label} className="flex items-center gap-2 text-sm text-zinc-300">
              <span>{emoji}</span><span>{label}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

// ─── Dashboard for signed-in users ───────────────────────────────────────────
function Dashboard() {
  const [spotlights, setSpotlights] = useState<(Spotlight & { spotlight_albums?: { status: string }[] })[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [sort, setSort] = useState<SortOption>('recent')
  const [view, setView] = useState<'grid' | 'list'>('grid')

  useEffect(() => {
    getSpotlights()
      .then((data) => setSpotlights(data as (Spotlight & { spotlight_albums?: { status: string }[] })[]))
      .catch(console.error)
      .finally(() => setLoading(false))
  }, [])

  const filtered = useMemo(() => {
    let result = spotlights.filter(s =>
      s.artist_name.toLowerCase().includes(search.toLowerCase())
    )
    switch (sort) {
      case 'az': result = [...result].sort((a, b) => a.artist_name.localeCompare(b.artist_name)); break
      case 'progress': result = [...result].sort((a, b) => {
        const pct = (s: typeof a) => {
          const t = s.spotlight_albums?.length ?? 0
          const c = s.spotlight_albums?.filter(x => x.status === 'complete').length ?? 0
          return t ? c / t : 0
        }
        return pct(b) - pct(a)
      }); break
      case 'active': result = [...result].sort((a, b) => {
        const listening = (s: typeof a) => s.spotlight_albums?.some(x => x.status === 'listening') ? 1 : 0
        return listening(b) - listening(a)
      }); break
    }
    return result
  }, [spotlights, search, sort])

  if (loading) {
    return (
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 mt-2">
        {[...Array(3)].map((_, i) => (
          <div key={i} className="bg-[#110e0b] border border-white/5 rounded-2xl overflow-hidden">
            <div className="h-36 shimmer" />
            <div className="p-4 space-y-2">
              <div className="h-5 w-32 shimmer rounded" />
              <div className="h-3 w-20 shimmer rounded" />
            </div>
          </div>
        ))}
      </div>
    )
  }

  return (
    <div className="animate-fade-in">
      {/* Header */}
      <div className="flex items-center justify-between mb-5">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Your Spotlights</h1>
          <p className="text-zinc-400 text-xs mt-1 uppercase tracking-widest">{spotlights.length} artist{spotlights.length !== 1 ? 's' : ''}</p>
        </div>
        <Link href="/spotlight/new" className="text-xs bg-orange-500 hover:bg-orange-400 text-white font-semibold px-4 py-2 rounded-lg transition-colors tracking-wide shadow-[0_4px_14px_rgba(249,115,22,0.25)]">
          + New
        </Link>
      </div>

      {spotlights.length > 0 && (
        <div className="flex items-center gap-2 mb-5 flex-wrap">
          {/* Search */}
          <div className="relative flex-1 min-w-40">
            <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-zinc-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
            <input
              type="text"
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Search artists…"
              className="w-full bg-[#110e0b] border border-white/5 rounded-lg pl-8 pr-3 py-2 text-sm text-white placeholder-zinc-700 focus:outline-none focus:border-orange-500/30 transition-colors"
            />
          </div>

          {/* Sort */}
          <select
            value={sort}
            onChange={e => setSort(e.target.value as SortOption)}
            className="bg-[#110e0b] border border-white/5 rounded-lg px-3 py-2 text-xs text-zinc-400 focus:outline-none focus:border-orange-500/30 transition-colors cursor-pointer"
          >
            <option value="recent">Most recent</option>
            <option value="az">A–Z</option>
            <option value="progress">Most complete</option>
            <option value="active">Now listening</option>
          </select>

          {/* View toggle */}
          <div className="flex gap-1 bg-[#110e0b] border border-white/5 rounded-lg p-1">
            <button onClick={() => setView('grid')} className={`p-1.5 rounded ${view === 'grid' ? 'bg-white/10 text-white' : 'text-zinc-400'}`}>
              <svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 16 16"><path d="M1 2.5A1.5 1.5 0 012.5 1h3A1.5 1.5 0 017 2.5v3A1.5 1.5 0 015.5 7h-3A1.5 1.5 0 011 5.5v-3zm8 0A1.5 1.5 0 0110.5 1h3A1.5 1.5 0 0115 2.5v3A1.5 1.5 0 0113.5 7h-3A1.5 1.5 0 019 5.5v-3zm-8 8A1.5 1.5 0 012.5 9h3A1.5 1.5 0 017 10.5v3A1.5 1.5 0 015.5 15h-3A1.5 1.5 0 011 13.5v-3zm8 0A1.5 1.5 0 0110.5 9h3A1.5 1.5 0 0115 10.5v3A1.5 1.5 0 0113.5 15h-3A1.5 1.5 0 019 13.5v-3z"/></svg>
            </button>
            <button onClick={() => setView('list')} className={`p-1.5 rounded ${view === 'list' ? 'bg-white/10 text-white' : 'text-zinc-400'}`}>
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16"/></svg>
            </button>
          </div>
        </div>
      )}

      {filtered.length === 0 && search ? (
        <p className="text-center text-zinc-400 py-12 text-sm uppercase tracking-widest">No artists match &ldquo;{search}&rdquo;</p>
      ) : spotlights.length === 0 ? (
        <div className="text-center py-16 bg-[#110e0b] border border-white/5 rounded-2xl">
          <p className="text-zinc-200 font-medium mb-1">No spotlights yet</p>
          <p className="text-zinc-400 text-sm mb-5">Search for an artist to begin your first deep-dive</p>
          <Link href="/spotlight/new" className="inline-flex items-center gap-2 bg-orange-500 hover:bg-orange-400 text-white font-semibold px-5 py-2.5 rounded-lg transition-colors shadow-[0_4px_20px_rgba(249,115,22,0.3)] tracking-wide text-sm">
            Start your first spotlight
          </Link>
        </div>
      ) : view === 'grid' ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map((s) => <SpotlightCard key={s.id} spotlight={s} />)}
        </div>
      ) : (
        <div className="space-y-2">
          {filtered.map((s) => {
            const total = s.spotlight_albums?.length ?? 0
            const complete = s.spotlight_albums?.filter(a => a.status === 'complete').length ?? 0
            const listening = s.spotlight_albums?.some(a => a.status === 'listening')
            return (
              <Link key={s.id} href={`/spotlight/${s.id}`}>
                <div className="flex items-center gap-3 p-3 bg-[#110e0b] border border-white/5 rounded-xl hover:border-orange-500/20 transition-all group">
                  {s.artist_image_url && (
                    <Image src={s.artist_image_url} alt={s.artist_name} width={40} height={40} className="rounded-lg flex-shrink-0 object-cover" />
                  )}
                  <div className="min-w-0 flex-1">
                    <p className="font-medium text-sm text-white group-hover:text-orange-400 transition-colors truncate">{s.artist_name}</p>
                    <p className="text-xs text-zinc-400 uppercase tracking-widest">{s.artist_genres?.[0] ?? ''}</p>
                  </div>
                  <div className="flex items-center gap-3 text-xs flex-shrink-0">
                    {listening && <span className="text-amber-400 font-medium">Listening</span>}
                    <span className="text-zinc-400">{complete}/{total}</span>
                    <div className="w-16 h-px bg-white/5 rounded-full overflow-hidden">
                      <div className="h-full bg-orange-500 rounded-full" style={{ width: `${total ? (complete / total) * 100 : 0}%` }} />
                    </div>
                  </div>
                </div>
              </Link>
            )
          })}
        </div>
      )}
    </div>
  )
}

export default function HomePage() {
  const { user, loading } = useAuth()

  if (loading) return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 mt-2">
      {[...Array(3)].map((_, i) => (
        <div key={i} className="bg-[#110e0b] border border-white/5 rounded-2xl overflow-hidden">
          <div className="h-36 shimmer" />
          <div className="p-4 space-y-2">
            <div className="h-5 w-32 shimmer rounded" /><div className="h-3 w-20 shimmer rounded" />
          </div>
        </div>
      ))}
    </div>
  )

  if (!user) return <LandingPage />
  return <Dashboard />
}
