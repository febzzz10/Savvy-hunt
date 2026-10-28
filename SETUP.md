# Setup

Quickstart for running Savvy Hunt locally. For what each piece does, see `README.md`.

## 1. Install

```bash
npm install
cp .env.example .env.local      # PowerShell: Copy-Item .env.example .env.local
```

## 2. Start Convex

```bash
npx convex dev
```

Leave this running. It creates an anonymous local deployment (no account needed), writes
`CONVEX_DEPLOYMENT` and `NEXT_PUBLIC_CONVEX_URL` into `.env.local`, and pushes the functions.

If the push is refused because an env var referenced by `convex/auth.config.ts` is unset, set it in
a second terminal — any syntactically valid HTTPS URL works without Clerk:

```bash
npx convex env set CLERK_JWT_ISSUER_DOMAIN "https://example.clerk.accounts.dev"
```

## 3. Demo data (optional)

```bash
npx convex env set ALLOW_DEMO_SEED true
npx convex run devSeed:seedDemoData
```

Seeds 5 categories, 6 schools, 6 events and 13 scores. Refused if the `events` table is not empty.

## 4. Run Next.js

```bash
npm run dev        # http://localhost:3000
```

Public pages render without Clerk. With no Clerk keys, `/admin` shows "ADMIN ACCESS NOT
CONFIGURED" — that is expected.

## 5. Admin access (optional)

1. Create a Clerk application and a JWT template named `convex`.
2. `npx convex env set CLERK_JWT_ISSUER_DOMAIN "https://your-app.clerk.accounts.dev"`
3. Add `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` and `CLERK_SECRET_KEY` to `.env.local`, restart `npm run dev`.
4. Bootstrap the first admin (`authSubject` is the Clerk user ID):

```bash
npx convex env set ADMIN_BOOTSTRAP_SECRET "a-long-random-secret"
npx convex run adminBootstrap:bootstrapAdmin "{\"secret\":\"a-long-random-secret\",\"authSubject\":\"user_xxx\",\"email\":\"organizer@example.com\",\"displayName\":\"Organizer\"}"
```

## 6. Verify

```bash
npm run typecheck && npm run lint && npm test
npm run build && npm run start      # stop `npm run dev` first: both write .next
```

`npm run test:e2e` needs browsers first: `npx playwright install` (no E2E specs exist yet).

## Troubleshooting

| Symptom | Cause / fix |
| --- | --- |
| `A local backend is still running on port 3210` | An earlier `convex dev` is still alive. Stop it (`Stop-Process -Id <pid>`) or use `npx convex dev --once`. |
| `Assertion failed: !(handle->flags & UV_HANDLE_CLOSING)` after a `npx convex` command on Windows | Harmless libuv shutdown noise; the command already succeeded. |
| `npx convex dev` exited right after pushing | `--once` pushes and exits by design; run it without `--once` to keep watching. |
| Admin area shows "not configured" | Clerk keys are empty in `.env.local`. Public site is unaffected. |
| Type errors after changing Convex functions | `npm run convex:codegen`, then `npm run typecheck`. |
| Gallery stays empty | Drive credentials unset. See `README.md` → Google Drive gallery. |
