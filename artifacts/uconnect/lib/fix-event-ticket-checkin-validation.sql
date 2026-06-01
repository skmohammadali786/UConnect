-- Fix event ticket check-in validation.
-- Run this in the Supabase SQL editor if approved RSVP tickets generate but
-- host/admin scans show "Invalid ticket".

create or replace function checkin_event_ticket(p_event_id uuid, p_ticket_code text)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_ticket_id uuid;
  v_code text := btrim(coalesce(p_ticket_code, ''));
begin
  if auth.uid() is null then
    raise exception 'Authentication required';
  end if;

  if not exists (
    select 1 from events e where e.id = p_event_id and e.organizer_id = auth.uid()
  ) then
    raise exception 'Not event organizer';
  end if;

  if v_code = '' then
    raise exception 'Invalid ticket';
  end if;

  select t.id into v_ticket_id
  from event_tickets t
  join event_rsvps r on r.event_id = t.event_id and r.user_id = t.user_id
  where t.event_id = p_event_id
    and btrim(t.code) = v_code
    and r.status = 'approved';

  if v_ticket_id is null then
    raise exception 'Invalid ticket';
  end if;

  insert into event_checkins(event_id, ticket_id, checked_in_by)
  values (p_event_id, v_ticket_id, auth.uid())
  on conflict (ticket_id) do update
    set checked_in_at = excluded.checked_in_at,
        checked_in_by = excluded.checked_in_by;
end;
$$;

grant execute on function checkin_event_ticket(uuid, text) to authenticated;
