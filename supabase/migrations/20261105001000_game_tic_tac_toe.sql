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
