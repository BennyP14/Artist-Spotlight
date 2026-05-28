'use client'

import { useEffect, useState } from 'react'
import { getReactions, toggleReaction } from '@/lib/supabase'
import { useAuth } from '@/context/auth'

const EMOJIS = ['🔥', '💯', '👏', '💀', '🤔']

interface Reaction {
  emoji: string
  user_id: string
  profiles: { username: string; display_name: string }
}

export default function Reactions({ spotlightId, albumId }: { spotlightId: string; albumId?: string | null }) {
  const { user } = useAuth()
  const [reactions, setReactions] = useState<Reaction[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    getReactions(spotlightId, albumId).then((data) => {
      setReactions(data as unknown as Reaction[])
      setLoading(false)
    })
  }, [spotlightId, albumId])

  const handleToggle = async (emoji: string) => {
    if (!user) return
    const alreadyReacted = reactions.some(r => r.emoji === emoji && r.user_id === user.id)
    // Optimistic update
    if (alreadyReacted) {
      setReactions(prev => prev.filter(r => !(r.emoji === emoji && r.user_id === user.id)))
    } else {
      setReactions(prev => [...prev, { emoji, user_id: user.id, profiles: { username: '', display_name: '' } }])
    }
    await toggleReaction(spotlightId, emoji, albumId)
  }

  // Group by emoji
  const grouped = EMOJIS.map(emoji => ({
    emoji,
    count: reactions.filter(r => r.emoji === emoji).length,
    mine: !!user && reactions.some(r => r.emoji === emoji && r.user_id === user.id),
  }))

  if (loading) return null

  return (
    <div className="flex items-center gap-2 flex-wrap">
      {grouped.map(({ emoji, count, mine }) => (
        <button
          key={emoji}
          onClick={() => handleToggle(emoji)}
          disabled={!user}
          title={!user ? 'Sign in to react' : undefined}
          className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-sm border transition-all ${
            mine
              ? 'bg-orange-500/15 border-orange-500/30 text-orange-300'
              : count > 0
                ? 'bg-white/5 border-white/10 text-zinc-300 hover:border-orange-500/30 hover:bg-orange-500/10'
                : 'bg-transparent border-white/5 text-zinc-700 hover:border-white/15 hover:text-zinc-500'
          } disabled:cursor-default`}
        >
          <span>{emoji}</span>
          {count > 0 && <span className="text-xs font-medium">{count}</span>}
        </button>
      ))}
    </div>
  )
}
