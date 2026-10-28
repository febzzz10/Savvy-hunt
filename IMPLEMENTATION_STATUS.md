# Savvy Hunt — Implementation Status

Last updated: 2026-10-28

## Verified locally

| Check | Command | Result |
| --- | --- | --- |
| TypeScript | `npm run typecheck` | Pass |
| ESLint | `npm run lint` | Pass (warnings only) |
| Unit / integration | `npm test` | 21 tests passed |
| Production build | `npm run build` | Pass, 18 routes generated |
| End-to-end | `npm run test:e2e` | Not run; no E2E specs yet |

Lint warnings that remain:

- `convex/_generated/*` has unused `eslint-disable` directives because the fallback generated
  files are not real codegen output.

## Implemented

### Backend (Convex)

- Schema for `admins`, `schools`, `categories`, `events`, `scores`, `auditLogs`,
  `galleryItems`, `driveSyncRuns`, and `appSettings`.
- Scoring validation, event and result transition rules, visibility rules, tie-aware ranking,
  and overall/category/event standings.
- Public queries: app config, categories, scoreboard, category results, schedule, event detail,
  paginated gallery, home summary.
- Admin queries/mutations: dashboard, schools, categories, events, lifecycle/publication,
  results, scores with stale-revision checks, gallery moderation, audit log, admin list,
  settings, Drive status.
- Clerk-aware `requireAdmin` with no development backdoor; audit entries on sensitive changes.
- Secret-gated first-admin bootstrap that refuses when an active admin exists.
- Google Drive sync: OAuth refresh-token exchange, paginated listing, MIME/size validation,
  idempotent upserts by Drive file ID, storage copy, error reconciliation, manual action, and a
  15-minute cron.
- Environment-gated demo seed.
- Convex tests covering scoring rules, Drive validation, auth guards, provisional/final
  publication, tie ranking, stale revisions, void reasons, and draft visibility.

### Frontend

- Public editorial design system (paper/ink/flame/teal), responsive navigation, system font
  stacks, accessible status pills, empty/loading/error states.
- Public home, scoreboard, category results, schedule, event detail, and gallery with lightbox.
- Admin shell with Clerk sign-in, setup notice, non-admin denial, desktop sidebar, mobile nav.
- Admin dashboard, event list/create/detail, score desk, results desk, gallery moderation,
  catalog (schools/categories), audit log, and settings.
- Conditional providers: public browsing works without Clerk; admin shows a setup notice when
  Clerk is absent.

## Deliberate simplifications

- Scoring is event-level per school. There is no participant table or participant-level score
  aggregation.
- Gallery import caps each sync at 1,000 Drive files. Larger folders need pagination across runs
  or a follow-up change.
- School logos are in the schema but there is no logo upload UI yet.
- Gallery event/category assignment is supported by the backend but not exposed in the admin
  card UI yet.
- Admins are managed directly in the `admins` table after bootstrap; there is no invite UI.
- Timezone conversion uses the IANA offset at the selected wall-clock instant. This is correct
  for typical use but is not a full DST-boundary resolver.

## External integrations still required

These cannot be completed from the repository alone:

1. **Convex deployment and codegen.** `npx convex codegen` needs an authenticated Convex CLI
   session. Until then, `convex/_generated/*` is hand-written fallback code with loose types.
   Run `npm run convex:codegen` and commit the real output before shipping.
2. **Clerk application.** Needs a publishable key, secret key, `convex` JWT template, and
   `CLERK_JWT_ISSUER_DOMAIN` on the Convex deployment.
3. **First admin.** Needs a real Clerk user subject and `ADMIN_BOOTSTRAP_SECRET`.
4. **Google Drive.** Needs OAuth client credentials, a refresh token with read-only Drive scope,
   and a shared folder.
5. **Hosting.** No Vercel/production environment has been configured.
6. **Real-time verification.** Two-session live updates could not be verified without a deployed
   Convex backend.

## Next steps

1. Authenticate the Convex CLI, run `npx convex dev` / `npm run convex:codegen`, and replace the
   fallback generated files.
2. Configure Clerk, bootstrap the first admin, and exercise every admin route against the real
   deployment.
3. Connect Drive and run a sync against a small test folder before the real gallery.
4. Add Playwright specs for the public read paths and the admin publish flow, then run them
   against a preview deployment.
5. Deploy to Vercel with the browser-side environment variables; set backend secrets on Convex.
