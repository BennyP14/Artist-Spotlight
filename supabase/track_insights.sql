create table if not exists track_insights (
  id uuid primary key default gen_random_uuid(),
  artist_name text not null,
  track_name text not null,
  album_name text not null,
  summary text not null,
  generated_at timestamptz default now(),
  unique(artist_name, track_name)
);

alter table track_insights enable row level security;
create policy "Public read track insights" on track_insights for select using (true);
create policy "Public write track insights" on track_insights for insert with check (true);

create index if not exists track_insights_lookup_idx on track_insights(artist_name, track_name);
