-- Application baseline: equivalent to migrations 20261105000100 through 20261105001600.
-- Existing deployments adopt this through scripts/adopt-migration-baseline.cjs; do not rerun it.

-- Tables, security, and realtime
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

-- Every update marks the room active for inactive-party cleanup.
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


-- Party heartbeat
create function public.touch_game_room(room_id uuid)
returns void language plpgsql security definer set search_path = '' as $$
begin
  if auth.uid() is null or not exists (
    select 1 from public.game_rooms where id = room_id
    and players @> jsonb_build_array(jsonb_build_object('id', auth.uid()::text))
  ) then raise exception 'This party is no longer available.'; end if;
  -- Multiple participants share one heartbeat; do not change game versions.
  update public.game_rooms set last_active_at = clock_timestamp()
    where id = room_id and last_active_at < clock_timestamp() - interval '1 minute';
end;
$$;
revoke all on function public.touch_game_room(uuid) from public, anon;
grant execute on function public.touch_game_room(uuid) to authenticated;


-- Host cleanup tool
-- Explicit host tool: unlike automatic expiration, this includes active parties.
create function public.delete_other_parties(current_room_id uuid)
returns integer language plpgsql security definer set search_path = '' as $$
declare
  room public.game_rooms%rowtype;
  deleted_count integer;
begin
  -- Serialize global deletes before locking a room, avoiding competing-host deadlocks.
  perform pg_advisory_xact_lock(hashtextextended('delete_other_parties', 0));
  select * into room from public.game_rooms where id = current_room_id for update;
  if not found or auth.uid() is null or room.host_id <> auth.uid() then
    raise exception 'Only the host of the current party can delete other parties.';
  end if;
  delete from public.game_rooms where id <> room.id;
  get diagnostics deleted_count = row_count;
  return deleted_count;
end;
$$;
revoke all on function public.delete_other_parties(uuid) from public, anon;
grant execute on function public.delete_other_parties(uuid) to authenticated;


-- game router
-- Generic room handling and the game_action router.
-- Each game supplies two functions (defined below):
--   game_<id>_init(options jsonb, players jsonb)                                      returns game_result
--   game_<id>_apply(room game_rooms, private jsonb, seat integer, action text, payload jsonb) returns game_result
-- The router does everything common (membership, version, turns, animations, start/reset/kick); games only
-- implement their own moves. Adding a game = a `games` row, those two functions, and one line in each dispatcher below.

-- Users removed by the host. Player ids are anonymous Supabase Auth ids, which anyone can replace by clearing
-- browser data, so this stops casual rejoining but is NOT a strong ban. Real protection needs captcha on
-- anonymous sign-ins and/or a lockable room.
alter table public.game_rooms add column banned uuid[] not null default '{}';

-- What a game hands back to the router. Every field is authoritative; apply must return the room's current
-- value for anything it does not change. `private` null = leave hidden data as is.
create type public.game_result as (
  state jsonb,
  private jsonb,
  turn_index integer,
  status text,
  winner_id uuid,
  turn_ready_at timestamptz
);

-- 0-based seat of a user in a players array, or null if not seated.
create function public.game_seat(players jsonb, uid uuid)
returns integer language sql immutable set search_path = '' as $$
  select (entry.n - 1)::integer
  from jsonb_array_elements(players) with ordinality as entry(p, n)
  where entry.p ->> 'id' = uid::text
  limit 1
$$;

-- Dispatchers: the only places that name individual games.
create function public.game_init(game_type text, options jsonb, players jsonb)
returns public.game_result language plpgsql set search_path = '' as $$
begin
  -- if/elsif (not a CASE expression) so only the chosen game's function has to exist when this runs.
  if game_type = 'tic-tac-toe' then return public.game_tic_tac_toe_init(options, players);
  elsif game_type = 'connect-four' then return public.game_connect_four_init(options, players);
  elsif game_type = 'chutes-and-ladders' then return public.game_chutes_and_ladders_init(options, players);
  elsif game_type = 'candy-land' then return public.game_candy_land_init(options, players);
  elsif game_type = 'memory' then return public.game_memory_init(options, players);
  end if;
  return null;
end;
$$;

create function public.game_apply(room public.game_rooms, private jsonb, seat integer, action text, payload jsonb)
returns public.game_result language plpgsql set search_path = '' as $$
begin
  if room.game_type = 'tic-tac-toe' then return public.game_tic_tac_toe_apply(room, private, seat, action, payload);
  elsif room.game_type = 'connect-four' then return public.game_connect_four_apply(room, private, seat, action, payload);
  elsif room.game_type = 'chutes-and-ladders' then return public.game_chutes_and_ladders_apply(room, private, seat, action, payload);
  elsif room.game_type = 'candy-land' then return public.game_candy_land_apply(room, private, seat, action, payload);
  elsif room.game_type = 'memory' then return public.game_memory_apply(room, private, seat, action, payload);
  end if;
  return null;
end;
$$;
revoke all on function public.game_seat(jsonb, uuid), public.game_init(text, jsonb, jsonb),
  public.game_apply(public.game_rooms, jsonb, integer, text, jsonb) from public, anon, authenticated;

