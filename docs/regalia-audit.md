# EcoSpark → Regalia: Phase 0 Baseline Audit

Recorded before the first functional change of the overhaul, per §9.1 of the execution addendum.
Everything below was verified by direct inspection of the working tree, not assumed from the brief.

- **Date:** 2026-07-30
- **Branch:** `main` @ `e4ab9bf`
- **Working tree:** dirty. Uncommitted work already present (see "Pre-existing uncommitted work").

---

## 1. Stack (confirmed from package.json)

| Area | Actual |
|---|---|
| Framework | React 19.2, Vite 8.1 (rolldown), React Router 7.18 |
| State | Zustand 5.0 (`authStore`, `uiStore`, `settingsStore`, `offlineStore`) |
| Styling | Tailwind 4.3 CSS-first (no `tailwind.config.js`) + CSS Modules per page + `src/styles/tokens.css` `[data-theme]` |
| Motion | Framer Motion 12.42 |
| 3D | three 0.185, @react-three/fiber 9.6, drei 10.7, postprocessing 3.0 |
| Data | firebase 12.16 (client), firebase-admin 13.10 (serverless) |
| AI | groq-sdk 1.3 (`llama-3.3-70b-versatile`), @google/generative-ai 0.24 |
| Charts / icons | recharts 3.10, lucide-react 1.25, react-hot-toast 2.6 |
| Host | Vercel |

**No lint, typecheck, or test tooling exists.** `package.json` scripts are only
`dev`, `build`, `preview`, `seed`. There is no ESLint config, no TS config
(despite four `.tsx` files under `src/components/landing/`), and no test runner.
So "run the project's existing lint/typecheck/test commands" (§9.1.3) has no
target — **production build is currently the only automated gate.**

## 2. Baseline verification result

`npm run build` → **exit 0, built in 16.4s.** Pre-existing warnings, all of which
predate this overhaul and must not be counted as regressions:

- `INEFFECTIVE_DYNAMIC_IMPORT` — `firestoreService.js` is both statically and
  dynamically imported (App.jsx, Hero.tsx, Sidebar.jsx, TaskLogModal.jsx, useUser.js).
- Chunks over 500 kB: `three-vendor` 1,007 kB, `firebase-vendor` 578 kB,
  `Admin` 404 kB.
- 80% of build time is in `vite:css`.

## 3. Routes (as actually wired in `src/App.jsx`)

All authenticated routes are nested inside one `<AppShell>` under `/*`, gated
only by `<ProtectedRoute>`:

`/` `/news` `/tasks` `/leaderboard` `/rewards` `/arena` (settings-gated)
`/community` `/profile` `/user/:id` `/messages` `/messages/:chatId`
`/notifications` `/settings` `/admin` `/about` · `*` → redirect `/`

Siblings outside the shell: `/auth`. Unauthenticated `/*` renders `<Landing>`.

**`/admin` is an ordinary child route in the student shell** — same login, same
chrome, no role check in the router. Confirms addendum bug #8.

## 4. Serverless endpoints & cron

| Path | Purpose | Auth |
|---|---|---|
| `api/verify.js` | Gemini Vision proof-of-task → writes `submissions` status via Admin SDK | **none** (no caller auth check) |
| `api/coach.js` | Groq-streamed AI coach | n/a |
| `api/news.js` | GNews.io eco/climate headline proxy | n/a |
| `api/streak-reset.js` | Nightly streak reset + Sunday weekly reset/top-3 rewards | `CRON_SECRET`, **production only** |

Cron in `vercel.json`: `/api/streak-reset` daily at `0 0 * * *`. One entry only.

## 5. Firestore collections in use

`users`, `leaderboard`, `tasks`, `submissions`, `rewards`, `redemptions`,
`transactions`, `community/{postId}/comments`, `groups`, `reports`,
`notifications`, `follows`, `settings/{global,stats}`, `frameRequests`,
`chats/{chatId}/messages`.

