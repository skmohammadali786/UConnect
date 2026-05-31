-- Fix Vault vote persistence/display for Campus Legend nominations and Wiki articles.
-- Run this in the Supabase SQL editor if Vault votes are accepted by the app but
-- the visible vote/upvote counters do not change.

create extension if not exists "uuid-ossp";

alter table vault_votes enable row level security;
alter table vault_nominations enable row level security;
alter table vault_wiki_articles enable row level security;

drop policy if exists "Vault votes selectable" on vault_votes;
create policy "Vault votes selectable" on vault_votes for select using (true);

drop policy if exists "Users manage own vault votes" on vault_votes;
create policy "Users manage own vault votes" on vault_votes
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- Recreate because PostgreSQL cannot change a function's return type with
-- CREATE OR REPLACE. The app accepts both this JSON response and older void
-- responses, but this response lets the UI show the exact persisted count.
drop function if exists vote_vault_target(text, uuid, text);

create or replace function vote_vault_target(target_type text, target_id uuid, vote text default 'up')
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_previous text;
  v_next_delta int;
  v_previous_delta int;
  v_new_count int;
  v_is_verified boolean;
begin
  if auth.uid() is null then
    raise exception 'Not authenticated';
  end if;

  select coalesce(is_verified, false)
    into v_is_verified
    from profiles
   where id = auth.uid();

  if not coalesce(v_is_verified, false) then
    raise exception 'Verify your profile before voting in the Vault.';
  end if;

  if exists (
    select 1
      from ghost_sessions
     where user_id = auth.uid()
       and is_active
       and expires_at > now()
  ) then
    raise exception 'Ghost Mode cannot vote in the Vault';
  end if;

  if target_type not in ('legend_nomination', 'wiki_article') then
    raise exception 'Invalid vote target';
  end if;

  if vote not in ('up', 'down') then
    raise exception 'Invalid vote';
  end if;

  select vv.vote
    into v_previous
    from vault_votes vv
   where vv.user_id = auth.uid()
     and vv.target_type = vote_vault_target.target_type
     and vv.target_id = vote_vault_target.target_id;

  insert into vault_votes(user_id, target_type, target_id, vote)
  values (auth.uid(), target_type, target_id, vote)
  on conflict(user_id, target_type, target_id) do update
    set vote = excluded.vote;

  if v_previous = vote then
    if target_type = 'legend_nomination' then
      select votes_count into v_new_count from vault_nominations where id = target_id;
    else
      select upvotes into v_new_count from vault_wiki_articles where id = target_id;
    end if;

    return jsonb_build_object('changed', false, 'new_count', coalesce(v_new_count, 0));
  end if;

  v_next_delta := case when vote = 'up' then 1 else -1 end;
  v_previous_delta := case when v_previous = 'up' then -1 when v_previous = 'down' then 1 else 0 end;

  if target_type = 'legend_nomination' then
    update vault_nominations
       set votes_count = greatest(0, votes_count + v_previous_delta + v_next_delta)
     where id = target_id
     returning votes_count into v_new_count;
  else
    update vault_wiki_articles
       set upvotes = greatest(0, upvotes + v_previous_delta + v_next_delta),
           updated_at = now()
     where id = target_id
     returning upvotes into v_new_count;
  end if;

  if v_new_count is null then
    raise exception 'Vote target not found';
  end if;

  return jsonb_build_object('changed', true, 'new_count', v_new_count);
end;
$$;

grant execute on function vote_vault_target(text, uuid, text) to authenticated;
