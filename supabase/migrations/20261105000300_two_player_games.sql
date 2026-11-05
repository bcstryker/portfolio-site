-- Existing rooms remain Chutes and Ladders games.
alter table public.game_rooms
  add column game_type text not null default 'chutes-and-ladders' check (game_type in ('chutes-and-ladders', 'tic-tac-toe', 'connect-four')),
  add column board jsonb not null default '[]',
  add column winning_cells integer[] not null default '{}';

drop function public.host_game(text, uuid);
drop function public.game_action(uuid, text, integer);

create function public.host_game(display_name text, host_user_id uuid, selected_game text default 'chutes-and-ladders')
returns uuid language plpgsql security definer set search_path = '' as $$
declare
  user_id uuid := host_user_id;
  room_id uuid;
  room_code text;
begin
  if selected_game is null or selected_game not in ('chutes-and-ladders', 'tic-tac-toe', 'connect-four') then raise exception 'Choose a supported game.'; end if;
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
      insert into public.game_rooms(code, host_id, players, game_type, board) values (
        room_code, user_id, jsonb_build_array(jsonb_build_object('id', user_id, 'name', trim(display_name), 'position', 0)), selected_game,
        case selected_game when 'tic-tac-toe' then to_jsonb(array_fill(0, array[9])) when 'connect-four' then to_jsonb(array_fill(0, array[42])) else '[]'::jsonb end
      ) returning id into room_id;
      exit;
    exception when unique_violation then null;
    end;
  end loop;
  return room_id;
end;
$$;

create or replace function public.join_game(room_key text, display_name text)
returns uuid language plpgsql security definer set search_path = '' as $$
declare
  user_id uuid := auth.uid();
  room public.game_rooms%rowtype;
  max_players integer;
begin
  if user_id is null then raise exception 'Sign in as a guest first.'; end if;
  if display_name is null or length(trim(display_name)) not between 1 and 24 then
    raise exception 'Choose a name between 1 and 24 characters.';
  end if;
  select * into room from public.game_rooms where code = upper(trim(room_key)) for update;
  if not found then raise exception 'Room not found. Check the key and try again.'; end if;
  if room.players @> jsonb_build_array(jsonb_build_object('id', user_id::text)) then return room.id; end if;
  if room.status <> 'waiting' then raise exception 'This game has already started.'; end if;
  max_players := case when room.game_type = 'chutes-and-ladders' then 8 else 2 end;
  if jsonb_array_length(room.players) >= max_players then raise exception 'This room is full (% players).', max_players; end if;
  update public.game_rooms set players = players || jsonb_build_array(jsonb_build_object('id', user_id, 'name', trim(display_name), 'position', 0)), version = version + 1 where id = room.id;
  return room.id;
end;
$$;

create function public.game_action(room_id uuid, action text, expected_version integer, move integer default null)
returns void language plpgsql security definer set search_path = '' as $$
declare
  user_id uuid := auth.uid();
  room public.game_rooms%rowtype;
  die integer;
  landing integer;
  destination integer;
  cells jsonb;
  width integer;
  height integer;
  needed integer;
  slot integer;
  mark integer;
  r integer;
  c integer;
  dr integer;
  dc integer;
  n integer;
  rr integer;
  cc integer;
  line integer[];
  winning integer[] := '{}';
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
    if room.game_type <> 'chutes-and-ladders' and jsonb_array_length(room.players) <> 2 then raise exception 'This game requires exactly two players.'; end if;
    update public.game_rooms set status = 'playing', version = version + 1 where id = room.id;
  elsif action = 'play' then
    if room.game_type = 'chutes-and-ladders' then raise exception 'Roll the die for this game.'; end if;
    if room.status <> 'playing' then raise exception 'The game is not in progress.'; end if;
    if room.players -> room.turn_index ->> 'id' <> user_id::text then raise exception 'It is not your turn.'; end if;
    width := case when room.game_type = 'tic-tac-toe' then 3 else 7 end;
    height := case when room.game_type = 'tic-tac-toe' then 3 else 6 end;
    needed := case when room.game_type = 'tic-tac-toe' then 3 else 4 end;
    mark := room.turn_index + 1;
    if room.game_type = 'tic-tac-toe' then
      if move is null or move < 0 or move >= 9 then raise exception 'Choose a square on the board.'; end if;
      slot := move;
      if (room.board ->> slot)::integer <> 0 then raise exception 'That square is already taken.'; end if;
    else
      if move is null or move < 0 or move >= 7 then raise exception 'Choose a column on the board.'; end if;
      slot := null;
      for r in reverse 5..0 loop
        if (room.board ->> (r * width + move))::integer = 0 then slot := r * width + move; exit; end if;
      end loop;
      if slot is null then raise exception 'That column is full.'; end if;
    end if;
    cells := jsonb_set(room.board, array[slot::text], to_jsonb(mark));
    -- Check horizontal, vertical, and both diagonal directions, without row wrapping.
    for r in 0..height - 1 loop
      for c in 0..width - 1 loop
        for dr in 0..1 loop
          for dc in -1..1 loop
            if (dr = 0 and dc <> 1) then continue; end if;
            line := '{}';
            for n in 0..needed - 1 loop
              rr := r + dr * n; cc := c + dc * n;
              if rr < 0 or rr >= height or cc < 0 or cc >= width then exit; end if;
              if (cells ->> (rr * width + cc))::integer <> mark then exit; end if;
              line := array_append(line, rr * width + cc);
            end loop;
            if cardinality(line) = needed then winning := line; end if;
          end loop;
        end loop;
      end loop;
    end loop;
    update public.game_rooms set board = cells, winning_cells = winning,
      status = case when cardinality(winning) > 0 or not (cells @> '0'::jsonb) then 'finished' else 'playing' end,
      winner_id = case when cardinality(winning) > 0 then user_id else null end,
      last_move = jsonb_build_object('player', room.players -> room.turn_index ->> 'name', 'slot', slot),
      turn_index = (room.turn_index + 1) % 2, version = version + 1
    where id = room.id;
  elsif action = 'roll' then
    if room.game_type <> 'chutes-and-ladders' then raise exception 'Choose a board move for this game.'; end if;
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
    update public.game_rooms set status = 'waiting', turn_index = 0, winner_id = null, last_move = null, winning_cells = '{}',
      board = case room.game_type when 'tic-tac-toe' then to_jsonb(array_fill(0, array[9])) when 'connect-four' then to_jsonb(array_fill(0, array[42])) else '[]'::jsonb end,
      players = (select jsonb_agg(jsonb_set(p, '{position}', '0'::jsonb) order by entry.n) from jsonb_array_elements(room.players) with ordinality as entry(p, n)),
      version = version + 1 where id = room.id;
  else raise exception 'Unknown action.';
  end if;
end;
$$;


revoke all on function public.host_game(text, uuid, text) from public, anon, authenticated;
grant execute on function public.host_game(text, uuid, text) to service_role;
revoke all on function public.game_action(uuid, text, integer, integer) from public, anon;
grant execute on function public.game_action(uuid, text, integer, integer) to authenticated;