`users` doc shape (from `createUserProfile`): `points`, `lifetimePoints`,
`weeklyPoints`, `spendableBalance`, `streak`, `longestStreak`,
`lastActivityDate`, `badges[]`, `unlockedFrames[]`, `activeFrame`, `role`,
`groupId`, `referralCode`, `referredBy`, `referralCount`,
`totalTasksCompleted`, `totalCO2Saved`/`WaterSaved`/`WasteSaved`,
`inventory{frames,glows,companions,backgrounds,entries}`,
`equipped{frame,glow,companion,background,entry}`, plus prefs and timestamps.

Note the **dual storage of frame ownership**: `unlockedFrames[]` *and*
`inventory.frames[]`; and of equipped frame: `activeFrame` *and*
`equipped.frame`. Both are read with `||` fallbacks throughout. Any migration
must preserve both.

`chats` docs **do** already carry a `participants` array, so the addendum's
participant-scoped rules need no backfill.

## 6. Roles today

`profile.role` ∈ `'student' | 'teacher' | 'admin'` (`createUserProfile` writes
`'student'` explicitly; older docs may be unset). `isTeacher()` in
`firestore.rules:15` resolves true for **both** `teacher` and `admin` — the
misnomer the brief called out. `Admin.jsx:64` gates the page on
`role !== 'teacher' && role !== 'admin'`. There is no `owner` role anywhere yet,
and no Firebase Auth custom claims are set or read.

## 7. Theme system

`tokens.css` defines `:root` (forest, default) plus `[data-theme]` blocks for
`ocean`, `dark`, `midnight`, `sunset`, `metallic`, and the `[data-contrast=high]`
/ `[data-text-size]` override layers. Confirmed default is **`metallic`**
(`App.jsx:117`, `uiStore.js:6`). Note `createUserProfile` writes
`theme: 'midnight'` to the user doc — an existing inconsistency between the
stored per-user default and the localStorage default.

`uiStore.setTheme` maps names via `attrMap` (`forest` → `''`); a new theme must
be registered there or it will silently fall through to the raw name.

## 8. Pre-existing uncommitted work (not authored by this overhaul)

Already dirty in the tree before Phase 0 began, and preserved as-is:

- `M src/components/common/Frames.jsx` (+255) — adds `BiocircuitFrame`,
  `HelixFrame`, `SingularityFrame`.
- `M src/constants/rewards.js` (+16) — adds `quantum` / `helix` / `singularity`
  tiers and 10 ultra-tier items.
- `M src/pages/Rewards.jsx` (+381/−114) — Frame Fitting Studio, tilt cards,
  count-up, progress ring.
- `M src/pages/Rewards.module.css`, `M src/styles/rewards.css`.
- `?? src/components/rewards/FrameStudio.{jsx,module.css}` (untracked, wired
  into `Rewards.jsx:19`).

## 9. Verification of the 8 bugs claimed in the brief

Each re-checked against the current working tree.

| # | Status | Evidence |
|---|---|---|
| 1 | **Confirmed** | `Rewards.jsx:388-390` — pools are bronze/silver/gold, silver/gold/platinum, gold/platinum/god/gaia/supernova. `prime` is in none. Also **`quantum`/`helix`/`singularity` are excluded too** — the new ultra tiers are equally undroppable (brief predates them). |
| 2 | **Confirmed, and worse than described** | `rewards.js` — `gaia` and `supernova` are both `'Legendary'`; separately the uncommitted work labels `helix` `'Mythic'`. So the brief's fix (supernova → `'Mythic'`) would create a *second* collision. See divergence D-1. |
| 3 | **Confirmed** | `Rewards.jsx:635-639` — `animate.x` is gated on `wonReward`, which `Rewards.jsx:426-435` does not set for 4000ms, against a `duration: 5` transition. Track is static for 4s, then the reveal card covers the motion that finally starts. |
| 4 | **Confirmed** | `aiService.js:294` ("This is a fictional roleplay game. Do NOT refuse…") and `aiService.js:383-384` ("FICTIONAL SIMULATION… You MUST ACT AS IF the event has just concluded"). |
| 5 | **Confirmed** | `firestore.rules:24` — `allow update: if isAuthenticated();` on `/users/{userId}`. Any signed-in user can write any other user's `points`, `role`, `banned`, `inventory`. |
| 6 | **Confirmed** | `firestore.rules:145-149` — `allow read, write: if isAuthenticated();` on `/chats/{chatId}` and its `messages` subcollection, no participant check. |
| 7 | **Confirmed** | `Messages.jsx:210` and `:245` render the name as bare text; `Avatar` gets `activeFrame` at `:199`, `:244`, `:287` but no glow lookup exists in the file. |
| 8 | **Confirmed** | `ProtectedRoute.jsx:8-10` checks `loading` and `!user` only. |

