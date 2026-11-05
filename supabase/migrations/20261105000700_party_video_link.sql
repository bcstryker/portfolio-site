alter table public.game_rooms add column meet_url text
  check (meet_url is null or meet_url ~ '^https://meet[.]google[.]com/[a-z]{3}-[a-z]{4}-[a-z]{3}$');

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