-- Create a room. Called only by the password-checking server endpoint (service_role).
create function public.host_game(display_name text, host_user_id uuid, selected_game text default 'chutes-and-ladders', game_options jsonb default '{}')
returns uuid language plpgsql security definer set search_path = '' as $$
declare
  user_id uuid := host_user_id;
  g public.games%rowtype;
  room_id uuid;
  room_code text;
begin
  if user_id is null then raise exception 'Sign in as a guest first.'; end if;
  if display_name is null or length(trim(display_name)) not between 1 and 24 then
    raise exception 'Choose a name between 1 and 24 characters.';
  end if;
  select * into g from public.games where id = selected_game;
  if not found then raise exception 'Choose a supported game.'; end if;
  if game_options is null or jsonb_typeof(game_options) <> 'object' then raise exception 'Invalid game options.'; end if;
  -- Serialize creation per guest and bound accidental repeated room creation.
  perform pg_advisory_xact_lock(hashtextextended(user_id::text, 0));
  if (select count(*) from public.game_rooms where host_id = user_id and created_at > now() - interval '1 hour') >= 10 then
    raise exception 'Too many rooms created. Please use an existing room or try later.';
  end if;
  -- Remove parties idle for over an hour (their hidden data cascades). Rooms locked by another
  -- transaction are skipped; this rolls back if creating the new room fails.
  with expired as (
    select id from public.game_rooms
    where last_active_at < clock_timestamp() - interval '1 hour'
    for update skip locked
  )
  delete from public.game_rooms where id in (select id from expired);
  loop
    room_code := upper(substr(replace(gen_random_uuid()::text, '-', ''), 1, 8));
    begin
      insert into public.game_rooms(code, host_id, game_type, players, options) values (
        room_code, user_id, g.id,
        jsonb_build_array(jsonb_build_object('id', user_id, 'name', trim(display_name))),
        g.default_options || game_options
      ) returning id into room_id;
      exit;
    exception when unique_violation then null;
    end;
  end loop;
  return room_id;
end;
$$;
revoke all on function public.host_game(text, uuid, text, jsonb) from public, anon, authenticated;
grant execute on function public.host_game(text, uuid, text, jsonb) to service_role;

-- Join a waiting party. The party holds up to 8 regardless of game; starting enforces the game's own limits.
create function public.join_game(room_key text, display_name text)
returns uuid language plpgsql security definer set search_path = '' as $$
declare
  user_id uuid := auth.uid();
  room public.game_rooms%rowtype;
begin
  if user_id is null then raise exception 'Sign in as a guest first.'; end if;
  if display_name is null or length(trim(display_name)) not between 1 and 24 then
    raise exception 'Choose a name between 1 and 24 characters.';
  end if;
  select * into room from public.game_rooms where code = upper(trim(room_key)) for update;
  if not found then raise exception 'Room not found. Check the key and try again.'; end if;
  if public.game_seat(room.players, user_id) is not null then return room.id; end if;
  if user_id = any(room.banned) then raise exception 'You cannot join this room.'; end if;
  if room.status <> 'waiting' then raise exception 'This game has already started.'; end if;
  if jsonb_array_length(room.players) >= 8 then raise exception 'This room is full (8 players).'; end if;
  update public.game_rooms set
    players = players || jsonb_build_array(jsonb_build_object('id', user_id, 'name', trim(display_name))),
    version = version + 1
  where id = room.id;
  return room.id;
end;
$$;
revoke all on function public.join_game(text, text) from public, anon;
grant execute on function public.join_game(text, text) to authenticated;

-- The router. Common actions: start, reset, kick. Anything else is a game move.
create function public.game_action(room_id uuid, action text, expected_version integer, payload jsonb default '{}')
returns void language plpgsql security definer set search_path = '' as $$
declare
  user_id uuid := auth.uid();
  room public.game_rooms%rowtype;
  g public.games%rowtype;
  seat integer;
  result public.game_result;
  priv jsonb;
  target uuid;
  count_players integer;
