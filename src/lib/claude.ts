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
    model: 'claude-sonnet-4-6',
    max_tokens: 1800,
    system:
      'You are a knowledgeable music journalist with deep expertise across all genres. Write engaging, factual insights that make a listener excited to hear an album. Be specific — mention real songs, producers, studios, collaborators where relevant.',
    messages: [
      {
        role: 'user',
        content: `Provide three distinct sections of insights about "${albumName}" by ${artistName} (${releaseYear}).

## Album Context
2-3 paragraphs. What defines this album's sound? What was the band/artist trying to achieve artistically? What are the key tracks and why do they matter? What does it feel like to listen to?

## Era & Story
1-2 paragraphs. What was happening in ${artistName}'s career and personal life during this period? Any notable recording sessions, tensions, lineup changes, or creative breakthroughs? What made ${releaseYear} significant for them?

## Reception & Legacy
1 paragraph. How was this received critically and commercially at release? How is it regarded now — is it considered a classic, underrated, divisive? Any notable chart positions, awards, or lasting cultural influence?

Genres context: ${genres.join(', ')}

Use the exact section headers shown above (##). Keep it human and engaging, not encyclopaedic.`,
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
