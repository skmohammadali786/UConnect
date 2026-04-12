-- Run this in your Supabase SQL Editor to enable full account deletion
-- This RPC deletes all user data AND the auth account in one call

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

  -- Delete profile row — all 24 tables cascade automatically
  delete from profiles where id = calling_user_id;

  -- Delete the Supabase auth user record (requires security definer)
  delete from auth.users where id = calling_user_id;
end;
$$;

-- Grant execute permission to authenticated users
grant execute on function delete_account() to authenticated;
