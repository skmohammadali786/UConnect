-- Run this in the Supabase SQL Editor to add phone support
-- Go to: https://supabase.com/dashboard/project/lyrntcjjcigvsueyszom/sql/new

alter table profiles add column if not exists phone text not null default '';
