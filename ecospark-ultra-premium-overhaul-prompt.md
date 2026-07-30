# EcoSpark → "Regalia" Overhaul — Master Build Prompt for Claude Code

**What this file is:** a complete, codebase-grounded specification for a full premium redesign and feature build-out of EcoSpark. I read the actual repo (`github.com/ayalpha/ecospark`) before writing this, so it references real files, real functions, and real bugs instead of generic advice. Paste this whole document to Claude Code, or point it at this file in the repo and say "work through this."

**How to use it:** don't try to execute all nine sections in one giant pass. Work phase by phase (Section 8 gives a suggested order), show a diff/summary after each phase, and keep the app deployable at every step. Where this doc gives a firm technical reason (a real bug, a real security gap), treat it as required. Where it gives aesthetic direction, treat it as a strong default you can adapt to what actually looks best once it's on screen.

One scope note up front, so it isn't a surprise buried on page 12: the original brief asked for Stake.com-style **Mines** and **Dice** games where players wager eco-points and can lose them. I've redesigned that part of the Arena section (5.8) instead of specifying it as asked. EcoSpark's users are students and teachers, and "wager currency, lose currency on a pure-chance outcome" is the actual mechanic that makes something gambling, independent of whether the currency is real money. So the games below keep every bit of the visual thrill — reels, multipliers, casino lighting — but nothing ever costs you points you've already earned; chance only ever affects the *size* of a bonus. If EcoSpark's users are exclusively verified adults and you want true wager-and-lose mechanics, that's a conversation to have explicitly rather than something to build by default.

\---

## 1\. Orientation for Claude Code

You already have full repo access and (per the user) have analyzed it. Here's the relevant shape of it, confirmed by direct inspection, so this prompt and your own understanding are talking about the same codebase:

