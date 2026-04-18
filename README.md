# UConnect Monorepo

A pnpm workspace monorepo for the UConnect platform, containing:

- **Expo React Native app** (`artifacts/uconnect`)
- **Express API server** (`artifacts/api-server`)
- **Shared API and DB libraries** (`lib/*`)
- **Design sandbox app** (`artifacts/mockup-sandbox`)
- **Workspace utilities/scripts** (`scripts`)

---

## Table of Contents

1. [What this repository contains](#what-this-repository-contains)
2. [Tech stack](#tech-stack)
3. [Repository structure](#repository-structure)
4. [Prerequisites](#prerequisites)
5. [Quick start (A-Z)](#quick-start-a-z)
6. [Environment variables](#environment-variables)
7. [Workspace commands](#workspace-commands)
8. [How the API contracts are generated](#how-the-api-contracts-are-generated)
9. [Database setup and schema workflow](#database-setup-and-schema-workflow)
10. [Mobile app build and static deployment](#mobile-app-build-and-static-deployment)
11. [CI workflows](#ci-workflows)
12. [Troubleshooting](#troubleshooting)
13. [Security and dependency policy](#security-and-dependency-policy)

---

## What this repository contains

UConnect is organized as a **single workspace** where product artifacts and shared libraries evolve together.

- The mobile app and backend server live under `artifacts/`.
- Shared packages (DB layer, generated API clients/schemas, API spec) live under `lib/`.
- The root package coordinates type-checking and builds across all projects.

---

## Tech stack

- **Package manager:** pnpm `9.15.0`
- **Language:** TypeScript
- **Mobile app:** Expo + React Native + Expo Router
- **Backend:** Express 5 + pino + esbuild bundling
- **Database layer:** Drizzle ORM + PostgreSQL
- **API contract tooling:** OpenAPI + Orval (React Query + Zod generation)
- **Sandbox web app:** Vite + React

---

## Repository structure

```text
UConnect/
├── artifacts/
│   ├── uconnect/           # Main Expo mobile app + static export tooling
│   ├── api-server/         # Express API server
│   └── mockup-sandbox/     # UI sandbox app (Vite)
├── lib/
│   ├── api-spec/           # OpenAPI source + Orval config
│   ├── api-client-react/   # Generated React Query client
│   ├── api-zod/            # Generated Zod schemas
│   └── db/                 # Drizzle DB config + schema exports
├── scripts/                # Workspace utility scripts
├── pnpm-workspace.yaml     # Workspace + package catalog + supply-chain policy
└── package.json            # Root orchestration scripts
```

---

## Prerequisites

- **Node.js 20+** (matches workflow config)
- **corepack** enabled (to activate pnpm version)
- **pnpm 9.15.0**

Suggested setup:

```bash
corepack enable
corepack prepare pnpm@9.15.0 --activate
```

---

## Quick start (A-Z)

### A) Clone and enter

```bash
git clone <your-fork-or-repo-url>
cd UConnect
```

### B) Activate pnpm and install

```bash
corepack enable
corepack prepare pnpm@9.15.0 --activate
pnpm install --frozen-lockfile
```

### C) Configure environment variables

Create local env files where needed (see [Environment variables](#environment-variables)).

### D) Validate workspace health

```bash
pnpm run typecheck
pnpm run build
```

### E) Run the app(s)

#### Mobile app (Expo)

```bash
pnpm --filter @workspace/uconnect run dev
```

#### API server

```bash
PORT=3001 DATABASE_URL=<postgres-url> pnpm --filter @workspace/api-server run dev
```

#### Sandbox web app

```bash
pnpm --filter @workspace/mockup-sandbox run dev
```

---

## Environment variables

### Root/shared

- `DATABASE_URL` (required for `lib/db` and backend runtime)

### `artifacts/uconnect`

From `.env.example`:

- `EXPO_PUBLIC_SUPABASE_URL` (required)
- `EXPO_PUBLIC_SUPABASE_ANON_KEY` (required)

Optional for static build/deploy scripts:

- `APP_DOMAIN` (preferred deployment domain for static build output)
- `EXPO_PUBLIC_DOMAIN` (fallback deployment domain)
- `BASE_PATH` (optional base path prefix)
- `PORT` (used by static serve script; default `3000`)

### `artifacts/api-server`

- `PORT` (required; server throws if missing)
- `DATABASE_URL` (required by `@workspace/db`)

---

## Workspace commands

### Root

```bash
pnpm run typecheck:libs   # tsc build for shared projects
pnpm run typecheck        # typecheck shared + artifacts + scripts
pnpm run build            # typecheck + package builds
```

### Mobile app (`@workspace/uconnect`)

```bash
pnpm --filter @workspace/uconnect run dev
pnpm --filter @workspace/uconnect run build      # static Expo build pipeline
pnpm --filter @workspace/uconnect run serve      # serve static build artifacts
pnpm --filter @workspace/uconnect run typecheck
pnpm --filter @workspace/uconnect run build:apk
pnpm --filter @workspace/uconnect run build:aab
pnpm --filter @workspace/uconnect run build:ios:internal
pnpm --filter @workspace/uconnect run build:ios:preview
pnpm --filter @workspace/uconnect run build:ios:production
```

### API server (`@workspace/api-server`)

```bash
pnpm --filter @workspace/api-server run dev
pnpm --filter @workspace/api-server run build
pnpm --filter @workspace/api-server run start
pnpm --filter @workspace/api-server run typecheck
```

Current route surface includes:

- `GET /api/healthz` → `{ status: "ok" }`

### Sandbox app (`@workspace/mockup-sandbox`)

```bash
pnpm --filter @workspace/mockup-sandbox run dev
pnpm --filter @workspace/mockup-sandbox run build
pnpm --filter @workspace/mockup-sandbox run preview
pnpm --filter @workspace/mockup-sandbox run typecheck
```

### DB package (`@workspace/db`)

```bash
DATABASE_URL=<postgres-url> pnpm --filter @workspace/db run push
DATABASE_URL=<postgres-url> pnpm --filter @workspace/db run push-force
```

### API spec package (`@workspace/api-spec`)

```bash
pnpm --filter @workspace/api-spec run codegen
```

### Utility scripts package (`@workspace/scripts`)

```bash
pnpm --filter @workspace/scripts run hello
pnpm --filter @workspace/scripts run typecheck
```

---

## How the API contracts are generated

1. Source spec lives in `lib/api-spec/openapi.yaml`.
2. Run `pnpm --filter @workspace/api-spec run codegen`.
3. Orval generates:
   - React Query client in `lib/api-client-react/src/generated`
   - Zod schemas/types in `lib/api-zod/src/generated`
4. Consumers import from package entrypoints:
   - `@workspace/api-client-react`
   - `@workspace/api-zod`

Important: The OpenAPI title is intentionally set to `Api` and is used by generation assumptions.

---

## Database setup and schema workflow

- Drizzle config: `lib/db/drizzle.config.ts`
- DB entrypoint: `lib/db/src/index.ts`
- Schema exports: `lib/db/src/schema/index.ts`

Workflow:

1. Provision PostgreSQL and export `DATABASE_URL`.
2. Define/extend schema in `lib/db/src/schema/*`.
3. Export schema members from `lib/db/src/schema/index.ts`.
4. Push schema updates:
   - `pnpm --filter @workspace/db run push`

There is also `scripts/post-merge.sh` which installs dependencies and runs DB push after merges.

---

## Mobile app build and static deployment

The app includes a custom static Expo Go deployment pipeline:

- Build script: `artifacts/uconnect/scripts/build.js`
- Serve script: `artifacts/uconnect/server/serve.js`
- Output folder: `artifacts/uconnect/static-build/`

Typical flow:

1. `pnpm --filter @workspace/uconnect run build`
2. `pnpm --filter @workspace/uconnect run serve`
3. Deploy/host the generated static output and manifests

The build script can derive deployment host from `APP_DOMAIN` or `EXPO_PUBLIC_DOMAIN`.

---

## CI workflows

### `.github/workflows/build.yml`

- Manual trigger (`workflow_dispatch`)
- Installs pnpm + Node 20
- Runs EAS Android preview build in `artifacts/uconnect`
- Uses secrets:
  - `EXPO_TOKEN`
  - `EXPO_PUBLIC_SUPABASE_ANON_KEY`

### `.github/workflows/build-apk.yml`

- Also manual trigger
- Similar APK build path under `artifacts/uconnect`

---

## Troubleshooting

### `pnpm: command not found`

```bash
corepack enable
corepack prepare pnpm@9.15.0 --activate
```

### API server exits on startup

Ensure these are set:

- `PORT`
- `DATABASE_URL`

### Expo static build warns about deployment domain

Set either:

- `APP_DOMAIN`
- `EXPO_PUBLIC_DOMAIN`

### Drizzle push fails

- Verify PostgreSQL is reachable
- Verify `DATABASE_URL` is valid

### Dependency install blocked by release-age policy

The workspace enforces a minimum package release age for supply-chain safety (see `pnpm-workspace.yaml`).

---

## Security and dependency policy

- Workspace enforces pnpm usage at install time (`preinstall` guard).
- `pnpm-workspace.yaml` includes:
  - `minimumReleaseAge: 1440` (1440 minutes (24 hours))
  - controlled allowlist support (`minimumReleaseAgeExclude`)
  - curated dependency overrides for platform pruning and security updates

Do not disable these policies unless there is a vetted security/process reason.

---

## Notes for contributors

- Prefer workspace-filtered commands (`pnpm --filter ...`) for scoped changes.
- Keep API spec, generated clients, and runtime API behavior in sync.
- Keep DB schema exports explicit and typed.
- Validate with `pnpm run typecheck && pnpm run build` before opening/merging PRs.
