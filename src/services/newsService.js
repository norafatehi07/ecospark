// src/services/newsService.js
const BASE_URL = import.meta.env.DEV ? 'http://localhost:3000' : '';

let _cache = null;
let _cacheAt = 0;
const CACHE_TTL = 30 * 60 * 1000; // 30 minutes client-side cache

let _fetchPromise = null;

export async function fetchGreenNews() {
  const now = Date.now();
  if (_cache && now - _cacheAt < CACHE_TTL) {
    return _cache;
  }

  if (_fetchPromise) {
    return _fetchPromise;
  }

  _fetchPromise = (async () => {
    try {
      let url;
      if (import.meta.env.DEV) {
        // Local dev: GNews free tier allows localhost CORS
        const apiKey = import.meta.env.VITE_GNEWS_API_KEY;
        const query = encodeURIComponent('climate change OR environment OR sustainability OR renewable energy');
        url = `https://gnews.io/api/v4/search?q=${query}&lang=en&max=8&apikey=${apiKey}`;
      } else {
        // Production: proxy through serverless function to bypass CORS
        url = '/api/news';
      }
      const response = await fetch(url);

      if (!response.ok) {
        throw new Error(`News API error: ${response.status}`);
      }

      const data = await response.json();
      _cache = data.articles || [];
      _cacheAt = Date.now();
      return _cache;
    } finally {
      _fetchPromise = null;
    }
  })();

  return _fetchPromise;
}

export function clearNewsCache() {
  _cache = null;
  _cacheAt = 0;
}
