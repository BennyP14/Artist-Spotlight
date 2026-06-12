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
  albumId: string,
  userId?: string
): Promise<Record<string, number>> {
  let query = supabase
    .from('track_ratings')
    .select('track_id, rating')
    .eq('spotlight_id', spotlightId)
    .eq('album_id', albumId)
  if (userId) query = query.eq('user_id', userId)
  const { data, error } = await query
  if (error) {
    console.error('[getTrackRatings] failed — SQL migration may not have run yet', error)
    return {}
  }
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
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return
  const { error } = await supabase.from('track_ratings').upsert(
    { user_id: user.id, spotlight_id: spotlightId, album_id: albumId, track_id: trackId, track_name: trackName, rating },
    { onConflict: 'user_id,spotlight_id,album_id,track_id' }
  )
  if (error) throw error
}

export async function deleteTrackRating(
  spotlightId: string,
  albumId: string,
  trackId: string
) {
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return
  const { error } = await supabase.from('track_ratings')
    .delete()
    .eq('user_id', user.id)
    .eq('spotlight_id', spotlightId)
    .eq('album_id', albumId)
    .eq('track_id', trackId)
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

// ─── Closed Sessions ──────────────────────────────────────────────────────────

export type ClosedSessionStatus = 'pending' | 'active' | 'inviter_complete' | 'invitee_complete' | 'revealed' | 'declined'

export interface PendingInvite {
  id: string
  inviter_spotlight_id: string
  inviter_id: string
  status: string
  invited_at: string
  inviter_spotlight: { artist_name: string; artist_image_url: string | null } | null
  inviter_profile: { id: string; username: string; display_name: string; avatar_url: string | null } | null
}

export interface ActiveSession {
  id: string
  inviter_spotlight_id: string
  invitee_spotlight_id: string | null
  inviter_id: string
  invitee_id: string
  status: ClosedSessionStatus
  inviter_completed_at: string | null
  invitee_completed_at: string | null
  revealed_at: string | null
  partner_profile: { username: string; display_name: string; avatar_url: string | null } | null
  partner_spotlight_id: string | null
  partner_progress: { total: number; complete: number } | null
}

export async function createClosedSession(spotlightId: string, inviteeId: string): Promise<void> {
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Not authenticated')
  const { error } = await supabase.from('closed_sessions').insert({
    inviter_spotlight_id: spotlightId,
    inviter_id: user.id,
    invitee_id: inviteeId,
  })
  if (error) throw error
}

export async function getPendingInvites(): Promise<PendingInvite[]> {
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return []
  const { data } = await supabase
    .from('closed_sessions')
    .select('id, inviter_spotlight_id, inviter_id, status, invited_at, inviter_spotlight:inviter_spotlight_id(artist_name, artist_image_url)')
    .eq('invitee_id', user.id)
    .eq('status', 'pending')
    .order('invited_at', { ascending: false })
  if (!data?.length) return []
  const inviterIds = [...new Set(data.map((s) => s.inviter_id))]
  const { data: profiles } = await supabase
    .from('profiles')
    .select('id, username, display_name, avatar_url')
    .in('id', inviterIds)
  const profileMap = Object.fromEntries((profiles ?? []).map((p) => [p.id, p]))
  return data.map((s) => ({
    ...s,
    inviter_spotlight: Array.isArray(s.inviter_spotlight) ? (s.inviter_spotlight[0] ?? null) : s.inviter_spotlight,
    inviter_profile: profileMap[s.inviter_id] ?? null,
  })) as PendingInvite[]
}

export async function getClosedSessionForSpotlight(spotlightId: string): Promise<ActiveSession | null> {
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null
  const { data } = await supabase
    .from('closed_sessions')
    .select('id, inviter_spotlight_id, invitee_spotlight_id, inviter_id, invitee_id, status, inviter_completed_at, invitee_completed_at, revealed_at')
    .or(`inviter_spotlight_id.eq.${spotlightId},invitee_spotlight_id.eq.${spotlightId}`)
    .neq('status', 'declined')
    .neq('status', 'pending')
    .order('created_at', { ascending: false })
    .limit(1)
  const session = data?.[0]
  if (!session) return null
  const partnerId = session.inviter_id === user.id ? session.invitee_id : session.inviter_id
  const partnerSpotlightId = session.inviter_id === user.id ? session.invitee_spotlight_id : session.inviter_spotlight_id
  const [profileResult, albumsResult] = await Promise.all([
    supabase.from('profiles').select('username, display_name, avatar_url').eq('id', partnerId).single(),
    partnerSpotlightId
      ? supabase.from('spotlight_albums').select('status').eq('spotlight_id', partnerSpotlightId)
      : Promise.resolve({ data: null }),
  ])
  const partnerAlbums = albumsResult.data
  return {
    ...session,
    status: session.status as ClosedSessionStatus,
    partner_profile: profileResult.data ?? null,
    partner_spotlight_id: partnerSpotlightId,
    partner_progress: partnerAlbums
      ? { total: partnerAlbums.length, complete: partnerAlbums.filter((a) => a.status === 'complete').length }
      : null,
  }
}

export async function acceptClosedSession(sessionId: string, inviterSpotlightId: string): Promise<string> {
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Not authenticated')
  const spotlight = await getSpotlight(inviterSpotlightId)
  if (!spotlight) throw new Error('Spotlight not found')
  const { data: newSpotlight, error: spotlightError } = await supabase
    .from('spotlights')
    .insert({
      user_id: user.id,
      artist_id: spotlight.artist_id,
      artist_name: spotlight.artist_name,
      artist_image_url: spotlight.artist_image_url,
      artist_genres: spotlight.artist_genres,
    })
    .select()
    .single()
  if (spotlightError) throw spotlightError
  await bulkInsertAlbums(
    spotlight.spotlight_albums.map((a) => ({
      spotlight_id: newSpotlight.id,
      album_id: a.album_id,
      album_name: a.album_name,
      release_date: a.release_date,
      release_year: a.release_year,
      image_url: a.image_url,
      total_tracks: a.total_tracks,
      album_type: a.album_type,
      spotify_url: a.spotify_url,
      status: 'unlistened' as const,
      rank_position: null,
      global_rank_position: null,
      auto_score: null,
      notes: '',
      verdict: '',
      completed_at: null,
    }))
  )
  const { error } = await supabase.from('closed_sessions').update({
    invitee_spotlight_id: newSpotlight.id,
    status: 'active',
    accepted_at: new Date().toISOString(),
  }).eq('id', sessionId)
  if (error) throw error
  return newSpotlight.id
}

export async function declineClosedSession(sessionId: string): Promise<void> {
  const { error } = await supabase.from('closed_sessions').update({ status: 'declined' }).eq('id', sessionId)
  if (error) throw error
}

export async function markSessionComplete(sessionId: string): Promise<boolean> {
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Not authenticated')
  const { data: session } = await supabase
    .from('closed_sessions')
    .select('inviter_id, inviter_completed_at, invitee_completed_at')
    .eq('id', sessionId)
    .single()
  if (!session) throw new Error('Session not found')
  const isInviter = session.inviter_id === user.id
  const otherDone = isInviter ? !!session.invitee_completed_at : !!session.inviter_completed_at
  const update: Record<string, unknown> = {
    [isInviter ? 'inviter_completed_at' : 'invitee_completed_at']: new Date().toISOString(),
    status: otherDone ? 'revealed' : (isInviter ? 'inviter_complete' : 'invitee_complete'),
  }
  if (otherDone) update.revealed_at = new Date().toISOString()
  const { error } = await supabase.from('closed_sessions').update(update).eq('id', sessionId)
  if (error) throw error
  return otherDone
}

export interface RevealAlbum {
  albumId: string
  albumName: string
  imageUrl: string | null
  releaseYear: number
  totalTracks: number
  mine: { status: string; verdict: string; notes: string; rankPosition: number | null; trackRatings: Record<string, number> }
  theirs: { status: string; verdict: string; notes: string; rankPosition: number | null; trackRatings: Record<string, number> }
}

export interface RevealData {
  sessionId: string
  artistName: string
  artistImageUrl: string | null
  myName: string
  theirName: string
  albums: RevealAlbum[]
  syncScore: number
  agreedTracks: { trackName: string; albumName: string; rating: number }[]
  disputedTracks: { trackName: string; albumName: string; myRating: number; theirRating: number }[]
}

export async function getRevealData(sessionId: string): Promise<RevealData | null> {
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null

  const { data: session } = await supabase
    .from('closed_sessions')
    .select('inviter_spotlight_id, invitee_spotlight_id, inviter_id, invitee_id, status')
    .eq('id', sessionId)
    .single()
  if (!session || session.status !== 'revealed') return null

  const mySpotlightId = session.inviter_id === user.id ? session.inviter_spotlight_id : session.invitee_spotlight_id
  const theirSpotlightId = session.inviter_id === user.id ? session.invitee_spotlight_id : session.inviter_spotlight_id
  const theirUserId = session.inviter_id === user.id ? session.invitee_id : session.inviter_id

  if (!mySpotlightId || !theirSpotlightId) return null

  const [mySpotlight, theirSpotlight, myProfile, theirProfile, myRatings, theirRatings] = await Promise.all([
    getSpotlight(mySpotlightId),
    getSpotlight(theirSpotlightId),
    supabase.from('profiles').select('display_name, username').eq('id', user.id).single(),
    supabase.from('profiles').select('display_name, username').eq('id', theirUserId).single(),
    supabase.from('track_ratings').select('album_id, track_id, track_name, rating').eq('spotlight_id', mySpotlightId).eq('user_id', user.id),
    supabase.from('track_ratings').select('album_id, track_id, track_name, rating').eq('spotlight_id', theirSpotlightId).eq('user_id', theirUserId),
  ])

  if (!mySpotlight || !theirSpotlight) return null

  const myRatingsMap: Record<string, Record<string, { name: string; rating: number }>> = {}
  for (const r of myRatings.data ?? []) {
    if (!myRatingsMap[r.album_id]) myRatingsMap[r.album_id] = {}
    myRatingsMap[r.album_id][r.track_id] = { name: r.track_name, rating: r.rating }
  }
  const theirRatingsMap: Record<string, Record<string, { name: string; rating: number }>> = {}
  for (const r of theirRatings.data ?? []) {
    if (!theirRatingsMap[r.album_id]) theirRatingsMap[r.album_id] = {}
    theirRatingsMap[r.album_id][r.track_id] = { name: r.track_name, rating: r.rating }
  }

  const albums: RevealAlbum[] = mySpotlight.spotlight_albums.map((mine) => {
    const theirs = theirSpotlight.spotlight_albums.find((a) => a.album_id === mine.album_id)
    const myTrackRatings: Record<string, number> = {}
    const theirTrackRatings: Record<string, number> = {}
    for (const [tid, { rating }] of Object.entries(myRatingsMap[mine.album_id] ?? {})) myTrackRatings[tid] = rating
    for (const [tid, { rating }] of Object.entries(theirRatingsMap[mine.album_id] ?? {})) theirTrackRatings[tid] = rating
    return {
      albumId: mine.album_id,
      albumName: mine.album_name,
      imageUrl: mine.image_url,
      releaseYear: mine.release_year,
      totalTracks: mine.total_tracks,
      mine: { status: mine.status, verdict: mine.verdict, notes: mine.notes, rankPosition: mine.rank_position, trackRatings: myTrackRatings },
      theirs: theirs
        ? { status: theirs.status, verdict: theirs.verdict, notes: theirs.notes, rankPosition: theirs.rank_position, trackRatings: theirTrackRatings }
        : { status: 'unlistened', verdict: '', notes: '', rankPosition: null, trackRatings: {} },
    }
  }).sort((a, b) => a.releaseYear - b.releaseYear)

  // Compute sync stats across all rated tracks
  const agreedTracks: RevealData['agreedTracks'] = []
  const disputedTracks: RevealData['disputedTracks'] = []
  let totalCompared = 0

  for (const album of albums) {
    const allTrackIds = new Set([...Object.keys(album.mine.trackRatings), ...Object.keys(album.theirs.trackRatings)])
    for (const tid of allTrackIds) {
      const my = album.mine.trackRatings[tid]
      const their = album.theirs.trackRatings[tid]
      if (!my || !their) continue
      totalCompared++
      const trackName = myRatingsMap[album.albumId]?.[tid]?.name ?? theirRatingsMap[album.albumId]?.[tid]?.name ?? tid
      if (my === their) {
        agreedTracks.push({ trackName, albumName: album.albumName, rating: my })
      } else {
        disputedTracks.push({ trackName, albumName: album.albumName, myRating: my, theirRating: their })
      }
    }
  }

  disputedTracks.sort((a, b) => Math.abs(b.myRating - b.theirRating) - Math.abs(a.myRating - a.theirRating))
  const syncScore = totalCompared > 0 ? Math.round((agreedTracks.length / totalCompared) * 100) : 0

  return {
    sessionId,
    artistName: mySpotlight.artist_name,
    artistImageUrl: mySpotlight.artist_image_url,
    myName: myProfile.data?.display_name || myProfile.data?.username || 'You',
    theirName: theirProfile.data?.display_name || theirProfile.data?.username || 'Them',
    albums,
    syncScore,
    agreedTracks,
    disputedTracks,
  }
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
