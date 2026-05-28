'use client'

import { useEffect, useState } from 'react'
import { useParams } from 'next/navigation'
import Image from 'next/image'
import Link from 'next/link'
import { getSpotlight, getSpotlights } from '@/lib/supabase'
import { useAuth } from '@/context/auth'
import type { SpotlightWithAlbums, SpotlightAlbum } from '@/types'

// Pick which of your spotlights to compare against theirs
export default function ComparePage() {
  const { id1 } = useParams<{ id1: string }>()
  const { user } = useAuth()
  const [theirSpotlight, setTheirSpotlight] = useState<SpotlightWithAlbums | null>(null)
  const [mySpotlights, setMySpotlights] = useState<(SpotlightWithAlbums & { spotlight_albums: { status: string }[] })[]>([])
  const [mySpotlight, setMySpotlight] = useState<SpotlightWithAlbums | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function load() {
      const [theirs, mine] = await Promise.all([
        getSpotlight(id1),
        user ? getSpotlights() : Promise.resolve([]),
      ])
      setTheirSpotlight(theirs)
      setMySpotlights(mine as typeof mySpotlights)
      // Auto-select if we have a matching artist
      const match = (mine as SpotlightWithAlbums[]).find(s => theirs && s.artist_id === theirs.artist_id)
      if (match) {
        const full = await getSpotlight(match.id)
        setMySpotlight(full)
      }
      setLoading(false)
    }
    load()
  }, [id1, user])

  const selectMySpotlight = async (id: string) => {
    const full = await getSpotlight(id)
    setMySpotlight(full)
  }

  if (loading) return <div className="text-center py-20 text-zinc-600 text-sm uppercase tracking-widest">Loading…</div>
  if (!theirSpotlight) return <div className="text-center py-20 text-zinc-600">Spotlight not found</div>

  return (
    <div className="animate-fade-in">
      <div className="mb-6">
        <h1 className="text-2xl font-bold tracking-tight">Compare Rankings</h1>
        <p className="text-xs text-zinc-600 uppercase tracking-widest mt-1">{theirSpotlight.artist_name}</p>
      </div>

      {/* Pick your spotlight if no match */}
      {!mySpotlight && user && (
        <div className="bg-[#110e0b] border border-orange-500/20 rounded-2xl p-5 mb-6">
          <p className="text-sm font-medium text-white mb-1">Pick your {theirSpotlight.artist_name} spotlight</p>
          <p className="text-xs text-zinc-600 uppercase tracking-widest mb-4">To compare your ranking against theirs</p>
          <div className="space-y-2">
            {mySpotlights
              .filter(s => s.artist_id === theirSpotlight.artist_id || true) // show all if no match
              .map(s => (
                <button
                  key={s.id}
                  onClick={() => selectMySpotlight(s.id)}
                  className="w-full text-left flex items-center gap-3 p-3 bg-white/5 hover:bg-orange-500/10 border border-white/5 hover:border-orange-500/20 rounded-xl transition-all"
                >
                  {s.artist_image_url && (
                    <Image src={s.artist_image_url} alt={s.artist_name} width={36} height={36} className="rounded-lg object-cover" />
                  )}
                  <span className="font-medium text-sm">{s.artist_name}</span>
                </button>
              ))}
          </div>
          {mySpotlights.length === 0 && (
            <p className="text-zinc-700 text-sm">
              You don&apos;t have a spotlight for this artist yet.{' '}
              <Link href="/spotlight/new" className="text-orange-400">Start one →</Link>
            </p>
          )}
        </div>
      )}

      {mySpotlight ? (
        <ComparisonView mine={mySpotlight} theirs={theirSpotlight} />
      ) : !user ? (
        <div className="text-center py-16 bg-[#110e0b] border border-white/5 rounded-2xl">
          <p className="text-zinc-500 mb-3">Sign in to compare your rankings</p>
          <Link href="/auth/signin" className="text-xs bg-orange-500 text-white font-semibold px-4 py-2 rounded-lg tracking-wide">Sign in</Link>
        </div>
      ) : null}
    </div>
  )
}

