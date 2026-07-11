-- Enable the pg_cron extension in Supabase Dashboard before running this file.
select cron.schedule(
  'matchdeck-expired-room-cleanup',
  '15 * * * *',
  'select public.cleanup_expired_rooms();'
);
