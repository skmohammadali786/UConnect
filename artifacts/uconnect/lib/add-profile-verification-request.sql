-- Profile verification feature migration
-- Run in Supabase SQL editor

create extension if not exists "uuid-ossp";

create table if not exists public.profile_verification_requests (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid not null unique references public.profiles(id) on delete cascade,
  college_id_url text not null,
  photo_id_url text not null,
  status text not null default 'pending' check (status in ('pending', 'approved', 'rejected')),
  rejection_reason text,
  submitted_at timestamptz not null default now(),
  reviewed_at timestamptz,
  reviewed_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_profile_verification_requests_status
  on public.profile_verification_requests(status, submitted_at desc);

alter table public.profile_verification_requests enable row level security;

drop policy if exists "Users can view own verification request" on public.profile_verification_requests;
create policy "Users can view own verification request"
on public.profile_verification_requests
for select
using (auth.uid() = user_id);

drop policy if exists "Users can create own verification request" on public.profile_verification_requests;
create policy "Users can create own verification request"
on public.profile_verification_requests
for insert
with check (auth.uid() = user_id);

drop policy if exists "Users can resubmit own verification request" on public.profile_verification_requests;
create policy "Users can resubmit own verification request"
on public.profile_verification_requests
for update
using (auth.uid() = user_id)
with check (auth.uid() = user_id and status = 'pending');

create or replace function public.set_timestamp_profile_verification_requests()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists trg_profile_verification_requests_updated_at on public.profile_verification_requests;
create trigger trg_profile_verification_requests_updated_at
before update on public.profile_verification_requests
for each row execute procedure public.set_timestamp_profile_verification_requests();

create or replace function public.sync_profile_verified_flag()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.status = 'approved' then
    update public.profiles set is_verified = true where id = new.user_id;
  elsif new.status = 'rejected' then
    update public.profiles set is_verified = false where id = new.user_id;
  end if;
  return new;
end;
$$;

drop trigger if exists trg_sync_profile_verified_flag on public.profile_verification_requests;
create trigger trg_sync_profile_verified_flag
after insert or update of status on public.profile_verification_requests
for each row execute procedure public.sync_profile_verified_flag();

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
using (bucket_id = 'verification-documents' and owner = auth.uid())
with check (bucket_id = 'verification-documents' and owner = auth.uid());

drop policy if exists "Users can delete own verification documents" on storage.objects;
create policy "Users can delete own verification documents"
on storage.objects
for delete
to authenticated
using (bucket_id = 'verification-documents' and owner = auth.uid());