begin
  if user_id is null then raise exception 'You are not a member of this room.'; end if;
  select * into room from public.game_rooms where id = room_id for update;
  if not found then raise exception 'You are not a member of this room.'; end if;
  seat := public.game_seat(room.players, user_id);
  if seat is null then raise exception 'You are not a member of this room.'; end if;
  if expected_version is null or room.version <> expected_version then raise exception 'The room changed. Please try again.'; end if;
  if payload is null or jsonb_typeof(payload) <> 'object' then raise exception 'Invalid request.'; end if;

  if action = 'kick' then
    if room.host_id <> user_id then raise exception 'Only the host can remove a player.'; end if;
    if room.status <> 'waiting' then raise exception 'Players can only be removed from the lobby.'; end if;
    begin
      target := (payload ->> 'player_id')::uuid;
    exception when others then raise exception 'Choose a player to remove.';
    end;
    if target is null then raise exception 'Choose a player to remove.'; end if;
    if target = room.host_id then raise exception 'The host cannot be removed.'; end if;
    if public.game_seat(room.players, target) is null then raise exception 'That player is not in this room.'; end if;
    update public.game_rooms set
      players = (select coalesce(jsonb_agg(entry.p order by entry.n), '[]'::jsonb)
                 from jsonb_array_elements(room.players) with ordinality as entry(p, n)
                 where entry.p ->> 'id' <> target::text),
      banned = array_append(banned, target),
      version = version + 1
    where id = room.id;
    return;

  elsif action = 'start' then
    if room.host_id <> user_id then raise exception 'Only the host can start the game.'; end if;
    if room.status <> 'waiting' then raise exception 'The game has already started.'; end if;
    select * into g from public.games where id = room.game_type;
    count_players := jsonb_array_length(room.players);
    if count_players < g.min_players or count_players > g.max_players then
      raise exception '% needs % to % players.', g.name, g.min_players, g.max_players;
    end if;
    result := public.game_init(room.game_type, room.options, room.players);
    if result is null then raise exception 'This game is not available.'; end if;
    delete from public.game_private where game_private.room_id = room.id;

  elsif action = 'reset' then
    if room.host_id <> user_id then raise exception 'Only the host can return everyone to the lobby.'; end if;
    delete from public.game_private where game_private.room_id = room.id;
    result := row('{}'::jsonb, null, 0, 'waiting', null, null)::public.game_result;

  else
    if room.status <> 'playing' then raise exception 'The game is not in progress.'; end if;
    if seat <> room.turn_index then raise exception 'It is not your turn.'; end if;
    if room.turn_ready_at > clock_timestamp() then raise exception 'Wait for the current animation to finish.'; end if;
    select data into priv from public.game_private where game_private.room_id = room.id;
    result := public.game_apply(room, coalesce(priv, '{}'::jsonb), seat, action, payload);
    if result is null then raise exception 'This game is not available.'; end if;
  end if;

  update public.game_rooms set
    state = result.state, turn_index = result.turn_index, status = result.status,
    winner_id = result.winner_id, turn_ready_at = result.turn_ready_at, version = version + 1
  where id = room.id;
  if result.private is not null then
    insert into public.game_private(room_id, data) values (room.id, result.private)
      on conflict on constraint game_private_pkey do update set data = excluded.data;
  end if;
end;
$$;
revoke all on function public.game_action(uuid, text, integer, jsonb) from public, anon;
grant execute on function public.game_action(uuid, text, integer, jsonb) to authenticated;

-- Host switches the party to another game; players and room key stay, state starts empty.
create function public.change_party_game(room_id uuid, selected_game text, expected_version integer, game_options jsonb default '{}')
returns void language plpgsql security definer set search_path = '' as $$
declare
  room public.game_rooms%rowtype;
  user_id uuid := auth.uid();
  g public.games%rowtype;
begin
  select * into room from public.game_rooms where id = room_id for update;
  if not found or user_id is null or room.host_id <> user_id then
    raise exception 'Only the host can choose the party’s next game.';
  end if;
  if expected_version is null or room.version <> expected_version then raise exception 'The room changed. Please try again.'; end if;
  if room.status = 'playing' then raise exception 'Return everyone to the lobby before changing games.'; end if;
  if room.turn_ready_at > clock_timestamp() then raise exception 'Wait for the current animation to finish.'; end if;
  select * into g from public.games where id = selected_game;
  if not found then raise exception 'Choose a supported game.'; end if;
  if game_options is null or jsonb_typeof(game_options) <> 'object' then raise exception 'Invalid game options.'; end if;
  if jsonb_array_length(room.players) > g.max_players then
    raise exception 'This game supports only % players. Your party has %.', g.max_players, jsonb_array_length(room.players);
  end if;
  delete from public.game_private where game_private.room_id = room.id;
  update public.game_rooms set
    game_type = g.id, options = g.default_options || game_options, state = '{}', status = 'waiting',
    turn_index = 0, winner_id = null, turn_ready_at = null, version = version + 1
  where id = room.id;
end;
$$;
revoke all on function public.change_party_game(uuid, text, integer, jsonb) from public, anon;
grant execute on function public.change_party_game(uuid, text, integer, jsonb) to authenticated;

-- Host shares or removes a Google Meet link for the party (unchanged behavior).
create function public.set_party_video(room_id uuid, meeting_url text, expected_version integer)
returns void language plpgsql security definer set search_path = '' as $$
declare
  room public.game_rooms%rowtype;
begin
  select * into room from public.game_rooms where id = room_id for update;
  if not found or auth.uid() is null or room.host_id <> auth.uid() then raise exception 'Only the host can change the video chat link.'; end if;
  if expected_version is null or room.version <> expected_version then raise exception 'The room changed. Please try again.'; end if;
  if meeting_url is not null and meeting_url !~ '^https://meet[.]google[.]com/[a-z]{3}-[a-z]{4}-[a-z]{3}$' then
    raise exception 'Enter a Google Meet link like https://meet.google.com/abc-defg-hij.';
  end if;
  update public.game_rooms set meet_url = meeting_url, version = version + 1 where id = room.id;
end;
$$;
revoke all on function public.set_party_video(uuid, text, integer) from public, anon;
grant execute on function public.set_party_video(uuid, text, integer) to authenticated;


