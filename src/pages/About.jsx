// src/pages/About.jsx — For judges: explains verification pipeline and NEP 2020 alignment
import { motion } from 'framer-motion';
import styles from './About.module.css';
import PremiumIcon from '../components/common/PremiumIcon';
import { Search, Bot, BookOpen, Wrench, Leaf, Heart } from 'lucide-react';

const SECTIONS = [
  {
    icon: <PremiumIcon icon={Search} color="sapphire" size={24} />,
    title: 'How Photo Verification Works',
    content: `When a student submits a photo for a task:
1. The photo is uploaded to Firebase Storage.
2. A Firestore submission document is created with status: "pending".
3. Our serverless function sends the image to Google Gemini (gemini-2.5-flash) with a task-specific prompt, asking for JSON: { approved, confidence, reason }.
4. Gemini has a 12-second timeout. If it exceeds this, the submission is flagged for manual teacher review.
5. On rate-limits (HTTP 429), the system retries with exponential backoff (1s, then 3s).
6. The Firestore document is updated to "approved", "rejected", or "flagged" — and the student's UI updates live via onSnapshot, with no page refresh needed.
7. Every AI decision is logged (verdict, confidence, reasoning) for auditability.`,
  },
  {
    icon: <PremiumIcon icon={Bot} color="emerald" size={24} />,
    title: 'AI Coach Architecture',
    content: `The AI coach uses Groq's API (llama-3.3-70b-versatile model) with streaming enabled.
Responses begin appearing in under 2 seconds — tokens stream one-by-one into the chat UI via Server-Sent Events.
The coach uses a system prompt tailored to sustainability education, capped at 400 output tokens, and trims conversation history to the last 10 messages to stay within Groq's free-tier limits.
All API keys are server-side in Vercel environment variables — never exposed to the client.`,
  },
  {
    icon: <PremiumIcon icon={BookOpen} color="gold" size={24} />,
    title: 'NEP 2020 Alignment',
    content: `EcoSpark directly supports National Education Policy 2020 objectives:
• Experiential Learning: Students perform real-world eco-actions and photograph evidence, not just answer MCQs.
• Holistic Development: Tracks environmental, social, and community impact alongside academic progress.
• 21st Century Skills: Builds habits of sustainability, critical thinking (evaluating their own eco-footprint), and digital literacy.
• Community Engagement: Group challenges and community feed connect school eco-action to real peer networks.
• Competency-Based Progress: Points, streaks, and badges create measurable milestones tied to genuine behavior change.`,
  },
  {
    icon: <PremiumIcon icon={Wrench} color="slate" size={24} />,
    title: 'Technical Architecture',
    content: `Frontend: React + Vite (code-split, lazy-loaded routes) + Framer Motion + react-three-fiber (3D hero).
Backend: Firebase (Auth, Firestore, Storage) + Vercel serverless functions.
AI: Groq (chat) + Google Gemini (vision) — both free tier, no credit card required.
News: GNews.io with 30-minute server-side caching via Vercel edge headers.
All API keys are server-side only. Free-tier limits are explicitly handled: rate-limit retries, hard timeouts, fallback UI states.`,
  },
];

export default function About() {
  return (
    <div className={styles.page}>
      <motion.div
        className={styles.hero}
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
      >
        <div className={styles.heroIcon}><PremiumIcon icon={Leaf} color="emerald" size={64} /></div>
        <h1 className={styles.heroTitle}>About EcoSpark</h1>
        <p className={styles.heroSub}>
          A gamified sustainability habit tracker for students, powered by AI and built entirely on free-tier infrastructure.
        </p>
        <div className={styles.badges}>
          <span className={styles.badge}>React + Vite</span>
          <span className={styles.badge}>Firebase</span>
          <span className={styles.badge}>Groq AI</span>
          <span className={styles.badge}>Google Gemini</span>
          <span className={styles.badge}>Vercel</span>
        </div>
      </motion.div>

      <div className={styles.sections}>
        {SECTIONS.map((s, i) => (
          <motion.div
            key={s.title}
            className={styles.section}
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.1 }}
          >
            <div className={styles.sectionHeader}>
              <span className={styles.sectionIcon}>{s.icon}</span>
              <h2 className={styles.sectionTitle}>{s.title}</h2>
            </div>
            <pre className={styles.sectionContent}>{s.content}</pre>
          </motion.div>
        ))}
      </div>

      <div className={styles.footer}>
        <p style={{display:'flex', alignItems:'center', gap:'0.25rem', justifyContent:'center'}}>Built with <PremiumIcon icon={Heart} color="ruby" size={16} /> for sustainability education</p>
        <p className={styles.footerSub}>Zero paid APIs · 100% free-tier infrastructure</p>
      </div>
    </div>
  );
}
