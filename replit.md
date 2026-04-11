# Workspace

## Overview

pnpm workspace monorepo with UConnect — a React Native Expo mobile app for private college-only anonymous social media.

## Stack

- **Monorepo tool**: pnpm workspaces
- **Package manager**: pnpm
- **Mobile**: React Native (Expo) — `artifacts/uconnect`
- **Styling**: Dark mode (#0A0A0A bg, #00A86B emerald primary), Inter font
- **State**: React Context + AsyncStorage (no backend)
- **Navigation**: expo-router (file-based)

## UConnect App (artifacts/uconnect)

### Contexts
- `AuthContext` — user auth, demo login, logout, deleteAccount; `@uconnect_user` storage
- `PostsContext` — create/vote/bookmark/delete posts, drafts; `@uconnect_posts`, `@uconnect_drafts` storage. **Fixed: functional updater pattern to prevent stale closure bug**
- `ConfessionsContext` — anonymous confessions with comments; `@uconnect_confessions` storage. **Fixed: functional updater prevents stale closure**
- `ChatContext` — chat threads
- `NotificationsContext` — notifications
- `SettingsContext` — push notifications, anonymous mode, sensitive content, compact mode; `@uconnect_settings` storage
- `SocialContext` — follow/unfollow, reports; `@uconnect_following`, `@uconnect_reports` storage
- `TeamsContext` — teams with join requests; `@uconnect_teams` storage

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

### AsyncStorage Keys
- `@uconnect_user`, `@uconnect_posts`, `@uconnect_drafts`, `@uconnect_confessions`
- `@uconnect_settings`, `@uconnect_applied_internships`, `@uconnect_saved_notes`
- `@uconnect_rsvp_events`, `@uconnect_requested_teams`, `@uconnect_following`
- `@uconnect_reports`, `@uconnect_theme`, `@uconnect_teams`

### Animation Pattern
- **Always** use `const ND = Platform.OS !== "web"` for `useNativeDriver`
- Applies to ALL screens — PostCard, AppButton, FadeInView, settings, confessions, etc.
- Staggered list animations on all feature screens (index * delay)
- Spring-based follow/vote/bookmark button pulses

### Toast System
- `useToast()` hook — `showSuccess`, `showError`, `showInfo`, `showToast`
