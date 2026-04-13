-- UConnect Supabase Schema
-- Run this in Supabase SQL Editor

-- Enable required extensions
create extension if not exists "uuid-ossp";

-- ─── PROFILES ────────────────────────────────────────────────────────────────
create table if not exists profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text not null,
  phone text not null default '',
  username text unique not null,
  display_name text not null default '',
  college text not null default '',
  branch text not null default '',
  year text not null default '',
  bio text not null default '',
  avatar text,
  interests text[] not null default '{}',
  followers int not null default 0,
  following int not null default 0,
  posts_count int not null default 0,
  is_verified boolean not null default false,
  joined_at timestamptz not null default now(),
  created_at timestamptz not null default now()
);
alter table profiles enable row level security;
create policy "Public profiles are viewable" on profiles for select using (true);
create policy "Users can insert own profile" on profiles for insert with check (auth.uid() = id);
create policy "Users can update own profile" on profiles for update using (auth.uid() = id);
create policy "Users can delete own profile" on profiles for delete using (auth.uid() = id);

-- ─── USER SETTINGS ───────────────────────────────────────────────────────────
create table if not exists user_settings (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid not null references profiles(id) on delete cascade unique,
  push_notifications boolean not null default true,
  default_anonymous boolean not null default false,
  show_sensitive_content boolean not null default false,
  compact_mode boolean not null default false,
  updated_at timestamptz not null default now()
);
alter table user_settings enable row level security;
create policy "Users can manage own settings" on user_settings for all using (auth.uid() = user_id);

-- ─── POSTS ───────────────────────────────────────────────────────────────────
create table if not exists posts (
  id uuid primary key default uuid_generate_v4(),
  author_id uuid not null references profiles(id) on delete cascade,
  author_username text not null,
  author_avatar text,
  college text not null,
  is_anonymous boolean not null default false,
  tag text not null default 'General',
  content text not null,
  media_urls text[] not null default '{}',
  video_url text,
  upvotes int not null default 0,
  downvotes int not null default 0,
  comment_count int not null default 0,
  auto_delete_at timestamptz,
  created_at timestamptz not null default now()
);
alter table posts enable row level security;
create policy "Posts are viewable by all" on posts for select using (true);
create policy "Authenticated users can create posts" on posts for insert with check (auth.uid() = author_id);
create policy "Authors can update own posts" on posts for update using (auth.uid() = author_id);
create policy "Authors can delete own posts" on posts for delete using (auth.uid() = author_id);

-- ─── POST VOTES ──────────────────────────────────────────────────────────────
create table if not exists post_votes (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid not null references profiles(id) on delete cascade,
  post_id uuid not null references posts(id) on delete cascade,
  vote text not null check (vote in ('up', 'down')),
  created_at timestamptz not null default now(),
  unique(user_id, post_id)
);
alter table post_votes enable row level security;
create policy "Users can manage own votes" on post_votes for all using (auth.uid() = user_id);
create policy "Votes are viewable" on post_votes for select using (true);

-- ─── BOOKMARKS ───────────────────────────────────────────────────────────────
create table if not exists bookmarks (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid not null references profiles(id) on delete cascade,
  post_id uuid not null references posts(id) on delete cascade,
  created_at timestamptz not null default now(),
  unique(user_id, post_id)
);
alter table bookmarks enable row level security;
create policy "Users can manage own bookmarks" on bookmarks for all using (auth.uid() = user_id);

-- ─── COMMENTS ────────────────────────────────────────────────────────────────
create table if not exists comments (
  id uuid primary key default uuid_generate_v4(),
  post_id uuid not null references posts(id) on delete cascade,
  parent_id uuid references comments(id) on delete cascade,
  author_id uuid not null references profiles(id) on delete cascade,
  author_username text not null,
  author_avatar text,
  is_anonymous boolean not null default false,
  content text not null,
  upvotes int not null default 0,
  downvotes int not null default 0,
  created_at timestamptz not null default now()
);
alter table comments enable row level security;
create policy "Comments are viewable" on comments for select using (true);
create policy "Authenticated users can comment" on comments for insert with check (auth.uid() = author_id);
create policy "Authors can update own comments" on comments for update using (auth.uid() = author_id);
create policy "Authors can delete own comments" on comments for delete using (auth.uid() = author_id);

