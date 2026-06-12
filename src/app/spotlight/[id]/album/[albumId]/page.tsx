'use client'

import { useEffect, useState, useCallback } from 'react'
import { useParams } from 'next/navigation'
import Image from 'next/image'
import Link from 'next/link'
import { getSpotlight, getAlbumInsights, updateAlbumStatus, updateAlbumNotes, updateAlbumVerdict, getTrackRatings, upsertTrackRating, deleteTrackRating } from '@/lib/supabase'
import type { SpotlightAlbum, AlbumInsights, SpotlightWithAlbums } from '@/types'
import { cn, statusColor, statusLabel, appleMusicSearchUrl, spotifySearchUrl, formatDuration } from '@/lib/utils'
import { useAuth } from '@/context/auth'

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
      <h3 className="text-xs font-semibold text-zinc-400 uppercase tracking-wider mb-2">{title}</h3>
      <div className="text-sm text-zinc-200 leading-relaxed space-y-3">
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
  onReady,
}: {
  album: SpotlightAlbum
  artistName: string
  artistGenres: string[]
  onReady: () => void
}) {
  const [insights, setInsights] = useState<AlbumInsights | null>(null)
  const [loading, setLoading] = useState(false)
  const [tab, setTab] = useState<'context' | 'era' | 'reception'>('context')
  const [generated, setGenerated] = useState(false)

  useEffect(() => {
    getAlbumInsights(album.album_id).then((data) => {
      if (data) { setInsights(data); setGenerated(true); onReady() }
      else generate()
    })
  // eslint-disable-next-line react-hooks/exhaustive-deps
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
      onReady()
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
        {loading && (
          <div className="flex items-center gap-2 text-xs text-zinc-400">
            <div className="w-3.5 h-3.5 border border-zinc-700 border-t-orange-400 rounded-full animate-spin" />
            Generating…
          </div>
        )}
        {generated && !loading && (
          <button onClick={generate} className="text-xs text-zinc-700 hover:text-zinc-400 transition-colors">
            Refresh
          </button>
        )}
      </div>

      {!generated && !loading && (
        <div className="space-y-2 py-4">
          {[...Array(3)].map((_, i) => (
            <div key={i} className={`h-3 shimmer rounded ${i === 2 ? 'w-2/3' : 'w-full'}`} />
          ))}
        </div>
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
                  tab === key ? 'bg-zinc-700 text-white' : 'text-zinc-400 hover:text-zinc-200'
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
  const { user } = useAuth()
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
  const [insightsReady, setInsightsReady] = useState(false)

  useEffect(() => {
    getSpotlight(spotlightId).then((data) => {
      if (!data) return
      setSpotlight(data)
      const found = data.spotlight_albums?.find((a) => a.album_id === albumId) ?? null
      setAlbum(found)
      setNotes(found?.notes ?? '')
      setVerdict(found?.verdict ?? '')
      // Always load the spotlight OWNER's track ratings — visitors see what the owner rated,
      // and the owner sees their own. Ratings are never shared or overwritten between users.
      getTrackRatings(spotlightId, albumId, data.user_id ?? undefined).then(setTrackRatings)
    }).finally(() => setLoading(false))
  }, [spotlightId, albumId])

  useEffect(() => {
    if (!albumId) return
    fetch(`/api/spotify/tracks?albumId=${albumId}`)
      .then((r) => r.json())
      .then((d) => { if (d.tracks) setTracks(d.tracks) })
      .catch(() => {})
  }, [albumId])

  // Silently prefetch all track insights — only after album insights are ready
  useEffect(() => {
    if (!tracks.length || !spotlight || !album || !insightsReady) return
    const tracklistRef = tracks.map(t => ({ trackNumber: t.trackNumber, trackName: t.trackName }))
    const prefetch = async (track: Track) => {
      if (trackSummaries[track.trackId]) return
      try {
        const res = await fetch('/api/track-insights', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            artistName: spotlight.artist_name,
            trackName: track.trackName,
            albumName: album.album_name,
            releaseYear: album.release_year,
            trackNumber: track.trackNumber,
            tracklist: tracklistRef,
          }),
        })
        const contentType = res.headers.get('content-type') ?? ''
        if (contentType.includes('application/json')) {
          const { summary } = await res.json()
          setTrackSummaries(prev => ({ ...prev, [track.trackId]: summary }))
        } else {
          const reader = res.body!.getReader()
          const decoder = new TextDecoder()
          let accumulated = ''
          while (true) {
            const { done, value } = await reader.read()
            if (done) break
            accumulated += decoder.decode(value, { stream: true })
            setTrackSummaries(prev => ({ ...prev, [track.trackId]: accumulated }))
          }
        }
      } catch { /* silent — user can still trigger manually */ }
    }

    // Stagger requests 400ms apart so we don't hammer the API
    tracks.forEach((track, i) => {
      setTimeout(() => prefetch(track), i * 400)
    })
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tracks, spotlight?.artist_name, album?.album_name, insightsReady])

  const isOwner = !!user && !!spotlight && user.id === spotlight.user_id

  const handleTrackRating = async (track: Track, rating: number) => {
    if (!isOwner) return
    const trackKey = String(track.trackId)
    const prevRating = trackRatings[trackKey] ?? 0
    const newRating = prevRating === rating ? 0 : rating
    // Optimistic update
    setTrackRatings((prev) => ({ ...prev, [trackKey]: newRating }))
    try {
      if (newRating === 0) {
        await deleteTrackRating(spotlightId, albumId, trackKey)
      } else {
        await upsertTrackRating(spotlightId, albumId, trackKey, track.trackName, newRating)
        // Auto-advance to "listening" the first time a track is rated
        if (album?.status === 'unlistened') {
          await updateAlbumStatus(album.id, 'listening')
          setAlbum((prev) => prev ? { ...prev, status: 'listening' } : prev)
        }
      }
    } catch (err) {
      // Revert optimistic update so the UI doesn't lie about what's saved
      console.error('[handleTrackRating] save failed, reverting', err)
      setTrackRatings((prev) => ({ ...prev, [trackKey]: prevRating }))
    }
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
          trackNumber: track.trackNumber,
          tracklist: tracks.map(t => ({ trackNumber: t.trackNumber, trackName: t.trackName })),
        }),
      })

      const contentType = res.headers.get('content-type') ?? ''

      if (contentType.includes('application/json')) {
        // Cached — return instantly
        const { summary } = await res.json()
        setTrackSummaries(prev => ({ ...prev, [track.trackId]: summary }))
        setTrackLoading(prev => ({ ...prev, [track.trackId]: false }))
      } else {
        // Streaming — show text word by word
        setTrackLoading(prev => ({ ...prev, [track.trackId]: false }))
        setTrackSummaries(prev => ({ ...prev, [track.trackId]: '' }))
        const reader = res.body!.getReader()
        const decoder = new TextDecoder()
        let accumulated = ''
        while (true) {
          const { done, value } = await reader.read()
          if (done) break
          accumulated += decoder.decode(value, { stream: true })
          setTrackSummaries(prev => ({ ...prev, [track.trackId]: accumulated }))
        }
      }
    } catch {
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
            <p className="text-xs text-zinc-400 uppercase tracking-wide capitalize">{album.album_type}</p>
            <h1 className="text-xl font-bold text-white mt-0.5 leading-tight">{album.album_name}</h1>
            <p className="text-sm text-zinc-300 mt-1">
              {spotlight.artist_name} · {album.release_year}
            </p>
            <p className="text-xs text-zinc-400 mt-0.5">
              {album.total_tracks} tracks{totalDuration > 0 ? ` · ${formatDuration(totalDuration)}` : ''}
            </p>

            <div className="flex items-center gap-2 mt-3">
              {isOwner ? (
                (['unlistened', 'listening', 'complete'] as const).map((s) => (
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
                ))
              ) : (
                <span className={cn('text-xs px-2.5 py-1 rounded-full font-medium', statusColor(album.status))}>
                  {statusLabel(album.status)}
                </span>
              )}
            </div>
          </div>
        </div>

        <div className="px-5 pb-5 flex items-center gap-2">
          <a
            href={appleMusicSearchUrl(spotlight.artist_name, album.album_name)}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 text-xs bg-zinc-800 hover:bg-zinc-700 text-zinc-300 px-3 py-1.5 rounded-lg transition-colors"
            title="Find on Apple Music"
          >
            <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="currentColor">
              <path d="M12 3v10.55c-.59-.34-1.27-.55-2-.55-2.21 0-4 1.79-4 4s1.79 4 4 4 4-1.79 4-4V7h4V3h-6z" />
            </svg>
            Apple Music
          </a>
          <a
            href={spotifySearchUrl(spotlight.artist_name, album.album_name)}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 text-xs bg-zinc-800 hover:bg-zinc-700 text-zinc-300 px-3 py-1.5 rounded-lg transition-colors"
            title="Find on Spotify"
          >
            <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="currentColor">
              <path d="M12 0C5.4 0 0 5.4 0 12s5.4 12 12 12 12-5.4 12-12S18.66 0 12 0zm5.521 17.34c-.24.359-.66.48-1.021.24-2.82-1.74-6.36-2.101-10.561-1.141-.418.122-.779-.179-.899-.539-.12-.421.18-.78.54-.9 4.56-1.021 8.52-.6 11.64 1.32.42.18.479.659.301 1.02zm1.44-3.3c-.301.42-.841.6-1.262.3-3.239-1.98-8.159-2.58-11.939-1.38-.479.12-1.02-.12-1.14-.6-.12-.48.12-1.021.6-1.141C9.6 9.9 15 10.561 18.72 12.84c.361.181.54.78.241 1.2zm.12-3.36C15.24 8.4 8.82 8.16 5.16 9.301c-.6.179-1.2-.181-1.38-.721-.18-.601.18-1.2.72-1.381 4.26-1.26 11.28-1.02 15.721 1.621.539.3.719 1.02.419 1.56-.299.421-1.02.599-1.559.3z" />
            </svg>
            Spotify
          </a>
        </div>
      </div>

      {/* Insights */}
      <InsightsPanel album={album} artistName={spotlight.artist_name} artistGenres={spotlight.artist_genres} onReady={() => setInsightsReady(true)} />

      {/* Verdict + Notes */}
      <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-5 space-y-4">
        <div>
          <label className="block text-xs font-semibold text-zinc-400 uppercase tracking-wider mb-2">
            {isOwner ? 'Your Verdict' : `${spotlight.artist_name} Verdict`}
          </label>
          {isOwner ? (
            <input
              type="text"
              value={verdict}
              onChange={(e) => handleVerdictChange(e.target.value)}
              placeholder="One line — your definitive take on this album…"
              maxLength={120}
              className="w-full bg-zinc-800 border border-zinc-700 rounded-xl px-4 py-2.5 text-sm text-white placeholder-zinc-600 focus:outline-none focus:border-amber-500/50 transition-colors"
            />
          ) : verdict ? (
            <p className="text-sm text-zinc-200 italic px-1">&ldquo;{verdict}&rdquo;</p>
          ) : (
            <p className="text-sm text-zinc-600 italic px-1">No verdict written yet</p>
          )}
        </div>
        <div>
          <label className="block text-xs font-semibold text-zinc-400 uppercase tracking-wider mb-2">
            Notes
          </label>
          {isOwner ? (
            <textarea
              value={notes}
              onChange={(e) => handleNotesChange(e.target.value)}
              placeholder="What stood out? Favourite tracks? How does it fit into the discography?…"
              rows={5}
              className="w-full bg-zinc-800 border border-zinc-700 rounded-xl px-4 py-3 text-sm text-white placeholder-zinc-600 focus:outline-none focus:border-zinc-500 resize-none transition-colors leading-relaxed"
            />
          ) : notes ? (
            <p className="text-sm text-zinc-300 leading-relaxed whitespace-pre-wrap px-1">{notes}</p>
          ) : (
            <p className="text-sm text-zinc-600 italic px-1">No notes written yet</p>
          )}
        </div>
        {isOwner && <p className="text-xs text-zinc-500">Auto-saved</p>}
      </div>

      {/* Tracklist with accordion insights */}
      {tracks.length > 0 && (
        <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-5">
          <div className="flex items-center justify-between mb-3">
            <h2 className="font-semibold text-white">Tracklist</h2>
            <p className="text-xs text-zinc-500 uppercase tracking-widest">Tap for insights</p>
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
                    <span className="w-6 text-right text-xs text-zinc-500 flex-shrink-0">{track.trackNumber}</span>
                    <span className={cn('flex-1 text-sm truncate transition-colors', isExpanded ? 'text-orange-400' : 'text-zinc-300 group-hover:text-white')}>
                      {track.trackName}
                      {track.trackExplicitness === 'explicit' && (
                        <span className="ml-2 text-xs text-zinc-600 bg-zinc-800 px-1 rounded">E</span>
                      )}
                    </span>
                    {isOwner && (
                      <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0" onClick={e => e.stopPropagation()}>
                        {[1, 2, 3, 4, 5].map((star) => (
                          <button key={star} onClick={() => handleTrackRating(track, star)} className="p-0.5" title={`Rate ${star} star${star !== 1 ? 's' : ''}`}>
                            <svg className={`w-3 h-3 transition-colors ${star <= rating ? 'text-amber-400' : 'text-zinc-700 hover:text-amber-400/50'}`} fill="currentColor" viewBox="0 0 20 20">
                              <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                            </svg>
                          </button>
                        ))}
                      </div>
                    )}
                    {rating > 0 && (
                      <div className={`flex items-center gap-0.5 flex-shrink-0 ${isOwner ? 'group-hover:hidden' : ''}`} onClick={e => e.stopPropagation()}>
                        {[1, 2, 3, 4, 5].map((star) => (
                          <svg key={star} className={`w-3 h-3 ${star <= rating ? 'text-amber-400' : 'text-zinc-800'}`} fill="currentColor" viewBox="0 0 20 20">
                            <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                          </svg>
                        ))}
                      </div>
                    )}
                    <span className="text-xs text-zinc-500 flex-shrink-0 w-8 text-right">{formatDuration(track.trackTimeMillis)}</span>
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
                        <div className="text-xs text-zinc-300 leading-relaxed space-y-2">
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
