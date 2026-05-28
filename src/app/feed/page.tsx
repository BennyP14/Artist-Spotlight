'use client'

import { useEffect, useState } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import { getFriendFeed, type ActivityEvent } from '@/lib/supabase'
import { useAuth } from '@/context/auth'

const EVENT_LABELS: Record<string, string> = {
  spotlight_created: 'started a spotlight',
  album_complete: 'completed',
  album_ranked: 'ranked',
  spotlight_shared: 'shared their ranking',
}

function timeAgo(dateStr: string) {
  const diff = Date.now() - new Date(dateStr).getTime()
  const m = Math.floor(diff / 60000)
  if (m < 1) return 'just now'
  if (m < 60) return `${m}m ago`
  const h = Math.floor(m / 60)
  if (h < 24) return `${h}h ago`
  return `${Math.floor(h / 24)}d ago`
}

function ActivityCard({ event }: { event: ActivityEvent }) {
  const profile = event.profiles
  const spotlight = event.spotlights

  return (
    <div className="bg-[#110e0b] border border-white/5 rounded-xl p-4 hover:border-orange-500/10 transition-colors">
      <div className="flex items-start gap-3">
        <Link href={`/u/${profile.username}`} className="flex-shrink-0">
          <div className="w-9 h-9 rounded-full bg-orange-500/20 flex items-center justify-center text-orange-400 text-sm font-bold ring-1 ring-white/5">
            {profile.display_name[0].toUpperCase()}
          </div>
        </Link>
        <div className="flex-1 min-w-0">
          <p className="text-sm">
            <Link href={`/u/${profile.username}`} className="font-semibold text-white hover:text-orange-400 transition-colors">
              {profile.display_name}
            </Link>
            {' '}
            <span className="text-zinc-500">{EVENT_LABELS[event.event_type] ?? event.event_type}</span>
            {event.album_name && (
              <span className="text-zinc-300"> &ldquo;{event.album_name}&rdquo;</span>
            )}
            {spotlight && (
              <span className="text-zinc-500"> — {spotlight.artist_name}</span>
            )}
          </p>
          <p className="text-xs text-zinc-700 uppercase tracking-widest mt-1">{timeAgo(event.created_at)}</p>
        </div>
        {spotlight?.artist_image_url && (
          <div className="w-10 h-10 rounded-lg overflow-hidden flex-shrink-0">
            <Image src={spotlight.artist_image_url} alt={spotlight.artist_name} width={40} height={40} className="object-cover" />
          </div>
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
      <p className="text-zinc-600 text-sm uppercase tracking-widest mb-4">Sign in to see your friend feed</p>
      <Link href="/auth/signin" className="text-xs bg-orange-500 hover:bg-orange-400 text-white font-semibold px-5 py-2.5 rounded-lg transition-colors tracking-wide">
        Sign in
      </Link>
    </div>
  )

  return (
    <div className="max-w-xl mx-auto animate-fade-in">
      <div className="mb-6">
        <h1 className="text-2xl font-bold tracking-tight">Friend Feed</h1>
        <p className="text-zinc-600 text-xs uppercase tracking-widest mt-1">What your friends are listening to</p>
      </div>

      {loading ? (
        <div className="space-y-3">
          {[...Array(5)].map((_, i) => <div key={i} className="h-20 bg-white/5 rounded-xl shimmer" />)}
        </div>
      ) : events.length === 0 ? (
        <div className="text-center py-20 bg-[#110e0b] border border-white/5 rounded-2xl">
          <p className="text-zinc-500 font-medium mb-1">Nothing here yet</p>
          <p className="text-zinc-700 text-sm">Follow friends to see their listening activity</p>
        </div>
      ) : (
        <div className="space-y-3">
          {events.map((e) => <ActivityCard key={e.id} event={e} />)}
        </div>
      )}
    </div>
  )
}