-- ─── COMMENT VOTES ───────────────────────────────────────────────────────────
create table if not exists comment_votes (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid not null references profiles(id) on delete cascade,
  comment_id uuid not null references comments(id) on delete cascade,
  vote text not null check (vote in ('up', 'down')),
  created_at timestamptz not null default now(),
  unique(user_id, comment_id)
);
alter table comment_votes enable row level security;
create policy "Users can manage own comment votes" on comment_votes for all using (auth.uid() = user_id);
create policy "Comment votes viewable" on comment_votes for select using (true);

-- ─── DRAFTS ──────────────────────────────────────────────────────────────────
create table if not exists drafts (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid not null references profiles(id) on delete cascade,
  content text not null,
  tag text not null default 'General',
  is_anonymous boolean not null default false,
  saved_at timestamptz not null default now()
);
alter table drafts enable row level security;
create policy "Users can manage own drafts" on drafts for all using (auth.uid() = user_id);

-- ─── FOLLOWING ───────────────────────────────────────────────────────────────
create table if not exists following (
  id uuid primary key default uuid_generate_v4(),
  follower_id uuid not null references profiles(id) on delete cascade,
  following_id uuid not null references profiles(id) on delete cascade,
  created_at timestamptz not null default now(),
  unique(follower_id, following_id),
  check (follower_id <> following_id)
);
alter table following enable row level security;
create policy "Users can manage own following" on following for all using (auth.uid() = follower_id);
create policy "Following is viewable" on following for select using (true);
-- ─── REPORTS ─────────────────────────────────────────────────────────────────
create table if not exists reports (
  id uuid primary key default uuid_generate_v4(),
  reporter_id uuid not null references profiles(id) on delete cascade,
  post_id uuid not null references posts(id) on delete cascade,
  reason text not null,
  status text not null default 'pending',
  created_at timestamptz not null default now()
);
alter table reports enable row level security;
create policy "Users can create reports" on reports for insert with check (auth.uid() = reporter_id);
create policy "Users can view own reports" on reports for select using (auth.uid() = reporter_id);

-- ─── CONFESSIONS ─────────────────────────────────────────────────────────────
create table if not exists confessions (
  id uuid primary key default uuid_generate_v4(),
  college text not null default 'All',
  content text not null,
  upvotes int not null default 0,
  comment_count int not null default 0,
  has_sensitive_content boolean not null default false,
  created_at timestamptz not null default now()
);
alter table confessions enable row level security;
create policy "Confessions are viewable" on confessions for select using (true);
create policy "Authenticated users can confess" on confessions for insert with check (auth.role() = 'authenticated');

-- ─── CONFESSION VOTES ────────────────────────────────────────────────────────
create table if not exists confession_votes (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid not null references profiles(id) on delete cascade,
  confession_id uuid not null references confessions(id) on delete cascade,
  vote text not null check (vote in ('up', 'down')),
  created_at timestamptz not null default now(),
  unique(user_id, confession_id)
);
alter table confession_votes enable row level security;
create policy "Users can manage own confession votes" on confession_votes for all using (auth.uid() = user_id);
create policy "Confession votes viewable" on confession_votes for select using (true);

-- ─── CONFESSION COMMENTS ─────────────────────────────────────────────────────
create table if not exists confession_comments (
  id uuid primary key default uuid_generate_v4(),
  confession_id uuid not null references confessions(id) on delete cascade,
  author_id uuid not null references profiles(id) on delete cascade,
  is_anonymous boolean not null default true,
  content text not null,
  upvotes int not null default 0,
  created_at timestamptz not null default now()
);
alter table confession_comments enable row level security;
create policy "Confession comments viewable" on confession_comments for select using (true);
create policy "Authenticated users can comment on confessions" on confession_comments for insert with check (auth.uid() = author_id);

-- ─── CONVERSATIONS ────────────────────────────────────────────────────────────
create table if not exists conversations (
  id uuid primary key default uuid_generate_v4(),
  user_a uuid not null references profiles(id) on delete cascade,
  user_b uuid not null references profiles(id) on delete cascade,
  is_anonymous boolean not null default false,
  is_revealed boolean not null default false,
  is_blocked boolean not null default false,
  last_message text not null default '',
  last_message_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  unique(user_a, user_b)
);
alter table conversations enable row level security;
create policy "Participants can view conversation" on conversations for select using (auth.uid() = user_a or auth.uid() = user_b);
create policy "Authenticated users can create conversations" on conversations for insert with check (auth.uid() = user_a or auth.uid() = user_b);
create policy "Participants can update conversation" on conversations for update using (auth.uid() = user_a or auth.uid() = user_b);
create policy "Participants can delete conversation" on conversations for delete using (auth.uid() = user_a or auth.uid() = user_b);

