-- Purge all content and activity created during a Ghost Mode session when it expires.
-- Run this in Supabase SQL Editor if the main vault-and-ghost-mode.sql has already
-- been applied to your project.

create or replace function purge_ghost_session_activity(p_session_id uuid)
returns void language plpgsql security definer set search_path = public as $$
declare
  v_session ghost_sessions%rowtype;
  v_cutoff timestamptz;
  v_post_count int;
begin
  select * into v_session from ghost_sessions where id = p_session_id;
  if v_session.id is null then
    return;
  end if;

  v_cutoff := coalesce(v_session.ended_at, v_session.expires_at, now());

  select count(*)::int into v_post_count
  from posts
  where ghost_session_id = v_session.id;

  if v_post_count > 0 then
    update profiles
    set posts_count = greatest(0, coalesce(posts_count, 0) - v_post_count)
    where id = v_session.user_id;
  end if;

  -- Remove reports tied to Ghost posts before deleting the posts because the
  -- reports table intentionally preserves post snapshots with ON DELETE SET NULL.
  delete from reports rp
  where rp.post_id in (select p.id from posts p where p.ghost_session_id = v_session.id)
     or (rp.reporter_id = v_session.user_id
       and rp.created_at >= v_session.started_at
       and rp.created_at <= v_cutoff);

  -- Permanently remove Ghost posts first; dependent comments, votes, bookmarks,
  -- reposts, and ghost audit rows cascade from the post id.
  delete from posts where ghost_session_id = v_session.id;

  -- Remove Ghost comments left on non-Ghost posts, including any reply subtree
  -- that cannot remain attached after the Ghost comment disappears.
  with recursive doomed_comments as (
    select c.id, c.post_id
    from comments c
    where c.ghost_session_id = v_session.id
    union all
    select child.id, child.post_id
    from comments child
    join doomed_comments parent on child.parent_id = parent.id
  ),
  deleted_comments as (
    delete from comments c
    where c.id in (select id from doomed_comments)
    returning c.post_id
  ),
  comment_tally as (
    select post_id, count(*)::int as deleted_count
    from deleted_comments
    group by post_id
  )
  update posts p
  set comment_count = greatest(0, p.comment_count - comment_tally.deleted_count)
  from comment_tally
  where p.id = comment_tally.post_id;

  -- Remove votes, reposts, and bookmarks created by the Ghost user while the
  -- session was active. These tables do not carry ghost_session_id, so the
  -- session window is the durable marker for Ghost activity.
  with deleted_post_votes as (
    delete from post_votes pv
    where pv.user_id = v_session.user_id
      and pv.created_at >= v_session.started_at
      and pv.created_at <= v_cutoff
    returning pv.post_id, pv.vote
  ),
  post_vote_tally as (
    select
      post_id,
      count(*) filter (where vote = 'up')::int as up_count,
      count(*) filter (where vote = 'down')::int as down_count
    from deleted_post_votes
    group by post_id
  )
  update posts p
  set
    upvotes = greatest(0, p.upvotes - post_vote_tally.up_count),
    downvotes = greatest(0, p.downvotes - post_vote_tally.down_count)
  from post_vote_tally
  where p.id = post_vote_tally.post_id;

  with deleted_comment_votes as (
    delete from comment_votes cv
    where cv.user_id = v_session.user_id
      and cv.created_at >= v_session.started_at
      and cv.created_at <= v_cutoff
    returning cv.comment_id, cv.vote
  ),
  comment_vote_tally as (
    select
      comment_id,
      count(*) filter (where vote = 'up')::int as up_count,
      count(*) filter (where vote = 'down')::int as down_count
    from deleted_comment_votes
    group by comment_id
  )
  update comments c
  set
    upvotes = greatest(0, c.upvotes - comment_vote_tally.up_count),
    downvotes = greatest(0, c.downvotes - comment_vote_tally.down_count)
  from comment_vote_tally
  where c.id = comment_vote_tally.comment_id;

  delete from bookmarks b
  where b.user_id = v_session.user_id
    and b.created_at >= v_session.started_at
    and b.created_at <= v_cutoff;

  with deleted_reposts as (
    delete from reposts r
    where r.user_id = v_session.user_id
      and r.created_at >= v_session.started_at
      and r.created_at <= v_cutoff
    returning r.post_id
  ),
  repost_tally as (
    select post_id, count(*)::int as repost_count
    from deleted_reposts
    group by post_id
  )
  update posts p
  set repost_count = greatest(0, p.repost_count - repost_tally.repost_count)
  from repost_tally
  where p.id = repost_tally.post_id;

  -- Remove any remaining Ghost audit snapshots so expired Ghost content is not
  -- retained in an internal table after public rows are deleted.
  delete from ghost_posts where ghost_session_id = v_session.id;
end; $$;

create or replace function expire_ghost_sessions()
returns int language plpgsql security definer set search_path = public as $$
declare
  v_session ghost_sessions%rowtype;
  v_count int := 0;
begin
  for v_session in
    select * from ghost_sessions where is_active and expires_at <= now()
  loop
    perform purge_ghost_session_activity(v_session.id);
    update ghost_sessions
    set is_active = false, ended_at = coalesce(ended_at, expires_at)
    where id = v_session.id;
    v_count := v_count + 1;
  end loop;

  return v_count;
end; $$;

grant execute on function purge_ghost_session_activity(uuid) to service_role;
grant execute on function expire_ghost_sessions() to service_role;
