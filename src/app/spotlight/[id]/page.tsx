'use client'

import { useEffect, useState, useCallback, useRef } from 'react'
import { useParams } from 'next/navigation'
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
import { getSpotlight, updateAlbumStatus, updateAlbumRanks, removeAlbumFromSpotlight, logActivity, updateSpotlightGenres, supabase } from '@/lib/supabase'
import type { SpotlightWithAlbums, SpotlightAlbum } from '@/types'
import { cn, statusColor, statusLabel, appleMusicSearchUrl, spotifySearchUrl } from '@/lib/utils'
import Reactions from '@/components/Reactions'
import Comments from '@/components/Comments'

// ─── Sortable ranking item ────────────────────────────────────────────────────
function SortableRankItem({
  album,
  position,
}: {
  album: SpotlightAlbum
  position: number
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: album.id,
  })

  return (
    <div
      ref={setNodeRef}
      style={{ transform: CSS.Transform.toString(transform), transition }}
      className={cn(
        'flex items-center gap-3 p-3 bg-[#110e0b] border rounded-xl transition-shadow',
        isDragging ? 'border-orange-500/40 shadow-xl shadow-black/60 z-10 relative' : 'border-white/5'
      )}
    >
      <span className="w-8 text-center text-xl font-bold text-orange-900 flex-shrink-0">{position}</span>
      {album.image_url ? (
        <Image src={album.image_url} alt={album.album_name} width={44} height={44} className="rounded-md flex-shrink-0" />
      ) : (
        <div className="w-11 h-11 rounded-md bg-zinc-800 flex-shrink-0" />
      )}
      <div className="min-w-0 flex-1">
        <p className="font-medium text-sm text-white truncate">{album.album_name}</p>
        <p className="text-xs text-zinc-400">{album.release_year}</p>
        {album.verdict && (
          <p className="text-xs text-zinc-400 italic mt-0.5 truncate">&ldquo;{album.verdict}&rdquo;</p>
        )}
      </div>
      <button
        className="ml-auto flex-shrink-0 cursor-grab active:cursor-grabbing text-zinc-600 hover:text-zinc-400 p-1"
        {...attributes}
        {...listeners}
      >
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 8h16M4 16h16" />
        </svg>
      </button>
    </div>
  )
}

// ─── Swipe to delete (mobile) ─────────────────────────────────────────────────
function SwipeToDelete({
  onDelete,
  disabled,
  children,
}: {
  onDelete: () => void
  disabled: boolean
  children: React.ReactNode
}) {
  const [offset, setOffset] = useState(0)
  const [swiping, setSwiping] = useState(false)
  const startX = useRef(0)
  const THRESHOLD = 88

  const onTouchStart = (e: React.TouchEvent) => {
    if (disabled) return
    startX.current = e.touches[0].clientX
    setSwiping(true)
  }

  const onTouchMove = (e: React.TouchEvent) => {
    if (!swiping || disabled) return
    const dx = e.touches[0].clientX - startX.current
    setOffset(dx) // allow both directions
  }

  const onTouchEnd = () => {
    if (!swiping) return
    setSwiping(false)
    if (Math.abs(offset) >= THRESHOLD) {
      setOffset(offset > 0 ? 600 : -600)
      setTimeout(onDelete, 250)
    } else {
      setOffset(0)
    }
  }

  const progress = Math.min(Math.abs(offset) / THRESHOLD, 1)

  return (
    <div className="relative overflow-hidden">
      <div
        className="absolute inset-0 flex items-center px-5"
        style={{
          background: `rgba(239,68,68,${progress * 0.25})`,
          justifyContent: offset > 0 ? 'flex-start' : 'flex-end',
        }}
      >
        <svg style={{ opacity: progress }} className="w-5 h-5 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
        </svg>
      </div>
      <div
        style={{
          transform: `translateX(${offset}px)`,
          transition: swiping ? 'none' : 'transform 0.28s cubic-bezier(0.25,0.46,0.45,0.94)',
        }}
        onTouchStart={onTouchStart}
        onTouchMove={onTouchMove}
        onTouchEnd={onTouchEnd}
      >
        {children}
      </div>
    </div>
  )
}