-- game tic tac toe
-- Tic Tac Toe rules for the generic router.
-- state: {board: [9 ints, 0 empty / 1 X (seat 0) / 2 O (seat 1)], winning_cells: [..], last_move: {player, slot}}
-- action 'play' with payload {"move": 0..8}. The router has already checked membership, turn and room status.

create function public.game_tic_tac_toe_init(options jsonb, players jsonb)
returns public.game_result language plpgsql immutable set search_path = '' as $$
begin
  return row(
    jsonb_build_object('board', to_jsonb(array_fill(0, array[9])), 'winning_cells', '[]'::jsonb, 'last_move', null),
    null, 0, 'playing', null, null
  )::public.game_result;
end;
$$;

create function public.game_tic_tac_toe_apply(room public.game_rooms, private jsonb, seat integer, action text, payload jsonb)
returns public.game_result language plpgsql immutable set search_path = '' as $$
declare
  board jsonb := room.state -> 'board';
  mark integer := seat + 1;
  square numeric;
  slot integer;
  -- the eight winning lines, three squares each, flattened
  lines integer[] := array[0,1,2, 3,4,5, 6,7,8, 0,3,6, 1,4,7, 2,5,8, 0,4,8, 2,4,6];
  i integer;
  winning integer[] := '{}';
  winner uuid;
  next_status text;
begin
  if action <> 'play' then raise exception 'Unknown action.'; end if;
  if jsonb_typeof(payload -> 'move') is distinct from 'number' then raise exception 'Choose a square on the board.'; end if;
  square := (payload ->> 'move')::numeric;
  if square <> trunc(square) or square < 0 or square >= 9 then raise exception 'Choose a square on the board.'; end if;
  slot := square::integer;
  if (board ->> slot)::integer <> 0 then raise exception 'That square is already taken.'; end if;

  board := jsonb_set(board, array[slot::text], to_jsonb(mark));
  for i in 0..7 loop
    if (board ->> lines[i * 3 + 1])::integer = mark
       and (board ->> lines[i * 3 + 2])::integer = mark
       and (board ->> lines[i * 3 + 3])::integer = mark then
      winning := array[lines[i * 3 + 1], lines[i * 3 + 2], lines[i * 3 + 3]];
      exit;
    end if;
  end loop;

  if cardinality(winning) > 0 then winner := (room.players -> seat ->> 'id')::uuid; end if;
  next_status := case when cardinality(winning) > 0 or not (board @> '0'::jsonb) then 'finished' else 'playing' end;
  return row(
    jsonb_build_object('board', board, 'winning_cells', to_jsonb(winning),
      'last_move', jsonb_build_object('player', room.players -> seat ->> 'name', 'slot', slot)),
    null, (seat + 1) % 2, next_status, winner, room.turn_ready_at
  )::public.game_result;
end;
$$;

revoke all on function public.game_tic_tac_toe_init(jsonb, jsonb),
  public.game_tic_tac_toe_apply(public.game_rooms, jsonb, integer, text, jsonb) from public, anon, authenticated;


-- game connect four
-- Connect Four rules for the generic router.
-- state: {board: [42 ints, row-major, row 0 at the top; 0 empty / 1 red (seat 0) / 2 yellow (seat 1)],
--         winning_cells: [..] (the whole connected run, 4 or more), last_move: {player, slot}}
-- action 'play' with payload {"move": 0..6} (the column). The disc falls to the lowest empty row.

create function public.game_connect_four_init(options jsonb, players jsonb)
returns public.game_result language plpgsql immutable set search_path = '' as $$
begin
  return row(
    jsonb_build_object('board', to_jsonb(array_fill(0, array[42])), 'winning_cells', '[]'::jsonb, 'last_move', null),
    null, 0, 'playing', null, null
  )::public.game_result;
end;
$$;

create function public.game_connect_four_apply(room public.game_rooms, private jsonb, seat integer, action text, payload jsonb)
returns public.game_result language plpgsql immutable set search_path = '' as $$
declare
  board jsonb := room.state -> 'board';
  mark integer := seat + 1;
  col_input numeric;
  col integer;
  r integer;
  slot integer;
  -- direction pairs (row step, column step): horizontal, vertical, and both diagonals
  dirs integer[] := array[0,1, 1,0, 1,1, 1,-1];
  d integer;
  dr integer;
  dc integer;
  rr integer;
  cc integer;
  run integer[];
  winning integer[] := '{}';
  winner uuid;
  next_status text;
