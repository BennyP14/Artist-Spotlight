'use client'

import { useEffect, useState, useCallback } from 'react'
import { useParams } from 'next/navigation'
import Image from 'next/image'
import Link from 'next/link'
import { getSpotlight, getAlbumInsights, updateAlbumStatus, updateAlbumNotes, updateAlbumVerdict, getTrackRatings, upsertTrackRating } from '@/lib/supabase'
import type { SpotlightAlbum, AlbumInsights, SpotlightWithAlbums } from '@/types'
import { cn, statusColor, statusLabel, appleMusicSearchUrl, formatDuration } from '@/lib/utils'

interface Track {
  trackId: number
  trackName: string
  trackNumber: number
  trackTimeMillis: number
  trackExplicitness: string
}

function InsightSection({ title, content }: { title: string; content: string }) {
  if (!content) return null
  return (
    <div>
      <h3 className="text-xs font-semibold text-zinc-500 uppercase tracking-wider mb-2">{title}</h3>
      <div className="text-sm text-zinc-300 leading-relaxed space-y-3">
        {content.split('\n\n').map((para, i) => (
          <p key={i}>{para.trim()}</p>
        ))}
      </div>
    </div>
  )
}

function InsightsPanel({
  album,
  artistName,
  artistGenres,
}: {
  album: SpotlightAlbum
  artistName: string
  artistGenres: string[]
}) {
  const [insights, setInsights] = useState<AlbumInsights | null>(null)
  const [loading, setLoading] = useState(false)
  const [tab, setTab] = useState<'context' | 'era' | 'reception'>('context')
  const [generated, setGenerated] = useState(false)

  useEffect(() => {
    getAlbumInsights(album.album_id).then((data) => {
      if (data) { setInsights(data); setGenerated(true) }
    })
  }, [album.album_id])

  const generate = async () => {
    setLoading(true)
    try {
      const res = await fetch('/api/insights', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          albumId: album.album_id,
          artistName,
          albumName: album.album_name,
          releaseYear: album.release_year,
          genres: artistGenres,
        }),
      })
      const { insights: data } = await res.json()
      setInsights(data)
      setGenerated(true)
    } finally {
      setLoading(false)
    }
  }

  const tabs = [
    { key: 'context', label: 'Overview', content: insights?.ai_context },
    { key: 'era', label: 'Era & Story', content: insights?.era_context },
    { key: 'reception', label: 'Reception', content: insights?.chart_info },
  ] as const

  return (
    <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-5">
      <div className="flex items-center justify-between mb-4">
        <h2 className="font-semibold text-white">Insights</h2>
        {!generated && !loading && (
          <button
            onClick={generate}
            className="text-xs bg-amber-500 hover:bg-amber-400 text-black font-semibold px-3 py-1.5 rounded-lg transition-colors"
          >
            Generate with AI
          </button>
        )}
        {loading && (
          <div className="flex items-center gap-2 text-xs text-zinc-500">
            <div className="w-3.5 h-3.5 border border-zinc-600 border-t-amber-400 rounded-full animate-spin" />
            Generating…
          </div>
        )}
      </div>

      {!generated && !loading && (
        <p className="text-sm text-zinc-600 text-center py-8">
          Click &ldquo;Generate with AI&rdquo; to get context, historical background, and reception info for this album.
        </p>
      )}

      {(generated || loading) && (
        <>
          <div className="flex gap-1 mb-4 bg-zinc-800 rounded-lg p-0.5">
            {tabs.map(({ key, label }) => (
              <button
                key={key}
                onClick={() => setTab(key)}
                className={cn(
                  'flex-1 text-xs py-1.5 rounded-md transition-all font-medium',
                  tab === key ? 'bg-zinc-700 text-white' : 'text-zinc-500 hover:text-zinc-300'
                )}
              >
                {label}
              </button>
            ))}
          </div>

          {loading ? (
            <div className="space-y-2">
              {[...Array(4)].map((_, i) => (
                <div key={i} className={`h-3 shimmer rounded ${i === 3 ? 'w-2/3' : 'w-full'}`} />
              ))}
            </div>
          ) : (
            <div className="animate-fade-in">
              {tabs.map(({ key, label, content }) =>
                tab === key ? (
                  <InsightSection key={key} title={label} content={content ?? ''} />
                ) : null
              )}
            </div>
          )}
        </>
      )}
    </div>
  )
}

