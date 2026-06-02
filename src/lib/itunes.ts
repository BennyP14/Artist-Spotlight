export interface ItunesArtist {
  artistId: number
  artistName: string
  primaryGenreName: string
  artistLinkUrl: string
}

export interface ItunesAlbum {
  collectionId: number
  artistId: number
  collectionName: string
  artworkUrl100: string
  releaseDate: string
  trackCount: number
  collectionType: string
  collectionViewUrl: string
  primaryGenreName: string
}

export interface ItunesTrack {
  trackId: number
  trackName: string
  trackNumber: number
  trackTimeMillis: number
  trackExplicitness: string
  discNumber: number
}

export function hqArtwork(url: string): string {
  return url.replace('100x100bb', '600x600bb')
}

export async function searchArtists(query: string): Promise<ItunesArtist[]> {
  const res = await fetch(
    `https://itunes.apple.com/search?term=${encodeURIComponent(query)}&entity=musicArtist&limit=10`,
    { next: { revalidate: 3600 } }
  )
  const data = await res.json()
  return (data.results ?? []).filter((r: { wrapperType: string }) => r.wrapperType === 'artist')
}

export async function getArtistWithAlbums(
  artistId: number
): Promise<{ artist: ItunesArtist | null; albums: ItunesAlbum[] }> {
  const res = await fetch(
    `https://itunes.apple.com/lookup?id=${artistId}&entity=album&limit=200`,
    { next: { revalidate: 3600 } }
  )
  const data = await res.json()

  const artist = (data.results ?? []).find(
    (r: { wrapperType: string }) => r.wrapperType === 'artist'
  ) as ItunesArtist | undefined

  const seen = new Set<string>()
  const albums: ItunesAlbum[] = (data.results ?? [])
    .filter(
      (r: { wrapperType: string; collectionType: string }) =>
        r.wrapperType === 'collection' && r.collectionType === 'Album'
    )
    .sort(
      (a: ItunesAlbum, b: ItunesAlbum) =>
        new Date(a.releaseDate).getTime() - new Date(b.releaseDate).getTime()
    )
    .filter((a: ItunesAlbum) => {
      // Normalise name: strip edition/remaster suffixes so "OK Computer" and
      // "OK Computer (Deluxe Edition)" collapse to the same key. The earlier
      // (original) release wins because we sorted chronologically first.
      const key = a.collectionName
        .replace(/\s*[\(\[].*?(deluxe|extended|remaster|anniversary|special|expanded|bonus|edition|version|reissue|oknotok).*?[\)\]]/gi, '')
        .trim()
        .toLowerCase()
      if (seen.has(key)) return false
      seen.add(key)
      return true
    })
    .filter((a: ItunesAlbum) => a.trackCount > 6)

  return { artist: artist ?? null, albums }
}

export async function getAlbumTracks(albumId: number): Promise<ItunesTrack[]> {
  const res = await fetch(
    `https://itunes.apple.com/lookup?id=${albumId}&entity=song`,
    { next: { revalidate: 3600 } }
  )
  const data = await res.json()
  return (data.results ?? [])
    .filter((r: { wrapperType: string }) => r.wrapperType === 'track')
    .sort((a: ItunesTrack, b: ItunesTrack) => a.trackNumber - b.trackNumber)
}