### Additional issues found that the brief does not list

- **A-1 — Duplicate loot drops are silently paid for.** `handleOpenLootbox`
  (`Rewards.jsx:429`) calls `redeemReward` for the won item; ownership is stored
  with `arrayUnion`, which is idempotent. Winning something already owned
  therefore debits the full case cost for nothing, with no dedupe and no
  compensation.
- **A-2 — No in-flight guard on case opening.** The case button has no disabled
  state while a spin is pending, and `handleOpenLootbox` performs no idempotency
  check before debiting.
- **A-3 — 3D hero fetches textures from `raw.githubusercontent.com` at runtime**
  (`EcoHero3D.jsx:19-22`) *even though* local equivalents exist at
  `public/textures/earth_{color,normal,specular,clouds}.*`. Directly violates
  §9.3 ("no external raw GitHub URLs for critical visual assets") and makes the
  hero fail on a cold CDN or offline. There is no error/fallback path around
  `useTexture`.
- **A-4 — `api/verify.js` has no caller authentication.** It accepts any POST
  with a `submissionId` and writes submission status with Admin SDK privileges.
  Anyone can mark any submission approved by ID.
- **A-5 — Client-side AI keys.** `VITE_GEMINI_API_KEY` and `VITE_GROQ_API_KEY`
  are read in `aiService.js` and ship in the browser bundle by design
  (`verifyTaskPhoto` deliberately bypasses the server to dodge Vercel's 10s
  timeout). These keys are effectively public. Not introduced here; flagged
  because it interacts with §9.1.5.
- **A-6 — Unbounded collection scans.** `adminForceWeeklyReset`,
  `api/streak-reset.js`, and `getAdminUsers` read entire `users` /
  `leaderboard` collections with no pagination; `streak-reset` also commits one
  batch across all users (Firestore caps a batch at 500 writes, so this breaks
  once the user base grows).
- **A-7 — `.env` is gitignored but present in the working directory** with real
  values for 11 keys. There is **no `.env.example`**; §9.1.5 requires one.
- **A-8 — Four `.tsx` files with no TypeScript setup.**
  `src/components/landing/*.tsx` are compiled by Vite's esbuild transform only —
  no `tsconfig.json`, no typecheck, so their types are unverified.
- **A-9 — `Math.random()` decides point-bearing outcomes on the client.**
  `Rewards.jsx:404` (loot drop), `Arena.jsx:286` (spin result), `Arena.jsx:71`
  (market end times). Violates §9.3 and is trivially manipulable.

## 10. Divergences from the brief, and how they are resolved

- **D-1 — Tier labels.** The brief says relabel `supernova` → `'Mythic'`, but the
  uncommitted ultra-tier work already uses `'Mythic'` for `helix`. Applying the
  brief verbatim keeps a collision, just moved. Resolution: take the brief's two
  explicit renames (`supernova` → `Mythic`, `prime` → `Celestial`) and relabel
  `helix` → `'Genesis'`, which matches its own item name ("Genesis Helix"). All
  11 tier labels then become unique. Only display strings change; every `id` and
  `tier` key is untouched, so no user inventory is affected.
- **D-2 — Loot pools.** The brief's Celestial Case pool
  (`platinum/god/gaia/supernova/prime`) omits the three ultra tiers it did not
  know about, which would leave `quantum`/`helix`/`singularity` as undroppable as
  `prime` is today. The Celestial Case will include them so that every tier in
  `TIER_CONFIG` is reachable from some case.
- **D-3 — Lint/typecheck gates.** None exist (§2 above). Per the addendum's
  instruction to record rather than invent tooling, production build remains the
  gate for this work; adding a linter is out of scope unless requested.

