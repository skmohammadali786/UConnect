-- Team feed notifications
-- Run this in Supabase SQL Editor to notify team members when admins add
-- posts, polls, task lists, or events to a team feed.

create or replace function create_notification(
  p_user_id uuid,
  p_type text,
  p_title text,
  p_body text,
  p_action_id text default null,
  p_action_type text default null,
  p_redirect_path text default null,
  p_entity_type text default null,
  p_entity_id text default null,
  p_secondary_entity_type text default null,
  p_secondary_entity_id text default null,
  p_metadata jsonb default '{}'::jsonb
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_notification_id uuid;
begin
  if auth.uid() is null then
    raise exception 'Not authenticated';
  end if;

  select id into v_notification_id
  from notifications
  where user_id = p_user_id
    and action_id is not distinct from p_action_id
    and action_type is not distinct from p_action_type
    and secondary_entity_type is not distinct from p_secondary_entity_type
    and secondary_entity_id is not distinct from p_secondary_entity_id
    and created_at > now() - interval '10 seconds'
  order by created_at desc
  limit 1;

  if v_notification_id is not null then
    return v_notification_id;
  end if;

  insert into notifications(
    user_id,
    type,
    title,
    body,
    action_id,
    action_type,
    redirect_path,
    entity_type,
    entity_id,
    secondary_entity_type,
    secondary_entity_id,
    metadata
  )
  values (
    p_user_id,
    p_type,
    p_title,
    p_body,
    p_action_id,
    p_action_type,
    p_redirect_path,
    p_entity_type,
    p_entity_id,
    p_secondary_entity_type,
    p_secondary_entity_id,
    coalesce(p_metadata, '{}'::jsonb)
  )
  returning id into v_notification_id;

  return v_notification_id;
end;
$$;

grant execute on function create_notification(uuid, text, text, text, text, text, text, text, text, text, text, jsonb) to authenticated;

create or replace function notify_team_members_of_feed_item()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_team_id uuid;
  v_actor_id uuid;
  v_team_title text;
  v_item_type text;
  v_item_title text;
  v_body text;
begin
  if tg_table_name = 'team_posts' then
    v_team_id := new.team_id;
    v_actor_id := new.author_id;
    v_item_type := 'post';
    v_item_title := 'New update';
    v_body := coalesce(nullif(new.content, ''), 'Admin shared a new photo update.');
  elsif tg_table_name = 'team_polls' then
    v_team_id := new.team_id;
    v_actor_id := new.created_by;
    v_item_type := 'poll';
    v_item_title := 'New poll';
    v_body := new.question;
  elsif tg_table_name = 'team_task_lists' then
    v_team_id := new.team_id;
    v_actor_id := new.created_by;
    v_item_type := 'task';
    v_item_title := 'New tasks';
    v_body := new.title;
  elsif tg_table_name = 'team_events' then
    v_team_id := new.team_id;
    v_actor_id := new.created_by;
    v_item_type := 'event';
    v_item_title := 'New event';
    v_body := new.title;
  else
    return new;
  end if;

  select title into v_team_title from teams where id = v_team_id;

  insert into notifications(
    user_id,
    type,
    title,
    body,
    action_id,
    action_type,
    redirect_path,
    entity_type,
    entity_id,
    secondary_entity_type,
    secondary_entity_id,
    metadata
  )
  select
    recipients.user_id,
    'team',
    v_item_title || ' in ' || coalesce(v_team_title, 'your team'),
    v_body,
    v_team_id::text,
    'team',
    '/teams/' || v_team_id || '?tab=feed&itemType=' || v_item_type || '&itemId=' || new.id,
    'team',
    v_team_id::text,
    'team_' || v_item_type,
    new.id::text,
    jsonb_build_object(
      'teamId', v_team_id,
      'teamTitle', v_team_title,
      'feedItemType', v_item_type,
      'feedItemId', new.id
    )
  from (
    select user_id from team_members where team_id = v_team_id
    union
    select poster_id as user_id from teams where id = v_team_id
  ) recipients
  where recipients.user_id <> v_actor_id
    and not exists (
      select 1
      from notifications n
      where n.user_id = recipients.user_id
        and n.action_id = v_team_id::text
        and n.action_type = 'team'
        and n.secondary_entity_type = 'team_' || v_item_type
        and n.secondary_entity_id = new.id::text
        and n.created_at > now() - interval '10 seconds'
    );

  return new;
end;
$$;

drop trigger if exists notify_team_members_after_team_post on team_posts;
create trigger notify_team_members_after_team_post
after insert on team_posts
for each row execute function notify_team_members_of_feed_item();

drop trigger if exists notify_team_members_after_team_poll on team_polls;
create trigger notify_team_members_after_team_poll
after insert on team_polls
for each row execute function notify_team_members_of_feed_item();

drop trigger if exists notify_team_members_after_team_task_list on team_task_lists;
create trigger notify_team_members_after_team_task_list
after insert on team_task_lists
for each row execute function notify_team_members_of_feed_item();

drop trigger if exists notify_team_members_after_team_event on team_events;
create trigger notify_team_members_after_team_event
after insert on team_events
for each row execute function notify_team_members_of_feed_item();
