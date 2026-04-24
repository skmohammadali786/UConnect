-- Add customizable profile-photo ring color
alter table if exists profiles
  add column if not exists avatar_ring_color text not null default '#6366F1';
