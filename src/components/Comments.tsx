'use client'

import { useEffect, useState, useRef } from 'react'
import { getComments, addComment } from '@/lib/supabase'
import { useAuth } from '@/context/auth'

interface Comment {
  id: string
  content: string
  created_at: string
  user_id: string
  profiles: { username: string; display_name: string; avatar_url: string | null }
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

export default function Comments({ spotlightId }: { spotlightId: string }) {
  const { user, profile } = useAuth()
  const [comments, setComments] = useState<Comment[]>([])
  const [input, setInput] = useState('')
  const [posting, setPosting] = useState(false)
  const [open, setOpen] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (open) getComments(spotlightId).then((data) => setComments(data as Comment[]))
  }, [open, spotlightId])

  const post = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!input.trim() || !user) return
    setPosting(true)
    await addComment(spotlightId, input.trim())
    setComments(prev => [...prev, {
      id: Date.now().toString(),
      content: input.trim(),
      created_at: new Date().toISOString(),
      user_id: user.id,
      profiles: { username: profile?.username ?? '', display_name: profile?.display_name ?? 'You', avatar_url: profile?.avatar_url ?? null },
    }])
    setInput('')
    setPosting(false)
  }

  return (
    <div>
      <button
        onClick={() => setOpen(o => !o)}
        className="flex items-center gap-2 text-xs text-zinc-600 hover:text-zinc-400 transition-colors uppercase tracking-widest"
      >
        <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
        </svg>
        {comments.length > 0 || open ? `${comments.length} comments` : 'Add comment'}
      </button>

      {open && (
        <div className="mt-3 space-y-3">
          {comments.map(c => (
            <div key={c.id} className="flex gap-2.5">
              <div className="w-7 h-7 rounded-full bg-orange-500/20 flex items-center justify-center text-orange-400 text-xs font-bold flex-shrink-0">
                {c.profiles.display_name[0].toUpperCase()}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-baseline gap-2">
                  <span className="text-xs font-semibold text-zinc-300">{c.profiles.display_name}</span>
                  <span className="text-xs text-zinc-700 uppercase tracking-wider">{timeAgo(c.created_at)}</span>
                </div>
                <p className="text-sm text-zinc-400 mt-0.5">{c.content}</p>
              </div>
            </div>
          ))}

          {user ? (
            <form onSubmit={post} className="flex gap-2 mt-2">
              <input
                ref={inputRef}
                value={input}
                onChange={e => setInput(e.target.value)}
                placeholder="Add a comment…"
                className="flex-1 bg-white/5 border border-white/5 rounded-lg px-3 py-2 text-sm text-white placeholder-zinc-700 focus:outline-none focus:border-orange-500/30 transition-colors"
              />
              <button
                type="submit"
                disabled={posting || !input.trim()}
                className="text-xs bg-orange-500 hover:bg-orange-400 text-white font-semibold px-3 py-2 rounded-lg transition-colors disabled:opacity-40"
              >
                Post
              </button>
            </form>
          ) : (
            <p className="text-xs text-zinc-700 uppercase tracking-widest">Sign in to comment</p>
          )}
        </div>
      )}
    </div>
  )
}
