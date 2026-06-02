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
      'You are a knowledgeable music journalist. Write concise, engaging, factual insights. Be specific — mention real songs, producers, studios, collaborators where relevant.',
    messages: [
      {
        role: 'user',
        content: `Provide three sections about "${albumName}" by ${artistName} (${releaseYear}).

## Album Context
1-2 paragraphs. What defines this album's sound, key tracks, and what it feels like to listen to?

## Era & Story
1 paragraph. What was happening in ${artistName}'s career during this period? Notable recording details or breakthroughs?

## Reception & Legacy
1 paragraph. Critical/commercial reception and how it's regarded today.

Genres: ${genres.join(', ')}. Use the exact headers above (##). Be concise and human, not encyclopaedic.`,
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