-- ─── MESSAGES ────────────────────────────────────────────────────────────────
create table if not exists messages (
  id uuid primary key default uuid_generate_v4(),
  conversation_id uuid not null references conversations(id) on delete cascade,
  sender_id uuid not null references profiles(id) on delete cascade,
  content text not null,
  is_read boolean not null default false,
  is_revealed boolean not null default false,
  created_at timestamptz not null default now()
);
alter table messages enable row level security;
create policy "Conversation participants can view messages" on messages for select
  using (
    exists (
      select 1 from conversations c
      where c.id = messages.conversation_id
        and (c.user_a = auth.uid() or c.user_b = auth.uid())
    )
  );
create policy "Senders can insert messages" on messages for insert with check (auth.uid() = sender_id);
create policy "Senders can update messages" on messages for update using (auth.uid() = sender_id);

-- ─── NOTIFICATIONS ────────────────────────────────────────────────────────────
create table if not exists notifications (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid not null references profiles(id) on delete cascade,
  type text not null,
  title text not null,
  body text not null,
  is_read boolean not null default false,
  action_id text,
  action_type text,
  created_at timestamptz not null default now()
);
alter table notifications enable row level security;
create policy "Users can manage own notifications" on notifications for all using (auth.uid() = user_id);

-- ─── TEAMS ───────────────────────────────────────────────────────────────────
create table if not exists teams (
  id uuid primary key default uuid_generate_v4(),
  title text not null,
  type text not null,
  description text not null,
  skills text[] not null default '{}',
  members int not null default 1,
  max_members int not null default 4,
  deadline text not null default 'Open',
  poster_id uuid not null references profiles(id) on delete cascade,
  poster_username text not null,
  college text not null default '',
  created_at timestamptz not null default now()
);
alter table teams enable row level security;
create policy "Teams are viewable" on teams for select using (true);
create policy "Authenticated users can create teams" on teams for insert with check (auth.uid() = poster_id);
create policy "Owners can update teams" on teams for update using (auth.uid() = poster_id);
create policy "Owners can delete teams" on teams for delete using (auth.uid() = poster_id);

-- ─── TEAM REQUESTS ───────────────────────────────────────────────────────────
create table if not exists team_requests (
  id uuid primary key default uuid_generate_v4(),
  team_id uuid not null references teams(id) on delete cascade,
  user_id uuid not null references profiles(id) on delete cascade,
  username text not null,
  display_name text not null,
  college text not null,
  message text not null default '',
  status text not null default 'pending',
  requested_at timestamptz not null default now(),
  unique(team_id, user_id)
);
alter table team_requests enable row level security;
create policy "Team owners and requesters can view" on team_requests for select
  using (
    auth.uid() = user_id
    or exists (select 1 from teams t where t.id = team_requests.team_id and t.poster_id = auth.uid())
  );
create policy "Authenticated users can request" on team_requests for insert with check (auth.uid() = user_id);
create policy "Team owners can update request status" on team_requests for update
  using (exists (select 1 from teams t where t.id = team_requests.team_id and t.poster_id = auth.uid()));
create policy "Requesters can delete own request" on team_requests for delete using (auth.uid() = user_id);

-- ─── EVENTS ──────────────────────────────────────────────────────────────────
create table if not exists events (
  id uuid primary key default uuid_generate_v4(),
  title text not null,
  description text not null,
  date text not null,
  location text not null,
  college text not null,
  organizer text not null,
  organizer_id uuid not null references profiles(id) on delete cascade,
  image_url text,
  rsvp_count int not null default 0,
  created_at timestamptz not null default now()
);
alter table events enable row level security;
create policy "Events are viewable" on events for select using (true);
create policy "Authenticated users can create events" on events for insert with check (auth.uid() = organizer_id);
create policy "Organizers can update events" on events for update using (auth.uid() = organizer_id);
create policy "Organizers can delete events" on events for delete using (auth.uid() = organizer_id);

