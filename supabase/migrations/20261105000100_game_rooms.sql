-- All mutations go through authenticated, transactional functions. No secret key required.
create table public.game_rooms (
  id uuid primary key default gen_random_uuid(),
  code text not null unique,
  host_id uuid not null references auth.users(id),
  players jsonb not null,
  status text not null default 'waiting' check (status in ('waiting', 'playing', 'finished')),
  turn_index integer not null default 0,
  version integer not null default 0,
  last_move jsonb,
  winner_id uuid,
  created_at timestamptz not null default now()
);
alter table public.game_rooms enable row level security;
revoke all on public.game_rooms from anon, authenticated;
grant select on public.game_rooms to authenticated;
create policy "Members can read their room" on public.game_rooms
for select to authenticated using (
  players @> jsonb_build_array(jsonb_build_object('id', (select auth.uid())::text))
);

create function public.host_game(display_name text)
returns uuid language plpgsql security definer set search_path = '' as $$
declare
  user_id uuid := auth.uid();
  room_id uuid;
  room_code text;
begin
  if user_id is null then raise exception 'Sign in as a guest first.'; end if;
  if display_name is null or length(trim(display_name)) not between 1 and 24 then
    raise exception 'Choose a name between 1 and 24 characters.';
  end if;
  -- Serialize creation per guest and bound accidental repeated room creation.
  perform pg_advisory_xact_lock(hashtextextended(user_id::text, 0));
  if (select count(*) from public.game_rooms where host_id = user_id and created_at > now() - interval '1 hour') >= 10 then
    raise exception 'Too many rooms created. Please use an existing room or try later.';
  end if;
  loop
    room_code := upper(substr(replace(gen_random_uuid()::text, '-', ''), 1, 8));
    begin
      insert into public.game_rooms(code, host_id, players) values (
        room_code, user_id, jsonb_build_array(jsonb_build_object('id', user_id, 'name', trim(display_name), 'position', 0))
      ) returning id into room_id;
      exit;
    exception when unique_violation then null;
    end;
  end loop;
  return room_id;
end;
$$;

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
  if room.players @> jsonb_build_array(jsonb_build_object('id', user_id::text)) then return room.id; end if;
  if room.status <> 'waiting' then raise exception 'This game has already started.'; end if;
  if jsonb_array_length(room.players) >= 8 then raise exception 'This room is full (8 players).'; end if;
  update public.game_rooms set players = players || jsonb_build_array(jsonb_build_object('id', user_id, 'name', trim(display_name), 'position', 0)), version = version + 1 where id = room.id;
  return room.id;
end;
$$;

create function public.game_action(room_id uuid, action text, expected_version integer)
returns void language plpgsql security definer set search_path = '' as $$
declare
  user_id uuid := auth.uid();
  room public.game_rooms%rowtype;
  die integer;
  landing integer;
  destination integer;
  jumps jsonb := '{"1":38,"4":14,"9":31,"21":42,"28":84,"36":44,"51":67,"71":91,"80":100,"16":6,"47":26,"49":11,"56":53,"62":19,"64":60,"87":24,"93":73,"95":75,"98":78}';
begin
  select * into room from public.game_rooms where id = room_id for update;
  if not found or user_id is null or not (room.players @> jsonb_build_array(jsonb_build_object('id', user_id::text))) then
    raise exception 'You are not a member of this room.';
  end if;
  if expected_version is null or room.version <> expected_version then raise exception 'The room changed. Please try again.'; end if;
  if action = 'start' then
    if room.host_id <> user_id then raise exception 'Only the host can start the game.'; end if;
    if room.status <> 'waiting' then raise exception 'The game has already started.'; end if;
    if jsonb_array_length(room.players) < 2 then raise exception 'Wait for at least two players.'; end if;
    update public.game_rooms set status = 'playing', version = version + 1 where id = room.id;
  elsif action = 'roll' then
    if room.status <> 'playing' then raise exception 'The game is not in progress.'; end if;
    if room.players -> room.turn_index ->> 'id' <> user_id::text then raise exception 'It is not your turn.'; end if;
    die := floor(random() * 6)::integer + 1;
    landing := (room.players -> room.turn_index ->> 'position')::integer + die;
    -- Exact roll needed to reach 100; an overshoot leaves the player in place.
    if landing > 100 then landing := (room.players -> room.turn_index ->> 'position')::integer; destination := landing;
    else destination := coalesce((jumps ->> landing::text)::integer, landing); end if;
    update public.game_rooms set
      players = jsonb_set(players, array[room.turn_index::text, 'position'], to_jsonb(destination)),
      last_move = jsonb_build_object('player', room.players -> room.turn_index ->> 'name', 'roll', die, 'landing', landing, 'destination', destination),
      status = case when destination = 100 then 'finished' else 'playing' end,
      winner_id = case when destination = 100 then user_id else null end,
      turn_index = (room.turn_index + 1) % jsonb_array_length(room.players), version = version + 1
    where id = room.id;
  elsif action = 'reset' then
    if room.host_id <> user_id then raise exception 'Only the host can return everyone to the lobby.'; end if;
    update public.game_rooms set status = 'waiting', turn_index = 0, winner_id = null, last_move = null,
      players = (select jsonb_agg(jsonb_set(p, '{position}', '0'::jsonb) order by n) from jsonb_array_elements(room.players) with ordinality as entry(p, n)),
      version = version + 1 where id = room.id;
  else raise exception 'Unknown action.';
  end if;
end;
$$;

revoke all on function public.host_game(text), public.join_game(text, text), public.game_action(uuid, text, integer) from public, anon;
grant execute on function public.host_game(text), public.join_game(text, text), public.game_action(uuid, text, integer) to authenticated;

-- Subscribe only to committed state; RLS restricts events to room members.
alter publication supabase_realtime add table public.game_rooms;
