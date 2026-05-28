import { NextRequest, NextResponse } from 'next/server'
import { getArtistWithAlbums } from '@/lib/itunes'

export async function GET(request: NextRequest) {
  const id = request.nextUrl.searchParams.get('id')
  if (!id) return NextResponse.json({ error: 'Missing artist id' }, { status: 400 })

  try {
    const { artist, albums } = await getArtistWithAlbums(Number(id))
    return NextResponse.json({ artist, albums })
  } catch (err) {
    console.error('Artist fetch error:', err)
    return NextResponse.json({ error: 'Failed to fetch artist data' }, { status: 500 })
  }
}
