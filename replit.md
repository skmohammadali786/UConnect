# Workspace

## Overview

pnpm workspace monorepo with UConnect — a React Native Expo mobile app for private college-only anonymous social media.

## Stack

- **Monorepo tool**: pnpm workspaces
- **Package manager**: pnpm
- **Mobile**: React Native (Expo) — `artifacts/uconnect`
- **Backend**: Supabase (PostgreSQL + Auth + RLS) — Project `lyrntcjjcigvsueyszom`
- **Styling**: Dark mode (#0A0A0A bg, #00A86B emerald primary), Inter font
- **State**: React Context + Supabase (AsyncStorage only for theme/rate-limiting/demo)
- **Navigation**: expo-router (file-based)

## Supabase Migration (Completed)

- **URL**: `https://lyrntcjjcigvsueyszom.supabase.co`
- **Schema**: `artifacts/uconnect/lib/schema.sql` — run once in Supabase SQL Editor
- **Client**: `artifacts/uconnect/lib/supabase.ts`
- **Auth**: Real OTP via `supabase.auth.signInWithOtp` + `verifyOtp`
- **Demo user**: `id: "demo_user_001"` — bypasses Supabase, uses AsyncStorage only
- **Pattern**: Optimistic updates + fire-and-forget Supabase calls; sample data shown on empty DB

### Tables
`profiles`, `user_settings`, `posts`, `post_votes`, `bookmarks`, `comments`, `comment_votes`, `drafts`, `following`, `reports`, `confessions`, `confession_votes`, `confession_comments`, `conversations`, `messages`, `notifications`, `teams`, `team_requests`, `events`, `event_rsvps`, `internships`, `internship_applications`, `notes`, `note_saves`

### Stored RPCs
`vote_post`, `vote_confession`, `increment_comment_count`, `increment_confession_comment_count`, `follow_user`, `unfollow_user`, `rsvp_event`, `unrsvp_event`

## UConnect App (artifacts/uconnect)

### Contexts (all Supabase-backed)
- `AuthContext` — real OTP auth, demo login, profile upsert; `sendOtp`/`verifyOtp` methods
- `PostsContext` — posts/votes/bookmarks/drafts via Supabase; sample data fallback; exposes `isLoading`
- `ConfessionsContext` — anonymous confessions with comments + votes via Supabase
- `ChatContext` — conversations/messages via Supabase
- `NotificationsContext` — notifications via Supabase
- `SettingsContext` — `user_settings` table; AsyncStorage as local backup
- `SocialContext` — follow/unfollow via `follow_user`/`unfollow_user` RPCs
- `TeamsContext` — teams + `team_requests` via Supabase

### Auth Flow
- Welcome screen → login (email) → OTP → college-select → username → profile-setup → interests → main app
- "Explore Demo" button on welcome screen for instant access
- Auth gate in `_layout.tsx` redirects unauthenticated users to `/auth/welcome`
- College-select supports "Other" with custom text input

### Components
- `ConfirmModal.tsx` — branded confirmation dialog (danger/warning/info variants), animated scale+opacity entrance
- `PostCard.tsx` — animated press, vote pulse, bookmark animations, report modal
- `FadeInView.tsx` — fade + slide-in entrance
- `AppButton.tsx` — spring scale animations
- `Toast.tsx` — success/error/info toasts
- `ReportModal.tsx` — report post modal
- `CommentItem.tsx` — comment with reply/vote

### Feature Screens
- **Home feed** — FlatList with Trending/Latest/Following filters + shortcut icons
- **Post detail** — comments, anonymous reply toggle
- **Create post** — anonymous toggle, tag selector, draft save/load/delete, char counter
- **Confessions** — anonymous feed, sensitive content reveal (per-item + global), comment navigation
- **Confession detail** — full comments with anonymous/named posting
- **Internships** — filter by type, apply with confirmation modal (non-reversible), full detail page
- **Events** — RSVP system
- **Teams** — admin approval workflow
- **Notes** — save/upload
- **Profile** — tabs (posts/saved/activity), settings shortcut pill instead of inline sign-out
- **Settings** — theme (dark/light/system), all preferences as toggles, Delete Account with ConfirmModal, Sign Out with ConfirmModal
- **User profile** — follow/unfollow with animation, fade-in entrance

### AsyncStorage Keys (remaining intentional uses)
- `@uconnect_demo_user` — demo user data (bypasses Supabase)
- `@uconnect_theme` — theme preference (NOT cleared on logout, dark/light/system)
- `@uconnect_settings` — fallback for settings when Supabase unavailable
- `@rl_*` — rate limit state (OTP send/verify, post creation)

### Env Vars
- `EXPO_PUBLIC_SUPABASE_URL` — Supabase project URL
- `EXPO_PUBLIC_SUPABASE_ANON_KEY` — Supabase anon key (secret)

### Android APK Build (E2E testing)
- `artifacts/uconnect/app.json` now includes Android package metadata required for builds.
- `artifacts/uconnect/eas.json` includes:
  - `preview` profile → internal distribution APK
  - `production` profile → Android App Bundle (AAB)
- Build commands from repo root:
  - `cd artifacts/uconnect && pnpm run build:apk` (generates installable APK with EAS)
  - `cd artifacts/uconnect && pnpm run build:aab` (generates production AAB)
- First-time setup:
  - Sign in to Expo before building: `pnpm dlx eas-cli@latest login`
  - Ensure `EXPO_PUBLIC_SUPABASE_URL` and `EXPO_PUBLIC_SUPABASE_ANON_KEY` are set for runtime API access during E2E testing.

### Animation Pattern
- **Always** use `const ND = Platform.OS !== "web"` for `useNativeDriver`
- Applies to ALL screens — PostCard, AppButton, FadeInView, settings, confessions, etc.
- Staggered list animations on all feature screens (index * delay)
- Spring-based follow/vote/bookmark button pulses

### Toast System
- `useToast()` hook — `showSuccess`, `showError`, `showInfo`, `showToast`
