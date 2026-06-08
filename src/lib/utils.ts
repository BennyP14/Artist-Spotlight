export function cn(...classes: (string | undefined | false | null)[]): string {
  return classes.filter(Boolean).join(' ')
}

export function formatDuration(ms: number): string {
  const total = Math.floor(ms / 1000)
  const m = Math.floor(total / 60)
  const s = total % 60
  return `${m}:${s.toString().padStart(2, '0')}`
}

export function formatYear(dateStr: string): number {
  return new Date(dateStr).getFullYear()
}

export function formatFollowers(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`
  if (n >= 1_000) return `${(n / 1_000).toFixed(0)}K`
  return n.toString()
}

export function appleMusicSearchUrl(artist: string, album: string): string {
  return `https://music.apple.com/search?term=${encodeURIComponent(`${artist} ${album}`)}`
}

export function spotifySearchUrl(artist: string, album: string): string {
  return `https://open.spotify.com/search/${encodeURIComponent(`${artist} ${album}`)}`
}

export function statusLabel(status: string): string {
  return { unlistened: 'Not Started', listening: 'Now Listening', complete: 'Complete' }[status] ?? status
}

export function statusColor(status: string): string {
  return (
    {
      unlistened: 'text-zinc-600 border border-zinc-800 bg-transparent',
      listening: 'text-amber-400 border border-amber-400/25 bg-amber-400/8',
      complete: 'text-orange-400 border border-orange-500/25 bg-orange-500/10',
    }[status] ?? 'text-zinc-600 border border-zinc-800 bg-transparent'
  )
}