* **Stack:** React 19 + Vite 8 + React Router 7, Firebase (client SDK + `firebase-admin` for serverless functions), Tailwind CSS 4 (CSS-first, no `tailwind.config.js` — theming runs through `src/styles/tokens.css` via `\[data-theme]` attributes), Framer Motion 12, Zustand 5, `react-three-fiber` + `drei` + `three` (there's a 3D hero — `EcoHero3D.jsx` — with real earth textures in `public/textures/`), Recharts, `lucide-react`, `react-hot-toast`. AI features run on Groq (`llama-3.3-70b-versatile`) and Gemini, called from serverless functions in `api/`. Deployed on Vercel.
* **Roles today:** `profile.role` is `'teacher'`, `'admin'`, or unset (student). A helper called `isTeacher()` in both the frontend and `firestore.rules` actually grants access to *both* `'teacher'` and `'admin'` — worth renaming for clarity when you touch this.
* **What's already good — don't rebuild these, extend them:**

  * `src/styles/tokens.css` already defines a proper design-token system with elevation, glass-panel, and motion scales, and *six* existing themes including `midnight` (a genuinely well-built true-dark theme with WCAG AA contrast guaranteed in a comment) and `metallic` (currently the **default** theme, per `App.jsx`: `localStorage.getItem('ecospark-theme') || 'metallic'`). The "outdated" feeling isn't a missing system — it's inconsistent application and missing flourish. Evolve, don't replace.
  * `src/components/common/Avatar.jsx` is already a shared component used across Leaderboard, Profile, UserProfile, Messages, and Community — frame consistency is mostly solved already (see 4.4 for the actual gap).
  * `api/verify.js` already does real Gemini Vision proof-of-task verification. `api/news.js` already proxies real GNews.io eco/sustainability headlines. `api/coach.js` already runs a well-scoped Groq-streamed AI coach with a sensible system prompt ("Never make up statistics"). These are genuinely solid — reskin them, don't rewrite the logic.
* **Working principles for this whole project:**

  1. **Server-side authority for anything that moves points.** Firebase Admin SDK is already a dependency and `api/` already has the pattern (see `verify.js`). Any code path that changes a user's balance, role, or inventory should end up going through a trusted server function, not a raw client-side Firestore write. Section 7 explains why this is a real, currently-exploitable gap, not just best practice.
  2. **Restraint.** Spend elaborate animation and ornamentation on a few *deliberate* moments (tier reveals, the landing hero, the Celestial tier) and keep day-to-day surfaces (task logging, admin tables, most of the leaderboard) clean and fast. Animating everything is what makes an interface read as AI-generated, not premium.
  3. **Don't lose existing user data.** Where a fix changes a schema or a stored value's meaning (tier labels, `role` values, chat document shape), write it as additive/migratable, not destructive.

\---

## 2\. Design System: "Regalia"

### 2.1 Why this direction, not generic "dark + gold luxury"

Dark background with one bright accent color is one of the most common default look s AI-generated interfaces reach for, so this needs a reason to be specific to EcoSpark rather than luxury-in-the-abstract. Two things ground it: first, the app already owns an emerald + gold identity (visible in `tokens.css`'s `--glow-gold`, the tier colors in `rewards.js`, six existing theme variants) — this evolves that equity instead of discarding it for a generic palette. Second, the signature element below is drawn from EcoSpark's actual subject matter (growth, nature, ecology), not borrowed from luxury-brand vocabulary in general.

### 2.2 The signature: Growth Rings

The one recurring visual motif, used everywhere rarity or ceremony needs to be communicated: **concentric rings, like tree growth rings or ripples**. Higher tiers get more rings, tighter spacing, and more ornamentation on those rings — a literal visual encoding of "grown further." Use this for:

* Frame construction (each `Frame` component in `src/components/common/Frames.jsx` should read as "N rings" where N scales with tier — Bronze is a single plain ring, Celestial is many rings with the aurora gradient traveling around them)
* The loot-case opening shockwave (rings expand outward from the revealed item instead of generic confetti-only)
* Loading spinners (a ring pulse instead of a generic spinner)
* Ambient hero background texture (faint, slow-drifting concentric rings behind the 3D earth on Home/Landing)

This is the "one real risk" this design takes — spend the elaborate execution budget here, and keep everything else (buttons, tables, forms) quiet by comparison.

### 2.3 Color tokens

Add this as a new theme block in `src/styles/tokens.css`, following the exact pattern the existing `\[data-theme="midnight"]` and `\[data-theme="metallic"]` blocks already use, and make it the new default (replace `'metallic'` with `'regalia'` in the `localStorage.getItem('ecospark-theme') ||` fallback in `App.jsx`):

```css
/\* ------------------------------------------
   REGALIA THEME — flagship identity
   Deep obsidian-emerald base, gold ceremonial accent.
   Amethyst→cyan→gold aurora reserved for Celestial-tier
   moments only — do not use the aurora gradient elsewhere,
   its rarity IS the design.
------------------------------------------ \*/
\[data-theme="regalia"] {
  --color-primary: #1FA463;
  --color-primary-light: #34C880;
  --color-primary-dark: #0F5132;
  --color-primary-rgb: 31, 164, 99;

  --color-secondary: #7C3AED;          /\* amethyst — already your platinum-tier color \*/
  --color-secondary-light: #A78BFA;
  --color-secondary-dark: #5B21B6;

  --glass-bg: rgba(10, 15, 12, 0.78);
  --glass-bg-strong: rgba(10, 15, 12, 0.92);
  --glass-border: 1px solid rgba(245, 158, 11, 0.16);  /\* hairline GOLD, not green — reads as ceremonial rather than "another dark mode" \*/
  --glass-blur: blur(22px);

  --color-bg: #0A0F0C;
  --color-bg-card: #10160F;
  --color-bg-elevated: #161F16;
  --color-surface: #161F16;
  --color-surface-raised: #1C2A1E;

  --color-border: rgba(245, 158, 11, 0.10);
  --color-border-strong: rgba(245, 158, 11, 0.28);

  --color-text: #F3F6F1;
  --color-text-secondary: #A8BCA9;
  --color-text-tertiary: #6E8770;
  --color-text-inverse: #0A0F0C;

  --elevation-1: 0 0 0 1px rgba(245, 158, 11, 0.06);
  --elevation-2: 0 0 0 1px rgba(245, 158, 11, 0.10), 0 4px 14px rgba(0,0,0,0.55);
  --elevation-3: 0 0 0 1px rgba(245, 158, 11, 0.16), 0 10px 28px rgba(0,0,0,0.70);
  --elevation-4: 0 0 0 1px rgba(245, 158, 11, 0.22), 0 20px 48px rgba(0,0,0,0.80);

  --glow-primary: 0 0 22px rgba(31, 164, 99, 0.50), 0 0 8px rgba(31, 164, 99, 0.30);
  --glow-celestial: 0 0 40px rgba(124, 58, 237, 0.55), 0 0 20px rgba(34, 211, 238, 0.40), 0 0 10px rgba(245, 158, 11, 0.50);

  --color-streak: #FF8C5A;
  --color-streak-glow: rgba(255, 140, 90, 0.4);
}

/\* Celestial-tier aurora — reserve for the top reward tier and nothing else \*/
@property --gradient-angle { syntax: '<angle>'; initial-value: 0deg; inherits: false; }
.celestial-aurora {
  background: conic-gradient(from var(--gradient-angle), #7C3AED, #22D3EE, #F59E0B, #7C3AED);
  animation: aurora-spin 6s linear infinite;
}
@keyframes aurora-spin { to { --gradient-angle: 360deg; } }
@media (prefers-reduced-motion: reduce) { .celestial-aurora { animation: none; } }
```

Keep `--color-gold`, `--font-display: 'Manrope'`, and `--font-body: 'Inter'` exactly as they already are in `:root` — they're already good choices and already threaded through the whole app (tier configs, glows). No reason to churn them.

### 2.4 Typography

Keep Manrope/Inter as the workhorse pair for everything — UI chrome, tables, the admin panel, buttons, body text. Add **one** ceremonial serif, `Fraunces` (variable font, has real personality via its optical-size axis — avoid the more generic "elegant serif" defaults like Playfair here), as `--font-ceremonial`, used **only** for: the landing-page hero headline, the tier-reveal moment's item name, and Celestial-tier item names wherever they appear as a title. Everywhere else stays sans-serif for legibility, especially the leaderboard and admin (data density beats drama there).

### 2.5 Motion principles

* Micro-interactions (button hover/tap): 150–250ms, scale 1.02–1.04, use the existing `--transition-standard`/`--transition-spring` tokens.
* Page transitions: fade + 8px slide, \~250ms.
* Ceremonial moments (tier reveal, case opening, Celestial unlock): 600ms–2s is fine here specifically, because it's rare and earns the attention.
* Respect `prefers-reduced-motion` everywhere — the app already reads this into `uiStore` in `App.jsx`; make sure every new animation actually checks it, not just the ones ported from before.
* Rule of thumb: if you're tempted to animate something that appears on every page load (nav, cards, standard buttons), don't — save the budget for things that happen occasionally and mean something (a level-up, a reward, a rank change).

### 2.6 Voice \& microcopy

Buttons say what they do in the interface's vocabulary ("Claim Reward" → toast reads "Reward claimed", not a generic "Success!"). Empty states are an invitation to act, not just an icon ("No transactions yet. Complete a task to start earning points." — already close to this in `Rewards.jsx`, keep that pattern everywhere). Errors state what happened and how to recover, without apologizing or exposing raw error text to students (the current `{error}` code-block dump in `Rewards.jsx`'s error state should become a plain sentence for non-admins; keep raw detail available only in an admin/dev view).

\---

## 3\. Global Cross-Cutting Work

### 3.1 Responsive \& performance

* Breakpoints: 375 / 768 / 1024 / 1440. `AppShell`/`Sidebar`/`BottomTabBar` already split desktop-sidebar vs. mobile-bottom-bar — audit every *new* premium element (glass panels, ring motifs, the Celestial aurora) at all four widths, not just desktop.
* Lazy-load and compress everything in `public/companions/` and `public/textures/` — the earth textures in particular are large; confirm they're not blocking first paint on the 3D hero.
* Keep animations on `transform`/`opacity` only (GPU-friendly), which the existing Framer Motion usage already mostly does.

### 3.2 Accessibility

* Every new dark-theme color pairing needs to actually hit WCAG AA — the `midnight` theme's code comment (`text #E2E8F0 on bg #0F1117 = 14.7:1`) shows the team already cares about this; hold Regalia to the same bar and write the contrast ratio in a comment the same way.
* Keyboard: the lootbox scroller, Arena games, and admin dropdowns all need real keyboard operability, not just mouse/touch.
* `\[data-text-size]` and `\[data-contrast="high"]` already exist as overrides in `tokens.css` — make sure new components actually respect them instead of hardcoding sizes/colors inline (the codebase currently mixes token-based and inline-styled colors; prefer tokens in new code).

### 3.3 Identity \& Cosmetics consistency — the actual gap

Frame rendering is **already** consistent (`Avatar.jsx` is shared across Leaderboard, Profile, UserProfile, Messages, Community). Name-glow rendering is **also already correct** on Leaderboard (`Leaderboard.jsx` lines \~31–138, both row and podium), Community posts, and Profile. The one confirmed gap: **`src/pages/Messages.jsx` renders `<Avatar activeFrame={...} />` in three places but never applies `equipped.glow` to the sender/contact name text**, unlike every other surface. Fix: pull the same `equippedGlow`/`glowReward` lookup pattern already used in `Leaderboard.jsx`/`Community.jsx` into Messages' name rendering. While you're in there, double check `UserProfile.jsx` (the public profile) applies the glow class to the displayed name the same way `Profile.jsx` (the private one) does — it wasn't fully confirmed in review and is exactly the kind of surface the original brief called out by name.

Longer-term, consider consolidating the repeated `equippedGlow`/`glowReward` lookup (currently copy-pasted near-identically in Leaderboard, Community, and Profile) into one small hook, e.g. `useEquippedCosmetics(profile)`, returning `{ frame, glowClass, background }` — reduces the chance of a fourth page quietly missing it the next time someone adds a surface that shows a username.

### 3.4 Error handling

Wrap new premium components in the existing `ErrorBoundary.jsx` pattern rather than letting a single card crash the page. Loading states should use the app's premium skeletons (the `skeleton` class already used in `Rewards.jsx`) rather than a spinner-only state, consistently across pages that currently mix the two approaches.

\---

## 4\. Page-by-Page Build Spec

### 4.1 Home (`Home.jsx`)

Hero card with the 3D earth (`EcoHero3D.jsx`) framed by the ring motif; quick stats (points, streak, rank) in glass cards; a "continue where you left off" module (next unlogged task, active Arena prediction, nearest-affordable reward). Streak risk banner (`StreakRiskBanner.jsx` already exists) gets the Regalia treatment — keep its urgency legible, don't over-animate it since it's a functional warning, not a celebration.

### 4.2 Leaderboard (`Leaderboard.jsx`)

Elevated podium treatment for top 3 with the ring motif scaling by rank; full list below keeps the already-working frame/glow rendering. Add smooth rank-change transitions (Framer Motion `layout` prop on list items handles this well) and a sticky "your rank" row when scrolled past your own position.

### 4.3 Tasks (`Tasks.jsx`)

This already has photo-proof submission backed by real Gemini Vision verification (`api/verify.js`) — keep that pipeline, just give the submission flow and status states (pending/approved/rejected, driven by `submissions` per `firestore.rules`) the premium visual pass: category icons, a points-preview before submit, and a satisfying confirm animation (points fly to the header counter) on success.

### 4.4 Rewards (`Rewards.jsx`, `src/constants/rewards.js`, `src/styles/rewards.css`) — the big one

**Confirmed bug #1 — a tier is completely unobtainable.** In `generateLoot()` (`Rewards.jsx`), the three loot-case pools are:

```js
if (cost === 1000) pool = REWARDS\_DB.filter(r => \['bronze','silver','gold'].includes(r.tier));
if (cost === 2500) pool = REWARDS\_DB.filter(r => \['silver','gold','platinum'].includes(r.tier));
if (cost === 5000) pool = REWARDS\_DB.filter(r => \['gold','platinum','god','gaia','supernova'].includes(r.tier));
```

**`tier: 'prime'` — the single highest item in the game — is in none of these arrays.** It's currently only obtainable by direct purchase for 999,999 points; it can never drop from a case. That's almost certainly the "reward gets excluded" bug. Fix: add a fourth case (see below) whose pool includes `'prime'`.

**Confirmed bug #2 — duplicate tier label.** In `TIER\_CONFIG` (`src/constants/rewards.js`), both `gaia` and `supernova` are labeled `'Legendary'`, so two different rarities display identically. Rename `supernova`'s label to `'Mythic'`. Then rename `prime`'s label from `'Prime'` to **`'Celestial'`** — its existing flavor text already calls it "the ultimate, reality-bending celestial frame," so this is a label-only change, not a new tier, and doesn't touch existing user inventories (the `id`/`tier` keys stay identical, only display text changes). Resulting ladder: Bronze → Silver → Gold → Platinum → God → Legendary (Gaia) → Mythic (Supernova) → **Celestial (Prime)**.

**Add a fourth case** so Celestial is actually reachable via lootbox, not just direct purchase:

```js
{ id: 'celestial\_case', name: 'Celestial Case', cost: 15000, icon: '🌌', color: '#7C3AED' }
```

with pool `\['platinum','god','gaia','supernova','prime']` and `prime` weighted rare (weight 1, same as the current gaia/supernova weighting) — keeps it a genuine chase item, just no longer impossible.

**Confirmed bug #3 — the scroller doesn't visibly scroll.** This is the actual root cause of "doesn't float properly / no scroll animation." In the lootbox modal's Framer Motion track:

```jsx
initial={{ x: '50%' }}
animate={{ x: wonReward ? `calc(50% - ${25 \* 210}px)` : '50%' }}
transition={{ duration: 5, ease: \[0.05, 0.9, 0.1, 1] }}
```

`wonReward` is `null` for the first 4000ms (set by the `setTimeout(..., 4000)` in `handleOpenLootbox`), so `animate.x` stays at `'50%'` — **the track sits completely still for those 4 seconds.** Then the instant `wonReward` is set, two things happen in the same tick: the transition target changes (kicking off a 5-second animation to the final position) *and* the reveal card (`AnimatePresence` around `wonReward \&\& ...`) appears immediately, covering the scroller — so the scroll-to-target motion that does start is immediately hidden behind the popup. There's also a straight timing bug: the `setTimeout` fires at 4000ms but the transition `duration` is 5000ms, so they were never even meant to line up.

Fix, concretely:

1. Compute the target `x` offset **synchronously**, before the timeout — you already know `wonItem`'s index (25) and item width (210px) the moment `handleOpenLootbox` runs, so there's no reason to gate the animation target on the later `setWonReward` call.
2. Drive the spin off a `spinning` boolean that flips `true` immediately, with `animate.x` set to the real final target from the start of the animation — so the track visibly scrolls for its full duration instead of sitting idle.
3. Delay showing the reveal card until the track's motion actually finishes — use Framer Motion's `onAnimationComplete` callback on the track, not a hardcoded timeout racing a separately-declared duration.
4. Separately, verify no ancestor of `.caseIcon` clips its `translateY` float (the CSS `@keyframes float` itself looks correct in isolation) — check `.lootboxGrid`/`.caseCard` for `overflow: hidden` or a fixed height that could be cutting off the −10px bob.

**Fairness/transparency:** since `generateLoot()`'s weights are already reasonable, just add a small "Drop Rates" disclosure (a tooltip or expandable panel per case showing tier → probability, computed straight from the same weight table so it can't drift out of sync) — good practice generally, and specifically reassuring for a reward system aimed at students.

