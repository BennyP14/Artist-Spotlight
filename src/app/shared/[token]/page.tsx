'use client'

import { useEffect, useState } from 'react'
import { useParams } from 'next/navigation'
import Image from 'next/image'
import Link from 'next/link'
import { getSpotlightByToken } from '@/lib/supabase'
import type { SpotlightWithAlbums, SpotlightAlbum } from '@/types'
import { statusColor, statusLabel } from '@/lib/utils'

export default function SharedSpotlightPage() {
  const { token } = useParams<{ token: string }>()
  const [spotlight, setSpotlight] = useState<SpotlightWithAlbums | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    getSpotlightByToken(token).then(setSpotlight).finally(() => setLoading(false))
  }, [token])

  if (loading) {
    return (
      <div className="max-w-2xl mx-auto space-y-4 animate-pulse">
        <div className="h-48 shimmer rounded-2xl" />
        {[...Array(5)].map((_, i) => (
          <div key={i} className="flex gap-3 py-3 border-b border-zinc-800">
            <div className="w-12 h-12 shimmer rounded-md" />
            <div className="flex-1 space-y-1.5">
              <div className="h-4 w-40 shimmer rounded" />
              <div className="h-3 w-24 shimmer rounded" />
            </div>
          </div>
        ))}
      </div>
    )
  }

  if (!spotlight) {
    return (
      <div className="text-center py-24 text-zinc-500">
        <p className="text-lg mb-2">Spotlight not found</p>
        <p className="text-sm">This link may be invalid or the spotlight may have been deleted.</p>
      </div>
    )
  }

  const albums = [...(spotlight.spotlight_albums ?? [])].sort(
    (a, b) => new Date(a.release_date).getTime() - new Date(b.release_date).getTime()
  )
  const complete = albums.filter((a) => a.status === 'complete').length
  const ranked = albums.filter((a) => a.status === 'complete').sort(
    (a, b) => (a.rank_position ?? 999) - (b.rank_position ?? 999)
  )

  return (
    <div className="max-w-2xl mx-auto animate-fade-in space-y-6">
      {/* Artist header */}
      <div className="relative bg-zinc-900 border border-zinc-800 rounded-2xl overflow-hidden">
        {spotlight.artist_image_url && (
          <div className="absolute inset-0">
            <Image
              src={spotlight.artist_image_url}
              alt={spotlight.artist_name}
              fill
              className="object-cover opacity-20 blur-sm scale-110"
            />
          </div>
        )}
        <div className="relative flex items-center gap-4 p-6">
          {spotlight.artist_image_url && (
            <Image
              src={spotlight.artist_image_url}
              alt={spotlight.artist_name}
              width={72}
              height={72}
              className="rounded-xl shadow-xl flex-shrink-0"
            />
          )}
          <div>
            <p className="text-xs text-amber-400 font-medium uppercase tracking-widest mb-1">Artist Spotlight</p>
            <h1 className="text-2xl font-bold">{spotlight.artist_name}</h1>
            {spotlight.artist_genres.length > 0 && (
              <p className="text-sm text-zinc-400 capitalize mt-0.5">
                {spotlight.artist_genres.slice(0, 3).join(' · ')}
              </p>
            )}
            <p className="text-sm text-zinc-500 mt-1.5">
              {complete}/{albums.length} albums completed
            </p>
          </div>
        </div>
      </div>

      {/* Ranking */}
      {ranked.length > 0 && (
        <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-5">
          <h2 className="font-semibold text-white mb-4">Album Ranking</h2>
          <div className="space-y-3">
            {ranked.map((album, idx) => (
              <div key={album.id} className="flex items-center gap-3">
                <span className={`w-8 text-center font-bold flex-shrink-0 ${idx === 0 ? 'text-amber-400 text-lg' : 'text-zinc-600'}`}>
                  {idx + 1}
                </span>
                {album.image_url && (
                  <Image src={album.image_url} alt={album.album_name} width={44} height={44} className="rounded-md flex-shrink-0" />
                )}
                <div className="min-w-0">
                  <p className="font-medium text-sm text-white truncate">{album.album_name}</p>
                  <p className="text-xs text-zinc-500">{album.release_year}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Discography */}
      <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-5">
        <h2 className="font-semibold text-white mb-4">Discography</h2>
        <div className="space-y-0.5">
          {albums.map((album: SpotlightAlbum) => (
            <div key={album.id} className="flex items-center gap-3 py-2.5 border-b border-zinc-800/50 last:border-0">
              {album.image_url && (
                <Image src={album.image_url} alt={album.album_name} width={40} height={40} className="rounded flex-shrink-0" />
              )}
              <div className="flex-1 min-w-0">
                <p className="text-sm text-white truncate">{album.album_name}</p>
                <p className="text-xs text-zinc-500">{album.release_year}</p>
              </div>
              <span className={`text-xs px-2 py-0.5 rounded-full ${statusColor(album.status)}`}>
                {statusLabel(album.status)}
              </span>
            </div>
          ))}
        </div>
      </div>

      <div className="text-center text-xs text-zinc-700 pb-4">
        Made with{' '}
        <Link href="/" className="text-amber-600 hover:text-amber-500">
          Artist Spotlight
        </Link>
      </div>
    </div>
  )
}
