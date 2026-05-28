import { ImageResponse } from 'next/og'
import { NextRequest } from 'next/server'
import { getSpotlight } from '@/lib/supabase'
import type { SpotlightAlbum } from '@/types'

export const runtime = 'nodejs'

export async function GET(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const spotlight = await getSpotlight(id)

  if (!spotlight) {
    return new ImageResponse(
      <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#09090b', color: '#888', fontFamily: 'sans-serif', fontSize: 32 }}>
        Spotlight not found
      </div>,
      { width: 1200, height: 630 }
    )
  }

  const ranked = (spotlight.spotlight_albums ?? [])
    .filter((a: SpotlightAlbum) => a.rank_position !== null)
    .sort((a: SpotlightAlbum, b: SpotlightAlbum) => (a.rank_position ?? 0) - (b.rank_position ?? 0))
    .slice(0, 8)

  const total = spotlight.spotlight_albums?.length ?? 0
  const complete = spotlight.spotlight_albums?.filter((a: SpotlightAlbum) => a.status === 'complete').length ?? 0

  return new ImageResponse(
    (
      <div style={{ width: '100%', height: '100%', display: 'flex', background: '#09090b', fontFamily: 'sans-serif', padding: '52px' }}>
        {/* Left panel */}
        <div style={{ display: 'flex', flexDirection: 'column', width: '38%', paddingRight: '40px' }}>
          {spotlight.artist_image_url && (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={spotlight.artist_image_url}
              alt=""
              width={110}
              height={110}
              style={{ borderRadius: 16, objectFit: 'cover' }}
            />
          )}
          <div style={{ display: 'flex', flexDirection: 'column', marginTop: 24 }}>
            <span style={{ fontSize: 13, color: '#f59e0b', textTransform: 'uppercase', letterSpacing: '0.15em', fontWeight: 600 }}>
              Artist Spotlight
            </span>
            <span style={{ fontSize: 40, fontWeight: 800, color: '#ffffff', marginTop: 10, lineHeight: 1.1 }}>
              {spotlight.artist_name}
            </span>
            {spotlight.artist_genres.length > 0 && (
              <span style={{ fontSize: 15, color: '#888', marginTop: 10, textTransform: 'capitalize' }}>
                {spotlight.artist_genres.slice(0, 2).join(' · ')}
              </span>
            )}
            <div style={{ display: 'flex', gap: 24, marginTop: 28 }}>
              <div style={{ display: 'flex', flexDirection: 'column' }}>
                <span style={{ fontSize: 28, fontWeight: 700, color: '#22c55e' }}>{complete}</span>
                <span style={{ fontSize: 12, color: '#666', marginTop: 2 }}>Complete</span>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column' }}>
                <span style={{ fontSize: 28, fontWeight: 700, color: '#ffffff' }}>{total}</span>
                <span style={{ fontSize: 12, color: '#666', marginTop: 2 }}>Total</span>
              </div>
            </div>
          </div>
          <div style={{ marginTop: 'auto', display: 'flex', alignItems: 'center', gap: 8 }}>
            <div style={{ width: 20, height: 20, borderRadius: 5, background: '#f59e0b', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <span style={{ fontSize: 12, color: '#000' }}>♪</span>
            </div>
            <span style={{ fontSize: 13, color: '#555' }}>Artist Spotlight</span>
          </div>
        </div>

        {/* Divider */}
        <div style={{ width: 1, background: '#1f1f1f', marginRight: '40px' }} />

        {/* Right panel: rankings */}
        <div style={{ display: 'flex', flexDirection: 'column', flex: 1, gap: 0 }}>
          <span style={{ fontSize: 12, color: '#555', textTransform: 'uppercase', letterSpacing: '0.12em', marginBottom: 18, fontWeight: 600 }}>
            {ranked.length > 0 ? 'Album Ranking' : 'No rankings yet'}
          </span>
          {ranked.map((album, i) => (
            <div
              key={album.id}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 14,
                paddingBottom: 12,
                marginBottom: 12,
                borderBottom: i < ranked.length - 1 ? '1px solid #1a1a1a' : 'none',
              }}
            >
              <span style={{
                fontSize: i === 0 ? 26 : 18,
                fontWeight: 800,
                color: i === 0 ? '#f59e0b' : i === 1 ? '#a0a0a0' : '#444',
                width: 28,
                textAlign: 'right',
                flexShrink: 0,
              }}>
                {i + 1}
              </span>
              {album.image_url && (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={album.image_url}
                  alt=""
                  width={i === 0 ? 52 : 40}
                  height={i === 0 ? 52 : 40}
                  style={{ borderRadius: 6, objectFit: 'cover', flexShrink: 0 }}
                />
              )}
              <div style={{ display: 'flex', flexDirection: 'column', minWidth: 0 }}>
                <span style={{ fontSize: i === 0 ? 18 : 15, fontWeight: i === 0 ? 700 : 500, color: '#ffffff' }}>
                  {album.album_name}
                </span>
                <span style={{ fontSize: 12, color: '#555', marginTop: 2 }}>{album.release_year}</span>
              </div>
            </div>
          ))}
        </div>
      </div>
    ),
    { width: 1200, height: 630 }
  )
}
