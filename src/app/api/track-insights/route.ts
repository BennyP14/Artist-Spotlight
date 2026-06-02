import { createClient } from '@/lib/supabase/server'
import Anthropic from '@anthropic-ai/sdk'
import { NextResponse } from 'next/server'

const anthropic = new Anthropic()

export async function POST(request: Request) {
  const { artistName, trackName, albumName, releaseYear } = await request.json()
  if (!artistName || !trackName || !albumName) {
    return NextResponse.json({ error: 'Missing fields' }, { status: 400 })
  }

  const supabase = await createClient()

  // Return cached version if it exists
  const { data: cached } = await supabase
    .from('track_insights')
    .select('summary')
    .eq('artist_name', artistName)
    .eq('track_name', trackName)
    .maybeSingle()

  if (cached) return NextResponse.json({ summary: cached.summary })

  // Generate with Claude
  const message = await anthropic.messages.create({
    model: 'claude-sonnet-4-6',
    max_tokens: 500,
    messages: [
      {
        role: 'user',
        content: `Write a concise 2–3 paragraph summary of the song "${trackName}" by ${artistName}, from the album "${albumName}" (${releaseYear}).

Cover:
- The song's origins and how it came to be written or recorded
- Notable instrumentation, production choices, or musical qualities
- What ${artistName} or collaborators have said about it, and its place within the album
- Any notable reception or lasting cultural significance

Draw from documented sources and the artist's own words where possible. Be factual and engaging — written for someone listening to this album for the first time. Do not use headers or bullet points, just flowing prose.`,
      },
    ],
  })

  const summary = message.content[0].type === 'text' ? message.content[0].text : ''

  // Cache it
  await supabase.from('track_insights').upsert(
    { artist_name: artistName, track_name: trackName, album_name: albumName, summary, generated_at: new Date().toISOString() },
    { onConflict: 'artist_name,track_name' }
  )

  return NextResponse.json({ summary })
}
