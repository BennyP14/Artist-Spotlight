import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

// Sentiment keywords for verdict analysis
const POSITIVE = ['masterpiece', 'perfect', 'brilliant', 'essential', 'flawless', 'incredible', 'stunning', 'best', 'classic', 'favourite', 'favorite', 'outstanding', 'exceptional', 'timeless', 'beautiful', 'iconic']
const NEGATIVE = ['disappointing', 'weak', 'poor', 'bad', 'worst', 'boring', 'forgettable', 'mediocre', 'overrated', 'skip', 'dull', 'underwhelming', 'inconsistent', 'filler']

function verdictScore(verdict: string | null, notes: string | null): number {
  const text = `${verdict ?? ''} ${notes ?? ''}`.toLowerCase()
  if (!text.trim()) return 0
  let score = 0
  for (const word of POSITIVE) if (text.includes(word)) score += 4
  for (const word of NEGATIVE) if (text.includes(word)) score -= 4
  return Math.max(-12, Math.min(12, score)) // cap at ±12
}

export async function POST() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  // Fetch all completed albums for this user across all spotlights
  const { data: albums, error } = await supabase
    .from('spotlight_albums')
    .select('id, album_id, spotlight_id, verdict, notes, spotlights!inner(user_id)')
    .eq('status', 'complete')
    .eq('spotlights.user_id', user.id)

  if (error || !albums) return NextResponse.json({ error: 'Failed to fetch albums' }, { status: 500 })

  // Fetch all track ratings for this user's albums in one shot
  const { data: ratings } = await supabase
    .from('track_ratings')
    .select('album_id, spotlight_id, rating')
    .in('spotlight_id', [...new Set(albums.map(a => a.spotlight_id))])

  // Build a map: `${spotlight_id}:${album_id}` → avg rating
  const ratingMap: Record<string, number> = {}
  if (ratings) {
    const groups: Record<string, number[]> = {}
    for (const r of ratings) {
      const key = `${r.spotlight_id}:${r.album_id}`
      if (!groups[key]) groups[key] = []
      groups[key].push(r.rating)
    }
    for (const [key, vals] of Object.entries(groups)) {
      ratingMap[key] = vals.reduce((a, b) => a + b, 0) / vals.length
    }
  }

  // Score each album
  const scored = albums.map(album => {
    const key = `${album.spotlight_id}:${album.album_id}`
    const avgRating = ratingMap[key] ?? null

    // Base score: track ratings (0–100) or neutral 50 if none
    const baseScore = avgRating !== null ? (avgRating / 5) * 100 : 50

    // Sentiment adjustment from verdict/notes (−12 to +12)
    const sentiment = verdictScore(album.verdict, album.notes)

    // Only auto-rank if we have track ratings OR a meaningful verdict
    const hasSignal = avgRating !== null || (album.verdict && album.verdict.length > 5)
    const finalScore = hasSignal ? Math.round(Math.min(100, Math.max(0, baseScore + sentiment))) : null

    return { id: album.id, score: finalScore }
  })

  // Sort by score desc (nulls at bottom), assign positions
  const withScore = scored.filter(a => a.score !== null).sort((a, b) => (b.score ?? 0) - (a.score ?? 0))
  const withoutScore = scored.filter(a => a.score === null)

  const updates = [
    ...withScore.map((a, i) => ({ id: a.id, global_rank_position: i + 1, auto_score: a.score })),
    ...withoutScore.map(a => ({ id: a.id, global_rank_position: null, auto_score: null })),
  ]

  // Batch update
  await Promise.all(
    updates.map(({ id, global_rank_position, auto_score }) =>
      supabase
        .from('spotlight_albums')
        .update({ global_rank_position, auto_score })
        .eq('id', id)
    )
  )

  return NextResponse.json({ ranked: withScore.length, unranked: withoutScore.length })
}
