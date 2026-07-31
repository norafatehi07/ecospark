// src/components/news/NewsModal.jsx
import { motion } from 'framer-motion';
import styles from './NewsModal.module.css';

export default function NewsModal({ article, onClose }) {
  return (
    <>
      <motion.div
        className={styles.backdrop}
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={onClose}
      />
      <motion.div
        className={styles.modal}
        initial={{ opacity: 0, scale: 0.95, x: "-50%", y: "-45%" }}
        animate={{ opacity: 1, scale: 1, x: "-50%", y: "-50%" }}
        exit={{ opacity: 0, scale: 0.95, x: "-50%", y: "-45%" }}
        transition={{ type: 'spring', stiffness: 400, damping: 35 }}
        role="dialog"
        aria-label={article.title}
      >
        <button className={styles.close} onClick={onClose} aria-label="Close">✕</button>

        {article.image && (
          <div className={styles.imgContainer}>
            <img src={article.image} alt={article.title} className={styles.img} />
            <div className={styles.imgGradient} />
          </div>
        )}

        <div className={styles.scrollArea}>
          <p className={styles.source}>
            <span>📰</span> {article.source?.name} · {
              article.publishedAt
                ? new Date(article.publishedAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })
                : ''
            }
          </p>
          <h2 className={styles.title}>{article.title}</h2>
          {article.description && (
            <p className={styles.desc}>{article.description}</p>
          )}
        </div>

        <div className={styles.footer}>
          <a
            href={article.url}
            target="_blank"
            rel="noopener noreferrer"
            className={styles.readMore}
          >
            Read full story on {article.source?.name} →
          </a>
          <p className={styles.disclaimer}>
            Full articles belong to their publishers. EcoSpark shows previews only.
          </p>
        </div>
      </motion.div>
    </>
  );
}