begin
  if action <> 'play' then raise exception 'Unknown action.'; end if;
  if jsonb_typeof(payload -> 'move') is distinct from 'number' then raise exception 'Choose a column on the board.'; end if;
  col_input := (payload ->> 'move')::numeric;
  if col_input <> trunc(col_input) or col_input < 0 or col_input >= 7 then raise exception 'Choose a column on the board.'; end if;
  col := col_input::integer;

  for r in reverse 5..0 loop
    if (board ->> (r * 7 + col))::integer = 0 then slot := r * 7 + col; exit; end if;
  end loop;
  if slot is null then raise exception 'That column is full.'; end if;
  board := jsonb_set(board, array[slot::text], to_jsonb(mark));

  -- Only lines through the new disc can have just been completed: walk both ways in each direction.
  for d in 0..3 loop
    dr := dirs[d * 2 + 1];
    dc := dirs[d * 2 + 2];
    run := array[slot];
    rr := slot / 7 + dr; cc := slot % 7 + dc;
    while rr between 0 and 5 and cc between 0 and 6 and (board ->> (rr * 7 + cc))::integer = mark loop
      run := array_append(run, rr * 7 + cc);
      rr := rr + dr; cc := cc + dc;
    end loop;
    rr := slot / 7 - dr; cc := slot % 7 - dc;
    while rr between 0 and 5 and cc between 0 and 6 and (board ->> (rr * 7 + cc))::integer = mark loop
      run := array_append(run, rr * 7 + cc);
      rr := rr - dr; cc := cc - dc;
    end loop;
    if cardinality(run) >= 4 then
      select array_agg(cell order by cell) into winning from unnest(run) as cell;
      exit;
    end if;
  end loop;

  if cardinality(winning) > 0 then winner := (room.players -> seat ->> 'id')::uuid; end if;
  next_status := case when cardinality(winning) > 0 or not (board @> '0'::jsonb) then 'finished' else 'playing' end;
  return row(
    jsonb_build_object('board', board, 'winning_cells', to_jsonb(winning),
      'last_move', jsonb_build_object('player', room.players -> seat ->> 'name', 'slot', slot)),
    null, (seat + 1) % 2, next_status, winner, room.turn_ready_at
  )::public.game_result;
end;
$$;

revoke all on function public.game_connect_four_init(jsonb, jsonb),
  public.game_connect_four_apply(public.game_rooms, jsonb, integer, text, jsonb) from public, anon, authenticated;


-- game chutes and ladders
-- Chutes and Ladders rules for the generic router.
-- state: {pieces: [{id, owner (user uuid), space 0..100}], last_move: null | {event_id, started_at, ends_at,
--         player_id, player, piece_id, from_space, roll, landing, destination}}
-- action 'spin' (no payload). The router has checked membership, turn, room status and the animation wait.
-- Reach space 100 with an exact roll; an overshoot leaves the piece where it is.

create function public.game_chutes_and_ladders_init(options jsonb, players jsonb)
returns public.game_result language plpgsql immutable set search_path = '' as $$
begin
  return row(
    jsonb_build_object(
      'pieces', (select jsonb_agg(jsonb_build_object('id', 'piece-' || entry.n, 'owner', entry.p ->> 'id', 'space', 0) order by entry.n)
                 from jsonb_array_elements(players) with ordinality as entry(p, n)),
      'last_move', null),
    null, 0, 'playing', null, null
  )::public.game_result;
end;
$$;

create function public.game_chutes_and_ladders_apply(room public.game_rooms, private jsonb, seat integer, action text, payload jsonb)
returns public.game_result language plpgsql set search_path = '' as $$
declare
  -- ladders climb, chutes slide: landing space -> destination space
  jumps jsonb := '{"1":38,"4":14,"9":31,"21":42,"28":84,"36":44,"51":67,"71":91,"80":100,"16":6,"47":26,"49":11,"56":53,"62":19,"64":60,"87":24,"93":73,"95":75,"98":78}';
  player_id text := room.players -> seat ->> 'id';
  piece_index integer;
  piece_id text;
  from_space integer;
  roll integer;
  landing integer;
  destination integer;
  event_start timestamptz := clock_timestamp() + interval '300 milliseconds';
  event_end timestamptz := event_start + interval '2400 milliseconds';
  won boolean;
begin
  if action <> 'spin' then raise exception 'Unknown action.'; end if;

  select (entry.n - 1)::integer, entry.p ->> 'id', (entry.p ->> 'space')::integer
    into piece_index, piece_id, from_space
  from jsonb_array_elements(room.state -> 'pieces') with ordinality as entry(p, n)
  where entry.p ->> 'owner' = player_id
  limit 1;
  if piece_index is null then raise exception 'You have no piece in this game.'; end if;

  roll := floor(random() * 6)::integer + 1;
  landing := from_space + roll;
  if landing > 100 then
    landing := from_space;
    destination := from_space;
  else
    destination := coalesce((jumps ->> landing::text)::integer, landing);
  end if;
  won := destination = 100;

  return row(
    jsonb_build_object(
      'pieces', jsonb_set(room.state -> 'pieces', array[piece_index::text, 'space'], to_jsonb(destination)),
      'last_move', jsonb_build_object('event_id', gen_random_uuid(), 'started_at', event_start, 'ends_at', event_end,
        'player_id', player_id, 'player', room.players -> seat ->> 'name', 'piece_id', piece_id,
        'from_space', from_space, 'roll', roll, 'landing', landing, 'destination', destination)),
    null,
    (seat + 1) % jsonb_array_length(room.players),
    case when won then 'finished' else 'playing' end,
    case when won then player_id::uuid end,
    event_end
  )::public.game_result;
end;
$$;

revoke all on function public.game_chutes_and_ladders_init(jsonb, jsonb),
  public.game_chutes_and_ladders_apply(public.game_rooms, jsonb, integer, text, jsonb) from public, anon, authenticated;


