'use client'

import { useEffect, useState } from 'react'
import { useParams } from 'next/navigation'
import Image from 'next/image'
import Link from 'next/link'
import { getProfile, getUserSpotlights, followUser, unfollowUser, isFollowing, getFollowerCount, getFollowingCount } from '@/lib/supabase'
import { useAuth } from '@/context/auth'

const EMOJIS = ['🔥', '💀', '👏', '💯', '🤔']

export default function ProfilePage() {
  const { username } = useParams<{ username: string }>()
  const { user, profile: myProfile } = useAuth()
  const [profile, setProfile] = useState<{ id: string; username: string; display_name: string; avatar_url: string | null; bio: string } | null>(null)
  const [spotlights, setSpotlights] = useState<{ id: string; artist_name: string; artist_image_url: string | null; spotlight_albums: { status: string }[] }[]>([])
  const [following, setFollowing] = useState(false)
  const [followers, setFollowers] = useState(0)
  const [followingCount, setFollowingCount] = useState(0)
  const [loading, setLoading] = useState(true)
  const [toggling, setToggling] = useState(false)

  const isMe = myProfile?.username === username

  useEffect(() => {
    async function load() {
      const p = await getProfile(username)
      if (!p) { setLoading(false); return }
      setProfile(p)
      const [s, f, fc, fgc] = await Promise.all([
        getUserSpotlights(p.id),
        user ? isFollowing(p.id) : Promise.resolve(false),
        getFollowerCount(p.id),
        getFollowingCount(p.id),
      ])
      setSpotlights(s as typeof spotlights)
      setFollowing(f)
      setFollowers(fc)
      setFollowingCount(fgc)
      setLoading(false)
    }
    load()
  }, [username, user])

  const toggleFollow = async () => {
    if (!user || isMe) return
    setToggling(true)
    if (following) {
      await unfollowUser(profile!.id)
      setFollowers((n) => n - 1)
    } else {
      await followUser(profile!.id)
      setFollowers((n) => n + 1)
    }
    setFollowing((f) => !f)
    setToggling(false)
  }

  if (loading) return (
    <div className="max-w-2xl mx-auto animate-pulse space-y-4 pt-4">
      <div className="h-24 bg-white/5 rounded-2xl" />
      <div className="grid grid-cols-2 gap-3">
        {[...Array(4)].map((_, i) => <div key={i} className="h-32 bg-white/5 rounded-xl" />)}
      </div>
    </div>
  )

  if (!profile) return (
    <div className="text-center py-20 text-zinc-600">
      <p className="text-lg">User not found</p>
      <Link href="/" className="text-orange-400 text-sm mt-2 inline-block">← Back home</Link>
    </div>
  )

  const complete = spotlights.reduce((n, s) => n + s.spotlight_albums.filter(a => a.status === 'complete').length, 0)

  return (
    <div className="max-w-2xl mx-auto animate-fade-in">
      {/* Profile header */}
      <div className="bg-[#110e0b] border border-white/5 rounded-2xl p-6 mb-6">
        <div className="flex items-start gap-4">
          <div className="w-16 h-16 rounded-2xl overflow-hidden flex-shrink-0 ring-1 ring-white/10">
            {profile.avatar_url ? (
              <Image src={profile.avatar_url} alt={profile.display_name} width={64} height={64} className="object-cover" />
            ) : (
              <div className="w-full h-full bg-orange-500/20 flex items-center justify-center text-orange-400 text-2xl font-bold">
                {profile.display_name[0].toUpperCase()}
              </div>
            )}
          </div>
          <div className="flex-1 min-w-0">
            <h1 className="text-xl font-bold tracking-tight">{profile.display_name}</h1>
            <p className="text-xs text-zinc-600 uppercase tracking-widest mt-0.5">@{profile.username}</p>
            {profile.bio && <p className="text-sm text-zinc-400 mt-2">{profile.bio}</p>}
            <div className="flex gap-5 mt-3 text-xs text-zinc-600">
              <span><span className="text-white font-semibold">{spotlights.length}</span> spotlights</span>
              <span><span className="text-white font-semibold">{complete}</span> albums complete</span>
              <span><span className="text-white font-semibold">{followers}</span> followers</span>
              <span><span className="text-white font-semibold">{followingCount}</span> following</span>
            </div>
          </div>
          {!isMe && user && (
            <button
              onClick={toggleFollow}
              disabled={toggling}
              className={`flex-shrink-0 text-xs font-semibold px-4 py-2 rounded-lg transition-all tracking-wide ${
                following
                  ? 'bg-white/5 border border-white/10 text-zinc-400 hover:text-red-400 hover:border-red-400/30'
                  : 'bg-orange-500 hover:bg-orange-400 text-white shadow-[0_4px_14px_rgba(249,115,22,0.25)]'
              }`}
            >
              {following ? 'Following' : 'Follow'}
            </button>
          )}
        </div>
      </div>

      {/* Spotlights grid */}
      <h2 className="text-xs text-zinc-600 uppercase tracking-widest mb-3">Spotlights</h2>
      {spotlights.length === 0 ? (
        <p className="text-center text-zinc-700 py-12 text-sm uppercase tracking-widest">No spotlights yet</p>
      ) : (
        <div className="grid grid-cols-2 gap-3">
          {spotlights.map((s) => {
            const total = s.spotlight_albums.length
            const done = s.spotlight_albums.filter(a => a.status === 'complete').length
            return (
              <div key={s.id} className="group bg-[#110e0b] border border-white/5 rounded-xl overflow-hidden hover:border-orange-500/20 transition-all">
                {s.artist_image_url && (
                  <div className="relative h-28 overflow-hidden">
                    <Image src={s.artist_image_url} alt={s.artist_name} fill className="object-cover group-hover:scale-105 transition-transform duration-500" />
                    <div className="absolute inset-0 bg-gradient-to-t from-[#110e0b] to-transparent" />
                  </div>
                )}
                <div className="p-3">
                  <p className="font-semibold text-sm tracking-tight">{s.artist_name}</p>
                  <p className="text-xs text-zinc-600 uppercase tracking-widest mt-0.5">{done}/{total} complete</p>
                  {total > 0 && (
                    <div className="mt-2 h-px bg-white/5 rounded-full overflow-hidden">
                      <div className="h-full bg-gradient-to-r from-orange-500 to-orange-400 rounded-full" style={{ width: `${(done / total) * 100}%` }} />
                    </div>
                  )}
                  <div className="flex gap-2 mt-3">
                    <Link
                      href={`/shared/${s.id}`}
                      className="flex-1 text-center text-xs py-1.5 bg-white/5 hover:bg-white/8 border border-white/5 rounded-lg text-zinc-400 hover:text-white transition-colors"
                    >
                      View
                    </Link>
                    {user && !isMe && (
                      <Link
                        href={`/compare/${s.id}`}
                        className="flex-1 text-center text-xs py-1.5 bg-orange-500/10 hover:bg-orange-500/20 border border-orange-500/20 rounded-lg text-orange-400 transition-colors"
                      >
                        Compare
                      </Link>
                    )}
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