export default function AlbumPage() {
  const { id: spotlightId, albumId } = useParams<{ id: string; albumId: string }>()
  const [spotlight, setSpotlight] = useState<SpotlightWithAlbums | null>(null)
  const [album, setAlbum] = useState<SpotlightAlbum | null>(null)
  const [tracks, setTracks] = useState<Track[]>([])
  const [notes, setNotes] = useState('')
  const [verdict, setVerdict] = useState('')
  const [verdictTimer, setVerdictTimer] = useState<ReturnType<typeof setTimeout> | null>(null)
  const [saveTimer, setSaveTimer] = useState<ReturnType<typeof setTimeout> | null>(null)
  const [trackRatings, setTrackRatings] = useState<Record<string, number>>({})
  const [loading, setLoading] = useState(true)
  const [expandedTrack, setExpandedTrack] = useState<number | null>(null)
  const [trackSummaries, setTrackSummaries] = useState<Record<number, string>>({})
  const [trackLoading, setTrackLoading] = useState<Record<number, boolean>>({})

  useEffect(() => {
    getSpotlight(spotlightId).then((data) => {
      if (!data) return
      setSpotlight(data)
      const found = data.spotlight_albums?.find((a) => a.album_id === albumId) ?? null
      setAlbum(found)
      setNotes(found?.notes ?? '')
      setVerdict(found?.verdict ?? '')
    }).finally(() => setLoading(false))

  }, [spotlightId, albumId])

  useEffect(() => {
    if (!albumId) return
    fetch(`/api/spotify/tracks?albumId=${albumId}`)
      .then((r) => r.json())
      .then((d) => { if (d.tracks) setTracks(d.tracks) })
      .catch(() => {})
  }, [albumId])

  useEffect(() => {
    if (!spotlightId || !albumId) return
    getTrackRatings(spotlightId, albumId).then(setTrackRatings)
  }, [spotlightId, albumId])

  const handleTrackRating = async (track: Track, rating: number) => {
    const newRating = trackRatings[String(track.trackId)] === rating ? 0 : rating
    setTrackRatings((prev) => ({ ...prev, [String(track.trackId)]: newRating }))
    if (newRating === 0) return
    await upsertTrackRating(spotlightId, albumId, String(track.trackId), track.trackName, newRating)
  }

  const handleStatusChange = async (status: SpotlightAlbum['status']) => {
    if (!album) return
    await updateAlbumStatus(album.id, status)
    setAlbum((prev) => prev ? { ...prev, status } : prev)
  }

  const handleNotesChange = useCallback((val: string) => {
    setNotes(val)
    if (saveTimer) clearTimeout(saveTimer)
    setSaveTimer(setTimeout(async () => { if (album) await updateAlbumNotes(album.id, val) }, 800))
  }, [album, saveTimer])

  const handleVerdictChange = useCallback((val: string) => {
    setVerdict(val)
    if (verdictTimer) clearTimeout(verdictTimer)
    setVerdictTimer(setTimeout(async () => { if (album) await updateAlbumVerdict(album.id, val) }, 800))
  }, [album, verdictTimer])

  const handleTrackExpand = async (track: Track) => {
    if (expandedTrack === track.trackId) { setExpandedTrack(null); return }
    setExpandedTrack(track.trackId)
    if (trackSummaries[track.trackId]) return
    setTrackLoading(prev => ({ ...prev, [track.trackId]: true }))
    try {
      const res = await fetch('/api/track-insights', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          artistName: spotlight?.artist_name,
          trackName: track.trackName,
          albumName: album?.album_name,
          releaseYear: album?.release_year,
        }),
      })
      const { summary } = await res.json()
      setTrackSummaries(prev => ({ ...prev, [track.trackId]: summary }))
    } finally {
      setTrackLoading(prev => ({ ...prev, [track.trackId]: false }))
    }
  }

  if (loading) {
    return (
      <div className="space-y-4 animate-pulse">
        <div className="h-6 w-24 shimmer rounded" />
        <div className="h-64 shimmer rounded-2xl" />
        <div className="h-48 shimmer rounded-2xl" />
      </div>
    )
  }

  if (!album || !spotlight) {
    return (
      <div className="text-center py-20 text-zinc-500">
        Album not found.{' '}
        <Link href={`/spotlight/${spotlightId}`} className="text-amber-400 underline">
          Back to spotlight
        </Link>
      </div>
    )
  }

  const totalDuration = tracks.reduce((sum, t) => sum + t.trackTimeMillis, 0)

  return (
    <div className="max-w-2xl mx-auto animate-fade-in space-y-4">
      <Link
        href={`/spotlight/${spotlightId}`}
        className="inline-flex items-center gap-1.5 text-sm text-zinc-500 hover:text-white transition-colors"
      >
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
        </svg>
        {spotlight.artist_name}
      </Link>

      {/* Album hero */}
      <div className="relative bg-zinc-900 border border-zinc-800 rounded-2xl overflow-hidden">
        <div className="flex gap-4 p-5">
          {album.image_url ? (
            <Image
              src={album.image_url}
              alt={album.album_name}
              width={120}
              height={120}
              className="rounded-xl shadow-lg flex-shrink-0"
            />
          ) : (
            <div className="w-30 h-30 rounded-xl bg-zinc-800 flex-shrink-0" />
          )}
          <div className="min-w-0">
            <p className="text-xs text-zinc-500 uppercase tracking-wide capitalize">{album.album_type}</p>
            <h1 className="text-xl font-bold text-white mt-0.5 leading-tight">{album.album_name}</h1>
            <p className="text-sm text-zinc-400 mt-1">
              {spotlight.artist_name} · {album.release_year}
            </p>
            <p className="text-xs text-zinc-600 mt-0.5">
              {album.total_tracks} tracks{totalDuration > 0 ? ` · ${formatDuration(totalDuration)}` : ''}
            </p>

            <div className="flex items-center gap-2 mt-3">
              {(['unlistened', 'listening', 'complete'] as const).map((s) => (
                <button
                  key={s}
                  onClick={() => handleStatusChange(s)}
                  className={cn(
                    'text-xs px-2.5 py-1 rounded-full font-medium transition-all',
                    album.status === s ? statusColor(s) : 'text-zinc-600 hover:text-zinc-400'
                  )}
                >
                  {statusLabel(s)}
                </button>
              ))}
            </div>
          </div>
        </div>

        <div className="px-5 pb-5">
          <a
            href={appleMusicSearchUrl(spotlight.artist_name, album.album_name)}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 text-xs bg-zinc-800 hover:bg-zinc-700 text-zinc-300 px-3 py-1.5 rounded-lg transition-colors"
          >
            <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="currentColor">
              <path d="M23.997 6.124a9.23 9.23 0 0 0-.24-2.19c-.317-1.31-1.064-2.31-2.18-3.043a5.022 5.022 0 0 0-1.769-.73 7.7 7.7 0 0 0-1.114-.155c-.46-.014-.92-.013-1.38-.013H6.678c-.459 0-.918-.001-1.378.013a7.633 7.633 0 0 0-1.113.155 4.99 4.99 0 0 0-1.768.73C1.3 1.623.553 2.623.236 3.934A9.23 9.23 0 0 0 0 6.124c-.014.46-.013.92-.013 1.378v9.006c0 .459-.001.918.013 1.378.014.78.103 1.565.24 2.19.317 1.311 1.064 2.311 2.18 3.043a5.022 5.022 0 0 0 1.769.73c.37.083.744.13 1.114.155.46.014.92.013 1.38.013h10.16c.46 0 .92.001 1.38-.013a7.7 7.7 0 0 0 1.113-.155 4.99 4.99 0 0 0 1.768-.73c1.116-.732 1.863-1.732 2.18-3.043.138-.625.227-1.41.241-2.19.013-.46.013-.92.013-1.378V7.502c0-.459 0-.918-.013-1.378zM12 17.5a5.5 5.5 0 1 1 0-11 5.5 5.5 0 0 1 0 11zm6.25-9.75a1.25 1.25 0 1 1 0-2.5 1.25 1.25 0 0 1 0 2.5zM12 8a4 4 0 1 0 0 8 4 4 0 0 0 0-8z" />
            </svg>
            Find on Apple Music
          </a>
        </div>
      </div>

      {/* Insights */}
      <InsightsPanel album={album} artistName={spotlight.artist_name} artistGenres={spotlight.artist_genres} />

      {/* Verdict + Notes */}
      <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-5 space-y-4">
        <div>
          <label className="block text-xs font-semibold text-zinc-500 uppercase tracking-wider mb-2">
            Your Verdict
          </label>
          <input
            type="text"
            value={verdict}
            onChange={(e) => handleVerdictChange(e.target.value)}
            placeholder="One line — your definitive take on this album…"
            maxLength={120}
            className="w-full bg-zinc-800 border border-zinc-700 rounded-xl px-4 py-2.5 text-sm text-white placeholder-zinc-600 focus:outline-none focus:border-amber-500/50 transition-colors"
          />
        </div>
        <div>
          <label className="block text-xs font-semibold text-zinc-500 uppercase tracking-wider mb-2">
            Notes
          </label>
          <textarea
            value={notes}
            onChange={(e) => handleNotesChange(e.target.value)}
            placeholder="What stood out? Favourite tracks? How does it fit into the discography?…"
            rows={5}
            className="w-full bg-zinc-800 border border-zinc-700 rounded-xl px-4 py-3 text-sm text-white placeholder-zinc-600 focus:outline-none focus:border-zinc-500 resize-none transition-colors leading-relaxed"
          />
        </div>
        <p className="text-xs text-zinc-700">Auto-saved</p>
      </div>

      {/* Tracklist with accordion insights */}
      {tracks.length > 0 && (
        <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-5">
          <div className="flex items-center justify-between mb-3">
            <h2 className="font-semibold text-white">Tracklist</h2>
            <p className="text-xs text-zinc-600 uppercase tracking-widest">Tap for insights</p>
          </div>
          <div className="space-y-0.5">
            {tracks.map((track) => {
              const rating = trackRatings[String(track.trackId)] ?? 0
              const isExpanded = expandedTrack === track.trackId
              const isLoading = trackLoading[track.trackId]
              const summary = trackSummaries[track.trackId]
              return (
                <div key={track.trackId}>
                  <div
                    className={cn(
                      'flex items-center gap-3 py-2 group cursor-pointer rounded-lg px-1 -mx-1 transition-colors',
                      isExpanded ? 'bg-white/5' : 'hover:bg-white/3'
                    )}
                    onClick={() => handleTrackExpand(track)}
                  >
                    <span className="w-6 text-right text-xs text-zinc-600 flex-shrink-0">{track.trackNumber}</span>
                    <span className={cn('flex-1 text-sm truncate transition-colors', isExpanded ? 'text-orange-400' : 'text-zinc-300 group-hover:text-white')}>
                      {track.trackName}
                      {track.trackExplicitness === 'explicit' && (
                        <span className="ml-2 text-xs text-zinc-600 bg-zinc-800 px-1 rounded">E</span>
                      )}
                    </span>
                    <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0" onClick={e => e.stopPropagation()}>
                      {[1, 2, 3, 4, 5].map((star) => (
                        <button key={star} onClick={() => handleTrackRating(track, star)} className="p-0.5" title={`Rate ${star} star${star !== 1 ? 's' : ''}`}>
                          <svg className={`w-3 h-3 transition-colors ${star <= rating ? 'text-amber-400' : 'text-zinc-700 hover:text-amber-400/50'}`} fill="currentColor" viewBox="0 0 20 20">
                            <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                          </svg>
                        </button>
                      ))}
                    </div>
                    {rating > 0 && (
                      <div className="flex items-center gap-0.5 group-hover:hidden flex-shrink-0" onClick={e => e.stopPropagation()}>
                        {[1, 2, 3, 4, 5].map((star) => (
                          <svg key={star} className={`w-3 h-3 ${star <= rating ? 'text-amber-400' : 'text-zinc-800'}`} fill="currentColor" viewBox="0 0 20 20">
                            <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                          </svg>
                        ))}
                      </div>
                    )}
                    <span className="text-xs text-zinc-600 flex-shrink-0 w-8 text-right">{formatDuration(track.trackTimeMillis)}</span>
                    <svg className={cn('w-3 h-3 text-zinc-700 flex-shrink-0 transition-transform', isExpanded && 'rotate-180')} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                    </svg>
                  </div>

                  {/* Accordion panel */}
                  {isExpanded && (
                    <div className="ml-7 my-2 p-3 bg-[#0c0a08] border border-white/5 rounded-xl animate-fade-in">
                      {isLoading ? (
                        <div className="flex items-center gap-2 py-1">
                          <div className="w-3.5 h-3.5 border border-zinc-700 border-t-orange-400 rounded-full animate-spin flex-shrink-0" />
                          <span className="text-xs text-zinc-600 uppercase tracking-widest">Generating insights…</span>
                        </div>
                      ) : summary ? (
                        <div className="text-xs text-zinc-400 leading-relaxed space-y-2">
                          {summary.split('\n\n').map((para, i) => (
                            <p key={i}>{para.trim()}</p>
                          ))}
                        </div>
                      ) : (
                        <p className="text-xs text-zinc-600">No summary available.</p>
                      )}
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        </div>
      )}
    </div>
  )
}
