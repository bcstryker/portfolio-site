-- Rebuild the game tables as a generic platform. There are no users yet, so existing rooms are discarded.
--   games         registry: which games exist and their player limits
--   game_rooms    a party: host, players ({id, name} only), generic status/turn, plus per-game `options` and `state`
--   game_private  hidden per-room data (decks, shuffles) that clients can never read
-- Per-player game data (position, color, turn order) lives in `state`/`options`, not on the player.
-- This migration creates tables, security and realtime only. Rules functions follow in later migrations.

-- Retire the old rules functions; they are recreated against the new tables.
drop function if exists public.host_game(text, uuid, text);
drop function if exists public.join_game(text, text);
drop function if exists public.game_action(uuid, text, integer, integer);
drop function if exists public.change_party_game(uuid, text, integer);
drop function if exists public.set_party_video(uuid, text, integer);

drop table if exists public.game_decks;
drop table if exists public.game_rooms;

create table public.games (
  id text primary key,
  name text not null,
  min_players integer not null check (min_players >= 1),
  max_players integer not null check (max_players >= min_players),
  default_options jsonb not null default '{}'
);
alter table public.games enable row level security;
revoke all on public.games from public, anon, authenticated;
grant select on public.games to authenticated;
create policy "Signed-in players can read games" on public.games
  for select to authenticated using (true);

insert into public.games (id, name, min_players, max_players) values
  ('chutes-and-ladders', 'Chutes and Ladders', 2, 8),
  ('candy-land', 'Candy Land', 2, 8),
  ('tic-tac-toe', 'Tic Tac Toe', 2, 2),
  ('connect-four', 'Connect Four', 2, 2);

create table public.game_rooms (
  id uuid primary key default gen_random_uuid(),
  code text not null unique,
  host_id uuid not null references auth.users(id),
  game_type text not null references public.games(id),
  players jsonb not null default '[]' check (jsonb_typeof(players) = 'array'),
  status text not null default 'waiting' check (status in ('waiting', 'playing', 'finished')),
  turn_index integer not null default 0,
  winner_id uuid,
  version integer not null default 0,
  options jsonb not null default '{}',
  state jsonb not null default '{}',
  turn_ready_at timestamptz,
  meet_url text check (meet_url is null or meet_url ~ '^https://meet[.]google[.]com/[a-z]{3}-[a-z]{4}-[a-z]{3}$'),
  created_at timestamptz not null default now(),
  last_active_at timestamptz not null default now()
);
create index game_rooms_last_active_at_idx on public.game_rooms (last_active_at);
create index game_rooms_host_created_idx on public.game_rooms (host_id, created_at);
create index game_rooms_created_idx on public.game_rooms (created_at);

alter table public.game_rooms enable row level security;
revoke all on public.game_rooms from public, anon, authenticated;
grant select on public.game_rooms to authenticated;
create policy "Members can read their room" on public.game_rooms
for select to authenticated using (
  players @> jsonb_build_array(jsonb_build_object('id', (select auth.uid())::text))
);

-- Every update marks the room active (used by the inactive-party cleanup and touch_game_room, which are
-- defined in 20261105000800 / 000900 and keep working unchanged against this table).
create or replace function public.mark_game_room_active()
returns trigger language plpgsql set search_path = '' as $$
begin
  new.last_active_at := clock_timestamp();
  return new;
end;
$$;
revoke all on function public.mark_game_room_active() from public, anon, authenticated;
create trigger game_room_activity before update on public.game_rooms
for each row execute function public.mark_game_room_active();

-- Hidden state. No policies and no grants: only security definer functions can touch it.
create table public.game_private (
  room_id uuid primary key references public.game_rooms(id) on delete cascade,
  data jsonb not null default '{}'
);
alter table public.game_private enable row level security;
revoke all on public.game_private from public, anon, authenticated;

-- Subscribe only to committed state; RLS restricts events to room members.
alter publication supabase_realtime add table public.game_rooms;
