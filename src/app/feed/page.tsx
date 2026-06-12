'use client'

import { useEffect, useState } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import { getFriendFeed, type ActivityEvent } from '@/lib/supabase'
import { useAuth } from '@/context/auth'
import PendingInvites from '@/components/PendingInvites'

function timeAgo(dateStr: string) {
  const diff = Date.now() - new Date(dateStr).getTime()
  const m = Math.floor(diff / 60000)
  if (m < 1) return 'just now'
  if (m < 60) return `${m}m ago`
  const h = Math.floor(m / 60)
  if (h < 24) return `${h}h ago`
  return `${Math.floor(h / 24)}d ago`
}

function buildSentence(
  event: ActivityEvent,
  spotlight: { artist_name: string; artist_image_url: string | null } | null
): string {
  const artistName = spotlight?.artist_name ?? event.artist_name ?? null
  const meta = event.metadata as { comment_preview?: string; emoji?: string }

  switch (event.event_type) {
    case 'spotlight_created':
      return `started a spotlight on ${artistName ?? 'an artist'}`
    case 'album_complete':
      return [
        'completed',
        event.album_name ? `"${event.album_name}"` : 'an album',
        artistName ? `— ${artistName}` : '',
      ].filter(Boolean).join(' ')
    case 'album_ranked':
      return [
        'ranked',
        event.album_name ? `"${event.album_name}"` : 'an album',
        artistName ? `— ${artistName}` : '',
      ].filter(Boolean).join(' ')
    case 'spotlight_shared':
      return `shared their full ranking for ${artistName ?? 'a spotlight'}`
    case 'comment_added':
      return `commented on ${artistName ? `${artistName}'s` : 'a'} spotlight`
    case 'reaction_added':
      return `reacted ${meta?.emoji ?? '👋'} to ${artistName ? `${artistName}'s` : 'a'} spotlight`
    default:
      return event.event_type.replace(/_/g, ' ')
  }
}

function ActivityCard({ event }: { event: ActivityEvent }) {
  const profile = event.profiles
  const spotlight = event.spotlights
  const spotlightHref = event.spotlight_id ? `/spotlight/${event.spotlight_id}` : null
  const meta = event.metadata as { comment_preview?: string; emoji?: string }
  const sentence = buildSentence(event, spotlight)

  return (
    <div className="bg-[#110e0b] border border-white/5 rounded-xl p-4 hover:border-orange-500/15 transition-colors">
      <div className="flex items-start gap-3">
        {/* Avatar — links to profile */}
        <Link href={`/u/${profile.username}`} className="flex-shrink-0">
          <div className="w-9 h-9 rounded-full bg-orange-500/20 flex items-center justify-center text-orange-400 text-sm font-bold ring-1 ring-white/5">
            {profile.display_name[0]?.toUpperCase() ?? '?'}
          </div>
        </Link>

        {/* Body */}
        <div className="flex-1 min-w-0">
          <p className="text-sm leading-snug">
            <Link
              href={`/u/${profile.username}`}
              className="font-semibold text-white hover:text-orange-400 transition-colors"
            >
              {profile.display_name}
            </Link>
            {' '}
            <span className="text-zinc-300">{sentence}</span>
          </p>

          {/* Comment preview */}
          {event.event_type === 'comment_added' && meta?.comment_preview && (
            <p className="text-sm text-zinc-400 italic mt-2 bg-white/[0.03] rounded-lg px-3 py-2 border border-white/5 line-clamp-2">
              &ldquo;{meta.comment_preview}&rdquo;
            </p>
          )}

          {/* Footer: timestamp + view link */}
          <div className="flex items-center gap-3 mt-1.5">
            <span className="text-xs text-zinc-500 uppercase tracking-widest">
              {timeAgo(event.created_at)}
            </span>
            {spotlightHref && (
              <Link
                href={spotlightHref}
                className="text-xs text-orange-400 hover:text-orange-300 transition-colors font-medium"
              >
                View spotlight →
              </Link>
            )}
          </div>
        </div>

        {/* Artist thumbnail — links to spotlight */}
        {spotlight?.artist_image_url && spotlightHref && (
          <Link href={spotlightHref} className="flex-shrink-0">
            <div className="w-10 h-10 rounded-lg overflow-hidden ring-1 ring-white/5 hover:ring-orange-500/30 transition-all">
              <Image
                src={spotlight.artist_image_url}
                alt={spotlight.artist_name}
                width={40}
                height={40}
                className="object-cover"
              />
            </div>
          </Link>
        )}
      </div>
    </div>
  )
}

export default function FeedPage() {
  const { user, loading: authLoading } = useAuth()
  const [events, setEvents] = useState<ActivityEvent[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (authLoading) return
    if (!user) { setLoading(false); return }
    getFriendFeed().then(setEvents).finally(() => setLoading(false))
  }, [user, authLoading])

  if (!user && !authLoading) return (
    <div className="text-center py-24">
      <p className="text-zinc-400 text-sm uppercase tracking-widest mb-4">Sign in to see your friend feed</p>
      <Link href="/auth/signin" className="text-xs bg-orange-500 hover:bg-orange-400 text-white font-semibold px-5 py-2.5 rounded-lg transition-colors tracking-wide">
        Sign in
      </Link>
    </div>
  )

  return (
    <div className="max-w-xl mx-auto animate-fade-in">
      <div className="mb-6">
        <h1 className="text-2xl font-bold tracking-tight">Friend Feed</h1>
        <p className="text-zinc-400 text-xs uppercase tracking-widest mt-1">What your friends are listening to</p>
      </div>

      <PendingInvites />

      {loading ? (
        <div className="space-y-3">
          {[...Array(5)].map((_, i) => <div key={i} className="h-20 bg-white/5 rounded-xl shimmer" />)}
        </div>
      ) : events.length === 0 ? (
        <div className="text-center py-20 bg-[#110e0b] border border-white/5 rounded-2xl">
          <p className="text-zinc-200 font-medium mb-1">Nothing here yet</p>
          <p className="text-zinc-400 text-sm">Follow friends to see their listening activity</p>
        </div>
      ) : (
        <div className="space-y-3">
          {events.map((e) => <ActivityCard key={e.id} event={e} />)}
        </div>
      )}
    </div>
  )
}