// ─── Album row in discography ─────────────────────────────────────────────────
function AlbumRow({
  album,
  spotlightId,
  artistName,
  onStatusChange,
  onRemove,
  selectMode,
  selected,
  onSelect,
}: {
  album: SpotlightAlbum
  spotlightId: string
  artistName: string
  onStatusChange: (id: string, status: SpotlightAlbum['status']) => void
  onRemove: (id: string) => void
  selectMode: boolean
  selected: boolean
  onSelect: () => void
}) {
  const [updating, setUpdating] = useState(false)

  const cycle = async (e: React.MouseEvent) => {
    e.preventDefault()
    const next: SpotlightAlbum['status'] =
      album.status === 'unlistened' ? 'listening' : album.status === 'listening' ? 'complete' : 'unlistened'
    setUpdating(true)
    await updateAlbumStatus(album.id, next)
    onStatusChange(album.id, next)
    if (next === 'complete') {
      logActivity({ event_type: 'album_complete', spotlight_id: spotlightId, album_id: album.album_id, album_name: album.album_name, artist_name: artistName })
    }
    setUpdating(false)
  }

  const rowContent = (
    <div className={cn(
      'flex items-center gap-3 py-3 border-b border-white/5 group bg-[#0c0a08] transition-colors',
      selected && 'bg-red-500/5'
    )}>
      {/* Checkbox (select mode) */}
      {selectMode && (
        <div className={cn(
          'w-5 h-5 rounded-full border-2 flex-shrink-0 flex items-center justify-center transition-all ml-1',
          selected ? 'border-red-400 bg-red-400' : 'border-zinc-600'
        )}>
          {selected && (
            <svg className="w-3 h-3 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
            </svg>
          )}
        </div>
      )}

      {/* Album info */}
      <div className="flex items-center gap-3 flex-1 min-w-0">
        {album.image_url ? (
          <Image src={album.image_url} alt={album.album_name} width={48} height={48} className="rounded-md flex-shrink-0" />
        ) : (
          <div className="w-12 h-12 rounded-md bg-zinc-800 flex-shrink-0" />
        )}
        <div className="min-w-0">
          <p className={cn('font-medium text-white text-sm truncate transition-colors tracking-tight', !selectMode && 'group-hover:text-orange-400')}>
            {album.album_name}
          </p>
          <p className="text-xs text-zinc-500 uppercase tracking-widest mt-0.5">{album.release_year} · {album.total_tracks} tracks</p>
        </div>
      </div>

      {/* Actions (hidden in select mode) */}
      {!selectMode && (
        <div className="flex items-center gap-2 flex-shrink-0">
          <a
            href={appleMusicSearchUrl(artistName, album.album_name)}
            target="_blank"
            rel="noopener noreferrer"
            onClick={(e) => e.stopPropagation()}
            className="opacity-0 group-hover:opacity-100 transition-opacity"
            title="Apple Music"
          >
            <svg className="w-4 h-4 text-zinc-500 hover:text-white" viewBox="0 0 24 24" fill="currentColor">
              <path d="M23.997 6.124a9.23 9.23 0 0 0-.24-2.19c-.317-1.31-1.064-2.31-2.18-3.043a5.022 5.022 0 0 0-1.769-.73 7.7 7.7 0 0 0-1.114-.155c-.46-.014-.92-.013-1.38-.013H6.678c-.459 0-.918-.001-1.378.013a7.633 7.633 0 0 0-1.113.155 4.99 4.99 0 0 0-1.768.73C1.3 1.623.553 2.623.236 3.934A9.23 9.23 0 0 0 0 6.124c-.014.46-.013.92-.013 1.378v9.006c0 .459-.001.918.013 1.378.014.78.103 1.565.24 2.19.317 1.311 1.064 2.311 2.18 3.043a5.022 5.022 0 0 0 1.769.73c.37.083.744.13 1.114.155.46.014.92.013 1.38.013h10.16c.46 0 .92.001 1.38-.013a7.7 7.7 0 0 0 1.113-.155 4.99 4.99 0 0 0 1.768-.73c1.116-.732 1.863-1.732 2.18-3.043.138-.625.227-1.41.241-2.19.013-.46.013-.92.013-1.378V7.502c0-.459 0-.918-.013-1.378zM12 17.5a5.5 5.5 0 1 1 0-11 5.5 5.5 0 0 1 0 11zm6.25-9.75a1.25 1.25 0 1 1 0-2.5 1.25 1.25 0 0 1 0 2.5zM12 8a4 4 0 1 0 0 8 4 4 0 0 0 0-8z" />
            </svg>
          </a>
          <a
            href={spotifySearchUrl(artistName, album.album_name)}
            target="_blank"
            rel="noopener noreferrer"
            onClick={(e) => e.stopPropagation()}
            className="opacity-0 group-hover:opacity-100 transition-opacity"
            title="Spotify"
          >
            <svg className="w-4 h-4 text-zinc-500 hover:text-white" viewBox="0 0 24 24" fill="currentColor">
              <path d="M12 0C5.4 0 0 5.4 0 12s5.4 12 12 12 12-5.4 12-12S18.66 0 12 0zm5.521 17.34c-.24.359-.66.48-1.021.24-2.82-1.74-6.36-2.101-10.561-1.141-.418.122-.779-.179-.899-.539-.12-.421.18-.78.54-.9 4.56-1.021 8.52-.6 11.64 1.32.42.18.479.659.301 1.02zm1.44-3.3c-.301.42-.841.6-1.262.3-3.239-1.98-8.159-2.58-11.939-1.38-.479.12-1.02-.12-1.14-.6-.12-.48.12-1.021.6-1.141C9.6 9.9 15 10.561 18.72 12.84c.361.181.54.78.241 1.2zm.12-3.36C15.24 8.4 8.82 8.16 5.16 9.301c-.6.179-1.2-.181-1.38-.721-.18-.601.18-1.2.72-1.381 4.26-1.26 11.28-1.02 15.721 1.621.539.3.719 1.02.419 1.56-.299.421-1.02.599-1.559.3z" />
            </svg>
          </a>
          <button
            onClick={(e) => { e.stopPropagation(); onRemove(album.id) }}
            className="opacity-0 group-hover:opacity-100 transition-opacity text-zinc-600 hover:text-red-400 p-1"
          >
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
          <button
            onClick={cycle}
            disabled={updating}
            className={cn('text-xs px-2.5 py-1 rounded-full font-medium transition-all', statusColor(album.status))}
          >
            {updating ? '…' : statusLabel(album.status)}
          </button>
        </div>
      )}
    </div>
  )

  if (selectMode) {
    return <div onClick={onSelect} className="cursor-pointer">{rowContent}</div>
  }

  return (
    <Link href={`/spotlight/${spotlightId}/album/${album.album_id}`}>
      {rowContent}
    </Link>
  )
}

