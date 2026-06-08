import Anthropic from '@anthropic-ai/sdk'

const client = new Anthropic()

export async function generateAlbumInsights(
  artistName: string,
  albumName: string,
  releaseYear: number,
  genres: string[]
): Promise<{
  aiContext: string
  eraContext: string
  chartInfo: string
}> {
  const message = await client.messages.create({
    model: 'claude-haiku-4-5',
    max_tokens: 900,
    system:
      'You are a passionate music fan with deep knowledge. Write like you\'re enthusiastically sharing why an album matters with a friend who\'s about to listen for the first time — warm, personal, and specific. Mention real songs, producers, studios, collaborators. Be factual and engaging, never encyclopaedic.',
    messages: [
      {
        role: 'user',
        content: `Write three sections about "${albumName}" by ${artistName} (${releaseYear}).

## Album Context
1-2 paragraphs. What does this album sound and feel like? What makes it special — key tracks, mood, sonic character?

## Era & Story
1 paragraph. What was going on in ${artistName}'s life and career when this was made? Any compelling recording stories or breakthroughs?

## Reception & Legacy
1 paragraph. How was it received and how is it remembered today? What's its place in the canon?

Genres: ${genres.join(', ')}. Use the exact headers above (##). Write with warmth and genuine enthusiasm — make the reader want to press play.`,
      },
    ],
  })

  const text = message.content[0].type === 'text' ? message.content[0].text : ''

  const extract = (heading: string, next: string) => {
    const re = new RegExp(`##\\s*${heading}([\\s\\S]*?)(?=##\\s*${next}|$)`, 'i')
    const match = text.match(re)
    return match ? match[1].trim() : ''
  }

  return {
    aiContext: extract('Album Context', 'Era'),
    eraContext: extract('Era & Story', 'Reception'),
    chartInfo: extract('Reception & Legacy', '$^'),
  }
}

export async function generateWikipediaSummary(query: string): Promise<string | null> {
  try {
    const res = await fetch(
      `https://en.wikipedia.org/api/rest/v1/page/summary/${encodeURIComponent(query)}`,
      { next: { revalidate: 86400 } }
    )
    if (!res.ok) return null
    const data = await res.json()
    return data.extract || null
  } catch {
    return null
  }
}
