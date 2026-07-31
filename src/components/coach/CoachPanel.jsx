// src/components/coach/CoachPanel.jsx
import { useState, useRef, useEffect } from 'react';
import { motion } from 'framer-motion';
import { useUiStore } from '../../store/uiStore';
import { useAuthStore } from '../../store/authStore';
import { streamCoachReply } from '../../services/aiService';
import PremiumIcon from '../common/PremiumIcon';
import { Leaf, Trash2, X, Timer, Send } from 'lucide-react';
import styles from './CoachPanel.module.css';

function ChatMessage({ message }) {
  const isUser = message.role === 'user';
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.2 }}
      className={`${styles.message} ${isUser ? styles.userMessage : styles.assistantMessage}`}
    >
      {!isUser && <span className={styles.botAvatar}><PremiumIcon icon={Leaf} color="emerald" size={20} /></span>}
      <div className={`${styles.bubble} ${isUser ? styles.userBubble : styles.botBubble}`}>
        {message.content || (message.streaming ? <TypingDots /> : '')}
      </div>
    </motion.div>
  );
}

function TypingDots() {
  return (
    <span className={styles.typingDots}>
      <span />
      <span />
      <span />
    </span>
  );
}

export default function CoachPanel() {
  const { coachMessages, appendCoachMessage, updateLastCoachMessage, clearCoachHistory, closeCoach } = useUiStore();
  const { profile } = useAuthStore();
  const [input, setInput] = useState('');
  const [streaming, setStreaming] = useState(false);
  const [error, setError] = useState(null);
  const bottomRef = useRef(null);
  const inputRef = useRef(null);
  const abortRef = useRef(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [coachMessages]);

  useEffect(() => {
    inputRef.current?.focus();
    return () => abortRef.current?.abort();
  }, []);

  const sendMessage = async () => {
    const text = input.trim();
    if (!text || streaming) return;

    setInput('');
    setError(null);

    const userMsg = { role: 'user', content: text };
    appendCoachMessage(userMsg);

    // Add empty assistant message that we'll stream into
    appendCoachMessage({ role: 'assistant', content: '', streaming: true });

    const history = [...coachMessages, userMsg].slice(-10);
    setStreaming(true);

    let accumulated = '';

    abortRef.current = streamCoachReply(
      history,
      (token) => {
        accumulated += token;
        updateLastCoachMessage(accumulated);
      },
      () => {
        setStreaming(false);
        // Remove streaming flag
        updateLastCoachMessage(accumulated);
      },
      (err) => {
        setStreaming(false);
        updateLastCoachMessage("Sorry, I'm having trouble connecting right now. Try again in a moment! 🌿");
        setError('Connection error');
      }
    );
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  const SUGGESTED = [
    '💡 Give me a tip for today',
    '🔥 How do I maintain my streak?',
    '🌍 What\'s my biggest impact?',
  ];

  // Desktop: slide-in side panel; Mobile: slide-up sheet
  const panelVariants = {
    hidden: { opacity: 0, x: '100%', y: 0 },
    visible: { opacity: 1, x: 0, y: 0 },
    exit: { opacity: 0, x: '100%', y: 0 },
  };

  const mobileVariants = {
    hidden: { opacity: 0, y: '100%' },
    visible: { opacity: 1, y: 0 },
    exit: { opacity: 0, y: '100%' },
  };

  const isMobile = window.innerWidth < 768;
  const variants = isMobile ? mobileVariants : panelVariants;

  return (
    <motion.div
      className={styles.panel}
      variants={variants}
      initial="hidden"
      animate="visible"
      exit="exit"
      transition={{ type: 'spring', stiffness: 340, damping: 35 }}
    >
      {/* Header */}
      <div className={styles.header}>
        <div className={styles.headerInfo}>
          <div className={styles.headerAvatar}><PremiumIcon icon={Leaf} color="emerald" size={24} /></div>
          <div>
            <h3 className={styles.headerTitle}>EcoSpark Coach</h3>
            <p className={styles.headerSub}>AI-powered sustainability mentor</p>
          </div>
        </div>
        <div className={styles.headerActions}>
          <button onClick={clearCoachHistory} className={styles.iconBtn} title="Clear chat">
            <PremiumIcon icon={Trash2} color="slate" size={20} />
          </button>
          <button onClick={closeCoach} className={styles.iconBtn} title="Close">
            <PremiumIcon icon={X} color="slate" size={20} />
          </button>
        </div>
      </div>

      {/* Messages */}
      <div className={styles.messages}>
        {coachMessages.map((msg, i) => (
          <ChatMessage key={i} message={msg} />
        ))}
        {streaming && coachMessages[coachMessages.length - 1]?.content === '' && (
          <div className={styles.typingIndicator}>
            <span className={styles.botAvatar}><PremiumIcon icon={Leaf} color="emerald" size={20} /></span>
            <div className={styles.typingBubble}><TypingDots /></div>
          </div>
        )}
        <div ref={bottomRef} />
      </div>

      {/* Suggestions (show when only initial message) */}
      {coachMessages.length === 1 && (
        <div className={styles.suggestions}>
          {SUGGESTED.map((s) => (
            <button
              key={s}
              className={styles.suggestionChip}
              onClick={() => { setInput(s); setTimeout(sendMessage, 0); }}
            >
              {s}
            </button>
          ))}
        </div>
      )}

      {/* Input */}
      <div className={styles.inputArea}>
        <textarea
          ref={inputRef}
          className={styles.input}
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Ask about eco habits, your streak, tips..."
          rows={1}
          disabled={streaming}
        />
        <button
          className={styles.sendBtn}
          onClick={sendMessage}
          disabled={!input.trim() || streaming}
          aria-label="Send message"
        >
          {streaming ? <PremiumIcon icon={Timer} color="slate" size={16} /> : <PremiumIcon icon={Send} color="emerald" size={16} />}
        </button>
      </div>
    </motion.div>
  );
}