-- game candy land
-- Candy Land rules for the generic router.
-- state:   {pieces: [{id, owner (user uuid), space 0..61}], last_move: null | {event_id, started_at, ends_at,
--           player_id, player, piece_id, from_space, color, matches, destination, remaining}}
-- private: {deck: [card, ...]}  (never readable by clients). Cards 0-5 are single colors, 6-11 double colors
--          (color = card % 6); 36 single + 12 double = 48 cards, reshuffled only when exhausted.
-- Spaces 1-60 follow a repeating six-color rainbow path (space s has color (s-1) % 6); space 61 is the castle.
-- action 'draw' (no payload). The router has checked membership, turn, room status and the animation wait.

create function public.game_candy_land_deck()
returns jsonb language sql volatile set search_path = '' as $$
  select jsonb_agg(card order by random())
  from (select (i % 6) + case when i >= 36 then 6 else 0 end as card from generate_series(0, 47) as series(i)) as cards
$$;

create function public.game_candy_land_init(options jsonb, players jsonb)
returns public.game_result language plpgsql volatile set search_path = '' as $$
begin
  return row(
    jsonb_build_object(
      'pieces', (select jsonb_agg(jsonb_build_object('id', 'piece-' || entry.n, 'owner', entry.p ->> 'id', 'space', 0) order by entry.n)
                 from jsonb_array_elements(players) with ordinality as entry(p, n)),
      'last_move', null),
    jsonb_build_object('deck', public.game_candy_land_deck()),
    0, 'playing', null, null
  )::public.game_result;
end;
$$;

create function public.game_candy_land_apply(room public.game_rooms, private jsonb, seat integer, action text, payload jsonb)
returns public.game_result language plpgsql volatile set search_path = '' as $$
declare
  player_id text := room.players -> seat ->> 'id';
  deck jsonb := coalesce(private -> 'deck', '[]'::jsonb);
  piece_index integer;
  piece_id text;
  from_space integer;
  card integer;
  color integer;
  matches integer;
  destination integer;
  n integer;
  event_start timestamptz := clock_timestamp() + interval '300 milliseconds';
  event_end timestamptz := event_start + interval '2400 milliseconds';
  won boolean;
begin
  if action <> 'draw' then raise exception 'Unknown action.'; end if;

  select (entry.n - 1)::integer, entry.p ->> 'id', (entry.p ->> 'space')::integer
    into piece_index, piece_id, from_space
  from jsonb_array_elements(room.state -> 'pieces') with ordinality as entry(p, n)
  where entry.p ->> 'owner' = player_id
  limit 1;
  if piece_index is null then raise exception 'You have no piece in this game.'; end if;

  if jsonb_array_length(deck) = 0 then deck := public.game_candy_land_deck(); end if;
  card := (deck ->> 0)::integer;
  deck := deck - 0;
  color := card % 6;
  matches := case when card >= 6 then 2 else 1 end;

  -- Move to the next space of the drawn color (the second one for a double card); none left means the castle.
  destination := from_space;
  for n in 1..matches loop
    destination := destination + 1;
    while destination <= 60 and (destination - 1) % 6 <> color loop destination := destination + 1; end loop;
    if destination > 60 then destination := 61; exit; end if;
  end loop;
  won := destination = 61;

  return row(
    jsonb_build_object(
      'pieces', jsonb_set(room.state -> 'pieces', array[piece_index::text, 'space'], to_jsonb(destination)),
      'last_move', jsonb_build_object('event_id', gen_random_uuid(), 'started_at', event_start, 'ends_at', event_end,
        'player_id', player_id, 'player', room.players -> seat ->> 'name', 'piece_id', piece_id,
        'from_space', from_space, 'color', color, 'matches', matches, 'destination', destination,
        'remaining', jsonb_array_length(deck))),
    jsonb_build_object('deck', deck),
    (seat + 1) % jsonb_array_length(room.players),
    case when won then 'finished' else 'playing' end,
    case when won then player_id::uuid end,
    event_end
  )::public.game_result;
end;
$$;

revoke all on function public.game_candy_land_deck(), public.game_candy_land_init(jsonb, jsonb),
  public.game_candy_land_apply(public.game_rooms, jsonb, integer, text, jsonb) from public, anon, authenticated;


-- game memory
-- Memory (concentration) for the generic router.
-- Options (set when the host picks the game): {size: 4|6|8|10 (an n x n grid), genre: <memory_sets.id>,
--   showNames: true | false}. showNames=false is hard mode: each match opens a four-choice question about the
--   flag just matched, worth a bonus point.
-- state:   {board:  [n*n]  card id while face-up (or just matched), else null,
--           owner:  [n*n]  id of the player who took the card, else null,
--           up:     [idx]  cards flipped this turn (a missed pair stays face-up until the next flip),
--           shown:  [idx]  the last matched pair, kept face-up until the next flip,
--           mismatch, quiz: null | {player_id, card, options}, qres: null | {player_id, correct, card},
--           scores: {player id: points}}
-- private: {deck: [n*n card ids]}   (never readable by clients)
-- actions: 'flip' {"i": index}, 'answer' {"pick": card id}. A match keeps the turn; a miss passes it.
-- The card images are served from /memory/<genre>/<card id>.png by the app.

