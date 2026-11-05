-- Generic room handling and the game_action router.
-- Each game supplies two functions (added in the next migration):
--   game_<id>_init(options jsonb, player_count integer)                              returns game_result
--   game_<id>_apply(room game_rooms, private jsonb, seat integer, action text, payload jsonb) returns game_result
-- The router does everything common (membership, version, turns, animations, start/reset/kick); games only
-- implement their own moves. Adding a game = a `games` row, those two functions, and one line in each dispatcher below.

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
create function public.game_init(game_type text, options jsonb, player_count integer)
returns public.game_result language plpgsql set search_path = '' as $$
begin
  return case game_type
    when 'tic-tac-toe' then public.game_tic_tac_toe_init(options, player_count)
    when 'connect-four' then public.game_connect_four_init(options, player_count)
    when 'chutes-and-ladders' then public.game_chutes_and_ladders_init(options, player_count)
    when 'candy-land' then public.game_candy_land_init(options, player_count)
    else null
  end;
end;
$$;

create function public.game_apply(room public.game_rooms, private jsonb, seat integer, action text, payload jsonb)
returns public.game_result language plpgsql set search_path = '' as $$
begin
  return case room.game_type
    when 'tic-tac-toe' then public.game_tic_tac_toe_apply(room, private, seat, action, payload)
    when 'connect-four' then public.game_connect_four_apply(room, private, seat, action, payload)
    when 'chutes-and-ladders' then public.game_chutes_and_ladders_apply(room, private, seat, action, payload)
    when 'candy-land' then public.game_candy_land_apply(room, private, seat, action, payload)
    else null
  end;
end;
$$;
revoke all on function public.game_seat(jsonb, uuid), public.game_init(text, jsonb, integer),
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
    result := public.game_init(room.game_type, room.options, count_players);
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
