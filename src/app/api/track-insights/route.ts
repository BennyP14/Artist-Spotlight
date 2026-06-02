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

  // Return cached version instantly as JSON
  const { data: cached } = await supabase
    .from('track_insights')
    .select('summary')
    .eq('artist_name', artistName)
    .eq('track_name', trackName)
    .maybeSingle()

  if (cached) return NextResponse.json({ summary: cached.summary })

  // Stream from Claude Haiku (fast model) so text appears immediately
  const prompt = `Write a concise 2–3 paragraph summary of the song "${trackName}" by ${artistName}, from the album "${albumName}" (${releaseYear}).

Cover: the song's origins and how it came to be written or recorded; notable instrumentation or production choices; what ${artistName} or collaborators have said about it, and its place within the album; any notable reception or lasting significance.

Draw from documented sources and the artist's own words where possible. Be factual and engaging. No headers or bullet points — flowing prose only.`

  const stream = anthropic.messages.stream({
    model: 'claude-haiku-4-5',
    max_tokens: 350,
    messages: [{ role: 'user', content: prompt }],
  })

  const encoder = new TextEncoder()
  let fullText = ''

  const readable = new ReadableStream({
    async start(controller) {
      for await (const chunk of stream) {
        if (
          chunk.type === 'content_block_delta' &&
          chunk.delta.type === 'text_delta'
        ) {
          const text = chunk.delta.text
          fullText += text
          controller.enqueue(encoder.encode(text))
        }
      }
      controller.close()

      // Cache after streaming completes
      await supabase.from('track_insights').upsert(
        {
          artist_name: artistName,
          track_name: trackName,
          album_name: albumName,
          summary: fullText,
          generated_at: new Date().toISOString(),
        },
        { onConflict: 'artist_name,track_name' }
      )
    },
  })

  return new Response(readable, {
    headers: { 'Content-Type': 'text/plain; charset=utf-8' },
  })
}
