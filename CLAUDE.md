# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) and other AI agents when working in this repository.

## Project Overview

bind is a TODO: describe the project. It's a Turborepo monorepo using Bun as the runtime and package manager.

## Commands

```bash
# Development
bun dev                          # Full stack (API + web + SDK watcher)
bun --filter web dev             # Web app only
bun --filter @bind/api dev       # API only

# Quality checks
bun check                        # Lint + typecheck + format check (run before committing)
bun lint                         # Oxlint + typecheck
bun typecheck                    # TypeScript only
bun format                       # Prettier format
bun fmt                          # format + lint --fix + typecheck

# Testing
bun api:test:e2e                 # API integration tests (Eden Treaty)
bun ui:test:e2e                  # UI E2E tests (Playwright)

# Database
bun --filter @bind/api db:generate  # Generate migration from schema changes
bun --filter @bind/api db:migrate   # Apply migrations
bun --filter @bind/api db:studio    # Open Drizzle Studio

# SDK
bun build:sdk                    # Rebuild API SDK exports (auto-runs on postinstall)
```

Pre-commit hook runs `bun fmt` (format + lint + typecheck staged files).

## Architecture

```
apps/
  web/              # React 19 SPA (Vite, TanStack Router)
packages/
  api/              # Bun + Elysia HTTP API
  ui/               # Shared component library (@repo/ui) - shadcn/ui + Tailwind v4
  tsconfig/         # Shared TS configs
```

## API (packages/api)

Organized by domain modules in `src/modules/`. Each module follows a layered pattern:

- `*.routes.ts` — Elysia route plugins with Zod validation
- `*.service.ts` — Business logic
- `*.repository.ts` — Data access

Key conventions:

- **Errors** — Throw `AppError` via helpers: `badRequest()`, `notFound()`, `conflict()`, etc. The error plugin in `@core/errors` translates to JSON envelopes — no manual try/catch for response mapping.
- **Config/Logging** — Use `@core/env` and `@core/logger`. Never `Bun.env` or `console.*` in feature modules.
- **Telemetry** — `record()` for spans, `emitMetric()` for metrics, `withTraceContext()` for distributed tracing.
- **API payloads** — snake_case to match clients.
- **Testing** — Eden Treaty for E2E; preload `./src/test/setup.ts`.
- **Database** — Drizzle ORM with Bun-native SQLite via `@api/db/client`. Schema in `src/db/schema.ts`. Migrations in `src/db/migrations/`.
- **Migrations** — Run `bun --filter @bind/api db:migrate` to apply. Generated with `db:generate` after schema changes.

## Web App (apps/web)

Feature modules in `src/modules/`, file-based routing in `src/routes/`.

Key conventions:

- **Data fetching** — Server/API data must be fetched through TanStack Query using the Eden Treaty client from `apps/web/src/api.ts` (`bindApi.module.endpoint.get()`) and `apiCall<T>(...)` to extract typed data and propagate errors. Do not fetch API data in `useEffect`.
- **Mutations** — API writes must use TanStack Query mutations or machine actions, then invalidate/update queries. Do not hide API writes in ad hoc component functions that manually coordinate server state.
- **Server state** — Do not mirror query lifecycle in component state (`loading`, `error`, fetched arrays/objects). TanStack Query owns server data, loading, errors, retries, request cancellation, and stale response handling.
- **Local state** — Use local `useState` only for true UI-local state such as form fields, disclosure state, and temporary interaction state. If related values change together, use a reducer, a store for shared state, or machine context/events when the state belongs to a workflow.
- **Types** — API schemas/types are owned by `packages/api` and exported through the SDK. Web must import API types from `@bind/api/client` or feature subpaths and must not recreate API response/request types with divergent local interfaces. UI-only types are allowed only when they describe UI state that does not exist in the API contract.
- **Pending actions** — Any transition, submit, delete, or mutation button must be disabled while its mutation is pending. Prevent duplicate state transitions and double submits by construction.
- **Testing** — `data-testid` attributes for Playwright selectors.

## Shared UI (packages/ui)

- `shadcn/` — Radix UI primitives styled with Tailwind v4 tokens
- `components/` — Business components (added as project grows)
- `hooks/` — Custom React hooks
- `lib/utils.ts` — `cn()` for class merging
- `styles/index.css` — Tailwind v4 `@theme` tokens (no `tailwind.config.ts`)

Rules:

- If shadcn/ui provides a primitive for the UI being built (`Button`, `Input`, `Select`, `Table`, `Dialog`, `Form`, etc.), use or add the shadcn wrapper in `packages/ui/src/shadcn` instead of hand-rolling raw elements and styles in app code.
- App routes/components should compose shadcn primitives with project styling. Avoid inline styles and custom one-off primitives unless no shadcn primitive exists or the component is truly product-specific.

## API SDK Exports

The API package exports typed subpath modules (`@bind/api/client`, `@bind/api/core`, etc.) built by tsup. The web app consumes these for type-safe API integration.

**Critical**: when adding a new API module, follow the three-step recipe — add the file to `src/sdk/<name>.ts`, the entry to `tsup.config.ts`, and the entry to `packages/api/package.json` `exports`. The `apps/web/src/__sdk-smoke.ts` file is permanent and enforces this contract at typecheck time. Don't delete it.

SDK types must stay precise enough for web consumers. Do not export API response types that collapse to `any` or broad `string` when the API contract is a known enum/literal union. If the API uses runtime schemas, export explicit TypeScript contract types from the API package and make schemas satisfy those contracts.

## Path Aliases

```
@/*       → apps/web/src/                       (web app)
@repo/ui  → packages/ui                         (UI components, via exports)
@bind/api/* → packages/api/dist/* (built)       (API SDK subpaths)
@api/*    → packages/api/src/                   (within api package)
@core/*   → packages/api/src/modules/core/      (API core utilities)
```

## Code Style

- **Linter**: Oxlint (not ESLint) — config in `.oxlintrc.json`
- **Formatter**: Prettier with import sorting and Tailwind class ordering
- **TypeScript**: Use `import type` for type-only imports (enforced by oxlint)
- **Quality gate**: Never commit or push with failing lint, typecheck, or format checks. Run `bun check` before committing code changes; if checks cannot be run or fail for unrelated local files, state that explicitly and do not claim the branch is clean.
- **Review discipline**: Before finishing a feature or review fix, reread every changed line and verify it follows these rules, especially API-owned types, TanStack Query data flow, shadcn usage, and pending-disabled mutations.

## Environment & Conventions

- **Dev vs prod conditionals**: always via `config.isProduction` / `isDevelopment` / `isTest` from `@core/env` in the API, and `webEnv.app.isProduction` in the web. Never read `process.env.NODE_ENV` directly in feature modules.
- **Dev-only routes**: gate at the route-registration level with `if (!config.isProduction)`, not inside the handler — defense in depth.
- **Seed data**: gated on both `!config.isProduction` AND `SEED_DEV_DATA=true` env flag.
