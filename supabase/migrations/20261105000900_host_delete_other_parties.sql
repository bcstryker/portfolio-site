-- Explicit host tool: unlike automatic expiration, this includes active parties.
create function public.delete_other_parties(current_room_id uuid)
returns integer language plpgsql security definer set search_path = '' as $$
declare
  room public.game_rooms%rowtype;
  deleted_count integer;
begin
  -- Serialize global deletes before locking a room, avoiding competing-host deadlocks.
  perform pg_advisory_xact_lock(hashtextextended('delete_other_parties', 0));
  select * into room from public.game_rooms where id = current_room_id for update;
  if not found or auth.uid() is null or room.host_id <> auth.uid() then
    raise exception 'Only the host of the current party can delete other parties.';
  end if;
  delete from public.game_rooms where id <> room.id;
  get diagnostics deleted_count = row_count;
  return deleted_count;
end;
$$;
revoke all on function public.delete_other_parties(uuid) from public, anon;
grant execute on function public.delete_other_parties(uuid) to authenticated;
