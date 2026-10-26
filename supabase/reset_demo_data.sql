-- DESTRUCTIVE TO DEMO HISTORY ONLY: clears every report, ticket and flexibility
-- action in this fictional demo database. Keep real deployments out of this schema.
begin;
delete from public.flex_actions;
delete from public.tickets;
delete from public.reports;
commit;

-- After this script completes, rerun schema.sql to reseed the fictional samples.
