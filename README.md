# Savvy Hunt

Live scoreboards, category results, schedules, and a moderated photo gallery for an
inter-school competition. Next.js App Router frontend, Convex real-time backend, Clerk admin
authentication, and Google Drive gallery import.

## Requirements

- Node.js 20+ (this repo was verified on Node 24)
- A Convex account and deployment
- A Clerk application (only needed for the admin area)
- Google Drive OAuth credentials (only needed for gallery sync)

## Local setup

```bash
npm install
cp .env.example .env.local
```

Fill in `NEXT_PUBLIC_CONVEX_URL` and, if you want the admin area, the Clerk keys.

Start Convex and Next together:

```bash
npx convex dev        # terminal 1
npm run dev           # terminal 2
```

The public site renders without Clerk. If `NEXT_PUBLIC_CONVEX_URL` is missing, the app shows a
configuration screen instead of querying an empty deployment.

## Convex environment

These values belong on the Convex deployment, not in `.env.local`:

```bash
npx convex env set CLERK_JWT_ISSUER_DOMAIN "https://your-app.clerk.accounts.dev"
npx convex env set ADMIN_BOOTSTRAP_SECRET "a-long-random-secret"
npx convex env set GOOGLE_CLIENT_ID "..."
npx convex env set GOOGLE_CLIENT_SECRET "..."
npx convex env set GOOGLE_REFRESH_TOKEN "..."
npx convex env set GOOGLE_DRIVE_FOLDER_ID "..."   # optional if set in Admin -> Settings
```

`CONVEX_DEPLOYMENT`/`CONVEX_URL` are managed by `npx convex dev` and must not be committed.

## Clerk

1. Create a Clerk application.
2. Create a JWT template named `convex`.
3. Set `CLERK_JWT_ISSUER_DOMAIN` on the Convex deployment to the Clerk issuer domain.
4. Add `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` and `CLERK_SECRET_KEY` to `.env.local`.

The app has no development backdoor. Every admin mutation calls `requireAdmin`, which checks the
Clerk identity subject against an active row in the `admins` table.

### First admin

The bootstrap mutation refuses to run if an active admin already exists.

```bash
npx convex run adminBootstrap:bootstrapAdmin "{\"secret\":\"<ADMIN_BOOTSTRAP_SECRET>\",\"authSubject\":\"user_xxx\",\"email\":\"organizer@example.com\",\"displayName\":\"Organizer\"}"
```

Get `authSubject` from the Clerk user's ID (`user_...`). After bootstrapping, sign in at
`/admin`; additional admins are managed directly in the `admins` table.

## Google Drive gallery

1. Enable the Google Drive API in a Google Cloud project.
2. Create OAuth client credentials and obtain a refresh token with the read-only Drive scope
   (`https://www.googleapis.com/auth/drive.readonly`).
3. Share the target folder with that Google account.
4. Set the credentials on the Convex deployment, or set only the folder ID in Admin -> Settings.

Sync imports JPEG, PNG, and WebP files, copies the bytes into Convex file storage, and records
Drive metadata. New or changed files return to `pending_review`; nothing becomes public until an
admin publishes it. A scheduled sync runs every 15 minutes, and admins can trigger one manually
from the gallery. Each run handles up to 1,000 files; a larger folder needs follow-up work.

Supported file types and the size limit (default 15 MB) are enforced in `convex/lib/drive.ts`
and can be adjusted in Admin -> Settings.

## Commands

```bash
npm run dev           # Next.js dev server
npm run build         # production build
npm run start         # serve the production build
npm run lint          # ESLint
npm run typecheck     # TypeScript, no emit
npm test              # Vitest: Convex integration + unit tests
npm run test:watch    # Vitest watch mode
npm run test:e2e      # Playwright (no E2E specs yet)
npm run convex:dev    # Convex dev deployment
npm run convex:deploy # Convex production deployment
npm run convex:codegen# regenerate Convex types
```

`npx convex codegen` requires an authenticated Convex CLI session. In this workspace it has not
been run, so `convex/_generated/*` is a hand-written fallback with loose types. Replace it with
real codegen output before relying on generated types. See `IMPLEMENTATION_STATUS.md`.

## Demo seed

With `ALLOW_DEMO_SEED=true` on the Convex deployment:

```bash
npx convex run devSeed:seedDemoData
```

Seeding is refused when any event already exists. Use it only on a disposable development
deployment.

## Routes

Public:

- `/` — overview, live events, top schools
- `/scoreboard` and `/scoreboard/categories/[slug]` — overall and category standings
- `/schedule` — programme filtered by state
- `/events/[eventId]` — event detail and published results
- `/gallery` — published photos with lightbox

Admin (Clerk + active admin required):

- `/admin` — dashboard, sync health, recent audit entries
- `/admin/events` — create, edit, publish, and transition events
- `/admin/scores` — score desk per event
- `/admin/results` — provisional/final result publication
- `/admin/gallery` — review and publish Drive photos
- `/admin/catalog` — schools and categories
- `/admin/audit` — audit log with reasons
- `/admin/settings` — scoring policy, timezone, gallery limits, Drive folder, admins

## Behaviour notes

- Scores are one per school per event (`eventId + schoolId`). There is no participant-level
  scoring.
- Result states are `not_ready`, `provisional`, and `final`. Final results lock score edits.
- Reopening a completed/cancelled event, reopening final results, hiding results, and voiding a
  score require an audited reason.
- Ties share a rank (for example 1, 1, 3).
- Timestamps are stored as UTC and displayed in the configured `eventTimezone`
  (default `Asia/Kolkata`).
- Score writes use a revision check (`expectedRevision`) to reject stale concurrent edits.
- Archived schools remain in historical results but are hidden from new score work.
