import { NextRequest, NextResponse } from 'next/server'
import { generateAlbumInsights } from '@/lib/claude'
import { getAlbumInsights, saveAlbumInsights } from '@/lib/supabase'

export async function POST(request: NextRequest) {
  try {
    const { albumId, artistName, albumName, releaseYear, genres } = await request.json()

    if (!albumId || !artistName || !albumName) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
    }

    // Return cached insights if available
    const cached = await getAlbumInsights(albumId)
    if (cached) return NextResponse.json({ insights: cached })

    const claudeInsights = await generateAlbumInsights(artistName, albumName, releaseYear, genres ?? [])

    const insights = await saveAlbumInsights({
      album_id: albumId,
      artist_name: artistName,
      album_name: albumName,
      ai_context: claudeInsights.aiContext,
      era_context: claudeInsights.eraContext,
      chart_info: claudeInsights.chartInfo,
      wikipedia_summary: '',
    })

    return NextResponse.json({ insights })
  } catch (err) {
    console.error('Insights generation error:', err)
    return NextResponse.json({ error: 'Failed to generate insights' }, { status: 500 })
  }
}
