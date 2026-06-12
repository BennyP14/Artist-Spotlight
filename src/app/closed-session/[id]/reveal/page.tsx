'use client'

import { useEffect, useState } from 'react'
import { useParams } from 'next/navigation'
import Image from 'next/image'
import Link from 'next/link'
import { getRevealData, type RevealData, type RevealAlbum } from '@/lib/supabase'
import { cn } from '@/lib/utils'

function Stars({ rating, dim }: { rating: number; dim?: boolean }) {
  return (
    <div className="flex items-center gap-0.5">
      {[1, 2, 3, 4, 5].map((s) => (
        <svg
          key={s}
          className={cn('w-3 h-3', s <= rating ? (dim ? 'text-zinc-500' : 'text-amber-400') : 'text-zinc-800')}
          fill="currentColor"
          viewBox="0 0 20 20"
        >
          <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
        </svg>
      ))}
    </div>
  )
}

function AlbumCard({ album, myName, theirName }: { album: RevealAlbum; myName: string; theirName: string }) {
  const [expanded, setExpanded] = useState(false)

  const myAvg = Object.values(album.mine.trackRatings)
  const theirAvg = Object.values(album.theirs.trackRatings)
  const myScore = myAvg.length ? (myAvg.reduce((a, b) => a + b, 0) / myAvg.length).toFixed(1) : null
  const theirScore = theirAvg.length ? (theirAvg.reduce((a, b) => a + b, 0) / theirAvg.length).toFixed(1) : null

  const allTrackIds = [...new Set([...Object.keys(album.mine.trackRatings), ...Object.keys(album.theirs.trackRatings)])]
  const sharedTracks = allTrackIds.filter((id) => album.mine.trackRatings[id] && album.theirs.trackRatings[id])

  return (
    <div className="bg-[#110e0b] border border-white/8 rounded-2xl overflow-hidden">
      {/* Album header */}
      <button
        onClick={() => setExpanded((e) => !e)}
        className="w-full flex items-center gap-3 p-4 text-left hover:bg-white/3 transition-colors"
      >
        {album.imageUrl ? (
          <Image src={album.imageUrl} alt={album.albumName} width={52} height={52} className="rounded-lg flex-shrink-0" />
        ) : (
          <div className="w-13 h-13 rounded-lg bg-zinc-800 flex-shrink-0" />
        )}
        <div className="flex-1 min-w-0">
          <p className="font-semibold text-white text-sm truncate">{album.albumName}</p>
          <p className="text-xs text-zinc-500 uppercase tracking-widest">{album.releaseYear}</p>
        </div>
        {/* Score pill comparison */}
        <div className="flex items-center gap-3 flex-shrink-0">
          <div className="text-right">
            <p className="text-xs text-zinc-600 uppercase tracking-wider">You</p>
            <p className={cn('text-sm font-bold', myScore ? 'text-white' : 'text-zinc-700')}>{myScore ?? '—'}</p>
          </div>
          <div className="w-px h-8 bg-white/8" />
          <div className="text-left">
            <p className="text-xs text-zinc-600 uppercase tracking-wider">{theirName.split(' ')[0]}</p>
            <p className={cn('text-sm font-bold', theirScore ? 'text-white' : 'text-zinc-700')}>{theirScore ?? '—'}</p>
          </div>
        </div>
        <svg
          className={cn('w-4 h-4 text-zinc-600 flex-shrink-0 transition-transform ml-1', expanded && 'rotate-180')}
          fill="none" stroke="currentColor" viewBox="0 0 24 24"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {expanded && (
        <div className="border-t border-white/5 animate-fade-in">
          {/* Verdict comparison */}
          {(album.mine.verdict || album.theirs.verdict) && (
            <div className="grid grid-cols-2 gap-px bg-white/5">
              <div className="bg-[#110e0b] p-3">
                <p className="text-xs text-zinc-600 uppercase tracking-widest mb-1">{myName.split(' ')[0]}</p>
                {album.mine.verdict ? (
                  <p className="text-xs text-zinc-300 italic">&ldquo;{album.mine.verdict}&rdquo;</p>
                ) : (
                  <p className="text-xs text-zinc-700 italic">No verdict</p>
                )}
              </div>
              <div className="bg-[#110e0b] p-3">
                <p className="text-xs text-zinc-600 uppercase tracking-widest mb-1">{theirName.split(' ')[0]}</p>
                {album.theirs.verdict ? (
                  <p className="text-xs text-zinc-300 italic">&ldquo;{album.theirs.verdict}&rdquo;</p>
                ) : (
                  <p className="text-xs text-zinc-700 italic">No verdict</p>
                )}
              </div>
            </div>
          )}

          {/* Notes comparison */}
          {(album.mine.notes || album.theirs.notes) && (
            <div className="grid grid-cols-2 gap-px bg-white/5">
              <div className="bg-[#0c0a08] p-3">
                <p className="text-xs text-zinc-600 uppercase tracking-widest mb-1.5">Notes</p>
                {album.mine.notes ? (
                  <p className="text-xs text-zinc-400 leading-relaxed line-clamp-4">{album.mine.notes}</p>
                ) : (
                  <p className="text-xs text-zinc-700 italic">No notes</p>
                )}
              </div>
              <div className="bg-[#0c0a08] p-3">
                <p className="text-xs text-zinc-600 uppercase tracking-widest mb-1.5">Notes</p>
                {album.theirs.notes ? (
                  <p className="text-xs text-zinc-400 leading-relaxed line-clamp-4">{album.theirs.notes}</p>
                ) : (
                  <p className="text-xs text-zinc-700 italic">No notes</p>
                )}
              </div>
            </div>
          )}

          {/* Track ratings side by side */}
          {sharedTracks.length > 0 && (
            <div className="p-3">
              <p className="text-xs text-zinc-600 uppercase tracking-widest mb-2">Track ratings</p>
              <div className="space-y-1.5">
                {allTrackIds.map((tid) => {
                  const my = album.mine.trackRatings[tid] ?? 0
                  const their = album.theirs.trackRatings[tid] ?? 0
                  if (!my && !their) return null
                  const diff = Math.abs(my - their)
                  return (
                    <div key={tid} className="flex items-center gap-2">
                      <Stars rating={my} dim={!my} />
                      <div className={cn('flex-1 h-px', diff === 0 ? 'bg-green-500/30' : diff >= 3 ? 'bg-red-500/30' : 'bg-zinc-800')} />
                      <Stars rating={their} dim={!their} />
                    </div>
                  )
                })}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

export default function RevealPage() {
  const { id } = useParams<{ id: string }>()
  const [data, setData] = useState<RevealData | null>(null)
  const [loading, setLoading] = useState(true)
  const [activeSection, setActiveSection] = useState<'overview' | 'albums' | 'tracks'>('overview')

  useEffect(() => {
    getRevealData(id).then(setData).finally(() => setLoading(false))
  }, [id])

  if (loading) {
    return (
      <div className="max-w-xl mx-auto space-y-4 animate-pulse">
        <div className="h-48 shimmer rounded-2xl" />
        <div className="h-24 shimmer rounded-2xl" />
        <div className="h-32 shimmer rounded-2xl" />
      </div>
    )
  }

  if (!data) {
    return (
      <div className="text-center py-20 text-zinc-500">
        <p className="mb-2">Reveal not available yet.</p>
        <p className="text-sm">Both parties need to mark themselves as done first.</p>
        <Link href="/" className="text-orange-400 text-sm underline mt-4 inline-block">Back home</Link>
      </div>
    )
  }

  const rankingMatch = data.albums.filter(
    (a) => a.mine.rankPosition !== null && a.mine.rankPosition === a.theirs.rankPosition
  )

  return (
    <div className="max-w-xl mx-auto animate-fade-in space-y-4 pb-12">

      {/* Hero */}
      <div className="relative rounded-2xl overflow-hidden bg-[#110e0b] border border-white/5">
        {data.artistImageUrl && (
          <>
            <Image src={data.artistImageUrl} alt={data.artistName} fill className="object-cover object-top opacity-15 blur-sm scale-105" />
            <div className="absolute inset-0 bg-gradient-to-b from-transparent to-[#110e0b]" />
          </>
        )}
        <div className="relative p-6 text-center">
          <p className="text-xs text-orange-400 uppercase tracking-widest font-medium mb-2">Closed Session · Reveal</p>
          <h1 className="text-2xl font-bold text-white mb-1">{data.artistName}</h1>
          <p className="text-sm text-zinc-400">{data.myName} &amp; {data.theirName}</p>
        </div>
      </div>

      {/* Sync score — the headline stat */}
      <div className="bg-[#110e0b] border border-white/8 rounded-2xl p-6 text-center">
        <p className="text-xs text-zinc-500 uppercase tracking-widest mb-3">Sync Score</p>
        <div className="flex items-end justify-center gap-1 mb-2">
          <span className={cn(
            'text-6xl font-black tabular-nums',
            data.syncScore >= 70 ? 'text-green-400' : data.syncScore >= 40 ? 'text-amber-400' : 'text-orange-400'
          )}>
            {data.syncScore}
          </span>
          <span className="text-2xl font-bold text-zinc-600 mb-2">%</span>
        </div>
        <p className="text-sm text-zinc-400">
          {data.syncScore >= 70
            ? 'You two are basically the same person.'
            : data.syncScore >= 40
            ? 'Solid common ground with some interesting splits.'
            : 'You came to very different conclusions — great conversation starter.'}
        </p>
        {/* Quick stats */}
        <div className="flex justify-center gap-6 mt-4 pt-4 border-t border-white/5">
          <div>
            <p className="text-lg font-bold text-white">{data.agreedTracks.length}</p>
            <p className="text-xs text-zinc-600 uppercase tracking-widest">Agreed</p>
          </div>
          <div>
            <p className="text-lg font-bold text-white">{data.disputedTracks.length}</p>
            <p className="text-xs text-zinc-600 uppercase tracking-widest">Disputed</p>
          </div>
          <div>
            <p className="text-lg font-bold text-white">{rankingMatch.length}</p>
            <p className="text-xs text-zinc-600 uppercase tracking-widest">Same rank</p>
          </div>
        </div>
      </div>

      {/* Section tabs */}
      <div className="flex gap-1 bg-[#110e0b] border border-white/5 rounded-xl p-1">
        {(['overview', 'albums', 'tracks'] as const).map((s) => (
          <button
            key={s}
            onClick={() => setActiveSection(s)}
            className={cn(
              'flex-1 text-xs font-semibold py-1.5 rounded-lg transition-all uppercase tracking-widest',
              activeSection === s ? 'bg-white/8 text-white' : 'text-zinc-500 hover:text-zinc-300'
            )}
          >
            {s}
          </button>
        ))}
      </div>

      {/* Overview tab */}
      {activeSection === 'overview' && (
        <div className="space-y-3 animate-fade-in">

          {/* Most agreed track */}
          {data.agreedTracks.length > 0 && (
            <div className="bg-[#110e0b] border border-green-500/15 rounded-2xl p-4">
              <p className="text-xs text-green-400 uppercase tracking-widest font-medium mb-3">Most agreed on</p>
              <div className="space-y-2">
                {data.agreedTracks.slice(0, 3).map((t, i) => (
                  <div key={i} className="flex items-center justify-between gap-3">
                    <div className="min-w-0">
                      <p className="text-sm text-white truncate">{t.trackName}</p>
                      <p className="text-xs text-zinc-600">{t.albumName}</p>
                    </div>
                    <div className="flex items-center gap-2 flex-shrink-0">
                      <Stars rating={t.rating} />
                      <span className="text-xs text-green-400 font-medium">Both</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Biggest split */}
          {data.disputedTracks.length > 0 && (
            <div className="bg-[#110e0b] border border-red-500/15 rounded-2xl p-4">
              <p className="text-xs text-red-400 uppercase tracking-widest font-medium mb-3">Biggest disagreements</p>
              <div className="space-y-3">
                {data.disputedTracks.slice(0, 3).map((t, i) => (
                  <div key={i}>
                    <div className="flex items-start justify-between gap-3 mb-1">
                      <div className="min-w-0">
                        <p className="text-sm text-white truncate">{t.trackName}</p>
                        <p className="text-xs text-zinc-600">{t.albumName}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <div className="flex items-center gap-1.5">
                        <span className="text-xs text-zinc-500">{data.myName.split(' ')[0]}</span>
                        <Stars rating={t.myRating} />
                      </div>
                      <span className="text-zinc-700 text-xs">vs</span>
                      <div className="flex items-center gap-1.5">
                        <Stars rating={t.theirRating} />
                        <span className="text-xs text-zinc-500">{data.theirName.split(' ')[0]}</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Album ranking comparison */}
          {data.albums.some((a) => a.mine.rankPosition || a.theirs.rankPosition) && (
            <div className="bg-[#110e0b] border border-white/8 rounded-2xl p-4">
              <p className="text-xs text-zinc-500 uppercase tracking-widest font-medium mb-3">Album rankings</p>
              <div className="space-y-2">
                {data.albums
                  .filter((a) => a.mine.rankPosition || a.theirs.rankPosition)
                  .sort((a, b) => (a.mine.rankPosition ?? 99) - (b.mine.rankPosition ?? 99))
                  .map((a) => {
                    const match = a.mine.rankPosition === a.theirs.rankPosition && a.mine.rankPosition !== null
                    return (
                      <div key={a.albumId} className="flex items-center gap-3">
                        {a.imageUrl && (
                          <Image src={a.imageUrl} alt={a.albumName} width={32} height={32} className="rounded flex-shrink-0" />
                        )}
                        <p className="text-sm text-zinc-300 flex-1 truncate">{a.albumName}</p>
                        <div className="flex items-center gap-2 flex-shrink-0">
                          <span className={cn('text-sm font-bold w-5 text-center', a.mine.rankPosition ? 'text-white' : 'text-zinc-700')}>
                            {a.mine.rankPosition ?? '—'}
                          </span>
                          <span className="text-zinc-700 text-xs">/</span>
                          <span className={cn('text-sm font-bold w-5 text-center', a.theirs.rankPosition ? 'text-white' : 'text-zinc-700')}>
                            {a.theirs.rankPosition ?? '—'}
                          </span>
                          {match && <span className="text-green-400 text-xs">✓</span>}
                        </div>
                      </div>
                    )
                  })}
              </div>
              <p className="text-xs text-zinc-700 mt-3">{data.myName.split(' ')[0]} rank / {data.theirName.split(' ')[0]} rank</p>
            </div>
          )}
        </div>
      )}

      {/* Albums tab */}
      {activeSection === 'albums' && (
        <div className="space-y-3 animate-fade-in">
          {data.albums.map((album) => (
            <AlbumCard key={album.albumId} album={album} myName={data.myName} theirName={data.theirName} />
          ))}
        </div>
      )}

      {/* Tracks tab — full list */}
      {activeSection === 'tracks' && (
        <div className="animate-fade-in space-y-4">
          {data.albums.map((album) => {
            const allIds = [...new Set([...Object.keys(album.mine.trackRatings), ...Object.keys(album.theirs.trackRatings)])]
            if (!allIds.length) return null
            return (
              <div key={album.albumId} className="bg-[#110e0b] border border-white/8 rounded-2xl overflow-hidden">
                <div className="flex items-center gap-2.5 px-4 py-3 border-b border-white/5">
                  {album.imageUrl && (
                    <Image src={album.imageUrl} alt={album.albumName} width={28} height={28} className="rounded flex-shrink-0" />
                  )}
                  <p className="text-xs font-semibold text-zinc-300 uppercase tracking-widest truncate">{album.albumName}</p>
                </div>
                <div className="px-4 py-2 space-y-2">
                  {/* Header */}
                  <div className="flex items-center gap-2 mb-1">
                    <div className="flex-1" />
                    <span className="text-xs text-zinc-600 w-24 text-center">{data.myName.split(' ')[0]}</span>
                    <span className="text-xs text-zinc-600 w-24 text-center">{data.theirName.split(' ')[0]}</span>
                  </div>
                  {allIds.map((tid) => {
                    const my = album.mine.trackRatings[tid] ?? 0
                    const their = album.theirs.trackRatings[tid] ?? 0
                    if (!my && !their) return null
                    const diff = Math.abs(my - their)
                    return (
                      <div key={tid} className="flex items-center gap-2">
                        <div className={cn('w-1.5 h-1.5 rounded-full flex-shrink-0', diff === 0 ? 'bg-green-500/60' : diff >= 3 ? 'bg-red-500/60' : 'bg-zinc-700')} />
                        <div className="flex items-center justify-end gap-0.5 w-24">
                          <Stars rating={my} dim={!my} />
                        </div>
                        <div className="w-1 flex-shrink-0" />
                        <div className="flex items-center gap-0.5 w-24">
                          <Stars rating={their} dim={!their} />
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* Back link */}
      <div className="pt-4 text-center">
        <Link href="/" className="text-xs text-zinc-600 hover:text-zinc-400 transition-colors uppercase tracking-widest">
          Back to home
        </Link>
      </div>
    </div>
  )
}
