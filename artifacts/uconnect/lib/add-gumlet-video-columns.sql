alter table public.posts
  add column if not exists video_asset_id text,
  add column if not exists video_provider text not null default 'r2',
  add column if not exists video_status text;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'posts_video_provider_check'
  ) then
    alter table public.posts
      add constraint posts_video_provider_check
      check (video_provider in ('r2', 'gumlet'));
  end if;
end $$;

create index if not exists posts_video_provider_idx on public.posts(video_provider);
create index if not exists posts_video_asset_id_idx on public.posts(video_asset_id);