function ComparisonView({ mine, theirs }: { mine: SpotlightWithAlbums; theirs: SpotlightWithAlbums }) {
  const myRanked = (mine.spotlight_albums ?? [])
    .filter(a => a.rank_position !== null)
    .sort((a, b) => (a.rank_position ?? 0) - (b.rank_position ?? 0))

  const theirRanked = (theirs.spotlight_albums ?? [])
    .filter(a => a.rank_position !== null)
    .sort((a, b) => (a.rank_position ?? 0) - (b.rank_position ?? 0))

  // Build comparison: match albums by album_id
  const allAlbumIds = [...new Set([
    ...myRanked.map(a => a.album_id),
    ...theirRanked.map(a => a.album_id),
  ])]

  const rows = allAlbumIds.map(albumId => {
    const mine = myRanked.find(a => a.album_id === albumId)
    const theirs = theirRanked.find(a => a.album_id === albumId)
    const diff = mine && theirs ? Math.abs((mine.rank_position ?? 0) - (theirs.rank_position ?? 0)) : null
    const agree = diff !== null && diff <= 1
    return { albumId, mine, theirs, diff, agree }
  }).filter(r => r.mine && r.theirs) // only show albums both have ranked
    .sort((a, b) => ((a.mine?.rank_position ?? 99) + (a.theirs?.rank_position ?? 99)) - ((b.mine?.rank_position ?? 99) + (b.theirs?.rank_position ?? 99)))

  const agreements = rows.filter(r => r.agree).length
  const score = rows.length > 0 ? Math.round((agreements / rows.length) * 100) : 0

  const album = myRanked[0] || theirRanked[0]

  return (
    <div>
      {/* Score card */}
      <div className="bg-[#110e0b] border border-white/5 rounded-2xl p-6 mb-6 text-center">
        <div className="text-6xl font-bold text-white mb-1">{score}<span className="text-2xl text-orange-400">%</span></div>
        <p className="text-xs text-zinc-600 uppercase tracking-widest">Ranking compatibility</p>
        <div className="flex justify-center gap-6 mt-4 text-sm text-zinc-500">
          <span><span className="text-emerald-400 font-semibold">{agreements}</span> albums agree</span>
          <span><span className="text-red-400 font-semibold">{rows.length - agreements}</span> albums disagree</span>
          <span><span className="text-zinc-400 font-semibold">{rows.length}</span> compared</span>
        </div>
      </div>

      {/* Side by side header */}
      <div className="grid grid-cols-[1fr_40px_1fr] gap-2 mb-3">
        <div className="text-xs text-zinc-600 uppercase tracking-widest text-center">You</div>
        <div />
        <div className="text-xs text-zinc-600 uppercase tracking-widest text-center">{theirs.artist_name.split(' ')[0]}&apos;s</div>
      </div>

      {rows.length === 0 ? (
        <div className="text-center py-12 bg-[#110e0b] border border-white/5 rounded-2xl">
          <p className="text-zinc-600 text-sm">No ranked albums to compare yet</p>
          <p className="text-zinc-700 text-xs mt-1">Both of you need to rank albums to see a comparison</p>
        </div>
      ) : (
        <div className="space-y-2">
          {rows.map(({ albumId, mine: m, theirs: t, agree }) => (
            <div key={albumId} className={`grid grid-cols-[1fr_40px_1fr] gap-2 p-3 rounded-xl border transition-colors ${
              agree ? 'bg-emerald-500/5 border-emerald-500/15' : 'bg-red-500/5 border-red-500/10'
            }`}>
              {/* My rank */}
              <div className="flex items-center gap-2 min-w-0">
                <span className="text-lg font-bold text-zinc-700 w-6 text-right flex-shrink-0">#{m?.rank_position}</span>
                {m?.image_url && <Image src={m.image_url} alt={m.album_name} width={32} height={32} className="rounded flex-shrink-0" />}
                <span className="text-xs text-zinc-300 truncate">{m?.album_name}</span>
              </div>

              {/* Agree / Disagree indicator */}
              <div className="flex items-center justify-center">
                {agree ? (
                  <span className="text-emerald-400 text-base">✓</span>
                ) : (
                  <span className="text-red-400 text-xs font-bold">✗</span>
                )}
              </div>

              {/* Their rank */}
              <div className="flex items-center gap-2 min-w-0 flex-row-reverse">
                <span className="text-lg font-bold text-zinc-700 w-6 text-left flex-shrink-0">#{t?.rank_position}</span>
                {t?.image_url && <Image src={t.image_url} alt={t.album_name} width={32} height={32} className="rounded flex-shrink-0" />}
                <span className="text-xs text-zinc-300 truncate text-right">{t?.album_name}</span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