// ─── Main page ────────────────────────────────────────────────────────────────
export default function SpotlightPage() {
  const { id } = useParams<{ id: string }>()
  const [spotlight, setSpotlight] = useState<SpotlightWithAlbums | null>(null)
  const [albums, setAlbums] = useState<SpotlightAlbum[]>([])
  const [loading, setLoading] = useState(true)
  const [tab, setTab] = useState<'discography' | 'ranking'>('discography')
  const [selectMode, setSelectMode] = useState(false)
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())
  const [editingGenres, setEditingGenres] = useState(false)
  const [genreInput, setGenreInput] = useState('')
  const [localGenres, setLocalGenres] = useState<string[]>([])

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  )

  useEffect(() => {
    getSpotlight(id)
      .then((data) => {
        if (!data) return
        setSpotlight(data)
        setLocalGenres(data.artist_genres ?? [])
        const sorted = [...(data.spotlight_albums ?? [])].sort(
          (a, b) => new Date(a.release_date).getTime() - new Date(b.release_date).getTime()
        )
        setAlbums(sorted)
      })
      .finally(() => setLoading(false))
  }, [id])

  const handleGenreKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' || e.key === ',') {
      e.preventDefault()
      const tag = genreInput.trim().replace(/,$/, '')
      if (tag && !localGenres.includes(tag)) {
        const updated = [...localGenres, tag]
        setLocalGenres(updated)
        updateSpotlightGenres(id, updated)
      }
      setGenreInput('')
    } else if (e.key === 'Backspace' && genreInput === '' && localGenres.length > 0) {
      const updated = localGenres.slice(0, -1)
      setLocalGenres(updated)
      updateSpotlightGenres(id, updated)
    }
  }

  const removeGenre = (genre: string) => {
    const updated = localGenres.filter((g) => g !== genre)
    setLocalGenres(updated)
    updateSpotlightGenres(id, updated)
  }

  // Pre-generate album insights in the background once albums load
  useEffect(() => {
    if (!spotlight || !albums.length) return
    const prefetch = async (album: SpotlightAlbum) => {
      try {
        await fetch('/api/insights', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            albumId: album.album_id,
            artistName: spotlight.artist_name,
            albumName: album.album_name,
            releaseYear: album.release_year,
            genres: spotlight.artist_genres,
          }),
        })
      } catch { /* silent */ }
    }
    // Prioritise albums in progress, then unlistened — stagger 600ms apart
    const ordered = [
      ...albums.filter(a => a.status !== 'unlistened'),
      ...albums.filter(a => a.status === 'unlistened'),
    ]
    ordered.forEach((album, i) => setTimeout(() => prefetch(album), i * 600))
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [spotlight?.id, albums.length])

  // Real-time collaboration — sync album changes from other clients
  useEffect(() => {
    const channel = supabase
      .channel(`spotlight:${id}`)
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'spotlight_albums', filter: `spotlight_id=eq.${id}` },
        (payload) => setAlbums((prev) => prev.map((a) => a.id === payload.new.id ? { ...a, ...payload.new } as SpotlightAlbum : a))
      )
      .on('postgres_changes', { event: 'DELETE', schema: 'public', table: 'spotlight_albums', filter: `spotlight_id=eq.${id}` },
        (payload) => setAlbums((prev) => prev.filter((a) => a.id !== payload.old.id))
      )
      .subscribe()
    return () => { supabase.removeChannel(channel) }
  }, [id])

  const handleStatusChange = useCallback((albumId: string, status: SpotlightAlbum['status']) => {
    setAlbums((prev) => prev.map((a) => (a.id === albumId ? { ...a, status } : a)))
  }, [])

  const handleRemove = useCallback(async (albumId: string) => {
    setAlbums((prev) => prev.filter((a) => a.id !== albumId))
    await removeAlbumFromSpotlight(albumId)
  }, [])

  const toggleSelect = useCallback((albumId: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev)
      if (next.has(albumId)) next.delete(albumId)
      else next.add(albumId)
      return next
    })
  }, [])

  const deleteSelected = useCallback(async () => {
    const ids = [...selectedIds]
    setAlbums((prev) => prev.filter((a) => !ids.includes(a.id)))
    setSelectedIds(new Set())
    setSelectMode(false)
    await Promise.all(ids.map((albumId) => removeAlbumFromSpotlight(albumId)))
  }, [selectedIds])

  const rankedAlbums = albums
    .filter((a) => a.status === 'complete')
    .sort((a, b) => (a.rank_position ?? 999) - (b.rank_position ?? 999))

  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event
    if (!over || active.id === over.id) return

    const oldIdx = rankedAlbums.findIndex((a) => a.id === active.id)
    const newIdx = rankedAlbums.findIndex((a) => a.id === over.id)
    const reordered = arrayMove(rankedAlbums, oldIdx, newIdx)

    const updates = reordered.map((a, i) => ({ id: a.id, rank_position: i + 1 }))
    setAlbums((prev) =>
      prev.map((a) => {
        const upd = updates.find((u) => u.id === a.id)
        return upd ? { ...a, rank_position: upd.rank_position } : a
      })
    )
    await updateAlbumRanks(updates)
  }

  if (loading) {
    return (
      <div className="animate-pulse space-y-4">
        <div className="h-48 bg-zinc-900 rounded-xl shimmer" />
        <div className="space-y-3">
          {[...Array(6)].map((_, i) => (
            <div key={i} className="flex gap-3 items-center py-3 border-b border-zinc-800">
              <div className="w-12 h-12 rounded-md shimmer" />
              <div className="flex-1 space-y-1.5">
                <div className="h-4 w-40 shimmer rounded" />
                <div className="h-3 w-24 shimmer rounded" />
              </div>
            </div>
          ))}
        </div>
      </div>
    )
  }

  if (!spotlight) {
    return (
      <div className="text-center py-20 text-zinc-500">
        Spotlight not found.{' '}
        <Link href="/" className="text-amber-400 underline">
          Go back
        </Link>
      </div>
    )
  }

  const complete = albums.filter((a) => a.status === 'complete').length
  const listening = albums.filter((a) => a.status === 'listening').length

  return (
    <div className="animate-fade-in">
      {/* Artist hero */}
      <div className="relative rounded-2xl overflow-hidden mb-6 bg-[#110e0b] border border-white/5">
        {spotlight.artist_image_url && (
          <div className="absolute inset-0">
            <Image
              src={spotlight.artist_image_url}
              alt={spotlight.artist_name}
              fill
              className="object-cover object-top opacity-20 blur-sm scale-105"
            />
            <div className="absolute inset-0 bg-gradient-to-r from-[#110e0b] via-[#110e0b]/80 to-transparent" />
          </div>
        )}
        <div className="relative p-4 sm:p-6">
          {/* Top row: image + text */}
          <div className="flex items-center gap-4">
            {spotlight.artist_image_url && (
              <Image
                src={spotlight.artist_image_url}
                alt={spotlight.artist_name}
                width={64}
                height={64}
                className="rounded-xl shadow-2xl shadow-black/60 flex-shrink-0 ring-1 ring-white/10 sm:w-20 sm:h-20"
              />
            )}
            <div className="min-w-0 flex-1">
              <p className="text-xs text-orange-500/80 uppercase tracking-widest font-medium mb-1">Artist Spotlight</p>
              <h1 className="text-xl sm:text-2xl font-bold text-white tracking-tight leading-tight">{spotlight.artist_name}</h1>
              {/* Genre tags — click the pencil to edit */}
              <div className="flex items-center gap-1.5 mt-1 flex-wrap">
                {!editingGenres ? (
                  <>
                    {localGenres.slice(0, 3).map((g, i) => (
                      <span key={g} className="inline-flex items-center gap-1.5">
                        {i > 0 && <span className="text-zinc-700">·</span>}
                        <span className="text-xs text-zinc-400 uppercase tracking-widest">{g}</span>
                      </span>
                    ))}
                    <button
                      onClick={() => setEditingGenres(true)}
                      className="text-zinc-700 hover:text-zinc-400 transition-colors ml-1"
                      title="Edit genres"
                    >
                      <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                      </svg>
                    </button>
                  </>
                ) : (
                  <div className="flex items-center gap-1 flex-wrap bg-zinc-900 border border-zinc-700 rounded-lg px-2 py-1 min-w-0">
                    {localGenres.map((g) => (
                      <span key={g} className="inline-flex items-center gap-1 text-xs bg-zinc-800 text-zinc-300 px-2 py-0.5 rounded-md">
                        {g}
                        <button onClick={() => removeGenre(g)} className="text-zinc-600 hover:text-red-400 transition-colors">
                          <svg className="w-2.5 h-2.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M6 18L18 6M6 6l12 12" />
                          </svg>
                        </button>
                      </span>
                    ))}
                    <input
                      autoFocus
                      type="text"
                      value={genreInput}
                      onChange={(e) => setGenreInput(e.target.value)}
                      onKeyDown={handleGenreKeyDown}
                      onBlur={() => setEditingGenres(false)}
                      placeholder={localGenres.length === 0 ? 'Add genre…' : ''}
                      className="text-xs text-white bg-transparent outline-none placeholder-zinc-600 min-w-16 w-20"
                    />
                  </div>
                )}
              </div>
              <div className="flex items-center gap-3 mt-1.5 text-xs text-zinc-400">
                <span>{albums.length} albums</span>
                {complete > 0 && <span className="text-orange-400 font-medium">{complete} complete</span>}
                {listening > 0 && <span className="text-amber-400 font-medium">now listening</span>}
              </div>
            </div>
          </div>

          {/* Bottom row: action buttons */}
          <div className="flex gap-2 mt-4">
            <a
              href={`/api/og/${id}`}
              target="_blank"
              rel="noopener noreferrer"
              className="text-xs bg-white/5 hover:bg-white/10 border border-white/8 text-zinc-400 hover:text-white px-3 py-1.5 rounded-lg transition-colors flex items-center gap-1.5"
              title="Download ranking as image"
            >
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
              Image
            </a>
            <button
              onClick={() => {
                const url = `${window.location.origin}/shared/${spotlight.share_token}`
                navigator.clipboard.writeText(url).then(() => alert('Link copied!'))
              }}
              className="text-xs bg-white/5 hover:bg-white/10 border border-white/8 text-zinc-400 hover:text-white px-3 py-1.5 rounded-lg transition-colors flex items-center gap-1.5"
            >
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z" />
              </svg>
              Share
            </button>
          </div>
        </div>

        {/* Progress bar */}
        {albums.length > 0 && (
          <div className="relative mx-4 sm:mx-6 mb-3 h-px bg-white/5 rounded-full overflow-hidden">
            <div
              className="absolute left-0 top-0 h-full bg-gradient-to-r from-orange-500 to-orange-400 rounded-full transition-all duration-500"
              style={{ width: `${(complete / albums.length) * 100}%` }}
            />
            {listening > 0 && (
              <div
                className="absolute top-0 h-full bg-amber-400/40 rounded-full transition-all duration-500"
                style={{ left: `${(complete / albums.length) * 100}%`, width: `${(listening / albums.length) * 100}%` }}
              />
            )}
          </div>
        )}

        {/* Stats strip */}
        {albums.length > 0 && (
          <div className="relative flex items-center gap-4 px-4 sm:px-6 pb-4 text-xs text-zinc-500 uppercase tracking-wider">
            <span>
              <span className="text-white font-medium normal-case">{complete}</span>/{albums.length} complete
            </span>
            {complete > 0 && (
              <span>
                ~<span className="text-white font-medium normal-case">
                  {Math.round(albums.filter(a => a.status === 'complete').reduce((s, a) => s + a.total_tracks, 0) * 4 / 60)}h
                </span> listened
              </span>
            )}
            {rankedAlbums.length > 0 && (
              <span>
                <span className="text-white font-medium normal-case">{rankedAlbums.length}</span> ranked
              </span>
            )}
            <span className="ml-auto text-zinc-800 normal-case">
              {new Date(spotlight.created_at).toLocaleDateString('en-GB', { month: 'short', year: 'numeric' })}
            </span>
          </div>
        )}
      </div>

      {/* Reactions + Comments */}
      <div className="flex flex-col gap-3 mb-6 bg-[#110e0b] border border-white/5 rounded-2xl p-4">
        <Reactions spotlightId={id} />
        <Comments spotlightId={id} />
      </div>

      {/* Tabs */}
      <div className="flex gap-1 mb-6 bg-[#110e0b] border border-white/5 rounded-xl p-1 max-w-xs">
        {(['discography', 'ranking'] as const).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={cn(
              'flex-1 text-xs font-semibold py-1.5 rounded-lg transition-all uppercase tracking-widest',
              tab === t ? 'bg-white/8 text-white' : 'text-zinc-500 hover:text-zinc-300'
            )}
          >
            {t}
            {t === 'ranking' && rankedAlbums.length > 0 && (
              <span className="ml-1.5 text-xs bg-orange-500/15 text-orange-400 px-1.5 py-0.5 rounded">
                {rankedAlbums.length}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* Discography tab */}
      {tab === 'discography' && (
        <div className="animate-fade-in">
          {albums.length === 0 ? (
            <p className="text-center text-zinc-600 py-12">No albums found.</p>
          ) : (
            <>
              <div className="flex justify-end mb-2">
                <button
                  onClick={() => { setSelectMode((m) => !m); setSelectedIds(new Set()) }}
                  className="text-xs text-zinc-400 hover:text-zinc-200 transition-colors"
                >
                  {selectMode ? 'Cancel' : 'Select'}
                </button>
              </div>
              {albums.map((album) => (
                <SwipeToDelete key={album.id} onDelete={() => handleRemove(album.id)} disabled={selectMode}>
                  <AlbumRow
                    album={album}
                    spotlightId={id}
                    artistName={spotlight.artist_name}
                    onStatusChange={handleStatusChange}
                    onRemove={handleRemove}
                    selectMode={selectMode}
                    selected={selectedIds.has(album.id)}
                    onSelect={() => toggleSelect(album.id)}
                  />
                </SwipeToDelete>
              ))}
            </>
          )}
        </div>
      )}

      {/* Bulk delete bar */}
      {selectMode && selectedIds.size > 0 && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 flex items-center gap-3 bg-[#110e0b] border border-white/10 rounded-2xl px-5 py-3 shadow-2xl shadow-black/80">
          <span className="text-sm text-zinc-300">{selectedIds.size} selected</span>
          <button
            onClick={deleteSelected}
            className="text-sm bg-red-500 hover:bg-red-400 text-white font-semibold px-4 py-1.5 rounded-lg transition-colors"
          >
            Delete {selectedIds.size}
          </button>
        </div>
      )}

      {/* Ranking tab */}
      {tab === 'ranking' && (
        <div className="animate-fade-in">
          {rankedAlbums.length === 0 ? (
            <div className="text-center py-16 text-zinc-600">
              <p className="text-lg mb-2">No albums ranked yet</p>
              <p className="text-sm">
                Mark albums as complete in the Discography tab — they&apos;ll appear here to drag into order.
              </p>
            </div>
          ) : (
            <>
              <p className="text-xs text-zinc-500 mb-3">Drag to reorder your ranking</p>
              <DndContext collisionDetection={closestCenter} onDragEnd={handleDragEnd} sensors={sensors}>
                <SortableContext items={rankedAlbums.map((a) => a.id)} strategy={verticalListSortingStrategy}>
                  <div className="space-y-2">
                    {rankedAlbums.map((album, idx) => (
                      <SortableRankItem key={album.id} album={album} position={idx + 1} />
                    ))}
                  </div>
                </SortableContext>
              </DndContext>

              {/* Unranked complete albums */}
              {albums.filter((a) => a.status === 'complete' && !a.rank_position).length > 0 && (
                <div className="mt-6">
                  <p className="text-xs text-zinc-600 mb-2">Not yet ranked</p>
                  {albums
                    .filter((a) => a.status === 'complete' && !a.rank_position)
                    .map((album) => (
                      <div key={album.id} className="flex items-center gap-3 py-2 opacity-50">
                        {album.image_url && (
                          <Image src={album.image_url} alt={album.album_name} width={36} height={36} className="rounded" />
                        )}
                        <span className="text-sm text-zinc-400">{album.album_name}</span>
                      </div>
                    ))}
                </div>
              )}
            </>
          )}
        </div>
      )}
    </div>
  )
}