**Reward reveal choreography:** keep this strictly upside-only — the case costs a fixed, known amount of points you already own, and you always receive *something* in the pool; the drop-rate panel above makes the range transparent. That's a normal weighted-purchase mechanic, not a wagering one, and is fine to keep as-is once the two bugs above are fixed.

### 4.5 Messages (`Messages.jsx`)

Instagram-adjacent upgrades: emoji reactions on messages, typing indicators, read receipts, reply-to-specific-message, image sharing, online status. Fix the glow-rendering gap from 3.3 while you're in this file. Given the likely student user base: add a simple report/block affordance per conversation and make sure moderators (`isTeacher()`/staff) have a way to review reported conversations — this pairs naturally with the existing `reports` collection already defined in `firestore.rules`.

### 4.6 Community (`Community.jsx`)

Group/team formation (the `groups` collection already exists in `firestore.rules`), community challenges with a shared progress bar, and richer post composition (currently supports likes/comments per the rules file — extend with image attachments and reactions beyond a single like).

### 4.7 Profile \& Public Profile (`Profile.jsx`, `UserProfile.jsx`)

Showcase equipped cosmetics prominently (frame + glow + background all visible at once, which the private `Profile.jsx` already mostly does), stats, badge case, recent activity. Confirm `UserProfile.jsx` (what other users see) mirrors the glow rendering fix from 3.3.

