export interface SpotifyArtist {
  id: string
  name: string
  images: Array<{ url: string; width: number; height: number }>
  genres: string[]
  followers: { total: number }
  external_urls: { spotify: string }
  popularity: number
}

export interface SpotifyAlbum {
  id: string
  name: string
  release_date: string
  images: Array<{ url: string; width: number; height: number }>
  total_tracks: number
  album_type: 'album' | 'single' | 'compilation'
  external_urls: { spotify: string }
  artists: Array<{ id: string; name: string }>
}

export interface SpotifyTrack {
  id: string
  name: string
  track_number: number
  duration_ms: number
  preview_url: string | null
  explicit: boolean
}

export type AlbumStatus = 'unlistened' | 'listening' | 'complete'

export interface Spotlight {
  id: string
  artist_id: string
  artist_name: string
  artist_image_url: string | null
  artist_genres: string[]
  share_token: string
  is_collaborative: boolean
  created_at: string
  updated_at: string
}

export interface SpotlightAlbum {
  id: string
  spotlight_id: string
  album_id: string
  album_name: string
  release_date: string
  release_year: number
  image_url: string | null
  total_tracks: number
  album_type: string
  spotify_url: string | null
  status: AlbumStatus
  rank_position: number | null
  global_rank_position: number | null
  auto_score: number | null
  notes: string
  verdict: string
  completed_at: string | null
  created_at: string
  updated_at: string
}

export interface AlbumInsights {
  id: string
  album_id: string
  artist_name: string
  album_name: string
  ai_context: string | null
  era_context: string | null
  chart_info: string | null
  wikipedia_summary: string | null
  generated_at: string
}

export interface SpotlightWithAlbums extends Spotlight {
  spotlight_albums: SpotlightAlbum[]
}
