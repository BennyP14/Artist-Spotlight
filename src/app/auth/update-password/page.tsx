'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/browser'

export default function UpdatePasswordPage() {
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const router = useRouter()
  const supabase = createClient()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    if (password !== confirm) { setError('Passwords do not match'); return }
    if (password.length < 6) { setError('Password must be at least 6 characters'); return }
    setLoading(true)
    const { error } = await supabase.auth.updateUser({ password })
    if (error) { setError(error.message); setLoading(false); return }
    router.push('/')
  }

  return (
    <div className="min-h-screen flex items-center justify-center px-4 bg-[#0c0a08]">
      <div className="w-full max-w-sm">
        <div className="flex items-center justify-center gap-3 mb-10">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-orange-500 to-orange-600 flex items-center justify-center shadow-[0_0_20px_rgba(249,115,22,0.4)]">
            <svg className="w-5 h-5 text-white" fill="currentColor" viewBox="0 0 20 20">
              <path d="M18 3a1 1 0 00-1.196-.98l-10 2A1 1 0 006 5v9.114A4.369 4.369 0 005 14c-1.657 0-3 .895-3 2s1.343 2 3 2 3-.895 3-2V7.82l8-1.6v5.894A4.37 4.37 0 0015 12c-1.657 0-3 .895-3 2s1.343 2 3 2 3-.895 3-2V3z" />
            </svg>
          </div>
          <span className="font-semibold text-lg tracking-wide">Artist Spotlight</span>
        </div>

        <div className="bg-[#110e0b] border border-white/5 rounded-2xl p-7">
          <h1 className="text-xl font-bold tracking-tight mb-1">Set your password</h1>
          <p className="text-zinc-600 text-sm mb-6">Choose a password for your account</p>

          <form onSubmit={handleSubmit} className="space-y-3">
            <input
              type="password" value={password} onChange={e => setPassword(e.target.value)}
              placeholder="New password" required autoFocus
              className="w-full bg-white/5 border border-white/5 rounded-xl px-4 py-3 text-white placeholder-zinc-700 focus:outline-none focus:border-orange-500/40 transition-colors text-sm"
            />
            <input
              type="password" value={confirm} onChange={e => setConfirm(e.target.value)}
              placeholder="Confirm password" required
              className="w-full bg-white/5 border border-white/5 rounded-xl px-4 py-3 text-white placeholder-zinc-700 focus:outline-none focus:border-orange-500/40 transition-colors text-sm"
            />
            {error && (
              <p className="text-xs text-red-400 bg-red-500/10 border border-red-500/20 rounded-lg px-3 py-2">{error}</p>
            )}
            <button
              type="submit" disabled={loading || !password || !confirm}
              className="w-full bg-orange-500 hover:bg-orange-400 text-white font-semibold py-3 rounded-xl transition-colors disabled:opacity-40 tracking-wide text-sm shadow-[0_4px_14px_rgba(249,115,22,0.25)]"
            >
              {loading ? 'Saving…' : 'Set password'}
            </button>
          </form>
        </div>
      </div>
    </div>
  )
}
