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
