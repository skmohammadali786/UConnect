-- Fix Vault Radar when no rows exist in vault_skills yet.
-- Run this in the Supabase SQL editor after vault-and-ghost-mode.sql.

create or replace function sync_vault_skills_from_profile(p_user_id uuid default auth.uid())
returns int language plpgsql security definer set search_path = public as $$
declare
  v_count int := 0;
begin
  if p_user_id is null then
    raise exception 'User id is required';
  end if;

  with profile_skill_source as (
    select skill_name, min(ord)::int as ord
    from profiles p
    cross join lateral unnest(
      array_remove(array_append(coalesce(p.interests, '{}'::text[]), nullif(p.branch, '')), null)
    ) with ordinality as source(skill_name, ord)
    where p.id = p_user_id
      and btrim(source.skill_name) <> ''
    group by skill_name
  ), ranked as (
    select
      p_user_id as user_id,
      btrim(skill_name) as skill_name,
      greatest(35, 72 - ((row_number() over (order by ord, skill_name) - 1) * 6))::int as strength,
      greatest(0, 4 - (row_number() over (order by ord, skill_name) - 1))::int as trend
    from profile_skill_source
    order by ord, skill_name
    limit 7
  ), upserted as (
    insert into vault_skills(user_id, skill_name, strength, trend, sources, updated_at)
    select user_id, skill_name, strength, trend, jsonb_build_object('source', 'profile'), now()
    from ranked
    on conflict(user_id, skill_name) do update set
      strength = greatest(vault_skills.strength, excluded.strength),
      trend = excluded.trend,
      sources = vault_skills.sources || excluded.sources,
      updated_at = now()
    returning 1
  )
  select count(*) into v_count from upserted;

  return v_count;
end; $$;

grant execute on function sync_vault_skills_from_profile(uuid) to authenticated;

create or replace function get_vault_home(p_user_id uuid default null)
returns jsonb language plpgsql security definer set search_path = public as $$
declare
  v_score vault_scores%rowtype;
  v_skills jsonb := '[]'::jsonb;
  v_rank int := null;
begin
  if p_user_id is not null then
    insert into vault_scores(user_id) values (p_user_id) on conflict(user_id) do nothing;
    select * into v_score from vault_scores where user_id = p_user_id;
    select count(*) + 1 into v_rank from vault_scores where score > coalesce(v_score.score, 0);
    update vault_scores set campus_rank = v_rank where user_id = p_user_id;

    select coalesce(jsonb_agg(to_jsonb(s) order by s.strength desc), '[]'::jsonb)
    into v_skills
    from (
      select skill_name, strength, trend
      from vault_skills
      where user_id = p_user_id
      order by strength desc
      limit 9
    ) s;

    if jsonb_array_length(v_skills) = 0 then
      select coalesce(jsonb_agg(jsonb_build_object('skill_name', skill_name, 'strength', strength, 'trend', trend) order by ord), '[]'::jsonb)
      into v_skills
      from (
        select
          skill_name,
          ord,
          greatest(35, 72 - ((row_number() over (order by ord, skill_name) - 1) * 6))::int as strength,
          greatest(0, 4 - (row_number() over (order by ord, skill_name) - 1))::int as trend
        from (
          select btrim(source.skill_name) as skill_name, min(source.ord)::int as ord
          from profiles p
          cross join lateral unnest(
            array_remove(array_append(coalesce(p.interests, '{}'::text[]), nullif(p.branch, '')), null)
          ) with ordinality as source(skill_name, ord)
          where p.id = p_user_id
            and btrim(source.skill_name) <> ''
          group by btrim(source.skill_name)
        ) deduped
        order by ord, skill_name
        limit 7
      ) generated;
    end if;
  end if;

  return jsonb_build_object(
    'score', coalesce(v_score.score, 0),
    'level', coalesce(v_score.level, 'Explorer'),
    'rank', v_rank,
    'progress', least(100, greatest(0, case
      when coalesce(v_score.score, 0) >= 12000 then 100
      when coalesce(v_score.score, 0) >= 7000 then ((v_score.score - 7000) * 100 / 5000)
      when coalesce(v_score.score, 0) >= 3500 then ((v_score.score - 3500) * 100 / 3500)
      when coalesce(v_score.score, 0) >= 1500 then ((v_score.score - 1500) * 100 / 2000)
      when coalesce(v_score.score, 0) >= 400 then ((v_score.score - 400) * 100 / 1100)
      else (coalesce(v_score.score, 0) * 100 / 400)
    end)),
    'skillStrength', coalesce((select round(avg((skill->>'strength')::int))::int from jsonb_array_elements(v_skills) skill), 0),
    'skills', v_skills,
    'badges', coalesce((select jsonb_agg(to_jsonb(b) order by b.awarded_at desc) from (select id,label,category,awarded_at from vault_legend_badges where user_id = p_user_id order by awarded_at desc limit 6) b),'[]'::jsonb),
    'legends', coalesce((select jsonb_agg(to_jsonb(n) order by n.votes_count desc) from (select id,category,nominee_username,votes_count from vault_nominations where status='active' order by votes_count desc limit 6) n),'[]'::jsonb),
    'debates', coalesce((select jsonb_agg(to_jsonb(d) order by d.ends_at) from (select id,title,ends_at,for_count,against_count from vault_debates where status='active' order by ends_at limit 5) d),'[]'::jsonb),
    'alerts', coalesce((select jsonb_agg(to_jsonb(a) order by a.priority_rank, a.created_at desc) from (select id,title,category,priority,expires_at,priority_rank,created_at from vault_alerts where status='active' and expires_at > now() order by priority_rank, created_at desc limit 5) a),'[]'::jsonb),
    'wiki', coalesce((select jsonb_agg(to_jsonb(w) order by w.upvotes desc) from (select id,title,category,upvotes,view_count from vault_wiki_articles where status='published' order by upvotes desc, view_count desc limit 5) w),'[]'::jsonb)
  );
end; $$;

grant execute on function get_vault_home(uuid) to authenticated, anon;