### 4.8 Arena (`Arena.jsx`, `src/constants/arenaData.js`, `src/services/aiService.js`)

**Confirmed root cause of "fake questions" and no real settlement.** `generateArenaPredictions()` and `resolvePredictionAI()` in `aiService.js` are Groq calls whose system prompts literally instruct the model to fabricate outcomes:

> \*"This is a fictional roleplay game. Do NOT refuse to generate predictions based on 'inability to predict the future'."\*
> \*"This is a FICTIONAL SIMULATION game. You MUST ACT AS IF the event has just concluded... decide the outcome definitively. Be creative..."\*

The model isn't malfunctioning — it's doing exactly what it's told, which is invent plausible-sounding questions and then invent plausible-sounding resolutions with no grounding in anything real. That's why endings never actually correspond to real news.

**The fix, and it's most of the way built already:** `api/news.js` already proxies real, live GNews.io headlines (currently filtered to sustainability/climate/eco topics, India-focused). Use that same pattern — a server-side function that calls a real news/data API — for Arena instead of an ungrounded "pretend it happened" prompt:

* **Question generation:** either (a) extend the `api/news.js` pattern to a broader real-time category set and have questions generated *from* real fetched headlines (grounded generation — the LLM summarizes/frames a real article into a yes/no question with a real, cited resolution date and source, instead of inventing one from nothing), or (b) add a small admin-curated question bank (an `oracleQuestions` collection, editable from the Admin panel per 4.9) where a real person sets the question, resolution criteria, and resolution date — the more reliable option if you want zero risk of a badly-grounded auto-generated question slipping through.
* **Resolution:** never ask the model to "decide definitively" from nothing. Resolve by fetching real coverage of the actual event (via the news API, or a sport/finance data API where relevant) and having the model extract the verified outcome from that retrieved text — or, for full reliability given this doesn't involve real money, let staff manually confirm resolution from the Admin panel. A scheduled job (Vercel Cron, which the project's `api/streak-reset.js` shows this codebase already uses for time-based server jobs) can check `endTime`-passed markets and trigger resolution automatically once the outcome is confirmed, which is what actually delivers the "real-time, auto-settles" feel that was asked for — the automation should sit on top of *real* data, not replace it.
* Since predictions are knowledge/skill-based (not pure chance), keeping a real points-at-stake mechanic here is reasonable and different in kind from the chance games below — just cap max stake per market as a sensible responsible-engagement default, and make resolution criteria genuinely visible on each card ("Resolves by \[date] based on \[named source]").

**The chance/casino-style games — reframed, see the scope note at the top of this document.** `Arena.jsx` already has a working **Spin to Win** wheel (`handleSpin`) and a **Staking Pool** tab — extend these rather than building Stake-style Mines/Dice from scratch (neither currently exists in the codebase, so this is new work either way):

* **Spin to Win:** reskin with the Regalia ring motif and casino-grade presentation (real spring physics on the wheel stop, anticipation ticks, confetti/ring-burst on a big win) — it's already upside-only in concept (a free/cheap spin for a points range), keep it that way.
* **New: "Eco Vault"** (fills the "Mines" slot). Spend a fixed amount of points to open the vault; reveal a grid of panels one at a time; each safe panel found increases a bonus multiplier; the player can bank the current multiplier at any time, or the vault auto-banks after a set number of reveals. A "dud" panel ends the round at whatever's already banked — **never below the vault's guaranteed minimum payout**, so there's real press-your-luck tension in how big the win gets, but no path to walking away with less than you put in.
* **New: "Fortune Roll"** (fills the "Dice" slot). Roll for a bonus multiplier (1×–5×) applied to your *next* completed task's point reward. No existing balance is wagered — it's a bonus roll, not a bet.
* **Staking Pool → "Growth Pool":** evolve the existing tab into a time-locked pool with a guaranteed positive return (lock points for N days, get back principal + a fixed bonus) — fits the eco/growth metaphor better than a pool that can lose principal, and keeps the "put points to work" feeling the brief wanted.
* Visual direction for all of the above: lean fully into the casino-lighting, chip/token, reel-physics aesthetic the brief asked for — neon rim-light, felt-texture panels, satisfying tactile motion. The visual thrill is exactly what was asked for; it's only the "can lose what you staked" mechanic that's been designed out.

### 4.9 Admin \& Owner Console (`Admin.jsx`, `src/services/adminService.js`)

The admin panel is already genuinely full-featured (`adminUpdateUserPoints`, user management, flagged submissions, reported posts, task/reward CRUD, global settings, frame requests, forced weekly reset all already exist in `adminService.js`). This section is about restyling it and correcting the permission model, not building it from scratch.

**Roles, per the brief:**

* `student` / `teacher` — unchanged from today.
* `admin` — everything currently in `Admin.jsx` **except** `adminUpdateUserPoints` and role changes. Move points-editing out of the standard admin surface.
* `owner` — gated to the account whose email is `amiteshyadav.yt@gmail.com`. Full access to everything `admin` has, plus points editing, promoting/demoting other admins, viewing an audit log of sensitive actions, and any future "supreme" controls. Surfaces in **two** places, both required per the brief: the dedicated `/admin` login (below), and an "Owner Console" entry point inside the normal authenticated app when logged in as the owner — so daily use doesn't require switching accounts.

**Separate login, not gated by role inside the shared shell.** Right now `/admin` is just another route inside the same `<AppShell>`/`<Routes>` nest as every student page (see `App.jsx`), reached through the same login as everyone else, and `ProtectedRoute.jsx` only checks `if (!user)` — it doesn't check role at all. Build a genuinely separate flow:

* New top-level route `/admin`, rendered as a **sibling** of `/auth` (outside the student `<AppShell>` entirely, its own branded screen — command-center feeling: obsidian + gold, not the playful student theme).
* Its own login form, authenticating against the same Firebase project but checking role immediately after sign-in; non-admin/non-owner accounts get a clear "this account doesn't have admin access" message, not a silent redirect.
* Inside the authenticated student shell, add the "Owner Console" entry (a nav item, visible only when the signed-in account is the owner) that deep-links into the same admin UI without a second login.

**Enforce this server-side, not just in the UI.** A role check in `Admin.jsx` alone is a suggestion, not a boundary — see Section 7 for why, and for the specific fix to `firestore.rules` and `adminUpdateUserPoints`.

New admin UI, Regalia-styled: overview dashboard (the existing `getAdminStats`/`getAdminChartData` + Recharts), users table with clear role badges, the existing moderation queues, rewards/case editor (wire the drop-rate panel from 4.4 to update live as tiers/weights change), Oracle question manager (create/edit/resolve markets per 4.8), and an owner-only audit log view.

\---

## 5\. Confirmed Bugs — Quick Reference