-- ─── EVENT RSVPS ─────────────────────────────────────────────────────────────
create table if not exists event_rsvps (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid not null references profiles(id) on delete cascade,
  event_id uuid not null references events(id) on delete cascade,
  created_at timestamptz not null default now(),
  unique(user_id, event_id)
);
alter table event_rsvps enable row level security;
create policy "Users can manage own RSVPs" on event_rsvps for all using (auth.uid() = user_id);
create policy "RSVPs viewable" on event_rsvps for select using (true);

-- ─── INTERNSHIPS ─────────────────────────────────────────────────────────────
create table if not exists internships (
  id uuid primary key default uuid_generate_v4(),
  company text not null,
  role text not null,
  location text not null,
  duration text not null,
  stipend text not null,
  type text not null,
  skills text[] not null default '{}',
  deadline text not null,
  poster_id uuid not null references profiles(id) on delete cascade,
  poster_username text not null,
  is_verified boolean not null default false,
  description text not null default '',
  created_at timestamptz not null default now()
);
alter table internships enable row level security;
create policy "Internships are viewable" on internships for select using (true);
create policy "Authenticated users can post internships" on internships for insert with check (auth.uid() = poster_id);
create policy "Posters can update internships" on internships for update using (auth.uid() = poster_id);
create policy "Posters can delete internships" on internships for delete using (auth.uid() = poster_id);

-- ─── INTERNSHIP APPLICATIONS ─────────────────────────────────────────────────
create table if not exists internship_applications (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid not null references profiles(id) on delete cascade,
  internship_id uuid not null references internships(id) on delete cascade,
  created_at timestamptz not null default now(),
  unique(user_id, internship_id)
);
alter table internship_applications enable row level security;
create policy "Users can manage own applications" on internship_applications for all using (auth.uid() = user_id);
create policy "Applications viewable" on internship_applications for select using (true);

-- ─── NOTES ───────────────────────────────────────────────────────────────────
create table if not exists notes (
  id uuid primary key default uuid_generate_v4(),
  title text not null,
  subject text not null,
  college text not null,
  year text not null,
  uploader_id uuid not null references profiles(id) on delete cascade,
  uploader_username text not null,
  file_url text not null,
  file_type text not null default 'pdf',
  description text not null default '',
  downloads int not null default 0,
  saves int not null default 0,
  created_at timestamptz not null default now()
);
alter table notes add column if not exists image_urls text[] not null default '{}';
alter table notes enable row level security;
create policy "Notes are viewable" on notes for select using (true);
create policy "Authenticated users can upload notes" on notes for insert with check (auth.uid() = uploader_id);
create policy "Uploaders can update notes" on notes for update using (auth.uid() = uploader_id);
create policy "Uploaders can delete notes" on notes for delete using (auth.uid() = uploader_id);

-- ─── NOTE SAVES ──────────────────────────────────────────────────────────────
create table if not exists note_saves (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid not null references profiles(id) on delete cascade,
  note_id uuid not null references notes(id) on delete cascade,
  created_at timestamptz not null default now(),
  unique(user_id, note_id)
);
alter table note_saves enable row level security;
create policy "Users can manage own saves" on note_saves for all using (auth.uid() = user_id);

-- ─── APP RATINGS ───────────────────────────────────────────────────────────────
create table if not exists app_ratings (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid not null references profiles(id) on delete cascade,
  rating int not null check (rating >= 1 and rating <= 5),
  feedback text,
  created_at timestamptz not null default now()
);
alter table app_ratings enable row level security;
create policy "Users can add own ratings" on app_ratings for insert with check (auth.uid() = user_id);
create policy "Users can view own ratings" on app_ratings for select using (auth.uid() = user_id);

