'use client'

import { useState, useEffect } from 'react'
import { getFollowing, createClosedSession } from '@/lib/supabase'

interface Friend {
  id: string
  username: string
  display_name: string
  avatar_url: string | null
}

export default function ClosedSessionInvite({ spotlightId, artistName }: { spotlightId: string; artistName: string }) {
  const [open, setOpen] = useState(false)
  const [friends, setFriends] = useState<Friend[]>([])
  const [selected, setSelected] = useState<string | null>(null)
  const [sending, setSending] = useState(false)
  const [sent, setSent] = useState(false)

  useEffect(() => {
    if (open) getFollowing().then(setFriends)
  }, [open])

  const send = async () => {
    if (!selected) return
    setSending(true)
    try {
      await createClosedSession(spotlightId, selected)
      setSent(true)
    } catch (e) {
      console.error(e)
    } finally {
      setSending(false)
    }
  }

  const close = () => { setOpen(false); setSent(false); setSelected(null) }

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="text-xs bg-white/5 hover:bg-white/10 border border-white/8 text-zinc-400 hover:text-white px-3 py-1.5 rounded-lg transition-colors flex items-center gap-1.5"
      >
        <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
        </svg>
        Closed Session
      </button>

      {open && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4 bg-black/70 backdrop-blur-sm" onClick={(e) => { if (e.target === e.currentTarget) close() }}>
          <div className="w-full max-w-md bg-[#111] border border-white/10 rounded-2xl overflow-hidden">

            {sent ? (
              /* ── Success state ── */
              <div className="p-8 text-center">
                <div className="w-12 h-12 bg-orange-500/10 rounded-full flex items-center justify-center mx-auto mb-4">
                  <svg className="w-6 h-6 text-orange-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                </div>
                <p className="text-white font-semibold mb-1">Invite sent</p>
                <p className="text-sm text-zinc-400 mb-6">Your friend will see it next time they open the app.</p>
                <button onClick={close} className="text-sm bg-white/8 hover:bg-white/12 text-white px-6 py-2.5 rounded-lg transition-colors">
                  Done
                </button>
              </div>
            ) : (
              <>
                {/* ── Header ── */}
                <div className="flex items-center justify-between p-5 border-b border-white/8">
                  <div className="flex items-center gap-2">
                    <svg className="w-4 h-4 text-orange-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                    </svg>
                    <h2 className="font-semibold text-white">Closed Session</h2>
                  </div>
                  <button onClick={close} className="text-zinc-600 hover:text-zinc-300 transition-colors">
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>

                {/* ── How it works ── */}
                <div className="p-5 border-b border-white/5">
                  <p className="text-xs text-zinc-500 uppercase tracking-widest mb-4">How it works</p>
                  <div className="space-y-3.5">
                    {[
                      { n: '1', text: `You and a friend each go through ${artistName}'s discography independently — no peeking` },
                      { n: '2', text: 'All ratings, notes and verdicts are sealed from each other throughout' },
                      { n: '3', text: 'Once you\'re both done, everything unlocks for a full side-by-side comparison' },
                    ].map(({ n, text }) => (
                      <div key={n} className="flex gap-3">
                        <span className="w-5 h-5 rounded-full bg-orange-500/15 text-orange-400 text-xs font-bold flex items-center justify-center flex-shrink-0 mt-0.5">{n}</span>
                        <p className="text-sm text-zinc-300 leading-snug">{text}</p>
                      </div>
                    ))}
                  </div>
                </div>

                {/* ── Friend picker ── */}
                <div className="p-5">
                  <p className="text-xs text-zinc-500 uppercase tracking-widest mb-3">Invite a friend</p>
                  {friends.length === 0 ? (
                    <p className="text-sm text-zinc-600 text-center py-6">No friends to invite yet — follow someone first.</p>
                  ) : (
                    <div className="space-y-1.5 max-h-52 overflow-y-auto">
                      {friends.map((f) => (
                        <button
                          key={f.id}
                          onClick={() => setSelected(f.id === selected ? null : f.id)}
                          className={`w-full flex items-center gap-3 p-2.5 rounded-xl transition-all text-left ${
                            selected === f.id
                              ? 'bg-orange-500/12 border border-orange-500/30'
                              : 'bg-white/3 border border-transparent hover:bg-white/6'
                          }`}
                        >
                          <div className="w-8 h-8 rounded-full bg-orange-500/20 flex items-center justify-center text-orange-400 text-sm font-bold flex-shrink-0">
                            {(f.display_name || f.username)[0].toUpperCase()}
                          </div>
                          <div className="min-w-0 flex-1">
                            <p className="text-sm font-medium text-white truncate">{f.display_name || f.username}</p>
                            <p className="text-xs text-zinc-500">@{f.username}</p>
                          </div>
                          {selected === f.id && (
                            <svg className="w-4 h-4 text-orange-400 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                            </svg>
                          )}
                        </button>
                      ))}
                    </div>
                  )}
                </div>

                {/* ── Actions ── */}
                <div className="flex gap-2 px-5 pb-5">
                  <button onClick={close} className="flex-1 text-sm text-zinc-400 hover:text-white bg-white/5 hover:bg-white/8 py-2.5 rounded-xl transition-colors">
                    Cancel
                  </button>
                  <button
                    onClick={send}
                    disabled={!selected || sending}
                    className="flex-1 text-sm font-semibold text-white bg-orange-500 hover:bg-orange-400 py-2.5 rounded-xl transition-colors disabled:opacity-40"
                  >
                    {sending ? 'Sending…' : 'Send Invite →'}
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </>
  )
}
