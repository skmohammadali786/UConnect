alter table confessions
  add column if not exists author_id uuid;

alter table confessions
  drop constraint if exists confessions_author_id_fkey;

alter table confessions
  add constraint confessions_author_id_fkey
  foreign key (author_id) references profiles(id) on delete cascade;

alter table confessions
  alter column author_id set default auth.uid();

drop policy if exists "Authenticated users can confess" on confessions;
create policy "Authenticated users can confess" on confessions
for insert
with check (auth.role() = 'authenticated' and auth.uid() = author_id);

create policy "Users can delete own confessions" on confessions
for delete
using (auth.uid() = author_id);

create index if not exists idx_confessions_author_id_created_at on confessions(author_id, created_at desc);
