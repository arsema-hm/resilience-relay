-- Prototype schema. Seeded facilities/reports are fictional. Do not insert clinical or
-- personally identifiable information. Browser clients have SELECT access only.
create extension if not exists pgcrypto;

create table if not exists public.facilities (
  id text primary key, code text unique not null, name text not null, region text not null,
  level text not null, people_served integer not null default 0,
  has_fridge boolean not null default true, has_maternity boolean not null default false
);
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

insert into public.facilities (id,code,name,region,level,people_served,has_fridge,has_maternity) values
 ('f-01','DEMO-01','Highland Health Centre','Amhara','Health centre',8200,true,true),
 ('f-02','DEMO-02','Riverbend Health Post','Oromia','Health post',3100,true,false),
 ('f-03','DEMO-03','Lakeview Health Centre','Sidama','Health centre',6400,true,true),
 ('f-04','DEMO-04','Sunrise Primary Clinic','Oromia','Health post',2700,false,false),
 ('f-05','DEMO-05','Mountain Gate Hospital','Amhara','Hospital',14600,true,true),
 ('f-06','DEMO-06','Green Valley Health Centre','Sidama','Health centre',5100,true,false)
on conflict (id) do nothing;

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
