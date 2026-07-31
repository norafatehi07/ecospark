// src/components/news/NewsBoard.jsx
import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { fetchGreenNews } from '../../services/newsService';
import ErrorBoundary from '../common/ErrorBoundary';
import NewsModal from './NewsModal';
import PremiumIcon from '../common/PremiumIcon';
import { Globe, Newspaper, WifiOff, Leaf } from 'lucide-react';
import styles from './NewsBoard.module.css';

function NewsCardSkeleton() {
  return (
    <div className={styles.cardSkeleton}>
      <div className={`skeleton ${styles.imgSkel}`} />
      <div className={styles.skelBody}>
        <div className={`skeleton ${styles.skelLine}`} style={{ width: '90%' }} />
        <div className={`skeleton ${styles.skelLine}`} style={{ width: '70%' }} />
        <div className={`skeleton ${styles.skelLine}`} style={{ width: '40%', height: 12, marginTop: 8 }} />
      </div>
    </div>
  );
}

function NewsCard({ article, onClick }) {
  return (
    <motion.article
      className={styles.card}
      onClick={() => onClick(article)}
      whileHover={{ y: -3, boxShadow: 'var(--elevation-3)' }}
      transition={{ duration: 0.2 }}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => e.key === 'Enter' && onClick(article)}
    >
      {article.image ? (
        <div className={styles.imgWrapper}>
          <img src={article.image} alt={article.title} className={styles.img} loading="lazy" />
          <div className={styles.imgOverlay} />
        </div>
      ) : (
        <div className={styles.imgPlaceholder}><PremiumIcon icon={Globe} color="sapphire" size={32} /></div>
      )}
      <div className={styles.cardBody}>
        <p className={styles.source}>{article.source?.name}</p>
        <h3 className={styles.title}>{article.title}</h3>
        <p className={styles.snippet}>{article.description}</p>
      </div>
    </motion.article>
  );
}

function NewsBoardInner() {
  const [articles, setArticles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selected, setSelected] = useState(null);

  useEffect(() => {
    fetchGreenNews()
      .then(setArticles)
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, []);

  return (
    <section className={styles.section}>
      <div className={styles.header}>
        <h2 className={styles.heading} style={{display:'flex', alignItems:'center', gap:'0.5rem'}}>
          <PremiumIcon icon={Newspaper} size={24} />
          Latest Green News
        </h2>
        {!loading && !error && (
          <Link to="/news" className={styles.badge} style={{ textDecoration: 'none' }}>
            View More
          </Link>
        )}
      </div>

      {/* Mobile: horizontal scroll; Desktop: grid */}
      <div className={loading ? styles.gridLoading : styles.grid}>
        {loading
          ? Array.from({ length: 4 }).map((_, i) => <NewsCardSkeleton key={i} />)
          : error
          ? (
            <div className={styles.empty}>
              <PremiumIcon icon={WifiOff} color="slate" size={32} />
              <p>News is temporarily unavailable. Check back soon!</p>
            </div>
          )
          : articles.length === 0
          ? (
            <div className={styles.empty}>
              <PremiumIcon icon={Leaf} color="emerald" size={32} />
              <p>No stories found. Try refreshing later.</p>
            </div>
          )
          : articles.slice(0, 4).map((a, i) => (
            <NewsCard key={i} article={a} onClick={setSelected} />
          ))
        }
      </div>

      <AnimatePresence>
        {selected && (
          <NewsModal article={selected} onClose={() => setSelected(null)} />
        )}
      </AnimatePresence>
    </section>
  );
}

export default function NewsBoard() {
  return (
    <ErrorBoundary fullPage={false} message="News board couldn't load, but the rest of your dashboard is working fine.">
      <NewsBoardInner />
    </ErrorBoundary>
  );
}
