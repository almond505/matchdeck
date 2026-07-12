create or replace function touch_room_event_from_child()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  changed_room_id uuid;
begin
  changed_room_id := case when tg_op = 'DELETE' then old.room_id else new.room_id end;
  insert into room_events (room_id, revision)
  select changed_room_id, 1 where exists (select from rooms where id = changed_room_id)
  on conflict (room_id) do update set revision = room_events.revision + 1, updated_at = now();
  if tg_op = 'DELETE' then return old; end if;
  return new;
end;
$$;
