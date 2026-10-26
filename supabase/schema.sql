-- Prototype schema. Seeded facilities/reports are fictional. Do not insert clinical or
-- personally identifiable information. Browser clients have SELECT access only.
create extension if not exists pgcrypto;

create table if not exists public.facilities (
  id text primary key, code text unique not null, name text not null, region text not null,
  level text not null, people_served integer not null default 0,
  has_fridge boolean not null default true, has_maternity boolean not null default false
);
alter table public.facilities add column if not exists remote boolean not null default false;
alter table public.facilities add column if not exists battery_kwh numeric check (battery_kwh is null or battery_kwh >= 0);
alter table public.facilities add column if not exists usable_fraction numeric check (usable_fraction is null or usable_fraction between 0 and 1);
alter table public.facilities add column if not exists inverter_efficiency numeric check (inverter_efficiency is null or inverter_efficiency between 0 and 1);
alter table public.facilities add column if not exists critical_load_kw numeric check (critical_load_kw is null or critical_load_kw > 0);
alter table public.facilities add column if not exists fridge_holdover_hours numeric check (fridge_holdover_hours is null or fridge_holdover_hours >= 0);
create table if not exists public.demo_users (
  id text primary key, display_name text not null, role text not null
);
create table if not exists public.reports (
  id text primary key, facility_id text not null references public.facilities(id),
  reporter_id text references public.demo_users(id),
  created_at timestamptz not null default now(), outage_hours numeric not null check (outage_hours between 0 and 24),
  battery text not null check (battery in ('healthy','low','failed')),
  backup text not null check (backup in ('available','limited','unavailable')),
  fridge text not null check (fridge in ('healthy','at_risk','failed')),
  channel text not null check (channel in ('web','telegram')), note text
);
alter table public.reports add column if not exists reporter_id text references public.demo_users(id);
alter table public.reports add column if not exists outage_count integer not null default 0 check (outage_count between 0 and 50);
alter table public.reports add column if not exists longest_outage_hours numeric not null default 0 check (longest_outage_hours between 0 and 24);
alter table public.reports add column if not exists outage_window text not null default 'unknown' check (outage_window in ('morning','afternoon','evening','night','unknown'));
alter table public.reports add column if not exists generator_hours numeric not null default 0 check (generator_hours between 0 and 24);
alter table public.reports add column if not exists local_season text not null default 'unknown' check (local_season in ('rainy','dry','other','unknown'));
create table if not exists public.tickets (
  id text primary key, facility_id text not null references public.facilities(id), issue text not null,
  owner text not null default 'District energy officer', created_at timestamptz not null default now(),
  due_at timestamptz not null default (now() + interval '3 days'),
  status text not null check (status in ('open','fixed_reported','verified')),
  fixed_at timestamptz, verified_at timestamptz, healthy_after_fix integer not null default 0
);
create unique index if not exists one_unresolved_ticket_per_facility
  on public.tickets(facility_id) where status <> 'verified';
create table if not exists public.flex_actions (
  id text primary key, facility_id text not null references public.facilities(id),
  created_at timestamptz not null default now(), activity text not null,
  protected_load text not null, completed boolean not null default false, note text
);

-- Public demo write throttling. Only a hash of the client address is retained.
create table if not exists public.demo_write_limits (
  client_hash text primary key, window_started_at timestamptz not null, write_count integer not null
);
alter table public.demo_write_limits enable row level security;
revoke all on public.demo_write_limits from anon, authenticated;
create or replace function public.consume_demo_write_limit(p_client_hash text, p_limit integer default 20, p_window_seconds integer default 3600)
returns boolean language plpgsql security definer set search_path = public as $$
declare current_row public.demo_write_limits%rowtype;
begin
  perform pg_advisory_xact_lock(hashtext(p_client_hash));
  select * into current_row from public.demo_write_limits where client_hash = p_client_hash for update;
  if not found or current_row.window_started_at < now() - make_interval(secs => p_window_seconds) then
    insert into public.demo_write_limits(client_hash, window_started_at, write_count) values(p_client_hash, now(), 1)
      on conflict(client_hash) do update set window_started_at = now(), write_count = 1;
    return true;
  end if;
  if current_row.write_count >= p_limit then return false; end if;
  update public.demo_write_limits set write_count = write_count + 1 where client_hash = p_client_hash;
  return true;
end $$;
revoke all on function public.consume_demo_write_limit(text, integer, integer) from public, anon, authenticated;
grant execute on function public.consume_demo_write_limit(text, integer, integer) to service_role;

alter table public.facilities enable row level security;
alter table public.demo_users enable row level security;
alter table public.reports enable row level security;
alter table public.tickets enable row level security;
alter table public.flex_actions enable row level security;
revoke all on public.facilities, public.demo_users, public.reports, public.tickets, public.flex_actions from anon, authenticated;
grant select on public.facilities, public.demo_users, public.reports, public.tickets, public.flex_actions to anon, authenticated;
drop policy if exists "public demo read facilities" on public.facilities;
create policy "public demo read facilities" on public.facilities for select to anon, authenticated using (true);
drop policy if exists "public demo read users" on public.demo_users;
create policy "public demo read users" on public.demo_users for select to anon, authenticated using (true);
drop policy if exists "public demo read reports" on public.reports;
create policy "public demo read reports" on public.reports for select to anon, authenticated using (true);
drop policy if exists "public demo read tickets" on public.tickets;
create policy "public demo read tickets" on public.tickets for select to anon, authenticated using (true);
drop policy if exists "public demo read flex actions" on public.flex_actions;
create policy "public demo read flex actions" on public.flex_actions for select to anon, authenticated using (true);
-- Writes use the server-only service role after request validation. Anonymous browser writes are denied.

