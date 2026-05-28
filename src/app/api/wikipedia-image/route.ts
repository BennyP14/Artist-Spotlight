import { NextRequest, NextResponse } from 'next/server'

export async function GET(request: NextRequest) {
  const name = request.nextUrl.searchParams.get('name')
  if (!name) return NextResponse.json({ url: null })

  try {
    const res = await fetch(
      `https://en.wikipedia.org/api/rest/v1/page/summary/${encodeURIComponent(name)}`,
      { next: { revalidate: 86400 } }
    )
    if (!res.ok) return NextResponse.json({ url: null })
    const data = await res.json()
    const url = data.thumbnail?.source ?? null
    return NextResponse.json({ url })
  } catch {
    return NextResponse.json({ url: null })
  }
}
