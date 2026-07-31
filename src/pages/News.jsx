import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { fetchGreenNews } from '../services/newsService';
import NewsModal from '../components/news/NewsModal';
import ErrorBoundary from '../components/common/ErrorBoundary';
import { ArrowLeft, WifiOff, Leaf } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import styles from './News.module.css';

function NewsInner() {
  const [articles, setArticles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selected, setSelected] = useState(null);
  const navigate = useNavigate();

  useEffect(() => {
    fetchGreenNews()
      .then(setArticles)
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, []);

  const today = new Date().toLocaleDateString('en-US', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  });

  return (
    <div className={styles.page}>
      <button className={styles.backBtn} onClick={() => navigate('/home')}>
        <ArrowLeft size={20} /> Back to Dashboard
      </button>

      <header className={styles.header}>
        <h1 className={styles.title}>The Green Times</h1>
        <div className={styles.date}>{today} &bull; Global Edition</div>
      </header>

      {loading ? (
        <div className={styles.loading}>Loading latest stories...</div>
      ) : error ? (
        <div className={styles.loading}>
          <WifiOff size={32} style={{ margin: '0 auto', marginBottom: '1rem', color: 'var(--color-text-secondary)' }} />
          Failed to load news.
        </div>
      ) : articles.length === 0 ? (
        <div className={styles.loading}>
          <Leaf size={32} style={{ margin: '0 auto', marginBottom: '1rem', color: 'var(--color-emerald)' }} />
          No stories available right now.
        </div>
      ) : (
        <div className={styles.grid}>
          {articles.map((article, i) => {
            const isFeatured = i === 0;
            return (
              <motion.article
                key={i}
                className={`${styles.card} ${isFeatured ? styles.featuredCard : ''}`}
                onClick={() => setSelected(article)}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.05 }}
              >
                {article.image && (
                  <div className={isFeatured ? styles.featuredImgWrapper : styles.imgWrapper}>
                    <img src={article.image} alt={article.title} className={styles.img} loading="lazy" />
                  </div>
                )}
                <div className={isFeatured ? styles.featuredBody : ''}>
                  <span className={styles.source}>{article.source?.name || 'Eco News'}</span>
                  <h2 className={`${styles.headline} ${isFeatured ? styles.featuredHeadline : ''}`}>
                    {article.title}
                  </h2>
                  <p className={styles.snippet}>{article.description}</p>
                </div>
              </motion.article>
            );
          })}
        </div>
      )}

      <AnimatePresence>
        {selected && (
          <NewsModal article={selected} onClose={() => setSelected(null)} />
        )}
      </AnimatePresence>
    </div>
  );
}

export default function News() {
  return (
    <ErrorBoundary>
      <NewsInner />
    </ErrorBoundary>
  );
}
