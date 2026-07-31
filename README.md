<div align="center">
  <h1>EcoSpark 🌱</h1>
  <p><strong>A Next-Gen Gamified Sustainability Ecosystem & Prediction Market</strong></p>
</div>

## 💡 Inspiration
Climate change and environmental sustainability are often framed with doom and gloom, leaving people feeling powerless. We wanted to build something that empowers users, makes sustainable habits **addicting**, and rewards real-world impact. We envisioned a platform that blends the addictive loops of modern games, the intelligence of state-of-the-art AI, and the thrill of prediction markets to create an unparalleled green ecosystem.

## 🚀 What it does
**EcoSpark** is a comprehensive, gamified platform where users:
- **Complete Real-World Eco-Tasks:** From planting trees to using public transport, users snap photos to prove their impact.
- **AI Photo Verification:** Google's Gemini Vision AI instantly verifies user submissions, granting XP and rewards to prevent cheating.
- **AI Eco-Coach:** An interactive AI assistant powered by Groq API guides users on sustainability, offering personalized tips and encouragement.
- **Oracle Prediction Market:** A dynamic, Polymarket-style arena where users bet their earned EcoCoins on real-world environmental events (e.g., renewable energy milestones), auto-settled by Gemini AI scanning live news!
- **Community & Leaderboards:** Compete with friends, climb global tiers (Bronze, Silver, Gold), and show off your equipped companions and cosmetic frames.

## 🛠 How we built it
EcoSpark is built to Awwwards-caliber standards on 100% free-tier infrastructure.
- **Frontend & UI:** React 18, Vite, and vanilla CSS variables to support dynamic themes (including the beautiful "Regalia" gold/metallic themes).
- **3D Experiences:** `react-three-fiber` and `@react-three/drei` for interactive 3D hero sections that degrade gracefully on lower-end devices.
- **Backend & Database:** Firebase Auth, Firestore (with real-time `onSnapshot` syncing), and Firebase Serverless Functions (hosted on Vercel).
- **AI Integrations:** 
  - **Google Gemini API** (`gemini-2.5-flash`) for instantaneous photo verification and automated prediction market settlement based on current news.
  - **Groq API** (`llama-3.3-70b-versatile`) for blazing-fast, streaming AI coaching.
- **Live News:** Integrated GNews.io API for real-time sustainability news boards.

## 🚧 Challenges we ran into
- **AI Hallucinations & Verification:** Ensuring the Gemini Vision model reliably identified fake vs. real eco-tasks without false positives required careful prompt engineering and fallback timeouts.
- **Real-Time Market Auto-Settlement:** Building a prediction market that settles itself using AI to read live news was complex. We had to ensure the AI only settled events it was highly confident about.
- **State Management & Offline Sync:** Handling offline edge-cases for mobile users meant implementing robust local caching using Zustand so tasks queue locally and sync when reconnected.

## 🏆 Accomplishments that we're proud of
- Delivering a **sub-2-second streaming response time** for our AI Coach.
- Implementing an entire **Oracle Prediction Market** from scratch, mimicking high-end Web3 markets but powered purely by Firebase and Gemini AI.
- Developing a robust **design system** utilizing CSS variables to switch between high-contrast, accessible, and premium "Regalia" themes without losing performance.
- Keeping the entire infrastructure **100% free** without compromising on a premium user experience.

## 🔮 What's next for EcoSpark
- **Smart Device Integration:** Syncing with smart home devices (like smart plugs) to automatically verify energy savings.
- **School & Corporate Leagues:** Dedicated dashboards for schools or companies to track collective carbon offset.
- **Enhanced Prediction Markets:** Expanding the Oracle to include a wider array of community-submitted eco-bets and live data streams.

---

## ⚙️ Local Setup

```bash
# Clone and install
git clone https://github.com/ayalpha/ecospark-codenova-2026.git ecospark
cd ecospark
npm install

# Copy env template
cp .env.example .env
```

Fill in your `.env` file (API keys are all free, no credit card required):
```env
VITE_FIREBASE_API_KEY=...
VITE_FIREBASE_AUTH_DOMAIN=...
VITE_FIREBASE_PROJECT_ID=...
VITE_FIREBASE_MESSAGING_SENDER_ID=...
VITE_FIREBASE_APP_ID=...

VITE_GROQ_API_KEY=...
VITE_GEMINI_API_KEY=...
VITE_GNEWS_API_KEY=...

# Firebase Admin (for serverless functions)
FIREBASE_PROJECT_ID=...
FIREBASE_CLIENT_EMAIL=...
FIREBASE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\n..."
```

```bash
# Run locally (frontend only — hot reload)
npm run dev
```

> **Note:** AI features (coach, photo verification, oracle) and news require the serverless functions to run. For these, deploy on Vercel or use `vercel dev`.

---

## 🌐 Vercel Deployment

Deploying is incredibly straightforward:
1. Import the repository into Vercel.
2. Ensure the framework is set to **Vite**.
3. **Crucial:** Add all environment variables from `.env` in the Vercel Project Settings.
4. Deploy! Your prediction market, AI coach, and gamified logic will run flawlessly via Vercel Serverless Functions.

---

## 📁 Project Structure

```text
ecospark/
├── api/                    # Vercel serverless functions (Coach, Verify, Admin, Economy)
├── public/                 # Static assets & 3D textures
├── src/
│   ├── components/         # Reusable UI, 3D Hero, AI Widgets
│   ├── lib/                # Firebase Init & Utilities
│   ├── pages/              # Route Pages (Home, Arena, Tasks, Community)
│   ├── services/           # Data layer (AI, Oracle, Firestore)
│   ├── store/              # Zustand state (auth, ui, offline)
│   └── styles/             # Design tokens + global CSS
├── firestore.rules         # Database security rules
└── vercel.json             # Vercel configuration
```