create table public.memory_sets (
  id text primary key,
  title text not null,
  cards jsonb not null check (jsonb_typeof(cards) = 'array')
);
alter table public.memory_sets enable row level security;
revoke all on public.memory_sets from public, anon, authenticated;
grant select on public.memory_sets to authenticated;
create policy "Signed-in players can read card sets" on public.memory_sets
  for select to authenticated using (true);

insert into public.memory_sets (id, title, cards) values ('flags', 'Flags of the world', '[
  {"id":"us","name":"United States"},{"id":"cn","name":"China"},{"id":"jp","name":"Japan"},{"id":"kr","name":"South Korea"},
  {"id":"in","name":"India"},{"id":"gb","name":"United Kingdom"},{"id":"fr","name":"France"},{"id":"de","name":"Germany"},
  {"id":"it","name":"Italy"},{"id":"es","name":"Spain"},{"id":"pt","name":"Portugal"},{"id":"ru","name":"Russia"},
  {"id":"ca","name":"Canada"},{"id":"mx","name":"Mexico"},{"id":"br","name":"Brazil"},{"id":"ar","name":"Argentina"},
  {"id":"au","name":"Australia"},{"id":"nz","name":"New Zealand"},{"id":"za","name":"South Africa"},{"id":"eg","name":"Egypt"},
  {"id":"ng","name":"Nigeria"},{"id":"ke","name":"Kenya"},{"id":"sa","name":"Saudi Arabia"},{"id":"tr","name":"Turkey"},
  {"id":"gr","name":"Greece"},{"id":"nl","name":"Netherlands"},{"id":"be","name":"Belgium"},{"id":"ch","name":"Switzerland"},
  {"id":"se","name":"Sweden"},{"id":"no","name":"Norway"},{"id":"dk","name":"Denmark"},{"id":"fi","name":"Finland"},
  {"id":"pl","name":"Poland"},{"id":"ua","name":"Ukraine"},{"id":"ie","name":"Ireland"},{"id":"il","name":"Israel"},
  {"id":"ir","name":"Iran"},{"id":"pk","name":"Pakistan"},{"id":"id","name":"Indonesia"},{"id":"th","name":"Thailand"},
  {"id":"vn","name":"Vietnam"},{"id":"ph","name":"Philippines"},{"id":"sg","name":"Singapore"},{"id":"my","name":"Malaysia"},
  {"id":"co","name":"Colombia"},{"id":"cl","name":"Chile"},{"id":"pe","name":"Peru"},{"id":"cu","name":"Cuba"},
  {"id":"ma","name":"Morocco"},{"id":"et","name":"Ethiopia"}
]'::jsonb);

insert into public.games (id, name, min_players, max_players, default_options)
values ('memory', 'Memory', 2, 2, '{"size": 6, "genre": "flags", "showNames": true}');

create function public.game_memory_init(options jsonb, players jsonb)
returns public.game_result language plpgsql volatile set search_path = '' as $$
declare
  size integer;
  cells integer;
  card_set public.memory_sets%rowtype;
  ids text[];
  pairs text[];
  deck text[];
  empty jsonb;
begin
  if jsonb_typeof(options -> 'size') is distinct from 'number' then raise exception 'Choose a board size of 4, 6, 8 or 10.'; end if;
  if (options ->> 'size')::numeric not in (4, 6, 8, 10) then raise exception 'Choose a board size of 4, 6, 8 or 10.'; end if;
  if jsonb_typeof(options -> 'showNames') is distinct from 'boolean' then raise exception 'Choose whether to show card names.'; end if;
  select * into card_set from public.memory_sets where id = options ->> 'genre';
  if not found then raise exception 'Choose a card set.'; end if;
  size := (options ->> 'size')::integer;
  cells := size * size;
  if cells / 2 > jsonb_array_length(card_set.cards) then
    raise exception 'That card set does not have enough cards for a %x% board.', size, size;
  end if;
  ids := array(select c ->> 'id' from jsonb_array_elements(card_set.cards) as c);
  pairs := array(select x from unnest(ids) as x order by random() limit cells / 2);
  deck := array(select x from unnest(pairs || pairs) as x order by random());
  empty := to_jsonb(array_fill(null::text, array[cells]));
  return row(
    jsonb_build_object('board', empty, 'owner', empty, 'up', '[]'::jsonb, 'shown', '[]'::jsonb, 'mismatch', false,
      'quiz', null, 'qres', null,
      'scores', (select jsonb_object_agg(p ->> 'id', 0) from jsonb_array_elements(players) as p)),
    jsonb_build_object('deck', to_jsonb(deck)),
    0, 'playing', null, null
  )::public.game_result;
end;
$$;

