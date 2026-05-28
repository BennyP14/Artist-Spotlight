'use client'

import { useEffect, useState } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import { getSpotlightsWithRankedAlbums } from '@/lib/supabase'
import type { SpotlightWithAlbums, SpotlightAlbum } from '@/types'

export default function RankingsPage() {
  const [spotlights, setSpotlights] = useState<SpotlightWithAlbums[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    getSpotlightsWithRankedAlbums()
      .then(setSpotlights)
      .finally(() => setLoading(false))
  }, [])

  const hasAny = spotlights.some((s) => s.spotlight_albums.length > 0)

  if (loading) {
    return (
      <div className="space-y-8 animate-pulse">
        {[...Array(2)].map((_, i) => (
          <div key={i}>
            <div className="h-5 w-40 shimmer rounded mb-4" />
            <div className="space-y-3">
              {[...Array(4)].map((_, j) => (
                <div key={j} className="flex gap-3 items-center">
                  <div className="w-6 h-4 shimmer rounded" />
                  <div className="w-10 h-10 shimmer rounded-md" />
                  <div className="h-4 w-48 shimmer rounded" />
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    )
  }

  if (!hasAny) {
    return (
      <div className="text-center py-24 animate-fade-in">
        <h1 className="text-2xl font-bold mb-3">All-Time Rankings</h1>
        <p className="text-zinc-500 max-w-sm mx-auto">
          Complete and rank albums in your spotlights — they&apos;ll appear here across all artists.
        </p>
        <Link href="/" className="inline-block mt-6 text-amber-400 hover:text-amber-300 text-sm">
          ← Back to spotlights
        </Link>
      </div>
    )
  }

  return (
    <div className="max-w-2xl mx-auto animate-fade-in">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold">All-Time Rankings</h1>
          <p className="text-zinc-500 text-sm mt-0.5">Your best albums across every spotlight</p>
        </div>
        <Link href="/" className="text-sm text-zinc-500 hover:text-white transition-colors">
          ← Home
        </Link>
      </div>

      <div className="space-y-10">
        {spotlights
          .filter((s) => s.spotlight_albums.length > 0)
          .map((spotlight) => (
            <div key={spotlight.id}>
              <Link href={`/spotlight/${spotlight.id}`} className="flex items-center gap-3 mb-4 group">
                {spotlight.artist_image_url && (
                  <Image
                    src={spotlight.artist_image_url}
                    alt={spotlight.artist_name}
                    width={32}
                    height={32}
                    className="rounded-lg"
                  />
                )}
                <h2 className="font-semibold text-white group-hover:text-amber-400 transition-colors">
                  {spotlight.artist_name}
                </h2>
                <span className="text-xs text-zinc-600">
                  {spotlight.spotlight_albums.length} ranked
                </span>
              </Link>

              <div className="space-y-1">
                {spotlight.spotlight_albums.map((album: SpotlightAlbum, idx: number) => (
                  <Link
                    key={album.id}
                    href={`/spotlight/${spotlight.id}/album/${album.album_id}`}
                    className="flex items-center gap-3 py-2.5 px-3 rounded-xl hover:bg-zinc-900 transition-colors group"
                  >
                    <span className={`w-7 text-right font-bold flex-shrink-0 ${idx === 0 ? 'text-amber-400 text-lg' : idx === 1 ? 'text-zinc-500' : 'text-zinc-700'}`}>
                      {idx + 1}
                    </span>
                    {album.image_url && (
                      <Image
                        src={album.image_url}
                        alt={album.album_name}
                        width={44}
                        height={44}
                        className="rounded-md flex-shrink-0"
                      />
                    )}
                    <div className="min-w-0 flex-1">
                      <p className="font-medium text-sm text-white truncate group-hover:text-amber-400 transition-colors">
                        {album.album_name}
                      </p>
                      <p className="text-xs text-zinc-500">{album.release_year}</p>
                      {album.verdict && (
                        <p className="text-xs text-zinc-400 italic mt-0.5 truncate">&ldquo;{album.verdict}&rdquo;</p>
                      )}
                    </div>
                  </Link>
                ))}
              </div>
            </div>
          ))}
      </div>
    </div>
  )
}
