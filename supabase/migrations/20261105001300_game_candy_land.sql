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
  event_end timestamptz := clock_timestamp() + interval '2700 milliseconds';
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
