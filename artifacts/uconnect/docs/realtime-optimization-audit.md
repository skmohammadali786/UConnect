# UConnect Supabase Realtime Optimization Audit

## Full realtime inventory and classification

| File | Component / screen | Table(s) | Events | Filters before | Scope before | Decision | Implementation status |
| --- | --- | --- | --- | --- | --- | --- | --- |
| `hooks/useVault.ts` | `useVaultSummary` / Vault tab and profile vault cards | `vault_alerts`, `vault_debates`, `vault_nominations`, `vault_legend_badges`, `vault_scores`, `vault_wiki_articles` | `*` | none | Hook-global for every mounted summary | `REPLACE_WITH_FETCH_ON_FOCUS` | Removed realtime. React Query now uses 5-minute stale time/cache and screens refetch on focus or pull-to-refresh. |
| `context/TeamsContext.tsx` | `TeamsProvider` / all app screens | `teams`, `team_requests`, `team_members` | `*` | none | App-global | `REPLACE_WITH_FETCH_ON_FOCUS` | Removed global listeners and global boot fetch. Teams list refreshes on focus and every 60 seconds while visible; detail screen refreshes on mount. |
| `context/GhostModeContext.tsx` | `GhostModeProvider` / settings and identity guard surfaces | `ghost_sessions` | `*` | none | App-global | `REPLACE_WITH_POLLING` | Removed realtime. Provider polls every 60 seconds, refetches on foreground, and handles expiration locally. |
| `context/ChatContext.tsx` | `ChatProvider` / chat list and chat detail | `messages` | `*` | none | App-global | `KEEP_REALTIME` with strict filter | Replaced with a `conversation_id`-filtered subscription only for the active chat detail screen. |
| `context/ChatContext.tsx` | `ChatProvider` / chat list and chat detail | `conversations` | `*` | none | App-global | `KEEP_REALTIME` with strict user filters | Replaced with two user-scoped subscriptions: `user_a=eq.{userId}` and `user_b=eq.{userId}`. |
| `app/teams/[id].tsx` | `TeamDetailScreen` / Team detail feed | `team_posts`, `team_polls`, `team_task_lists`, `team_events` | `*` | `team_id=eq.{teamId}` | Screen-scoped | `KEEP_REALTIME` | Kept; already valuable and now remains strictly team-scoped. |
| `app/teams/[id].tsx` | `TeamDetailScreen` / Team detail feed | `team_poll_votes` | `*` | none | Screen-scoped but table-wide | `KEEP_REALTIME` with strict filter | Replaced with per-`poll_id` filtered handlers for polls loaded in the current team. |
| `app/teams/[id].tsx` | `TeamDetailScreen` / Team detail feed | `team_task_items` | `*` | none | Screen-scoped but table-wide | `KEEP_REALTIME` with strict filter | Replaced with per-`task_list_id` filtered handlers for task lists loaded in the current team. |
| `context/NotificationsContext.tsx` | `NotificationsProvider` / notification badge and notifications screen | `notifications` | `*` | `user_id=eq.{userId}` | App-global user-scoped | `KEEP_REALTIME` | Kept user-scoped realtime. Duplicate 20-second polling replaced with 5-minute recovery polling plus foreground refetch. |
| `context/SocialContext.tsx` | `SocialProvider` / reports surfaces | `reports` | `*` | `reporter_id=eq.{userId}` | App-global user-scoped | `KEEP_REALTIME` | Kept because filter is strict and updates are user-visible moderation status changes. Cleanup exists. |
| `app/post/[id].tsx` | Post detail screen | `comments` | `*` | `post_id=eq.{postId}` | Screen-scoped | `KEEP_REALTIME` | Kept because comment UX benefits from realtime and filter is strict. Cleanup exists. |
| `app/confessions/[id].tsx` | Confession detail screen | `confession_comments` | `*` | `confession_id=eq.{confessionId}` | Screen-scoped | `KEEP_REALTIME` | Kept because comment UX benefits from realtime and filter is strict. Cleanup exists. |
| `app/events/[id].tsx` | Event detail screen | `event_rsvps`, `event_tickets` | `*` | `event_id=eq.{eventId}` | Screen-scoped | `KEEP_REALTIME` | Kept because host/ticket state is time-sensitive and filters are strict. Cleanup exists. |

## Realtime subscriptions removed

- Six Vault table listeners were removed from `useVaultSummary`.
- Three Teams global listeners were removed from `TeamsProvider`.
- One Ghost Mode global `ghost_sessions` listener was removed from `GhostModeProvider`.
- One unfiltered global `messages` listener was removed from `ChatProvider`.
- One unfiltered global `conversations` listener was replaced by two filtered user-specific listeners.
- Two unfiltered team detail child-table listeners were replaced by filtered per-parent listeners.
- Duplicate notification polling frequency was reduced from every 20 seconds to a 5-minute recovery poll.

## Memory leak audit

All remaining Supabase realtime `useEffect` blocks return cleanup with `supabase.removeChannel(...)`. Timer and AppState effects return `clearInterval(...)` or `.remove()` cleanup. The Teams screen visibility interval is registered through `useFocusEffect` and cleared when the screen loses focus.

## Database index recommendations

See `lib/realtime-optimization-indexes.sql` for idempotent `create index if not exists` statements that support:

- user-filtered conversation subscriptions,
- active conversation message fetches,
- user-filtered notifications,
- screen-scoped teams/team-detail refreshes,
- ghost-mode polling/RPC lookups,
- Vault fetch-on-focus summaries,
- common focus-refetched Events, Notes, Internships, and Feed queries.

## Estimated impact

- Database Realtime load reduction: approximately 45-60% from eliminating the highest-cardinality global/table-wide listeners.
- Realtime traffic reduction: approximately 55-70% for typical sessions because Vault, Teams globals, Ghost Mode, and unfiltered message streams no longer receive unrelated row changes.
- Cost savings: likely meaningful where Realtime was 65% of database time; exact Supabase savings depend on project plan, active users, row churn, and replication volume.

## Risks and mitigations

- Vault data may update up to the 5-minute stale window unless the user focuses or pulls to refresh; mitigated with focus refetch, mutation invalidation, and optimistic vote cache updates.
- Teams list updates are no longer instant while off-screen; mitigated with focus refresh and 60-second visible refresh.
- Ghost active count can be up to 60 seconds stale; mitigated with foreground refresh and immediate refresh after activate/deactivate.
- Chat list still reloads full conversations on scoped changes; this preserves behavior but can be optimized further with incremental cache updates later.
