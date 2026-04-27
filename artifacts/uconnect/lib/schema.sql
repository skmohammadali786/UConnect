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
  avatar_ring_color text not null default '#6366F1',
  banner text,
  interests text[] not null default '{}',
  followers int not null default 0,
  following int not null default 0,
  posts_count int not null default 0,
  is_verified boolean not null default false,
  chat_public_key text,
  joined_at timestamptz not null default now(),
  created_at timestamptz not null default now()
);
alter table profiles enable row level security;
create policy "Public profiles are viewable" on profiles for select using (true);
create policy "Users can insert own profile" on profiles for insert with check (auth.uid() = id);
create policy "Users can update own profile" on profiles for update using (auth.uid() = id);
create policy "Users can delete own profile" on profiles for delete using (auth.uid() = id);

-- ─── PROFILE VERIFICATION REQUESTS ──────────────────────────────────────────
create table if not exists profile_verification_requests (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid not null unique references profiles(id) on delete cascade,
  college_id_url text not null,
  photo_id_url text not null,
  status text not null default 'pending' check (status in ('pending', 'approved', 'rejected')),
  rejection_reason text,
  submitted_at timestamptz not null default now(),
  reviewed_at timestamptz,
  reviewed_by uuid references profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists idx_profile_verification_requests_status on profile_verification_requests(status, submitted_at desc);
alter table profile_verification_requests enable row level security;
create policy "Users can view own verification request" on profile_verification_requests
  for select using (auth.uid() = user_id);
create policy "Users can create own verification request" on profile_verification_requests
  for insert with check (auth.uid() = user_id);
create policy "Users can resubmit own verification request" on profile_verification_requests
  for update using (auth.uid() = user_id)
  with check (auth.uid() = user_id and status = 'pending');

create or replace function set_timestamp_profile_verification_requests()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists trg_profile_verification_requests_updated_at on profile_verification_requests;
create trigger trg_profile_verification_requests_updated_at
before update on profile_verification_requests
for each row execute procedure set_timestamp_profile_verification_requests();

create or replace function sync_profile_verified_flag()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.status = 'approved' then
    update profiles set is_verified = true where id = new.user_id;
  elsif new.status = 'rejected' then
    update profiles set is_verified = false where id = new.user_id;
  end if;
  return new;
end;
$$;

drop trigger if exists trg_sync_profile_verified_flag on profile_verification_requests;
create trigger trg_sync_profile_verified_flag
after insert or update of status on profile_verification_requests
for each row execute procedure sync_profile_verified_flag();

-- ─── USER SETTINGS ───────────────────────────────────────────────────────────
create table if not exists user_settings (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid not null references profiles(id) on delete cascade unique,
  push_notifications boolean not null default true,
  default_anonymous boolean not null default false,
  show_sensitive_content boolean not null default false,
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
  repost_count int not null default 0,
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

-- ─── REPOSTS ──────────────────────────────────────────────────────────────────
create table if not exists reposts (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid not null references profiles(id) on delete cascade,
  post_id uuid not null references posts(id) on delete cascade,
  created_at timestamptz not null default now(),
  unique(user_id, post_id)
);
alter table reposts enable row level security;
create policy "Reposts are viewable" on reposts for select using (true);
create policy "Users can manage own reposts" on reposts for all using (auth.uid() = user_id);

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
  author_id uuid default auth.uid() references profiles(id) on delete cascade,
  college text not null default 'All',
  content text not null,
  upvotes int not null default 0,
  downvotes int not null default 0,
  comment_count int not null default 0,
  has_sensitive_content boolean not null default false,
  created_at timestamptz not null default now()
);
alter table confessions enable row level security;
create policy "Confessions are viewable" on confessions for select using (true);
create policy "Authenticated users can confess" on confessions for insert with check (auth.role() = 'authenticated' and auth.uid() = author_id);
create policy "Users can delete own confessions" on confessions for delete using (author_id is not null and auth.uid() = author_id);
create index if not exists idx_confessions_author_id_created_at on confessions(author_id, created_at desc);

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
  downvotes int not null default 0,
  created_at timestamptz not null default now()
);
alter table confession_comments enable row level security;
create policy "Confession comments viewable" on confession_comments for select using (true);
create policy "Authenticated users can comment on confessions" on confession_comments for insert with check (auth.uid() = author_id);
create policy "Authors can delete own confession comments" on confession_comments for delete using (auth.uid() = author_id);

