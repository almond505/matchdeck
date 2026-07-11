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
alter table room_events enable row level security;

create policy "room event reads are safe" on room_events for select to anon using (true);

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
