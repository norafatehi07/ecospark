# EcoSpark 🌱

**Gamified Sustainability Habit Tracker for Students**

Built to Awwwards-caliber standards on free-tier infrastructure. No paid APIs, no CCs required.

---

## 🚀 Tech Stack

| Layer | Technology |
|---|---|
| Frontend | React 18 + Vite + Framer Motion |
| 3D Hero | react-three-fiber + @react-three/drei + postprocessing |
| Auth + DB + Storage | Firebase (Spark plan) |
| Hosting | Vercel |
| AI Coach | Groq API — `llama-3.3-70b-versatile` (free, streaming) |
| AI Photo Verify | Google Gemini API — `gemini-2.5-flash` |
| News | GNews.io |

---

## 📋 Prerequisites — API Keys (All Free, No Credit Card)

### 1. Firebase
1. Go to https://console.firebase.google.com
2. Create a new project (Spark/free plan — no card needed)
3. Enable **Authentication** → Sign-in methods → Email/Password + Google
4. Enable **Firestore Database** (start in test mode, then apply `firestore.rules`)
5. Enable **Storage** (apply `storage.rules`)
6. Go to Project Settings → Your apps → Add web app → Copy the config

### 2. Groq (AI Coach)
1. Go to https://console.groq.com
2. Sign up (no credit card)
3. Go to API Keys → Create API Key

### 3. Google Gemini (Photo Verification)
1. Go to https://aistudio.google.com/app/apikey
2. Sign in with Google → Create API Key
3. Use the **free tier** — do NOT use Gemini Pro (too few daily requests)

### 4. GNews (News Board)
1. Go to https://gnews.io
2. Sign up → Dashboard → Copy your API key

### 5. Firebase Admin (for Vercel serverless functions)
1. Firebase Console → Project Settings → Service Accounts
2. Generate new private key → download the JSON
3. Extract `project_id`, `client_email`, `private_key` from the JSON

---

## ⚙️ Local Setup

```bash
# Clone and install
git clone <your-repo-url> ecospark
cd ecospark
npm install

# Copy env template
cp .env.example .env
```

Fill in your `.env` file:
```
VITE_FIREBASE_API_KEY=...
VITE_FIREBASE_AUTH_DOMAIN=...
VITE_FIREBASE_PROJECT_ID=...
VITE_FIREBASE_STORAGE_BUCKET=...
VITE_FIREBASE_MESSAGING_SENDER_ID=...
VITE_FIREBASE_APP_ID=...

GROQ_API_KEY=...
GEMINI_API_KEY=...
GNEWS_API_KEY=...

# Firebase Admin (for serverless functions)
FIREBASE_PROJECT_ID=...
FIREBASE_CLIENT_EMAIL=...
FIREBASE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\n..."

# For the streak-reset cron job
CRON_SECRET=any-random-secret-string
```

```bash
# Seed the database with starter tasks and rewards
npm run seed

# Run locally (frontend only — hot reload)
npm run dev
```

> **Note:** AI features (coach, photo verification) and news require the serverless functions to run. For these, use `vercel dev` instead of `npm run dev`. Install Vercel CLI with `npm i -g vercel`.

---

## 🔥 Firebase Setup

### Apply Firestore Security Rules
```bash
# Install Firebase CLI
npm install -g firebase-tools
firebase login
firebase init firestore

# Deploy rules
firebase deploy --only firestore:rules
```

### Apply Storage Rules
```bash
firebase deploy --only storage:rules
```

---

## 🌐 Vercel Deployment

```bash
# Install Vercel CLI
npm install -g vercel

# Login and deploy
vercel login
vercel

# Set environment variables in Vercel dashboard:
# Project Settings → Environment Variables → Add all from .env
```

Your app will be live at a `.vercel.app` URL. The streak-reset cron runs automatically at midnight UTC via Vercel Cron.

---

## 📁 Project Structure

```
ecospark/
├── api/                    # Vercel serverless functions
│   ├── coach.js            # Groq streaming AI coach
│   ├── verify.js           # Gemini photo verification
│   ├── news.js             # GNews proxy
│   └── streak-reset.js     # Nightly cron job
├── public/                 # Static assets
├── scripts/
│   └── seed.js             # Firestore seed script
├── src/
│   ├── components/
│   │   ├── coach/          # AI Coach floating widget
│   │   ├── common/         # Shared UI components
│   │   ├── hero/           # 3D + static hero
│   │   ├── layout/         # AppShell, Sidebar, BottomTabBar
│   │   ├── news/           # News board + modal
│   │   └── tasks/          # Task log modal
│   ├── lib/
│   │   └── firebase.js     # Firebase init
│   ├── pages/              # Route pages
│   ├── services/           # Data layer (AI, Firestore, News)
│   ├── store/              # Zustand state (auth, ui, offline)
│   └── styles/             # Design tokens + global CSS
├── firestore.rules
├── storage.rules
├── vercel.json
└── .env.example
```

---

## ✨ Key Features

- **3 Responsive Layouts**: Mobile (bottom tab bar), Tablet (icon sidebar), Desktop (full sidebar + 3D hero)
- **AI Photo Verification**: Gemini vision with timeout, retry, async onSnapshot — never hangs
- **Streaming AI Coach**: Groq tokens stream live, responses start in <2s
- **Real-time Updates**: Firestore onSnapshot everywhere — no page refreshes
- **Offline Support**: Tasks queue locally and sync on reconnect
- **Group Challenges**: Create/join class groups with team leaderboard
- **Referral System**: Unique codes that award bonus points
- **Weekly Impact Report**: Auto-generated card (shareable screenshot)
- **Teacher Admin View**: Review AI-flagged submissions
- **Accessibility**: 3 themes, 3 text sizes, reduced-motion, high-contrast

---

## 🎯 Acceptance Criteria (from spec)

- [x] Zero console errors, zero broken links
- [x] No loading state hangs — all have defined timeouts with fallbacks
- [x] Desktop and mobile are visibly different layouts
- [x] 3D hero degrades gracefully on low-end devices
- [x] AI coach streams tokens visibly
- [x] Photo verification always resolves (approved / rejected / flagged)
- [x] 100% free-tier infrastructure, no paid keys