insert into public.facilities (id,code,name,region,level,people_served,has_fridge,has_maternity,remote,battery_kwh,usable_fraction,inverter_efficiency,critical_load_kw) values
 ('f-01','DEMO-01','Highland Health Centre','Amhara','Health centre',8200,true,true,true,10,.8,.9,1.2),
 ('f-02','DEMO-02','Riverbend Health Post','Oromia','Health post',3100,true,false,false,6,.8,.9,.8),
 ('f-03','DEMO-03','Lakeview Health Centre','Sidama','Health centre',6400,true,true,true,8,.75,.88,1.4),
 ('f-04','DEMO-04','Sunrise Primary Clinic','Oromia','Health post',2700,false,false,false,4,.8,.9,.6),
 ('f-05','DEMO-05','Mountain Gate Hospital','Amhara','Hospital',14600,true,true,false,16,.8,.9,2.2),
 ('f-06','DEMO-06','Green Valley Health Centre','Sidama','Health centre',5100,true,false,false,7,.8,.9,1)
on conflict (id) do update set remote=excluded.remote, battery_kwh=excluded.battery_kwh,
 usable_fraction=excluded.usable_fraction, inverter_efficiency=excluded.inverter_efficiency, critical_load_kw=excluded.critical_load_kw;

insert into public.demo_users (id,display_name,role) values
 ('user-01','Sample Reporter 01','Facility energy focal point'),
 ('user-02','Sample Reporter 02','Facility energy focal point'),
 ('user-03','Sample Coordinator','District energy coordinator'),
 ('user-telegram','Telegram demo bot','Automated demo channel')
on conflict (id) do update set display_name=excluded.display_name, role=excluded.role;

insert into public.reports (id,facility_id,reporter_id,created_at,outage_hours,battery,backup,fridge,channel,note) values
 ('r-01','f-01','user-telegram',now()-interval '7 hours',10,'low','limited','at_risk','telegram','SYNTHETIC DEMO DATA'),
 ('r-02','f-01','user-01',now()-interval '1 day',8,'low','available','healthy','web','SYNTHETIC DEMO DATA'),
 ('r-03','f-02','user-02',now()-interval '8 hours',2,'healthy','available','healthy','web','SYNTHETIC DEMO DATA'),
 ('r-04','f-03','user-telegram',now()-interval '8 hours',15,'failed','unavailable','failed','telegram','SYNTHETIC DEMO DATA'),
 ('r-05','f-03','user-03',now()-interval '1 day',11,'low','limited','at_risk','web','SYNTHETIC DEMO DATA'),
 ('r-06','f-04','user-01',now()-interval '8 hours',0,'healthy','available','healthy','web','SYNTHETIC DEMO DATA'),
 ('r-07','f-05','user-02',now()-interval '8 hours',5,'healthy','available','healthy','web','SYNTHETIC DEMO DATA'),
 ('r-08','f-06','user-telegram',now()-interval '8 hours',7,'low','available','healthy','telegram','SYNTHETIC DEMO DATA'),
 ('r-09','f-03','user-03',now()-interval '2 days',14,'low','limited','at_risk','web','SYNTHETIC DEMO DATA'),
 ('r-10','f-06','user-02',now()-interval '2 days',1,'healthy','available','healthy','web','SYNTHETIC DEMO DATA · after reported repair'),
 ('r-11','f-06','user-01',now()-interval '1 day',1,'healthy','available','healthy','web','SYNTHETIC DEMO DATA · after reported repair')
on conflict (id) do update set reporter_id=excluded.reporter_id
where public.reports.reporter_id is null;

update public.reports set
 outage_count = case when outage_hours > 0 then 1 else 0 end,
 longest_outage_hours = outage_hours,
 outage_window = case id when 'r-01' then 'morning' when 'r-02' then 'evening' when 'r-03' then 'afternoon'
   when 'r-04' then 'night' when 'r-05' then 'unknown' when 'r-06' then 'morning' when 'r-07' then 'afternoon'
   when 'r-08' then 'evening' when 'r-09' then 'night' when 'r-10' then 'unknown' when 'r-11' then 'morning' else 'unknown' end,
 generator_hours = case when backup='available' then least(2, outage_hours * .2) else 0 end
where id in ('r-01','r-02','r-03','r-04','r-05','r-06','r-07','r-08','r-09','r-10','r-11');

insert into public.tickets (id,facility_id,issue,created_at,due_at,status,healthy_after_fix) values
 ('t-01','f-03','Battery failed; vaccine fridge at risk',now()-interval '1 day',now()+interval '2 days','open',0),
 ('t-02','f-01','Repeated long grid interruptions; battery low',now()-interval '1 day',now()+interval '2 days','open',0),
 ('t-03','f-06','Battery service check completed',now()-interval '4 days',now()-interval '1 day','verified',2)
on conflict (id) do nothing;

update public.tickets set fixed_at=now()-interval '3 days', verified_at=now()-interval '1 day'
where id='t-03' and status='verified' and fixed_at is null;

insert into public.flex_actions (id,facility_id,created_at,activity,protected_load,completed,note) values
 ('x-01','f-02',now()-interval '1 day','Water pumping','Vaccine refrigerator',true,'DEMO DATA · staff-confirmed sample'),
 ('x-02','f-06',now()-interval '7 hours','Laundry','Essential lighting',true,'DEMO DATA · staff-confirmed sample')
on conflict (id) do nothing;
