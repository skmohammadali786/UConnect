-- Add one optional public social media link to user profiles.
alter table if exists profiles
  add column if not exists social_link text not null default '';