create table if not exists confession_comment_votes (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid not null references profiles(id) on delete cascade,
  comment_id uuid not null references confession_comments(id) on delete cascade,
  vote text not null check (vote in ('up', 'down')),
  created_at timestamptz not null default now(),
  unique(user_id, comment_id)
);
alter table confession_comment_votes enable row level security;
create policy "Users can manage own confession comment votes" on confession_comment_votes for all using (auth.uid() = user_id);
create policy "Confession comment votes viewable" on confession_comment_votes for select using (true);

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
  encrypted_content text,
  encryption_iv text,
  sender_public_key text,
  encryption_version int not null default 1,
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

create or replace function mark_conversation_read(p_conversation_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if auth.uid() is null then
    raise exception 'Not authenticated';
  end if;

  if not exists (
    select 1 from conversations c
    where c.id = p_conversation_id
      and (c.user_a = auth.uid() or c.user_b = auth.uid())
  ) then
    raise exception 'Not allowed';
  end if;

  update messages
  set is_read = true
  where conversation_id = p_conversation_id
    and sender_id <> auth.uid()
    and is_read = false;
end;
$$;

grant execute on function mark_conversation_read(uuid) to authenticated;

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

-- Notes storage bucket
insert into storage.buckets (id, name, public)
values ('notes', 'notes', true)
on conflict (id) do update set public = excluded.public;

drop policy if exists "Notes files are public" on storage.objects;
create policy "Notes files are public" on storage.objects
  for select
  using (bucket_id = 'notes');

drop policy if exists "Authenticated users can upload own notes files" on storage.objects;
create policy "Authenticated users can upload own notes files" on storage.objects
  for insert
  to authenticated
  with check (
    bucket_id = 'notes'
    and ((storage.foldername(name))[1] = auth.uid()::text)
  );

drop policy if exists "Users can update own notes files" on storage.objects;
create policy "Users can update own notes files" on storage.objects
  for update
  to authenticated
  using (
    bucket_id = 'notes'
    and owner = auth.uid()
  )
  with check (
    bucket_id = 'notes'
    and owner = auth.uid()
  );

drop policy if exists "Users can delete own notes files" on storage.objects;
create policy "Users can delete own notes files" on storage.objects
  for delete
  to authenticated
  using (
    bucket_id = 'notes'
    and owner = auth.uid()
  );

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
    else
      update confessions set downvotes = downvotes + 1 where id = p_confession_id;
    end if;
  elsif existing_vote = p_vote then
    delete from confession_votes where confession_id = p_confession_id and user_id = p_user_id;
    if p_vote = 'up' then
      update confessions set upvotes = greatest(0, upvotes - 1) where id = p_confession_id;
    else
      update confessions set downvotes = greatest(0, downvotes - 1) where id = p_confession_id;
    end if;
  else
    update confession_votes set vote = p_vote where confession_id = p_confession_id and user_id = p_user_id;
    if p_vote = 'up' then
      update confessions set upvotes = upvotes + 1, downvotes = greatest(0, downvotes - 1) where id = p_confession_id;
    else
      update confessions set downvotes = downvotes + 1, upvotes = greatest(0, upvotes - 1) where id = p_confession_id;
    end if;
  end if;
end;
$$;

-- Vote on a post comment
create or replace function vote_comment(p_comment_id uuid, p_user_id uuid, p_vote text)
returns void language plpgsql security definer as $$
declare
  existing_vote text;
begin
  select vote into existing_vote from comment_votes where comment_id = p_comment_id and user_id = p_user_id;
  if existing_vote is null then
    insert into comment_votes(user_id, comment_id, vote) values (p_user_id, p_comment_id, p_vote);
    if p_vote = 'up' then
      update comments set upvotes = upvotes + 1 where id = p_comment_id;
    else
      update comments set downvotes = downvotes + 1 where id = p_comment_id;
    end if;
  elsif existing_vote = p_vote then
    delete from comment_votes where comment_id = p_comment_id and user_id = p_user_id;
    if p_vote = 'up' then
      update comments set upvotes = greatest(0, upvotes - 1) where id = p_comment_id;
    else
      update comments set downvotes = greatest(0, downvotes - 1) where id = p_comment_id;
    end if;
  else
    update comment_votes set vote = p_vote where comment_id = p_comment_id and user_id = p_user_id;
    if p_vote = 'up' then
      update comments set upvotes = upvotes + 1, downvotes = greatest(0, downvotes - 1) where id = p_comment_id;
    else
      update comments set downvotes = downvotes + 1, upvotes = greatest(0, upvotes - 1) where id = p_comment_id;
    end if;
  end if;
end;
$$;

-- Vote on a confession comment
create or replace function vote_confession_comment(p_comment_id uuid, p_user_id uuid, p_vote text)
returns void language plpgsql security definer as $$
declare
  existing_vote text;
begin
  select vote into existing_vote from confession_comment_votes where comment_id = p_comment_id and user_id = p_user_id;
  if existing_vote is null then
    insert into confession_comment_votes(user_id, comment_id, vote) values (p_user_id, p_comment_id, p_vote);
    if p_vote = 'up' then
      update confession_comments set upvotes = upvotes + 1 where id = p_comment_id;
    else
      update confession_comments set downvotes = downvotes + 1 where id = p_comment_id;
    end if;
  elsif existing_vote = p_vote then
    delete from confession_comment_votes where comment_id = p_comment_id and user_id = p_user_id;
    if p_vote = 'up' then
      update confession_comments set upvotes = greatest(0, upvotes - 1) where id = p_comment_id;
    else
      update confession_comments set downvotes = greatest(0, downvotes - 1) where id = p_comment_id;
    end if;
  else
    update confession_comment_votes set vote = p_vote where comment_id = p_comment_id and user_id = p_user_id;
    if p_vote = 'up' then
      update confession_comments set upvotes = upvotes + 1, downvotes = greatest(0, downvotes - 1) where id = p_comment_id;
    else
      update confession_comments set downvotes = downvotes + 1, upvotes = greatest(0, upvotes - 1) where id = p_comment_id;
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

create or replace function decrement_comment_count(p_post_id uuid, p_decrement_by integer default 1)
returns void language plpgsql security definer as $$
declare
  decrement_value integer := greatest(0, coalesce(p_decrement_by, 1));
begin
  update posts
  set comment_count = greatest(0, comment_count - decrement_value)
  where id = p_post_id;
end;
$$;

-- Increment confession comment count
create or replace function increment_confession_comment_count(p_confession_id uuid)
returns void language plpgsql security definer as $$
begin
  update confessions set comment_count = comment_count + 1 where id = p_confession_id;
end;
$$;

create or replace function decrement_confession_comment_count(p_confession_id uuid, p_decrement_by integer default 1)
returns void language plpgsql security definer as $$
declare
  decrement_value integer := greatest(0, coalesce(p_decrement_by, 1));
begin
  update confessions
  set comment_count = greatest(0, comment_count - decrement_value)
  where id = p_confession_id;
end;
$$;

-- Update follower/following counts
create or replace function follow_user(p_follower_id uuid, p_following_id uuid)
returns void language plpgsql security definer as $$
declare
  inserted_count int := 0;
begin
  insert into following(follower_id, following_id) values (p_follower_id, p_following_id)
    on conflict do nothing;
  get diagnostics inserted_count = row_count;

  if inserted_count > 0 then
    update profiles set following = following + 1 where id = p_follower_id;
    update profiles set followers = followers + 1 where id = p_following_id;
  end if;
end;
$$;

create or replace function unfollow_user(p_follower_id uuid, p_following_id uuid)
returns void language plpgsql security definer as $$
declare
  deleted_count int := 0;
begin
  delete from following where follower_id = p_follower_id and following_id = p_following_id;
  get diagnostics deleted_count = row_count;

  if deleted_count > 0 then
    update profiles set following = greatest(0, following - 1) where id = p_follower_id;
    update profiles set followers = greatest(0, followers - 1) where id = p_following_id;
  end if;
end;
$$;

-- Repost management
create or replace function repost_post(p_user_id uuid, p_post_id uuid)
returns void language plpgsql security definer as $$
declare
  inserted_count int := 0;
begin
  insert into reposts(user_id, post_id) values (p_user_id, p_post_id)
    on conflict do nothing;
  get diagnostics inserted_count = row_count;

  if inserted_count > 0 then
    update posts set repost_count = repost_count + 1 where id = p_post_id;
  end if;
end;
$$;

create or replace function undo_repost_post(p_user_id uuid, p_post_id uuid)
returns void language plpgsql security definer as $$
declare
  deleted_count int := 0;
begin
  delete from reposts where user_id = p_user_id and post_id = p_post_id;
  get diagnostics deleted_count = row_count;

  if deleted_count > 0 then
    update posts set repost_count = greatest(0, repost_count - 1) where id = p_post_id;
  end if;
end;
$$;

-- Reconcile counters
create or replace function refresh_follow_counts()
returns void language sql security definer as $$
  update profiles p
  set following = coalesce((
      select count(*)::int
      from following f
      where f.follower_id = p.id
    ), 0),
    followers = coalesce((
      select count(*)::int
      from following f
      where f.following_id = p.id
    ), 0);
$$;

create or replace function refresh_repost_counts()
returns void language sql security definer as $$
  update posts p
  set repost_count = coalesce((
    select count(*)::int
    from reposts r
    where r.post_id = p.id
  ), 0);
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

-- ─── LIFECYCLE + REDIRECT + REFERRAL EXTENSIONS ──────────────────────────────

create or replace function set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

-- Notifications: richer cross-feature redirect payload
alter table notifications
  add column if not exists redirect_path text,
  add column if not exists entity_type text,
  add column if not exists entity_id text,
  add column if not exists secondary_entity_type text,
  add column if not exists secondary_entity_id text,
  add column if not exists metadata jsonb not null default '{}'::jsonb;

create table if not exists notification_action_routes (
  action_type text primary key,
  redirect_template text not null,
  description text not null
);

insert into notification_action_routes(action_type, redirect_template, description) values
  ('post', '/post/:post_id', 'Post detail'),
  ('profile', '/user/:username', 'User profile'),
  ('chat', '/chat/:conversation_id', 'Conversation'),
  ('internship', '/internships/:internship_id', 'Internship detail'),
  ('internship_application', '/internships/:internship_id?tab=applications', 'Internship host applications'),
  ('internship_application_status', '/internships/:internship_id', 'Applicant internship status'),
  ('event', '/events/:event_id', 'Event detail'),
  ('event_attendee_request', '/events/:event_id?tab=attendees', 'Event host attendee requests'),
  ('event_attendee_status', '/events/:event_id', 'Event attendee status'),
  ('team', '/teams/:team_id', 'Team detail'),
  ('team_request', '/teams/:team_id', 'Team requests'),
  ('team_request_status', '/teams/:team_id', 'Team request status'),
  ('confession', '/confessions/:confession_id', 'Confession detail'),
  ('note', '/notes/:note_id', 'Note detail'),
  ('invite', '/invite', 'Invite screen'),
  ('system', '/(tabs)/notifications', 'Notifications screen')
on conflict (action_type) do update
set redirect_template = excluded.redirect_template,
    description = excluded.description;

-- Internship application lifecycle + reasons
alter table internship_applications
  add column if not exists status text not null default 'pending' check (status in ('pending', 'approved', 'rejected', 'withdrawn', 'hired', 'closed')),
  add column if not exists apply_message text not null default '',
  add column if not exists review_reason text,
  add column if not exists reviewed_by uuid references profiles(id) on delete set null,
  add column if not exists reviewed_at timestamptz,
  add column if not exists updated_at timestamptz not null default now();

create index if not exists idx_internship_applications_internship_status
  on internship_applications(internship_id, status, created_at desc);

drop trigger if exists trg_internship_applications_updated_at on internship_applications;
create trigger trg_internship_applications_updated_at
before update on internship_applications
for each row execute function set_updated_at();

drop policy if exists "Users can manage own applications" on internship_applications;
drop policy if exists "Applications viewable" on internship_applications;

create policy "Applicant or internship host can view applications"
on internship_applications
for select
using (
  auth.uid() = user_id
  or exists (
    select 1 from internships i
    where i.id = internship_applications.internship_id
      and i.poster_id = auth.uid()
  )
);

create policy "Applicant can create own application"
on internship_applications
for insert
with check (
  auth.uid() = user_id
  and exists (
    select 1 from internships i
    where i.id = internship_applications.internship_id
      and i.poster_id <> auth.uid()
  )
);

create policy "Internship host can review applications"
on internship_applications
for update
using (
  exists (
    select 1 from internships i
    where i.id = internship_applications.internship_id
      and i.poster_id = auth.uid()
  )
);

create policy "Applicant can delete own application"
on internship_applications
for delete
using (auth.uid() = user_id);

create or replace function apply_internship(p_internship_id uuid, p_message text default '')
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id uuid := auth.uid();
  v_host_id uuid;
  v_app_id uuid;
begin
  if v_user_id is null then
    raise exception 'Not authenticated';
  end if;

  select poster_id into v_host_id from internships where id = p_internship_id;
  if v_host_id is null then
    raise exception 'Internship not found';
  end if;
  if v_host_id = v_user_id then
    raise exception 'Cannot apply to own internship';
  end if;

  insert into internship_applications(user_id, internship_id, status, apply_message)
  values (v_user_id, p_internship_id, 'pending', coalesce(p_message, ''))
  on conflict (user_id, internship_id)
  do update set
    status = case
      when internship_applications.status in ('rejected', 'withdrawn') then 'pending'
      else internship_applications.status
    end,
    apply_message = excluded.apply_message,
    updated_at = now()
  returning id into v_app_id;

  insert into notifications(user_id, type, title, body, action_id, action_type, redirect_path, entity_type, entity_id, secondary_entity_type, secondary_entity_id, metadata)
  values (
    v_host_id,
    'event',
    'New internship application',
    'A student applied to your internship post.',
    p_internship_id::text,
    'internship_application',
    '/internships/' || p_internship_id || '?tab=applications',
    'internship',
    p_internship_id::text,
    'application',
    v_app_id::text,
    jsonb_build_object('applicant_id', v_user_id)
  );

  return v_app_id;
end;
$$;

grant execute on function apply_internship(uuid, text) to authenticated;

create or replace function review_internship_application(
  p_application_id uuid,
  p_new_status text,
  p_reason text default null
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_host_id uuid := auth.uid();
  v_applicant_id uuid;
  v_internship_id uuid;
begin
  if v_host_id is null then
    raise exception 'Not authenticated';
  end if;
  if p_new_status not in ('approved', 'rejected', 'hired', 'closed') then
    raise exception 'Invalid status';
  end if;

  select ia.user_id, ia.internship_id
  into v_applicant_id, v_internship_id
  from internship_applications ia
  join internships i on i.id = ia.internship_id
  where ia.id = p_application_id
    and i.poster_id = v_host_id;

  if v_internship_id is null then
    raise exception 'Application not found or unauthorized';
  end if;

  update internship_applications
  set status = p_new_status,
      review_reason = p_reason,
      reviewed_by = v_host_id,
      reviewed_at = now(),
      updated_at = now()
  where id = p_application_id;

  insert into notifications(user_id, type, title, body, action_id, action_type, redirect_path, entity_type, entity_id, secondary_entity_type, secondary_entity_id, metadata)
  values (
    v_applicant_id,
    'event',
    'Internship application updated',
    'Your application was ' || p_new_status || coalesce(': ' || p_reason, ''),
    v_internship_id::text,
    'internship_application_status',
    '/internships/' || v_internship_id,
    'internship',
    v_internship_id::text,
    'application',
    p_application_id::text,
    jsonb_build_object('status', p_new_status, 'reason', p_reason)
  );
end;
$$;

grant execute on function review_internship_application(uuid, text, text) to authenticated;

-- Event attendee approval lifecycle
alter table events
  add column if not exists requires_approval boolean not null default false;

alter table event_rsvps
  add column if not exists status text not null default 'approved' check (status in ('pending', 'approved', 'rejected', 'cancelled')),
  add column if not exists request_note text not null default '',
  add column if not exists decision_reason text,
  add column if not exists reviewed_by uuid references profiles(id) on delete set null,
  add column if not exists reviewed_at timestamptz,
  add column if not exists updated_at timestamptz not null default now();

create index if not exists idx_event_rsvps_event_status
  on event_rsvps(event_id, status, created_at desc);

drop trigger if exists trg_event_rsvps_updated_at on event_rsvps;
create trigger trg_event_rsvps_updated_at
before update on event_rsvps
for each row execute function set_updated_at();

drop policy if exists "Users can manage own RSVPs" on event_rsvps;
drop policy if exists "RSVPs viewable" on event_rsvps;

create policy "Attendee or host can view rsvps"
on event_rsvps
for select
using (
  auth.uid() = user_id
  or exists (
    select 1 from events e
    where e.id = event_rsvps.event_id
      and e.organizer_id = auth.uid()
  )
);

create policy "Attendee can create own rsvp"
on event_rsvps
for insert
with check (auth.uid() = user_id);

create policy "Host can review attendee request"
on event_rsvps
for update
using (
  exists (
    select 1 from events e
    where e.id = event_rsvps.event_id
      and e.organizer_id = auth.uid()
  )
);

create policy "Attendee can delete own rsvp"
on event_rsvps
for delete
using (auth.uid() = user_id);

create or replace function rsvp_event(p_user_id uuid, p_event_id uuid, p_request_note text default '')
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_requires_approval boolean;
  v_host_id uuid;
  v_existing_status text;
  v_new_status text;
begin
  if auth.uid() is null or auth.uid() <> p_user_id then
    raise exception 'Unauthorized';
  end if;

  select requires_approval, organizer_id
  into v_requires_approval, v_host_id
  from events
  where id = p_event_id;

  if v_host_id is null then
    raise exception 'Event not found';
  end if;
  if v_host_id = p_user_id then
    raise exception 'Host cannot RSVP to own event';
  end if;

  v_new_status := case when v_requires_approval then 'pending' else 'approved' end;

  select status into v_existing_status from event_rsvps where user_id = p_user_id and event_id = p_event_id;

  if v_existing_status is null then
    insert into event_rsvps(user_id, event_id, status, request_note)
    values (p_user_id, p_event_id, v_new_status, coalesce(p_request_note, ''));
    if v_new_status = 'approved' then
      update events set rsvp_count = rsvp_count + 1 where id = p_event_id;
    end if;
  else
    if v_existing_status = 'approved' and v_new_status <> 'approved' then
      update events set rsvp_count = greatest(0, rsvp_count - 1) where id = p_event_id;
    elsif v_existing_status <> 'approved' and v_new_status = 'approved' then
      update events set rsvp_count = rsvp_count + 1 where id = p_event_id;
    end if;
    update event_rsvps
    set status = v_new_status,
        request_note = coalesce(p_request_note, ''),
        decision_reason = null,
        reviewed_by = null,
        reviewed_at = null,
        updated_at = now()
    where user_id = p_user_id and event_id = p_event_id;
  end if;

  insert into notifications(user_id, type, title, body, action_id, action_type, redirect_path, entity_type, entity_id, secondary_entity_type, secondary_entity_id, metadata)
  values (
    v_host_id,
    'event',
    case when v_new_status = 'pending' then 'New attendee request' else 'New event RSVP' end,
    case when v_new_status = 'pending' then 'A student requested to attend your event.' else 'A student RSVP''d to your event.' end,
    p_event_id::text,
    'event_attendee_request',
    '/events/' || p_event_id || '?tab=attendees',
    'event',
    p_event_id::text,
    'attendee',
    p_user_id::text,
    jsonb_build_object('status', v_new_status)
  );
end;
$$;

create or replace function rsvp_event(p_user_id uuid, p_event_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  perform rsvp_event(p_user_id, p_event_id, '');
end;
$$;

create or replace function unrsvp_event(p_user_id uuid, p_event_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_old_status text;
begin
  select status into v_old_status from event_rsvps where user_id = p_user_id and event_id = p_event_id;
  delete from event_rsvps where user_id = p_user_id and event_id = p_event_id;
  if v_old_status = 'approved' then
    update events set rsvp_count = greatest(0, rsvp_count - 1) where id = p_event_id;
  end if;
end;
$$;

grant execute on function rsvp_event(uuid, uuid, text) to authenticated;
grant execute on function rsvp_event(uuid, uuid) to authenticated;
grant execute on function unrsvp_event(uuid, uuid) to authenticated;

create or replace function review_event_attendee(
  p_event_id uuid,
  p_user_id uuid,
  p_decision text,
  p_reason text default null
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_host_id uuid := auth.uid();
  v_old_status text;
begin
  if v_host_id is null then
    raise exception 'Not authenticated';
  end if;
  if p_decision not in ('approved', 'rejected') then
    raise exception 'Invalid decision';
  end if;
  if not exists (select 1 from events e where e.id = p_event_id and e.organizer_id = v_host_id) then
    raise exception 'Unauthorized';
  end if;

  select status into v_old_status from event_rsvps where user_id = p_user_id and event_id = p_event_id;
  if v_old_status is null then
    raise exception 'RSVP request not found';
  end if;

  if v_old_status = 'approved' and p_decision <> 'approved' then
    update events set rsvp_count = greatest(0, rsvp_count - 1) where id = p_event_id;
  elsif v_old_status <> 'approved' and p_decision = 'approved' then
    update events set rsvp_count = rsvp_count + 1 where id = p_event_id;
  end if;

  update event_rsvps
  set status = p_decision,
      decision_reason = p_reason,
      reviewed_by = v_host_id,
      reviewed_at = now(),
      updated_at = now()
  where user_id = p_user_id and event_id = p_event_id;

  insert into notifications(user_id, type, title, body, action_id, action_type, redirect_path, entity_type, entity_id, secondary_entity_type, secondary_entity_id, metadata)
  values (
    p_user_id,
    'event',
    'Event attendance updated',
    'Your request was ' || p_decision || coalesce(': ' || p_reason, ''),
    p_event_id::text,
    'event_attendee_status',
    '/events/' || p_event_id,
    'event',
    p_event_id::text,
    'attendee',
    p_user_id::text,
    jsonb_build_object('status', p_decision, 'reason', p_reason)
  );
end;
$$;

grant execute on function review_event_attendee(uuid, uuid, text, text) to authenticated;

-- Referral attribution lifecycle from signup
alter table profiles
  add column if not exists referred_by_user_id uuid references profiles(id) on delete set null,
  add column if not exists referral_code_used text,
  add column if not exists referral_at timestamptz;

alter table profiles
  add column if not exists avatar_ring_color text not null default '#6366F1';

create table if not exists referral_attributions (
  id uuid primary key default uuid_generate_v4(),
  referrer_user_id uuid not null references profiles(id) on delete cascade,
  referred_user_id uuid not null unique references profiles(id) on delete cascade,
  invite_code text not null,
  status text not null default 'signed_up' check (status in ('signed_up', 'verified', 'activated', 'rewarded', 'rejected')),
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table referral_attributions enable row level security;

drop trigger if exists trg_referral_attributions_updated_at on referral_attributions;
create trigger trg_referral_attributions_updated_at
before update on referral_attributions
for each row execute function set_updated_at();

create policy "Users can view referral records they belong to"
on referral_attributions
for select
using (auth.uid() = referrer_user_id or auth.uid() = referred_user_id);

create policy "Referred user can insert own attribution"
on referral_attributions
for insert
with check (auth.uid() = referred_user_id);

create policy "Referrer can update own attribution records"
on referral_attributions
for update
using (auth.uid() = referrer_user_id);

create or replace function claim_referral(p_invite_code text, p_referred_user_id uuid default auth.uid())
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_referrer_id uuid;
  v_inserted int;
begin
  if p_referred_user_id is null then
    raise exception 'Not authenticated';
  end if;

  select user_id into v_referrer_id from invite_codes where code = p_invite_code;
  if v_referrer_id is null then
    raise exception 'Invalid invite code';
  end if;
  if v_referrer_id = p_referred_user_id then
    raise exception 'Self referral not allowed';
  end if;

  insert into referral_attributions(referrer_user_id, referred_user_id, invite_code, status)
  values (v_referrer_id, p_referred_user_id, p_invite_code, 'signed_up')
  on conflict (referred_user_id) do nothing;

  get diagnostics v_inserted = row_count;

  if v_inserted > 0 then
    update profiles
    set referred_by_user_id = v_referrer_id,
        referral_code_used = p_invite_code,
        referral_at = now()
    where id = p_referred_user_id;

    update invite_codes
    set total_joins = total_joins + 1,
        updated_at = now()
    where user_id = v_referrer_id;

    insert into notifications(user_id, type, title, body, action_id, action_type, redirect_path, entity_type, entity_id, metadata)
    values (
      v_referrer_id,
      'follow',
      'New referral signup',
      'A student joined using your invite code.',
      p_referred_user_id::text,
      'invite',
      '/invite',
      'referral',
      p_referred_user_id::text,
      jsonb_build_object('invite_code', p_invite_code)
    );
  end if;
end;
$$;

grant execute on function claim_referral(text, uuid) to authenticated;

-- ─── NOTES DOWNLOAD + AUTO DELETE MAINTENANCE ────────────────────────────────
create or replace function increment_note_downloads(p_note_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  update notes
  set downloads = downloads + 1
  where id = p_note_id;
end;
$$;

grant execute on function increment_note_downloads(uuid) to authenticated, anon;

create or replace function delete_expired_posts()
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  v_deleted_count integer;
begin
  with deleted as (
    delete from posts
    where auto_delete_at is not null
      and auto_delete_at <= now()
    returning id
  )
  select count(*)::integer into v_deleted_count from deleted;

  return coalesce(v_deleted_count, 0);
end;
$$;

grant execute on function delete_expired_posts() to authenticated, service_role;

insert into storage.buckets (id, name, public)
values ('notes', 'notes', true)
on conflict (id) do nothing;

drop policy if exists "Public can read notes bucket" on storage.objects;
create policy "Public can read notes bucket"
on storage.objects
for select
using (bucket_id = 'notes');

drop policy if exists "Authenticated can upload own notes objects" on storage.objects;
create policy "Authenticated can upload own notes objects"
on storage.objects
for insert
to authenticated
with check (
  bucket_id = 'notes'
  and auth.uid() is not null
  and (storage.foldername(name))[1] = auth.uid()::text
);

drop policy if exists "Owners can update notes objects" on storage.objects;
create policy "Owners can update notes objects"
on storage.objects
for update
to authenticated
using (bucket_id = 'notes' and owner = auth.uid())
with check (bucket_id = 'notes' and owner = auth.uid());

drop policy if exists "Owners can delete notes objects" on storage.objects;
create policy "Owners can delete notes objects"
on storage.objects
for delete
to authenticated
using (bucket_id = 'notes' and owner = auth.uid());

insert into storage.buckets (id, name, public)
values ('verification-documents', 'verification-documents', false)
on conflict (id) do nothing;

drop policy if exists "Users can read own verification documents" on storage.objects;
create policy "Users can read own verification documents"
on storage.objects
for select
to authenticated
using (
  bucket_id = 'verification-documents'
  and (storage.foldername(name))[1] = auth.uid()::text
);

drop policy if exists "Users can upload own verification documents" on storage.objects;
create policy "Users can upload own verification documents"
on storage.objects
for insert
to authenticated
with check (
  bucket_id = 'verification-documents'
  and auth.uid() is not null
  and (storage.foldername(name))[1] = auth.uid()::text
);

drop policy if exists "Users can update own verification documents" on storage.objects;
create policy "Users can update own verification documents"
on storage.objects
for update
to authenticated
using (
  bucket_id = 'verification-documents'
  and owner = auth.uid()
)
with check (
  bucket_id = 'verification-documents'
  and owner = auth.uid()
);

drop policy if exists "Users can delete own verification documents" on storage.objects;
create policy "Users can delete own verification documents"
on storage.objects
for delete
to authenticated
using (
  bucket_id = 'verification-documents'
  and owner = auth.uid()
);

do $$
begin
  if exists (select 1 from pg_namespace where nspname = 'cron') then
    if not exists (
      select 1
      from cron.job
      where jobname = 'delete-expired-posts-every-5-min'
    ) then
      perform cron.schedule(
        'delete-expired-posts-every-5-min',
        '*/5 * * * *',
        $$select public.delete_expired_posts();$$
      );
    end if;
  end if;
exception
  when others then
    raise notice 'Skipping cron schedule setup: %', sqlerrm;
end;
$$;
