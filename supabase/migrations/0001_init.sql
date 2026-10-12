-- Initial schema. See masterdoc.md section 4.5.
-- Both players are trusted equally with each other's progress (this is a
-- two-person gift, not a multi-tenant app) - the two accounts can read all
-- of each other's profile/progress rows. What's actually secret (hidden
-- cards, dial targets, evidence hands) never touches Postgres; it lives only
-- in the room's Durable Object for the life of that room (D9, section 4.6).

create table if not exists profiles (
  user_id uuid primary key references auth.users (id),
  display_name text not null,
  avatar_json jsonb not null default '{}'::jsonb,
  rank text not null default 'Intern',
  xp integer not null default 0,
  created_at timestamptz not null default now()
);

create table if not exists daily_results (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id),
  game text not null default 'wordle',
  ist_date date not null,
  result jsonb not null,
  created_at timestamptz not null default now(),
  unique (user_id, ist_date, game)
);

-- Singleton-style shared state: at most GARDEN_MAX_PLANTS (12) rows, see
-- packages/shared/src/config.ts.
create table if not exists garden (
  plant_slot integer primary key,
  stage integer not null default 0,
  planted_at timestamptz
);

create table if not exists stickers_unlocked (
  user_id uuid not null references auth.users (id),
  sticker_id integer not null,
  unlocked_at timestamptz not null default now(),
  primary key (user_id, sticker_id)
);

create table if not exists scoreboard (
  user_id uuid not null references auth.users (id),
  game text not null,
  wins integer not null default 0,
  losses integer not null default 0,
  current_streak integer not null default 0,
  primary key (user_id, game)
);

-- Bond rank is shared by the pair, not per-user - a single row.
create table if not exists bond (
  id boolean primary key default true check (id),
  bond_xp integer not null default 0,
  bond_rank integer not null default 0
);

create table if not exists peer_review_flags (
  id uuid primary key default gen_random_uuid(),
  content_type text not null,
  content_ref text not null,
  reported_by uuid not null references auth.users (id),
  what_wrong text not null,
  suggested_fix text,
  status text not null default 'open' check (status in ('open', 'fixed', 'rejected')),
  created_at timestamptz not null default now(),
  resolved_at timestamptz
);

create table if not exists case_progress (
  case_id text primary key,
  stars integer check (stars between 0 and 3),
  hints_used integer not null default 0,
  solved_at timestamptz
);

-- Ink variable state (met_dog, bond_rank, etc.), keyed by flag name.
create table if not exists scene_flags (
  key text primary key,
  value jsonb not null
);

-- Row level security ---------------------------------------------------------
alter table profiles enable row level security;
alter table daily_results enable row level security;
alter table garden enable row level security;
alter table stickers_unlocked enable row level security;
alter table scoreboard enable row level security;
alter table bond enable row level security;
alter table peer_review_flags enable row level security;
alter table case_progress enable row level security;
alter table scene_flags enable row level security;

-- Any signed-in user (there are only ever two, D8) can read everything -
-- the Lounge needs to show both players' presence, streak, and XP (FR-12).
create policy "read all profiles" on profiles for select using (auth.role() = 'authenticated');
create policy "read all daily results" on daily_results for select using (auth.role() = 'authenticated');
create policy "read garden" on garden for select using (auth.role() = 'authenticated');
create policy "read all stickers" on stickers_unlocked for select using (auth.role() = 'authenticated');
create policy "read all scoreboard rows" on scoreboard for select using (auth.role() = 'authenticated');
create policy "read bond" on bond for select using (auth.role() = 'authenticated');
create policy "read all flags" on peer_review_flags for select using (auth.role() = 'authenticated');
create policy "read case progress" on case_progress for select using (auth.role() = 'authenticated');
create policy "read scene flags" on scene_flags for select using (auth.role() = 'authenticated');

-- Writes to a user's own rows are restricted to that user.
create policy "write own profile" on profiles for insert with check (auth.uid() = user_id);
create policy "update own profile" on profiles for update using (auth.uid() = user_id);
create policy "write own daily results" on daily_results for insert with check (auth.uid() = user_id);
create policy "write own stickers" on stickers_unlocked for insert with check (auth.uid() = user_id);
create policy "write own scoreboard row" on scoreboard for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "file a flag" on peer_review_flags for insert with check (auth.uid() = reported_by);
create policy "update any flag status" on peer_review_flags for update using (auth.role() = 'authenticated');

-- TODO (M1+): garden/bond/case_progress/scene_flags are genuinely shared,
-- not owned by either user - decide whether writes to them go through a
-- Supabase Edge Function / service-role key (safer, since there's no single
-- "owner" to check against) rather than directly from either client.
