-- Add profile banner support
alter table if exists profiles
  add column if not exists banner text;
