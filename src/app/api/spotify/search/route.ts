import { NextRequest, NextResponse } from 'next/server'
import { searchArtists } from '@/lib/itunes'

export async function GET(request: NextRequest) {
  const q = request.nextUrl.searchParams.get('q')
  if (!q) return NextResponse.json({ error: 'Missing query' }, { status: 400 })

  try {
    const artists = await searchArtists(q)
    return NextResponse.json({ artists })
  } catch (err) {
    console.error('Artist search error:', err)
    return NextResponse.json({ error: 'Search failed' }, { status: 500 })
  }
}
