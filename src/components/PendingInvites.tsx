'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Image from 'next/image'
import { getPendingInvites, acceptClosedSession, declineClosedSession, type PendingInvite } from '@/lib/supabase'

export default function PendingInvites() {
  const router = useRouter()
  const [invites, setInvites] = useState<PendingInvite[]>([])
  const [acting, setActing] = useState<string | null>(null)

  useEffect(() => {
    getPendingInvites().then(setInvites)
  }, [])

  const accept = async (invite: PendingInvite) => {
    setActing(invite.id)
    try {
      const newSpotlightId = await acceptClosedSession(invite.id, invite.inviter_spotlight_id)
      setInvites((prev) => prev.filter((i) => i.id !== invite.id))
      router.push(`/spotlight/${newSpotlightId}`)
    } catch (e) {
      console.error(e)
    } finally {
      setActing(null)
    }
  }

  const decline = async (inviteId: string) => {
    setActing(inviteId)
    try {
      await declineClosedSession(inviteId)
      setInvites((prev) => prev.filter((i) => i.id !== inviteId))
    } finally {
      setActing(null)
    }
  }

  if (!invites.length) return null

  return (
    <div className="space-y-3 mb-6">
      {invites.map((invite) => {
        const inviterName = invite.inviter_profile?.display_name || invite.inviter_profile?.username || 'Someone'
        const artistName = invite.inviter_spotlight?.artist_name ?? 'an artist'
        const artistImg = invite.inviter_spotlight?.artist_image_url
        const isActing = acting === invite.id

        return (
          <div key={invite.id} className="bg-[#110e0b] border border-orange-500/20 rounded-2xl overflow-hidden">
            {/* Artist header */}
            <div className="relative h-16 overflow-hidden bg-zinc-900">
              {artistImg && (
                <Image src={artistImg} alt={artistName} fill className="object-cover object-top opacity-25 blur-sm scale-105" />
              )}
              <div className="absolute inset-0 bg-gradient-to-r from-[#110e0b]/90 to-[#110e0b]/40" />
              <div className="absolute inset-0 flex items-center gap-3 px-4">
                <svg className="w-4 h-4 text-orange-400 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                </svg>
                <div>
                  <p className="text-xs text-orange-400 uppercase tracking-widest font-medium">Closed Session</p>
                  <p className="text-sm font-semibold text-white">{inviterName} wants to go head-to-head on {artistName}</p>
                </div>
              </div>
            </div>

            {/* Pitch */}
            <div className="px-4 py-4">
              <p className="text-sm text-zinc-300 mb-3">You each listen independently and keep your opinions to yourself. When you&apos;re both done, the reveal drops — ratings, notes, verdicts, all of it side by side.</p>
              <div className="space-y-1.5">
                {[
                  `No peeking at what ${inviterName} thinks until the very end`,
                  'Your own copy of the spotlight — rate and review completely freely',
                  'The bigger the disagreement, the better the conversation',
                ].map((line, i) => (
                  <div key={i} className="flex items-start gap-2">
                    <span className="text-orange-500 text-xs mt-0.5 flex-shrink-0">—</span>
                    <p className="text-xs text-zinc-500 leading-snug">{line}</p>
                  </div>
                ))}
              </div>
            </div>

            {/* Actions */}
            <div className="flex gap-2 px-4 pb-4">
              <button
                onClick={() => decline(invite.id)}
                disabled={!!acting}
                className="flex-1 text-sm text-zinc-500 hover:text-white bg-white/5 hover:bg-white/8 py-2.5 rounded-xl transition-colors disabled:opacity-40"
              >
                Not this time
              </button>
              <button
                onClick={() => accept(invite)}
                disabled={!!acting}
                className="flex-1 text-sm font-semibold text-white bg-orange-500 hover:bg-orange-400 py-2.5 rounded-xl transition-colors disabled:opacity-40 flex items-center justify-center gap-2"
              >
                {isActing ? (
                  <>
                    <div className="w-3.5 h-3.5 border border-white/40 border-t-white rounded-full animate-spin" />
                    Setting up…
                  </>
                ) : "I'm in →"}
              </button>
            </div>
          </div>
        )
      })}
    </div>
  )
}
