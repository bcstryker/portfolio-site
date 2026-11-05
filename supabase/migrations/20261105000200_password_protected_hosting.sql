-- Only the password-checking server endpoint may create rooms.
-- Retire the browser-callable signature to prevent bypassing the password.
drop function public.host_game(text);

create function public.host_game(display_name text, host_user_id uuid)
returns uuid language plpgsql security definer set search_path = '' as $$
declare
  user_id uuid := host_user_id;
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

revoke all on function public.host_game(text, uuid) from public, anon, authenticated;
grant execute on function public.host_game(text, uuid) to service_role;