|#|File|Bug|Fix|
|-|-|-|-|
|1|`src/pages/Rewards.jsx` (`generateLoot`)|`'prime'` tier excluded from all 3 case pools — never drops|Add Celestial Case including `'prime'` (4.4)|
|2|`src/constants/rewards.js` (`TIER\_CONFIG`)|`gaia` and `supernova` both labeled `'Legendary'`|Relabel `supernova` → `'Mythic'`, `prime` → `'Celestial'`|
|3|`src/pages/Rewards.jsx` (scroller `motion.div`)|Track animation gated behind `wonReward`, sits static 4s, then reveal card covers the transition; timeout (4000ms) doesn't match transition `duration` (5000)|Compute target `x` synchronously, animate from spin start, gate reveal on `onAnimationComplete` (4.4)|
|4|`src/services/aiService.js` (`generateArenaPredictions`, `resolvePredictionAI`)|Prompts explicitly instruct the model to fabricate a "fictional simulation" — no real data grounding|Ground in real data via the existing `api/news.js` pattern or an admin question bank (4.8)|
|5|`firestore.rules` (`/users/{userId}`)|`allow update: if isAuthenticated();` — any signed-in user can write to any user's document, including points/role|Restrict per Section 7|
|6|`firestore.rules` (`/chats/{chatId}`)|`allow read, write: if isAuthenticated();` — no participant check|Restrict to `participants` array (Section 7)|
|7|`src/pages/Messages.jsx`|Renders `activeFrame` via `Avatar` but never applies `equipped.glow` to names, unlike every other page|Add the same glow lookup used in `Leaderboard.jsx`/`Community.jsx` (3.3)|
|8|`src/components/common/ProtectedRoute.jsx`|Checks authentication only, not role — `/admin` isn't actually route-guarded|Replace with the dedicated `/admin` flow (4.9)|

\---

## 6\. Security \& Data-Integrity Hardening

This section exists because implementing 4.9's "admin can't touch points, only owner can" as a *frontend* rule would be cosmetic — the current `firestore.rules` lets it be bypassed entirely from outside the app.

**Primary fix — move sensitive mutations server-side.** `firebase-admin` is already a dependency and the project already has the pattern (`api/verify.js` uses it). Add Cloud Functions / API routes such as `adjustUserPoints`, `equipCosmetic`, `redeemReward`, and `resolveOracleMarket` that run with Admin SDK privileges, check `context.auth.token.role` themselves, and are the *only* path that can change points, role, or inventory. This is where "admin cannot edit points, owner can" actually gets enforced — that kind of business rule belongs in server code with an explicit check, not in declarative security rules alone.

**Companion Firestore rules fix** (illustrative — verify exact syntax against the Firebase emulator before shipping):

```
match /users/{userId} {
  allow read: if isAuthenticated();
  allow create: if isOwner(userId);
  allow update: if isOwner(userId) \&\&
    !request.resource.data.diff(resource.data).affectedKeys()
      .hasAny(\['points', 'spendableBalance', 'lifetimePoints', 'weeklyPoints', 'role', 'banned', 'inventory']);
  allow delete: if false;
}

match /chats/{chatId} {
  allow read, write: if isAuthenticated() \&\& request.auth.uid in resource.data.participants;
  allow create: if isAuthenticated() \&\& request.auth.uid in request.resource.data.participants;

  match /messages/{messageId} {
    allow read: if isAuthenticated() \&\&
      request.auth.uid in get(/databases/$(database)/documents/chats/$(chatId)).data.participants;
    allow create: if isAuthenticated() \&\&
      request.auth.uid in get(/databases/$(database)/documents/chats/$(chatId)).data.participants \&\&
      request.resource.data.senderId == request.auth.uid;
  }
}
```

Note the chat rule assumes chat documents store a `participants` array — add that field going forward and backfill existing chats if they don't already have it.

**Owner identity — use a custom claim, not just a Firestore field.** A `role: 'owner'` value sitting in a normal Firestore document is one more document among many; a Firebase Auth **custom claim** is set only via the Admin SDK and can't be forged by the client, which is the right level of trust for the single most powerful account in the system. A small one-off script (alongside the existing `scripts/seed.js`) that finds the UID for `amiteshyadav.yt@gmail.com` and sets `{ role: 'owner' }` as a custom claim is enough; mirror it onto the Firestore user doc too (read-only from the client) for convenient UI checks, but treat the claim as the source of truth for anything security-sensitive.

**Also worth a look while you're in `adminService.js`:** `adminUpdateUserPoints` currently has no apparent upper bound or audit trail — once it's owner-gated, still log each call (who, whom, amount, timestamp) to a simple `auditLog` collection so the owner's own audit view in 4.9 has real data.

\---

## 7\. Suggested Build Phases

Work in this order so the app stays functional and reviewable at every checkpoint, rather than one enormous diff:

1. **Design tokens \& shared primitives** — Regalia theme block, the ring-motif signature components, shared button/card primitives, the `useEquippedCosmetics` hook.
2. **Security hardening** (Section 6) — do this early; everything else builds on trusting the data layer.
3. **Global shell + Home + Profiles** — nav, layout, responsive framework, the 3D hero treatment.
4. **Leaderboard + Tasks**.
5. **Rewards** — the four confirmed fixes (tier label, prime-tier exclusion, scroller animation, drop-rate panel) plus the Celestial case.
6. **Messages + Community** — including the glow-rendering fix and moderation affordances.
7. **Arena** — real-data Oracle grounding, then the reframed chance games and Growth Pool.
8. **Admin overhaul + separate `/admin` login + Owner Console**.
9. **Full pass**: accessibility audit, responsive testing at all four breakpoints, performance check on the 3D/texture assets, `prefers-reduced-motion` verification across every new animation.

\---

## 8\. Working Notes for Claude Code

* Match the codebase's existing conventions (CSS Modules per page, Zustand for state, the existing service-layer pattern in `firestoreService.js`/`adminService.js`) rather than introducing new libraries or patterns where the existing ones already work.
* Where this doc gives exact code (the Regalia token block, the illustrative Firestore rules), treat it as a strong starting point to adapt to what actually compiles and renders well, not a literal copy-paste guarantee — especially the Firestore rules, which should be verified against the emulator.
* After each phase in Section 8, give a short summary of what changed and flag anything you had to interpret or diverge from this spec, so it can be reviewed before moving to the next phase.

If something here is genuinely ambiguous once you're looking at the actual rendered UI, make the reasonable premium-design call yourself and note the assumption — don't block on it.



EcoSpark “Regalia” — Claude Code Execution Addendum

> \\\*\\\*How to apply this addendum:\\\*\\\* Append this document \\\*verbatim\\\* beneath the existing `ecospark-ultra-premium-overhaul-prompt.md`. It is additive: it does not remove, weaken, or replace any requirement in the original brief. If two instructions conflict, use this precedence order: \\\*\\\*security/data integrity > accessibility > functional correctness > existing user-data preservation > performance > visual polish\\\*\\\*. Preserve the original product vision and expand it through this operating contract.

\---

## 9\. Non-Negotiable Claude Code Operating Contract

You are operating inside a real deployed education product, not making a visual mock-up. Treat every change as production code. Do not claim a feature is complete merely because a component renders; it is complete only when its data flow, permissions, loading/empty/error states, responsive behavior, and regression checks are implemented.

### 9.1 Before editing anything

