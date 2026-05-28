import { createClient } from '@supabase/supabase-js'
import type { Spotlight, SpotlightAlbum, SpotlightWithAlbums, AlbumInsights } from '@/types'

function getClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  if (!url || !key) throw new Error('Missing Supabase environment variables')
  return createClient(url, key)
}

export const supabase = getClient()

export async function createSpotlight(data: {
  artist_id: string
  artist_name: string
  artist_image_url: string | null
  artist_genres: string[]
}): Promise<Spotlight> {
  const { data: spotlight, error } = await supabase
    .from('spotlights')
    .insert(data)
    .select()
    .single()
  if (error) throw error
  return spotlight
}

export async function getSpotlights(): Promise<(Spotlight & { spotlight_albums: { status: string }[] })[]> {
  const { data, error } = await supabase
    .from('spotlights')
    .select('*, spotlight_albums(status)')
    .order('created_at', { ascending: false })
  if (error) throw error
  return (data ?? []) as (Spotlight & { spotlight_albums: { status: string }[] })[]
}

export async function getSpotlight(id: string): Promise<SpotlightWithAlbums | null> {
  const { data, error } = await supabase
    .from('spotlights')
    .select('*, spotlight_albums(*)')
    .eq('id', id)
    .single()
  if (error) return null
  return data
}

export async function getSpotlightByToken(token: string): Promise<SpotlightWithAlbums | null> {
  const { data, error } = await supabase
    .from('spotlights')
    .select('*, spotlight_albums(*)')
    .eq('share_token', token)
    .single()
  if (error) return null
  return data
}

export async function bulkInsertAlbums(albums: Omit<SpotlightAlbum, 'id' | 'created_at' | 'updated_at'>[]) {
  const { error } = await supabase.from('spotlight_albums').insert(albums)
  if (error) throw error
}

export async function updateAlbumStatus(id: string, status: SpotlightAlbum['status']) {
  const updates: Record<string, unknown> = { status, updated_at: new Date().toISOString() }
  if (status === 'complete') updates.completed_at = new Date().toISOString()
  const { error } = await supabase.from('spotlight_albums').update(updates).eq('id', id)
  if (error) throw error
}

export async function updateAlbumVerdict(id: string, verdict: string) {
  const { error } = await supabase
    .from('spotlight_albums')
    .update({ verdict, updated_at: new Date().toISOString() })
    .eq('id', id)
  if (error) throw error
}

export async function updateAlbumNotes(id: string, notes: string) {
  const { error } = await supabase
    .from('spotlight_albums')
    .update({ notes, updated_at: new Date().toISOString() })
    .eq('id', id)
  if (error) throw error
}

export async function updateAlbumRanks(updates: Array<{ id: string; rank_position: number | null }>) {
  await Promise.all(
    updates.map(({ id, rank_position }) =>
      supabase
        .from('spotlight_albums')
        .update({ rank_position, updated_at: new Date().toISOString() })
        .eq('id', id)
    )
  )
}

export async function getAlbumInsights(albumId: string): Promise<AlbumInsights | null> {
  const { data } = await supabase
    .from('album_insights')
    .select('*')
    .eq('album_id', albumId)
    .single()
  return data
}

export async function removeAlbumFromSpotlight(id: string) {
  const { error } = await supabase.from('spotlight_albums').delete().eq('id', id)
  if (error) throw error
}

export async function getTrackRatings(
  spotlightId: string,
  albumId: string
): Promise<Record<string, number>> {
  const { data } = await supabase
    .from('track_ratings')
    .select('track_id, rating')
    .eq('spotlight_id', spotlightId)
    .eq('album_id', albumId)
  const map: Record<string, number> = {}
  for (const row of data ?? []) map[row.track_id] = row.rating
  return map
}

export async function upsertTrackRating(
  spotlightId: string,
  albumId: string,
  trackId: string,
  trackName: string,
  rating: number
) {
  const { error } = await supabase.from('track_ratings').upsert(
    { spotlight_id: spotlightId, album_id: albumId, track_id: trackId, track_name: trackName, rating },
    { onConflict: 'spotlight_id,album_id,track_id' }
  )
  if (error) throw error
}

export async function getSpotlightsWithRankedAlbums(): Promise<SpotlightWithAlbums[]> {
  const { data, error } = await supabase
    .from('spotlights')
    .select('*, spotlight_albums(*)')
    .order('created_at', { ascending: false })
  if (error) throw error
  return (data ?? []).map((s) => ({
    ...s,
    spotlight_albums: (s.spotlight_albums ?? [])
      .filter((a: SpotlightAlbum) => a.rank_position !== null)
      .sort((a: SpotlightAlbum, b: SpotlightAlbum) => (a.rank_position ?? 0) - (b.rank_position ?? 0)),
  }))
}

export async function saveAlbumInsights(data: {
  album_id: string
  artist_name: string
  album_name: string
  ai_context: string
  era_context: string
  chart_info: string
  wikipedia_summary: string
}): Promise<AlbumInsights> {
  const { data: insights, error } = await supabase
    .from('album_insights')
    .upsert({ ...data, generated_at: new Date().toISOString() }, { onConflict: 'album_id' })
    .select()
    .single()
  if (error) throw error
  return insights
}
