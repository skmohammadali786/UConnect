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
- `AuthContext` — user auth, demo login, logout; `@uconnect_user` storage
- `PostsContext` — create/vote/bookmark posts; `@uconnect_posts` storage
- `ChatContext` — chat threads
- `NotificationsContext` — notifications
- `SettingsContext` — push notifications, anonymous mode, etc; `@uconnect_settings` storage
- `ConfessionsContext` — anonymous confessions; `@uconnect_confessions` storage

### Auth Flow
- Welcome screen → login (email) → OTP → college-select → username → profile-setup → interests → main app
- "Explore Demo" button on welcome screen for instant access
- Auth gate in `_layout.tsx` redirects unauthenticated users to `/auth/welcome`

### Features with Tracking (AsyncStorage)
- Internships: apply/unapply — `@uconnect_applied_internships`
- Notes: save/unsave — `@uconnect_saved_notes`
- Events: RSVP/cancel — `@uconnect_rsvp_events`
- Teams: request/cancel — `@uconnect_requested_teams`

### Toast System
- `Toast.tsx` — unified toast component (success/error/info/warning variants)
- `useToast()` hook — `showSuccess`, `showError`, `showInfo`, `showToast`
- Used across: post creation, profile save, settings toggles, confessions, apply/RSVP

### Animations
- `FadeInView.tsx` — fade + slide-in entrance animations
- `PostCard.tsx` — scale on press, vote pulse animations
- `AppButton.tsx` — spring scale press animations
- All feature list screens (internships, notes, events, teams, confessions) — staggered item animations
