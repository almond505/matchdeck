create table rooms (
  id uuid primary key default gen_random_uuid(),
  room_code text unique not null,
  prompt text not null default '',
  status text not null default 'waiting',
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
  display_name text not null,
  avatar text,
  joined_at timestamptz not null default now(),
  last_seen_at timestamptz not null default now(),
  unique(room_id, session_id)
);

create table cards (
  id uuid primary key default gen_random_uuid(),
  room_id uuid not null references rooms(id) on delete cascade,
  participant_id uuid not null references participants(id) on delete cascade,
  round_number integer not null default 1,
  text text not null,
  normalized_text text not null,
  group_key text,
  created_at timestamptz not null default now()
);

create index idx_rooms_room_code on rooms(room_code);
create index idx_participants_room_id on participants(room_id);
create index idx_cards_room_round on cards(room_id, round_number);
