import { NextRequest, NextResponse } from 'next/server'
import { getAlbumTracks } from '@/lib/itunes'

export async function GET(request: NextRequest) {
  const albumId = request.nextUrl.searchParams.get('albumId')
  if (!albumId) return NextResponse.json({ error: 'Missing albumId' }, { status: 400 })

  try {
    const tracks = await getAlbumTracks(Number(albumId))
    return NextResponse.json({ tracks })
  } catch (err) {
    console.error('Tracks fetch error:', err)
    return NextResponse.json({ error: 'Failed to fetch tracks' }, { status: 500 })
  }
}
