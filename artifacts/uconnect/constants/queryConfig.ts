export const QUERY_STALE_TIMES = {
  profiles: 30 * 60 * 1000,
  vault: 5 * 60 * 1000,
  events: 5 * 60 * 1000,
  notes: 10 * 60 * 1000,
  internships: 5 * 60 * 1000,
  feed: 60 * 1000,
} as const;

export const QUERY_CACHE_TIMES = {
  profiles: 60 * 60 * 1000,
  vault: 15 * 60 * 1000,
  events: 15 * 60 * 1000,
  notes: 20 * 60 * 1000,
  internships: 15 * 60 * 1000,
  feed: 5 * 60 * 1000,
} as const;
