'use client'

import { useState } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/context/auth'

export default function NavUser() {
  const { user, profile, loading, signOut } = useAuth()
  const [open, setOpen] = useState(false)
  const router = useRouter()

  if (loading) return <div className="w-7 h-7 rounded-full bg-white/5 animate-pulse" />

  if (!user) {
    return (
      <Link
        href="/auth/signin"
        className="text-xs text-zinc-300 hover:text-white transition-colors uppercase tracking-widest font-medium"
      >
        Sign in
      </Link>
    )
  }

  const handleSignOut = async () => {
    setOpen(false)
    await signOut()
    router.push('/auth/signin')
  }

  return (
    <div className="relative">
      <button
        onClick={() => setOpen((o) => !o)}
        className="w-7 h-7 rounded-full overflow-hidden ring-1 ring-white/10 hover:ring-orange-500/40 transition-all flex-shrink-0"
      >
        {profile?.avatar_url ? (
          <Image src={profile.avatar_url} alt={profile.display_name ?? ''} width={28} height={28} className="object-cover" />
        ) : (
          <div className="w-full h-full bg-orange-500/20 flex items-center justify-center text-orange-400 text-xs font-bold">
            {(profile?.display_name ?? user.email ?? 'U')[0].toUpperCase()}
          </div>
        )}
      </button>

      {open && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
          <div className="absolute right-0 top-9 z-50 w-48 bg-[#1a1510] border border-white/8 rounded-xl shadow-2xl shadow-black/60 py-1 overflow-hidden">
            <div className="px-3 py-2 border-b border-white/5">
              <p className="text-xs font-medium text-white truncate">{profile?.display_name ?? user.email}</p>
              <p className="text-xs text-zinc-400 truncate">@{profile?.username}</p>
            </div>
            <Link href={`/u/${profile?.username}`} onClick={() => setOpen(false)}
              className="flex items-center gap-2 px-3 py-2 text-sm text-zinc-400 hover:text-white hover:bg-white/5 transition-colors">
              My Profile
            </Link>
            <Link href="/feed" onClick={() => setOpen(false)}
              className="flex items-center gap-2 px-3 py-2 text-sm text-zinc-400 hover:text-white hover:bg-white/5 transition-colors">
              Friend Feed
            </Link>
            <Link href="/people" onClick={() => setOpen(false)}
              className="flex items-center gap-2 px-3 py-2 text-sm text-zinc-400 hover:text-white hover:bg-white/5 transition-colors">
              Find Friends
            </Link>
            <button onClick={handleSignOut}
              className="w-full text-left flex items-center gap-2 px-3 py-2 text-sm text-zinc-600 hover:text-red-400 hover:bg-white/5 transition-colors border-t border-white/5 mt-1">
              Sign out
            </button>
          </div>
        </>
      )}
    </div>
  )
}
