create table if not exists votes (
  room_id uuid not null references rooms(id) on delete cascade,
  participant_id uuid not null references participants(id) on delete cascade,
  card_id uuid not null references cards(id) on delete cascade,
  round_number integer not null,
  primary key (room_id, round_number, participant_id)
);

create index if not exists idx_votes_room_round on votes(room_id, round_number);

alter table votes enable row level security;

do $$
begin
  if not exists (select 1 from pg_trigger where tgname = 'room_events_from_votes') then
    create trigger room_events_from_votes
    after insert or update or delete on votes
    for each row execute function touch_room_event_from_child();
  end if;
end;
$$;

grant all on table votes to service_role;
