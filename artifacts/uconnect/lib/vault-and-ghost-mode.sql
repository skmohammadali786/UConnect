-- UConnect The Vault + Ghost Mode production schema, RLS, RPCs, realtime indexes
create extension if not exists "uuid-ossp";
create extension if not exists pgcrypto;

-- ─── ENUM-LIKE CHECK DOMAINS ───────────────────────────────────────────────
-- Kept as check constraints for easy Supabase SQL Editor re-runs.

-- ─── VAULT SCORE ───────────────────────────────────────────────────────────
create table if not exists vault_scores (
  user_id uuid primary key references profiles(id) on delete cascade,
  score int not null default 0 check (score >= 0),
  level text not null default 'Explorer' check (level in ('Explorer','Contributor','Builder','Mentor','Leader','Legend')),
  campus_rank int,
  helpful_comments int not null default 0,
  accepted_answers int not null default 0,
  team_contributions int not null default 0,
  wiki_edits int not null default 0,
  event_participation int not null default 0,
  skill_exchanges int not null default 0,
  negative_events int not null default 0,
  updated_at timestamptz not null default now(),
  created_at timestamptz not null default now()
);

create table if not exists vault_score_events (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid not null references profiles(id) on delete cascade,
  actor_id uuid references profiles(id) on delete set null,
  source text not null,
  event_type text not null,
  points int not null,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

-- ─── LEGENDS ───────────────────────────────────────────────────────────────
create table if not exists vault_legends (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid not null references profiles(id) on delete cascade,
  category text not null,
  month date not null,
  title text not null,
  badge_label text not null,
  votes_count int not null default 0,
  rank int not null default 1,
  awarded_by uuid references profiles(id) on delete set null,
  awarded_at timestamptz not null default now(),
  unique(user_id, category, month)
);

create table if not exists vault_nominations (
  id uuid primary key default uuid_generate_v4(),
  nominee_id uuid not null references profiles(id) on delete cascade,
  nominee_username text not null,
  nominator_id uuid not null references profiles(id) on delete cascade,
  category text not null check (category in ('Best Developer','Best Designer','Best Mentor','Best Team Leader','Most Helpful Student','Best Content Creator','Community Builder','Startup Leader','Campus Influencer')),
  reason text not null,
  month date not null default date_trunc('month', now())::date,
  status text not null default 'active' check (status in ('active','winner','archived','rejected')),
  votes_count int not null default 0,
  created_at timestamptz not null default now(),
  unique(nominee_id, nominator_id, category, month)
);

create table if not exists vault_votes (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid not null references profiles(id) on delete cascade,
  target_type text not null check (target_type in ('legend_nomination','debate_argument','wiki_article')),
  target_id uuid not null,
  vote text not null default 'up' check (vote in ('up','down')),
  created_at timestamptz not null default now(),
  unique(user_id, target_type, target_id)
);

create table if not exists vault_legend_badges (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid not null references profiles(id) on delete cascade,
  legend_id uuid references vault_legends(id) on delete cascade,
  category text not null,
  label text not null,
  awarded_at timestamptz not null default now()
);

-- ─── ARENA ─────────────────────────────────────────────────────────────────
create table if not exists vault_debates (
  id uuid primary key default uuid_generate_v4(),
  creator_id uuid references profiles(id) on delete set null,
  title text not null,
  description text not null default '',
  status text not null default 'active' check (status in ('draft','active','closed','moderated')),
  starts_at timestamptz not null default now(),
  ends_at timestamptz not null default (now() + interval '48 hours'),
  for_count int not null default 0,
  against_count int not null default 0,
  winner text check (winner in ('for','against','draw')),
  report_count int not null default 0,
  created_at timestamptz not null default now()
);

create table if not exists vault_arguments (
  id uuid primary key default uuid_generate_v4(),
  debate_id uuid not null references vault_debates(id) on delete cascade,
  author_id uuid not null references profiles(id) on delete cascade,
  anonymous_alias text not null,
  side text not null check (side in ('for','against')),
  parent_id uuid references vault_arguments(id) on delete cascade,
  body text not null,
  votes_count int not null default 0,
  report_count int not null default 0,
  is_hidden boolean not null default false,
  created_at timestamptz not null default now()
);

-- ─── ALERT ─────────────────────────────────────────────────────────────────
create table if not exists vault_alerts (
  id uuid primary key default uuid_generate_v4(),
  creator_id uuid not null references profiles(id) on delete cascade,
  creator_username text not null,
  title text not null,
  body text not null,
  category text not null check (category in ('Blood Required','Medical Emergency','Lost ID','Lost Item','Need Notes','Need Transport','Safety Alert','Urgent Academic Help')),
  priority text not null default 'normal' check (priority in ('critical','high','normal')),
  priority_rank int generated always as (case priority when 'critical' then 1 when 'high' then 2 else 3 end) stored,
  location_text text,
  latitude double precision,
  longitude double precision,
  status text not null default 'active' check (status in ('active','resolved','expired','moderated')),
  expires_at timestamptz not null default (now() + interval '24 hours'),
  resolved_at timestamptz,
  resolved_by uuid references profiles(id) on delete set null,
  response_count int not null default 0,
  created_at timestamptz not null default now()
);

create table if not exists vault_alert_responses (
  id uuid primary key default uuid_generate_v4(),
  alert_id uuid not null references vault_alerts(id) on delete cascade,
  responder_id uuid not null references profiles(id) on delete cascade,
  responder_username text not null,
  message text not null,
  status text not null default 'offered' check (status in ('offered','accepted','declined','withdrawn')),
  created_at timestamptz not null default now(),
  unique(alert_id, responder_id)
);

-- ─── WIKI ──────────────────────────────────────────────────────────────────
create table if not exists vault_wiki_articles (
  id uuid primary key default uuid_generate_v4(),
  author_id uuid not null references profiles(id) on delete cascade,
  author_username text not null,
  title text not null,
  slug text not null unique,
  category text not null check (category in ('Academics','Professors','Hostels','Placements','Internships','Clubs','Labs','Events','Study Resources')),
  body_markdown text not null,
  media_urls text[] not null default '{}',
  status text not null default 'published' check (status in ('draft','published','hidden','locked')),
  upvotes int not null default 0,
  downvotes int not null default 0,
  bookmark_count int not null default 0,
  report_count int not null default 0,
  view_count int not null default 0,
  current_revision_id uuid,
  updated_at timestamptz not null default now(),
  created_at timestamptz not null default now()
);

create table if not exists vault_wiki_revisions (
  id uuid primary key default uuid_generate_v4(),
  article_id uuid not null references vault_wiki_articles(id) on delete cascade,
  editor_id uuid not null references profiles(id) on delete cascade,
  editor_username text not null,
  title text not null,
  body_markdown text not null,
  media_urls text[] not null default '{}',
  change_summary text,
  created_at timestamptz not null default now()
);

create table if not exists vault_wiki_votes (
  id uuid primary key default uuid_generate_v4(),
  article_id uuid not null references vault_wiki_articles(id) on delete cascade,
  user_id uuid not null references profiles(id) on delete cascade,
  vote text not null check (vote in ('up','down')),
  created_at timestamptz not null default now(),
  unique(article_id, user_id)
);

create table if not exists vault_wiki_bookmarks (
  article_id uuid not null references vault_wiki_articles(id) on delete cascade,
  user_id uuid not null references profiles(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key(article_id, user_id)
);

-- ─── RADAR + EXCHANGE ──────────────────────────────────────────────────────
create table if not exists vault_skills (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid not null references profiles(id) on delete cascade,
  skill_name text not null,
  strength int not null default 0 check (strength between 0 and 100),
  trend int not null default 0,
  sources jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now(),
  unique(user_id, skill_name)
);

create table if not exists vault_endorsements (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid not null references profiles(id) on delete cascade,
  endorser_id uuid not null references profiles(id) on delete cascade,
  skill_name text not null,
  note text,
  weight int not null default 1 check (weight between 1 and 5),
  created_at timestamptz not null default now(),
  unique(user_id, endorser_id, skill_name),
  check (user_id <> endorser_id)
);

create table if not exists vault_listings (
  id uuid primary key default uuid_generate_v4(),
  creator_id uuid not null references profiles(id) on delete cascade,
  creator_username text not null,
  title text not null,
  skill_name text not null,
  description text not null,
  listing_type text not null default 'teach' check (listing_type in ('teach','learn','review','practice')),
  status text not null default 'open' check (status in ('open','paused','closed','moderated')),
  rating_avg numeric(3,2) not null default 0,
  completed_count int not null default 0,
  created_at timestamptz not null default now()
);

create table if not exists vault_requests (
  id uuid primary key default uuid_generate_v4(),
  listing_id uuid not null references vault_listings(id) on delete cascade,
  requester_id uuid not null references profiles(id) on delete cascade,
  requester_username text not null,
  status text not null default 'pending' check (status in ('pending','accepted','declined','completed','cancelled')),
  message text,
  completed_at timestamptz,
  created_at timestamptz not null default now(),
  unique(listing_id, requester_id)
);

create table if not exists vault_reviews (
  id uuid primary key default uuid_generate_v4(),
  request_id uuid not null unique references vault_requests(id) on delete cascade,
  listing_id uuid not null references vault_listings(id) on delete cascade,
  reviewer_id uuid not null references profiles(id) on delete cascade,
  reviewee_id uuid not null references profiles(id) on delete cascade,
  rating int not null check (rating between 1 and 5),
  body text,
  created_at timestamptz not null default now()
);

-- ─── GHOST MODE ────────────────────────────────────────────────────────────
create table if not exists ghost_aliases (
  id uuid primary key default uuid_generate_v4(),
  alias text not null unique,
  is_reserved boolean not null default false,
  created_at timestamptz not null default now()
);

insert into ghost_aliases(alias) values
('Phantom Raven'),('Silent Wolf'),('Shadow Echo'),('Midnight Specter'),('Neon Phantom'),('Obsidian Fox'),('Violet Wraith'),('Cipher Owl'),('Noir Comet'),('Hidden Lynx')
on conflict(alias) do nothing;

create table if not exists ghost_sessions (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid not null references profiles(id) on delete cascade,
  alias_id uuid references ghost_aliases(id) on delete set null,
  alias_snapshot text not null,
  started_at timestamptz not null default now(),
  expires_at timestamptz not null default (now() + interval '6 hours'),
  ended_at timestamptz,
  is_active boolean not null default true,
  posts_created int not null default 0,
  comments_created int not null default 0,
  created_at timestamptz not null default now(),
  check (expires_at <= started_at + interval '6 hours' + interval '1 minute')
);
create unique index if not exists ghost_sessions_one_active_per_user on ghost_sessions(user_id) where is_active = true;
create index if not exists ghost_sessions_active_expires_idx on ghost_sessions(is_active, expires_at);

create table if not exists ghost_posts (
  id uuid primary key default uuid_generate_v4(),
  ghost_session_id uuid not null references ghost_sessions(id) on delete restrict,
  user_id uuid not null references profiles(id) on delete cascade,
  post_id uuid references posts(id) on delete cascade,
  comment_id uuid references comments(id) on delete cascade,
  alias_snapshot text not null,
  content_snapshot text not null default '',
  created_at timestamptz not null default now(),
  check ((post_id is not null and comment_id is null) or (post_id is null and comment_id is not null))
);

alter table posts add column if not exists is_ghost boolean not null default false;
alter table posts add column if not exists ghost_session_id uuid references ghost_sessions(id) on delete set null;
alter table posts add column if not exists ghost_alias_snapshot text;
alter table comments add column if not exists is_ghost boolean not null default false;
alter table comments add column if not exists ghost_session_id uuid references ghost_sessions(id) on delete set null;
alter table comments add column if not exists ghost_alias_snapshot text;

-- ─── INDEXES ───────────────────────────────────────────────────────────────
create index if not exists vault_scores_score_idx on vault_scores(score desc);
create index if not exists vault_nominations_active_idx on vault_nominations(status, month, votes_count desc);
create index if not exists vault_debates_active_idx on vault_debates(status, ends_at);
create index if not exists vault_arguments_debate_idx on vault_arguments(debate_id, votes_count desc);
create index if not exists vault_alerts_feed_idx on vault_alerts(status, priority_rank, created_at desc);
create index if not exists vault_wiki_search_idx on vault_wiki_articles using gin(to_tsvector('english', title || ' ' || body_markdown));
create index if not exists vault_skills_user_strength_idx on vault_skills(user_id, strength desc);
create index if not exists ghost_posts_post_idx on ghost_posts(post_id);
create index if not exists ghost_posts_comment_idx on ghost_posts(comment_id);

-- ─── RLS ───────────────────────────────────────────────────────────────────
alter table vault_scores enable row level security;
alter table vault_score_events enable row level security;
alter table vault_legends enable row level security;
alter table vault_nominations enable row level security;
alter table vault_votes enable row level security;
alter table vault_legend_badges enable row level security;
alter table vault_debates enable row level security;
alter table vault_arguments enable row level security;
alter table vault_alerts enable row level security;
alter table vault_alert_responses enable row level security;
alter table vault_wiki_articles enable row level security;
alter table vault_wiki_revisions enable row level security;
alter table vault_wiki_votes enable row level security;
alter table vault_wiki_bookmarks enable row level security;
alter table vault_skills enable row level security;
alter table vault_endorsements enable row level security;
alter table vault_listings enable row level security;
alter table vault_requests enable row level security;
alter table vault_reviews enable row level security;
alter table ghost_aliases enable row level security;
alter table ghost_sessions enable row level security;
alter table ghost_posts enable row level security;

drop policy if exists "Vault scores are public" on vault_scores;
create policy "Vault scores are public" on vault_scores for select using (true);
drop policy if exists "Users see own score history" on vault_score_events;
create policy "Users see own score history" on vault_score_events for select using (auth.uid() = user_id);
create policy "Legends are public" on vault_legends for select using (true);
create policy "Badges are public" on vault_legend_badges for select using (true);
create policy "Nominations are public" on vault_nominations for select using (true);
create policy "Users nominate as self" on vault_nominations for insert with check (auth.uid() = nominator_id and auth.uid() <> nominee_id);
create policy "Vault votes selectable" on vault_votes for select using (true);
create policy "Users manage own vault votes" on vault_votes for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "Debates are public" on vault_debates for select using (status <> 'draft');
create policy "Authenticated users create debates" on vault_debates for insert with check (auth.uid() = creator_id);
create policy "Arguments are public if visible" on vault_arguments for select using (not is_hidden);
create policy "Users create own arguments" on vault_arguments for insert with check (auth.uid() = author_id);
create policy "Alerts are public" on vault_alerts for select using (true);
create policy "Users create own alerts" on vault_alerts for insert with check (auth.uid() = creator_id);
create policy "Creators resolve alerts" on vault_alerts for update using (auth.uid() = creator_id) with check (auth.uid() = creator_id);
create policy "Alert responses visible to alert parties" on vault_alert_responses for select using (auth.uid() = responder_id or exists(select 1 from vault_alerts a where a.id = alert_id and a.creator_id = auth.uid()));
create policy "Users respond as self" on vault_alert_responses for insert with check (auth.uid() = responder_id);
create policy "Wiki public" on vault_wiki_articles for select using (status in ('published','locked'));
create policy "Users create wiki" on vault_wiki_articles for insert with check (auth.uid() = author_id);
create policy "Authors edit wiki" on vault_wiki_articles for update using (auth.uid() = author_id);
create policy "Revisions public" on vault_wiki_revisions for select using (true);
create policy "Editors create revisions" on vault_wiki_revisions for insert with check (auth.uid() = editor_id);
create policy "Users manage own wiki votes" on vault_wiki_votes for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "Users manage own wiki bookmarks" on vault_wiki_bookmarks for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "Skills public" on vault_skills for select using (true);
create policy "Endorsements public" on vault_endorsements for select using (true);
create policy "Users endorse others" on vault_endorsements for insert with check (auth.uid() = endorser_id and auth.uid() <> user_id);
create policy "Listings public" on vault_listings for select using (true);
create policy "Users create own listings" on vault_listings for insert with check (auth.uid() = creator_id);
create policy "Creators update listings" on vault_listings for update using (auth.uid() = creator_id);
create policy "Request parties view" on vault_requests for select using (auth.uid() = requester_id or exists(select 1 from vault_listings l where l.id = listing_id and l.creator_id = auth.uid()));
create policy "Users request as self" on vault_requests for insert with check (auth.uid() = requester_id);
create policy "Review parties view" on vault_reviews for select using (auth.uid() in (reviewer_id, reviewee_id));
create policy "Reviewers create own reviews" on vault_reviews for insert with check (auth.uid() = reviewer_id);
create policy "Ghost aliases readable" on ghost_aliases for select using (true);
create policy "Users see own ghost sessions only" on ghost_sessions for select using (auth.uid() = user_id);
create policy "Ghost audit hidden from clients" on ghost_posts for select using (false);

-- ─── HELPERS/RPCS ──────────────────────────────────────────────────────────
create or replace function vault_level_for_score(p_score int) returns text language sql immutable as $$
  select case when p_score >= 12000 then 'Legend' when p_score >= 7000 then 'Leader' when p_score >= 3500 then 'Mentor' when p_score >= 1500 then 'Builder' when p_score >= 400 then 'Contributor' else 'Explorer' end
$$;

create or replace function add_vault_score_event(p_user_id uuid, p_source text, p_event_type text, p_points int, p_metadata jsonb default '{}'::jsonb)
returns void language plpgsql security definer set search_path = public as $$
declare v_score int;
begin
  insert into vault_score_events(user_id, actor_id, source, event_type, points, metadata) values (p_user_id, auth.uid(), p_source, p_event_type, p_points, p_metadata);
  insert into vault_scores(user_id, score, level) values (p_user_id, greatest(0, p_points), vault_level_for_score(greatest(0, p_points)))
  on conflict(user_id) do update set score = greatest(0, vault_scores.score + excluded.score), level = vault_level_for_score(greatest(0, vault_scores.score + excluded.score)), updated_at = now()
  returning score into v_score;
end; $$;

create or replace function get_vault_home(p_user_id uuid default null)
returns jsonb language plpgsql security definer set search_path = public as $$
declare v_score vault_scores%rowtype; v_skills jsonb; v_rank int;
begin
  if p_user_id is not null then
    insert into vault_scores(user_id) values (p_user_id) on conflict(user_id) do nothing;
    select * into v_score from vault_scores where user_id = p_user_id;
    select count(*) + 1 into v_rank from vault_scores where score > coalesce(v_score.score,0);
    update vault_scores set campus_rank = v_rank where user_id = p_user_id;
  end if;
  select coalesce(jsonb_agg(to_jsonb(s) order by s.strength desc), '[]'::jsonb) into v_skills from (select skill_name, strength, trend from vault_skills where user_id = p_user_id order by strength desc limit 9) s;
  return jsonb_build_object(
    'score', coalesce(v_score.score,0), 'level', coalesce(v_score.level,'Explorer'), 'rank', v_rank,
    'progress', least(100, greatest(0, case when coalesce(v_score.score,0) >= 12000 then 100 when coalesce(v_score.score,0) >= 7000 then ((v_score.score-7000)*100/5000) when coalesce(v_score.score,0) >= 3500 then ((v_score.score-3500)*100/3500) when coalesce(v_score.score,0) >= 1500 then ((v_score.score-1500)*100/2000) when coalesce(v_score.score,0) >= 400 then ((v_score.score-400)*100/1100) else (coalesce(v_score.score,0)*100/400) end)),
    'skillStrength', coalesce((select round(avg(strength))::int from vault_skills where user_id = p_user_id),0),
    'skills', v_skills,
    'badges', coalesce((select jsonb_agg(to_jsonb(b) order by b.awarded_at desc) from (select id,label,category,awarded_at from vault_legend_badges where user_id = p_user_id order by awarded_at desc limit 6) b),'[]'::jsonb),
    'legends', coalesce((select jsonb_agg(to_jsonb(n) order by n.votes_count desc) from (select id,category,nominee_username,votes_count from vault_nominations where status='active' order by votes_count desc limit 6) n),'[]'::jsonb),
    'debates', coalesce((select jsonb_agg(to_jsonb(d) order by d.ends_at) from (select id,title,ends_at,for_count,against_count from vault_debates where status='active' order by ends_at limit 5) d),'[]'::jsonb),
    'alerts', coalesce((select jsonb_agg(to_jsonb(a) order by a.priority_rank, a.created_at desc) from (select id,title,category,priority,expires_at,priority_rank,created_at from vault_alerts where status='active' and expires_at > now() order by priority_rank, created_at desc limit 5) a),'[]'::jsonb),
    'wiki', coalesce((select jsonb_agg(to_jsonb(w) order by w.upvotes desc) from (select id,title,category,upvotes,view_count from vault_wiki_articles where status='published' order by upvotes desc, view_count desc limit 5) w),'[]'::jsonb)
  );
end; $$;

create or replace function nominate_vault_legend(nominee_id uuid, category text, reason text default 'Nominated from The Vault.')
returns uuid language plpgsql security definer set search_path = public as $$
declare v_id uuid; v_username text;
begin
  if auth.uid() is null then raise exception 'Not authenticated'; end if;
  if exists(select 1 from ghost_sessions where user_id=auth.uid() and is_active and expires_at > now()) then raise exception 'Ghost Mode cannot vote or nominate in Vault Legends'; end if;
  select username into v_username from profiles where id = nominee_id;
  insert into vault_nominations(nominee_id, nominee_username, nominator_id, category, reason) values (nominee_id, coalesce(v_username, 'Unknown student'), auth.uid(), coalesce(nullif(category, ''), 'Campus Legend'), coalesce(nullif(reason, ''), 'Nominated from The Vault.')) returning id into v_id;
  perform add_vault_score_event(auth.uid(), 'vault_legends', 'nomination_created', 20, jsonb_build_object('nomination_id', v_id));
  return v_id;
end; $$;

create or replace function create_vault_alert(title text, body text, category text, priority text, location text default null)
returns uuid language plpgsql security definer set search_path = public as $$
declare v_id uuid; v_username text;
begin
  if auth.uid() is null then raise exception 'Not authenticated'; end if;
  select username into v_username from profiles where id=auth.uid();
  insert into vault_alerts(creator_id, creator_username, title, body, category, priority, location_text) values(auth.uid(), v_username, title, body, category, priority, location) returning id into v_id;
  perform add_vault_score_event(auth.uid(), 'vault_alert', 'alert_created', case priority when 'critical' then 40 when 'high' then 25 else 10 end, jsonb_build_object('alert_id', v_id));
  return v_id;
end; $$;

create or replace function join_vault_debate(debate_id uuid, side text, body text default 'Joining the Vault debate.', alias text default null)
returns uuid language plpgsql security definer set search_path = public as $$
declare v_id uuid; v_alias text := coalesce(alias, 'Campus Voice ' || substr(replace(uuid_generate_v4()::text,'-',''),1,4));
begin
  if auth.uid() is null then raise exception 'Not authenticated'; end if;
  insert into vault_arguments(debate_id, author_id, anonymous_alias, side, body) values(debate_id, auth.uid(), v_alias, side, coalesce(nullif(body, ''), 'Joining the Vault debate.')) returning id into v_id;
  update vault_debates set for_count = for_count + case when side='for' then 1 else 0 end, against_count = against_count + case when side='against' then 1 else 0 end where id=debate_id;
  perform add_vault_score_event(auth.uid(), 'vault_arena', 'argument_created', 8, jsonb_build_object('debate_id', debate_id));
  return v_id;
end; $$;

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

create or replace function get_active_ghost_count()
returns int language plpgsql security definer set search_path = public as $$
begin
  perform expire_ghost_sessions();
  return (select count(*)::int from ghost_sessions where is_active and expires_at > now());
end; $$;

create or replace function get_active_ghost_session()
returns jsonb language plpgsql security definer set search_path = public as $$
declare v ghost_sessions%rowtype;
begin
  if auth.uid() is null then return null; end if;
  perform expire_ghost_sessions();
  select * into v from ghost_sessions where user_id=auth.uid() and is_active and expires_at > now() order by started_at desc limit 1;
  if v.id is null then return null; end if;
  return to_jsonb(v);
end; $$;

create or replace function activate_ghost_mode()
returns jsonb language plpgsql security definer set search_path = public as $$
declare v_alias ghost_aliases%rowtype; v_session ghost_sessions%rowtype;
begin
  if auth.uid() is null then raise exception 'Not authenticated'; end if;
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

create or replace function deactivate_ghost_mode()
returns void language plpgsql security definer set search_path = public as $$
begin
  if auth.uid() is null then raise exception 'Not authenticated'; end if;
  update ghost_sessions set is_active=false, ended_at=now() where user_id=auth.uid() and is_active;
end; $$;

create or replace function create_ghost_post(p_post jsonb)
returns posts language plpgsql security definer set search_path = public as $$
declare v_session ghost_sessions%rowtype; v_post posts%rowtype;
begin
  if auth.uid() is null then raise exception 'Not authenticated'; end if;
  perform expire_ghost_sessions();
  select * into v_session from ghost_sessions where user_id=auth.uid() and is_active and expires_at > now() limit 1;
  if v_session.id is null then raise exception 'No active Ghost Mode session'; end if;
  insert into posts(author_id, author_username, author_avatar, college, is_anonymous, tag, content, media_urls, video_url, video_provider, video_asset_id, auto_delete_at, is_ghost, ghost_session_id, ghost_alias_snapshot)
  values(auth.uid(), v_session.alias_snapshot, null, 'Ghost transmission', false, coalesce(p_post->>'tag','General'), p_post->>'content', coalesce(array(select jsonb_array_elements_text(coalesce(p_post->'media_urls','[]'::jsonb))), '{}'), nullif(p_post->>'video_url',''), coalesce(p_post->>'video_provider','r2'), nullif(p_post->>'video_asset_id',''), nullif(p_post->>'auto_delete_at','')::timestamptz, true, v_session.id, v_session.alias_snapshot)
  returning * into v_post;
  insert into ghost_posts(ghost_session_id, user_id, post_id, alias_snapshot, content_snapshot) values(v_session.id, auth.uid(), v_post.id, v_session.alias_snapshot, v_post.content);
  update ghost_sessions set posts_created=posts_created+1 where id=v_session.id;
  return v_post;
end; $$;

create or replace function create_ghost_comment(p_comment jsonb)
returns comments language plpgsql security definer set search_path = public as $$
declare v_session ghost_sessions%rowtype; v_comment comments%rowtype;
begin
  if auth.uid() is null then raise exception 'Not authenticated'; end if;
  perform expire_ghost_sessions();
  select * into v_session from ghost_sessions where user_id=auth.uid() and is_active and expires_at > now() limit 1;
  if v_session.id is null then raise exception 'No active Ghost Mode session'; end if;
  insert into comments(post_id, parent_id, author_id, author_username, author_avatar, is_anonymous, content, is_ghost, ghost_session_id, ghost_alias_snapshot)
  values((p_comment->>'post_id')::uuid, nullif(p_comment->>'parent_id','')::uuid, auth.uid(), v_session.alias_snapshot, null, false, p_comment->>'content', true, v_session.id, v_session.alias_snapshot)
  returning * into v_comment;
  insert into ghost_posts(ghost_session_id, user_id, comment_id, alias_snapshot, content_snapshot) values(v_session.id, auth.uid(), v_comment.id, v_session.alias_snapshot, v_comment.content);
  update ghost_sessions set comments_created=comments_created+1 where id=v_session.id;
  return v_comment;
end; $$;

grant execute on function get_vault_home(uuid) to authenticated, anon;
grant execute on function nominate_vault_legend(uuid,text,text) to authenticated;
grant execute on function create_vault_alert(text,text,text,text,text) to authenticated;

create or replace function vote_vault_target(target_type text, target_id uuid, vote text default 'up')
returns void language plpgsql security definer set search_path = public as $$
declare v_previous text;
begin
  if auth.uid() is null then raise exception 'Not authenticated'; end if;
  if exists(select 1 from ghost_sessions where user_id=auth.uid() and is_active and expires_at > now()) then
    raise exception 'Ghost Mode cannot vote in the Vault';
  end if;
  if target_type not in ('legend_nomination','wiki_article') then raise exception 'Invalid vote target'; end if;
  if vote not in ('up','down') then raise exception 'Invalid vote'; end if;

  select vv.vote into v_previous from vault_votes vv where vv.user_id=auth.uid() and vv.target_type=vote_vault_target.target_type and vv.target_id=vote_vault_target.target_id;
  insert into vault_votes(user_id, target_type, target_id, vote) values(auth.uid(), target_type, target_id, vote)
  on conflict(user_id, target_type, target_id) do update set vote=excluded.vote;

  if v_previous is null then
    if target_type='legend_nomination' then
      update vault_nominations set votes_count = greatest(0, votes_count + case when vote='up' then 1 else -1 end) where id=target_id;
    else
      update vault_wiki_articles set upvotes = greatest(0, upvotes + case when vote='up' then 1 else -1 end) where id=target_id;
    end if;
  elsif v_previous <> vote then
    if target_type='legend_nomination' then
      update vault_nominations set votes_count = greatest(0, votes_count + case when vote='up' then 1 else -1 end + case when v_previous='up' then -1 else 1 end) where id=target_id;
    else
      update vault_wiki_articles set upvotes = greatest(0, upvotes + case when vote='up' then 1 else -1 end + case when v_previous='up' then -1 else 1 end) where id=target_id;
    end if;
  end if;
end; $$;
grant execute on function join_vault_debate(uuid,text,text,text) to authenticated;
grant execute on function vote_vault_target(text,uuid,text) to authenticated;
grant execute on function get_active_ghost_count() to authenticated, anon;
grant execute on function get_active_ghost_session() to authenticated;
grant execute on function activate_ghost_mode() to authenticated;
grant execute on function deactivate_ghost_mode() to authenticated;
grant execute on function create_ghost_post(jsonb) to authenticated;
grant execute on function create_ghost_comment(jsonb) to authenticated;
grant execute on function purge_ghost_session_activity(uuid) to service_role;
grant execute on function expire_ghost_sessions() to service_role;

-- Realtime support: enable these tables in Supabase Realtime publication if needed.
alter publication supabase_realtime add table vault_alerts;
alter publication supabase_realtime add table vault_debates;
alter publication supabase_realtime add table vault_arguments;
alter publication supabase_realtime add table vault_nominations;
alter publication supabase_realtime add table vault_wiki_articles;
alter publication supabase_realtime add table ghost_sessions;

create or replace function get_secure_posts(p_limit int default 100)
returns table(
  id uuid, author_id uuid, author_username text, author_avatar text, college text, is_anonymous boolean, tag text, content text,
  media_urls text[], video_url text, video_asset_id text, video_provider text, video_status text, upvotes int, downvotes int,
  comment_count int, repost_count int, auto_delete_at timestamptz, created_at timestamptz,
  is_ghost boolean, ghost_session_id uuid, ghost_alias_snapshot text
)
language sql security definer set search_path = public as $$
  select p.id,
    case when p.is_ghost then null else p.author_id end as author_id,
    case when p.is_ghost then p.ghost_alias_snapshot else p.author_username end as author_username,
    case when p.is_ghost then null else p.author_avatar end as author_avatar,
    case when p.is_ghost then 'Ghost transmission' else p.college end as college,
    p.is_anonymous, p.tag, p.content, p.media_urls, p.video_url, p.video_asset_id, p.video_provider, p.video_status,
    p.upvotes, p.downvotes, p.comment_count, p.repost_count, p.auto_delete_at, p.created_at,
    p.is_ghost, case when p.is_ghost then null else p.ghost_session_id end as ghost_session_id, p.ghost_alias_snapshot
  from posts p
  where p.auto_delete_at is null or p.auto_delete_at > now()
  order by p.created_at desc
  limit least(greatest(p_limit, 1), 100);
$$;
grant execute on function get_secure_posts(int) to authenticated, anon;

create or replace function get_secure_comments(p_post_id uuid)
returns table(
  id uuid, post_id uuid, parent_id uuid, author_id uuid, author_username text, author_avatar text, is_anonymous boolean,
  content text, upvotes int, downvotes int, created_at timestamptz, is_ghost boolean, ghost_session_id uuid, ghost_alias_snapshot text
)
language sql security definer set search_path = public as $$
  select c.id, c.post_id, c.parent_id,
    case when c.is_ghost then null else c.author_id end as author_id,
    case when c.is_ghost then c.ghost_alias_snapshot else c.author_username end as author_username,
    case when c.is_ghost then null else c.author_avatar end as author_avatar,
    c.is_anonymous, c.content, c.upvotes, c.downvotes, c.created_at,
    c.is_ghost, case when c.is_ghost then null else c.ghost_session_id end as ghost_session_id, c.ghost_alias_snapshot
  from comments c
  where c.post_id = p_post_id
  order by c.created_at asc;
$$;
grant execute on function get_secure_comments(uuid) to authenticated, anon;

-- Refresh PostgREST/Supabase schema cache after RPC signature changes.
notify pgrst, 'reload schema';
