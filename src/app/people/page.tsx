'use client'

import { useState, useCallback, useRef, useEffect } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { followUser, unfollowUser, isFollowing, getFollowing } from '@/lib/supabase'
import { useAuth } from '@/context/auth'

interface Profile {
  id: string
  username: string
  display_name: string
  avatar_url: string | null
}

function Avatar({ person, size = 10 }: { person: Profile; size?: number }) {
  const cls = `w-${size} h-${size} rounded-full overflow-hidden flex-shrink-0 ring-1 ring-white/5`
  return (
    <div className={cls}>
      {person.avatar_url ? (
        <Image src={person.avatar_url} alt={person.display_name} width={40} height={40} className="object-cover" />
      ) : (
        <div className="w-full h-full bg-orange-500/20 flex items-center justify-center text-orange-400 font-bold text-sm">
          {person.display_name[0]?.toUpperCase() ?? '?'}
        </div>
      )}
    </div>
  )
}

export default function PeoplePage() {
  const { user } = useAuth()
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<Profile[]>([])
  const [searching, setSearching] = useState(false)
  const [followStates, setFollowStates] = useState<Record<string, boolean>>({})
  const [following, setFollowing] = useState<Profile[]>([])
  const [loadingFollowing, setLoadingFollowing] = useState(true)
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  // Load the people this user already follows
  useEffect(() => {
    if (!user) { setLoadingFollowing(false); return }
    getFollowing()
      .then(setFollowing)
      .finally(() => setLoadingFollowing(false))
  }, [user])

  const search = useCallback(async (q: string) => {
    if (q.length < 2) { setResults([]); return }
    setSearching(true)
    try {
      const res = await fetch(`/api/search-users?q=${encodeURIComponent(q)}`)
      const { users } = await res.json()
      // Pre-populate follow state from the already-loaded following list
      const states: Record<string, boolean> = {}
      const followingIds = new Set(following.map(f => f.id))
      await Promise.all((users as Profile[]).map(async (u: Profile) => {
        states[u.id] = followingIds.has(u.id) || (await isFollowing(u.id))
      }))
      setFollowStates(states)
      setResults(users)
    } finally {
      setSearching(false)
    }
  }, [following])

  const handleInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value
    setQuery(val)
    if (debounceRef.current) clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(() => search(val), 350)
  }

  const toggleFollow = async (person: Profile) => {
    if (!user) return
    const currently = followStates[person.id] ?? following.some(f => f.id === person.id)
    if (currently) {
      setFollowStates(prev => ({ ...prev, [person.id]: false }))
      setFollowing(prev => prev.filter(f => f.id !== person.id))
      await unfollowUser(person.id)
    } else {
      setFollowStates(prev => ({ ...prev, [person.id]: true }))
      setFollowing(prev => [...prev, person])
      await followUser(person.id)
    }
  }

  const handleUnfollow = async (person: Profile) => {
    setFollowing(prev => prev.filter(f => f.id !== person.id))
    await unfollowUser(person.id)
  }

  if (!user) {
    return (
      <div className="max-w-xl mx-auto animate-fade-in">
        <div className="mb-6">
          <h1 className="text-2xl font-bold tracking-tight">Friends</h1>
        </div>
        <div className="text-center py-16 bg-[#110e0b] border border-white/5 rounded-2xl">
          <p className="text-zinc-300 mb-3">Sign in to find and follow friends</p>
          <Link href="/auth/signin" className="text-xs bg-orange-500 text-white font-semibold px-4 py-2 rounded-lg tracking-wide">Sign in</Link>
        </div>
      </div>
    )
  }

  return (
    <div className="max-w-xl mx-auto animate-fade-in space-y-8">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Friends</h1>
        <p className="text-zinc-400 text-xs uppercase tracking-widest mt-1">Follow friends to see their activity</p>
      </div>

      {/* ── Who you follow ─────────────────────────────────── */}
      <section>
        <h2 className="text-xs font-semibold text-zinc-400 uppercase tracking-widest mb-3">
          Following · {following.length}
        </h2>

        {loadingFollowing ? (
          <div className="space-y-2">
            {[...Array(3)].map((_, i) => <div key={i} className="h-14 shimmer rounded-xl" />)}
          </div>
        ) : following.length === 0 ? (
          <div className="bg-[#110e0b] border border-white/5 rounded-xl p-5 text-center">
            <p className="text-zinc-400 text-sm">You&apos;re not following anyone yet</p>
            <p className="text-zinc-500 text-xs mt-1">Search below to find friends</p>
          </div>
        ) : (
          <div className="space-y-2">
            {following.map((person) => (
              <div key={person.id} className="flex items-center gap-3 p-3 bg-[#110e0b] border border-white/5 rounded-xl">
                <Link href={`/u/${person.username}`} className="flex items-center gap-3 flex-1 min-w-0">
                  <Avatar person={person} />
                  <div className="min-w-0">
                    <p className="font-medium text-sm text-white truncate">{person.display_name}</p>
                    <p className="text-xs text-zinc-400">@{person.username}</p>
                  </div>
                </Link>
                <button
                  onClick={() => handleUnfollow(person)}
                  className="flex-shrink-0 text-xs font-semibold px-3 py-1.5 rounded-lg bg-white/5 border border-white/10 text-zinc-400 hover:text-red-400 hover:border-red-400/30 transition-all tracking-wide"
                >
                  Unfollow
                </button>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* ── Find more friends ──────────────────────────────── */}
      <section>
        <h2 className="text-xs font-semibold text-zinc-400 uppercase tracking-widest mb-3">Find friends</h2>

        <div className="relative mb-4">
          <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
          <input
            type="text"
            value={query}
            onChange={handleInput}
            placeholder="Search by name or @username…"
            autoFocus
            className="w-full bg-[#110e0b] border border-white/5 rounded-xl pl-10 pr-4 py-3 text-white placeholder-zinc-500 focus:outline-none focus:border-orange-500/40 transition-colors"
          />
          {searching && (
            <div className="absolute right-3 top-1/2 -translate-y-1/2">
              <div className="w-4 h-4 border-2 border-zinc-800 border-t-orange-400 rounded-full animate-spin" />
            </div>
          )}
        </div>

        {results.length > 0 ? (
          <div className="space-y-2">
            {results.map((person) => {
              const isAlreadyFollowing = followStates[person.id] ?? following.some(f => f.id === person.id)
              return (
                <div key={person.id} className="flex items-center gap-3 p-3 bg-[#110e0b] border border-white/5 rounded-xl">
                  <Link href={`/u/${person.username}`} className="flex items-center gap-3 flex-1 min-w-0">
                    <Avatar person={person} />
                    <div className="min-w-0">
                      <p className="font-medium text-sm text-white truncate">{person.display_name}</p>
                      <p className="text-xs text-zinc-400">@{person.username}</p>
                    </div>
                  </Link>
                  <button
                    onClick={() => toggleFollow(person)}
                    className={`flex-shrink-0 text-xs font-semibold px-4 py-1.5 rounded-lg transition-all tracking-wide ${
                      isAlreadyFollowing
                        ? 'bg-white/5 border border-white/10 text-zinc-400 hover:text-red-400 hover:border-red-400/30'
                        : 'bg-orange-500 hover:bg-orange-400 text-white shadow-[0_2px_10px_rgba(249,115,22,0.2)]'
                    }`}
                  >
                    {isAlreadyFollowing ? 'Following' : 'Follow'}
                  </button>
                </div>
              )
            })}
          </div>
        ) : query.length >= 2 && !searching ? (
          <p className="text-center text-zinc-400 py-8 text-sm">No results for &ldquo;{query}&rdquo;</p>
        ) : query.length === 0 ? (
          <p className="text-center text-zinc-500 text-sm py-4">Type at least 2 characters to search</p>
        ) : null}
      </section>
    </div>
  )
}
