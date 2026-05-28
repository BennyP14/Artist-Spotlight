let cachedToken: string | null = null
let tokenExpiry = 0

async function getAccessToken(): Promise<string> {
  if (cachedToken && Date.now() < tokenExpiry) return cachedToken

  const clientId = process.env.SPOTIFY_CLIENT_ID
  const clientSecret = process.env.SPOTIFY_CLIENT_SECRET

  if (!clientId || !clientSecret) {
    throw new Error('Missing Spotify credentials in environment variables')
  }

  const res = await fetch('https://accounts.spotify.com/api/token', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
      Authorization: `Basic ${Buffer.from(`${clientId}:${clientSecret}`).toString('base64')}`,
    },
    body: 'grant_type=client_credentials',
    cache: 'no-store',
  })

  if (!res.ok) throw new Error('Failed to get Spotify access token')

  const data = await res.json()
  cachedToken = data.access_token
  tokenExpiry = Date.now() + (data.expires_in - 60) * 1000

  return cachedToken!
}

async function spotifyFetch(path: string) {
  const token = await getAccessToken()
  const res = await fetch(`https://api.spotify.com/v1${path}`, {
    headers: { Authorization: `Bearer ${token}` },
    next: { revalidate: 3600 },
  })
  if (!res.ok) {
    const body = await res.text()
    throw new Error(`Spotify API error: ${res.status} ${path} — ${body}`)
  }
  return res.json()
}

export async function searchArtists(query: string) {
  const data = await spotifyFetch(
    `/search?q=${encodeURIComponent(query)}&type=artist&limit=8`
  )
  return data.artists.items
}

export async function getArtist(artistId: string) {
  return spotifyFetch(`/artists/${artistId}`)
}

export async function getArtistAlbums(artistId: string) {
  const data = await spotifyFetch(
    `/artists/${artistId}/albums?include_groups=album&limit=50&market=GB`
  )

  const seen = new Set<string>()
  const unique = data.items.filter((album: { name: string }) => {
    const key = album.name.toLowerCase()
    if (seen.has(key)) return false
    seen.add(key)
    return true
  })

  return unique.sort((a: { release_date: string }, b: { release_date: string }) =>
    new Date(a.release_date).getTime() - new Date(b.release_date).getTime()
  )
}

export async function getAlbumTracks(albumId: string) {
  const data = await spotifyFetch(`/albums/${albumId}/tracks?limit=50`)
  return data.items
}
