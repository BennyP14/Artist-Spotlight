-- Artist Spotlight Schema
-- Run this in your Supabase SQL editor

create table if not exists spotlights (
  id uuid primary key default gen_random_uuid(),
  artist_id text not null,
  artist_name text not null,
  artist_image_url text,
  artist_genres text[] default '{}',
  share_token text unique default encode(gen_random_bytes(12), 'hex'),
  is_collaborative boolean default false,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create table if not exists spotlight_albums (
  id uuid primary key default gen_random_uuid(),
  spotlight_id uuid references spotlights(id) on delete cascade,
  album_id text not null,
  album_name text not null,
  release_date text not null,
  release_year int not null,
  image_url text,
  total_tracks int default 0,
  album_type text default 'album',
  spotify_url text,
  status text default 'unlistened' check (status in ('unlistened', 'listening', 'complete')),
  rank_position int,
  notes text default '',
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  unique(spotlight_id, album_id)
);

create table if not exists album_insights (
  id uuid primary key default gen_random_uuid(),
  album_id text not null unique,
  artist_name text not null,
  album_name text not null,
  ai_context text,
  era_context text,
  chart_info text,
  wikipedia_summary text,
  generated_at timestamptz default now()
);

-- Enable Row Level Security (public access for MVP — add auth later)
alter table spotlights enable row level security;
alter table spotlight_albums enable row level security;
alter table album_insights enable row level security;

create policy "Public read spotlights" on spotlights for select using (true);
create policy "Public write spotlights" on spotlights for insert with check (true);
create policy "Public update spotlights" on spotlights for update using (true);

create policy "Public read albums" on spotlight_albums for select using (true);
create policy "Public write albums" on spotlight_albums for insert with check (true);
create policy "Public update albums" on spotlight_albums for update using (true);

create policy "Public read insights" on album_insights for select using (true);
create policy "Public write insights" on album_insights for insert with check (true);
create policy "Public update insights" on album_insights for update using (true);

-- Useful indexes
create index if not exists spotlight_albums_spotlight_id_idx on spotlight_albums(spotlight_id);
create index if not exists spotlight_albums_status_idx on spotlight_albums(status);
create index if not exists album_insights_album_id_idx on album_insights(album_id);
