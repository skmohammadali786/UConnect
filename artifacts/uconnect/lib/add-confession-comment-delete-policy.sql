drop policy if exists "Authors can delete own confession comments" on confession_comments;

create policy "Authors can delete own confession comments" on confession_comments
for delete
using (auth.uid() = author_id);
