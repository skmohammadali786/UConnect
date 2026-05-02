-- Add date of birth support
alter table if exists profiles
  add column if not exists date_of_birth date;
