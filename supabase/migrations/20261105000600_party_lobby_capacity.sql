-- The waiting lobby holds the party independently of the currently selected game.
-- Starting a two-player game still requires exactly two seats.
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
  max_players := 8;
  if jsonb_array_length(room.players) >= max_players then raise exception 'This room is full (% players).', max_players; end if;
  update public.game_rooms set players = players || jsonb_build_array(jsonb_build_object('id', user_id, 'name', trim(display_name), 'position', 0)), version = version + 1 where id = room.id;
  return room.id;
end;
$$;

