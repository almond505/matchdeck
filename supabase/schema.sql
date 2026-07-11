create table rooms (
  id uuid primary key default gen_random_uuid(),
  room_code text unique not null check (room_code ~ '^[A-Z]{4,5}[1-9]$'),
  prompt text not null default '',
  status text not null default 'waiting' check (status in ('waiting', 'writing', 'revealed')),
  host_session_id text not null,
  round_number integer not null default 1,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  expires_at timestamptz not null default now() + interval '24 hours'
);

create table participants (
  id uuid primary key default gen_random_uuid(),
  room_id uuid not null references rooms(id) on delete cascade,
  session_id text not null,
  display_name text not null check (char_length(display_name) <= 32),
  card_rank text not null check (card_rank in ('A', 'K', 'Q', 'J', '10', '9', '8', '7', '6', '5', '4', '3', '2')),
  card_suit text not null check (card_suit in ('♣', '♠', '♥', '♦')),
  joined_at timestamptz not null default now(),
  last_seen_at timestamptz not null default now(),
  unique(room_id, session_id)
);

create table cards (
  id uuid primary key default gen_random_uuid(),
  room_id uuid not null references rooms(id) on delete cascade,
  participant_id uuid not null references participants(id) on delete cascade,
  round_number integer not null default 1,
  text text not null check (char_length(text) <= 100),
  normalized_text text not null,
  group_key text,
  created_at timestamptz not null default now()
);

create table card_submission_limits (
  room_id uuid not null references rooms(id) on delete cascade,
  session_id text not null,
  window_started_at timestamptz not null default now(),
  submission_count integer not null default 0,
  primary key (room_id, session_id)
);

create index idx_rooms_room_code on rooms(room_code);
create index idx_participants_room_id on participants(room_id);
create index idx_cards_room_round on cards(room_id, round_number);

create table room_events (
  room_id uuid primary key references rooms(id) on delete cascade,
  revision bigint not null default 0,
  updated_at timestamptz not null default now()
);

alter table rooms enable row level security;
alter table participants enable row level security;
alter table cards enable row level security;
alter table card_submission_limits enable row level security;
alter table room_events enable row level security;

create policy "room event reads are safe" on room_events for select to anon using (true);

create or replace function consume_card_submission(p_room_id uuid, p_session_id text)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  current_count integer;
begin
  insert into card_submission_limits (room_id, session_id, submission_count)
  values (p_room_id, p_session_id, 1)
  on conflict (room_id, session_id) do update set
    window_started_at = case
      when card_submission_limits.window_started_at <= now() - interval '10 seconds' then now()
      else card_submission_limits.window_started_at
    end,
    submission_count = case
      when card_submission_limits.window_started_at <= now() - interval '10 seconds' then 1
      else card_submission_limits.submission_count + 1
    end
  returning submission_count into current_count;

  if current_count > 12 then
    raise exception 'Too many cards too quickly. Try again in a moment.' using errcode = 'P0001';
  end if;
end;
$$;

create or replace function cleanup_expired_rooms()
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  delete from rooms where expires_at <= now();
end;
$$;

create or replace function touch_room_event_from_room()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into room_events (room_id, revision) values (new.id, 1)
  on conflict (room_id) do update set revision = room_events.revision + 1, updated_at = now();
  return new;
end;
$$;

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
  insert into room_events (room_id, revision) values (changed_room_id, 1)
  on conflict (room_id) do update set revision = room_events.revision + 1, updated_at = now();
  if tg_op = 'DELETE' then return old; end if;
  return new;
end;
$$;

create trigger room_events_from_rooms
after insert or update on rooms
for each row execute function touch_room_event_from_room();

create trigger room_events_from_participants
after insert or update or delete on participants
for each row execute function touch_room_event_from_child();

create trigger room_events_from_cards
after insert or update or delete on cards
for each row execute function touch_room_event_from_child();

alter publication supabase_realtime add table room_events;

grant usage on schema public to anon, service_role;
grant all on table rooms, participants, cards, card_submission_limits, room_events to service_role;
grant select on table room_events to anon;
grant execute on function consume_card_submission(uuid, text) to service_role;
