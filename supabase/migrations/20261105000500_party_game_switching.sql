-- A room is the party: changing games preserves its key, host, and all player seats.
create function public.change_party_game(room_id uuid, selected_game text, expected_version integer)
returns void language plpgsql security definer set search_path = '' as $$
declare
  room public.game_rooms%rowtype;
  user_id uuid := auth.uid();
  capacity integer;
begin
  select * into room from public.game_rooms where id = room_id for update;
  if not found or user_id is null or room.host_id <> user_id then
    raise exception 'Only the host can choose the party’s next game.';
  end if;
  if expected_version is null or room.version <> expected_version then raise exception 'The room changed. Please try again.'; end if;
  if room.status = 'playing' then raise exception 'Return everyone to the lobby before changing games.'; end if;
  if room.turn_ready_at > clock_timestamp() then raise exception 'Wait for the current animation to finish.'; end if;
  if selected_game is null or selected_game not in ('candy-land', 'chutes-and-ladders', 'tic-tac-toe', 'connect-four') then
    raise exception 'Choose a supported game.';
  end if;
  capacity := case when selected_game in ('tic-tac-toe', 'connect-four') then 2 else 8 end;
  if jsonb_array_length(room.players) > capacity then raise exception 'This game supports only % players. Your party has %.', capacity, jsonb_array_length(room.players); end if;
  delete from public.game_decks where game_room_id = room.id;
  update public.game_rooms set game_type = selected_game, status = 'waiting', turn_index = 0,
    winner_id = null, last_move = null, turn_ready_at = null, winning_cells = '{}',
    board = case selected_game when 'tic-tac-toe' then to_jsonb(array_fill(0, array[9])) when 'connect-four' then to_jsonb(array_fill(0, array[42])) else '[]'::jsonb end,
    players = (select jsonb_agg(jsonb_set(entry.p, '{position}', '0'::jsonb) order by entry.n) from jsonb_array_elements(room.players) with ordinality as entry(p, n)),
    version = version + 1
  where id = room.id;
end;
$$;
revoke all on function public.change_party_game(uuid, text, integer) from public, anon;
grant execute on function public.change_party_game(uuid, text, integer) to authenticated;