1. Re-inspect the current repository rather than assuming the paths or implementation details in this brief are still exact.
2. Create a short baseline report in `docs/regalia-audit.md` before the first functional change. Include: current routes, current collection/document shapes, active Vercel endpoints and cron entries, existing auth/role flow, current build command, current test/lint commands, broken console errors, and any differences from this brief.
3. Run the project’s existing install, lint, typecheck, test, and production-build commands. Record every pre-existing failure separately from regressions introduced by this overhaul.
4. Do not delete or overwrite existing production data, user inventory, points, roles, message history, task submissions, reports, reward IDs, or route URLs without an explicit backward-compatible migration.
5. Never place secrets, service-account JSON, API keys, owner credentials, Groq keys, Gemini keys, GNews keys, or Firebase Admin credentials in frontend source, commits, logs, client bundles, or screenshots. Use environment variables and document required keys in `.env.example` using placeholders only.

### 9.2 Work cadence

Implement one phase at a time in the phase order from the original brief. At the end of each phase:

* Run lint, typecheck (if configured), tests, and a production build.
* Manually test the routes and flows touched by that phase.
* Verify at 375px, 768px, 1024px, and 1440px; test both light/available themes and Regalia; test reduced motion; test keyboard-only navigation.
* Return a concise change report containing: files changed, schema changes, migration/backfill requirements, security implications, commands run and their result, known limitations, and exact next phase.
* Do not silently substitute a fake implementation, a hard-coded response, client-only authorization, a placeholder image, or an unfinished button for a functional feature.
* Keep `main` deployable after every phase. If a change needs a multi-step migration, implement the compatibility layer first, then migrate, then remove legacy logic only after verification.

### 9.3 No-drift rules

* Do not introduce a new state-management library, UI kit, CSS framework, database, authentication provider, or animation library where the existing React/Firebase/Zustand/Tailwind/Framer Motion stack can solve the requirement.
* Do not rebuild a working subsystem just because a newer abstraction looks cleaner. Extend working components and services where feasible.
* Do not use generic "AI SaaS" design patterns: purple-blue gradient buttons, floating neon blobs, three identical icon cards, excessive glass panels, decorative emoji, or motion on every card.
* Do not use external raw GitHub URLs or fragile hot-linked assets for critical visual assets. Critical textures, icons, fonts if self-hosted, and 3D materials must be versioned in the repo or sourced through a reliable sanctioned CDN with an intentional fallback.
* Do not use `Math.random()` for any result that awards points, opens a reward case, resolves an Oracle market, or changes a user’s inventory. These must be server-authoritative, auditable, and idempotent.
* Do not trust an email address, role field, URL, local state, hidden button, or client-side conditional as an authorization boundary.

\---

## 10\. Definition of Done — Global Quality Gate

The project is only complete when all items below are true.

### Functional integrity

* There are no uncaught runtime exceptions on public routes, authenticated student routes, teacher routes, admin routes, or owner-only flows.
* The existing 3D hero loads without a network dependency on `raw.githubusercontent.com`; its texture/material loading has a local fallback and a graceful static non-WebGL fallback.
* Every async view has a designed loading state, a useful empty state, and an actionable error state.
* A failed network request never leaves a permanent spinner, negative points, duplicate transaction, stuck lootbox, duplicate message, or impossible-to-dismiss modal.
* Every destructive or costly action has a clear confirmation where appropriate, disabled in-flight state, idempotency protection, and a result visible to the user.

### Visual system

* Regalia is visually distinct, but functionality pages remain legible and calm. Gold is ceremonial emphasis, not a border around every element.
* Components use theme tokens rather than arbitrary inline colors, hard-coded spacing, or isolated shadow/radius values.
* Equipped frame, title, name glow, font treatment, banner/background, and profile identity render consistently anywhere an identity is visible: header/profile trigger, own profile, public profile, leaderboard list, leaderboard podium, community author line, comments, message list, message thread, reactions, notifications, group members, task proof attribution, Arena standings, and admin user preview.
* Cosmetic rendering is centralized through shared components/hooks rather than reimplemented page-by-page.
* Standard UI meets WCAG AA contrast; never rely on color alone for rarity, status, errors, success, unread state, or rank movement.

### Responsive and accessibility

* No horizontal overflow at 320px, 375px, 390px, 768px, 1024px, 1440px, or 2560px except intentional, labelled horizontal data tables.
* All controls have a minimum 44px by 44px hit area on touch devices.
* Keyboard users can operate navigation, menus, dialogs, reward case interactions, message reactions, image viewer, Arena interactions, admin filters, and all forms; Escape closes transient layers and focus returns to the trigger.
* Dialogs trap focus, announce their title, prevent background interaction, and restore focus on close.
* Reduced-motion mode removes nonessential movement, uses immediate but comprehensible state changes, and never blocks core flows.
* Images use meaningful alt text; decorative imagery is marked decorative; icons-only controls have accessible labels; forms have real labels and inline errors.

### Performance and reliability

* Route-level code splitting is applied to heavy routes where it improves initial load, especially Admin, Arena, Rewards, and the 3D hero.
* Three.js, textures, large media, charts, and message attachment previews do not block core page interactivity.
* Realtime listeners are unsubscribed on unmount and are not duplicated by rerenders.
* Long lists use pagination, cursor-based loading, virtualization, or a deliberate bounded strategy; no unbounded Firestore collection scan should be introduced merely to render a feed or leaderboard.
* All server mutations validate input and use transactions/batched writes where consistency requires it.

\---

## 11\. Architecture Additions Required for a Premium, Reliable Product

### 11.1 Server-authoritative economy ledger

Create a clear economy boundary. Points must never be changed by arbitrary client writes. Add an append-only `pointTransactions` or equivalent ledger with fields such as:

```ts
{
  id,
  userId,
  type: 'task\\\_award' | 'reward\\\_purchase' | 'loot\\\_case\\\_open' | 'oracle\\\_stake' |
        'oracle\\\_payout' | 'growth\\\_pool\\\_lock' | 'growth\\\_pool\\\_release' |
        'owner\\\_adjustment' | 'reversal' | 'bonus',
  delta,
  balanceBefore,
  balanceAfter,
  sourceType,
  sourceId,
  idempotencyKey,
  actorId,
  actorRole,
  metadata,
  createdAt
}
```

Use a server-side Firestore transaction to atomically: validate eligibility, verify sufficient spendable balance when required, change the balance, create the ledger entry, write audit data, and return the canonical resulting balance. The client should render the returned value and then reconcile through realtime state. Never decrement in UI first and hope the write succeeds.

Use stable idempotency keys for every retryable action. Repeated clicks, browser retries, slow connections, or Vercel retries must never open two cases, charge twice, award two payouts, or settle one Oracle market twice.

Split lifetime progress from spendable balance if the existing model combines them. A reward purchase must never erase a user’s historical achievement total. Keep legacy fields readable during migration and write a documented one-time backfill script with dry-run mode, batching, checkpoint logging, and a rollback plan.

### 11.2 Inventory and cosmetics model

