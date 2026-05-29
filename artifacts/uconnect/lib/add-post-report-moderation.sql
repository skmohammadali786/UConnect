-- Post report moderation workflow for UConnect
-- Run this in the Supabase SQL Editor after the base schema.
-- Optional: add moderators with:
--   insert into public.app_moderators(user_id) values ('<moderator-profile-uuid>') on conflict do nothing;

create extension if not exists "uuid-ossp";

-- Moderators that should receive report notifications in Supabase/app notifications.
create table if not exists app_moderators (
  user_id uuid primary key references profiles(id) on delete cascade,
  created_at timestamptz not null default now()
);

alter table app_moderators enable row level security;

drop policy if exists "Moderators can view moderators" on app_moderators;
create policy "Moderators can view moderators" on app_moderators
for select using (
  exists (select 1 from app_moderators m where m.user_id = auth.uid())
);

-- Keep report history even if the reported post is deleted.
alter table reports
  alter column post_id drop not null,
  add column if not exists post_author_id uuid references profiles(id) on delete set null,
  add column if not exists post_author_username text,
  add column if not exists post_content_preview text,
  add column if not exists post_was_deleted boolean not null default false,
  add column if not exists action text not null default 'pending' check (action in ('pending', 'reviewed', 'no_action', 'post_deleted', 'warning_issued', 'other')),
  add column if not exists resolution_message text,
  add column if not exists reviewed_by uuid references profiles(id) on delete set null,
  add column if not exists reviewed_at timestamptz,
  add column if not exists updated_at timestamptz not null default now();

alter table reports drop constraint if exists reports_post_id_fkey;
alter table reports
  add constraint reports_post_id_fkey foreign key (post_id) references posts(id) on delete set null;

alter table reports drop constraint if exists reports_status_check;
alter table reports
  add constraint reports_status_check check (status in ('pending', 'reviewed', 'resolved'));

create unique index if not exists reports_reporter_post_unique
  on reports(reporter_id, post_id)
  where post_id is not null;

create index if not exists idx_reports_status_created_at on reports(status, created_at desc);
create index if not exists idx_reports_reporter_created_at on reports(reporter_id, created_at desc);
create index if not exists idx_reports_post_author_id on reports(post_author_id);

create or replace function set_reports_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists trg_reports_updated_at on reports;
create trigger trg_reports_updated_at
before update on reports
for each row execute function set_reports_updated_at();

-- Allows reporters to see their own enriched report history and moderators to review reports.
drop policy if exists "Users can view own reports" on reports;
drop policy if exists "Reporters and moderators can view reports" on reports;
create policy "Reporters and moderators can view reports" on reports
for select using (
  auth.uid() = reporter_id
  or exists (select 1 from app_moderators m where m.user_id = auth.uid())
);

drop policy if exists "Moderators can update reports" on reports;
create policy "Moderators can update reports" on reports
for update using (
  exists (select 1 from app_moderators m where m.user_id = auth.uid())
)
with check (
  exists (select 1 from app_moderators m where m.user_id = auth.uid())
);

insert into notification_action_routes(action_type, redirect_template, description) values
  ('report', '/settings/reports', 'Reporter report history'),
  ('moderation_report', '/settings/reports', 'Moderation report queue')
on conflict (action_type) do update
set redirect_template = excluded.redirect_template,
    description = excluded.description;

-- Submit a report, snapshot the post, and notify app moderators in the notifications table.
create or replace function submit_post_report(p_post_id uuid, p_reason text)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_reporter_id uuid := auth.uid();
  v_report_id uuid;
  v_post posts%rowtype;
  v_reporter_username text;
begin
  if v_reporter_id is null then
    raise exception 'Not authenticated';
  end if;

  select * into v_post from posts where id = p_post_id;
  if not found then
    raise exception 'Post not found';
  end if;

  if v_post.author_id = v_reporter_id then
    raise exception 'You cannot report your own post';
  end if;

  select username into v_reporter_username from profiles where id = v_reporter_id;

  insert into reports(
    reporter_id,
    post_id,
    reason,
    status,
    post_author_id,
    post_author_username,
    post_content_preview,
    post_was_deleted,
    action
  ) values (
    v_reporter_id,
    p_post_id,
    trim(p_reason),
    'pending',
    v_post.author_id,
    v_post.author_username,
    left(v_post.content, 240),
    false,
    'pending'
  )
  on conflict (reporter_id, post_id) where post_id is not null do update set
    reason = excluded.reason,
    updated_at = now()
  returning id into v_report_id;

  insert into notifications(user_id, type, title, body, action_id, action_type, redirect_path, entity_type, entity_id, secondary_entity_type, secondary_entity_id, metadata)
  select
    m.user_id,
    'system',
    'New post report',
    coalesce(v_reporter_username, 'A user') || ' reported a post for: ' || trim(p_reason),
    v_report_id::text,
    'moderation_report',
    '/settings/reports',
    'report',
    v_report_id::text,
    'post',
    p_post_id::text,
    jsonb_build_object(
      'report_id', v_report_id,
      'post_id', p_post_id,
      'reporter_id', v_reporter_id,
      'post_author_id', v_post.author_id,
      'reason', trim(p_reason)
    )
  from app_moderators m
  where m.user_id <> v_reporter_id;

  return v_report_id;
