-- Fix team membership RLS recursion/feed writes and automatically issue tickets
-- when an event RSVP becomes approved.

-- Team helper functions must bypass team_members RLS; otherwise policies that
-- call them can fail with recursive policy checks and make team feed inserts
-- (posts, photos, polls, tasks, events) fail for admins.
create or replace function is_team_member(p_team_id uuid, p_user_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select p_user_id is not null and (
    exists (
      select 1 from team_members m where m.team_id = p_team_id and m.user_id = p_user_id
    )
    or exists (
      select 1 from teams t where t.id = p_team_id and t.poster_id = p_user_id
    )
  );
$$;

create or replace function is_team_admin(p_team_id uuid, p_user_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select p_user_id is not null and (
    exists (
      select 1 from team_members m where m.team_id = p_team_id and m.user_id = p_user_id and m.role = 'admin'
    )
    or exists (
      select 1 from teams t where t.id = p_team_id and t.poster_id = p_user_id
    )
  );
$$;

grant execute on function is_team_member(uuid, uuid) to authenticated;
grant execute on function is_team_admin(uuid, uuid) to authenticated;

-- Replace recursive team_members policies with helper-based policies.
drop policy if exists "Members can view team members" on team_members;
drop policy if exists "Admins can manage memberships" on team_members;
drop policy if exists "Admins can insert memberships" on team_members;
drop policy if exists "Admins can update memberships" on team_members;
drop policy if exists "Admins can delete memberships" on team_members;

create policy "Members can view team members" on team_members for select
  using (auth.uid() = user_id or is_team_member(team_id, auth.uid()));

create policy "Admins can insert memberships" on team_members for insert
  with check (is_team_admin(team_id, auth.uid()));
create policy "Admins can update memberships" on team_members for update
  using (is_team_admin(team_id, auth.uid()))
  with check (is_team_admin(team_id, auth.uid()));
create policy "Admins can delete memberships" on team_members for delete
  using (is_team_admin(team_id, auth.uid()));

-- Make membership-maintenance triggers independent of the caller's RLS context.
create or replace function add_team_owner_membership()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into team_members(team_id, user_id, role)
  values (new.id, new.poster_id, 'admin')
  on conflict (team_id, user_id) do update set role = 'admin';
  return new;
end;
$$;

create or replace function add_team_member_on_approval()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.status = 'approved' then
    insert into team_members(team_id, user_id, role)
    values (new.team_id, new.user_id, 'member')
    on conflict (team_id, user_id) do nothing;
  end if;
  return new;
end;
$$;

-- Backfill memberships for existing teams and already-approved requests.
insert into team_members(team_id, user_id, role)
select id, poster_id, 'admin'
from teams
on conflict (team_id, user_id) do update set role = 'admin';

insert into team_members(team_id, user_id, role)
select team_id::uuid, user_id::uuid, 'member'
from team_requests
where status = 'approved'
  and team_id is not null
  and user_id is not null
on conflict (team_id, user_id) do nothing;

-- Some existing projects were created before ticket tables were added.
-- Create the ticket/check-in tables and their RLS policies before the ticket
-- trigger below references event_tickets.
create extension if not exists "uuid-ossp";

create table if not exists event_tickets (
  id uuid primary key default uuid_generate_v4(),
  event_id uuid not null references events(id) on delete cascade,
  user_id uuid not null references profiles(id) on delete cascade,
  code text not null unique,
  issued_at timestamptz not null default now(),
  unique(event_id, user_id)
);

alter table event_tickets enable row level security;

drop policy if exists "Ticket owners and hosts can view" on event_tickets;
drop policy if exists "Event hosts can insert tickets" on event_tickets;

create policy "Ticket owners and hosts can view" on event_tickets for select
  using (
    auth.uid() = user_id
    or exists (select 1 from events e where e.id = event_tickets.event_id and e.organizer_id = auth.uid())
  );

create policy "Event hosts can insert tickets" on event_tickets for insert
  with check (exists (select 1 from events e where e.id = event_tickets.event_id and e.organizer_id = auth.uid()));

create index if not exists idx_event_tickets_event
  on event_tickets(event_id, issued_at desc);
create index if not exists idx_event_tickets_user
  on event_tickets(user_id, issued_at desc);

create table if not exists event_checkins (
  id uuid primary key default uuid_generate_v4(),
  event_id uuid not null references events(id) on delete cascade,
  ticket_id uuid not null references event_tickets(id) on delete cascade,
  checked_in_by uuid not null references profiles(id) on delete cascade,
  checked_in_at timestamptz not null default now(),
  unique(ticket_id)
);

alter table event_checkins enable row level security;

drop policy if exists "Hosts can view checkins" on event_checkins;
drop policy if exists "Hosts can insert checkins" on event_checkins;

create policy "Hosts can view checkins" on event_checkins for select
  using (exists (select 1 from events e where e.id = event_checkins.event_id and e.organizer_id = auth.uid()));

create policy "Hosts can insert checkins" on event_checkins for insert
  with check (exists (select 1 from events e where e.id = event_checkins.event_id and e.organizer_id = auth.uid()));

create index if not exists idx_event_checkins_event
  on event_checkins(event_id, checked_in_at desc);

-- Ticket generation helper used by RSVP approval paths. It is idempotent and
-- preserves an existing code for the same event/user pair.
create or replace function ensure_event_ticket_for_approved_rsvp(p_event_id uuid, p_user_id uuid)
returns text
language plpgsql
security definer
set search_path = public
as $$
declare
  v_code text;
begin
  if not exists (
    select 1 from event_rsvps r
    where r.event_id = p_event_id
      and r.user_id = p_user_id
      and r.status = 'approved'
  ) then
    return null;
  end if;

  select code into v_code
  from event_tickets
  where event_id = p_event_id and user_id = p_user_id;

  if v_code is not null then
    return v_code;
  end if;

  v_code := replace(uuid_generate_v4()::text, '-', '');
  insert into event_tickets(event_id, user_id, code)
  values (p_event_id, p_user_id, v_code)
  on conflict (event_id, user_id) do update
    set code = event_tickets.code
  returning code into v_code;

  return v_code;
end;
$$;

grant execute on function ensure_event_ticket_for_approved_rsvp(uuid, uuid) to authenticated;

create or replace function issue_event_ticket_after_rsvp_approval()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.status = 'approved' and (tg_op = 'INSERT' or old.status is distinct from new.status) then
    perform ensure_event_ticket_for_approved_rsvp(new.event_id, new.user_id);
  end if;
  return new;
end;
$$;

drop trigger if exists issue_event_ticket_after_rsvp_approval on event_rsvps;
create trigger issue_event_ticket_after_rsvp_approval
after insert or update of status on event_rsvps
for each row
when (new.status = 'approved')
execute function issue_event_ticket_after_rsvp_approval();

-- Backfill tickets for RSVPs that were approved before this fix was applied.
insert into event_tickets(event_id, user_id, code)
select r.event_id, r.user_id, replace(uuid_generate_v4()::text, '-', '')
from event_rsvps r
where r.status = 'approved'
on conflict (event_id, user_id) do nothing;
