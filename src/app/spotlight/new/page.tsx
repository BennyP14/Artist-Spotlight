'use client'

import { useState, useCallback, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { createSpotlight, bulkInsertAlbums } from '@/lib/supabase'
import { hqArtwork } from '@/lib/itunes'
import type { ItunesArtist, ItunesAlbum } from '@/lib/itunes'

function ArtistCard({
  artist,
  onSelect,
  loading,
}: {
  artist: ItunesArtist
  onSelect: (a: ItunesArtist) => void
  loading: boolean
}) {
  return (
    <button
      onClick={() => onSelect(artist)}
      disabled={loading}
      className="flex items-center gap-3 p-3 bg-[#110e0b] border border-white/5 rounded-xl hover:border-orange-500/30 hover:bg-[#150f0a] transition-all text-left w-full disabled:opacity-50 disabled:cursor-wait"
    >
      <div className="w-14 h-14 rounded-lg bg-white/5 flex items-center justify-center flex-shrink-0">
        <svg className="w-6 h-6 text-zinc-700" fill="currentColor" viewBox="0 0 20 20">
          <path fillRule="evenodd" d="M10 9a3 3 0 100-6 3 3 0 000 6zm-7 9a7 7 0 1114 0H3z" clipRule="evenodd" />
        </svg>
      </div>
      <div className="min-w-0">
        <p className="font-semibold text-white truncate tracking-tight">{artist.artistName}</p>
        {artist.primaryGenreName && (
          <p className="text-xs text-zinc-400 uppercase tracking-widest truncate mt-0.5">{artist.primaryGenreName}</p>
        )}
      </div>
      <svg className="w-4 h-4 text-zinc-700 ml-auto flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
      </svg>
    </button>
  )
}

export default function NewSpotlightPage() {
  const router = useRouter()
  const [query, setQuery] = useState('')
  const [artists, setArtists] = useState<ItunesArtist[]>([])
  const [searching, setSearching] = useState(false)
  const [creating, setCreating] = useState(false)
  const [creatingName, setCreatingName] = useState('')
  const [error, setError] = useState<string | null>(null)
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const search = useCallback(async (q: string) => {
    if (q.length < 2) { setArtists([]); return }
    setSearching(true)
    try {
      const res = await fetch(`/api/spotify/search?q=${encodeURIComponent(q)}`)
      const { artists: results } = await res.json()
      setArtists(results ?? [])
    } catch {
      setError('Search failed.')
    } finally {
      setSearching(false)
    }
  }, [])

  const handleInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value
    setQuery(val)
    if (debounceRef.current) clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(() => search(val), 400)
  }

  const handleSelect = async (artist: ItunesArtist) => {
    setCreating(true)
    setCreatingName(artist.artistName)
    setError(null)
    try {
      const [artistRes, wikiRes, lastfmRes] = await Promise.all([
        fetch(`/api/spotify/artist?id=${artist.artistId}`),
        fetch(`/api/wikipedia-image?name=${encodeURIComponent(artist.artistName)}`),
        fetch(`/api/lastfm-genres?artist=${encodeURIComponent(artist.artistName)}`),
      ])
      const { albums } = await artistRes.json() as { albums: ItunesAlbum[] }
      const { url: wikiImageUrl } = await wikiRes.json()
      const { genres: lastfmGenres } = await lastfmRes.json() as { genres: string[] }

      const artistImageUrl = wikiImageUrl
        ?? (albums[0]?.artworkUrl100 ? hqArtwork(albums[0].artworkUrl100) : null)

      // Prefer Last.fm community tags (more accurate) — fall back to iTunes genre
      const artistGenres =
        lastfmGenres.length > 0
          ? lastfmGenres
          : artist.primaryGenreName
          ? [artist.primaryGenreName]
          : []

      const spotlight = await createSpotlight({
        artist_id: String(artist.artistId),
        artist_name: artist.artistName,
        artist_image_url: artistImageUrl,
        artist_genres: artistGenres,
      })

      await bulkInsertAlbums(
        albums.map((a) => ({
          spotlight_id: spotlight.id,
          album_id: String(a.collectionId),
          album_name: a.collectionName,
          release_date: a.releaseDate.split('T')[0],
          release_year: new Date(a.releaseDate).getFullYear(),
          image_url: a.artworkUrl100 ? hqArtwork(a.artworkUrl100) : null,
          total_tracks: a.trackCount,
          album_type: 'album',
          spotify_url: a.collectionViewUrl ?? null,
          status: 'unlistened' as const,
          rank_position: null,
          notes: '',
          verdict: '',
          completed_at: null,
          global_rank_position: null,
          auto_score: null,
        }))
      )

      router.push(`/spotlight/${spotlight.id}`)
    } catch (err) {
      console.error(err)
      setError('Failed to create spotlight. Check your Supabase config.')
      setCreating(false)
    }
  }

  return (
    <div className="max-w-xl mx-auto animate-fade-in">
      <div className="mb-8">
        <h1 className="text-2xl font-bold tracking-tight">New Spotlight</h1>
        <p className="text-zinc-400 text-sm mt-1 uppercase tracking-widest">Search for an artist to begin</p>
      </div>

      <div className="relative">
        <svg
          className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-700"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
        </svg>
        <input
          type="text"
          value={query}
          onChange={handleInput}
          placeholder="Search artists…"
          autoFocus
          className="w-full bg-[#110e0b] border border-white/5 rounded-xl pl-10 pr-4 py-3 text-white placeholder-zinc-700 focus:outline-none focus:border-orange-500/40 transition-colors"
        />
        {searching && (
          <div className="absolute right-3 top-1/2 -translate-y-1/2">
            <div className="w-4 h-4 border-2 border-zinc-800 border-t-orange-400 rounded-full animate-spin" />
          </div>
        )}
      </div>

      {error && (
        <div className="mt-4 p-3 bg-red-500/10 border border-red-500/20 rounded-lg text-red-400 text-sm">
          {error}
        </div>
      )}

      {creating && (
        <div className="mt-8 text-center py-12">
          <div className="w-10 h-10 border-2 border-white/5 border-t-orange-400 rounded-full animate-spin mx-auto mb-4" />
          <p className="text-zinc-400 text-sm uppercase tracking-widest">Loading {creatingName}&apos;s discography…</p>
        </div>
      )}

      {!creating && artists.length > 0 && (
        <div className="mt-4 space-y-2 animate-fade-in">
          {artists.map((a) => (
            <ArtistCard key={a.artistId} artist={a} onSelect={handleSelect} loading={creating} />
          ))}
        </div>
      )}

      {!creating && !searching && query.length >= 2 && artists.length === 0 && (
        <p className="mt-6 text-center text-zinc-400 text-sm uppercase tracking-widest">No artists found for &ldquo;{query}&rdquo;</p>
      )}
    </div>
  )
}
