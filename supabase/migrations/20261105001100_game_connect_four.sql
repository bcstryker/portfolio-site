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
