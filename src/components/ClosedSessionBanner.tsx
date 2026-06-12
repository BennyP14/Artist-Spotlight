'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { markSessionComplete } from '@/lib/supabase'
import type { ActiveSession } from '@/lib/supabase'

export default function ClosedSessionBanner({
  session,
  myAlbumCount,
  myCompleteCount,
  onSessionUpdate,
}: {
  session: ActiveSession
  myAlbumCount: number
  myCompleteCount: number
  onSessionUpdate: () => void
}) {
  const router = useRouter()
  const [marking, setMarking] = useState(false)
  const [confirming, setConfirming] = useState(false)

  const partnerName = session.partner_profile?.display_name || session.partner_profile?.username || 'Your friend'
  const allMyAlbumsDone = myAlbumCount > 0 && myCompleteCount === myAlbumCount
  const iWaiting = session.status === 'inviter_complete' || session.status === 'invitee_complete'
  const isRevealed = session.status === 'revealed'
  const partnerDone = session.partner_progress
    ? session.partner_progress.complete === session.partner_progress.total && session.partner_progress.total > 0
    : false

  const handleMarkDone = async () => {
    setMarking(true)
    try {
      const revealed = await markSessionComplete(session.id)
      if (revealed) {
        router.push(`/closed-session/${session.id}/reveal`)
      } else {
        onSessionUpdate()
      }
    } catch (e) {
      console.error(e)
    } finally {
      setMarking(false)
      setConfirming(false)
    }
  }

  if (isRevealed) {
    return (
      <div className="mb-6 bg-gradient-to-r from-orange-500/10 to-amber-500/5 border border-orange-500/25 rounded-2xl p-4 flex items-center justify-between gap-3">
        <div className="flex items-center gap-2.5">
          <svg className="w-4 h-4 text-orange-400 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
          </svg>
          <div>
            <p className="text-sm font-semibold text-orange-400">Closed Session complete</p>
            <p className="text-xs text-zinc-400">Both you and {partnerName} have finished</p>
          </div>
        </div>
        <a
          href={`/closed-session/${session.id}/reveal`}
          className="text-xs bg-orange-500 hover:bg-orange-400 text-white font-semibold px-3 py-1.5 rounded-lg transition-colors flex-shrink-0"
        >
          See the reveal →
        </a>
      </div>
    )
  }

  return (
    <div className="mb-6 bg-[#110e0b] border border-white/8 rounded-2xl overflow-hidden">
      {/* Header */}
      <div className="flex items-center gap-2 px-4 pt-4 pb-3 border-b border-white/5">
        <svg className="w-3.5 h-3.5 text-orange-400 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
        </svg>
        <span className="text-xs font-semibold text-orange-400 uppercase tracking-widest">Closed Session</span>
        <span className="text-zinc-700 text-xs">·</span>
        <span className="text-xs text-zinc-400">with {partnerName}</span>
      </div>

      {/* Progress */}
      <div className="px-4 py-3 space-y-2.5">
        <div className="flex items-center justify-between">
          <span className="text-sm text-zinc-300">You</span>
          <span className={`text-sm ${allMyAlbumsDone ? 'text-orange-400 font-medium' : 'text-zinc-400'}`}>
            {myCompleteCount}/{myAlbumCount} complete{allMyAlbumsDone ? ' ✓' : ''}
          </span>
        </div>
        <div className="flex items-center justify-between">
          <span className="text-sm text-zinc-300">{partnerName}</span>
          {session.partner_progress ? (
            <span className={`text-sm ${partnerDone ? 'text-orange-400 font-medium' : 'text-zinc-400'}`}>
              {session.partner_progress.complete}/{session.partner_progress.total} complete{partnerDone ? ' ✓' : ''}
            </span>
          ) : (
            <span className="text-sm text-zinc-600">Not started yet</span>
          )}
        </div>
      </div>

      {/* Sealed reminder */}
      <div className="px-4 pb-3">
        <p className="text-xs text-zinc-600">
          {iWaiting
            ? `Waiting for ${partnerName} to finish — your takes are sealed.`
            : 'Your ratings, notes and verdicts are sealed until you\'re both done.'}
        </p>
      </div>

      {/* Done CTA — only when all your albums are complete and you haven't already marked done */}
      {allMyAlbumsDone && !iWaiting && (
        <div className="px-4 pb-4 pt-1 border-t border-white/5">
          {!confirming ? (
            <button
              onClick={() => setConfirming(true)}
              className="w-full text-sm font-semibold text-white bg-orange-500 hover:bg-orange-400 py-2.5 rounded-xl transition-colors"
            >
              I'm done — seal my session →
            </button>
          ) : (
            <div className="space-y-2">
              <p className="text-xs text-zinc-500 text-center">Your ratings and notes will be locked. You won't be able to edit them after this.</p>
              <div className="flex gap-2">
                <button onClick={() => setConfirming(false)} className="flex-1 text-sm text-zinc-400 bg-white/5 hover:bg-white/8 py-2.5 rounded-xl transition-colors">
                  Go back
                </button>
                <button
                  onClick={handleMarkDone}
                  disabled={marking}
                  className="flex-1 text-sm font-semibold text-white bg-orange-500 hover:bg-orange-400 py-2.5 rounded-xl transition-colors disabled:opacity-50"
                >
                  {marking ? 'Saving…' : 'Confirm'}
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
