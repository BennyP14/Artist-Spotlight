'use client'

import { useState, Suspense } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/browser'

type Mode = 'signin' | 'signup'

function SignInForm() {
  const searchParams = useSearchParams()
  const router = useRouter()
  const next = searchParams.get('next') ?? '/'

  const [mode, setMode] = useState<Mode>('signin')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [googleLoading, setGoogleLoading] = useState(false)

  const supabase = createClient()

  const signInWithGoogle = async () => {
    setGoogleLoading(true)
    await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: `${window.location.origin}/auth/callback?next=${next}` },
    })
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)

    if (mode === 'signup' && password !== confirmPassword) {
      setError('Passwords do not match')
      return
    }
    if (password.length < 6) {
      setError('Password must be at least 6 characters')
      return
    }

    setLoading(true)
    try {
      if (mode === 'signin') {
        const { error } = await supabase.auth.signInWithPassword({ email, password })
        if (error) {
          if (error.message.includes('Invalid login credentials')) {
            setError('Incorrect email or password. New here? Create an account below.')
          } else {
            setError(error.message)
          }
          return
        }
        router.push(next)
        router.refresh()
      } else {
        const { error } = await supabase.auth.signUp({ email, password })
        if (error) {
          if (error.message.includes('already registered')) {
            setError('An account with this email already exists. Sign in instead.')
            setMode('signin')
          } else {
            setError(error.message)
          }
          return
        }
        // If email confirmation is off, user is signed in immediately
        router.push(next)
        router.refresh()
      }
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center px-4 bg-[#0c0a08]">
      <div className="w-full max-w-sm">

        {/* Logo */}
        <div className="flex items-center justify-center gap-3 mb-10">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-orange-500 to-orange-600 flex items-center justify-center shadow-[0_0_20px_rgba(249,115,22,0.4)]">
            <svg className="w-5 h-5 text-white" fill="currentColor" viewBox="0 0 20 20">
              <path d="M18 3a1 1 0 00-1.196-.98l-10 2A1 1 0 006 5v9.114A4.369 4.369 0 005 14c-1.657 0-3 .895-3 2s1.343 2 3 2 3-.895 3-2V7.82l8-1.6v5.894A4.37 4.37 0 0015 12c-1.657 0-3 .895-3 2s1.343 2 3 2 3-.895 3-2V3z" />
            </svg>
          </div>
          <span className="font-semibold text-lg tracking-wide">Artist Spotlight</span>
        </div>

        <div className="bg-[#110e0b] border border-white/5 rounded-2xl p-7">

          {/* Mode toggle */}
          <div className="flex gap-1 bg-white/5 rounded-lg p-1 mb-6">
            {(['signin', 'signup'] as Mode[]).map((m) => (
              <button
                key={m}
                onClick={() => { setMode(m); setError(null) }}
                className={`flex-1 text-xs font-medium py-1.5 rounded-md transition-all ${mode === m ? 'bg-white/10 text-white' : 'text-zinc-600 hover:text-zinc-400'}`}
              >
                {m === 'signin' ? 'Sign in' : 'Create account'}
              </button>
            ))}
          </div>

          {/* Google */}
          <button
            onClick={signInWithGoogle}
            disabled={googleLoading}
            className="w-full flex items-center justify-center gap-3 bg-white text-gray-900 font-semibold py-2.5 px-4 rounded-xl hover:bg-gray-100 transition-colors mb-4 disabled:opacity-50 text-sm"
          >
            <svg className="w-4 h-4" viewBox="0 0 24 24">
              <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
              <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
              <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
              <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
            </svg>
            Continue with Google
          </button>

          <div className="flex items-center gap-3 mb-4">
            <div className="flex-1 h-px bg-white/5" />
            <span className="text-zinc-700 text-xs uppercase tracking-widest">or</span>
            <div className="flex-1 h-px bg-white/5" />
          </div>

          {/* Email + password form */}
          <form onSubmit={handleSubmit} className="space-y-3">
            <input
              type="email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              placeholder="Email address"
              required
              autoFocus
              className="w-full bg-white/5 border border-white/5 rounded-xl px-4 py-3 text-white placeholder-zinc-700 focus:outline-none focus:border-orange-500/40 transition-colors text-sm"
            />
            <input
              type="password"
              value={password}
              onChange={e => setPassword(e.target.value)}
              placeholder={mode === 'signup' ? 'Create a password' : 'Password'}
              required
              className="w-full bg-white/5 border border-white/5 rounded-xl px-4 py-3 text-white placeholder-zinc-700 focus:outline-none focus:border-orange-500/40 transition-colors text-sm"
            />
            {mode === 'signup' && (
              <input
                type="password"
                value={confirmPassword}
                onChange={e => setConfirmPassword(e.target.value)}
                placeholder="Confirm password"
                required
                className="w-full bg-white/5 border border-white/5 rounded-xl px-4 py-3 text-white placeholder-zinc-700 focus:outline-none focus:border-orange-500/40 transition-colors text-sm"
              />
            )}

            {error && (
              <p className="text-xs text-red-400 bg-red-500/10 border border-red-500/20 rounded-lg px-3 py-2">
                {error}
              </p>
            )}

            <button
              type="submit"
              disabled={loading || !email || !password}
              className="w-full bg-orange-500 hover:bg-orange-400 text-white font-semibold py-3 rounded-xl transition-colors disabled:opacity-40 tracking-wide text-sm shadow-[0_4px_14px_rgba(249,115,22,0.25)]"
            >
              {loading ? '…' : mode === 'signin' ? 'Sign in' : 'Create account'}
            </button>
          </form>

          {mode === 'signin' && (
            <p className="text-center text-zinc-700 text-xs mt-4">
              No account yet?{' '}
              <button onClick={() => { setMode('signup'); setError(null) }} className="text-orange-400 hover:text-orange-300">
                Create one free
              </button>
            </p>
          )}
        </div>

        <p className="text-center text-zinc-800 text-xs mt-5 uppercase tracking-widest">
          Free · No subscription · Your data
        </p>
      </div>
    </div>
  )
}

export default function SignInPage() {
  return (
    <Suspense>
      <SignInForm />
    </Suspense>
  )
}
