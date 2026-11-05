-- Give existing parties a full grace period when this migration is deployed.
alter table public.game_rooms add column last_active_at timestamptz not null default now();
create index game_rooms_last_active_at_idx on public.game_rooms(last_active_at);

create function public.mark_game_room_active()
returns trigger language plpgsql set search_path = '' as $$
begin
  new.last_active_at := clock_timestamp();
  return new;
end;
$$;
create trigger game_room_activity before update on public.game_rooms
for each row execute function public.mark_game_room_active();

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
revoke all on function public.mark_game_room_active() from public, anon, authenticated;

create or replace function public.host_game(display_name text, host_user_id uuid, selected_game text default 'chutes-and-ladders')
returns uuid language plpgsql security definer set search_path = '' as $$
declare
  user_id uuid := host_user_id;
  room_id uuid;
  room_code text;
begin
  if selected_game is null or selected_game not in ('chutes-and-ladders', 'tic-tac-toe', 'connect-four', 'candy-land') then raise exception 'Choose a supported game.'; end if;
  if user_id is null then raise exception 'Sign in as a guest first.'; end if;
  if display_name is null or length(trim(display_name)) not between 1 and 24 then
    raise exception 'Choose a name between 1 and 24 characters.';
  end if;
  -- Serialize creation per guest and bound accidental repeated room creation.
  perform pg_advisory_xact_lock(hashtextextended(user_id::text, 0));
  if (select count(*) from public.game_rooms where host_id = user_id and created_at > now() - interval '1 hour') >= 10 then
    raise exception 'Too many rooms created. Please use an existing room or try later.';
  end if;
  -- Lock only expired rows; skip any room being used by another transaction.
  -- Cleanup rolls back if creation of the new room fails.
  with expired as (
    select id from public.game_rooms
    where last_active_at < clock_timestamp() - interval '1 hour'
    for update skip locked
  )
  delete from public.game_rooms where id in (select id from expired);
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