create function public.game_memory_apply(room public.game_rooms, private jsonb, seat integer, action text, payload jsonb)
returns public.game_result language plpgsql volatile set search_path = '' as $$
declare
  player_id text := room.players -> seat ->> 'id';
  deck jsonb := private -> 'deck';
  board jsonb := room.state -> 'board';
  owner jsonb := room.state -> 'owner';
  scores jsonb := room.state -> 'scores';
  quiz jsonb := room.state -> 'quiz';
  qres jsonb := 'null'::jsonb;
  mismatch boolean := (room.state ->> 'mismatch')::boolean;
  up integer[] := array(select v::integer from jsonb_array_elements_text(room.state -> 'up') as v);
  shown integer[] := array(select v::integer from jsonb_array_elements_text(room.state -> 'shown') as v);
  cells integer := jsonb_array_length(room.state -> 'board');
  idx_input numeric;
  idx integer;
  a integer;
  b integer;
  other integer;
  card text;
  options text[];
  pick text;
  correct boolean;
  next_turn integer := seat;
  next_status text := 'playing';
  winner uuid;
  top_a integer;
  top_b integer;
begin
  if action = 'flip' then
    if jsonb_typeof(quiz) = 'object' then raise exception 'Answer the flag question first.'; end if;
    if jsonb_typeof(payload -> 'i') is distinct from 'number' then raise exception 'Choose a card.'; end if;
    idx_input := (payload ->> 'i')::numeric;
    if idx_input <> trunc(idx_input) or idx_input < 0 or idx_input >= cells then raise exception 'Choose a card.'; end if;
    idx := idx_input::integer;

    -- The previous turn's missed pair is hidden again by the next flip.
    if cardinality(up) = 2 then
      foreach other in array up loop board := jsonb_set(board, array[other::text], 'null'::jsonb); end loop;
      up := '{}';
      mismatch := false;
    end if;
    if jsonb_typeof(owner -> idx) = 'string' or idx = any(up) then raise exception 'That card is already face up.'; end if;
    -- The previous match disappears now.
    foreach other in array shown loop board := jsonb_set(board, array[other::text], 'null'::jsonb); end loop;
    shown := '{}';

    up := array_append(up, idx);
    board := jsonb_set(board, array[idx::text], to_jsonb(deck ->> idx));
    if cardinality(up) = 2 then
      a := up[1]; b := up[2];
      if deck ->> a = deck ->> b then
        owner := jsonb_set(jsonb_set(owner, array[a::text], to_jsonb(player_id)), array[b::text], to_jsonb(player_id));
        scores := jsonb_set(scores, array[player_id], to_jsonb((scores ->> player_id)::integer + 1));
        up := '{}';
        shown := array[a, b];
        if (room.options ->> 'showNames')::boolean = false then
          -- Hard mode: a four-choice question about the flag just matched.
          card := deck ->> a;
          options := array(select x from unnest(
              array(select c ->> 'id' from public.memory_sets s, jsonb_array_elements(s.cards) as c
                    where s.id = room.options ->> 'genre' and c ->> 'id' <> card order by random() limit 3) || card) as x
            order by random());
          quiz := jsonb_build_object('player_id', player_id, 'card', card, 'options', to_jsonb(options));
        end if;
      else
        mismatch := true;
        next_turn := (seat + 1) % jsonb_array_length(room.players);
      end if;
    end if;

  elsif action = 'answer' then
    if jsonb_typeof(quiz) is distinct from 'object' then raise exception 'There is no question to answer.'; end if;
    if quiz ->> 'player_id' <> player_id then raise exception 'That question is not yours to answer.'; end if;
    if jsonb_typeof(payload -> 'pick') is distinct from 'string' then raise exception 'Choose an answer.'; end if;
    pick := payload ->> 'pick';
    if not (pick = any(array(select jsonb_array_elements_text(quiz -> 'options')))) then raise exception 'Choose one of the listed answers.'; end if;
    correct := pick = quiz ->> 'card';
    if correct then scores := jsonb_set(scores, array[player_id], to_jsonb((scores ->> player_id)::integer + 1)); end if;
    qres := jsonb_build_object('player_id', player_id, 'correct', correct, 'card', quiz ->> 'card');
    quiz := 'null'::jsonb;

  else
    raise exception 'Unknown action.';
  end if;

  -- Game over when every card is taken (and no question is pending): most points wins, equal points is a draw.
  if jsonb_typeof(quiz) is distinct from 'object'
     and not exists (select 1 from jsonb_array_elements(owner) as o where jsonb_typeof(o) = 'null') then
    next_status := 'finished';
    select (value)::integer into top_a from jsonb_each_text(scores) order by value::integer desc limit 1;
    select (value)::integer into top_b from jsonb_each_text(scores) order by value::integer desc offset 1 limit 1;
    if top_a is distinct from top_b then
      select key::uuid into winner from jsonb_each_text(scores) order by value::integer desc limit 1;
    end if;
  end if;

  return row(
    jsonb_build_object('board', board, 'owner', owner, 'up', to_jsonb(up), 'shown', to_jsonb(shown),
      'mismatch', mismatch, 'quiz', quiz, 'qres', qres, 'scores', scores),
    null, next_turn, next_status, winner, room.turn_ready_at
  )::public.game_result;
end;
$$;

revoke all on function public.game_memory_init(jsonb, jsonb),
  public.game_memory_apply(public.game_rooms, jsonb, integer, text, jsonb) from public, anon, authenticated;
