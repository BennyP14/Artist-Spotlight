import { NextRequest, NextResponse } from 'next/server'

// Tags that are listener behaviour labels, not genres — filter these out
const NOISE_TAGS = new Set([
  'seen live', 'albums i own', 'favourite', 'favorites', 'favourites',
  'love', 'my favourites', 'loved', 'classic', 'awesome', 'great',
  'beautiful', 'amazing', 'best', 'good', 'cool', 'chill', 'epic',
  'underrated', 'overrated', 'legendary', 'all time favorite',
  'all time favourite', 'listened to', 'wishlist',
])

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const artist = searchParams.get('artist')
  if (!artist) return NextResponse.json({ genres: [] })

  const apiKey = process.env.LASTFM_API_KEY
  if (!apiKey) return NextResponse.json({ genres: [] })

  try {
    const res = await fetch(
      `https://ws.audioscrobbler.com/2.0/?method=artist.gettoptags&artist=${encodeURIComponent(artist)}&api_key=${apiKey}&format=json`,
      { next: { revalidate: 86400 } }
    )
    if (!res.ok) return NextResponse.json({ genres: [] })

    const data = await res.json()
    const tags: Array<{ name: string; count: number }> = data.toptags?.tag ?? []

    const genres = tags
      .filter((t) => t.count >= 15 && !NOISE_TAGS.has(t.name.toLowerCase()))
      .slice(0, 3)
      .map((t) => {
        // Capitalise each word for display consistency
        return t.name.replace(/\b\w/g, (c) => c.toUpperCase())
      })

    return NextResponse.json({ genres })
  } catch {
    return NextResponse.json({ genres: [] })
  }
}
