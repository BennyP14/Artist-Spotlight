'use client'

import { useState, useCallback, useRef } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { followUser, unfollowUser, isFollowing } from '@/lib/supabase'
import { useAuth } from '@/context/auth'

interface UserResult {
  id: string
  username: string
  display_name: string
  avatar_url: string | null
  following?: boolean
}

export default function PeoplePage() {
  const { user } = useAuth()
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<UserResult[]>([])
  const [searching, setSearching] = useState(false)
  const [followStates, setFollowStates] = useState<Record<string, boolean>>({})
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const search = useCallback(async (q: string) => {
    if (q.length < 2) { setResults([]); return }
    setSearching(true)
    try {
      const res = await fetch(`/api/search-users?q=${encodeURIComponent(q)}`)
      const { users } = await res.json()
      // Check follow state for each result
      const states: Record<string, boolean> = {}
      await Promise.all(users.map(async (u: UserResult) => {
        states[u.id] = await isFollowing(u.id)
      }))
      setFollowStates(states)
      setResults(users)
    } finally {
      setSearching(false)
    }
  }, [])

  const handleInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value
    setQuery(val)
    if (debounceRef.current) clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(() => search(val), 350)
  }

  const toggleFollow = async (userId: string) => {
    if (!user) return
    const currently = followStates[userId]
    setFollowStates(prev => ({ ...prev, [userId]: !currently }))
    if (currently) await unfollowUser(userId)
    else await followUser(userId)
  }

  return (
    <div className="max-w-xl mx-auto animate-fade-in">
      <div className="mb-6">
        <h1 className="text-2xl font-bold tracking-tight">Find Friends</h1>
        <p className="text-zinc-400 text-xs uppercase tracking-widest mt-1">Search by name or username</p>
      </div>

      {!user ? (
        <div className="text-center py-16 bg-[#110e0b] border border-white/5 rounded-2xl">
          <p className="text-zinc-300 mb-3">Sign in to find and follow friends</p>
          <Link href="/auth/signin" className="text-xs bg-orange-500 text-white font-semibold px-4 py-2 rounded-lg tracking-wide">Sign in</Link>
        </div>
      ) : (
        <>
          {/* Search input */}
          <div className="relative mb-4">
            <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
            <input
              type="text"
              value={query}
              onChange={handleInput}
              placeholder="Search people…"
              autoFocus
              className="w-full bg-[#110e0b] border border-white/5 rounded-xl pl-10 pr-4 py-3 text-white placeholder-zinc-700 focus:outline-none focus:border-orange-500/40 transition-colors"
            />
            {searching && (
              <div className="absolute right-3 top-1/2 -translate-y-1/2">
                <div className="w-4 h-4 border-2 border-zinc-800 border-t-orange-400 rounded-full animate-spin" />
              </div>
            )}
          </div>

          {/* Results */}
          {results.length > 0 ? (
            <div className="space-y-2">
              {results.map((person) => (
                <div key={person.id} className="flex items-center gap-3 p-3 bg-[#110e0b] border border-white/5 rounded-xl">
                  <Link href={`/u/${person.username}`} className="flex items-center gap-3 flex-1 min-w-0">
                    <div className="w-10 h-10 rounded-full overflow-hidden flex-shrink-0 ring-1 ring-white/5">
                      {person.avatar_url ? (
                        <Image src={person.avatar_url} alt={person.display_name} width={40} height={40} className="object-cover" />
                      ) : (
                        <div className="w-full h-full bg-orange-500/20 flex items-center justify-center text-orange-400 font-bold">
                          {person.display_name[0].toUpperCase()}
                        </div>
                      )}
                    </div>
                    <div className="min-w-0">
                      <p className="font-medium text-sm text-white truncate">{person.display_name}</p>
                      <p className="text-xs text-zinc-400 uppercase tracking-widest">@{person.username}</p>
                    </div>
                  </Link>
                  <button
                    onClick={() => toggleFollow(person.id)}
                    className={`flex-shrink-0 text-xs font-semibold px-4 py-1.5 rounded-lg transition-all tracking-wide ${
                      followStates[person.id]
                        ? 'bg-white/5 border border-white/10 text-zinc-400 hover:text-red-400 hover:border-red-400/30'
                        : 'bg-orange-500 hover:bg-orange-400 text-white shadow-[0_2px_10px_rgba(249,115,22,0.2)]'
                    }`}
                  >
                    {followStates[person.id] ? 'Following' : 'Follow'}
                  </button>
                </div>
              ))}
            </div>
          ) : query.length >= 2 && !searching ? (
            <p className="text-center text-zinc-400 py-10 text-sm uppercase tracking-widest">No users found for &ldquo;{query}&rdquo;</p>
          ) : query.length === 0 ? (
            <div className="text-center py-10 text-zinc-400">
              <p className="text-sm">Type a name or username to search</p>
              <p className="text-xs mt-1 uppercase tracking-widest">Once you follow someone, their activity appears in your feed</p>
            </div>
          ) : null}
        </>
      )}
    </div>
  )
}
