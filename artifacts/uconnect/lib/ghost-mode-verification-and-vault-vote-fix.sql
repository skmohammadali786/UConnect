-- Ensures Ghost Mode is only available to verified profiles and keeps Vault vote
-- counters in sync when users upvote/downvote legends or wiki articles.

create or replace function activate_ghost_mode()
returns jsonb language plpgsql security definer set search_path = public as $$
declare
  v_alias ghost_aliases%rowtype;
  v_session ghost_sessions%rowtype;
  v_is_verified boolean;
begin
  if auth.uid() is null then raise exception 'Not authenticated'; end if;

  select coalesce(is_verified, false) into v_is_verified
  from profiles
  where id = auth.uid();

  if not coalesce(v_is_verified, false) then
    raise exception 'Verify your profile before enabling Ghost Mode.';
  end if;

  perform expire_ghost_sessions();
  if exists(select 1 from ghost_sessions where user_id=auth.uid() and is_active and expires_at > now()) then
    select * into v_session from ghost_sessions where user_id=auth.uid() and is_active and expires_at > now() limit 1;
    return to_jsonb(v_session);
  end if;
  if exists(select 1 from ghost_sessions where user_id=auth.uid() and started_at > now() - interval '24 hours') then
    raise exception 'Ghost Mode cooldown active. Try again 24 hours after your last activation.';
  end if;
  select * into v_alias from ghost_aliases where not is_reserved order by random() limit 1;
  insert into ghost_sessions(user_id, alias_id, alias_snapshot) values(auth.uid(), v_alias.id, v_alias.alias) returning * into v_session;
  return to_jsonb(v_session);
end; $$;

grant execute on function activate_ghost_mode() to authenticated;

create or replace function vote_vault_target(target_type text, target_id uuid, vote text default 'up')
returns void language plpgsql security definer set search_path = public as $$
declare
  v_previous text;
  v_next_delta int;
  v_previous_delta int;
  v_is_verified boolean;
begin
  if auth.uid() is null then raise exception 'Not authenticated'; end if;

  select coalesce(is_verified, false) into v_is_verified
  from profiles
  where id = auth.uid();

  if not coalesce(v_is_verified, false) then
    raise exception 'Verify your profile before voting in the Vault.';
  end if;

  if exists(select 1 from ghost_sessions where user_id=auth.uid() and is_active and expires_at > now()) then
    raise exception 'Ghost Mode cannot vote in the Vault';
  end if;
  if target_type not in ('legend_nomination','wiki_article') then raise exception 'Invalid vote target'; end if;
  if vote not in ('up','down') then raise exception 'Invalid vote'; end if;

  select vv.vote into v_previous
  from vault_votes vv
  where vv.user_id = auth.uid()
    and vv.target_type = vote_vault_target.target_type
    and vv.target_id = vote_vault_target.target_id;

  insert into vault_votes(user_id, target_type, target_id, vote)
  values(auth.uid(), target_type, target_id, vote)
  on conflict(user_id, target_type, target_id) do update set vote=excluded.vote;

  if v_previous = vote then
    return;
  end if;

  v_next_delta := case when vote = 'up' then 1 else -1 end;
  v_previous_delta := case when v_previous = 'up' then -1 when v_previous = 'down' then 1 else 0 end;

  if target_type = 'legend_nomination' then
    update vault_nominations
    set votes_count = greatest(0, votes_count + v_previous_delta + v_next_delta)
    where id = target_id;
  else
    update vault_wiki_articles
    set upvotes = greatest(0, upvotes + v_previous_delta + v_next_delta)
    where id = target_id;
  end if;
end; $$;

grant execute on function vote_vault_target(text, uuid, text) to authenticated;
