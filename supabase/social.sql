-- ─── Step 1: Add user_id to existing tables ────────────────────────────────
alter table spotlights add column if not exists user_id uuid references auth.users(id) on delete cascade;

-- ─── Step 2: Profiles ───────────────────────────────────────────────────────
create table if not exists profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  username text unique,
  display_name text,
  avatar_url text,
  bio text default '',
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- ─── Step 3: Follows ────────────────────────────────────────────────────────
create table if not exists follows (
  follower_id uuid references profiles(id) on delete cascade,
  following_id uuid references profiles(id) on delete cascade,
  created_at timestamptz default now(),
  primary key (follower_id, following_id)
);

-- ─── Step 4: Activity feed ───────────────────────────────────────────────────
create table if not exists activity_events (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references profiles(id) on delete cascade,
  event_type text not null,
  spotlight_id uuid references spotlights(id) on delete cascade,
  album_id text,
  album_name text,
  artist_name text,
  metadata jsonb default '{}',
  created_at timestamptz default now()
);

-- ─── Step 5: Reactions ──────────────────────────────────────────────────────
create table if not exists reactions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references profiles(id) on delete cascade,
  spotlight_id uuid references spotlights(id) on delete cascade,
  album_id text,
  emoji text not null,
  created_at timestamptz default now(),
  unique(user_id, spotlight_id, album_id, emoji)
);

-- ─── Step 6: Comments ───────────────────────────────────────────────────────
create table if not exists comments (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references profiles(id) on delete cascade,
  spotlight_id uuid references spotlights(id) on delete cascade,
  album_id text,
  content text not null,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- ─── Step 7: RLS ────────────────────────────────────────────────────────────
alter table profiles enable row level security;
alter table follows enable row level security;
alter table activity_events enable row level security;
alter table reactions enable row level security;
alter table comments enable row level security;

-- Drop old open-write policies on spotlights
drop policy if exists "Public write spotlights" on spotlights;
drop policy if exists "Public update spotlights" on spotlights;

-- Spotlights: anyone can read; only owner can write/update/delete
create policy "Users write own spotlights" on spotlights for insert with check (auth.uid() = user_id);
create policy "Users update own spotlights" on spotlights for update using (auth.uid() = user_id);
create policy "Users delete own spotlights" on spotlights for delete using (auth.uid() = user_id);

-- Profiles
create policy "Public read profiles" on profiles for select using (true);
create policy "Users insert own profile" on profiles for insert with check (auth.uid() = id);
create policy "Users update own profile" on profiles for update using (auth.uid() = id);

-- Follows
create policy "Public read follows" on follows for select using (true);
create policy "Users insert follows" on follows for insert with check (auth.uid() = follower_id);
create policy "Users delete follows" on follows for delete using (auth.uid() = follower_id);

-- Activity
create policy "Public read activity" on activity_events for select using (true);
create policy "Users write own activity" on activity_events for insert with check (auth.uid() = user_id);

-- Reactions
create policy "Public read reactions" on reactions for select using (true);
create policy "Users insert reactions" on reactions for insert with check (auth.uid() = user_id);
create policy "Users delete reactions" on reactions for delete using (auth.uid() = user_id);

-- Comments
create policy "Public read comments" on comments for select using (true);
create policy "Users insert comments" on comments for insert with check (auth.uid() = user_id);
create policy "Users update own comments" on comments for update using (auth.uid() = user_id);
create policy "Users delete own comments" on comments for delete using (auth.uid() = user_id);

-- ─── Step 8: Auto-create profile on signup ──────────────────────────────────
create or replace function public.handle_new_user()
returns trigger as $$
declare
  base_username text;
  final_username text;
begin
  base_username := lower(regexp_replace(
    coalesce(new.raw_user_meta_data->>'full_name', split_part(new.email, '@', 1), 'user'),
    '[^a-z0-9]', '', 'g'
  ));
  final_username := base_username || floor(random() * 9000 + 1000)::text;

  insert into public.profiles (id, display_name, avatar_url, username)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'full_name', new.raw_user_meta_data->>'name', split_part(new.email, '@', 1)),
    new.raw_user_meta_data->>'avatar_url',
    final_username
  )
  on conflict (id) do nothing;
  return new;
end;
$$ language plpgsql security definer;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- ─── Step 9: Indexes ────────────────────────────────────────────────────────
create index if not exists spotlights_user_id_idx on spotlights(user_id);
create index if not exists follows_follower_idx on follows(follower_id);
create index if not exists follows_following_idx on follows(following_id);
create index if not exists activity_user_idx on activity_events(user_id);
create index if not exists activity_created_idx on activity_events(created_at desc);
create index if not exists reactions_spotlight_idx on reactions(spotlight_id, album_id);
create index if not exists comments_spotlight_idx on comments(spotlight_id);

-- Global ranking columns (separate from per-artist rank_position)
alter table spotlight_albums add column if not exists global_rank_position int;
alter table spotlight_albums add column if not exists auto_score float;