Normalize cosmetics around stable immutable reward IDs, not display names. A future reward can evolve visually without invalidating old inventories. Prefer a structure conceptually like:

```ts
inventory: {
  ownedRewardIds: string\\\[],
  equipped: {
    frameId: string | null,
    nameEffectId: string | null,
    titleId: string | null,
    fontId: string | null,
    profileBackgroundId: string | null,
    badgeId: string | null
  }
}
```

The equip endpoint must validate ownership, compatibility, and role/tier restrictions. It must reject arbitrary reward IDs. Create a shared cosmetic resolver that takes a profile and reward catalog and returns a safe render model with default fallbacks; every identity surface must use it.

Add a premium **Wardrobe / Collection** experience in Profile: owned vs locked cosmetics, rarity filters, collection completion, accessible preview, compare-before-equip, "new" markers, and an option to reset an individual cosmetic slot to default. It must not imply paid value or use manipulative scarcity language.

### 11.3 Notifications center

Add a real notifications data model and page/drawer rather than relying only on transient toasts. Support points earned, task review results, streak risk, reward unlocks, reward purchase/case results, Oracle settlement, message/reply/reaction, group invitation, moderator outcome, and admin announcements.

Requirements:

* Read/unread state, mark all read, deep links, icon/text alternatives for each category, sensible grouping, and no duplicate flood from repeated events.
* Notifications should be generated by trusted server flows for economy/moderation events.
* Optional per-category preferences, respecting student safety and no marketing-spam defaults.

### 11.4 Search, command palette, and navigation

Add a keyboard-accessible command palette (`Ctrl/Cmd + K`) for navigation and safe actions: search pages, open profile, tasks, rewards, leaderboard, community, messages, help, theme selection, and owner/admin destinations when authorized. Do not expose unavailable privileged actions in search results.

Add global search only after security filters are designed: search users by permitted public profile fields, groups, public community content, and reward catalog. Never query or reveal private messages, staff notes, report data, hidden user details, or banned-user moderation data to ordinary users.

### 11.5 Observability

Add a minimal privacy-conscious error/health layer:

* One error boundary at app level and local boundaries around high-risk visual features such as the 3D hero, charts, lootbox, and media viewer.
* A structured server error response format with public-safe messages and internal error IDs.
* Owner/admin-only diagnostic page or controlled log view showing error ID, route/function, timestamp, and safe metadata—not secrets or private message bodies.
* Audit events for sensitive actions: point adjustment, role/claim change, ban/unban, reward catalog change, Oracle creation/edit/resolve/void, moderation decision, and admin login denial.

\---

## 12\. Page-Level Expansion Requirements

### 12.1 Home: premium utility, not just decoration

Add an adaptive daily dashboard that combines: daily eco focus, streak status, next best action, weekly goal ring, points trend, active community/group challenge, pending task status, nearest desired reward, and a concise personalized AI coach suggestion. The personalization must degrade gracefully if AI or data is unavailable; never fabricate an activity or claim a user did something they did not do.

Add a **My Journey** timeline that summarizes verified tasks, level/tier milestones, earned cosmetics, group contributions, and streak landmarks. It must use actual event data or labelled empty states, not generated fake history.

### 12.2 Leaderboard: fairness and context

Support time windows (weekly, monthly, all time), school/class/group scopes if supported by the data model, and an explanation of the scoring basis. Pin an accessible “Your position” panel that remains accurate even if the user is outside the loaded page of results.

Add rank movement only when prior period data exists; show “new” or “no prior comparison” rather than inventing arrows. Allow users to view a public profile from a row while respecting privacy settings. Add skeleton rows, cursor pagination, and stable sort behavior for ties.

### 12.3 Tasks: trustworthy proof and coaching

Improve photo task submissions with camera/file validation, preview, compression, retry-safe upload, explicit consent/privacy copy, clear verification status, and a human-review path if AI confidence is uncertain. Do not show AI confidence as a misleading certainty score.

Add task detail sheets with impact explanation, difficulty, estimated time, verification guidelines, evidence examples, repeatability rules, cooldown, and point calculation. Add filters for duration, location requirement, category, verification method, and difficulty. A task marked complete must be traceable to a submission/verification record and associated ledger transaction.

### 12.4 Rewards: collection-grade but transparent

In addition to the original reward requirements, add:

* A visual **rarity codex** explaining every tier, visual language, unlock path, and exact case eligibility.
* Case opening history with date, case, reward ID, tier, and transaction reference.
* Direct-purchase confirmation that displays remaining balance and whether the item is already owned.
* Owned-item handling that cannot silently waste a reward. Define and implement one clear policy: duplicate protection, reroll token, cosmetic shards, or a transparent conversion amount; use that policy everywhere.
* Server-generated drop-rate data from the same config used to choose the result. Display precise rates and ensure totals are correct.
* A deterministic, auditable server-side draw strategy. If cryptographic fairness is feasible, store a server seed hash before reveal and reveal/audit the seed after resolution; otherwise do not make unverifiable “provably fair” claims.
* Reward-preview mode that never mutates equipment or inventory until the user confirms Equip.

### 12.5 Messages: social-quality with student safeguards

Add reactions, replies, read receipts, typing indicators, attachment/image messages, online/presence indicators only where privacy policy permits, pinned messages, conversation search, unread badges, message edit window, delete-for-me, report/block, and controlled link previews.

Implement data constraints: allowed attachment MIME types, max size, image compression, upload progress, storage security rules, attachment cleanup strategy, rate limiting or cooldown for message sends, content length limits, and pagination using cursors. Do not load an entire chat history at once.

Student safety requirements:

* Blocking immediately hides/blocks future direct communication in both directions.
* Reporting creates a protected moderation record with reporter, reported message/conversation reference, reason, timestamp, and status; ordinary users cannot read other reports.
* Staff review tools must show only data necessary for the report and create an audit event for moderation outcomes.
* Never expose precise last-seen/location information by default.

### 12.6 Community: participation with moderation

Add community challenge templates, groups/teams, group roles, join requests where needed, event/calendar cards, polls, post reactions, image attachments, saved posts, topic tags, and a reputation/recognition layer based on meaningful verified participation—not raw spam volume.

Build content moderation states (`active`, `hidden`, `under\\\_review`, `removed`) and ensure the feed excludes hidden/removed content for ordinary users. Create clear user-facing explanations when their content is moderated, with an appeal route if appropriate. Paginate comments and posts; use optimistic likes/reactions only with rollback on failed writes.

### 12.7 Profiles: public identity with privacy controls

Add a privacy/control panel for public profile visibility: show/hide activity summary, leaderboard visibility where product rules permit, group visibility, and profile bio. Never expose email, Firebase UID, staff notes, private messages, exact points transaction history, or moderation metadata in a public profile.

Add a shareable public profile route only if its authorization and privacy checks are server/Firestore-rule safe. Include achievement gallery, equipped Regalia display, recent verified public milestones, mutual group context if permitted, and a graceful profile-not-found/hidden state.

### 12.8 Arena: real data, clear settlement, no fabricated outcomes

