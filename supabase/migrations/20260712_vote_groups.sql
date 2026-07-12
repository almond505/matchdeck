alter table votes add column if not exists group_id text;
update votes set group_id = card_id::text where group_id is null;
alter table votes alter column group_id set not null;
