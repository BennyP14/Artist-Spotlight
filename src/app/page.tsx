'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { getSpotlights } from '@/lib/supabase'
import type { Spotlight } from '@/types'

function SpotlightCard({ spotlight }: { spotlight: Spotlight & { spotlight_albums?: { status: string }[] } }) {
  const albums = spotlight.spotlight_albums ?? []
  const total = albums.length
  const complete = albums.filter((a) => a.status === 'complete').length
  const listening = albums.filter((a) => a.status === 'listening').length

  return (
    <Link href={`/spotlight/${spotlight.id}`}>
      <div className="group relative bg-[#110e0b] border border-white/5 rounded-2xl overflow-hidden hover:border-orange-500/20 transition-all hover:shadow-xl hover:shadow-orange-900/10">
        {spotlight.artist_image_url && (
          <div className="relative h-40 overflow-hidden">
            <Image
              src={spotlight.artist_image_url}
              alt={spotlight.artist_name}
              fill
              className="object-cover group-hover:scale-105 transition-transform duration-500"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-[#110e0b] via-[#110e0b]/50 to-transparent" />
          </div>
        )}
        <div className="p-4">
          <h3 className="font-semibold text-base text-white tracking-tight">{spotlight.artist_name}</h3>
          {spotlight.artist_genres.length > 0 && (
            <p className="text-xs text-zinc-600 mt-0.5 uppercase tracking-widest">
              {spotlight.artist_genres.slice(0, 2).join(' · ')}
            </p>
          )}
          <div className="mt-3 flex items-center gap-3 text-xs">
            <span className="text-zinc-600">{total} albums</span>
            {complete > 0 && <span className="text-orange-400 font-medium">{complete} complete</span>}
            {listening > 0 && <span className="text-amber-400 font-medium">listening now</span>}
          </div>
          {total > 0 && (
            <div className="mt-2.5 h-px bg-white/5 rounded-full overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-orange-500 to-orange-400 rounded-full transition-all"
                style={{ width: `${(complete / total) * 100}%` }}
              />
            </div>
          )}
        </div>
      </div>
    </Link>
  )
}

function EmptyState() {
  return (
    <div className="text-center py-24 animate-fade-in">
      <div className="w-16 h-16 rounded-2xl bg-[#110e0b] border border-white/5 flex items-center justify-center mx-auto mb-4">
        <svg className="w-8 h-8 text-zinc-700" fill="currentColor" viewBox="0 0 20 20">
          <path d="M18 3a1 1 0 00-1.196-.98l-10 2A1 1 0 006 5v9.114A4.369 4.369 0 005 14c-1.657 0-3 .895-3 2s1.343 2 3 2 3-.895 3-2V7.82l8-1.6v5.894A4.37 4.37 0 0015 12c-1.657 0-3 .895-3 2s1.343 2 3 2 3-.895 3-2V3z" />
        </svg>
      </div>
      <h2 className="text-xl font-semibold text-white mb-2 tracking-tight">No spotlights yet</h2>
      <p className="text-zinc-600 mb-6 max-w-sm mx-auto text-sm leading-relaxed">
        Pick an artist, work through their entire discography, and build your definitive ranking.
      </p>
      <Link
        href="/spotlight/new"
        className="inline-flex items-center gap-2 bg-orange-500 hover:bg-orange-400 text-white font-semibold px-5 py-2.5 rounded-lg transition-colors shadow-[0_4px_20px_rgba(249,115,22,0.3)] tracking-wide text-sm"
      >
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
        </svg>
        Start a Spotlight
      </Link>
    </div>
  )
}

export default function HomePage() {
  const [spotlights, setSpotlights] = useState<(Spotlight & { spotlight_albums?: { status: string }[] })[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    getSpotlights()
      .then((data) => setSpotlights(data as (Spotlight & { spotlight_albums?: { status: string }[] })[]))
      .catch(console.error)
      .finally(() => setLoading(false))
  }, [])

  if (loading) {
    return (
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 mt-2">
        {[...Array(3)].map((_, i) => (
          <div key={i} className="bg-[#110e0b] border border-white/5 rounded-2xl overflow-hidden">
            <div className="h-40 shimmer" />
            <div className="p-4 space-y-2">
              <div className="h-5 w-32 shimmer rounded" />
              <div className="h-3 w-20 shimmer rounded" />
            </div>
          </div>
        ))}
      </div>
    )
  }

  if (!spotlights.length) return <EmptyState />

  return (
    <div className="animate-fade-in">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Your Spotlights</h1>
          <p className="text-zinc-600 text-xs mt-1 uppercase tracking-widest">{spotlights.length} artist{spotlights.length !== 1 ? 's' : ''}</p>
        </div>
        <Link
          href="/spotlight/new"
          className="text-xs bg-orange-500 hover:bg-orange-400 text-white font-semibold px-4 py-2 rounded-lg transition-colors tracking-wide shadow-[0_4px_14px_rgba(249,115,22,0.25)]"
        >
          + New
        </Link>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {spotlights.map((s) => (
          <SpotlightCard key={s.id} spotlight={s} />
        ))}
      </div>
    </div>
  )
}