-- ─── INVITE CODES ──────────────────────────────────────────────────────────────
create table if not exists invite_codes (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid not null unique references profiles(id) on delete cascade,
  code text not null unique,
  total_shares int not null default 0,
  total_joins int not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
alter table invite_codes enable row level security;
create policy "Users can manage own invite code" on invite_codes for all using (auth.uid() = user_id);

-- ─── FUNCTIONS ───────────────────────────────────────────────────────────────

-- Vote on a post (upsert, toggle)
create or replace function vote_post(p_post_id uuid, p_user_id uuid, p_vote text)
returns void language plpgsql security definer as $$
declare
  existing_vote text;
begin
  select vote into existing_vote from post_votes where post_id = p_post_id and user_id = p_user_id;
  if existing_vote is null then
    insert into post_votes(user_id, post_id, vote) values (p_user_id, p_post_id, p_vote);
    if p_vote = 'up' then
      update posts set upvotes = upvotes + 1 where id = p_post_id;
    else
      update posts set downvotes = downvotes + 1 where id = p_post_id;
    end if;
  elsif existing_vote = p_vote then
    delete from post_votes where post_id = p_post_id and user_id = p_user_id;
    if p_vote = 'up' then
      update posts set upvotes = greatest(0, upvotes - 1) where id = p_post_id;
    else
      update posts set downvotes = greatest(0, downvotes - 1) where id = p_post_id;
    end if;
  else
    update post_votes set vote = p_vote where post_id = p_post_id and user_id = p_user_id;
    if p_vote = 'up' then
      update posts set upvotes = upvotes + 1, downvotes = greatest(0, downvotes - 1) where id = p_post_id;
    else
      update posts set downvotes = downvotes + 1, upvotes = greatest(0, upvotes - 1) where id = p_post_id;
    end if;
  end if;
end;
$$;

-- Vote on a confession
create or replace function vote_confession(p_confession_id uuid, p_user_id uuid, p_vote text)
returns void language plpgsql security definer as $$
declare
  existing_vote text;
begin
  select vote into existing_vote from confession_votes where confession_id = p_confession_id and user_id = p_user_id;
  if existing_vote is null then
    insert into confession_votes(user_id, confession_id, vote) values (p_user_id, p_confession_id, p_vote);
    if p_vote = 'up' then
      update confessions set upvotes = upvotes + 1 where id = p_confession_id;
    end if;
  elsif existing_vote = p_vote then
    delete from confession_votes where confession_id = p_confession_id and user_id = p_user_id;
    if p_vote = 'up' then
      update confessions set upvotes = greatest(0, upvotes - 1) where id = p_confession_id;
    end if;
  end if;
end;
$$;

-- Increment post comment count
create or replace function increment_comment_count(p_post_id uuid)
returns void language plpgsql security definer as $$
begin
  update posts set comment_count = comment_count + 1 where id = p_post_id;
end;
$$;

-- Increment confession comment count
create or replace function increment_confession_comment_count(p_confession_id uuid)
returns void language plpgsql security definer as $$
begin
  update confessions set comment_count = comment_count + 1 where id = p_confession_id;
end;
$$;

-- Update follower/following counts
create or replace function follow_user(p_follower_id uuid, p_following_id uuid)
returns void language plpgsql security definer as $$
begin
  insert into following(follower_id, following_id) values (p_follower_id, p_following_id)
    on conflict do nothing;
  update profiles set following = following + 1 where id = p_follower_id;
  update profiles set followers = followers + 1 where id = p_following_id;
end;
$$;

create or replace function unfollow_user(p_follower_id uuid, p_following_id uuid)
returns void language plpgsql security definer as $$
begin
  delete from following where follower_id = p_follower_id and following_id = p_following_id;
  update profiles set following = greatest(0, following - 1) where id = p_follower_id;
  update profiles set followers = greatest(0, followers - 1) where id = p_following_id;
end;
$$;

-- RSVP to an event
create or replace function rsvp_event(p_user_id uuid, p_event_id uuid)
returns void language plpgsql security definer as $$
begin
  insert into event_rsvps(user_id, event_id) values (p_user_id, p_event_id) on conflict do nothing;
  update events set rsvp_count = rsvp_count + 1 where id = p_event_id;
end;
$$;

create or replace function unrsvp_event(p_user_id uuid, p_event_id uuid)
returns void language plpgsql security definer as $$
begin
  delete from event_rsvps where user_id = p_user_id and event_id = p_event_id;
  update events set rsvp_count = greatest(0, rsvp_count - 1) where id = p_event_id;
end;
$$;

-- Delete account and all related data
create or replace function delete_account()
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  calling_user_id uuid;
begin
  calling_user_id := auth.uid();
  if calling_user_id is null then
    raise exception 'Not authenticated';
  end if;

  delete from profiles where id = calling_user_id;
  delete from auth.users where id = calling_user_id;
end;
$$;

grant execute on function delete_account() to authenticated;