For every Oracle market, store canonical data: question, category, source URLs/names, createdAt, opensAt, closesAt, resolvesAt, explicit resolution criteria, outcome enum, status (`draft`, `open`, `locked`, `pending\\\_resolution`, `resolved`, `void`), creator/admin identity, resolution evidence, and settlement transaction IDs.

Rules:

* A market cannot be changed after users participate except through a clearly logged void/refund flow.
* Lock participation at a deterministic time using trusted server time.
* Settlement is a transaction and cannot pay twice.
* If credible sources conflict or no criterion can be verified, mark the market `void`, refund eligible stake according to the published rule, and explain why.
* A model may summarize sourced material but cannot be the ultimate source of truth or invent a resolution.
* Show source links, close time in the user’s locale, settlement status, terms, and personal position/history.

Keep chance-based mini-games upside-only as the original prompt specifies. Their visual theatre must not conceal expected outcomes, costs, or rules. Use server timestamps and verifiable state; do not call them “stake,” “bet,” “casino,” or imply real-money gambling. Use Eco-themed names and make educational/community progression the primary reason to engage.

### 12.9 Admin and Owner: real separation of powers

The `/admin` route must be a separate layout and guarded at routing, API, Firestore, and mutation layers. A user reaching its URL without authorization gets a clear access-denied screen and no protected data is fetched before authorization resolves.

Create role capabilities as an explicit matrix and central utility, not scattered string comparisons:

|Capability|Student|Teacher|Admin|Owner|
|-|-:|-:|-:|-:|
|View own data|Yes|Yes|Yes|Yes|
|Review assigned submissions|No|Yes|Yes|Yes|
|Moderate posts/reports|No|Limited/assigned|Yes|Yes|
|Edit tasks/reward catalog|No|No/limited|Yes|Yes|
|Create/resolve Oracle markets|No|No/limited|Yes|Yes|
|Adjust points|No|No|No|Yes|
|Change roles/claims|No|No|No|Yes|
|View audit log|No|No|Limited relevant|Yes|
|Ban/unban users|No|No|Yes|Yes|

Adapt the matrix if existing school policy requires a narrower teacher scope, but never broaden a capability without server enforcement. Owner authority must come from Firebase Auth custom claims set by a trusted Admin SDK process, with forced token refresh/re-auth flow documented after claim changes. Firebase documents can mirror roles for UI rendering but are never the security source of truth. Firebase explicitly supports custom claims for access control, and Firestore `diff().affectedKeys()` is suitable for blocking restricted client-field updates. \[web:19]\[web:17]

Add owner features: immutable audit log filters/export, economy adjustment with reason and two-step confirmation, role-management safeguards, feature flags, announcement composer, data-maintenance/runbook cards, failed-job inspection, and read-only system health. Do not provide a generic “do anything” button; supreme control must still be deliberate, attributable, and reversible where possible.

\---

## 13\. Security Verification Protocol

Before deployment, create and run Firebase Emulator tests (or the closest existing test mechanism) for at least the following:

1. A student cannot change their own `points`, `role`, inventory ownership, moderation state, another user’s data, or any protected fields.
2. A student cannot read or write a chat they are not a participant in.
3. A blocked user cannot send or read new messages in the blocked relationship.
4. A teacher cannot access owner-only point adjustment or role mutation endpoints.
5. An admin cannot adjust points or promote themselves.
6. An owner can perform owner actions only with the correct custom claim—not merely a matching Firestore role string.
7. A reward opening cannot be replayed to create duplicate inventory/ledger entries.
8. A reward cannot be equipped unless owned and compatible with the cosmetic slot.
9. An Oracle settlement cannot execute twice and a void refunds exactly once.
10. Uploaded attachments reject unsupported MIME types, oversize payloads, and unauthorized reads.

Write a `docs/security-model.md` describing roles, trust boundaries, collections, sensitive fields, server endpoints, and test coverage. Do not ship broad rules such as `allow read, write: if isAuthenticated()` for sensitive collections.

\---

## 14\. Test and Release Checklist

### Required automated checks

* Existing lint/typecheck/test/build pass, plus new tests for extracted business rules: cosmetic resolution, points transaction idempotency, reward pool/rates, loot-case result handling, Oracle lock/resolve/void logic, role capability checks, and message-block/report rules.
* Add a small regression test for the current lootbox timing bug: animation begins immediately, reveal only appears after motion completes, and a failure/cancel state cleans up correctly.
* Add a regression test for the 3D asset issue: failed texture loading renders a stable fallback rather than crashing the page.
* Test Firestore rules via Emulator where feasible. The rules model must explicitly block forbidden changed fields using `diff()`/`affectedKeys()` or an equally strict validated approach. \[web:17]

### Required manual checks

* New student account, existing student with legacy inventory, teacher, admin, owner, blocked user, and user with no data.
* Slow 3G/network offline/reconnect behavior for task uploads, messages, reward opening, and Oracle actions.
* Chrome, Firefox, Safari/iOS where available, plus Android mobile viewport behavior.
* Keyboard-only path through every primary feature and screen-reader spot-check of dialogs/forms/navigation.
* Theme switch, high contrast, text-size preferences, and reduced motion.
* Refresh/reopen during case animation, message upload, Oracle settlement, and points adjustment; the system must resolve safely without duplicates or corrupted UI.

### Release procedure

1. Create a migration plan, backup/export strategy if appropriate, and dry-run output for any existing data changes.
2. Deploy to preview first; test the preview against a safe environment/data strategy.
3. Verify environment variables and Vercel cron authorization. Vercel cron jobs are configured as scheduled calls to serverless endpoints via `vercel.json`; cron endpoints must authenticate/validate their invocation and remain idempotent. \[web:18]
4. Deploy production only after the checklist passes.
5. Monitor the error/health dashboard and audit logs after release; keep a rollback note with the previous deployment and migration reversibility status.

\---

## 15\. Final Deliverables Required From Claude Code

Before declaring the Regalia overhaul complete, provide:

1. A final implementation report grouped by phase and file.
2. A route map and feature map, including new `/admin` behavior.
3. A data model / collection change list, migrations, and backfill instructions.
4. A permissions matrix and a security test report.
5. A list of server endpoints, expected environment variables, and cron jobs.
6. A rewards/economy explanation covering duplicate policy, drop-rate source of truth, inventory integrity, and transaction idempotency.
7. An Oracle settlement design explaining real sources, manual fallback, void/refund handling, and auditability.
8. A responsive/accessibility/performance QA checklist with results at the defined breakpoints.
9. A known-limitations list that is honest: no claims of “flawless” or “real-time” unless the implementation and monitored infrastructure genuinely meet those terms.
10. A short operator runbook for Amitesh: assigning the owner claim safely, accessing the Owner Console, creating rewards, reviewing reports, creating/resolving/voiding Oracle markets, viewing audit entries, and rolling back a problematic catalog/config change.

**Final instruction:** do not stop at a beautiful shell. Ship a coherent, secure, responsive, accessible, premium EcoSpark where each luxury detail has a real product function, every point-affecting action is trustworthy, and every user sees their equipped identity consistently across the entire product.

* 

