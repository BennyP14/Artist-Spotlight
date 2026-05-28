# Artist Spotlight

A mobile-first web app for deep-dive listening sessions through an artist's entire discography. Search for an artist, get their full discography automatically, track what you've listened to, take notes, generate AI-powered insights, and build your definitive album ranking.

## Features

- **Artist search** via Spotify — album art, genres, track counts
- **Chronological discography** — from debut to latest, filtered to studio albums
- **Status tracking** — Not Started → Now Listening → Complete
- **Drag-and-drop ranking** — builds as you complete albums
- **Per-album notes** — auto-saved
- **AI Insights** (Claude) — album context, era & story, critical reception
- **Wikipedia summaries** pulled automatically
- **Apple Music deep links** — open any album directly
- **Shareable spotlight** — read-only link to share your progress and ranking

---

## Setup

### 1. Install Node.js

Download from [nodejs.org](https://nodejs.org) (LTS version recommended).

### 2. Install dependencies

```bash
cd ~/Desktop/artist-spotlight
npm install
```

### 3. Set up Spotify API

1. Go to [developer.spotify.com/dashboard](https://developer.spotify.com/dashboard)
2. Create a new app
3. Copy the **Client ID** and **Client Secret**

### 4. Set up Supabase

1. Go to [supabase.com](https://supabase.com) and create a free project
2. In the SQL Editor, paste and run the contents of `supabase/schema.sql`
3. Copy your **Project URL** and **anon/public key** from Project Settings → API

### 5. Set up Anthropic (Claude)

1. Go to [console.anthropic.com](https://console.anthropic.com)
2. Create an API key

### 6. Configure environment

```bash
cp .env.local.example .env.local
```

Edit `.env.local` with your keys:

```
SPOTIFY_CLIENT_ID=...
SPOTIFY_CLIENT_SECRET=...
ANTHROPIC_API_KEY=...
NEXT_PUBLIC_SUPABASE_URL=https://yourproject.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=...
```

### 7. Run the app

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000)

---

## Usage

1. **New Spotlight** — search for an artist, click to create
2. **Discography view** — click the status badge to cycle: Not Started → Now Listening → Complete
3. **Album detail** — click any album title for notes, tracklist, and AI insights
4. **Rankings** — switch to the Rankings tab, drag albums into your order
5. **Share** — click Share to copy a read-only link to your spotlight

---

## Tech Stack

- **Next.js 15** (App Router, TypeScript)
- **Tailwind CSS** — dark, music-app aesthetic
- **Supabase** — PostgreSQL database + real-time
- **Spotify Web API** — artist & discography data
- **Anthropic Claude** — AI insights generation
- **Wikipedia REST API** — supplemental album info
- **@dnd-kit** — accessible drag-and-drop ranking
