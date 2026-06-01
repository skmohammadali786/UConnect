-- Supabase Realtime optimization support indexes.
-- These indexes target filtered realtime predicates, focus refetches, and common
-- per-user/per-screen queries added by the realtime optimization pass.

-- Chat: current-user conversation streams and current-conversation message stream.
create index if not exists idx_conversations_user_a_last_message_at
  on conversations(user_a, last_message_at desc);
create index if not exists idx_conversations_user_b_last_message_at
  on conversations(user_b, last_message_at desc);
create index if not exists idx_messages_conversation_created_at
  on messages(conversation_id, created_at asc);
create index if not exists idx_messages_conversation_unread_by_sender
  on messages(conversation_id, sender_id, is_read);

-- Notifications: user-scoped realtime and recovery fetches.
create index if not exists idx_notifications_user_created_at
  on notifications(user_id, created_at desc);
create index if not exists idx_notifications_user_unread_created_at
  on notifications(user_id, is_read, created_at desc);

-- Teams: visible-screen refreshes, membership lookups, and request review queues.
create index if not exists idx_teams_created_at
  on teams(created_at desc);
create index if not exists idx_team_requests_team_status_requested_at
  on team_requests(team_id, status, requested_at desc);
create index if not exists idx_team_requests_user_status_requested_at
  on team_requests(user_id, status, requested_at desc);
create index if not exists idx_team_members_user_team
  on team_members(user_id, team_id);

-- Team detail: strict filtered realtime predicates and feed sorting.
create index if not exists idx_team_poll_votes_poll_user
  on team_poll_votes(poll_id, user_id);
create index if not exists idx_team_task_items_list_completed
  on team_task_items(task_list_id, is_completed, created_at desc);

-- Ghost Mode: foreground/polling refreshes and server-side active session RPCs.
create index if not exists idx_ghost_sessions_user_active_expires_at
  on ghost_sessions(user_id, is_active, expires_at desc);
create index if not exists idx_ghost_sessions_active_expires_at
  on ghost_sessions(is_active, expires_at desc);

-- Vault: fetch-on-focus/cache-backed summaries and detail screens.
create index if not exists idx_vault_alerts_created_at
  on vault_alerts(created_at desc);
create index if not exists idx_vault_debates_created_at
  on vault_debates(created_at desc);
create index if not exists idx_vault_nominations_nominee_created_at
  on vault_nominations(nominee_id, created_at desc);
create index if not exists idx_vault_legend_badges_user_awarded_at
  on vault_legend_badges(user_id, awarded_at desc);
create index if not exists idx_vault_scores_user_updated_at
  on vault_scores(user_id, updated_at desc);
create index if not exists idx_vault_wiki_articles_created_at
  on vault_wiki_articles(created_at desc);

-- Focus-refetched feature areas.
create index if not exists idx_events_date_created_at
  on events(date, created_at desc);
create index if not exists idx_event_rsvps_user_event
  on event_rsvps(user_id, event_id);
create index if not exists idx_notes_college_subject_created_at
  on notes(college, subject, created_at desc);
create index if not exists idx_note_saves_user_created_at
  on note_saves(user_id, created_at desc);
create index if not exists idx_internships_created_at
  on internships(created_at desc);
create index if not exists idx_internship_applications_user_created_at
  on internship_applications(user_id, created_at desc);
create index if not exists idx_posts_author_created_at
  on posts(author_id, created_at desc);
create index if not exists idx_posts_created_at
  on posts(created_at desc);
create index if not exists idx_comments_post_created_at
  on comments(post_id, created_at asc);
create index if not exists idx_confession_comments_confession_created_at
  on confession_comments(confession_id, created_at asc);