end;
$$;

grant execute on function submit_post_report(uuid, text) to authenticated;

-- Moderation action helper. Use p_delete_post=true for delete actions.
-- It updates every report for the same post, notifies reporters, and notifies the post author.
create or replace function review_post_report(
  p_report_id uuid,
  p_action text,
  p_resolution_message text default null,
  p_delete_post boolean default false,
  p_warning_message text default null
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_reviewer_id uuid := auth.uid();
  v_base reports%rowtype;
  v_status text;
  v_reporter_body text;
  v_author_body text;
  v_action_label text;
begin
  if v_reviewer_id is null then
    raise exception 'Not authenticated';
  end if;

  if not exists (select 1 from app_moderators m where m.user_id = v_reviewer_id) then
    raise exception 'Not authorized';
  end if;

  if p_action not in ('reviewed', 'no_action', 'post_deleted', 'warning_issued', 'other') then
    raise exception 'Invalid moderation action';
  end if;

  select * into v_base from reports where id = p_report_id;
  if not found then
    raise exception 'Report not found';
  end if;

  v_status := case when p_action in ('no_action', 'post_deleted', 'warning_issued', 'other') then 'resolved' else 'reviewed' end;
  v_action_label := case p_action
    when 'post_deleted' then 'Post deleted'
    when 'warning_issued' then 'Warning issued'
    when 'no_action' then 'No policy action needed'
    when 'reviewed' then 'Reviewed'
    else 'Resolved'
  end;

  update reports r
  set status = v_status,
      action = p_action,
      resolution_message = coalesce(nullif(trim(p_resolution_message), ''), v_action_label),
      reviewed_by = v_reviewer_id,
      reviewed_at = now(),
      post_was_deleted = r.post_was_deleted or p_delete_post or p_action = 'post_deleted'
  where (v_base.post_id is not null and r.post_id = v_base.post_id)
     or (v_base.post_id is null and r.id = v_base.id);

  if p_delete_post and v_base.post_id is not null then
    delete from posts where id = v_base.post_id;
  end if;

  v_reporter_body := coalesce(nullif(trim(p_resolution_message), ''), 'Your report has been reviewed. Action: ' || v_action_label || '.');

  insert into notifications(user_id, type, title, body, action_id, action_type, redirect_path, entity_type, entity_id, secondary_entity_type, secondary_entity_id, metadata)
  select distinct
    r.reporter_id,
    'system',
    'Report update: ' || v_action_label,
    v_reporter_body,
    r.id::text,
    'report',
    '/settings/reports',
    'report',
    r.id::text,
    'post',
    coalesce(r.post_id::text, v_base.post_id::text),
    jsonb_build_object('report_id', r.id, 'action', p_action, 'post_deleted', (p_delete_post or p_action = 'post_deleted'))
  from reports r
  where ((v_base.post_id is not null and r.post_id = v_base.post_id) or (v_base.post_id is null and r.id = v_base.id))
    and r.reporter_id <> v_reviewer_id;

  if v_base.post_author_id is not null and v_base.post_author_id <> v_reviewer_id then
    v_author_body := case p_action
      when 'post_deleted' then 'A post you created was removed after moderation review.'
      when 'warning_issued' then coalesce(nullif(trim(p_warning_message), ''), 'A warning was issued for one of your posts after moderation review.')
      when 'no_action' then 'A report on your post was reviewed and no action was needed.'
      else coalesce(nullif(trim(p_warning_message), ''), 'A report on your post was reviewed by moderation.')
    end;

    insert into notifications(user_id, type, title, body, action_id, action_type, redirect_path, entity_type, entity_id, metadata)
    values (
      v_base.post_author_id,
      'system',
      'Post moderation update',
      v_author_body,
      coalesce(v_base.post_id::text, v_base.id::text),
      case when v_base.post_id is not null and p_action <> 'post_deleted' and not p_delete_post then 'post' else 'system' end,
      case when v_base.post_id is not null and p_action <> 'post_deleted' and not p_delete_post then '/post/' || v_base.post_id else '/(tabs)/notifications' end,
      case when v_base.post_id is not null then 'post' else 'report' end,
      coalesce(v_base.post_id::text, v_base.id::text),
      jsonb_build_object('report_id', v_base.id, 'action', p_action, 'post_deleted', (p_delete_post or p_action = 'post_deleted'))
    );
  end if;
end;
$$;

grant execute on function review_post_report(uuid, text, text, boolean, text) to authenticated;
