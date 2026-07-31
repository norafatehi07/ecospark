// api/news.js — GNews.io proxy (key stays server-side)
const GNEWS_API = 'https://gnews.io/api/v4/search';

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const apiKey = process.env.GNEWS_API_KEY || process.env.VITE_GNEWS_API_KEY;
  if (!apiKey) {
    return res.status(500).json({ error: 'GNews API key not configured' });
  }

  try {
    const params = new URLSearchParams({
      q: 'sustainability OR climate OR environment OR "eco-friendly" OR "green energy"',
      lang: 'en',
      country: 'in', // India focus for the student audience
      max: '8',
      sortby: 'publishedAt',
      apikey: apiKey,
    });

    const response = await fetch(`${GNEWS_API}?${params}`, {
      headers: { Accept: 'application/json' },
      signal: AbortSignal.timeout(8000),
    });

    if (!response.ok) {
      const body = await response.text().catch(() => '');
      const errMsg = `GNews error: HTTP ${response.status} — ${body.slice(0, 200)}`;
      console.error('[news]', errMsg);
      throw new Error(errMsg);
    }

    const data = await response.json();

    if (!data.articles || data.articles.length === 0) {
      console.warn('[news] GNews returned 0 articles. Check API key quota or query params.');
    }

    const articles = (data.articles || []).map((a) => ({
      title: a.title,
      description: a.description,
      url: a.url,
      image: a.image,
      publishedAt: a.publishedAt,
      source: {
        name: a.source?.name,
        url: a.source?.url,
      },
    }));

    // 30-minute server-side cache via Vercel edge
    res.setHeader('Cache-Control', 's-maxage=1800, stale-while-revalidate=300');
    res.json({ articles, fetchedAt: new Date().toISOString() });
  } catch (err) {
    console.error('[news] Error fetching from GNews:', err.message);
    // Return fallback articles so the UI never shows empty on API failure
    res.status(200).json({
      articles: getFallbackArticles(),
      fetchedAt: new Date().toISOString(),
      fallback: true,
    });
  }
}

function getFallbackArticles() {
  return [
    {
      title: 'Global Renewable Energy Capacity Set to Double by 2030',
      description: 'New analysis shows solar and wind installations will exceed expectations as costs continue to fall.',
      url: 'https://gnews.io',
      image: 'https://images.unsplash.com/photo-1509391366360-59728cb11c1e?w=600&q=80',
      publishedAt: new Date().toISOString(),
      source: { name: 'EcoSpark News', url: '' },
    },
    {
      title: 'Ocean Cleanup Initiative Removes Record 100 Tons of Plastic',
      description: 'Autonomous cleanup vessels successfully extracted over 100 tons of plastic from the Pacific Ocean.',
      url: 'https://gnews.io',
      image: 'https://images.unsplash.com/photo-1621451537084-482c73073e0f?w=600&q=80',
      publishedAt: new Date(Date.now() - 86400000).toISOString(),
      source: { name: 'Ocean Guardian', url: '' },
    },
    {
      title: 'India Hits Record Solar Power Generation Milestone',
      description: 'India crossed a significant solar power milestone, demonstrating rapid clean energy adoption.',
      url: 'https://gnews.io',
      image: 'https://images.unsplash.com/photo-1466611653911-95081537e5b7?w=600&q=80',
      publishedAt: new Date(Date.now() - 172800000).toISOString(),
      source: { name: 'Green India', url: '' },
    },
  ];
}
