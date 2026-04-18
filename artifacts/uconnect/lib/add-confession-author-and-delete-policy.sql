alter table confessions
  add column if not exists author_id uuid references profiles(id) on delete set null;

update confessions
set author_id = null
where author_id is null;

drop policy if exists "Authenticated users can confess" on confessions;
create policy "Authenticated users can confess" on confessions
for insert
with check (auth.role() = 'authenticated' and auth.uid() = author_id);

create policy "Users can delete own confessions" on confessions
for delete
using (auth.uid() = author_id);

create index if not exists idx_confessions_author_id_created_at on confessions(author_id, created_at desc);
