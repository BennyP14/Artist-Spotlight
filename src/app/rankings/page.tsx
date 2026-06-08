'use client'

import { useEffect, useState, useCallback } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from '@dnd-kit/core'
import {
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
  arrayMove,
} from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { getGlobalRankedAlbums, updateGlobalRanks, type GlobalAlbum } from '@/lib/supabase'
import { useAuth } from '@/context/auth'
import { cn } from '@/lib/utils'

function ScoreBadge({ score }: { score: number | null }) {
  if (score === null) return null
  const color = score >= 80 ? 'text-emerald-400 border-emerald-500/20 bg-emerald-500/8'
    : score >= 60 ? 'text-orange-400 border-orange-500/20 bg-orange-500/8'
    : 'text-zinc-500 border-zinc-700 bg-transparent'
  return (
    <span className={`text-xs font-medium px-1.5 py-0.5 rounded border ${color}`}>
      {score}
    </span>
  )
}

function SortableAlbumRow({ album, position }: { album: GlobalAlbum; position: number }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: album.id })

  return (
    <div
      ref={setNodeRef}
      style={{ transform: CSS.Transform.toString(transform), transition }}
      className={cn(
        'flex items-center gap-3 p-3 bg-[#110e0b] border rounded-xl transition-shadow',
        isDragging ? 'border-orange-500/40 shadow-xl shadow-black/60 z-10 relative' : 'border-white/5'
      )}
    >
      {/* Position number */}
      <span className={cn(
        'w-7 text-center font-bold flex-shrink-0 text-base',
        position === 1 ? 'text-amber-400' : position === 2 ? 'text-zinc-300' : position === 3 ? 'text-orange-500' : 'text-zinc-500'
      )}>
        {position}
      </span>

      {/* Album art */}
      {album.image_url ? (
        <Image src={album.image_url} alt={album.album_name} width={44} height={44} className="rounded-md flex-shrink-0" />
      ) : (
        <div className="w-11 h-11 rounded-md bg-white/5 flex-shrink-0" />
      )}

      {/* Info */}
      <div className="min-w-0 flex-1">
        <Link href={`/spotlight/${album.spotlight_id}/album/${album.album_id}`}>
          <p className="font-medium text-sm text-white truncate hover:text-orange-400 transition-colors tracking-tight">
            {album.album_name}
          </p>
        </Link>
        <div className="flex items-center gap-2 mt-0.5">
          {album.artist_image_url && (
            <Image src={album.artist_image_url} alt={album.artist_name} width={14} height={14} className="rounded-sm flex-shrink-0 opacity-60" />
          )}
          <p className="text-xs text-zinc-400 uppercase tracking-widest truncate">{album.artist_name} · {album.release_year}</p>
        </div>
        {album.verdict && (
          <p className="text-xs text-zinc-400 italic mt-0.5 truncate">&ldquo;{album.verdict}&rdquo;</p>
        )}
      </div>

      {/* Score + drag handle */}
      <div className="flex items-center gap-2 flex-shrink-0">
        <ScoreBadge score={album.auto_score !== undefined ? Math.round(album.auto_score ?? 0) : null} />
        <button
          className="cursor-grab active:cursor-grabbing text-zinc-700 hover:text-zinc-500 p-1"
          {...attributes}
          {...listeners}
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 8h16M4 16h16" />
          </svg>
        </button>
      </div>
    </div>
  )
}

