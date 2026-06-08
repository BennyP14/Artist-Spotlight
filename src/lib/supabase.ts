import { createClient as createBrowserSupabase } from '@/lib/supabase/browser'
import type { Spotlight, SpotlightAlbum, SpotlightWithAlbums, AlbumInsights } from '@/types'

export const supabase = createBrowserSupabase()

export async function createSpotlight(data: {
  artist_id: string
  artist_name: string
  artist_image_url: string | null
  artist_genres: string[]
}): Promise<Spotlight> {
  const { data: { user } } = await supabase.auth.getUser()
  const { data: spotlight, error } = await supabase
    .from('spotlights')
    .insert({ ...data, user_id: user?.id ?? null })
    .select()
    .single()
  if (error) throw error
  return spotlight
}

export async function getSpotlights(): Promise<(Spotlight & { spotlight_albums: { status: string }[] })[]> {
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return []
  const { data, error } = await supabase
    .from('spotlights')
    .select('*, spotlight_albums(status)')
    .eq('user_id', user.id)
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
  if (error) {
    console.error('[getSpotlight] error fetching spotlight', id, error)
    return null
  }
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

export async function updateSpotlightGenres(id: string, genres: string[]) {
  const { error } = await supabase
    .from('spotlights')
    .update({ artist_genres: genres })
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

export async function deleteSpotlight(id: string) {
  // spotlight_albums and related rows cascade-delete via FK
  const { error } = await supabase.from('spotlights').delete().eq('id', id)
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

// ─── Social ──────────────────────────────────────────────────────────────────

export async function getProfile(username: string) {
  const { data } = await supabase.from('profiles').select('*').eq('username', username).single()
  return data
}

export async function getProfileById(id: string) {
  const { data } = await supabase.from('profiles').select('*').eq('id', id).single()
  return data
}

export async function getUserSpotlights(userId: string): Promise<(Spotlight & { spotlight_albums: { status: string }[] })[]> {
  const { data } = await supabase
    .from('spotlights')
    .select('*, spotlight_albums(status)')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
  return (data ?? []) as (Spotlight & { spotlight_albums: { status: string }[] })[]
}

export async function followUser(followingId: string) {
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return
  await supabase.from('follows').insert({ follower_id: user.id, following_id: followingId })
}

export async function unfollowUser(followingId: string) {
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return
  await supabase.from('follows').delete().eq('follower_id', user.id).eq('following_id', followingId)
}

export async function isFollowing(followingId: string): Promise<boolean> {
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return false
  const { data } = await supabase
    .from('follows')
    .select('follower_id')
    .eq('follower_id', user.id)
    .eq('following_id', followingId)
    .maybeSingle()
  return !!data
}

export async function getFollowerCount(userId: string): Promise<number> {
  const { count } = await supabase.from('follows').select('*', { count: 'exact', head: true }).eq('following_id', userId)
  return count ?? 0
}

export async function getFollowingCount(userId: string): Promise<number> {
  const { count } = await supabase.from('follows').select('*', { count: 'exact', head: true }).eq('follower_id', userId)
  return count ?? 0
}

export async function getFollowing(): Promise<{ id: string; username: string; display_name: string; avatar_url: string | null }[]> {
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return []
  const { data: follows } = await supabase
    .from('follows')
    .select('following_id')
    .eq('follower_id', user.id)
  if (!follows?.length) return []
  const ids = follows.map((f) => f.following_id)
  const { data } = await supabase
    .from('profiles')
    .select('id, username, display_name, avatar_url')
    .in('id', ids)
  return (data ?? []) as { id: string; username: string; display_name: string; avatar_url: string | null }[]
}

export interface ActivityEvent {
  id: string
  user_id: string
  event_type: string
  spotlight_id: string | null
  album_id: string | null
  album_name: string | null
  artist_name: string | null
  metadata: Record<string, unknown>
  created_at: string
  profiles: { username: string; display_name: string; avatar_url: string | null }
  spotlights: { artist_name: string; artist_image_url: string | null } | null
}

export async function getFriendFeed(): Promise<ActivityEvent[]> {
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return []
  const { data: followData } = await supabase.from('follows').select('following_id').eq('follower_id', user.id)
  const friendIds = (followData ?? []).map((f) => f.following_id)
  if (!friendIds.length) return []
  const { data } = await supabase
    .from('activity_events')
    .select('*, profiles(username, display_name, avatar_url), spotlights(artist_name, artist_image_url)')
    .in('user_id', friendIds)
    .order('created_at', { ascending: false })
    .limit(50)
  return (data ?? []) as ActivityEvent[]
}

export async function logActivity(event: {
  event_type: string
  spotlight_id?: string
  album_id?: string
  album_name?: string
  artist_name?: string
  metadata?: Record<string, unknown>
}) {
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return
  await supabase.from('activity_events').insert({ ...event, user_id: user.id })
}

export async function getReactions(spotlightId: string, albumId?: string | null) {
  const query = supabase.from('reactions').select('emoji, user_id, profiles(username, display_name)').eq('spotlight_id', spotlightId)
  if (albumId) query.eq('album_id', albumId)
  else query.is('album_id', null)
  const { data } = await query
  return data ?? []
}

export async function toggleReaction(spotlightId: string, emoji: string, albumId?: string | null) {
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return
  const query = supabase.from('reactions')
    .select('id')
    .eq('user_id', user.id)
    .eq('spotlight_id', spotlightId)
    .eq('emoji', emoji)
  if (albumId) query.eq('album_id', albumId)
  else query.is('album_id', null)
  const { data: existing } = await query.maybeSingle()
  if (existing) {
    await supabase.from('reactions').delete().eq('id', existing.id)
  } else {
    await supabase.from('reactions').insert({ user_id: user.id, spotlight_id: spotlightId, album_id: albumId ?? null, emoji })
    await logActivity({
      event_type: 'reaction_added',
      spotlight_id: spotlightId,
      metadata: { emoji },
    })
  }
}

export async function getComments(spotlightId: string) {
  const { data } = await supabase
    .from('comments')
    .select('*, profiles(username, display_name, avatar_url)')
    .eq('spotlight_id', spotlightId)
    .is('album_id', null)
    .order('created_at', { ascending: true })
  return data ?? []
}

export async function addComment(spotlightId: string, content: string) {
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return
  await supabase.from('comments').insert({ user_id: user.id, spotlight_id: spotlightId, content })
  await logActivity({
    event_type: 'comment_added',
    spotlight_id: spotlightId,
    metadata: { comment_preview: content.substring(0, 120) },
  })
}

export async function getComparisonData(spotlightId1: string, spotlightId2: string) {
  const [s1, s2] = await Promise.all([getSpotlight(spotlightId1), getSpotlight(spotlightId2)])
  return { s1, s2 }
}

// ─── Global rankings ──────────────────────────────────────────────────────────

export interface GlobalAlbum extends SpotlightAlbum {
  artist_name: string
  artist_image_url: string | null
  spotlight_id: string
}

export async function getGlobalRankedAlbums(): Promise<GlobalAlbum[]> {
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return []
  const { data } = await supabase
    .from('spotlight_albums')
    .select('*, spotlights!inner(user_id, artist_name, artist_image_url)')
    .eq('status', 'complete')
    .eq('spotlights.user_id', user.id)
    .order('global_rank_position', { ascending: true, nullsFirst: false })
  return (data ?? []).map((a: SpotlightAlbum & { spotlights: { artist_name: string; artist_image_url: string | null } }) => ({
    ...a,
    artist_name: a.spotlights.artist_name,
    artist_image_url: a.spotlights.artist_image_url,
  })) as GlobalAlbum[]
}

export async function updateGlobalRanks(updates: Array<{ id: string; global_rank_position: number }>) {
  await Promise.all(
    updates.map(({ id, global_rank_position }) =>
      supabase.from('spotlight_albums').update({ global_rank_position }).eq('id', id)
    )
  )
}