export default function RankingsPage() {
  const { user, loading: authLoading } = useAuth()
  const [albums, setAlbums] = useState<GlobalAlbum[]>([])
  const [unranked, setUnranked] = useState<GlobalAlbum[]>([])
  const [loading, setLoading] = useState(true)
  const [autoRanking, setAutoRanking] = useState(false)
  const [lastAutoRanked, setLastAutoRanked] = useState<string | null>(null)

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  )

  const load = useCallback(async () => {
    const all = await getGlobalRankedAlbums()
    setAlbums(all.filter(a => a.global_rank_position !== null).sort((a, b) => (a.global_rank_position ?? 999) - (b.global_rank_position ?? 999)))
    setUnranked(all.filter(a => a.global_rank_position === null))
    setLoading(false)
  }, [])

  useEffect(() => {
    if (!authLoading) load()
  }, [authLoading, load])

  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event
    if (!over || active.id === over.id) return
    const oldIdx = albums.findIndex(a => a.id === active.id)
    const newIdx = albums.findIndex(a => a.id === over.id)
    const reordered = arrayMove(albums, oldIdx, newIdx)
    setAlbums(reordered)
    await updateGlobalRanks(reordered.map((a, i) => ({ id: a.id, global_rank_position: i + 1 })))
  }

  const autoRank = async () => {
    setAutoRanking(true)
    try {
      const res = await fetch('/api/auto-rank', { method: 'POST' })
      const { ranked } = await res.json()
      await load()
      setLastAutoRanked(`Auto-ranked ${ranked} albums based on your track ratings and verdicts`)
    } finally {
      setAutoRanking(false)
    }
  }

  if (!user && !authLoading) return (
    <div className="text-center py-24">
      <p className="text-zinc-400 text-sm uppercase tracking-widest mb-4">Sign in to see your rankings</p>
      <Link href="/auth/signin" className="text-xs bg-orange-500 hover:bg-orange-400 text-white font-semibold px-5 py-2.5 rounded-lg transition-colors tracking-wide">
        Sign in
      </Link>
    </div>
  )

  return (
    <div className="max-w-2xl mx-auto animate-fade-in">
      <div className="flex items-start justify-between mb-6 gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">All-Time Rankings</h1>
          <p className="text-xs text-zinc-400 uppercase tracking-widest mt-1">Your best albums across every spotlight</p>
        </div>
        <button
          onClick={autoRank}
          disabled={autoRanking}
          className="flex-shrink-0 flex items-center gap-2 text-xs bg-orange-500/10 hover:bg-orange-500/20 border border-orange-500/20 text-orange-400 font-semibold px-3 py-2 rounded-lg transition-colors disabled:opacity-50 tracking-wide"
        >
          {autoRanking ? (
            <div className="w-3.5 h-3.5 border border-orange-400 border-t-transparent rounded-full animate-spin" />
          ) : (
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
            </svg>
          )}
          Auto-rank
        </button>
      </div>

      {lastAutoRanked && (
        <div className="mb-4 p-3 bg-orange-500/8 border border-orange-500/15 rounded-xl text-xs text-orange-400 flex items-center gap-2">
          <svg className="w-3.5 h-3.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
          </svg>
          {lastAutoRanked}. Drag to fine-tune.
        </div>
      )}

      {loading ? (
        <div className="space-y-2">
          {[...Array(6)].map((_, i) => <div key={i} className="h-16 bg-white/5 rounded-xl shimmer" />)}
        </div>
      ) : albums.length === 0 && unranked.length === 0 ? (
        <div className="text-center py-20 bg-[#110e0b] border border-white/5 rounded-2xl">
          <p className="text-zinc-200 font-medium mb-2">No completed albums yet</p>
          <p className="text-zinc-400 text-sm mb-4">Mark albums as complete in your spotlights, then hit Auto-rank</p>
          <Link href="/" className="text-xs text-orange-400 hover:text-orange-300 uppercase tracking-widest">← Your spotlights</Link>
        </div>
      ) : (
        <>
          {/* Ranked list */}
          {albums.length > 0 && (
            <>
              <p className="text-xs text-zinc-400 uppercase tracking-widest mb-3">Drag to reorder · Score from track ratings + verdict</p>
              <DndContext collisionDetection={closestCenter} onDragEnd={handleDragEnd} sensors={sensors}>
                <SortableContext items={albums.map(a => a.id)} strategy={verticalListSortingStrategy}>
                  <div className="space-y-2">
                    {albums.map((album, idx) => (
                      <SortableAlbumRow key={album.id} album={album} position={idx + 1} />
                    ))}
                  </div>
                </SortableContext>
              </DndContext>
            </>
          )}

          {/* Unranked completed albums */}
          {unranked.length > 0 && (
            <div className="mt-8">
              <div className="flex items-center justify-between mb-3">
                <p className="text-xs text-zinc-400 uppercase tracking-widest">Completed but not yet ranked</p>
                <button
                  onClick={autoRank}
                  disabled={autoRanking}
                  className="text-xs text-orange-400 hover:text-orange-300 transition-colors"
                >
                  Auto-rank all →
                </button>
              </div>
              <div className="space-y-2 opacity-50">
                {unranked.map(album => (
                  <div key={album.id} className="flex items-center gap-3 p-3 bg-[#110e0b] border border-white/5 rounded-xl">
                    <span className="w-7 text-center text-zinc-500 font-bold text-base">—</span>
                    {album.image_url && <Image src={album.image_url} alt={album.album_name} width={44} height={44} className="rounded-md flex-shrink-0" />}
                    <div className="min-w-0 flex-1">
                      <p className="font-medium text-sm text-white truncate">{album.album_name}</p>
                      <p className="text-xs text-zinc-400 uppercase tracking-widest mt-0.5">{album.artist_name} · {album.release_year}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </>
      )}
    </div>
  )
}
